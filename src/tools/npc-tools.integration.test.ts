/**
 * Integration tests for the NPC generation tools: build_npc_stat_block,
 * equip_npc_by_role, respec_weapon_feats.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
  readTextFile: vi.fn(async () => ""),
}));

let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

vi.mock("./tileset-tools.js", () => ({ invalidateTagToAreaCache: vi.fn() }));

let tempDir: string;

function twoDA(columns: string[], rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns, rows: new Map(rows) };
}

function createMockIndex(overrides?: Partial<ModuleIndex>): ModuleIndex {
  return {
    modPath: "/fake/mod.mod",
    tempDir,
    moduleName: "TestModule",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
    ...overrides,
  };
}

/** Wizard (class 10) table, real-data-shaped — same column set as the Fighter table below. */
function loadWizardClassTable(index: ModuleIndex): void {
  index.twodaTables.set(
    "classes",
    twoDA(
      ["HitDie", "FeatsTable", "BonusFeatsTable", "SkillsTable", "SkillPointBase", "PrimaryAbil", "SpellCaster"],
      [[10, { HitDie: "4", FeatsTable: "CLS_FEAT_WIZ", BonusFeatsTable: "CLS_BFEAT_WIZ", SkillsTable: "CLS_SKILL_WIZ", SkillPointBase: "2", PrimaryAbil: "INT", SpellCaster: "1" }]],
    ),
  );
  index.twodaTables.set(
    "cls_feat_wiz",
    twoDA(["FeatLabel", "FeatIndex", "List", "GrantedOnLevel"], [[0, { FeatLabel: "WeapProfWizard", FeatIndex: "51", List: "3", GrantedOnLevel: "1" }]]),
  );
  index.twodaTables.set(
    "cls_bfeat_wiz",
    twoDA(["Bonus"], Array.from({ length: 10 }, (_, i) => [i, { Bonus: "0" }] as [number, Record<string, string>])),
  );
  index.twodaTables.set(
    "cls_skill_wiz",
    twoDA(["SkillLabel", "SkillIndex", "ClassSkill"], [[0, { SkillLabel: "Spellcraft", SkillIndex: "8", ClassSkill: "1" }]]),
  );
}

/** Fighter (class 4) + Human (race 6) class/race tables, real-data-shaped. */
function loadClassRaceTables(index: ModuleIndex): void {
  index.twodaTables.set(
    "classes",
    twoDA(
      ["HitDie", "FeatsTable", "BonusFeatsTable", "SkillsTable", "SkillPointBase", "PrimaryAbil", "SpellCaster"],
      [[4, { HitDie: "10", FeatsTable: "CLS_FEAT_FIGHT", BonusFeatsTable: "CLS_BFEAT_FIGHT", SkillsTable: "CLS_SKILL_FIGHT", SkillPointBase: "2", PrimaryAbil: "STR", SpellCaster: "0" }]],
    ),
  );
  index.twodaTables.set(
    "racialtypes",
    twoDA(
      ["StrAdjust", "DexAdjust", "ConAdjust", "IntAdjust", "WisAdjust", "ChaAdjust", "FeatsTable", "ExtraFeatsAtFirstLevel", "ExtraSkillPointsPerLevel", "FirstLevelSkillPointsMultiplier", "NormalFeatEveryNthLevel", "NumberNormalFeatsEveryNthLevel"],
      [[6, { StrAdjust: "0", DexAdjust: "0", ConAdjust: "0", IntAdjust: "0", WisAdjust: "0", ChaAdjust: "0", FeatsTable: "RACE_FEAT_HUMAN", ExtraFeatsAtFirstLevel: "1", ExtraSkillPointsPerLevel: "1", FirstLevelSkillPointsMultiplier: "4", NormalFeatEveryNthLevel: "3", NumberNormalFeatsEveryNthLevel: "1" }]],
    ),
  );
  index.twodaTables.set(
    "cls_feat_fight",
    twoDA(
      ["FeatLabel", "FeatIndex", "List", "GrantedOnLevel"],
      [
        [0, { FeatLabel: "WeapProfSim", FeatIndex: "46", List: "3", GrantedOnLevel: "1" }],
        [1, { FeatLabel: "ArmProfLgt", FeatIndex: "3", List: "3", GrantedOnLevel: "1" }],
        [2, { FeatLabel: "ArmProfMed", FeatIndex: "4", List: "3", GrantedOnLevel: "1" }],
        [3, { FeatLabel: "ArmProfHvy", FeatIndex: "2", List: "3", GrantedOnLevel: "1" }],
        [4, { FeatLabel: "Shield", FeatIndex: "32", List: "3", GrantedOnLevel: "1" }],
        [5, { FeatLabel: "WeapProfMar", FeatIndex: "45", List: "3", GrantedOnLevel: "1" }],
      ],
    ),
  );
  const bonusPattern = ["1", "1", "0", "1", "0", "1", "0", "1", "0", "1"];
  index.twodaTables.set("cls_bfeat_fight", twoDA(["Bonus"], bonusPattern.map((b, i) => [i, { Bonus: b }] as [number, Record<string, string>])));
  index.twodaTables.set("race_feat_human", twoDA(["FeatLabel", "FeatIndex"], [[0, { FeatLabel: "QuickMaster", FeatIndex: "258" }]]));
  index.twodaTables.set(
    "cls_skill_fight",
    twoDA(
      ["SkillLabel", "SkillIndex", "ClassSkill"],
      [
        [0, { SkillLabel: "Concentration", SkillIndex: "1", ClassSkill: "1" }],
        [2, { SkillLabel: "Discipline", SkillIndex: "3", ClassSkill: "1" }],
      ],
    ),
  );
}

