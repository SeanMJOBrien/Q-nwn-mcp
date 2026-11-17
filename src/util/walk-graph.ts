/**
 * Walkmesh connectivity graph of an area: which walkable ground a creature can walk between.
 *
 * The engine's pathfinder walks across walkmesh triangles that share an edge; there is no "step height". A ramp or
 * stair is a run of sloped walkable triangles joined edge to edge, and a castle wall-top at 9 m next to a courtyard at
 * 5 m is simply a set of triangles with no shared edge to the courtyard. So reachability is a graph question, not a
 * height comparison: Tile_Height, the .set corner heights and the tile-level `computeWalkableZones` cannot answer it
 * (the last only asks whether neighbouring tiles both have walkable ground; it never compares heights).
 *
 * Nodes are the walkable faces of every tile's .wok placed in the world (tile rotation, node offset, Tile_Height x the
 * tileset's Transition). Edges:
 *  - two faces whose edges have the same two end points (within 1 cm, any tile);
 *  - two faces from neighbouring tiles whose edges lie on the shared tile border, overlap along it, and are at the same
 *    height there (within SEAM_Z_TOLERANCE): walkmeshes do not always split a border at the same points.
 *
 * Pure: the caller supplies the walkmesh lookup (see loadAreaWalkGraph in util/area-walk-graph.ts for the I/O).
 * Not modelled: placeable walkmeshes (.pwk) that cut into the ground, closed or locked doors, creature width.
 */

import type { TwoDATable } from "../types/module.js";
import {
  type AreaTileGrid,
  DEFAULT_TILE_HEIGHT_STEP,
  getMaterialName,
  isMaterialWalkable,
  TILE_SIZE,
  type WokLookup,
} from "./walkmesh.js";

/** Height difference allowed where two tiles' walkmeshes meet at a border. */
export const SEAM_Z_TOLERANCE = 0.3;
/** Distance from a tile border within which an edge counts as lying on it. */
const SEAM_EPS = 0.05;

export interface WalkGraph {
  width: number;
  height: number;
  faceCount: number;
  /** World triangle per face: x1 y1 z1 x2 y2 z2 x3 y3 z3. */
  tri: Float64Array;
  cx: Float64Array;
  cy: Float64Array;
  cz: Float64Array;
  material: Int32Array;
  adj: number[][];
  /** Connected component per face. */
  comp: Int32Array;
  components: ComponentInfo[];
  /** Face indices per tile index (row-major from the south-west). */
  facesByTile: number[][];
  /** Tile models that had no walkmesh; their ground is unknown, not blocked. */
  missingModels: string[];
}

