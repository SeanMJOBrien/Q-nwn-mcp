# Quest CLI (no LLM, no MCP client)

`build_quest` is deterministic; an LLM only ever wrote the spec. The CLI runs the same code from a script, a form or CI.

```
node dist/cli/quest.js build  <spec.json> --project <module project dir | source dir | .mod> [--dry-run] [--out <dir>] [--no-compile]
node dist/cli/quest.js remove <quest tag>  --project <module project dir | source dir | .mod> [--out <dir>]
node dist/cli/quest.js schema
node dist/cli/quest.js verify <tag> --project <dir|.mod|source dir>
node dist/cli/quest.js version
node dist/cli/quest.js normalize <spec.json>
```

- Needs the same environment as the server: `NIM_FOLDER_NWTOOLS`, `NWN_FOLDER_DATA`, `NWN_FOLDER_USER`.
- stdout is one JSON document, `{"ok":true,"result":...}` or `{"ok":false,"error":"..."}`; exit 0 on success. Progress lines go to stderr.
- `--dry-run` returns the plan (stages, slots, rewards, notes) and changes nothing. Always show it before the real build.
- A **project directory** is edited in place (journal, dialog, blueprints, `.git`, scripts under `src/`); no `.mod` is built.
  A `.mod` is edited in the temp dir only and is not repacked by the CLI.
- A **source directory** is nasher JSON in one flat folder (`<resref>.<ext>.json`, scripts as `.nss`, a `module.ifo.json`): a
  Q-nwn-manager project (its `unpacked/`) or that folder itself. It is read as it is (no `.mod` packed or extracted; a module
  of 8,000 resources plans in about 5 s) and **never written**. `build` and `remove` need `--out <empty dir>`, which receives
  the changed files in the same layout; the result's `source` is `{dir, out, files, removed, compiled}`. The caller applies
  them (Q-nwn-manager's console does, through its edit history, after compiling the staged scripts with its own `nwnsc`).
  `--dry-run` needs no `--out`. Code: `loadSourceDir` in `src/module-loader.ts`, flat sync in `src/util/project-sync.ts`.
- `--no-compile` writes the scripts without compiling them, for a project whose build compiles every script (nasher).
  Without it the scripts are compiled with `nwn_script_comp`, which needs `NWN_FOLDER_DATA`.
- With a source directory only `NIM_FOLDER_NWTOOLS` (for `nwn_gff`) is required. Without `NWN_FOLDER_DATA` the base game is
  not visible: a giver, target or item must then be in the module, and a spawn or kill target cannot be placed by area.
- `schema` prints `docs/quest-spec.schema.json`, generated from `QuestInput` in `src/util/quest-spec.ts` by `npm run quest:schema`
  (rerun it when the spec types change). Forms and validators should read it instead of copying the field list.
- The spec fields are documented in `docs/quest-system.md`. Targets the vanilla whole-party model; TFN needs its own backend
  (`docs/tfn-quest-findings.md`).
- `verify` is read-only (no `--out`): it runs `verify_quest_completability` and `verify_journal` on the target and prints `{tag, name, completable, gaps, stages, questGiver, journal:{errors, warnings}}` for that quest (journal findings that name the tag). Exit code 1 with an error if the module has no quest with that tag. The Q-nwn-manager console calls it after every Build and shows "can be completed" or the gaps.
- `version` prints `{version, schemaHash, bundled}`: the package version and a 12-character hash of the quest-spec schema. The manager compares the hash of its vendored bundle with a Q-nwn-mcp checkout beside it and says when they differ (a stale bundle).
- `normalize` prints the spec with templates expanded, stages numbered, `from`/`end` defaulted and rewards sized (no module needed). The TFN Content Studio
  translates that into TFN's quest model (`tfnstudio/questbridge.py` there), so templates are expanded once, here.

## One-file bundle (2026-11-12, decision D1)

`npm run quest:bundle` writes `bundle/quest-cli.mjs` (git-ignored; esbuild, the quest schema inside, about 1.6 MB). It runs with
Node 20.11+ alone: `node quest-cli.mjs build|remove|verify|normalize|schema ...`, same commands and JSON as `dist/cli/quest.js`.
Q-nwn-manager vendors it as `nwn-tools/quest-cli.mjs`; refresh that copy after changing the builder (copy the new file over it,
run the manager's tests). `quest-source.live.test.ts` runs the whole flow through `dist` and through a copy of the bundle in a
folder with no `node_modules`. Only the quest paths are meant to work from the bundle: files the server reads beside its own
code (`templates/`, `data/`, `nwscript-override/`) are not packed, which the quest commands never need.

## Played on the real engine (T1, 2026-11-12)

`run_live_verification` with `simulate` (docs/player-simulation.md) on a scratch copy of the Sim-Quest module, quest `T1 Parcel`
(`talk` -> `deliver` of a new quest item -> `return`, level 4), built with `build_quest` (the same builder code the CLI and the
manager run; the manager's own file path is covered by `quest-source.live.test.ts` and the browser suite, because an MCP
session cannot load a manager project until P3). Ten steps, all passed, no engine error: offer eligible; accept (stage 1);
offer no longer eligible; hand-in not eligible without the parcel; "lost it" line eligible; parcel given to the player;
hand-in eligible with it; deliver (stage 2, parcel taken); final line (stage 3, 100 gold); thanks line after the end.
Not simulable (they depend on engine events the driver cannot raise): `kill` (`GetLastKiller`), `pickup` (OnAcquireItem),
`explore`/`trigger` (`GetEnteringObject`), `use`/`search` (`GetLastUsedBy`), escort and rescue movement, the dialog engine's
own condition ordering. Those stages are checked statically by `verify_quest_completability` (T2).
Findings while setting it up: an old throwaway module whose manifest named missing scripts packed with a misleading
"cannot open file stream <dir>" (fixed: `load_module` no longer swallows the pack error), and a module whose area list names an
`.are` that is missing fails to load in the engine ("Failed to demand the Area info resource"), which `verify_module_info` already reports (`Mod_Area_list names ... no such .are exists`).
