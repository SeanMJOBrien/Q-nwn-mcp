# Layout generator: rotation, entrances, avenues

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

#### Stamped-group rotation, entrance detection, and road/avenue preservation (2026-09-19)

User-raised: stamped feature groups (`paint_group`, `adventure_apply_layout`) were placed
at a single fixed orientation with no concept of facing a road, and roads were purely
cosmetic (a crosser-tile texture choice, not a protected, reserved corridor). Three
connected pieces, all in `src/util/tileset.ts` unless noted:

- **`rotateGroupTileIndex(ngc, ngr, columns, rows, rotation)` / `rotatedGroupDimensions()`**
  — the real grid-slot remap a rotated group needs. Rotating a group isn't just a
  per-tile orientation flag: it's rotating which native `(col, row)` maps to which
  `tileId` in the group's own row-major array, plus swapping footprint width/height at
  90°/270°. Derived by transforming the group footprint's own corners through this
  codebase's existing `forwardRotateDoor` point-rotation convention, cross-checked three
  independent ways (direct per-rotation corner-transform, and composing the 90° step
  two/three times to re-derive 180°/270° algebraically — all three agreed) plus a
  bijection test (every native cell visited exactly once) and a "four 90° steps returns
  to identity" algebraic check, both parametrized across multiple group shapes. Wired
  into `paint_group` (new `rotation` param, 0-3), `adventure_apply_layout`'s real
  feature-tile write path, and `findFeatureDoorPosition` (previously hardcoded its
  orientation argument to `0` always). **Handedness verified (2026-11-07):** the oracle test "rotated tile
  groups placed by hand match rotateGroupTileIndex" (`tile-oracle.live.test.ts`, needs `TFN_SRC`) finds 633
  hand-placed rotated groups in 504 real areas; 98.6 % of their 1,886 tiles sit at `Tile_Orientation` = the
  rotation this remap implies (the mirror mapping: 32.9 %, all of it from 180° turns). The "may look scrambled"
  warnings on rotated multi-tile groups were removed: the toolset rotates groups exactly this way.
- **Fixed a real correctness gap the rotation work surfaced**: `adventure_apply_layout`'s
  terrain-corner match check read a tile's *native* corners even for a rotated
  placement — a rotated tile presents different corners outward. Now uses
  `getRotatedCorners`. Curated collar tiles (`feature-collars.ts`) are hand-authored for
  native placement only, so a feature with one clamps `rotation` to 0 with a warning
  rather than silently misplacing its collar.
