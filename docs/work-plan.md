# Work plan (from the 2026-11-09 project evaluation)

Every issue found in the evaluation, how it will be tackled, and the order. The work is cut into packages
small enough to finish inside one session; each ends in a checkpoint, so a session limit loses at most one
package.

## How to resume (read this first in a new session)

1. Read the **Status** table below; the first row not marked `done` is the next package.
2. Run `git status --short` and `git log --oneline -5`. Uncommitted changes belong to the package marked
   `in progress`; read its "Notes" cell before touching anything.
3. Do that package only. Finish with the checkpoint, then start the next if there is room.

**Checkpoint (end of every package):**
- `npm run verify` passes (docs-only packages: `npm run test -- skill-lint` is enough).
- Commit with the package id in the message (`A2: ...`). Never `git add -A` (`.swamp/`, `graphify-out/`).
- Set the package to `done` in the Status table, with the commit hash; update CLAUDE.md TODO #15.
- If tool code changed: note "MCP restart needed" in the Notes cell and tell the user in plain text.
- No push, no `.mod` build or send, unless the user asks.

**Mid-package rule:** when a package has more than one step, write the step reached into the Notes cell
before starting a long tool call or test run. Mark the package `in progress` when starting it.

## Status

| Id | Package | State | Commit / Notes |
|----|---------|-------|----------------|
| A1 | CLAUDE.md: fix contradictions in place | done | see `git log` ("A1:") |
| A2 | CLAUDE.md: move pitfalls to `docs/pitfalls.md` | done | see `git log` ("A2:") |
| A3 | CLAUDE.md: move verification and playtest history | done | see `git log` ("A3:") |
| A4 | CLAUDE.md: move layout, henchman, gear, testing history | done | see `git log` ("A4:"); CLAUDE.md now 907 lines |
| A5 | CLAUDE.md: archive done TODOs; priority + acceptance for open ones | done | see `git log` ("A5:"); CLAUDE.md 448 lines; open TODOs renumbered #30-#40 |
| B1 | #29 design document | done | `docs/module-projects.md`, decisions D1-D3 approved (approved by the user 2026-11-10); Salt Gate temp dir backed up to `adventures/The-Salt-Gate-Conspiracy/temp-backup/` |
| B2 | `export_project` | done | `src/util/project.ts`, `src/tools/project-tools.ts`; MCP restart needed. Real round trip (pack back to a .mod, compare) is not run: no nim tools in this shell, it goes into B3 as a gated live test |
| B3 | Load a module from its project | done | `packProject` + `load_module` on a directory; MCP restart needed. Checked with the real nim tools (`NIM_FOLDER_NWTOOLS=../nwn-tools/linux/neverwinter`): `project.live.test.ts`, and the Salt Gate backup exported, packed and loaded gives the same counts (220 resources, 6 areas, 65 creatures, 0 warnings). JSON-equal, not byte-identical |
| B4 | Keep project in step; detect files changed on disk | done | `src/util/project-sync.ts`, hooks in `jsonToGff` and `writeAndCompileScript`; MCP restart needed. Checked with real nim tools on a Salt Gate copy. Not covered: tools that write files with plain `fs` (not `jsonToGff`/script writer) reach the project only on the next `export_project`; removed resources are pruned by `export_project` only |
| B5 | Change the repack/send rules everywhere | done | CLAUDE.md, 14 skills, `repack_module` description, memory; `run_live_verification` now packs a throwaway .mod in the temp area instead of overwriting the loaded module's .mod. MCP restart needed |
| B6 | `adopt_module` writes the project; migrate Salt Gate | done | `adopt_module` exports the project; `// hand-edited:` header refused by `writeAndCompileScript` (not by `write_script`) and skipped by the stale check. Salt Gate migrated from the 2026-11-09 temp dir to `adventures/The-Salt-Gate-Conspiracy/` (113 GFF, 75 scripts; project packs and loads: 6 areas, 256 resources, 65 creatures, 19 dialogs, 0 warnings); 7 scripts marked hand-edited. The old `.mod` in nwn-data is from 2026-09-17 and not the source. MCP restart needed. `temp-backup/` can be deleted once the user is happy |
| C1 | Player simulation: spike | done | `docs/player-simulation.md`: (b) stand-in works for journal, henchmen, rewards; only `GetIsPC`, PC-only faction loops and `GetPCSpeaker()` block it. Decision for C2 recorded there |
| C2 | Player simulation: harness | done | `simulate` on `run_live_verification` (`sim-driver.ts`, `inc_sim`); checked on the real engine: a two-stage quest passes 5 of 5, a wrong run reports 3 failures; `docs/player-simulation.md`, adventure-quests skill. MCP restart already done |
| C3 | Re-check quests, companions, checks, dialog; test goals (#23) | done | Salt Gate 13 of 13 steps on the real engine; per-feature table in `docs/player-simulation.md`; `goal` and `verdict` in `run_live_verification` (MCP restart needed to take effect). Skill-check steps and the hand-written `a_qsalt_*` scripts are not covered |
| D1 | #28: `build_quest` answers return to the hub | done | `wireHub` in `quest-builder.ts`, test in `quest-tools.integration.test.ts`, `docs/quest-system.md`. User decision: hub = "About: <quest>" per active subject plus [Leave]. Not run on the engine (needs a real conversation); MCP restart needed |
| D2 | #28: `add_dialog_node` | done | new NPC answers return to the hub; `end: true` opts out; test added; MCP restart needed |
| D3 | State-dependent main lines | done | `addReturnLinks` re-enters via `[Anything else?]` for state-changing answers (copies the start list); no `greeting` field added: `offer` / `reminder` already are the per-state greetings (decision in `docs/quest-system.md`); skills updated |
| E1 | `trace_dialog_path` root choice | done | `root` param, `roots` listing with conditions, 60-node cap; skill updated; MCP restart needed |
| E2 | `list_script_references`: triggers, refresh | done | `currentScriptUsages` (fresh per call) in list_script_references, find_orphans, get_dependency_graph; `SCRIPT_FIELDS` gained the trigger/encounter/placeable fields; test added; MCP restart needed |
| E3 | `resolve_blueprint` raw output | done | `raw: true`; description says it summarises by default; MCP restart needed |
| E4 | Stale-script registry: remaining generators | done | quest runtime (all scripts), inc_sim, inc_random_abil (cast chance read back), inc_spec_ability, inc_spec_check, inc_spec_assert added; `inc_reward` left out (class-item tiers are baked in and cannot be read back); hand-edited files skipped. Older modules will now report stale quest scripts until `create_quest_system` is re-run (inc_sim); MCP restart needed |
| E5 | `create_faction` limitation surfaced | done | tool descriptions (create_faction, set_faction_reputation), `verify_creature` warning `custom_faction_unreliable`, adventure-challenges skill; MCP restart needed |
| E6 | Uniform `isError` | done | `util/tool-result.ts` `errorResult`; 101 single-line failure returns in 21 tool files now set `isError`; `is-error-guard.test.ts` fails on a new one. Not covered: failures returned across several lines or as `{ success: false }` JSON (the guard looks only at one-line text returns); MCP restart needed |
| E7 | Seeded generation | done | `util/rng.ts` (`random`, `withSeed`, `freshSeed`); layout generator uses it (23 calls), `style.seed` on `adventure_generate_layout`, result carries `seed`; zone solver and the encounter-composer resref suffix use it; `rng.test.ts` fails on any other `Math.random(`. The forge had no `Math.random` to replace. MCP restart needed |
| F1 | Creature and caster tools: decision table | done | `docs/creature-tools.md` |
| F2 | Deprecation notes; `build_key_npc` | done | "DEPRECATED: use forge_creature" in the 7 descriptions (build_npc_stat_block, level_creature, build_npc_level_library, equip_npc_by_role, bake_spec_ability_pool, create_spec_ability_system, create_random_abilities_system); skills already used the forge (only `systest-module` calls old tools, on purpose); `build_key_npc` added (validation unit-tested, full build not run against a real module); MCP restart needed |
| F3 | Small missing tools | done | `move_store_item`, `clear_footprint`, `bulk_modify_list`, `verify_creature` `lootable_flag_off`; each tested (the clear_footprint default tile path needs a real tileset and is untested); `modify_gff_field` error now sets isError; skill `module-explorer` updated; MCP restart needed |
| G1 | Follow-ups for `story-vs-pipeline.md`; adopt fill step | done | TODO #42-#50 in CLAUDE.md with acceptance tests; `audit_module` `fillIn` + `listNotRecorded`; module-explorer skill; MCP restart needed |
| G2 | Release: CHANGELOG, version | done | `CHANGELOG.md` 1.4.0 entry (the 2026-11-08 notes kept under it); `package.json` and lock 1.4.0; no tag, no push |
| B7 | Review plain-`fs` writers: route them through the project sync (TODO #41) | done | `afterRemove` added; `adventure-tools`, `bulk-tools`, `object-mgmt-tools`, `write-tools` (clone), `paint-tools` (delete_area), `quest-tools` (dry-run include), `dm-area-tools`, `moonglow-tools` now sync; probe scripts are ignored by the sync; `project-sync-guard.test.ts` fails on a new raw-fs writer. MCP restart needed. Not covered: tools that remove resources by other means than the ones above (none found) |
| M1-M4 | Salt Gate module track (see below) | done | All four done 2026-11-10. Oswin's quest rebuilt with the hub builder from a spec reconstructed out of the module (dry run matched every line, slot and reward); `dlg_oswin` passes `verify_dialog`; simulation of its accept steps 3 of 3. `audit_module`: 9 of 11 rows done; open: story fields `(not recorded)` and the player-facing module description (the user's to supply). Not play-tested by a person; `.mod` not built (rule). `temp-backup/` can be deleted. Remaining stale warnings: forged-creature stat-formula warnings (196) |
| H | Content features (#21/#24, #25, #26) | in progress | #21 first: verify_encounter_chain, outcome-dependent chain; user chose #21 on 2026-11-10 |

## Decisions needed from the user

Packages not listed here can proceed without an answer.

- **D1 (B1):** pack step for a module project: nasher or the nim tools (`nwn_erf`/`nwn_gff`). Recommendation: nim
  tools, already wrapped by this server; keep the layout nasher-compatible so nasher also works.
- **D2 (B1):** single source of truth. Recommendation: the JSON project. The temp dir becomes a cache built
  from it; direct edits are made to the JSON files, which removes the tool-versus-`nwn_gff` overwrite problem.
- **D3 (B1):** may `run_live_verification` build a throwaway `.mod` without asking? Recommendation: yes, it is
  never sent to the user.
- **D4 (F1) — approved 2026-11-10: yes, keep the old tools working, remove them from skills.** Original question: ** is `forge_creature` the one supported way to build a class-based creature, with
  `build_npc_stat_block`, `level_creature`, `equip_npc_by_role`, random abilities and special abilities
  marked deprecated? Recommendation: yes; keep the old tools working, remove them from skills.

## Phase A: split CLAUDE.md

Issue: 4,080 lines (347 KB) loaded every session, with contradictions. Target: about 300-400 lines holding
rules, architecture and open TODOs; everything else in `docs/`, indexed in `docs/README.md`.
Method for A2-A4: move text verbatim (cut and paste by line range, no rewriting), then leave one line in
CLAUDE.md pointing at the new file. Where a finding exists in a wrong and a corrected form, the corrected
form goes first and the superseded one is marked "superseded".

- **A1.** Fix in place: Testing section says no hosted CI (line ~4008) while `ci.yml` exists: state that CI runs
  `npm run verify`. Working Style dialog rule says "not yet applied": point at #28's real state. Delete the
  second "NWScript Function Reference" and "Walkmesh Caching" sections. Bring TODO #15 up to date.
  Done when: `grep -c "^## NWScript Function Reference" CLAUDE.md` is 1, same for Walkmesh Caching.
- **A2.** "Known Pitfalls" and "Pitfalls Found by Building a Real Module" to `docs/pitfalls.md`. Keep in
  CLAUDE.md only the ten or so that change what a tool call looks like (load/repack order, `z.string()`
  params, no `{}` annotations, list field names, placed instance is a separate copy).
- **A3.** "Verification Gate" history, the user-correction rounds and the Hollow Communion playtest rounds to
  `docs/verification-history.md`. Keep the severity contract and the list of checks.
- **A4.** Layout rotation saga, survey-area notes, Henchmen/Companions history, Gear Appearance, random
  abilities and special abilities findings, Testing history to `docs/` (extend existing docs where one
  exists: `special-abilities-system.md`, `random-abilities-runtime-findings.md`, `TEST_PLAN.md`).
- **A5.** Done TODOs (S1-S9 and the done numbered ones) to `docs/todo-archive.md`, numbers kept. Each open
  TODO gets one line: priority, acceptance test, "live-checked: yes/no". Add the unnumbered TODOs scattered
  in the text (area prefabs, flat space reservation, rebuild one area, tileset survey, appearance
  randomisation, gear appearance, level-up after bake, quickbar) to the numbered list.
  Done when: `wc -l CLAUDE.md` is under 450 and skill-lint passes.

## Phase B: modules as projects (#29)

Issues covered: #29 conflicts with three standing instructions; tool edits and direct `nwn_gff` edits
overwrite each other; Salt Gate hand patches would be lost on regenerate.

- **B1.** `docs/module-projects.md`: layout under `adventures/<Title>/` (`src/` JSON + `.nss`, `nasher.cfg`,
  story files), source of truth, when the project is written, how a session resumes, how verification gets a
  `.mod`, how hand-patched generated scripts are marked (a `// hand-edited` header that generators refuse to
  overwrite without `force`). No code.
- **B2.** `export_project` (`src/tools/project-tools.ts`, `src/util/project.ts`): every resource in the loaded
  module to JSON or `.nss`. Test: round trip of the test module is byte-identical after repack.
- **B3.** `load_module` accepts a project directory: pack to the temp `.mod`, then the normal load. Test: load
  from the export of B2, index equals the original.
- **B4.** After each write (`jsonToGff`, `writeAndCompileScript` already mark dirty state) flush the changed
  resource to the project. Record size and mtime of each temp file at write time; before the next write of
  that resource, refuse if the file changed underneath (names the fix: reload from the project). Tests for
  both.
- **B5.** One change: CLAUDE.md "Always repack" rule, `module-explorer` step 2, the 13 skills that mention
  `repack_module`, the `feedback_send_module_after_repack` memory. New wording: edits land in the project;
  build only when the user asks; offer when the work looks complete. Skill-lint must pass.
- **B6.** `adopt_module` writes the project from a `.mod`. Migrate The Salt Gate Conspiracy from the temp dir
  (which holds the hand patches `inc_cre_level`, `inc_qsalt_ret`, `c_qret_*`, `a_qret_give`) and mark those
  scripts hand-edited. Do this early if the temp dir is at risk: a copy of
  `/tmp/nwn-mcp/the-salt-gate-conspiracy_6a6e8bb9` to `adventures/The-Salt-Gate-Conspiracy/temp-backup/`
  costs nothing and can be done at the start of any session.

## Phase C: a test with a player in it

Issue: the largest gap. The headless server has no player, so quests, recruiting, checks and the dialog rule
are compiled but never run. #23 (state the goal of each test run) is folded into C3.

- **C1. Spike, time-boxed, result written to `docs/player-simulation.md`.** Try in this order and stop at the
  first that works: (a) NWNX on the verify server creating or logging in a player object; (b) a stand-in
  creature plus a module local `MCP_TEST_ACTOR`: every generated script already gets its actor in one place
  per runtime (`q_act`/`q_chk`/`q_roll`, `a_hen_*`, `q_check`), so one helper can return the stand-in when
  the local is set. Known limits to measure, not assume: journal state and `AddHenchman` on a non-PC,
  `GetIsPC` checks in `inc_companion`, faction-member loops.
- **C2.** Build the harness the spike supports: a generated driver script that walks a quest spec stage by
  stage (or a dialog path node by node), logging `[SIM_OK]`/`[SIM_FAIL]`; `run_live_verification` already
  returns tagged lines.
- **C3.** Run it on the systest module and Salt Gate. Record per feature: checked live, checked by
  simulation, or not checkable. Add a `goal` parameter to `run_live_verification` whose text and pass
  criteria are printed in the result; a run with no goal gets a warning.

## Phase D: finish the dialog rule (#28)

- **D1.** `quest-builder.ts` `leave()`: answers return to the NPC's options through `addReturnLinks` instead
  of a `[Leave]` reply each. Update the quest builder tests and `docs/quest-system.md`.
- **D2.** `add_dialog_node`: a new NPC answer with no children gets return links unless `end: true`.
- **D3.** State-dependent main lines: `create_dialog` already takes several roots with conditions; add the
  same to the `build_quest` spec (`greeting` per stage: before accept, in progress, after hand-in) and make
  `addReturnLinks` return to the root that is active, not always the first. Skills: the four dialog skills.

## Phase E: known defects (each is one small package, good for the end of a session)

- **E1.** `trace_dialog_path`: take a `root` index and report each root's condition instead of always
  starting from the first.
- **E2.** `list_script_references` / `find_orphans`: include trigger, door, placeable and area event fields;
  build from current `parsedGff` on each call, not the load-time index.
- **E3.** `resolve_blueprint`: add `raw: true` (or correct the description to say it summarises).
- **E4.** `stale-scripts.ts` registry: quest runtime, `inc_random_abil`, `inc_spec_ability`, `inc_reward`,
  `inc_spec_check`, `inc_spec_assert`. Respect the hand-edited marker from B1.
- **E5.** `create_faction`: say in the tool description that a custom faction does not take part in live
  reputation; `verify_faction` warns when a creature in a custom faction is expected to be hostile; skills
  say to use the standard factions.
- **E6.** One shared `errorResult()` helper; convert the 29 tool files that return failures as plain text; a
  test in the style of `tool-registration-shape.test.ts` fails on `success: false` without `isError`.
- **E7.** `util/rng.ts` (seeded, seed from a parameter or derived from the area or creature tag); replace the
  25 `Math.random` calls; `seed` parameter on `adventure_generate_layout` and the forge; a lint test forbids
  `Math.random` outside `rng.ts`. Split in two packages if the layout generator alone fills a session.

## Phase F: one way to build a creature

- **F1.** `docs/creature-tools.md`: table of the five builders and three caster paths, what each does that the
  forge does not, and the verdict per tool (keep, fold into the forge, deprecate).
- **F2.** Apply it: "deprecated, use `forge_creature`" in tool descriptions; remove the old tools from skills;
  `build_key_npc` (the non-companion twin of `build_companion`).
- **F3.** Small tools, one package each if needed: move a store item between categories; clear a tile
  footprint before `paint_group`; bulk edit across a GFF list; `verify_creature` warning for a
  combat-capable NPC with gear and `Lootable=0` and no `LOOT_INTENTIONAL`.

## Phase G: planning gaps

- **G1.** Turn each finding of `docs/story-vs-pipeline.md` into a numbered TODO with an acceptance test. Add an
  adopt fill step: `audit_module` lists the "(not recorded)" fields (26 on Salt Gate) and the skill asks the
  user for each or derives it.
- **G2.** CHANGELOG entries for S1-S9, quests, companions, adopt/audit/focus, dialog rule, DM area; version
  bump to 1.4.0.

(The other planning gap, no priority order or acceptance test for the TODOs, is closed by A5.)

## Module track: The Salt Gate Conspiracy (needs the MCP restarted; independent of the phases)

- **M1.** Back up the temp dir (see B6), restart the MCP, load the module.
- **M2.** `add_dialog_return_links` (dry run first) on `dlg_brynna`, `dlg_yorrin`, `dlg_gorrukh`, `dlg_dessa`,
  `dlg_oswin` and the three henchman dialogs; rebuild Stonewake's dialog per `todo.md`.
- **M3.** Write `dm-guide.md`; `create_dm_area`.
- **M4.** `create_creature_level_system` with the four base stores plus `salt_armory`, re-applying the
  `inc_cre_level` hand patch; remove the leftover blueprints `rurik`, `wren`, `fenn`; `verify_all`.
  One repack at the end of the track; the `.mod` is sent only when the user asks.

## Order and why

A (every later session is cheaper and stops reading contradictions) → B1 and the B6 backup (protects the
only copy of hand-made work) → B2-B5 → C (everything after is checked for real) → D → F → G → H.
Phase E packages fit anywhere: take one when a session has little room left.
