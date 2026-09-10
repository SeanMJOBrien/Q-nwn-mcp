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
    const { client, cleanup } = await createTestClient(registerNpcTools);
    try {
      const result = await client.callTool({
        name: "equip_npc_by_role",
        arguments: { resref: "fighter_npc", equipment: JSON.stringify({ chest: "med_armor" }) },
      });
      const parsed = parseResult(result) as { recommendedWeapon?: { label: string } };
      expect(parsed.recommendedWeapon?.label).toBe("Longsword");
    } finally {
      await cleanup();
    }
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
