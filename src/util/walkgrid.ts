/**
 * 1 m walkability raster of an area, and a "find open ground" search on top of it.
 *
 * Built on the pure probing in walkmesh.ts. The raster is cheap because each distinct
 * (tile model, orientation) pair is rasterised once (10 x 10 cells) and reused for every tile that
 * shares it: a 24 x 24 area typically has 30-100 distinct pairs, so it costs thousands of probes
 * instead of the 57,600 a naive per-cell probe would need.
 *
 * Why it exists: tile-centre sampling (what `adventure_find_walkable` used to do) misses open ground
 * that is not at a tile centre, and a single-point check says nothing about whether a whole camp,
 * ring of chairs or room-sized prefab fits. Real designers' placements (24 TFN areas, 5,561 props)
 * show how much clearance matters: only 57% of props pass a 1 m four-point buffer.
 */

import type { ResmanOptions } from "../nim-tools.js";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { getTilesetInfo } from "./tileset.js";
import {
  type AreaTileGrid,
  TILE_SIZE,
  type WalkabilityResult,
  type WokData,
  type WokLookup,
  ensureWokCacheDir,
  ensureWoksExtracted,
  getCachedWok,
  getWokForTile,
  probeAreaPosition,
  probeTileLocal,
  readAreaTileGrid,
  tileHeightStep,
} from "./walkmesh.js";

export const CELL_BLOCKED = 0;
export const CELL_WALKABLE = 1;
/** No walkmesh data for the tile (missing .wok): neither walkable nor known blocked. */
export const CELL_UNKNOWN = 2;

export interface WalkGrid {
  /** Area width/height in meters (cells). */
  widthM: number;
  heightM: number;
  /** Row-major from the south-west corner: index = y * widthM + x. */
  cells: Uint8Array;
}

/**
 * 1 m raster of a single tile as seen in the world (i.e. with `orientation` applied):
 * 100 cells, index = j * 10 + i (i = east, j = north). Cell value is CELL_WALKABLE/BLOCKED/UNKNOWN.
 */
export function buildTileRaster(
  wok: WokData | null | undefined,
  orientation: number,
  surfacemat?: TwoDATable,
): Uint8Array {
  const n = TILE_SIZE;
  const out = new Uint8Array(n * n);
  if (!wok) {
    out.fill(CELL_UNKNOWN);
    return out;
  }
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      const r = probeTileLocal(wok, i + 0.5 - n / 2, j + 0.5 - n / 2, orientation, 0, surfacemat);
      out[j * n + i] = r.walkable ? CELL_WALKABLE : CELL_BLOCKED;
    }
  }
  return out;
}

/** Build the 1 m walkability raster of a whole area (pure; the caller supplies the walkmeshes). */
export function buildWalkGrid(
  tiles: AreaTileGrid,
  tileModels: readonly string[],
  getWok: WokLookup,
  surfacemat?: TwoDATable,
): WalkGrid {
  const n = TILE_SIZE;
  const widthM = tiles.width * n;
  const heightM = tiles.height * n;
  const cells = new Uint8Array(widthM * heightM);
  const rasterCache = new Map<string, Uint8Array>();

  for (let ty = 0; ty < tiles.height; ty++) {
    for (let tx = 0; tx < tiles.width; tx++) {
      const tile = tiles.tiles[ty * tiles.width + tx];
      const model = tile ? tileModels[tile.id] : undefined;
      let raster: Uint8Array;
      if (!tile || !model) {
        raster = new Uint8Array(n * n).fill(CELL_UNKNOWN);
      } else {
        const key = `${model}|${((tile.orientation % 4) + 4) % 4}`;
        const hit = rasterCache.get(key);
        if (hit) {
          raster = hit;
        } else {
          raster = buildTileRaster(getWok(model), tile.orientation, surfacemat);
          rasterCache.set(key, raster);
        }
      }
      for (let j = 0; j < n; j++) {
        const rowStart = (ty * n + j) * widthM + tx * n;
        cells.set(raster.subarray(j * n, j * n + n), rowStart);
      }
    }
  }
  return { widthM, heightM, cells };
}

/** Cell value at a world position (CELL_BLOCKED for anything outside the area). */
export function walkGridAt(grid: WalkGrid, x: number, y: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= grid.widthM || yi >= grid.heightM) return CELL_BLOCKED;
  return grid.cells[yi * grid.widthM + xi];
}

// ─── Open-ground search ─────────────────────────────────────────────────────

export interface OpenGroundOptions {
  /** Clear footprint radius in meters (the footprint is the (2r+1) x (2r+1) m square around the spot). */
  radius: number;
  /** Prefer spots close to this world point (default: the area centre). */
  near?: { x: number; y: number };
  /** Only consider spot centres inside this world rectangle (default: the whole area). */
  bounds?: { x1: number; y1: number; x2: number; y2: number };
  /** Required walkable fraction of the footprint, 0-1 (default 0.97: tolerates a stray blocked cell). */
  minFraction?: number;
  /** How many spots to return (default 5). */
  maxResults?: number;
  /** Minimum distance between returned spots (default 2 x radius, so results do not overlap). */
  minSeparation?: number;
}

