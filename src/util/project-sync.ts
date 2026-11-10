/**
 * Keeps the module project in step with the temp dir (TODO #29, docs/module-projects.md). Called from the two write
 * paths every tool uses (`jsonToGff`, `writeAndCompileScript`):
 * - `beforeWrite`: if the file changed on disk since this server last wrote or loaded it (a direct nwn_gff edit), the
 *   disk version is imported into memory and the project, and the write is refused once so the caller repeats it on
 *   current data.
 * - `afterWrite`: records the file's size and mtime and flushes that one resource to the project. The first flush of a
 *   module without a project exports the whole module.
 * Does nothing unless a module is loaded and the path is inside its temp dir.
 */

import fs from "fs/promises";
import path from "path";
import { GFF_EXTENSIONS } from "../config.js";
import type { GffDocument } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { ensureAdventureDir } from "./adventure-dir.js";
import { exportProject, isProjectDir, projectPath, readManifest, PROJECT_MANIFEST } from "./project.js";

let getIndex: () => ModuleIndex | null = () => null;
const stats = new Map<string, { size: number; mtimeMs: number }>();

export function setSyncIndexGetter(fn: () => ModuleIndex | null): void {
  getIndex = fn;
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
  const manifest = await readManifest(dir);
  if (!manifest.resources.includes(key)) {
    manifest.resources.push(key);
    manifest.resources.sort();
    await fs.writeFile(path.join(dir, PROJECT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

/** A resource was deleted from the module: delete it from the project and its manifest too. */
export async function afterRemove(file: string): Promise<void> {
  const index = getIndex();
  if (!index || !inside(index, file) || isProbe(file)) return;
  stats.delete(file);
  try {
    const dir = await projectDirFor(index);
    if (!(await isProjectDir(dir))) return;
    const key = path.basename(file).toLowerCase();
    await fs.rm(path.join(dir, projectPath(key)), { force: true });
    const manifest = await readManifest(dir);
    if (manifest.resources.includes(key)) {
      manifest.resources = manifest.resources.filter((r) => r !== key);
      await fs.writeFile(path.join(dir, PROJECT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
    }
  } catch (e) {
    console.error(`project sync failed removing ${file}: ${e}`);
  }
}
