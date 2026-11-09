import { describe, expect, it } from "vitest";
import type { AreaTileGrid, WokData } from "./walkmesh.js";
import {
  analyzeWalkmesh, findCornerIssues, findSeamIssues, findSlivers, nearestTileCorner, rotateToWorld, triangleMetrics,
} from "./walkmesh-analysis.js";
import { rotateForOrientation } from "./walkmesh.js";

const FLAT: WokData = {
  verts: [[-5, -5, 0], [5, -5, 0], [-5, 5, 0], [5, 5, 0]],
  faces: [
    { v1: 0, v2: 1, v3: 2, surfaceMaterial: 3 },
    { v1: 3, v2: 2, v3: 1, surfaceMaterial: 3 },
  ],
};

/** FLAT with a tiny walkable sliver replacing the SW corner of the tile (the rest still covered). */
const SLIVER: WokData = {
  verts: [[-5, -5, 0], [5, -5, 0], [-5, 5, 0], [5, 5, 0], [-4.99, -5, 0], [-5, -4.99, 0]],
  faces: [
    { v1: 0, v2: 4, v3: 5, surfaceMaterial: 3 },
    { v1: 4, v2: 1, v3: 5, surfaceMaterial: 3 },
    { v1: 5, v2: 1, v3: 2, surfaceMaterial: 3 },
    { v1: 3, v2: 2, v3: 1, surfaceMaterial: 3 },
  ],
};

/** Raised copy of FLAT (a 1 m step relative to FLAT). */
const RAISED: WokData = { ...FLAT, verts: FLAT.verts.map(([x, y]) => [x, y, 1] as [number, number, number]) };

const grid = (w: number, h: number, ids: number[]): AreaTileGrid => ({
  width: w, height: h, tiles: ids.map((id) => ({ id, orientation: 0, height: 0 })),
});
const woks: Record<string, WokData> = { flat: FLAT, sliver: SLIVER, raised: RAISED };
const ctx = (g: AreaTileGrid, models: string[]) => ({ grid: g, tileModels: models, getWok: (m: string) => woks[m] });

describe("geometry helpers", () => {
  it("rotateToWorld inverts rotateForOrientation", () => {
    for (let o = 0; o < 4; o++) {
      const [wx, wy] = rotateToWorld(2, 3, o);
      const [lx, ly] = rotateForOrientation(wx, wy, o);
      expect(lx).toBeCloseTo(2);
      expect(ly).toBeCloseTo(3);
    }
  });

  it("triangleMetrics gives area and shortest altitude", () => {
    const t = triangleMetrics([0, 0], [4, 0], [0, 3]);
    expect(t.area).toBeCloseTo(6);
    expect(t.minAltitude).toBeCloseTo(2.4);
  });

  it("nearestTileCorner finds the closest multiple of 10", () => {
    const c = nearestTileCorner(9.9, 0.2);
    expect([c.x, c.y]).toEqual([10, 0]);
    expect(c.distance).toBeCloseTo(Math.hypot(0.1, 0.2));
  });
});

describe("findSlivers", () => {
  it("flags the tiny corner triangle and nothing on a clean tile", () => {
    const clean = findSlivers(ctx(grid(1, 1, [0]), ["flat"]));
    expect(clean.slivers).toHaveLength(0);
    expect(clean.walkableTriangles).toBe(2);

    const dirty = findSlivers(ctx(grid(1, 1, [0]), ["sliver"]));
    expect(dirty.slivers.length).toBeGreaterThanOrEqual(1);
    expect(dirty.slivers[0].nearCorner).toBe(true);
    expect(dirty.slivers[0].nearestCorner).toMatchObject({ x: 0, y: 0 });
  });

  it("places slivers in world space using the tile orientation", () => {
    const g = grid(1, 1, [0]);
    g.tiles[0].orientation = 2;  // SW corner of the mesh ends up in the NE corner of the tile
    const r = findSlivers(ctx(g, ["sliver"]));
    expect(r.slivers[0].nearestCorner).toMatchObject({ x: 10, y: 10 });
  });

  it("counts tiles without a walkmesh", () => {
    const r = findSlivers(ctx(grid(1, 1, [0]), ["missing"]));
    expect(r.tilesWithoutWalkmesh).toBe(1);
  });
});

describe("findSeamIssues", () => {
  it("is silent for matching flat tiles", () => {
    expect(findSeamIssues(ctx(grid(2, 2, [0, 0, 0, 0]), ["flat"]))).toEqual([]);
  });

  it("reports a height step along the whole shared edge as one merged run", () => {
    const r = findSeamIssues(ctx(grid(2, 1, [0, 1]), ["flat", "raised"]));
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe("height-step");
    expect(r[0].between.edge).toBe("east");
    expect(r[0].length).toBeCloseTo(10.1, 1);
  });
});

describe("findCornerIssues", () => {
  it("is silent when all four tiles line up", () => {
    expect(findCornerIssues(ctx(grid(2, 2, [0, 0, 0, 0]), ["flat"]))).toEqual([]);
  });

  it("reports a height step at a corner between mismatched tiles", () => {
    const r = findCornerIssues(ctx(grid(2, 2, [0, 1, 0, 0]), ["flat", "raised"]));
    expect(r.some((f) => f.kind === "height-step")).toBe(true);
    expect(r[0].corner).toEqual({ x: 10, y: 10 });
  });
});

describe("analyzeWalkmesh", () => {
  it("combines all three checks", () => {
    const r = analyzeWalkmesh(ctx(grid(2, 2, [1, 0, 0, 0]), ["flat", "sliver"]));
    expect(r.tilesAnalyzed).toBe(4);
    expect(r.slivers.length).toBeGreaterThan(0);
    expect(r.seams).toEqual([]);
  });
});
