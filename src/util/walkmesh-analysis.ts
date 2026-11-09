/**
 * Walkmesh pathing diagnostics: finds the small defects that make creatures snag at tile corners.
 *
 * Three independent checks, all pure (no I/O) so they can be unit tested with synthetic walkmeshes:
 *   - slivers: walkable triangles that are tiny or needle-thin (area / shortest altitude), flagged when
 *     they sit near a tile corner or edge, which is where adjacent tile walkmeshes have to line up;
 *   - seams: samples both sides of every shared tile edge and reports runs where one side is walkable and
 *     the other is not, or where the ground height differs;
 *   - corners: at every interior tile corner probes the corner, the four edge points and the four
 *     quadrants at a creature-sized radius, and reports corners that are open on two adjacent quadrants
 *     but blocked or stepped in between.
 *
 * These are geometric heuristics, not a reimplementation of the engine's pathfinder (which also uses the
 * .wok adjacency data); a reported spot is a strong lead, not proof. Spatial conventions are those of
 * walkmesh.ts: world metres, +X east, +Y north, 10 m tiles, Tile_Orientation counter-clockwise.
 */

import type { TwoDATable } from "../types/module.js";
import {
  DEFAULT_TILE_HEIGHT_STEP,
  TILE_SIZE,
  type AreaTileGrid,
  type WokLookup,
  isMaterialWalkable,
  getMaterialName,
  probeTileLocal,
} from "./walkmesh.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AnalysisContext {
  grid: AreaTileGrid;
  tileModels: readonly string[];
  getWok: WokLookup;
  surfacemat?: TwoDATable;
  heightStep?: number;
}

export interface WalkmeshAnalysisOptions {
  /** Walkable triangles smaller than this (m^2) are slivers. Default 0.1. */
  minArea?: number;
  /** Walkable triangles whose shortest altitude is below this (m) are slivers. Default 0.05. */
  minAltitude?: number;
  /** A sliver within this distance (m) of a tile corner is flagged nearCorner. Default 1.5. */
  cornerRadius?: number;
  /** Distance (m) along a tile edge sampled on each side of a seam. Default 0.1. */
  seamStep?: number;
  /** Ground height difference (m) across a seam/corner that counts as a step. Default 0.15. */
  maxStep?: number;
  /** Creature-sized radius (m) used for the corner crossing probes. Default 0.5. */
  clearance?: number;
}

export interface Triangle2D {
  /** World coordinates [x, y, z]. */
  verts: [[number, number, number], [number, number, number], [number, number, number]];
  area: number;
  minAltitude: number;
}

export interface SliverFinding {
  tile: { x: number; y: number; index: number; model: string };
  face: number;
  material: string;
  area: number;
  minAltitude: number;
  centroid: { x: number; y: number; z: number };
  nearestCorner: { x: number; y: number; distance: number };
  nearestEdgeDistance: number;
  nearCorner: boolean;
  verts: Triangle2D["verts"];
}

export interface SeamFinding {
  kind: "walkable-mismatch" | "height-step";
  /** "east" = the seam between tile (x, y) and tile (x+1, y); "north" = between (x, y) and (x, y+1). */
  between: { a: { x: number; y: number }; b: { x: number; y: number }; edge: "east" | "north" };
  from: { x: number; y: number };
  to: { x: number; y: number };
  length: number;
  detail: string;
}

export interface CornerFinding {
  corner: { x: number; y: number };
  tiles: Array<{ x: number; y: number }>;
  kind: "blocked-bridge" | "blocked-center" | "height-step";
  detail: string;
}

export interface WalkmeshAnalysis {
  tilesAnalyzed: number;
  tilesWithoutWalkmesh: number;
  walkableTriangles: number;
  slivers: SliverFinding[];
  seams: SeamFinding[];
  corners: CornerFinding[];
}

// ─── Geometry ───────────────────────────────────────────────────────────────

/** Inverse of rotateForOrientation: tile-local (unrotated) -> tile-centred world offset. CCW by n x 90 degrees. */
export function rotateToWorld(x: number, y: number, orientation: number): [number, number] {
  switch (((orientation % 4) + 4) % 4) {
    case 1: return [-y, x];
    case 2: return [-x, -y];
    case 3: return [y, -x];
    default: return [x, y];
  }
}

