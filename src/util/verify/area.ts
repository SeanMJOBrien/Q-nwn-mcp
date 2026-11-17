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
import {
  areaObjects,
  computeModuleReachability,
  isMarkedUnreachableOk,
  locateObject,
  type ModuleReachability,
  type PlacedObject,
} from "../area-walk-graph.js";
import { closestApproach, describeComponent } from "../walk-graph.js";
import { checkScriptRef, isBaseGameScript, listOf, type Report } from "./common.js";

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
  /** Module reachability computed once for all areas (verify_all); computed here when absent. */
  reachability?: ModuleReachability;
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
      const reach = opts.reachability ?? (await computeModuleReachability(index, opts.resmanOpts));
      checkReachability(report, index, areaResref, reach);
    } catch {
      // Walkmesh unavailable — skip rather than reporting a false defect.
    }
  }
}

/** Objects a player must be able to walk to. */
function mustBeReachable(o: PlacedObject): boolean {
  const str = (f: string) => getFieldStr(o.obj, f);
  const num = (f: string) => getFieldNum(o.obj, f);
  switch (o.kind) {
    case "creature":
      // Hostiles without a conversation may stand out of reach on purpose (archers on a wall).
      return str("Conversation") !== "" || num("FactionID") !== 1;
    case "placeable":
      // Something to do there: a container, a transition, a conversation or a module script. A usable prop with none of
      // these (a torch bracket on a wall-walk) is decoration.
      return (
        num("HasInventory") === 1 ||
        str("LinkedTo") !== "" ||
        str("Conversation") !== "" ||
        (str("OnUsed") !== "" && !isBaseGameScript(str("OnUsed")))
      );
    case "door":
      return true;
    case "waypoint":
      return num("HasMapNote") === 1 || /^wp_(at|rt)_/i.test(o.tag);
    case "trigger":
      return str("LinkedTo") !== "" || str("ScriptOnEnter") !== "";
    default:
      return false;
  }
}

/**
 * object_unreachable: an object the player must reach stands on ground that no walking route from the module start
 * reaches (a portal on a wall-top, an NPC on a roof), or on no walkable ground at all. area_unreachable: nothing in the
 * area can be walked to from the start (every way in starts somewhere unreachable).
 */
function checkReachability(report: Report, index: ModuleIndex, areaResref: string, reach: ModuleReachability): void {
  if (!reach.start) return;
  const g = reach.graphs.get(areaResref);
  if (!g) return; // no walkmesh data, or not reached at all (below)
  const reachable = reach.reachable.get(areaResref);
  if (!reachable || reachable.size === 0) {
    const git = index.parsedGff.get(`${areaResref}.git`) as GffObj | undefined;
    const isDmArea = git ? listOf(git, "WaypointList").some((w) => getFieldStr(w, "Tag").toUpperCase() === "DM_AREA") : false;
    if (!isDmArea) {
      report.warn(
        "area_unreachable",
        "No walking route from the module start reaches this area: every door, trigger or portal into it starts on ground the player cannot walk to (or nothing leads in)",
        undefined,
        "check_area_connectivity, then check_path from the module start to each transition into this area",
      );
    }
    return;
  }
  const mainComp = [...reachable].reduce((m, c) => (g.components[c].area > g.components[m].area ? c : m));
  for (const o of areaObjects(index, areaResref)) {
    if (!mustBeReachable(o) || isMarkedUnreachableOk(o.obj)) continue;
    const label = `${o.kind} "${o.tag}" at (${o.x.toFixed(1)}, ${o.y.toFixed(1)}, z ${o.z.toFixed(1)})`;
    const hit = locateObject(g, o, reachable);
    if (!hit) {
      report.warn(
        "object_unreachable",
        `${label} has no walkable ground within reach — the player cannot get to it`,
        undefined,
        "probe_ground at the spot, then move_object onto walkable ground (adventure_find_walkable)",
      );
      continue;
    }
    if (reachable.has(hit.component)) continue;
    const comp = describeComponent(g, hit.component);
    const gap = closestApproach(g, hit.component, mainComp);
    const gapText = gap
      ? `; the nearest reachable ground is ${gap.distance} m away at (${gap.b.x}, ${gap.b.y}) with a ${Math.abs(gap.a.z - gap.b.z).toFixed(1)} m height difference`
      : "";
    report.warn(
      "object_unreachable",
      `${label} stands on ground the player cannot walk to from the module start (region ${comp.region}, height ${comp.height}, ${comp.groundArea} m²)${gapText}. No ramp, stair or transition joins it`,
      undefined,
      "check_path from the landing point to this object, then move_object onto reachable ground, or set the local int PATH_UNREACHABLE_OK = 1 if it is out of reach on purpose",
    );
  }
}
