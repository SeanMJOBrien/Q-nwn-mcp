/**
 * Walkmesh (.wok) file parser and walkability validation.
 * Parses NWN ASCII walkmesh files to determine which positions are walkable,
 * and performs flood-fill reachability analysis across area tiles.
 *
 * Spatial conventions used throughout this file. Every one was verified against real,
 * human-built areas (see docs/object-placement-and-tilesets.md and the env-gated oracle
 * in tile-oracle.live.test.ts); do not "fix" them without re-running that oracle:
 *   - World coordinates are meters: +X east, +Y north, origin at the south-west corner. One tile is 10 m.
 *   - ARE Tile_List is row-major from the south-west corner: index = tileY * Width + tileX.
 *   - Tile_Orientation n means the tile is rotated n x 90 degrees COUNTER-clockwise (seen from above).
 *   - A .wok's vertices are tile-local ([-5, +5], +Y north) and RELATIVE TO THE WALKMESH NODE'S `position`.
 *     57% of vanilla walkmeshes have a non-zero Z offset (-10.9 m .. +27.1 m); parseWokFile adds it back.
 *     Ignoring it makes every ground height wrong (tin01/tni01 interiors by -1.5 m, tdc01 caves by -1.6 .. -2.2 m).
 *   - ARE Tile_Height counts height levels that are added on top of the mesh Z. A level is the tileset's
 *     `[GENERAL] Transition=` metres (5 for most outdoor sets, 4 for tcn01, 2 for tno01): see tileHeightStep().
 *     Real objects on raised tcn01/tno01 tiles match to 0.5 m 94% / 93% of the time with that step and 3.5% / 0% with a flat 5.
 *   - The tileset's `WalkMesh=` field is NOT the .wok name: the walkmesh file is `<Model>.wok`.
 */

import fs from "fs/promises";
import path from "path";
import { resmanExtract } from "../nim-tools.js";
import type { ResmanOptions } from "../nim-tools.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { getFieldList, getFieldNum } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import { extractSalvaging } from "./batch-extract.js";
import { getTilesetInfo, getRotatedCrossers } from "./tileset.js";

// ─── Types ──────────────────────────────────────────────────────────────────

/** Meters along one tile edge. */
export const TILE_SIZE = 10;

/** Metres per ARE Tile_Height level when a tileset does not say (BioWare's value for most outdoor tilesets). */
export const DEFAULT_TILE_HEIGHT_STEP = 5.0;

/**
 * Metres of ground height per ARE Tile_Height level for a tileset: the `Transition=` value of its .set `[GENERAL]`
 * section. It is NOT a constant. Base game: 5 for ttr01/tts01/tts02/tti01/ttu01/ttz01/trm02/tms01/tcm02/trs02/tss13,
 * 4 for tcn01, 3 for the interiors/dungeons (which have no height levels), 2 for tno01, 1 for twc03.
 * Verified on real, human-placed objects standing on raised tiles: tcn01 93.9% within 0.5 m with the tileset's
 * step vs 3.5% with 5; tno01 92.6% vs 0.0%. Falls back to 5 when the value is missing or not positive.
 */
export function tileHeightStep(tileset: { transition?: number } | null | undefined): number {
  const step = tileset?.transition;
  return typeof step === "number" && Number.isFinite(step) && step > 0 ? step : DEFAULT_TILE_HEIGHT_STEP;
}

export interface WokData {
  /** Tile-local meters with the walkmesh node's `position` already added (so Z is the true floor height). */
  verts: [number, number, number][];
  faces: WokFace[];
  /** The node `position` that was added to `verts` (zeros when the file has none). */
  offset?: [number, number, number];
}

export interface WokFace {
  v1: number;
  v2: number;
  v3: number;
  surfaceMaterial: number;
}

export interface WalkabilityResult {
  walkable: boolean;
  material?: string;
  materialId?: number;
  error?: string;
  /** Z height of the walkmesh surface at the tested position */
  z?: number;
  /** Metres per Tile_Height level that went into `z` (the tileset's Transition); set by the area-level probes. */
  heightStep?: number;
}

export interface TileWalkSummary {
  walkablePercent: number;
  dominantMaterial: string;
  materials: Map<string, number>;  // material name → face count
  hasWater: boolean;
}

