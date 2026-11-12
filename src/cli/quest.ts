#!/usr/bin/env node
/**
 * Quest CLI: build a quest spec into a module project (or .mod) with no MCP client and no LLM.
 *
 *   node dist/cli/quest.js build  <spec.json> --project <project dir | .mod> [--dry-run]
 *   node dist/cli/quest.js remove <quest tag>  --project <project dir | .mod>
 *   node dist/cli/quest.js schema            (JSON Schema of the spec, for forms and validation)
 *   node dist/cli/quest.js normalize <spec.json>   (templates expanded, stages numbered, rewards sized; no module needed)
 *
 * stdout is one JSON document: {"ok":true,"result":...} or {"ok":false,"error":"..."}; exit code 0 on success.
 * A project directory is edited in place (edits are flushed to its src/ as they happen); a .mod is edited in the temp dir
 * and NOT repacked here (use repack_module, or pass a project). See docs/quest-cli.md.
 */
import fs from "fs/promises";
import path from "path";
import { loadModule, buildResmanOptions, requireIndex } from "../module-loader.js";
import { isProjectDir, packProject } from "../util/project.js";
import { buildQuestFromJson } from "../tools/quest-tools.js";
import { removeQuest } from "../util/quest-builder.js";
import { normalizeQuestSpec, QuestSpecError, type QuestInput } from "../util/quest-spec.js";

function out(ok: boolean, payload: unknown): never {
  process.stdout.write(`${JSON.stringify(ok ? { ok, result: payload } : { ok, error: payload }, null, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

function parse(argv: string[]): { cmd: string; arg?: string; project?: string; dryRun: boolean } {
  const [cmd, ...rest] = argv;
  let arg: string | undefined;
  let project: string | undefined;
  let dryRun = false;
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--project") project = rest[++i];
    else if (rest[i] === "--dry-run") dryRun = true;
    else if (arg === undefined) arg = rest[i];
  }
  return { cmd: cmd ?? "", arg, project, dryRun };
}

async function loadTarget(target: string): Promise<void> {
  let p = path.resolve(target);
  if ((await fs.stat(p)).isDirectory()) {
    if (!(await isProjectDir(p))) throw new Error(`${p} is a directory without project.json (not a module project)`);
    p = await packProject(p);
  }
  await loadModule(p);
}

async function main(): Promise<void> {
  const { cmd, arg, project, dryRun } = parse(process.argv.slice(2));
  if (cmd === "schema") {
    const schemaPath = path.join(import.meta.dirname, "..", "..", "docs", "quest-spec.schema.json");
    out(true, JSON.parse(await fs.readFile(schemaPath, "utf8")));
  }
  if (cmd === "normalize") {
    if (!arg) out(false, "usage: quest normalize <spec.json>");
    try {
      out(true, normalizeQuestSpec(JSON.parse(await fs.readFile(arg as string, "utf8")) as QuestInput));
    } catch (e) {
      if (e instanceof QuestSpecError) out(false, e.message);
      throw e;
    }
  }
  if (!["build", "remove"].includes(cmd) || !arg || !project) {
    out(false, "usage: quest build <spec.json> --project <dir|.mod> [--dry-run] | quest remove <tag> --project <dir|.mod> | quest normalize <spec.json> | quest schema");
  }
  await loadTarget(project as string);
  if (cmd === "build") {
    const res = await buildQuestFromJson(await fs.readFile(arg as string, "utf8"), dryRun);
    const text = res.content[0]?.text ?? "";
    if (res.isError) out(false, text);
    out(true, JSON.parse(text));
  }
  const index = requireIndex();
  const removed = await removeQuest(index, await buildResmanOptions(index), (arg as string).toLowerCase());
  out(true, { tag: arg, variablesRemoved: removed });
}

main().catch((e) => out(false, (e as Error).message));
