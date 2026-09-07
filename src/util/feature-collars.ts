/**
 * Known collar-tile requirements for height-transition feature groups.
 *
 * A "collar" is one or more neighboring tiles that must sit next to a
 * height-transition feature (e.g. a cave mouth carved into a rise, or a city
 * gate's corner towers) for its elevated edge to read as connected ground
 * rather than a floating cliff. `adventure-tools.ts`'s `hasHeightTransition`
 * check rejects every group containing a non-flat tile by default, since this
 * pipeline has no general way to auto-terrace matching elevated terrain. This
 * table is the curated exception list: specific (tileset, group) pairs a
 * human has already hand-derived and verified a working collar for. Any
 * height-transition group NOT listed here still falls through to the default
 * rejection — adding an entry is how a newly-investigated feature graduates
 * from "always skipped" to "auto-placed correctly."
 *
 * Each entry's tile ID + orientation was derived by computing the feature's
 * actual placed corner heights (from `get_tileset_details(detail:"full")` /
 * the cached `.set` file), then searching the tileset's own corner-height
 * data for a tile + rotation whose edge reproduces it exactly — the same
 * method documented in `area-frozen/SKILL.md`'s Pitfalls section. See
 * `docs/tileset-proving-grounds/PROGRESS.md` for the specific derivation of
 * every entry below (search for the tileset name).
 *
 * Offsets are relative to the feature's own placement origin — `sf.x`/`sf.y`,
 * the group's bottom-left tile (`gc=0, gr=0`) — NOT rotated by any feature
 * orientation. Feature groups are always placed at orientation 0 today (see
 * the hardcoded `orientation: 0` in `adventure-tools.ts`'s feature-resolution
 * loop); if that's ever lifted to support rotated feature placement, every
 * entry here needs to be re-derived for the new orientation.
 */

export interface FeatureCollarTile {
  /** Tile offset from the feature's origin (sf.x, sf.y). Can be negative
   *  (west/south of the origin) or >= the group's own width/height
   *  (east/north of its far edge). */
  relX: number;
  relY: number;
  tileId: number;
  orientation: number;
}

const FEATURE_COLLARS: Record<string, Record<string, FeatureCollarTile[]>> = {
  tts01: {
    // Cave (tile 244): TL=1,TR=1,BL=0,BR=0 at placement orientation 0 —
    // elevated north edge, elevated west corner. Verified against real
    // pg_tts01 placement at (23,29); zero constraint warnings on the west
    // collar, terrain-name-only residual warnings on north/east (acceptable,
    // matches pre-existing trees terrain further out).
    cave: [
      { relX: 0, relY: 1, tileId: 0, orientation: 2 },  // north: a01_01 @ ori2
      { relX: -1, relY: 0, tileId: 1, orientation: 1 }, // west: a02_01 @ ori1 (zero warnings)
      { relX: 1, relY: 0, tileId: 3, orientation: 0 },  // east: a04_01 @ ori0
    ],
  },
  tti01: {
    // Cave (tile 47) and Ramp (tile 46): both TL=0,TR=1,BL=0,BR=1 — flat
    // west edge, elevated east edge. Verified against real pg_tti01
    // placements; zero constraint warnings on both collar placements.
    cave: [
      { relX: 1, relY: 0, tileId: 3, orientation: 2 }, // east: a02_01 @ ori2
    ],
    ramp: [
      { relX: 1, relY: 0, tileId: 8, orientation: 2 }, // east: a02_02 @ ori2
    ],
  },
  tcn01: {
    // CityGate_2x2 (tiles 239/240/237/262): each of the 4 tiles has exactly
    // one OUTER corner elevated (the gate's corner towers), all inner
    // corners (meeting at the gate's own flat passage) stay flat. Verified
    // against real pg_tcn01 placement at origin (3,27); zero constraint
    // warnings on both east-side collars, terrain-name-only residual
    // warnings on the west side one tile further out (pre-existing building
    // zone, not a height mismatch).
    citygate_2x2: [
      { relX: -1, relY: 0, tileId: 0, orientation: 3 }, // west, south sub-tile: a01_01 @ ori3
      { relX: -1, relY: 1, tileId: 0, orientation: 2 }, // west, north sub-tile: a01_01 @ ori2
      { relX: 2, relY: 0, tileId: 3, orientation: 0 },  // east, south sub-tile: a04_01 @ ori0 (zero warnings)
      { relX: 2, relY: 1, tileId: 3, orientation: 3 },  // east, north sub-tile: a04_01 @ ori3 (zero warnings)
    ],
  },
};

/** Look up the collar for a (tileset, group) pair, if a human has already
 *  derived and verified one. Returns undefined for anything not yet known —
 *  callers should keep rejecting those, not guess at a collar. */
export function getFeatureCollar(tilesetResref: string, groupName: string): FeatureCollarTile[] | undefined {
  return FEATURE_COLLARS[tilesetResref.toLowerCase()]?.[groupName.toLowerCase()];
}
