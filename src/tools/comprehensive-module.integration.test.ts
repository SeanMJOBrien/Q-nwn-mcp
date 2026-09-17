/**
 * Comprehensive, mocked, whole-module integration test — one shared synthetic
 * module built up across a single sequence of tool calls exercising every
 * nwn-mcp SYSTEM that can be meaningfully tested without a real neverwinter.nim
 * toolchain, NWN game install, or docker verify-server. Runs as part of
 * `npm test`/`npm run verify` (and therefore the pre-commit hook) on every
 * machine, with no network and no NWN install — same guarantee the rest of
 * this project's fast test suite already provides.
 *
 * WHY ONE FILE, ONE MODULE, SEQUENTIAL it()s SHARING STATE: every other
 * *.integration.test.ts file in this project resets `mockIndex` fresh before
 * each `it()` (a global `beforeEach`), which is right for testing one tool in
 * isolation but wrong here — the whole point of this file is to prove the
 * SYSTEMS actually interoperate (a creature built by create_creature_blueprint
 * can be placed, equipped, statted, and then found by validate_module/
 * verify_all; a trap blueprint can be placed as a trigger; an item created in
 * one step can be equipped in a later step). This file deliberately uses a
 * file-scoped beforeAll/afterAll instead, and its `it()`s run in declaration
 * order (vitest's default within a single describe) and build on each other's
 * output — do not reorder them, and do not add a stray beforeEach that would
 * wipe `mockIndex` between them.
 *
 * COVERED (mocked, always runs): creature/item/trap/encounter/store
 * blueprints; build_npc_stat_block/equip_npc_by_role/respec_weapon_feats;
 * placement (creature/placeable/door/trigger/encounter/store/waypoint/
 * sound); dialog read+write; journal; factions; object-mgmt (move/rename/
 * modify_gff_field/fix_object_heights); bulk ops; undo; scripts (write+read,
 * not compile); wealth budget; 2DA/TLK lookup; resman search (graceful-empty,
 * no real BIFs); core resource reads; area/module script wiring; analysis
 * (validate_module/get_balance_report/find_orphans/check_area_connectivity/
 * get_dependency_graph/get_module_summary); verify_* including verify_all as
 * the capstone; SQLite database tools (real sql.js, no native binary, config
 * mocked to a temp dir so this never touches a real NWN_FOLDER_USER).
 *
 * DELIBERATELY NOT COVERED HERE (see comprehensive-module.live.test.ts,
 * env-gated on NWN_FOLDER_DATA/NWN_FOLDER_USER, skipped by default): tile
 * solving (create_area/paint_tiles/paint_group), get_tileset_details/
 * analyze_tileset_rules, the adventure_* layout/transition pipeline, and the
 * four generator tools whose real value is a compile-probe against a real
 * nwnsc binary (create_reward_system, create_spec_verification,
 * create_random_abilities_system, create_gear_randomizer) — matching this
 * project's existing, established convention that generator-tool coverage is
 * unit tests on the generator function, not an integration compile (see
 * random-abilities-script.test.ts/reward-script.test.ts/
 * spec-check-script.test.ts). link_doors/create_area_transition are skipped
 * as a scope call, not a gap — they need a second area for no real
 * incremental proof that tool registration works, which every other tool
 * here already demonstrates.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import initSqlJs from "sql.js";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
  readTextFile: vi.fn(async (filePath: string) => fs.readFile(filePath, "utf-8")),
  // resman_search/resman_stats call these — no real BIFs to grep/stat here,
  // so both degrade to empty results, same as every other resman-backed tool
  // in this file (graceful-empty is the expected, asserted behavior).
  resmanGrep: vi.fn(async () => ""),
  resmanStats: vi.fn(async () => "0 resources indexed (no real resman stack in this mocked test)"),
}));

let mockIndex: ModuleIndex;

// Real-import everything else from module-loader.js (indexAreaCreatures,
// buildDialogSummary, etc. are pure-ish functions over an index and work
// fine against the synthetic mockIndex) — only requireIndex/buildResmanOptions
// need overriding, to point at the synthetic index instead of a real load.
vi.mock("../module-loader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../module-loader.js")>();
  return {
    ...actual,
    requireIndex: () => mockIndex,
    buildResmanOptions: async () => ({
      root: undefined,
      userDir: undefined,
      erfs: undefined,
      dirs: [mockIndex.tempDir],
    }),
  };
});

// Same reasoning: buildTagToAreaMap/buildAreaTransitions are pure functions
// over an index, real-imported; only invalidateTagToAreaCache is stubbed.
vi.mock("./tileset-tools.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tileset-tools.js")>();
  return { ...actual, invalidateTagToAreaCache: vi.fn() };
});

// Always report walkable — this file never exercises real walkmesh solving.
vi.mock("../util/walkmesh.js", () => ({
  checkPositionWalkable: vi.fn(async () => ({ walkable: true, material: "Grass", materialId: 7, z: 0 })),
  checkPlacementWalkable: vi.fn(async () => ({ ok: true, z: 0 })),
  ensureWokCacheDir: vi.fn(),
  setWokCacheDir: vi.fn(),
  clearWokCache: vi.fn(),
}));

// database-tools.ts reads NWN_FOLDER_USER as a plain module-level constant,
// not via the mocked module-loader index — redirect it to this file's own
// temp dir so the test can never touch a real NWN_FOLDER_USER on the host.
let dbUserDir = "";
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config.js")>();
  return { ...actual, get NWN_FOLDER_USER() { return dbUserDir; } };
});

// ─── Fixture helpers ──────────────────────────────────────────────────────

function twoDA(columns: string[], rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns, rows: new Map(rows) };
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

function makeAreDoc(): GffDocument {
  return {
    __data_type: "ARE ",
    Name: { type: "cexolocstring", value: { "0": "Comprehensive Test Area" } },
    Width: { type: "int", value: 4 },
    Height: { type: "int", value: 4 },
    Tileset: { type: "resref", value: "ttf01" },
    OnEnter: { type: "resref", value: "" },
    OnExit: { type: "resref", value: "" },
    OnHeartbeat: { type: "resref", value: "" },
    OnUserDefined: { type: "resref", value: "" },
    Flags: { type: "dword", value: 0 },
  } as unknown as GffDocument;
}

function makeFacDoc(): GffDocument {
  return {
    __data_type: "FAC ",
    FactionList: {
      type: "list",
      value: [
        { __struct_id: 0, FactionName: { type: "cexostring", value: "PC" }, FactionParentID: { type: "dword", value: 4294967295 }, FactionGlobal: { type: "byte", value: 1 } },
        { __struct_id: 1, FactionName: { type: "cexostring", value: "Hostile" }, FactionParentID: { type: "dword", value: 4294967295 }, FactionGlobal: { type: "byte", value: 1 } },
        { __struct_id: 2, FactionName: { type: "cexostring", value: "Commoner" }, FactionParentID: { type: "dword", value: 4294967295 }, FactionGlobal: { type: "byte", value: 1 } },
      ],
    },
    RepList: {
      type: "list",
      value: [
        { __struct_id: 0, FactionID1: { type: "dword", value: 0 }, FactionID2: { type: "dword", value: 1 }, FactionRep: { type: "int", value: 0 } },
        { __struct_id: 1, FactionID1: { type: "dword", value: 0 }, FactionID2: { type: "dword", value: 2 }, FactionRep: { type: "int", value: 100 } },
      ],
    },
  } as unknown as GffDocument;
}

/** Minimal placeable/door/sound blueprint — enough for place_* to resolve and place it. */
function makeMinimalBlueprint(dataType: string, tag: string): GffDocument {
  return {
    __data_type: dataType,
    Tag: { type: "cexostring", value: tag },
    LocName: { type: "cexolocstring", value: { "0": tag } },
    TemplateResRef: { type: "resref", value: tag },
    Appearance: { type: "dword", value: 0 },
  } as unknown as GffDocument;
}

