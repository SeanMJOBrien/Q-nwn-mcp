# Local-model line (branches `master`, `systest-live-run-and-generalized-spec`; absent on `pre-local-models`)

Docs: user manual `docs/local-model-manual.md`, design `docs/local-model-guide.md` (packages W1-W8, section 6a context and drift).

Pieces
- `MCP_TOOL_PROFILE` (`src/tool-profiles.ts`): comma list of `read,plot,quests,actors,areas,dress,encounters,loot,rewards,fix,verify` + core. A new tool is in no profile until added; every phase profile < 40 tools (`tool-profiles.test.ts`). With a profile: progress footer, results over `MCP_RESULT_LIMIT` (6000) kept behind `resultId` (`get_result`), `brief` results, descriptions slimmed to 300/140 chars keeping the JSON call-format sentence (`slimDescription`, `MCP_DESCRIPTION_LIMIT`).
- Phase prompts `docs/phase-prompts/` (< 4 KB, `get_phase_prompt`; `phase-prompts.test.ts` checks every call); story tools `read_story`/`write_story_section` (`draft: true` drafts from the module; Module section merges fields only)/`write_dm_guide`; plot as JSON `write_plot` (`PlotSpec`, `normalizePlotSpec` reads synonyms).
- `get_progress` (`src/util/progress.ts`): checklist from module state, next step with its call; items may carry an `auto` call the driver runs itself.
- `build_area`/`dress_area`/`get_area_card`/`place_container` (`src/tools/area-build-tools.ts`): one call per area build/dressing.
- Driver: `node dist/cli/drive.js --module <project> --endpoint <url/v1> --model <name>` (`src/driver/`): one conversation per phase (or per checklist step, default step mode), `phase_check` as judge, resumable; SSE streaming; budget in characters calibrated to tokens (`context-budget.ts`, `--context-tokens`), shrink on overflow; busy retries; stuck guard (`STUCK_REPEATS` 5, `callSignature` order-insensitive); one nudge for a reply with no tool call. `--report <log>` summarises a run; replay tests from recorded runs (`src/driver/fixtures/`).

Lessons from nine real small-model runs (2026-11-18/19)
- Small models invent names (tags, blueprints, resrefs): give real ones in every refusal and drive routine steps from module state, not from the model.
- Draft story sections from the module rather than letting the model write them.
- Stop a repeated identical call; compare arguments order-insensitively.
- Full tool list (~230 tools) is ~108k tokens; lenient-arg widening ~doubles schema size.
