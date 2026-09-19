/**
 * Tileset .set file parser and cache.
 * Parses NWN tileset definition files into structured data for tile solving,
 * visualization, and area creation.
 */

import { resmanExtract, resmanGrep } from "../nim-tools.js";
import type { ResmanOptions } from "../nim-tools.js";
import type { ModuleIndex, TlkTable } from "../types/module.js";
import fs from "fs/promises";
import path from "path";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TilesetInfo {
  resref: string;
  displayName: string;       // resolved from TLK or raw name
  interior: boolean;
  hasHeightTransition: boolean;
  envMap: string;
  transition: number;
  border: string;
  defaultTerrain: string;
  floor: string;
  terrainTypes: TerrainType[];
  crosserTypes: CrosserType[];
  primaryRules: PrimaryRule[];
  secondaryRules: PrimaryRule[];
  tiles: TileDefinition[];
  groups: TileGroup[];
}

export interface TerrainType {
  index: number;
  name: string;
  /** Original .set file terrain name (lowercase). Matches tile corner values and validPairs keys.
   *  `name` may be overwritten by TLK resolution (e.g. "floor" → "Floor (Interior)"),
   *  but rawName always stays as the .set value so layout/solver code can match against it. */
  rawName: string;
  strref: number;
}

export interface CrosserType {
  index: number;
  name: string;
  strref: number;
}

export interface PrimaryRule {
  placed: string;
  placedHeight: number;
  adjacent: string;
  adjacentHeight: number;
  changed: string;
  changedHeight: number;
}

export interface TileDoorPlacement {
  x: number;           // tile-local offset [-5, +5]
  y: number;
  z: number;
  orientation: number; // degrees
  type: number;
}

export interface TileDefinition {
  id: number;
  model: string;
  imageMap2D: string;
  corners: TileCorners;
  crossers: TileCrossers;
  /** True if all corner heights are 0 (no elevation). Height tiles are excluded from solving. */
  flat: boolean;
  pathNode: string;
  doors: number;
  doorPlacements: TileDoorPlacement[];
  sounds: number;
  orientation: number;
  groupId: number | null;
  groupName: string | null;
}

export interface TileCorners {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
}

