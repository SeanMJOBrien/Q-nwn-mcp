/**
 * Integration tests for MCP tool handlers.
 *
 * Uses InMemoryTransport to call tools through the real MCP protocol stack,
 * with mocked nim-tools (no binary dependencies) and a synthetic ModuleIndex.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

// ─── Mocks ────────────────────────────────────────────────────────────────

// Mock nim-tools: no binary calls
vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  // jsonToGff: write the JSON doc as-is so we can read it back
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
}));

// Mock module-loader: return our synthetic index
let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({
    root: undefined,
    userDir: undefined,
    erfs: undefined,
    dirs: [mockIndex.tempDir],
  }),
}));

// Mock tileset cache invalidation (imported by git-helpers)
vi.mock("./tileset-tools.js", () => ({
  invalidateTagToAreaCache: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

let tempDir: string;

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

function makeGitDoc(): GffDocument {
  return {
    __data_type: "GIT ",
    "Creature List": { type: "list", value: [] },
    "Placeable List": { type: "list", value: [] },
    "Door List": { type: "list", value: [] },
    "Encounter List": { type: "list", value: [] },
    "TriggerList": { type: "list", value: [] },
    WaypointList: { type: "list", value: [] },
    SoundList: { type: "list", value: [] },
    StoreList: { type: "list", value: [] },
  } as unknown as GffDocument;
}

/** Create an MCP client connected to a server with specific tool groups registered. */
async function createTestClient(
  registerFn: (server: McpServer) => void,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerFn(server);

  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

/** Parse the text content from an MCP tool result. */
function parseResult(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const textBlock = result.content.find(c => c.type === "text");
  return textBlock?.text ? JSON.parse(textBlock.text) : null;
}

// ─── Setup/Teardown ───────────────────────────────────────────────────────

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

// ─── Tests: create_item_blueprint ─────────────────────────────────────────

describe("create_item_blueprint", () => {
  it("creates a basic item from scratch", async () => {
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient(registerWriteTools);

    try {
      const result = await client.callTool({
        name: "create_item_blueprint",
        arguments: { resref: "test_sword", tag: "TEST_SWORD", name: "Test Sword", baseItem: "4" },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe("test_sword.uti");
      expect(parsed.baseItem).toBe(4);

      // Verify it's in the index
      expect(mockIndex.resources.has("test_sword.uti")).toBe(true);
      expect(mockIndex.parsedGff.has("test_sword.uti")).toBe(true);

      // Verify GFF structure
      const doc = mockIndex.parsedGff.get("test_sword.uti") as GffObj;
      expect((doc.Tag as { value: string }).value).toBe("TEST_SWORD");
      expect((doc.BaseItem as { value: number }).value).toBe(4);
      expect((doc.PropertiesList as { value: unknown[] }).value).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("creates an item with properties", async () => {
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient(registerWriteTools);

    try {
      const properties = JSON.stringify([
        { propertyName: 56, subType: 0, costTable: 2, costValue: 3 },
        { propertyName: 0, subType: 1, costTable: 1, costValue: 2, param1: 0, param1Value: 0 },
      ]);

      const result = await client.callTool({
        name: "create_item_blueprint",
        arguments: {
          resref: "magic_sword",
          tag: "MAGIC_SWORD",
          name: "Magic Sword",
          baseItem: "4",
          cost: "500",
          properties,
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.propertiesCount).toBe(2);

      const doc = mockIndex.parsedGff.get("magic_sword.uti") as GffObj;
      const propList = (doc.PropertiesList as { value: Array<GffObj> }).value;
      expect(propList).toHaveLength(2);
      expect(propList[0].PropertyName).toEqual({ type: "word", value: 56 });
      expect(propList[0].ChanceAppear).toEqual({ type: "byte", value: 100 });
      expect(propList[1].Param1).toEqual({ type: "byte", value: 0 });
    } finally {
      await cleanup();
    }
  });

  it("defaults omitted property fields instead of emitting undefined", async () => {
    // Regression: an undefined `value` is dropped by JSON.stringify, so the
    // struct reached nwn_gff with no `value` key and it died with
    // `key not found: value` plus a Nim stack trace naming neither the property
    // nor the field. Properties legitimately omit subType — Enhancement (row 6)
    // has no subtype table — so this is the common case, and the test above
    // missed it only because it passes every field explicitly.
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient(registerWriteTools);

    try {
      const result = await client.callTool({
        name: "create_item_blueprint",
        arguments: {
          resref: "plus_one",
          tag: "PLUS_ONE",
          name: "Longsword +1",
          baseItem: "1",
          properties: JSON.stringify([{ propertyName: 6, costTable: 2, costValue: 1 }]),
        },
      });

      expect((parseResult(result) as Record<string, unknown>).success).toBe(true);

      const doc = mockIndex.parsedGff.get("plus_one.uti") as GffObj;
      const prop = (doc.PropertiesList as { value: Array<GffObj> }).value[0];

      // Every field must carry a concrete value, and survive a JSON round trip.
      for (const field of ["PropertyName", "Subtype", "CostTable", "CostValue", "Param1", "Param1Value"]) {
        expect((prop[field] as { value: unknown }).value).toBeTypeOf("number");
      }
      expect(prop.Subtype).toEqual({ type: "word", value: 0 });
      expect(JSON.parse(JSON.stringify(prop)).Subtype).toHaveProperty("value");
    } finally {
      await cleanup();
    }
  });

  it("rejects duplicate resref", async () => {
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient(registerWriteTools);

    // Pre-populate index with existing resource
    mockIndex.resources.set("existing.uti", {
      resref: "existing",
      extension: "uti",
      filePath: "/fake",
      sizeBytes: 100,
    });

    try {
      const result = await client.callTool({
        name: "create_item_blueprint",
        arguments: { resref: "existing", tag: "X", name: "X", baseItem: "4" },
      });

      const text = result.content.find(c => c.type === "text")?.text ?? "";
      expect(text).toContain("already exists");
    } finally {
      await cleanup();
    }
  });
});

// ─── Tests: create_creature_blueprint ─────────────────────────────────────

describe("create_creature_blueprint", () => {
  it("creates a creature from scratch with classes and feats", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const classes = JSON.stringify([{ class: 4, level: 5 }]); // Fighter 5
      const feats = JSON.stringify([1, 2, 3]);

      const result = await client.callTool({
        name: "create_creature_blueprint",
        arguments: {
          resref: "test_fighter",
          tag: "TEST_FIGHTER",
          name: "Test Fighter",
          hp: "50",
          str: "18",
          classes,
          feats,
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe("test_fighter.utc");

      const doc = mockIndex.parsedGff.get("test_fighter.utc") as GffObj;
      expect((doc.Tag as { value: string }).value).toBe("TEST_FIGHTER");
      // optNumParam yields a string param; toI()/toF() parse it to a number before setField
      expect((doc.Str as { value: unknown }).value).toBe(18);
      expect((doc.MaxHitPoints as { value: unknown }).value).toBe(50);

      const classList = (doc.ClassList as { value: Array<GffObj> }).value;
      expect(classList).toHaveLength(1);
      expect((classList[0].Class as { value: number }).value).toBe(4);
      expect((classList[0].ClassLevel as { value: number }).value).toBe(5);

      const featList = (doc.FeatList as { value: Array<GffObj> }).value;
      expect(featList).toHaveLength(3);
    } finally {
      await cleanup();
    }
  });

  it("writes the standard AI script set, using ScriptOnNotice not the old typo", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      await client.callTool({
        name: "create_creature_blueprint",
        arguments: { resref: "plain_npc", tag: "PLAIN_NPC", name: "Plain NPC" },
      });

      const doc = mockIndex.parsedGff.get("plain_npc.utc") as GffObj;
      expect((doc.ScriptOnNotice as { value: string }).value).toBe("nw_c2_default2");
      expect((doc.ScriptHeartbeat as { value: string }).value).toBe("nw_c2_default1");
      // "ScriptPercption" was a misspelling in earlier versions — no real .utc uses it.
      expect(doc.ScriptPercption).toBeUndefined();
    } finally {
      await cleanup();
    }
  });

  it("wires the stock henchman AI when henchman:true", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const result = await client.callTool({
        name: "create_creature_blueprint",
        arguments: {
          resref: "comp_cleric",
          tag: "COMP_CLERIC",
          name: "Companion Cleric",
          henchman: true,
          soundset: "422",
          startingPackage: "2",
          varTable: JSON.stringify([{ name: "HENCH_LEVEL", type: "int", value: 5 }]),
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.henchman).toBe(true);

      const doc = mockIndex.parsedGff.get("comp_cleric.utc") as GffObj;
      // ScriptDialogue drives the command radial; ScriptHeartbeat drives following.
      expect((doc.ScriptDialogue as { value: string }).value).toBe("x0_ch_hen_conv");
      expect((doc.ScriptHeartbeat as { value: string }).value).toBe("x0_ch_hen_heart");
      expect((doc.ScriptOnNotice as { value: string }).value).toBe("x0_ch_hen_percep");
      expect((doc.SoundSetFile as { value: number }).value).toBe(422);
      expect((doc.StartingPackage as { value: number }).value).toBe(2);

      const varTable = (doc.VarTable as { value: Array<GffObj> }).value;
      expect(varTable).toHaveLength(1);
      expect((varTable[0].Name as { value: string }).value).toBe("HENCH_LEVEL");
      expect((varTable[0].Value as { value: number }).value).toBe(5);
    } finally {
      await cleanup();
    }
  });

  it("applies scripts overrides on top of the chosen set and warns on unknown fields", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const result = await client.callTool({
        name: "create_creature_blueprint",
        arguments: {
          resref: "custom_npc",
          tag: "CUSTOM_NPC",
          name: "Custom NPC",
          scripts: JSON.stringify({ ScriptSpawn: "my_spawn", NotAField: "nope" }),
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.scriptWarnings).toBeDefined();
      expect((parsed.scriptWarnings as string[])[0]).toContain("NotAField");

      const doc = mockIndex.parsedGff.get("custom_npc.utc") as GffObj;
      expect((doc.ScriptSpawn as { value: string }).value).toBe("my_spawn");
      // Untouched fields keep the default set.
      expect((doc.ScriptDeath as { value: string }).value).toBe("nw_c2_default7");
      expect(doc.NotAField).toBeUndefined();
    } finally {
      await cleanup();
    }
  });
});

// ─── Tests: create_encounter_blueprint ────────────────────────────────────

describe("create_encounter_blueprint", () => {
  it("creates an encounter with creature list", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const creatures = JSON.stringify([
        { resref: "nw_wolf" },
        { resref: "nw_bear", singleSpawn: true },
      ]);

      const result = await client.callTool({
        name: "create_encounter_blueprint",
        arguments: {
          resref: "enc_wolves",
          tag: "ENC_WOLVES",
          name: "Wolf Pack",
          creatures,
          difficulty: "2",
          maxCreatures: "5",
          respawns: true,
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe("enc_wolves.ute");
      expect(parsed.creatureCount).toBe(2);

      const doc = mockIndex.parsedGff.get("enc_wolves.ute") as GffObj;
      expect((doc.Tag as { value: string }).value).toBe("ENC_WOLVES");
      expect((doc.DifficultyIndex as { value: number }).value).toBe(2);
      expect((doc.MaxCreatures as { value: number }).value).toBe(5);
      expect((doc.Respawns as { value: number }).value).toBe(1);

      const creatureList = (doc.CreatureList as { value: Array<GffObj> }).value;
      expect(creatureList).toHaveLength(2);
      expect((creatureList[0].Resref as { value: string }).value).toBe("nw_wolf");
      expect((creatureList[0].SingleSpawn as { value: number }).value).toBe(0);
      expect((creatureList[1].Resref as { value: string }).value).toBe("nw_bear");
      expect((creatureList[1].SingleSpawn as { value: number }).value).toBe(1);

      // Check default geometry exists
      const geometry = (doc.Geometry as { value: Array<unknown> }).value;
      expect(geometry.length).toBe(4);
    } finally {
      await cleanup();
    }
  });

  it("creates a basic encounter with defaults", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const creatures = JSON.stringify([{ resref: "nw_goblin" }]);
      const result = await client.callTool({
        name: "create_encounter_blueprint",
        arguments: { resref: "enc_goblins", tag: "ENC_GOB", name: "Goblins", creatures },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);

      const doc = mockIndex.parsedGff.get("enc_goblins.ute") as GffObj;
      // Verify defaults
      expect((doc.Active as { value: number }).value).toBe(1);
      expect((doc.DifficultyIndex as { value: number }).value).toBe(1);
      expect((doc.MaxCreatures as { value: number }).value).toBe(3);
      expect((doc.Respawns as { value: number }).value).toBe(0);
    } finally {
      await cleanup();
    }
  });
});

// ─── Tests: create_store_blueprint ────────────────────────────────────────

describe("create_store_blueprint", () => {
  it("creates a store with pricing overrides", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    try {
      const result = await client.callTool({
        name: "create_store_blueprint",
        arguments: {
          resref: "str_general",
          tag: "STR_GENERAL",
          name: "General Store",
          markUp: "120",
          markDown: "80",
          storeGold: "-1",
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.created).toBe("str_general.utm");

      const doc = mockIndex.parsedGff.get("str_general.utm") as GffObj;
      expect((doc.Tag as { value: string }).value).toBe("STR_GENERAL");
      expect((doc.MarkUp as { value: number }).value).toBe(120);
      expect((doc.MarkDown as { value: number }).value).toBe(80);
      expect((doc.StoreGold as { value: number }).value).toBe(-1);

      // Should have 5 empty inventory categories
      const storeList = (doc.StoreList as { value: Array<GffObj> }).value;
      expect(storeList).toHaveLength(5);
    } finally {
      await cleanup();
    }
  });

  it("creates a store with inventory items", async () => {
    const { registerBlueprintTools } = await import("./blueprint-tools.js");
    const { client, cleanup } = await createTestClient(registerBlueprintTools);

    // Pre-populate mock index with item blueprints for resolveBlueprint
    const potionDoc: GffDocument = {
      __data_type: "UTI ",
      BaseItem: { type: "int", value: 19 },
      Tag: { type: "cexostring", value: "nw_it_mpotion001" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Potion of Healing" } },
      TemplateResRef: { type: "resref", value: "nw_it_mpotion001" },
      Cost: { type: "dword", value: 50 },
      PropertiesList: { type: "list", value: [] },
    } as unknown as GffDocument;

    mockIndex.parsedGff.set("nw_it_mpotion001.uti", potionDoc);

    try {
      const inventory = JSON.stringify([
        { resref: "nw_it_mpotion001", infinite: true, category: 2 },
      ]);

      const result = await client.callTool({
        name: "create_store_blueprint",
        arguments: {
          resref: "str_potions",
          tag: "STR_POTIONS",
          name: "Potion Shop",
          inventory,
        },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.itemCount).toBe(1);

      const doc = mockIndex.parsedGff.get("str_potions.utm") as GffObj;
      const storeList = (doc.StoreList as { value: Array<GffObj> }).value;
      // Item placed in category 2 (Potions/Scrolls)
      const cat2Items = (storeList[2].ItemList as { value: Array<GffObj> }).value;
      expect(cat2Items).toHaveLength(1);
      expect((cat2Items[0].Infinite as { value: number }).value).toBe(1);
    } finally {
      await cleanup();
    }
  });
});

// ─── Tests: modify_gff_field ──────────────────────────────────────────────

describe("modify_gff_field", () => {
  it("modifies a simple field on a resource", async () => {
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient(registerWriteTools);

    // Pre-populate with an item
    const itemDoc: GffDocument = {
      __data_type: "UTI ",
      Tag: { type: "cexostring", value: "old_tag" },
      Cost: { type: "dword", value: 100 },
    } as unknown as GffDocument;

    mockIndex.parsedGff.set("myitem.uti", itemDoc);
    mockIndex.resources.set("myitem.uti", {
      resref: "myitem",
      extension: "uti",
      filePath: path.join(tempDir, "myitem.uti"),
      sizeBytes: 50,
    });

    try {
      const result = await client.callTool({
        name: "modify_gff_field",
        arguments: { resource: "myitem", type: "uti", path: "Cost", value: 500 },
      });

      const parsed = parseResult(result) as Record<string, unknown>;
      expect(parsed.success).toBe(true);
      expect(parsed.previousValue).toBe(100);
      expect(parsed.newValue).toBe(500);
    } finally {
      await cleanup();
    }
  });
});
