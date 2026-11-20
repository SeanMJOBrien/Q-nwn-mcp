/**
 * Creature spec: one character described in names, resolved to game IDs on the server.
 *
 * A model (or a form) writes "Power Attack", "Fighter, Weapon Master (Katana)", "chainmail", "attack bonus +1", "large";
 * `resolveCreatureSpec` turns each into its 2DA row (feat.2da, packages.2da, baseitems.2da, itempropdef.2da and its
 * cost/subtype tables, phenotype.2da, ...) by matching the in-game name (TLK) or the 2DA label. Anything unknown or
 * ambiguous is an error naming the field and the nearest matches; nothing is guessed. The result echoes what each name
 * became, so the caller can check it in one read. Built by `build_creature` (tools/creature-spec-tools.ts).
 *
 * Feats and the package. A henchman that levels at spawn starts as a level-1 build and LevelUpHenchman takes it to its
 * level with the package's feat and skill preferences (the creature's StartingPackage, also used by every later
 * level-up in play), so the package decides most of its feats. `build: "spawn"` puts the requested feats into the
 * level-1 slots where they are legal and reports which ones the package's feat list contains (likely later) and which it
 * does not; `package: "auto"` picks the class package whose list holds the most of them. `build: "fixed"` builds the
 * creature at its level now with the requested feats first, for a character that must have exactly those feats.
 */

import { getFieldList, getFieldStr } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { buildTlkLookup } from "./area-data.js";
import { packageFeatOrder } from "./feat-legality.js";
import { buildNpcStatBlock } from "./npc-stat-block.js";
import { hasCell, twoDARow } from "./verify/common.js";

// ─── Spec (the JSON a caller writes) ─────────────────────────────────────────

/** A colour: a palette index (0-175) or a colour name (see src/data/color-names.json for the names per palette). */
export type ColorValue = number | string;

export interface ItemColors {
  metal1?: ColorValue;
  metal2?: ColorValue;
  cloth1?: ColorValue;
  cloth2?: ColorValue;
  leather1?: ColorValue;
  leather2?: ColorValue;
}

/** One item to make and equip. */
export interface GearItemSpec {
  /**
   * What it is: a base item name ("bastard sword", "large shield", "helmet", "cloak") or, for `armor`, an armor name
   * ("padded", "leather", "studded leather", "hide", "chain shirt", "scale mail", "chainmail", "breastplate",
   * "splint mail", "banded mail", "half plate", "full plate", "clothing").
   * @minLength 1
   */
  base: string;
  /** Display name; default the base item's name (with the properties' bonus, e.g. "Bastard Sword +1"). */
  name?: string;
  /**
   * Item properties in words: "<property> [<subtype>] [<value>]", e.g. "attack bonus +1", "enhancement +2",
   * "ac bonus +1", "ability bonus strength +2", "damage bonus fire 1d6", "keen".
   */
  properties?: string[];
  /** Colour of the item's parts. A plain value sets both metal colours (armour, helmet, shield). */
  color?: ColorValue | ItemColors;
}

export interface CreatureGearSpec {
  armor?: GearItemSpec;
  helmet?: GearItemSpec;
  /** Main hand. */
  weapon?: GearItemSpec;
  /** Off hand: a shield or a second weapon. */
  offhand?: GearItemSpec;
  cloak?: GearItemSpec;
  boots?: GearItemSpec;
  gloves?: GearItemSpec;
  belt?: GearItemSpec;
  amulet?: GearItemSpec;
  leftRing?: GearItemSpec;
  rightRing?: GearItemSpec;
}

export interface CreatureLookSpec {
  /** "normal" or "large" (phenotype.2da label), or a row. */
  phenotype?: string | number;
  /**
   * Visual size in percent of normal, applied at spawn. Default: a small random variation (95-105).
   * @minimum 50
   * @maximum 200
   */
  scale?: number;
  hair?: ColorValue;
  skin?: ColorValue;
  tattoo1?: ColorValue;
  tattoo2?: ColorValue;
  /**
   * Head model number. Default: a random head of the race and gender.
   * @asType integer
   */
  head?: number;
}

/** Recruit dialog lines for a companion. */
export interface CompanionLinesSpec {
  /** @minLength 1 */
  introduction: string;
  /** @minLength 1 */
  backstory: string;
  accept?: string;
  farewell?: string;
  partyFull?: string;
}

export interface PlacementSpec {
  /** Area resref. */
  area: string;
  x: number;
  y: number;
  /** Compass facing in degrees (0 north, 90 east). */
  bearing?: number;
}

