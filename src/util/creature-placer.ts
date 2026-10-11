/**
 * Core placement logic for `place_creature`, extracted so it can be called
 * directly — not just via the MCP tool's string-param wrapper — by
 * `compose_encounter`'s placement mode (F6,
 * docs/encounter-composer-spec.md). Behavior-preserving extraction: the
 * `place_creature` MCP tool (src/tools/placement-tools.ts) is now a thin
 * shim that parses its string params and calls this function — same walk
 * check, same collision check, same GIT mutation, same response shape.
 */

import { GIT_STRUCT_ID } from "../config.js";
import { checkPlacementWalkable } from "./walkmesh.js";
import { resolveBlueprint, getGitDoc, writeBackGit, updateAreaCounts } from "./git-helpers.js";
import { getFieldStr, getFieldLocStr, getFieldList, getFieldNum } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import { snapshotGitForUndo } from "./undo.js";
import { compassToOrientation, orientationToCompass, orientationToward, parseFaceToward } from "./facing.js";
import { checkCollision } from "./collision.js";
import type { ModuleIndex } from "../types/module.js";
import type { ResmanOptions } from "../nim-tools.js";

export interface PlaceCreatureParams {
  area: string;
  blueprint: string;
  x: number;
  y: number;
  z?: number;
  bearing?: number;
  collisionRadius?: number;
  faceTowardX?: number;
  faceTowardY?: number;
  walkBuffer?: number;
}

export interface PlaceCreatureResult {
  success: boolean;
  error?: string;
  detail?: string;
  position?: { x: number; y: number };
  area?: string;
  creature?: string;
  blueprint?: string;
  placedPosition?: { x: number; y: number; z: number };
  groundZ?: number | null;
  bearing?: number;
}

/** Place a creature from a blueprint into an area's GIT, with the exact same validation as the place_creature MCP tool. */
export async function placeCreatureCore(
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  params: PlaceCreatureParams,
): Promise<PlaceCreatureResult> {
  const { area, blueprint, x: xN, y: yN, z: zN = 0, bearing: bearingN = 0, walkBuffer } = params;

  const face = parseFaceToward(params.faceTowardX, params.faceTowardY);
  if ("error" in face) return { success: false, error: face.error };

  const walkCheck = await checkPlacementWalkable(xN, yN, area.toLowerCase(), index, resmanOpts, walkBuffer);
  if (!walkCheck.ok) {
    return {
      success: false,
      error: "Position is not safe for placement",
      position: { x: xN, y: yN },
      detail: walkCheck.reason,
    };
  }

  const utc = await resolveBlueprint(index, blueprint, "utc", resmanOpts);
  if (!utc) {
    return { success: false, error: `Blueprint not found: ${blueprint}.utc` };
  }

  const obj = utc as GffObj;
  delete obj.__data_type;
  obj.__struct_id = GIT_STRUCT_ID.CREATURE;

  const placeZ = walkCheck.z ?? zN;
  obj.XPosition = { type: "float", value: xN };
  obj.YPosition = { type: "float", value: yN };
  obj.ZPosition = { type: "float", value: placeZ };

  let orientation: [number, number];
  if (face.target) {
    const toward = orientationToward({ x: xN, y: yN }, face.target);
    if (!toward) return { success: false, error: "faceToward is the same point as the creature position." };
    orientation = toward;
  } else {
    orientation = compassToOrientation(bearingN);
  }
  obj.XOrientation = { type: "float", value: orientation[0] };
  obj.YOrientation = { type: "float", value: orientation[1] };
  const facingCompass = orientationToCompass(orientation[0], orientation[1]);

  const { doc: gitDoc, obj: git } = getGitDoc(index, area);

  const colRadius = params.collisionRadius ?? 0.75;
  if (colRadius > 0) {
    const collision = checkCollision(git, xN, yN, colRadius);
    if (collision.collision) {
      return {
        success: false,
        error: `Placement blocked: '${collision.nearbyTag}' is ${collision.distance}m away (minimum ${colRadius}m). Choose a different position.`,
      };
    }
  }

  snapshotGitForUndo(gitDoc, area, "place_creature", `Place creature ${blueprint}`);
  const creatureList = getFieldList(git, "Creature List");
  creatureList.push(obj);

  await writeBackGit(index, area, gitDoc);
  updateAreaCounts(index, area);

  const name = getFieldLocStr(obj, "FirstName") || getFieldStr(obj, "Tag") || blueprint;

  return {
    success: true,
    area,
    creature: name,
    blueprint,
    placedPosition: { x: xN, y: yN, z: placeZ },
    groundZ: walkCheck.z ?? null,
    bearing: facingCompass,
  };
}

/**
 * Find up to `count` distinct walkable spots spread around an area's
 * center, for compose_encounter's placement mode. Deliberately simpler
 * than `adventure_find_walkable` (no region/clearRadius support) — it only
 * needs "somewhere walkable, several of them, spread apart," not that
 * tool's full region-targeting or footprint-clearance search. Reuses the
 * same `checkPlacementWalkable` every placement tool already validates
 * against, so a returned spot is guaranteed placeable.
 */
export async function findSimpleWalkableSpots(
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  area: string,
  count: number,
): Promise<Array<{ x: number; y: number }>> {
  const areKey = `${area.toLowerCase()}.are`;
  const areDoc = index.parsedGff.get(areKey);
  if (!areDoc) return [];

  const width = getFieldNum(areDoc as GffObj, "Width");
  const height = getFieldNum(areDoc as GffObj, "Height");
  const worldW = width * 10;
  const worldH = height * 10;
  const cx = worldW / 2;
  const cy = worldH / 2;
  const step = 3;
  const minSeparation = 1.5;

  const spots: Array<{ x: number; y: number }> = [];

  for (let ring = 0; ring < 20 && spots.length < count; ring++) {
    const candidates =
      ring === 0
        ? [{ x: cx, y: cy }]
        : [
            { x: cx + ring * step, y: cy },
            { x: cx - ring * step, y: cy },
            { x: cx, y: cy + ring * step },
            { x: cx, y: cy - ring * step },
            { x: cx + ring * step, y: cy + ring * step },
            { x: cx - ring * step, y: cy - ring * step },
            { x: cx + ring * step, y: cy - ring * step },
            { x: cx - ring * step, y: cy + ring * step },
          ];

    for (const c of candidates) {
      if (spots.length >= count) break;
      if (c.x < 5 || c.y < 5 || c.x > worldW - 5 || c.y > worldH - 5) continue;
      if (spots.some((s) => Math.hypot(s.x - c.x, s.y - c.y) < minSeparation)) continue;

      const check = await checkPlacementWalkable(c.x, c.y, area.toLowerCase(), index, resmanOpts, 0);
      if (check.ok) spots.push(c);
    }
  }

  return spots;
}
