import { describe, it, expect } from "vitest";
import {
  type AreaTileGrid,
  type WokData,
  DEFAULT_TILE_HEIGHT_STEP,
  locateTile,
  parseWokFile,
  pointInTriangle2D,
  probeAreaPosition,
  probeTileLocal,
  rotateForOrientation,
  tileHeightStep,
} from "./walkmesh.js";

describe("pointInTriangle2D", () => {
  // Simple right triangle with vertices at (0,0), (4,0), (0,4)
  const ax = 0, ay = 0;
  const bx = 4, by = 0;
  const cx = 0, cy = 4;

  it("detects a point clearly inside the triangle", () => {
    expect(pointInTriangle2D(1, 1, ax, ay, bx, by, cx, cy)).toBe(true);
  });

  it("detects a point clearly outside the triangle", () => {
    expect(pointInTriangle2D(3, 3, ax, ay, bx, by, cx, cy)).toBe(false);
  });

  it("detects a point on a vertex", () => {
    expect(pointInTriangle2D(0, 0, ax, ay, bx, by, cx, cy)).toBe(true);
  });

  it("detects a point on an edge (midpoint of hypotenuse)", () => {
    expect(pointInTriangle2D(2, 2, ax, ay, bx, by, cx, cy)).toBe(true);
  });

  it("detects a point just outside the hypotenuse", () => {
    expect(pointInTriangle2D(2.1, 2.1, ax, ay, bx, by, cx, cy)).toBe(false);
  });

  it("returns false for a degenerate (zero-area) triangle", () => {
    // All three points collinear
    expect(pointInTriangle2D(1, 1, 0, 0, 2, 2, 4, 4)).toBe(false);
  });

  it("works for a unit square diagonal triangle", () => {
    // Triangle (0,0), (1,0), (0,1)
    expect(pointInTriangle2D(0.2, 0.2, 0, 0, 1, 0, 0, 1)).toBe(true);
    expect(pointInTriangle2D(0.6, 0.6, 0, 0, 1, 0, 0, 1)).toBe(false);
  });
});

describe("rotateForOrientation", () => {
  // Orientation semantics (inverse rotation, world→local):
  //   0 = identity
  //   1 = inverse of 90° CW → (y, -x)
  //   2 = 180° → (-x, -y)
  //   3 = inverse of 270° CW → (-y, x)

  it("orientation 0 is identity", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 0);
    expect(rx).toBe(3);
    expect(ry).toBe(4);
  });

  it("orientation 1 applies inverse 90° CW: (x,y) → (y,-x)", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 1);
    expect(rx).toBe(4);
    expect(ry).toBe(-3);
  });

  it("orientation 2 applies 180°: (x,y) → (-x,-y)", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 2);
    expect(rx).toBe(-3);
    expect(ry).toBe(-4);
  });

  it("orientation 3 applies inverse 270° CW: (x,y) → (-y,x)", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 3);
    expect(rx).toBe(-4);
    expect(ry).toBe(3);
  });

  it("orientation wraps modulo 4", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 4); // same as 0
    expect(rx).toBe(3);
    expect(ry).toBe(4);
  });

  it("identity on (0,0) for all orientations", () => {
    for (let o = 0; o < 4; o++) {
      const [rx, ry] = rotateForOrientation(0, 0, o);
      // Use + 0 to normalize -0 to +0 before comparison
      expect(rx + 0).toBe(0);
      expect(ry + 0).toBe(0);
    }
  });

  it("double-applying orientation 2 is identity", () => {
    const [rx, ry] = rotateForOrientation(3, 4, 2);
    const [rx2, ry2] = rotateForOrientation(rx, ry, 2);
    expect(rx2).toBe(3);
    expect(ry2).toBe(4);
  });
});


// ─── Real-data derived fixtures ─────────────────────────────────────────────

/**
 * Shaped like a vanilla tin01 walkmesh: the vertices sit at z = -1.5 and the node's `position` adds +1.5 back,
 * so the true floor is at 0. (In the real game data 57% of walkmeshes have a non-zero node z.)
 * Face 0 (grass, walkable) is the upper-right half (x + y > 0), face 1 (nonwalk) the lower-left half.
 */
const OFFSET_WOK = `# wok file
beginwalkmeshgeom demo
node aabb wok
  parent demo
  position 0.0 0.0 1.5
  multimaterial 3
    Dirt
    Obscuring
    Grass
  verts 4
    5.0 5.0 -1.5
    -5.0 5.0 -1.5
    5.0 -5.0 -1.5
    -5.0 -5.0 -1.5
  faces 2
    0 1 2  1  0 1 2  3
    3 2 1  1  3 2 1  7
  tverts 0
endnode
endwalkmeshgeom demo
`;

