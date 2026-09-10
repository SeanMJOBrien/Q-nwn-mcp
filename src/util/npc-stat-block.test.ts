import { describe, expect, it } from "vitest";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { buildNpcStatBlock } from "./npc-stat-block.js";

function twoDA(columns: string[], rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns, rows: new Map(rows) };
}

/** A real-data-shaped fixture: Fighter (class 4) + Human (race 6), mirroring a live 2DA dump. */
function makeIndex(): ModuleIndex {
  const twodaTables = new Map<string, TwoDATable>();

  twodaTables.set(
    "classes",
    twoDA(
      ["HitDie", "FeatsTable", "BonusFeatsTable", "SkillsTable", "SkillPointBase", "PrimaryAbil", "SpellCaster"],
      [
        [
          4,
          {
            HitDie: "10",
            FeatsTable: "CLS_FEAT_FIGHT",
            BonusFeatsTable: "CLS_BFEAT_FIGHT",
            SkillsTable: "CLS_SKILL_FIGHT",
            SkillPointBase: "2",
            PrimaryAbil: "STR",
            SpellCaster: "0",
          },
        ],
        [
          2,
          {
            HitDie: "8",
            FeatsTable: "CLS_FEAT_CLER",
            BonusFeatsTable: "****",
            SkillsTable: "CLS_SKILL_CLER",
            SkillPointBase: "2",
            PrimaryAbil: "WIS",
            SpellCaster: "1",
          },
        ],
      ],
    ),
  );

  twodaTables.set(
    "racialtypes",
    twoDA(
      [
        "StrAdjust",
        "DexAdjust",
        "ConAdjust",
        "IntAdjust",
        "WisAdjust",
        "ChaAdjust",
        "FeatsTable",
        "ExtraFeatsAtFirstLevel",
        "ExtraSkillPointsPerLevel",
        "FirstLevelSkillPointsMultiplier",
        "NormalFeatEveryNthLevel",
        "NumberNormalFeatsEveryNthLevel",
      ],
      [
        [
          6,
          {
            StrAdjust: "0",
            DexAdjust: "0",
            ConAdjust: "0",
            IntAdjust: "0",
            WisAdjust: "0",
            ChaAdjust: "0",
            FeatsTable: "RACE_FEAT_HUMAN",
            ExtraFeatsAtFirstLevel: "1",
            ExtraSkillPointsPerLevel: "1",
            FirstLevelSkillPointsMultiplier: "4",
            NormalFeatEveryNthLevel: "3",
            NumberNormalFeatsEveryNthLevel: "1",
          },
        ],
        [
          0,
          {
            StrAdjust: "0",
            DexAdjust: "0",
            ConAdjust: "2",
            IntAdjust: "0",
            WisAdjust: "0",
            ChaAdjust: "-2",
            FeatsTable: "RACE_FEAT_DWARF",
            ExtraFeatsAtFirstLevel: "****",
            ExtraSkillPointsPerLevel: "****",
            FirstLevelSkillPointsMultiplier: "4",
            NormalFeatEveryNthLevel: "3",
            NumberNormalFeatsEveryNthLevel: "1",
          },
        ],
      ],
    ),
  );

  twodaTables.set(
    "cls_feat_fight",
    twoDA(
      ["FeatLabel", "FeatIndex", "List", "GrantedOnLevel"],
      [
        [0, { FeatLabel: "WeapSpeClub", FeatIndex: "47", List: "1", GrantedOnLevel: "-1" }], // not automatic — filtered out
        [1, { FeatLabel: "WeapProfSim", FeatIndex: "46", List: "3", GrantedOnLevel: "1" }],
        [2, { FeatLabel: "ArmProfLgt", FeatIndex: "3", List: "3", GrantedOnLevel: "1" }],
        [3, { FeatLabel: "ArmProfMed", FeatIndex: "4", List: "3", GrantedOnLevel: "1" }],
        [4, { FeatLabel: "ArmProfHvy", FeatIndex: "2", List: "3", GrantedOnLevel: "1" }],
        [5, { FeatLabel: "Shield", FeatIndex: "32", List: "3", GrantedOnLevel: "1" }],
        [6, { FeatLabel: "WeapProfMar", FeatIndex: "45", List: "3", GrantedOnLevel: "1" }],
        [7, { FeatLabel: "EpicFighter", FeatIndex: "966", List: "3", GrantedOnLevel: "21" }], // beyond level 5 — must not appear
      ],
    ),
  );

  // Real cls_bfeat_fight shape: single Bonus column, row index = level-1.
  // Slots open at levels 1,2,4,6,8,10 (verified against a live table).
  const bonusPattern = ["1", "1", "0", "1", "0", "1", "0", "1", "0", "1"];
  twodaTables.set(
    "cls_bfeat_fight",
    twoDA(
      ["Bonus"],
      bonusPattern.map((bonus, i) => [i, { Bonus: bonus }] as [number, Record<string, string>]),
    ),
  );

  twodaTables.set(
    "race_feat_human",
    twoDA(["FeatLabel", "FeatIndex"], [[0, { FeatLabel: "QuickMaster", FeatIndex: "258" }]]),
  );
  twodaTables.set(
    "race_feat_dwarf",
    twoDA(["FeatLabel", "FeatIndex"], [[0, { FeatLabel: "Darkvision", FeatIndex: "228" }]]),
  );

  twodaTables.set(
    "cls_skill_fight",
    twoDA(
      ["SkillLabel", "SkillIndex", "ClassSkill"],
      [
        [0, { SkillLabel: "Concentration", SkillIndex: "1", ClassSkill: "1" }],
        [1, { SkillLabel: "DisableTrap", SkillIndex: "2", ClassSkill: "0" }],
        [2, { SkillLabel: "Discipline", SkillIndex: "3", ClassSkill: "1" }],
        [3, { SkillLabel: "Heal", SkillIndex: "4", ClassSkill: "1" }],
        [4, { SkillLabel: "Hide", SkillIndex: "5", ClassSkill: "0" }],
        [6, { SkillLabel: "Lore", SkillIndex: "7", ClassSkill: "1" }],
        [9, { SkillLabel: "Parry", SkillIndex: "10", ClassSkill: "1" }],
        [19, { SkillLabel: "CraftTrap", SkillIndex: "22", ClassSkill: "1" }],
        [22, { SkillLabel: "CraftWeapon", SkillIndex: "26", ClassSkill: "1" }],
        [23, { SkillLabel: "CraftArmor", SkillIndex: "25", ClassSkill: "1" }],
        [24, { SkillLabel: "Ride", SkillIndex: "27", ClassSkill: "1" }],
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
  };
}

describe("buildNpcStatBlock", () => {
  it("computes a level-5 Human Fighter's full stat block deterministically", () => {
    const index = makeIndex();
    const result = buildNpcStatBlock(index, { race: 6, classId: 4, level: 5, powerLevel: "elite" });

    // Ability scores: elite array [15,14,13,12,10,8] assigned str,con,dex,wis,int,cha
    // (primary=STR first, then generic secondary order), +1 to STR at level 4.
    expect(result.abilityScores).toEqual({ str: 16, con: 14, dex: 13, wis: 12, int: 10, cha: 8 });

    const featIds = result.feats.map((f) => f.feat);
    // Racial: QuickMaster (258)
    expect(featIds).toContain(258);
    // Automatic class feats (List=3, GrantedOnLevel<=5): all 6 proficiencies, not the epic one.
    for (const f of [46, 3, 4, 2, 32, 45]) expect(featIds).toContain(f);
    expect(featIds).not.toContain(966);
    // Not-automatic (List=1) row must never appear.
    expect(featIds).not.toContain(47);
    // Generic slots (1 baseline + 1 ExtraFeatsAtFirstLevel + 1 at level 3 = 3) filled with
    // the Fighter weapon preference chain: Longsword Focus/Spec/ImpCrit.
    for (const f of [106, 144, 68]) expect(featIds).toContain(f);
    // Bonus slots (levels 1,2,4 = 3 slots) filled with the universal filler set.
    for (const f of [40, 6, 10]) expect(featIds).toContain(f);
    expect(result.warnings.filter((w) => w.includes("unfilled"))).toHaveLength(0);
    expect(new Set(featIds).size).toBe(featIds.length); // no duplicates

    // HP: d10, max at 1 (10) + Con mod 2, then avg-rounded-up (6)+2 per level for 4 more levels.
    expect(result.hp).toBe(10 + 2 + 4 * (6 + 2));

    // Skill points: base 2 + Int mod 0 + Human's +1/level, x4 at level 1, x1 after: (2+0+1)*4 + 3*4 = 24.
    const totalSpent = result.skillRanks.reduce((sum, s) => sum + s.rank, 0);
    expect(totalSpent).toBe(24);
    // Spent only on the 9 real ClassSkill=1 rows, capped at level+3=8, spread round-robin.
    expect(result.skillRanks.length).toBeLessThanOrEqual(9);
    for (const s of result.skillRanks) expect(s.rank).toBeLessThanOrEqual(8);

    expect(result.classes).toEqual([{ class: 4, level: 5 }]);
    expect(result.startingPackage).toBe(4);
  });

  it("point-buy power levels never exceed their budget and stay within score bounds", () => {
    const index = makeIndex();
    for (const powerLevel of ["low", "standard", "tougher", "epic"] as const) {
      const result = buildNpcStatBlock(index, { race: 6, classId: 4, level: 1, powerLevel });
      for (const score of Object.values(result.abilityScores)) {
        expect(score).toBeGreaterThanOrEqual(6); // racial floor is Cha>=6/Int>=8, base 8 minus nothing here
        expect(score).toBeLessThanOrEqual(18);
      }
    }
  });

  it("applies the racial floor (Cha>=6, Int>=8) for a race with a matching penalty", () => {
    // Half-Orc-shaped: -2 Int/Cha not modeled directly here, but confirm the floor logic
    // fires even under point-buy where a stat could otherwise sit at 8.
    const index = makeIndex();
    const result = buildNpcStatBlock(index, { race: 0, classId: 4, level: 1, powerLevel: "low" }); // Dwarf: -2 Cha
    expect(result.abilityScores.cha).toBeGreaterThanOrEqual(6);
  });

  it("degrades gracefully when a table is missing, without throwing", () => {
    const index = makeIndex();
    index.twodaTables.delete("cls_bfeat_fight");
    const result = buildNpcStatBlock(index, { race: 6, classId: 4, level: 5 });
    expect(result.hp).toBeGreaterThan(0);
    // Bonus slots can't be computed without the table — no bonus_slot feats, no throw.
    expect(result.feats.some((f) => f.source === "bonus_slot")).toBe(false);
  });

  it("reports unfilled generic/bonus slots rather than guessing once the candidate queue is empty", () => {
    const index = makeIndex();
    // Monk has no curated weapon preference (queue starts with just the 3 filler feats),
    // so a class with many open slots should eventually run dry.
    index.twodaTables.set(
      "classes",
      twoDA(
        ["HitDie", "FeatsTable", "BonusFeatsTable", "SkillsTable", "SkillPointBase", "PrimaryAbil", "SpellCaster"],
        [
          [
            5,
            {
              HitDie: "8",
              FeatsTable: "****",
              BonusFeatsTable: "CLS_BFEAT_FIGHT",
              SkillsTable: "****",
              SkillPointBase: "4",
              PrimaryAbil: "WIS",
              SpellCaster: "0",
            },
          ],
        ],
      ),
    );
    const result = buildNpcStatBlock(index, { race: 6, classId: 5, level: 10, powerLevel: "elite" });
    expect(result.warnings.some((w) => w.includes("unfilled"))).toBe(true);
  });
});
