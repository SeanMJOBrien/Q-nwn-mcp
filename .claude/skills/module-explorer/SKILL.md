---
name: module-explorer
description: Use nwn-mcp to explore, analyze, or edit an EXISTING human-authored NWN module (as opposed to autonomously generating a new one via /create-adventure). Trigger on questions about a .mod's areas, creature/item/dialog/quest content, script wiring, or balance — and on requests to place/move/remove objects, edit dialogs, or fix references in a module someone is actively developing. Covers the base (non-adventure) tool set.
---

# Module Explorer

The `adventure-*` skills in this repo are for **autonomous one-shot module
generation** — a different concern. This skill is for the other design
intent nwn-mcp serves: **AI-assisted work on a module a human is actively
authoring.** The human stays in creative control; you read, analyze, and
make targeted edits on request.

## Ask what the user needs first

Before touching anything, find out what the user is trying to accomplish, then drive it to completion and explain each step (they may not know the tools). For a module that is built but incomplete, call `adopt_module` (writes its story record), then `audit_module` (done / partial / missing per category), and let the user choose which gaps to fill. Find out the purpose: one or two aspects of the module (a dialog, a quest, an NPC, a loot table)? NWScript only? one larger feature? or certain phases of an adventure project? Work only on that, and record it with `set_project_scope` (kind one_feature or nwscript_only, plus `focus`: creatures, scripting, story, areas_encounters, quests_dialog, debug or items; the result is that focus's guide) so later calls and other models see it. If the request is already specific ("fix this script", "add a merchant"), the question is answered; don't ask it again.

## Always load first

Every tool except `load_module` and `create_module` requires a module to
already be loaded (one at a time). If a tool call fails with "no module
loaded," call `load_module` before anything else.

```
load_module("mymodule.mod")                          # resolves via NWN_FOLDER_USER/modules/
load_module("/absolute/path/to/module/mymodule.mod")  # or an absolute path directly
```

Prefer the **absolute path** form for any project that doesn't keep its
`.mod` under a real `NWN_FOLDER_USER/modules/` tree — e.g. a git repo that
stores the packed module at a repo-relative path like `module/hos1.mod`.
`NWN_FOLDER_USER`/`NWN_FOLDER_DATA` may be globally configured to generic
stub/shared locations across many unrelated projects; don't assume a
project's own module lives there.

After loading, call `get_module_summary` once for orientation before diving
into specific tools — cheaper than guessing which area/dialog/faction is
relevant.

## Reading and reasoning about spatial data

**`visualize_area` is the primary instrument for spatial reasoning** — tile
grid, terrain, walkability, zone connectivity, and every placed object with
its position and properties, as canonical JSON. Call it before answering
questions about layout, before deciding where to place a new object, and
before diagnosing pathing/geometry issues (e.g. a trigger that never fires,
a creature that can't reach a waypoint).

**`export_area_report`/`export_module_report` are strictly for human
inspection** — an HTML file for the user to open in a browser. Never read
these to answer a question yourself; use `visualize_area`'s JSON instead.
**Do not export a report proactively** — only when the user explicitly asks
to see one. If you do export one, tell the user you did and where it went.

## Consistency and impact-analysis tools

Reach for these instead of manually cross-referencing GFF fields:

- `validate_module` / `find_orphans` — broken references (missing scripts,
  dialogs, items, dangling door links) across the whole module. Run after
  any bulk edit or before telling the user a change is "done."
- `verify_quest_completability` — trace whether a journal quest's stages are
  actually reachable given current dialog/script wiring.
- `get_balance_report` — item/creature stat outliers.
- `find_variable_usage`, `find_strref_usage`, `find_dialog_scripts`,
  `list_script_references`, `get_dependency_graph` — what touches a given
  local variable, TLK string, or script **before** you rename/remove it.
  Duplicate `Tag` values are a classic silent-bug source (`GetObjectByTag`
  hitting the wrong object) — `visualize_area`'s object list plus
  `search_by_tag` will surface these; treat repeated tags across placed
  objects as a warning worth flagging even if not asked. Found one to fix?
  `rename_tag(oldTag, newTag, dryRun)` renames it across every GFF resource
  **and** every NWScript source file in one pass — always `dryRun: true`
  first and read the affected list before committing to the real rename.
- `resolve_2da`, `resolve_tlk`, `resolve_blueprint`, `search_2da` — resolve
  what a raw 2DA row index / STRREF / template ResRef actually means before
  reasoning about it as a bare number.

## Editing workflow

1. Make the edit with the targeted tool (`place_*`, `move_object`,
   `remove_object`, `modify_gff_field`, `edit_dialog_node`,
   `set_area_properties`, etc.). Bulk variants (`bulk_move_objects`,
   `bulk_remove_objects`) exist for multi-object operations — prefer them
   over looping single-object calls.
   - A `create_*_blueprint` family builds new standalone resources rather
     than editing placed ones — e.g. `create_encounter_blueprint` builds a
     `.ute` encounter (creature spawn list, difficulty, respawn behavior)
     ready for `place_encounter`. `sourceResref` clones an existing
     blueprint as a starting point instead of building from scratch.
   - Dialog nodes (`create_dialog`, `add_dialog_node`, `edit_dialog_node`) take EE script parameters:
     `params` (the node script's ActionParams) and `conditionParams` (the condition on the link to the node),
     each a JSON object of key → value read with `GetScriptParam`, so one generic script can serve many
     nodes. `quest` + `questEntry` make the node advance that journal stage itself, with no script.
     Dialog rule: branches return to the NPC's main options and only an exit reply ends the conversation. `create_dialog`
     does this by default (`end: true` on a line keeps it terminal); `add_dialog_return_links` fixes an existing dialog,
     and `verify_dialog` warns `dialog_branch_ends` / `dialog_no_exit_reply`. Hand-added nodes need the links too.
   - `export_resource(resref, type, outputPath)` pulls one resource out of
     the loaded module to a real file on disk — for handing a single
     `.uti`/`.dlg`/`.nss`/etc. to the user, or round-tripping it through an
     external tool. It reads from the in-memory index, not the packed
     `.mod` directly, so it reflects edits already made this session even
     before the project is next built.
   - For local variables (VarTable entries) on a creature, placed object, or
     blueprint, use `get_object_variables`/`set_object_variables`/
     `remove_object_variable` instead of `modify_gff_field` — VarTable is a
     list, which `modify_gff_field` explicitly refuses. Each of these three
     tools targets **either** a placed instance (`area` + `tag`, or `area` +
     `listName` + `index`) **or** a standalone blueprint resource (`resref` +
     `blueprintType`) — never both at once, and a placed instance's VarTable
     is a separate copy from its blueprint's (see the "separate copy"
     pitfall in this project's CLAUDE.md), so pick the one that actually
     matters for the edit at hand.
2. **Edits are saved to the module project automatically** (`adventures/<Title>/`, see
   `docs/module-projects.md`). Do not build the `.mod` with `repack_module` after each
   edit; build it only when the user asks, and when the work looks complete offer to
   build it. Send the `.mod` to the user only after they accept the build.
3. If something goes wrong, `undo_last_change` / `undo_history` roll back
   in-memory edits made this session — they do not undo an already
   built `.mod` file.
4. Re-run `validate_module` after a nontrivial edit before calling the task
   done.

## Script editing

`read_script_source` / `write_script` / `compile_script` /
`disassemble_script` operate on the module's own `.nss`/`.ncs` resources
through nwn-mcp's index — a **separate pipeline** from any project-specific
build tooling (e.g. a repo's own `nwnsc`-based build script). Don't conflate
the two: editing a script through nwn-mcp and repacking updates the loaded
`.mod` directly; it does not update that project's own tracked source files
on disk unless the project's source **is** the module (check whether the
repo has separate `.nss` files under version control before assuming
nwn-mcp's copy is the authoritative one).

## NPC feat packages (packages.2da FeatPref2DA tables)

- `generate_weapon_packages(meleeTemplate, rangedTemplate?, classId, outDir, prefix?, weapons?, skillPref?, startRow?, labelPrefix?, descriptionStrref?)` — one package per weapon from a template (e.g. `NPCpackages/gackftfighta.2da` melee, `gackftfightg.2da` ranged). Swaps the seven `baseitems.2da` weapon feats; ranged weapons get Focus/Specialization/Improved Critical and, for crossbows, Rapid Reload; a weapon the class isn't automatically proficient with gets that proficiency first (Exotic Weapon Proficiency for bastard sword, katana, double weapons…); feats the class can never take are dropped. Writes `<prefix><weapon>.2da` plus a `packages_class<N>_weapons.2da` row file to append to `packages.2da`.
- `sanitize_feat_package(file, classId, outFile?)` — drops feats a class can never take (not on its feat list, tied to another class, or behind an unavailable prerequisite) and adds the package weapon's missing proficiency.
- 2DAs only load from a HAK or the override folder, not from inside a module. Pass the package row to `LevelUpHenchman`'s `nPackage` argument, or set it as the creature's `StartingPackage`.

## Scope

Base tools operate on **instanced content placed in areas** (GIT contents),
dialogs, journals, factions, blueprints, and scripts. Deep 2DA/ruleset
authoring and palette-level tileset changes are out of scope for editing
(read-only inspection via `list_2da_tables`/`search_2da` is fine).

## Small repair tools

- `move_store_item(item, resref | area+tag, toCategory?)` puts a store item in the right tab (default: its baseitems `StorePanel`); fixes `store_item_miscategorized`.
- `clear_footprint(area, x, y, width, height, tileId?)` overwrites a rectangle with one tile before repainting a group there, so nothing from an earlier `paint_group` is left behind.
- `bulk_modify_list(resource, type, listPath, where?, set, dryRun?)` sets the same scalar fields on every matching struct of one list (a faction flip across `Creature List`); edits a copy and commits only if every change applied.
- `verify_creature` warns `lootable_flag_off` for a geared, class-based creature with `Lootable` 0 and no `LOOT_INTENTIONAL`.
- After `adopt_module`, `audit_module` returns `fillIn`: every `(not recorded)` story field with its heading. Ask the user for each in their own words, or offer a draft derived from the module's dialogs and journal and write it only if they accept; never invent it.