function makeBlueprintUtc(overrides: Record<string, unknown> = {}): GffObj {
  return {
    __data_type: "UTC ",
    Tag: { type: "cexostring", value: "test_npc" },
    TemplateResRef: { type: "resref", value: "test_npc" },
    FirstName: { type: "cexolocstring", value: { "0": "Test" } },
    Race: { type: "byte", value: 6 },
    Str: { type: "byte", value: 10 },
    Dex: { type: "byte", value: 10 },
    Con: { type: "byte", value: 10 },
    Int: { type: "byte", value: 10 },
    Wis: { type: "byte", value: 10 },
    Cha: { type: "byte", value: 10 },
    ClassList: { type: "list", value: [] },
    FeatList: { type: "list", value: [] },
    Equip_ItemList: { type: "list", value: [] },
    ...overrides,
  } as unknown as GffObj;
}

async function createTestClient(registerFn: (server: McpServer) => void): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerFn(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const textBlock = result.content.find((c) => c.type === "text");
  return textBlock?.text ? JSON.parse(textBlock.text) : null;
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-npctest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("build_npc_stat_block", () => {
  it("computes and writes a full stat block onto an existing blueprint", async () => {
    loadClassRaceTables(mockIndex);
    const key = "test_npc.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc() as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "test_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "test_npc", race: "6", classId: "4", level: "5", powerLevel: "elite" },
      });
      const parsed = parseResult(result) as { success: boolean; abilityScores: Record<string, number>; hp: number; featCount: number };
      expect(parsed.success).toBe(true);
      expect(parsed.abilityScores.str).toBe(16); // elite primary + level-4 increase
      expect(parsed.hp).toBeGreaterThan(0);
      expect(parsed.featCount).toBeGreaterThan(0);

      // Confirm it was actually written into the in-memory doc.
      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const classList = (doc.ClassList as { value: GffObj[] }).value;
      expect(classList).toHaveLength(1);
      expect((classList[0].Class as { value: number }).value).toBe(4);
      const featList = (doc.FeatList as { value: GffObj[] }).value;
      expect(featList.length).toBeGreaterThan(0);
      const skillList = (doc.SkillList as { value: GffObj[] }).value;
      expect(skillList.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });

  it("deferLeveling: writes ClassLevel as 1 but keeps every stat computed for the real target level, via HENCH_LEVEL", async () => {
    // Real, confirmed bug this closes: a_hen_join/a_hen_spawn's leveling loop
    // (for i = GetHitDice(...); i < HENCH_LEVEL; i++) never runs when
    // ClassList is already saved at the target level — GetHitDice() reports
    // that level from the moment the blueprint is saved, at spawn exactly as
    // much as at hire. The engine then never sees a real level-up event, and
    // GetMemorizedSpellCountByLevel() silently returns fewer slots than the
    // 2DA promises for any level past the first. deferLeveling writes
    // ClassLevel=1 so that loop has real ground to climb, while every other
    // stat (ability scores, FeatList, SkillList, HP) stays computed for the
    // real level 5.
    loadClassRaceTables(mockIndex);
    const key = "defer_npc.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc() as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "defer_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "defer_npc", race: "6", classId: "4", level: "5", powerLevel: "elite", deferLeveling: true },
      });
      const parsed = parseResult(result) as { success: boolean; hp: number; warnings: string[] };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings).toEqual([]);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const classList = (doc.ClassList as { value: GffObj[] }).value;
      expect((classList[0].ClassLevel as { value: number }).value).toBe(1); // deferred, not 5
      expect((classList[0].Class as { value: number }).value).toBe(4); // class itself unaffected

      const varTable = (doc.VarTable as { value: GffObj[] }).value;
      const henchLevel = varTable.find((v) => (v.Name as { value: string }).value === "HENCH_LEVEL");
      expect(henchLevel).toBeDefined();
      expect((henchLevel!.Value as { value: number }).value).toBe(5); // the REAL target level

      // HP/feats/skills were computed for level 5, not the deferred level 1.
      const featList = (doc.FeatList as { value: GffObj[] }).value;
      expect(featList.length).toBeGreaterThan(3); // more than a level-1 creature would ever have
    } finally {
      await cleanup();
    }
  });

  it("complexity: 'simple' yields no bonus-feat-slot picks", async () => {
    loadClassRaceTables(mockIndex);
    const key = "test_npc_simple.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc() as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "test_npc_simple", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "test_npc_simple", race: "6", classId: "4", level: "5", powerLevel: "elite", complexity: "simple" },
      });
      const parsed = parseResult(result) as { success: boolean; feats: Array<{ feat: number; source: string }>; complexity: string };
      expect(parsed.success).toBe(true);
      expect(parsed.complexity).toBe("simple");
      expect(parsed.feats.some((f) => f.source === "bonus_slot")).toBe(false);
      expect(parsed.feats.length).toBeGreaterThan(0); // racial/automatic/generic feats still present
    } finally {
      await cleanup();
    }
  });

  it("warns when a spellcasting class ends up with no spells anywhere (regression: 'Venn had no spells memorized')", async () => {
    loadClassRaceTables(mockIndex);
    loadWizardClassTable(mockIndex); // overwrites "classes" with just the Wizard row — fine, this test only needs class 10
    const key = "venn.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc({ Tag: { type: "cexostring", value: "venn" } }) as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "venn", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "venn", race: "6", classId: "10", level: "5", powerLevel: "elite" },
      });
      const parsed = parseResult(result) as { success: boolean; warnings: string[] };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings.some((w) => w.includes("spellcasting class"))).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("does not warn, and preserves existing MemorizedList spells, when the blueprint already has them baked onto ClassList", async () => {
    loadClassRaceTables(mockIndex);
    loadWizardClassTable(mockIndex);
    const key = "prebaked.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "prebaked" },
        ClassList: {
          type: "list",
          value: [
            {
              __struct_id: 2,
              Class: { type: "int", value: 10 },
              ClassLevel: { type: "short", value: 1 },
              MemorizedList0: {
                type: "list",
                value: [{ __struct_id: 0, Spell: { type: "word", value: 5 }, SpellFlags: { type: "byte", value: 1 } }],
              },
            },
          ],
        },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "prebaked", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "prebaked", race: "6", classId: "10", level: "5", powerLevel: "elite" },
      });
      const parsed = parseResult(result) as { success: boolean; warnings: string[] };
      expect(parsed.success).toBe(true);
      expect(parsed.warnings.some((w) => w.includes("spellcasting class"))).toBe(false);

      // The merge must not have dropped the pre-existing spell.
      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const classList = (doc.ClassList as { value: GffObj[] }).value;
      expect(classList).toHaveLength(1);
      expect((classList[0].Class as { value: number }).value).toBe(10);
      expect((classList[0].ClassLevel as { value: number }).value).toBe(5); // updated to the new target level
      const memorized = (classList[0].MemorizedList0 as { value: GffObj[] }).value;
      expect(memorized).toHaveLength(1);
      expect((memorized[0].Spell as { value: number }).value).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("errors clearly when the target blueprint doesn't exist", async () => {
    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { resref: "nonexistent", race: "6", classId: "4", level: "5" },
      });
      const text = (result.content as Array<{ text?: string }>)[0]?.text ?? "";
      expect(text).toContain("No nonexistent.utc");
      // isError:true — a failed target resolution is a tool execution failure,
      // not a successful-looking text response (MCP best practice).
      expect(result.isError).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("writes onto a PLACED instance when given area+tag instead of resref (regression: used to only support a standalone blueprint)", async () => {
    loadClassRaceTables(mockIndex);
    const gitKey = "arena.git";
    mockIndex.parsedGff.set(gitKey, {
      __data_type: "GIT ",
      "Creature List": {
        type: "list",
        value: [makeBlueprintUtc({ Tag: { type: "cexostring", value: "def_pal" } })],
      },
    } as unknown as GffDocument);
    mockIndex.resources.set(gitKey, {
      resref: "arena",
      extension: "git",
      filePath: path.join(tempDir, gitKey),
      sizeBytes: 1,
    });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_stat_block",
        arguments: { area: "arena", tag: "def_pal", race: "6", classId: "4", level: "5", powerLevel: "elite" },
      });
      const parsed = parseResult(result) as { success: boolean; target: string; hp: number };
      expect(parsed.success).toBe(true);
      expect(parsed.target).toBe("arena:def_pal");
      expect(parsed.hp).toBeGreaterThan(0);

      const gitDoc = mockIndex.parsedGff.get(gitKey) as GffObj;
      const creature = (gitDoc["Creature List"] as { value: GffObj[] }).value[0];
      const classList = (creature.ClassList as { value: GffObj[] }).value;
      expect((classList[0].ClassLevel as { value: number }).value).toBe(5);
      const featList = (creature.FeatList as { value: GffObj[] }).value;
      expect(featList.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });
});