export interface ComponentInfo {
  id: number;
  faceCount: number;
  /** Walkable ground area in m². */
  area: number;
  zMin: number;
  zMax: number;
  bbox: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Counter-clockwise rotation of a tile-local point by orientation x 90°: wok space -> world-aligned. */
function rotateCcw(x: number, y: number, orientation: number): [number, number] {
  switch (((orientation % 4) + 4) % 4) {
    case 1:
      return [-y, x];
    case 2:
      return [-x, -y];
    case 3:
      return [y, -x];
    default:
      return [x, y];
  }
}

const q = (v: number) => Math.round(v * 100);
const vkey = (x: number, y: number, z: number) => `${q(x)},${q(y)},${q(z)}`;

interface Seg {
  face: number;
  tile: number;
  lo: number;
  hi: number;
  zLo: number;
  zHi: number;
}

function zAt(seg: Seg, t: number): number {
  if (seg.hi - seg.lo < 1e-9) return seg.zLo;
  return seg.zLo + ((seg.zHi - seg.zLo) * (t - seg.lo)) / (seg.hi - seg.lo);
}

/** Build the walk graph of an area's tiles. `tileModels[tileId]` is the tileset model of each tile ID. */
export function buildWalkGraph(
  grid: AreaTileGrid,
  tileModels: readonly string[],
  getWok: WokLookup,
  surfacemat?: TwoDATable,
  heightStep: number = DEFAULT_TILE_HEIGHT_STEP,
): WalkGraph {
  const triList: number[] = [];
  const matList: number[] = [];
  const tileOf: number[] = [];
  const facesByTile: number[][] = grid.tiles.map(() => []);
  const missing = new Set<string>();

  for (let t = 0; t < grid.tiles.length; t++) {
    const tile = grid.tiles[t];
    const model = tileModels[tile.id];
    const wok = model ? getWok(model) : null;
    if (!wok) {
      if (model) missing.add(model.toLowerCase());
      continue;
    }
    const ox = (t % grid.width) * TILE_SIZE + TILE_SIZE / 2;
    const oy = Math.floor(t / grid.width) * TILE_SIZE + TILE_SIZE / 2;
    const lift = tile.height * heightStep;
    for (const f of wok.faces) {
      if (!isMaterialWalkable(f.surfaceMaterial, surfacemat)) continue;
      const vs = [wok.verts[f.v1], wok.verts[f.v2], wok.verts[f.v3]];
      if (vs.some((v) => !v)) continue;
      const id = tileOf.length;
      for (const v of vs) {
        const [rx, ry] = rotateCcw(v[0], v[1], tile.orientation);
        triList.push(ox + rx, oy + ry, v[2] + lift);
      }
      matList.push(f.surfaceMaterial);
      tileOf.push(t);
      facesByTile[t].push(id);
    }
  }

  const n = tileOf.length;
  const tri = Float64Array.from(triList);
  const cx = new Float64Array(n);
  const cy = new Float64Array(n);
  const cz = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const b = i * 9;
    cx[i] = (tri[b] + tri[b + 3] + tri[b + 6]) / 3;
    cy[i] = (tri[b + 1] + tri[b + 4] + tri[b + 7]) / 3;
    cz[i] = (tri[b + 2] + tri[b + 5] + tri[b + 8]) / 3;
  }

  const adjSets: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const link = (a: number, b: number) => {
    if (a === b) return;
    adjSets[a].add(b);
    adjSets[b].add(a);
  };

  // Shared edges (exact end points).
  const edgeFaces = new Map<string, number[]>();
  // Border segments, by line: "x:<k>" (vertical line x = 10k) or "y:<k>".
  const seams = new Map<string, Seg[]>();
  const maxX = grid.width * TILE_SIZE;
  const maxY = grid.height * TILE_SIZE;
  for (let i = 0; i < n; i++) {
    const b = i * 9;
    for (let e = 0; e < 3; e++) {
      const p = b + e * 3;
      const r = b + ((e + 1) % 3) * 3;
      const k1 = vkey(tri[p], tri[p + 1], tri[p + 2]);
      const k2 = vkey(tri[r], tri[r + 1], tri[r + 2]);
      const key = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
      const list = edgeFaces.get(key);
      if (list) list.push(i);
      else edgeFaces.set(key, [i]);

      const [x1, y1, z1, x2, y2, z2] = [tri[p], tri[p + 1], tri[p + 2], tri[r], tri[r + 1], tri[r + 2]];
      for (const axis of ["x", "y"] as const) {
        const a1 = axis === "x" ? x1 : y1;
        const a2 = axis === "x" ? x2 : y2;
        const line = Math.round(a1 / TILE_SIZE) * TILE_SIZE;
        const limit = axis === "x" ? maxX : maxY;
        if (line <= 0 || line >= limit) continue;
        if (Math.abs(a1 - line) > SEAM_EPS || Math.abs(a2 - line) > SEAM_EPS) continue;
        const s1 = axis === "x" ? y1 : x1;
        const s2 = axis === "x" ? y2 : x2;
        const seg: Seg =
          s1 <= s2
            ? { face: i, tile: tileOf[i], lo: s1, hi: s2, zLo: z1, zHi: z2 }
            : { face: i, tile: tileOf[i], lo: s2, hi: s1, zLo: z2, zHi: z1 };
        const lk = `${axis}:${line}`;
        const sl = seams.get(lk);
        if (sl) sl.push(seg);
        else seams.set(lk, [seg]);
      }
    }
  }
  for (const faces of edgeFaces.values()) {
    for (let a = 0; a < faces.length; a++) for (let c = a + 1; c < faces.length; c++) link(faces[a], faces[c]);
  }
  for (const segs of seams.values()) {
    segs.sort((s, t) => s.lo - t.lo);
    for (let a = 0; a < segs.length; a++) {
      const sa = segs[a];
      for (let c = a + 1; c < segs.length && segs[c].lo < sa.hi - 0.05; c++) {
        const sc = segs[c];
        if (sc.tile === sa.tile) continue;
        const lo = Math.max(sa.lo, sc.lo);
        const hi = Math.min(sa.hi, sc.hi);
        if (hi - lo < 0.05) continue;
        const mid = (lo + hi) / 2;
        if (Math.abs(zAt(sa, mid) - zAt(sc, mid)) <= SEAM_Z_TOLERANCE) link(sa.face, sc.face);
      }
    }
  }