describe("parseWokFile node offset", () => {
  it("adds the node position back to every vertex (so Z is the true floor height)", () => {
    const wok = parseWokFile(OFFSET_WOK);
    expect(wok.verts).toHaveLength(4);
    expect(wok.verts[0]).toEqual([5, 5, 0]);
    expect(wok.verts[3]).toEqual([-5, -5, 0]);
    expect(wok.offset).toEqual([0, 0, 1.5]);
    expect(wok.faces.map((f) => f.surfaceMaterial)).toEqual([3, 7]);
  });

  it("handles the scientific-notation noise real files carry (1.2207e-006)", () => {
    const wok = parseWokFile(OFFSET_WOK.replace("position 0.0 0.0 1.5", "position 1.2207e-006 -9.15527e-007 2.01771"));
    expect(wok.offset![2]).toBeCloseTo(2.01771, 5);
    expect(wok.verts[0][2]).toBeCloseTo(-1.5 + 2.01771, 5);
    expect(wok.verts[0][0]).toBeCloseTo(5, 5);
  });

  it("falls back to a zero offset when the file has no position line", () => {
    const wok = parseWokFile(OFFSET_WOK.replace("  position 0.0 0.0 1.5\n", ""));
    expect(wok.offset).toEqual([0, 0, 0]);
    expect(wok.verts[0]).toEqual([5, 5, -1.5]);
  });

  it("uses the position of the node that actually contains the vertices", () => {
    const text = `node dummy first
  position 0.0 0.0 99.0
endnode
${OFFSET_WOK}`;
    expect(parseWokFile(text).offset).toEqual([0, 0, 1.5]);
  });
});

describe("probeTileLocal", () => {
  const wok: WokData = parseWokFile(OFFSET_WOK);

  it("reports the true floor height: mesh z + node offset (the old code returned -1.5 here)", () => {
    const r = probeTileLocal(wok, 3, 1, 0, 0);
    expect(r.walkable).toBe(true);
    expect(r.z).toBeCloseTo(0, 6);
    expect(r.material).toBe("Grass");
  });

  it("adds heightStep metres per Tile_Height level (default 5)", () => {
    expect(DEFAULT_TILE_HEIGHT_STEP).toBe(5);
    expect(probeTileLocal(wok, 3, 1, 0, 2).z).toBeCloseTo(10, 6);
    expect(probeTileLocal(wok, 3, 1, 0, 1).z).toBeCloseTo(5, 6);
  });

  it("uses the tileset's own step: tcn01 has Transition=4, tno01 has Transition=2 (flat 5 was wrong on both)", () => {
    expect(probeTileLocal(wok, 3, 1, 0, 2, undefined, 4).z).toBeCloseTo(8, 6);
    expect(probeTileLocal(wok, 3, 1, 0, 3, undefined, 2).z).toBeCloseTo(6, 6);
    expect(probeTileLocal(wok, 3, 1, 0, 0, undefined, 4).z).toBeCloseTo(0, 6);   // level 0 is unaffected by the step
  });

  it("Tile_Orientation turns the tile COUNTER-clockwise (verified on real areas)", () => {
    // Unrotated, the walkable half is the upper-right one (x + y > 0).
    // After n quarter-turns CCW it is: 1 -> upper-left (y > x), 2 -> lower-left (x + y < 0), 3 -> lower-right (x > y).
    const walkable = (x: number, y: number, o: number) => probeTileLocal(wok, x, y, o, 0).walkable;
    expect(walkable(3, 1, 0)).toBe(true);
    expect(walkable(-3, -1, 0)).toBe(false);
    expect(walkable(-3, 1, 1)).toBe(true);    // upper-left
    expect(walkable(3, -1, 1)).toBe(false);
    expect(walkable(-3, -1, 2)).toBe(true);   // lower-left
    expect(walkable(3, 1, 2)).toBe(false);
    expect(walkable(3, -1, 3)).toBe(true);    // lower-right
    expect(walkable(-3, 1, 3)).toBe(false);
  });

  it("reports blocking material for the blocked half and an error outside any face", () => {
    const r = probeTileLocal(wok, -3, -1, 0, 0);
    expect(r.walkable).toBe(false);
    expect(r.material).toBe("Nonwalk");
    expect(probeTileLocal(wok, 50, 50, 0, 0).error).toMatch(/not covered/);
  });

  it("prefers a walkable face over a higher blocking one only when it is the highest WALKABLE face", () => {
    // bridge: walkable face at z 4 over a blocking face at z 0
    const bridge: WokData = {
      verts: [[-5, -5, 0], [5, -5, 0], [-5, 5, 0], [-5, -5, 4], [5, -5, 4], [-5, 5, 4]],
      faces: [
        { v1: 0, v2: 1, v3: 2, surfaceMaterial: 7 },
        { v1: 3, v2: 4, v3: 5, surfaceMaterial: 3 },
      ],
    };
    const r = probeTileLocal(bridge, -2, -2, 0, 0);
    expect(r.walkable).toBe(true);
    expect(r.z).toBeCloseTo(4, 6);
  });
});