/** Wizard (class 10) with full spellcasting columns, for level_creature's SpecAbilityList re-bake tests. */
function loadWizardClassTableWithSpells(index: ModuleIndex): void {
  index.twodaTables.set(
    "classes",
    twoDA(
      [
        "HitDie",
        "FeatsTable",
        "BonusFeatsTable",
        "SkillsTable",
        "SkillPointBase",
        "PrimaryAbil",
        "SpellCaster",
        "SpellGainTable",
        "SpellTableColumn",
        "SpellcastingAbil",
        "MinCastingLevel",
      ],
      [
        [
          10,
          {
            HitDie: "4",
            FeatsTable: "CLS_FEAT_WIZ",
            BonusFeatsTable: "CLS_BFEAT_WIZ",
            SkillsTable: "CLS_SKILL_WIZ",
            SkillPointBase: "2",
            PrimaryAbil: "INT",
            SpellCaster: "1",
            SpellGainTable: "CLS_SPGN_WIZ",
            SpellTableColumn: "Wiz_Sorc",
            SpellcastingAbil: "INT",
            MinCastingLevel: "1",
          },
        ],
      ],
    ),
  );
  index.twodaTables.set(
    "cls_feat_wiz",
    twoDA(
      ["FeatLabel", "FeatIndex", "List", "GrantedOnLevel"],
      [[0, { FeatLabel: "WeapProfWizard", FeatIndex: "51", List: "3", GrantedOnLevel: "1" }]],
    ),
  );
  index.twodaTables.set(
    "cls_bfeat_wiz",
    twoDA(["Bonus"], Array.from({ length: 10 }, (_, i) => [i, { Bonus: "0" }] as [number, Record<string, string>])),
  );
  index.twodaTables.set(
    "cls_skill_wiz",
    twoDA(["SkillLabel", "SkillIndex", "ClassSkill"], [[0, { SkillLabel: "Spellcraft", SkillIndex: "8", ClassSkill: "1" }]]),
  );
  // Rows 0-2 are low-level (levels 1-3); row 7 (level 8) gets wider slots so a level-up from 5 to 8 widens the pool.
  index.twodaTables.set(
    "cls_spgn_wiz",
    twoDA(
      ["SpellLevel0", "SpellLevel1", "SpellLevel2", "SpellLevel3"],
      [
        [4, { SpellLevel0: "4", SpellLevel1: "2", SpellLevel2: "1" }], // level 5
        [7, { SpellLevel0: "4", SpellLevel1: "3", SpellLevel2: "2", SpellLevel3: "1" }], // level 8
      ],
    ),
  );
  index.twodaTables.set(
    "spells",
    twoDA(
      ["Wiz_Sorc"],
      [
        [10, { Wiz_Sorc: "0" }],
        [11, { Wiz_Sorc: "1" }],
        [12, { Wiz_Sorc: "2" }],
        [13, { Wiz_Sorc: "3" }],
      ],
    ),
  );
}

