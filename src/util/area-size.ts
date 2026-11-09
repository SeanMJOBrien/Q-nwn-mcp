/**
 * Area size rules: size = f(biome, purpose, event count, shape).
 *
 * Hand-built areas are far smaller than generated ones tend to come out, so an area gets only the room its events
 * need: a fixed footprint for small interiors (cabin 2x2, inn 2x4), a base footprint per biome for everything else,
 * plus a few tiles per extra event, and a long narrow "linear" shape for travelling through a place
 * (forest road 3x10 with one encounter). Pure and unit-tested; the suggest_area_size tool wraps it.
 */

/** Largest side an NWN area can have. */
export const MAX_AREA_SIDE = 32;
/** adventure_generate_layout needs at least this much for one room (MIN_SINGLE_ROOM_AREA_SIZE in layout-generator.ts). */
export const MIN_GENERATED_SIDE = 9;
/** ...and this much per side for several rooms (BSP minLeaf 6 per room pair, see "Layout Rules" in CLAUDE.md). */
export const MIN_MULTI_ROOM_SIDE = 14;

export const BIOMES = [
  "forest",
  "rural",
  "city_exterior",
  "castle_exterior",
  "desert",
  "frozen",
  "ruins",
  "underdark",
  "dungeon",
  "cave",
  "castle_interior",
  "interior",
] as const;
export type Biome = (typeof BIOMES)[number];

/** Purposes of a small interior; `interior` biome only. */
export const INTERIOR_PURPOSES = ["cabin", "home", "inn", "tavern", "shop", "hall"] as const;
export type InteriorPurpose = (typeof INTERIOR_PURPOSES)[number];

interface BiomeRule {
  /** Tiles for a single event. */
  baseTiles: number;
  /** Extra tiles for each further event. */
  perEvent: number;
  /** Length of a linear (travel) version with one event, and the extra length per further event. */
  linear?: { width: number; length: number; perEvent: number };
}

const BIOME_RULES: Record<Exclude<Biome, "interior">, BiomeRule> = {
  forest: { baseTiles: 16, perEvent: 8, linear: { width: 3, length: 10, perEvent: 4 } },
  rural: { baseTiles: 36, perEvent: 16, linear: { width: 4, length: 12, perEvent: 4 } },
  city_exterior: { baseTiles: 324, perEvent: 40 },
  castle_exterior: { baseTiles: 100, perEvent: 30 },
  desert: { baseTiles: 64, perEvent: 20, linear: { width: 4, length: 12, perEvent: 4 } },
  frozen: { baseTiles: 36, perEvent: 16, linear: { width: 4, length: 12, perEvent: 4 } },
  ruins: { baseTiles: 36, perEvent: 12 },
  underdark: { baseTiles: 64, perEvent: 20, linear: { width: 4, length: 12, perEvent: 4 } },
  dungeon: { baseTiles: 64, perEvent: 16, linear: { width: 3, length: 10, perEvent: 4 } },
  cave: { baseTiles: 100, perEvent: 24, linear: { width: 4, length: 12, perEvent: 4 } },
  castle_interior: { baseTiles: 36, perEvent: 12 },
};

/** Fixed small-interior footprints (width x height) and how much each extra event grows them, capped. */
const INTERIOR_RULES: Record<InteriorPurpose, { w: number; h: number; growTiles: number; maxW: number; maxH: number }> = {
  cabin: { w: 2, h: 2, growTiles: 2, maxW: 3, maxH: 4 },
  home: { w: 2, h: 2, growTiles: 2, maxW: 3, maxH: 4 },
  inn: { w: 2, h: 4, growTiles: 4, maxW: 4, maxH: 6 },
  tavern: { w: 2, h: 4, growTiles: 4, maxW: 4, maxH: 6 },
  shop: { w: 2, h: 3, growTiles: 2, maxW: 3, maxH: 4 },
  hall: { w: 4, h: 6, growTiles: 6, maxW: 8, maxH: 8 },
};

export interface AreaSizeInput {
  biome: Biome;
  /** Required for the `interior` biome. */
  purpose?: InteriorPurpose;
  /** Distinct things that happen in the area (encounters, conversations, clue searches, set pieces). At least 1. */
  events: number;
  /** `linear` = long and narrow, entrance and exit at opposite ends. Only biomes that travel (forest, rural, ...) support it. */
  shape?: "compact" | "linear";
}

