/**
 * A generated script that a person patched starts with `// hand-edited: <reason>` (docs/module-projects.md).
 * Generators refuse to overwrite it (writeAndCompileScript) and the stale-script check reports it as hand-edited
 * instead of stale. To let a generator rewrite the file, delete the header line (or move the change into a wrapper).
 */
export const HAND_EDITED_PREFIX = "// hand-edited:";

/** True when one of the first five lines is the hand-edited header. */
export function hasHandEditedHeader(source: string): boolean {
  return source.split(/\r?\n/, 5).some((l) => l.trim().toLowerCase().startsWith(HAND_EDITED_PREFIX));
}