/** Area and shortest altitude (2 x area / longest edge) of a triangle, from its x/y coordinates. */
export function triangleMetrics(
  a: readonly number[], b: readonly number[], c: readonly number[],
): { area: number; minAltitude: number } {
  const area = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2;
  const longest = Math.max(
    Math.hypot(b[0] - a[0], b[1] - a[1]),
    Math.hypot(c[0] - b[0], c[1] - b[1]),
    Math.hypot(a[0] - c[0], a[1] - c[1]),
  );
  return { area, minAltitude: longest > 0 ? (2 * area) / longest : 0 };
}

/** Distance (m) from a world point to the nearest tile corner (multiples of TILE_SIZE) and to the nearest tile edge. */
export function nearestTileCorner(x: number, y: number): { x: number; y: number; distance: number; edgeDistance: number } {
  const cx = Math.round(x / TILE_SIZE) * TILE_SIZE;
  const cy = Math.round(y / TILE_SIZE) * TILE_SIZE;
  const dx = Math.abs(x - cx), dy = Math.abs(y - cy);
  return { x: cx, y: cy, distance: Math.hypot(dx, dy), edgeDistance: Math.min(dx, dy) };
}

// ─── Sliver detection ───────────────────────────────────────────────────────

export function findSlivers(ctx: AnalysisContext, opts: WalkmeshAnalysisOptions = {}): {
  slivers: SliverFinding[]; walkableTriangles: number; tilesAnalyzed: number; tilesWithoutWalkmesh: number;
} {
  const minArea = opts.minArea ?? 0.1;
  const minAltitude = opts.minAltitude ?? 0.05;
  const cornerRadius = opts.cornerRadius ?? 1.5;
  const lift = (h: number) => h * (ctx.heightStep ?? DEFAULT_TILE_HEIGHT_STEP);

  const slivers: SliverFinding[] = [];
  let walkableTriangles = 0, tilesAnalyzed = 0, tilesWithoutWalkmesh = 0;

  for (let index = 0; index < ctx.grid.tiles.length; index++) {
    const tile = ctx.grid.tiles[index];
    const tx = index % ctx.grid.width, ty = Math.floor(index / ctx.grid.width);
    const model = ctx.tileModels[tile.id];
    const wok = model ? ctx.getWok(model) : null;
    if (!wok) { tilesWithoutWalkmesh++; continue; }
    tilesAnalyzed++;

    const centreX = tx * TILE_SIZE + TILE_SIZE / 2, centreY = ty * TILE_SIZE + TILE_SIZE / 2;
    wok.faces.forEach((face, faceIndex) => {
      if (!isMaterialWalkable(face.surfaceMaterial, ctx.surfacemat)) return;
      const lv = [wok.verts[face.v1], wok.verts[face.v2], wok.verts[face.v3]];
      if (lv.some((v) => !v)) return;
      walkableTriangles++;

      const verts = lv.map((v) => {
        const [rx, ry] = rotateToWorld(v[0], v[1], tile.orientation);
        return [centreX + rx, centreY + ry, v[2] + lift(tile.height)] as [number, number, number];
      }) as Triangle2D["verts"];
      const { area, minAltitude: altitude } = triangleMetrics(verts[0], verts[1], verts[2]);
      if (area >= minArea && altitude >= minAltitude) return;

      const cx = (verts[0][0] + verts[1][0] + verts[2][0]) / 3;
      const cy = (verts[0][1] + verts[1][1] + verts[2][1]) / 3;
      const cz = (verts[0][2] + verts[1][2] + verts[2][2]) / 3;
      const near = nearestTileCorner(cx, cy);
      slivers.push({
        tile: { x: tx, y: ty, index, model },
        face: faceIndex,
        material: getMaterialName(face.surfaceMaterial, ctx.surfacemat),
        area: round(area), minAltitude: round(altitude),
        centroid: { x: round(cx), y: round(cy), z: round(cz) },
        nearestCorner: { x: near.x, y: near.y, distance: round(near.distance) },
        nearestEdgeDistance: round(near.edgeDistance),
        nearCorner: near.distance <= cornerRadius,
        verts: verts.map((v) => v.map(round)) as Triangle2D["verts"],
      });
    });
  }

  // Corner-adjacent first, then smallest
  slivers.sort((a, b) => Number(b.nearCorner) - Number(a.nearCorner) || a.area - b.area);
  return { slivers, walkableTriangles, tilesAnalyzed, tilesWithoutWalkmesh };
}

