import { describe, it, expect } from "vitest";
import { generateLayout, MIN_SINGLE_ROOM_AREA_SIZE } from "./layout-generator.js";
import type { LayoutStyle } from "./layout-generator.js";
import type { TilesetInfo, TileDefinition } from "./tileset.js";

// ─── Test Tileset (rural: Grass floor, Trees wall/border) ──────────────────

function makeTile(
  id: number,
  tl: string, tr: string, bl: string, br: string,
  crossers: { top?: string; right?: string; bottom?: string; left?: string } = {},
): TileDefinition {
  return {
    id,
    model: `tile${id}`,
    imageMap2D: "",
    corners: { topLeft: tl, topRight: tr, bottomLeft: bl, bottomRight: br },
    flat: true,
    crossers: {
      top: crossers.top ?? "",
      right: crossers.right ?? "",
      bottom: crossers.bottom ?? "",
      left: crossers.left ?? "",
    },
    pathNode: "",
    doors: 0,
    sounds: 0,
    orientation: 0,
    groupId: null,
    groupName: null,
  };
}

function makeRuralTileset(): TilesetInfo {
  return {
    resref: "test",
    displayName: "Test Rural",
    interior: false,
    hasHeightTransition: false,
    envMap: "",
    transition: 0,
    border: "",
    defaultTerrain: "Grass",
    floor: "",
    terrainTypes: [
      { index: 0, name: "Grass", rawName: "grass", strref: -1 },
      { index: 1, name: "Trees", rawName: "trees", strref: -1 },
    ],
    crosserTypes: [{ index: 0, name: "Path", strref: -1 }],
    primaryRules: [],
    secondaryRules: [],
    groups: [],
    tiles: [
      makeTile(0, "Grass", "Grass", "Grass", "Grass"),
      makeTile(1, "Trees", "Trees", "Trees", "Trees"),
      makeTile(2, "Grass", "Grass", "Trees", "Grass"),
      makeTile(3, "Trees", "Grass", "Trees", "Grass"),
      makeTile(4, "Grass", "Grass", "Trees", "Trees"),
      makeTile(5, "Trees", "Grass", "Trees", "Trees"),
      makeTile(6, "Grass", "Grass", "Grass", "Grass", { top: "Path", bottom: "Path" }),
    ],
  };
}

describe("generateLayout safeMode", () => {
  it("ignores preferredFeatures and returns an empty suggestedFeatures array", () => {
    const tileset = makeRuralTileset();
    const style: LayoutStyle = {
      type: "rural",
      rooms: 1,
      safeMode: true,
      preferredFeatures: ["Some Feature"],
    };
    const result = generateLayout(tileset, MIN_SINGLE_ROOM_AREA_SIZE, MIN_SINGLE_ROOM_AREA_SIZE, style);
    expect(result.suggestedFeatures).toEqual([]);
  });

  it("never adds an obstacle-patch zone on top of the wall paint", () => {
    const tileset = makeRuralTileset();
    const style: LayoutStyle = { type: "rural", rooms: 3, safeMode: true };
    // Run several times: obstacle placement is randomized in non-safe mode,
    // so this only proves the guarantee if it holds across every run.
    for (let trial = 0; trial < 10; trial++) {
      const result = generateLayout(tileset, 18, 18, style);
      const wallZones = result.zones.filter(z => z.terrain.toLowerCase() === "trees");
      // Exactly one: the full-area wall paint. safeMode forces obstacleChance
      // to 0, so no second "Trees" obstacle-patch zone should ever be added.
      expect(wallZones).toHaveLength(1);
    }
  });

  it("produces exactly one floor zone for a single-room minimal-footprint scaffold", () => {
    const tileset = makeRuralTileset();
    const style: LayoutStyle = { type: "rural", rooms: 1, safeMode: true };
    const result = generateLayout(tileset, MIN_SINGLE_ROOM_AREA_SIZE, MIN_SINGLE_ROOM_AREA_SIZE, style);
    const floorZones = result.zones.filter(z => z.terrain.toLowerCase() === "grass");
    expect(floorZones).toHaveLength(1);
    // Hard-floor minimum room size (see MIN_SINGLE_ROOM_AREA_SIZE derivation).
    expect(floorZones[0].tiles).toHaveLength(9);
  });
});

describe("generateLayout without safeMode (regression guard)", () => {
  it("still returns a layout for the same minimal single-room case", () => {
    const tileset = makeRuralTileset();
    const style: LayoutStyle = { type: "rural", rooms: 1 };
    const result = generateLayout(tileset, MIN_SINGLE_ROOM_AREA_SIZE, MIN_SINGLE_ROOM_AREA_SIZE, style);
    expect(result.zones.length).toBeGreaterThan(0);
    expect(result.layoutDescription).not.toMatch(/^ERROR/);
  });
});
