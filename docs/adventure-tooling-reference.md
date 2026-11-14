# Adventure tooling reference (2026-11-08)

How the tools and checks added for the skill-prompt reduction (S1–S9 in `CLAUDE.md`) work, so a model can use them without reading
the source. Each section says what the tool does, its parameters, what it writes, its limits and where the code and tests are.
Quest runtime details are in [quest-system.md](quest-system.md); creature building is in [creature-forge-manual.md](creature-forge-manual.md).

**Rule of thumb:** the skills tell you *when* to call a tool; this file tells you *what it does*. If a skill and this file disagree,
the code wins — `skill-lint.test.ts` (below) catches the common ways they drift apart.

| Need | Tool | Section |
|---|---|---|
| Check a phase can start / record that it finished | `phase_check` | 1 |
| Decide an area's size and how to build it | `suggest_area_size` | 2 |
| Place the doors a painted area implies | `place_tile_doors` | 3 |
| Build a whole companion in one call | `build_companion` | 4 |
| A skill / ability / save check on a trap, door, clue or dialog line | `add_skill_check`, `q_check`, stage `check` | 5 |
| Make a creature appear when a quest line is picked | stage `spawn`, `q_act spawn=` | 6 |
| Keep skills in step with the tools | `skill-lint.test.ts` | 7 |
| Faction names, placement refusals that name their fix | `create_creature_blueprint`, `place_*` | 8 |
| Rework a module that already exists | recipe | 9 |
| Plan areas, events and encounter kinds from play time | `plan_adventure_shape` | 11 |
| Check the story graph | `verify_story`, `phase_check` | 12 |
| Skip phases on purpose / declared scope | `Scope`, `Skip phases` in `## Module` | 13 |
| Bring a second group in when a stage completes | stage `spawn` on event stages | 14 |

## 1. `phase_check(phase, step, warnings?, errors?, coop?)`

Source: `src/tools/phase-tools.ts`, pure logic `src/util/phase-check.ts`. Tests: `phase-check.test.ts`, `phase-tools.integration.test.ts`.

`phase` is one of `plot, areas, environment, actors, quests, challenges, affordances, polish, rewards`.

- **`step: "start"`** reads `adventure.md` in the module's temp dir and checks that every section the phase needs exists and is not empty
  (`REQUIRED_SECTIONS`: each phase needs everything before it; `areas` needs Module and Plot, `rewards` needs through Polish). On a missing
  section it returns `isError` with `missing` and a `stop` message; the skill must stop and output it. No `adventure.md` is also an error.
- **`step: "end"`** (1) checks the phase appended its own section (`OWN_SECTION`: plot→`## Plot` … rewards→`## Rewards`); (2) for `areas`,
  runs area connectivity from the entry area (`computeConnectivity`, shared with `check_area_connectivity`) and reports unreachable
  areas; (3) runs every verifier (`collectVerifyResults`, the body of `verify_all`) and keeps the findings whose object type belongs to
  the phase (`PHASE_VERIFY_TYPES`: actors → utc/dlg/utm, challenges → utc/ute/utt, quests → dlg/jrl/coop, polish and rewards → all);
  (4) merges `{status, warnings, errors}` into `adventure-status.json` (`success` with no errors, otherwise `partial`) and returns it.
  `warnings` and `errors` are JSON arrays of strings the phase wants recorded too.
- A phase named under `Skip phases` in `## Module` returns `skipped: true` on both steps (§13).
- Limits: `quests` also needs `verify_quest_completability` run separately (the result says so).
- Skills: every `adventure-*` skill calls `start` in its Pre-Check and `end` in its Finish section. `create-adventure` no longer tells skills
  to write `adventure-status.json` by hand.

## 2. `suggest_area_size(biome, events, purpose?, shape?)`

Source: `src/tools/area-size-tools.ts`, rules `src/util/area-size.ts`. Test: `area-size.test.ts`.

Size = f(biome, purpose, event count, shape). An *event* is a distinct thing that happens there: an encounter, a conversation, a clue
search, a set piece. `events` is a string like every numeric tool parameter.

- **Interiors** (`biome: "interior"`, `purpose` required): cabin 2×2, home 2×2, inn 2×4, tavern 2×4, shop 2×3, hall 4×6. Extra events grow
  the room a little up to a cap (cabin/home 3×4, inn/tavern 4×6, shop 3×4, hall 8×8); past the cap the note says to use another floor or
  area. An inn or tavern is often just 2×4 with `StairsUp`/`StairsDown` to an upper floor of the same size (the result says so).
