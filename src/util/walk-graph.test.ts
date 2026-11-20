import { describe, expect, it } from "vitest";
import { addBridges, buildWalkGraph, closestApproach, findPath, locatePoint, nearestInComponent } from "./walk-graph.js";
import type { AreaTileGrid, WokData } from "./walkmesh.js";

const DIRT = 1;
const OBSCURING = 2;

/** A 10 x 10 m tile of two triangles at height z (tile-local -5..5). */
function flat(z: number, mat = DIRT): WokData {
  return {
    verts: [[-5, -5, z], [5, -5, z], [5, 5, z], [-5, 5, z]],
    faces: [
      { v1: 0, v2: 1, v3: 2, surfaceMaterial: mat },
      { v1: 0, v2: 2, v3: 3, surfaceMaterial: mat },
    ],
  };
}

/**
 * A tile split at x = 0: the west half at z = 0, the east half a plateau at z = 4. With `ramp`, the two halves are
 * joined by a sloped strip (x -1..1); without it there is a cliff (an obscuring wall face) between them.
 */
function plateau(ramp: boolean): WokData {
  const verts: [number, number, number][] = [
    [-5, -5, 0], [-1, -5, 0], [-1, 5, 0], [-5, 5, 0], // west ground
    [1, -5, 4], [5, -5, 4], [5, 5, 4], [1, 5, 4], // east plateau
  ];
  const faces = [
    { v1: 0, v2: 1, v3: 2, surfaceMaterial: DIRT },
    { v1: 0, v2: 2, v3: 3, surfaceMaterial: DIRT },
    { v1: 4, v2: 5, v3: 6, surfaceMaterial: DIRT },
    { v1: 4, v2: 6, v3: 7, surfaceMaterial: DIRT },
    // strip between: shares the west edge (1,2) and the east edge (4,7)
    { v1: 1, v2: 4, v3: 7, surfaceMaterial: ramp ? DIRT : OBSCURING },
    { v1: 1, v2: 7, v3: 2, surfaceMaterial: ramp ? DIRT : OBSCURING },
  ];
  return { verts, faces };
}

function grid(width: number, tiles: Array<{ id: number; orientation?: number; height?: number }>): AreaTileGrid {
  return {
    width,
    height: tiles.length / width,
    tiles: tiles.map((t) => ({ id: t.id, orientation: t.orientation ?? 0, height: t.height ?? 0 })),
  };
}

