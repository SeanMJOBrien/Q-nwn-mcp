# Quest system (`build_quest`; `docs/quest-system.md`)

- Standard path: `create_quest_system` once, `build_quest(spec, dryRun)` per quest, `remove_quest`. Source `src/util/quest-{spec,builder,script,vars}.ts`, `src/tools/quest-tools.ts`. Specs saved as `quests/<tag>.json` in the project; unknown spec fields refused.
- Ported from TFN `inc_quest.nss`/`dlg_q_*` + the TFN studio runtime, but vanilla: state = engine `NW_JOURNAL_ENTRY<tag>` (no SQLite/NWNX); whole party: any member's advance moves every journal and pays every player 100 %. Variable contract `questK = "<stage>_<tag>"`.
- Dialog lines use `q_chk`/`q_act` with script parameters; skill checks roll once in `q_roll` (an action, not a condition). Lines merge into existing NPC dialogs.
- Event stages: every event script goes through `QuestEventAdvance`; options `early` (deed before the stage counts: `QuestRecordEarly`/`QuestCatchUp`), `none` ("not yet" line), `respawn`, `marker` (map note), `check.retry`; `event: true`, `giveItem`.
- `verify_journal`/`verify_quest_completability` read quest variables (`quest-vars.ts`). Simulation-tested on the engine (Quest Test Range 14/14); real conversation flow needs a game client.
- No-LLM front ends: `node dist/cli/quest.js build|remove|schema|normalize` (`docs/quest-cli.md`), also on a flat nasher source dir (`--out`, `--no-compile`). Q-nwn-manager console Quests page and TFN Content Studio Module Quests page draw forms from `docs/quest-spec.schema.json` (`npm run quest:schema` after changing `QuestInput`).
- Modules using Knat's PQJ library (`pqj_inc.nss`) wrap `AddJournalQuestEntry`: verify tools report false positives there (skills `quest-explorer`, `quest-params`).
- Co-op rules for quest scripts: `mem:domain/coop`.
