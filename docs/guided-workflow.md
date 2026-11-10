# Guided workflow — phases, categories and how a session starts

Status (2026-11-09): built, with unit and integration tests; live-tested on The Salt Gate Conspiracy after the MCP restart: `set_project_scope` (with `focus` and the per-focus guide),
`phase_check` (declared skips and the non-pipeline kinds), `get_adventure_dir`, `adopt_module`, `audit_module`. Still design: cutscenes (TODO #25) and tying the scope record to a test goal (TODO #23).

**Module files.** Everything specific to one LLM-built module lives in `adventures/<Title-With-Dashes>/` (git-ignored; `MCP_FOLDER_ADVENTURES` overrides the base): `adventure.md` (the story), `dm-guide.md`, `adventure-status.json`, `project-scope.json`. e.g. "The Salt Gate Conspiracy" → `adventures/The-Salt-Gate-Conspiracy/`. `get_adventure_dir` returns the path; files an older run left in the temp dir are moved there on first use. The temp dir keeps only the extracted `.mod`.

**Intent (user, 2026-11-09):** the session opens by asking what the user is trying to accomplish; the LLM then drives that goal to
completion with the tools and skills. For an existing module the order is **adopt, then review the module as built, then the user chooses
how to fill the gaps with the LLM's guidance** (§4 review, §5 adopt; the build order in §6 follows this).

Goal of a session on this MCP: the user asks for help with *part* of a project and the LLM guides them in the right order, or takes
the request and does it the usual way. The user may not know how to create or equip creatures, script behaviour, fill story gaps,
build an immersive area with encounters, add quests/journal/dialog/rewards, or find a script bug. Most real sessions are an
**existing module that is built but incomplete**, not a blank start.

## 1. The nine phases, in order, with the category each one covers

Order matters because each phase reads what earlier ones wrote into `adventure.md` (`phase_check start` enforces it).

| # | Phase (skill) | Category it covers | Needs first | Main tools | Verified by |
|---|---|---|---|---|---|
| 1 | `plot` (`/adventure-plot`) | **Story**: premise, locations, NPCs, antagonist, quest outline, story graph | the user's material, if any | `plan_adventure_shape`, `verify_story` | story graph reachable, threads paid |
| 2 | `areas` (`/adventure-areas`) | **Areas and transitions**: tileset, layout, doors, portals, ambience | Plot | `suggest_area_size`, `create_area`, `adventure_generate_layout`/`apply_layout`, `place_tile_doors`, `adventure_create_transition` | `check_area_connectivity`, `verify_area` |
| 3 | `environment` (`/adventure-environment`) | **Dressing**: placeables, sounds, waypoints, clue objects | Areas | `place_placeable`, `place_sound`, `place_waypoint`, `add_skill_check` | `verify_placeable/sound/waypoint` |
| 4 | `actors` (`/adventure-actors`) | **Friendly creatures and dialog**: key NPCs, companions, ambient creatures, greetings | Environment | `forge_creature`, `build_companion`, `equip_npc_by_role`, `create_dialog` | `verify_creature`, `verify_dialog` |
| 5 | `quests` (`/adventure-quests`) | **Quests, journal, dialog lines, rewards wiring** | Actors | `build_quest`, `create_quest_system`, `create_journal` | `verify_journal`, `verify_quest_completability`, `verify_coop_rules` |
| 6 | `challenges` (`/adventure-challenges`) | **Hostile creatures, encounters, traps, set pieces** | Quests | `forge_creature`, `compose_encounter`, `place_creature`, `add_skill_check`, `get_balance_report` | `verify_creature/encounter/trigger` |
| 7 | `affordances` (`/adventure-affordances`) | **Items and economy**: stores, container loot, starting gold, level adjustment | Challenges | `create_store_blueprint`, `place_store`, `add_items_to_container` | `verify_store/item/placeable` |
| 8 | `polish` (`/adventure-polish`) | **Consistency pass**: gaps, references, connectivity, quest completability | all above | `validate_module`, `verify_all` | everything |
| 9 | `rewards` (`/adventure-rewards`) | **Rewards and hand-off**: XP, end items, module description, DM guide, the DM area with the story and DM-guide books (Phase 7d) | Polish | `create_reward_system`, `set_module_description` | everything |

Two things sit outside the nine and are used across them: **scripts** (`write_script`, `compile_script`, `nwn-logic-debug`) and
**live checks** (`run_live_verification`, `create_systest_instrumentation`).

## 2. Categories the user actually asks for, and where each goes

A request is a *category*, not a phase. This table is what the intake step maps from (the planned `focus` values).

| User says… | focus | Phases involved | Skills to load | First calls |
|---|---|---|---|---|
| "I don't know how to make or equip a creature" | `creatures` | actors (friendly) / challenges (hostile) | `creature-forge`, `adventure-actors` | `create_creature_level_system` once, then `forge_creature` or `build_companion`; `equip_npc_by_role`; `verify_creature` |
| "Make this creature react / behave when…" | `scripting` | none (cross-cutting) | `nwn-logic-debug`, `module-explorer` | `read_script_source`, `write_script` then `compile_script`; `set_creature` event scripts; dialog `params` for quest-driven reactions |
| "My story has gaps / I need to fill in…" | `story` | plot (and a read of what exists) | `adventure-plot` (Phase 1b: use the user's material) | `plan_adventure_shape`, write the Story Graph, `verify_story` |
| "Make this area immersive, with encounters" | `areas_encounters` | areas, environment, challenges | `area-*` for the biome, `adventure-environment`, `adventure-challenges` | `suggest_area_size`, `get_area_details`, `visualize_area`, `compose_encounter`, `get_balance_report` |
| "Add quests, journal entries, dialogs, rewards" | `quests_dialog` | quests (+ actors for the NPCs, rewards) | `adventure-quests`, `quest-explorer` (existing), `nwn-dialog-introspection` | `get_journal`, `get_dialog_tree`, `build_quest`, `verify_quest_completability` |
| "Find the bug in my scripts" | `debug` | none | `nwn-logic-debug` | `search_scripts`, `find_variable_usage`, `trace_dialog_path`, `compile_script`, `run_live_verification` |
| "Stores, loot, gold" | `items` | affordances | `adventure-affordances`, `nwn-item-properties` | `create_store_blueprint`, `add_item_property` |
| "Make it all" / blank start | whole adventure | all nine | `/create-adventure` | `set_project_scope` whole_adventure |

`focus` does not replace `kind`. `kind` says whether the adventure pipeline is used (`whole_adventure`, `some_phases`);
`focus` says what help is wanted when it is not, and it picks the skills and first calls above.

## 3. Starting a session (the intake)

1. Ask one question: *what do you want help with?* Offer the §2 rows as options, plus "build a whole adventure". Say plainly what each means.
2. Is a module already loaded or named? If not, ask which (or whether to create one).
3. Call `set_project_scope` with the user's own words, the `kind`, and (planned) the `focus`.
4. If the module already has content, run the **audit** (§4) before changing anything, and show the user what exists.
5. Do the work with the focus's skills. Explain each step in a sentence as it happens; the user may be learning the tools.
6. End with the focus's verifiers (§1 last column) and report their result faithfully, including what was not exercised.

## 4. Existing but incomplete module: the audit

Read-only, in this order, so the report maps to categories:

| Step | Call | Tells us |
|---|---|---|
| 1 | `load_module`, `get_module_summary`, `get_module_info` | size, entry area, scripts, description set or empty |
| 2 | `list_areas`, `check_area_connectivity` | areas missing, unreachable, no transitions → **areas** |
| 3 | per area `get_area_details`/`visualize_area` | empty or sparse areas → **environment**, **challenges** |
| 4 | `list_creatures`, `get_balance_report` | no hostiles, wrong levels, no casters → **challenges**; no friendlies → **actors** |
| 5 | `get_journal`, `verify_journal`, `verify_quest_completability` | quests without end entries, unreachable givers → **quests** |
| 6 | `verify_dialog` on NPC dialogs, `find_dialog_scripts` | dialogs with no quest hooks, missing scripts → **quests/actors/scripting** |
| 7 | `list_stores`, `get_area_items` | no merchants, no loot → **affordances** |
| 8 | `validate_module`, `verify_all` | everything else (structure, references, co-op rules) |
| 9 | `get_module_info` description, `adventure.md` Rewards | no description, no end reward → **rewards** |

Output: a table of category → state (done / partial / missing) → the phase or focus that fixes it, in the §1 order. The user picks;
the LLM does those and nothing else. This is where the story-gap question (`story`) comes in: if no `adventure.md` exists, the
LLM reconstructs a short Plot from what the module contains and asks the user to correct it, rather than inventing a new one.

## 5. The gap: phases need an `adventure.md`, an existing module has none

`phase_check start` requires the earlier sections. A hand-built module has no `adventure.md`, so every pipeline phase would stop.
Options, recommended first:

1. **Adopt step (chosen by the user as the first move for an existing module).** After the audit, write `adventure.md` from the module: `## Module` (title, level from creatures, tone asked of
   the user), `## Plot` and `## Areas`/`## Actors` summarised from what exists, marking each as `adopted`. Then the pipeline phases
   run for the missing categories only, with `some_phases` skipping the rest. Needs a tool or skill step; not built.
2. **Use focus only.** Skip the pipeline: `one_feature` with a focus, tools called directly. Works today, no story check.
3. **Relax `phase_check start`** when the scope says `adopted`. Weakest: the later phases then read sections that don't describe the module.

## 6. Build order (all built 2026-11-09 except the live test with a hand-built module)

For an existing module the user-facing order is: adopt (§5.1) → review as built (§4) → user picks gaps → guided fill. Build order for the tools:

1. `focus` field and the guide table (§2) returned by `set_project_scope`.
2. The intake wording in `module-explorer` and `create-adventure` (one shared step), and a one-line "ask first if no scope" in `nwn-logic-debug` and `quest-explorer`.
3. The audit as one read-only tool (`audit_module`) returning the §4 table, so the report cannot drift from the steps.
4. The adopt step (§5.1).
5. Live test of 1-4 on `the-salt-gate-conspiracy.mod` (built, but treat as incomplete), then the same on a hand-built module.
6. Tie in TODO #23: the scope record carries the test goal and the run's report is judged against it.