  const adj = adjSets.map((s) => [...s]);
  const g: WalkGraph = {
    width: grid.width,
    height: grid.height,
    faceCount: n,
    tri,
    cx,
    cy,
    cz,
    material: Int32Array.from(matList),
    adj,
    comp: new Int32Array(n),
    components: [],
    facesByTile,
    missingModels: [...missing].sort(),
  };
  computeComponents(g);
  return g;
}

/** (Re)label the connected components of a graph. */
function computeComponents(g: WalkGraph): void {
  const { adj, tri, cx, cy, cz } = g;
  const n = g.faceCount;
  const comp = new Int32Array(n).fill(-1);
  const components: ComponentInfo[] = [];
  for (let start = 0; start < n; start++) {
    if (comp[start] !== -1) continue;
    const id = components.length;
    const info: ComponentInfo = {
      id,
      faceCount: 0,
      area: 0,
      zMin: Infinity,
      zMax: -Infinity,
      bbox: { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    };
    const stack = [start];
    comp[start] = id;
    while (stack.length) {
      const f = stack.pop() as number;
      info.faceCount++;
      info.area += triArea2D(tri, f);
      info.zMin = Math.min(info.zMin, cz[f]);
      info.zMax = Math.max(info.zMax, cz[f]);
      info.bbox.minX = Math.min(info.bbox.minX, cx[f]);
      info.bbox.minY = Math.min(info.bbox.minY, cy[f]);
      info.bbox.maxX = Math.max(info.bbox.maxX, cx[f]);
      info.bbox.maxY = Math.max(info.bbox.maxY, cy[f]);
      for (const o of adj[f]) {
        if (comp[o] === -1) {
          comp[o] = id;
          stack.push(o);
        }
      }
    }
    components.push(info);
  }
  g.comp = comp;
  g.components = components;
}

/**
 * Join the ground on every side of each bridge point: for each distinct region with a face within `radius` of the point
 * (and within 1.5 m of its height), link its nearest face to the others'. Used for placed doors: a tile's door opening
 * has no walkmesh of its own, the door object supplies it in play, so without this every door splits the rooms.
 * Returns the number of bridges that joined at least two regions.
 */
export function addBridges(g: WalkGraph, points: Array<{ x: number; y: number; z: number; radius: number }>): number {
  let joined = 0;
  for (const p of points) {
    const tx0 = Math.max(0, Math.floor((p.x - p.radius) / TILE_SIZE));
    const tx1 = Math.min(g.width - 1, Math.floor((p.x + p.radius) / TILE_SIZE));
    const ty0 = Math.max(0, Math.floor((p.y - p.radius) / TILE_SIZE));
    const ty1 = Math.min(g.height - 1, Math.floor((p.y + p.radius) / TILE_SIZE));
    const nearest = new Map<number, { face: number; d: number }>();
    for (let ty = ty0; ty <= ty1; ty++) {
      for (let tx = tx0; tx <= tx1; tx++) {
        for (const f of g.facesByTile[ty * g.width + tx] ?? []) {
          const { d, z } = faceDistance(g, f, p.x, p.y);
          if (d > p.radius || Math.abs(z - p.z) > 1.5) continue;
          const c = g.comp[f];
          const cur = nearest.get(c);
          if (!cur || d < cur.d) nearest.set(c, { face: f, d });
        }
      }
    }
    const faces = [...nearest.values()].map((v) => v.face);
    if (faces.length < 2) continue;
    for (let i = 1; i < faces.length; i++) {
      g.adj[faces[0]].push(faces[i]);
      g.adj[faces[i]].push(faces[0]);
    }
    joined++;
  }
  if (joined) computeComponents(g);
  return joined;
}

function triArea2D(tri: Float64Array, f: number): number {
  const b = f * 9;
  return Math.abs((tri[b + 3] - tri[b]) * (tri[b + 7] - tri[b + 1]) - (tri[b + 6] - tri[b]) * (tri[b + 4] - tri[b + 1])) / 2;
}

/** Distance in the XY plane from a point to a face (0 inside), and the face's ground height at the nearest point. */
function faceDistance(g: WalkGraph, f: number, x: number, y: number): { d: number; z: number } {
  const t = g.tri;
  const b = f * 9;
  const [ax, ay, az, bx, by, bz, qx, qy, qz] = [t[b], t[b + 1], t[b + 2], t[b + 3], t[b + 4], t[b + 5], t[b + 6], t[b + 7], t[b + 8]];
  const den = (by - qy) * (ax - qx) + (qx - bx) * (ay - qy);
  if (Math.abs(den) > 1e-12) {
    const l1 = ((by - qy) * (x - qx) + (qx - bx) * (y - qy)) / den;
    const l2 = ((qy - ay) * (x - qx) + (ax - qx) * (y - qy)) / den;
    const l3 = 1 - l1 - l2;
    if (l1 >= -1e-9 && l2 >= -1e-9 && l3 >= -1e-9) return { d: 0, z: l1 * az + l2 * bz + l3 * qz };
  }
  let best = { d: Infinity, z: g.cz[f] };
  for (const [px, py, pz, rx, ry, rz] of [
    [ax, ay, az, bx, by, bz],
    [bx, by, bz, qx, qy, qz],
    [qx, qy, qz, ax, ay, az],
  ]) {
    const dx = rx - px;
    const dy = ry - py;
    const len2 = dx * dx + dy * dy;
    const s = len2 > 0 ? Math.max(0, Math.min(1, ((x - px) * dx + (y - py) * dy) / len2)) : 0;
    const d = Math.hypot(px + s * dx - x, py + s * dy - y);
    if (d < best.d) best = { d, z: pz + s * (rz - pz) };
  }
  return best;
}

export interface LocatedPoint {
  face: number;
  component: number;
  /** Ground height at the point (or at the nearest point of the face when snapped). */
  z: number;
  /** XY distance moved to reach walkable ground (0 when the point is on it). */
  snapped: number;
  material: string;
}

/**
 * Find the walkable face under (x, y), or the nearest one within `snapRadius`. With `zHint` (an object's stored Z) the
 * face closest in height wins, so a point on a wall-top is not mistaken for the ground beneath it; without it the
 * highest face wins (as the engine does for a bridge over a pit).
 */
export function locatePoint(
  g: WalkGraph,
  x: number,
  y: number,
  opts: { zHint?: number; snapRadius?: number; surfacemat?: TwoDATable } = {},
): LocatedPoint | null {
  const radius = opts.snapRadius ?? 0;
  const tx0 = Math.max(0, Math.floor((x - radius) / TILE_SIZE));
  const tx1 = Math.min(g.width - 1, Math.floor((x + radius) / TILE_SIZE));
  const ty0 = Math.max(0, Math.floor((y - radius) / TILE_SIZE));
  const ty1 = Math.min(g.height - 1, Math.floor((y + radius) / TILE_SIZE));
  let best: { face: number; d: number; z: number; score: number } | null = null;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      for (const f of g.facesByTile[ty * g.width + tx] ?? []) {
        const { d, z } = faceDistance(g, f, x, y);
        if (d > radius + 1e-9) continue;
        const score = opts.zHint !== undefined ? d + Math.abs(z - opts.zHint) : d - z * 1e-6;
        if (!best || score < best.score) best = { face: f, d, z, score };
      }
    }
  }
  if (!best) return null;
  return {
    face: best.face,
    component: g.comp[best.face],
    z: best.z,
    snapped: Math.round(best.d * 100) / 100,
    material: getMaterialName(g.material[best.face], opts.surfacemat),
  };
}