/** One creature, described in names (maps to `build_creature`). */
export interface CreatureSpec {
  /**
   * Blueprint resref, also the tag: lower-case letters, digits and underscore, at most 16 characters.
   * @pattern ^[a-z0-9_]{1,16}$
   */
  resref: string;
  /** @minLength 1 */
  name: string;
  /** companion: recruitable henchman (Commoner faction, henchman AI, recruit dialog). npc: a friendly character. enemy: hostile. */
  role: "companion" | "npc" | "enemy";
  /** Player race name: dwarf, elf, gnome, halfling, half-elf, half-orc, human. */
  race: string;
  gender: "male" | "female";
  /** Base class name: barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, wizard. */
  class: string;
  /**
   * Level the creature has in play.
   * @minimum 1
   * @maximum 40
   * @asType integer
   */
  level: number;
  /**
   * spawn (default): a level-1 build that levels itself at spawn with the package (requested feats go into the level-1
   * slots; the package picks the rest). fixed: built at its level now with the requested feats first (non-casters).
   */
  build?: "spawn" | "fixed";
  /**
   * Feat and skill progression (packages.2da): a package name of the class ("Fighter, Weapon Master (Katana)",
   * "Fighter, Gladiator"), "auto" (the class package whose feat list holds the most requested feats) or omitted (the
   * class's default package; "auto" when feats are given).
   */
  package?: string;
  /** Feat names, e.g. "Power Attack", "Cleave", "Weapon Focus (Bastard Sword)". Prerequisites are added and reported. */
  feats?: string[];
  /** Cleric only: two domain names, e.g. ["War", "Strength"]. Default: the package's domains. */
  domains?: string[];
  /** Wizard only: school name, e.g. "Evocation" ("General" for none). Default: the package's school. */
  school?: string;
  /** Casters: spell names always picked first at their level (a signature spell), e.g. ["Fireball"]. */
  spells?: string[];
  /** e.g. "lawful good", "chaotic neutral", "true neutral". Default: neutral, moved to fit the class. */
  alignment?: string;
  /** Default by role: companion and npc commoner, enemy hostile. A standard faction name or a custom faction's name. */
  faction?: string;
  look?: CreatureLookSpec;
  /** Items to make and equip. With any gear given, the creature keeps exactly this gear (no shopping at spawn). */
  gear?: CreatureGearSpec;
  /** Default "standard"; "tougher" and "epic" are for a real boss. */
  powerLevel?: "low" | "standard" | "tougher" | "epic";
  place?: PlacementSpec;
  /** Required for role companion. */
  companion?: CompanionLinesSpec;
  /** Resref of an existing dialog to attach (npc and enemy). */
  conversation?: string;
}

// ─── Resolved form ───────────────────────────────────────────────────────────

export interface ResolvedItemProperty {
  text: string;
  propertyName: number;
  subType: number;
  costTable: number;
  costValue: number;
  param1: number;
  param1Value: number;
  label: string;
}

export interface ResolvedGearItem {
  slot: keyof CreatureGearSpec;
  slotMask: number;
  baseItem: number;
  baseName: string;
  /** Base-game blueprint to clone (armour), else built from scratch. */
  template?: string;
  armorAC?: number;
  name: string;
  properties: ResolvedItemProperty[];
  colors: Partial<Record<"Metal1Color" | "Metal2Color" | "Cloth1Color" | "Cloth2Color" | "Leather1Color" | "Leather2Color", number>>;
  /** Feats that each make the creature proficient (any one suffices; empty: none needed). */
  proficiency: number[];
}

export interface ResolvedCreature {
  spec: CreatureSpec;
  race: number;
  gender: 0 | 1;
  classId: number;
  level: number;
  build: "spawn" | "fixed";
  packageId: number;
  /** Requested feats plus added prerequisites, in pick order. */
  feats: number[];
  domains?: number[];
  school?: number;
  pinnedSpells: number[];
  /** Feats added because a requested feat or an item needs them, with the reason. */
  addedFeats: Array<{ feat: number; name: string; reason: string }>;
  faction: number;
  alignment?: { lawfulChaotic: number; goodEvil: number };
  phenotype?: number;
  scalePercent?: number;
  colors: Partial<Record<"Color_Hair" | "Color_Skin" | "Color_Tattoo1" | "Color_Tattoo2", number>>;
  head?: number;
  gear: ResolvedGearItem[];
  /** What each name became, by field, for the caller to check. */
  resolved: Record<string, string>;
  /** Packages of the class with how many of the requested feats their feat list holds (best first). */
  packageScores: Array<{ id: number; name: string; matches: number }>;
}

export interface SpecProblem {
  field: string;
  message: string;
}

// ─── Name matching ───────────────────────────────────────────────────────────

export function normName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

export interface NamedRow {
  id: number;
  /** Display name (TLK) when there is one, else the label. */
  name: string;
  /** Every accepted spelling, normalized. */
  keys: string[];
}