export interface ZoneInfo {
  id: string;
  tiles: Set<number>;       // tile indices in this zone
  walkablePercent: number;
  connected: boolean;        // reachable from the largest zone
  description: string;
  /** Area resrefs reachable via area transitions (doors/triggers) in this zone */
  transitionsOut?: string[];
}

/** An area transition object (door or trigger with active LinkedTo) for zone annotation */
export interface AreaTransitionInfo {
  x: number;
  y: number;
  targetArea: string;  // destination area resref
  /**
   * MCP_TRAVEL_TIME VarTable hint set by adventure_create_transition's
   * optional travelTime param, when present — undefined for a plain door/
   * trigger or a transition built without it. See
   * weather_variance_implausible in analysis-tools.ts, the one consumer.
   */
  travelTime?: "short" | "long";
}

// ─── Surface Material Data ──────────────────────────────────────────────────

/** Default walkability flags from surfacemat.2da (fallback if 2DA not loaded) */
const DEFAULT_WALKABLE: Record<number, boolean> = {
  0: false,   // NotDefined
  1: true,    // Dirt
  2: false,   // Obscuring
  3: true,    // Grass
  4: true,    // Stone
  5: true,    // Wood
  6: true,    // Water
  7: false,   // Nonwalk
  8: false,   // Transparent
  9: true,    // Carpet
  10: true,   // Metal
  11: true,   // Puddles
  12: true,   // Swamp
  13: true,   // Mud
  14: true,   // Leaves
  15: false,  // Lava
  16: false,  // BottomlessPit
  17: false,  // DeepWater
  18: true,   // Door
  19: true,   // Snow
  20: true,   // Sand
  21: true,   // Barebones
  22: true,   // StoneBridge
};

const DEFAULT_MATERIAL_NAMES: Record<number, string> = {
  0: "NotDefined", 1: "Dirt", 2: "Obscuring", 3: "Grass", 4: "Stone",
  5: "Wood", 6: "Water", 7: "Nonwalk", 8: "Transparent", 9: "Carpet",
  10: "Metal", 11: "Puddles", 12: "Swamp", 13: "Mud", 14: "Leaves",
  15: "Lava", 16: "BottomlessPit", 17: "DeepWater", 18: "Door",
  19: "Snow", 20: "Sand", 21: "Barebones", 22: "StoneBridge",
};

/** Water material IDs */
const WATER_MATERIALS = new Set([6, 11, 12, 13]);

/** Check if a surface material is walkable, using surfacemat.2da if available */
export function isMaterialWalkable(materialId: number, surfacemat?: TwoDATable): boolean {
  if (surfacemat) {
    const row = surfacemat.rows.get(materialId);
    if (row) return row.Walk === "1";
  }
  return DEFAULT_WALKABLE[materialId] ?? false;
}

/** Get the display name of a surface material */
export function getMaterialName(materialId: number, surfacemat?: TwoDATable): string {
  if (surfacemat) {
    const row = surfacemat.rows.get(materialId);
    if (row?.Label) return row.Label;
  }
  return DEFAULT_MATERIAL_NAMES[materialId] ?? `Material_${materialId}`;
}

// ─── .wok Parser ────────────────────────────────────────────────────────────

/**
 * Parse an ASCII .wok file into vertices and faces.
 *
 * The vertices in the file are relative to the walkmesh node's `position` line
 * (`node aabb <name>` ... `position x y z`). That offset is added to every vertex so that
 * `verts` are real tile-local coordinates; without it Z is wrong for most tiles.
 */
