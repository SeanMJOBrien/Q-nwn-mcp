# Changelog

## [Unreleased] — 2026-10-02

Spatial conventions (tile rotation, ground heights, walkmesh offsets, facing) re-verified against the 33 base-game tilesets and 504 real
human-built areas. Full write-up: [docs/object-placement-and-tilesets.md](docs/object-placement-and-tilesets.md).
This release also adds the local-variable tools (`get_object_variables`, `set_object_variables`, `remove_object_variable`).

### Fixed

- **Ground heights were wrong on most tilesets.** The walkmesh `position` offset of the `.wok` node was ignored (54% of walkmeshes have a Z
  offset: interiors by −1.5 m, caves by −1.6 … −2.2 m) and `Tile_Height` was assumed to be a flat 5 m per level. A level is the tileset's own
  `[GENERAL] Transition` — 5 for most outdoor sets but **4 for tcn01 and 2 for tno01** (objects on raised tcn01/tno01 tiles matched 3.5% / 0% before,
  94% / 93% now). `fix_object_heights` repairs heights written by older versions.
- **Every `place_*` ignored the Z it reported.** Z is now the walkmesh ground height (the `z` parameter is only a fallback) and responses report the
  **placed** z instead of echoing the requested one.
- **Mixed-up facing conventions.** Creatures/waypoints use a compass `bearing` (0 = north, 90 = east, clockwise); placeables/doors use the raw GFF
  `Bearing` (counter-clockwise, model front faces **south** at 0). The descriptions now say so and the responses report the effective facing.
- **Missing walkmeshes disabled the whole tileset.** `nwn_resman_extract` extracts nothing when any requested file is missing, and tcm02 / trs02 each
  lack one `.wok`, so batch extraction silently produced no walkmeshes (every object in such an area probed as non-walkable). Extraction now bisects
  around missing files (`util/batch-extract.ts`) and remembers models that do not exist instead of re-requesting them for every object.
- `Tile_Orientation` rotation is documented as counter-clockwise (the code already was); `CLAUDE.md` wrongly claimed `.set` corners are un-rotated by
  the `.set` `Orientation` field.

### Added

- **`get_object_variables`, `set_object_variables`, `remove_object_variable`**: read, merge (by name, case-insensitive; an existing variable is overwritten
  in place) and remove local variables (the GFF `VarTable`, which `modify_gff_field` refuses) on a placed instance (`area` + `tag`, or `area` + `listName` +
  `index`) or on a standalone blueprint (`resref` + `blueprintType`; only blueprints that exist as files in the loaded module). A placed instance's VarTable is
  a separate copy from its blueprint's, so editing one never changes the other. Instance edits take an undo snapshot. Helpers `getVarTableEntries`,
  `removeVarTableEntry`, `clearVarTable`; documented in the `module-explorer` and `nwn-readonly-getters` skills.
- **`probe_ground`** (read-only): walkable?, surface, exact ground Z, the tileset's `heightStep`, the tile, and the placement verdict for a buffer.
- `faceTowardX` / `faceTowardY` on `place_creature`, `place_placeable`, `place_waypoint` — the server computes the right encoding per object type.
- `place_placeable`: **`zOffset`** (items on tables), **`collisionRadius`** (default 1.0 m; real areas pack props tighter), `walkBuffer`.
  `place_creature` and `place_waypoint`: `walkBuffer`.
- `move_object` / `bulk_move_objects`: **`followGround`** (default true) keeps an object's height above the ground when it moves.
- `fix_object_heights`: **`dryRun`**, **`tolerance`**, **`onlyBuried`**.
- `adventure_find_walkable`: **`clearRadius`** finds spots whose whole `(2r+1) × (2r+1)` m footprint is walkable (camps, rings of chairs) with exact Z.
- `get_tileset_details` reports `heightStep` and `hasHeightTransition`.
- Library: `util/walkgrid.ts` (1 m raster + open-ground search), `util/facing.ts`, `util/batch-extract.ts`, `tileHeightStep()`, `readAreaTileGrid`, pure
  `probeTileLocal` / `probeAreaPosition`, `getRotatedCornerHeights`.

