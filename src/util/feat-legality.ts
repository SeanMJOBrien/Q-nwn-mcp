/**
 * feat.2da legality gate: can a creature in a given state take a given feat?
 *
 * Every requirement column the engine's level-up screen enforces is checked:
 * PREREQFEAT1/2, OrReqFeat0-4 (at least one, if any are set), MINATTACKBONUS,
 * MINSTR..MINCHA, MINSPELLLVL, MinFortSave, REQSKILL/REQSKILL2 with their
 * minimum ranks, MinLevel/MinLevelClass, MaxLevel, PreReqEpic, and class
 * access (ALLCLASSESCANUSE, or the class's cls_feat_* List column: 0/1 for a
 * general slot, 1/2 for a class bonus slot).
 *
 * Why this exists: a 2026-11-07 audit found illegal feats in 224 of 297
 * generated stat blocks, and a live-engine run (docs/creature-forge-spec.md,
 * spike S5) showed every violation in an engine-levelled creature came from
 * the level-1 build this project wrote; LevelUpHenchman itself added no
 * illegal feat from level 2 to 12 in any of the 11 base classes.
 */

import type { ModuleIndex } from "../types/module.js";
import { twoDARow } from "./verify/common.js";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";
export type FeatSlot = "generic" | "bonus";

export interface FeatCheckState {
  /** Total character level. */
  level: number;
  classId: number;
  /** Levels in classId (single-class builds: equals level). */
  classLevel: number;
  bab: number;
  abilities: Record<AbilityKey, number>;
  featIds: Set<number>;
  skillRanks: Map<number, number>;
  /** Base fortitude save plus Con modifier. */
  fortSave: number;
  /** Highest spell level the creature can cast (0 for non-casters). */
  maxSpellLevel: number;
}

const ABILITY_COLUMNS: Array<[string, AbilityKey]> = [
  ["MINSTR", "str"],
  ["MINDEX", "dex"],
  ["MINCON", "con"],
  ["MININT", "int"],
  ["MINWIS", "wis"],
  ["MINCHA", "cha"],
];

