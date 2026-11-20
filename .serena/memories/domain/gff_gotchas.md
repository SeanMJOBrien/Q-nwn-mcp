# GFF data and tool-call gotchas (full record `docs/pitfalls.md`)

GFF model
- Fields are type-wrapped `{type, value}`. Helpers `src/types/gff.ts`: `getFieldStr`, `getFieldNum`, `getFieldLocStr` (lang 0), `getFieldLocStrResolved` (`[TLK:N]` via lookup), `getFieldList`, `setField`, `setFieldNum`, `setFieldStr`. `GffObj = Record<string, unknown>`.
- `GIT_STRUCT_ID` (`config.ts`): CREATURE 4, WAYPOINT 5, SOUND 6, ENCOUNTER 7, DOOR 8, PLACEABLE 9, STORE 11, TRIGGER 1.
- GIT list names: `TriggerList`, `SoundList`, `StoreList`, `WaypointList` (no space); `Creature List`, `Door List`, `Encounter List`, `Placeable List` (space).
- Area local variables live in the `.git` top-level `VarTable` (engine ignores an `.are` VarTable); area event scripts are `.are` fields.
- Trigger geometry vertices need struct ID 3 (encounters 1) or the engine never detects entry. UTT blueprints have no geometry: placed triggers need a `Geometry` list (>= 4 vertices).
- A placed instance's fields (VarTable, SoundSetFile, ...) are a separate copy from its `.utc`: an edit after placement must go to both.
- Equipped item resref field is `TemplateResRef`. Dialog `condition` goes on the link pointing to the node (`Active`).
- Custom factions work only in the toolset's RepList row layout (`src/util/faction-replist.ts`, `verify_faction replist_layout`).

Workflow gotchas
- Never `load_module` a plain `.mod` between an edit and its repack (re-extracts, reverts edits; refuses without `force`). Loading the project folder is safe.
- Don't mix direct `nwn_gff` disk edits and MCP tools on one resource in a session (tools write stale in-memory GIT back). Tools first, direct edits last; or use `node dist/cli/tool.js`.
- Never pass `{}` as `server.tool()` annotations (`tool-registration-shape.test.ts`).
- `modify_gff_field` only for flat scalars; typed tools for dialogs/lists/structs.
- `write_script(compile: true)` races: `compile: false` then `compile_script`. `nwn_script_comp` source is positional (last), not `-i`.
- Numeric params `z.string()` + `toF/toI` (SDK validates JSON Schema before zod transforms); complex params `z.string()` + `JSON.parse`. `withLenientArgs` (`src/util/lenient-args.ts`) widens strings to accept numbers/booleans/arrays/objects and refuses unknown argument names.
- `validate_module` false positives for base-game scripts/items (`nw_c2_default5`, `nw_wblms001`): runtime-resolved.
- Third-party scripts (`nw_*`, `x0_*`, `x2_*`, `dmfi_*`, `nwnx_*`): confirm provenance before editing.
