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
| A3 | CLAUDE.md: move verification and playtest history | todo | |
| A4 | CLAUDE.md: move layout, henchman, gear, testing history | todo | |
| A5 | CLAUDE.md: archive done TODOs; priority + acceptance for open ones | todo | |
| B1 | #29 design document | todo | needs decisions D1-D3 |
| B2 | `export_project` | todo | |
| B3 | Load a module from its project | todo | |
| B4 | Keep project in step; detect files changed on disk | todo | |
| B5 | Change the repack/send rules everywhere | todo | |
| B6 | `adopt_module` writes the project; migrate Salt Gate | todo | |
| C1 | Player simulation: spike | todo | |
| C2 | Player simulation: harness | todo | depends on C1 result |
| C3 | Re-check quests, companions, checks, dialog; test goals (#23) | todo | |
| D1 | #28: `build_quest` answers return to the hub | todo | |
| D2 | #28: `add_dialog_node` | todo | |
| D3 | State-dependent main lines | todo | |
| E1 | `trace_dialog_path` root choice | todo | |
| E2 | `list_script_references`: triggers, refresh | todo | |
| E3 | `resolve_blueprint` raw output | todo | |
| E4 | Stale-script registry: remaining generators | todo | |
| E5 | `create_faction` limitation surfaced | todo | |
| E6 | Uniform `isError` | todo | |
| E7 | Seeded generation | todo | |
| F1 | Creature and caster tools: decision table | todo | needs decision D4 |
| F2 | Deprecation notes; `build_key_npc` | todo | |
| F3 | Small missing tools | todo | |
| G1 | Follow-ups for `story-vs-pipeline.md`; adopt fill step | todo | |
| G2 | Release: CHANGELOG, version | todo | |
| M1-M4 | Salt Gate module track (see below) | todo | needs an MCP restart first |
| H | Content features (#21/#24, #25, #26) | not planned in detail | design first, one at a time |

## Decisions needed from the user

Packages not listed here can proceed without an answer.

- **D1 (B1):** pack step for a module project: nasher or the nim tools (`nwn_erf`/`nwn_gff`). Recommendation: nim
  tools, already wrapped by this server; keep the layout nasher-compatible so nasher also works.
- **D2 (B1):** single source of truth. Recommendation: the JSON project. The temp dir becomes a cache built
  from it; direct edits are made to the JSON files, which removes the tool-versus-`nwn_gff` overwrite problem.
- **D3 (B1):** may `run_live_verification` build a throwaway `.mod` without asking? Recommendation: yes, it is
  never sent to the user.
- **D4 (F1):** is `forge_creature` the one supported way to build a class-based creature, with
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