describe("walk graph", () => {
  it("joins two flat tiles at the same height and finds a path across the border", () => {
    const woks: Record<string, WokData> = { a: flat(0) };
    const g = buildWalkGraph(grid(2, [{ id: 0 }, { id: 0 }]), ["a"], (m) => woks[m]);
    expect(g.components).toHaveLength(1);
    const from = locatePoint(g, 2, 5);
    const to = locatePoint(g, 18, 5);
    expect(from && to).toBeTruthy();
    const p = findPath(g, { x: 2, y: 5, z: 0, face: from!.face }, { x: 18, y: 5, z: 0, face: to!.face });
    expect(p).not.toBeNull();
    expect(p!.length).toBeGreaterThanOrEqual(16);
    expect(p!.climb).toBe(0);
  });

  it("keeps tiles at different Tile_Height levels apart, and a matching level joined", () => {
    const woks: Record<string, WokData> = { a: flat(0) };
    const apart = buildWalkGraph(grid(2, [{ id: 0 }, { id: 0, height: 1 }]), ["a"], (m) => woks[m], undefined, 2);
    expect(apart.components).toHaveLength(2);
    const joined = buildWalkGraph(grid(2, [{ id: 0, height: 1 }, { id: 0, height: 1 }]), ["a"], (m) => woks[m], undefined, 2);
    expect(joined.components).toHaveLength(1);
    expect(locatePoint(joined, 5, 5)!.z).toBe(2);
  });

  it("separates a plateau behind a cliff and reports the height gap at the closest approach", () => {
    const woks: Record<string, WokData> = { p: plateau(false) };
    const g = buildWalkGraph(grid(1, [{ id: 0 }]), ["p"], (m) => woks[m]);
    expect(g.components).toHaveLength(2);
    const low = locatePoint(g, 2, 5)!;
    const high = locatePoint(g, 8, 5)!;
    expect(low.component).not.toBe(high.component);
    expect(findPath(g, { x: 2, y: 5, z: low.z, face: low.face }, { x: 8, y: 5, z: high.z, face: high.face })).toBeNull();
    const gap = closestApproach(g, low.component, high.component)!;
    expect(gap).not.toBeNull();
    expect(Math.abs(gap.a.z - gap.b.z)).toBeCloseTo(4, 5);
    const near = nearestInComponent(g, low.component, 8, 5)!;
    expect(near.x).toBeLessThan(5);
  });

  it("connects the same plateau through a ramp and counts the climb", () => {
    const woks: Record<string, WokData> = { p: plateau(true) };
    const g = buildWalkGraph(grid(1, [{ id: 0 }]), ["p"], (m) => woks[m]);
    expect(g.components).toHaveLength(1);
    const low = locatePoint(g, 2, 5)!;
    const high = locatePoint(g, 8, 5)!;
    const p = findPath(g, { x: 2, y: 5, z: low.z, face: low.face }, { x: 8, y: 5, z: high.z, face: high.face })!;
    expect(p.climb).toBeGreaterThanOrEqual(3.99);
    expect(p.zMax).toBe(4);
  });

  it("joins a border split at different points on each side (T-junction seam)", () => {
    // West tile: east edge is one segment. East tile: its west edge is split at y = 0 (local).
    const split: WokData = {
      verts: [[-5, -5, 0], [5, -5, 0], [5, 5, 0], [-5, 5, 0], [-5, 0, 0]],
      faces: [
        { v1: 0, v2: 1, v3: 4, surfaceMaterial: DIRT },
        { v1: 4, v2: 1, v3: 2, surfaceMaterial: DIRT },
        { v1: 4, v2: 2, v3: 3, surfaceMaterial: DIRT },
      ],
    };
    const woks: Record<string, WokData> = { a: flat(0), s: split };
    const g = buildWalkGraph(grid(2, [{ id: 0 }, { id: 1 }]), ["a", "s"], (m) => woks[m]);
    expect(g.components).toHaveLength(1);
  });

  it("rotates a tile counter-clockwise: the plateau of a tile at orientation 1 lies to the north", () => {
    const woks: Record<string, WokData> = { p: plateau(false) };
    const g = buildWalkGraph(grid(1, [{ id: 0, orientation: 1 }]), ["p"], (m) => woks[m]);
    expect(locatePoint(g, 5, 8)!.z).toBe(4); // east half turned 90° CCW -> north
    expect(locatePoint(g, 5, 2)!.z).toBe(0);
  });

  it("prefers the face nearest the height hint where faces overlap, and snaps to nearby ground", () => {
    const bridge: WokData = {
      verts: [[-5, -5, 0], [5, -5, 0], [5, 5, 0], [-5, 5, 0], [-5, -1, 3], [5, -1, 3], [5, 1, 3], [-5, 1, 3]],
      faces: [
        { v1: 0, v2: 1, v3: 2, surfaceMaterial: DIRT },
        { v1: 0, v2: 2, v3: 3, surfaceMaterial: DIRT },
        { v1: 4, v2: 5, v3: 6, surfaceMaterial: DIRT },
        { v1: 4, v2: 6, v3: 7, surfaceMaterial: DIRT },
      ],
    };
    const g = buildWalkGraph(grid(1, [{ id: 0 }]), ["b"], () => bridge);
    expect(locatePoint(g, 5, 5)!.z).toBe(3); // no hint: highest
    expect(locatePoint(g, 5, 5, { zHint: 0 })!.z).toBe(0);
    expect(locatePoint(g, 5, 5, { zHint: 3 })!.z).toBe(3);

    const half: WokData = {
      verts: [[-5, -5, 0], [0, -5, 0], [0, 5, 0], [-5, 5, 0]],
      faces: [
        { v1: 0, v2: 1, v3: 2, surfaceMaterial: DIRT },
        { v1: 0, v2: 2, v3: 3, surfaceMaterial: DIRT },
      ],
    };
    const h = buildWalkGraph(grid(1, [{ id: 0 }]), ["h"], () => half);
    expect(locatePoint(h, 6, 5)).toBeNull();
    expect(locatePoint(h, 6, 5, { snapRadius: 1.5 })!.snapped).toBeCloseTo(1, 5);
  });

  it("lists tile models with no walkmesh instead of treating them as blocked", () => {
    const g = buildWalkGraph(grid(2, [{ id: 0 }, { id: 1 }]), ["a", "gone"], (m) => (m === "a" ? flat(0) : null));
    expect(g.missingModels).toEqual(["gone"]);
  });

  it("joins the rooms on both sides of a placed door (a tile's door opening has no walkmesh of its own)", () => {
    // Two tiles, each floored only up to 1 m short of the shared border: a 2 m gap where the door stands.
    const west: WokData = {
      verts: [[-5, -5, 0], [4, -5, 0], [4, 5, 0], [-5, 5, 0]],
      faces: [
        { v1: 0, v2: 1, v3: 2, surfaceMaterial: DIRT },
        { v1: 0, v2: 2, v3: 3, surfaceMaterial: DIRT },
      ],
    };
    const east: WokData = {
      verts: [[-4, -5, 0], [5, -5, 0], [5, 5, 0], [-4, 5, 0]],
      faces: [
        { v1: 0, v2: 1, v3: 2, surfaceMaterial: DIRT },
        { v1: 0, v2: 2, v3: 3, surfaceMaterial: DIRT },
      ],
    };
    const woks: Record<string, WokData> = { w: west, e: east };
    const g = buildWalkGraph(grid(2, [{ id: 0 }, { id: 1 }]), ["w", "e"], (m) => woks[m]);
    expect(g.components).toHaveLength(2);
    expect(addBridges(g, [{ x: 10, y: 5, z: 0, radius: 2.5 }])).toBe(1);
    expect(g.components).toHaveLength(1);
    // A door far from either floor joins nothing.
    const g2 = buildWalkGraph(grid(2, [{ id: 0 }, { id: 1 }]), ["w", "e"], (m) => woks[m]);
    expect(addBridges(g2, [{ x: 10, y: 5, z: 6, radius: 2.5 }])).toBe(0);
  });
});
