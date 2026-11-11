/**
 * Creature sample catalog (TODO #51). Reads a set of creature blueprints (a hand-built persistent world's `utc` folder), summarises each,
 * and aggregates the summaries into categories (type x primary class x level band x role). The aggregate is general reference: ranges
 * and medians per category, with no names or resrefs from the source, suitable to commit. The per-creature summaries stay in the
 * git-ignored adventures/ area. A sample is a starting point for a creature of that category, to be renamed, re-skinned and re-equipped.
 */

import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import { getVarTableEntries } from "./git-helpers.js";

export const LEVEL_BANDS: Array<[number, number, string]> = [
  [1, 4, "1-4"],
  [5, 8, "5-8"],
  [9, 12, "9-12"],
  [13, 16, "13-16"],
  [17, 20, "17-20"],
  [21, 99, "21+"],
];

export function levelBand(level: number): string {
  return (LEVEL_BANDS.find(([lo, hi]) => level >= lo && level <= hi) ?? LEVEL_BANDS[0])[2];
}

/** Lookups from the game's 2DAs (and the source's own items), supplied by the caller. */
export interface CatalogLookups {
  raceLabel: (race: number) => string;
  className: (classId: number) => string;
  /** 1 when classes.2da says the class is a player class. */
  isPlayerClass: (classId: number) => boolean;
  baseItemLabel: (baseItem: number) => string;
  /** BaseItem of an equipped item resref, when its blueprint is known. */
  itemBaseItem: (resref: string) => number | undefined;
}

export interface CreatureSummary {
  resref: string;
  name: string;
  race: number;
  /** "player-race" for the seven PC races, else the racialtypes label (lower case). */
  type: string;
  appearance: number;
  gender: number;
  classes: Array<{ class: string; level: number }>;
  primaryClass: string;
  playerClass: boolean;
  level: number;
  cr: number;
  hp: number;
  naturalAC: number;
  abilities: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saveBonus: { fort: number; ref: number; will: number };
  feats: number;
  skillRanks: number;
  spellAbilities: number;
  /** "boss" | "semiboss" | "ambient" (herbivore/omnivore) | "familiar" | "standard", from the source's own flags. */
  role: string;
  faction: number;
  equipment: Array<{ slot: string; baseItem: string }>;
  hasRanged: boolean;
  hasShield: boolean;
  hasArmor: boolean;
  scripts: { spawn: string; death: string };
}

const SLOT_BY_MASK: Record<number, string> = {
  1: "head", 2: "chest", 4: "boots", 8: "arms", 16: "righthand", 32: "lefthand", 64: "cloak", 128: "leftring", 256: "rightring", 512: "neck",
  1024: "belt", 2048: "arrows", 4096: "bullets", 8192: "bolts", 16384: "cweapon_l", 32768: "cweapon_r", 65536: "cweapon_b", 131072: "hide",
};
const RANGED = /bow|sling|dart|shuriken|throwing/i;

function num(obj: GffObj, field: string, fallback = 0): number {
  const v = (obj[field] as { value?: unknown } | undefined)?.value;
  return typeof v === "number" ? v : fallback;
}

export function summarizeCreature(doc: GffObj, resref: string, look: CatalogLookups): CreatureSummary {
  const classes = getFieldList(doc, "ClassList").map((c) => ({ id: getFieldNum(c, "Class"), level: getFieldNum(c, "ClassLevel") }));
  const level = classes.reduce((n, c) => n + c.level, 0);
  const primary = [...classes].sort((a, b) => b.level - a.level)[0];
  const race = getFieldNum(doc, "Race");
  const vars = new Map(getVarTableEntries(doc).map((v) => [v.name.toLowerCase(), v.value]));
  const role = vars.has("boss") ? "boss" : vars.has("semiboss") ? "semiboss" : vars.has("familiar") ? "familiar" : vars.has("herbivore") || vars.has("omnivore") ? "ambient" : "standard";
  const equipment = getFieldList(doc, "Equip_ItemList").map((e) => {
    const slot = SLOT_BY_MASK[(e as { __struct_id?: number }).__struct_id ?? -1] ?? "other";
    const res = getFieldStr(e, "EquippedRes") || getFieldStr(e, "TemplateResRef");
    const base = res ? look.itemBaseItem(res) : getFieldNum(e, "BaseItem");
    return { slot, baseItem: base === undefined ? "unknown" : look.baseItemLabel(base) };
  });
  const hp = num(doc, "MaxHitPoints", num(doc, "HitPoints"));
  return {
    resref,
    name: getFieldStr(doc, "FirstName") || resref,
    race,
    type: race >= 0 && race <= 6 ? "player-race" : look.raceLabel(race).toLowerCase(),
    appearance: num(doc, "Appearance_Type"),
    gender: num(doc, "Gender"),
    classes: classes.map((c) => ({ class: look.className(c.id), level: c.level })),
    primaryClass: primary ? look.className(primary.id) : "none",
    playerClass: primary ? look.isPlayerClass(primary.id) : false,
    level,
    cr: num(doc, "ChallengeRating"),
    hp,
    naturalAC: num(doc, "NaturalAC"),
    abilities: { str: num(doc, "Str", 10), dex: num(doc, "Dex", 10), con: num(doc, "Con", 10), int: num(doc, "Int", 10), wis: num(doc, "Wis", 10), cha: num(doc, "Cha", 10) },
    saveBonus: { fort: num(doc, "fortbonus"), ref: num(doc, "refbonus"), will: num(doc, "willbonus") },
    feats: getFieldList(doc, "FeatList").length,
    skillRanks: getFieldList(doc, "SkillList").reduce((n, s) => n + getFieldNum(s, "Rank"), 0),
    spellAbilities: getFieldList(doc, "SpecAbilityList").length,
    role,
    faction: num(doc, "FactionID"),
    equipment,
    hasRanged: equipment.some((e) => RANGED.test(e.baseItem)),
    hasShield: equipment.some((e) => e.slot === "lefthand" && /shield/i.test(e.baseItem)),
    hasArmor: equipment.some((e) => e.slot === "chest"),
    scripts: { spawn: getFieldStr(doc, "ScriptSpawn"), death: getFieldStr(doc, "ScriptDeath") },
  };
}

