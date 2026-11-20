/**
 * Real blueprints like one that does not exist: a model guesses `plc_crate` (the base game's crates are
 * `x2_easy_crate1` and friends) and then `plc_crate1` ... `plc_crate4` (The Mill on Blackwater, 2026-11-18). The
 * not-found answers of place_placeable and dress_area name a few real ones found by the guess's main word.
 */
import { callTool, hasTool } from "./tool-registry.js";

const cache = new Map<string, string[]>();

/** The word worth searching for in a resref: `plc_crate1` -> crate, `nw_plc_rock3` -> rock, `x2_easy_crate2` -> crate. */
export function blueprintWord(resref: string): string {
  const parts = resref
    .toLowerCase()
    .replace(/\.ut[a-z]$/, "")
    .split(/[_\d]+/)
    .filter((w) => w.length >= 3 && !["plc", "nw", "tm", "x0", "x2", "x3", "easy", "medium", "hard"].includes(w));
  return parts.sort((a, b) => b.length - a.length)[0] ?? "";
}

/** Up to `max` real blueprint resrefs of `type` sharing the main word of `resref` (empty when none or no search). */
export async function similarBlueprints(type: string, resref: string, max = 5): Promise<string[]> {
  const word = blueprintWord(resref);
  if (!word || !hasTool("list_blueprints")) return [];
  const key = `${type}:${word}`;
  const known = cache.get(key);
  if (known) return known;
  let found: string[] = [];
  try {
    const r = await callTool("list_blueprints", { type, pattern: word, limit: String(max) });
    found = ((r.json?.results as Array<{ resref?: string }> | undefined) ?? []).map((x) => x.resref ?? "").filter(Boolean).slice(0, max);
  } catch {
    found = [];
  }
  cache.set(key, found);
  return found;
}

/** "Blueprint not found: plc_crate.utp" with the real ones, for a tool answer. */
export async function notFoundText(type: string, resref: string): Promise<string> {
  const similar = await similarBlueprints(type, resref);
  const word = blueprintWord(resref);
  return `Blueprint not found: ${resref}.${type}.${similar.length ? ` Real ${word} blueprints: ${similar.join(", ")}.` : word ? ` list_blueprints(type: "${type}", pattern: "${word}") finds real ones.` : ""}`;
}