export interface PathResult {
  /** Path length in metres (XY plus height), through face centres. */
  length: number;
  /** Points along the path (start, face centres, end), thinned to at most `maxPoints`. */
  points: Array<{ x: number; y: number; z: number }>;
  zMin: number;
  zMax: number;
  /** Sum of upward height changes along the path. */
  climb: number;
  /** Sum of downward height changes. */
  descent: number;
}

/** A* over face centres from one located point to another in the same component; null when not connected. */
export function findPath(
  g: WalkGraph,
  from: { x: number; y: number; z: number; face: number },
  to: { x: number; y: number; z: number; face: number },
  maxPoints = 40,
): PathResult | null {
  if (g.comp[from.face] !== g.comp[to.face]) return null;
  const dist = (a: number, b: number) => Math.hypot(g.cx[a] - g.cx[b], g.cy[a] - g.cy[b], g.cz[a] - g.cz[b]);
  const h = (f: number) => Math.hypot(g.cx[f] - to.x, g.cy[f] - to.y, g.cz[f] - to.z);
  const gScore = new Map<number, number>([[from.face, 0]]);
  const prev = new Map<number, number>();
  const heap = new MinHeap();
  heap.push(from.face, h(from.face));
  const closed = new Set<number>();
  while (heap.size) {
    const f = heap.pop();
    if (f === to.face) break;
    if (closed.has(f)) continue;
    closed.add(f);
    const gf = gScore.get(f) as number;
    for (const nb of g.adj[f]) {
      const cand = gf + dist(f, nb);
      if (cand < (gScore.get(nb) ?? Infinity)) {
        gScore.set(nb, cand);
        prev.set(nb, f);
        heap.push(nb, cand + h(nb));
      }
    }
  }
  if (from.face !== to.face && !prev.has(to.face)) return null;

  const faces: number[] = [to.face];
  while (faces[faces.length - 1] !== from.face) faces.push(prev.get(faces[faces.length - 1]) as number);
  faces.reverse();
  const pts = [
    { x: from.x, y: from.y, z: from.z },
    ...faces.slice(1, -1).map((f) => ({ x: g.cx[f], y: g.cy[f], z: g.cz[f] })),
    { x: to.x, y: to.y, z: to.z },
  ];
  let length = 0;
  let climb = 0;
  let descent = 0;
  let zMin = Infinity;
  let zMax = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    zMin = Math.min(zMin, pts[i].z);
    zMax = Math.max(zMax, pts[i].z);
    if (i === 0) continue;
    const a = pts[i - 1];
    const b = pts[i];
    length += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
    const dz = b.z - a.z;
    if (dz > 0) climb += dz;
    else descent -= dz;
  }
  const round = (v: number) => Math.round(v * 100) / 100;
  let thinned = pts;
  if (pts.length > maxPoints) {
    const step = (pts.length - 1) / (maxPoints - 1);
    thinned = Array.from({ length: maxPoints }, (_, i) => pts[Math.round(i * step)]);
  }
  return {
    length: round(length),
    points: thinned.map((p) => ({ x: round(p.x), y: round(p.y), z: round(p.z) })),
    zMin: round(zMin),
    zMax: round(zMax),
    climb: round(climb),
    descent: round(descent),
  };
}

