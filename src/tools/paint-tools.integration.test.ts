/**
 * Integration tests for paint_group's rotation support.
 *
 * Scope: only getTilesetInfo is mocked (a synthetic small group with
 * distinct tile IDs per cell) — rotateGroupTileIndex/rotatedGroupDimensions
 * are the REAL implementation (spread via importOriginal), since this test
 * exists specifically to exercise paint_group's placement/rotation logic,
 * not tileset-parsing. Tileset .set parsing itself and any live-toolset
 * visual check belong in comprehensive-module.live.test.ts, per this
 * project's established convention for real-resman-dependent coverage.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import type { TileGroup, TilesetInfo } from "../util/tileset.js";

vi.mock("../nim-tools.js", () => ({
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
}));

let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [] }),
}));

// A 2-column x 1-row group with distinct tile IDs per cell (10 at native
// (0,0), 20 at native (1,0)) — enough to prove the rotation remap actually
// moves the right tile ID to the right placed slot, not just spins in place.
const TEST_GROUP: TileGroup = { index: 0, name: "TestGroup_2x1", strref: 0, rows: 1, columns: 2, tileIds: [10, 20] };
const TEST_TILESET = {
  resref: "testset",
  tiles: [],
  groups: [TEST_GROUP],
} as unknown as TilesetInfo;

vi.mock("../util/tileset.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../util/tileset.js")>()),
  getTilesetInfo: vi.fn(async () => TEST_TILESET),
}));

vi.mock("../util/walkmesh.js", () => ({
  ensureWokCacheDir: vi.fn(async () => "/tmp/fake-wok-cache"),
  getWokForTile: vi.fn(async () => null),
  computeTileWalkSummary: vi.fn(() => ({ dominantMaterial: "Grass", walkablePercent: 100 })),
}));

vi.mock("./tileset-tools.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./tileset-tools.js")>()),
  invalidateTagToAreaCache: vi.fn(),
}));

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

function makeAreaDoc(width: number, height: number): GffDocument {
  const tileList = Array.from({ length: width * height }, () => ({
    __struct_id: 0,
    Tile_ID: { type: "int", value: -1 },
    Tile_Orientation: { type: "int", value: 0 },
    Tile_Height: { type: "int", value: 0 },
  }));
  return {
    __data_type: "ARE ",
    Width: { type: "int", value: width },
    Height: { type: "int", value: height },
    Tileset: { type: "resref", value: "testset" },
    Tile_List: { type: "list", value: tileList },
  } as unknown as GffDocument;
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const textBlock = result.content.find((c) => c.type === "text");
  if (!textBlock?.text) return {};
  try {
    return JSON.parse(textBlock.text);
  } catch {
    return {};
  }
}

async function createTestClient(): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const { registerPaintTools } = await import("./paint-tools.js");
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerPaintTools(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function tileAt(are: GffObj, width: number, x: number, y: number): { id: number; orientation: number } {
  const tileList = (are.Tile_List as { value: GffObj[] }).value;
  const entry = tileList[y * width + x];
  return {
    id: (entry.Tile_ID as { value: number }).value,
    orientation: (entry.Tile_Orientation as { value: number }).value,
  };
}

describe("paint_group rotation", () => {
  beforeEach(() => {
    tempDir = path.join(os.tmpdir(), `nwn-mcp-paint-test-${Date.now()}-${Math.random()}`);
    mockIndex = createMockIndex();
  });

  it("rotation 0 (default) places tiles at native positions, unchanged from before rotation existed", async () => {
    const are = makeAreaDoc(4, 4) as GffObj;
    mockIndex.parsedGff.set("testarea.are", are);
    mockIndex.resources.set("testarea.are", { resref: "testarea", extension: "are", filePath: path.join(tempDir, "testarea.are"), sizeBytes: 1 });

    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({ name: "paint_group", arguments: { area: "testarea", feature: "TestGroup_2x1", x: "1", y: "1" } });
      const parsed = parseResult(result as { content: Array<{ type: string; text?: string }> });
      expect(parsed.success).toBe(true);
      expect(parsed.rotation).toBe(0);
      expect(parsed.size).toEqual({ columns: 2, rows: 1 });

      // Native: tile 10 at (1,1) [group-local (0,0)], tile 20 at (2,1) [group-local (1,0)].
      expect(tileAt(are, 4, 1, 1)).toEqual({ id: 10, orientation: 0 });
      expect(tileAt(are, 4, 2, 1)).toEqual({ id: 20, orientation: 0 });
    } finally {
      await cleanup();
    }
  });

  it("rotation 1 (90°) swaps the footprint to 1x2 and remaps tile IDs to the rotated slots", async () => {
    const are = makeAreaDoc(4, 4) as GffObj;
    mockIndex.parsedGff.set("testarea.are", are);
    mockIndex.resources.set("testarea.are", { resref: "testarea", extension: "are", filePath: path.join(tempDir, "testarea.are"), sizeBytes: 1 });

    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({ name: "paint_group", arguments: { area: "testarea", feature: "TestGroup_2x1", x: "1", y: "1", rotation: "1" } });
      const parsed = parseResult(result as { content: Array<{ type: string; text?: string }> });
      expect(parsed.success).toBe(true);
      expect(parsed.rotation).toBe(1);
      expect(parsed.size).toEqual({ columns: 1, rows: 2 }); // swapped

      // Per rotateGroupTileIndex's own unit-tested example (columns=2,rows=1,
      // rotation=1, direction fixed 2026-09-19): native tile A=(0,0)=id10 ->
      // new(0,1); native tile B=(1,0)=id20 -> new(0,0). Placed at origin (1,1):
      expect(tileAt(are, 4, 1, 1)).toEqual({ id: 20, orientation: 1 }); // new(0,0) -> world (1,1)
      expect(tileAt(are, 4, 1, 2)).toEqual({ id: 10, orientation: 1 }); // new(0,1) -> world (1,2)
    } finally {
      await cleanup();
    }
  });

  it("rejects a rotated footprint that doesn't fit, using the ROTATED (not native) bounds", async () => {
    // 2x1 native group at rotation 1 becomes 1x2 (1 wide). Placed at x=3 in a
    // 4-wide area with y near the top edge should fail on the ROTATED height
    // (2 tall), not the native height (1 tall) — proves the bounds check
    // uses placedColumns/placedRows, not group.columns/group.rows.
    const are = makeAreaDoc(4, 4) as GffObj;
    mockIndex.parsedGff.set("testarea.are", are);
    mockIndex.resources.set("testarea.are", { resref: "testarea", extension: "are", filePath: path.join(tempDir, "testarea.are"), sizeBytes: 1 });

    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({ name: "paint_group", arguments: { area: "testarea", feature: "TestGroup_2x1", x: "0", y: "3", rotation: "1" } });
      const text = (result.content as Array<{ text?: string }>)[0]?.text ?? "";
      expect(text).toContain("doesn't fit");
    } finally {
      await cleanup();
    }
  });
});
