/**
 * Facing conventions for placed objects (pure helpers).
 *
 * NWN stores facing three different ways, and this server's `bearing` tool parameter has to be mapped onto
 * each. All of the following were verified against real, toolset-built areas (see
 * docs/object-placement-and-tilesets.md):
 *
 *  1. Creatures, waypoints (and stores): `XOrientation`/`YOrientation` is a unit vector in WORLD axes
 *     (+X east, +Y north) pointing the way the object FACES. This server's `bearing` for these is a compass
 *     bearing (0 = north, 90 = east, clockwise): vector = (sin b, cos b).
 *
 *  2. Placeables (and doors): `Bearing` is a rotation in RADIANS, COUNTER-clockwise like a math angle.
 *     At Bearing 0 the model's FRONT faces SOUTH (-Y), so the front direction as a math angle (0 = east,
 *     counter-clockwise) is `Bearing - pi/2`.
 *     Evidence: 591 chair/table pairs in real areas: Bearing = (math angle toward the table) + 90.0 degrees
 *     with resultant length 0.78 (0.92 for the most common chair model); the clockwise sense scores 0.23.
 *     Wall furniture (ovens, beds, bookcases) agrees: Bearing = (math angle toward the wall) - 90 degrees.
 *
 *  Consequence: the same raw `bearing` number means different directions per object type. A creature given
 *  `bearing: 0` faces NORTH, a placeable given `bearing: 0` faces SOUTH; a placeable's front compass
 *  direction is (180 - bearing). They agree only at 90 (east) and 270 (west). Prefer `faceToward` (or the
 *  helpers below) over reasoning about raw numbers.
 */

const TWO_PI = Math.PI * 2;

/** Normalise an angle in radians to (-PI, PI], the range real GIT files use. */
export function normalizeRadians(rad: number): number {
  let r = rad % TWO_PI;
  if (r > Math.PI) r -= TWO_PI;
  if (r <= -Math.PI) r += TWO_PI;
  return r;
}

function round(value: number, digits = 4): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f + 0;
}

/** Creature/waypoint orientation vector for a compass bearing (degrees; 0 = north, 90 = east, clockwise). */
export function compassToOrientation(bearingDeg: number): [number, number] {
  const rad = (bearingDeg * Math.PI) / 180;
  return [round(Math.sin(rad), 6), round(Math.cos(rad), 6)];
}

/** Unit vector (world axes) from one point toward another, or null when the points coincide. */
export function orientationToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
): [number, number] | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return null;
  return [round(dx / len, 6), round(dy / len, 6)];
}

/** Wrap degrees into [0, 360) AFTER rounding, so 359.999 never reports as 360. */
function compassDegrees(deg: number): number {
  return round(((deg % 360) + 360) % 360, 2) % 360;
}

/** Compass bearing (degrees, 0 = north, clockwise, 0-360) of an orientation vector. */
export function orientationToCompass(x: number, y: number): number {
  return compassDegrees((Math.atan2(x, y) * 180) / Math.PI);
}

/** Placeable `Bearing` (radians) whose FRONT faces the given compass direction (degrees, 0 = north, clockwise). */
export function placeableBearingForCompass(compassDeg: number): number {
  return round(normalizeRadians(Math.PI - (compassDeg * Math.PI) / 180));
}

/** Placeable `Bearing` (radians) whose FRONT faces `to` when standing at `from`. Null when the points coincide. */
export function placeableBearingToward(
  from: { x: number; y: number },
  to: { x: number; y: number },
): number | null {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.hypot(dx, dy) < 1e-9) return null;
  return round(normalizeRadians(Math.atan2(dy, dx) + Math.PI / 2));
}

/** Compass direction (degrees, 0 = north, clockwise) that a placeable's FRONT faces for a given `Bearing`. */
export function placeableFrontCompass(bearingRad: number): number {
  const mathAngleDeg = ((bearingRad - Math.PI / 2) * 180) / Math.PI;
  return compassDegrees(90 - mathAngleDeg);
}

/** Radians to degrees, rounded to 2 decimals. */
export function radToDeg(rad: number): number {
  return round((rad * 180) / Math.PI, 2);
}

export type FaceTowardParse = { target?: { x: number; y: number } } | { error: string };

/** Parse the optional `faceTowardX` / `faceTowardY` tool parameters (both or neither). */
export function parseFaceToward(x: string | number | undefined, y: string | number | undefined): FaceTowardParse {
  if (x === undefined && y === undefined) return {};
  if (x === undefined || y === undefined) return { error: "faceTowardX and faceTowardY must be given together." };
  const tx = Number.parseFloat(String(x));
  const ty = Number.parseFloat(String(y));
  if (!Number.isFinite(tx) || !Number.isFinite(ty)) return { error: "faceTowardX and faceTowardY must be numbers." };
  return { target: { x: tx, y: ty } };
}
