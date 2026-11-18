/**
 * Keeps the module project in step with the temp dir (TODO #29, docs/module-projects.md). Called from the two write
 * paths every tool uses (`jsonToGff`, `writeAndCompileScript`):
 * - `beforeWrite`: if the file changed on disk since this server last wrote or loaded it (a direct nwn_gff edit), the
 *   disk version is imported into memory and the project, and the write is refused once so the caller repeats it on
 *   current data.
 * - `afterWrite`: records the file's size and mtime and flushes that one resource to the project. The first flush of a
 *   module without a project exports the whole module.
 * - The project's own `src/` files are watched too: another program (a second server, a script run with the CLI, an
 *   edit by hand) may write the project while this server holds an older copy in memory. Before any write the server
 *   compares every project file with what it loaded or last wrote; when one changed, the write is refused and the
 *   caller reloads (`load_module` on the project), so the old copy never lands on top of the newer files.
 * Does nothing unless a module is loaded and the path is inside its temp dir.
 */

import fs from "fs/promises";
import path from "path";
import { GFF_EXTENSIONS } from "../config.js";
import type { GffDocument } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { adventureBase, ensureAdventureDir, slugTitle } from "./adventure-dir.js";
import { exportProject, isProjectDir, projectPath, readManifest, PROJECT_MANIFEST, PROJECT_SRC } from "./project.js";

let getIndex: () => ModuleIndex | null = () => null;
const stats = new Map<string, { size: number; mtimeMs: number }>();
/** Project `src/` files as this server last loaded or wrote them: absolute path -> size and mtime. */
const projectStats = new Map<string, { size: number; mtimeMs: number }>();
let projectWatched: string | null = null;

export function setSyncIndexGetter(fn: () => ModuleIndex | null): void {
  getIndex = fn;
}

/**
 * Flat sync, for a module loaded from a flat source directory (`loadSourceDir`): the source is never written. Each
 * written resource is recorded, and with `out` set it is also written there in the source layout (`<name>.json` for
 * GFF, scripts as they are; compiled scripts are left out, the module build compiles them). No module project or
 * adventure directory is involved.
 */
let flat: { out: string | null; files: Set<string>; removed: Set<string> } | null = null;

export function setFlatSync(target: { out: string | null } | null): void {
  flat = target ? { out: target.out, files: new Set(), removed: new Set() } : null;
}

/** File names (source layout) written to `out` and resources removed since the load, sorted. */
export function flatSyncReport(): { out: string | null; files: string[]; removed: string[] } | null {
  return flat ? { out: flat.out, files: [...flat.files].sort(), removed: [...flat.removed].sort() } : null;
}

function flatName(key: string): string {
  return GFF_EXTENSIONS.has(path.extname(key).slice(1)) ? `${key}.json` : key;
}

async function flushFlat(index: ModuleIndex, file: string, doc?: GffDocument): Promise<void> {
  if (!flat) return;
  const key = path.basename(file).toLowerCase();
  const ext = path.extname(key).slice(1);
  if (ext === "ncs") return;
  const name = flatName(key);
  flat.removed.delete(name);
  flat.files.add(name);
  if (!flat.out) return;
  await fs.mkdir(flat.out, { recursive: true });
  if (GFF_EXTENSIONS.has(ext)) {
    const d = doc ?? index.parsedGff.get(key);
    if (!d) return;
    await fs.writeFile(path.join(flat.out, name), `${stringifySource(d)}\n`);
  } else {
    await fs.copyFile(file, path.join(flat.out, name));
  }
}

const NEGATIVE_ZERO = "\u0000-0";

/**
 * Pretty JSON for a source file. JSON.stringify writes -0 as 0, which would flip the sign of every `-0.0` the source
 * holds (orientations, positions) in a file the tool only touched elsewhere; they are written back as `-0.0`.
 */
export function stringifySource(doc: unknown): string {
  const text = JSON.stringify(doc, (_key, value) => (Object.is(value, -0) ? NEGATIVE_ZERO : value), 2);
  return text.replaceAll(JSON.stringify(NEGATIVE_ZERO), "-0.0");
}

async function removeFlat(file: string): Promise<void> {
  if (!flat) return;
  const key = path.basename(file).toLowerCase();
  if (path.extname(key) === ".ncs") return;
  const name = flatName(key);
  flat.files.delete(name);
  flat.removed.add(name);
  if (flat.out) await fs.rm(path.join(flat.out, name), { force: true });
}