// --- aggregation

export interface Range {
  min: number;
  median: number;
  max: number;
}

function range(values: number[]): Range {
  const v = [...values].sort((a, b) => a - b);
  const mid = Math.floor(v.length / 2);
  const median = v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
  return { min: v[0], median: Math.round(median * 10) / 10, max: v[v.length - 1] };
}

export interface CatalogCategory {
  type: string;
  class: string;
  levelBand: string;
  role: string;
  /** Creatures in the source that fall here (a measure of how common the category is, not names). */
  count: number;
  level: Range;
  cr: Range;
  hp: Range;
  naturalAC: Range;
  abilities: Record<"str" | "dex" | "con" | "int" | "wis" | "cha", number>;
  saveBonus: Record<"fort" | "ref" | "will", number>;
  feats: Range;
  spellAbilities: Range;
  /** Share (0-1) of the category that is armoured, carries a shield, a ranged weapon, or is a caster. */
  armored: number;
  shield: number;
  ranged: number;
  caster: number;
  /** Most common equipped base item types by slot group, e.g. "righthand: longsword (60%)". */
  commonGear: string[];
  /** Player-class categories can be built with forge_creature; monsters are placed as palette creatures. */
  buildWith: { tool: string; args: Record<string, unknown> } | { tool: "place_creature"; note: string };
}

const CASTER_CLASSES = new Set(["cleric", "druid", "wizard", "sorcerer", "bard", "paladin", "ranger"]);

export function aggregateCatalog(summaries: CreatureSummary[], classIds: (name: string) => number | undefined): CatalogCategory[] {
  const groups = new Map<string, CreatureSummary[]>();
  for (const s of summaries) {
    if (s.level < 1) continue;
    const key = [s.type, s.primaryClass.toLowerCase(), levelBand(s.level), s.role].join("|");
    (groups.get(key) ?? groups.set(key, []).get(key))?.push(s);
  }
  const out: CatalogCategory[] = [];
  for (const [key, g] of groups) {
    const [type, cls, band, role] = key.split("|");
    const share = (f: (s: CreatureSummary) => boolean) => Math.round((g.filter(f).length / g.length) * 100) / 100;
    const med = (f: (s: CreatureSummary) => number) => Math.round(range(g.map(f)).median);
    const gear = new Map<string, number>();
    for (const s of g) for (const e of new Set(s.equipment.filter((x) => ["righthand", "lefthand", "chest", "cweapon_b", "cweapon_l"].includes(x.slot)).map((x) => `${x.slot}: ${x.baseItem.toLowerCase()}`))) gear.set(e, (gear.get(e) ?? 0) + 1);
    const commonGear = [...gear.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => `${k} (${Math.round((n / g.length) * 100)}%)`);
    const medLevel = med((s) => s.level);
    const classId = classIds(cls);
    const playerClass = g.some((s) => s.playerClass);
    out.push({
      type, class: cls, levelBand: band, role, count: g.length,
      level: range(g.map((s) => s.level)), cr: range(g.map((s) => s.cr)), hp: range(g.map((s) => s.hp)), naturalAC: range(g.map((s) => s.naturalAC)),
      abilities: { str: med((s) => s.abilities.str), dex: med((s) => s.abilities.dex), con: med((s) => s.abilities.con), int: med((s) => s.abilities.int), wis: med((s) => s.abilities.wis), cha: med((s) => s.abilities.cha) },
      saveBonus: { fort: med((s) => s.saveBonus.fort), ref: med((s) => s.saveBonus.ref), will: med((s) => s.saveBonus.will) },
      feats: range(g.map((s) => s.feats)), spellAbilities: range(g.map((s) => s.spellAbilities)),
      armored: share((s) => s.hasArmor), shield: share((s) => s.hasShield), ranged: share((s) => s.hasRanged),
      caster: share((s) => s.spellAbilities > 0 || CASTER_CLASSES.has(s.primaryClass.toLowerCase())),
      commonGear,
      buildWith: playerClass && classId !== undefined && type === "player-race"
        ? { tool: "build_key_npc", args: { classId, level: medLevel, gearRole: role === "boss" ? "elite" : role === "semiboss" ? "elite" : "standard", powerLevel: role === "boss" ? "tougher" : "standard" } }
        : playerClass && classId !== undefined
          ? { tool: "forge_creature", args: { classId, level: medLevel } }
          : { tool: "place_creature", note: "a monster class: place a ready-made palette creature of this type and adjust with the numbers here; the forge builds player classes only" },
    });
  }
  return out.sort((a, b) => a.type.localeCompare(b.type) || a.class.localeCompare(b.class) || a.level.median - b.level.median);
}