// ─── Sampling ───────────────────────────────────────────────────────────────

interface Sample { walkable: boolean; z?: number; covered: boolean }

/** Probe world point (wx, wy) from the point of view of tile (tx, ty); points on its boundary count as inside. */
function sampleFromTile(ctx: AnalysisContext, tx: number, ty: number, wx: number, wy: number): Sample {
  const none: Sample = { walkable: false, covered: false };
  if (tx < 0 || ty < 0 || tx >= ctx.grid.width || ty >= ctx.grid.height) return none;
  const tile = ctx.grid.tiles[ty * ctx.grid.width + tx];
  const model = tile ? ctx.tileModels[tile.id] : undefined;
  const wok = model ? ctx.getWok(model) : null;
  if (!tile || !wok) return none;
  const lx = wx - tx * TILE_SIZE - TILE_SIZE / 2, ly = wy - ty * TILE_SIZE - TILE_SIZE / 2;
  const r = probeTileLocal(wok, lx, ly, tile.orientation, tile.height, ctx.surfacemat,
    ctx.heightStep ?? DEFAULT_TILE_HEIGHT_STEP);
  return { walkable: r.walkable, z: r.z, covered: r.error === undefined };
}

// ─── Seam detection ─────────────────────────────────────────────────────────

/**
 * Compare the walkmeshes of every pair of adjacent tiles along their shared edge. Each side is sampled `seamStep`
 * apart, exactly on the edge, so the answer does not depend on how either tile happens to triangulate it.
 * Consecutive failing samples are merged into one finding.
 */
export function findSeamIssues(ctx: AnalysisContext, opts: WalkmeshAnalysisOptions = {}): SeamFinding[] {
  const step = opts.seamStep ?? 0.1;
  const maxStep = opts.maxStep ?? 0.15;
  const findings: SeamFinding[] = [];
  const n = Math.max(1, Math.round(TILE_SIZE / step));

  const scan = (ax: number, ay: number, bx: number, by: number, edge: "east" | "north") => {
    let open: { kind: SeamFinding["kind"]; start: number; end: number; detail: string } | null = null;
    const flush = () => {
      if (!open) return;
      const at = (s: number) => edge === "east"
        ? { x: round((ax + 1) * TILE_SIZE), y: round(ay * TILE_SIZE + s * step) }
        : { x: round(ax * TILE_SIZE + s * step), y: round((ay + 1) * TILE_SIZE) };
      findings.push({
        kind: open.kind, between: { a: { x: ax, y: ay }, b: { x: bx, y: by }, edge },
        from: at(open.start), to: at(open.end), length: round((open.end - open.start) * step + step),
        detail: open.detail,
      });
      open = null;
    };

    for (let s = 0; s <= n; s++) {
      const wx = edge === "east" ? (ax + 1) * TILE_SIZE : ax * TILE_SIZE + s * step;
      const wy = edge === "east" ? ay * TILE_SIZE + s * step : (ay + 1) * TILE_SIZE;
      const a = sampleFromTile(ctx, ax, ay, wx, wy), b = sampleFromTile(ctx, bx, by, wx, wy);

      let kind: SeamFinding["kind"] | null = null, detail = "";
      if (a.covered && b.covered && a.walkable !== b.walkable) {
        kind = "walkable-mismatch";
        detail = `${a.walkable ? "tile A" : "tile B"} is walkable here but the other side is not`;
      } else if (a.walkable && b.walkable && a.z !== undefined && b.z !== undefined && Math.abs(a.z - b.z) > maxStep) {
        kind = "height-step";
        detail = `ground height differs by ${round(Math.abs(a.z - b.z))} m across the seam`;
      }

      if (kind && open && open.kind === kind && open.end === s - 1) {
        open.end = s;
      } else {
        flush();
        if (kind) open = { kind, start: s, end: s, detail };
      }
    }
    flush();
  };

  for (let ty = 0; ty < ctx.grid.height; ty++) {
    for (let tx = 0; tx < ctx.grid.width; tx++) {
      if (tx + 1 < ctx.grid.width) scan(tx, ty, tx + 1, ty, "east");
      if (ty + 1 < ctx.grid.height) scan(tx, ty, tx, ty + 1, "north");
    }
  }
  return findings;
}

// ─── Corner crossing ────────────────────────────────────────────────────────