function cell(row: Record<string, string> | undefined, column: string): number | undefined {
  const v = row?.[column];
  if (v === undefined || v === "" || v === "****") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function constantTable(index: ModuleIndex, row: Record<string, string> | undefined, column: string) {
  const value = row?.[column];
  if (!value || value === "****") return undefined;
  return index.twodaTables.get(value.toLowerCase());
}

/** feat id -> cls_feat List value (0-3) for one class. */
export function classFeatAccess(index: ModuleIndex, classId: number): Map<number, number> {
  const table = constantTable(index, twoDARow(index, "classes", classId), "FeatsTable");
  const access = new Map<number, number>();
  for (const row of table?.rows.values() ?? []) {
    const feat = cell(row, "FeatIndex");
    const list = cell(row, "List");
    if (feat !== undefined && list !== undefined) access.set(feat, list);
  }
  return access;
}

/** Base attack bonus at a class level, from the class's AttackBonusTable. */
export function classBab(index: ModuleIndex, classId: number, classLevel: number): number {
  const table = constantTable(index, twoDARow(index, "classes", classId), "AttackBonusTable");
  return cell(table?.rows.get(classLevel - 1), "BAB") ?? 0;
}

/** Base fortitude save at a class level, from the class's SavingThrowTable. */
export function classFortSave(index: ModuleIndex, classId: number, classLevel: number): number {
  const table = constantTable(index, twoDARow(index, "classes", classId), "SavingThrowTable");
  return cell(table?.rows.get(classLevel - 1), "FortSave") ?? 0;
}

/** Highest spell level (1-9) with a non-zero slot count at a class level; 0 if none. */
export function classMaxSpellLevel(index: ModuleIndex, classId: number, classLevel: number): number {
  const table = constantTable(index, twoDARow(index, "classes", classId), "SpellGainTable");
  const row = table?.rows.get(classLevel - 1);
  let max = 0;
  for (let lvl = 1; lvl <= 9; lvl++) {
    if ((cell(row, `SpellLevel${lvl}`) ?? 0) > 0) max = lvl;
  }
  return max;
}

/**
 * Reasons the feat is NOT legal for this state and slot; an empty array means
 * legal. `access` is classFeatAccess() for state.classId (passed in so callers
 * checking many feats read the table once).
 */
export function featLegality(
  index: ModuleIndex,
  featId: number,
  state: FeatCheckState,
  slot: FeatSlot,
  access: Map<number, number>,
): string[] {
  const row = twoDARow(index, "feat", featId);
  if (!row) return [`feat.2da has no row ${featId}`];
  const reasons: string[] = [];
  if (row.FEAT === undefined || row.FEAT === "****" || row.FEAT === "") reasons.push("retired row");

  if (state.featIds.has(featId) && row.GAINMULTIPLE !== "1") reasons.push("already held");

  for (const column of ["PREREQFEAT1", "PREREQFEAT2"]) {
    const req = cell(row, column);
    if (req !== undefined && !state.featIds.has(req)) reasons.push(`${column} ${req} missing`);
  }
  const orReqs = [0, 1, 2, 3, 4].map((i) => cell(row, `OrReqFeat${i}`)).filter((v): v is number => v !== undefined);
  if (orReqs.length > 0 && !orReqs.some((f) => state.featIds.has(f))) reasons.push(`needs one of ${orReqs.join(",")}`);

  const minBab = cell(row, "MINATTACKBONUS");
  if (minBab !== undefined && state.bab < minBab) reasons.push(`BAB ${state.bab} < ${minBab}`);

  for (const [column, key] of ABILITY_COLUMNS) {
    const min = cell(row, column);
    if (min !== undefined && state.abilities[key] < min) reasons.push(`${key} ${state.abilities[key]} < ${min}`);
  }

  const minSpell = cell(row, "MINSPELLLVL");
  if (minSpell !== undefined && state.maxSpellLevel < minSpell) reasons.push(`spell level ${state.maxSpellLevel} < ${minSpell}`);

  const minFort = cell(row, "MinFortSave");
  if (minFort !== undefined && state.fortSave < minFort) reasons.push(`fort ${state.fortSave} < ${minFort}`);

  for (const [skillCol, ranksCol] of [
    ["REQSKILL", "ReqSkillMinRanks"],
    ["REQSKILL2", "ReqSkillMinRanks2"],
  ]) {
    const skill = cell(row, skillCol);
    if (skill === undefined) continue;
    const needed = cell(row, ranksCol) ?? 1;
    const have = state.skillRanks.get(skill) ?? 0;
    if (have < needed) reasons.push(`skill ${skill} ranks ${have} < ${needed}`);
  }

  const minLevel = cell(row, "MinLevel");
  if (minLevel !== undefined) {
    const minLevelClass = cell(row, "MinLevelClass");
    const have = minLevelClass !== undefined ? (minLevelClass === state.classId ? state.classLevel : 0) : state.level;
    if (have < minLevel) reasons.push(`level ${have} < ${minLevel}`);
  }
  const maxLevel = cell(row, "MaxLevel");
  if (maxLevel !== undefined && state.level > maxLevel) reasons.push(`level ${state.level} > ${maxLevel}`);
  if (row.PreReqEpic === "1" && state.level < 21) reasons.push("epic only");

  const list = access.get(featId);
  if (slot === "bonus") {
    if (list !== 1 && list !== 2) reasons.push("not a class bonus feat");
  } else if (!(row.ALLCLASSESCANUSE === "1" || list === 0 || list === 1)) {
    reasons.push("class can't take it in a general slot");
  }
  return reasons;
}

/** Ordered feat preferences from the class package's FeatPref2DA (packages.2da row = class id). */
export function packageFeatOrder(index: ModuleIndex, packageId: number): number[] {
  const table = constantTable(index, twoDARow(index, "packages", packageId), "FeatPref2DA");
  const order: number[] = [];
  const rows = [...(table?.rows.entries() ?? [])].sort((a, b) => a[0] - b[0]);
  for (const [, row] of rows) {
    const feat = cell(row, "FeatIndex");
    if (feat !== undefined) order.push(feat);
  }
  return order;
}

/** Every feat that is some weapon's Focus/Specialization/Improved Critical (incl. epic), from baseitems.2da. */
export function weaponInvestmentFeats(index: ModuleIndex): Set<number> {
  const columns = [
    "WeaponFocusFeat",
    "WeaponSpecializationFeat",
    "WeaponImprovedCriticalFeat",
    "EpicWeaponFocusFeat",
    "EpicWeaponSpecializationFeat",
    "EpicWeaponOverwhelmingCriticalFeat",
    "EpicWeaponDevastatingCriticalFeat",
    "WeaponOfChoiceFeat",
  ];
  const feats = new Set<number>();
  for (const row of index.twodaTables.get("baseitems")?.rows.values() ?? []) {
    for (const column of columns) {
      const v = cell(row, column);
      if (v !== undefined) feats.add(v);
    }
  }
  return feats;
}