export function parseWokFile(content: string): WokData {
  const verts: [number, number, number][] = [];
  const faces: WokFace[] = [];
  const lines = content.split("\n");
  let offset: [number, number, number] = [0, 0, 0];
  let nodePosition: [number, number, number] = [0, 0, 0];

  let i = 0;
  const len = lines.length;

  // Find "verts <count>" line, remembering the `position` of the node that contains it
  while (i < len) {
    const line = lines[i].trim();
    if (/^node\s/i.test(line)) {
      nodePosition = [0, 0, 0];
    } else if (/^position\s/i.test(line)) {
      const p = line.split(/\s+/);
      const px = parseFloat(p[1]), py = parseFloat(p[2]), pz = parseFloat(p[3]);
      if ([px, py, pz].every(Number.isFinite)) nodePosition = [px, py, pz];
    } else if (line.startsWith("verts ")) {
      offset = nodePosition;
      const vertCount = parseInt(line.split(/\s+/)[1], 10);
      i++;
      for (let v = 0; v < vertCount && i < len; v++, i++) {
        const parts = lines[i].trim().split(/\s+/);
        if (parts.length >= 3) {
          verts.push([
            parseFloat(parts[0]) + offset[0],
            parseFloat(parts[1]) + offset[1],
            parseFloat(parts[2]) + offset[2],
          ]);
        }
      }
      break;
    }
    i++;
  }

  // Find "faces <count>" line
  while (i < len) {
    const line = lines[i].trim();
    if (line.startsWith("faces ")) {
      const faceCount = parseInt(line.split(/\s+/)[1], 10);
      i++;
      for (let f = 0; f < faceCount && i < len; f++, i++) {
        const parts = lines[i].trim().split(/\s+/);
        // Format: v1 v2 v3 smooth adj1 adj2 adj3 surfaceMaterial
        if (parts.length >= 8) {
          faces.push({
            v1: parseInt(parts[0], 10),
            v2: parseInt(parts[1], 10),
            v3: parseInt(parts[2], 10),
            surfaceMaterial: parseInt(parts[7], 10),
          });
        }
      }
      break;
    }
    i++;
  }

  return { verts, faces, offset };
}

// ─── WOK Cache ──────────────────────────────────────────────────────────────

const wokCache = new Map<string, WokData>();
/** Tile models known to have no walkmesh, so they are not re-extracted for every object that stands on them. */
const missingWoks = new Set<string>();
let wokCacheDirPath = "";
let wokCacheDirReady = false;

/** Clear the walkmesh cache (call on load_module) */
export function clearWokCache(): void {
  wokCache.clear();
  missingWoks.clear();
  wokCacheDirReady = false;
}

/** Set the wok cache directory path (call after tempDir is known) */
export function setWokCacheDir(tempDir: string): void {
  wokCacheDirPath = path.join(tempDir, "wok_cache");
  wokCacheDirReady = false;
}

/** Ensure the wok cache directory exists (lazy-init, one fs.mkdir per module load) */
export async function ensureWokCacheDir(): Promise<string> {
  if (!wokCacheDirReady) {
    await fs.mkdir(wokCacheDirPath, { recursive: true });
    wokCacheDirReady = true;
  }
  return wokCacheDirPath;
}

/** Sync lookup of cached WOK data (available after loadAreaWalkmeshData runs) */
export function getCachedWok(model: string): WokData | null {
  return wokCache.get(model.toLowerCase()) ?? null;
}

/**
 * Extract the walkmeshes of many tile models with as few resman runs as possible.
 *
 * `nwn_resman_extract` extracts NOTHING when any one of the requested files does not exist, and some tilesets
 * (tcm02, trs02, ...) have tiles without a walkmesh. So a failed batch is bisected (see extractSalvaging), and models
 * that turn out not to exist are remembered so they are never requested again.
 */
export async function ensureWoksExtracted(
  models: Iterable<string>,
  resmanOpts: ResmanOptions,
  cacheDir: string,
): Promise<void> {
  const wanted: string[] = [];
  for (const model of new Set([...models].map((m) => m.toLowerCase()))) {
    if (!model || wokCache.has(model) || missingWoks.has(model)) continue;
    try {
      await fs.access(path.join(cacheDir, `${model}.wok`));
    } catch {
      wanted.push(model);
    }
  }
  if (wanted.length === 0) return;
  const result = await extractSalvaging(wanted.map((m) => `${m}.wok`), (batch) =>
    resmanExtract(cacheDir, { ...resmanOpts, files: batch }),
  );
  for (const failed of result.failed) missingWoks.add(failed.replace(/\.wok$/, ""));
}