export interface TileCrossers {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface TileGroup {
  index: number;
  name: string;
  strref: number;
  rows: number;
  columns: number;
  tileIds: number[];  // length = rows * columns, -1 = empty slot
}

// ─── Parser ─────────────────────────────────────────────────────────────────

/** Parse a .set file content string into structured TilesetInfo */
export function parseTilesetFile(content: string, resref: string): TilesetInfo {
  const sections = parseSections(content);

  // [GENERAL]
  const general = sections.get("GENERAL") ?? {};
  const _displayNameStrref = parseInt(general.DisplayName ?? "-1", 10);
  const interior = general.Interior === "1";
  const hasHeightTransition = general.HasHeightTransition === "1";

  // [TERRAIN TYPES]
  const terrainCount = parseInt(sections.get("TERRAIN TYPES")?.Count ?? "0", 10);
  const terrainTypes: TerrainType[] = [];
  for (let i = 0; i < terrainCount; i++) {
    const s = sections.get(`TERRAIN${i}`) ?? {};
    const rawName = (s.Name ?? `Terrain${i}`).toLowerCase();
    terrainTypes.push({
      index: i,
      name: rawName,
      rawName,
      strref: parseInt(s.StrRef ?? "0", 10),
    });
  }

  // [CROSSER TYPES]
  const crosserCount = parseInt(sections.get("CROSSER TYPES")?.Count ?? "0", 10);
  const crosserTypes: CrosserType[] = [];
  for (let i = 0; i < crosserCount; i++) {
    const s = sections.get(`CROSSER${i}`) ?? {};
    crosserTypes.push({
      index: i,
      name: (s.Name ?? `Crosser${i}`).toLowerCase(),
      strref: parseInt(s.StrRef ?? "0", 10),
    });
  }

  // [PRIMARY RULES]
  const primaryRules = parseRules(sections, "PRIMARY RULE");
  const secondaryRules = parseRules(sections, "SECONDARY RULE");

  // [TILES]
  const tileCount = parseInt(sections.get("TILES")?.Count ?? "0", 10);
  const tiles: TileDefinition[] = [];
  for (let i = 0; i < tileCount; i++) {
    const s = sections.get(`TILE${i}`) ?? {};
    const tlH = parseInt(s.TopLeftHeight ?? "0", 10);
    const trH = parseInt(s.TopRightHeight ?? "0", 10);
    const blH = parseInt(s.BottomLeftHeight ?? "0", 10);
    const brH = parseInt(s.BottomRightHeight ?? "0", 10);

    // The .set file Orientation field records the rotation the tile's 3D model was
    // originally authored/designed at (used later to prefer natural-orientation
    // placements — see the solver's natural-orientation preference). It is NOT a
    // statement that TopLeft/TopRight/BottomLeft/BottomRight need un-rotating: those
    // fields already describe the tile's corners in GIT-orientation-0 terms exactly
    // as written, regardless of Orientation's value. Confirmed empirically against
    // ~/tfndev (a large hand-built PW corpus using this exact tileset): treating
    // Orientation as a required corner un-rotation scored 0-7/15 against real,
    // human-placed instances of tno01's Orientation=90 corner tiles (223's siblings
    // 209/230), while using the raw corners as-is scored 15/15. A previous version
    // of this parser un-rotated by (4 - oriSteps) steps here — do not reintroduce
    // that transform.
    const setOrientation = parseInt(s.Orientation ?? "0", 10);
    const corners: TileCorners = {
      topLeft: (s.TopLeft ?? "").toLowerCase(),
      topRight: (s.TopRight ?? "").toLowerCase(),
      bottomLeft: (s.BottomLeft ?? "").toLowerCase(),
      bottomRight: (s.BottomRight ?? "").toLowerCase(),
    };
    const crossers: TileCrossers = {
      top: (s.Top ?? "").toLowerCase(),
      right: (s.Right ?? "").toLowerCase(),
      bottom: (s.Bottom ?? "").toLowerCase(),
      left: (s.Left ?? "").toLowerCase(),
    };

    tiles.push({
      id: i,
      model: s.Model ?? "",
      imageMap2D: s.ImageMap2D ?? "",
      corners,
      crossers,
      flat: tlH === 0 && trH === 0 && blH === 0 && brH === 0,
      pathNode: s.PathNode ?? "",
      doors: parseInt(s.Doors ?? "0", 10),
      doorPlacements: [],
      sounds: parseInt(s.Sounds ?? "0", 10),
      orientation: setOrientation,
      groupId: null,
      groupName: null,
    });
  }

  // Parse [TILE<id>DOOR<n>] sections → attach to tiles
  const doorSectionPattern = /^TILE(\d+)DOOR(\d+)$/i;
  for (const [sectionName, data] of sections) {
    const m = doorSectionPattern.exec(sectionName);
    if (!m) continue;
    const tileId = parseInt(m[1], 10);
    if (tileId < 0 || tileId >= tiles.length) continue;
    tiles[tileId].doorPlacements.push({
      x: parseFloat(data.X ?? "0"),
      y: parseFloat(data.Y ?? "0"),
      z: parseFloat(data.Z ?? "0"),
      orientation: parseFloat(data.Orientation ?? "0"),
      type: parseInt(data.Type ?? "0", 10),
    });
  }

  // [GROUPS]
  const groupCount = parseInt(sections.get("GROUPS")?.Count ?? "0", 10);
  const groups: TileGroup[] = [];
  for (let i = 0; i < groupCount; i++) {
    const s = sections.get(`GROUP${i}`) ?? {};
    const rows = parseInt(s.Rows ?? "1", 10);
    const columns = parseInt(s.Columns ?? "1", 10);
    const tileIds: number[] = [];
    for (let t = 0; t < rows * columns; t++) {
      tileIds.push(parseInt(s[`Tile${t}`] ?? "-1", 10));
    }
    const group: TileGroup = {
      index: i,
      name: s.Name ?? `Group${i}`,
      strref: parseInt(s.StrRef ?? "0", 10),
      rows,
      columns,
      tileIds,
    };
    groups.push(group);

    // Tag tiles with their group membership
    for (const tid of tileIds) {
      if (tid >= 0 && tid < tiles.length) {
        tiles[tid].groupId = i;
        tiles[tid].groupName = group.name;
      }
    }
  }

  return {
    resref,
    displayName: general.Name ?? resref.toUpperCase(),
    interior,
    hasHeightTransition,
    envMap: general.EnvMap ?? "",
    transition: parseInt(general.Transition ?? "0", 10),
    border: general.Border ?? "",
    defaultTerrain: (general.Default ?? terrainTypes[0]?.name ?? "").toLowerCase(),
    floor: general.Floor ?? "",
    terrainTypes,
    crosserTypes,
    primaryRules,
    secondaryRules,
    tiles,
    groups,
  };
}

function parseRules(sections: Map<string, Record<string, string>>, prefix: string): PrimaryRule[] {
  const _countSection = sections.get(`${prefix.replace(/ RULE$/, "")}${prefix.includes("PRIMARY") ? " RULES" : " RULES"}`);
  // Try both "PRIMARY RULES" and "SECONDARY RULES"
  const key = prefix.startsWith("PRIMARY") ? "PRIMARY RULES" : "SECONDARY RULES";
  const count = parseInt(sections.get(key)?.Count ?? "0", 10);
  const rules: PrimaryRule[] = [];
  for (let i = 0; i < count; i++) {
    const s = sections.get(`${prefix}${i}`) ?? {};
    rules.push({
      placed: s.Placed ?? "",
      placedHeight: parseInt(s.PlacedHeight ?? "0", 10),
      adjacent: s.Adjacent ?? "",
      adjacentHeight: parseInt(s.AdjacentHeight ?? "0", 10),
      changed: s.Changed ?? "",
      changedHeight: parseInt(s.ChangedHeight ?? "0", 10),
    });
  }
  return rules;
}

/** Parse INI-style sections from .set file content */
function parseSections(content: string): Map<string, Record<string, string>> {
  const sections = new Map<string, Record<string, string>>();
  let currentSection = "";
  let currentData: Record<string, string> = {};

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith(";")) continue;