/**
 * Where two components come closest (XY distance between face centres), with the height of each there. Searches up to
 * `maxDistance` metres; null when they are further apart.
 */
export function closestApproach(
  g: WalkGraph,
  compA: number,
  compB: number,
  maxDistance = 30,
): { distance: number; a: { x: number; y: number; z: number }; b: { x: number; y: number; z: number } } | null {
  const cell = 2;
  const buckets = new Map<string, number[]>();
  for (let f = 0; f < g.faceCount; f++) {
    if (g.comp[f] !== compB) continue;
    const k = `${Math.floor(g.cx[f] / cell)},${Math.floor(g.cy[f] / cell)}`;
    const l = buckets.get(k);
    if (l) l.push(f);
    else buckets.set(k, [f]);
  }
  const reach = Math.ceil(maxDistance / cell);
  let best: { d: number; a: number; b: number } | null = null;
  for (let f = 0; f < g.faceCount; f++) {
    if (g.comp[f] !== compA) continue;
    const bx = Math.floor(g.cx[f] / cell);
    const by = Math.floor(g.cy[f] / cell);
    for (let r = 0; r <= reach; r++) {
      if (best && (r - 1) * cell > best.d) break;
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          for (const o of buckets.get(`${bx + dx},${by + dy}`) ?? []) {
            const d = Math.hypot(g.cx[f] - g.cx[o], g.cy[f] - g.cy[o]);
            if (d <= maxDistance && (!best || d < best.d)) best = { d, a: f, b: o };
          }
        }
      }
    }
  }
  if (!best) return null;
  const p = (f: number) => ({
    x: Math.round(g.cx[f] * 10) / 10,
    y: Math.round(g.cy[f] * 10) / 10,
    z: Math.round(g.cz[f] * 100) / 100,
  });
  return { distance: Math.round(best.d * 10) / 10, a: p(best.a), b: p(best.b) };
}

