import { describe, it, expect } from "vitest";
import { analyzeGroupLayout, isFlatFillerTile, findFlatFillerTiles, checkTilesetIntegrity } from "./tileset-rules.js";
import type { TilesetInfo, TileDefinition, TileGroup, TerrainType } from "./tileset.js";

function makeTerrain(rawName: string, index = 0): TerrainType {
  return { index, name: rawName, rawName, strref: 0 };
}

function makeTile(id: number, model: string, overrides: Partial<TileDefinition> = {}): TileDefinition {
  return {
    id,
    model,
    imageMap2D: "",
    corners: { topLeft: "floor", topRight: "floor", bottomLeft: "floor", bottomRight: "floor" },
    crossers: { top: "", right: "", bottom: "", left: "" },
    flat: true,
    pathNode: "",
    doors: 0,
    doorPlacements: [],
    sounds: 0,
    orientation: 0,
    groupId: null,
    groupName: null,
    ...overrides,
  };
}

function makeGroup(index: number, name: string, rows: number, columns: number, tileIds: number[]): TileGroup {
  return { index, name, strref: 0, rows, columns, tileIds };
}

function makeTileset(tiles: TileDefinition[], groups: TileGroup[] = [], terrainTypes: TerrainType[] = []): TilesetInfo {
  const byId: TileDefinition[] = [];
  for (const t of tiles) byId[t.id] = t;
  return {
    resref: "test",
    displayName: "TEST",
    interior: true,
    hasHeightTransition: false,
    envMap: "",
    transition: 0,
    border: "",
    defaultTerrain: "wall",
    floor: "floor",
    terrainTypes,
    crosserTypes: [],
    primaryRules: [],
    secondaryRules: [],
    tiles: byId,
    groups,
  };
}

describe("analyzeGroupLayout", () => {
  it("confirms a tcn01 CloakTower_2x2-style group where letters vary by column", () => {
    // Tile0..3 raw-order = NW, NE, SW, SE (row-major from north).
    // u = west column, v = east column; 01 = south row, 02 = north row.
    const tiles = [
      makeTile(0, "tcn01_u02_01"), // NW
      makeTile(1, "tcn01_v02_01"), // NE
      makeTile(2, "tcn01_u01_01"), // SW
      makeTile(3, "tcn01_v01_01"), // SE
    ];
    const group = makeGroup(0, "CloakTower_2x2", 2, 2, [0, 1, 2, 3]);
    const tileset = makeTileset(tiles, [group]);

    const result = analyzeGroupLayout(tileset, group);
    expect(result.verdict).toBe("confirmed");
    expect(result.detail).toContain("letters=columns");
    expect(result.holes).toBe(0);
  });

  it("confirms an amp01-style group where letters vary by row instead", () => {
    // Opposite convention from CloakTower: letter tracks the ROW, number the COLUMN.
    const tiles = [
      makeTile(10, "amp01_b01_01"), // NW (row=b, col=1)
      makeTile(11, "amp01_b02_01"), // NE (row=b, col=2)
      makeTile(12, "amp01_a01_01"), // SW (row=a, col=1)
      makeTile(13, "amp01_a02_01"), // SE (row=a, col=2)
    ];
    const group = makeGroup(0, "Ampitheater", 2, 2, [10, 11, 12, 13]);
    const tileset = makeTileset(tiles, [group]);

    const result = analyzeGroupLayout(tileset, group);
    expect(result.verdict).toBe("confirmed");
    expect(result.detail).toContain("letters=rows");
  });

  it("reports irregular when no consistent axis assignment exists", () => {
    const tiles = [
      makeTile(20, "foo_x01_01"),
      makeTile(21, "foo_y05_01"),
    ];
    const group = makeGroup(0, "Mismatched", 1, 2, [20, 21]);
    const tileset = makeTileset(tiles, [group]);

    const result = analyzeGroupLayout(tileset, group);
    expect(result.verdict).toBe("irregular");
  });

  it("counts holes without letting them break the layout check", () => {
    const tiles = [
      makeTile(0, "tcn01_u02_01"),
      makeTile(1, "tcn01_v02_01"),
      makeTile(2, "tcn01_u01_01"),
      // SE is a hole
    ];
    const group = makeGroup(0, "HasHole", 2, 2, [0, 1, 2, -1]);
    const tileset = makeTileset(tiles, [group]);

    const result = analyzeGroupLayout(tileset, group);
    expect(result.holes).toBe(1);
    expect(result.verdict).toBe("confirmed");
  });

  it("returns n/a for a group with no Rows/Columns", () => {
    const group = makeGroup(0, "Empty", 0, 0, []);
    const tileset = makeTileset([], [group]);
    const result = analyzeGroupLayout(tileset, group);
    expect(result.verdict).toBe("n/a");
  });

  it("returns n/a when a tile's model doesn't follow the <set>_<letters><number>_<variant> convention", () => {
    const tiles = [makeTile(0, "not_a_normal_model_name")];
    const group = makeGroup(0, "OffConvention", 1, 1, [0]);
    const tileset = makeTileset(tiles, [group]);
    const result = analyzeGroupLayout(tileset, group);
    expect(result.verdict).toBe("n/a");
  });
});

