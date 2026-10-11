/**
 * Shared collision-detection helper, extracted from placement-tools.ts so
 * both the `place_creature`/`place_placeable` MCP tools and a pure
 * placement-core function (`src/util/creature-placer.ts`, used by
 * `compose_encounter`'s placement mode) can call the same logic.
 */

import { getFieldStr, getFieldNum, getFieldList } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";

export interface CollisionResult {
  collision: boolean;
  nearbyTag?: string;
  distance?: number;
}

const COLLISION_LISTS = [
  { name: "Creature List", xField: "XPosition", yField: "YPosition" },
  { name: "Placeable List", xField: "X", yField: "Y" },
  { name: "Door List", xField: "X", yField: "Y" },
] as const;

/**
 * Check for nearby objects within `radius` meters across creature, placeable, and door lists.
 * Returns the closest collision if any.
 */
export function checkCollision(git: GffObj, x: number, y: number, radius: number = 0.75): CollisionResult {
  let closestDist = Infinity;
  let closestTag: string | undefined;

  for (const { name, xField, yField } of COLLISION_LISTS) {
    const list = getFieldList(git, name);
    for (const obj of list) {
      const ox = getFieldNum(obj, xField);
      const oy = getFieldNum(obj, yField);
      if (ox === undefined || oy === undefined) continue;
      const dx = ox - x;
      const dy = oy - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist < closestDist) {
        closestDist = dist;
        closestTag = getFieldStr(obj, "Tag") || undefined;
      }
    }
  }

  if (closestDist < radius) {
    return { collision: true, nearbyTag: closestTag, distance: Math.round(closestDist * 100) / 100 };
  }
  return { collision: false };
}