export interface OpenGroundResult {
  x: number;
  y: number;
  /** Distance from `near`. */
  distance: number;
  /** Fraction of the footprint that is walkable. */
  walkableFraction: number;
}

/**
 * Find spots where a whole footprint is walkable, nearest to a target first.
 * Uses a summed-area table, so the cost is O(cells) regardless of the radius.
 */
export function findOpenGround(grid: WalkGrid, opts: OpenGroundOptions): OpenGroundResult[] {
  const { widthM: W, heightM: H, cells } = grid;
  const r = Math.max(0, Math.ceil(opts.radius));
  const side = 2 * r + 1;
  const footprint = side * side;
  const minFraction = opts.minFraction ?? 0.97;
  const maxResults = opts.maxResults ?? 5;
  const minSeparation = opts.minSeparation ?? 2 * opts.radius;
  const near = opts.near ?? { x: W / 2, y: H / 2 };
  const b = opts.bounds ?? { x1: 0, y1: 0, x2: W, y2: H };

  const stride = W + 1;
  const sat = new Int32Array(stride * (H + 1));
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      sat[(y + 1) * stride + x + 1] =
        (cells[y * W + x] === CELL_WALKABLE ? 1 : 0) + sat[y * stride + x + 1] + sat[(y + 1) * stride + x] - sat[y * stride + x];
    }
  }

  const candidates: OpenGroundResult[] = [];
  const yStart = Math.max(r, Math.ceil(b.y1));
  const yEnd = Math.min(H - r, Math.floor(b.y2));
  const xStart = Math.max(r, Math.ceil(b.x1));
  const xEnd = Math.min(W - r, Math.floor(b.x2));
  for (let y = yStart; y < yEnd; y++) {
    for (let x = xStart; x < xEnd; x++) {
      if (cells[y * W + x] !== CELL_WALKABLE) continue;
      const x0 = x - r, y0 = y - r, x1 = x + r + 1, y1 = y + r + 1;
      const sum = sat[y1 * stride + x1] - sat[y0 * stride + x1] - sat[y1 * stride + x0] + sat[y0 * stride + x0];
      const fraction = sum / footprint;
      if (fraction < minFraction) continue;
      candidates.push({
        x: x + 0.5,
        y: y + 0.5,
        distance: Math.hypot(x + 0.5 - near.x, y + 0.5 - near.y),
        walkableFraction: Math.round(fraction * 1000) / 1000,
      });
    }
  }
  candidates.sort((a, c) => a.distance - c.distance);

  const picked: OpenGroundResult[] = [];
  for (const c of candidates) {
    if (picked.length >= maxResults) break;
    if (picked.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= minSeparation)) picked.push(c);
  }
  return picked;
}

// ─── Loading (I/O) ──────────────────────────────────────────────────────────

export interface LoadedAreaWalkGrid {
  tiles: AreaTileGrid;
  tileModels: string[];
  getWok: WokLookup;
  surfacemat?: TwoDATable;
  /** Metres per Tile_Height level in this area's tileset (its Transition). */
  heightStep: number;
  walk: WalkGrid;
  /** Exact probe (walkability, material, true Z) at a world position. */
  probe: (x: number, y: number) => WalkabilityResult;
}

/**
 * Load an area's walkmeshes (batch-extracting the distinct .wok files once) and build its raster.
 * Returns null when the area is not in the loaded module.
 */
export async function loadAreaWalkGrid(
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
): Promise<LoadedAreaWalkGrid | null> {
  const areDoc = index.parsedGff.get(`${areaResref.toLowerCase()}.are`);
  if (!areDoc) return null;
  const are = areDoc as GffObj;
  const tiles = readAreaTileGrid(are);
  const tilesetResref = (are.Tileset as { value?: string })?.value ?? "";

  const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);
  const tileModels = tileset.tiles.map((t) => t.model);
  const cacheDir = await ensureWokCacheDir();

  const unique = new Set<string>();
  for (const t of tiles.tiles) {
    const m = tileModels[t.id];
    if (m) unique.add(m.toLowerCase());
  }
  // one batched extraction (bisected around tiles that have no walkmesh); those cells become CELL_UNKNOWN
  await ensureWoksExtracted(unique, resmanOpts, cacheDir);
  for (const m of unique) await getWokForTile(m, resmanOpts, cacheDir);

  const surfacemat = index.twodaTables.get("surfacemat");
  const getWok: WokLookup = (model) => getCachedWok(model);
  const walk = buildWalkGrid(tiles, tileModels, getWok, surfacemat);
  const heightStep = tileHeightStep(tileset);
  return {
    tiles,
    tileModels,
    getWok,
    surfacemat,
    heightStep,
    walk,
    probe: (x, y) => probeAreaPosition(tiles, tileModels, getWok, x, y, surfacemat, heightStep),
  };
}
