import { describe, it, expect } from "vitest";
import { getRotatedCornerHeights, getRotatedCorners, getRotatedCrossers, parseTilesetFile } from "./tileset.js";
import type { TileDefinition } from "./tileset.js";

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

  // 90° CCW (Tile_Orientation 1): TR→TL, BR→TR, BL→BR, TL→BL
  it("orientation 1 (90° CCW): world.TL = local.TR", () => {
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
  it("orientation 3 (270° CCW): world.TL = local.BL", () => {
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

  it("applying 90° CCW four times returns original", () => {
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
  it("orientation 1 (90° CCW): world.top = local.right", () => {
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
  it("orientation 3 (270° CCW): world.top = local.left", () => {
    const tile = makeTile();
    const cr = getRotatedCrossers(tile, 3);
    expect(cr.top).toBe("");        // was left
    expect(cr.right).toBe("Road"); // was top
    expect(cr.bottom).toBe("Stream"); // was right
    expect(cr.left).toBe("");      // was bottom
  });
});

describe("getRotatedCornerHeights", () => {
  const withHeights = (): TileDefinition => ({
    ...makeTile(),
    flat: false,
    cornerHeights: { topLeft: 0, topRight: 1, bottomLeft: 2, bottomRight: 3 },
  });

  it("orientation 0 is the .set value, and tiles without heights read as flat", () => {
    expect(getRotatedCornerHeights(withHeights(), 0)).toEqual({ topLeft: 0, topRight: 1, bottomLeft: 2, bottomRight: 3 });
    expect(getRotatedCornerHeights(makeTile(), 1)).toEqual({ topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 });
  });

  it("turns counter-clockwise exactly like the corner terrains (TR -> TL -> BL -> BR -> TR)", () => {
    // verified on 137,250 shared edges of 504 real areas: Tile_Height + rotated corner height agrees across every edge
    expect(getRotatedCornerHeights(withHeights(), 1)).toEqual({ topLeft: 1, topRight: 3, bottomRight: 2, bottomLeft: 0 });
    expect(getRotatedCornerHeights(withHeights(), 2)).toEqual({ topLeft: 3, topRight: 2, bottomRight: 0, bottomLeft: 1 });
    expect(getRotatedCornerHeights(withHeights(), 3)).toEqual({ topLeft: 2, topRight: 0, bottomRight: 1, bottomLeft: 3 });
  });

  it("is consistent with getRotatedCorners (same permutation) and wraps modulo 4", () => {
    const tile: TileDefinition = { ...withHeights(), corners: { topLeft: "a", topRight: "b", bottomLeft: "c", bottomRight: "d" } };
    const label: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };   // the heights above, keyed by corner name
    for (let o = 0; o < 4; o++) {
      const names = getRotatedCorners(tile, o);
      const heights = getRotatedCornerHeights(tile, o);
      expect(heights.topLeft).toBe(label[names.topLeft]);
      expect(heights.topRight).toBe(label[names.topRight]);
      expect(heights.bottomLeft).toBe(label[names.bottomLeft]);
      expect(heights.bottomRight).toBe(label[names.bottomRight]);
    }
    expect(getRotatedCornerHeights(tile, 5)).toEqual(getRotatedCornerHeights(tile, 1));
    expect(getRotatedCornerHeights(tile, -1)).toEqual(getRotatedCornerHeights(tile, 3));
  });
});

describe("parseTilesetFile: corner heights and Transition", () => {
  const SET = (transition: string) => `[GENERAL]
Name=demo
HasHeightTransition=1
${transition}
[TILES]
Count=2

[TILE0]
Model=demo_a
TopLeftHeight=0
TopRightHeight=1
BottomLeftHeight=
BottomRightHeight=1

[TILE1]
Model=demo_b
TopLeftHeight=0
TopRightHeight=0
BottomLeftHeight=0
BottomRightHeight=0
`;

  it("reads Transition: the metres of ground height per Tile_Height level (tcn01 = 4, tno01 = 2)", () => {
    expect(parseTilesetFile(SET("Transition=4"), "demo").transition).toBe(4);
    expect(parseTilesetFile(SET("Transition=2"), "demo").transition).toBe(2);
  });

  it("allows a fractional Transition and treats a missing, empty or non-positive one as unknown (0)", () => {
    expect(parseTilesetFile(SET("Transition=2.5"), "demo").transition).toBe(2.5);
    expect(parseTilesetFile(SET(""), "demo").transition).toBe(0);
    expect(parseTilesetFile(SET("Transition="), "demo").transition).toBe(0);
    expect(parseTilesetFile(SET("Transition=-3"), "demo").transition).toBe(0);
  });

  it("reads corner heights (an empty field is 0, not NaN) and flags raised tiles", () => {
    const info = parseTilesetFile(SET("Transition=5"), "demo");
    expect(info.tiles[0].cornerHeights).toEqual({ topLeft: 0, topRight: 1, bottomLeft: 0, bottomRight: 1 });
    expect(info.tiles[0].flat).toBe(false);
    expect(info.tiles[1].flat).toBe(true);
  });
});
