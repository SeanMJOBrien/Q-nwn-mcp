# Module pipeline and server internals

- Load: `.mod` -> `nwn_erf` extract -> temp dir (`MCP_FOLDER_TEMP`) -> `nwn_gff` each GFF -> JSON -> `ModuleIndex` (tags, scripts, areas, dialogs, creatures, items; `parsedGff` cache). Save: JSON -> `nwn_gff` -> `nwn_erf` repack. `load_module` also takes a project folder or (CLI) a flat nasher source dir (`loadSourceDir`, read-only, changed files to `--out`).
- Temp dir holds cache subdirs (`resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/`); `erfPack` skips them (`isFile` filter).
- Project sync (`src/util/project-sync.ts`): writes go through `beforeWrite`/`afterWrite`, deletions through `removeResource` (prunes the project at once). Raw `fs` writes to the temp dir are refused by `project-sync-guard.test.ts` unless listed with a reason. Project files are watched: a file changed on disk outside the server blocks writes until `load_module(<project>, force: true)`.
- Round trip GFF->JSON->GFF is JSON-equal and idempotent, not byte-identical (field order of toolset-written files is not recorded).
- Blueprint resolution: module `parsedGff` -> module files -> resman (base game/HAKs, 120 s timeout); always deep-cloned before mutation. Resman calls are slow (full stack init each time).
- `list_blueprints`: resref substring, binary content (tags/names), TLK names; cached in `blueprint_cache/`.
- Walkmesh cache `wok_cache/`: lazy via `ensureWokCacheDir()`; reset on `load_module` (`setWokCacheDir`). Never create it by hand.
- Undo: `snapshotGitForUndo()` before each GIT mutation, `popUndo()`; max 50; tools `undo_last_change`, `undo_history`. Phase rollback: `bulk_remove_objects` by tag pattern.
- `writeBackGit()` syncs the GIC (toolset index); `syncGic` keeps existing entries/comments, only appends or trims.
- Tool organisation: base tools `src/tools/*.ts`; adventure tools `adventure-tools.ts` (`adventure_create_transition`, `adventure_find_walkable`, `adventure_generate_layout`, `adventure_apply_layout` (layouts by `layoutId`), `adventure_list_features`, `set_module_start`).
- In-process tool calls: `recordTools` keeps every handler; `callTool(name, args)` (`src/util/tool-registry.ts`). Result contract (`src/util/tool-result.ts`): JSON `success:false`/`ok:false`/`error` -> `isError` (check tools excepted); `failResult(error, {field, valid, next})`; create-of-existing -> `alreadyExistsResult`.
- Spatial payload: `visualize_area` JSON is the LLM's primary area view; HTML exports are for humans only.
- Scope: non-PW modules (single-player, small co-op); content = placed instances (GIT). Blueprint/palette/2DA authoring out of scope.

Layout generator details: `mem:architecture/layout_generator`. Tile solving: `mem:architecture/tile_solver`.