export interface AreaSizeResult {
  width: number;
  height: number;
  tiles: number;
  shape: "compact" | "linear";
  /** How to build it: generate_layout for 9x9 and up, painted by hand below that. */
  method: "adventure_generate_layout" | "paint_direct";
  /** Rooms to ask adventure_generate_layout for (generate_layout only). */
  rooms?: number;
  notes: string[];
}

/** Smallest rectangle with at least `tiles` cells, as square as possible. */
function squareish(tiles: number): { w: number; h: number } {
  const w = Math.max(2, Math.ceil(Math.sqrt(tiles)));
  const h = Math.max(2, Math.ceil(tiles / w));
  return { w, h };
}

function clamp(n: number): number {
  return Math.min(MAX_AREA_SIDE, Math.max(2, n));
}

export function suggestAreaSize(input: AreaSizeInput): AreaSizeResult {
  const events = Math.max(1, Math.floor(input.events));
  const notes: string[] = [];
  let w: number;
  let h: number;
  let shape: "compact" | "linear" = "compact";

  if (input.biome === "interior") {
    const purpose = input.purpose;
    if (!purpose) throw new Error(`biome "interior" needs a purpose (${INTERIOR_PURPOSES.join(", ")})`);
    const rule = INTERIOR_RULES[purpose];
    w = rule.w;
    h = rule.h;
    // Further events grow the room a little, up to the cap; past that, add a floor or another area instead.
    const grown = rule.w * rule.h + (events - 1) * rule.growTiles;
    if (grown > rule.w * rule.h) {
      const g = squareish(grown);
      w = Math.min(rule.maxW, Math.max(w, Math.min(g.w, g.h)));
      h = Math.min(rule.maxH, Math.max(h, Math.max(g.w, g.h)));
      if (w * h < grown) notes.push(`At the ${rule.maxW}x${rule.maxH} cap for a ${purpose}; put the remaining events on another floor or area.`);
    }
    if (purpose === "inn" || purpose === "tavern")
      notes.push("An inn is often just this size: put the rooms on an upper floor of the same size, joined by StairsUp/StairsDown, rather than a bigger footprint.");
    if (input.shape === "linear") notes.push("Interiors have no linear shape; ignored.");
  } else {
    const rule = BIOME_RULES[input.biome];
    if (input.shape === "linear") {
      if (!rule.linear) {
        notes.push(`${input.biome} has no linear shape; sized compact instead.`);
      } else {
        shape = "linear";
        w = rule.linear.width;
        h = clamp(rule.linear.length + (events - 1) * rule.linear.perEvent);
        return finish(w, h, shape, events, notes);
      }
    }
    const tiles = rule.baseTiles + (events - 1) * rule.perEvent;
    const s = squareish(tiles);
    w = clamp(s.w);
    h = clamp(s.h);
  }
  return finish(w, h, shape, events, notes);
}

function finish(w: number, h: number, shape: "compact" | "linear", events: number, notes: string[]): AreaSizeResult {
  const tiles = w * h;
  const short = Math.min(w, h);
  let method: AreaSizeResult["method"] = "paint_direct";
  let rooms: number | undefined;
  if (short >= MIN_GENERATED_SIDE && shape === "compact") {
    method = "adventure_generate_layout";
    rooms = short >= MIN_MULTI_ROOM_SIDE ? Math.min(4, Math.max(1, events)) : 1;
    if (rooms === 1 && short < MIN_MULTI_ROOM_SIDE) notes.push("Below 14x14 the layout generator can only make one room.");
  } else if (short < MIN_GENERATED_SIDE) {
    notes.push(
      "Too small for adventure_generate_layout (minimum 9x9): create_area, then paint_tiles / paint_group by hand.",
    );
  } else {
    notes.push("A linear strip is painted by hand (create_area, then paint_tiles / paint_group); the generator makes rooms, not strips.");
  }
  return { width: w, height: h, tiles, shape, method, ...(rooms ? { rooms } : {}), notes };
}
