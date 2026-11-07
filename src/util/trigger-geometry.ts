/**
 * Rectangular trigger geometry (the `Geometry` list of a placed trigger).
 *
 * Vertices are relative to the trigger's own position. `width` runs across the route and `depth` along it;
 * `bearing` is the compass direction the route runs (0 = north, 90 = east, clockwise), so at bearing 0 the
 * width spans X and the depth spans Y. Vertices are wound counter-clockwise, as toolset-drawn triggers are.
 */

import type { GffObj } from "../types/gff.js";

/** Default half-height above the walk plane, so the trigger is clickable. */
export const TRIGGER_GEOMETRY_Z = 0.025;

/** Below this a transition trigger is hard to find and easy to walk past (area-connections skill). */
export const MIN_TRANSITION_WIDTH = 2;
export const MIN_TRANSITION_DEPTH = 1;

function round3(n: number): number {
  const r = Math.round(n * 1000) / 1000;
  return r === 0 ? 0 : r; // no -0
}

/** Corner points (x, y) of a width × depth rectangle centred on the origin, rotated to `bearing`. */
export function rectTriggerPoints(width: number, depth: number, bearing = 0): Array<{ x: number; y: number }> {
  const a = (bearing * Math.PI) / 180;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const hw = width / 2;
  const hd = depth / 2;
  // Local frame: u across the route, v along it. Compass rotation (clockwise): v points at the bearing.
  const local: Array<[number, number]> = [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
  return local.map(([u, v]) => ({ x: round3(u * cos + v * sin), y: round3(-u * sin + v * cos) }));
}

/** A GFF `Geometry` list field for a rectangular trigger. */
export function rectTriggerGeometry(width: number, depth: number, bearing = 0, z = TRIGGER_GEOMETRY_Z): GffObj {
  return {
    type: "list",
    value: rectTriggerPoints(width, depth, bearing).map((p) => ({
      __struct_id: 0,
      PointX: { type: "float", value: p.x },
      PointY: { type: "float", value: p.y },
      PointZ: { type: "float", value: z },
    })),
  };
}