    if (line.startsWith("[") && line.endsWith("]")) {
      if (currentSection) {
        sections.set(currentSection, currentData);
      }
      currentSection = line.slice(1, -1);
      currentData = {};
    } else {
      const eqIdx = line.indexOf("=");
      if (eqIdx > 0) {
        const key = line.substring(0, eqIdx);
        const value = line.substring(eqIdx + 1);
        currentData[key] = value;
      }
    }
  }
  if (currentSection) {
    sections.set(currentSection, currentData);
  }

  return sections;
}

// ─── Door Placement Helpers ─────────────────────────────────────────────────

/** Forward-rotate a point by tile orientation (local→world). Same as area-data forwardRotate. */
function forwardRotateDoor(x: number, y: number, orientation: number): [number, number] {
  switch (orientation % 4) {
    case 0: return [x, y];
    case 1: return [-y, x];
    case 2: return [-x, -y];
    case 3: return [y, -x];
    default: return [x, y];
  }
}

/**
 * New-footprint dimensions after rotating a `columns`x`rows` group by
 * `rotation` quarter-turns. 90°/270° swap columns and rows; 0°/180° don't.
 */
export function rotatedGroupDimensions(
  columns: number,
  rows: number,
  rotation: 0 | 1 | 2 | 3,
): { columns: number; rows: number } {
  return rotation % 2 === 0 ? { columns, rows } : { columns: rows, rows: columns };
}

