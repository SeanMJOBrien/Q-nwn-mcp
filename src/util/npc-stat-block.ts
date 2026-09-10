/**
 * Deterministic NPC stat-block computation: race -> racial feats -> ability
 * scores -> class -> class feats -> skill points -> HP, in that order (user-
 * specified canonical creation order, CLAUDE.md's `build_npc_stat_block` TODO).
 *
 * Everything here is read live from the loaded module's 2DA stack
 * (`index.twodaTables`) rather than hardcoded, except two curated pieces
 * with no real data-table source: the per-class weapon preference used to
 * fill bonus/generic feat slots (`npc-weapon-preferences.ts`) and the
 * secondary ability-score priority order (below). Primarily targets
 * Henchmen for now (packages.2da row = class ID convention, the same
 * StartingPackage rule already used elsewhere in this project) — nothing
 * here is henchman-specific, so it's a reasonable base for general NPCs
 * too, a documented future extension rather than a limitation of the design.
 *
 * No dice rolling anywhere — this project's generated content must stay
 * reproducible, matching the "no dice rolling" note on the Elite Array /
 * point-buy bands in CLAUDE.md.
 */

import type { ModuleIndex } from "../types/module.js";
import { CLASS_WEAPON_PREFERENCE, CLEAVE_FEAT, DODGE_FEAT, TOUGHNESS_FEAT } from "./npc-weapon-preferences.js";
import { twoDARow } from "./verify/common.js";

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type PowerLevel = "elite" | "low" | "standard" | "tougher" | "epic";

/** D&D 3.5 point-buy budgets, per CLAUDE.md's documented bands. "elite" isn't a budget — see ELITE_ARRAY. */
const POINT_BUY_BUDGET: Record<Exclude<PowerLevel, "elite">, number> = {
  low: 15,
  standard: 25,
  tougher: 32,
  epic: 36,
};

/** The literal Elite Array — assigned directly, not computed via point-buy cost. */
const ELITE_ARRAY = [15, 14, 13, 12, 10, 8];

/** Standard D&D 3.5 point-buy cost table, score -> cumulative point cost. */
const POINT_BUY_COST: Record<number, number> = {
  8: 0,
  9: 1,
  10: 2,
  11: 3,
  12: 4,
  13: 5,
  14: 6,
  15: 8,
  16: 10,
  17: 13,
  18: 16,
};

/**
 * Secondary ability priority after the class's own PrimaryAbil (read live
 * from classes.2da — data-driven). The rest of the order has no data-table
 * source, so it's a small curated default: Con always ranks second
 * (survivability), then Str/Dex/Wis/Int/Cha in that fixed order minus
 * whichever the primary already claimed. Reasonable for a generated NPC,
 * not a tabletop-optimized build.
 */
const GENERIC_SECONDARY_ORDER: AbilityKey[] = ["con", "str", "dex", "wis", "int", "cha"];

const ABILITY_COLUMN: Record<AbilityKey, string> = {
  str: "StrAdjust",
  dex: "DexAdjust",
  con: "ConAdjust",
  int: "IntAdjust",
  wis: "WisAdjust",
  cha: "ChaAdjust",
};

export interface StatBlockParams {
  race: number;
  classId: number;
  level: number;
  powerLevel?: PowerLevel;
}

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface FeatPick {
  feat: number;
  source: "racial" | "class_automatic" | "generic_slot" | "bonus_slot";
}

export interface StatBlockResult {
  abilityScores: AbilityScores;
  classes: Array<{ class: number; level: number }>;
  feats: FeatPick[];
  /** skills.2da row -> rank, sparse (only skills that received points). */
  skillRanks: Array<{ skillIndex: number; rank: number }>;
  hp: number;
  startingPackage: number;
  warnings: string[];
}

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

const ABILITY_KEYS: AbilityKey[] = ["str", "dex", "con", "int", "wis", "cha"];

/** classes.2da's PrimaryAbil column, lowercased and validated — defaults to STR when absent/unrecognized. */
function resolvePrimaryAbility(classRow: Record<string, string> | undefined): AbilityKey {
  const raw = classRow?.PrimaryAbil?.toLowerCase();
  return raw && (ABILITY_KEYS as string[]).includes(raw) ? (raw as AbilityKey) : "str";
}

/** Look up a 2DA table named by a "constant-style" column value (e.g. "CLS_FEAT_FIGHT" -> the cls_feat_fight table). */
function tableFromConstantColumn(index: ModuleIndex, row: Record<string, string> | undefined, column: string) {
  const value = row?.[column];
  if (!value || value === "****") return undefined;
  return index.twodaTables.get(value.toLowerCase());
}