/** Get WOK data for a tile model, loading from resman if needed */
export async function getWokForTile(
  tileModel: string,
  resmanOpts: ResmanOptions,
  cacheDir: string,
): Promise<WokData | null> {
  const key = tileModel.toLowerCase();
  const cached = wokCache.get(key);
  if (cached) return cached;
  if (missingWoks.has(key)) return null;

  const wokFile = `${key}.wok`;
  const wokPath = path.join(cacheDir, wokFile);

  // Check if already extracted
  try {
    await fs.access(wokPath);
  } catch {
    // Extract from resman
    try {
      await resmanExtract(cacheDir, { ...resmanOpts, files: [wokFile] });
    } catch {
      missingWoks.add(key);
      return null;  // WOK not found in resman
    }
  }

  try {
    const content = await fs.readFile(wokPath, "utf-8");
    const wok = parseWokFile(content);
    wokCache.set(key, wok);
    return wok;
  } catch {
    return null;
  }
}

// ─── Geometry Helpers ───────────────────────────────────────────────────────

/** 2D point-in-triangle test using barycentric coordinates (ignores Z) */
export function pointInTriangle2D(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): boolean {
  const denom = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  if (Math.abs(denom) < 1e-10) return false;  // degenerate triangle

  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / denom;
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / denom;
  const c = 1 - a - b;

  return a >= -1e-6 && b >= -1e-6 && c >= -1e-6;
}

/** Interpolate Z height at a 2D point inside a triangle using barycentric coords */
export function interpolateZ(
  px: number, py: number,
  v1: [number, number, number],
  v2: [number, number, number],
  v3: [number, number, number],
): number {
  const denom = (v2[1] - v3[1]) * (v1[0] - v3[0]) + (v3[0] - v2[0]) * (v1[1] - v3[1]);
  if (Math.abs(denom) < 1e-10) return v1[2];
  const a = ((v2[1] - v3[1]) * (px - v3[0]) + (v3[0] - v2[0]) * (py - v3[1])) / denom;
  const b = ((v3[1] - v1[1]) * (px - v3[0]) + (v1[0] - v3[0]) * (py - v3[1])) / denom;
  const c = 1 - a - b;
  return a * v1[2] + b * v2[2] + c * v3[2];
}

/**
 * Apply the inverse tile orientation rotation to convert world-local coords
 * to the tile's unrotated local space.
 *
 * Tile vertices are in unrotated space [-5, +5]. World-local coords are tile-centred.
 * Tile_Orientation n rotates the tile n x 90 degrees COUNTER-clockwise in the world, so a world-local
 * point is mapped back by rotating it n x 90 degrees CLOCKWISE: orientation 1 gives (x, y) -> (y, -x).
 * (Verified on real areas: 97% of existing creatures/waypoints probe as walkable, 99% have the
 * stored height reproduced within 0.35 m. The opposite sense scores far worse.)
 */
export function rotateForOrientation(x: number, y: number, orientation: number): [number, number] {
  switch (((orientation % 4) + 4) % 4) {
    case 0: return [x, y];
    case 1: return [y, -x];      // tile turned 90° CCW  -> point turned 90° CW
    case 2: return [-x, -y];     // 180°
    case 3: return [-y, x];      // tile turned 270° CCW -> point turned 270° CW (= 90° CCW)
    default: return [x, y];
  }
}

// ─── Walkability Check ──────────────────────────────────────────────────────

/** Tile grid of an area, decoupled from GFF so the probing code stays pure and testable. */
export interface AreaTileGrid {
  width: number;   // tiles
  height: number;  // tiles
  /** Row-major from the south-west corner: index = tileY * width + tileX. */
  tiles: Array<{ id: number; orientation: number; height: number }>;
}

/** Read the tile grid (ids, orientations, height levels) out of an ARE document. */
export function readAreaTileGrid(are: GffObj): AreaTileGrid {
  return {
    width: getFieldNum(are, "Width"),
    height: getFieldNum(are, "Height"),
    tiles: getFieldList(are, "Tile_List").map((t) => ({
      id: getFieldNum(t, "Tile_ID"),
      orientation: getFieldNum(t, "Tile_Orientation"),
      height: getFieldNum(t, "Tile_Height"),
    })),
  };
}

/** Looks up the parsed walkmesh of a tile model (null/undefined when it is not available). */
export type WokLookup = (model: string) => WokData | null | undefined;

