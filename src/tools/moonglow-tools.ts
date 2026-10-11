/**
 * Moonglow Toolset plugin tools.
 *
 * Moonglow (a Rust reimplementation of the NWN:EE toolset) runs plugins — a
 * folder with plugin.cfg and Luau scripts — through `mg plugin`. These tools
 * let the LLM list a plugin's commands and run one on the loaded module.
 *
 * Tools:
 * - moonglow_list_plugins: Commands and checks of the plugins in a folder
 * - moonglow_run_plugin: Run a plugin command on the loaded module
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MOONGLOW_BIN, MOONGLOW_PLUGINS, NWN_FOLDER_DATA, NWN_FOLDER_USER, GFF_EXTENSIONS } from "../config.js";
import { requireIndex } from "../module-loader.js";
import { gffToJson } from "../nim-tools.js";
import { markDirty } from "../util/dirty-state.js";

const execFileAsync = promisify(execFile);

// A plugin can scan a whole module (about 35 s on a large one).
const MG_TIMEOUT = 300_000;

interface MgResult {
  ok: boolean;
  json: unknown;
  text: string;
}

/** Run `mg --json ...args`. mg prints {"error": ...} and exits non-zero on failure. */
async function mg(args: string[]): Promise<MgResult> {
  const global: string[] = ["--json"];
  if (NWN_FOLDER_DATA) global.push("--root", NWN_FOLDER_DATA);
  if (NWN_FOLDER_USER) global.push("--user-dir", NWN_FOLDER_USER);
  else global.push("--no-user-dir");
  try {
    const { stdout } = await execFileAsync(MOONGLOW_BIN, [...global, ...args], {
      timeout: MG_TIMEOUT,
      maxBuffer: 50 * 1024 * 1024,
      encoding: "utf-8",
    });
    return { ok: true, json: parseJson(stdout), text: stdout };
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string; code?: string };
    if (e.code === "ENOENT") {
      throw new Error(
        `Moonglow's "${MOONGLOW_BIN}" binary was not found. Set MOONGLOW_BIN to the path of the mg executable.`,
      );
    }
    const text = e.stdout || e.stderr || e.message || "Unknown error";
    return { ok: false, json: parseJson(e.stdout ?? ""), text };
  }
}

function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function errorText(r: MgResult): string {
  const j = r.json as { error?: string } | undefined;
  return j?.error ?? r.text.trim();
}

/** Size and mtime of every file in a folder, to find what a plugin changed. */
async function snapshot(dir: string): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  for (const name of await fs.readdir(dir)) {
    try {
      const st = await fs.stat(path.join(dir, name));
      if (st.isFile()) out.set(name, `${st.size}:${st.mtimeMs}`);
    } catch { /* vanished */ }
  }
  return out;
}

export function registerMoonglowTools(server: McpServer): void {

  server.tool(
    "moonglow_list_plugins",
    "List Moonglow Toolset plugins in a folder: each plugin's id, its commands (the ids moonglow_run_plugin takes) and its checks. " +
    "Needs the mg binary (MOONGLOW_BIN). Folder defaults to MOONGLOW_PLUGINS.",
    {
      folder: z.string().optional().describe("A plugin's folder, or a folder of plugin folders. Default: MOONGLOW_PLUGINS."),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ folder }) => {
      const dir = folder || MOONGLOW_PLUGINS;
      if (!dir) {
        return { isError: true, content: [{ type: "text", text: "No folder given and MOONGLOW_PLUGINS is not set." }] };
      }
      const r = await mg(["plugin", "list", dir]);
      if (!r.ok) return { isError: true, content: [{ type: "text", text: errorText(r) }] };
      return { content: [{ type: "text", text: JSON.stringify(r.json ?? r.text, null, 2) }] };
    },
  );

  server.tool(
    "moonglow_run_plugin",
    "Run a Moonglow Toolset plugin command on the loaded module (e.g. the NESS spawn-point plugin or the TFN quest builder). " +
    "The plugin's edits are applied to the unpacked module as one all-or-nothing step; call repack_module afterwards. " +
    "Use moonglow_list_plugins for command ids. A plugin's form fields are set with `answers` (field id → value; others take defaults); " +
    "files/folders it asks for go in `files`, in the order it asks. Confirm prompts say no unless `yes` is true. " +
    "Defaults to a dry run that only reports the edits — set dryRun:false to apply. " +
    "After a real run, GFF content is refreshed (get_resource sees it) but list_*/summary tools show the old picture until repack_module + load_module(force:true).",
    {
      plugin: z.string().describe("The plugin's folder (the one holding plugin.cfg)."),
      command: z.string().describe("The command id from plugin.cfg."),
      answers: z.record(z.string(), z.string()).optional().describe("Form answers: field id → value (text, number, true/false, or a choice)."),
      files: z.array(z.string()).optional().describe("Paths for the plugin where it asks for a file or folder, in order."),
      yes: z.boolean().optional().describe("Answer yes where the plugin asks to confirm. Default false."),
      dryRun: z.boolean().optional().describe("Only report the edits; change nothing. Default true."),
    },
    async ({ plugin, command, answers, files, yes, dryRun }) => {
      const index = requireIndex();
      const dry = dryRun !== false;

      const args = ["plugin", "run", index.tempDir, plugin, command];
      for (const [id, value] of Object.entries(answers ?? {})) args.push("--answer", `${id}=${value}`);
      for (const f of files ?? []) args.push("--file", f);
      if (yes) args.push("--yes");
      if (dry) args.push("--dry-run");

      const before = dry ? null : await snapshot(index.tempDir);
      const r = await mg(args);
      if (!r.ok) return { isError: true, content: [{ type: "text", text: `Plugin failed, nothing changed: ${errorText(r)}` }] };

      const changed: string[] = [];
      if (before) {
        const after = await snapshot(index.tempDir);
        for (const [name, sig] of after) {
          if (before.get(name) === sig) continue;
          changed.push(name);
          const filePath = path.join(index.tempDir, name);
          markDirty(filePath);
          const key = name.toLowerCase();
          const ext = path.extname(name).slice(1).toLowerCase();
          index.resources.set(key, {
            resref: path.basename(name, path.extname(name)),
            extension: ext,
            filePath,
            sizeBytes: Number(sig.split(":")[0]),
          });
          if (GFF_EXTENSIONS.has(ext)) {
            try { index.parsedGff.set(key, await gffToJson(filePath)); } catch { /* left stale */ }
          }
        }
        for (const name of before.keys()) {
          if (after.has(name)) continue;
          changed.push(`${name} (deleted)`);
          index.resources.delete(name.toLowerCase());
          index.parsedGff.delete(name.toLowerCase());
        }
      }

      // mg's JSON carries every edit's bytes (base64) in "command": far too big to return.
      const summary = r.json && typeof r.json === "object"
        ? Object.fromEntries(Object.entries(r.json as Record<string, unknown>).filter(([k]) => k !== "command"))
        : r.text;

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            applied: !dry,
            changedFiles: dry ? undefined : changed.sort(),
            next: dry ? "Review, then run again with dryRun:false." : "Call repack_module to write the .mod.",
            result: summary,
          }, null, 2),
        }],
      };
    },
  );
}
