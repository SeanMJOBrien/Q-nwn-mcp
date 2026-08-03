/**
 * Tileset .set "rules" analysis — group shape verification, flat filler
 * detection, and light data-integrity checks.
 *
 * Ports the heuristics from settileLibrary's tools/set_analyze.py
 * (https://github.com/... a companion NWScript runtime-tile-editing library)
 * onto this project's own tileset.ts parser, rather than re-parsing .set
 * files independently. tileset.ts's TilesetInfo already has everything these
 * checks need: tiles[].corners/crossers/model (pre-normalized to GIT
 * orientation 0) and groups[].tileIds (raw .set row-major-from-north order,
 * -1 for holes).
 *
 * WHY THIS EXISTS SEPARATELY FROM get_tileset_details
 *
 * get_tileset_details reports what a group DECLARES (Rows/Columns, tile
 * IDs). It does not check whether that declaration is trustworthy. Two
 * traps a declared shape can hide:
 *
 *   1. A group's Name lies about its shape. Stock tcn01 has both
 *      SlumHouse_1x2 and Market_2x1 at Rows=1 Columns=2 - the "NxM" naming
 *      convention is not consistent even within one stock tileset, so a
 *      caller trusting the name over Rows/Columns places the wrong footprint.
 *   2. Rows/Columns can themselves be unreliable for a hand-assembled
 *      feature that borrows tiles from elsewhere in the tileset (stock
 *      tcn01's StateBuilding02 reuses model y08 where y07's neighbour would
 *      be expected). These are legitimate, usable groups - they just cannot
 *      be automatically verified, which callers doing programmatic
 *      generation need to know.
 *
 * analyzeGroupLayout cross-checks a group's declared grid against an
 * INDEPENDENT signal: tile model names. Models follow
 * `<set>_<letters><number>_<variant>` (e.g. `tcn01_u02_01`), and in a
 * rectangular feature one of those two parts varies with the column and the
 * other with the row - so if the declared layout is right, each part is
 * constant along its own axis. Which part maps to which axis is not
 * universal (tcn01 uses letters for columns; the Ampitheater's amp01 does
 * the opposite), so both assignments are tried before concluding the group
 * is genuinely irregular.
 */

import type { TilesetInfo, TileGroup, TileDefinition } from "./tileset.js";

// ─── Model name parsing ──────────────────────────────────────────────────────

const MODEL_RE = /^([a-z0-9]+)_([a-z]+)(\d+)_(\d+)$/i;

interface ParsedModel {
  setName: string;
  col: string;   // lowercase letter run, e.g. "u"
  row: number;   // the number run, e.g. 2 for "u02"
}

function parseModel(model: string): ParsedModel | null {
  const m = MODEL_RE.exec(model ?? "");
  if (!m) return null;
  return { setName: m[1], col: m[2].toLowerCase(), row: parseInt(m[3], 10) };
}

// ─── Group shape verification ────────────────────────────────────────────────

export type GroupLayoutVerdict = "confirmed" | "irregular" | "n/a";

export interface GroupLayoutResult {
  index: number;
  name: string;
  rows: number;
  columns: number;
  holes: number;
  verdict: GroupLayoutVerdict;
  detail: string;
}

/** Row-major-from-north tileIds -> (dx,dy) offsets from the south-west tile
 *  with +y north, mirroring the flip settileLibrary's set_groups.py applies
 *  when emitting TileGroupAdd() calls (that same flip is why this function
 *  exists at all - getting it wrong here would silently validate against
 *  the wrong grid position). Holes (-1) are skipped but still counted. */
function groupOffsets(group: TileGroup): { offsets: Map<string, number>; holes: number } {
  const offsets = new Map<string, number>();
  let holes = 0;
  const { rows, columns, tileIds } = group;
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const index = row * columns + column;
      const tileId = tileIds[index];
      if (tileId === undefined) continue;
      if (tileId < 0) { holes++; continue; }
      const dx = column, dy = rows - 1 - row;
      offsets.set(`${dx},${dy}`, tileId);
    }
  }
  return { offsets, holes };
}

/** One candidate axis assignment: does colKeyFn stay constant down every
 *  column, and rowKeyFn stay constant across every row? */
function tryAssignment(
  grid: Map<string, ParsedModel>,
  columns: number,
  rows: number,
  colKeyFn: (p: ParsedModel) => string,
  rowKeyFn: (p: ParsedModel) => string,
): boolean {
  for (let dx = 0; dx < columns; dx++) {
    const keys = new Set<string>();
    for (const [key, parsed] of grid) {
      if (Number(key.split(",")[0]) === dx) keys.add(colKeyFn(parsed));
    }
    if (keys.size > 1) return false;
  }
  for (let dy = 0; dy < rows; dy++) {
    const keys = new Set<string>();
    for (const [key, parsed] of grid) {
      if (Number(key.split(",")[1]) === dy) keys.add(rowKeyFn(parsed));
    }
    if (keys.size > 1) return false;
  }
  return true;
}

/** Cross-check one group's declared Rows/Columns against its tiles' model
 *  names. See the file header for the full reasoning. */
