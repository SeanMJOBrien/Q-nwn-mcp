/**
 * Treasure catalog (TODO #52): summarises a hand-built world's custom item blueprints (a `uti` folder) and groups them into
 * categories of sample treasure by kind, value tier and main property, so reward and container-loot tools can pick treasure
 * that fits a level. Pure and unit-tested; the tool layer (tools/treasure-catalog-tools.ts) does the file and 2DA work.
 *
 * Two outputs, like the creature catalog (#51): a general reference (ranges and medians per category, no names or resrefs from
 * the source, safe to commit) and per-item summaries (names, resrefs, properties) that stay in the git-ignored adventures/_catalog/.
 */

import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import { WEALTH_BY_LEVEL } from "./wealth.js";

export interface PropSummary {
  /** itempropdef.2da row. */
  id: number;
  name: string;
  subtype: number;
  costTable: number;
  costValue: number;
}

export interface ItemSummary {
  resref: string;
  name: string;
  tag: string;
  baseItem: number;
  baseLabel: string;
  group: string;
  cost: number;
  tier: number;
  /** The lowest character level this item suits (see fitLevel). */
  level: number;
  stack: number;
  plot: boolean;
  props: PropSummary[];
  /** The enhancement / attack / AC bonus, 0 when the item has none. */
  enchant: number;
}

export interface TreasureLookups {
  baseItemLabel(n: number): string;
  /** baseitems.2da EquipableSlots bitmask (0 when unknown). */
  baseItemSlots(n: number): number;
  propName(n: number): string;
}

// --- value tiers and levels

/** Value tiers (gp) a hand-built world sorts its treasure by: tier 1 below 175 gp, then 175, 2,000, 7,000, 16,000. */
export const TIER_MIN_VALUE = [0, 0, 175, 2000, 7000, 16000] as const;

export function itemTier(cost: number): number {
  for (let t = 5; t >= 2; t--) if (cost >= TIER_MIN_VALUE[t]) return t;
  return 1;
}

/** One item should not exceed this share of the wealth a character of the level is expected to carry (DMG table 5-1). */
export const ITEM_WEALTH_SHARE = 1 / 3;

/** Lowest level (1-20) whose wealth share covers the item's value; level 1 carries items up to 100 gp. */
export function fitLevel(cost: number): number {
  if (cost <= 100) return 1;
  for (let l = 2; l < WEALTH_BY_LEVEL.length; l++) if (cost <= WEALTH_BY_LEVEL[l] * ITEM_WEALTH_SHARE) return l;
  return WEALTH_BY_LEVEL.length - 1;
}

// --- kinds

/** Kind of treasure from the base item's label and slot mask: weapon, ranged, ammo, armor, shield, helmet, cloak, boots, gloves, belt, ring, amulet, scroll, potion, wand, ... */
export function treasureGroup(label: string, slots: number): string {
  const l = label.toLowerCase();
  const has = (s: string) => l.includes(s);
  if (has("scroll")) return "scroll";
  if (has("potion")) return "potion";
  if (has("wand") || has("rod")) return "wand";
  if (has("staff")) return "weapon";
  if (has("arrow") || has("bolt") || has("bullet")) return "ammo";
  if (has("shield")) return "shield";
  if (has("helmet")) return "helmet";
  if (has("armor") || has("robe")) return "armor";
  if (has("cloak")) return "cloak";
  if (has("boots")) return "boots";
  if (has("glove") || has("bracer")) return "gloves";
  if (has("belt")) return "belt";
  if (has("ring")) return "ring";
  if (has("amulet") || has("necklace")) return "amulet";
  if (has("bow") || has("crossbow") || has("sling")) return "ranged";
  if (has("dart") || has("shuriken") || has("throwing")) return "thrown";
  if (has("gem")) return "gem";
  if (slots & 0x30 || slots & 0x20) return "weapon";
  if (slots & 0x2) return "helmet";
  if (slots & 0x4) return "armor";
  if (slots & 0x8) return "boots";
  if (slots & 0x80) return "cloak";
  if (slots & 0x100) return "ring";
  if (slots & 0x200) return "amulet";
  if (slots & 0x400) return "amulet";
  if (slots & 0x800) return "belt";
  return "misc";
}

