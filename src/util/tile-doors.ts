/**
 * Plans the doors a painted area's tiles imply (the .set `[TILE<id>DOOR<n>]` sections), so place_tile_doors can place
 * and lock them in one call. Pure: no module access.
 *
 * A door placement's `type` is a row of doortypes.2da whose TemplateResRef is the exact door blueprint that tile
 * expects (never genericdoors.2da). Row 0 ("Generic") has no blueprint, so such a door is reported, not guessed.
 * A tile that also carries a crosser is a corridor doorway and stays unlocked; every other tile door is aesthetic
 * and is locked and made plot, like a gate nothing opens until a quest says so.
 */

import { getTileDoorWorldPositions, type TileDefinition } from "./tileset.js";

export interface TileCell {
  col: number;
  row: number;
  tileId: number;
  orientation: number;
}

export interface PlannedDoor {
  col: number;
  row: number;
  tileId: number;
  x: number;
  y: number;
  bearing: number;
  blueprint: string;
  /** Lock and make plot (a gate); false for a corridor doorway. */
  lock: boolean;
}

export interface TileDoorPlan {
  doors: PlannedDoor[];
  /** Already a door within 1 m — left alone, so the tool can be run twice. */
  alreadyPlaced: number;
  skipped: Array<{ col: number; row: number; tileId: number; reason: string }>;
}

const SAME_SPOT = 1;

export function planTileDoors(
  cells: TileCell[],
  tiles: TileDefinition[],
  doorTypeResref: (type: number) => string | undefined,
  existing: Array<{ x: number; y: number }>,
): TileDoorPlan {
  const plan: TileDoorPlan = { doors: [], alreadyPlaced: 0, skipped: [] };
  for (const cell of cells) {
    const tile = tiles[cell.tileId];
    if (!tile || tile.doorPlacements.length === 0) continue;
    const positions = getTileDoorWorldPositions(tile, cell.col, cell.row, cell.orientation);
    const corridor = [tile.crossers.top, tile.crossers.right, tile.crossers.bottom, tile.crossers.left].some(
      (c) => c && c !== "" && c.toLowerCase() !== "none" && c !== "****",
    );
    tile.doorPlacements.forEach((dp, i) => {
      const pos = positions[i];
      const blueprint = doorTypeResref(dp.type);
      if (!blueprint) {
        plan.skipped.push({
          col: cell.col,
          row: cell.row,
          tileId: cell.tileId,
          reason: `door type ${dp.type} has no TemplateResRef in doortypes.2da (generic); place one by hand with place_door`,
        });
        return;
      }
      if (existing.some((e) => Math.hypot(e.x - pos.x, e.y - pos.y) < SAME_SPOT)) {
        plan.alreadyPlaced++;
        return;
      }
      plan.doors.push({
        col: cell.col,
        row: cell.row,
        tileId: cell.tileId,
        x: pos.x,
        y: pos.y,
        bearing: pos.bearing,
        blueprint,
        lock: !corridor,
      });
    });
  }
  return plan;
}