/** Probe a world point from every tile in `tiles` and merge: walkable if any covering tile says so. */
function sampleFromAny(ctx: AnalysisContext, tiles: Array<[number, number]>, wx: number, wy: number): Sample {
  let best: Sample = { walkable: false, covered: false };
  for (const [tx, ty] of tiles) {
    const s = sampleFromTile(ctx, tx, ty, wx, wy);
    if (s.walkable && (!best.walkable || (s.z ?? -Infinity) > (best.z ?? -Infinity))) best = s;
    else if (!best.walkable && s.covered) best = s;
  }
  return best;
}

/**
 * For each interior tile corner: if two adjacent quadrants are walkable at `clearance` from the corner, the edge
 * point between them (where the two tiles meet) and the corner itself must be walkable too, at a matching height.
 * Otherwise a creature walking around the corner has to squeeze through whatever sliver or gap is there.
 */
export function findCornerIssues(ctx: AnalysisContext, opts: WalkmeshAnalysisOptions = {}): CornerFinding[] {
  const r = opts.clearance ?? 0.5;
  const maxStep = opts.maxStep ?? 0.15;
  const findings: CornerFinding[] = [];

  for (let j = 1; j < ctx.grid.height; j++) {
    for (let i = 1; i < ctx.grid.width; i++) {
      const cx = i * TILE_SIZE, cy = j * TILE_SIZE;
      // SW, SE, NE, NW quadrants in order; each is {owning tile, probe offset}
      const quads: Array<{ tile: [number, number]; dx: number; dy: number }> = [
        { tile: [i - 1, j - 1], dx: -r, dy: -r },
        { tile: [i, j - 1], dx: r, dy: -r },
        { tile: [i, j], dx: r, dy: r },
        { tile: [i - 1, j], dx: -r, dy: r },
      ];
      // Edge point between quadrant k and k+1: S, E, N, W of the corner
      const bridges: Array<[number, number]> = [[0, -r], [r, 0], [0, r], [-r, 0]];
      const around: Array<[number, number]> = quads.map((q) => q.tile);
      const tiles = around.map(([x, y]) => ({ x, y }));

      const q = quads.map((p) => sampleFromTile(ctx, p.tile[0], p.tile[1], cx + p.dx, cy + p.dy));
      const center = sampleFromAny(ctx, around, cx, cy);

      for (let k = 0; k < 4; k++) {
        const next = (k + 1) % 4;
        if (!q[k].walkable || !q[next].walkable) continue;
        const [bx, by] = bridges[k];
        const bridge = sampleFromAny(ctx, [quads[k].tile, quads[next].tile], cx + bx, cy + by);
        if (!bridge.walkable) {
          findings.push({
            corner: { x: cx, y: cy }, tiles, kind: "blocked-bridge",
            detail: `quadrants ${k} and ${next} are walkable ${r} m from the corner but the edge point (${round(cx + bx)}, ${round(cy + by)}) between them is not`,
          });
        } else if (q[k].z !== undefined && bridge.z !== undefined && Math.abs(q[k].z! - bridge.z) > maxStep * 3) {
          findings.push({
            corner: { x: cx, y: cy }, tiles, kind: "height-step",
            detail: `ground jumps ${round(Math.abs(q[k].z! - bridge.z))} m between quadrant ${k} and the edge point (${round(cx + bx)}, ${round(cy + by)})`,
          });
        }
      }

      const walkableQuads = q.filter((s) => s.walkable).length;
      if (walkableQuads >= 2 && !center.walkable) {
        findings.push({
          corner: { x: cx, y: cy }, tiles, kind: "blocked-center",
          detail: `${walkableQuads} quadrants are walkable around the corner but the corner point itself is not`,
        });
      }
    }
  }
  return findings;
}

// ─── Entry point ────────────────────────────────────────────────────────────

export function analyzeWalkmesh(ctx: AnalysisContext, opts: WalkmeshAnalysisOptions = {}): WalkmeshAnalysis {
  const { slivers, walkableTriangles, tilesAnalyzed, tilesWithoutWalkmesh } = findSlivers(ctx, opts);
  return {
    tilesAnalyzed, tilesWithoutWalkmesh, walkableTriangles, slivers,
    seams: findSeamIssues(ctx, opts),
    corners: findCornerIssues(ctx, opts),
  };
}

function round(v: number): number {
  return Math.round(v * 10000) / 10000;
}
