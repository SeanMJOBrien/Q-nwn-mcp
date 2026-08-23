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
  objects as a warning worth flagging even if not asked.
- `resolve_2da`, `resolve_tlk`, `resolve_blueprint`, `search_2da` — resolve
  what a raw 2DA row index / STRREF / template ResRef actually means before
  reasoning about it as a bare number.

## Editing workflow

1. Make the edit with the targeted tool (`place_*`, `move_object`,
   `remove_object`, `modify_gff_field`, `edit_dialog_node`,
   `set_area_properties`, etc.). Bulk variants (`bulk_move_objects`,
   `bulk_remove_objects`) exist for multi-object operations — prefer them
   over looping single-object calls.
2. **Always call `repack_module` after edits so the user can see them in
   the toolset** — edits are held in the in-memory index until repacked.
   Mention that you repacked.
3. If something goes wrong, `undo_last_change` / `undo_history` roll back
   in-memory edits made this session — they do not un-repack an already
   written `.mod` file.
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

## Scope

Base tools operate on **instanced content placed in areas** (GIT contents),
dialogs, journals, factions, blueprints, and scripts. Deep 2DA/ruleset
authoring and palette-level tileset changes are out of scope for editing
(read-only inspection via `list_2da_tables`/`search_2da` is fine).
