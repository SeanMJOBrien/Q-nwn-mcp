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
 * and NOT repacked here (use repack_module, or pass a project).
 *
 * A flat source directory (a Q-nwn-manager project, or its `unpacked/`: `<resref>.<ext>.json` + `.nss`) is read directly
 * and never written: build and remove need `--out <dir>`, which receives the changed files in the same layout for the
 * caller to apply; the result's `source` lists them. `--no-compile` writes the scripts without compiling them (the
 * module build does that). See docs/quest-cli.md.
 */
import fs from "fs/promises";
import path from "path";
import { loadModule, loadSourceDir, isSourceDir, buildResmanOptions, requireIndex } from "../module-loader.js";
import { flatSyncReport } from "../util/project-sync.js";
import { setCompileEnabled } from "../util/script-writer.js";
import { isProjectDir, packProject } from "../util/project.js";
import { buildQuestFromJson } from "../tools/quest-tools.js";
import { removeQuest } from "../util/quest-builder.js";
import { normalizeQuestSpec, QuestSpecError, type QuestInput } from "../util/quest-spec.js";

function out(ok: boolean, payload: unknown): never {
  process.stdout.write(`${JSON.stringify(ok ? { ok, result: payload } : { ok, error: payload }, null, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

interface Args {
  cmd: string;
  arg?: string;
  project?: string;
  out?: string;
  dryRun: boolean;
  compile: boolean;
}

function parse(argv: string[]): Args {
  const [cmd, ...rest] = argv;
  const a: Args = { cmd: cmd ?? "", dryRun: false, compile: true };
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === "--project") a.project = rest[++i];
    else if (rest[i] === "--out") a.out = rest[++i];
    else if (rest[i] === "--dry-run") a.dryRun = true;
    else if (rest[i] === "--no-compile") a.compile = false;
    else if (a.arg === undefined) a.arg = rest[i];
  }
  return a;
}

/** The flat source directory behind `dir`: its `unpacked/` (a Q-nwn-manager project) or `dir` itself; null if neither. */
async function sourceDirOf(dir: string): Promise<string | null> {
  for (const cand of [path.join(dir, "unpacked"), dir]) if (await isSourceDir(cand)) return cand;
  return null;
}

/** Loads the target; returns true when it is a flat source directory (changes go to `out`, not into the target). */
async function loadTarget(target: string, out: string | undefined, writes: boolean): Promise<boolean> {
  let p = path.resolve(target);
  if ((await fs.stat(p)).isDirectory()) {
    if (!(await isProjectDir(p))) {
      const source = await sourceDirOf(p);
      if (!source) {
        throw new Error(`${p} is neither a module project (project.json) nor module source (module.ifo.json, or unpacked/ with one)`);
      }
      if (writes && !out) {
        throw new Error("a source directory is never written directly: pass --out <dir> to receive the changed files");
      }
      if (out) {
        const outAbs = path.resolve(out);
        if (outAbs === source || outAbs.startsWith(source + path.sep)) throw new Error("--out must be outside the source directory");
        if ((await fs.readdir(outAbs).catch(() => [])).length > 0) throw new Error(`--out ${outAbs} is not empty`);
      }
      await loadSourceDir(source, { out: writes ? out : undefined });
      return true;
    }
    p = await packProject(p);
  }
  await loadModule(p);
  return false;
}

/** For a source directory: where the changed files are and which they are. */
function sourceReport(compile: boolean): Record<string, unknown> {
  const r = flatSyncReport();
  return r ? { source: { dir: requireIndex().modPath, out: r.out, files: r.files, removed: r.removed, compiled: compile } } : {};
}

async function main(): Promise<void> {
  const { cmd, arg, project, out: outDir, dryRun, compile } = parse(process.argv.slice(2));
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
    out(false, "usage: quest build <spec.json> --project <dir|.mod> [--dry-run] [--out <dir>] [--no-compile] | quest remove <tag> --project <dir|.mod> [--out <dir>] | quest normalize <spec.json> | quest schema");
  }
  const writes = cmd === "remove" || !dryRun;
  const isSource = await loadTarget(project as string, outDir, writes);
  if (!compile || (isSource && !writes)) setCompileEnabled(false);
  if (cmd === "build") {
    const res = await buildQuestFromJson(await fs.readFile(arg as string, "utf8"), dryRun);
    const text = res.content[0]?.text ?? "";
    if (res.isError) out(false, text);
    out(true, { ...JSON.parse(text), ...(isSource && writes ? sourceReport(compile) : {}) });
  }
  const index = requireIndex();
  const removed = await removeQuest(index, await buildResmanOptions(index), (arg as string).toLowerCase());
  out(true, { tag: arg, variablesRemoved: removed, ...(isSource ? sourceReport(compile) : {}) });
}

main().catch((e) => out(false, (e as Error).message));
