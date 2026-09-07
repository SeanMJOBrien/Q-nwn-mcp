# NWN MCP Server

MCP (Model Context Protocol) server for Neverwinter Nights Enhanced Edition module files (.mod). Wraps neverwinter.nim CLI tools to expose module content as structured, queryable data for LLMs.

## Working Style

- **Do NOT auto-export HTML reports** after creating or painting areas. Only export reports when the user explicitly asks for one.
- **Always repack after creating/painting test areas** so the user can see them in the toolset. Mention that you repacked.
- **MCP server restart required after code changes.** After editing TypeScript source and running `npm run build`, the MCP server must be restarted for new/changed tools to become available. Ask the user to restart before attempting to use newly added tools.
- **Keep skills in sync with tools.** When adding, renaming, or changing tool parameters/behavior, immediately update the `.claude/skills/` SKILL.md files that reference those tools. The LLM follows skill instructions, not tool schemas — if a skill doesn't mention a parameter, the LLM won't use it.

## Design Intent

This MCP serves two purposes:

**(a) AI-assisted human module design** — A human author works with an AI assistant to build, modify, and extend NWN modules via natural language. The human stays in creative control.

**(b) AI-driven creative module building** — A small, proof-of-concept tool for building one-shot adventures for yourself and friends. Spoiler-free by design, so the DM can be surprised too. An LLM autonomously designs and constructs module content based on high-level goals: generating quests, writing dialogue, designing areas, placing objects, building story. This is orchestrated via the `/create-adventure` skill and its sub-skill agents.

### Spatial Awareness

The `visualize_area` tool returns a **canonical JSON spatial payload** — the LLM's primary instrument for understanding an area (tile grid, walkable zones, zone connectivity, all placed objects with positions and properties). Call it before making placement or quest decisions.

**HTML export tools (`export_area_report`, `export_module_report`) are strictly for human inspection** — downstream of the JSON payload, never depended on by the MCP engine.

### Scope

Scoped to **non-persistent world (non-PW) modules** — single-player and small co-op campaigns. AI-driven content creation targets **instanced objects placed in areas** (GIT contents). Blueprint modification, palette-level changes, and deep 2DA/ruleset authoring are out of scope.

## Tech Stack

- **TypeScript** (ES2022, Node16 modules) — `npm run build` compiles to `dist/`
- **@modelcontextprotocol/sdk** — MCP server framework, stdio transport
- **zod** (v4) — tool parameter validation (MCP SDK requirement)
- **neverwinter.nim tools** — external binaries for binary format conversion

## Quick Start

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run directly with tsx (development)
npm run start        # Run compiled output
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_FOLDER_USERREPORTS` | *(empty)* | Directory where user-facing reports are saved. When unset, reports go to the module temp dir |
| `NIM_FOLDER_NWTOOLS` | *(empty)* | Path to neverwinter.nim binaries |
| `NWN_FOLDER_DATA` | *(empty)* | NWN game install dir — enables base game 2DA/TLK loading via resman |
| `NWN_FOLDER_USER` | *(empty)* | NWN user documents dir — enables custom TLK, HAK, override/, development/ loading |
| `MCP_FOLDER_TEMP` | `%TEMP%/nwn-mcp` | Temp directory for extracted modules |

## Architecture

```
.mod file → nwn_erf (extract) → temp dir → nwn_gff (parse each GFF → JSON)
  → in-memory ModuleIndex (tags, scripts, areas, dialogs, creatures, items)
    → MCP tool handlers serve queries & modifications
      → nwn_gff (serialize back) → nwn_erf (repack) → .mod file
