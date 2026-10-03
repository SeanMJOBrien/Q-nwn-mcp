---
name: nwn-readonly-getters
description: Use when listing or inspecting module/area content without editing it — creatures, items, stores, encounters, sounds, waypoints, faction membership, local variables — or when sanity-checking module info (.ifo) or the faction table itself, or searching for a GFF field by name across every resource. Trigger on "list all creatures/items/stores in this area", "what's in this faction", "get details for this creature", "what variables are set on this", "check module info", "check the faction table", "find every field named X", or requests touching list_creatures/get_creature_details/list_items/list_stores/get_area_encounters/get_area_items/get_area_sounds/get_area_waypoints/get_faction_creatures/get_object_variables/search_by_field/verify_module_info/verify_faction.
---

# Read-Only Getters

A family of simple, consistent read-only tools over GIT/blueprint content.
Shape is uniform: most take an `area` resref and return a JSON array of that
area's objects of one kind; a few are module-wide.

| Tool | Scope | Key params |
| --- | --- | --- |
| `list_creatures` | module (or one area) | `area?` |
| `get_creature_details` | one creature | `tag` **or** `area` + `index` (mutually exclusive lookup modes) |
| `list_items` | module | — |
| `list_stores` | module | — |
| `get_store_details` | one store | `resref` |
| `get_area_encounters` | one area | `area` |
| `get_area_items` | one area | `area` |
| `get_area_sounds` | one area | `area` |
| `get_area_waypoints` | one area | `area` |
| `get_faction_details` | module | — (factions + reputation matrix) |
| `get_faction_creatures` | module | `factionId` |
| `get_object_variables` | one placed instance or blueprint | `area`+`tag` **or** `resref`+`blueprintType` |
| `search_by_field` | module | `fieldName`, optional `value` |

## `get_object_variables` has a write-tool counterpart, and two target modes

`get_object_variables` is read-only, but `set_object_variables` and
`remove_object_variable` (module-explorer skill) exist for editing the same
data — all three share the same targeting params. Pass **either** a placed
instance (`area` + `tag`, or `area` + `listName` + `index`) **or** a
standalone blueprint resource (`resref` + `blueprintType`), never both — a
placed instance's VarTable is a separate copy from its blueprint's, so
reading/editing one never reflects the other.

## `get_creature_details`'s two lookup modes

Pass **either** `tag` (searches every area's GIT for a matching creature
tag) **or** `area` + `index` (direct index into that area's `Creature List`)
— not both. Tag lookup is usually what you want; use the index form only
when you already have an index from another tool's output (e.g.
`list_creatures`) and want to skip the tag search.

## All of these read live GIT state — but check before relying on that for a new tool

`list_creatures` and `get_faction_creatures` both re-walk every area's GIT
on every call rather than reusing a load-time snapshot — this matters
because a creature placed or moved earlier in the same session is visible
immediately, not just after a reload. This wasn't always true:
`get_faction_creatures` used to read a stale `index.creatures` array built
once at `load_module` time (the exact bug `list_creatures` had already been
fixed for) and was corrected to match. If you add a new area-scoped getter,
follow `list_creatures`'/`get_area_encounters`' pattern — read
`index.parsedGff.get(`${area}.git`)` directly — rather than any cached
`index.creatures`/`index.items`-style array, which may not reflect
mid-session edits.

## `verify_module_info`

Not a getter, but belongs in the same "inspect before you trust it"
category: checks the module's `.ifo` — that the entry area exists and the
entry position falls inside its bounds, that `Mod_Area_list` matches the
actual `.are` resources present, and that every module-level event script
(`OnModuleLoad`, `OnClientEnter`, etc.) resolves to a real script resource.
Run it after any edit that touches module-level scripts or the area list
(e.g. `delete_area`, `create_area`, `set_module_scripts`) — those are the
edits most likely to leave `.ifo` pointing at something that no longer
exists, and nothing else in the toolset catches that class of error.

## `verify_faction`

Same category: checks the module's `.fac` — that every reputation entry
references a real faction and every reputation value is in range. Run it
after `create_faction`/`set_faction_reputation` (both already call it as
their own last step, but it's worth re-running after any direct edit to
the faction table too) and before trusting a faction-driven combat/dialog
decision in a module you didn't build this session.

## `search_by_field`

Not scoped to one object type — searches every parsed GFF resource in the
module (blueprints and placed instances alike) for a field name, optionally
narrowed by value: `search_by_field({ fieldName: "ChallengeRating" })` finds
every struct carrying that field, module-wide. Reach for it when you need
"every creature with X field set to Y" and don't already know which area or
blueprint to look in — `get_area_*`/`list_*` are cheaper once you do.

## Workflow

1. Prefer the module-wide list tool (`list_creatures`, `list_items`,
   `list_stores`) for a first pass, then narrow with the per-area or
   per-object getter once you know what you're looking for — cheaper than
   calling the narrow getter repeatedly while exploring.
2. These tools return flat JSON, not the GFF struct shape — don't expect
   `.value`/`type` wrappers here like you'd see from `get_dialog_tree` or
   `modify_gff_field`; the getters already unwrap that for you.
3. Run `verify_module_info` after any module-level script or area-list
   change, same as you'd run `validate_module` after a bulk content edit.