### Tests, docs and skills

- New unit tests for the variable helpers (`git-helpers`) and 12 integration tests for the variable tools; new unit tests (`walkmesh`, `walkgrid`, `facing`,
  `tileset`, `batch-extract`, `walkmesh-extract`) and `tools/placement-conventions.integration.test.ts`
  (pins the tool behaviour; 18 of its 21 tests fail against the pre-change code, the other 3 pin unchanged behaviour).
- **`src/util/tile-oracle.live.test.ts`**: env-gated real-data oracle (`NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS`; add `TFN_SRC` for real areas). Mutation-checked:
  a flipped rotation fails 3 tests, a flat 5 m height step 5, an ignored node offset 4.
- New skills `nwn-object-placement` and `nwn-tileset-conventions`; `area-connections`, `adventure-areas`, `adventure-environment`, `adventure-actors`,
  `adventure-challenges` updated; new `docs/README.md` index and `docs/object-placement-and-tilesets.md`.

## [1.3.1] — 2026-04-04

### Transition Placement

- `adventure_create_transition` is now **bidirectional** — one call wires both areas' transitions instead of two.
- Transition points use edge-proximity targeting, placed near wall/tree/cliff borders rather than anywhere in a zone.
- Quadrant spread enforcement: max 1 transition per quadrant, maximizing distance between them.
- Feature-aware room scoring adds a `nearFeature` field so the LLM can match transitions to nearby points of interest.
- Door-snapping with a 3m outward offset, exterior doors only.
- Configurable walkmesh buffer — 2m for transitions vs. the 1m default elsewhere.
- Fixed L-shaped room internal corridor connectivity.
- `preferredFeatures` omission now correctly warns about zero features instead of failing silently.

## [1.3.0] — pipeline hardening: loot, buildings, collision, win state

### Building Features

- `groupHasUnsupportedDoors` replaces the previous blanket door rejection — freestanding buildings on uniform floor terrain now pass through.
- Fixed `adventure_apply_layout` floor terrain resolution (was incorrectly picking wall terrain).
- Exterior BSP `splitThreshold` raised 10→12 with `marginRange [2,2]` to fit 2×3 features.
- Obstacle keywords aligned to wall terrain only.

### Loot

- `Dropable=1` now set on creature equipment, creature inventory, and container items.
- Added an `inventory` param to `create_creature_blueprint` for carried items.

### Other

- `place_creature` now **blocks** on collision instead of warning-only.
- Win-state handling added as Phase 5b in the `adventure-rewards` skill.
- POI coverage added as Phase 5b in `adventure-environment` and `adventure-polish`.
- Z-height sanity-check guidance added to the `adventure-areas` skill.

## [1.2.0] — 2026-04-03

### Highlights

This release ships the **complete `/create-adventure` pipeline** — a fully autonomous, 9-phase module builder that goes from a one-line prompt to a playable NWN adventure. It has been end-to-end tested, producing connected multi-area modules with painted terrain, dressed environments, placed NPCs with quest dialogs, combat encounters, stores, loot, and XP rewards. The pipeline runs spoiler-free: the DM finds out what's in the module at the same time the players do.

The release also ships a major overhaul of the **zone-based terrain solver**, fixing a class of crosser/corner mismatches that caused visual artifacts in painted areas, and adding 10 layout styles for the procedural layout generator.

---

### New: `/create-adventure` Pipeline

A 9-sub-skill autonomous adventure creator, orchestrated by `/create-adventure`:

| Phase | Skill | What it does |
|-------|-------|-------------|
| 1 | `adventure-plot` | Generates narrative structure — locations, NPCs, quests, tone |
| 2 | `adventure-areas` | Tileset selection, BSP layout, terrain painting, area transitions |
| 3 | `adventure-environment` | Placeables, ambient sounds, waypoints, useable props |
| 4 | `adventure-actors` | Non-hostile NPCs with greeting dialogs, ambient creatures |
| 5 | `adventure-quests` | Journal entries, quest scripts, branching quest dialogs |
| 6 | `adventure-challenges` | Hostile creatures with tactical roles, traps |
| 7 | `adventure-affordances` | Merchant stores, container loot, starting gold, level adjustment |
| 8 | `adventure-polish` | Validation, dead-end dialog fixes, object heights, connectivity check |
| 9 | `adventure-rewards` | Quest XP, end-of-adventure reward items, peaceful-resolution bonuses |

Each sub-skill runs as an autonomous agent with bounded context. The orchestrator sequences them, checks `adventure-status.json` after each phase, and uses rollback tools to fix problems without user intervention.

### New: Layout Generator (`adventure_generate_layout`)

Server-side procedural layout generation via a unified BSP pipeline. Returns zones + crossers + feature suggestions ready for `adventure_apply_layout`.

**10 layout styles:**
- **Interior:** `dungeon`, `cave`, `dwelling`
- **Exterior:** `forest`, `rural`, `city`, `plains`, `desert`, `castle`, `tundra`

Each style has tuned parameters: split variance, room size fraction, corridor S-curve probability, L-shaped room chance, shortcut corridor count, obstacle patches, and terrain keywords.

**BSP rules enforced:**
- Minimum 3×3 rooms, margin ≥ 2 (never collapses to 1)
- `minLeaf = 6` ensures every leaf fits a room + margin
- L-shaped rooms via adjacent sibling merging
- S-curves offset corridor middle-thirds by 1 tile perpendicular
- Shortcut corridors create T-junction connections between non-adjacent rooms

### New Tools

- **`adventure_apply_layout`** — Atomically applies a `LayoutResult` (zones + crossers + features) via the zone solver. Replaces manual tile-by-tile painting for adventure areas.
- **`adventure_list_features`** — Returns solver-compatible feature groups for a tileset + style, with tile coverage estimates. Used by `adventure-areas` to select `preferredFeatures`.

### Zone Solver Fixes

- **Tile orientation normalization** — `.set` `Orientation` fields are un-rotated at parse time, normalizing all tiles to GIT orientation 0. `getRotatedCorners(tile, gitOri)` now returns correct effective corners for any placement orientation. Solver prefers tiles at their native `.set` orientation to avoid visual artifacts from non-native rotations.
- **Solver step 1.5** — New fallback step between exact-match and drop-crossers: adjusts free corners while keeping crossers, finding "corridor mouth" tiles for room-edge positions. Adjustments are written back to the corner grid so downstream tiles see them.
- **Room-corner crosser exclusion** — Tiles diagonally adjacent to rooms (but not cardinally adjacent) are excluded from corridor crosser paths. These tiles have a single non-wall corner (3-wall + 1-floor) and no tileset has crosser tiles for that pattern.
- **BSP room separation enforced** — Adjacent BSP sibling rooms are guaranteed to be separated by at least 2 tiles of wall terrain. Rooms that touch or overlap are rejected and re-split.
- **S-curve threshold** — Lowered to 3 wall tiles (from 5), producing tighter interior layouts.
- **Short interior corridors** — Corridors shorter than the S-curve threshold are converted to floor-terrain zones for walkability rather than crosser paths.
- **Feature terrain filter** — Feature groups with tiles whose corners don't all match the room's floor terrain are excluded from placement. Prevents foreign corners from locking into the solver grid.
- **Crosser propagation guard** — Crossers don't propagate onto tiles with any non-default corner. Only pure-default tiles receive propagated crossers.

### Other Fixes

- Exterior layout styles never emit secondary crosser paths (stream/river crossers are interior-only).
- `adventure_list_features` resolves floor terrain from style type (interior vs. exterior) rather than guessing.
- Fallback tile substitution is constrained to terrains already present in the corner grid.

---

## [1.1.0] — (previous release)

Initial public release with base toolset: area creation, object placement, blueprint discovery, dialog authoring, quest journals, script compilation, analysis tools, undo stack, walkmesh enforcement, and HTML area reports.