describe("level_creature", () => {
  it("levels a blueprint UP by delta, recomputing the full stat block and widening the SpecAbilityList pool", async () => {
    loadWizardClassTableWithSpells(mockIndex);
    const key = "elowen.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "elowen" },
        ClassList: { type: "list", value: [{ __struct_id: 2, Class: { type: "int", value: 10 }, ClassLevel: { type: "short", value: 5 } }] },
        SpecAbilityList: { type: "list", value: [{ __struct_id: 0, Spell: { type: "word", value: 10 }, SpellCasterLevel: { type: "byte", value: 5 }, SpellFlags: { type: "byte", value: 0 } }] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "elowen", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "level_creature",
        arguments: { resref: "elowen", delta: "3" },
      });
      const parsed = parseResult(result) as {
        success: boolean;
        previousLevel: number;
        newLevel: number;
        specAbility: { totalPoolSize: number; readyCount: number };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.previousLevel).toBe(5);
      expect(parsed.newLevel).toBe(8);
      // Level 8's cls_spgn row unlocks spell level 3 (id 13), widening the pool beyond level 5's.
      expect(parsed.specAbility.totalPoolSize).toBeGreaterThan(1);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const classList = (doc.ClassList as { value: GffObj[] }).value;
      expect((classList[0].ClassLevel as { value: number }).value).toBe(8);
      const pool = (doc.SpecAbilityList as { value: GffObj[] }).value;
      expect(pool.some((e) => (e.Spell as { value: number }).value === 13)).toBe(true); // 3rd-level spell now eligible
    } finally {
      await cleanup();
    }
  });

  it("levels DOWN by a negative delta — not subject to LevelUpHenchman's up-only limitation, since this rewrites the stat block directly", async () => {
    loadWizardClassTableWithSpells(mockIndex);
    const key = "elowen.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "elowen" },
        ClassList: { type: "list", value: [{ __struct_id: 2, Class: { type: "int", value: 10 }, ClassLevel: { type: "short", value: 8 } }] },
        SpecAbilityList: { type: "list", value: [] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "elowen", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "level_creature",
        arguments: { resref: "elowen", delta: "-3" },
      });
      const parsed = parseResult(result) as { success: boolean; previousLevel: number; newLevel: number };
      expect(parsed.success).toBe(true);
      expect(parsed.previousLevel).toBe(8);
      expect(parsed.newLevel).toBe(5);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const classList = (doc.ClassList as { value: GffObj[] }).value;
      expect((classList[0].ClassLevel as { value: number }).value).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("clamps the result to the 1-20 range instead of going out of bounds", async () => {
    loadClassRaceTables(mockIndex);
    const key = "test_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        ClassList: { type: "list", value: [{ __struct_id: 2, Class: { type: "int", value: 4 }, ClassLevel: { type: "short", value: 18 } }] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "test_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "level_creature",
        arguments: { resref: "test_npc", delta: "10" },
      });
      const parsed = parseResult(result) as { newLevel: number };
      expect(parsed.newLevel).toBe(20); // 18 + 10 = 28, clamped to 20
    } finally {
      await cleanup();
    }
  });

  it("refuses a multiclass creature — only single-class is supported, matching build_npc_stat_block's own scope", async () => {
    loadClassRaceTables(mockIndex);
    const key = "multi.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        ClassList: {
          type: "list",
          value: [
            { __struct_id: 2, Class: { type: "int", value: 4 }, ClassLevel: { type: "short", value: 3 } },
            { __struct_id: 2, Class: { type: "int", value: 8 }, ClassLevel: { type: "short", value: 2 } },
          ],
        },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "multi", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "level_creature",
        arguments: { resref: "multi", delta: "1" },
      });
      const text = (result.content as Array<{ text?: string }>)[0]?.text ?? "";
      expect(text).toContain("single-class");
      expect(result.isError).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("warns, without crashing, when a caster class has no SpecAbilityList to re-bake (older MemorizedList-based creature)", async () => {
    loadWizardClassTableWithSpells(mockIndex);
    const key = "oldstyle.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "oldstyle" },
        ClassList: { type: "list", value: [{ __struct_id: 2, Class: { type: "int", value: 10 }, ClassLevel: { type: "short", value: 5 } }] },
        // No SpecAbilityList at all — this creature uses the older MemorizedList system.
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "oldstyle", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "level_creature",
        arguments: { resref: "oldstyle", delta: "1" },
      });
      const parsed = parseResult(result) as { success: boolean; specAbility: unknown; warnings: string[] };
      expect(parsed.success).toBe(true);
      expect(parsed.specAbility).toBeUndefined();
      expect(parsed.warnings.some((w) => w.includes("MemorizedList-based"))).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