- **`getGroupEntrances(group, tileset, rotation)`** — generalizes the door-classification
  logic that already existed privately inside `findFeatureDoorPosition` (used only to
  aim transition portals at a building's front door). Returns every EXTERIOR door a
  group has (not just the first), each with a cardinal `side` (N/S/E/W). Deliberately
  computes door geometry at native orientation always and only rotates the reported
  `side` by simple compass arithmetic (N→E→S→W→N per quarter-turn) rather than
  re-deriving positions against a rotated grid — a smaller, independently-checkable
  piece of logic than duplicating the full grid remap. Exposed to callers via
  `get_tileset_details`'s full-mode `entrances` field per group — this data was
  previously unreachable outside `layout-generator.ts`'s private scan.
- **`LayoutStyle.avenue?: boolean`** (`src/util/layout-generator.ts`, default false —
  every existing caller's output is byte-identical without it). When true,
  `packFeatures` is deferred from its normal step-6 position to run *after* step 7 (room
  connections) instead of before — corridors aren't computed until step 7, and
  `packFeatures` previously had zero visibility into them (confirmed: it only receives
  `rooms`, never `crossers`/corridor geometry, so a feature could legally land on tiles
  a corridor also crossed through a room interior). Deferring the *call site* (not
  moving the intricate, exterior/interior-branching corridor-computation code itself)
  keeps this a small, safe reorder — the non-avenue path's call site, arguments, and
  ordering are completely unchanged. The avenue tile set is computed after corridors
  exist: for exterior styles, whatever `floorTiles` gained since a pre-corridor
  snapshot (corridors are carved as floor-terrain zones); for interior styles, every
  crosser path's tiles directly (crossers cover wall tiles specifically, never touching
  `floorTiles` at all). That set seeds `packFeatures`'s `occupied` exclusion, so a
  feature never lands on the avenue, and — for a room adjacent to an avenue tile —
  biases placement toward a position/rotation whose `getGroupEntrances(...).side` faces
  it, trying all 4 rotations before falling back to the ordinary uniform-random
  placement if no facing match fits (scored, not forced). No new "protected crosser"
  solver concept was needed for this: since main connectors, shortcuts, and the
  secondary stream are still computed in their existing relative order (only
  `packFeatures`'s position moved around all of them), nothing about their own mutual
  overlap risk changed — narrower and safer than the original plan's idea of separately
  flagging just the "primary spine" as protected.
- **Verified end-to-end against real tileset data**, not just synthetic unit fixtures:
  `tno01`'s real `Thatch_House_1` group (1x1, one door, native side `N`) run through
  `adventure_generate_layout({avenue:true, preferredFeatures:["Thatch_House_1"]})` at
  4 rooms produced 4 placements, 2 of them with a non-zero `rotation` (the facing bias
  actually engaging), and `adventure_apply_layout` applied all 4 with zero
  `featureWarnings`. 3 new unit tests confirm the avenue-exclusion property holds across
  15 real-generation trials (never a false pass — both "a feature was placed" and "a
  corridor existed" are asserted, not just "no overlap found").
- **Spacing rule (user-raised, from a real hand-built village pair): buildings should
  sit within 1-2 tiles of the avenue, not just somewhere in the adjacent room.** Confirmed
  a real gap in the current design while hand-building "The Twin Villages Waystop": the
  avenue-adjacency bias (above) only checks whether a room touches the avenue at all and
  whether a candidate rotation's entrance faces it — it has **no distance preference**,
  so a feature placed correctly-facing but deep in a large room (e.g. a 3-tile gap to the
  avenue, found in one hand-authored village's west row) still passes today's check. Two
  places this needs to land:
  - **Hand-authoring convention (apply now, no code change needed):** when placing
    buildings via `paint_group`/`adventure_apply_layout` alongside a hand-built avenue
    crosser, keep the gap between a building's road-facing edge and the avenue itself to
    1-2 tiles — enough for a small dooryard, not an open field. Mirror the gap on both
    sides of the avenue for a consistent street frontage.
  - **`packFeatures`'s automatic avenue bias (not yet built):** the position search
    (`layout-generator.ts`) should prefer candidates *closer* to the avenue-adjacent room
    edge, not just any position with a facing match — e.g. bias the random `fx0`/`fy0`
    roll toward that edge, or explicitly rank candidates by distance-to-avenue before
    facing. Not yet implemented; today's automatic placement can legally put a
    correctly-rotated building far from the road it's supposedly fronting.

- **Rotation-handedness saga, "The Twin Villages Waystop" (2026-09-19) — two separate
  bugs, found across two rounds of real user checks, plus a fundamental limitation
  the fix has to work around rather than solve.** Full sequence, since each round's
  wrong diagnosis is as instructive as the eventual fix:
  1. **Round 1 — `bearingToSide`/`rotateSide` calibration, CONFIRMED and fixed.** User
     report: "The buildings should have their doorways facing the road... Almost none
     of them did." Had the user visually check 4 real placed buildings in the toolset
     against their intended facing (one per rotation value 0/1/2/3) — the same
     corpus-cross-check discipline the "Tile rotation" pitfall above prescribes,
     applied via direct human observation since no pre-existing corpus uses these
     specific groups. Two real, independent calibration bugs, both in `tileset.ts`:
     `bearingToSide()` was a full quadrant (90°) out of phase (wrong even at rotation
     0, no rotation involved at all), and `rotateSide()` composed the rotation in the
     wrong direction (added steps; the real direction subtracts). Confirmed by fitting
     all 4 reports to one formula (`actual = (expected + 1 - 2*rotation) mod 4`) —
     both fixed, and this fix is correct and still in place.
  2. **Round 2 — `rotateGroupTileIndex()`, WRONGLY "fixed" by the same commit, then
     reverted.** Round 1's fix also swapped cases 1/3 in `rotateGroupTileIndex()` (the
     multi-tile grid-slot remap), on the assumption it shared the same handedness bug.
     It didn't — a second real user report ("any tile feature larger than one tile is
     broken") showed actual structural corruption (tiles duplicated into two slots,
     buildings broken into disordered pieces), which a real handedness/direction bug
     cannot produce (a bijective remap can flip which way something faces, but can
     never duplicate a tile). Root cause found by cross-checking the formula against
     `~/git/settileLibrary`, a separate, independently-tested NWScript library for
     this exact operation (`TileBlockRotate`/`_TileRotatedOffsetX/Y`): its verified
     90° point-rotation `(ox,oy) -> (-oy,ox)` is algebraically identical to this
     function's ORIGINAL (pre-swap) case 1/3 — confirmed by deriving the general W x H
     inverse from that same point-rotation and checking it cell-by-cell against a 2x2
     example. **The swap was reverted; `rotateGroupTileIndex` is back to its original,
     now cross-verified formula**, and Round 1's compass-calibration fix stayed
     unchanged — the two functions solve genuinely independent problems (which tile ID
     lands in which grid slot, vs. which rotation value to request for a target
     facing) and don't share a bug just because they're both "rotation code".
  3. **The real limitation underneath both rounds, confirmed by the same reference
     library: most multi-tile groups (named houses/inns/towers) cannot be safely
     rotated via grid-remap + per-tile-orientation-bump AT ALL, regardless of how
     correct the index math is.** Quoting settileLibrary's own docs: "The four tiles
     of a tileset tower are four *different* models, one per quadrant... Rotating a
     tile only spins that quadrant's own model, so rearranging the four and bumping
     their orientations scrambles the tower instead of turning it. Rotation is correct
     for tiles whose orientation is meaningful on its own: terrain crossers, roads,
     **single-tile features**. To reface an authored structure you need a
     differently-authored group." A 1x1 feature is exactly a single ordinary tile —
     rotating it via `Tile_Orientation` is the same operation the engine already does
     for every terrain tile, and is safe. A 2x2+ named building is an assembly of
     unique, position-specific meshes; relocating and re-spinning them is a
     structurally valid *tile* rotation that still produces the wrong *building*.
     **`paint_group` and `adventure_apply_layout` now emit an advisory warning
     (not a hard block, since there's no way to tell a genuinely rotation-safe
     multi-tile group from an unsafe one purely from tile data) whenever a rotation
     other than 0 is requested for a group larger than 1x1.**
  **Actual fix applied to the shipped content**, once both of the above were
  understood: rather than rotating multi-tile buildings at all, both villages'
  10-building layouts were rebuilt using ONLY each group's *native* (rotation 0)
  facing — surveyed the full `tno01`/`ttf01` group catalogs for real door bearings
  per group (direct `.set` file reads), and picked whichever named building already
  faces the needed direction unrotated for each side of the road, swapping any
  grass-terrain group that mismatched its dirt-zone surroundings for a dirt-terrain
  equivalent facing the same way. `tno01` had enough variety for a fully-distinct
  10-building set this way; `ttf01`'s much smaller building palette forced real
  repetition (most of one village's houses ended up sharing 1-2 models) — a real,
  visible trade-off of "correct and safe" over "no rotation-scramble risk," not
  something to silently improve later without noting the cause. **None of this
  touches the separately-verified, pre-existing `getRotatedCorners`/
  `getRotatedCrossers`/`forwardRotate` convention** ("Tile rotation" pitfall above) —
  that solves a different problem (which corner terrain a *terrain* tile presents at
  a given orientation) and was never in question. **Lesson reinforced twice in one
  session:** a rotation-handedness or rotation-safety assumption is not verified by
  the code agreeing with itself (bijection tests, algebraic identities, "zero
  warnings" from the solver) — none of those catch a systematically-wrong-but-still-
  structurally-valid rotation, or a mathematically-correct rotation applied to
  content that can't survive it. It takes a real render, a real human observer, or a
  real independently-tested reference implementation to check against — and even
  after finding one bug this way, don't assume every other "rotation-shaped" function
  nearby shares its root cause without checking each one on its own terms.

### Resource Loading

On `load_module`, the server builds a full resman stack (lowest to highest priority):

1. **Base game BIFs** (via `NWN_FOLDER_DATA`)
2. **Module HAKs** (from `Mod_HakList` in IFO)
3. **User override/** (`NWN_FOLDER_USER/override/`)
4. **User development/** (`NWN_FOLDER_USER/development/`)
All 2DAs from the stack are extracted and parsed at load time (~598 base game tables). `load_module` accepts just a filename (e.g., `"mymod.mod"`) which resolves from `NWN_FOLDER_USER/modules/`.

**The temp dir persists across reloads of the same module.** `createTempDir()` derives the dir name deterministically from the module's absolute path, so calling `load_module` again on the same path reuses the same dir instead of wiping it — only switching to a genuinely different module cleans up the old one. This is load-bearing: it's what lets skills persist sidecar files (e.g. `adventure.md`) directly into the temp dir with Write/Edit and have them survive a reload. Don't "clean up" by wiping the temp dir unconditionally in `loadModule` — that destroys sidecar files that aren't part of the `.mod` archive and can't be reconstructed by re-extracting.
**But a reload still re-extracts everything already inside the packed `.mod`, silently reverting any edit made since the last repack.** "Persists" above only covers sidecar files that were never part of the archive (like a freshly generated include, before its first repack). Every `.utc`/`.nss`/`module.ifo`/etc. that already exists inside the `.mod` gets overwritten back to its packed content on `load_module`, even when reusing the same temp dir. Confirmed directly: edits to `a_mod_load.nss`, another creature-spawn script, and `module.ifo`'s `Mod_OnModLoad` field all silently reverted after a same-path `load_module` call issued between the edits and the first `repack_module`. **Never call `load_module` between an edit and its `repack_module`** — make every edit, repack once, and only reload afterward if the in-memory index genuinely needs refreshing.


## Unified BSP pipeline: style presets (moved from CLAUDE.md, A5)


All 10 styles use a single BSP pipeline, differentiated by `StyleConfig` presets in `layout-generator.ts`:

**Interior styles** (dungeon / cave / dwelling):
- **`dungeon`** — Moderate split variance (±15%), room sizes 60-100% of leaf, margin 2-3, 1 shortcut corridor, 50% S-curves, 30% L-shaped rooms.
- **`cave`** — High variance (±20%), small rooms (40-70% of leaf), margin 2-4, 3 shortcut corridors, 70% S-curves, 10% L-shapes.
- **`dwelling`** — Near-zero variance (±5%), rooms fill 85-100% of leaf, fixed margin 2, no shortcuts, 10% S-curves, no L-shapes.

**Exterior styles** (forest / rural / city / plains / desert / castle / tundra):
- Each has `wallKeywords` (border terrain), `floorKeywords` (room terrain), `crosserKeywords` (roads — unused as crossers, used for terrain corridor keyword matching).
- Obstacle patches (water, trees, cliff) placed inside rooms via `obstacleKeywords` + `obstacleChance`.
- Secondary crossers (stream/river) are **interior-only** — exterior styles never use crosser paths.
