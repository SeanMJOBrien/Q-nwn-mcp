# Build checklist: one module, start to finish

A form any model (or person) can follow to build an adventure module with nwn-mcp, one small step at a time.

**With the MCP connected, do not fill this by hand: call `get_progress`.** It ticks every line below from the module's real
state, saves the filled form as `adventures/<Title>/<Title>-progress.md`, and answers with the one next step and its
exact call. Call it at the start of every session, after every step, and whenever unsure what to do. `get_progress(note:
"...")` adds a line to the form's Notes (decisions, things to ask the user) so the next session knows them.

Copy this blank form only for a client that cannot call `get_progress`. Keep one copy per module, tick a line only after
checking the module (`get_module_summary`, `list_areas`, `visualize_area`), never because a step "should" have worked.

How to work through it:
1. Do the **first unticked line** only. Each line names its call.
2. When a line is the first of a phase, read `get_phase_prompt(phase: "<phase>")` first (short, under 4 KB).
3. A tool that answers `isError` / `success: false` says which argument to change. Change it; do not repeat the same call.
4. Numbers and lists can be values or text: `width: 16` and `width: "16"` both work.
5. Never build the `.mod` (`repack_module`) unless the user asks.

---

Module: ______________________   Folder: `adventures/______________________/`

## Start
- [ ] Module created and loaded: `create_module(name: "...", filename: "...")` (a new adventure is always its own module)
- [ ] The user's goal recorded: `set_project_scope(kind: "whole_adventure", scope: "<their words>")`
- [ ] Story file has a `## Module` section (title, level, party size): `write_story_section(section: "Module", text: "...")`

## Plot — `get_phase_prompt(phase: "plot")`
- [ ] `## Plot` written with locations (each with a **Resref** and **Tileset**), connections, key NPCs, quests: `write_plot(spec: "{...}")`
- [ ] `phase_check(phase: "plot", step: "end")` passes

## Areas — `get_phase_prompt(phase: "areas")`  (repeat the three lines for each location)
- [ ] Location ____________: `suggest_area_size(...)`, then `create_area(resref, name, width, height, tileset)`
- [ ] Terrain laid out: `adventure_generate_layout(tileset, width, height, style)` → `adventure_apply_layout(area: "<resref>", layoutId: "<returned id>")` (`area` is the resref, never the layoutId; create the area first)
- [ ] Each connection in the plot has a door or transition: `link_doors(...)` / `adventure_create_transition(...)`
- [ ] Module start in the first story area, `_start` removed: `set_module_start(area, x, y)`
- [ ] `## Areas` written, `phase_check(phase: "areas", step: "end")` passes (every area reachable)

## Environment — `get_phase_prompt(phase: "environment")`
- [ ] Each area dressed (at least 5 props): `place_placeable(...)` after `probe_ground(...)`
- [ ] Each area has map pins at its doors, shops, quest givers and destinations: `place_waypoint(..., mapNote: "Keep Door")`
- [ ] Each fight area has a container for loot; every container the `## Environment` section names is placed
- [ ] `## Environment` written, phase check passes

## Actors — `get_phase_prompt(phase: "actors")`
- [ ] Each key NPC placed in their location: `build_key_npc(...)` or `build_creature(spec: "{...}")`
- [ ] `## Actors` written, phase check passes

## Quests — `get_phase_prompt(phase: "quests")`
- [ ] Each quest built (journal, dialog lines, stages, rewards): `build_quest(spec: "{...}")`
- [ ] `verify_quest_completability` clean, `## Quests` written, phase check passes

## Challenges — `get_phase_prompt(phase: "challenges")`
- [ ] Each fight location has enemies: `suggest_encounter(...)`, `place_creature` / `place_encounter`
- [ ] Each boss the `## Challenges` section names is placed and hostile: `build_key_npc(..., faction: "hostile")` / `compose_encounter(...)`
- [ ] Each trap it names is placed with its save: `place_trigger(...)`, `add_skill_check(..., kind: "trigger")`
- [ ] `## Challenges` written, phase check passes

## Affordances — `get_phase_prompt(phase: "affordances")`
- [ ] The merchant's store placed (when the plot has one): `create_store_blueprint(...)`, `place_store(...)`
- [ ] Loot in at least one container per area (not the boss room: rewards fills it): `add_items_to_container(...)`
- [ ] Every store and container loot the `## Affordances` section names is in the module
- [ ] `## Affordances` written, phase check passes

## Polish — `get_phase_prompt(phase: "polish")`
- [ ] `verify_all()` shippable (0 errors); `## Polish` written; phase check passes

## Rewards — `get_phase_prompt(phase: "rewards")`
- [ ] DM guide: `write_dm_guide(text: "...")`
- [ ] DM area with the story and DM-guide books: `create_dm_area()`
- [ ] `## Rewards` written, phase check passes

## Ship
- [ ] Offer to build the `.mod`; build with `repack_module()` only on the user's yes

## Notes
(decisions, open questions, what to ask the user)