describe("build_npc_level_library", () => {
  it("batch-builds one correctly-leveled blueprint per requested level, each with a widening SpecAbilityList pool", async () => {
    loadWizardClassTableWithSpells(mockIndex);

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_level_library",
        arguments: {
          resrefPrefix: "sa_wiz",
          name: "Library Wizard",
          race: "6",
          classId: "10",
          levels: "[5,8]",
        },
      });
      const parsed = parseResult(result) as {
        success: boolean;
        builtCount: number;
        totalRequested: number;
        results: Array<{ level: number; resref: string; success: boolean; hp: number; specAbilityPoolSize: number }>;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.builtCount).toBe(2);
      expect(parsed.totalRequested).toBe(2);
      expect(parsed.results.map((r) => r.resref)).toEqual(["sa_wiz_lvl05", "sa_wiz_lvl08"]);
      // Level 8's pool is wider than level 5's — unlocks 3rd-level spells per loadWizardClassTableWithSpells.
      expect(parsed.results[1].specAbilityPoolSize).toBeGreaterThan(parsed.results[0].specAbilityPoolSize);

      const lvl5 = mockIndex.parsedGff.get("sa_wiz_lvl05.utc") as GffObj;
      expect((lvl5.FirstName as { value: Record<string, string> }).value["0"]).toBe("Library Wizard (Level 5)");
      const classList5 = (lvl5.ClassList as { value: GffObj[] }).value;
      expect((classList5[0].ClassLevel as { value: number }).value).toBe(5);

      const lvl8 = mockIndex.parsedGff.get("sa_wiz_lvl08.utc") as GffObj;
      const classList8 = (lvl8.ClassList as { value: GffObj[] }).value;
      expect((classList8[0].ClassLevel as { value: number }).value).toBe(8);
    } finally {
      await cleanup();
    }
  });

  it("skips (not aborts) a level whose resref already exists, reporting the error for just that level", async () => {
    loadClassRaceTables(mockIndex);
    mockIndex.parsedGff.set("sa_fight_lvl03.utc", makeBlueprintUtc() as unknown as GffDocument);
    mockIndex.resources.set("sa_fight_lvl03.utc", {
      resref: "sa_fight_lvl03",
      extension: "utc",
      filePath: path.join(tempDir, "sa_fight_lvl03.utc"),
      sizeBytes: 1,
    });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_level_library",
        arguments: {
          resrefPrefix: "sa_fight",
          name: "Library Fighter",
          race: "6",
          classId: "4",
          levels: "[3,5]",
          bakeSpecAbilities: false,
        },
      });
      const parsed = parseResult(result) as {
        success: boolean;
        builtCount: number;
        results: Array<{ level: number; resref: string; success: boolean; error?: string }>;
      };
      expect(parsed.success).toBe(false); // one level failed
      expect(parsed.builtCount).toBe(1); // but the other still built
      expect(parsed.results[0]).toMatchObject({ level: 3, success: false });
      expect(parsed.results[0].error).toContain("already exists");
      expect(parsed.results[1]).toMatchObject({ level: 5, success: true });

      expect(mockIndex.parsedGff.has("sa_fight_lvl05.utc")).toBe(true);
      // A partial batch produced real, usable output (one level really did
      // build) — not a tool execution failure, even though parsed.success
      // is false for the batch as a whole. isError is reserved for the
      // all-failed case, tested separately below.
      expect(result.isError).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it("marks the whole result isError:true when EVERY requested level fails (nothing usable was produced)", async () => {
    loadClassRaceTables(mockIndex);
    for (const lvl of ["03", "05"]) {
      const key = `sa_all_fail_lvl${lvl}.utc`;
      mockIndex.parsedGff.set(key, makeBlueprintUtc() as unknown as GffDocument);
      mockIndex.resources.set(key, { resref: `sa_all_fail_lvl${lvl}`, extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });
    }

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "build_npc_level_library",
        arguments: {
          resrefPrefix: "sa_all_fail",
          name: "Library Fighter",
          race: "6",
          classId: "4",
          levels: "[3,5]",
          bakeSpecAbilities: false,
        },
      });
      const parsed = parseResult(result) as { success: boolean; builtCount: number };
      expect(parsed.success).toBe(false);
      expect(parsed.builtCount).toBe(0);
      expect(result.isError).toBe(true);
    } finally {
      await cleanup();
    }
  });
});

