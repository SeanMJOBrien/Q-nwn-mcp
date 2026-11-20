# Verification gate (`verify_*`, `src/tools/verify-tools.ts`, `src/util/verify/*.ts`)

- Role: acceptance gate for generated non-script files (the compiler gates `.nss`). Complements `validate_module` (cross-references) with intra-file structural/semantic checks.
- Severity contract: `error` = engine/toolset misbehaves (blocks); `warning` = advisory. Each finding has a stable `code` (skills branch on it) and a `fix` naming the repairing tool.
- `verify_all` = shipping gate: `shippable: true` means zero errors module-wide; walks placed GIT creatures too; walking reachability on by default. `/adventure-polish` runs it last; each phase verifies its own output (`phase_check` end) before writing status.
- Base-game scripts whitelisted by prefix in `isBaseGameScript()` (`src/util/verify/common.ts`): `nw_c2_default*`, `x0_ch_hen_*`, `nw_ch_ac*` ... never report them missing.
- Story checks: `verify_story` (story graph beats/clues/threads; DM guide and story vs module: `guide_weapon_mismatch`, `story_unknown_tag`); `verify_journal` heuristics `payoff_item_no_consumer`, `item_consumed_then_needed`, `journal_advance_on_enter`, `stance_change_group`, `kill_before_accept`.
- Story record (`src/util/story-record.ts`, `docs/adventure-tooling-reference.md` section 19): `story_not_recorded`, `story_graph_required` (3+ locations), `npc_no_motive`, `antagonist_no_motive`, `area_no_beat` block `phase_check(plot, end)` (motives also `actors` start), warnings at polish; `npc_motive_not_spoken` warning at actors end. `adopt_module` drafts the graph (`draftStoryGraph`).
- Stale generated scripts: `generated_script_stale` (`util/stale-scripts.ts`) for quest runtime, companion, reward, treasure, level/spec systems.
- `run_live_verification` runs a throwaway `.mod` on the headless engine (`MCP_FOLDER_VERIFYSERVER`); takes `goal`, gives a `verdict` with `simulate`; ignores the server exit code; strip `Mod_HakList` and `Mod_CustomTlk` for modules needing missing HAKs/TLKs.
- History of each check and live rounds: `docs/verification-history.md` (read before changing a check).