describe("tileHeightStep", () => {
  it("is the tileset's Transition when it is a positive number", () => {
    expect(tileHeightStep({ transition: 5 })).toBe(5);
    expect(tileHeightStep({ transition: 4 })).toBe(4);
    expect(tileHeightStep({ transition: 2 })).toBe(2);
    expect(tileHeightStep({ transition: 2.5 })).toBe(2.5);
  });

  it("falls back to the outdoor default (5) when the value is missing, zero, negative or not finite", () => {
    expect(tileHeightStep(undefined)).toBe(5);
    expect(tileHeightStep(null)).toBe(5);
    expect(tileHeightStep({})).toBe(5);
    expect(tileHeightStep({ transition: 0 })).toBe(5);
    expect(tileHeightStep({ transition: -3 })).toBe(5);
    expect(tileHeightStep({ transition: Number.NaN })).toBe(5);
  });
});

describe("locateTile / probeAreaPosition", () => {
  const wok = parseWokFile(OFFSET_WOK);
  // 2 x 1 area: tile 0 (model "demo", orientation 0, height 0), tile 1 (model "demo", orientation 1, height 1)
  const grid: AreaTileGrid = {
    width: 2,
    height: 1,
    tiles: [
      { id: 0, orientation: 0, height: 0 },
      { id: 0, orientation: 1, height: 1 },
    ],
  };
  const models = ["demo"];
  const lookup = (m: string) => (m === "demo" ? wok : null);

  it("row-major from the south-west corner: index = tileY * width + tileX", () => {
    const loc = locateTile({ width: 3, height: 2, tiles: Array.from({ length: 6 }, (_, i) => ({ id: i, orientation: 0, height: 0 })) }, 25, 15);
    expect("error" in loc).toBe(false);
    if (!("error" in loc)) {
      expect(loc.tileX).toBe(2);
      expect(loc.tileY).toBe(1);
      expect(loc.tile.id).toBe(5); // 1 * 3 + 2
    }
  });

  it("probes through tile -> model -> wok with the right orientation, height and offset", () => {
    const a = probeAreaPosition(grid, models, lookup, 8, 6);          // tile 0, local (3, 1): walkable
    expect(a.walkable).toBe(true);
    expect(a.z).toBeCloseTo(0, 6);
    const b = probeAreaPosition(grid, models, lookup, 12, 6);         // tile 1, local (-3, 1), orientation 1: walkable
    expect(b.walkable).toBe(true);
    expect(b.z).toBeCloseTo(5, 6);                                    // tile height 1 -> +5 m
    expect(b.heightStep).toBe(5);
  });

  it("scales the tile-height lift by the tileset's step and reports the step it used", () => {
    const b = probeAreaPosition(grid, models, lookup, 12, 6, undefined, 4);
    expect(b.z).toBeCloseTo(4, 6);                                    // tile height 1 x Transition 4
    expect(b.heightStep).toBe(4);
    expect(probeAreaPosition(grid, models, lookup, 8, 6, undefined, 4).z).toBeCloseTo(0, 6);
  });

  it("reports bounds, unknown tile ids and missing walkmeshes as errors", () => {
    expect(probeAreaPosition(grid, models, lookup, -1, 3).error).toMatch(/outside area bounds/);
    expect(probeAreaPosition(grid, models, lookup, 25, 3).error).toMatch(/outside area bounds/);
    expect(probeAreaPosition(grid, [], lookup, 5, 5).error).toMatch(/not found in tileset/);
    expect(probeAreaPosition(grid, models, () => null, 5, 5).error).toMatch(/wok not found/);
  });
});