function inside(index: ModuleIndex, file: string): boolean {
  const base = index.tempDir.endsWith(path.sep) ? index.tempDir : index.tempDir + path.sep;
  return path.dirname(file) + path.sep === base;
}

export async function trackFile(file: string): Promise<void> {
  try {
    const s = await fs.stat(file);
    stats.set(file, { size: s.size, mtimeMs: s.mtimeMs });
  } catch {
    stats.delete(file);
  }
}

/** Record the baseline of every file in the module's temp dir (after extraction). */
export async function trackAll(index: ModuleIndex): Promise<void> {
  for (const [p] of [...stats]) if (p.startsWith(index.tempDir + path.sep)) stats.delete(p);
  await Promise.all([...index.resources.values()].map((r) => trackFile(r.filePath)));
  projectWatched = null;
  projectStats.clear();
  if (flat) return;
  // The project folder without creating one: the build folder's parent, else the adventure folder of that title.
  const buildDir = index.modPath ? path.dirname(index.modPath) : "";
  const candidates = [
    ...(path.basename(buildDir) === "build" ? [path.dirname(buildDir)] : []),
    path.join(adventureBase(), slugTitle(index.moduleName)),
  ];
  for (const dir of candidates) {
    if (await isProjectDir(dir)) {
      await trackProject(dir);
      return;
    }
  }
}

async function listFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await listFiles(p)));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