/** The face centre of `comp` nearest (XY) to a point. */
export function nearestInComponent(g: WalkGraph, comp: number, x: number, y: number): { x: number; y: number; z: number; distance: number } | null {
  let best = -1;
  let bestD = Infinity;
  for (let f = 0; f < g.faceCount; f++) {
    if (g.comp[f] !== comp) continue;
    const d = Math.hypot(g.cx[f] - x, g.cy[f] - y);
    if (d < bestD) {
      bestD = d;
      best = f;
    }
  }
  if (best < 0) return null;
  const r = (v: number, k: number) => Math.round(v * k) / k;
  return { x: r(g.cx[best], 10), y: r(g.cy[best], 10), z: r(g.cz[best], 100), distance: r(bestD, 10) };
}

/** Component summary for a report (rounded). */
export function describeComponent(g: WalkGraph, comp: number): Record<string, unknown> {
  const c = g.components[comp];
  const r = (v: number) => Math.round(v * 10) / 10;
  return {
    region: comp,
    groundArea: Math.round(c.area),
    height: c.zMin === c.zMax ? r(c.zMin) : `${r(c.zMin)} to ${r(c.zMax)}`,
    spans: `x ${r(c.bbox.minX)}-${r(c.bbox.maxX)}, y ${r(c.bbox.minY)}-${r(c.bbox.maxY)}`,
  };
}

class MinHeap {
  private items: number[] = [];
  private prio: number[] = [];
  get size(): number {
    return this.items.length;
  }
  push(item: number, p: number): void {
    this.items.push(item);
    this.prio.push(p);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.prio[parent] <= this.prio[i]) break;
      this.swap(i, parent);
      i = parent;
    }
  }
  pop(): number {
    const top = this.items[0];
    const lastItem = this.items.pop() as number;
    const lastPrio = this.prio.pop() as number;
    if (this.items.length) {
      this.items[0] = lastItem;
      this.prio[0] = lastPrio;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1;
        const r = l + 1;
        let m = i;
        if (l < this.items.length && this.prio[l] < this.prio[m]) m = l;
        if (r < this.items.length && this.prio[r] < this.prio[m]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(a: number, b: number): void {
    [this.items[a], this.items[b]] = [this.items[b], this.items[a]];
    [this.prio[a], this.prio[b]] = [this.prio[b], this.prio[a]];
  }
}
