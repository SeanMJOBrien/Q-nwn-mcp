/**
 * Where an LLM-built module keeps its own files: `adventures/<Title-With-Dashes>/` (git-ignored) holds the story
 * (`<Title-With-Dashes>.md`), the DM guide (`<Title-With-Dashes>-dm-guide.md`), the phase status and the recorded scope. The MCP temp dir stays the
 * working copy of the extracted .mod only; files an older run left in it are moved over on first use.
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

/** Files that belong to the adventure, not to the .mod archive (the names an older run used; see adventureFileName). */
export const LEGACY_ADVENTURE_FILES = {
  story: "adventure.md",
  status: "adventure-status.json",
  scope: "project-scope.json",
  dmGuide: "dm-guide.md",
} as const;

export type AdventureFileKind = keyof typeof LEGACY_ADVENTURE_FILES;

/** Suffix after the title slug (user rule 2026-11-11): every file carries the title so adventures can share one folder. */
const NEW_SUFFIX: Record<AdventureFileKind, string> = {
  story: ".md",
  status: "-status.json",
  scope: "-scope.json",
  dmGuide: "-dm-guide.md",
};

/** File name of one adventure file inside adventure directory `dir` (`adventures/<Title-With-Dashes>`): `<Title-With-Dashes>.md` etc. */
export function adventureFileName(dir: string, which: AdventureFileKind): string {
  return `${path.basename(dir)}${NEW_SUFFIX[which]}`;
}

/** Full path of one adventure file inside `dir`. */
export function adventurePath(dir: string, which: AdventureFileKind): string {
  return path.join(dir, adventureFileName(dir, which));
}

/** Every adventure file name for `dir`, by kind. */
export function adventureFileNames(dir: string): Record<AdventureFileKind, string> {
  return Object.fromEntries(
    (Object.keys(LEGACY_ADVENTURE_FILES) as AdventureFileKind[]).map((k) => [k, adventureFileName(dir, k)]),
  ) as Record<AdventureFileKind, string>;
}

/** "The Salt Gate Conspiracy" -> "The-Salt-Gate-Conspiracy". Never empty, never contains a path separator. */
export function slugTitle(title: string): string {
  const slug = title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "Untitled-Module";
}

/** Base folder for all adventures: MCP_FOLDER_ADVENTURES, else `<repo>/adventures` (git-ignored). Read at call time. */
export function adventureBase(): string {
  if (process.env.MCP_FOLDER_ADVENTURES) return process.env.MCP_FOLDER_ADVENTURES;
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  // Installed somewhere read-only or without a repo around it: fall back to a folder in the temp area.
  return repoRoot.includes("node_modules") ? path.join(os.tmpdir(), "nwn-mcp-adventures") : path.join(repoRoot, "adventures");
}

async function exists(file: string): Promise<boolean> {
  try {
    await fs.access(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * The adventure directory for a loaded module (created when missing). Any adventure file an earlier run left in the
 * module's temp dir is moved here unless the directory already has its own copy.
 */
export async function ensureAdventureDir(index: { moduleName: string; tempDir: string }): Promise<string> {
  const dir = path.join(adventureBase(), slugTitle(index.moduleName));
  await fs.mkdir(dir, { recursive: true });
  for (const kind of Object.keys(LEGACY_ADVENTURE_FILES) as AdventureFileKind[]) {
    const oldName = LEGACY_ADVENTURE_FILES[kind];
    const target = adventurePath(dir, kind);
    // A file an earlier run left in the temp dir, then one under the old (untitled) name in the directory itself.
    const inTemp = path.join(index.tempDir, oldName);
    const inDir = path.join(dir, oldName);
    if (!(await exists(target))) {
      if (await exists(inTemp)) {
        await fs.copyFile(inTemp, target);
        await fs.rm(inTemp);
      } else if (await exists(inDir)) {
        await fs.rename(inDir, target);
      }
    }
  }
  return dir;
}

/** Full path of one adventure file (the directory is created and legacy files migrated first). */
export async function adventureFile(
  index: { moduleName: string; tempDir: string },
  which: AdventureFileKind,
): Promise<string> {
  return adventurePath(await ensureAdventureDir(index), which);
}