function numCell(row: Record<string, string> | undefined, column: string, fallback = 0): number {
  const v = row?.[column];
  if (v === undefined || v === "" || v === "****") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Racial ability adjustments, ability-score floor (Cha>=6, Int>=8), Elite Array or point-buy assignment. */
function computeAbilityScores(
  index: ModuleIndex,
  classRow: Record<string, string> | undefined,
  raceRow: Record<string, string> | undefined,
  powerLevel: PowerLevel,
  warnings: string[],
): AbilityScores {
  const primaryKey = resolvePrimaryAbility(classRow);
  if (!classRow?.PrimaryAbil) warnings.push("classes.2da has no PrimaryAbil for this class — defaulted to STR");

  const priorityOrder: AbilityKey[] = [primaryKey, ...GENERIC_SECONDARY_ORDER.filter((k) => k !== primaryKey)];

  const base: Record<AbilityKey, number> = { str: 8, dex: 8, con: 8, int: 8, wis: 8, cha: 8 };

  if (powerLevel === "elite") {
    priorityOrder.forEach((key, i) => {
      base[key] = ELITE_ARRAY[i];
    });
  } else {
    let budget = POINT_BUY_BUDGET[powerLevel];
    for (const key of priorityOrder) {
      while (base[key] < 18 && POINT_BUY_COST[base[key] + 1] - POINT_BUY_COST[base[key]] <= budget) {
        budget -= POINT_BUY_COST[base[key] + 1] - POINT_BUY_COST[base[key]];
        base[key] += 1;
      }
    }
  }

  // Racial adjustments, read live — not hardcoded.
  for (const key of Object.keys(base) as AbilityKey[]) {
    base[key] += numCell(raceRow, ABILITY_COLUMN[key], 0);
  }

  // Floor rule (user-established convention elsewhere in this project): a
  // racial penalty should never push a mental stat below what the character
  // needs to function narratively.
  if (base.cha < 6) base.cha = 6;
  if (base.int < 8) base.int = 8;

  void index;
  return base;
}

/** Every level that is a positive multiple of `every`, up to and including `level`. */
function multiplesUpTo(every: number, level: number): number[] {
  if (every <= 0) return [];
  const out: number[] = [];
  for (let l = every; l <= level; l += every) out.push(l);
  return out;
}

export function buildNpcStatBlock(index: ModuleIndex, params: StatBlockParams): StatBlockResult {
  const warnings: string[] = [];
  const level = Math.max(1, Math.min(40, Math.floor(params.level)));
  const powerLevel = params.powerLevel ?? "elite";

  const classRow = twoDARow(index, "classes", params.classId);
  const raceRow = twoDARow(index, "racialtypes", params.race);
  if (!classRow) warnings.push(`classes.2da has no row ${params.classId} — stat block will be incomplete`);
  if (!raceRow) warnings.push(`racialtypes.2da has no row ${params.race} — racial adjustments/feats skipped`);

  let abilityScores = computeAbilityScores(index, classRow, raceRow, powerLevel, warnings);

  // Level-based ability increases: +1 to the primary stat every 4 levels
  // (real D&D 3.5 rule; a generated NPC always applies it to its primary
  // stat rather than a free player choice).
  const primaryKey = resolvePrimaryAbility(classRow);
  const increaseLevels = multiplesUpTo(4, level).length;
  abilityScores = { ...abilityScores, [primaryKey]: abilityScores[primaryKey] + increaseLevels };

  // ─── Feats ────────────────────────────────────────────────────────────
  const feats: FeatPick[] = [];
  const featIds = new Set<number>();
  function addFeat(feat: number, source: FeatPick["source"]): void {
    if (featIds.has(feat)) return;
    featIds.add(feat);
    feats.push({ feat, source });
  }

  // 1. Racial — every row in race_feat_<race>.2da, unconditional.
  const raceFeatTable = tableFromConstantColumn(index, raceRow, "FeatsTable");
  if (raceRow && !raceFeatTable) warnings.push(`racialtypes.2da row ${params.race} has no resolvable FeatsTable`);
  for (const row of raceFeatTable?.rows.values() ?? []) {
    const featIndex = numCell(row, "FeatIndex", -1);
    if (featIndex >= 0) addFeat(featIndex, "racial");
  }

  // 2. Automatic class feats — cls_feat_<class>.2da, List=3, GrantedOnLevel <= level.
  const classFeatTable = tableFromConstantColumn(index, classRow, "FeatsTable");
  if (classRow && !classFeatTable) warnings.push(`classes.2da row ${params.classId} has no resolvable FeatsTable`);
  for (const row of classFeatTable?.rows.values() ?? []) {
    if (row.List !== "3") continue;
    const grantedOnLevel = numCell(row, "GrantedOnLevel", -1);
    if (grantedOnLevel >= 1 && grantedOnLevel <= level) {
      const featIndex = numCell(row, "FeatIndex", -1);
      if (featIndex >= 0) addFeat(featIndex, "class_automatic");
    }
  }

  // Shared candidate queue for generic + bonus feat slots: the class's
  // preferred weapon's Focus/Specialization/Improved Critical, then a small
  // universal filler set. Slots beyond this queue are left unfilled with a
  // warning rather than guessing — this project's "encode unverified data as
  // a skip, never a guess" convention.
  const weaponPref = CLASS_WEAPON_PREFERENCE[params.classId];
  const candidateQueue: number[] = [
    ...(weaponPref
      ? [weaponPref.weaponFocusFeat, weaponPref.weaponSpecializationFeat, weaponPref.weaponImprovedCriticalFeat]
      : []),
    TOUGHNESS_FEAT,
    CLEAVE_FEAT,
    DODGE_FEAT,
  ];
  function nextCandidate(): number | undefined {
    while (candidateQueue.length > 0) {
      const c = candidateQueue.shift()!;
      if (!featIds.has(c)) return c;
    }
    return undefined;
  }

  // 3. Generic feat slots — every character gets one at 1st level (hardcoded
  // baseline D&D 3.5 rule, not in any 2DA), plus racialtypes.2da's own
  // ExtraFeatsAtFirstLevel (Human=1, verified; every other standard race is
  // unset), plus NumberNormalFeatsEveryNthLevel feats at each multiple of
  // NormalFeatEveryNthLevel up to `level` — both columns read live.
  let genericSlots = level >= 1 ? 1 : 0;
  const extraAtFirst = numCell(raceRow, "ExtraFeatsAtFirstLevel", 0);
  genericSlots += extraAtFirst;
  const nth = numCell(raceRow, "NormalFeatEveryNthLevel", 0);
  const perNth = numCell(raceRow, "NumberNormalFeatsEveryNthLevel", 0);
  genericSlots += multiplesUpTo(nth, level).length * perNth;

  let unfilledGeneric = 0;
  for (let i = 0; i < genericSlots; i++) {
    const c = nextCandidate();
    if (c === undefined) {
      unfilledGeneric++;
    } else {
      addFeat(c, "generic_slot");
    }
  }
  if (unfilledGeneric > 0) {
    warnings.push(`${unfilledGeneric} generic feat slot(s) left unfilled — no more curated candidates, pick manually`);
  }

  // 4. Class-specific bonus feat slots — cls_bfeat_<class>.2da's single
  // "Bonus" column, row index = level-1, 1 = a slot opens that level.
  const bonusFeatTable = tableFromConstantColumn(index, classRow, "BonusFeatsTable");
  let bonusSlots = 0;
  if (bonusFeatTable) {
    for (let lvl = 1; lvl <= level; lvl++) {
      if (bonusFeatTable.rows.get(lvl - 1)?.Bonus === "1") bonusSlots++;
    }
  }
  let unfilledBonus = 0;
  for (let i = 0; i < bonusSlots; i++) {
    const c = nextCandidate();
    if (c === undefined) {
      unfilledBonus++;
    } else {
      addFeat(c, "bonus_slot");
    }
  }
  if (unfilledBonus > 0) {
    warnings.push(
      `${unfilledBonus} class bonus feat slot(s) left unfilled — no more curated candidates, pick manually`,
    );
  }

  // ─── Skill points ─────────────────────────────────────────────────────
  const skillPointBase = numCell(classRow, "SkillPointBase", 0);
  const intMod = abilityMod(abilityScores.int);
  const extraSkillPerLevel = numCell(raceRow, "ExtraSkillPointsPerLevel", 0);
  const perLevel = Math.max(1, skillPointBase + intMod + extraSkillPerLevel);
  const firstLevelMultiplier = numCell(raceRow, "FirstLevelSkillPointsMultiplier", 4);
  const totalSkillPoints = perLevel * firstLevelMultiplier + perLevel * (level - 1);

  const skillTable = tableFromConstantColumn(index, classRow, "SkillsTable");
  const classSkillIndices: number[] = [];
  for (const row of skillTable?.rows.values() ?? []) {
    if (row.ClassSkill === "1") {
      const skillIndex = numCell(row, "SkillIndex", -1);
      if (skillIndex >= 0) classSkillIndices.push(skillIndex);
    }
  }
  const cap = level + 3;
  const ranks = new Map<number, number>(classSkillIndices.map((si) => [si, 0]));
  let remaining = totalSkillPoints;
  if (classSkillIndices.length > 0) {
    let madeProgress = true;
    while (remaining > 0 && madeProgress) {
      madeProgress = false;
      for (const si of classSkillIndices) {
        if (remaining <= 0) break;
        const r = ranks.get(si)!;
        if (r < cap) {
          ranks.set(si, r + 1);
          remaining -= 1;
          madeProgress = true;
        }
      }
    }
  } else {
    warnings.push("No class skills resolved (SkillsTable missing) — skill points computed but not spent");
  }
  const skillRanks = [...ranks.entries()].filter(([, r]) => r > 0).map(([skillIndex, rank]) => ({ skillIndex, rank }));

  // ─── HP ───────────────────────────────────────────────────────────────
  // Max at level 1, "average rounded up" ((die/2)+1) per level after, deterministic.
  const hitDie = numCell(classRow, "HitDie", 4);
  const avgPerLevel = Math.floor(hitDie / 2) + 1;
  const conMod = abilityMod(abilityScores.con);
  let hp = hitDie + conMod;
  for (let lvl = 2; lvl <= level; lvl++) {
    hp += Math.max(1, avgPerLevel + conMod);
  }
  hp = Math.max(level, hp);

  return {
    abilityScores,
    classes: [{ class: params.classId, level }],
    feats,
    skillRanks,
    hp,
    startingPackage: params.classId,
    warnings,
  };
}