// itempropdef rows the bonus of an item is read from: 1 AC bonus, 6 enhancement bonus, 56 attack bonus (verified against the base 2DA).
const ENCHANT_PROPS = new Set([1, 6, 56]);

function isEnchant(p: PropSummary): boolean {
  return ENCHANT_PROPS.has(p.id);
}

export function summarizeItem(doc: GffObj, resref: string, look: TreasureLookups): ItemSummary {
  const baseItem = getFieldNum(doc, "BaseItem");
  const baseLabel = look.baseItemLabel(baseItem);
  const props: PropSummary[] = getFieldList(doc, "PropertiesList").map((p) => {
    const id = getFieldNum(p, "PropertyName");
    return {
      id,
      name: look.propName(id),
      subtype: getFieldNum(p, "Subtype"),
      costTable: getFieldNum(p, "CostTable"),
      costValue: getFieldNum(p, "CostValue"),
    };
  });
  const cost = getFieldNum(doc, "Cost") + getFieldNum(doc, "AddCost");
  const enchantProp = props.find(isEnchant);
  return {
    resref,
    name: getFieldLocStr(doc, "LocalizedName") || getFieldStr(doc, "Tag") || resref,
    tag: getFieldStr(doc, "Tag"),
    baseItem,
    baseLabel,
    group: treasureGroup(baseLabel, look.baseItemSlots(baseItem)),
    cost,
    tier: itemTier(cost),
    level: fitLevel(cost),
    stack: getFieldNum(doc, "StackSize") || 1,
    plot: getFieldNum(doc, "Plot") === 1,
    props,
    enchant: enchantProp ? enchantProp.costValue : 0,
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
  return { min: v[0], median: Math.round(median), max: v[v.length - 1] };
}

export interface TreasureCategory {
  group: string;
  tier: number;
  count: number;
  cost: Range;
  /** Levels the category suits, from the item values. */
  level: Range;
  /** How many of the items carry a bonus, and its range; null when none do. */
  enchant: Range | null;
  /** Share (0-1) of the items carrying a bonus. */
  enchanted: number;
  /** Most common item properties: name and how many items carry it. */
  properties: Array<{ name: string; count: number }>;
  /** Most common base item types in the category. */
  baseItems: string[];
}

export interface TreasureFile {
  generated: string;
  source: { items: number; categorised: number; excluded: Array<{ reason: string; count: number }> };
  categories: TreasureCategory[];
}

function top(counts: Map<string, number>, n: number): Array<{ name: string; count: number }> {
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

/** Items that make sense as treasure: not plot items, not free (value 0, placeholders and quest tokens). */
export function isTreasure(s: ItemSummary): boolean {
  return !s.plot && s.cost > 0;
}

export function aggregateTreasure(items: ItemSummary[]): TreasureCategory[] {
  const groups = new Map<string, ItemSummary[]>();
  for (const s of items.filter(isTreasure)) {
    const key = `${s.group}|${s.tier}`;
    (groups.get(key) ?? groups.set(key, []).get(key))?.push(s);
  }
  const out: TreasureCategory[] = [];
  for (const g of groups.values()) {
    const props = new Map<string, number>();
    for (const s of g) for (const n of new Set(s.props.map((p) => p.name))) props.set(n, (props.get(n) ?? 0) + 1);
    const bases = new Map<string, number>();
    for (const s of g) bases.set(s.baseLabel, (bases.get(s.baseLabel) ?? 0) + 1);
    const ench = g.filter((s) => s.enchant > 0).map((s) => s.enchant);
    out.push({
      group: g[0].group,
      tier: g[0].tier,
      count: g.length,
      cost: range(g.map((s) => s.cost)),
      level: range(g.map((s) => s.level)),
      enchant: ench.length ? range(ench) : null,
      enchanted: Math.round((ench.length / g.length) * 100) / 100,
      properties: top(props, 6),
      baseItems: top(bases, 5).map((b) => b.name),
    });
  }
  return out.sort((a, b) => a.group.localeCompare(b.group) || a.tier - b.tier);
}

// --- queries

export interface TreasureQuery {
  /** Character level the treasure is for (nearest category level first). */
  level?: number;
  /** Item value in gold (when no level). */
  value?: number;
  group?: string;
  tier?: number;
  /** Substring of an item property name (e.g. "damage", "saving"). */
  property?: string;
  limit?: number;
}

function matches(text: string | undefined, want: string | undefined): boolean {
  return !want || (text ?? "").toLowerCase().includes(want.toLowerCase());
}

/** Categories nearest the target level (or value), filtered; ties keep the catalog order. */
export function queryTreasureCategories(cats: TreasureCategory[], q: TreasureQuery): TreasureCategory[] {
  const dist = (c: TreasureCategory): number => {
    if (q.level !== undefined) return Math.abs(c.level.median - q.level) + (q.level < c.level.min || q.level > c.level.max ? 2 : 0);
    if (q.value !== undefined) return Math.abs(Math.log((c.cost.median + 1) / (q.value + 1)));
    return 0;
  };
  return cats
    .filter((c) => matches(c.group, q.group) && (q.tier === undefined || c.tier === q.tier))
    .filter((c) => !q.property || c.properties.some((p) => matches(p.name, q.property)))
    .map((c) => ({ c, d: dist(c) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, q.limit ?? 8)
    .map((x) => x.c);
}

/** Individual items (from the git-ignored per-item summaries) nearest the target level or value. */
export function queryTreasureItems(items: ItemSummary[], q: TreasureQuery): ItemSummary[] {
  const dist = (s: ItemSummary): number => {
    if (q.level !== undefined) return Math.abs(s.level - q.level);
    if (q.value !== undefined) return Math.abs(Math.log((s.cost + 1) / (q.value + 1)));
    return 0;
  };
  return items
    .filter(isTreasure)
    .filter((s) => matches(s.group, q.group) && (q.tier === undefined || s.tier === q.tier))
    .filter((s) => !q.property || s.props.some((p) => matches(p.name, q.property)))
    .map((s) => ({ s, d: dist(s) }))
    .sort((a, b) => a.d - b.d || a.s.cost - b.s.cost)
    .slice(0, q.limit ?? 8)
    .map((x) => x.s);
}

// --- general reference document

export function treasureMarkdown(file: TreasureFile): string {
  const out: string[] = ["# Treasure catalog", ""];
  out.push(
    `Generated ${file.generated} from ${file.source.items} hand-built item blueprints (${file.source.categorised} usable as treasure). General reference: ranges and medians per category, no names or resrefs from the source.`,
    "",
    "Value tiers (gp): T1 under 175, T2 175+, T3 2,000+, T4 7,000+, T5 16,000+. Level = the lowest level whose wealth (DMG table 5-1) covers the item at a third of it.",
    "",
    "| kind | tier | items | gp (min-median-max) | levels | enchanted | bonus | common properties | base items |",
    "|---|---|---|---|---|---|---|---|---|",
    ...file.categories.map(
      (c) =>
        `| ${c.group} | T${c.tier} | ${c.count} | ${c.cost.min}-${c.cost.median}-${c.cost.max} | ${c.level.min}-${c.level.max} | ${Math.round(c.enchanted * 100)}% | ${c.enchant ? `+${c.enchant.min}..+${c.enchant.max}` : "-"} | ${c.properties.slice(0, 3).map((p) => p.name).join(", ")} | ${c.baseItems.slice(0, 3).join(", ")} |`,
    ),
    "",
  );
  return out.join("\n");
}
