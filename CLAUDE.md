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

**TODO — reserve guaranteed flat, mutually-matching space for a multi-tile
feature before packing it (user-raised).** Surfaced directly by the Frostmarch
cave fix in "The Six-Fold Trial": `feature-collars.ts` gives a *known*
height-transition feature a correct 1-tile collar, but nothing in the BSP/room
layout stage reserves a larger flat region *around* where that feature will land
— so extending a collar into a believable raised plateau (or any multi-tile
feature that needs several flat, corner-matching tiles on all four sides to sit
in cleanly) is always a manual post-hoc patch, not something the generator
planned room shape/size around. Worth a real look: could `packFeatures` (or the
room-sizing pass before it) query a feature's real footprint + collar
requirement and bias BSP room dimensions/placement to guarantee a flat,
same-terrain, same-height buffer of the right size before ever attempting to
place it — closing the gap between "the collar is correct" and "there's
actually room for the collar." Related to, but distinct from, the area-prefabs
work above (prefabs solve *authoring* a known-good multi-tile piece once;
this solves *making room* for one, prefab or procedural, before packing it).

**TODO — rebuild a single area in place from an existing/completed module
(user-raised).** No current tool lets you regenerate just one area of an
already-built module using the normal `adventure_generate_layout`/
`adventure_apply_layout` pipeline when that area's design turns out to not suit
the player (bad layout, an unfixable structural bug, or simply "player didn't
like this one") without hand-patching tile-by-tile as this session's Frostmarch/
keepbailey fixes did. Worth scoping: `delete_area` + `create_area` +
`adventure_generate_layout`/`adventure_apply_layout` already exist as the raw
pieces, but re-wiring the area back into the transition graph (doors/portals to
its neighbors), re-placing everything the deleted area held that other systems
already reference (quest triggers, companion recruit points, a key NPC's
dialog-driven state), and deciding what should regenerate vs. carry over
untouched are all real design questions, not just plumbing. A dedicated
`rebuild_area`-style capability (or a documented recipe using existing tools)
would turn "this area has issues" from a multi-hour hand-patch into a
supported, repeatable operation.

**TODO — a per-module git repo, committing the JSON view of each resource, not
raw binary GFF (user-raised).** Each module's temp dir is currently disposable
and regenerable from the packed `.mod` (see the `load_module` re-extraction
pitfall below) — there's no history, and reverting one bad edit means hand
re-extracting from the last repack the way this session's recovery from a
corrupted file did. A real per-module git repo would give that for free, plus
branching/diffing for the area-rebuild TODO above ("try a regenerated area,
diff against the old one, revert if the player doesn't like it"). The design
question the user specifically flagged: commit the **JSON round-trip form**
this project already produces via `nwn_gff` (or generates for tool output),
not the raw binary `.git`/`.utc`/etc. — binary GFF diffs as "changed," which
tells you nothing; the JSON form diffs as "which field on which struct
changed," which is the whole point of having history at all. Needs real
scoping before building: where the repo lives (not `/tmp`, which today's temp
dir intentionally is, for good reason — see the pitfall below), what triggers
a commit (every `repack_module`? every mutating tool call, git-embedded
resources included?), and whether the binary form is committed alongside the
JSON form (probably yes, since the JSON is derived and the binary is what
actually ships) or regenerated from JSON on demand.

**Tooling to prevent the classes of mistakes found late in one session's own
work (user-raised: "how do we avoid these in the future, can we add script
and tooling to keep progress moving forward").** Three real, self-inflicted
mistakes happened in one session while hand-fixing a shipped module. #1 and
#2 below are now fixed with real tooling rather than relying on remembering
prose rules under time pressure; #3 is still open.

1. **FIXED — `setGffByPath`/`modify_gff_field` now coerces a value to the
   field's real GFF type instead of storing whatever the caller sent
   verbatim.** Root cause of "modify_gff_field cannot write float fields" and
   the broader "corruption isn't limited to float fields" pitfall above: MCP
   clients routinely send numeric-looking params as strings (see
   `util/params.ts`'s own comment on why every numeric tool param is
   `z.string()`), and the old `field.value = newValue` had zero type
   awareness — a float field could end up as `{"type":"float","value":"60"}`,
   which `nwn_gff` rejects. `coerceGffValue()` in `util/gff-path.ts` now
   coerces against int/float/string GFF type families on every set (existing
   field: coerce against its real type; new field: coerce against the
   supplied `gffType`), and explicitly **refuses** `struct`/`list`/
   `cexolocstring`/`void` with a clear error rather than attempting and
   silently corrupting — those need real internal structure a flat
   path+value+type API can't express safely; use a typed tool instead. 9 new
   unit tests in `gff-path.test.ts` cover the coercion and the refusal.
   `modify_gff_field` is the one canonical tool for this class of edit now —
   there's no need for a parallel raw-script recipe anymore for simple scalar
   field edits (bulk edits across many structs in a list — the pattern behind
   this session's own faction-flip and store-field-rename fixes — still has
   no dedicated tool; that's real future work, not covered by this fix).
2. **FIXED — `load_module` now refuses to reload/switch when the current
   module has unpacked changes, instead of silently discarding them.** Root
   cause of the "never call load_module between an edit and its repack"
   pitfall being violated anyway: nothing enforced it. `util/dirty-state.ts`
   tracks which temp directories have been written to since their last clean
   point (scoped per-directory, not a single global flag — a global flag
   would make `create_module`'s own throwaway assembly-directory writes look
   like they dirtied whatever *other* module happened to already be loaded,
   a real cross-contamination bug caught while building this). `jsonToGff`
   (the near-universal write path — 30+ call sites across the codebase) and
   `writeAndCompileScript` both mark their target directory dirty on every
   write; `repack_module` and a fresh extraction both clear it. `load_module`
   now checks `isDirtyUnder(currentIndex.tempDir)` before re-extracting and
   throws a clear error naming the fix (`repack_module` first, or pass
   `force: true` to `load_module` to discard deliberately) — covers both
   reloading the *same* module and switching to a *different* one while the
   current module is dirty (switching wipes the old temp dir the same way a
   reload overwrites it). Verified end-to-end against a real module (not just
   unit tests): a scratch write correctly triggers a refusal, and `force:
   true` correctly re-extracts clean. 5 new unit tests in
   `dirty-state.test.ts`, including the cross-contamination case.
3. **FIXED — a race between a dispatched background agent's own
   `load_module` and concurrent direct edits to the same shared temp dir**
   from another process. Both a real orchestrator process and an Agent-tool
   subagent process share one temp dir per module (by design, so sidecar
   files like `adventure.md` persist) — confirmed genuinely separate OS
   processes, not shared in-memory state (a subagent's `load_module` really
   did revert the orchestrator's own pending edits mid-session; if they
   shared process state, reloading would have reused the same in-memory
   index instead of re-extracting). `util/module-lock.ts` adds a real
   file-based lock: a small JSON file (`.mcp-lock`, pid + timestamp) inside
   the temp dir itself, held for as long as a process has that module
   loaded — not just for one call. `load_module` acquires it for the temp
   dir right before extraction and releases the *previous* module's lock
   when switching to a different one; a process exiting without an explicit
   release (session just ends) is caught by a `process.on("exit")` handler
   as a safety net (deliberately not hooking SIGINT/SIGTERM — an MCP stdio
   server's SDK manages its own shutdown signals, and a competing handler
   calling `process.exit()` could short-circuit it). A free lock, a stale
   one (owning pid no longer alive — `process.kill(pid, 0)` liveness check),
   or one this same process already holds are all claimed immediately; one
   genuinely held by another live process gets a short bounded wait (3s,
   for quick transient overlaps) before throwing a clear error naming the
   holder's pid, rather than blocking indefinitely or silently interleaving.
   Verified with a real cross-process test (two separate `node` processes,
   not just unit tests): process A acquires and holds the lock, process B
   correctly refuses while A is active, and a third attempt after A exits
   correctly succeeds once the exit handler has released it. 7 new unit
   tests in `module-lock.test.ts` (the "genuinely locked" case uses an
   injectable short timeout so it doesn't eat the real multi-second wait in
   the suite). This closes the gap the dirty-state guard (item 2) couldn't:
   that guard only sees *this* process's own pending work; this is the
   cross-process half. Still worth keeping the operational habit from
   before as a second layer, not a replacement: avoid dispatching a
   background agent for a module while also doing direct edits on it in the
   same conversation when it's easy to avoid — the lock turns a silent
   revert into a loud, actionable refusal, but a loud refusal mid-workflow
   is still friction worth sidestepping when there's no real need to run
   both at once.

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

- **FIXED — the equipped-item resref field was read as `EquippedRes` everywhere in
  this codebase; no real equipped item struct carries that field name, so every
  check depending on it was silent dead code.** The real field is `TemplateResRef`
  (same name an *inventory*, non-equipped item uses — confirmed by dumping a real
  equipped `Equip_ItemList` entry: it carries `TemplateResRef`, `BaseItem`,
  `StackSize`, etc. directly, with no `EquippedRes` field at all). Three call sites
  had this typo: `get_creature_details`'s equipment display (`creature-tools.ts`,
  always showed `resref: ""` for every equipped item — dismissed as a display quirk
  more than once before the real cause was found), `validate_module`'s missing-
  equipped-item-blueprint checker (`analysis-tools.ts`, never actually flagged
  anything, ever), and — most consequential — `verify_creature`'s
  `ranged_weapon_no_ammo` check (`util/verify/blueprints.ts`), which exists
  specifically to catch an archer equipped with a bow and no arrows. Confirmed via
  a real build ("The Six-Fold Trial"): 3 creatures (2 archers + 1 key NPC) shipped
  with a bow and zero ammo, undetected through the actors, challenges, polish, and
  rewards phases despite `verify_all`/`verify_creature` reporting `shippable: true`
  at every one of those checkpoints — the check that should have caught it had
  never once actually executed its logic, on any creature, in this project's
  history. **Fix:** corrected the field name at all three sites, and rewrote the
  ammo check to read `BaseItem`/`StackSize` directly off the embedded equipped-item
  struct instead of doing an async blueprint re-resolve for `BaseItem` (the
  embedded struct already carries it — the resolve was unnecessary indirection that
  also silently no-op'd when `resmanOpts` wasn't passed). Added a companion
  **`ammo_stack_size_unreasonable`** warning-level check at the same time (see the
  ammo-quantity convention below) and 3 new unit tests exercising the fixed
  behavior (present-but-empty ammo, present-but-wrong-family self-ammo, present-
  and-reasonable). **This is exactly why the "always independently re-verify a
  phase's `shippable: true` self-report" discipline established elsewhere in this
  doc exists — but it has a limit: independent re-verification via `verify_all`
  itself is worthless when the underlying check is dead code. The only thing that
  actually caught this was a human playing the finished module.**
- **Ammo-quantity convention (user-specified).** A ranged-weapon creature needs not
  just *some* ammo equipped but a *plausible combat load* — 99 (the GFF stack-size
  ceiling) is exactly as wrong as 0, just less obviously broken. Target ranges,
  now enforced by `verify_creature`'s `ammo_stack_size_unreasonable` warning
  (`AMMO_STACK_RANGE` in `util/verify/blueprints.ts`): **arrows/bolts** (bow/
  crossbow) ~a dozen, checked as 8-16; **sling bullets** 8-20; **darts** ~8,
  checked as 4-12; **throwing axes** 2-6. Darts/shuriken/throwing axes have no
  separate ammo slot — the RightHand weapon's own `StackSize` *is* the ammo count
  (`SELF_AMMO_TYPES` in the same file), so the check reads RightHand's stack
  directly for those rather than looking for a separate equipped slot. Shuriken
  (`AmmunitionType` 5) has no user-specified range and is deliberately left
  unchecked rather than guessed, per this project's "encode unverified data as a
  skip, never a guess" rule.
- **FIXED — `get_area_creatures`/`list_creatures` returned `[]` for creatures placed
  after `load_module`.** Both read `index.creatures`, a summary array built once at
  `load_module` time and never refreshed — any creature placed afterward (the normal
  case, since `/create-adventure`'s `/adventure-actors` phase runs well after module
  load) was invisible to these two tools while genuinely present in the GIT.
  Confirmed real, not a false alarm: `get_creature_details(area, tag)` — which
  already reads live from `index.parsedGff` — found a freshly-placed companion fine
  on the same area where `get_area_creatures` returned empty. Root cause and fix
  were symmetric with `get_area_placeables`, which was already correct — it reads
  the `Placeable List` live from `parsedGff` on every call instead of caching.
  **Fix:** exported `indexAreaCreatures()` (`module-loader.ts`, already existed,
  just unexported) and had both tools call it live against current `parsedGff`
  data instead of touching `index.creatures` at all. Needs an MCP server restart to
  take effect. **This is a real risk for any skill/phase whose idempotency checks
  say "call `get_area_creatures` first, skip if already placed"** (`adventure-actors`,
  `adventure-challenges`, others) — before this fix, that check would silently
  report an area as empty even when it wasn't, causing duplicate placement. If a
  module built before this fix shows unexpectedly duplicated creatures, this is why.
- **CRITICAL — direct `nwn_gff` file edits and in-memory-index MCP tools silently
  clobber each other; ordering is load-bearing.** Most placement/equipment/blueprint
  MCP tools (`set_creature_equipment`, `create_item_blueprint`, `fix_object_heights`,
  etc.) read and mutate `index.parsedGff` (the server's in-memory copy of each GFF,
  populated once at `load_module`) and serialize it back to disk via `writeBackGit()`
  or equivalent. A raw `nwn_gff` round-trip script (the technique used throughout this
  doc for bulk edits no MCP tool covers) writes **directly to the file on disk** and
  never touches `index.parsedGff`. Mixing the two on the *same resource* in one
  session is a real, confirmed data-loss bug, not a theoretical risk: after directly
  patching 7 creatures' `ClassLevel`/`FeatList`/`SkillList`/stats/spells into
  `showcase.git` via script, a subsequent `set_creature_equipment` call (MCP tool) on
  those same creatures read the *stale pre-edit* in-memory GIT, merged equipment into
  it, and wrote that stale version back — silently reverting every stat/feat/skill/
  spell change while appearing to succeed (it even reported the right resrefs added).
  The direct edits weren't lost from a bad write; they were overwritten by a *later,
  successful* write from the other pathway. **Worse than same-resource collision:
  confirmed a SECOND time in the same session** — `set_creature_equipment` called
  for creature A alone reverted creatures A *and* six others in the same `.git` back
  to their pre-edit state, because the tool serializes the *entire* stale in-memory
  GIT document back to disk on every call, not just the one creature it targets.
  Once any direct edit has touched a `.git`/`.utc`, the in-memory index for that
  resource is permanently stale for the rest of the session — there is no "safe
  creature" to call an equipment/placement tool on afterward, not even an untouched
  one. **Rule: once a resource has been edited directly on disk in a session, do not
  call any further MCP tool that touches that same resource before the final
  direct-edit pass — do all MCP-tool-based work (equipment, placement, blueprint
  creation) first, apply direct `nwn_gff` script edits last, then `repack_module`
  immediately after with nothing in between.** If more MCP-tool work turns out to be
  needed after a direct edit (e.g. a follow-up gear change), the only safe recovery
  is `load_module` on the just-repacked `.mod` — re-extracting is safe *here* because
  it restores the in-memory index to match the last good repack, unlike the
  documented `load_module`-between-edit-and-repack pitfall above, which loses work
  that was never repacked at all. Confirmed working recovery sequence, used twice in
  one session: `repack_module` → (later) `load_module` → do the new MCP-tool work →
  apply the direct-edit script (again, in full — a partial re-patch of just the new
  fields leaves everything else reverted) → verify every affected field on disk →
  `repack_module` → send. **Always read back the on-disk state for every affected
  creature/field right before `repack_module`** whenever a session has mixed both
  edit styles — this caught the bug both times, by dumping `ClassLevel`/`FeatList`
  length/stats/`Equip_ItemList` together and confirming all were simultaneously
  correct before repacking.
  after a direct edit is enough. **Always read back the on-disk state right before
  `repack_module` when a session has mixed both edit styles** — this is what caught
  the bug here, by dumping `ClassLevel`/`FeatList` length/`Equip_ItemList` together
  right before the final repack and confirming all three were simultaneously correct.
- **Armor items (`ModelType` 3 in `baseitems.2da`) need `ArmorPart_*`/`Cloth1Color`/
  `Cloth2Color`/`Leather1Color`/`Leather2Color`/`Metal1Color`/`Metal2Color` fields to
  render at all — `create_item_blueprint`/`applyDefaultItemModels()` does NOT set
  these, unlike its correct handling of composite weapons (`ModelType` 2,
  `ModelPart1-3`).** `item-models.ts`'s own comment ("Armour — parts come from the
  creature's body, not the item") is misleading — the fields actually live on the
  ARMOR ITEM (18 `ArmorPart_<slot>` fields mirroring the creature body-part slot
  names, e.g. `ArmorPart_Torso`, `ArmorPart_LShoul`, plus `ArmorPart_Robe` for a
  single-mesh full-body look) and select which visual variant renders per slot when
  the item is worn — confirmed by pulling two real, designer-authored armor items
  from `~/tfndev` (`hen_dorna_arm.uti`, `cre_nwchain.uti`), both with all 18 parts
  populated and `ArmorPart_Robe=0`. **Unlike creature `BodyPart_*` fields, there is
  NO safe universal default value** — the two real references use completely
  different, specific numbers per slot (e.g. `ArmorPart_Torso` 36 vs 32), drawn from
  a real variant catalog (`parts_chest.2da`, `parts_shoulder.2da`, etc.) this project
  hasn't mapped yet. A from-scratch armor `.uti` built via `create_item_blueprint`
  renders with no visible model change at all — confirmed directly (7 armor pieces
  built this way for a gear-up pass all had zero `ArmorPart_*`/`Color` fields).
  **Current workaround, not a fix: equip a real, pre-existing armor blueprint (base
  game or already-authored module item) instead of building one from scratch** — see
  the gear-sourcing rule below. A real code fix needs the `parts_*.2da` variant
  research first; don't guess numbers into `ArmorPart_*` fields the way `BodyPart_*`
  could be, since there's no confirmed-safe "1 means normal" baseline here.
- **Gear-creation rule (user-specified): prefer real, existing blueprints over
  `create_item_blueprint` from scratch, budgeted by `get_wealth_budget`.** For a
  weapon/armor/shield/accessory an NPC needs, search for a real blueprint before
  building one — see the two-tool search discipline below, since `list_blueprints`
  alone misses most of the base-game "Standard palette" catalog. Use a plain mundane
  blueprint if one exists (e.g. a base longsword) for gear with no required bonus;
  use an existing appropriately-valued magic item (costed via `resolve_blueprint`,
  budgeted against `get_wealth_budget(level, role)`'s per-slot split) when the NPC
  needs an enchantment. Only synthesize a brand-new item from scratch
  (`create_item_blueprint`) for something narrative/plot-specific with no real-world
  equivalent, or a mundane weapon type that genuinely isn't in the base game — and
  even then, a flavor item with no mechanical property (a keepsake ring, a holy
  symbol, a personal effect) needs a `description` establishing why it matters;
  don't generate bare unexplained accessories (a ring, boots, gloves) with neither a
  property nor a backstory. Sourcing a real item sidesteps the armor-appearance gap
  above for free, since a real pre-authored item already carries correct
  `ArmorPart_*`/`Color` data.
  **`list_blueprints` alone is NOT sufficient to conclude "no real item exists" —
  confirmed missed real, correct matches twice in one session.** It matches
  resref/tag/TLK-resolved display name as literal substrings against the search
  term. The base game's "Standard palette" vanilla items use terse, non-obvious
  resref codes with NO display-name overlap to an intuitive search term — e.g. a
  plain mundane Battleaxe is `nw_waxbt001` (magic variants `nw_waxmbt002-011`), a
  mundane Rapier is `nw_wswrp001`, a mundane Dagger is `nw_wswdg001` — none of which
  contain "battleaxe"/"rapier"/"dagger" as a substring anywhere `list_blueprints`
  checks. Real mistake, corrected same session: built three items from scratch
  (a from-scratch Battleaxe, and mundane Rapier/Dagger) believing no real blueprint
  existed, after `list_blueprints` returned zero results for all three — all three
  real items were found immediately once `resman_search` (raw resref substring
  match across the FULL resman including base BIFs, not just TLK/tag/resref
  fuzzy-matched) was tried with a guessed short prefix (`wax`, `nw_wsw`). **Rule:
  before declaring "no real blueprint exists" for a mundane/common item, try
  `resman_search` with a short, generic prefix guess (weapon-type abbreviations
  tend to be 2-3 letters: `wsw`=simple/martial sword family, `wax`=axe family) in
  addition to `list_blueprints` — don't rely on `list_blueprints` alone for
  anything that isn't a distinctively-named magic item.**
  **Corollary (user-specified): a weapon-specific feat means the matching weapon,
  exactly — not just the matching proficiency category.** Weapon Focus/Weapon
  Specialization/Improved Critical are all per-weapon-type feats (`feat.2da` labels
  like `WeapFocBAxe`, `WeapSpeBAxe`, `ImpCritBAxe` are Battle-Axe-specific — a
  different weapon in the same broad category, e.g. a Dwarven Waraxe, does not
  benefit from them at all). The Dwarf Fighter above was first (wrongly) equipped
  with a Dwarven Waraxe (`baseitems.2da` row 108, a different weapon from
  Battleaxe's row 2) precisely because the real Battleaxe wasn't found — check the
  weapon-search rule above before concluding a substitute is necessary.
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
- **FOUND AND FIXED (second, corrected root cause) — creatures with verified-correct
  `Appearance_Type`/`Race` data rendering invisible, in both the toolset AND a live game
  session.** Real user report against 110 companions in a real module, with two critical
  diagnostics: (1) manually changing a henchman's appearance to a different race and back
  in the toolset UI made the *body* render correctly; toggling Gender restored only the
  *head*; (2) the same invisibility happened in an actual running game, not just the
  toolset's editor view, ruling out a toolset-only display cache. **A first hypothesis
  (missing legacy `Tail`/`Wings` fields, diffed against a shopkeeper control creature)
  was wrong** — the shopkeeper (`Appearance_Type=232`) is a monster-model creature and
  was the wrong control entirely; the user re-reported the identical symptom after that
  fix shipped. **Real root cause, found by diffing two genuine, live, actively-hosted-PW
  henchman blueprints** (`~/tfndev`'s `hen_dorna.utc` [Dwarf] and `hen_linu.utc` [Elf],
  both real, confirmed-working PC-race henchmen) **against the broken `h_*` creature's
  raw GFF, full value-level, not just key-presence:** standard-race appearances
  (`Appearance_Type` 0-6) render as a composite model assembled from per-part index
  fields, exactly like a PC character in the character creator — `BodyPart_Belt`,
  `BodyPart_L*`/`BodyPart_R*` (Bicep/FArm/Foot/Hand/Shin/Shoul/Thigh), `BodyPart_Neck`,
  `BodyPart_Pelvis`, `BodyPart_Torso`, `ArmorPart_RFoot` (note the inconsistent name —
  there is no `BodyPart_RFoot`), `Appearance_Head`, and `Color_Hair`/`Color_Skin`/
  `Color_Tattoo1`/`Color_Tattoo2`. Both real samples carried the full set; `buildMinimalUtc()`
  wrote none of them, leaving the composite model with no parts selected. This exactly
  explains the two-part symptom: some head-related recompute happens on a Gender toggle,
  but the body parts only ever populate when the toolset's own Appearance property editor
  runs. **Separately, the same corpus diff also found `Tail_New`/`Wings_New` were the
  wrong GFF type** (`byte` instead of the real `dword`) — real henchmen carry no legacy
  `Tail`/`Wings` fields at all, contradicting the first hypothesis. **Fix:**
  `buildMinimalUtc()` (`git-helpers.ts`) now writes the full body-part/head/color field
  set with values matched from both real samples, writes `Tail_New`/`Wings_New` as
  `dword`, and no longer writes legacy `Tail`/`Wings`. **Verification methodology
  reinforced again: the first fix's mistake was comparing against a control of the wrong
  appearance-rendering category (monster-model vs. composite PC-race model) — always
  confirm the control creature uses the same rendering pathway before trusting a diff
  against it, the same discipline already established for tile-rotation corpus checks.**
  **Visually confirmed by the user**: all 7 race-representative test creatures (built
  from scratch with the corrected `buildMinimalUtc()`, replacing the 110 originally-broken
  companions) render correctly. Those 7 have no racial/class feats, generic 10-across
  stats, and no spells — expected and unrelated to this bug (see "Henchmen / Companions"
  below: empty `FeatList`/static stats on a level-1 from-scratch blueprint is correct
  until a real `LevelUpHenchman()`/2DA-table population pass is run, which this fix
  didn't touch).
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

**TODO — what's script-verified today vs. what still relies on LLM self-report,
surveyed against a real large custom-adventure build** ("The Six-Fold Trial": a
single-PC + 5-henchmen module with bespoke mechanics — paired companion recruiting,
1gp hire cost, 6 skill-check-or-combat-fallback gates, a scripted web-ambush with a
destructible early-termination placeable, an orc-captain persuade-to-flee dialog, an
enemy that converts to a follower, per-area weather, a dual-path lockpick-or-destroy
gate). Verified today, real infrastructure: `verify_*` (static GFF structure),
`verify_quest_completability` (journal/dialog reachability), `check_area_connectivity`,
script compilation, and — when the live verify-server is actually stood up —
`SPEC_VerifyCreature`/`SPEC_SelfTestOnSpawn` for companion stat/appearance/feat/spell
correctness. **Not verified by anything, confirmed by direct experience building this
module — every one of these was either manually checked by the orchestrator (this
session) or simply trusted from a sub-skill's self-report:**
- **Runtime behavior of bespoke NWScript mechanics.** Whether the orc-captain's DC 15
  Persuade branch actually fires correctly, whether the web-ambush trigger applies a
  real 5-round effect and the destructible placeable actually cancels it early,
  whether a skill-check gate's combat fallback actually spawns/triggers on failure —
  all of this is "compiles + structurally present," never actually executed. The
  `SPEC_*` pattern only covers companion stats; nothing generalizes it to arbitrary
  custom quest/encounter scripts.
- **Encounter balance and composition tallying.** "Balanced for the PC and all 5
  henchmen" (an effective-party-size override from the default) was reasoned about
  by the LLM per-encounter, never computed by a tool. Nothing tallies "how many
  battles are humanoid," "does every fight have a caster," or CR-vs-effective-party-
  size automatically — a human (or the orchestrator) has to manually audit the
  built module against the numbered requirements.
- **Loot-drop runtime overrides.** `Lootable`/`Dropable` GFF flags are structurally
  checkable, but an `OnSpawn` script calling `SetLootable(FALSE)`/
  `SetDroppableFlag(..., FALSE)` at runtime silently wins and isn't caught by
  anything — a documented existing blind spot (see the `Dropable`/`Lootable`
  pitfall above), not new, but re-confirmed relevant here.
- **Cross-phase state coordination.** E.g. "the friendly recruit shouldn't be
  visible until the player has survived the encounter with their hostile
  counterpart" was passed as an instruction to one sub-skill's prompt and trusted
  from its self-report — nothing independently confirms the gating variable is
  actually read/written correctly on both ends.
- **Weather/area-property variance.** "Give each area different weather" is neither
  computed nor diffed — a sub-skill could set every area to the same values and
  nothing would catch it.
  **TODO (user-raised, 2026-09-09): weather variance is story-dependent, not just a
  "make adjacent areas differ" rule.** A flat "flag identical weather on adjacent
  areas" check (see item 4 below) would false-positive on two areas that are
  genuinely meant to share weather (a short walk between them, same climate) and
  miss cases where weather *should* differ for reasons a plain adjacency diff can't
  see. Before building this check for real, the design needs to account for: does
  the transition between these two areas represent many hours of travel (weather
  should plausibly have changed) or a near-instant arrival (should usually match)?
  Does the transition move the party to a meaningfully different location/climate
  (mountain pass vs. coastal town) that would affect weather regardless of travel
  time? A real implementation likely needs a per-transition "travel time" and/or
  "climate change" signal — from `adventure_create_transition`'s own data, or a
  new field the area-design phase sets — rather than only comparing the two areas'
  `ChanceRain`/`ChanceSnow`/etc. fields directly.
- **This project's own MCP tool correctness.** The `get_area_creatures`/
  `list_creatures` stale-cache bug (see the pitfall above, found and fixed this same
  session) was caught by manual cross-checking against `get_creature_details`, not
  by any test — there's no meta-check that the tools' own read paths agree with each
  other or with ground truth.
- **Narrative distinctness** (five backstories actually being different, not
  near-duplicates) is inherently a judgment call, not realistically script-
  verifiable — noting it here for completeness, not as a gap to close.

**What should be built, roughly in priority order:**
(1) **BUILT** — a static analyzer that greps every placed creature's `OnSpawn` source
for lootable/droppable-overriding calls and cross-references against the GFF flags.
`validate_module`'s `onspawn_overrides_lootable`/`onspawn_overrides_droppable`
warnings (`src/tools/analysis-tools.ts`) — pure static analysis (regex over the
script's own source via `loadScriptSources`), no runtime server needed. Cannot trace
`ExecuteScript()` call chains into a different script.
**TODO (user-raised, 2026-09-09): this checker needs a legitimate-exception path.**
The user may deliberately want to limit loot server-wide — including specific
creatures the plot means to leave non-lootable/non-droppable on purpose (a mook with
nothing worth taking, a boss whose real reward is scripted rather than a corpse drop).
Today's warnings fire unconditionally on any `SetLootable(FALSE)`/
`SetDroppableFlag(..., FALSE)` call, with no way to mark one as intentional — a real
fix needs some signal (a local variable convention, a `create_creature_blueprint`
param, or just documenting "expected, ignore" in the warning text) so the checker can
tell "silently overridden, unnoticed" apart from "deliberately restricted, expected"
instead of flagging both the same way.
(2) **BUILT (partial)** — `get_balance_report` now includes a per-area `composition`
block: class-count tally and a `casterPresent` flag, explicitly informational (a
caster is not a hard requirement — user-specified: "it does sometimes improve the
encounter mechanics and experience", so this is a note, never a warning/error). The
monster-type/humanoid-count breakdown from the original idea was dropped — no
reliable data source was found for "is this race humanoid" without guessing, and
this project's convention is to skip rather than guess. `effectivePartySize` param
adds a per-member CR figure when passed.
(3) **BUILT** — a door/gate dual-path checker. `verifyDoor`'s `door_leads_nowhere`
warning (`src/util/verify/blueprints.ts`), extended per user spec: a real lock/key
obstacle (`Lockable` + `OpenLockDC>0` or `KeyRequired`) should be wired as a
transition (`LinkedToFlags != 0`) or have at least one Waypoint in the same area
marking a destination — advisory only, since a deliberate dead-end gate the plot
never means to open is a legitimate design choice. Only runs when verifying a placed
instance (`area`+`tag` passed to `verify_door`), not a standalone blueprint, since
"leads somewhere" is meaningless before the door is placed. Note: this checks
*lock/key obstacle → real destination*, not "sane `OpenLockDC` AND real breakable HP
with `Plot` unset" as originally scoped — that formulation conflated normal
door-breakability (true of nearly every door by default) with the actual concern
(does this obstacle lead anywhere), so the check was redesigned around the latter.
(4) **NOT BUILT — design open**, see the weather TODO immediately above this list;
a flat adjacent-area diff was rejected as too naive before writing any code.
(5) the big one — generalizing the `SPEC_*` runtime-verification pattern beyond
companion stats to arbitrary custom quest/encounter scripts, so a bespoke mechanic
like a scripted web ambush gets an actual headless-server pass/fail instead of
"it compiled and looks right." (1)-(4) are pure static analysis, buildable without
the live verify-server; (5) needs it.

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
  session. **Now applied to `adventure-actors/SKILL.md`'s actual companion-creation
  recipe** — Phase 3b's old "an empty FeatList is expected" claim (and the matching
  claim that feats come from the live `LevelUpHenchman()` call) was corrected in place
  with the four-source static-baking approach (racial/automatic-class/generic-schedule/
  class-bonus-slots), plus new skill-point-baking and equipment-sourcing sections
  covering everything found in the session that finally closed this gap.
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
- **Static spell-baking IS possible — the GFF struct format was unknown, now verified.**
  An earlier session note claimed "no static spell-list structure exists on `ClassList`"
  and treated spell-granting as solvable only via a live `LevelUpHenchman()` call. That
  was premature — `ClassList[n]` does carry `MemorizedList0`-`MemorizedList9` (one list
  per spell level, 0 = orisons), each entry a struct with `Spell` (word, `spells.2da`
  row), `SpellFlags` (byte, `1` = ready/available), `SpellMetaMagic` (byte, `0` normally).
  Confirmed against two *never-live-leveled* static NPC blueprints in `~/tfndev`
  (`guard_cleric.utc`, `devrandomcleric.utc` — ordinary map NPCs, not henchmen that get
  leveled at recruit) — real BioWare henchmen (Nathyrra, Bim, Valen, checked this same
  session) are NOT useful references here, since they ship at level 1 in a *non-caster*
  base class and only gain their real caster levels via a live leveling call at recruit,
  same as this project's own henchmen. **For a companion, this only helps if you're
  deliberately baking a static caster (no live leveling planned) — a companion that goes
  through the normal recruit-time `LevelUpHenchman()` flow should keep using that, not
  this.** Slot count at level 1 with no metamagic/domain feats: base class table
  (`cls_spgn_<class>.2da`) gives orisons + 1 known-level slots; a positive ability
  modifier for the casting stat adds a same-count bonus spell per spell level the class
  can currently cast (e.g. Wis 16 → +1 first-level slot for a level-1 Cleric). Applied
  once, to one hand-verified test creature (a Human Cleric in Henchman Gear Showcase) —
  not yet wired into `create_creature_blueprint` or the `adventure-actors` skill as a
  general capability. **Superseded by the shipped runtime system below** for the
  "give a caster NPC spells" problem in general — this GFF-struct finding stays useful
  background (it's *how* `MemorizedList` is shaped, which the runtime system below
  never needs to know since it writes through the engine's own setter instead), but
  static per-blueprint baking is no longer the recommended path.
- **BUILT (2026-09-10) — real per-playthrough random caster spellbooks, computed
  entirely in NWScript at `OnSpawn`, no MCP/build-time baking.** User-specified design:
  a caster NPC's spells should be different every time the module loads, calculated by
  NWScript alone, applied by default to every caster NPC this project generates unless
  a story/plot reason calls for a fixed loadout. The previous assumption in this doc
  (echoed above) was that no vanilla-NWScript path exists to mutate a creature's real
  spellbook at runtime — **that assumption was wrong**, found by re-reading the real
  `nwscript.nss` (EE) rather than trusting the earlier note: the engine has native
  `SetMemorizedSpell(object oCreature, int nClassType, int nSpellLevel, int nIndex, int
  nSpellId, int bReady=TRUE, ...)` plus `GetMemorizedSpellCountByLevel`/
  `ClearMemorizedSpell`, gated only to classes where `classes.2da`'s `MemorizesSpells`
  column is `1`. Verified against the real `classes.2da`
  (`/var/www/storage/2DAs/8193.35_2dasource_full/classes.2da`): `MemorizesSpells=1` for
  **Cleric, Druid, Paladin, Ranger, Wizard**; `=0` for **Bard, Sorcerer** (spontaneous
  casters use `SpellbookRestricted=1` instead) — and there is **no runtime setter for
  "known spells"** (`GetKnownSpellCount`/`GetKnownSpellId`/`GetIsInKnownSpellList` exist,
  no `Set`/`Add` equivalent), so true native spellbook randomization only reaches 5 of
  the 7 caster classes.
  - **Tier 1 (Cleric/Druid/Paladin/Ranger/Wizard):** `RA_OnSpawn` builds an eligible
    spell pool per spell level via the real engine function `GetSpellLevelByClass(
    nClassType, nSpellId)` (never hand-parses `spells.2da`'s per-class column text),
    bounded by the real `Get2DARowCount("spells")`, shuffles it with the native
    `JsonArrayTransform(jArr, JSON_ARRAY_SHUFFLE)`, and writes the result via the real
    `SetMemorizedSpell()`. Slot counts per spell level come from `cls_spgn_<class>.2da`
    — confirmed the table's `Level` column is that class's own level directly (row
    index = level − 1) even for a late-casting class: `cls_spgn_pal.2da` rows for
    Paladin levels 1-3 are all `****`, and level 4 (row 3) is the first row with a real
    `SpellLevel1` value, matching Paladin's `MinCastingLevel=4`. Nothing else needs to
    change — the creature's existing, untouched default/henchman combat AI already
    casts from a real memorized spellbook automatically.
  - **Tier 2 (Bard, Sorcerer):** same pool/count logic, but since there's no runtime
    known-spell setter, the chosen spell ids are stored as one `SetLocalJson(oCreature,
    "RA_L<level>", jArr)` per populated spell level instead. `RA_OnEndRound` (wired onto
    `ScriptEndRound`) has a tunable per-round chance to cast one via
    `ActionCastSpellAtObject`'s real, documented `bCheat=TRUE` param, which lets a
    creature cast a spell it doesn't officially know — targets the creature's real
    `GetAttackTarget()`. Known simplification: doesn't distinguish an offensive spell
    from a self/ally-targeted one; low risk since Tier 2 is only two classes whose
    low-level lists skew offensive. **Confirmed fully working end-to-end against a
    real headless server** — no known limitations.
  - **Implementation:** `src/util/random-abilities-script.ts`
    (`generateRandomAbilitiesInclude`) + `src/tools/random-abilities-tools.ts`
    (`create_random_abilities_system` MCP tool), following the exact generator/probe-
    compile pattern `create_reward_system`/`create_spec_verification` already
    established (`writeAndCompileScript` + a throwaway probe script, since an include
    has no `main()`). 24 unit tests in `random-abilities-script.test.ts` (no
    integration test, matching `create_reward_system`/`create_spec_verification`'s own
    precedent — their compile-probe needs a real nim toolchain/resman this suite
    doesn't mock, so generator unit tests are the established coverage bar for this
    tool class).
  - **Wiring is skill-level, not a `create_creature_blueprint` default** — this matches
    the *existing* convention `inc_spec_check`'s `a_hen_spawn` already uses (see
    `adventure-actors/SKILL.md`), not a new mechanism: a small per-role wrapper script
    (`ExecuteScript()` on the creature's original `ScriptSpawn`/`ScriptEndRound`, then
    `RA_OnSpawn`/`RA_OnEndRound`) is written via `write_script` and pointed at by
    `create_creature_blueprint`'s existing `scripts` param override — never touching
    the tool's own default-resolution logic. This is intentionally the safer,
    lower-risk integration point: a direct/human tool caller editing a module by hand
    sees no surprise behavior change, and the "opt-out for a story-specific fixed
    ability" escape hatch is simply *not writing the wrapper* for that one NPC (keep
    using the existing `spells`/`SpecAbilityList` param instead).
  - **Portable by construction**: depends on nothing but base-game 2DAs
    (`classes.2da`, `cls_spgn_*.2da`, `spells.2da`) and base-game engine functions — no
    project-specific table, no MCP dependency, no NWNX. The generated file(s) can be
    copied into any other vanilla module's script resources verbatim, matching the
    portability bar `inc_reward.nss`/`inc_spec_check.nss` already meet.
  - **Wired into the pipeline**: `adventure-actors/SKILL.md` calls
    `create_random_abilities_system` once per module (Phase 3b Step 2, alongside
    `create_spec_verification`), and both the companion recipe (`a_hen_spawn`/
    `a_hen_endround`, chaining the henchman AI) and the Key NPC recipe (`a_ra_spawn`/
    `a_ra_endround`, chaining the plain default AI) wire it in — see the "Tier 1
    real-runtime findings" item immediately below for why this wiring is now known to
    be incomplete for Tier 1 specifically. The `spells`/`SpecAbilityList` param
    remains the documented opt-out for one specific NPC.
  - **CONFIRMED VIA REAL HEADLESS SERVER TESTING (2026-09-10) — Tier 1 has two real,
    unresolved limitations; Tier 2 has none.** A dedicated verification pass (own
    docker `nwnxee/unified` instance, `~/nwn-mcp-verify-server`, module copied in and
    restarted per iteration — see `docs/random-abilities-runtime-findings.md` for the
    full blow-by-blow) found:
    1. **The original per-level-rescan design really did exceed the script
       instruction budget**, exactly as flagged as a risk before shipping: a level 5
       Wizard's first (cheapest) scan succeeded (orisons written) while every later
       spell level silently got nothing, no error logged. Fixed by restructuring to a
       single pass over `spells.2da`, bucketing into ten independent flat JSON arrays
       selected by if/else-if (not nested-array indexing, and not a `switch` — see
       `random-abilities-script.ts`'s header comment for why both alternatives were
       tried and rejected). This fix is confirmed correct and shipped.
    2. **A from-scratch, never-live-leveled blueprint only ever gets level 0
       (cantrip) slots for Tier 1, no matter how good the pool logic is.**
       `GetMemorizedSpellCountByLevel()` — the real bound `SetMemorizedSpell()`
       silently respects — reports 0 for every spell level past 0 on such a
       blueprint, regardless of what `cls_spgn_<class>.2da` states. Since a companion
       doesn't get `LevelUpHenchman()`'d until recruit (`a_hen_join`), which fires
       well after `ScriptSpawn`, wiring `RA_OnSpawn` at `a_hen_spawn` (raw spawn) is
       the wrong timing for Tier 1 — it can only ever roll cantrips. **Not yet fixed**:
       `RA_OnSpawn` should be called after `LevelUpHenchman()` for companions
       (chained into `a_hen_join`), not at `a_hen_spawn`.
    3. **Even after a real `LevelUpHenchman()` pass, a level 5 Wizard's level 2-3
       slots still report 0 from the engine**, while level 0 and level 1 correctly
       became real, populated, readable-back slots. Root cause not isolated — the
       leading candidate is Wizards' `SpellbookRestricted` scribing mechanic (a
       Wizard must "know" a spell before memorizing it, unlike the other four Tier 1
       classes) combined with `LevelUpHenchman()`'s automatic AI possibly not
       populating known spells the way the toolset's own level-up UI would. This
       needs real further investigation (see the doc above for the concrete next
       experiments) before Tier 1 can be trusted above cantrip+1st-level.
    4. **Fix already shipped regardless of the open root cause**: `RA_RollClass` now
       caps every write to `min(cls_spgn slot count, GetMemorizedSpellCountByLevel())`
       rather than trusting the 2DA blindly, so it degrades gracefully (writes only
       what the engine will actually accept, silently skipping the rest) instead of
       wastefully attempting writes that do nothing.
  - **Known follow-up gap**: `verify_creature`'s `caster_no_spells` check only reads
    static build-time state (`MemorizedList`/`SpecAbilityList`) — it has no way to see
    what `RA_OnSpawn` rolls at runtime, so it now false-positives on every caster
    wired to this system (documented as expected in `adventure-actors/SKILL.md`, but
    not actually fixed at the check itself). A real fix would need the check to
    recognize the `RA_OnSpawn`/`RA_OnEndRound` wiring on `ScriptSpawn` and skip itself
    for that creature, rather than relying on the skill doc alone to explain away the
    false positive.
  - **Process pitfall worth remembering for any future work touching this include**:
    NWScript's `#include` resolves at compile time, baked into the including script's
    `.ncs` bytecode, exactly like a C header. Regenerating `inc_random_abil.nss`'s
    *source* via `create_random_abilities_system` (which deliberately never compiles
    it, since an include has no `main()`) has zero runtime effect until every script
    that `#include`s it is *recompiled*. Several rounds of this session's live
    debugging were silently testing stale bytecode from an old compile of the wrapper
    script, because only the include's source was being regenerated between test
    iterations — always recompile every wrapper script after changing an include it
    depends on, not just the include itself.
- **FIXED — the feat/spell/equipment bug class (no feats, no spells, wrong equip slot,
  wrong-weight armor, no melee backup, inconsistent cross-area appearance) is now
  caught automatically, and the actual root cause was a documentation gap, not a code
  gap.** A real bug report against a freshly-built module found six non-companion Key
  NPCs (a wizard, an adept, two named humans, a sorcerer, a cleric) all shipped with a
  totally empty `FeatList` and no spells. Root cause, confirmed by reading
  `adventure-actors/SKILL.md` directly: the 4-source static `FeatList` bake (racial +
  automatic class feats + generic schedule + bonus slots, documented above) was written
  entirely inside Phase 3b ("Create Companions"), which opens with "Skip this phase
  entirely if the plot has no companion characters" — a non-companion combat-capable Key
  NPC reasonably read that line and skipped the whole phase, including the feat-bake
  recipe that was never actually companion-specific. **Fix:** Phase 3's Key NPC section
  now cross-references Phase 3b's Ability-scores/FeatList/Skill-points/Equipment
  subsections explicitly for any combat-capable Key NPC, and Phase 3b's own opening note
  now clarifies which parts are henchman-only (dialog/scripts/`HENCH_LEVEL`) vs. reusable
  by any combat-capable creature. Also closed: a non-companion Key NPC never gets a live
  `LevelUpHenchman()` call at all (there's no recruit event), so a caster Key NPC needs
  its `spells` (`SpecAbilityList`) param populated at build time — this is now documented
  explicitly, since it's a real, separate gap from the companion spell path
  (`bReadyAllSpells` at recruit).
  **Four new `verify_creature` checks close the detection gap** (`src/util/verify/blueprints.ts`):
  `empty_featlist` (class levels with zero FeatList), `caster_no_spells` (a spellcasting
  class at/past `classes.2da`'s `MinCastingLevel` with nothing in either `MemorizedList`
  or `SpecAbilityList`), `weapon_proficiency_mismatch` (RightHand/LeftHand item whose
  `baseitems.2da` `ReqFeat0-4` — verified live to be an OR-set of satisfying feats, e.g.
  a Shortbow's `ReqFeat0-2` are Martial Weapon Proficiency/Rogue's bonus proficiency/
  Elf's bonus proficiency, any one sufficing — has no match in `FeatList`), and
  `ranged_weapon_no_melee_backup` (a ranged weapon equipped with no melee-capable weapon
  anywhere in equipment or inventory — NWN's base AI, `ActionEquipMostDamagingMelee` off
  `nw_c2_default9`, auto-switches on ammo depletion but only if one exists to find).
  **FIXED (originally shipped as a weaker `armor_no_proficiency` warning, since
  upgraded to a precise `armor_proficiency_mismatch` error) — the armor weight-class
  precision gap is closed.** The dead end wasn't wrong about where to look
  (`baseitems.2da` really does have a single generic body-armor row (16) shared by
  every weight class, with no `ReqFeat` data or weight-class column of its own), it was
  looking in the wrong place entirely: weight class isn't stored on the base item, it's
  derived from the *equipped item's own AC Bonus item property*
  (`ITEM_PROPERTY_AC_BONUS = 1` in `nwscript.nss`; a `PropertiesList` entry with
  `PropertyName=1`, `CostValue` = the AC bonus amount 0-8 — confirmed directly against a
  real armor item, `crn_stdlthrarmr2.uti`, which carries exactly this). Cross-referenced
  against two more real sources: `armor.2da`'s 9-row `ACBONUS`/`DEXBONUS`/`ACCHECK`/
  `ARCANEFAILURE%`/`WEIGHT` table (row index = AC bonus value, 0-8), and a real, verified
  community equipment-randomizer script (`inc_rand_equip.nss`'s `GetACOfArmorToEquip`,
  found in the `~/tfndev` corpus), whose proficiency-capping logic gives the exact tier
  boundaries: AC bonus 0 needs no proficiency; 1-3 is Light armor (feat 3, ArmProfLgt);
  4-5 is Medium (feat 4, ArmProfMed); 6-8 is Heavy (feat 2, ArmProfHvy) — matching this
  project's already-verified `feat.2da` row numbers exactly. `armorTierFeat()`
  (`src/util/verify/blueprints.ts`) implements the mapping; `armor_proficiency_mismatch`
  reads the Chest-slot item's AC Bonus property, derives its tier, and checks for the
  one matching feat — this is the literal Corin Vale bug (a Rogue with only Light Armor
  Proficiency from its automatic class feats, equipped with Medium armor). An item with
  no AC Bonus property at all degrades to skip (AC bonus treated as 0), not a guess. The
  previous archaeology attempt correctly ruled out `iprp_costtable.2da`/
  `baseitems.2da` as dead ends — the fix came from a different table (`armor.2da`) plus
  a real script, not from either of those.
  **Also fixed at the write path, not just verification**: `set_creature_equipment`
  (`src/tools/creature-tools.ts`) now checks the item's `baseitems.2da` `EquipableSlots`
  hex bitmask against the target slot before writing — confirmed via a live table that
  this bitmask uses the exact same bit values as this project's own `EQUIP_SLOT_MAP`
  (e.g. Cloak = 0x40/64, matching `EQUIP_SLOT_MAP.cloak`) — so a cloak written into the
  chest slot (the literal reported bug) is now a rejected call naming the item's real
  valid slot(s), not a silent success. **Cross-area appearance consistency** is a new
  `validate_module` check (`cross_area_appearance_mismatch`, `src/tools/analysis-tools.ts`):
  groups placed creatures by `Tag` across all areas and warns when the same tag's
  `Race`/`Appearance_Type`/primary class disagree between placements — closes the
  "same named NPC renders differently in two areas" bug class. All five checks and the
  slot-write validation have unit/integration test coverage; `npm run verify` passes.

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

**TODO (user-raised, 2026-09-09): weapon *type* selection should also be fairly
random, not just model-variant appearance.** `CLASS_WEAPON_PREFERENCE`
(`src/util/npc-weapon-preferences.ts`) maps each class to a single preferred weapon
(e.g. every generic Fighter → Longsword), and `equip_npc_by_role` recommends that one
weapon whenever no `righthand` item is supplied — correct for feat-baking (a class
needs *a* consistent weapon to bake Focus/Specialization feats toward) but it means
every same-class NPC across a generated module converges on the same weapon, both
visually and mechanically. A real fix would widen `CLASS_WEAPON_PREFERENCE` to a
short list of plausible weapons per class (already-proficient types, so no
proficiency mismatch) and pick among them — deterministically-seeded, matching this
project's no-dice-rolling convention, e.g. keyed off the creature's tag/resref rather
than `Math.random()` — instead of always returning the one curated default. Not yet
scoped or built; `respec_weapon_feats` already exists as the tool to re-target a
creature at a different weapon after the fact, so this TODO is about the *initial*
pick being varied, not about the retargeting mechanism itself.

**BUILT (2026-09-09) — option (a) below, `equip_npc_by_role`, plus `build_npc_stat_block`
and `respec_weapon_feats`.** All three live in `src/tools/npc-tools.ts`, backed by
`src/util/npc-stat-block.ts` (pure, unit-tested stat-block computation) and
`src/util/npc-weapon-preferences.ts` (the curated per-class weapon-preference table
the "Elaboration" bullets below asked for — real, verified baseitem + feat.2da IDs,
not guessed). Scope notes, so a future session doesn't re-litigate these:
- `build_npc_stat_block` writes the mechanical stat block (ability scores, FeatList,
  SkillList, HP, StartingPackage) onto an *existing* blueprint — it does not create
  one (`create_creature_blueprint` still does identity/race/appearance/name) and does
  not compute spells itself. Spells are no longer this tool's gap to close, though —
  see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" under
  Henchmen/Companions below: option (b)'s runtime-include idea shipped, just as its
  own separate system (`create_random_abilities_system`) rather than as part of this
  tool, since it needs to run fresh at `OnSpawn` every playthrough rather than be
  baked once at build time. Primarily targets Henchmen for now; general-NPC use is a
  documented future extension, not blocked by anything in the implementation.
- `equip_npc_by_role` deliberately does **not** do fuzzy blueprint search itself —
  there's no reusable exported search function to call into (`list_blueprints`/
  `resman_search` are inline MCP tool handlers), and inventing a resref would violate
  this project's "never guess" convention. The caller still sources items via
  `list_blueprints`/`resman_search` as documented; the tool's automation is
  proficiency validation (slot bitmask + `FeatList` check, reusing the exact
  `armorTierFeat`/`ReqFeat` logic `verify_creature` uses), a `get_wealth_budget`
  reference figure, a weapon-type recommendation from the preference table when no
  `righthand` item was supplied, and — closing the "Verify-after-generate" bullet
  below — a `verify_creature` pass as its own last step. The **archetype multiplier**
  bullet below (wealthy-noble vs. bandit budget scaling + magic-item preference) is
  **not built** — `equip_npc_by_role` only takes `role` (pc/elite/standard/mook), not
  `archetype`.
- `respec_weapon_feats` auto-detects a creature's current weapon-specific feats by
  reverse-scanning every `baseitems.2da` row's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat`/Epic* columns against its
  `FeatList`, then moves matched tiers onto the target weapon. **Found and fixed a
  real bug while writing its own tests**: a single-pass scan that mutates the
  in-progress feat set while iterating *every* baseitems row let the target weapon's
  own just-added feat get picked up as a spurious "source" match on a later
  iteration (harmless net effect, since it re-added the same feat, but it polluted
  the `removed`/`added` report with duplicate entries) — fixed by detecting matches
  against a frozen snapshot of the *original* `FeatList` in one pass, then applying
  removals/additions in a second pass, and by excluding the target weapon's own row
  from source detection. Verified via a dedicated test that reproduces the original
  bug's exact symptom (spurious entries for the target weapon's own feat IDs).

Today's process (before this) was: for each NPC, search `list_blueprints` +
`resman_search`, read costs via `resolve_blueprint`, check budget against
`get_wealth_budget`, and equip via `set_creature_equipment` — repeated by hand per
creature. This is exactly the kind of deterministic, rule-following work a script
could do instead of an LLM call per NPC. Two shapes worth considering, not yet
designed: (a) a **build-time MCP tool** (`equip_npc_by_role`-style, TypeScript) that
takes `{class, level, role, archetype}` and internally does the search/budget/equip
sequence deterministically — closer to how `create_reward_system` generates
`inc_reward.nss` once and every caller just invokes it; (b) a **runtime NWScript
include**, in the same family as `inc_reward.nss`/`inc_spec_check.nss`, that picks
gear from a curated resref table keyed by class/level at `OnSpawn` — pushes the
decision into the game engine entirely, at the cost of needing that table
hand-curated and kept in sync with the resman stack. Given the armor-appearance gap
(no safe from-scratch default), a curated table of *known-good real resrefs* per
archetype is probably required either way, not purely computed from `baseitems.2da`.

**Elaboration (user-specified, 2026-09-09)** on what the build-time tool's internal
logic should actually cover — this is the fuller spec for option (a) above, not a
separate idea:
- **Feat-driven weapon preference.** Read the creature's `FeatList` first; if it
  already carries a weapon-specific feat (Weapon Focus/Specialization/Improved
  Critical — reverse-lookup via `baseitems.2da`'s `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` columns, the same columns
  the existing "weapon-specific feat means the matching weapon, exactly" rule
  elsewhere in this doc already uses manually), bias the gear search toward that
  exact weapon type instead of picking one arbitrarily. The reverse direction
  (pick a weapon first, then bake the matching proficiency/focus feat chain) is
  already documented under Henchmen/Companions' static feat-baking — this tool
  should be able to run either direction depending on whether feats or gear come
  first for a given NPC.
- **BUILT** — see `npc-weapon-preferences.ts` above. **A curated per-class/archetype weapon-preference table (user-raised: "add
  packages.2da files for various class and level progressions — General Fighter
  focuses on the longsword, while others specialize in other feats and
  weapons").** `packages.2da` already exists and already gives each base class
  an iconic package (see the verified row-equals-classId rule under Henchmen/
  Companions), but it doesn't say *which weapon* that package's feat slots
  should point at — that's a real design choice per archetype, not something
  derivable from the 2DA alone. Needs a curated reference table (not a modified
  copy of the real `packages.2da` — a new project-owned lookup) mapping
  class/archetype → preferred weapon baseitem, so `create_creature_blueprint`'s
  static feat-baking and the feat-driven weapon preference above have a real
  default to fall back on instead of picking arbitrarily when a creature has no
  feats yet to reverse-lookup from. E.g. a generic Fighter defaults toward
  Longsword; a generic Rogue toward Rapier/Shortsword (finesse); a generic
  Ranger toward Longbow — one entry per class to start, expandable to
  sub-archetypes (dual-wielder, archer, tank) later. This is what makes the
  "pick a weapon first, then bake matching feats" direction above actually
  usable without per-NPC guessing.
- **BUILT** — see `respec_weapon_feats` above. **A `respec_weapon_feats`-style tool to swap an already-built creature's
  weapon-specific feats onto a different weapon (user-raised).** Today,
  changing a creature's specialized weapon after the fact means manually
  finding and removing the old weapon's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` (and epic variants)
  from `FeatList` and adding the new weapon's equivalents — easy to get wrong
  by hand, and exactly the kind of mechanical, rule-following swap a script
  should do instead of an LLM editing a feat list field by field. E.g. a
  generic Fighter built with Longsword-focused feats (the class's default per
  the packages-preference table above) should be re-targetable to any other
  weapon — Battleaxe, Rapier, whatever the user wants for that specific NPC —
  via one call: given a creature + a target weapon baseitem, look up which
  weapon-specific feats it currently holds (reverse-lookup via the same
  `baseitems.2da` feat columns used elsewhere), remove them, and add the
  equivalent feats for the new weapon at the same tiers (Focus only, or
  Focus+Specialization+Improved Critical, matching whatever tier the creature
  actually qualifies for/already had). Pairs directly with the feat-driven
  weapon preference and packages-preference-table ideas above — this is the
  "change your mind after the fact" tool to their "get it right the first
  time" tools.
- **Wealth-budget check with an archetype multiplier.** `get_wealth_budget(level,
  role)` already exists and is already used manually for this — the new piece is
  an `archetype` parameter that scales the budget and shifts the item search
  itself (not just a post-hoc affordability check): a "Prince"/wealthy-noble
  archetype should multiply the budget up and *prefer* magic/enchanted variants
  over mundane ones when both exist, while a "bandit"/impoverished archetype
  should do the opposite. This is the concrete meaning `{class, level, role,
  archetype}`'s `archetype` field (already in the signature sketch above) was
  left vague on.
- **BUILT** — see `equip_npc_by_role` above. **Verify-after-generate, closing the loop.** Once equipped, run `verify_creature`
  (now that the `EquippedRes`/`TemplateResRef` bug is fixed — see the Known
  Pitfalls entry — its ranged/ammo and stack-size checks actually fire) as the
  tool's own last step, so "generate gear for this NPC" and "confirm the gear is
  legitimate for their level and class" are one pipeline instead of two separate
  manual steps an LLM has to remember to chain itself.

**BUILT (2026-09-09) — `build_npc_stat_block`, per the TODO immediately below.**
`src/util/npc-stat-block.ts` computes ability scores (Elite Array or a real D&D 3.5
point-buy allocator), the full 4-source `FeatList` bake, `SkillList` (round-robin
spend across real class skills, capped at level+3), and HP — all read live from
`classes.2da`/`racialtypes.2da`/`cls_feat_*`/`cls_bfeat_*`/`cls_skill_*` rather than
re-derived by hand per NPC, closing exactly the bug class described below (verified
by a dedicated unit test suite built against real-data-shaped 2DA fixtures, not just
plausible-looking numbers). **This tool still does not compute spell `MemorizedList`s
itself** — a companion still gets spells from the live `LevelUpHenchman()` call at
recruit, matching the existing, unchanged convention, and a non-companion caster Key
NPC still uses `create_creature_blueprint`'s `spells` param for a fixed loadout when
one is wanted. But "real spellbook baking" as a general problem is no longer deferred
— see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" above: it
shipped as its own runtime NWScript system (`create_random_abilities_system`) rather
than as static baking inside this tool, since the whole point is rolling fresh every
time the module loads rather than being fixed once at build time.

**TODO — reduce how much of NPC generation the LLM does by hand vs. deterministic
code, broadly, not just for gear.** This session's actual work — computing ability
scores, HP, skill-point totals, feat lists, and spell slots from `classes.2da`/
`cls_*.2da` formulas — is mechanical, rule-following arithmetic, not creative
judgment, and every real mistake made this session (a stale skill-point total after
an Int change, an HP formula that needed a second pass, two "no real item" false
negatives) was an arithmetic/lookup slip in exactly that kind of work, not a bad
creative call. A `build_npc_stat_block`-style deterministic tool (given
race/class/level/role, return a fully-populated ability array, `FeatList`,
`SkillList`, spell `MemorizedList`s, and HP — same computation this session did by
hand, moved into tested TypeScript) would remove this whole bug class the same way
`create_reward_system`/`create_spec_verification` already turned other
error-prone patterns into generated, reusable code. The LLM's time is better spent on
what it's actually suited for in this pipeline — plot, dialog, quest design, and
encounter/narrative judgment calls — not re-deriving D&D 3.5 tables from 2DA files
per NPC. **BUILT except spell `MemorizedList`s — see the note immediately above.**

**Alternative approach worth evaluating alongside the above (user-raised): build
one level-20 "master" creature per race/class and level it *down* by truncation,
instead of computing each target level's stats from formulas every time.** Today's
(and the `build_npc_stat_block` TODO's) model computes forward: given a target
level, derive ability scores/feats/skills/spells from `classes.2da`/`cls_*.2da`
formulas. The user's proposal inverts this: build a single level-20 reference
creature per race/class once (maximal `FeatList`/`SkillList`/spell
`MemorizedList`s, fully baked), dump it to JSON, and produce any lower level by
mechanically truncating that JSON — drop `ClassList` levels above the target,
drop `FeatList` entries whose granting level (cross-referenced the same way the
static feat-baking recipe already does) exceeds the target, cap `SkillList`
ranks and spell slots to what the target level would have earned. Worth real
comparison against the forward-computation approach: truncation only needs to
get the level-20 reference right *once* per race/class (a fixed, auditable
artifact, not a formula that has to stay correct for every level 1-20), and the
"raw file in JSON, altered by a script tool" step the user describes is exactly
this project's already-established safe-edit pattern (JSON round-trip via
`nwn_gff`) applied to a new purpose. The open question is whether truncation is
actually simpler than forward computation once feat/skill/spell prerequisites
that only make sense at the *achieved* level are accounted for (e.g. a spell
memorized at level 20 that depends on a metamagic feat also granted along the
way) — needs a real prototype on one race/class pair before deciding this
replaces, rather than complements, `build_npc_stat_block`.

**Canonical creation order + stat-generation arrays for `build_npc_stat_block`
(user-specified, design-only — not implemented yet).** When this tool gets built, the
user's specified pipeline order is: **Race → bake racial feats
(`race_feat_<race>.2da`, unconditional) → generate ability scores (array below, by
target power level) → assign Class → bake class feats (`cls_feat_<class>.2da` +
generic schedule + `cls_bfeat_<class>.2da` bonus slots, all already-verified sources —
see the Henchmen/Companions section above) → determine equipment, filtered by the
proficiency feats just baked** (`verify_creature`'s `weapon_proficiency_mismatch`/
`armor_proficiency_mismatch` checks exist specifically so a tool built to this order can
never reproduce a "Rogue equipped with medium armor"-class bug — equipment selection
comes last, informed by feats, never the other way around).

Stat arrays (D&D 3.5, deterministic — no dice rolling, since generated content in this
project must stay reproducible):
- **Elite Array** `15,14,13,12,10,8` — default for ordinary NPCs with class levels
  (~25-point buy equivalent).
- **Point-buy bands**, for explicitly scaling a unique/named NPC's power level instead
  of always using the Elite Array: Low 15, Standard 25, Challenging 22-28, Tougher 32,
  Epic 36+.
- Classic 4d6-drop-lowest rolling is noted but not recommended for this tool — it's
  non-deterministic.

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
