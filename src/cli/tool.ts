#!/usr/bin/env node
/**
 * Run any nwn-mcp tool from the command line, with no MCP client and no model: for patches, checks and builds done
 * outside a chat (docs/tool-cli.md).
 *
 *   node dist/cli/tool.js --module <project dir | .mod> <tool> [args]        one call
 *   node dist/cli/tool.js --module <project dir | .mod> --calls <file.json>  several calls on one load
 *   node dist/cli/tool.js --module <project dir> --build <out.mod>           build the .mod (repack_module)
 *   node dist/cli/tool.js --list [word]                                      tool names (and descriptions with a word)
 *   node dist/cli/tool.js --settings                                         where each setting comes from
 *
 * [args] is one JSON object (`'{"area":"mill"}'`) or `key=value` pairs (a value that parses as JSON is used as such).
 * A calls file is a JSON array of `{"tool": "...", "args": {...}}` or `["tool", {...}]`.
 * `--json` prints one JSON document `{ok, results: [{tool, isError, text}]}`; otherwise each result is printed under a
 * `--- tool` line. Exit code 1 when any call failed.
 *
 * Settings: the environment, then nwn-mcp.env (NWN_MCP_ENV), then the env of the MCP client's nwn-mcp entry in
 * ~/.claude.json, so the CLI sees the same game data and tools as the server. The temp folder defaults to its own
 * (`<tmp>/nwn-mcp-cli`), never the running server's. Edits go to the module project as the server's do; a server that
 * holds the same project refuses its next write until it loads the project again.
 */
import { writeSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { applySettings, clientSettings, loadSettingsFile, SETTING_KEYS, settingsFilePath } from "../util/settings-file.js";

interface Call {
  tool: string;
  args: Record<string, unknown>;
}

function write(text: string, fd = 1): void {
  const buf = Buffer.from(text.endsWith("\n") ? text : `${text}\n`);
  for (let done = 0; done < buf.length; ) {
    try {
      done += writeSync(fd, buf, done);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EAGAIN") throw e;
    }
  }
}

function fail(message: string): never {
  write(`error: ${message}`, 2);
  process.exit(2);
}

/** `key=value` pairs or one JSON object to an argument object. */
export function parseCallArgs(parts: string[]): Record<string, unknown> {
  if (parts.length === 1 && parts[0].trim().startsWith("{")) {
    try {
      return JSON.parse(parts[0]) as Record<string, unknown>;
    } catch (e) {
      throw new Error(`arguments are not valid JSON: ${(e as Error).message}`);
    }
  }
  const out: Record<string, unknown> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq <= 0) throw new Error(`"${p}" is not key=value`);
    const key = p.slice(0, eq);
    const raw = p.slice(eq + 1);
    try {
      out[key] = JSON.parse(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

/** A calls file's entries to calls. */
export function parseCallsFile(doc: unknown): Call[] {
  if (!Array.isArray(doc)) throw new Error("a calls file is a JSON array");
  return doc.map((c, i) => {
    if (Array.isArray(c) && typeof c[0] === "string") return { tool: c[0], args: (c[1] ?? {}) as Record<string, unknown> };
    if (c && typeof c === "object" && typeof (c as Call).tool === "string") return { tool: (c as Call).tool, args: (c as Call).args ?? {} };
    throw new Error(`entry ${i} is neither {"tool", "args"} nor ["tool", {args}]`);
  });
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  let modulePath: string | undefined;
  let callsFile: string | undefined;
  let build: string | undefined;
  let list: string | undefined | true;
  let json = false;
  let showSettings = false;
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--module") modulePath = argv[++i];
    else if (a === "--calls") callsFile = argv[++i];
    else if (a === "--build") build = argv[++i];
    else if (a === "--json") json = true;
    else if (a === "--settings") showSettings = true;
    else if (a === "--list") list = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
    else if (a === "--help" || a === "-h") {
      write("usage: tool.js --module <project|.mod> <tool> [json | key=value ...] | --calls <file> | --build <out.mod>; --list [word]; --settings; --json");
      return;
    } else rest.push(a);
  }

  // Settings before anything reads them (config.ts reads the environment when it is first imported).
  const before = new Set(SETTING_KEYS.filter((k) => process.env[k]));
  const fromFile = loadSettingsFile();
  const client = clientSettings();
  const fromClient = client ? applySettings(client) : [];
  if (!process.env.MCP_FOLDER_TEMP) process.env.MCP_FOLDER_TEMP = path.join(os.tmpdir(), "nwn-mcp-cli");
  if (showSettings) {
    const rows = SETTING_KEYS.filter((k) => process.env[k]).map((k) => {
      const from = before.has(k) ? "environment" : fromFile?.set.includes(k) ? settingsFilePath() : fromClient.includes(k) ? "~/.claude.json (nwn-mcp entry)" : "default";
      return `${k}=${process.env[k]}  (${from})`;
    });
    write(rows.join("\n") || "no settings");
    return;
  }
  const { setupProblems } = await import("../util/setup-check.js");
  for (const problem of setupProblems()) write(`note: ${problem} (settings: ${settingsFilePath()})`, 2);

  const { registerAll } = await import("../register-all.js");
  const { recordTools, callTool, hasTool, recordedTools } = await import("../util/tool-registry.js");
  registerAll(recordTools({ tool: () => {} }) as never);

  if (list !== undefined) {
    const word = list === true ? "" : list.toLowerCase();
    const tools = recordedTools().filter((t) => !word || t.name.includes(word) || t.description.toLowerCase().includes(word));
    write(tools.map((t) => (word ? `${t.name}: ${t.description.split("\n")[0].slice(0, 160)}` : t.name)).join("\n"));
    return;
  }

  let calls: Call[] = [];
  if (callsFile) {
    const fs = await import("node:fs/promises");
    calls = parseCallsFile(JSON.parse(await fs.readFile(callsFile, "utf8")));
  } else if (rest.length) {
    calls = [{ tool: rest[0], args: parseCallArgs(rest.slice(1)) }];
  }
  if (build) calls.push({ tool: "repack_module", args: { outputPath: path.resolve(build) } });
  if (!calls.length) fail("nothing to do: give a tool, --calls or --build (--help)");
  for (const c of calls) if (!hasTool(c.tool)) fail(`unknown tool "${c.tool}" (--list shows them)`);

  if (modulePath) {
    const loaded = await callTool("load_module", { modPath: path.resolve(modulePath) });
    if (loaded.isError) fail(`load_module: ${loaded.text.slice(0, 600)}`);
    const j = loaded.json as { moduleName?: string; project?: string; twodaTablesLoaded?: number } | undefined;
    write(`loaded ${j?.moduleName ?? modulePath}${j?.project ? ` (project ${j.project})` : ""}`, 2);
  }

  const results: Array<{ tool: string; isError: boolean; text: string }> = [];
  for (const c of calls) {
    const r = await callTool(c.tool, c.args);
    results.push({ tool: c.tool, isError: r.isError, text: r.text });
    if (!json) write(`--- ${c.tool}${r.isError ? " (ERROR)" : ""}\n${r.text}`);
  }
  const ok = results.every((r) => !r.isError);
  if (json) write(JSON.stringify({ ok, results }, null, 2));
  process.exit(ok ? 0 : 1);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).replace(/\.ts$/, ".js").endsWith(path.join("cli", "tool.js"));
if (isMain) main().catch((e) => fail(e instanceof Error ? e.message : String(e)));