export interface SampleQuery {
  cr?: number;
  level?: number;
  type?: string;
  class?: string;
  role?: string;
  limit?: number;
}

/** Categories matching a query, nearest first (by CR or level distance). */
export function querySamples(catalog: CatalogCategory[], q: SampleQuery): CatalogCategory[] {
  const want = (s: string | undefined, v: string) => !s || v.toLowerCase().includes(s.toLowerCase());
  const hits = catalog.filter((c) => want(q.type, c.type) && want(q.class, c.class) && want(q.role, c.role));
  const dist = (c: CatalogCategory): number =>
    q.cr !== undefined ? Math.abs(c.cr.median - q.cr) + (q.cr < c.cr.min || q.cr > c.cr.max ? 2 : 0) : q.level !== undefined ? Math.abs(c.level.median - q.level) + (q.level < c.level.min || q.level > c.level.max ? 2 : 0) : 0;
  return hits.sort((a, b) => dist(a) - dist(b) || b.count - a.count).slice(0, q.limit ?? 8);
}

export interface CatalogFile {
  generated: string;
  /** How many blueprints were read and how many fell into a category. */
  source: { blueprints: number; categorised: number; excluded: Array<{ reason: string; count: number }> };
  categories: CatalogCategory[];
}

/** A readable summary of the catalog, with a level-to-statistics guide for balancing a creature against a CR. */
export function catalogMarkdown(file: CatalogFile): string {
  const out: string[] = [];
  out.push("# Creature sample catalog", "");
  out.push(`Generated ${file.generated} from ${file.source.blueprints} hand-built creature blueprints (${file.source.categorised} categorised). General reference: ranges and medians per category, no names from the source.`, "");
  out.push("Use: `list_creature_samples` finds the categories near a CR or level, type and class; each gives the numbers to aim for and how to build it (`build_key_npc` / `forge_creature` for player classes; for a monster type, place a palette creature and compare). Then rename it, change its appearance and equip it to taste; keep the numbers near the category's so the challenge stays balanced.", "");
  if (file.source.excluded.length) out.push(`Excluded: ${file.source.excluded.map((e) => `${e.count} (${e.reason})`).join("; ")}.`, "");
  const player = file.categories.filter((c) => c.type === "player-race");
  const monsters = file.categories.filter((c) => c.type !== "player-race");
  const table = (cats: CatalogCategory[]): string[] => [
    "| type | class | levels | role | n | CR (min-med-max) | HP med | nat AC | abilities str/dex/con | armored | ranged | caster | common gear |",
    "|---|---|---|---|---|---|---|---|---|---|---|---|---|",
    ...cats.map((c) => `| ${c.type} | ${c.class} | ${c.levelBand} | ${c.role} | ${c.count} | ${c.cr.min}-${c.cr.median}-${c.cr.max} | ${c.hp.median} | ${c.naturalAC.median} | ${c.abilities.str}/${c.abilities.dex}/${c.abilities.con} | ${Math.round(c.armored * 100)}% | ${Math.round(c.ranged * 100)}% | ${Math.round(c.caster * 100)}% | ${c.commonGear.slice(0, 2).join(", ")} |`),
  ];
  out.push("## Player-race creatures (build with `build_key_npc`)", "", ...table(player), "", "## Monster types (place a palette creature, adjust with these numbers)", "", ...table(monsters), "");
  const byLevel = new Map<number, number[]>();
  for (const c of file.categories.filter((x) => x.role === "standard")) for (let l = Math.round(c.level.min); l <= Math.round(c.level.max); l++) (byLevel.get(l) ?? byLevel.set(l, []).get(l))?.push(c.hp.median);
  out.push("## Rough HP by level (standard role, median of category medians)", "", "| level | HP |", "|---|---|", ...[...byLevel.entries()].sort((a, b) => a[0] - b[0]).filter(([l]) => l <= 20).map(([l, v]) => `| ${l} | ${Math.round(range(v).median)} |`), "");
  return out.join("\n");
}