/** Rows of a 2DA with their display name (TLK strref in `nameColumn`) and label, for matching. */
export function namedRows(
  index: ModuleIndex,
  table: string,
  nameColumn: string,
  labelColumn: string,
  filter?: (id: number, row: Record<string, string>) => boolean,
): NamedRow[] {
  const t = index.twodaTables.get(table);
  if (!t) return [];
  const tlk = buildTlkLookup(index);
  const out: NamedRow[] = [];
  for (const [id, row] of t.rows) {
    if (filter && !filter(id, row)) continue;
    const label = hasCell(row, labelColumn) ? row[labelColumn] : "";
    const strref = Number(row[nameColumn]);
    const display = Number.isInteger(strref) && tlk ? (tlk(strref) ?? "") : "";
    if (!label && !display) continue;
    const keys = [...new Set([display, label, label.replace(/_/g, " ")].filter(Boolean).map(normName))];
    out.push({ id, name: display || label, keys });
  }
  return out;
}

/**
 * Match a name (or a row number) against rows. Exact normalized match on any spelling wins; several rows with the
 * same spelling are ambiguous. Otherwise an error with the nearest names.
 */
export function matchRow(rows: NamedRow[], query: string | number, what: string): { row: NamedRow } | { error: string } {
  if (typeof query === "number" || /^\d+$/.test(String(query).trim())) {
    const id = Number(query);
    const row = rows.find((r) => r.id === id);
    return row ? { row } : { error: `${what} ${id} is not a valid row` };
  }
  const q = normName(String(query));
  const exact = rows.filter((r) => r.keys.includes(q));
  if (exact.length === 1) return { row: exact[0] };
  if (exact.length > 1) {
    return { error: `${what} "${query}" is ambiguous: ${exact.slice(0, 5).map((r) => `${r.name} (${r.id})`).join(", ")}; give the row number` };
  }
  // Nearest by edit distance against each spelling and each of its words (so "gladiatr" finds "Fighter, Gladiator").
  const near = rows
    .map((r) => ({
      r,
      d: Math.min(...r.keys.flatMap((k) => [levenshtein(q, k), ...(q.includes(" ") ? [] : k.split(" ").map((w) => levenshtein(q, w) + 1))])),
    }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 3)
    .filter((x) => x.d <= Math.max(3, Math.floor(q.length / 3)));
  return {
    error: `unknown ${what} "${query}"${near.length ? `; did you mean ${near.map((x) => `"${x.r.name}"`).join(", ")}?` : ""}`,
  };
}

// ─── Fixed vocabularies ──────────────────────────────────────────────────────

/** Standard 3.5 armour types by name -> base AC (decides the template among the base game's nw_aarcl001-012). */
export const ARMOR_AC: Record<string, number> = {
  clothing: 0,
  clothes: 0,
  padded: 1,
  "padded armor": 1,
  leather: 2,
  "leather armor": 2,
  "studded leather": 3,
  "studded leather armor": 3,
  hide: 3,
  "hide armor": 3,
  "chain shirt": 4,
  "scale mail": 4,
  scale: 4,
  chainmail: 5,
  "chain mail": 5,
  breastplate: 5,
  "splint mail": 6,
  splint: 6,
  "banded mail": 6,
  banded: 6,
  "half plate": 7,
  "full plate": 8,
  plate: 8,
};

/** Base-game armour blueprints, verified 2026-11-17 by name and torso AC (nw_aarcl004 Chainmail AC 5, ...). */
export const ARMOR_TEMPLATES = Array.from({ length: 12 }, (_, i) => `nw_aarcl${String(i + 1).padStart(3, "0")}`);

const ALIGN_LC: Record<string, number> = { lawful: 85, neutral: 50, chaotic: 15 };
const ALIGN_GE: Record<string, number> = { good: 85, neutral: 50, evil: 15 };

export function parseAlignment(text: string): { lawfulChaotic: number; goodEvil: number } | undefined {
  const t = normName(text);
  if (t === "true neutral" || t === "neutral") return { lawfulChaotic: 50, goodEvil: 50 };
  const [lc, ge] = t.split(" ");
  if (lc in ALIGN_LC && ge in ALIGN_GE) return { lawfulChaotic: ALIGN_LC[lc], goodEvil: ALIGN_GE[ge] };
  return undefined;
}

const STANDARD_FACTIONS: Record<string, number> = { pc: 0, player: 0, hostile: 1, commoner: 2, merchant: 3, defender: 4 };

const GEAR_SLOTS: Record<keyof CreatureGearSpec, number> = {
  armor: 2,
  helmet: 1,
  weapon: 16,
  offhand: 32,
  cloak: 64,
  boots: 4,
  gloves: 8,
  belt: 1024,
  amulet: 512,
  leftRing: 128,
  rightRing: 256,
};

// ─── Colours ─────────────────────────────────────────────────────────────────

/**
 * Colour names per palette -> palette index, from src/data/color-names.json (read from the palette charts the user
 * supplied, 2026-11-17). Cloth and leather share one chart. Tattoo has no chart: numbers only.
 */
export type ColorNames = Partial<Record<"skin" | "hair" | "tattoo" | "metal" | "cloth" | "leather", Record<string, number>>>;

export function resolveColor(
  value: ColorValue,
  palette: keyof ColorNames,
  names: ColorNames | null,
): { index: number; how: string } | { error: string } {
  if (typeof value === "number" || /^\d+$/.test(String(value).trim())) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 175) return { error: `palette index ${value} must be 0-175` };
    return { index: n, how: `${n}` };
  }
  const table = names?.[palette === "leather" ? "cloth" : palette];
  if (!table) return { error: `no colour names for the ${palette} palette; give a palette index (0-175)` };
  const key = normName(String(value));
  const hit = Object.entries(table).find(([k]) => normName(k) === key);
  if (!hit) return { error: `unknown ${palette} colour "${value}"; one of: ${Object.keys(table).join(", ")}, or a palette index (0-175)` };
  return { index: hit[1], how: `${value} -> ${hit[1]}` };
}