describe("equip_npc_by_role", () => {
  function makeMartialWeapon(resref: string): GffDocument {
    return {
      Tag: { type: "cexostring", value: resref },
      TemplateResRef: { type: "resref", value: resref },
      BaseItem: { type: "int", value: 1 },
    } as unknown as GffDocument;
  }

  function makeMediumArmor(resref: string): GffDocument {
    return {
      Tag: { type: "cexostring", value: resref },
      TemplateResRef: { type: "resref", value: resref },
      BaseItem: { type: "int", value: 16 },
      PropertiesList: { type: "list", value: [{ __struct_id: 0, PropertyName: { type: "word", value: 1 }, CostValue: { type: "word", value: 4 } }] },
    } as unknown as GffDocument;
  }

  beforeEach(() => {
    mockIndex.twodaTables.set(
      "baseitems",
      twoDA(
        ["EquipableSlots", "ReqFeat0", "ReqFeat1"],
        [
          [1, { EquipableSlots: "0x10", ReqFeat0: "45", ReqFeat1: "****" }], // martial weapon, righthand only
          [16, { EquipableSlots: "0x02", ReqFeat0: "****", ReqFeat1: "****" }], // generic armor row, chest only
        ],
      ),
    );
    mockIndex.parsedGff.set("martial_sword.uti", makeMartialWeapon("martial_sword"));
    mockIndex.parsedGff.set("med_armor.uti", makeMediumArmor("med_armor"));
  });

  it("equips a weapon the creature is proficient with", async () => {
    const key = "proficient_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({ Tag: { type: "cexostring", value: "proficient_npc" }, FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] } }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "proficient_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "proficient_npc", equipment: JSON.stringify({ righthand: "martial_sword" }) },
      });
      const parsed = parseResult(result) as { success: boolean; equipped: Array<{ slot: string; resref: string }>; skipped?: unknown };
      expect(parsed.success).toBe(true);
      expect(parsed.equipped).toContainEqual({ slot: "righthand", resref: "martial_sword" });
      expect(parsed.skipped).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it("skips a weapon the creature is not proficient with, unless force is set", async () => {
    const key = "unproficient_npc.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc({ Tag: { type: "cexostring", value: "unproficient_npc" } }) as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "unproficient_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "unproficient_npc", equipment: JSON.stringify({ righthand: "martial_sword" }) },
      });
      const parsed = parseResult(result) as { equipped: unknown[]; skipped: Array<{ slot: string; reason: string }> };
      expect(parsed.equipped).toHaveLength(0);
      expect(parsed.skipped[0].reason).toContain("not proficient");

      const forced = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "unproficient_npc", equipment: JSON.stringify({ righthand: "martial_sword" }), force: true },
      });
      const parsedForced = parseResult(forced) as { equipped: Array<{ slot: string; warning?: string }> };
      expect(parsedForced.equipped).toHaveLength(1);
      expect(parsedForced.equipped[0].warning).toContain("not proficient");
    } finally {
      await cleanup();
    }
  });

  it("rejects Chest-slot armor whose weight tier the creature isn't proficient with", async () => {
    const key = "light_only_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({ Tag: { type: "cexostring", value: "light_only_npc" }, FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 3 } }] } }) as unknown as GffDocument,
    ); // only Light Armor Proficiency
    mockIndex.resources.set(key, { resref: "light_only_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "light_only_npc", equipment: JSON.stringify({ chest: "med_armor" }) },
      });
      const parsed = parseResult(result) as { skipped: Array<{ reason: string }> };
      expect(parsed.skipped[0].reason).toContain("weight tier");
    } finally {
      await cleanup();
    }
  });

  it("recommends a weapon type from the class preference table when righthand is omitted", async () => {
    const key = "fighter_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "fighter_npc" },
        ClassList: { type: "list", value: [{ __struct_id: 2, Class: { type: "int", value: 4 }, ClassLevel: { type: "short", value: 5 } }] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "fighter_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { pickWeaponPreference } = await import("../util/npc-weapon-preferences.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "fighter_npc", equipment: JSON.stringify({ chest: "med_armor" }) },
      });
      const parsed = parseResult(result) as { recommendedWeapon?: { label: string } };
      // Fighter is fully martial-proficient (feats 45+46), so any of its
      // candidate weapons is valid — the actual pick is deterministic by the
      // creature's own tag/resref ("fighter_npc"), not fixed to one weapon.
      expect(parsed.recommendedWeapon?.label).toBe(pickWeaponPreference(4, "fighter_npc")?.label);
    } finally {
      await cleanup();
    }
  });

  it("picks the same weapon for the same creature across repeated calls (deterministic, no dice rolling)", async () => {
    const { pickWeaponPreference } = await import("../util/npc-weapon-preferences.js");
    const first = pickWeaponPreference(4, "recurring_fighter");
    const second = pickWeaponPreference(4, "recurring_fighter");
    expect(first).toEqual(second);
  });

  it("spreads different same-class creatures across the candidate list instead of one fixed default", async () => {
    const { pickWeaponPreference } = await import("../util/npc-weapon-preferences.js");
    const labels = new Set(
      ["npc_a", "npc_b", "npc_c", "npc_d", "npc_e", "npc_f", "npc_g", "npc_h"].map(
        (seed) => pickWeaponPreference(4, seed)?.label,
      ),
    );
    // Fighter has 3 candidates; 8 distinct seeds should not all land on one.
    expect(labels.size).toBeGreaterThan(1);
  });

  it("returns null for Monk, which has no curated weapon candidates", async () => {
    const { pickWeaponPreference } = await import("../util/npc-weapon-preferences.js");
    expect(pickWeaponPreference(5, "any_monk")).toBeNull();
  });
});