```

One module loaded at a time. `load_module` must be called before any other tool.

### Tool Organization

Tools are split between **base tools** (human-orchestrated editing) and **adventure tools** (autonomous module building):

- **Base tools** (`src/tools/*.ts` except `adventure-tools.ts`) — 22 files covering reading, querying, editing, placement, and analysis. Used by both humans and the adventure creator.
- **Adventure tools** (`src/tools/adventure-tools.ts`) — Tools specific to the `/create-adventure` pipeline: `adventure_create_transition`, `adventure_find_walkable`, `adventure_generate_layout`, `adventure_apply_layout`, `adventure_list_features`.

All tools have **MCP annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`) set via the 4th positional arg to `server.tool()`.

### Layout Generator

`adventure_generate_layout` (in `src/util/layout-generator.ts`) is server-side procedural layout generation that encodes the area design rules from `adventure-areas/SKILL.md`. Returns zones + crossers ready for `adventure_apply_layout`, plus transition points. Uses `computeValidPairs()` from `src/util/zone-solver.ts` to validate terrain adjacency chains.

#### Unified BSP Pipeline

All 10 styles use a single BSP pipeline, differentiated by `StyleConfig` presets in `layout-generator.ts`:

**Interior styles** (dungeon / cave / dwelling):
- **`dungeon`** — Moderate split variance (±15%), room sizes 60-100% of leaf, margin 2-3, 1 shortcut corridor, 50% S-curves, 30% L-shaped rooms.
- **`cave`** — High variance (±20%), small rooms (40-70% of leaf), margin 2-4, 3 shortcut corridors, 70% S-curves, 10% L-shapes.
- **`dwelling`** — Near-zero variance (±5%), rooms fill 85-100% of leaf, fixed margin 2, no shortcuts, 10% S-curves, no L-shapes.

**Exterior styles** (forest / rural / city / plains / desert / castle / tundra):
- Each has `wallKeywords` (border terrain), `floorKeywords` (room terrain), `crosserKeywords` (roads — unused as crossers, used for terrain corridor keyword matching).
- Obstacle patches (water, trees, cliff) placed inside rooms via `obstacleKeywords` + `obstacleChance`.
- Secondary crossers (stream/river) are **interior-only** — exterior styles never use crosser paths.

#### Layout Rules

- **BSP rooms**: minimum 3x3, margin >= 2 (enforced, never collapses to 1). `minLeaf = 6` ensures each leaf can fit a 3-tile room + 2-tile margin. Interior styles use `splitThreshold: 10` — minimum area for 4 rooms is 14x14 (12x12 playable). Exterior styles use `splitThreshold: 12` and `marginRange: [2, 2]` to guarantee rooms large enough for 2x3 building features — minimum area for 4 exterior rooms is 18x18 (16x16 playable). Room size is a random fraction of available leaf space, randomly offset within the leaf.
- **L-shaped rooms**: Adjacent BSP siblings may merge into a single zone with probability `nonRectChance`. The zone solver handles arbitrary shapes.
- **Corridor routing**: axis-overlap detection (straight connection at shared Y/X), L-bend fallback when rooms don't overlap on either axis.
- **S-curves**: Probability controlled by `sCurveChance`. Offsets middle third by 1 tile perpendicular. Bends only on interior wall tiles (never first/last).
- **Shortcut corridors**: `shortcutCount` controls how many T-junction shortcuts between non-adjacent rooms.
- **Interior corridors use crossers** (corridor type only, on wall tiles). **Exterior corridors carve floor terrain zones** through wall terrain — no crosser paths.
- **Corridor edge flags only point wall-to-wall**: crosser edges are NOT generated toward room tiles. Room-boundary corners handle the visual transition. Generating edges toward rooms requests combos like `wall/wall/floor/floor + corridor` that no tileset tile satisfies.
- **Crosser type**: use `corridor` (self-contained per tile). Never use `doorway` — doorway crossers require matched pairs on shared edges (arch geometry split between adjacent tiles).
- **Propagation guard**: crossers don't propagate onto tiles with any non-default corner (boundary or room tiles). Only pure-default tiles receive propagated crossers.
- **Room-corner crosser exclusion**: tiles diagonally adjacent to rooms (but NOT cardinally adjacent) are excluded from corridor crosser paths. These tiles get a single non-wall corner from the corner grid (3-wall+1-floor pattern) and no tileset has crosser tiles for that pattern. Room-EDGE tiles (cardinally adjacent) are kept — the solver's step 1.5 finds corridor-mouth tiles for them.
- **Solver scan-order**: solves bottom-to-top, left-to-right. Fallback chain: (1) exact corners+crossers, (1.5) adjust free corners+keep crossers, (2) exact corners+drop crossers, (3) adjust free corners+drop crossers, (4) all-default fallback. Step 1.5 finds "corridor mouth" tiles by adjusting room-edge corners. Adjustments are written back to the corner grid so downstream tiles see them.
- **Feature group filters**: groups with crosser edges or mismatched terrain corners are excluded from feature packing and `adventure_apply_layout`. Door-containing groups are allowed **only if** every door tile has all corners matching the floor terrain and no crosser edges — this lets freestanding buildings (houses, lodges) pass while rejecting corridor doors and transition doors. Terrain mismatch means a feature tile's corners don't all match the room's floor terrain — placing such a feature locks foreign corners into the grid, creating visual seams and forcing solver fallbacks on neighboring tiles.
- **Feature suggestions**: `suggestedFeatures` array in LayoutResult — packed into rooms targeting 50%+ tile coverage. `adventure_apply_layout` applies zones + crossers + features atomically. Pass `preferredFeatures` (array of group names from `get_tileset_details`) in `LayoutStyle` to prioritize plot-appropriate features over random selection.

### Resource Loading

On `load_module`, the server builds a full resman stack (lowest to highest priority):

1. **Base game BIFs** (via `NWN_FOLDER_DATA`)
2. **Module HAKs** (from `Mod_HakList` in IFO)
3. **User override/** (`NWN_FOLDER_USER/override/`)
4. **User development/** (`NWN_FOLDER_USER/development/`)
All 2DAs from the stack are extracted and parsed at load time (~598 base game tables). `load_module` accepts just a filename (e.g., `"mymod.mod"`) which resolves from `NWN_FOLDER_USER/modules/`.

**The temp dir persists across reloads of the same module.** `createTempDir()` derives the dir name deterministically from the module's absolute path, so calling `load_module` again on the same path reuses the same dir instead of wiping it — only switching to a genuinely different module cleans up the old one. This is load-bearing: it's what lets skills persist sidecar files (e.g. `adventure.md`) directly into the temp dir with Write/Edit and have them survive a reload. Don't "clean up" by wiping the temp dir unconditionally in `loadModule` — that destroys sidecar files that aren't part of the `.mod` archive and can't be reconstructed by re-extracting.
**But a reload still re-extracts everything already inside the packed `.mod`, silently reverting any edit made since the last repack.** "Persists" above only covers sidecar files that were never part of the archive (like a freshly generated include, before its first repack). Every `.utc`/`.nss`/`module.ifo`/etc. that already exists inside the `.mod` gets overwritten back to its packed content on `load_module`, even when reusing the same temp dir. Confirmed directly: edits to `a_mod_load.nss`, another creature-spawn script, and `module.ifo`'s `Mod_OnModLoad` field all silently reverted after a same-path `load_module` call issued between the edits and the first `repack_module`. **Never call `load_module` between an edit and its `repack_module`** — make every edit, repack once, and only reload afterward if the in-memory index genuinely needs refreshing.

## GFF Data Model

Every GFF field is type-wrapped: `{ type: "dword", value: 100 }`. Use helpers from `types/gff.ts`:
- `getFieldStr(obj, "Tag")` → unwraps cexostring/resref
- `getFieldNum(obj, "ChallengeRating")` → unwraps byte/char/word/dword/int/float/double
- `getFieldLocStr(obj, "FirstName")` → extracts text from cexolocstring (prefers lang 0/English)
- `getFieldLocStrResolved(obj, "FirstName", tlkLookup)` → resolves `[TLK:N]` strrefs via lookup function
- `getFieldList(obj, "Creature List")` → unwraps list to array of structs
- `setField(obj, "Tag", "cexostring", "my_tag")` → set or create a typed field
- `setFieldNum(obj, "Tile_ID", 42, "int")` / `setFieldStr(obj, "Tag", "my_tag")` → shorthands

`GffObj` type alias (`Record<string, unknown>`) used throughout. `GIT_STRUCT_ID` constants in `config.ts`: CREATURE=4, WAYPOINT=5, SOUND=6, ENCOUNTER=7, DOOR=8, PLACEABLE=9, STORE=11, TRIGGER=1.

## Object Placement

**Position fields differ by type:**
- Creatures/Waypoints/Triggers/Encounters/Sounds/Stores: `XPosition`, `YPosition`, `ZPosition`, `XOrientation`, `YOrientation`
- Placeables/Doors: `X`, `Y`, `Z`, `Bearing` (radians)

**Blueprint resolution chain:** module parsedGff cache → module resources on disk → resman (base game/HAKs, 120s timeout). Always deep-cloned before mutation.

## Walkmesh Caching

The `wok_cache/` directory is lazy-initialized on first use via `ensureWokCacheDir()` in `walkmesh.ts`. Reset on each `load_module` via `setWokCacheDir(tempDir)`. All walkmesh consumers (placement tools, paint tools) call `ensureWokCacheDir()` — never create the dir manually.

## Undo Stack

Simple undo stack for GIT mutations — `snapshotGitForUndo()` before each mutation, `popUndo()` to revert. Max 50 entries. MCP tools: `undo_last_change`, `undo_history` in `undo-tools.ts`. For bulk rollback of a failed phase, use `bulk_remove_objects` with tag patterns.

## Blueprint Discovery

`list_blueprints` tool searches the full resman stack (base game + HAKs + module) with 3-layer matching:
1. **Resref** — filename substring match
2. **Binary content** — finds tags and hardcoded locstring names in GFF data
3. **TLK names** — resolves strref-based names via `index.baseTlk`/`index.customTlk`

Returns type-specific summaries (utc: CR/race/classes, uti: baseItem/cost, etc.). Results cached in `blueprint_cache/`.

## Area Connectivity

`check_area_connectivity` tool does BFS from the module start area through linked doors/triggers. Returns reachable/unreachable areas and the full transition graph. Implemented in `analysis-tools.ts`, reuses `buildTagToAreaMap`/`buildAreaTransitions` from `tileset-tools.ts`.

## Area Transitions

Three mechanisms for moving between areas:
- **`link_doors`** — bidirectional door-to-door linking. Doors are two-way objects.
- **`create_area_transition`** — one-way trigger→waypoint transition. Places an Area Transition trigger (Type=1, LinkedToFlags=2=Waypoint) in the source area and a waypoint in the target area. Call twice with swapped source/target for two-way transitions.
- **`adventure_create_transition`** — **bidirectional** portal for adventure modules. Single call places a useable blue shaft of light (`plc_solblue`) AND a landing waypoint at both positions simultaneously, guaranteeing the light and waypoint in each area share exact coordinates. Each light's OnUsed script opens a dialog ("Step through?" / "Turn away"). On confirmation, plays VFX_FNF_SUMMON_MONSTER_2 and jumps the PC to the destination waypoint after 2 seconds. The `/create-adventure` pipeline uses this exclusively instead of `create_area_transition`.

## Trap Blueprints

`create_trap_blueprint` creates a UTT trigger blueprint with NWN trap fields: `TrapDetectDC`, `TrapDisarmable`, `TrapFlag`, `TrapOneShot`, and a default square geometry. Place with `place_trigger`.

## Quest Completability

`verify_quest_completability` traces all journal quests from quest-giver dialog through `AddJournalQuestEntry` script calls to the end entry. Checks area reachability. Returns structured gaps for each quest.

## Placement Collision Detection

`place_creature` (0.75m radius) and `place_placeable` (1.0m radius) check for nearby objects and **block placement** if another object is within range. The `collisionRadius` parameter on `place_creature` allows callers to override (pass `"0"` to disable).

## Walkability Enforcement

All placement and movement tools **block** if the target position is non-walkable or within 1m of a non-walkable surface. Uses `checkPlacementWalkable()` in `walkmesh.ts` which checks the target point plus 4 cardinal probes at a configurable distance (default 1m). `adventure_create_transition` uses a 2m buffer so portals stay clear of walls and cliff edges.

**Enforced on:** `place_creature`, `place_placeable`, `place_waypoint`, `place_trigger`, `place_encounter`, `place_store`, `move_object`, `bulk_move_objects`, `create_area_transition`, `adventure_create_transition` (both source and target positions).

**Excluded:** `place_door` (doors sit at tile boundaries near walls), `place_sound` (audio sources don't need walkable positions), movement of Door List and SoundList objects.

## Walkmesh Caching

The `wok_cache/` directory is lazy-initialized on first use via `ensureWokCacheDir()` in `walkmesh.ts`. Reset on each `load_module` via `setWokCacheDir(tempDir)`. All walkmesh consumers (placement tools, paint tools) call `ensureWokCacheDir()` — never create the dir manually.

## Object Height Correction

`fix_object_heights` adjusts Z height of all placed objects in an area (or all areas) to match the walkmesh ground plane. Iterates creatures, placeables, waypoints, triggers, encounters, stores, and sounds. Only adjusts objects where the walkmesh Z differs from the current Z by more than 0.01. The walkmesh check uses the highest walkable face at each position (handles overlapping faces at different heights).

## Zone-Based Terrain Solver

`adventure_apply_layout` (adventure tool) takes the full `LayoutResult` from `adventure_generate_layout` and applies zones + crossers + features atomically via the zone solver (`src/util/zone-solver.ts`). `paint_tiles` and `paint_group` are base tools for direct/manual tile placement — no solving.

**TODO — area prefabs.** Reconstructing complex multi-tile architecture (castle
gates with towers, cave mouths carved into a rise) purely via corner/crosser
matching is fragile — most of one session's worth of user bug reports were exactly
this class of problem. `feature-collars.ts` (see the Pitfalls entry below) is the
cheap fix for *known* height-transition features. Two bigger, not-yet-implemented
approaches — hand-author a piece once, stamp the verified result into generated
areas as an atomic unit instead of re-deriving it tile-by-tile every time — are
fully spec'd out in `docs/area-prefabs-spec.md`: prefabs as oversized feature
groups (smaller lift, reuses most of `packFeatures`), and prefabs as whole BSP
rooms with declared corridor-connection points (bigger lift, needed for something
the size of a full walled castle compound with real interior space). Recommended
sequencing, the exact deliverable a hand-built prefab source area should look
like, and a concrete starter-library TODO (specific prefabs for the *user* to
hand-build in the toolset, two batches, priority order) are all in that doc.

`get_tileset_details` defaults to `detail: "summary"` (~2KB) which includes terrain types, crosser types, valid terrain adjacencies, and group names. Use `detail: "full"` for the complete 60-100KB tile catalog.

### Tile Matching Rules

The **only** determining factors for tile selection from .set files are:
- **Corner terrains:** `TopLeft`, `TopRight`, `BottomLeft`, `BottomRight`
- **Corner heights:** `TopLeftHeight`, `TopRightHeight`, `BottomLeftHeight`, `BottomRightHeight`
- **Edge crossers:** `Top`, `Right`, `Bottom`, `Left`
- **Orientation:** the `.set` `Orientation` field (0/90/180/270 degrees)

The `.set` file `[PRIMARY RULES]` and `[SECONDARY RULES]` sections are **NOT functional for tile solving**. They are toolset autotiling rules for terrain propagation when painting in the toolset. They do not restrict which tiles can be placed where. **IGNORE them entirely.**

### Tile Orientation Normalization

The `.set` `Orientation` field specifies the rotation (degrees) at which the tile's corners and crossers are defined in the file. At parse time in `tileset.ts`, corners and crossers are **un-rotated by the `.set` Orientation** to normalize all tiles to GIT orientation 0. This ensures `getRotatedCorners(tile, gitOri)` returns the correct effective corners for any GIT placement orientation.

The solver also **prefers tiles at their natural `.set` Orientation** — the rotation the 3D model was designed for — over rotated alternatives that produce the same corner pattern. This prevents visual artifacts from tiles whose model geometry doesn't align properly when placed at non-native orientations.

### Terrain Adjacency Constraint

**Zone layouts must respect tileset terrain adjacency chains.** Tilesets only have transition tiles between specific terrain pairs. If two terrains can't transition directly, a buffer zone of the intermediate terrain is REQUIRED — the solver will NOT fabricate intermediate terrains.

**Before designing zones**, call `get_tileset_details` and check which terrains have transition tiles between them. Common adjacency chains:
- `tno01` (Castle Exterior Rural): `Trees → Grass → CastleWall → Dirt`
- `ttr01` (Rural): `Trees → Grass` (+ Water, Dirt variants)

You cannot skip terrains in the chain. For example, in `tno01` you must place a 1-tile `Grass` zone between `Trees` and `CastleWall` — no direct Trees↔CastleWall transition tiles exist. The solver will warn and fall back to incorrect tiles if adjacencies are invalid.

## Known Pitfalls

- **`nwn_script_comp` positional arg.** Most nim tools use `-i <file>`, but `nwn_script_comp` takes the source file as a **positional argument** (last): `nwn_script_comp [options] [-o out] file.nss`. Using `-i` silently fails.
- **`nwn_twoda` no JSON.** Use `-k csv --write-id-column` instead. The CSV parser in `nim-tools.ts` handles it.
- **Numeric tool params must use `z.string()`.** The MCP SDK validates JSON Schema before Zod transforms execute, so `z.coerce.number()` fails when clients send strings. Use `z.string()` + `toF()`/`toI()` helpers from `src/util/params.ts`. Same for complex array params — use `z.string()` + `JSON.parse()`.
- **Resman tools are slow.** Every invocation initializes the full resman stack. Default timeout (30s) is too short for piped operations — `resmanCatToJson()` uses 120s.
- **Temp dir contains cache subdirs.** `resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/` — all auto-excluded from `erfPack()` by the `isFile()` filter. Never pack these into the module.
- **`validate_module` false positives.** Base game scripts (`nw_c2_default5`, etc.) and items (`nw_wblms001`) are resolved at runtime — filter these "missing" references.
- **Primary/secondary rules in .set files are NOT functional and must be IGNORED.** They are toolset autotiling propagation rules, not tile placement constraints. The tile solver works entirely by matching corner terrains, corner heights, edge crossers, and the `.set` Orientation field.
- **Height tiles excluded from solving.** Tiles with any corner height > 0 are filtered out. All solver-placed tiles are flat.
- **Tile rotation: do NOT swap cases 1 and 3 in `getRotatedCorners`/`getRotatedCrossers`/`forwardRotate`.** Case 1 = 90° CW, case 3 = 270° CW. This solve-time rotation math (applied to an already-parsed tile's corners to compute its effective corners at a given GIT placement orientation) is verified correct — cross-checked against 31 real, human-placed instances of a tno01 corner tile across 12 independently-built areas in a large hand-built PW corpus (`~/tfndev`), 100% match. **The crosser-rotation half of the same math (`getRotatedCrossers`) is separately verified too** — cross-checked against 69 real placements of tdm01's corridor-cap/straight/corner-turn tile family (ids 43/44/47/164/165/167) across 15 independently-built `tdm01` dungeons in the same corpus, 68/69 exact matches (the one exception is an explainable dead-end, not a mismatch pattern). Do this same corpus cross-check — never trust the codebase's own rotation code to grade itself — any time a user reports a tile that still looks wrong after a fix; it either confirms the rotation math (as here) or finds the next real bug (as the original parse-time discovery did). **A separate, now-fixed bug lived one level earlier, at parse time** (see "Real Module" pitfalls below) — don't conflate the two. If a tile still looks misrotated after confirming the parse-time fix is live, the bug is somewhere else (e.g. zone-solver orientation selection), not in these three functions.
- **DLG field completeness is critical — with two verified exceptions.** The NWN engine silently
  fails to load dialogs missing standard fields. Every entry/reply MUST include `Animation`,
  `Comment`, `Delay`, `Quest`, `Script`, `Sound`. Every link struct **nested inside an
  entry/reply's `RepliesList`/`EntriesList`** MUST include `IsChild`. The `makeEntry`/
  `makeReply`/`makeLink` helpers in `dialog-write-tools.ts` handle all of this — keep writing
  every field, this is not a reason to trim any.
  - **`AnimLoop` is not load-blocking.** Verified against a large (416-dialog, 19,779-node),
    live, actively-hosted PW module (`~/tfndev`, "The Frozen North") — ~14% of its entry/reply
    nodes lack `AnimLoop` entirely (confirmed against the compiled `.mod` binary via this
    project's own `nwn_erf`/`nwn_gff` extraction, not just checked-in source), spread across
    many different dialog files with no pattern by node type, and the module runs fine in
    production. Still write it (no cost, and the field does control animation looping), but
    don't diagnose "missing AnimLoop" as a load failure — it isn't one.
  - **Root (`StartingList`) links don't carry `IsChild`.** In that same corpus, 100% of
    `StartingList` link structs omit `IsChild` (1596/1596) while 100% of nested
    `RepliesList`/`EntriesList` links carry it (0/31917 missing) — `IsChild` is meaningless on a
    root link (a root is never anyone's child), so the requirement is real only for nested links.
- **`create_dialog` condition field.** The `condition` on a node goes on the **link pointing to it** (`Active` field), not the node itself.
- **Tileset door placement.** Each tile's .set file has `[TILE<id>DOOR<n>]` subsections with local-space offsets. Use `getTileDoorWorldPositions()` in `tileset.ts` to convert to world space. Never guess door positions.
- **CPDB blob format.** Campaign database blobs (compressed=1) use a 24-byte header (`"CPDB"` + version + fields) followed by zstd-compressed data (NOT zlib). The payload is JSON text, not binary GFF. Vartype codes are ASCII chars: F=70 float, I=73 int, J=74 json, L=76 location, O=79 object, S=83 string, V=86 vector. F/I/L/V are uncompressed ASCII; J/O/S are CPDB/zstd compressed.
- **Database files are `.sqlite3`**, not `.sqlite`. Located in `NWN_FOLDER_USER/database/`.
- **GIT trigger field name is `TriggerList`** (no space), not `"Trigger List"`. Other no-space list names: `SoundList`, `StoreList`, `WaypointList`. With-space names: `Creature List`, `Door List`, `Encounter List`, `Placeable List`.
- **Triggers need Geometry in placed instances.** UTT blueprints from resman do NOT contain geometry. When placing triggers, always ensure the `Geometry` list field exists with at least 4 vertices (PointX/PointY/PointZ). Without geometry, the engine won't detect entry and the toolset won't render the trigger.
- **GIC must be synced with GIT.** The toolset uses the GIC file to index objects in an area. `writeBackGit()` automatically syncs the GIC. Without GIC entries, objects exist in the GIT but the toolset doesn't show them.
- **A placed instance's `VarTable` (and other per-instance fields) is a separate copy from its UTC blueprint's — editing one does not edit the other.** `place_creature`/`create_creature_blueprint`'s own `varTable` param is unaffected by this (it sets the blueprint before the object is ever placed, so there's only one copy to get right at creation time) — the gap is specific to editing a creature that's *already placed* in a `.git`. Confirmed directly: batch-adding `SPEC_*` local variables to 110 already-placed companions' `.utc` files (verified present there via independent `nwn_gff` extraction) produced total silent failure at runtime — every one read back as unset, because the actual placed instances in the area's `.git` still only carried their original vars. The fix wrote the same entries into the `.git`'s `Creature List` directly. Same family of bug as the previously-found `SoundSetFile` case (a `modify_gff_field` write to a blueprint alone left a placed instance's voice unchanged) — treat any field edit made *after* placement as needing both files, never just the blueprint.
- **TODO — investigate: creatures with verified-correct `Appearance_Type`/`Race` data can
  still render invisible in the toolset.** Real user report against 110 already-placed
  companions in a real module: `get_creature_details` confirmed `race`/`appearance` match
  correctly (e.g. `race=0, appearance=0` = Dwarf) — the data is right — yet the creatures
  showed no visible model in the toolset. User's own diagnostic: manually changing a
  henchman's appearance to a different race and back in the toolset UI made it render
  correctly. This strongly suggests an engine/toolset appearance-cache invalidation issue
  specific to how these instances were written (direct GFF/`paint_tiles`-style writes,
  never touched through the toolset's own property-panel mutation path), not a data
  correctness problem — possibly the same *class* of bug as the `VarTable` pitfall right
  above and the `SoundSetFile` pitfall below (a write that's byte-correct but doesn't
  propagate through whatever cache/index the engine or toolset keeps). **Unconfirmed
  hypothesis — not root-caused this session.** If this recurs, the next step is checking
  whether it's specific to `Appearance_Type` alone or any creature field on an
  already-placed instance, and whether it's a toolset-only display quirk or also affects a
  live server's rendering.
- **Placeable display name field is `LocName`**, not `LocalizedName`. Setting `LocalizedName` on a placeable has no effect — the toolset and engine read `LocName` (a cexolocstring).
- **Placement Z height from walkmesh.** All placement tools automatically set the object's Z position from the walkmesh surface height. The walkmesh check returns the highest walkable face Z at the position. Use `fix_object_heights` to retroactively fix objects placed before this feature.
- **Zone solver rejects incompatible adjacencies.** `adventure_apply_layout` returns early with zero placements and `INCOMPATIBLE TERRAIN ADJACENCY` errors if the zone layout contains terrain pairs with no transition tiles. Fix the zone layout, don't retry.
- **`fallbackSubstitute` is constrained.** The zone solver's fallback only tries terrains present in the corner grid (zone-defined + default). It will never inject an alien terrain.
- **`modify_gff_field` corruption isn't limited to float fields.** Beyond the float-serialization case below, two further confirmed corruptions: (a) attempting to construct new struct-list GFF fields for dialog `ActionParams`/`ConditionParams` corrupted the dialog's in-memory state on the first try; (b) a plain edit to an *existing scalar* field on an area's GIT data corrupted state too, with no struct-list creation involved. Treat `modify_gff_field` as unsafe for this class of edit across the board — prefer a typed tool (`edit_dialog_node`, area/creature/item edit tools, etc.) over a raw GFF field poke wherever one exists.
- **Dialog `ActionParams`/`ConditionParams` aren't usable through nwn-mcp yet.** The engine's `GetScriptParam()` works fine at runtime, but there's no reliable way to write the struct-list GFF fields those parameters live in (see above) — don't retry `modify_gff_field` for this expecting a different result. Working substitute: one-line wrapper scripts per attachment point, with the real tag/state/target values carried via ordinary local variables (`SetLocalString`/`SetLocalInt`) on triggers/creatures/items, or per-node scripts for dialogs. See `quest-params` skill for a full worked pattern.
- **`write_script`'s built-in `compile: true` has an intermittent race.** It can throw a spurious `ENOENT` on the `.ncs` output path even when the source is fine. The reliable form is two calls: `write_script(resref, source, compile: false)` then a separate `compile_script(resref)`.
- **`list_script_references`/`find_orphans` blind spots (tested, confirmed).** Neither tool finds scripts referenced by **trigger** event fields (`OnEnter`/`OnExit`/etc.) — only dialog nodes, creature event fields (e.g. `OnDeath`), and `module.ifo`. A script flagged as unreferenced/orphaned may simply be a trigger's `OnEnter` script; verify with `get_area_triggers` before concluding it's dead. Separately, the reference index appears to be built once at `load_module` time rather than updated incrementally — scripts wired onto dialogs created earlier in the *same* session can still come back with zero references. `flatten_dialog` and `get_resource` on the raw `.dlg` stay accurate throughout and are the reliable way to confirm wiring on anything just built.
- **GFF `Dropable`/`Lootable` can be silently overridden at runtime.** Setting `Dropable=1` on an item (via `create_creature_blueprint`, `set_creature_equipment`, `place_creature`/`place_placeable` inventory) or `Lootable=1` on a creature only controls the *default* engine behavior. A module's own scripts — most commonly an `OnSpawn` handler that hands out randomly-generated loot — can call the legacy native functions `SetDroppableFlag(object, int)` / `SetLootable(object, int)` on the object at spawn time, which take precedence over the GFF fields and are invisible from the GFF data alone. If a user reports "I set Dropable/Lootable but nothing drops in-game" after nwn-mcp wrote those fields correctly, the next place to look is the creature's `ScriptSpawn` (OnSpawn) source for a `SetDroppableFlag(..., FALSE)`/`SetLootable(..., FALSE)` call — this is out of nwn-mcp's GFF-editing scope (see Scope) but worth telling the user about. Confirmed root cause of a real "nothing drops" bug report in a separate PW module (DwarfStory), traced to 75 such calls across 12 OnSpawn scripts.

## Pitfalls Found by Building a Real Module

These came out of generating a full four-area module end-to-end. Each cost real
debugging time, and none was visible from unit tests.

- **Doors/gates architecture — why generated areas usually ship with none, and what
  each layer of the gap actually is.** Investigated after a user observation that the
  17-area `tileset-proving-grounds` module has almost no doors/gates anywhere. Four
  separate, distinct causes, not one bug:
  1. **`groupHasUnsupportedDoors`/`groupMatchesTerrain` check the *style's nominal*
     floor terrain, not the *specific room's* actual zone terrain.** For single-terrain
     interior/dungeon styles this never matters. For multi-terrain exterior styles
     (castle's grass/dirt/keep, city's cobble/building/evilcastle) it does: a
     door-bearing group can pass this pre-filter and still get silently dropped later
     at `adventure_apply_layout`'s per-position `featureZoneTerrain` check, because
     the room it lands in has different terrain than the style's nominal one.
     Confirmed for real: 4 of 9 `preferredFeatures` requested for a `tno01`/castle
     area (`House_Inn_2x2`, `MarketStall_2x2`, `Forge_L_shape_2x2`,
     `City_House_2x2_m26` — all door-bearing buildings) were rejected this way. Not
     wrong, just wasteful — the LLM burns `preferredFeatures` slots on picks that
     can't succeed in a mixed-terrain area without knowing each room's terrain ahead
     of time. A real improvement here would have `packFeatures` filter door-bearing
     groups per-room (it already iterates rooms and could look up each room's actual
     zone terrain) instead of once for the whole area.
  2. **Tileset-integrated doors (gates, building doors, corridor archways) need a real
     Door GIT object placed separately from the visual tile** — the tile model alone
     is just a wall opening with no lock, script, or interactivity. This is a
     documented, existing procedure: `adventure-areas/SKILL.md`'s **Phase 5b** scans
     the painted grid for any tile with `doorPlacements` (from `get_tileset_details`)
     and places+locks a real door for each. **This step was simply never run for the
     proving-grounds module** — that build used an ad-hoc recipe outside the full
     `/create-adventure` skill script (its own doc says "Structure + light dressing
     only"), so Phase 5b never executed. A real `/create-adventure` run should
     already produce functional doors wherever the tileset provides them — this
     hasn't been end-to-end verified in this project, and is worth a real test rather
     than assuming it works from the doc alone.
  3. **FOUND A REAL MISTAKE while manually testing doors for this module**: a
     tile's `doorPlacements[].type` value is a row index into **`doortypes.2da`**,
     which maps directly to a `TemplateResRef` — the exact door blueprint that
     tileset expects for that specific door tile (e.g. `tds01`'s Big Door 1, type 17,
     maps to `nw_door_ttr_08`; its Fence Door 1, type 15, maps to `nw_door_ttr_07`).
     The manual door test done for this module instead picked blueprints from
     **`genericdoors.2da`** by matching appearance number — a different, generic
     table meant for hand-placed doors with no tile association, not the
     tile-integrated lookup `adventure-areas/SKILL.md`'s Phase 5b actually specifies.
     Structurally harmless (the doors still placed, locked correctly, and verified),
     but visually/thematically the wrong door model for that tile. **Always resolve
     a `doorPlacements[].type` value through `doortypes.2da`, never `genericdoors.2da`.**
  4. **Interior corridor archways (doorway-type crossers) are deliberately never
     generated by `layout-generator.ts`** — see the existing "Crosser type" rule
     under Layout Rules: `doorway` crossers need matched pairs on shared edges, which
     the solver isn't built to guarantee, so the generator always requests `corridor`
     type instead. This means auto-generated dungeons will never have a mid-corridor
     doorway unless one comes from a deliberately-requested single-tile door group
     (Big Door, Fence Door, etc.) — not a bug, a considered solver-reliability
     tradeoff. Making doorway crossers reliable would be a real, separate
     solver-extension project, not a quick fix.
  5. **Inter-area transitions deliberately never use doors or triggers** — this is
     intentional, existing design (`adventure-areas/SKILL.md`'s Phase 7: "Use
     `adventure_create_transition` for ALL area transitions — do NOT use doors,
     `link_doors`, or `create_area_transition`"), not a gap. Light-shaft portals need
     no matched door pairs or trigger geometry across two areas, which is why the
     pipeline standardized on them. Switching any of this to physical doors or
     trigger-based transitions would be a deliberate scope change to the
     `/create-adventure` pipeline, not a bug fix — needs explicit user sign-off, not
     silent replacement.

- **FIXED — independently-routed corridor paths could dead-end cardinally
  adjacent to each other with no connecting edge, reading as two hallway stubs
  that obviously should link but don't.** `connectRooms()` in `layout-generator.ts`
  computes each corridor's edge flags purely from its own path's prev/next tiles
  — it has no visibility into any other corridor. A shortcut corridor (cave style
  uses `shortcutCount: 3`) can by geometric coincidence end one tile from a
  main room-connector corridor, each capped with its one open side facing away
  from the other. Confirmed by a real user report against `tdm01` (Mines/Caverns):
  three separate instances in one area (a vertical corridor capped facing south
  sitting directly below a horizontal corridor capped facing west, and two more
  of the same shape) — traced by computing each placed tile's actual effective
  crossers (raw `.set` values rotated by the tile's real GIT orientation, the
  same rotation math already verified correct against `~/tfndev`) and confirming
  neither tile's open edge faced the other despite the tiles touching. **Fix:**
  `mergeAdjacentDeadEnds()` (`layout-generator.ts`), run once after all room
  connectors, shortcuts, and the secondary crosser are assembled and before the
  layout is returned. For every pair of cardinally-adjacent tiles across *all*
  crosser paths that share the same crosser type and have no edge pointing at
  each other, it sets the connecting edge on both sides. There is no legitimate
  case in this generator's model where two same-type crosser tiles occupy
  touching cells without being meant to connect — every crosser tile represents
  a routed, walkable corridor — so the merge always applies, never conditionally.
  Verified against a synthetic reproduction of the exact reported shape (see the
  function's usage) plus two guard cases: different crosser types never merge,
  and an already-fully-connected path is left untouched (byte-identical before/
  after). The three already-generated instances in the shipped module were
  hand-patched with `paint_tiles` (swapping each capped tile for a through or
  corner-turn tile computed from the same rotation formula) rather than
  regenerating the area, since `adventure_apply_layout` re-solves the whole area
  from scratch and isn't incremental.

- **FIXED — `adventure_apply_layout`'s feature-group placement checked terrain
  *name* but never corner *height*, letting height-transition features get dropped
  into dead-flat zones.** The zone solver already excludes any tile with non-zero
  corner height from its own placements (`tileset.ts`'s per-tile `flat` field) —
  but the separate feature-group code path in `adventure-tools.ts` only validated
  that a candidate group's tiles matched the surrounding zone's terrain *name* on
  all four corners, with no height check at all. A tile can be "snow/snow/snow/
  snow" by name and still have `TopLeftHeight=1` — exactly `tts01`'s `Cave` group,
  a cave mouth carved into a rise (top edge elevated, bottom/entrance flat).
  Confirmed by a real user report: the cave rendered floating in an open field,
  cliff-edge seam on every side but the entrance, because its flat "snow" corner
  names satisfied the only check that existed. **Fix:** feature groups containing
  any non-flat tile are now rejected with a `featureWarning`, the same standard the
  solver already holds itself to. This pipeline has no automated way to also
  terrace matching elevated ground around a height-transition feature — a group
  like this now needs deliberate hand-placement (`paint_tiles`, not
  `adventure_apply_layout`) plus manually rotation-matched neighboring slope tiles.
  See `area-frozen/SKILL.md`'s Pitfalls section for the worked recipe (computing a
  cave tile's real corner heights at its placed orientation, finding which
  rotation of a neighboring slope tile reproduces the exact matching edge, and
  what "good enough" looks like — a 1-tile collar, not a fully seamless terrace).

- **`feature-collars.ts` — the reject-by-default rule above now has a curated
  escape hatch.** After hand-deriving and verifying collars for four more
  height-transition features this same session (`tts01` Cave, `tti01` Cave and
  Ramp, `tcn01` CityGate_2x2), the pattern was clearly going to keep recurring —
  every user report was "here's a feature that needs the exact same kind of fix
  as last time." `src/util/feature-collars.ts` is a small curated table:
  `(tileset, group name) → collar tiles` (each an offset from the feature's own
  origin + tile ID + orientation). `adventure-tools.ts`'s height-transition
  rejection now checks this table first — a listed (tileset, group) pair is
  auto-placed *with* its collar in the same `adventure_apply_layout` call instead
  of being rejected; anything not listed still falls through to the old
  reject-by-default behavior. Each collar tile still gets its own bounds +
  terrain-name check at placement time (the curated entry is trusted for tile
  ID/orientation, not for whether *this specific* room's surroundings still
  match what it was derived against) — a collar tile that can't be placed is
  dropped with a warning, not treated as a reason to reject the whole feature.
  **Growing this table is the cheapest way to fix the next reported instance of
  this bug class**: derive the collar once via the recipe above, add one entry,
  and every future generation gets it automatically instead of needing another
  hand-patch. Needs an MCP restart to take effect; doesn't retroactively fix
  already-built areas (a listed feature already painted before the restart still
  needs the old hand-patch treatment).

- **FIXED — parse-time tile-corner "un-rotation" was corrupting every tile whose
  `.set` `Orientation` field is non-zero.** `tileset.ts`'s `.set` parser used to treat
  a tile's `Orientation` field (90/180/270) as a statement that the file's
  `TopLeft`/`TopRight`/`BottomLeft`/`BottomRight` fields were recorded "pre-rotated"
  and needed un-rotating back to GIT-orientation-0 terms (`unrotateCorners`/
  `unrotateCrossers`, called unconditionally whenever `Orientation != 0`). This was
  wrong: those fields already describe the tile in GIT-orientation-0 terms exactly as
  written, regardless of `Orientation`'s value — `Orientation` only records which
  rotation the 3D model was designed at (used by the solver's separate
  "prefer natural orientation" placement preference, which is unaffected and still
  correct). Confirmed by a real user report: `tno01` castle-wall convex corners
  ("square corner" tile 209 / round "tower corner" tile 230, both `.set`
  `Orientation=90`) rendered visibly rotated wrong in the toolset, while the concave
  3-wall corner tile (223, `.set` `Orientation=0`, hence never exercising the buggy
  code path) rendered correctly — exactly the fingerprint of a parse-time bug gated
  on non-zero `Orientation`, not a solve-time rotation-direction bug (see the
  "Tile rotation" pitfall above, which is unaffected and still correct).
  **Verification method, for reuse on any future tile-rotation report:** don't trust
  this codebase's own rotation code to check itself (comparing `getRotatedCorners`
  against `forwardRotate` only proves they agree with each other, not with the real
  engine — this was tried first and gave a false pass). Instead cross-reference
  against a large, independently-built, human-authored module using the same
  tileset (`~/tfndev` — 12 real `tno01` areas were available) by finding every real
  placed instance of the suspect tile ID, reading its neighbors' terrain at the
  *raw, unrotated* `.set` corner values (only trustworthy for neighbors placed at
  GIT orientation 0, or fully rotation-symmetric all-one-terrain tiles, so no
  rotation formula needs to be trusted on the read side either), and checking
  whether the pattern the code predicts for that orientation matches what humans
  actually built. Tabulate multiple samples per orientation value (0/1/2/3) — a
  clean, uniform match or a clean, uniform offset both a real signal; noise is not.
  **Fix:** removed the `unrotateCorners`/`unrotateCrossers` call and the two
  functions themselves from `tileset.ts` — corners/crossers are now stored exactly
  as parsed from the `.set` file. Needs an MCP server restart to take effect, and
  any already-generated area containing an affected corner tile needs
  regeneration (`adventure_generate_layout` + `adventure_apply_layout`) to pick up
  corrected data — the bug was in parsing, not in data already written to a `.are`.

- **`modify_gff_field` cannot write float fields.** The MCP layer serialises `value`
  as a string, so a float field receives `{"type":"float","value":"60"}` and `nwn_gff`
  rejects it with a `ValueError`. Worse, `setGffByPath` has already mutated the
  in-memory document by then, so a **failed write leaves `index.parsedGff` holding a
  value that will fail every subsequent write of that resource**. Recover by
  `repack_module` (which packs the still-valid files on disk) then `load_module` to
  re-read. Affects `Mod_Entry_X/Y/Z` and any other float — set positions at creation
  time instead, or reload after a failure.
- **Interior tilesets fill with `wall`, not floor.** `create_area` on `tic01`/`tde01`
  and friends fails with *"No suitable default tile found"* for any floor terrain,
  because floor tiles only exist as room interiors bounded by wall — the adjacency
  list shows every floor terrain connecting to `wall` alone. Create the area with the
  tileset's own default terrain (`wall`) and carve rooms with
  `adventure_generate_layout` + `adventure_apply_layout`.
- **Decorated interior terrains are only partly walkable.** `tic01`'s `rich` tiles
  carry furniture, so a tile that exists is not necessarily a place a creature can
  stand — a throne-room centre computed as `tile * 10.0 + 5.0` came back
  `Nonwalk (ID 7)`. Never compute a placement position arithmetically on a decorated
  terrain; always ask `adventure_find_walkable`.
- **`create_module` leaves a dead `_start` area.** The template's `tms01` stub stays in
  the module after real areas are built, and shows up as permanently unreachable in
  `check_area_connectivity`. Delete it once the real entry area exists and
  `Mod_Entry_Area` points at it.
- **Base-game whitelists must be shared, not per-tool.** `validate_module` reported 255
  errors on a module it had just created, every one a stock `nw_*`/`x2_*` reference.
  `isBaseGameScript()` / `isBaseGameResource()` in `src/util/verify/common.ts` are the
  single source of truth — any new checker must use them. A checker with false
  positives trains people to ignore it, which is worse than no checker.

## Verification Gate (verify_* tools)

Generated `.nss` has the compiler as its acceptance gate. Nothing played that role for
any other generated file type, so structurally-broken assets shipped silently. The
`verify_*` family (`src/tools/verify-tools.ts` + `src/util/verify/*.ts`) is that gate.

- **Complements `validate_module`, does not replace it.** `validate_module` does
  cross-reference checks (does the named script exist). `verify_*` does intra-file
  structural and semantic checks (does this dialog carry the fields the engine silently
  requires; is this tile ID inside the tileset; is this NPC standing somewhere reachable).
- **Severity is a contract.** `error` = the engine or toolset will misbehave ⇒ blocks.
  `warning` = quality/plausibility ⇒ advisory. Each finding carries a stable `code` so
  skills can branch on a specific defect, and a `fix` naming the tool that repairs it.
- **`verify_all` is the shipping gate.** `shippable: true` means zero errors module-wide.
  `/adventure-polish` runs it last; every other phase verifies its own output before
  writing `success` to `adventure-status.json`.
- **Base-game scripts are whitelisted by prefix** in `isBaseGameScript()`
  (`src/util/verify/common.ts`) — `nw_c2_default*`, `x0_ch_hen_*`, `nw_ch_ac*` and
  friends resolve at runtime and must never be reported as missing.

**A live isolated verification server exists and has run a real end-to-end check
successfully** (`~/nwn-mcp-verify-server`, outside any git-tracked repo — see
`docs/runtime-verification-spec.md` §1 for the full setup and findings). `verify_*` can
only check static GFF preconditions; this closes the gap for behavior that only exists
once the engine actually runs a script. First real run, against "Henchman Gear Showcase"
(the module whose bad-stats bug report started this whole effort): 110 companions wired
with `SPEC_*` vars, run headless, grepped for `[SPEC_FAIL]` — caught the exact bug (empty
`FeatList`, `StartingPackage` stuck at 0) with zero human interaction. **What's still
missing is automation**: copying a generated module into the server's `modules/` folder,
launching, polling for load completion, grepping, tearing down, and feeding failures back
into nwn-mcp's repair tools is all still done by hand — the orchestration loop is designed
(`docs/runtime-verification-spec.md` §5) and proven manually, but not built into a tool.
`randspellbooks` (`~/tfndev/src/nss/inc_rand_spell.nss`) also still depends on NWNX and a
persistent campaign database this project has no way to invoke — out of scope for
`inc_spec_check.nss`, which deliberately uses zero `NWNX_*` functions.

## Co-op / Multiplayer Rules

**Every module is assumed to be party-playable by default.** A dialog action script runs
once, on the NPC, with exactly one PC as `GetPCSpeaker()`. Any reward handed to that
object alone reaches one player and silently skips the rest — invisible in solo testing,
which is why it survives to multiplayer. Enforced by `verify_coop_rules`:

- **XP/gold/items must fan out.** Use the generated `inc_reward` helpers
  (`create_reward_system`), or loop `GetFirstFactionMember(oPC, TRUE)` /
  `GetNextFactionMember(oPC, TRUE)` by hand. A bare
  `GiveXPToCreature(GetPCSpeaker(), n)` is an **error**, not a warning.
- **`AddJournalQuestEntry`'s 4th arg (`bAllPartyMembers`) defaults to TRUE** — never pass
  FALSE, or one player's journal advances while the rest cannot complete the quest.
- **Shared quest state must not live on a single PC.** `SetLocalInt(GetPCSpeaker(), ...)`
  gives each player their own copy; use `GetModule()` or the quest giver.
- **Single-player modules opt out** with `coop: false` on `verify_coop_rules`/`verify_all`.
  The same findings are still reported, as warnings rather than errors.

### Rewards are per-player, not a divided pot

**Quest rewards are NOT split by party size — each player receives 100%.** This is the
default policy and the one to keep. `RewardPartyXP`/`RewardPartyGP` in `nw_i0_tool` are
loops calling `GiveXPToCreature(oPartyMember, XP)` with the *same* amount for every
member; they divide nothing. Only **combat** XP is divided by the engine.

`create_reward_system` generates `inc_reward.nss` with the policy baked in:

| Helper | Behaviour under the default FULL policy |
|---|---|
| `CoopRewardXP(oPC, n)` | every player gets `n` |
| `CoopRewardGold(oPC, n)` | every player gets `n` |
| `CoopRewardItem(oPC, r, c)` | every player gets their own copy |
| `CoopRewardClassItem(oPC, t)` | every player gets the tier-`t` item matching **their own** primary class |
| `CoopRewardQuest(oPC, x, g, t)` | all of the above in one call |

- **Policies:** `full` (default, 100% each), `split` (XP/gold divided; items go to the
  triggering PC, since an item cannot be halved), `speaker` (single-player).
  `sharePercent` scales every payout and never rounds a positive reward to zero.
- **Callers pass the triggering PC** (`GetPCSpeaker()`, `GetLastUsedBy()`) and never
  iterate the party themselves. The helpers walk PCs only — `GetFirstFactionMember(oPC,
  TRUE)` — so henchmen never absorb a share.
- **`CoopPrimaryClass` picks the highest base-class level**, so a multiclass PC gets gear
  matching what they actually play rather than whichever class came first.
- **An include cannot compile standalone** (no `main()`), so the tool proves it with a
  throwaway probe script and reports `compiles`. Never trust an unverified include.
- **Placed loot cannot fan out.** A chest with one sword is first-come-first-served, and
  no checker can see it — hand shared signature rewards out from a script instead.

## Henchmen / Companions

`create_creature_blueprint`'s `henchman: true` wires all 13 script fields to the stock
BioWare associate AI (`x0_ch_hen_*`). These are base-game resources resolved at runtime —
**never write them into the module**.

- **`SetMaxHenchmen()` must run before `AddHenchman()`.** `AddHenchman` is a silent no-op
  when the cap is too low. The generated `a_mod_load` raises it and chains the previous
  `Mod_OnModLoad` handler rather than replacing it.
- **`SetAssociateListenPatterns()` must be called on recruit.** The engine delivers radial
  follow/stand-ground orders as a silent command shout matched in the companion's
  OnConversation handler. Omit this and it ignores every order.
- **`ScriptDialogue` = `x0_ch_hen_conv` and `ScriptHeartbeat` = `x0_ch_hen_heart` carry the
  feature.** The latter tail-calls `nw_ch_ac1`, the actual follow AI. Never set `nw_ch_ac*`
  in a UTC field yourself.
- **Never build a companion on a Commoner chassis** (`nw_bartender`, `nw_oldman`,
  `nw_convict`, `nw_shopkeep` are all class 20). `LevelUpHenchman` grants a Commoner no
  feats and no spellbook — the root cause of the "cleric has no spells" report. Use a
  PC-class chassis and set `startingPackage`.
- **`startingPackage` is not optional — it silently defaults to 0 (Barbarian's package)
  if unset,** which is correct only for an actual Barbarian and wrong for every other
  class, degrading `LevelUpHenchman()`'s feat/skill/spell picks. **Verified rule: for
  every base class's iconic package, `packages.2da` row index equals class ID**
  (Barbarian=0, Bard=1, Cleric=2, Druid=3, Fighter=4, Monk=5, Paladin=6, Ranger=7,
  Rogue=8, Sorcerer=9, Wizard=10) — always set `startingPackage` to the same number as
  the companion's `classes` entry. `verify_creature(henchman:true)` now flags
  `henchman_no_package` when this is missed (`src/util/verify/blueprints.ts`).
- **Appearance needs no chassis clone.** `appearance.2da` rows 0-6 (Dwarf, Elf, Gnome,
  Halfling, Half-Elf, Half-Orc, Human) map 1:1 by label to the same numeric
  `racialtypes.2da` rows used by the `race` field, for the 7 standard PC races. Set
  `race` and `appearance` to the same value and skip `sourceResref` entirely — this was
  the root cause of a "henchmen have no appearance" report: `buildMinimalUtc()`'s own
  defaults are `Race=6` (Human) but `Appearance_Type=0` (Dwarf), a real mismatch out of
  the box, not just an unset field. `verify_creature` now flags
  `appearance_race_mismatch` for any creature (not just henchmen) where these disagree
  within the standard-race range.
- **An empty `FeatList` on a fresh level-1 blueprint is expected, not a defect** — but
  **verified via a live headless server run: `GetHasFeat()` does NOT reflect any
  engine-computed racial feat set when `FeatList` is empty; it strictly reads the actual
  `FeatList`.** `racialtypes.2da`'s `FeatsTable`/`ExtraFeatsAtFirstLevel`/
  `NormalFeatEveryNthLevel` columns describe what a racial feat progression *should* look
  like, but nothing populates `FeatList` from them automatically — that population is
  meant to happen via the live `LevelUpHenchman()` call below, same as class feats. An
  empty `FeatList` is a legitimate *transient* state on a level-1 blueprint that hasn't
  been leveled yet; it is not a legitimate *permanent* state for any creature a script
  might later `GetHasFeat()`-check. Confirmed in a real end-to-end run: 110/110 companions
  built with `ClassList` set directly to a target level (never run through
  `LevelUpHenchman()`) failed a racial-feat `GetHasFeat()` check, 100% consistently. Don't
  hand-populate `FeatList` to "fix" an apparently-empty one on a level-1, about-to-be-leveled
  blueprint — but don't assume racial feats are "handled automatically" for a creature
  that's meant to stay static at a level above 1 either; it needs a real
  `LevelUpHenchman()` pass.
- **Abilities come from vanilla `LevelUpHenchman(oHench, CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID)`**
  at recruit, looped to the blueprint's `HENCH_LEVEL` local. `bReadyAllSpells = TRUE`
  matters — without it the companion joins with an empty memorized list.
- **CORRECTION, verified via a live headless server run: `LevelUpHenchman()` grants ZERO
  automatic/non-chosen feats — not class proficiencies, not racial feats, at any level,
  for any class.** This directly contradicts the "Class/bonus feats are meant to come
  entirely from the live `LevelUpHenchman()` call" line two bullets above — that line is
  now known wrong and needs fixing, not just this note. Confirmed by direct probe: even
  basic Simple/Martial Weapon Proficiency was absent from a level-5 Fighter after a real,
  successful `LevelUpHenchman()` leveling pass. Automatic feats are apparently a
  character-creation-time concept (package application via the toolset's own character
  creation flow), not something this runtime call ever does for an NPC. **The only proven
  fix**: populate `FeatList` directly at build time — racial feats unconditionally from
  `race_feat_<race>.2da` (every row is automatic, no level gating — the table has no
  `List`/`GrantedOnLevel` columns), class feats from `cls_feat_<class>.2da` filtered to
  `List=3` and `GrantedOnLevel <=` the target level. Full tables for all 7 standard PC
  races and 11 base classes were captured and applied to repair a real module this
  session, but **this fix has not yet been applied to `adventure-actors/SKILL.md`'s
  actual companion-creation recipe** — every companion built by following that skill as
  currently written has this same gap. Highest-value next step for this whole track.
  Separately, also confirmed: `LevelUpHenchman()` silently refuses to grant a level in an
  alignment-restricted class (`classes.2da`'s `AlignRestrict` — Monk needs Lawful, Paladin
  needs Lawful Good) when the creature's `LawfulChaotic`/`GoodEvil` don't qualify. A
  companion built at a generic neutral alignment will silently cap at level 1 forever if
  its class is Monk or Paladin — set alignment to match the class before leveling.
- **Static verification can't confirm this actually worked at runtime — `create_spec_verification`
  closes that gap.** It generates `inc_spec_check.nss` (`src/util/spec-check-script.ts`),
  whose `SPEC_VerifyCreature(oCreature)` compares actual runtime race/appearance/class/
  level/package/feats/spells against `SPEC_*` local variables set on the blueprint (via
  `create_creature_blueprint`'s `varTable` — see `adventure-actors/SKILL.md` Phase 3b's
  template), logging `[SPEC_OK]`/`[SPEC_FAIL] tag=... field=... expected=... actual=...`
  lines. `a_hen_join` calls it as its last line. It is gated by the **module** local
  `MCP_VERIFY_MODE` (set `1` by `a_mod_load` during generation, flipped to `0` as the last
  build step before delivery) — `module.ifo` has no `VarTable` field to bake a static flag
  into, unlike UTC/UTP blueprints, so this must be a runtime `SetLocalInt` rather than a
  GFF field. See `docs/runtime-verification-spec.md` for the full design, including the
  build→run→check→repair orchestration loop this is meant to support (not yet
  implemented — see the TODO under "Verification Gate" above for the live-server piece).
  **Representative-feat data is real, verified 2DA lookups for all 11 base classes and
  all 7 standard PC races** (`RACIAL_FEATS`/`CLASS_FEATS` in `src/util/spec-check-script.ts`)
  — `SpecExpectedClassFeat()`/`SpecExpectedRacialFeat()` return `-1` (check skipped, never
  a false pass) only for anything outside those 11 classes/7 races.
- **Companion voices must be TYPE 0 (PC voiceset) rows** from `soundset.2da`. TYPE 3 NPC
  sets are sparse and leave the companion intermittently mute.

**TODO — not every NPC should get full PC-class bonus-feat progression.** Everything above
(`LevelUpHenchman`, `startingPackage`, `SPEC_VerifyCreature`) assumes an NPC is meant to
progress exactly like a PC of that class — right for companions, wrong for a background
NPC the plot describes as a plain "warrior" or "adept" rather than a named Fighter/Cleric
character. **Confirmed via `nwscript.nss`: NWN ships no separate Warrior/Expert/Adept/
Aristocrat `CLASS_TYPE_*` the way tabletop D&D 3.5's NPC classes do** — the only true
non-PC catch-all is `CLASS_TYPE_COMMONER` (20), and that one already grants *no* feats or
spellbook at all via `LevelUpHenchman` (see the "Commoner chassis" bullet above), which is
too blunt for an NPC that should still fight competently, just without a PC's full bonus-
feat chain (Cleave→Great Cleave, Weapon Specialization, metamagic feats, epic feats, ...).
Needs: a way to mark a creature blueprint as "simple" at creation time, and either (a) a
curated lighter feat set instead of running it through full `LevelUpHenchman`, or (b) a
repair tool that strips specific over-advanced bonus feats from a creature that was already
leveled the normal way. Not designed yet — raised by the user, not yet scoped.

## Gear Appearance

Generated gear uses the base item's **default** model variant, applied by
`applyDefaultItemModels()` (`src/util/item-models.ts`) after `BaseItem` is final. A
composite weapon (`baseitems.2da` ModelType 2) needs `ModelPart1..3` all non-zero; any
part left at 0 renders as a shapeless blob in the creature's hand.

**TODO — randomised gear appearance.** Once per-base-item model-variant counts can be
derived from the resman stack (baseitems.2da carries no variant count), the helper can
pick a random valid variant per part so generated NPCs stop sharing identical weapons.
Until then "default model" is correct: a wrong variant index renders as nothing at all.

## Testing

**Everything runs locally. No hosted CI, and none is wanted** — modules generated with
this server are one-off and local, so module generation and testing must never depend on
a service. Do not add a `.github/workflows/` pipeline; the pre-commit hook is the gate.

- `npm run verify` runs the full gate: build (tsc), lint (biome), test (vitest).
- `npm run hooks:install` installs the pre-commit hook (once per clone). It runs the same
  `scripts/verify.sh` before every commit touching `src/`, `package.json`, `tsconfig.json`
  or `biome.json`; bypass with `git commit --no-verify`.
- Biome ships its binary as a platform-specific optional dependency. If `npm run lint`
  dies with `MODULE_NOT_FOUND`, install it:
  `npm install --no-save @biomejs/cli-$(node -p "process.platform+'-'+process.arch")`.
  `scripts/verify.sh` detects this and skips lint with a message rather than failing opaquely.
- The suite runs in ~1s with no network and no NWN install, which is what makes a
  pre-commit hook tolerable. Checks needing real game data (tilesets, 2DAs, walkmeshes)
  degrade to "skip", never to "fail".
- See `docs/TEST_PLAN.md` for the project-wide test plan and test case specification.
