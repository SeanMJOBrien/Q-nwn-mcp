# Quest CLI (no LLM, no MCP client)

`build_quest` is deterministic; an LLM only ever wrote the spec. The CLI runs the same code from a script, a form or CI.

```
node dist/cli/quest.js build  <spec.json> --project <module project dir | .mod> [--dry-run]
node dist/cli/quest.js remove <quest tag>  --project <module project dir | .mod>
node dist/cli/quest.js schema
node dist/cli/quest.js normalize <spec.json>
```

- Needs the same environment as the server: `NIM_FOLDER_NWTOOLS`, `NWN_FOLDER_DATA`, `NWN_FOLDER_USER`.
- stdout is one JSON document, `{"ok":true,"result":...}` or `{"ok":false,"error":"..."}`; exit 0 on success. Progress lines go to stderr.
- `--dry-run` returns the plan (stages, slots, rewards, notes) and changes nothing. Always show it before the real build.
- A **project directory** is edited in place (journal, dialog, blueprints, `.git`, scripts under `src/`); no `.mod` is built.
  A `.mod` is edited in the temp dir only and is not repacked by the CLI.
- `schema` prints `docs/quest-spec.schema.json`, generated from `QuestInput` in `src/util/quest-spec.ts` by `npm run quest:schema`
  (rerun it when the spec types change). Forms and validators should read it instead of copying the field list.
- The spec fields are documented in `docs/quest-system.md`. Targets the vanilla whole-party model; TFN needs its own backend
  (`docs/tfn-quest-findings.md`).
- `normalize` prints the spec with templates expanded, stages numbered, `from`/`end` defaulted and rewards sized (no module needed). The TFN Content Studio
  translates that into TFN's quest model (`tfnstudio/questbridge.py` there), so templates are expanded once, here.