describe("respec_weapon_feats", () => {
  beforeEach(() => {
    mockIndex.twodaTables.set(
      "baseitems",
      twoDA(
        ["WeaponFocusFeat", "WeaponSpecializationFeat", "WeaponImprovedCriticalFeat"],
        [
          [1, { WeaponFocusFeat: "106", WeaponSpecializationFeat: "144", WeaponImprovedCriticalFeat: "68" }], // longsword
          [51, { WeaponFocusFeat: "104", WeaponSpecializationFeat: "142", WeaponImprovedCriticalFeat: "66" }], // rapier
        ],
      ),
    );
  });

  it("moves Focus+Specialization from the current weapon onto the target weapon", async () => {
    const key = "swordsman.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "swordsman" },
        FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 106 } }, { __struct_id: 1, Feat: { type: "word", value: 144 } }] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "swordsman", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({ name: "respec_weapon_feats", arguments: { resref: "swordsman", toBaseItem: "51" } });
      const parsed = parseResult(result) as { success: boolean; removed: Array<{ feat: number }>; added: Array<{ feat: number }> };
      expect(parsed.success).toBe(true);
      expect(parsed.removed.map((r) => r.feat).sort()).toEqual([106, 144]);
      expect(parsed.added.map((a) => a.feat).sort()).toEqual([104, 142]);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const feats = (doc.FeatList as { value: GffObj[] }).value.map((f) => (f.Feat as { value: number }).value);
      expect(feats.sort()).toEqual([104, 142]);
    } finally {
      await cleanup();
    }
  });

  it("reports no feats found when the creature has no weapon-specific feats at all", async () => {
    const key = "unspecced.utc";
    mockIndex.parsedGff.set(key, makeBlueprintUtc({ Tag: { type: "cexostring", value: "unspecced" } }) as unknown as GffDocument);
    mockIndex.resources.set(key, { resref: "unspecced", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({ name: "respec_weapon_feats", arguments: { resref: "unspecced", toBaseItem: "51" } });
      const parsed = parseResult(result) as { success: boolean };
      expect(parsed.success).toBe(false);
    } finally {
      await cleanup();
    }
  });
});