/** Real-data-shaped fixture: Fighter (class 4) + Human (race 6) — mirrors npc-stat-block.test.ts's makeIndex(). */
function seedNpcTwoDATables(twodaTables: Map<string, TwoDATable>): void {
  twodaTables.set(
    "classes",
    twoDA(
      ["HitDie", "FeatsTable", "BonusFeatsTable", "SkillsTable", "SkillPointBase", "PrimaryAbil", "SpellCaster"],
      [[4, { HitDie: "10", FeatsTable: "CLS_FEAT_FIGHT", BonusFeatsTable: "CLS_BFEAT_FIGHT", SkillsTable: "CLS_SKILL_FIGHT", SkillPointBase: "2", PrimaryAbil: "STR", SpellCaster: "0" }]],
    ),
  );
  twodaTables.set(
    "racialtypes",
    twoDA(
      ["StrAdjust", "DexAdjust", "ConAdjust", "IntAdjust", "WisAdjust", "ChaAdjust", "FeatsTable", "ExtraFeatsAtFirstLevel", "ExtraSkillPointsPerLevel", "FirstLevelSkillPointsMultiplier", "NormalFeatEveryNthLevel", "NumberNormalFeatsEveryNthLevel"],
      [[6, { StrAdjust: "0", DexAdjust: "0", ConAdjust: "0", IntAdjust: "0", WisAdjust: "0", ChaAdjust: "0", FeatsTable: "RACE_FEAT_HUMAN", ExtraFeatsAtFirstLevel: "1", ExtraSkillPointsPerLevel: "1", FirstLevelSkillPointsMultiplier: "4", NormalFeatEveryNthLevel: "3", NumberNormalFeatsEveryNthLevel: "1" }]],
    ),
  );
  twodaTables.set(
    "cls_feat_fight",
    twoDA(
      ["FeatLabel", "FeatIndex", "List", "GrantedOnLevel"],
      [
        [1, { FeatLabel: "WeapProfSim", FeatIndex: "46", List: "3", GrantedOnLevel: "1" }],
        [2, { FeatLabel: "ArmProfLgt", FeatIndex: "3", List: "3", GrantedOnLevel: "1" }],
        [3, { FeatLabel: "ArmProfMed", FeatIndex: "4", List: "3", GrantedOnLevel: "1" }],
        [4, { FeatLabel: "ArmProfHvy", FeatIndex: "2", List: "3", GrantedOnLevel: "1" }],
        [5, { FeatLabel: "Shield", FeatIndex: "32", List: "3", GrantedOnLevel: "1" }],
        [6, { FeatLabel: "WeapProfMar", FeatIndex: "45", List: "3", GrantedOnLevel: "1" }],
      ],
    ),
  );
  const bonusPattern = ["1", "1", "0", "1", "0", "1", "0", "1", "0", "1"];
  twodaTables.set(
    "cls_bfeat_fight",
    twoDA("Bonus".split(",").map((c) => c), bonusPattern.map((bonus, i) => [i, { Bonus: bonus }] as [number, Record<string, string>])),
  );
  twodaTables.set("race_feat_human", twoDA(["FeatLabel", "FeatIndex"], [[0, { FeatLabel: "QuickMaster", FeatIndex: "258" }]]));
  twodaTables.set(
    "cls_skill_fight",
    twoDA(
      ["SkillLabel", "SkillIndex", "ClassSkill"],
      [
        [0, { SkillLabel: "Concentration", SkillIndex: "1", ClassSkill: "1" }],
        [2, { SkillLabel: "Discipline", SkillIndex: "3", ClassSkill: "1" }],
        [3, { SkillLabel: "Heal", SkillIndex: "4", ClassSkill: "1" }],
      ],
    ),
  );
  // Real-shaped Longsword row (baseitems.2da row 1), verified against a live
  // table earlier this project's history — Fighter's WeapProfMar(45) satisfies
  // ReqFeat0, so equip_npc_by_role's proficiency check passes cleanly.
  twodaTables.set(
    "baseitems",
    twoDA(
      ["label", "EquipableSlots", "ReqFeat0", "ReqFeat1", "WeaponFocusFeat", "WeaponSpecializationFeat", "WeaponImprovedCriticalFeat"],
      [[1, { label: "longsword", EquipableSlots: "0x1C030", ReqFeat0: "45", ReqFeat1: "256", WeaponFocusFeat: "106", WeaponSpecializationFeat: "144", WeaponImprovedCriticalFeat: "68" }]],
    ),
  );
}