// ─── Item properties ─────────────────────────────────────────────────────────

/** Rows of an iprp subtype/cost table, named by TLK Name and Label. */
function iprpRows(index: ModuleIndex, table: string): NamedRow[] {
  const rows = namedRows(index, table.toLowerCase(), "Name", "Label");
  // Cost tables of bonuses label their rows "1", "2", ...: accept "+1" too.
  for (const r of rows) {
    for (const k of [...r.keys]) if (/^\d+$/.test(k)) r.keys.push(`+${k}`, `+ ${k}`);
  }
  return rows;
}

/** "attack bonus +1" -> an itempropdef row with subtype and cost value. */
export function resolveItemProperty(index: ModuleIndex, text: string): ResolvedItemProperty | { error: string } {
  const props = namedRows(index, "itempropdef", "Name", "Label");
  // Accept the GameStrRef wording too ("Attack Bonus" vs "Attack Bonus +1"), and "bonus" words dropped or added.
  const words = normName(text).split(" ");
  let best: { row: NamedRow; used: number } | null = null;
  for (let n = words.length; n >= 1 && !best; n--) {
    const head = words.slice(0, n).join(" ");
    const hits = props.filter((p) => p.keys.includes(head) || p.keys.includes(head.replace(/ /g, "")));
    if (hits.length === 1) best = { row: hits[0], used: n };
    else if (hits.length > 1) return { error: `property "${text}" is ambiguous: ${hits.map((h) => h.name).join(", ")}` };
  }
  if (!best) {
    const m = matchRow(props, words.slice(0, 2).join(" "), "item property");
    return { error: "error" in m ? m.error.replace(/^unknown item property "[^"]*"/, `unknown item property in "${text}"`) : `unknown item property in "${text}"` };
  }
  const def = twoDARow(index, "itempropdef", best.row.id) as Record<string, string>;
  let rest = words.slice(best.used);
  const out: ResolvedItemProperty = {
    text,
    propertyName: best.row.id,
    subType: 0,
    costTable: 0,
    costValue: 0,
    param1: 255,
    param1Value: 0,
    label: best.row.name,
  };

  const subTable = hasCell(def, "SubTypeResRef") ? def.SubTypeResRef : "";
  if (subTable) {
    const subs = iprpRows(index, subTable);
    let hit: NamedRow | undefined;
    for (let n = rest.length; n >= 1 && !hit; n--) {
      const head = rest.slice(0, n).join(" ");
      const found = subs.filter((s) => s.keys.includes(head));
      if (found.length >= 1) {
        hit = found[0];
        rest = rest.slice(n);
      }
    }
    if (!hit) {
      return { error: `"${text}": ${best.row.name} needs a subtype from ${subTable} (e.g. ${subs.slice(0, 6).map((s) => s.name).join(", ")})` };
    }
    out.subType = hit.id;
  }

  const costIndex = Number(def.CostTableResRef);
  if (Number.isInteger(costIndex) && hasCell(def, "CostTableResRef")) {
    out.costTable = costIndex;
    const costTableName = twoDARow(index, "iprp_costtable", costIndex)?.Name;
    const value = rest.join(" ");
    if (costTableName && costTableName !== "****" && costIndex !== 0) {
      if (!value) return { error: `"${text}": ${best.row.name} needs a value (e.g. +1)` };
      const costs = iprpRows(index, costTableName);
      const m = matchRow(costs, value.replace(/^\+\s*/, "+"), `${best.row.name} value`);
      if ("error" in m) {
        const plain = value.replace(/^\+\s*/, "");
        const byLabel = costs.find((c) => c.keys.includes(plain));
        if (!byLabel) return { error: `"${text}": ${m.error}` };
        out.costValue = byLabel.id;
      } else out.costValue = m.row.id;
      rest = [];
    }
  }
  if (rest.length > 0) return { error: `"${text}": did not understand "${rest.join(" ")}"` };
  return out;
}

// ─── The resolver ────────────────────────────────────────────────────────────

function featName(index: ModuleIndex, feat: number): string {
  const row = twoDARow(index, "feat", feat);
  const tlk = buildTlkLookup(index);
  return (tlk && row ? tlk(Number(row.FEAT)) : undefined) ?? row?.LABEL ?? String(feat);
}

function featPrereqs(index: ModuleIndex, feat: number): number[] {
  const row = twoDARow(index, "feat", feat);
  if (!row) return [];
  const out: number[] = [];
  for (const c of ["PREREQFEAT1", "PREREQFEAT2"]) {
    const v = Number(row[c]);
    if (hasCell(row, c) && Number.isInteger(v)) out.push(v);
  }
  return out;
}

/** Feats the race and class grant on their own by `level` (racial feats and automatic class feats). */
export function grantedFeats(index: ModuleIndex, race: number, classId: number, level: number): Set<number> {
  const out = new Set<number>();
  const raceTable = index.twodaTables.get((twoDARow(index, "racialtypes", race)?.FeatsTable ?? "").toLowerCase());
  for (const row of raceTable?.rows.values() ?? []) {
    const f = Number(row.FeatIndex);
    if (Number.isInteger(f)) out.add(f);
  }
  const classTable = index.twodaTables.get((twoDARow(index, "classes", classId)?.FeatsTable ?? "").toLowerCase());
  for (const row of classTable?.rows.values() ?? []) {
    if (row.List !== "3") continue;
    const at = Number(row.GrantedOnLevel);
    const f = Number(row.FeatIndex);
    if (Number.isInteger(f) && at >= 1 && at <= level) out.add(f);
  }
  return out;
}

function proficiencyFeats(index: ModuleIndex, baseItem: number, armorAC?: number): number[] {
  if (armorAC !== undefined) {
    if (armorAC <= 0) return [];
    return [armorAC <= 3 ? 3 : armorAC <= 5 ? 4 : 2];
  }
  const row = twoDARow(index, "baseitems", baseItem);
  const out: number[] = [];
  for (const c of ["ReqFeat0", "ReqFeat1", "ReqFeat2", "ReqFeat3", "ReqFeat4"]) {
    const v = Number(row?.[c]);
    if (hasCell(row, c) && Number.isInteger(v)) out.push(v);
  }
  return out;
}

export interface ResolveContext {
  /** Torso AC and name of each armour template (nw_aarcl001-012), read from the game data by the caller. */
  armorTemplates: Array<{ resref: string; name: string; ac: number }>;
  colorNames: ColorNames | null;
}

export function resolveCreatureSpec(
  index: ModuleIndex,
  spec: CreatureSpec,
  ctx: ResolveContext,
): { ok: true; creature: ResolvedCreature; warnings: string[] } | { ok: false; errors: SpecProblem[]; warnings: string[] } {
  const errors: SpecProblem[] = [];
  const warnings: string[] = [];
  const resolved: Record<string, string> = {};
  const fail = (field: string, message: string) => errors.push({ field, message });

  // Identity
  const race = matchRow(namedRows(index, "racialtypes", "Name", "Label", (id) => id <= 6), spec.race, "race");
  const classM = matchRow(namedRows(index, "classes", "Name", "Label", (id) => id <= 10), spec.class, "class");
  if ("error" in race) fail("race", `${race.error} (a player race: dwarf, elf, gnome, halfling, half-elf, half-orc, human)`);
  if ("error" in classM) fail("class", `${classM.error} (a base class)`);
  const raceId = "row" in race ? race.row.id : 6;
  const classId = "row" in classM ? classM.row.id : 4;
  if ("row" in race) resolved.race = `${race.row.name} (${raceId})`;
  if ("row" in classM) resolved.class = `${classM.row.name} (${classId})`;
  const gender: 0 | 1 = spec.gender === "female" ? 1 : 0;
  const level = Math.floor(spec.level);
  const build = spec.build ?? "spawn";
  if (spec.role === "companion" && !spec.companion) fail("companion", "role companion needs the recruit dialog lines (introduction, backstory)");
  if (spec.role !== "companion" && spec.companion) fail("companion", "only role companion takes recruit lines; remove it or set role companion");
  if (build === "fixed" && twoDARow(index, "classes", classId)?.SpellCaster === "1") {
    fail("build", `${resolved.class ?? spec.class} casts spells; "fixed" does not write spells yet. Use build "spawn" (spells are chosen at spawn)`);
  }

  // Feats: names, then prerequisites in front of what needs them.
  const featRows = namedRows(index, "feat", "FEAT", "LABEL");
  const requested: number[] = [];
  (spec.feats ?? []).forEach((f, i) => {
    const m = matchRow(featRows, f, "feat");
    if ("error" in m) fail(`feats[${i}]`, m.error);
    else {
      requested.push(m.row.id);
      resolved[`feats[${i}]`] = `${m.row.name} (${m.row.id})`;
    }
  });
  const granted = grantedFeats(index, raceId, classId, build === "fixed" ? level : 1);
  const addedFeats: ResolvedCreature["addedFeats"] = [];
  const ordered: number[] = [];
  const addWithPrereqs = (feat: number, depth = 0) => {
    if (ordered.includes(feat) || granted.has(feat) || depth > 6) return;
    for (const p of featPrereqs(index, feat)) {
      if (!ordered.includes(p) && !granted.has(p) && !requested.includes(p)) {
        addedFeats.push({ feat: p, name: featName(index, p), reason: `needed for ${featName(index, feat)}` });
      }
      addWithPrereqs(p, depth + 1);
    }
    ordered.push(feat);
  };
  for (const f of requested) addWithPrereqs(f);

  // Gear (before the package, since a weapon can need a proficiency feat).
  const gear: ResolvedGearItem[] = [];
  const baseRows = namedRows(index, "baseitems", "Name", "label");
  for (const [slotName, item] of Object.entries(spec.gear ?? {}) as Array<[keyof CreatureGearSpec, GearItemSpec | undefined]>) {
    if (!item) continue;
    const field = `gear.${slotName}`;
    const slotMask = GEAR_SLOTS[slotName];
    let baseItem: number;
    let baseName: string;
    let template: string | undefined;
    let armorAC: number | undefined;
    if (slotName === "armor") {
      const key = normName(item.base);
      const ac = ARMOR_AC[key];
      if (ac === undefined) {
        fail(`${field}.base`, `unknown armour "${item.base}"; one of: ${Object.keys(ARMOR_AC).join(", ")}`);
        continue;
      }
      const byName = ctx.armorTemplates.find((t) => normName(t.name).startsWith(key));
      const byAc = ctx.armorTemplates.find((t) => t.ac === ac);
      const t = byName ?? byAc;
      if (!t && ac > 0) {
        fail(`${field}.base`, `no base-game armour template with AC ${ac} could be read (nw_aarcl001-012)`);
        continue;
      }
      baseItem = 16;
      armorAC = ac;
      template = ac > 0 ? t?.resref : "nw_cloth001";
      baseName = t?.name ?? "Clothing";
    } else {
      const m = matchRow(baseRows, item.base, "base item");
      if ("error" in m) {
        fail(`${field}.base`, m.error);
        continue;
      }
      baseItem = m.row.id;
      baseName = m.row.name;
      const eq = Number(twoDARow(index, "baseitems", baseItem)?.EquipableSlots);
      if (Number.isFinite(eq) && eq > 0 && (eq & slotMask) === 0) {
        fail(`${field}.base`, `${baseName} cannot go in the ${slotName} slot`);
        continue;
      }
    }
    const properties: ResolvedItemProperty[] = [];
    (item.properties ?? []).forEach((p, i) => {
      const r = resolveItemProperty(index, p);
      if ("error" in r) fail(`${field}.properties[${i}]`, r.error);
      else properties.push(r);
    });
    const colors: ResolvedGearItem["colors"] = {};
    const colorSpec: ItemColors =
      item.color === undefined ? {} : typeof item.color === "object" ? item.color : { metal1: item.color, metal2: item.color };
    const COLOR_FIELDS: Array<[keyof ItemColors, keyof ResolvedGearItem["colors"], keyof ColorNames]> = [
      ["metal1", "Metal1Color", "metal"],
      ["metal2", "Metal2Color", "metal"],
      ["cloth1", "Cloth1Color", "cloth"],
      ["cloth2", "Cloth2Color", "cloth"],
      ["leather1", "Leather1Color", "leather"],
      ["leather2", "Leather2Color", "leather"],
    ];
    for (const [k, gff, pal] of COLOR_FIELDS) {
      const v = colorSpec[k];
      if (v === undefined) continue;
      const c = resolveColor(v, pal, ctx.colorNames);
      if ("error" in c) fail(`${field}.color.${k}`, c.error);
      else colors[gff] = c.index;
    }
    const bonus = properties.find((p) => /enhancement|attack/i.test(p.label) || /armor|ac/i.test(p.label));
    const name = item.name ?? (bonus && bonus.costValue > 0 ? `${baseName} +${bonus.costValue}` : baseName);
    const proficiency = proficiencyFeats(index, baseItem, armorAC);
    gear.push({ slot: slotName, slotMask, baseItem, baseName, template, armorAC, name, properties, colors, proficiency });
    resolved[field] = `${name} (base ${baseItem}${template ? `, from ${template}` : ""}${properties.length ? `; ${properties.map((p) => `${p.label} ${p.costValue}`).join(", ")}` : ""}${Object.keys(colors).length ? `; ${Object.entries(colors).map(([k, v]) => `${k} ${v}`).join(", ")}` : ""})`;
    if (proficiency.length > 0 && !proficiency.some((f) => granted.has(f) || ordered.includes(f))) {
      const need = proficiency[0];
      addedFeats.push({ feat: need, name: featName(index, need), reason: `needed to use ${baseName}` });
      ordered.unshift(need);
    }
  }
  if (gear.some((g) => g.slot === "offhand") && gear.find((g) => g.slot === "weapon")) {
    const w = gear.find((g) => g.slot === "weapon") as ResolvedGearItem;
    const wsize = Number(twoDARow(index, "baseitems", w.baseItem)?.WeaponWield);
    if (wsize === 4) fail("gear.offhand", `${w.baseName} is two-handed; nothing can go in the off hand`);
  }

  // Package
  const pkgRows = namedRows(index, "packages", "Name", "Label", (_id, row) => Number(row.ClassID) === classId);
  // Score each package by the requested feats the creature is predicted to hold at its level: for a spawn build, the
  // level-1 picks (requested first) and then the package order for every later slot, as LevelUpHenchman does; for a
  // fixed build the requested feats go first at every level, so only list membership is shown.
  const power = spec.powerLevel === "low" ? "standard" : spec.powerLevel === "standard" || !spec.powerLevel ? "elite" : spec.powerLevel;
  const packageScores = pkgRows
    .map((p) => {
      if (build === "fixed" || ordered.length === 0 || errors.length > 0) {
        const order = new Set(packageFeatOrder(index, p.id));
        return { id: p.id, name: p.name, matches: ordered.filter((f) => order.has(f)).length };
      }
      const levelOne = buildNpcStatBlock(index, { race: raceId, classId, level: 1, powerLevel: power, seed: spec.resref, preferredFeats: ordered, packageId: p.id });
      const atLevel = buildNpcStatBlock(index, {
        race: raceId,
        classId,
        level,
        powerLevel: power,
        preferredFeats: levelOne.feats.map((f) => f.feat),
        packageId: p.id,
        packageOrderOnly: true,
      });
      const held = new Set(atLevel.feats.map((f) => f.feat));
      return { id: p.id, name: p.name, matches: ordered.filter((f) => held.has(f)).length };
    })
    .sort((a, b) => b.matches - a.matches || (a.id === classId ? -1 : b.id === classId ? 1 : a.id - b.id));
  let packageId = classId;
  const pkgQuery = spec.package ?? (ordered.length > 0 ? "auto" : undefined);
  if (pkgQuery === undefined) {
    resolved.package = `${pkgRows.find((p) => p.id === classId)?.name ?? classId} (${classId}, class default)`;
  } else if (normName(pkgQuery) === "auto") {
    packageId = packageScores[0]?.id ?? classId;
    resolved.package = `${packageScores[0]?.name ?? classId} (${packageId}, auto: ${packageScores[0]?.matches ?? 0} of ${ordered.length} feats ${build === "spawn" ? `predicted by level ${level}` : "in its list"})`;
  } else {
    const m = matchRow(pkgRows, pkgQuery, `package of ${resolved.class ?? spec.class}`);
    if ("error" in m) fail("package", `${m.error}. Packages of this class: ${pkgRows.map((p) => `"${p.name}"`).join(", ")}`);
    else {
      packageId = m.row.id;
      resolved.package = `${m.row.name} (${packageId})`;
    }
  }

  // Faction, alignment, look
  let faction = spec.role === "enemy" ? 1 : 2;
  if (spec.faction !== undefined) {
    const std = STANDARD_FACTIONS[normName(spec.faction)];
    if (std !== undefined) faction = std;
    else {
      const fac = [...index.parsedGff.entries()].find(([k]) => k.endsWith(".fac"))?.[1] as GffObj | undefined;
      const names = fac ? getFieldList(fac, "FactionList").map((f) => getFieldStr(f, "FactionName")) : [];
      const at = names.findIndex((n) => normName(n) === normName(spec.faction as string));
      if (at < 0) fail("faction", `unknown faction "${spec.faction}"; standard: hostile, commoner, merchant, defender; this module: ${names.join(", ")}`);
      else faction = at;
    }
  }
  if (spec.role === "companion" && faction === 1) fail("faction", "a companion cannot be hostile");
  resolved.faction = String(faction);
  let alignment: ResolvedCreature["alignment"];
  if (spec.alignment) {
    alignment = parseAlignment(spec.alignment);
    if (!alignment) fail("alignment", `"${spec.alignment}" is not an alignment (e.g. "lawful good", "true neutral", "chaotic evil")`);
  }
  const look = spec.look ?? {};
  let phenotype: number | undefined;
  if (look.phenotype !== undefined) {
    const m = matchRow(namedRows(index, "phenotype", "Name", "Label", (id) => id === 0 || id === 2), look.phenotype, "phenotype");
    if ("error" in m) fail("look.phenotype", `${m.error} (normal or large)`);
    else {
      phenotype = m.row.id;
      resolved["look.phenotype"] = `${m.row.name} (${phenotype})`;
    }
  }
  const colors: ResolvedCreature["colors"] = {};
  for (const [k, gff, pal] of [
    ["hair", "Color_Hair", "hair"],
    ["skin", "Color_Skin", "skin"],
    ["tattoo1", "Color_Tattoo1", "tattoo"],
    ["tattoo2", "Color_Tattoo2", "tattoo"],
  ] as const) {
    const v = look[k];
    if (v === undefined) continue;
    const c = resolveColor(v, pal, ctx.colorNames);
    if ("error" in c) fail(`look.${k}`, c.error);
    else {
      colors[gff] = c.index;
      resolved[`look.${k}`] = c.how;
    }
  }
  // Domains, school, signature spells
  let domains: number[] | undefined;
  let school: number | undefined;
  const pinnedSpells: number[] = [];
  if (spec.domains) {
    if (twoDARow(index, "classes", classId)?.PickDomains !== "1") fail("domains", `${resolved.class ?? spec.class} has no domains; remove it`);
    else if (spec.domains.length !== 2) fail("domains", "give exactly two domains");
    else {
      const rows = namedRows(index, "domains", "Name", "Label");
      domains = [];
      spec.domains.forEach((d, i) => {
        const m = matchRow(rows, d, "domain");
        if ("error" in m) fail(`domains[${i}]`, m.error);
        else {
          domains?.push(m.row.id);
          resolved[`domains[${i}]`] = `${m.row.name} (${m.row.id})`;
        }
      });
    }
  }
  if (spec.school !== undefined) {
    if (twoDARow(index, "classes", classId)?.PickSchool !== "1") fail("school", `${resolved.class ?? spec.class} has no school; remove it`);
    else {
      const m = matchRow(namedRows(index, "spellschools", "StringRef", "Label"), spec.school, "school");
      if ("error" in m) fail("school", m.error);
      else {
        school = m.row.id;
        resolved.school = `${m.row.name} (${school})`;
      }
    }
  }
  if (spec.spells?.length) {
    if (twoDARow(index, "classes", classId)?.SpellCaster !== "1") fail("spells", `${resolved.class ?? spec.class} casts no spells; remove it`);
    else {
      const rows = namedRows(index, "spells", "Name", "Label", (_id, row) => row.UserType === "1" || !hasCell(row, "UserType"));
      spec.spells.forEach((sp, i) => {
        const m = matchRow(rows, sp, "spell");
        if ("error" in m) fail(`spells[${i}]`, m.error);
        else {
          pinnedSpells.push(m.row.id);
          resolved[`spells[${i}]`] = `${m.row.name} (${m.row.id})`;
        }
      });
    }
  }
  if (gear.length > 0 && !gear.some((g) => g.slot === "weapon")) {
    warnings.push("gear is given without a weapon: the creature keeps exactly the listed gear and will fight unarmed; add gear.weapon");
  }
  if (spec.role === "companion" && spec.conversation) warnings.push("conversation is ignored for a companion: it gets the generated recruit dialog");

  if (errors.length > 0) return { ok: false, errors, warnings };
  return {
    ok: true,
    warnings,
    creature: {
      spec,
      race: raceId,
      gender,
      classId,
      level,
      build,
      packageId,
      feats: ordered,
      domains,
      school,
      pinnedSpells,
      addedFeats,
      faction,
      alignment,
      phenotype,
      scalePercent: look.scale,
      colors,
      head: look.head,
      gear,
      resolved,
      packageScores: packageScores.slice(0, 4),
    },
  };
}

export function isTwoDALoaded(index: ModuleIndex, names: string[]): string[] {
  return names.filter((n) => !(index.twodaTables.get(n) as TwoDATable | undefined));
}