/**
 * Probe a point, given in tile-centred local coordinates ([-5, +5] on both axes, +Y north), against one
 * tile's walkmesh. `orientation` is the ARE Tile_Orientation and `tileHeight` the ARE Tile_Height level.
 *
 * Where several faces cover the point the walkable one with the highest Z wins (a bridge over a pit); if
 * none is walkable the highest blocking face is reported. Z is the true world height: mesh Z (node offset
 * included) plus tileHeight x heightStep (the tileset's Transition; see tileHeightStep).
 */
export function probeTileLocal(
  wok: WokData,
  localX: number,
  localY: number,
  orientation: number,
  tileHeight: number,
  surfacemat?: TwoDATable,
  heightStep: number = DEFAULT_TILE_HEIGHT_STEP,
): WalkabilityResult {
  const [rx, ry] = rotateForOrientation(localX, localY, orientation);
  const lift = tileHeight * heightStep;

  let bestWalkable: WalkabilityResult | null = null;
  let bestNonWalkable: WalkabilityResult | null = null;

  for (const face of wok.faces) {
    const v1 = wok.verts[face.v1];
    const v2 = wok.verts[face.v2];
    const v3 = wok.verts[face.v3];
    if (!v1 || !v2 || !v3) continue;

    if (pointInTriangle2D(rx, ry, v1[0], v1[1], v2[0], v2[1], v3[0], v3[1])) {
      const walkable = isMaterialWalkable(face.surfaceMaterial, surfacemat);
      const zHeight = interpolateZ(rx, ry, v1, v2, v3) + lift;
      const result: WalkabilityResult = {
        walkable,
        material: getMaterialName(face.surfaceMaterial, surfacemat),
        materialId: face.surfaceMaterial,
        z: zHeight,
      };
      if (walkable) {
        if (!bestWalkable || zHeight > (bestWalkable.z ?? -Infinity)) bestWalkable = result;
      } else if (!bestNonWalkable || zHeight > (bestNonWalkable.z ?? -Infinity)) {
        bestNonWalkable = result;
      }
    }
  }

  // Prefer walkable face, fall back to non-walkable
  if (bestWalkable) return bestWalkable;
  if (bestNonWalkable) return bestNonWalkable;
  return { walkable: false, error: "Position is not covered by any walkmesh face" };
}

/** Which tile a world position falls in, plus that tile's grid entry. */
export function locateTile(
  grid: AreaTileGrid,
  worldX: number,
  worldY: number,
): { tileX: number; tileY: number; tile: AreaTileGrid["tiles"][number] } | { error: string } {
  if (worldX < 0 || worldX >= grid.width * TILE_SIZE || worldY < 0 || worldY >= grid.height * TILE_SIZE) {
    return {
      error: `Position (${worldX}, ${worldY}) is outside area bounds (0-${grid.width * TILE_SIZE}, 0-${grid.height * TILE_SIZE})`,
    };
  }
  const tileX = Math.floor(worldX / TILE_SIZE);
  const tileY = Math.floor(worldY / TILE_SIZE);
  const tileIndex = tileY * grid.width + tileX;
  const tile = grid.tiles[tileIndex];
  if (!tile) return { error: `Tile index ${tileIndex} out of range` };
  return { tileX, tileY, tile };
}

/**
 * Probe a world position against a whole area without any I/O.
 * Pipeline: world pos -> tile -> tile model (via `tileModels[tileId]`) -> .wok -> triangle test -> material.
 */
export function probeAreaPosition(
  grid: AreaTileGrid,
  tileModels: readonly string[],
  getWok: WokLookup,
  worldX: number,
  worldY: number,
  surfacemat?: TwoDATable,
  heightStep: number = DEFAULT_TILE_HEIGHT_STEP,
): WalkabilityResult {
  const loc = locateTile(grid, worldX, worldY);
  if ("error" in loc) return { walkable: false, error: loc.error };

  const model = tileModels[loc.tile.id];
  if (!model) return { walkable: false, error: `Tile ID ${loc.tile.id} not found in tileset` };
  const wok = getWok(model);
  if (!wok) return { walkable: false, error: `Walkmesh ${model}.wok not found` };

  const localX = worldX - loc.tileX * TILE_SIZE - TILE_SIZE / 2;
  const localY = worldY - loc.tileY * TILE_SIZE - TILE_SIZE / 2;
  return { ...probeTileLocal(wok, localX, localY, loc.tile.orientation, loc.tile.height, surfacemat, heightStep), heightStep };
}

