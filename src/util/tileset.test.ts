import { describe, it, expect } from "vitest";
import {
  getRotatedCorners,
  getRotatedCrossers,
  getGroupEntrances,
  rotateGroupTileIndex,
  rotatedGroupDimensions,
} from "./tileset.js";
import type { TileDefinition, TileGroup, TilesetInfo } from "./tileset.js";

// Minimal tile fixture with distinct values per corner/edge for clear rotation verification
function makeTile(): TileDefinition {
  return {
    id: 0,
    model: "test",
    imageMap2D: "",
    corners: {
      topLeft: "Forest",
      topRight: "Cliff",
      bottomLeft: "Grass",
      bottomRight: "Stone",
    },
    flat: true,
    crossers: {
      top: "Road",
      right: "Stream",
      bottom: "",
      left: "",
    },
    pathNode: "",
    doors: 0,
    sounds: 0,
    orientation: 0,
    groupId: null,
    groupName: null,
  };
}

describe("getRotatedCorners", () => {
  it("orientation 0 returns original corners unchanged", () => {
    const tile = makeTile();
    const c = getRotatedCorners(tile, 0);
    expect(c.topLeft).toBe("Forest");
    expect(c.topRight).toBe("Cliff");
    expect(c.bottomLeft).toBe("Grass");
    expect(c.bottomRight).toBe("Stone");
  });

  // 90° CW: TR→TL, BR→TR, BL→BR, TL→BL
  it("orientation 1 (90° CW): world.TL = local.TR", () => {
    const tile = makeTile();
    const c = getRotatedCorners(tile, 1);
    expect(c.topLeft).toBe("Cliff");       // was topRight
    expect(c.topRight).toBe("Stone");      // was bottomRight
    expect(c.bottomRight).toBe("Grass");   // was bottomLeft
    expect(c.bottomLeft).toBe("Forest");   // was topLeft
  });

  // 180°: BR→TL, BL→TR, TL→BR, TR→BL
  it("orientation 2 (180°): all corners flip", () => {
    const tile = makeTile();
    const c = getRotatedCorners(tile, 2);
    expect(c.topLeft).toBe("Stone");       // was bottomRight
    expect(c.topRight).toBe("Grass");      // was bottomLeft
    expect(c.bottomLeft).toBe("Cliff");    // was topRight
    expect(c.bottomRight).toBe("Forest");  // was topLeft
  });

  // 270° CW: BL→TL, TL→TR, TR→BR, BR→BL
  it("orientation 3 (270° CW): world.TL = local.BL", () => {
    const tile = makeTile();
    const c = getRotatedCorners(tile, 3);
    expect(c.topLeft).toBe("Grass");       // was bottomLeft
    expect(c.topRight).toBe("Forest");     // was topLeft
    expect(c.bottomRight).toBe("Cliff");   // was topRight
    expect(c.bottomLeft).toBe("Stone");    // was bottomRight
  });

  it("orientation 4 wraps to 0 (identity)", () => {
    const tile = makeTile();
    const c0 = getRotatedCorners(tile, 0);
    const c4 = getRotatedCorners(tile, 4);
    expect(c4).toEqual(c0);
  });

  it("applying 90° CW four times returns original", () => {
    // Each 90° CW rotation passes the result tile as-is won't work since
    // getRotatedCorners takes the original tile — so verify all 4 orientations cycle
    const tile = makeTile();
    const c0 = getRotatedCorners(tile, 0);
    const c4 = getRotatedCorners(tile, 4); // == 0
    expect(c0.topLeft).toBe(c4.topLeft);
    expect(c0.topRight).toBe(c4.topRight);
  });
});

describe("getRotatedCrossers", () => {
  it("orientation 0 returns original crossers unchanged", () => {
    const tile = makeTile();
    const cr = getRotatedCrossers(tile, 0);
    expect(cr.top).toBe("Road");
    expect(cr.right).toBe("Stream");
    expect(cr.bottom).toBe("");
    expect(cr.left).toBe("");
  });

  // 90° CW: top←right, right←bottom, bottom←left, left←top
  it("orientation 1 (90° CW): world.top = local.right", () => {
    const tile = makeTile();
    const cr = getRotatedCrossers(tile, 1);
    expect(cr.top).toBe("Stream");  // was right
    expect(cr.right).toBe("");      // was bottom
    expect(cr.bottom).toBe("");     // was left
    expect(cr.left).toBe("Road");   // was top
  });

  // 180°: top←bottom, right←left, bottom←top, left←right
  it("orientation 2 (180°): top and bottom swap, left and right swap", () => {
    const tile = makeTile();
    const cr = getRotatedCrossers(tile, 2);
    expect(cr.top).toBe("");        // was bottom
    expect(cr.right).toBe("");      // was left
    expect(cr.bottom).toBe("Road"); // was top
    expect(cr.left).toBe("Stream"); // was right
  });

  // 270° CW: top←left, right←top, bottom←right, left←bottom
  it("orientation 3 (270° CW): world.top = local.left", () => {
    const tile = makeTile();
    const cr = getRotatedCrossers(tile, 3);
    expect(cr.top).toBe("");        // was left
    expect(cr.right).toBe("Road"); // was top
    expect(cr.bottom).toBe("Stream"); // was right
    expect(cr.left).toBe("");      // was bottom
  });
});

