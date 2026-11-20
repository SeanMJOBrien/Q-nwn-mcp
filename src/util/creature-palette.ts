/**
 * The module's custom creature palette (creaturepalcus.itp): one entry per creature blueprint the module holds, in the
 * category its PaletteID names, so a DM can spawn any of them from the DM client's Custom tab (to replace one that
 * died, or for anything else) and the toolset shows them too (user request 2026-11-19).
 *
 * A toolset-saved module lists each custom creature inside its palette category as
 * `{RESREF, NAME, CR, FACTION}`, or `STRREF` instead of `NAME` for a talk-table name (The Frozen North's
 * src/itp/creaturepalcus.itp.json: 473 creatures filed by their PaletteID, 64 of them in category 46). Modules made with these tools only carried the
 * empty category tree from the template, so the Custom tab was empty. `rebuildCreaturePalette` writes the entries
 * again from the blueprints (stale ones removed); repack_module runs it before every build.
 */

import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr, type GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

/** Category IDs of the standard creature palette tree (Special > Custom 1-5, Monsters, NPCs by race, ...). */
const NPC_BY_RACE = [38, 39, 40, 41, 42, 43, 44]; // Dwarves, Elves, Gnomes, Halflings, Half-Elves, Half-Orcs, Humans
const CUSTOM_1 = 0;
const STANDARD_FACTIONS = ["PC", "Hostile", "Commoner", "Merchant", "Defender"];

type Node = GffObj & { __struct_id?: number };

/** Every category node (a node with an ID) of a palette tree, by ID. */
function categories(root: GffObj): Map<number, Node> {
  const out = new Map<number, Node>();
  const walk = (list: Node[]) => {
    for (const n of list) {
      if (n.ID !== undefined) out.set(getFieldNum(n, "ID"), n);
      walk(getFieldList(n, "LIST") as Node[]);
    }
  };
  walk(getFieldList(root, "MAIN") as Node[]);
  return out;
}

/** The category a creature goes in: its PaletteID when the tree has it, else NPCs by race for the player races, else Custom 1. */
export function paletteCategory(utc: GffObj, valid: Set<number>): number {
  const id = getFieldNum(utc, "PaletteID");
  if (utc.PaletteID !== undefined && valid.has(id)) return id;
  const race = getFieldNum(utc, "Race");
  if (race >= 0 && race <= 6 && utc.Race !== undefined) return NPC_BY_RACE[race];
  return CUSTOM_1;
}

/** The faction name a palette entry shows: the module's faction list, else the standard names. */
function factionName(index: ModuleIndex, id: number): string {
  const fac = (index.parsedGff.get("repute.fac") ?? index.parsedGff.get("Repute.fac")) as GffObj | undefined;
  const names = fac ? getFieldList(fac, "FactionList").map((f) => getFieldStr(f, "FactionName")) : [];
  return names[id] || STANDARD_FACTIONS[id] || "Hostile";
}

export interface PaletteResult {
  entries: number;
  categories: Record<string, number>;
  /** Blueprints whose PaletteID was set to the category they were filed under. */
  paletteIdsSet: string[];
}

/**
 * Rebuild the creature entries of `itp` (the parsed creaturepalcus.itp) from the module's .utc blueprints. Returns what
 * it did and the blueprints whose PaletteID changed (the caller writes those files).
 */
export function rebuildCreaturePalette(index: ModuleIndex, itp: GffObj): PaletteResult {
  const cats = categories(itp);
  const valid = new Set(cats.keys());
  // Remove every creature entry; the category tree stays.
  for (const node of cats.values()) {
    const list = getFieldList(node, "LIST") as Node[];
    if (list.length && list.some((e) => e.RESREF !== undefined)) {
      (node.LIST as { value: Node[] }).value = list.filter((e) => e.RESREF === undefined);
    }
  }
  const result: PaletteResult = { entries: 0, categories: {}, paletteIdsSet: [] };
  const keys = [...index.parsedGff.keys()].filter((k) => k.endsWith(".utc")).sort();
  for (const key of keys) {
    const utc = index.parsedGff.get(key) as GffObj;
    const resref = key.slice(0, -4);
    const cat = paletteCategory(utc, valid);
    const node = cats.get(cat) ?? cats.get(CUSTOM_1);
    if (!node) continue;
    if (!node.LIST) node.LIST = { type: "list", value: [] };
    const name = `${getFieldLocStr(utc, "FirstName")} ${getFieldLocStr(utc, "LastName")}`.trim() || getFieldStr(utc, "Tag") || resref;
    // A name from the game's talk table is stored as STRREF, as the toolset does (The Frozen North: "ox" -> 12678).
    const strref = /^\[TLK:(\d+)\]$/.exec(name)?.[1];
    (node.LIST as { value: Node[] }).value.push({
      __struct_id: 0,
      CR: { type: "float", value: Math.round(getFieldNum(utc, "ChallengeRating") * 100) / 100 },
      FACTION: { type: "cexostring", value: factionName(index, getFieldNum(utc, "FactionID")) },
      ...(strref ? {} : { NAME: { type: "cexostring", value: name } }),
      RESREF: { type: "resref", value: resref },
      ...(strref ? { STRREF: { type: "dword", value: Number(strref) } } : {}),
    });
    result.entries++;
    result.categories[String(cat)] = (result.categories[String(cat)] ?? 0) + 1;
    if (getFieldNum(utc, "PaletteID") !== cat || utc.PaletteID === undefined) {
      utc.PaletteID = { type: "byte", value: cat };
      result.paletteIdsSet.push(resref);
    }
  }
  return result;
}