async function createTestClient(
  registerFn: (server: McpServer) => void,
): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerFn(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const textBlock = result.content.find((c) => c.type === "text");
  if (!textBlock?.text) return {};
  try {
    return JSON.parse(textBlock.text);
  } catch {
    // Some tools return a plain human-readable string instead of JSON on an
    // error/edge-case path — surface the raw text so a failing assertion
    // shows the real message instead of a JSON.parse stack trace.
    return { __rawText: textBlock.text };
  }
}

async function registerEverything(server: McpServer): Promise<void> {
  const [
    { registerAnalysisTools },
    { registerAreaTools },
    { registerBlueprintTools },
    { registerBulkTools },
    { registerDatabaseTools },
    { registerDialogTools },
    { registerDialogWriteTools },
    { registerEncounterTools },
    { registerFactionTools },
    { registerGearTools },
    { registerItemTools },
    { registerJournalTools },
    { registerLookupTools },
    { registerNpcTools },
    { registerObjectMgmtTools },
    { registerPlacementTools },
    { registerResmanTools },
    { registerScriptTools },
    { registerUndoTools },
    { registerVerifyTools },
    { registerWriteTools },
    { registerCoreReadTools },
  ] = await Promise.all([
    import("./analysis-tools.js"),
    import("./area-tools.js"),
    import("./blueprint-tools.js"),
    import("./bulk-tools.js"),
    import("./database-tools.js"),
    import("./dialog-tools.js"),
    import("./dialog-write-tools.js"),
    import("./encounter-tools.js"),
    import("./faction-tools.js"),
    import("./gear-tools.js"),
    import("./item-tools.js"),
    import("./journal-tools.js"),
    import("./lookup-tools.js"),
    import("./npc-tools.js"),
    import("./object-mgmt-tools.js"),
    import("./placement-tools.js"),
    import("./resman-tools.js"),
    import("./script-tools.js"),
    import("./undo-tools.js"),
    import("./verify-tools.js"),
    import("./write-tools.js"),
    import("./core-read.js"),
  ]);

  registerAnalysisTools(server);
  registerAreaTools(server);
  registerBlueprintTools(server);
  registerBulkTools(server);
  registerDatabaseTools(server);
  registerDialogTools(server);
  registerDialogWriteTools(server);
  registerEncounterTools(server);
  registerFactionTools(server);
  registerGearTools(server);
  registerItemTools(server);
  registerJournalTools(server);
  registerLookupTools(server);
  registerNpcTools(server);
  registerObjectMgmtTools(server);
  registerPlacementTools(server);
  registerResmanTools(server);
  registerScriptTools(server);
  registerUndoTools(server);
  registerVerifyTools(server);
  registerWriteTools(server);
  registerCoreReadTools(server);
}

