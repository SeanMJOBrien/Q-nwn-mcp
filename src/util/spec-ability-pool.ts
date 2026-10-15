/**
 * Build-time candidate-pool computation for the Special-Abilities random-
 * caster system (see spec-ability-script.ts for the runtime half).
 *
 * WHY THIS EXISTS, vs. the already-shipped random-abilities-script.ts
 * (Tier 1 MemorizedList / Tier 2 cheat-cast system): that system computes
 * everything at OnSpawn, entirely in NWScript, because SetMemorizedSpell()
 * is a real runtime setter. SpecAbilityList has no equivalent — the engine
 * exposes only GetSpellAbilityCount/GetSpellAbilitySpell/GetSpellAbilityReady/
 * SetSpellAbilityReady (all added 1.88.8193.36 EE), and NONE of them can add
 * a new ability to a creature at runtime; SetSpellAbilityReady only toggles
 * whether an EXISTING slot is active. So "pick which spells a caster could
 * have" has to happen once, at build time (here, in TypeScript, reading the
 * loaded module's own classes.2da/cls_spgn_<class>.2da/spells.2da) — an
 * oversized pool of every spell the creature's class/level could legally
 * know is baked onto SpecAbilityList, and a tiny runtime include
 * (inc_spec_ability.nss) randomly marks a real-slot-sized SUBSET of that
 * pool "ready" each time the module loads. See docs comparison for the
 * tradeoffs against the MemorizedList system.
 *
 * Ability-score bonus spells use the real D&D 3.5 formula (PHB Table 1-1):
 * for ability modifier M and spell level L (1-9), bonus = floor((M-L)/4)+1
 * when M >= L >= 1, else 0. classes.2da/cls_spgn_<class>.2da give base slot
 * counts only — this formula is NOT encoded anywhere in NWN's 2DA stack, so
 * it's computed here explicitly rather than guessed from a table that
 * doesn't exist. Verified against the known table by hand: mod 1 -> 1 bonus
 * spell at level 1 only; mod 4 -> 1 bonus at each of levels 1-4; mod 5 -> 2
 * bonus at level 1, 1 bonus at levels 2-5.
 *
 * Eligibility reads spells.2da's own per-class column directly (via
 * classes.2da's SpellTableColumn, e.g. "Cleric", "Wiz_Sorc") — NOT the
 * engine function GetSpellLevelByClass(), which the shipped random-abilities
 * system had to special-case around because it resolves through a spell
 * row's "Master" column even when the row's OWN per-class column is "****"
 * (confirmed: row 716 SuckBrain, row 331 DELETED_END_Fire both leaked into a
 * caster's rolled spellbook this way). Reading the 2DA cell directly here
 * has no such inheritance behavior to guard against — there is no backstop
 * needed because there is nothing to resolve through.
 *
 * This system is NOT hardcoded to 7 specific classes. Any classes.2da row
 * with SpellCaster=1 and real SpellGainTable/SpellTableColumn/
 * SpellcastingAbil columns is handled identically, including a class added
 * by a HAK (e.g. a custom Adept/Shaman). Confirmed against this project's
 * own loaded base-game classes.2da (2026-10-14): base NWN does NOT implement
 * the D&D 3.5 DMG's non-PC NPC classes (Adept, Aristocrat, Expert, Warrior)
 * at all, and "Shaman" doesn't exist either — the only non-PC class row is
 * Commoner (20), which is SpellCaster=0. Every other PlayerClass=0 row
 * (Animal, Humanoid, Undead, Construct, Elemental, Fey, Dragon, Outsider,
 * Shapechanger, Vermin, Giant, Beast, MagicBeast, Aberration, Monstrous,
 * Ooze, Gelatinous) is a monster TYPE class, also SpellCaster=0. If a module
 * needs a non-PC spellcasting class, it has to come from a HAK that adds one
 * following the standard column convention — nothing here guesses at a
 * class that doesn't exist in the loaded data.
 */

import type { GffObj } from "../types/gff.js";
import { getFieldNum } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { getVarTableEntries } from "./git-helpers.js";
import { tableFromConstantColumn } from "./npc-stat-block.js";
import { seedHash } from "./npc-weapon-preferences.js";
import { hasCell, listOf, twoDARow } from "./verify/common.js";

export interface SpecAbilityPoolEntry {
  spell: number;
  /** 0-9, the spell's level for THIS class — used only to group the pool for reporting/testing. */
  level: number;
}

export interface SpecAbilityPoolResult {
  classId: number;
  classLevel: number;
  spellcastingAbility: string | undefined;
  /** Real slot count per spell level (base table + ability bonus), 0-9, only non-zero entries. */
  slotsByLevel: Record<number, number>;
  pool: SpecAbilityPoolEntry[];
  warnings: string[];
}

/**
 * D&D 3.5 bonus spells per spell level from an ability modifier (PHB Table
 * 1-1). Returns 0 for L outside 1-9, M <= 0, or L > M (no bonus spell of a
 * level the modifier doesn't reach).
 */