/**
 * Given a target slot (ngc, ngr) within a group's FOOTPRINT AFTER rotating it
 * by `rotation` quarter-turns, return which NATIVE (pre-rotation) grid slot's
 * tileId belongs there — i.e. this is the inverse map a caller writing a
 * rotated group's tiles needs: iterate the rotated footprint's cells, call
 * this once per cell, read `group.tileIds[gr * columns + gc]` from the
 * result.
 *
 * Derived by transforming the group footprint's own corners through the same
 * point-rotation this codebase already uses for doors/corners
 * (`forwardRotateDoor`'s case 0-3), then inverting. Cross-checked three
 * independent ways before trusting it (direct per-rotation corner-transform,
 * and composing the 90° step two/three times to re-derive 180°/270°
 * algebraically) — all three agreed. Still carries the same handedness
 * caveat as `getGroupEntrances`: the DIRECTION "rotation=1" turns a group has
 * not been independently confirmed against a real toolset render of an
 * actually-rotated multi-tile group, only checked for internal
 * self-consistency.
 */
export function rotateGroupTileIndex(
  ngc: number,
  ngr: number,
  columns: number,
  rows: number,
  rotation: 0 | 1 | 2 | 3,
): { gc: number; gr: number } {
  switch (rotation) {
    case 0: return { gc: ngc, gr: ngr };
    case 1: return { gc: ngr, gr: rows - ngc - 1 };
    case 2: return { gc: columns - ngc - 1, gr: rows - ngr - 1 };
    case 3: return { gc: columns - ngr - 1, gr: ngc };
    default: return { gc: ngc, gr: ngr };
  }
}

/** Compute world-space door positions for a tile placed at (col, row) with given orientation. */
export function getTileDoorWorldPositions(
  tile: TileDefinition,
  col: number,
  row: number,
  tileOrientation: number,
): Array<{ x: number; y: number; z: number; bearing: number }> {
  return tile.doorPlacements.map((dp) => {
    const [rx, ry] = forwardRotateDoor(dp.x, dp.y, tileOrientation);
    return {
      x: col * 10 + 5 + rx,
      y: row * 10 + 5 + ry,
      z: dp.z,
      bearing: (dp.orientation + tileOrientation * 90) % 360,
    };
  });
}

/** Quantize a bearing (degrees, 0=east/+X, counterclockwise per NWN convention) to the nearest cardinal side. */
function bearingToSide(bearing: number): "N" | "S" | "E" | "W" {
  const normalized = ((bearing % 360) + 360) % 360;
  if (normalized >= 45 && normalized < 135) return "N";
  if (normalized >= 135 && normalized < 225) return "W";
  if (normalized >= 225 && normalized < 315) return "S";
  return "E";
}

export interface GroupEntrance {
  /** Native (rotation=0), pre-rotation tile-slot column/row within the group's own grid. */
  localCol: number;
  localRow: number;
  /** Native-space (rotation=0) group-local coordinates — NOT remapped for `rotation`. */
  x: number;
  y: number;
  /** Native-space bearing (rotation=0). */
  bearing: number;
  /** Which side of the group's footprint this door opens onto, AFTER applying `rotation`. */
  side: "N" | "S" | "E" | "W";
}

const SIDE_ORDER: Array<"N" | "S" | "E" | "W"> = ["N", "E", "S", "W"];

/** Rotate a cardinal side by `steps` quarter-turns, matching this codebase's case-1=90°CW convention. */
function rotateSide(side: "N" | "S" | "E" | "W", steps: number): "N" | "S" | "E" | "W" {
  const idx = SIDE_ORDER.indexOf(side);
  return SIDE_ORDER[(idx + steps) % 4];
}

