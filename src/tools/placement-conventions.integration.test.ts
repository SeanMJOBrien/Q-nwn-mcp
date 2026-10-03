/**
 * Integration tests for the verified spatial conventions in the placement/movement tools:
 *   - Z comes from the walkmesh ground height (never the requested z) and responses report the PLACED Z
 *   - faceTowardX/faceTowardY for creatures, waypoints (orientation vector) and placeables (GFF Bearing)
 *   - zOffset / collisionRadius / walkBuffer on place_placeable
 *   - move_object / bulk_move_objects keep an object's height above the ground (followGround)
 *   - fix_object_heights dryRun / tolerance / onlyBuried
 *   - probe_ground
 *
 * The walkmesh is mocked with a controllable ground function so the tests pin the TOOL behaviour; the walkmesh
 * maths itself is covered by walkmesh.test.ts and (against real areas) tile-oracle.live.test.ts.
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

const ground = vi.hoisted(() => ({
  z: (_x: number, _y: number): number => 0,
  walkable: (_x: number, _y: number): boolean => true,
  heightStep: undefined as number | undefined,   // metres per Tile_Height level reported by the area-level probe
}));

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
  compileScript: vi.fn(async () => ({ success: true, output: "" })),
}));

let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

vi.mock("./tileset-tools.js", () => ({
  invalidateTagToAreaCache: vi.fn(),
  buildTagToAreaMap: vi.fn(() => new Map()),
  buildAreaTransitions: vi.fn(() => []),
}));

vi.mock("../util/walkmesh.js", () => ({
  checkPositionWalkable: vi.fn(async (x: number, y: number) => ({
    walkable: ground.walkable(x, y),
    material: "Grass",
    materialId: 3,
    z: ground.z(x, y),
    heightStep: ground.heightStep,
  })),
  // NB: checkPlacementWalkable returns { ok, reason?, z? } — NOT { walkable }.
  checkPlacementWalkable: vi.fn(async (x: number, y: number) =>
    ground.walkable(x, y) ? { ok: true, z: ground.z(x, y) } : { ok: false, reason: "mock: not walkable" }),
  ensureWokCacheDir: vi.fn(),
  setWokCacheDir: vi.fn(),
  clearWokCache: vi.fn(),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────

let tempDir: string;

function createMockIndex(): ModuleIndex {
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
  };
}

type GitLists = Partial<Record<"Creature List" | "Placeable List" | "Door List" | "WaypointList", GffObj[]>>;

function makeGit(lists: GitLists = {}): GffDocument {
  return {
    __data_type: "GIT ",
    "Creature List": { type: "list", value: lists["Creature List"] ?? [] },
    "Placeable List": { type: "list", value: lists["Placeable List"] ?? [] },
    "Door List": { type: "list", value: lists["Door List"] ?? [] },
    "Encounter List": { type: "list", value: [] },
    TriggerList: { type: "list", value: [] },
    WaypointList: { type: "list", value: lists.WaypointList ?? [] },
    SoundList: { type: "list", value: [] },
    StoreList: { type: "list", value: [] },
  } as unknown as GffDocument;
}

async function setupArea(lists: GitLists = {}, name = "testarea"): Promise<GffObj> {
  const git = makeGit(lists);
  const gitPath = path.join(tempDir, `${name}.git`);
  await fs.writeFile(gitPath, JSON.stringify(git));
  mockIndex.parsedGff.set(`${name}.git`, git);
  mockIndex.resources.set(`${name}.git`, { resref: name, extension: "git", filePath: gitPath, sizeBytes: 100 });
  mockIndex.parsedGff.set(`${name}.are`, {
    __data_type: "ARE ",
    Width: { type: "int", value: 4 },
    Height: { type: "int", value: 4 },
    Tileset: { type: "resref", value: "ttf01" },
    Tile_List: {
      type: "list",
      value: Array.from({ length: 16 }, (_, i) => ({
        __struct_id: 1,
        Tile_ID: { type: "int", value: 100 + i },
        Tile_Orientation: { type: "int", value: i % 4 },
        Tile_Height: { type: "int", value: i === 6 ? 2 : 0 },
      })),
    },
  } as unknown as GffDocument);
  mockIndex.areas.set(name, {
    resref: name, name: "Test Area", width: 4, height: 4, tileset: "ttf01", creatureCount: 0, placeableCount: 0,
    doorCount: 0, waypointCount: 0, triggerCount: 0, encounterCount: 0, soundCount: 0, storeCount: 0,
  });
  return git as GffObj;
}

async function addBlueprint(ext: string, resref: string, extra: Record<string, unknown> = {}): Promise<void> {
  const doc = {
    __data_type: `${ext.toUpperCase()} `,
    Tag: { type: "cexostring", value: resref },
    TemplateResRef: { type: "resref", value: resref },
    FirstName: { type: "cexolocstring", value: { "0": resref } },
    LocName: { type: "cexolocstring", value: { "0": resref } },
    Appearance: { type: "dword", value: 7 },
    ...extra,
  };
  const p = path.join(tempDir, `${resref}.${ext}`);
  await fs.writeFile(p, JSON.stringify(doc));
  mockIndex.resources.set(`${resref}.${ext}`, { resref, extension: ext, filePath: p, sizeBytes: 100 });
  mockIndex.parsedGff.set(`${resref}.${ext}`, doc as unknown as GffDocument);
}

function placeable(tag: string, x: number, y: number, z = 0): GffObj {
  return {
    __struct_id: 9,
    Tag: { type: "cexostring", value: tag },
    X: { type: "float", value: x }, Y: { type: "float", value: y }, Z: { type: "float", value: z },
    Bearing: { type: "float", value: 0 },
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

function text(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.find((c) => c.type === "text")?.text ?? "";
}

// The tools return free-form JSON; the tests read nested fields directly.
// biome-ignore lint/suspicious/noExplicitAny: test helper over arbitrary tool JSON
function json(result: { content: Array<{ type: string; text?: string }> }): Record<string, any> {
  return JSON.parse(text(result));
}

const val = (obj: GffObj, key: string): number => (obj[key] as { value: number }).value;
const list = (git: GffObj, name: string): GffObj[] => (git[name] as { value: GffObj[] }).value;

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-conv-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
  ground.z = () => 0;
  ground.walkable = () => true;
  ground.heightStep = undefined;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

// ─── place_placeable ──────────────────────────────────────────────────────

describe("place_placeable", () => {
  async function run(args: Record<string, unknown>, existing: GffObj[] = []) {
    const git = await setupArea({ "Placeable List": existing });
    await addBlueprint("utp", "plc_chair");
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      const result = await client.callTool({ name: "place_placeable", arguments: { area: "testarea", blueprint: "plc_chair", ...args } });
      return { result, git, placed: list(git, "Placeable List").at(-1) };
    } finally {
      await cleanup();
    }
  }

  it("takes Z from the walkmesh ground and ignores the requested z; the response reports the PLACED z", async () => {
    ground.z = () => 3.5;
    const { result, placed } = await run({ x: "20", y: "20", z: "0" });
    expect(val(placed!, "Z")).toBeCloseTo(3.5, 6);
    const body = json(result);
    expect(body.position.z).toBeCloseTo(3.5, 6);   // used to echo the requested 0
    expect(body.groundZ).toBeCloseTo(3.5, 6);
  });

  it("zOffset raises the prop above the ground (a prop on a table)", async () => {
    ground.z = () => 3.5;
    const { result, placed } = await run({ x: "20", y: "20", zOffset: "0.8" });
    expect(val(placed!, "Z")).toBeCloseTo(4.3, 6);
    expect(json(result).position.z).toBeCloseTo(4.3, 6);
  });

  it("faceToward turns the FRONT toward the point: Bearing = angle to target + 90 degrees (verified on real chairs)", async () => {
    // table due east of the chair
    const { result, placed } = await run({ x: "20", y: "20", faceTowardX: "26", faceTowardY: "20" });
    expect(val(placed!, "Bearing")).toBeCloseTo(Math.PI / 2, 4);
    expect(json(result).frontFacesCompass).toBe(90);
    // table due south: Bearing 0 (models face south at rest)
    const south = await run({ x: "20", y: "20", faceTowardX: "20", faceTowardY: "10" });
    expect(val(south.placed!, "Bearing")).toBeCloseTo(0, 4);
    expect(json(south.result).frontFacesCompass).toBe(180);
  });

  it("the raw bearing parameter stays a GFF rotation (counter-clockwise, front south at 0) and is reported as such", async () => {
    const { result, placed } = await run({ x: "20", y: "20", bearing: "180" });
    expect(val(placed!, "Bearing")).toBeCloseTo(Math.PI, 5);
    expect(json(result).frontFacesCompass).toBe(0);   // 180 -> faces NORTH
  });

  it("requires faceTowardX and faceTowardY together and refuses a coincident target", async () => {
    expect(text((await run({ x: "20", y: "20", faceTowardX: "5" })).result)).toMatch(/must be given together/);
    expect(text((await run({ x: "20", y: "20", faceTowardX: "20", faceTowardY: "20" })).result)).toMatch(/same point/);
  });

  it("collisionRadius relaxes the default 1 m collision rule (real areas: 34% of props are closer than 1 m)", async () => {
    const near = [placeable("table", 20, 20)];
    const blocked = await run({ x: "20.5", y: "20" }, near);
    expect(text(blocked.result)).toContain("Placement blocked");
    const allowed = await run({ x: "20.5", y: "20", collisionRadius: "0.3" }, [placeable("table", 20, 20)]);
    expect(json(allowed.result).success).toBe(true);
    const off = await run({ x: "20.5", y: "20", collisionRadius: "0" }, [placeable("table", 20, 20)]);
    expect(json(off.result).success).toBe(true);
  });

  it("walkBuffer is passed to the placement check (0 = only the position itself must be walkable)", async () => {
    const wm = await import("../util/walkmesh.js");
    await run({ x: "20", y: "20", walkBuffer: "0" });
    const calls = vi.mocked(wm.checkPlacementWalkable).mock.calls;
    expect(calls.at(-1)![5]).toBe(0);
    await run({ x: "30", y: "30" });
    expect(vi.mocked(wm.checkPlacementWalkable).mock.calls.at(-1)![5]).toBeUndefined();   // tool default (1 m) applies
  });

  it("still refuses a position that is not walkable", async () => {
    ground.walkable = () => false;
    const { result } = await run({ x: "20", y: "20" });
    expect(text(result)).toContain("not safe for placement");
  });
});

// ─── place_creature / place_waypoint / place_door ─────────────────────────

describe("creature, waypoint and door placement", () => {
  it("place_creature: compass bearing becomes an orientation VECTOR (0 = north, 90 = east); faceToward points at a target", async () => {
    ground.z = () => 2.25;
    const git = await setupArea();
    await addBlueprint("utc", "guard");
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      const a = json(await client.callTool({ name: "place_creature", arguments: { area: "testarea", blueprint: "guard", x: "10", y: "10", bearing: "90" } }));
      const b = json(await client.callTool({ name: "place_creature", arguments: { area: "testarea", blueprint: "guard", x: "20", y: "20", faceTowardX: "20", faceTowardY: "5" } }));
      const [first, second] = list(git, "Creature List");
      expect([val(first, "XOrientation"), val(first, "YOrientation")]).toEqual([1, 0]);                  // east
      expect([val(second, "XOrientation"), val(second, "YOrientation")]).toEqual([0, -1]);               // toward the target (south)
      expect(val(first, "ZPosition")).toBeCloseTo(2.25, 6);
      expect(a.position.z).toBeCloseTo(2.25, 6);
      expect(a.bearing).toBe(90);
      expect(b.bearing).toBe(180);
    } finally {
      await cleanup();
    }
  });

  it("place_waypoint: facing and the placed z are reported", async () => {
    ground.z = () => 1.5;
    const git = await setupArea();
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      const body = json(await client.callTool({ name: "place_waypoint", arguments: { area: "testarea", tag: "wp_a", name: "A", x: "15", y: "15", faceTowardX: "25", faceTowardY: "15" } }));
      const wp = list(git, "WaypointList")[0];
      expect([val(wp, "XOrientation"), val(wp, "YOrientation")]).toEqual([1, 0]);
      expect(val(wp, "ZPosition")).toBeCloseTo(1.5, 6);
      expect(body.position.z).toBeCloseTo(1.5, 6);
      expect(body.bearing).toBe(90);
    } finally {
      await cleanup();
    }
  });

  it("place_door: the response reports the placed z", async () => {
    ground.z = () => 4;
    await setupArea();
    await addBlueprint("utd", "nw_door");
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      const body = json(await client.callTool({ name: "place_door", arguments: { area: "testarea", blueprint: "nw_door", x: "12", y: "12" } }));
      expect(body.position.z).toBeCloseTo(4, 6);
    } finally {
      await cleanup();
    }
  });
});

// ─── move_object / bulk_move_objects ──────────────────────────────────────

describe("moving objects keeps their height above the ground", () => {
  beforeEach(() => {
    ground.z = (x) => x * 0.1;   // a ramp: 1 m of height per 10 m east
  });

  it("move_object: a prop 0.5 m above the ground stays 0.5 m above it on the new terrain", async () => {
    const git = await setupArea({ "Placeable List": [placeable("lamp", 10, 20, 1.5)] });   // ground 1.0 + 0.5
    const { registerObjectMgmtTools } = await import("./object-mgmt-tools.js");
    const { client, cleanup } = await createTestClient(registerObjectMgmtTools);
    try {
      const body = json(await client.callTool({ name: "move_object", arguments: { area: "testarea", listName: "Placeable List", tag: "lamp", x: "30", y: "20" } }));
      expect(val(list(git, "Placeable List")[0], "Z")).toBeCloseTo(3.5, 6);   // new ground 3.0 + 0.5
      expect(body.groundShift).toBeCloseTo(2, 6);
      expect(body.newPosition.z).toBeCloseTo(3.5, 6);
    } finally {
      await cleanup();
    }
  });

  it("move_object: an explicit z wins and followGround=false leaves Z unchanged", async () => {
    const git = await setupArea({ "Placeable List": [placeable("lamp", 10, 20, 1.5)] });
    const { registerObjectMgmtTools } = await import("./object-mgmt-tools.js");
    const { client, cleanup } = await createTestClient(registerObjectMgmtTools);
    try {
      await client.callTool({ name: "move_object", arguments: { area: "testarea", listName: "Placeable List", tag: "lamp", x: "30", y: "20", z: "9" } });
      expect(val(list(git, "Placeable List")[0], "Z")).toBe(9);
      await client.callTool({ name: "move_object", arguments: { area: "testarea", listName: "Placeable List", tag: "lamp", x: "10", y: "20", followGround: false } });
      expect(val(list(git, "Placeable List")[0], "Z")).toBe(9);
    } finally {
      await cleanup();
    }
  });

  it("bulk_move_objects: each object follows the ground; offsetZ is added on top", async () => {
    const git = await setupArea({ "Placeable List": [placeable("rock", 10, 20, 1.0), placeable("rock", 15, 25, 2.0)] });
    const { registerBulkTools } = await import("./bulk-tools.js");
    const { client, cleanup } = await createTestClient(registerBulkTools);
    try {
      const body = json(await client.callTool({ name: "bulk_move_objects", arguments: { area: "testarea", tag: "rock", listName: "Placeable List", offsetX: "20", offsetY: "0", offsetZ: "0.25" } }));
      const [a, b] = list(git, "Placeable List");
      expect(val(a, "Z")).toBeCloseTo(1.0 + 2.0 + 0.25, 6);
      expect(val(b, "Z")).toBeCloseTo(2.0 + 2.0 + 0.25, 6);
      expect(body.followGround).toBe(true);
      expect(body.groundAdjusted).toBe(2);
    } finally {
      await cleanup();
    }
  });
});

// ─── fix_object_heights ───────────────────────────────────────────────────

describe("fix_object_heights", () => {
  async function setup() {
    ground.z = () => 5;
    const git = await setupArea({ "Placeable List": [placeable("buried", 10, 10, 0), placeable("ok", 20, 10, 5), placeable("raised", 30, 10, 8)] });
    const { registerBulkTools } = await import("./bulk-tools.js");
    const { client, cleanup } = await createTestClient(registerBulkTools);
    return { git, client, cleanup };
  }
  const zs = (git: GffObj) => list(git, "Placeable List").map((o) => val(o, "Z"));

  it("dryRun reports samples without modifying anything", async () => {
    const { git, client, cleanup } = await setup();
    try {
      const body = json(await client.callTool({ name: "fix_object_heights", arguments: { area: "testarea", dryRun: true } }));
      expect(body.dryRun).toBe(true);
      expect(body.totalFixed).toBe(2);
      expect(body.samples.map((sample: { tag: string }) => sample.tag).sort()).toEqual(["buried", "raised"]);
      expect(zs(git)).toEqual([0, 5, 8]);
    } finally {
      await cleanup();
    }
  });

  it("default behaviour is unchanged: everything is snapped to the ground", async () => {
    const { git, client, cleanup } = await setup();
    try {
      expect(json(await client.callTool({ name: "fix_object_heights", arguments: { area: "testarea" } })).totalFixed).toBe(2);
      expect(zs(git)).toEqual([5, 5, 5]);
    } finally {
      await cleanup();
    }
  });

  it("onlyBuried raises buried objects but never lowers a deliberately raised prop", async () => {
    const { git, client, cleanup } = await setup();
    try {
      expect(json(await client.callTool({ name: "fix_object_heights", arguments: { area: "testarea", onlyBuried: true } })).totalFixed).toBe(1);
      expect(zs(git)).toEqual([5, 5, 8]);
    } finally {
      await cleanup();
    }
  });

  it("tolerance ignores small differences", async () => {
    const { git, client, cleanup } = await setup();
    try {
      expect(json(await client.callTool({ name: "fix_object_heights", arguments: { area: "testarea", tolerance: "4" } })).totalFixed).toBe(1);
      expect(zs(git)).toEqual([5, 5, 8]);
    } finally {
      await cleanup();
    }
  });
});

// ─── probe_ground ─────────────────────────────────────────────────────────

describe("probe_ground", () => {
  it("reports walkability, surface, exact ground z, the tile and the placement verdict", async () => {
    ground.z = () => 10;
    await setupArea();
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      // (25, 15) is tile col 2, row 1 -> index 6 in the 4-wide grid, which setupArea gave Tile_Height 2
      const body = json(await client.callTool({ name: "probe_ground", arguments: { area: "testarea", x: "25", y: "15" } }));
      expect(body.walkable).toBe(true);
      expect(body.surface).toBe("Grass");
      expect(body.groundZ).toBe(10);
      expect(body.tile).toEqual({ col: 2, row: 1, tileId: 106, orientation: 2, heightLevel: 2 });
      expect(body.placement).toEqual({ ok: true, buffer: 1 });
    } finally {
      await cleanup();
    }
  });

  it("reports the tileset's height step (Transition) that went into the z, null when unknown", async () => {
    await setupArea();
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      expect(json(await client.callTool({ name: "probe_ground", arguments: { area: "testarea", x: "25", y: "15" } })).heightStep).toBeNull();
      ground.heightStep = 4;   // e.g. tcn01
      expect(json(await client.callTool({ name: "probe_ground", arguments: { area: "testarea", x: "25", y: "15" } })).heightStep).toBe(4);
    } finally {
      await cleanup();
    }
  });

  it("explains a blocked position and has no placement verdict for it", async () => {
    ground.walkable = () => false;
    await setupArea();
    const { registerPlacementTools } = await import("./placement-tools.js");
    const { client, cleanup } = await createTestClient(registerPlacementTools);
    try {
      const body = json(await client.callTool({ name: "probe_ground", arguments: { area: "testarea", x: "5", y: "5", buffer: "2" } }));
      expect(body.walkable).toBe(false);
      expect(body.placement).toBeNull();
    } finally {
      await cleanup();
    }
  });
});
