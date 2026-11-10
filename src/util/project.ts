/**
 * Module project (TODO #29, docs/module-projects.md): the loaded module written as nasher-style source under
 * `adventures/<Title>/`. Every GFF resource becomes pretty JSON (`src/<ext>/<resref>.<ext>.json`), scripts keep
 * their `.nss` (`src/nss/`), compiled scripts and every other file are kept as they are so the project can be packed
 * without a compiler (`src/ncs/`, `src/other/`). `project.json` records the module and every resource name.
 */

import fs from "fs/promises";
import path from "path";
import { GFF_EXTENSIONS } from "../config.js";
import type { ModuleIndex } from "../types/module.js";

export const PROJECT_MANIFEST = "project.json";
export const PROJECT_SRC = "src";

export interface ProjectManifest {
  format: 1;
  moduleName: string;
  exportedFrom: string;
  /** Resource file names exactly as they are in the .mod (lower case), in pack order. */
  resources: string[];
}

export interface ExportSummary {
  projectDir: string;
  gff: number;
  scripts: number;
  compiled: number;
  other: number;
  skipped: string[];
}

/** Folder under src/ for a file extension. */
export function projectFolder(ext: string): string {
  const e = ext.toLowerCase();
  if (GFF_EXTENSIONS.has(e)) return e;
  if (e === "nss") return "nss";
  if (e === "ncs") return "ncs";
  return "other";
}

/** Path of a resource inside the project, relative to the project directory. */
export function projectPath(fileName: string): string {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const folder = projectFolder(ext);
  const name = GFF_EXTENSIONS.has(ext) ? `${fileName}.json` : fileName;
  return path.join(PROJECT_SRC, folder, name);
}

async function writeIfChanged(file: string, data: string | Buffer): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  try {
    const old = await fs.readFile(file);
    if (Buffer.compare(old, Buffer.from(data)) === 0) return;
  } catch {
    /* new file */
  }
  await fs.writeFile(file, data);
}

export function nasherConfig(moduleName: string): string {
  return `# Written by export_project. Layout matches nasher: src/<type>/ holds JSON and scripts.
[package]
name = "${moduleName.replace(/"/g, "'")}"
description = ""
version = "1.0"

[target]
name = "default"
file = "module.mod"
include = "src/*/*.json"
include = "src/nss/*.nss"
include = "src/ncs/*.ncs"
include = "src/other/*"
`;
}

/** Writes the whole loaded module into `projectDir`. GFF content comes from the in-memory documents. */
export async function exportProject(index: ModuleIndex, projectDir: string): Promise<ExportSummary> {
  const summary: ExportSummary = { projectDir, gff: 0, scripts: 0, compiled: 0, other: 0, skipped: [] };
  const names: string[] = [];
  for (const [fileName, entry] of index.resources) {
    const rel = projectPath(fileName);
    const target = path.join(projectDir, rel);
    const ext = entry.extension.toLowerCase();
    if (GFF_EXTENSIONS.has(ext)) {
      const doc = index.parsedGff.get(fileName);
      if (!doc) {
        summary.skipped.push(`${fileName}: no parsed GFF (parse failed at load)`);
        continue;
      }
      await writeIfChanged(target, `${JSON.stringify(doc, null, 2)}\n`);
      summary.gff++;
    } else {
      try {
        await writeIfChanged(target, await fs.readFile(entry.filePath));
      } catch {
        summary.skipped.push(`${fileName}: file missing on disk`);
        continue;
      }
      if (ext === "nss") summary.scripts++;
      else if (ext === "ncs") summary.compiled++;
      else summary.other++;
    }
    names.push(fileName);
  }
  // Remove project files of resources that no longer exist in the module.
  const keep = new Set(names.map((n) => path.join(projectDir, projectPath(n))));
  for (const folder of await fs.readdir(path.join(projectDir, PROJECT_SRC)).catch(() => [] as string[])) {
    const folderPath = path.join(projectDir, PROJECT_SRC, folder);
    for (const f of await fs.readdir(folderPath).catch(() => [] as string[])) {
      const full = path.join(folderPath, f);
      if (!keep.has(full)) await fs.rm(full, { force: true });
    }
  }
  const manifest: ProjectManifest = { format: 1, moduleName: index.moduleName, exportedFrom: index.modPath, resources: names.sort() };
  await writeIfChanged(path.join(projectDir, PROJECT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeIfChanged(path.join(projectDir, "nasher.cfg"), nasherConfig(index.moduleName));
  return summary;
}

/** True when `dir` is a module project (has project.json). */
export async function isProjectDir(dir: string): Promise<boolean> {
  try {
    return (await fs.stat(path.join(dir, PROJECT_MANIFEST))).isFile();
  } catch {
    return false;
  }
}

export async function readManifest(projectDir: string): Promise<ProjectManifest> {
  return JSON.parse(await fs.readFile(path.join(projectDir, PROJECT_MANIFEST), "utf-8")) as ProjectManifest;
}

/**
 * Packs the project into a .mod (default `<projectDir>/build/module.mod`): JSON back to binary GFF with nwn_gff, other
 * files copied, everything flat into a staging directory, then nwn_erf. Returns the .mod path.
 */
export async function packProject(projectDir: string, outMod?: string): Promise<string> {
  const { jsonToGff, erfPack } = await import("../nim-tools.js");
  const { clearDirtyUnder } = await import("./dirty-state.js");
  const manifest = await readManifest(projectDir);
  const out = outMod ?? path.join(projectDir, "build", "module.mod");
  const staging = path.join(projectDir, "build", ".staging");
  await fs.rm(staging, { recursive: true, force: true });
  await fs.mkdir(staging, { recursive: true });
  try {
    for (const fileName of manifest.resources) {
      const ext = path.extname(fileName).slice(1).toLowerCase();
      const src = path.join(projectDir, projectPath(fileName));
      const dest = path.join(staging, fileName);
      if (GFF_EXTENSIONS.has(ext)) {
        await jsonToGff(JSON.parse(await fs.readFile(src, "utf-8")), dest);
      } else {
        await fs.copyFile(src, dest);
      }
    }
    await fs.mkdir(path.dirname(out), { recursive: true });
    await fs.rm(out, { force: true });
    await erfPack(staging, out);
  } finally {
    clearDirtyUnder(staging);
    await fs.rm(staging, { recursive: true, force: true });
  }
  return out;
}