/**
 * Every EXTERIOR door a tile group has — generalizes findFeatureDoorPosition's
 * (layout-generator.ts) door scan, which only ever returned the first exterior
 * door for transition-portal placement. Same classification logic (a door is
 * "exterior" if its outward offset point lands off the group's own footprint),
 * reused rather than re-derived, now returning all of them plus a cardinal
 * `side` so a caller can reason about which face of the group to point at a
 * road/avenue.
 *
 * Deliberately does NOT re-derive door world-positions at a rotated tile
 * placement — that would require the same grid-slot remap
 * (`rotateGroupTileIndex` in layout-generator.ts) this function would then
 * have to duplicate, doubling the surface area for a rotation-handedness
 * mistake. Instead: door geometry (x/y/bearing/localCol/localRow) is always
 * computed at native orientation (rotation=0, the same math
 * findFeatureDoorPosition already used and this project already trusts), and
 * `rotation` only rotates the returned `side` label by simple compass
 * arithmetic (N->E->S->W->N per quarter-turn) — a much smaller, independently
 * checkable piece of logic than re-deriving positions.
 *
 * HANDEDNESS NOTE: `rotateSide`'s direction (N->E for rotation=1) is chosen to
 * match this codebase's existing "case 1 = 90° CW" convention
 * (`forwardRotateDoor`/`getRotatedCorners`), but has NOT been independently
 * cross-checked against a real multi-tile group placed in the toolset/engine
 * the way that per-tile convention was (see CLAUDE.md's "Tile rotation"
 * pitfall for the verification bar this project normally holds itself to).
 * Treat `side` for a nonzero `rotation` as unverified until checked against a
 * real toolset render of an actually-rotated group.
 */
export function getGroupEntrances(group: TileGroup, tileset: TilesetInfo, rotation: 0 | 1 | 2 | 3 = 0): GroupEntrance[] {
  const OFFSET = 3.0;
  const featureTileSet = new Set<string>();
  for (let gc = 0; gc < group.columns; gc++) {
    for (let gr = 0; gr < group.rows; gr++) {
      featureTileSet.add(`${gc},${gr}`);
    }
  }

  const entrances: GroupEntrance[] = [];
  for (let gr = 0; gr < group.rows; gr++) {
    for (let gc = 0; gc < group.columns; gc++) {
      const tileId = group.tileIds[gr * group.columns + gc];
      if (tileId < 0) continue;
      const tile = tileset.tiles[tileId];
      if (!tile || tile.doors === 0) continue;

      // Group-local coordinates (origin at (0,0), not world space) — reuse
      // getTileDoorWorldPositions at native orientation (0) with the group's
      // own (gc, gr) as the "col/row" args, matching findFeatureDoorPosition.
      const doorPositions = getTileDoorWorldPositions(tile, gc, gr, 0);
      for (const door of doorPositions) {
        const rad = (door.bearing * Math.PI) / 180;
        const offsetX = door.x + Math.cos(rad) * OFFSET;
        const offsetY = door.y + Math.sin(rad) * OFFSET;
        const offsetTileCol = Math.floor(offsetX / 10);
        const offsetTileRow = Math.floor(offsetY / 10);
        const isExterior = !featureTileSet.has(`${offsetTileCol},${offsetTileRow}`);
        if (!isExterior) continue;
        entrances.push({
          localCol: gc,
          localRow: gr,
          x: Math.round(door.x * 10) / 10,
          y: Math.round(door.y * 10) / 10,
          bearing: door.bearing,
          side: rotateSide(bearingToSide(door.bearing), rotation),
        });
      }
    }
  }
  return entrances;
}

// ─── Tileset Cache ──────────────────────────────────────────────────────────

const tilesetCache = new Map<string, TilesetInfo>();

/** Clear the tileset cache (call on load_module) */
export function clearTilesetCache(): void {
  tilesetCache.clear();
}