describe("getGroupEntrances", () => {
  // 1-column x 2-row group. Bottom tile (0,0) has a door on its east edge
  // (tile-local x=+5, bearing 0) — its 3m outward offset lands off the
  // group's own footprint (no column 1 exists), so it's exterior/"E".
  // Top tile (0,1) has a door on its south edge (tile-local y=-5, bearing
  // 270) pointing straight at the bottom tile — its outward offset lands
  // back inside the group's own footprint, so it's interior and excluded.
  function makeDoorTile(id: number, doorX: number, doorY: number, bearing: number): TileDefinition {
    return {
      id,
      model: "test",
      imageMap2D: "",
      corners: { topLeft: "Grass", topRight: "Grass", bottomLeft: "Grass", bottomRight: "Grass" },
      flat: true,
      crossers: { top: "", right: "", bottom: "", left: "" },
      pathNode: "",
      doors: 1,
      doorPlacements: [{ x: doorX, y: doorY, z: 0, orientation: bearing, type: 0 }],
      sounds: 0,
      orientation: 0,
      groupId: null,
      groupName: null,
    } as unknown as TileDefinition;
  }

  function makeFixture(): { group: TileGroup; tileset: TilesetInfo } {
    const bottomTile = makeDoorTile(0, 5, 0, 0); // east-facing door
    const topTile = makeDoorTile(1, 0, -5, 270); // south-facing door (into the group)
    const tileset = { tiles: [bottomTile, topTile] } as unknown as TilesetInfo;
    const group: TileGroup = { index: 0, name: "TestGroup_1x2", strref: 0, rows: 2, columns: 1, tileIds: [0, 1] };
    return { group, tileset };
  }

  it("classifies an outward-facing door as exterior and an inward-facing one as interior", () => {
    const { group, tileset } = makeFixture();
    const entrances = getGroupEntrances(group, tileset, 0);
    // Only the bottom tile's east door should appear — the top tile's door
    // points back into the group's own footprint and is excluded.
    // (bearing 0 -> "S", per the 2026-09-19 calibration fix confirmed
    // against 4 real in-toolset placements — see bearingToSide's fix note.)
    expect(entrances).toHaveLength(1);
    expect(entrances[0].localCol).toBe(0);
    expect(entrances[0].localRow).toBe(0);
    expect(entrances[0].side).toBe("S");
  });

  it("rotation=0 leaves side unchanged from native bearing", () => {
    const { group, tileset } = makeFixture();
    const entrances = getGroupEntrances(group, tileset, 0);
    expect(entrances[0].side).toBe("S");
  });

  it("rotation rotates the reported side by simple compass steps (S->E->N->W->S)", () => {
    const { group, tileset } = makeFixture();
    // Native side is S (idx 2 in N,E,S,W). Each rotation step SUBTRACTS one
    // position in that cycle (2026-09-19 direction fix, confirmed against 4
    // real in-toolset placements — see rotateSide's fix note).
    expect(getGroupEntrances(group, tileset, 0)[0].side).toBe("S");
    expect(getGroupEntrances(group, tileset, 1)[0].side).toBe("E");
    expect(getGroupEntrances(group, tileset, 2)[0].side).toBe("N");
    expect(getGroupEntrances(group, tileset, 3)[0].side).toBe("W");
  });

  it("does not mutate x/y/bearing when rotation is nonzero (native-space geometry, rotated side only)", () => {
    const { group, tileset } = makeFixture();
    const native = getGroupEntrances(group, tileset, 0)[0];
    const rotated = getGroupEntrances(group, tileset, 2)[0];
    expect(rotated.x).toBe(native.x);
    expect(rotated.y).toBe(native.y);
    expect(rotated.bearing).toBe(native.bearing);
    expect(rotated.side).not.toBe(native.side);
  });

  it("returns no entrances for a group with no door tiles", () => {
    const plainTile = { ...makeDoorTile(0, 5, 0, 0), doors: 0, doorPlacements: [] };
    const tileset = { tiles: [plainTile] } as unknown as TilesetInfo;
    const group: TileGroup = { index: 0, name: "NoDoors_1x1", strref: 0, rows: 1, columns: 1, tileIds: [0] };
    expect(getGroupEntrances(group, tileset, 0)).toEqual([]);
  });
});

