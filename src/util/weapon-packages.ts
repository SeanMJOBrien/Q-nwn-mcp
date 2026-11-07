/**
 * Weapon-specific NPC feat packages (packages.2da FeatPref2DA tables).
 *
 * A "general fighter" package is one feat-preference template in which seven
 * feats name a weapon: Weapon Focus, Weapon Specialization, Improved Critical,
 * Epic Weapon Focus, Epic Weapon Specialization, Epic Overwhelming Critical and
 * Epic Devastating Critical. Those are exactly baseitems.2da's seven weapon feat
 * columns, so a package for any weapon is the template with those seven swapped.
 *
 * Three corrections the plain swap needs (found 2026-11-07 in the GvE packages):
 *  - A weapon whose ReqFeat0-4 the class doesn't get automatically (bastard sword,
 *    katana, kama, double weapons... need Exotic Weapon Proficiency, feat 44) gets
 *    that proficiency first. The engine silently refuses to equip a weapon the
 *    creature isn't proficient with (live-verified), so without it the NPC is unarmed.
 *  - Ranged weapons use a ranged template (no Cleave/Whirlwind), with the weapon's
 *    Focus/Specialization/Improved Critical present, and crossbows get Rapid
 *    Reload (feat 411) before Rapid Shot, which a crossbow can't use without it.
 *  - Feats the class can never take are dropped: not ALLCLASSESCANUSE and not on
 *    the class's cls_feat list, or tied to another class by MinLevelClass (e.g.
 *    Weapon Specialization in a Barbarian package).
 */

import type { ModuleIndex } from "../types/module.js";
import { hasCell, isRetired2DARow, twoDARow } from "./verify/common.js";

export const WEAPON_FEAT_COLUMNS = [
  "WeaponFocusFeat",
  "WeaponSpecializationFeat",
  "WeaponImprovedCriticalFeat",
  "EpicWeaponFocusFeat",
  "EpicWeaponSpecializationFeat",
  "EpicWeaponOverwhelmingCriticalFeat",
  "EpicWeaponDevastatingCriticalFeat",
] as const;

const EXOTIC_WEAPON_PROFICIENCY = 44;
const RAPID_RELOAD = 411;
const RAPID_SHOT = 30;
const TOUGHNESS = 40;
/** baseitems.2da WeaponWield value for crossbows (heavy and light). */
const WIELD_CROSSBOW = "6";
/** baseitems.2da WeaponWield value for creature weapons (claws, bites). */
const WIELD_CREATURE = "9";

export interface PackageRow {
  feat: number;
  label: string;
}

export interface WeaponInfo {
  baseItem: number;
  label: string;
  feats: number[]; // in WEAPON_FEAT_COLUMNS order
  ranged: boolean;
  crossbow: boolean;
  reqFeats: number[];
  nameStrref?: number;
}

function num(row: Record<string, string> | undefined, column: string): number | undefined {
  if (!hasCell(row, column)) return undefined;
  const n = Number(row![column]);
  return Number.isFinite(n) ? n : undefined;
}

/** Parses a FeatIndex/Label 2DA (any row numbering; file order is kept). */
export function parsePackage2DA(text: string): PackageRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  const headerIndex = lines.findIndex((l) => /\bFeatIndex\b/.test(l));
  if (headerIndex < 0) throw new Error("not a feat package 2DA (no FeatIndex column)");
  const rows: PackageRow[] = [];
  for (const line of lines.slice(headerIndex + 1)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2 || !/^\d+$/.test(parts[1])) continue;
    rows.push({ feat: Number(parts[1]), label: parts[2] ?? "" });
  }
  return rows;
}

/** Formats rows in the same layout and CRLF line endings as the BioWare/GvE files, renumbered 0..n-1. */
export function formatPackage2DA(rows: PackageRow[]): string {
  const lines = ["2DA V2.0", "", "           FeatIndex   Label           "];
  rows.forEach((r, i) => {
    lines.push(`${String(i).padEnd(7)}${String(r.feat).padEnd(7)}${r.label}`);
  });
  return `${lines.join("\r\n")}\r\n`;
}

/** Every real weapon with all seven weapon feats (excludes gloves, bracers and creature weapons). */
export function listWeapons(index: ModuleIndex): WeaponInfo[] {
  const out: WeaponInfo[] = [];
  for (const [baseItem, row] of index.twodaTables.get("baseitems")?.rows ?? []) {
    if (isRetired2DARow(row)) continue;
    const feats = WEAPON_FEAT_COLUMNS.map((c) => num(row, c));
    if (feats.some((f) => f === undefined)) continue;
    const reqFeats = [0, 1, 2, 3, 4].map((i) => num(row, `ReqFeat${i}`)).filter((f): f is number => f !== undefined);
    if (reqFeats.length === 0 || row.WeaponWield === WIELD_CREATURE) continue;
    out.push({
      baseItem,
      label: (row.label ?? row.Label ?? `item${baseItem}`).toLowerCase(),
      feats: feats as number[],
      ranged: hasCell(row, "RangedWeapon"),
      crossbow: row.WeaponWield === WIELD_CROSSBOW,
      reqFeats,
      nameStrref: num(row, "Name"),
    });
  }
  return out;
}

