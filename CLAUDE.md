# NWN MCP Server

MCP (Model Context Protocol) server for Neverwinter Nights Enhanced Edition module files (.mod). Wraps neverwinter.nim CLI tools to expose module content as structured, queryable data for LLMs.

## Working Style

- **The TODO list tracks every branch and commit not yet merged into `master`** (user rule, 2026-11-07). Keep
  Project Health TODO #15 current: after every commit, merge, new branch or branch deletion, re-run
  `git fetch --prune` and `git rev-list --count origin/master..<branch>` for each branch and update the entry.
  A branch leaves the list only once it is merged (count 0) or deliberately deleted.
- **Per-module files go in `adventures/<Title-With-Dashes>/`** (git-ignored; user rule 2026-11-09). Every LLM-built module keeps its story (`adventure.md`), DM guide (`dm-guide.md`), `adventure-status.json`, `project-scope.json` and any other file specific to it there, e.g. `adventures/The-Salt-Gate-Conspiracy/`. `get_adventure_dir` gives the path; skills never write these into the temp dir.
- **Every module has a DM area and two books** (user rule 2026-11-09). A disconnected DM area the DM can teleport to (a `DM_AREA` waypoint; no transition leads in or out), holding a chest placeable with two book items (`baseItem` 74): the full story that the module is based on (`adventure.md`) and the DM guide (`dm-guide.md`). Built by `/adventure-rewards` Phase 7d; `audit_module` has a "DM area and books" row. The area is a fixed template, never rebuilt per module: `src/templates/dm_area.{are,git,gic}` (2x2 `tcn01`, no wind, music or ambient sound, always daytime, a `DM_AREA` waypoint and a chest `dm_chest` named "DM Chest"); a module copies it in and only the books in the chest change. `create_dm_area` does the copy and fills the chest.
- **Dialog structure: branches return to the main dialog** (user rule 2026-11-09). A branch must not end the conversation. After an NPC answer the conversation goes back to the main dialog state (the NPC's menu of PC options) and continues until the player picks the explicit exit option ("Goodbye" / "That's all for now"). Only the exit reply ends the conversation. Seen in The Salt Gate Conspiracy: Stonewake's two information questions both ended the talk, so the quest-accept option was never reached. Applied to `create_dialog`, the companion dialog, `verify_dialog` and the dialog skills; still open for `build_quest` merged lines, `add_dialog_node` and the existing Salt Gate dialogs: TODO #28 and work-plan packages D1-D3, M2.
- **Adventure files carry the title** (user rule 2026-11-11): the story is `adventures/<Title-With-Dashes>/<Title-With-Dashes>.md` (not `adventure.md`), the DM guide `<Title>-dm-guide.md`, status `<Title>-status.json`, scope `<Title>-scope.json`, so several adventures can share one folder. `get_adventure_dir` returns the real paths (`files`); `ensureAdventureDir` renames an older untitled file on first use. Skills and docs that say "adventure.md" mean the story file.
- **Each module is a project the user can open, built only on request** (user rule 2026-11-09). A module made with this MCP has its own folder and files (`adventures/<Title-With-Dashes>/`) that the user can reference as an existing module project, and its content is stored there as nasher source: every GFF resource converted to JSON (the `nwn_gff` JSON form, committed-style, one file per resource) with scripts as `.nss`, in nasher's `src/` layout, plus the story and DM-guide files. The `.mod` is a build product, made only once all changes are in **and the user asks for it**. When the work looks complete, offer to build and send it; the user may decline and ask for more changes or more content, and then nothing is built. No repack-and-send after each step. Implemented in steps B1-B5 (export_project, load_module on a project, automatic sync, rules); B6 migrates Salt Gate.
- **Do NOT auto-export HTML reports** after creating or painting areas. Only export reports when the user explicitly asks for one.
- **Do not repack or send after each step** (user rule 2026-11-09, B5 2026-11-10). Edits are saved to the module project (`adventures/<Title>/`, `docs/module-projects.md`) as they happen. Build the `.mod` (`repack_module`) only when the user asks; when the work looks complete, offer to build it and send it only after the user accepts. `run_live_verification` builds its own throwaway `.mod`.
- **MCP server restart required after code changes.** After editing TypeScript source and running `npm run build`, the MCP server must be restarted for new/changed tools to become available. Ask the user to restart before attempting to use newly added tools.
- **Work plan:** `docs/work-plan.md` lists every issue from the 2026-11-09 evaluation as small packages with a Status table. A new session reads its "How to resume" section first, does the next package, and ends with its checkpoint.
- **Reference docs:** `docs/README.md` maps each question to a document; `docs/adventure-tooling-reference.md` explains `phase_check`, `suggest_area_size`, `place_tile_doors`, `build_companion`, `q_check`/`add_skill_check`, quest `spawn` and `skill-lint`, and the recipe for reworking an existing module. Keep it current when those tools change.
- **Keep skills in sync with tools.** When adding, renaming, or changing tool parameters/behavior, immediately update the `.claude/skills/` SKILL.md files that reference those tools. The LLM follows skill instructions, not tool schemas — if a skill doesn't mention a parameter, the LLM won't use it.

## Open TODOs (full history of every numbered item: `docs/todo-archive.md`)

S1-S9 (skill-prompt reduction) and #1, #4, #6-#11, #13, #14, #17, #18, #24, #27 are done; see the archive. Order of work and the packages that close each item: `docs/work-plan.md`. Format: priority (1 = next) · acceptance test · live-checked.

- **#15 (standing, user rule 2026-11-07) — branches and commits not in `master`.** Update after every commit, merge, new branch or deletion (`git fetch --prune`, `git rev-list --count origin/master..<branch>`). State 2026-11-11: branch `systest-live-run-and-generalized-spec` is **12 commits ahead of `origin/master`, not pushed** (in-play companion re-level `CL_ReLevel`/`a_hen_lvlup`, spell keeping, forge keeps `MCP_ORIG_SPAWN`, `[CL]` hp, never-unarmed weapon fallback). Earlier state 2026-11-10: **merged and pushed** — the working branch `systest-live-run-and-generalized-spec` was fast-forwarded into `master` (`d1e5218`, 41 commits: work-plan phases A-G and the Salt Gate track) and both were pushed. Both are 0 ahead of `origin/master`. Only `graphify-out/` is untracked (never commit). History of earlier merges: archive.
- **#2 rotation/orientation maths — P3.** Acceptance: property-based round-trip tests for `tile-solver`/`zone-solver`/`feature-collars` rotation. Live-checked: oracle covers the convention only.
- **#3 area skills thinner than adventure skills — P4.** Acceptance: each `area-*` skill states sizing, density and one worked tool sequence; skill-lint passes.
- **#5 inline-only capability gaps — P4.** Acceptance: each gap named in the tool description or skill of the tool it limits.
- **#12 tileset rules beyond flat tiles — P4.** Acceptance: `paint_tiles`/`paint_group`/solver place height-transition tiles; oracle still passes.
- **#16 port the quest fixes to the TFN content studio — P4** (`~/git/Q-tfn-content-studio`, studio rules apply). Plan: `docs/tfn-quest-findings.md`. Acceptance: studio tests green with the listed fixes and generator additions.
- **#19 generic check: live test — P2.** Quest and companion scripts are now simulation-checked (`docs/player-simulation.md`); still open: one simulation step per `q_check`/`q_roll` with a stand-in that has the skill.
- **#20 guided workflow: live run on a hand-built module — P2** (M1-M2). Acceptance: `adopt_module` + `audit_module` run on Salt Gate with the MCP restarted.
- **#21 adventure composition, open parts — P5.** (Outcome-dependent spawns and `verify_encounter_chain` done 2026-11-10.) Rival-party shape, tone/theme check, recurring-NPC checks, import format for the user's own material (`docs/adventure-composition.md`).
- **#22 stale generated scripts, remaining generators — P3** (E4). Acceptance: `generated_script_stale` covers the quest runtime, `inc_random_abil`, `inc_spec_ability`, `inc_reward`, `inc_spec_check`, `inc_spec_assert`.
- **#23 state the goal of every test run — mostly done** (C3): `run_live_verification` takes `goal`, warns when absent, gives a `verdict` with `simulate`. Open: other test runs (systest skill, tests) still do not carry a goal.
- **#25 cutscenes advancing per dialog choice — P6.** Design first; acceptance: design doc, then a spec shape and one verified example.
- **#26 horse scripts — P6.** Design first (`ActionMountObject`, mount feats, indoor restrictions), generator in the style of `create_companion_system`, `verify_*`, skill.
- **#28 dialogs return to the main dialog — mostly done** (D1-D3 built 2026-11-10). Open: apply `add_dialog_return_links` to the Salt Gate dialogs (M2) and a live conversation check. Acceptance: `verify_dialog` has no `dialog_branch_ends` on any generated dialog.
- **#29 modules as nasher/JSON projects, built on request — P1** (B1-B6; needs decisions D1-D3). Acceptance: export, load from project and round trip byte-identical; repack rules changed everywhere.
- **#30 area prefabs** (`docs/area-prefabs-spec.md`; text in `docs/area-todos-and-tooling-history.md`) — P6. **#31 reserve flat space for multi-tile features** — P6. **#32 rebuild one area in place** — P5. **#33 per-tileset survey pass** (`docs/survey-areas-notes.md`) — P6. All four: design first.
- **#34 randomise head/hair/skin colour for PC-race NPCs** (port GvE3's verified ranges; text in `docs/henchmen-and-caster-history.md`) — P5. **#35 randomised gear appearance** (`docs/gear-and-npc-generation-history.md`) — P6. **#36 re-bake a spell pool after a live level-up** — P5; **#37 auto-fill the DM quickbar** (three unknowns, `docs/henchmen-and-caster-history.md`) — P6.
- **#38 commit the verify server's simplification (`~/nwn-mcp-verify-server`) — P4**, next time it is used. **#39 encounter composer: does "CR 6" mean whole-fight EL or the boss's own CR? — P4**, ask the user. **#40 Hollow Communion open questions (armor AC premise, Elowen's 2nd-level slot) — P5**, `docs/verification-history.md`.
- **#41 plain-`fs` writers and the project sync — done 2026-11-10 (B7).** Guarded by `src/tools/project-sync-guard.test.ts`: a new raw-fs write to the temp dir must call `util/project-sync` or be listed there with its reason.
- **#51 creature sample catalog from The Frozen North — BUILT 2026-11-10/11 (first version).** `build_creature_catalog` read 505 TFN blueprints (`src/utc`; item base types resolved from TFN's `uti` and the base game) into 180 categories (type x primary class x level band x role); the general reference is `src/data/creature-catalog.json` + `docs/creature-catalog.md` (ranges and medians, no TFN names; committed), per-creature summaries in git-ignored `adventures/_catalog/`. `list_creature_samples(cr|level, type, class, role)` returns categories nearest the target with `buildWith` (`build_key_npc` / `forge_creature` args, or "place a palette creature" for monster classes). Acceptance run 2026-11-11 (two of three samples): a level-6 fighter and a level-7 cleric built from the catalog recipes (`build_key_npc`) verify with no errors, level themselves at spawn (`[SPEC_OK]` level, gear, spell slots), carry armour, shield and weapon like the category (AC 22 and 21), and fall in the expected encounter-level bands for a level-7 party (CR 7 standard, CR 6 easy). Not measured: runtime HP (the harness logs level, gear and AC, not HP; `get_balance_report` reads the level-1 build) and the monster-type comparison with a palette creature. Open: more sources (other worlds' `utc` folders), a build-from-sample tool that copies appearance/gear habits, and the many single-creature categories (n=1) that need more data.
- **#52 TFN treasure for MCP-built modules — BUILT 2026-11-11 (first version).** `build_treasure_catalog` read 1,358 TFN item blueprints (`src/uti`) into 82 categories (kind x value tier: ranges, levels they suit by a third of that level's wealth, bonus, common properties); general reference `src/data/treasure-catalog.json` + `docs/treasure-catalog.md` (no TFN names; committed), per-item summaries and blueprint copies in git-ignored `adventures/_catalog/`. `list_treasure_samples(level|value, group, tier, property)` and `import_treasure_item(sample, resref, name)` (skills adventure-rewards/affordances use them). Not done: wiring into container-loot generation (random loot by level), TFN loot-table weights (inc_lootselect), the `prop90` property name (row missing from the base itempropdef), a live check of an imported item in a module (verify_item + wealth budget).
- **#42-#50 story-versus-pipeline follow-ups** (`docs/story-vs-pipeline.md`, written 2026-11-09; finding numbers in brackets). Order: checks first, then requirements, then templates.
  - **#42 [3] payoff has a consumer — DONE 2026-11-10.** `verify_journal` warns `payoff_item_no_consumer` (the journal names an item nothing asks for) and `item_consumed_then_needed`; `util/verify/story-consequences.ts`. Heuristic over script text and dialog parameters; tested on synthetic data and on the real modules (flagged `q_hollow_i2` in Hollow Communion).
  - **#43 [4] journal timing — DONE 2026-11-10.** `verify_journal` warns `journal_advance_on_enter` for an area OnEnter script that advances an entry whose text is not about arriving or looking at the place. It flagged the original Salt Gate (Yorrin's stage 3) and some "chapter" advances in Siege of Ashcrown; those may be deliberate.
  - **#44 [5] a choice carries its consequence — DONE 2026-11-10 (heuristic only).** `verify_journal` warns `stance_change_group` when a script converts one creature's faction and others sharing its tag prefix and faction keep theirs. Not done: a stage field naming the group (`affects`); it found nothing on the real modules checked (tags rarely share a prefix), so it is a narrow net.
  - **#45 [1,2] story record required — P3.** `phase_check` end for `plot` refuses `(not recorded)`; `verify_story` requires a graph above a size; `adopt_module` drafts a graph from areas, quests and key NPCs. Acceptance: Salt Gate adopt then fill shows `story_no_graph` cleared.
  - **#46 [7] motives before actors — P4.** Each key NPC and the antagonist has a motive on record before `actors`; the actor dialog carries a line of it; `audit_module` lists NPCs without one.
  - **#47 [8] areas carry beats — P4.** Each location records one beat; `audit_module` flags an area with no beat.
  - **#48 [3b] aftermath beat — P5.** Plot template gains an aftermath beat; `build_quest` ends a quest on a return stage by default.
  - **#49 [9] sequel hook — P6.** Optional "open thread" field in the plot and a Chapter 2 template reusing NPCs and items.
  - **#50 [10] companion lines per beat — P6.** A conditional dialog root per major beat on each companion.
  - Adopt fill step (done 2026-11-10): `audit_module` returns `fillIn`, the `(not recorded)` fields by heading; the module-explorer skill says to ask the user.

## Design Intent

This MCP serves two purposes:

**(a) AI-assisted human module design** — A human author works with an AI assistant to build, modify, and extend NWN modules via natural language. The human stays in creative control.

**(b) AI-driven creative module building** — A small, proof-of-concept tool for building one-shot adventures for yourself and friends. Spoiler-free by design, so the DM can be surprised too. An LLM autonomously designs and constructs module content based on high-level goals: generating quests, writing dialogue, designing areas, placing objects, building story. This is orchestrated via the `/create-adventure` skill and its sub-skill agents.

### How a session starts (user intent, 2026-11-09)

The first thing a session on this MCP does is **ask the user what they are trying to accomplish**, then the LLM drives that goal to completion
with the tools and skills, teaching as it goes (the user may not know how to build or equip a creature, script behaviour, fill story gaps,
design an area with encounters, or add quests, journal entries, dialog and rewards, or may only want a script bug found). Most sessions are on a
module that is **already built but incomplete**: the order is **adopt** (write `adventure.md` from what the module contains), then **review the
module as built so far**, then let the user say how to fill each gap with the LLM's guidance. `set_project_scope` records the answer; the plan,
phase/category table and audit are in `docs/guided-workflow.md`. TODO #20 tracks the remaining build (`focus`, intake, `audit_module`, adopt).

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
| `MCP_FOLDER_VERIFYSERVER` | `~/nwn-mcp-verify-server` | Checkout of the throwaway headless-engine verify server, used by `run_live_verification` |

## NWScript Function Reference

`nwscript-docs/` holds one cleaned markdown file per NWScript engine function,
named exactly by function name (e.g. `AngleToVector.md`, `GetSpellUsesLeft.md`),
sourced from nwnlexicon.com and stripped of wiki chrome. To look up a function's
signature, parameters, remarks, or example usage, read `nwscript-docs/<FunctionName>.md`
directly (exact-name match — don't grep/scan the whole directory). Not every engine
function has a page; absence isn't authoritative.

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

All 10 styles (interior: dungeon, cave, dwelling; exterior: forest, rural, city, plains, desert, castle, tundra) use one BSP pipeline differentiated by `StyleConfig` presets in `layout-generator.ts`; the preset values are listed in `docs/layout-rotation-history.md`.

#### Layout Rules

- **BSP rooms**: minimum 3x3, margin >= 2 (enforced, never collapses to 1). `minLeaf = 6` ensures each leaf can fit a 3-tile room + 2-tile margin — **this one hardcoded `6` is shared by every style, interior AND exterior.** `StyleConfig.splitThreshold` (10 for most interior styles, 12 for exterior) is assigned in every preset but **confirmed dead — never read anywhere in `bspPartition`** (found 2026-09-19 while designing the avenue-reservation feature below). Wiring it in looks like an obvious fix — DON'T, without also auditing every place that cites it: at a real `splitThreshold=10` minLeaf, a 4-room split needs 20 playable tiles per axis (22x22 total); at 12, exterior styles would need 24 playable (26x26 total) — both far above what's documented and actually relied on today. **The real minimum area for 4 rooms, any style, is 14x14 total (12x12 playable)** — `2 * minLeaf` per axis, off the one true shared constant. The old `adventure-areas` "Interior minimum 12x12" / "Exterior minimum 18x18" lines (replaced 2026-11-08 by `suggest_area_size`, which encodes 9x9 for one room and 14x14 for several) were guidelines, not code: the interior one matches the BSP floor (its "(splitThreshold 10)" parenthetical described config that isn't consulted), and the exterior one is, in practice, a feature-fit headroom figure: BSP itself would happily hand back four 3x3 leaves at 14x14 for exterior too, but a 3x3 room can't fit any real 2x3+ building feature group — 18x18 is a feature-fit headroom guideline, not a value the code enforces or splitThreshold produces. Room size is a random fraction of available leaf space, randomly offset within the leaf.
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

Stamped-group rotation, `getGroupEntrances`, the avenue option and the rotation-handedness saga (multi-tile groups are not rotation-safe; use native rotation 0) are in `docs/layout-rotation-history.md`.

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

**Facing differs by type** (`util/facing.ts`): creatures/waypoints store a world-axis unit vector and the tools' `bearing` is a **compass** angle (0 = north, 90 = east, clockwise); placeables/doors store `Bearing` as a **counter-clockwise** math angle with the model front facing **south** at 0, and the tools' `bearing` is that raw angle (front compass direction = `180° − bearing`). Prefer `faceTowardX/Y`. **Z always comes from the walkmesh** (the `z` parameter is a fallback) and responses report the placed z.

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

`create_trap_blueprint` creates a UTT trigger blueprint with NWN trap fields: `TrapDetectDC`, `TrapDisarmable`, `TrapFlag`, `TrapOneShot`, and a default square geometry. Place with `place_trigger`, then put the trap's effect on it with `add_skill_check` (a party-wide save with damage dice) — no trap script.

## Quest Completability

`verify_quest_completability` traces all journal quests from quest-giver dialog through `AddJournalQuestEntry` script calls to the end entry. Checks area reachability. Returns structured gaps for each quest.

## Placement Collision Detection

`place_creature` (0.75m radius) and `place_placeable` (1.0m radius) check for nearby objects and **block placement** if another object is within range.
Both take `collisionRadius` to override (`"0"` disables). Defaults per kind (S8, 2026-11-09): creatures 0.75 m; placeables 0.5 m (real hand-built areas pack props tightly: 34 % within 1 m of another prop, 16 % within 0.5 m),
so tight furniture groupings can pass `collisionRadius` 0.3-0.4.

## Walkability Enforcement

All placement and movement tools **block** if the target position is non-walkable or within 1m of a non-walkable surface. Uses `checkPlacementWalkable()` in `walkmesh.ts` which checks the target point plus 4 cardinal probes at a configurable distance (default 1m). `adventure_create_transition` uses a 2m buffer so portals stay clear of walls and cliff edges.

`place_creature`, `place_placeable` and `place_waypoint` take `walkBuffer` to relax the clearance (0 = only the point itself must be walkable). Defaults: creatures 1 m; placeables and waypoints 0.5 m (real props: only 57 % have 1 m of clearance, 74 % have 0.5 m). `probe_ground(area, x, y, buffer)` reports the verdict without placing anything.

**Enforced on:** `place_creature`, `place_placeable`, `place_waypoint`, `place_trigger`, `place_encounter`, `place_store`, `move_object`, `bulk_move_objects`, `create_area_transition`, `adventure_create_transition` (both source and target positions).

**Excluded:** `place_door` (doors sit at tile boundaries near walls), `place_sound` (audio sources don't need walkable positions), movement of Door List and SoundList objects.

## Object Height Correction

`fix_object_heights` adjusts Z height of all placed objects in an area (or all areas) to match the walkmesh ground plane. Iterates creatures, placeables, waypoints, triggers, encounters, stores, and sounds. Only adjusts objects where the walkmesh Z differs from the current Z by more than `tolerance` (default 0.01). The walkmesh check uses the highest walkable face at each position (handles overlapping faces at different heights). `dryRun: true` reports up to 40 samples without writing; `onlyBuried: true` only raises objects that are below the ground and never lowers a deliberately raised prop (about 1 % of objects in correct areas). `move_object` / `bulk_move_objects` keep each object's height above the ground when no `z` is given (`followGround`, default true).

## Spatial Conventions (verified against real data, 2026-10-02)

Full write-up with evidence: `docs/object-placement-and-tilesets.md`; skills: `nwn-object-placement`, `nwn-tileset-conventions`. Enforced by the
env-gated oracle `src/util/tile-oracle.live.test.ts` (base-game tilesets with `NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS`; real areas additionally with
`TFN_SRC=<nasher src folder>`; `ORACLE_VERBOSE=1` prints the measured numbers). **If a change to rotation/height/offset/facing maths fails the oracle, the change is wrong.**

- World metres: +X east, +Y north, origin south-west, 10 m per tile; `Tile_List` row-major from the south-west (`index = tileY*Width + tileX`).
- **Tile orientation is counter-clockwise** (corner TR → TL → BL → BR; edge right → top → left → bottom); `.set` fields are orientation-0 terms, never pre-rotated.
  Neighbour agreement in 504 real areas: corners 99.99 % (clockwise reading: 75 %), crossers 99.99 %, heights 100.00 %.
- **Ground Z = walkmesh Z (node `position` offset included) + `Tile_Height × Transition`.** `Transition` is the tileset's `[GENERAL] Transition=`:
  5 for most outdoor sets, **4 for tcn01, 2 for tno01** (a flat 5 m — the old code — fits those 3.5 % / 0 %; `tileHeightStep()`, `get_tileset_details.heightStep`).
  Flat ground is not always z = 0 (trm02/tno01 +5, ttu01/ttz01 +1). trm02/trs02 ramps span half a level.
- **Walkmeshes:** `<Model>.wok` (not the `.set`'s `WalkMesh=`), vertices relative to the node `position` (54 % of walkmeshes have a Z offset), tile-local ±5 m;
  query points are rotated the opposite way (`n=1: (x,y) → (y,−x)`). **`nwn_resman_extract` extracts nothing if any requested file is missing**
  (tcm02 lacks `tcm02_b92_02.wok`, trs02 lacks `trs02_m00_00.wok`): always extract in batches via `ensureWoksExtracted` / `extractSalvaging` (`util/batch-extract.ts`);
  missing models are cached so they are not re-requested per object.
- **Facing** — three encodings (see Object Placement above); doors that belong to a tile: position = tile centre + door `(x,y)` rotated counter-clockwise by `Tile_Orientation`,
  `Bearing = (doorOrientation + Tile_Orientation×90) % 360` (verified on 3,717 doors, ±180°).
- **Library:** `util/walkmesh.ts` (pure probing), `util/walkgrid.ts` (1 m raster, `findOpenGround`; `adventure_find_walkable clearRadius`), `util/facing.ts`, `util/batch-extract.ts`.

## Zone-Based Terrain Solver

`adventure_apply_layout` (adventure tool) takes the full `LayoutResult` from `adventure_generate_layout` and applies zones + crossers + features atomically via the zone solver (`src/util/zone-solver.ts`). `paint_tiles` and `paint_group` are base tools for direct/manual tile placement — no solving.

Open area TODOs (prefabs, reserve flat space, rebuild one area, per-module git repo, tileset survey) and the three tooling fixes are in `docs/area-todos-and-tooling-history.md`.

### Tile Matching Rules

The **only** determining factors for tile selection from .set files are:
- **Corner terrains:** `TopLeft`, `TopRight`, `BottomLeft`, `BottomRight`
- **Corner heights:** `TopLeftHeight`, `TopRightHeight`, `BottomLeftHeight`, `BottomRightHeight`
- **Edge crossers:** `Top`, `Right`, `Bottom`, `Left`
- **Orientation:** the `.set` `Orientation` field (0/90/180/270 degrees)

The `.set` file `[PRIMARY RULES]` and `[SECONDARY RULES]` sections are **NOT functional for tile solving**. They are toolset autotiling rules for terrain propagation when painting in the toolset. They do not restrict which tiles can be placed where. **IGNORE them entirely.**

### Tile Orientation (corrected 2026-10-02 — see "Spatial Conventions" above)

`Tile_Orientation` n turns a placed tile **n × 90° counter-clockwise**. The `.set` corner terrains, corner heights and crossers are
**already in GIT-orientation-0 terms and are used as written — they are NOT un-rotated by the `.set` `Orientation` field** (an older
version of this paragraph said they were; that transform was removed, see the "orientation un-rotation" pitfall below, and the
live oracle confirms the raw values: 99.99 % of 274,500 real neighbour-corner comparisons agree). `getRotatedCorners` /
`getRotatedCrossers` / `getRotatedCornerHeights(tile, gitOri)` apply the counter-clockwise turn for a placed tile.

The `.set` `Orientation` field is the angle the tile's 3D **model** was authored at. The solver uses it only as a **preference**: it favours
tiles at their natural orientation over rotated alternatives that give the same corner pattern, which avoids visual artifacts from models
placed at non-native orientations.

### Terrain Adjacency Constraint

**Zone layouts must respect tileset terrain adjacency chains.** Tilesets only have transition tiles between specific terrain pairs. If two terrains can't transition directly, a buffer zone of the intermediate terrain is REQUIRED — the solver will NOT fabricate intermediate terrains.

**Before designing zones**, call `get_tileset_details` and check which terrains have transition tiles between them. Common adjacency chains:
- `tno01` (Castle Exterior Rural): `Trees → Grass → CastleWall → Dirt`
- `ttr01` (Rural): `Trees → Grass` (+ Water, Dirt variants)

You cannot skip terrains in the chain. For example, in `tno01` you must place a 1-tile `Grass` zone between `Trees` and `CastleWall` — no direct Trees↔CastleWall transition tiles exist. The solver will warn and fall back to incorrect tiles if adjacencies are invalid.

Notes on building full-tileset survey areas (32x32 limit, packing, batching `paint_tiles`) are in `docs/survey-areas-notes.md`.

## Pitfalls that change how a tool call looks

Full record with evidence (including the older, partly superseded entries): `docs/pitfalls.md`.

- **Never call `load_module` on a plain `.mod` between an edit and its `repack_module`** — a reload re-extracts the packed `.mod` and silently reverts unpacked edits (`load_module` refuses unless `force: true`). Loading the module project directory is safe: the edits are already in it. See "Resource Loading" above.
- **Do not mix direct `nwn_gff` edits on disk with MCP tools on the same resource in one session** — the tools write their stale in-memory GIT back. Do all tool work first, direct edits last, repack immediately; read back before repacking.
- **Never pass `{}` as the annotations argument of `server.tool()`** — omit it or give real hints (guarded by `tool-registration-shape.test.ts`).
- **`modify_gff_field` is for flat scalar edits only**; prefer a typed tool for dialogs, lists and structs.
- **Equipped item resref field is `TemplateResRef`**, not `EquippedRes`.
- **`write_script` `compile: true` races**: use `write_script(..., compile: false)` then `compile_script`.

- **`nwn_script_comp` positional arg.** Most nim tools use `-i <file>`, but `nwn_script_comp` takes the source file as a **positional argument** (last): `nwn_script_comp [options] [-o out] file.nss`. Using `-i` silently fails.
- **Numeric tool params must use `z.string()`.** The MCP SDK validates JSON Schema before Zod transforms execute, so `z.coerce.number()` fails when clients send strings. Use `z.string()` + `toF()`/`toI()` helpers from `src/util/params.ts`. Same for complex array params — use `z.string()` + `JSON.parse()`.
- **Resman tools are slow.** Every invocation initializes the full resman stack. Default timeout (30s) is too short for piped operations — `resmanCatToJson()` uses 120s.
- **Temp dir contains cache subdirs.** `resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/` — all auto-excluded from `erfPack()` by the `isFile()` filter. Never pack these into the module.
- **`validate_module` false positives.** Base game scripts (`nw_c2_default5`, etc.) and items (`nw_wblms001`) are resolved at runtime — filter these "missing" references.
- **`create_dialog` condition field.** The `condition` on a node goes on the **link pointing to it** (`Active` field), not the node itself.
- **GIT trigger field name is `TriggerList`** (no space), not `"Trigger List"`. Other no-space list names: `SoundList`, `StoreList`, `WaypointList`. With-space names: `Creature List`, `Door List`, `Encounter List`, `Placeable List`.
- **Triggers need Geometry in placed instances.** UTT blueprints from resman do NOT contain geometry. When placing triggers, always ensure the `Geometry` list field exists with at least 4 vertices (PointX/PointY/PointZ). Without geometry, the engine won't detect entry and the toolset won't render the trigger.
- **GIC must be synced with GIT.** The toolset uses the GIC file to index objects in an area. `writeBackGit()` automatically syncs the GIC. Without GIC entries, objects exist in the GIT but the toolset doesn't show them.
- **A placed instance's `VarTable` (and other per-instance fields) is a separate copy from its UTC blueprint's — editing one does not edit the other.** `place_creature`/`create_creature_blueprint`'s own `varTable` param is unaffected by this (it sets the blueprint before the object is ever placed, so there's only one copy to get right at creation time) — the gap is specific to editing a creature that's *already placed* in a `.git`. Confirmed directly: batch-adding `SPEC_*` local variables to 110 already-placed companions' `.utc` files (verified present there via independent `nwn_gff` extraction) produced total silent failure at runtime — every one read back as unset, because the actual placed instances in the area's `.git` still only carried their original vars. The fix wrote the same entries into the `.git`'s `Creature List` directly. Same family of bug as the previously-found `SoundSetFile` case (a `modify_gff_field` write to a blueprint alone left a placed instance's voice unchanged) — treat any field edit made *after* placement as needing both files, never just the blueprint.

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

**Checks and history.** The checks themselves live in `src/util/verify/*.ts` (each finding has a stable `code` and a `fix`); `verify_all` also walks placed GIT creatures, not only `.utc` files. The history of each check, the user-correction rounds, `run_live_verification`, the systest module, the `create_faction` engine limitation and the Hollow Communion playtest rounds are in `docs/verification-history.md`. Read it before changing a check or the live-verification loop.

## Quest system (2026-11-07)

**Standard path for quests: `build_quest(spec, dryRun)`** (+ `create_quest_system`, `remove_quest`); reference
`docs/quest-system.md`, source `src/util/quest-{spec,builder,script,vars}.ts`, `src/tools/quest-tools.ts`. Ported from TFN's
`inc_quest.nss`/`dlg_q_*` and the TFN content studio's courier/rescue/escort runtime: **vanilla** (quest state = the engine's
`NW_JOURNAL_ENTRY<tag>`; no SQLite/NWNX), **whole party** (user decision: any member's advance moves every journal and pays every
player 100 %), TFN's `questK = "<stage>_<tag>"` variable contract and eligibility rules. Every dialog line uses `q_chk`/`q_act`
with script parameters; skill checks roll once in `q_roll` (an action — TFN rolled inside a condition). Fixed TFN bugs: AoE
advances always used `quest1`, slots stopped at 19, Bluff check had condition side effects and skipped stages, unchecked reward
items, two-digit stages, pickups only slot 1. `verify_journal` / `verify_quest_completability` read the quest variables
(`quest-vars.ts`); before that they read only script text and native dialog fields. **Not live-tested:** the headless server has
no player, so no stage can advance there; all scripts compile with `nwn_script_comp`.

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

Details in `docs/coop-skill-checks-and-rewards.md`: skill-check puzzles (cap 1-2 attempts per PC tracked on the PC; the best skill among the PC and its henchmen rolls, enumerated with `GetMaster(oMember) == oPC`) and rewards (each player gets 100 %, never a divided pot; use the generated `inc_reward` helpers from `create_reward_system`).

## Henchmen / Companions

**Standard path (2026-11-08): `create_companion_system` (once per module) + `build_companion` per companion (blueprint, forge, placement, dialog, verification in one call; `create_companion_dialog` is the lower-level piece). Earlier (2026-11-07): `create_companion_system` + `create_companion_dialog`
(per companion), source in `src/util/companion-script.ts`.** The party cap is counted from the engine at
join time (living henchmen of PC masters in the recruiting PC's party), never kept in a module counter —
the hand-written Hollow Communion scripts kept `HC_HENCH_COUNT`, missed the decrement on dismiss and then
on death (each permanently blocked recruiting), and decremented on the death of a companion never
recruited. Join raises `SetMaxHenchmen` before `AddHenchman`, so no `a_mod_load` is needed. Compiled
against the real compiler; not live-tested (the headless verify server has no PC to recruit with).

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
Further companion findings (static feat baking, `LevelUpHenchman` limits, spell baking, Random Abilities, Special Abilities, `level_creature`, class-position fix) are in `docs/henchmen-and-caster-history.md`, with open TODOs for appearance randomisation, level-up after a baked pool and quickbar auto-fill.

## Gear Appearance

Generated gear uses the base item's **default** model variant, applied by
`applyDefaultItemModels()` (`src/util/item-models.ts`) after `BaseItem` is final. A
composite weapon (`baseitems.2da` ModelType 2) needs `ModelPart1..3` all non-zero; any
part left at 0 renders as a shapeless blob in the creature's hand.

History of gear appearance, weapon preferences, `equip_npc_by_role`, `build_npc_stat_block` and the creation order is in `docs/gear-and-npc-generation-history.md` (includes the open TODO for randomised gear appearance).

## Testing

**Everything runs locally and the module-building path needs no hosted service** — modules generated with
this server are one-off and local. `.github/workflows/ci.yml` (2026-10-03) runs only `npm ci && npm run verify`
on push/PR to `master` as a gate on the server's own TypeScript (see TODO #1); nothing else may depend on a
hosted service. The pre-commit hook runs the same gate locally.

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
- `src/util/tile-oracle.live.test.ts` is an env-gated **real-data oracle** for the spatial conventions (tile rotation, heights, walkmesh offsets):
  Part A needs `NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS` (base-game tilesets, ~20 s), Part B additionally `TFN_SRC=<…/the-frozen-north/src>` (any nasher
  `src` with `are/*.are.json` + `git/*.git.json`). `ORACLE_VERBOSE=1` prints the measured numbers. Skips (never fails) without the environment.
  Run it after any change to rotation, height, offset or facing maths — see `docs/object-placement-and-tilesets.md` §9.

The full test-harness history (comprehensive mocked and live tiers, vi.mock lessons) is in `docs/testing-history.md`.