describe("remove_feats", () => {
  it("removes the named feats and leaves the rest untouched", async () => {
    const key = "cleric_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "cleric_npc" },
        FeatList: {
          type: "list",
          value: [
            { __struct_id: 1, Feat: { type: "word", value: 46 } }, // Simple Weapon Proficiency, kept
            { __struct_id: 1, Feat: { type: "word", value: 95 } }, // Weapon Focus: Morningstar, removed
            { __struct_id: 1, Feat: { type: "word", value: 133 } }, // Weapon Specialization: Morningstar, removed
          ],
        },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "cleric_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({ name: "remove_feats", arguments: { resref: "cleric_npc", feats: "[95,133]" } });
      const parsed = parseResult(result) as { success: boolean; removed: number[]; notFound: number[] };
      expect(parsed.success).toBe(true);
      expect(parsed.removed.sort((a, b) => a - b)).toEqual([95, 133]);
      expect(parsed.notFound).toEqual([]);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const feats = (doc.FeatList as { value: GffObj[] }).value.map((f) => (f.Feat as { value: number }).value);
      expect(feats).toEqual([46]);
    } finally {
      await cleanup();
    }
  });

  it("reports feat ids that weren't present as notFound, without erroring", async () => {
    const key = "no_match.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "no_match" },
        FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 46 } }] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "no_match", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({ name: "remove_feats", arguments: { resref: "no_match", feats: "[999]" } });
      const parsed = parseResult(result) as { success: boolean; removed: number[]; notFound: number[] };
      expect(parsed.success).toBe(true);
      expect(parsed.removed).toEqual([]);
      expect(parsed.notFound).toEqual([999]);

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const feats = (doc.FeatList as { value: GffObj[] }).value.map((f) => (f.Feat as { value: number }).value);
      expect(feats).toEqual([46]);
    } finally {
      await cleanup();
    }
  });
});

describe("add_equipped_item_property", () => {
  it("adds an AC_BONUS property to the item in the named slot", async () => {
    const key = "thug_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "thug_npc" },
        Equip_ItemList: {
          type: "list",
          value: [
            { __struct_id: 2, BaseItem: { type: "int", value: 16 }, TemplateResRef: { type: "resref", value: "nw_aarcl004" }, PropertiesList: { type: "list", value: [] } },
          ],
        },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "thug_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "add_equipped_item_property",
        arguments: { resref: "thug_npc", slot: "chest", propertyName: "1", costTable: "2", costValue: "5" },
      });
      const parsed = parseResult(result) as { success: boolean; slot: string };
      expect(parsed.success).toBe(true);
      expect(parsed.slot).toBe("chest");

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const chest = (doc.Equip_ItemList as { value: GffObj[] }).value[0];
      const props = (chest.PropertiesList as { value: GffObj[] }).value;
      expect(props).toHaveLength(1);
      expect((props[0].PropertyName as { value: number }).value).toBe(1);
      expect((props[0].CostValue as { value: number }).value).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("reports an error when the slot has nothing equipped", async () => {
    const key = "bare_npc.utc";
    mockIndex.parsedGff.set(
      key,
      makeBlueprintUtc({
        Tag: { type: "cexostring", value: "bare_npc" },
        Equip_ItemList: { type: "list", value: [] },
      }) as unknown as GffDocument,
    );
    mockIndex.resources.set(key, { resref: "bare_npc", extension: "utc", filePath: path.join(tempDir, key), sizeBytes: 1 });

    const { registerNpcTools } = await import("./npc-tools.js");
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "add_equipped_item_property",
        arguments: { resref: "bare_npc", slot: "chest", propertyName: "1", costValue: "5" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      expect(text).toContain("Nothing equipped");
    } finally {
      await cleanup();
    }
  });
});