describe("rotatedGroupDimensions", () => {
  it("leaves dimensions unchanged at 0 and 180 degrees", () => {
    expect(rotatedGroupDimensions(2, 3, 0)).toEqual({ columns: 2, rows: 3 });
    expect(rotatedGroupDimensions(2, 3, 2)).toEqual({ columns: 2, rows: 3 });
  });

  it("swaps dimensions at 90 and 270 degrees", () => {
    expect(rotatedGroupDimensions(2, 3, 1)).toEqual({ columns: 3, rows: 2 });
    expect(rotatedGroupDimensions(2, 3, 3)).toEqual({ columns: 3, rows: 2 });
  });
});

describe("rotateGroupTileIndex", () => {
  it("rotation 0 is the identity map", () => {
    expect(rotateGroupTileIndex(1, 2, 4, 5, 0)).toEqual({ gc: 1, gr: 2 });
  });

  it("matches the hand-derived 2-column x 1-row example at rotation 1", () => {
    // columns=2, rows=1: native A=(0,0), B=(1,0). Rotating 90 degrees turns
    // this horizontal 2x1 bar into a vertical 1x2 bar: A -> new(0,1),
    // B -> new(0,0) (direction fixed 2026-09-19 — see rotateGroupTileIndex's
    // fix note; cases 1/3 were swapped after a real in-toolset check found
    // the original direction backwards).
    expect(rotateGroupTileIndex(0, 0, 2, 1, 1)).toEqual({ gc: 1, gr: 0 }); // -> B
    expect(rotateGroupTileIndex(0, 1, 2, 1, 1)).toEqual({ gc: 0, gr: 0 }); // -> A
  });

  it("is a bijection over the rotated footprint for every rotation and several group shapes", () => {
    for (const [columns, rows] of [[1, 1], [2, 1], [1, 2], [2, 3], [3, 2], [4, 4]] as const) {
      for (const rotation of [0, 1, 2, 3] as const) {
        const { columns: newColumns, rows: newRows } = rotatedGroupDimensions(columns, rows, rotation);
        const seen = new Set<string>();
        for (let ngr = 0; ngr < newRows; ngr++) {
          for (let ngc = 0; ngc < newColumns; ngc++) {
            const { gc, gr } = rotateGroupTileIndex(ngc, ngr, columns, rows, rotation);
            expect(gc).toBeGreaterThanOrEqual(0);
            expect(gc).toBeLessThan(columns);
            expect(gr).toBeGreaterThanOrEqual(0);
            expect(gr).toBeLessThan(rows);
            const key = `${gc},${gr}`;
            expect(seen.has(key)).toBe(false); // every native cell visited at most once
            seen.add(key);
          }
        }
        expect(seen.size).toBe(columns * rows); // every native cell visited exactly once
      }
    }
  });

  it("applying the 90-degree step four times in a row returns to the identity", () => {
    // Strong algebraic correctness check independent of any hand-picked example.
    const columns = 3, rows = 2;
    for (let gc = 0; gc < columns; gc++) {
      for (let gr = 0; gr < rows; gr++) {
        let curCol = gc, curRow = gr, curCols = columns, curRows = rows;
        for (let step = 0; step < 4; step++) {
          const { columns: nc, rows: nr } = rotatedGroupDimensions(curCols, curRows, 1);
          // Forward-apply one 90-degree step by finding the (ngc,ngr) whose
          // inverse maps back to (curCol,curRow) — i.e. invert the inverse.
          let found: { ngc: number; ngr: number } | null = null;
          for (let ngr = 0; ngr < nr && !found; ngr++) {
            for (let ngc = 0; ngc < nc && !found; ngc++) {
              const inv = rotateGroupTileIndex(ngc, ngr, curCols, curRows, 1);
              if (inv.gc === curCol && inv.gr === curRow) found = { ngc, ngr };
            }
          }
          expect(found).not.toBeNull();
          curCol = found!.ngc;
          curRow = found!.ngr;
          curCols = nc;
          curRows = nr;
        }
        expect(curCol).toBe(gc);
        expect(curRow).toBe(gr);
        expect(curCols).toBe(columns);
        expect(curRows).toBe(rows);
      }
    }
  });
});