- **Exteriors and dungeons** (`forest, rural, city_exterior, castle_exterior, desert, frozen, ruins, underdark, dungeon, cave,
  castle_interior`): a base tile count for one event plus a number per extra event, shaped as near-square as possible, 32 per side at most
  (forest 16 +8/event → 4×4; rural 36 +16; city 324 +40; dungeon 64 +16; table `BIOME_RULES`). These budgets are first estimates, not
  fitted to the corpus.
- **`shape: "linear"`** (forest, rural, desert, frozen, underdark, dungeon, cave): a narrow strip, entrance and exit at opposite ends. Forest
  road = 3 wide × 10 long for one event, +4 length per extra event. Other biomes ignore it with a note.
- **`method`**: `adventure_generate_layout` from 9×9 (one room; several rooms need 14×14, count = min(4, events)), otherwise
  `paint_direct`: `create_area`, then `paint_tiles`/`paint_group` by hand. Linear strips are always painted by hand.
- Skills: `adventure-plot` records `Events` and `Travel` per location; `adventure-areas` Phase 3 calls the tool with them.

## 3. `place_tile_doors(area, dryRun?, genericDoor?)`

Source: `src/tools/door-tools.ts`, planning `src/util/tile-doors.ts`. Test: `tile-doors.test.ts` (plan only; not run on a real area by test).

Reads the area's `Tile_List`, finds every tile with `[TILE<id>DOOR<n>]` placements in the tileset `.set`, and places a door for each.

- **Blueprint** = `doortypes.2da` `TemplateResRef` for the placement's `Type` row (never `genericdoors.2da`). **Type 0 is "Generic" and has no
  blueprint — every `ttr01` building door is type 0.** Pass `genericDoor` (for example `x3_door_wood001`) to use one blueprint for those;
  without it they appear in `skipped` and must be placed with `place_door`.
- **Position and bearing** come from the tile: tile centre + the door offset turned counter-clockwise by `Tile_Orientation`;
  `Bearing = (doorOrientation + Tile_Orientation × 90) % 360`. Z from the walkmesh.
- **Locking:** a door on a tile that also has a crosser is a corridor doorway and stays unlocked. Every other door gets `Locked`, `Lockable`
  and `Plot` = 1 (aesthetic, opens only when a quest unlocks it).
- **Idempotent:** a door already within 1 m is left alone (`alreadyPlaced`). `dryRun` lists the plan.
- It writes through `writeBackGit` (GIC synced) and pushes an undo snapshot.

## 4. `build_companion`

Source: `src/tools/companion-tools.ts`. Test: validation paths in `companion-tools.integration.test.ts` (the full build is not run against a real module).

One call: writes the shared companion system and `cf_spawn` if missing → `buildCreatureBlueprint` (faction 2, henchman AI, appearance =
race for races 0–6) → `forgeCreature` (gearRole `pc`, `originalSpawn x0_ch_hen_spawn`) → saves the blueprint → places it → recruit dialog
(`createCompanionDialog`) → `verify_creature` as a henchman.
Required: `resref` (≤16), `name`, `area`, `x`, `y`, `race` (0–6), `classId`, `level`, `gender`, `introduction`, `backstory`. Optional:
`accept`, `farewell`, `partyFull`, `tag`, `bearing`, `pinnedSpells`, `domains`, `school`, `powerLevel`, `gearWealth`, `soundset`.
The voiceset is a TYPE 0 (PC) row chosen by class and gender (`COMPANION_SOUNDSETS`) and used only when `soundset.2da` confirms its gender.
An Animal-class companion (a dog) is not built this way — build the blueprint and `create_companion_dialog` separately; `verify_creature` no
longer asks such a companion for a starting package or `HENCH_LEVEL`.

## 5. Checks: `add_skill_check`, `q_check`, and a stage's `check`

Source: `src/tools/check-tools.ts`, runtime `q_check` / `q_check_evt` in `src/util/quest-script.ts`. Tests: `quest-check.test.ts`, `quest-tools.integration.test.ts`.