/**
 * Check if a world position is walkable in a given area.
 * Pipeline: world pos → tile grid → tile model → .wok → triangle test → material check
 */
export async function checkPositionWalkable(
  worldX: number,
  worldY: number,
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
): Promise<WalkabilityResult> {
  // Get area data
  const areDoc = index.parsedGff.get(`${areaResref}.are`);
  if (!areDoc) return { walkable: false, error: `Area ${areaResref} not found` };

  const are = areDoc as GffObj;
  const grid = readAreaTileGrid(are);
  const tilesetResref = (are.Tileset as { value?: string })?.value ?? "";

  const loc = locateTile(grid, worldX, worldY);
  if ("error" in loc) return { walkable: false, error: loc.error };

  // Get tileset info to look up tile model
  const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);
  if (loc.tile.id >= tileset.tiles.length) {
    return { walkable: false, error: `Tile ID ${loc.tile.id} not found in tileset ${tilesetResref}` };
  }

  const tileModel = tileset.tiles[loc.tile.id].model;

  // Load .wok
  const cacheDir = await ensureWokCacheDir();
  const wok = await getWokForTile(tileModel, resmanOpts, cacheDir);
  if (!wok) {
    return { walkable: false, error: `Walkmesh ${tileModel}.wok not found` };
  }

  // Convert world pos to tile-local coords, then probe (rotation, node offset and tile height handled inside)
  const localX = worldX - loc.tileX * TILE_SIZE - TILE_SIZE / 2;
  const localY = worldY - loc.tileY * TILE_SIZE - TILE_SIZE / 2;
  const heightStep = tileHeightStep(tileset);
  return {
    ...probeTileLocal(wok, localX, localY, loc.tile.orientation, loc.tile.height, index.twodaTables.get("surfacemat"), heightStep),
    heightStep,
  };
}

// ─── Placement Safety Check ─────────────────────────────────────────────────

/** Buffer distance (meters) from non-walkable surfaces */
const PLACEMENT_BUFFER = 1.0;

/** Cardinal probe offsets at PLACEMENT_BUFFER distance */
const CARDINAL_PROBES: [string, number, number][] = [
  ["north", 0, PLACEMENT_BUFFER],
  ["south", 0, -PLACEMENT_BUFFER],
  ["east", PLACEMENT_BUFFER, 0],
  ["west", -PLACEMENT_BUFFER, 0],
];

/**
 * Check if a position is safe for object placement:
 * 1. The position itself must be walkable
 * 2. All cardinal probe points at `buffer` metres must also be walkable
 *
 * Use this for all placement/move tools except doors and sounds.
 * Pass a larger buffer (e.g. 2.0) for transitions that should stay clear of walls.
 */
export async function checkPlacementWalkable(
  worldX: number,
  worldY: number,
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  buffer: number = PLACEMENT_BUFFER,
): Promise<{ ok: boolean; reason?: string; z?: number }> {
  // 1. Check the position itself
  const center = await checkPositionWalkable(worldX, worldY, areaResref, index, resmanOpts);
  if (!center.walkable) {
    const detail = center.error || `surface: ${center.material} (ID ${center.materialId})`;
    return { ok: false, reason: `Position is not walkable — ${detail}` };
  }

  // 2. Check cardinal probes for buffer zone
  const probes: [string, number, number][] = [
    ["north", 0, buffer],
    ["south", 0, -buffer],
    ["east", buffer, 0],
    ["west", -buffer, 0],
  ];
  for (const [dir, dx, dy] of probes) {
    const probe = await checkPositionWalkable(worldX + dx, worldY + dy, areaResref, index, resmanOpts);
    if (!probe.walkable) {
      const surface = probe.material || "unknown";
      return { ok: false, reason: `Position is within ${buffer}m of non-walkable surface (${surface}) to the ${dir}` };
    }
  }

  return { ok: true, z: center.z };
}

// ─── Tile Walk Summary ──────────────────────────────────────────────────────

