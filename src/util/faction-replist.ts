/**
 * The faction reputation table (.fac RepList) in the layout the toolset writes and the engine reads.
 *
 * Row (FactionID1 = a, FactionID2 = b, FactionRep = r) means "faction b's opinion of faction a is r". The PC faction (0)
 * holds no opinions, so no row has FactionID2 = 0. The toolset writes one row for every a in 0..N-1 and b in 1..N-1, in
 * that order (a outer, b inner), with __struct_id = row index, every value a `dword`, and a self row (a = b) of 100.
 *
 * Engine-checked 2026-11-17 (The Salt Gate Conspiracy): a sixth faction "Prisoner" written in this layout takes part
 * in GetReputation/GetIsEnemy as its rows say. The older create_faction appended rows at the end (including b = 0 rows
 * and no self row), and the engine ignored the new faction: the source of the old "custom factions never participate"
 * note, which was wrong.
 */

import { getFieldNum } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";

export const PC_FACTION = 0;
export const DEFAULT_REPUTATION = 50;

/** Key for "b's opinion of a". */
function key(a: number, b: number): string {
  return `${a}:${b}`;
}

/**
 * Rebuild a RepList for `factionCount` factions. Each value comes from `overrides` first, then from the existing rows,
 * then the default (100 for a self row, else `defaultRep`). Rows with b = 0 and rows naming a faction outside the list
 * are dropped.
 */
export function canonicalRepList(
  factionCount: number,
  existing: GffObj[],
  opts: { overrides?: Map<string, number>; defaultRep?: number } = {},
): GffObj[] {
  const values = new Map<string, number>();
  for (const row of existing) {
    values.set(key(getFieldNum(row, "FactionID1"), getFieldNum(row, "FactionID2")), getFieldNum(row, "FactionRep"));
  }
  for (const [k, v] of opts.overrides ?? []) values.set(k, v);
  const defaultRep = opts.defaultRep ?? DEFAULT_REPUTATION;

  const rows: GffObj[] = [];
  for (let a = 0; a < factionCount; a++) {
    for (let b = 1; b < factionCount; b++) {
      const rep = values.get(key(a, b)) ?? (a === b ? 100 : defaultRep);
      rows.push({
        __struct_id: rows.length,
        FactionID1: { type: "dword", value: a },
        FactionID2: { type: "dword", value: b },
        FactionRep: { type: "dword", value: rep },
      });
    }
  }
  return rows;
}

/**
 * Overrides that set the reputation between `f1` and `f2` both ways: f2's opinion of f1 and f1's opinion of f2. An
 * opinion held by the PC faction is skipped (it has none).
 */
export function mutualReputation(f1: number, f2: number, rep: number): Map<string, number> {
  const out = new Map<string, number>();
  if (f2 !== PC_FACTION) out.set(key(f1, f2), rep);
  if (f1 !== PC_FACTION) out.set(key(f2, f1), rep);
  return out;
}

/** Overrides that give a new faction `id` the reputation `rep` toward and from every other faction. */
export function newFactionReputation(id: number, factionCount: number, rep: number): Map<string, number> {
  const out = new Map<string, number>();
  for (let other = 0; other < factionCount; other++) {
    if (other === id) continue;
    for (const [k, v] of mutualReputation(id, other, rep)) out.set(k, v);
  }
  return out;
}

/** Whether `rows` already matches the canonical layout (order, struct IDs, types, no b = 0 rows, nothing missing). */
export function isCanonicalRepList(factionCount: number, rows: GffObj[]): boolean {
  if (rows.length !== factionCount * (factionCount - 1)) return false;
  let i = 0;
  for (let a = 0; a < factionCount; a++) {
    for (let b = 1; b < factionCount; b++) {
      const row = rows[i];
      if (row.__struct_id !== i) return false;
      for (const [field, want] of [
        ["FactionID1", a],
        ["FactionID2", b],
      ] as const) {
        const f = row[field] as { type?: string; value?: number } | undefined;
        if (f?.type !== "dword" || f.value !== want) return false;
      }
      if ((row.FactionRep as { type?: string } | undefined)?.type !== "dword") return false;
      i++;
    }
  }
  return true;
}
