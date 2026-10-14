import { describe, expect, it } from "vitest";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { bonusSpellsForLevel, computeSpecAbilityPool } from "./spec-ability-pool.js";

function twoDA(columns: string[], rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns, rows: new Map(rows) };
}

function makeIndex(): ModuleIndex {
  const twodaTables = new Map<string, TwoDATable>();

  twodaTables.set(
    "classes",
    twoDA(
      ["Label", "SpellCaster", "SpellGainTable", "SpellTableColumn", "SpellcastingAbil", "MinCastingLevel"],
      [
        [
          2, // Cleric — prepared caster, Wis-based, MinCastingLevel 1
          {
            Label: "Cleric",
            SpellCaster: "1",
            SpellGainTable: "CLS_SPGN_CLER",
            SpellTableColumn: "Cleric",
            SpellcastingAbil: "WIS",
            MinCastingLevel: "1",
          },
        ],
        [
          6, // Paladin — late caster, MinCastingLevel 4
          {
            Label: "Paladin",
            SpellCaster: "1",
            SpellGainTable: "CLS_SPGN_PAL",
            SpellTableColumn: "Paladin",
            SpellcastingAbil: "WIS",
            MinCastingLevel: "4",
          },
        ],
        [
          4, // Fighter — not a caster at all
          {
            Label: "Fighter",
            SpellCaster: "0",
            SpellGainTable: "****",
            SpellTableColumn: "****",
            SpellcastingAbil: "****",
            MinCastingLevel: "****",
          },
        ],
      ],
    ),
  );

  // row index = classLevel - 1; a level-5 Cleric reads row 4.
  twodaTables.set(
    "cls_spgn_cler",
    twoDA(
      ["SpellLevel0", "SpellLevel1", "SpellLevel2", "SpellLevel3"],
      [
        [0, { SpellLevel0: "3", SpellLevel1: "1" }],
        [1, { SpellLevel0: "4", SpellLevel1: "2" }],
        [2, { SpellLevel0: "4", SpellLevel1: "2", SpellLevel2: "1" }],
        [3, { SpellLevel0: "5", SpellLevel1: "3", SpellLevel2: "2" }],
        [4, { SpellLevel0: "5", SpellLevel1: "3", SpellLevel2: "2", SpellLevel3: "1" }],
      ],
    ),
  );

  twodaTables.set(
    "cls_spgn_pal",
    twoDA(
      ["SpellLevel0", "SpellLevel1"],
      [
        [0, {}],
        [1, {}],
        [2, {}],
        [3, { SpellLevel1: "1" }], // row 3 = classLevel 4, Paladin's first real row
      ],
    ),
  );

  twodaTables.set(
    "spells",
    twoDA(
      ["Cleric", "Paladin"],
      [
        [10, { Cleric: "0" }], // orison
        [11, { Cleric: "0" }], // orison
        [20, { Cleric: "1" }],
        [21, { Cleric: "1" }],
        [22, { Cleric: "1" }],
        [30, { Cleric: "2" }],
        [31, { Cleric: "2" }],
        [40, { Cleric: "3" }],
        [99, { Cleric: "****" }], // not eligible for Cleric at all
        [50, { Paladin: "1" }],
      ],
    ),
  );

  return {
    modPath: "/fake/mod.mod",
    tempDir: "/tmp/fake",
    moduleName: "Test",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables,
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
  } as unknown as ModuleIndex;
}

describe("bonusSpellsForLevel", () => {
  it("matches the real PHB Table 1-1 known values", () => {
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
    expect(bonusSpellsForLevel(1, 1)).toBe(1);
    expect(bonusSpellsForLevel(1, 2)).toBe(0);
    expect(bonusSpellsForLevel(4, 1)).toBe(1);
    expect(bonusSpellsForLevel(4, 2)).toBe(1);
    expect(bonusSpellsForLevel(4, 3)).toBe(1);
    expect(bonusSpellsForLevel(4, 4)).toBe(1);
    expect(bonusSpellsForLevel(4, 5)).toBe(0);
    expect(bonusSpellsForLevel(5, 1)).toBe(2);
    expect(bonusSpellsForLevel(5, 2)).toBe(1);
    expect(bonusSpellsForLevel(5, 3)).toBe(1);
    expect(bonusSpellsForLevel(5, 4)).toBe(1);
    expect(bonusSpellsForLevel(5, 5)).toBe(1);
  });

  it("returns 0 for level outside 1-9 or a non-positive modifier", () => {
    expect(bonusSpellsForLevel(5, 0)).toBe(0);
    expect(bonusSpellsForLevel(5, 10)).toBe(0);
    expect(bonusSpellsForLevel(-2, 1)).toBe(0);
    expect(bonusSpellsForLevel(0, 1)).toBe(0);
  });
});

describe("computeSpecAbilityPool", () => {
  const abilities = { str: 10, dex: 10, con: 10, int: 10, wis: 16, cha: 10 }; // Wis 16 -> mod +3

  it("skips a non-caster class with a warning, never guessing a pool", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 4, 5, abilities);
    expect(result.pool).toEqual([]);
    expect(result.warnings[0]).toMatch(/not a spellcaster/);
  });

  it("skips a class below its MinCastingLevel", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 6, 2, abilities); // Paladin level 2, needs 4
    expect(result.pool).toEqual([]);
    expect(result.warnings[0]).toMatch(/MinCastingLevel/);
  });

  it("includes a late caster once it reaches MinCastingLevel", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 6, 4, abilities); // Paladin level 4
    expect(result.slotsByLevel[1]).toBeGreaterThan(0);
    expect(result.pool.map((p) => p.spell)).toContain(50);
  });

  it("computes base + ability-bonus slots per level for a level-5 Cleric with Wis 16 (+3)", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 2, 5, abilities);
    // Base at row 4: L0=5 L1=3 L2=2 L3=1. Bonus(mod=3): L1=+1 L2=+1 L3=+1, L0 never gets a bonus.
    expect(result.slotsByLevel[0]).toBe(5);
    expect(result.slotsByLevel[1]).toBe(4);
    expect(result.slotsByLevel[2]).toBe(3);
    expect(result.slotsByLevel[3]).toBe(2);
  });

  it("bakes every eligible spell at every accessible level — not capped to slot count", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 2, 5, abilities);
    const byLevel = (lvl: number) => result.pool.filter((p) => p.level === lvl).map((p) => p.spell);
    expect(byLevel(0).sort()).toEqual([10, 11]);
    expect(byLevel(1).sort()).toEqual([20, 21, 22]);
    expect(byLevel(2).sort()).toEqual([30, 31]);
    expect(byLevel(3).sort()).toEqual([40]);
  });

  it("excludes a spell whose own column is **** even if the id would otherwise be in range", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 2, 5, abilities);
    expect(result.pool.map((p) => p.spell)).not.toContain(99);
  });

  it("gives no bonus spells at level 0 (orisons) regardless of ability modifier", () => {
    const index = makeIndex();
    const noMod = computeSpecAbilityPool(index, 2, 5, { ...abilities, wis: 10 });
    const highMod = computeSpecAbilityPool(index, 2, 5, abilities);
    expect(noMod.slotsByLevel[0]).toBe(highMod.slotsByLevel[0]);
  });

  it("returns a warning and empty pool for a class id with no 2DA row", () => {
    const index = makeIndex();
    const result = computeSpecAbilityPool(index, 999, 5, abilities);
    expect(result.pool).toEqual([]);
    expect(result.warnings[0]).toMatch(/no row/);
  });
});
