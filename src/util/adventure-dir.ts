/**
 * Where an LLM-built module keeps its own files: `adventures/<Title-With-Dashes>/` (git-ignored) holds the story
 * (adventure.md), the DM guide (dm-guide.md), the phase status and the recorded scope. The MCP temp dir stays the
 * working copy of the extracted .mod only; files an older run left in it are moved over on first use.
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

/** Files that belong to the adventure, not to the .mod archive. */
export const ADVENTURE_FILES = {
  story: "adventure.md",
  status: "adventure-status.json",
  scope: "project-scope.json",
  dmGuide: "dm-guide.md",
} as const;

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
  for (const name of Object.values(ADVENTURE_FILES)) {
    const legacy = path.join(index.tempDir, name);
    const target = path.join(dir, name);
    if ((await exists(legacy)) && !(await exists(target))) {
      await fs.copyFile(legacy, target);
      await fs.rm(legacy);
    }
  }
  return dir;
}

/** Full path of one adventure file (the directory is created and legacy files migrated first). */
export async function adventureFile(
  index: { moduleName: string; tempDir: string },
  which: keyof typeof ADVENTURE_FILES,
): Promise<string> {
  return path.join(await ensureAdventureDir(index), ADVENTURE_FILES[which]);
}
