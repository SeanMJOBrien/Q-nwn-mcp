/**
 * Known collar-tile requirements for feature groups the generator would
 * otherwise reject outright: height-transition tiles, or tiles carrying
 * crosser edges (dock/bridge/stream/etc).
 *
 * A "collar" is one or more neighboring tiles that must sit next to such a
 * feature for it to read as connected rather than floating in open terrain
 * or a floating cliff. `adventure-tools.ts` rejects every group containing a
 * non-flat tile (`hasHeightTransition`) or a crosser tile (`hasCrossers`) by
 * default — the solver, unaware a feature is about to be stamped down, has
 * already placed something incompatible at the tiles touching it (an
 * elevated edge floating over flat ground; a dock/bridge crosser edge facing
 * plain water with nothing to connect to). This pipeline has no *general*
 * mechanism to auto-terrace elevated terrain or auto-extend a crosser
 * network to meet a feature — this table is the curated exception list:
 * specific (tileset, group) pairs a human has already hand-derived and
 * verified a working collar for. Any height-transition or crosser-bearing
 * group NOT listed here still falls through to the default rejection —
 * adding an entry is how a newly-investigated feature graduates from
 * "always skipped" to "auto-placed correctly."
 *
 * **Height-transition entries**: tile ID + orientation derived by computing
 * the feature's actual placed corner heights (from
 * `get_tileset_details(detail:"full")` / the cached `.set` file), then
 * searching the tileset's own corner-height data for a tile + rotation whose
 * edge reproduces it exactly — the same method documented in
 * `area-frozen/SKILL.md`'s Pitfalls section.
 *
 * **Crosser entries**: tile ID + orientation derived by finding a tile whose
 * *only* crosser (so it terminates cleanly rather than creating a new
 * dangling connection one tile further out) matches the feature's outward-
 * facing crosser type, then using `getRotatedCrossers`' own rotation formula
 * (`tileset.ts`) to find which orientation puts that crosser on the edge
 * actually touching the feature. Corner terrain (not crosser) is still what
 * gets checked at placement time — see the terrain-mismatch check in
 * `adventure-tools.ts`'s collar-application loop — so a crosser collar tile
 * should also be chosen with corners that match the feature's own zone
 * terrain (uniform water/water/water/water is the easy case).
 *
 * See `docs/tileset-proving-grounds/PROGRESS.md` for the specific derivation
 * of every entry below (search for the tileset name).
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
    // ShipDocked_2x2 (tileIds [243,244,241,242], rows=2 cols=2 — 243/244 south
    // row is the ship's hull, no crossers; 241/242 north row is the dock-facing
    // side, each carrying "R:dock,L:dock" — i.e. BOTH the west edge (241's
    // L:dock, the group's own west boundary) and the east edge (242's R:dock,
    // the group's own east boundary) of that row expect a connecting dock
    // tile. k05_01 (id 186) has exactly one crosser (T:dock at its native
    // orientation) — a dock tile that terminates cleanly rather than opening a
    // new dangling connection — and uniform water/water/water/water corners,
    // so it matches any water zone terrain regardless of rotation. Rotated via
    // getRotatedCrossers's own formula: ori3 puts T:dock on the tile's right
    // edge (meets 241's west-facing L:dock); ori1 puts T:dock on its left edge
    // (meets 242's east-facing R:dock).
    shipdocked_2x2: [
      { relX: -1, relY: 1, tileId: 186, orientation: 3 }, // west, dock row: k05_01 @ ori3
      { relX: 2, relY: 1, tileId: 186, orientation: 1 },  // east, dock row: k05_01 @ ori1
    ],
  },
};

/** Look up the collar for a (tileset, group) pair, if a human has already
 *  derived and verified one. Returns undefined for anything not yet known —
 *  callers should keep rejecting those, not guess at a collar. */
export function getFeatureCollar(tilesetResref: string, groupName: string): FeatureCollarTile[] | undefined {
  return FEATURE_COLLARS[tilesetResref.toLowerCase()]?.[groupName.toLowerCase()];
}