- **`q_check`** is one script for a skill, an ability or a saving throw at any DC. Parameters: exactly one of `skill=` / `ability=` (`str..cha`) /
  `save=` (`fort|reflex|will`); `dc=N` or `difficulty=easy|moderate|hard|veryhard` (10/15/20/25); `who=best|speaker|each` (default `each` for
  saves, `best` otherwise; `best` is the speaker or whoever in their party is best, companions included); `tries=` per player (tracked on the
  player, default 1), `again=1`, `key=` (stores `QS_ROLL_<key>` on the player: 1 pass, 2 fail, so a later `q_chk roll=<key>` works);
  outcomes with a `pass_` or `fail_` prefix: `damage` dice (`3d6`), `damage_type`, `half=1` on a passed save, `ability` (`str..cha`) with `ability_amount` (dice or number, default 1) and `ability_hours` (game hours, default 1; a temporary decrease per roller, at most 10 points, halved by `half=1` on a pass), `msg`, `unlock`, `open`, `destroy`,
  `spawn`+`at`, `set_var`+`var_value`, `give_item` (every player gets one), `xp`. The actor is resolved from the speaker, entering object, user,
  clicker or disarmer, so one parameter set works in every context. It logs `[QUEST] check …`.
- **`add_skill_check(area, tag, kind, check, event?)`** puts a check on a placed object: `trigger` (OnEnter), `placeable` (OnUsed, or
  `event: "disarm"` for OnDisarm), `door` (OnFailToOpen). `check` is a JSON object of the parameters above. It writes `chk_<name>` locals, keeps the
  old handler in `chk_orig`, and points the event at `q_check_evt`, which copies the locals into script parameters and runs `q_check`.
- **A stage's `check`** in `build_quest` (talk-style stages): `{skill | ability | save, dc | difficulty, else, prompt, pass, fail}`. A skill with a
  plain DC uses `q_roll`; an ability, a save or a named difficulty uses `q_check`. A `search` stage takes a skill only.