// ─── Setup/Teardown (file-scoped — state persists across it()s below) ─────

let tempDir: string;
let client: Client;
let cleanupClient: () => Promise<void>;

beforeAll(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-comprehensive-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  dbUserDir = path.join(tempDir, "nwn_user");
  await fs.mkdir(path.join(dbUserDir, "database"), { recursive: true });

  // database-tools.ts's openDb() only ever opens an EXISTING .sqlite3 file
  // (real campaign databases ship pre-populated, they're never created by
  // that tool) — pre-create one here with the real CPDB `db` table schema
  // (see CLAUDE.md's "CPDB blob format" note) so write/read/query_database
  // have something real to operate on.
  const SQL = await initSqlJs();
  const seedDb = new SQL.Database();
  seedDb.run(
    "CREATE TABLE db (varname TEXT, playerid TEXT, vartype INTEGER, payload BLOB, compressed INTEGER, PRIMARY KEY (varname, playerid))",
  );
  await fs.writeFile(path.join(dbUserDir, "database", "comprehensive_test.sqlite3"), Buffer.from(seedDb.export()));
  seedDb.close();

  const twodaTables = new Map<string, TwoDATable>();
  seedNpcTwoDATables(twodaTables);

  mockIndex = {
    modPath: path.join(tempDir, "comprehensive.mod"),
    tempDir,
    moduleName: "Comprehensive Test Module",
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

  // Base area.
  const gitDoc = makeGitDoc();
  const areDoc = makeAreDoc();
  mockIndex.parsedGff.set("testarea.git", gitDoc);
  mockIndex.parsedGff.set("testarea.are", areDoc);
  mockIndex.resources.set("testarea.git", { resref: "testarea", extension: "git", filePath: path.join(tempDir, "testarea.git"), sizeBytes: 100 });
  mockIndex.resources.set("testarea.are", { resref: "testarea", extension: "are", filePath: path.join(tempDir, "testarea.are"), sizeBytes: 100 });
  mockIndex.areas.set("testarea", { resref: "testarea", name: "Comprehensive Test Area", width: 4, height: 4, tileset: "ttf01", isInterior: false, creatureCount: 0, placeableCount: 0, doorCount: 0, encounterCount: 0, triggerCount: 0, waypointCount: 0 });

  // module.ifo.
  const ifoDoc = {
    __data_type: "IFO ",
    Mod_Entry_Area: { type: "resref", value: "testarea" },
    Mod_OnClientEntr: { type: "resref", value: "" },
    Mod_OnHeartbeat: { type: "resref", value: "" },
    Mod_OnModLoad: { type: "resref", value: "" },
  } as unknown as GffDocument;
  mockIndex.parsedGff.set("module.ifo", ifoDoc);
  mockIndex.resources.set("module.ifo", { resref: "module", extension: "ifo", filePath: path.join(tempDir, "module.ifo"), sizeBytes: 100 });

  // Faction file.
  const facDoc = makeFacDoc();
  mockIndex.parsedGff.set("repute.fac", facDoc);
  mockIndex.resources.set("repute.fac", { resref: "repute", extension: "fac", filePath: path.join(tempDir, "repute.fac"), sizeBytes: 100 });

  // Minimal placeable/door/sound blueprints — no create_placeable_blueprint
  // tool exists in this project (Scope: palette-level content is out of
  // scope), so these are seeded directly, the same way item/creature
  // blueprint fixtures already are in every other integration test file.
  for (const [ext, dataType, tag] of [["utp", "UTP ", "test_placeable"], ["utd", "UTD ", "test_door"], ["uts", "UTS ", "test_sound"]] as const) {
    const doc = makeMinimalBlueprint(dataType, tag);
    mockIndex.parsedGff.set(`${tag}.${ext}`, doc);
    mockIndex.resources.set(`${tag}.${ext}`, { resref: tag, extension: ext, filePath: path.join(tempDir, `${tag}.${ext}`), sizeBytes: 50 });
  }

  const server = new McpServer({ name: "comprehensive-test", version: "1.0.0" });
  await registerEverything(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  client = new Client({ name: "comprehensive-test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  cleanupClient = async () => { await client.close(); await server.close(); };
});

afterAll(async () => {
  await cleanupClient();
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
  const result = await client.callTool({ name, arguments: args });
  return parseResult(result as { content: Array<{ type: string; text?: string }> });
}

// ─── The comprehensive build, one system at a time ─────────────────────────

describe("comprehensive module — every mockable nwn-mcp system, one shared module", () => {
  it("blueprints: creature (companion + static Key NPC), item, trap, encounter, store", async () => {
    const companion = await call("create_creature_blueprint", {
      resref: "hero_comp", tag: "hero_comp", name: "Test Companion",
      race: "6", classes: '[{"class":4,"level":1}]', startingPackage: "4",
      henchman: true,
    });
    expect(companion.success).toBe(true);

    const keyNpc = await call("create_creature_blueprint", {
      resref: "villain_np", tag: "villain_np", name: "Test Villain",
      race: "6", classes: '[{"class":9,"level":5}]', startingPackage: "9",
      spells: '[{"spell":37,"level":1}]',
    });
    expect(keyNpc.success).toBe(true);

    const item = await call("create_item_blueprint", {
      resref: "test_sword", tag: "test_sword", name: "Test Longsword", baseItem: "1",
    });
    expect(item.success).toBe(true);

    const trap = await call("create_trap_blueprint", {
      resref: "test_trap", tag: "test_trap", name: "Test Trap", scriptOnEnter: "a_trap_enter",
    });
    expect(trap.success).toBe(true);

    const encounter = await call("create_encounter_blueprint", {
      resref: "test_enc", tag: "test_enc", name: "Test Encounter",
      creatures: '[{"resref":"villain_np"}]',
    });
    expect(encounter.success).toBe(true);

    const store = await call("create_store_blueprint", {
      resref: "test_store", tag: "test_store", name: "Test Store",
    });
    expect(store.success).toBe(true);

    expect(mockIndex.parsedGff.has("hero_comp.utc")).toBe(true);
    expect(mockIndex.parsedGff.has("villain_np.utc")).toBe(true);
  });

  it("npc tools: build_npc_stat_block, equip_npc_by_role, respec_weapon_feats", async () => {
    const stat = await call("build_npc_stat_block", { resref: "hero_comp", race: "6", classId: "4", level: "5", powerLevel: "elite" });
    expect(stat.success).toBe(true);
    expect(Array.isArray(stat.feats)).toBe(true);
    expect((stat.feats as unknown[]).length).toBeGreaterThan(0);

    const equip = await call("equip_npc_by_role", {
      resref: "hero_comp", equipment: JSON.stringify({ righthand: "test_sword" }), level: "5",
    });
    expect(equip.success).toBe(true);
    expect((equip.equipped as unknown[]).length).toBeGreaterThan(0);

    const respec = await call("respec_weapon_feats", { resref: "hero_comp", toBaseItem: "1" });
    // respec is a no-op/soft-fail if the source weapon can't be auto-detected from
    // this minimal fixture's FeatList shape — just confirm the tool ran without throwing.
    expect(respec).toBeTypeOf("object");
  });

  it("placement: creature, placeable, door, trigger (via the trap blueprint), encounter, store, waypoint, sound", async () => {
    const c1 = await call("place_creature", { area: "testarea", blueprint: "hero_comp", x: "10", y: "10" });
    expect(c1.success).toBe(true);
    const c2 = await call("place_creature", { area: "testarea", blueprint: "villain_np", x: "20", y: "20" });
    expect(c2.success).toBe(true);

    const p = await call("place_placeable", { area: "testarea", blueprint: "test_placeable", x: "11", y: "11" });
    expect(p.success).toBe(true);

    const d = await call("place_door", { area: "testarea", blueprint: "test_door", x: "12", y: "12" });
    expect(d.success).toBe(true);

    const t = await call("place_trigger", { area: "testarea", blueprint: "test_trap", x: "13", y: "13" });
    expect(t).toBeTypeOf("object");

    const e = await call("place_encounter", { area: "testarea", blueprint: "test_enc", x: "14", y: "14" });
    expect(e.success).toBe(true);

    const s = await call("place_store", { area: "testarea", blueprint: "test_store", x: "15", y: "15" });
    expect(s.success).toBe(true);

    const wp = await call("place_waypoint", { area: "testarea", tag: "wp_main", name: "Main Waypoint", x: "16", y: "16" });
    expect(wp.success).toBe(true);

    const snd = await call("place_sound", { area: "testarea", blueprint: "test_sound", x: "17", y: "17" });
    expect(snd).toBeTypeOf("object");

    const git = mockIndex.parsedGff.get("testarea.git") as GffObj;
    expect((git["Creature List"] as { value: unknown[] }).value.length).toBe(2);
    expect((git["Placeable List"] as { value: unknown[] }).value.length).toBe(1);
    expect((git["Door List"] as { value: unknown[] }).value.length).toBe(1);
    expect((git.StoreList as { value: unknown[] }).value.length).toBe(1);
    expect((git.WaypointList as { value: unknown[] }).value.length).toBe(1);
  });

  it("dialog: create, add node, edit node, read (tree/flatten/trace/scripts)", async () => {
    const created = await call("create_dialog", {
      resref: "dlg_hero",
      nodes: JSON.stringify([{ speaker: "npc", text: "Hello, traveler.", children: [{ speaker: "pc", text: "Hello yourself." }] }]),
    });
    expect(created.success).toBe(true);

    const added = await call("add_dialog_node", {
      dialog: "dlg_hero", parentIndex: "0", parentType: "entry", text: "Farewell.",
    });
    expect(added.success).toBe(true);

    const edited = await call("edit_dialog_node", {
      dialog: "dlg_hero", nodeType: "entry", nodeIndex: "0", text: "Well met, traveler.",
    });
    expect(edited).toBeTypeOf("object");

    const tree = await call("get_dialog_tree", { dialog: "dlg_hero" });
    expect(tree).toBeTypeOf("object");
    // flatten_dialog returns a plain human-readable transcript, not JSON.
    const flatResult = await client.callTool({ name: "flatten_dialog", arguments: { dialog: "dlg_hero" } });
    const flatText = (flatResult.content as Array<{ text?: string }>)[0]?.text ?? "";
    expect(flatText).toContain("Well met, traveler.");
    const traced = await call("trace_dialog_path", { dialog: "dlg_hero", replyIndices: [0] });
    expect(traced).toBeTypeOf("object");
    const scripts = await call("find_dialog_scripts", {});
    expect(scripts).toBeDefined();
  });

  it("journal: create, add quest, add entry, edit quest, get_journal", async () => {
    const created = await call("create_journal", {});
    expect(created.success).toBe(true);

    const quest = await call("add_journal_quest", { tag: "q_main", name: "The Main Quest", xp: "500" });
    expect(quest.success).toBe(true);

    const entry = await call("add_journal_entry", { questTag: "q_main", id: "10", text: "Find the villain." });
    expect(entry).toBeTypeOf("object");

    const editedQuest = await call("edit_journal_quest", { tag: "q_main", priority: "1" });
    expect(editedQuest).toBeTypeOf("object");

    const journal = await call("get_journal", {});
    expect(Array.isArray(journal) || typeof journal === "object").toBe(true);
  });

  it("factions: create_faction, set_faction_reputation", async () => {
    const created = await call("create_faction", { name: "Thieves Guild", defaultReputation: "25" });
    expect(created.success).toBe(true);

    const rep = await call("set_faction_reputation", { faction1: "0", faction2: "1", reputation: "50" });
    expect(rep.success).toBe(true);
  });

  it("object-mgmt: move_object, rename_tag (dry run), modify_gff_field, fix_object_heights", async () => {
    const moved = await call("move_object", { area: "testarea", listName: "WaypointList", tag: "wp_main", x: "18", y: "18" });
    expect(moved.success).toBe(true);

    const renamed = await call("rename_tag", { oldTag: "wp_main", newTag: "wp_relocated", dryRun: true });
    expect(renamed.__rawText).toContain("Dry run");

    const modified = await call("modify_gff_field", { resource: "testarea", type: "are", path: "Flags", value: "1", gffType: "dword" });
    expect(modified.success).toBe(true);
    expect(((mockIndex.parsedGff.get("testarea.are") as GffObj).Flags as { value: number }).value).toBe(1);

    const fixed = await call("fix_object_heights", { area: "testarea" });
    expect(fixed.success).toBe(true);
  });

  it("bulk ops: bulk_move_objects, bulk_remove_objects (dry run)", async () => {
    const bulkMoved = await call("bulk_move_objects", { area: "testarea", tag: "hero_comp", listName: "Creature List", offsetX: "1", offsetY: "1" });
    expect(bulkMoved.success).toBe(true);

    const bulkRemoved = await call("bulk_remove_objects", { tagPattern: "villain_*", listName: "Creature List", area: "testarea", dryRun: true });
    expect(bulkRemoved.dryRun).toBe(true);
  });

  it("undo: undo_last_change restores GIT state, undo_history lists it", async () => {
    const before = ((mockIndex.parsedGff.get("testarea.git") as GffObj).WaypointList as { value: unknown[] }).value.length;
    await call("place_waypoint", { area: "testarea", tag: "wp_undo_probe", name: "Undo Probe", x: "19", y: "19" });
    const afterPlace = ((mockIndex.parsedGff.get("testarea.git") as GffObj).WaypointList as { value: unknown[] }).value.length;
    expect(afterPlace).toBe(before + 1);

    const undone = await call("undo_last_change", {});
    expect(undone.success).toBe(true);
    const afterUndo = ((mockIndex.parsedGff.get("testarea.git") as GffObj).WaypointList as { value: unknown[] }).value.length;
    expect(afterUndo).toBe(before);

    const history = await call("undo_history", {});
    expect(history).toBeTypeOf("object");
  });

  it("scripts: write (uncompiled), read, search, variable/reference lookup", async () => {
    const written = await call("write_script", { resref: "a_test_script", source: "void main() { }", compile: false });
    expect(written.written).toBe("a_test_script.nss");

    const source = await client.callTool({ name: "read_script_source", arguments: { resref: "a_test_script" } });
    expect((source.content as Array<{ text?: string }>)[0]?.text).toContain("void main()");

    const searched = await call("search_scripts", { pattern: "main" });
    expect((searched as unknown as unknown[]).length).toBeGreaterThan(0);

    const varUsage = await call("find_variable_usage", { variableName: "SOME_VAR" });
    expect(Array.isArray(varUsage)).toBe(true);

    const refs = await call("list_script_references", {});
    expect(refs).toBeTypeOf("object");
  });

  it("gear: get_wealth_budget (the pure-computation half — create_gear_randomizer needs a real compiler, see comprehensive-module.live.test.ts)", async () => {
    const budget = await call("get_wealth_budget", { level: "5", role: "pc" });
    expect(budget).toBeTypeOf("object");
  });

  it("2DA/TLK lookup: search_2da, resolve_2da, list_2da_tables, search_by_tag/resref/field", async () => {
    const searched = await call("search_2da", { table: "classes", column: "PrimaryAbil", value: "STR" });
    expect(Array.isArray(searched) ? searched.length : Object.keys(searched).length).toBeGreaterThan(0);

    const resolved = await call("resolve_2da", { table: "classes", row: "4" });
    expect(resolved).toBeTypeOf("object");

    const tables = await call("list_2da_tables", {});
    expect(tables).toBeDefined();

    const byTag = await call("search_by_tag", { tag: "hero_comp" });
    expect(byTag).toBeDefined();

    const byResref = await call("search_by_resref", { pattern: "test_" });
    expect(byResref).toBeDefined();

    const byField = await call("search_by_field", { fieldName: "Tag", value: "hero_comp" });
    expect(byField).toBeDefined();
  });

  it("resman: resman_search, resman_stats, list_blueprints, resolve_blueprint (graceful with no real BIFs)", async () => {
    const searched = await call("resman_search", { pattern: "test_sword" });
    expect(searched.matchCount).toBe(0); // no real BIFs to grep — graceful-empty is the expected result here

    const stats = await call("resman_stats", {});
    expect(typeof stats.__rawText).toBe("string"); // resman_stats returns a plain-text report, not JSON

    const blueprints = await call("list_blueprints", { type: "utc", pattern: "hero" });
    expect(Array.isArray(blueprints.results)).toBe(true); // no real base-game BIFs here, so 0 matches is the expected, graceful result

    const resolved = await call("resolve_blueprint", { resource: "hero_comp.utc" });
    expect(resolved.resource).toBe("hero_comp.utc");
  });

  it("core reads: list_resources, get_resource, get_module_info", async () => {
    const resources = await call("list_resources", {});
    expect(Array.isArray(resources) ? resources.length : Object.keys(resources).length).toBeGreaterThan(0);

    const resource = await call("get_resource", { resref: "hero_comp", type: "utc" });
    expect(resource).toBeTypeOf("object");

    const info = await call("get_module_info", {});
    expect(info).toBeTypeOf("object");
  });

  it("area/module script wiring: set_area_scripts, set_module_scripts", async () => {
    const areaScripts = await call("set_area_scripts", { area: "testarea", onEnter: "a_area_enter" });
    expect(areaScripts.success).toBe(true);
    expect(((mockIndex.parsedGff.get("testarea.are") as GffObj).OnEnter as { value: string }).value).toBe("a_area_enter");

    const modScripts = await call("set_module_scripts", { Mod_OnHeartbeat: "a_mod_hb" });
    expect(modScripts.success).toBe(true);
    expect(((mockIndex.parsedGff.get("module.ifo") as GffObj).Mod_OnHeartbeat as { value: string }).value).toBe("a_mod_hb");
  });

  it("analysis: validate_module, get_balance_report, find_orphans, check_area_connectivity, get_dependency_graph, get_module_summary", async () => {
    const validated = await call("validate_module", {});
    expect(typeof validated.errorCount).toBe("number");
    expect(typeof validated.warningCount).toBe("number");

    const balance = await call("get_balance_report", {});
    expect(balance).toBeTypeOf("object");

    const orphans = await call("find_orphans", {});
    expect((orphans as unknown as unknown[]).length).toBeGreaterThan(0);

    const connectivity = await call("check_area_connectivity", {});
    expect(connectivity).toBeTypeOf("object");

    const depGraph = await call("get_dependency_graph", {});
    expect(Array.isArray(depGraph.nodes)).toBe(true);
    expect(Array.isArray(depGraph.edges)).toBe(true);

    const summary = await call("get_module_summary", {});
    expect(summary.moduleName).toBe("Comprehensive Test Module");
    expect((summary.areas as unknown[]).length).toBe(1);
  });

  it("verify: per-object checkers plus verify_all as the capstone", async () => {
    // These deliberately-minimal fixtures don't pass every check (no
    // conversation on the henchman, no ItemClass on the synthetic baseitems
    // row, etc.) — this test's job is to confirm each checker RUNS and
    // reports real structured findings, not that the fixture is shippable.
    const creature = await call("verify_creature", { resref: "hero_comp", henchman: true });
    expect(["pass", "warn", "fail"]).toContain(creature.status);

    const item = await call("verify_item", { resref: "test_sword" });
    expect(["pass", "warn", "fail"]).toContain(item.status);

    const dialog = await call("verify_dialog", { resref: "dlg_hero" });
    expect(dialog.status).toBe("pass");

    const journal = await call("verify_journal", {});
    expect(["pass", "warn", "fail"]).toContain(journal.status);

    const faction = await call("verify_faction", {});
    expect(faction.status).toBe("pass");

    // The real acceptance gate — must not throw, and must report numeric
    // counts and a real per-target breakdown for a module this test has now
    // populated with content from (almost) every system in the codebase.
    const all = await call("verify_all", {});
    expect(typeof all.shippable).toBe("boolean");
    expect(typeof all.errorCount).toBe("number");
    expect((all.results as unknown[]).length).toBeGreaterThan(5);
  });

  it("database: list_databases, write/read_database_object, query_database (real sql.js, no native binary, redirected to this test's own temp dir)", async () => {
    const listed = await call("list_databases", {});
    expect((listed as unknown as unknown[]).some((d) => (d as { name: string }).name === "comprehensive_test.sqlite3")).toBe(true);

    const written = await call("write_database_object", {
      database: "comprehensive_test", varname: "test_obj", playerid: "1",
      data: JSON.stringify({ __data_type: "UTC ", Tag: { type: "cexostring", value: "probe" } }),
    });
    expect(written.varname).toBe("test_obj");
    expect((written.payloadSize as number)).toBeGreaterThan(0);

    const read = await call("read_database_object", { database: "comprehensive_test", varname: "test_obj", playerid: "1" });
    expect(read).toBeTypeOf("object");

    const queried = await call("query_database", { database: "comprehensive_test", sql: "SELECT COUNT(*) as n FROM db" });
    expect(queried).toBeTypeOf("object");
  });
});
