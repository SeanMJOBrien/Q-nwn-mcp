import { describe, expect, it } from "vitest";
import {
  CELL_BLOCKED,
  CELL_UNKNOWN,
  CELL_WALKABLE,
  type WalkGrid,
  buildTileRaster,
  buildWalkGrid,
  findOpenGround,
  walkGridAt,
} from "./walkgrid.js";
import { type AreaTileGrid, type WokData, parseWokFile } from "./walkmesh.js";

/** Upper-right half walkable (x + y > 0), lower-left half blocked. */
const HALF_WOK = parseWokFile(`node aabb wok
  position 0.0 0.0 0.0
  verts 4
    5.0 5.0 0.0
    -5.0 5.0 0.0
    5.0 -5.0 0.0
    -5.0 -5.0 0.0
  faces 2
    0 1 2  1  0 1 2  3
    3 2 1  1  3 2 1  7
`);

/** Fully walkable tile. */
const FLAT_WOK: WokData = {
  verts: [[-5, -5, 0], [5, -5, 0], [-5, 5, 0], [5, 5, 0]],
  faces: [
    { v1: 0, v2: 1, v3: 2, surfaceMaterial: 3 },
    { v1: 3, v2: 2, v3: 1, surfaceMaterial: 3 },
  ],
};

const count = (cells: Uint8Array, v: number) => cells.reduce((n, c) => n + (c === v ? 1 : 0), 0);

describe("buildTileRaster", () => {
  it("rasterises a half-walkable tile into roughly half walkable cells", () => {
    const r = buildTileRaster(HALF_WOK, 0);
    expect(r).toHaveLength(100);
    expect(count(r, CELL_WALKABLE)).toBeGreaterThanOrEqual(45);
    expect(count(r, CELL_WALKABLE)).toBeLessThanOrEqual(55);
    expect(r[9 * 10 + 9]).toBe(CELL_WALKABLE);  // north-east corner
    expect(r[0]).toBe(CELL_BLOCKED);            // south-west corner
  });

  it("applies the orientation counter-clockwise: the walkable half moves NE -> NW -> SW -> SE", () => {
    const ne = 9 * 10 + 9, nw = 9 * 10 + 0, sw = 0, se = 0 * 10 + 9;
    const at = (o: number) => buildTileRaster(HALF_WOK, o);
    // the half's apex cell
    expect(at(0)[ne]).toBe(CELL_WALKABLE);
    expect(at(1)[nw]).toBe(CELL_WALKABLE);
    expect(at(2)[sw]).toBe(CELL_WALKABLE);
    expect(at(3)[se]).toBe(CELL_WALKABLE);
    expect(at(1)[se]).toBe(CELL_BLOCKED);
  });

  it("marks tiles without a walkmesh as unknown", () => {
    expect(count(buildTileRaster(null, 0), CELL_UNKNOWN)).toBe(100);
  });
});

describe("buildWalkGrid", () => {
  const tiles: AreaTileGrid = {
    width: 3,
    height: 2,
    tiles: [
      { id: 0, orientation: 0, height: 0 }, { id: 0, orientation: 0, height: 0 }, { id: 1, orientation: 0, height: 0 },
      { id: 0, orientation: 0, height: 0 }, { id: 2, orientation: 0, height: 0 }, { id: 0, orientation: 0, height: 0 },
    ],
  };
  const models = ["flat", "half", "missing"];
  const lookup = (m: string) => (m === "flat" ? FLAT_WOK : m === "half" ? HALF_WOK : null);

  it("lays tiles out south-west first, 10 cells per tile, and flags missing walkmeshes as unknown", () => {
    const g = buildWalkGrid(tiles, models, lookup);
    expect(g.widthM).toBe(30);
    expect(g.heightM).toBe(20);
    expect(walkGridAt(g, 5, 5)).toBe(CELL_WALKABLE);       // tile (0,0) flat
    expect(walkGridAt(g, 25, 5)).toBe(CELL_WALKABLE);      // tile (2,0) is the half tile, NE corner walkable
    expect(walkGridAt(g, 20.5, 0.5)).toBe(CELL_BLOCKED);   // ...SW corner of that tile blocked
    expect(walkGridAt(g, 15, 15)).toBe(CELL_UNKNOWN);      // tile (1,1) has no walkmesh
    expect(walkGridAt(g, -1, 5)).toBe(CELL_BLOCKED);       // outside the area
    expect(walkGridAt(g, 5, 25)).toBe(CELL_BLOCKED);
  });

  it("rasterises each distinct (model, orientation) only once", () => {
    let calls = 0;
    const counting = (m: string) => {
      calls++;
      return lookup(m);
    };
    buildWalkGrid(tiles, models, counting);
    expect(calls).toBe(3); // flat, half, missing: not once per tile (6)
  });
});