export function bonusSpellsForLevel(abilityMod: number, spellLevel: number): number {
  if (spellLevel < 1 || spellLevel > 9) return 0;
  if (abilityMod < spellLevel) return 0;
  return Math.floor((abilityMod - spellLevel) / 4) + 1;
}

function abilityModFromScore(score: number): number {
  return Math.floor((score - 10) / 2);
}

/** classes.2da's SpellcastingAbil column ("STR"/"DEX"/.../"CHA") -> the matching ability-score field name. */
const SPELLCASTING_ABIL_TO_FIELD: Record<string, "str" | "dex" | "con" | "int" | "wis" | "cha"> = {
  STR: "str",
  DEX: "dex",
  CON: "con",
  INT: "int",
  WIS: "wis",
  CHA: "cha",
};

export interface AbilityScoreSet {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/**
 * Compute the full candidate pool for one class position. Returns an empty
 * pool (with a warning, never a guess) when the class isn't a real
 * spellcaster in the loaded data, or has no accessible spell level yet.
 */
export function computeSpecAbilityPool(
  index: ModuleIndex,
  classId: number,
  classLevel: number,
  abilityScores: AbilityScoreSet,
): SpecAbilityPoolResult {
  const warnings: string[] = [];
  const classRow = twoDARow(index, "classes", classId);
  const empty = (): SpecAbilityPoolResult => ({
    classId,
    classLevel,
    spellcastingAbility: undefined,
    slotsByLevel: {},
    pool: [],
    warnings,
  });

  if (!classRow) {
    warnings.push(`classes.2da has no row ${classId} — skipped`);
    return empty();
  }
  if (classRow.SpellCaster !== "1") {
    warnings.push(
      `Class ${classId} (${classRow.Label ?? "?"}) is not a spellcaster (classes.2da SpellCaster != 1) — skipped`,
    );
    return empty();
  }

  const gainTable = tableFromConstantColumn(index, classRow, "SpellGainTable");
  if (!gainTable) {
    warnings.push(`Class ${classId} (${classRow.Label ?? "?"}) has no SpellGainTable — skipped`);
    return empty();
  }

  const classCol = hasCell(classRow, "SpellTableColumn") ? classRow.SpellTableColumn : undefined;
  if (!classCol) {
    warnings.push(`Class ${classId} (${classRow.Label ?? "?"}) has no SpellTableColumn — skipped`);
    return empty();
  }

  const minLevelStr = classRow.MinCastingLevel;
  const minLevel = minLevelStr && minLevelStr !== "****" ? Number(minLevelStr) : 1;
  if (!Number.isFinite(minLevel) || classLevel < minLevel) {
    warnings.push(`Class ${classId} level ${classLevel} is below MinCastingLevel (${minLevel}) — skipped`);
    return empty();
  }

  const gainRow = gainTable.rows.get(classLevel - 1);
  if (!gainRow) {
    warnings.push(`${classRow.SpellGainTable} has no row for level ${classLevel} — skipped`);
    return empty();
  }

  const spellcastingAbil = hasCell(classRow, "SpellcastingAbil") ? classRow.SpellcastingAbil : undefined;
  const abilityField = spellcastingAbil ? SPELLCASTING_ABIL_TO_FIELD[spellcastingAbil] : undefined;
  const abilityMod = abilityField ? abilityModFromScore(abilityScores[abilityField]) : 0;
  if (spellcastingAbil && !abilityField) {
    warnings.push(`Unrecognized SpellcastingAbil "${spellcastingAbil}" on class ${classId} — bonus spells skipped`);
  }

  const slotsByLevel: Record<number, number> = {};
  for (let level = 0; level <= 9; level++) {
    const raw = gainRow[`SpellLevel${level}`];
    const base = raw && raw !== "****" ? Number(raw) : 0;
    if (!Number.isFinite(base) || base <= 0) continue;
    const bonus = level === 0 ? 0 : bonusSpellsForLevel(abilityMod, level);
    slotsByLevel[level] = base + bonus;
  }

  const spellsTable = index.twodaTables.get("spells");
  const pool: SpecAbilityPoolEntry[] = [];
  if (!spellsTable) {
    warnings.push("spells.2da is not loaded — pool is empty");
    return { classId, classLevel, spellcastingAbility: spellcastingAbil, slotsByLevel, pool, warnings };
  }

  const accessibleLevels = new Set(Object.keys(slotsByLevel).map(Number));
  for (const [spellId, row] of spellsTable.rows) {
    const cell = row[classCol];
    if (!cell || cell === "****") continue;
    const level = Number(cell);
    if (!Number.isFinite(level) || !accessibleLevels.has(level)) continue;
    pool.push({ spell: spellId, level });
  }

  return { classId, classLevel, spellcastingAbility: spellcastingAbil, slotsByLevel, pool, warnings };
}

export interface SpecAbilityListEntry {
  spell: number;
  classLevel: number;
  ready: boolean;
}

/**
 * Build the full, sorted-by-level SpecAbilityList entry set for one or more
 * class positions — shared by bake_spec_ability_pool (spec-ability-tools.ts)
 * and compose_encounter's boss-spell wiring (encounter-composer-tools.ts),
 * so both write the identical shape rather than duplicating the pool-merge/
 * sort/ready-selection logic. See bake_spec_ability_pool's own tool
 * description for why sort-by-level matters (a DM possessing the creature
 * sees its ready abilities in this order, since SetSpellAbilityReady never
 * reorders the underlying list) and why markReady defaults to false (safe —
 * a dormant pool is exactly as mute as having none, never an unintended
 * unlimited spellbook, if nothing ever activates it).
 */
export function buildSpecAbilityListEntries(
  index: ModuleIndex,
  classPositions: Array<{ classId: number; classLevel: number }>,
  abilityScores: AbilityScoreSet,
  markReady: boolean,
  readySeed: string,
): { entries: SpecAbilityListEntry[]; breakdown: SpecAbilityPoolResult[]; warnings: string[] } {
  const breakdown: SpecAbilityPoolResult[] = [];
  const warnings: string[] = [];
  const pool: Array<SpecAbilityPoolEntry & { classLevel: number; classId: number }> = [];
  const slotsByClassLevel = new Map<string, number>();

  for (const { classId, classLevel } of classPositions) {
    const result = computeSpecAbilityPool(index, classId, classLevel, abilityScores);
    breakdown.push(result);
    warnings.push(...result.warnings);
    for (const [lvl, slots] of Object.entries(result.slotsByLevel)) {
      slotsByClassLevel.set(`${result.classId}:${lvl}`, slots);
    }
    for (const entry of result.pool) {
      pool.push({ ...entry, classLevel: result.classLevel, classId: result.classId });
    }
  }

  pool.sort((a, b) => a.level - b.level || a.spell - b.spell);

  const readySpellIds = new Set<string>();
  if (markReady) {
    const byGroup = new Map<string, typeof pool>();
    for (const p of pool) {
      const key = `${p.classId}:${p.level}`;
      const arr = byGroup.get(key) ?? [];
      arr.push(p);
      byGroup.set(key, arr);
    }
    for (const [key, groupEntries] of byGroup) {
      const slots = slotsByClassLevel.get(key) ?? 0;
      if (slots <= 0) continue;
      const ranked = [...groupEntries].sort(
        (a, b) => seedHash(`${readySeed}:${key}:${a.spell}`) - seedHash(`${readySeed}:${key}:${b.spell}`),
      );
      for (const p of ranked.slice(0, slots)) readySpellIds.add(`${p.classId}:${p.level}:${p.spell}`);
    }
  }

  const entries: SpecAbilityListEntry[] = pool.map((p) => ({
    spell: p.spell,
    classLevel: p.classLevel,
    ready: readySpellIds.has(`${p.classId}:${p.level}:${p.spell}`),
  }));

  return { entries, breakdown, warnings };
}

/**
 * Shared glue between bake_spec_ability_pool (spec-ability-tools.ts) and
 * level_creature (npc-tools.ts) — reads a creature's own ability scores and
 * ClassList (honoring a `deferLeveling` HENCH_LEVEL override for a
 * single-class creature, same convention verify/blueprints.ts's
 * effectiveLevel already uses), and returns the full sorted entry set ready
 * to write onto SpecAbilityList. Lives here, not in a tools file, so both
 * callers can import it without creating a tools-file import cycle
 * (spec-ability-tools.ts already imports resolveCreatureTarget FROM
 * npc-tools.ts — a reverse import would be circular).
 *
 * Does not write SpecAbilityList or save anything itself — callers differ
 * slightly in what else they report alongside the write, so they stay in
 * charge of that.
 */
export function bakeSpecAbilityPoolForCreature(
  index: ModuleIndex,
  creature: GffObj,
  markReady: boolean,
  readySeed: string,
): {
  entries: SpecAbilityListEntry[];
  breakdown: SpecAbilityPoolResult[];
  warnings: string[];
  henchLevelApplied?: number;
} {
  const abilityScores: AbilityScoreSet = {
    str: getFieldNum(creature, "Str"),
    dex: getFieldNum(creature, "Dex"),
    con: getFieldNum(creature, "Con"),
    int: getFieldNum(creature, "Int"),
    wis: getFieldNum(creature, "Wis"),
    cha: getFieldNum(creature, "Cha"),
  };

  const classList = listOf(creature, "ClassList");
  const henchLevelEntry = getVarTableEntries(creature).find(
    (v) => v.name.toLowerCase() === "hench_level" && v.type === "int",
  );
  const henchLevel = typeof henchLevelEntry?.value === "number" ? henchLevelEntry.value : undefined;

  const classPositions = classList.map((cls) => {
    const classId = getFieldNum(cls, "Class");
    const rawLevel = getFieldNum(cls, "ClassLevel");
    const classLevel = classList.length === 1 && henchLevel ? Math.max(rawLevel, henchLevel) : rawLevel;
    return { classId, classLevel };
  });

  const { entries, breakdown, warnings } = buildSpecAbilityListEntries(
    index,
    classPositions,
    abilityScores,
    markReady,
    readySeed,
  );

  return {
    entries,
    breakdown,
    warnings,
    ...(henchLevel && classList.length === 1 ? { henchLevelApplied: henchLevel } : {}),
  };
}