/** Compute a walkability summary for a single tile's walkmesh */
export function computeTileWalkSummary(wok: WokData, surfacemat?: TwoDATable): TileWalkSummary {
  const materials = new Map<string, number>();
  let walkableFaces = 0;
  let hasWater = false;

  for (const face of wok.faces) {
    const name = getMaterialName(face.surfaceMaterial, surfacemat);
    materials.set(name, (materials.get(name) ?? 0) + 1);

    if (isMaterialWalkable(face.surfaceMaterial, surfacemat)) {
      walkableFaces++;
    }
    if (WATER_MATERIALS.has(face.surfaceMaterial)) {
      hasWater = true;
    }
  }

  const total = wok.faces.length;
  const walkablePercent = total > 0 ? Math.round((walkableFaces / total) * 100) : 0;

  // Find dominant material — prefer walkable, fall back to any if no walkable faces
  const walkableMaterials = new Map<string, number>();
  for (const face of wok.faces) {
    if (isMaterialWalkable(face.surfaceMaterial, surfacemat)) {
      const name = getMaterialName(face.surfaceMaterial, surfacemat);
      walkableMaterials.set(name, (walkableMaterials.get(name) ?? 0) + 1);
    }
  }

  let dominantMaterial = "Unknown";
  let maxCount = 0;
  const source = walkableMaterials.size > 0 ? walkableMaterials : materials;
  for (const [name, count] of source) {
    if (count > maxCount) {
      maxCount = count;
      dominantMaterial = name;
    }
  }

  return { walkablePercent, dominantMaterial, materials, hasWater };
}

// ─── Zone Analysis ──────────────────────────────────────────────────────────

/**
 * Compute walkable zones (connected components) across an entire area.
 * Uses tile-level connectivity: two adjacent tiles are connected if both
 * have walkable areas near their shared edge.
 */