- Item gifts (`give_item`, a search's item) go to every party member (`QuestGiveItem`), so the co-op rules pass.

## 6. Spawning from a quest line

Source: `src/util/quest-spec.ts` (`StageSpawn`), `src/util/quest-builder.ts` (`prepareSpawn`), `q_act` in `quest-script.ts`.

- **Spec:** `spawn: {resref, area | at, x?, y?, count?, tag?, hostile?}` on a `talk`, `return`, `deliver` or `rescue` stage (stage 1 = when the quest is
  accepted), or on a `kill`, `pickup`, `explore`, `trigger`, `use` or `search` stage (§14); a quest-level `spawn` goes onto stage 1 (the `bounty`
  shortcut). Escort, custom and optional stages are refused.
- **Builder:** with `area`, it places the waypoint `<quest tag>_s<n>_spawn` on walkable ground (at `x,y` if given, else the first open spot) with the
  walkability check, once; with `at` it checks the waypoint exists and warns if not. It checks the blueprint exists. The `q_act` line gets
  `spawn`, `at`, `spawn_key` (`<quest tag>_<stage>`) and, when set, `spawn_count`, `spawn_tag`, `spawn_hostile=0`. A `kill` stage whose target is
  the spawned resref or tag needs no placed copy; the death script is wired onto the blueprint, which the spawn copies.
- **Runtime:** spawns once per key (module local `QS_SPAWN_<key>`), only at a real waypoint (otherwise `[QUEST_WARN]`, nothing spawned — it no
  longer falls back to the NPC's own spot), not while a creature tagged `spawn_tag` is alive, count 1–8 spaced 1.5 m, Hostile unless
  `spawn_hostile=0`. Logs `[QUEST] spawn …`.
- Not built: spawning only into an area the party has entered; forging the spawned creature (forge the blueprint first).

## 7. `skill-lint.test.ts` (inside `npm run verify`)

Source: `src/skill-lint.test.ts`, `src/util/skill-lint.ts`. It parses `src/tools/*.ts` for every `server.tool("name", …)` and its literal parameter
schema, then every `.claude/skills/*/SKILL.md`:
1. a `tool_name(` that is not a registered tool fails (scripts and CLI programs that look like calls go in `NOT_TOOLS`);
2. a named argument (`name:` or `name=`) the tool's literal schema doesn't have fails (tools whose schema isn't an object literal are skipped);
3. a paragraph over 150 characters copied between two skills fails — move it into one skill and point to it.
It found two real skill bugs on its first run. When you rename a tool parameter, update the skills or the build fails.

## 8. Tools that name their own rules

- `create_creature_blueprint` `faction` takes `hostile`, `commoner`, `merchant`, `defender`, `pc` or a number, and the result carries a `warnings`
  entry when the blueprint ends in faction 0 (the player faction). `src/util/placement-hints.ts`.
- `place_creature`, `place_placeable` and `place_waypoint` refusals end with the fix: walkability refusals suggest `adventure_find_walkable` and a lower
  `walkBuffer` (0.5 for furniture against a wall); collision refusals suggest `collisionRadius` 0.3–0.5 for an intentional grouping.
- Still skill-only: stat caps in `verify_all`, per-kind collision defaults (S8 in `CLAUDE.md`).

## 9. Reworking a module that already exists (the Hollow Communion recipe)

1. `load_module` (a filename or path). Every `load_module` after an edit and before `repack_module` throws the edit away; the server refuses unless `force`.
2. Do all tool-based edits first (`place_*`, `move_object`, `set_object_variables`, `edit_dialog_node`, `add_dialog_node`, `edit_journal_entry`,
   `paint_tiles`, `delete_area`), then `repack_module`.
3. For anything no tool covers (bulk variable edits, a field on a placed object), edit the `.git`/`.utc` with `nwn_gff` (`-k json` to read, `-k gff` to
   write), **after** the tool work, then `repack_module` and `load_module` again. A tool call after a direct edit writes the stale in-memory copy back.
4. Moving an object between areas has no tool: place a new copy in the destination, copy its local variables with `set_object_variables`, and patch
   fields like `OnUsed` directly. Remove the old area with `delete_area` last.
5. `verify_all`, then `create_quest_system` if `q_act` predates the co-op fix, then `repack_module` and send the `.mod`.
6. Equipment gold is the creature's `MCP_GEAR_WEALTH` local (float, a multiplier on the role's budget; the forge default is 0.5). It lives on the
   blueprint and on every placed copy; change both.

## 11. `plan_adventure_shape(playMinutes, partySize?, friendly?, chains?, biome?)`

Source `src/tools/adventure-plan-tools.ts`, rules `src/util/adventure-shape.ts`, test `adventure-shape.test.ts`. Returns total events, area count, events per
area, the count of each encounter kind, and `areas[]` with the act, the event kinds in story order, minutes and the open ground needed (plus the
`suggest_area_size` result when `biome` is given). A plan to start from. Numbers and reasoning: [adventure-composition.md](adventure-composition.md).

## 12. `verify_story` and the story graph

Source `src/util/story-graph.ts` (grammar in its header), test `story-graph.test.ts`. Reads `adventure.md` from the module temp dir. `phase_check` runs
the same check at the end of `plot` and `polish` (unknown areas are ignored at `plot`, when no area exists yet). Error codes: `story_duplicate_beat`,
`story_dangling_lead`, `story_unreachable_beat`, `story_no_ending`, `story_clue_never_given`, `story_thread_beat`, `story_thread_unpaid`. Warnings:
`story_no_graph`, `story_unknown_act`, `story_unknown_area`, `story_dead_end`, `story_act_order`, `story_clue_single_route`, `story_no_threads`.

## 13. Declared scope and skipped phases

`## Module` in `adventure.md` can carry `- **Scope:** <what the user asked for>` and `- **Skip phases:** areas, rewards`. `phase_check` returns
`skipped: true` for a listed phase on both steps (and records `skipped` in `adventure-status.json`), and later phases don't require the section a skipped
phase would have written (`parseScope`, `requiredFor` in `src/util/phase-check.ts`). `/create-adventure` asks for the scope first (pre-flight step 0);
`module-explorer` asks it at the start of a session. One feature or NWScript only: don't use the pipeline.

`set_project_scope(kind, scope, phases?, focus?)` records the answer: `kind` is `whole_adventure`, `some_phases` (`phases` = the JSON list to run; the rest become `Skip phases`), `one_feature` or `nwscript_only`; `focus` (creatures, scripting, story, areas_encounters, quests_dialog, debug, items; `nwscript_only` implies scripting) returns that focus's guide (skills, first calls, what to ask). It writes `project-scope.json` in the module's adventure directory, and for the two pipeline kinds `Scope:`/`Skip phases:` into `## Module` (`setScopeFields`); a non-pipeline kind removes old `Scope:`/`Skip phases:` lines, and `phase_check` then returns `skipped` for every phase. With no arguments it reads the recorded scope (and guide) back.

The adventure directory is `adventures/<Title-With-Dashes>/` (git-ignored; `MCP_FOLDER_ADVENTURES` overrides the base): `get_adventure_dir` returns it and moves over any story file an older run left in the temp dir. For a built but incomplete module: `adopt_module` writes `adventure.md` from the module (sections with no content are left out, so `phase_check start` names them as gaps; unknowns are `(not recorded)`), then `audit_module` returns done/partial/missing per category with the phase and focus that fills it. See `docs/guided-workflow.md`.

## 14. Spawn on event stages (encounter chains)

A stage `spawn` on a `kill`, `pickup`, `explore`, `trigger`, `use` or `search` stage (not optional searches, escort or custom) is written as the slot's
`questK_spawn`, `_spawn_at`, `_spawn_key`, `_spawn_count`, `_spawn_tag`, `_spawn_hostile` locals on the stage's object; `QuestAdvance` calls `QuestSpawn` when the
stage advances. Dialog stages still put the same values on their `q_act` line. `QuestSpawn` (in `inc_quest`) is shared: once per key, only at a real
waypoint, not while the tagged creature lives, 1–8 creatures 1.5 m apart, Hostile by default. A chain is a `kill` on the lookout with a `spawn` of the
main force, then a `kill` on the main force (§6 of this file and [adventure-composition.md](adventure-composition.md)).

## 15. Known gaps

- `place_tile_doors`, `build_companion` and `build_quest` `spawn` are unit/integration-tested but not exercised against a real painted area or a live
  game. `q_check` and the whole quest runtime have never run with a real player (the headless server has none).
- `quests` needs a separate completability call from `phase_check`. A skipped phase is declared in `## Module` (§13).
- Area budgets in `suggest_area_size`: measured 2026-11-09 against 1,019 unique hand-built areas (comment above `BIOME_RULES`). Interior, dungeon, cave and castle interior now match the medians; forest, rural, frozen, underdark and castle exterior are whole exploration maps in the corpus (n 8-25) and are deliberately smaller here; city exterior, desert and ruins had too few samples.
- `run_live_verification` writes the forged creatures' `[CL_LOOT]` lines into adventure.md `## Spawn Loot` (`recordLoot`, default on) for `/adventure-rewards`.
- `src/util/quest-script.live.test.ts` (env-gated) compiles every generated quest script with the real compiler.

## 16. `set_module_start(area, x?, y?, keepStarterArea?)`

Makes `area` the place players start: writes `Mod_Entry_Area` and `Mod_Entry_X/Y/Z` in `module.ifo`. Without `x` and `y` it takes open walkable
ground nearest the area's centre (clear radius 3 m, then 2, then 1); a given point is refused when it is not walkable. It then removes the `_start`
stub that `create_module` makes, unless `keepStarterArea` is true, something is placed in it, or a transition leads into or out of it (a starter-store
area); the result's `starterArea` says which. In the `areas` profile and step 5 of the areas phase prompt. `delete_area` and this tool share
`removeAreaFromModule` (`src/tools/paint-tools.ts`).

`check_area_connectivity` no longer lists the DM area (`dm_area`) under `unreachable`: it is cut off on purpose and is reported as
`disconnectedOnPurpose`.

## 17. `write_plot(spec, dryRun?)` and the plot file

The plot as one JSON object (`PlotSpec`, `src/util/plot-spec.ts`; schema `docs/specs/plot.schema.json`; example `docs/specs/plot.example.json`).
`write_plot` checks it (schema, then names against each other; an error names the `field`), writes `## Plot` in the standard format with each
location's `Resref` and a `### Story Graph` of one beat per location, and sets Title, Target Level, Party Size and Estimated Duration in `## Module`
(Idea and Difficulty only when absent; other lines such as Scope are kept). Warnings compare the plot with `planAdventureShape` for the play time.
Writing again replaces both sections. The driver's `--plot <file>` calls it and then the plot phase's end check. Details:
`docs/local-model-guide.md` (W6) and `docs/local-model-manual.md` §5a.