describe("isFlatFillerTile / findFlatFillerTiles", () => {
  it("accepts a flat, single-terrain, crosser-free tile", () => {
    const tile = makeTile(0, "x", { corners: { topLeft: "floor", topRight: "floor", bottomLeft: "floor", bottomRight: "floor" } });
    expect(isFlatFillerTile(tile, "floor")).toBe(true);
  });

  it("rejects a tile whose corners mix terrains even if flat", () => {
    const tile = makeTile(0, "x", { corners: { topLeft: "floor", topRight: "water", bottomLeft: "floor", bottomRight: "floor" } });
    expect(isFlatFillerTile(tile, "floor")).toBe(false);
  });

  it("rejects a flat single-terrain tile that carries a crosser", () => {
    const tile = makeTile(0, "x", { crossers: { top: "road", right: "", bottom: "", left: "" } });
    expect(isFlatFillerTile(tile, "floor")).toBe(false);
  });

  it("rejects a tile that isn't flat regardless of terrain/crosser", () => {
    const tile = makeTile(0, "x", { flat: false });
    expect(isFlatFillerTile(tile, "floor")).toBe(false);
  });

  it("groups filler tiles by terrain, omitting terrains with none", () => {
    const floorTile = makeTile(0, "a", { corners: { topLeft: "floor", topRight: "floor", bottomLeft: "floor", bottomRight: "floor" } });
    const wallTile = makeTile(1, "b", { corners: { topLeft: "wall", topRight: "wall", bottomLeft: "wall", bottomRight: "wall" } });
    const mixedTile = makeTile(2, "c", { corners: { topLeft: "floor", topRight: "wall", bottomLeft: "floor", bottomRight: "wall" } });
    const tileset = makeTileset([floorTile, wallTile, mixedTile], [], [makeTerrain("floor"), makeTerrain("wall"), makeTerrain("water")]);

    const result = findFlatFillerTiles(tileset);
    expect(result.floor).toEqual([0]);
    expect(result.wall).toEqual([1]);
    expect(result.water).toBeUndefined();
  });
});

describe("checkTilesetIntegrity", () => {
  it("flags a group referencing a tile ID outside the tile table", () => {
    const tiles = [makeTile(0, "a")];
    const group = makeGroup(0, "BadGroup", 1, 2, [0, 99]);
    const tileset = makeTileset(tiles, [group]);

    const result = checkTilesetIntegrity(tileset);
    expect(result.tileCount).toBe(1);
    expect(result.groupsWithOutOfRangeTiles).toHaveLength(1);
    expect(result.groupsWithOutOfRangeTiles[0].badTileIds).toEqual([99]);
  });

  it("does not flag holes (-1) as out of range", () => {
    const tiles = [makeTile(0, "a")];
    const group = makeGroup(0, "HasHole", 1, 2, [0, -1]);
    const tileset = makeTileset(tiles, [group]);

    const result = checkTilesetIntegrity(tileset);
    expect(result.groupsWithOutOfRangeTiles).toHaveLength(0);
  });

  it("reports a clean tileset with no flagged groups", () => {
    const tiles = [makeTile(0, "a"), makeTile(1, "b")];
    const group = makeGroup(0, "Fine", 1, 2, [0, 1]);
    const tileset = makeTileset(tiles, [group]);

    const result = checkTilesetIntegrity(tileset);
    expect(result.groupsWithOutOfRangeTiles).toHaveLength(0);
  });
});