/** The weapon a template package is built around (the one whose Weapon Focus it lists). */
export function detectTemplateWeapon(index: ModuleIndex, rows: PackageRow[]): WeaponInfo | undefined {
  const feats = new Set(rows.map((r) => r.feat));
  return listWeapons(index)
    .map((w) => ({ w, hits: w.feats.filter((f) => feats.has(f)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)[0]?.w;
}

function classFeatLists(index: ModuleIndex, classId: number): Map<number, number> {
  const classRow = twoDARow(index, "classes", classId);
  const tableName = classRow?.FeatsTable;
  const table = tableName && tableName !== "****" ? index.twodaTables.get(tableName.toLowerCase()) : undefined;
  const lists = new Map<number, number>();
  for (const row of table?.rows.values() ?? []) {
    const feat = num(row, "FeatIndex");
    const list = num(row, "List");
    if (feat !== undefined && list !== undefined) lists.set(feat, list);
  }
  return lists;
}

/** Proficiency feats the class gets automatically at level 1 (cls_feat List 3). */
export function classLevelOneFeats(index: ModuleIndex, classId: number): Set<number> {
  const classRow = twoDARow(index, "classes", classId);
  const tableName = classRow?.FeatsTable;
  const table = tableName && tableName !== "****" ? index.twodaTables.get(tableName.toLowerCase()) : undefined;
  const feats = new Set<number>();
  for (const row of table?.rows.values() ?? []) {
    if (row.List === "3" && num(row, "GrantedOnLevel") === 1) {
      const feat = num(row, "FeatIndex");
      if (feat !== undefined) feats.add(feat);
    }
  }
  return feats;
}

/**
 * Why a class can never take a feat; empty when it can (at some level). Follows
 * prerequisites: a feat whose PREREQFEAT1/2 (or every OrReqFeat) the class can never
 * take is unreachable too (Epic Weapon Specialization needs Weapon Specialization).
 */
export function featNeverAvailable(
  index: ModuleIndex,
  classId: number,
  feat: number,
  lists = classFeatLists(index, classId),
  seen = new Map<number, string[]>(),
): string[] {
  const cached = seen.get(feat);
  if (cached) return cached;
  seen.set(feat, []); // break prerequisite cycles
  const row = twoDARow(index, "feat", feat);
  let reasons: string[] = [];
  if (!row) reasons = [`no feat.2da row ${feat}`];
  else if (isRetired2DARow(row) || !hasCell(row, "FEAT")) reasons = ["retired feat"];
  else {
    if (row.ALLCLASSESCANUSE !== "1" && !lists.has(feat)) reasons.push("not on the class feat list");
    const minLevelClass = num(row, "MinLevelClass");
    if (minLevelClass !== undefined && minLevelClass !== classId) reasons.push(`requires levels in class ${minLevelClass}`);
    for (const column of ["PREREQFEAT1", "PREREQFEAT2"]) {
      const pre = num(row, column);
      if (pre !== undefined && featNeverAvailable(index, classId, pre, lists, seen).length > 0) {
        reasons.push(`prerequisite ${pre} is never available`);
      }
    }
    const orReqs = [0, 1, 2, 3, 4].map((i) => num(row, `OrReqFeat${i}`)).filter((f): f is number => f !== undefined);
    if (orReqs.length > 0 && orReqs.every((f) => featNeverAvailable(index, classId, f, lists, seen).length > 0)) {
      reasons.push("no OrReqFeat is ever available");
    }
  }
  seen.set(feat, reasons);
  return reasons;
}

function featLabel(index: ModuleIndex, feat: number, constantStyle: boolean): string {
  const row = twoDARow(index, "feat", feat);
  if (constantStyle && hasCell(row, "Constant")) return row!.Constant;
  return row?.LABEL ?? row?.Label ?? `Feat${feat}`;
}

export interface PackageResult {
  rows: PackageRow[];
  dropped: Array<{ feat: number; label: string; reasons: string[] }>;
  added: Array<{ feat: number; label: string; why: string }>;
}

/**
 * Builds one weapon's package from a template: swaps the template weapon's seven
 * feats for the target's, makes sure Focus/Specialization/Improved Critical are
 * present, adds the proficiency the class lacks and Rapid Reload for crossbows,
 * and drops feats the class can never take.
 */
export function buildWeaponPackage(
  index: ModuleIndex,
  template: PackageRow[],
  templateWeapon: WeaponInfo,
  target: WeaponInfo,
  classId: number,
): PackageResult {
  const swap = new Map(templateWeapon.feats.map((f, i) => [f, target.feats[i]]));
  let rows: PackageRow[] = template.map((r) => {
    const to = swap.get(r.feat);
    return to === undefined ? { ...r } : { feat: to, label: featLabel(index, to, r.label.startsWith("FEAT_")) };
  });
  const added: PackageResult["added"] = [];
  const has = (f: number) => rows.some((r) => r.feat === f);

  // Focus, Specialization, Improved Critical must be present (the GvE crossbow template dropped them).
  const trio = [target.feats[2], target.feats[1], target.feats[0]]; // ImpCrit, Spec, Focus (template order)
  const missing = trio.filter((f) => !has(f));
  if (missing.length > 0) {
    const at = rows.findIndex((r) => r.feat === TOUGHNESS);
    const insert = missing.map((f) => ({ feat: f, label: featLabel(index, f, false) }));
    rows.splice(at >= 0 ? at : rows.length, 0, ...insert);
    for (const r of insert) added.push({ ...r, why: "weapon feat missing from template" });
  }

  // Crossbows need Rapid Reload for Rapid Shot to work.
  if (target.crossbow && !has(RAPID_RELOAD)) {
    const at = rows.findIndex((r) => r.feat === RAPID_SHOT);
    const r = { feat: RAPID_RELOAD, label: featLabel(index, RAPID_RELOAD, false) };
    rows.splice(at >= 0 ? at : rows.length, 0, r);
    added.push({ ...r, why: "crossbow: Rapid Shot needs Rapid Reload" });
  }

  added.push(...ensureProficiency(index, rows, target, classId));

  const sanitized = sanitizePackage(index, rows, classId);
  rows = sanitized.rows;
  return { rows, dropped: sanitized.dropped, added };
}

/**
 * Puts the weapon's proficiency feat first when the class doesn't get one automatically
 * (mutates rows). The engine refuses to equip a weapon the creature isn't proficient with.
 */
export function ensureProficiency(
  index: ModuleIndex,
  rows: PackageRow[],
  weapon: WeaponInfo,
  classId: number,
): PackageResult["added"] {
  const auto = classLevelOneFeats(index, classId);
  if (weapon.reqFeats.some((f) => auto.has(f))) return [];
  const prof = weapon.reqFeats.includes(EXOTIC_WEAPON_PROFICIENCY) ? EXOTIC_WEAPON_PROFICIENCY : weapon.reqFeats[0];
  if (rows.some((r) => r.feat === prof)) return [];
  const r = { feat: prof, label: featLabel(index, prof, false) };
  rows.unshift(r);
  return [{ ...r, why: "class isn't proficient with this weapon; the engine won't equip it otherwise" }];
}

/** Drops feats the class can never take; keeps order. */
export function sanitizePackage(
  index: ModuleIndex,
  rows: PackageRow[],
  classId: number,
): { rows: PackageRow[]; dropped: PackageResult["dropped"] } {
  const lists = classFeatLists(index, classId);
  const seen = new Map<number, string[]>();
  const dropped: PackageResult["dropped"] = [];
  const kept = rows.filter((r) => {
    const reasons = featNeverAvailable(index, classId, r.feat, lists, seen);
    if (reasons.length > 0) dropped.push({ feat: r.feat, label: r.label, reasons });
    return reasons.length === 0;
  });
  return { rows: kept, dropped };
}

/** File name for a weapon package, within NWN's 16-character resref limit. */
export function packageFileName(prefix: string, weapon: WeaponInfo): string {
  return `${prefix}${weapon.label.replace(/[^a-z0-9]/g, "")}`.slice(0, 16);
}

export interface PackagesRowSpec {
  row: number;
  label: string;
  nameStrref: number | string;
  descriptionStrref: number | string;
  classId: number;
  attribute: string;
  gold: number | string;
  featPref: string;
  skillPref: string;
}

/** packages.2da rows (with header) for appending to a module's packages.2da. */
export function formatPackagesRows(rows: PackagesRowSpec[]): string {
  const cols = ["Label", "Name", "Description", "ClassID", "Attribute", "Gold", "School", "Domain1", "Domain2", "Associate",
    "SpellPref2DA", "FeatPref2DA", "SkillPref2DA", "Equip2DA", "Soundset", "PlayerClass"];
  const lines = ["2DA V2.0", "", `           ${cols.join("   ")}`];
  for (const r of rows) {
    lines.push(
      [String(r.row).padEnd(11), r.label.padEnd(35), String(r.nameStrref).padEnd(8), String(r.descriptionStrref).padEnd(10),
        String(r.classId).padEnd(10), r.attribute.padEnd(12), String(r.gold).padEnd(7), "****     ", "****      ", "****      ",
        "****        ", "****            ", r.featPref.padEnd(17), r.skillPref.padEnd(15), "****           ", "0          ", "0"].join(""),
    );
  }
  return `${lines.join("\r\n")}\r\n`;
}