/** Get tileset info, loading from resman if needed */
export async function getTilesetInfo(
  resref: string,
  resmanOpts: ResmanOptions,
  index: ModuleIndex,
): Promise<TilesetInfo> {
  const key = resref.toLowerCase();
  const cached = tilesetCache.get(key);
  if (cached) return cached;

  // Extract .set file from resman to temp
  const destDir = path.join(index.tempDir, "tileset_cache");
  await fs.mkdir(destDir, { recursive: true });
  const setFile = `${key}.set`;
  await resmanExtract(destDir, {
    ...resmanOpts,
    files: [setFile],
  });

  const content = await fs.readFile(path.join(destDir, setFile), "utf-8");
  const info = parseTilesetFile(content, key);

  // Resolve display name from TLK if available
  const strref = parseInt(
    parseSections(content).get("GENERAL")?.DisplayName ?? "-1",
    10,
  );
  if (strref >= 0) {
    const resolved = resolveTlk(strref, index.baseTlk, index.customTlk);
    if (resolved) info.displayName = resolved;
  }

  // Resolve group display names from TLK
  for (const group of info.groups) {
    if (group.strref > 0) {
      const resolved = resolveTlk(group.strref, index.baseTlk, index.customTlk);
      if (resolved) group.name = resolved;
    }
  }

  // Resolve terrain type display names from TLK
  for (const terrain of info.terrainTypes) {
    if (terrain.strref > 0) {
      const resolved = resolveTlk(terrain.strref, index.baseTlk, index.customTlk);
      if (resolved) terrain.name = resolved;
    }
  }

  tilesetCache.set(key, info);
  return info;
}

function resolveTlk(strref: number, baseTlk: TlkTable | null, customTlk: TlkTable | null): string | null {
  // Custom TLK strrefs are >= 0x01000000
  if (strref >= 0x01000000 && customTlk) {
    return customTlk.get(strref - 0x01000000) ?? null;
  }
  return baseTlk?.get(strref) ?? null;
}

/** List all tilesets available via resman */
export async function listAllTilesets(resmanOpts: ResmanOptions): Promise<string[]> {
  const output = await resmanGrep({ ...resmanOpts, pattern: ".set" });
  return output
    .trim()
    .split("\n")
    .map(line => line.trim().split(/\s+/)[0] ?? "")
    .filter(line => line.endsWith(".set"))
    .map(line => path.basename(line, ".set").toLowerCase());
}

// ─── Tile Orientation Helpers ───────────────────────────────────────────────

/**
 * Get the effective corners of a tile after applying orientation rotation.
 * When a tile is rotated, its corners rotate with it.
 *
 * The tile's stored corners are normalized to GIT orientation 0 at parse time
 * (un-rotated from the .set Orientation). After rotation by the GIT placement
 * orientation, the result is the corners as rendered by the engine.
 */
export function getRotatedCorners(tile: TileDefinition, orientation: number): TileCorners {
  const c = tile.corners;
  switch (orientation % 4) {
    case 0: return { ...c };
    case 1: // 90° CW: TR→TL, BR→TR, BL→BR, TL→BL
      return {
        topLeft: c.topRight,
        topRight: c.bottomRight,
        bottomRight: c.bottomLeft,
        bottomLeft: c.topLeft,
      };
    case 2: // 180°: BR→TL, BL→TR, TL→BR, TR→BL
      return {
        topLeft: c.bottomRight,
        topRight: c.bottomLeft,
        bottomRight: c.topLeft,
        bottomLeft: c.topRight,
      };
    case 3: // 270° CW: BL→TL, TL→TR, TR→BR, BR→BL
      return {
        topLeft: c.bottomLeft,
        topRight: c.topLeft,
        bottomRight: c.topRight,
        bottomLeft: c.bottomRight,
      };
    default: return { ...c };
  }
}

/**
 * Get the effective crossers of a tile after applying orientation rotation.
 */
export function getRotatedCrossers(tile: TileDefinition, orientation: number): TileCrossers {
  const cr = tile.crossers;
  switch (orientation % 4) {
    case 0: return { ...cr };
    case 1: return { top: cr.right, right: cr.bottom, bottom: cr.left, left: cr.top };       // 90° CW
    case 2: return { top: cr.bottom, right: cr.left, bottom: cr.top, left: cr.right };      // 180°
    case 3: return { top: cr.left, right: cr.top, bottom: cr.right, left: cr.bottom };      // 270° CW
    default: return { ...cr };
  }
}

/**
 * Find the group that a tile ID belongs to, if any.
 */
export function findTileGroup(tileset: TilesetInfo, tileId: number): TileGroup | null {
  for (const group of tileset.groups) {
    if (group.tileIds.includes(tileId)) return group;
  }
  return null;
}