function gridFrom(rows: string[]): WalkGrid {
  // rows are given north-first for readability; '#' blocked, '.' walkable
  const heightM = rows.length;
  const widthM = rows[0].length;
  const cells = new Uint8Array(widthM * heightM);
  rows.forEach((row, i) => {
    const y = heightM - 1 - i;
    for (let x = 0; x < widthM; x++) cells[y * widthM + x] = row[x] === "." ? CELL_WALKABLE : CELL_BLOCKED;
  });
  return { widthM, heightM, cells };
}

describe("findOpenGround", () => {
  const g = gridFrom([
    "....................",
    "....................",
    "....#...............",
    "....................",
    "....................",
    "....................",
    "..............####..",
    "..............####..",
    "....................",
    "....................",
  ]);

  it("returns spots whose whole footprint is walkable, nearest to the target first", () => {
    const res = findOpenGround(g, { radius: 1, near: { x: 4.5, y: 7.5 }, maxResults: 3, minFraction: 1 });
    expect(res.length).toBeGreaterThan(0);
    for (const r of res) {
      expect(r.walkableFraction).toBe(1);
      // the whole 3x3 footprint is walkable
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) expect(walkGridAt(g, r.x + dx, r.y + dy)).toBe(CELL_WALKABLE);
      }
    }
    for (let i = 1; i < res.length; i++) expect(res[i].distance).toBeGreaterThanOrEqual(res[i - 1].distance);
    // the obstacle at (4,7) rules out the cells whose 3x3 footprint would touch it
    expect(res.some((r) => Math.abs(r.x - 4.5) <= 1 && Math.abs(r.y - 7.5) <= 1)).toBe(false);
  });

  it("respects bounds, separation and the maximum number of results", () => {
    const res = findOpenGround(g, { radius: 1, bounds: { x1: 10, y1: 0, x2: 20, y2: 10 }, maxResults: 4, minSeparation: 4, minFraction: 1 });
    expect(res.length).toBeLessThanOrEqual(4);
    for (const r of res) {
      expect(r.x).toBeGreaterThanOrEqual(10);
      expect(r.x).toBeLessThan(20);
    }
    for (let i = 0; i < res.length; i++) {
      for (let j = i + 1; j < res.length; j++) {
        expect(Math.hypot(res[i].x - res[j].x, res[i].y - res[j].y)).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("finds nothing when the footprint cannot fit", () => {
    expect(findOpenGround(g, { radius: 12 })).toEqual([]);
  });

  it("tolerates a stray blocked cell below the minimum fraction", () => {
    const strict = findOpenGround(g, { radius: 2, near: { x: 4.5, y: 7.5 }, minFraction: 1, maxResults: 1 })[0];
    const lenient = findOpenGround(g, { radius: 2, near: { x: 4.5, y: 7.5 }, minFraction: 0.95, maxResults: 1 })[0];
    expect(lenient.distance).toBeLessThanOrEqual(strict.distance);
  });
});