async function statOf(file: string): Promise<{ size: number; mtimeMs: number } | null> {
  try {
    const s = await fs.stat(file);
    return { size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return null;
  }
}

/** Record every project `src/` file as it is now: the baseline outside edits are measured against. */
export async function trackProject(projectDir: string): Promise<void> {
  projectWatched = projectDir;
  projectStats.clear();
  const files = await listFiles(path.join(projectDir, PROJECT_SRC));
  await Promise.all(
    files.map(async (f) => {
      const s = await statOf(f);
      if (s) projectStats.set(f, s);
    }),
  );
}

async function trackProjectFile(file: string): Promise<void> {
  if (!projectWatched || !file.startsWith(projectWatched + path.sep)) return;
  const s = await statOf(file);
  if (s) projectStats.set(file, s);
  else projectStats.delete(file);
}

/** Project files changed, added or deleted by another program since this server loaded or wrote them (relative paths). */
export async function projectChangesOutside(): Promise<{ changed: string[]; added: string[]; removed: string[] }> {
  const none = { changed: [], added: [], removed: [] };
  if (!projectWatched) return none;
  const dir = projectWatched;
  const files = await listFiles(path.join(dir, PROJECT_SRC));
  const seen = new Set(files);
  const changed: string[] = [];
  const added: string[] = [];
  await Promise.all(
    files.map(async (f) => {
      const known = projectStats.get(f);
      const now = await statOf(f);
      if (!now) return;
      if (!known) added.push(path.relative(dir, f));
      else if (known.size !== now.size || known.mtimeMs !== now.mtimeMs) changed.push(path.relative(dir, f));
    }),
  );
  const removed = [...projectStats.keys()].filter((f) => !seen.has(f)).map((f) => path.relative(dir, f));
  return { changed: changed.sort(), added: added.sort(), removed: removed.sort() };
}

/** Refuse a write while the project holds files newer than this server's copy. */
async function refuseIfProjectChanged(): Promise<void> {
  const c = await projectChangesOutside();
  const all = [...c.changed, ...c.added, ...c.removed];
  if (!all.length) return;
  const list = all.slice(0, 8).join(", ") + (all.length > 8 ? ` and ${all.length - 8} more` : "");
  throw new Error(
    `The module project ${projectWatched} was changed outside this server since it loaded it (${list}). This server holds an older copy; writing now would put it over those files. Nothing was written. Call load_module(modPath: "${projectWatched}", force: true) to load the current files (this server's own edits are already in the project), then repeat the call.`,
  );
}

/** The project directory of the loaded module: its own folder when loaded from a project, else the adventure directory. */
export async function projectDirFor(index: ModuleIndex): Promise<string> {
  const buildDir = path.dirname(index.modPath);
  if (path.basename(buildDir) === "build") {
    const parent = path.dirname(buildDir);
    if (await isProjectDir(parent)) return parent;
  }
  return ensureAdventureDir(index);
}

/** Probe scripts (`_<tool>_probe`) exist only to prove a generated include compiles; they never belong in the project. */
function isProbe(file: string): boolean {
  return /^_[a-z]+_probe\./i.test(path.basename(file));
}

export async function beforeWrite(file: string): Promise<void> {
  const index = getIndex();
  if (!index || !inside(index, file) || isProbe(file)) return;
  if (flat) return; // the temp dir is private to this load: nothing else edits it
  await refuseIfProjectChanged();
  const known = stats.get(file);
  if (!known) return;
  let now: { size: number; mtimeMs: number };
  try {
    const s = await fs.stat(file);
    now = { size: s.size, mtimeMs: s.mtimeMs };
  } catch {
    return; // deleted outside: writing recreates it
  }
  if (now.size === known.size && now.mtimeMs === known.mtimeMs) return;
  const key = path.basename(file).toLowerCase();
  const ext = path.extname(key).slice(1);
  if (GFF_EXTENSIONS.has(ext)) {
    const { gffToJson } = await import("../nim-tools.js");
    index.parsedGff.set(key, await gffToJson(file));
  }
  await trackFile(file);
  await flushResource(index, file);
  throw new Error(
    `${key} was changed on disk outside the tools since the server last wrote it. The disk version is now imported into memory and the project; this write was refused so it does not overwrite that edit. Repeat the call.`,
  );
}

export async function afterWrite(file: string, doc?: GffDocument): Promise<void> {
  const index = getIndex();
  if (!index || !inside(index, file) || isProbe(file)) return;
  await trackFile(file);
  if (flat) {
    await flushFlat(index, file, doc);
    return;
  }
  try {
    await flushResource(index, file, doc);
  } catch (e) {
    console.error(`project sync failed for ${file}: ${e}`);
  }
}

async function flushResource(index: ModuleIndex, file: string, doc?: GffDocument): Promise<void> {
  const dir = await projectDirFor(index);
  if (!(await isProjectDir(dir))) {
    await exportProject(index, dir);
    await trackProject(dir);
    return;
  }
  const key = path.basename(file).toLowerCase();
  const ext = path.extname(key).slice(1);
  const target = path.join(dir, projectPath(key));
  await fs.mkdir(path.dirname(target), { recursive: true });
  if (GFF_EXTENSIONS.has(ext)) {
    const d = doc ?? index.parsedGff.get(key);
    if (!d) return;
    await fs.writeFile(target, `${JSON.stringify(d, null, 2)}\n`);
  } else {
    await fs.copyFile(file, target);
  }
  await trackProjectFile(target);
  const manifest = await readManifest(dir);
  if (!manifest.resources.includes(key)) {
    manifest.resources.push(key);
    manifest.resources.sort();
    await fs.writeFile(path.join(dir, PROJECT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

/**
 * Remove a resource from the module and, in the same step, from the module project (file and manifest) or the flat
 * sync. The one way a tool deletes a resource: `project-sync-guard.test.ts` fails on a `resources.delete(` elsewhere.
 * `filePath` is used when the index entry has none (a file another program already deleted).
 */
export async function removeResource(index: ModuleIndex, key: string, filePath?: string): Promise<void> {
  const k = key.toLowerCase();
  const file = index.resources.get(k)?.filePath || filePath || path.join(index.tempDir, k);
  await fs.rm(file, { force: true });
  await afterRemove(file);
  index.resources.delete(k);
  index.parsedGff.delete(k);
}

/** A resource was deleted from the module: delete it from the project and its manifest too. */
export async function afterRemove(file: string): Promise<void> {
  const index = getIndex();
  if (!index || !inside(index, file) || isProbe(file)) return;
  stats.delete(file);
  if (flat) {
    await removeFlat(file);
    return;
  }
  try {
    const dir = await projectDirFor(index);
    if (!(await isProjectDir(dir))) return;
    const key = path.basename(file).toLowerCase();
    await fs.rm(path.join(dir, projectPath(key)), { force: true });
    await trackProjectFile(path.join(dir, projectPath(key)));
    const manifest = await readManifest(dir);
    if (manifest.resources.includes(key)) {
      manifest.resources = manifest.resources.filter((r) => r !== key);
      await fs.writeFile(path.join(dir, PROJECT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
    }
  } catch (e) {
    console.error(`project sync failed removing ${file}: ${e}`);
  }
}