export function analyzeGroupLayout(tileset: TilesetInfo, group: TileGroup): GroupLayoutResult {
  const base = { index: group.index, name: group.name, rows: group.rows, columns: group.columns };

  if (group.rows < 1 || group.columns < 1) {
    return { ...base, holes: 0, verdict: "n/a", detail: "no Rows/Columns" };
  }

  const { offsets, holes } = groupOffsets(group);
  const grid = new Map<string, ParsedModel>();
  for (const [key, tileId] of offsets) {
    const tile: TileDefinition | undefined = tileset.tiles[tileId];
    const parsed = tile ? parseModel(tile.model) : null;
    if (!parsed) {
      return { ...base, holes, verdict: "n/a", detail: `model ${JSON.stringify(tile?.model ?? "")} off-convention` };
    }
    grid.set(key, parsed);
  }
  if (grid.size === 0) {
    return { ...base, holes, verdict: "n/a", detail: "no parseable tiles" };
  }

  const letterIsColumns = tryAssignment(
    grid, group.columns, group.rows,
    p => p.col, p => String(p.row),
  );
  if (letterIsColumns) {
    return { ...base, holes, verdict: "confirmed", detail: "letters=columns, numbers=rows" };
  }
  const letterIsRows = tryAssignment(
    grid, group.columns, group.rows,
    p => String(p.row), p => p.col,
  );
  if (letterIsRows) {
    return { ...base, holes, verdict: "confirmed", detail: "letters=rows, numbers=columns" };
  }

  // Neither assignment held - report which columns actually mix both letters
  // and numbers, the same diagnostic set_analyze.py prints for "irregular".
  const conflicts: string[] = [];
  for (let dx = 0; dx < group.columns; dx++) {
    const letters = new Set<string>();
    const numbers = new Set<number>();
    for (const [key, parsed] of grid) {
      if (Number(key.split(",")[0]) === dx) {
        letters.add(parsed.col);
        numbers.add(parsed.row);
      }
    }
    if (letters.size > 1 && numbers.size > 1) {
      conflicts.push(`column ${dx} spans letters [${[...letters].sort().join(",")}] and numbers [${[...numbers].sort((a, b) => a - b).join(",")}]`);
    }
  }
  return {
    ...base, holes, verdict: "irregular",
    detail: conflicts.length > 0 ? conflicts.join("; ") : "no consistent row/column grid",
  };
}

export function analyzeAllGroups(tileset: TilesetInfo): GroupLayoutResult[] {
  return tileset.groups.map(g => analyzeGroupLayout(tileset, g));
}

// ─── Flat filler detection ───────────────────────────────────────────────────

/** True if every corner is exactly wantTerrain, no crosser on any edge, and
 *  the tile has no height transition. Extends TileDefinition.flat (which
 *  only checks that all four corner heights are 0) with the terrain and
 *  crosser conditions settileLibrary's is_flat_filler requires - a tile can
 *  be flat=true and still be useless as a uniform fill if its corners mix
 *  terrains or it carries a crosser (a road/wall/stream cutting across it). */
export function isFlatFillerTile(tile: TileDefinition, terrain: string): boolean {
  if (!tile.flat) return false;
  const want = terrain.toLowerCase();
  const c = tile.corners;
  if (c.topLeft !== want || c.topRight !== want || c.bottomLeft !== want || c.bottomRight !== want) return false;
  const cr = tile.crossers;
  return !cr.top && !cr.right && !cr.bottom && !cr.left;
}

/** Flat filler tile IDs, grouped by terrain type name (only terrains with at
 *  least one filler tile are included). */
export function findFlatFillerTiles(tileset: TilesetInfo): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  for (const terrain of tileset.terrainTypes) {
    const ids = tileset.tiles
      .filter(t => isFlatFillerTile(t, terrain.rawName))
      .map(t => t.id);
    if (ids.length > 0) result[terrain.rawName] = ids;
  }
  return result;
}

// ─── Light integrity checks ──────────────────────────────────────────────────

export interface TilesetIntegrityResult {
  tileCount: number;
  groupCount: number;
  /** Groups whose tileIds reference a tile ID outside [0, tileCount) - not
   *  counting holes (-1), which are legitimate. Each entry names the group
   *  and the offending tile ID(s); a group that hits this cannot be stamped
   *  safely as declared. */
  groupsWithOutOfRangeTiles: Array<{ index: number; name: string; badTileIds: number[] }>;
}

export function checkTilesetIntegrity(tileset: TilesetInfo): TilesetIntegrityResult {
  const groupsWithOutOfRangeTiles: Array<{ index: number; name: string; badTileIds: number[] }> = [];
  for (const group of tileset.groups) {
    const bad = group.tileIds.filter(id => id !== -1 && (id < 0 || id >= tileset.tiles.length));
    if (bad.length > 0) {
      groupsWithOutOfRangeTiles.push({ index: group.index, name: group.name, badTileIds: [...new Set(bad)] });
    }
  }
  return {
    tileCount: tileset.tiles.length,
    groupCount: tileset.groups.length,
    groupsWithOutOfRangeTiles,
  };
}
