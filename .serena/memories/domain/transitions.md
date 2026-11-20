# Area transitions, connectivity, traps

- `link_doors`: bidirectional door-to-door.
- `create_area_transition`: one-way trigger (Type 1, LinkedToFlags 2 = waypoint) + waypoint in the target; call twice for two-way.
- `adventure_create_transition`: bidirectional portal used by `/create-adventure` (instead of `create_area_transition`): useable `plc_solblue` light + landing waypoint at both ends (same coordinates), OnUsed dialog "Step through?"/"Turn away", VFX then jump after 2 s. Without coordinates it uses open ground; without a tag it makes a unique one; a tag in use is refused (scripts/dialogs/waypoints would be shared; names cut to 16 chars).
- Preference order in skills: doors, then trigger volumes, then portals (`area-connections` skill). Door/trigger GFF fields: `../nwn-tools/AREA_TRANSITIONS.md`.
- `check_area_connectivity`: BFS from the module start via linked doors/triggers (`buildTagToAreaMap`/`buildAreaTransitions` in `tileset-tools.ts`). The DM area is disconnected by design. Walking reachability inside areas: `check_path`.
- `set_module_start(area, x?, y?)`: open ground nearest the centre (clear 3/2/1 m), removes the `_start` stub unless used.
- Traps: `create_trap_blueprint` (UTT with `TrapDetectDC`, `TrapDisarmable`, `TrapFlag`, `TrapOneShot`, default square geometry; `scriptOnEnter` optional), place with `place_trigger`, effect via `add_skill_check` (party-wide save + damage dice), no trap script. `build_trap(area, kind)` does all three.
