/**
 * Area checker — .are geometry/tiles, .git contents, .gic sync.
 *
 * Catches the "sentries on the castle roof" class of defect: objects that are
 * structurally valid but placed somewhere the player can never reach.
 */

import type { ResmanOptions } from "../../nim-tools.js";
import type { GffObj } from "../../types/gff.js";
import { getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { getTilesetInfo } from "../tileset.js";
import { computeWalkableZones, loadAreaWalkmeshData } from "../walkmesh.js";
import { checkScriptRef, listOf, type Report } from "./common.js";

/** GIT object lists, with the position field names each uses. */
export const GIT_OBJECT_LISTS = [
  { name: "Creature List", xField: "XPosition", yField: "YPosition", label: "creature" },
  { name: "Placeable List", xField: "X", yField: "Y", label: "placeable" },
  { name: "Door List", xField: "X", yField: "Y", label: "door" },
  { name: "WaypointList", xField: "XPosition", yField: "YPosition", label: "waypoint" },
  { name: "TriggerList", xField: "XPosition", yField: "YPosition", label: "trigger" },
  { name: "Encounter List", xField: "XPosition", yField: "YPosition", label: "encounter" },
  { name: "SoundList", xField: "XPosition", yField: "YPosition", label: "sound" },
  { name: "StoreList", xField: "XPosition", yField: "YPosition", label: "store" },
] as const;

/** Metres per tile in NWN. */
const TILE_SIZE = 10.0;

export interface AreaVerifyOptions {
  /** Run the walkmesh reachability pass (slower — needs .wok extraction). */
  checkWalkable?: boolean;
  resmanOpts?: ResmanOptions;
}

export async function verifyArea(
  report: Report,
  index: ModuleIndex,
  areaResref: string,
  opts: AreaVerifyOptions = {},
): Promise<void> {
  const areDoc = index.parsedGff.get(`${areaResref}.are`) as GffObj | undefined;
  const gitDoc = index.parsedGff.get(`${areaResref}.git`) as GffObj | undefined;

  if (!areDoc) {
    report.error("missing_are", `No ${areaResref}.are in the module`, undefined, "create_area");
    return;
  }
  if (!gitDoc) {
    report.error(
      "missing_git",
      `No ${areaResref}.git in the module — the area has no contents`,
      undefined,
      "create_area",
    );
    return;
  }

  const width = getFieldNum(areDoc, "Width");
  const height = getFieldNum(areDoc, "Height");
  const tilesetResref = getFieldStr(areDoc, "Tileset");

  // ─── Dimensions vs tile list ────────────────────────────────────────────
  if (width < 1 || height < 1) {
    report.error("invalid_dimensions", `Area dimensions are ${width}x${height}`, "Width/Height");
  }
  const tiles = listOf(areDoc, "Tile_List");
  const expected = width * height;
  if (tiles.length !== expected) {
    report.error(
      "tile_count_mismatch",
      `Tile_List has ${tiles.length} tiles but Width x Height is ${width}x${height} = ${expected} — the area will not load correctly`,
      "Tile_List",
    );
  }

  // ─── Tileset and tile IDs ───────────────────────────────────────────────
  if (!tilesetResref) {
    report.error("missing_tileset", "Area has no Tileset resref", "Tileset");
  } else if (opts.resmanOpts) {
    try {
      const tileset = await getTilesetInfo(tilesetResref, opts.resmanOpts, index);
      const tileCount = tileset.tiles.length;
      if (tileCount > 0) {
        const outOfRange: number[] = [];
        for (const [i, tile] of tiles.entries()) {
          const id = getFieldNum(tile, "Tile_ID");
          if (id < 0 || id >= tileCount) outOfRange.push(i);
        }
        if (outOfRange.length > 0) {
          report.error(
            "tile_id_out_of_range",
            `${outOfRange.length} tile(s) reference an ID outside tileset "${tilesetResref}" (0-${tileCount - 1}); first at index ${outOfRange[0]}`,
            "Tile_List",
          );
        }
      }
    } catch {
      // Tileset unavailable in this environment — not a defect in the area.
    }
  }

  // ─── Area scripts ───────────────────────────────────────────────────────
  for (const field of ["OnEnter", "OnExit", "OnHeartbeat", "OnUserDefined"]) {
    checkScriptRef(report, index, getFieldStr(areDoc, field), field);
  }

  // ─── Object positions ───────────────────────────────────────────────────
  const maxX = width * TILE_SIZE;
  const maxY = height * TILE_SIZE;
  const placed: Array<{ label: string; tag: string; x: number; y: number }> = [];

  for (const { name, xField, yField, label } of GIT_OBJECT_LISTS) {
    for (const [i, obj] of listOf(gitDoc, name).entries()) {
      const x = getFieldNum(obj, xField);
      const y = getFieldNum(obj, yField);
      const tag = getFieldStr(obj, "Tag") || `${label}[${i}]`;

      if (x < 0 || y < 0 || x > maxX || y > maxY) {
        report.error(
          "object_out_of_bounds",
          `${label} "${tag}" is at (${x.toFixed(1)}, ${y.toFixed(1)}) which is outside the area's ${maxX}x${maxY}m bounds`,
          `${name}.${i}`,
          "move_object to a position inside the area",
        );
      }
      placed.push({ label, tag, x, y });
    }
  }

  // ─── GIC sync ───────────────────────────────────────────────────────────
  // Objects present in GIT but not GIC exist in-game yet are invisible in the toolset.
  const gicDoc = index.parsedGff.get(`${areaResref}.gic`) as GffObj | undefined;
  if (!gicDoc) {
    report.warn(
      "missing_gic",
      "Area has no .gic — objects will function in-game but be invisible in the toolset",
      undefined,
      "writeBackGit syncs the GIC automatically; re-save via a placement tool",
    );
  } else {
    for (const { name, label } of GIT_OBJECT_LISTS) {
      const gitCount = listOf(gitDoc, name).length;
      const gicCount = listOf(gicDoc, name).length;
      if (gitCount !== gicCount) {
        report.error(
          "gic_out_of_sync",
          `GIC has ${gicCount} ${label}(s) but GIT has ${gitCount} — the toolset will not show all objects`,
          name,
          "re-run a placement tool on this area to resync, or repack after writeBackGit",
        );
      }
    }
  }

  // ─── Walkability / reachability ─────────────────────────────────────────
  if (opts.checkWalkable && opts.resmanOpts) {
    try {
      const walkData = await loadAreaWalkmeshData(areaResref, index, opts.resmanOpts);
      const zones = await computeWalkableZones(areaResref, index, opts.resmanOpts, walkData);
      if (zones && zones.length > 0) {
        // Objects a player must interact with need to sit in a walkable zone.
        const INTERACTIVE = new Set(["creature", "placeable", "store", "door"]);
        // ZoneInfo.tiles is a Set of tile indices (y * width + x).
        const largest = zones.reduce((a, b) => (b.tiles.size > a.tiles.size ? b : a));

        for (const obj of placed) {
          if (!INTERACTIVE.has(obj.label)) continue;
          const tileX = Math.floor(obj.x / TILE_SIZE);
          const tileY = Math.floor(obj.y / TILE_SIZE);
          if (!largest.tiles.has(tileY * width + tileX)) {
            report.warn(
              "object_outside_main_zone",
              `${obj.label} "${obj.tag}" at (${obj.x.toFixed(1)}, ${obj.y.toFixed(1)}) is not in the area's largest walkable zone — the player may be unable to reach it`,
              undefined,
              "adventure_find_walkable to get a guaranteed-reachable position, then move_object",
            );
          }
        }

        if (zones.length > 1) {
          report.warn(
            "area_fragmented",
            `Area has ${zones.length} disconnected walkable zones — parts of it may be unreachable without a transition`,
          );
        }
      }
    } catch {
      // Walkmesh unavailable — skip rather than reporting a false defect.
    }
  }
}
