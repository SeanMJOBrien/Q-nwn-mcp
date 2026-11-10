# Modules as projects (TODO #29, work-plan B1)

Status: design. **Decisions D1-D3 below are the recommended answers and are provisional until the user confirms them.** No code is written for this yet (B2-B6).

## Problem

- The working copy of a module is the extracted `.mod` in the temp dir, repacked after most edits. A reload re-extracts and reverts unpacked edits; direct `nwn_gff` edits and MCP tools overwrite each other (see `pitfalls.md`).
- `adventures/<Title>/` holds only the story files. Hand patches to generated scripts (Salt Gate: `inc_cre_level`, `inc_qsalt_ret`, `c_qret_*`, `a_qret_give`) live only in the temp dir and would be lost if a generator ran again.
- User rule (2026-11-09): a module is a project the user can open; the `.mod` is a build product made only when the user asks.

## Decisions

- **D1 pack step:** the nim tools (`nwn_erf`, `nwn_gff`) already wrapped by this server. The layout stays nasher-compatible so `nasher pack` also works.
- **D2 source of truth:** the JSON project. The temp dir is a cache built from it. Direct edits go to the JSON files.
- **D3 live verification:** `run_live_verification` may build a throwaway `.mod` without asking; it is never sent to the user.

## Layout

```
adventures/<Title-With-Dashes>/
  adventure.md  dm-guide.md  adventure-status.json  project-scope.json   (existing story files)
  nasher.cfg
  src/
    are/<resref>.are.json   git/<resref>.git.json   gic/<resref>.gic.json
    utc/ uti/ utp/ utd/ utt/ utw/ uts/ ute/ utm/    blueprints, one JSON file each
    dlg/ jrl/ fac/ ifo/                              dialogs, journal, factions, module info
    nss/<resref>.nss                                 scripts (the .ncs are build output, not stored)
```

Each GFF resource is the `nwn_gff` JSON form (`-k json -p`, pretty, stable key order) so diffs show which field changed. Non-GFF resources (2DA, TLK, models) are stored as-is under `src/other/`.

## When the project is written

- `export_project` writes the whole loaded module (B2).
- After each mutating tool, the changed resource is flushed to the project (B4: `jsonToGff` and `writeAndCompileScript` already mark dirty state; they gain a flush). A `flush_project` call exists for a bulk catch-up.
- `adopt_module` writes the project from a `.mod` (B6).

## How a session resumes

`load_module` accepts a project directory: it packs `src/` into the temp `.mod` with the nim tools, then runs the normal load (B3). No reliance on `/tmp` surviving. The old rule "never reload between an edit and a repack" disappears for projects because edits are already in the project.

## Build and verification

- `repack_module` becomes "build": pack the project to a `.mod`. Run only when the user asks. Skills offer it when the work looks complete (B5); nothing is sent automatically.
- `run_live_verification` builds a throwaway `.mod` into the verify server (D3).

## Files changed on disk

At write time record size and mtime of each temp file. Before the next write of that resource, if the file changed underneath, refuse and name the fix ("reload from the project") (B4). Direct edits are made to the project JSON, then `load_module` rebuilds the cache.

## Hand-edited generated scripts

A generated include that a person patched starts with `// hand-edited: <reason>`. Generators (`create_*_system`, `create_creature_level_system`, quest runtime) refuse to overwrite a file with this header unless `force: true`, and say which header line blocked them. `verify_all`'s stale-script check (`generated_script_stale`) skips marked files and reports them as `hand_edited` info.

## Packages

B2 `export_project` (round trip byte-identical after repack) · B3 load from project · B4 keep in step, detect external changes · B5 rewrite the repack/send rules in CLAUDE.md, `module-explorer`, 13 skills and the `feedback_send_module_after_repack` memory · B6 `adopt_module` writes the project; migrate Salt Gate (backup of its temp dir already at `adventures/The-Salt-Gate-Conspiracy/temp-backup/`).

## Open questions

- Size: a module's JSON can be tens of MB; confirm acceptable for a git-ignored folder (it is not committed to this repo).
- Whether the project folder gets its own git repo (the older per-module-git TODO): recommended yes, created by `export_project`, committing after each build.
