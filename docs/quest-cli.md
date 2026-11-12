# Quest CLI (no LLM, no MCP client)

`build_quest` is deterministic; an LLM only ever wrote the spec. The CLI runs the same code from a script, a form or CI.

```
node dist/cli/quest.js build  <spec.json> --project <module project dir | source dir | .mod> [--dry-run] [--out <dir>] [--no-compile]
node dist/cli/quest.js remove <quest tag>  --project <module project dir | source dir | .mod> [--out <dir>]
node dist/cli/quest.js schema
node dist/cli/quest.js verify <tag> --project <dir|.mod|source dir>
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
- `normalize` prints the spec with templates expanded, stages numbered, `from`/`end` defaulted and rewards sized (no module needed). The TFN Content Studio
  translates that into TFN's quest model (`tfnstudio/questbridge.py` there), so templates are expanded once, here.

## One-file bundle (2026-11-12, decision D1)

`npm run quest:bundle` writes `bundle/quest-cli.mjs` (git-ignored; esbuild, the quest schema inside, about 1.6 MB). It runs with
Node 20.11+ alone: `node quest-cli.mjs build|remove|verify|normalize|schema ...`, same commands and JSON as `dist/cli/quest.js`.
Q-nwn-manager vendors it as `nwn-tools/quest-cli.mjs`; refresh that copy after changing the builder (copy the new file over it,
run the manager's tests). `quest-source.live.test.ts` runs the whole flow through `dist` and through a copy of the bundle in a
folder with no `node_modules`. Only the quest paths are meant to work from the bundle: files the server reads beside its own
code (`templates/`, `data/`, `nwscript-override/`) are not packed, which the quest commands never need.
