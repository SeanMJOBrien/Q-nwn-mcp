---
name: moonglow-plugins
description: Run Moonglow Toolset plugins (NESS spawn points, TFN quest builder) on the loaded module with moonglow_list_plugins / moonglow_run_plugin. Use when the user wants a NESS spawn point/waypoint, or to build or import a TFN quest.
---

# Moonglow plugins

Moonglow Toolset plugins (Luau, in the fork's `plugins/` folder) edit the module through `mg plugin run`.
Setup: `MOONGLOW_BIN` = the `mg` executable (default `mg` on PATH), `MOONGLOW_PLUGINS` = the plugins folder.

## Workflow

1. `load_module`, then `moonglow_list_plugins` — note the command ids.
2. `moonglow_run_plugin` **without** `dryRun` first. It reports the resources it would edit and logs warnings (for example "height guessed"). Nothing changes.
3. Read the result, then run again with `dryRun:false`. All edits apply together or not at all.
4. Edits are saved to the project. After a real run GFF content is refreshed (`get_resource` sees it) but `list_creatures`, `get_area_*` and other summaries are stale until `load_module` on the project directory with `force:true`.

## Answering the plugin's menus

A command's menus become form fields. Pass `answers` as `{fieldId: value}`; unnamed fields take their defaults. A misspelled id or out-of-range value is an error and nothing is saved. Files a plugin asks for go in `files`, in order. Confirmations are "no" unless `yes:true`.

## Plugins

- `ness.spawn-points` — `new-spawn`, `edit-spawn`: NESS v8 `SP_…` waypoints (all flags, with validation). Check `ness-names`.
- `tfn.quests` — `new-quest`, `import-quest` (`--file` a Content Studio `specs/quests/TAG.json`), `remove-quest`. Check `quest-wiring`. A full scan of The Frozen North takes about 35 s.
