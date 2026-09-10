/**
 * Tracks which temp directories have files written to them since their last
 * "clean" point (a fresh extraction or a successful repack) — i.e. whether a
 * `load_module` call on a given module right now would silently discard
 * pending work by re-extracting over it.
 *
 * Scoped per-directory, not a single global flag: `jsonToGff`/
 * `writeAndCompileScript` are called from places that write outside the
 * currently-loaded module's temp dir too (create_module assembles a new
 * module in its own throwaway directory before ever loading it) — a single
 * global flag would make every `create_module` call look like it dirtied
 * whatever module happened to already be loaded, which isn't what happened.
 */

import path from "path";

const dirtyPaths = new Set<string>();

/** Call after any write to a file inside a temp dir. */
export function markDirty(filePath: string): void {
  dirtyPaths.add(filePath);
}

/** True if anything under dirPath has been written since its last clear. */
export function isDirtyUnder(dirPath: string): boolean {
  const prefix = dirPath.endsWith(path.sep) ? dirPath : dirPath + path.sep;
  for (const p of dirtyPaths) {
    if (p.startsWith(prefix)) return true;
  }
  return false;
}

/** Clear tracked dirty paths under dirPath — call after a fresh extraction or a successful repack for it. */
export function clearDirtyUnder(dirPath: string): void {
  const prefix = dirPath.endsWith(path.sep) ? dirPath : dirPath + path.sep;
  for (const p of dirtyPaths) {
    if (p.startsWith(prefix)) dirtyPaths.delete(p);
  }
}