export async function computeWalkableZones(
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  tileSummaries: Map<number, TileWalkSummary>,
  transitions?: AreaTransitionInfo[],
): Promise<ZoneInfo[]> {
  const areDoc = index.parsedGff.get(`${areaResref}.are`);
  if (!areDoc) return [];

  const are = areDoc as GffObj;
  const width = getFieldNum(are, "Width");
  const height = getFieldNum(are, "Height");
  const tilesetResref = (are.Tileset as { value?: string })?.value ?? "";
  const tileList = getFieldList(are, "Tile_List");
  const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);

  // Build adjacency: tile i is connected to tile j if both are walkable
  // and they share an edge where neither side has a blocking crosser pattern
  const totalTiles = width * height;
  const walkableTiles = new Set<number>();

  for (let i = 0; i < totalTiles; i++) {
    const summary = tileSummaries.get(i);
    if (summary && summary.walkablePercent > 0) {
      walkableTiles.add(i);
    }
  }

  // Adjacency list
  const adj = new Map<number, Set<number>>();
  for (const ti of walkableTiles) {
    adj.set(ti, new Set());
  }

  for (const ti of walkableTiles) {
    const tx = ti % width;
    const ty = Math.floor(ti / width);

    // Check tile connectivity based on shared edges and crosser patterns
    const tileEntry = tileList[ti];
    const tileId = getFieldNum(tileEntry, "Tile_ID");
    const tileOri = getFieldNum(tileEntry, "Tile_Orientation");
    const tile = tileset.tiles[tileId];
    const crossers = tile ? getRotatedCrossers(tile, tileOri) : { top: "", right: "", bottom: "", left: "" };

    // Right neighbor
    if (tx + 1 < width) {
      const ni = ti + 1;
      if (walkableTiles.has(ni)) {
        // Connected unless blocked by wall crosser
        if (crossers.right !== "Wall") {
          adj.get(ti)!.add(ni);
          adj.get(ni)!.add(ti);
        }
      }
    }

    // Top neighbor (y+1)
    if (ty + 1 < height) {
      const ni = ti + width;
      if (walkableTiles.has(ni)) {
        if (crossers.top !== "Wall") {
          adj.get(ti)!.add(ni);
          adj.get(ni)!.add(ti);
        }
      }
    }
  }

  // Flood fill to find connected components
  const visited = new Set<number>();
  const zones: ZoneInfo[] = [];
  const labels = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

  for (const ti of walkableTiles) {
    if (visited.has(ti)) continue;

    const zone = new Set<number>();
    const queue = [ti];
    visited.add(ti);

    while (queue.length > 0) {
      const current = queue.shift()!;
      zone.add(current);

      for (const neighbor of adj.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    const zoneId = labels[zones.length] ?? `Z${zones.length}`;

    // Compute average walkability for the zone
    let totalWalk = 0;
    for (const t of zone) {
      totalWalk += tileSummaries.get(t)?.walkablePercent ?? 0;
    }

    // Describe zone location
    const tileCoords = [...zone].map(t => ({ x: t % width, y: Math.floor(t / width) }));
    const minX = Math.min(...tileCoords.map(c => c.x));
    const maxX = Math.max(...tileCoords.map(c => c.x));
    const minY = Math.min(...tileCoords.map(c => c.y));
    const maxY = Math.max(...tileCoords.map(c => c.y));

    let description: string;
    if (zone.size === totalTiles) {
      description = "entire area";
    } else if (zone.size > totalTiles * 0.5) {
      description = "main area";
    } else {
      // Describe by location
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const nsLabel = cy > height * 0.66 ? "N" : cy < height * 0.33 ? "S" : "";
      const ewLabel = cx > width * 0.66 ? "E" : cx < width * 0.33 ? "W" : "";
      const locStr = nsLabel + ewLabel || "center";
      description = `${zone.size} tile${zone.size > 1 ? "s" : ""}, ${locStr} area`;
    }

    zones.push({
      id: zoneId,
      tiles: zone,
      walkablePercent: zone.size > 0 ? Math.round(totalWalk / zone.size) : 0,
      connected: false,  // set below
      description,
    });
  }

  // Mark the largest zone as "main" and check connectivity
  if (zones.length > 0) {
    zones.sort((a, b) => b.tiles.size - a.tiles.size);
    zones[0].connected = true;
    zones[0].description = zones[0].tiles.size > totalTiles * 0.3 ? "main area" : zones[0].description;

    for (let i = 1; i < zones.length; i++) {
      zones[i].connected = false;
    }
  }

  // Annotate zones with area transitions (doors/triggers with active links)
  if (transitions && transitions.length > 0) {
    for (const tr of transitions) {
      const tileCol = Math.floor(tr.x / 10);
      const tileRow = Math.floor(tr.y / 10);
      if (tileCol < 0 || tileCol >= width || tileRow < 0 || tileRow >= height) continue;
      const tileIdx = tileRow * width + tileCol;
      for (const zone of zones) {
        if (zone.tiles.has(tileIdx)) {
          if (!zone.transitionsOut) zone.transitionsOut = [];
          if (!zone.transitionsOut.includes(tr.targetArea)) {
            zone.transitionsOut.push(tr.targetArea);
          }
          break;
        }
      }
    }
  }

  return zones;
}

/**
 * Load walkmesh data for all unique tiles in an area and compute summaries.
 * Returns a map from tile index → TileWalkSummary.
 */
export async function loadAreaWalkmeshData(
  areaResref: string,
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
): Promise<Map<number, TileWalkSummary>> {
  const areDoc = index.parsedGff.get(`${areaResref}.are`);
  if (!areDoc) return new Map();

  const are = areDoc as GffObj;
  const tilesetResref = (are.Tileset as { value?: string })?.value ?? "";
  const tileList = getFieldList(are, "Tile_List");

  const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);
  const surfacemat = index.twodaTables.get("surfacemat");
  const cacheDir = await ensureWokCacheDir();

  // Batch-extract unique .wok files
  const uniqueModels = new Set<string>();
  for (const entry of tileList) {
    const tileId = getFieldNum(entry, "Tile_ID");
    if (tileId < tileset.tiles.length) {
      uniqueModels.add(tileset.tiles[tileId].model.toLowerCase());
    }
  }

  // Extract all unique wok files at once; models without a walkmesh are skipped (and remembered), not fatal
  await ensureWoksExtracted(uniqueModels, resmanOpts, cacheDir);

  // Compute summaries
  const summaries = new Map<number, TileWalkSummary>();

  for (let i = 0; i < tileList.length; i++) {
    const entry = tileList[i];
    const tileId = getFieldNum(entry, "Tile_ID");
    if (tileId >= tileset.tiles.length) continue;

    const model = tileset.tiles[tileId].model;
    const wok = await getWokForTile(model, resmanOpts, cacheDir);
    if (wok) {
      summaries.set(i, computeTileWalkSummary(wok, surfacemat));
    }
  }

  return summaries;
}
