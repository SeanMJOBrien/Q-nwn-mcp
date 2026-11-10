# NWN MCP Server

MCP (Model Context Protocol) server for Neverwinter Nights Enhanced Edition module files (.mod). Wraps neverwinter.nim CLI tools to expose module content as structured, queryable data for LLMs.

## Working Style

- **The TODO list tracks every branch and commit not yet merged into `master`** (user rule, 2026-11-07). Keep
  Project Health TODO #15 current: after every commit, merge, new branch or branch deletion, re-run
  `git fetch --prune` and `git rev-list --count origin/master..<branch>` for each branch and update the entry.
  A branch leaves the list only once it is merged (count 0) or deliberately deleted.
- **Per-module files go in `adventures/<Title-With-Dashes>/`** (git-ignored; user rule 2026-11-09). Every LLM-built module keeps its story (`adventure.md`), DM guide (`dm-guide.md`), `adventure-status.json`, `project-scope.json` and any other file specific to it there, e.g. `adventures/The-Salt-Gate-Conspiracy/`. `get_adventure_dir` gives the path; skills never write these into the temp dir.
- **Every module has a DM area and two books** (user rule 2026-11-09). A disconnected DM area the DM can teleport to (a `DM_AREA` waypoint; no transition leads in or out), holding a chest placeable with two book items (`baseItem` 74): the full story that the module is based on (`adventure.md`) and the DM guide (`dm-guide.md`). Built by `/adventure-rewards` Phase 7d; `audit_module` has a "DM area and books" row. The area is a fixed template, never rebuilt per module: `src/templates/dm_area.{are,git,gic}` (2x2 `tcn01`, no wind, music or ambient sound, always daytime, a `DM_AREA` waypoint and a chest `dm_chest` named "DM Chest"); a module copies it in and only the books in the chest change. `create_dm_area` does the copy and fills the chest.
- **Dialog structure: branches return to the main dialog** (user rule 2026-11-09). A branch must not end the conversation. After an NPC answer the conversation goes back to the main dialog state (the NPC's menu of PC options) and continues until the player picks the explicit exit option ("Goodbye" / "That's all for now"). Only the exit reply ends the conversation. Seen in The Salt Gate Conspiracy: Stonewake's two information questions both ended the talk, so the quest-accept option was never reached. Applied to `create_dialog`, the companion dialog, `verify_dialog` and the dialog skills; still open for `build_quest` merged lines, `add_dialog_node` and the existing Salt Gate dialogs: TODO #28 and work-plan packages D1-D3, M2.
- **Each module is a project the user can open, built only on request** (user rule 2026-11-09). A module made with this MCP has its own folder and files (`adventures/<Title-With-Dashes>/`) that the user can reference as an existing module project, and its content is stored there as nasher source: every GFF resource converted to JSON (the `nwn_gff` JSON form, committed-style, one file per resource) with scripts as `.nss`, in nasher's `src/` layout, plus the story and DM-guide files. The `.mod` is a build product, made only once all changes are in **and the user asks for it**. When the work looks complete, offer to build and send it; the user may decline and ask for more changes or more content, and then nothing is built. No repack-and-send after each step. Not yet implemented: TODO #29.
- **Do NOT auto-export HTML reports** after creating or painting areas. Only export reports when the user explicitly asks for one.
- **Always repack after creating/painting test areas** so the user can see them in the toolset. Mention that you repacked.
- **MCP server restart required after code changes.** After editing TypeScript source and running `npm run build`, the MCP server must be restarted for new/changed tools to become available. Ask the user to restart before attempting to use newly added tools.
- **Work plan:** `docs/work-plan.md` lists every issue from the 2026-11-09 evaluation as small packages with a Status table. A new session reads its "How to resume" section first, does the next package, and ends with its checkpoint.
- **Reference docs:** `docs/README.md` maps each question to a document; `docs/adventure-tooling-reference.md` explains `phase_check`, `suggest_area_size`, `place_tile_doors`, `build_companion`, `q_check`/`add_skill_check`, quest `spawn` and `skill-lint`, and the recipe for reworking an existing module. Keep it current when those tools change.
- **Keep skills in sync with tools.** When adding, renaming, or changing tool parameters/behavior, immediately update the `.claude/skills/` SKILL.md files that reference those tools. The LLM follows skill instructions, not tool schemas — if a skill doesn't mention a parameter, the LLM won't use it.

## Skill-prompt reduction TODOs (user-requested 2026-11-08, priority order)

Goal (S1-S9 built 2026-11-08, details below): fewer instructions in `.claude/skills/`, because the LLM follows skill text, not tool schemas, and every recipe a tool can
run in one call is text that can't drift. **These come first; the numbered Project Health list below is unchanged (its numbers
are referenced elsewhere).** Measured 2026-11-08 over 7,217 lines of skills: the four big adventure skills are 609-682 lines
each; 6 paragraphs (11 KB) are copied verbatim across skills; Phase 3b (companions) in `adventure-actors` is ~180 lines;
Phase 5b (doors) is only ~21 lines.

- **S1. DONE 2026-11-08 — remove copy-pasted blocks.** The creature-forge recipe is the `creature-forge` skill; the two tile-matching warnings live in `nwn-tileset-conventions`; the "STOP if a section is missing" pre-check is `phase_check` (S5); the resref-list note is one line. `skill-lint.test.ts` (S9) now fails on any paragraph over 150 characters copied between skills.
- **S2. DONE 2026-11-08 (needs an MCP restart; only the validation paths are unit-tested, the full build is not yet run against a real module) — `build_companion`.** One call: blueprint, forge, placement, recruit dialog, `verify_creature`. A matching `build_key_npc` (non-companion, combat-capable) was not built; Phase 3 still points at `forge_creature`.
- **S3. DONE 2026-11-08 except a live test with a real player — #19, the generic check.** `q_check` / `q_check_evt` / `add_skill_check` (trigger, placeable on use or `event: "disarm"`, door). `build_quest` stage `check` takes `skill | ability | save` and `dc | difficulty` (ability/save/difficulty go through `q_check`, a plain skill DC through `q_roll`). Item gifts (`give_item`, a search's item) now go to every party member (`QuestGiveItem`); a test runs the three co-op verifiers over the whole generated quest runtime. Skills updated: `adventure-challenges`, `adventure-environment`, `adventure-quests`.
- **S4. DONE 2026-11-08 — #18, area sizing as a tool.** `suggest_area_size(biome, purpose, events, shape)` (`util/area-size.ts`): cabin 2x2, inn 2x4, forest 4x4 for one event or 3x10 linear, more events add tiles, 32 max; says whether to use `adventure_generate_layout` (9x9 and up; 14x14 for several rooms) or paint by hand. `adventure-plot` records `Events` and `Travel` per location; `adventure-areas` Phase 3 calls the tool. The per-biome tile budgets are first estimates, not corpus-derived — tune them after real builds.
- **S5. DONE 2026-11-08 — `phase_check(phase, step)`.** `start` fails with the missing `adventure.md` section; `end` checks the phase's own section, runs the phase's verifiers (area connectivity for `areas`, the matching `verify_*` object types otherwise, everything for `polish`/`rewards`) and writes `adventure-status.json`. All 9 phase skills call it first and last. `quests` still needs `verify_quest_completability` run separately (the result says so).
- **S6. DONE 2026-11-08 — #17, spawn as a quest/dialog option.** Stage `spawn: {resref, area | at, x, y, count, tag, hostile}` (talk/return/deliver/rescue stages; quest-level `spawn` for templates); `build_quest` places the waypoint on walkable ground and a kill stage on the spawned resref/tag needs no placed copy; `q_act` spawns once per key, only at a real waypoint (`[QUEST_WARN]` instead of the NPC's own spot), with `spawn_count`/`spawn_tag`/`spawn_hostile`. Not built: the "spawn only into an area the party has entered" deferral, and a forge option (a bounty is a palette/blueprint creature; use `forge_creature` on the blueprint first).
- **S7. DONE 2026-11-08 — `place_tile_doors(area, dryRun?, genericDoor?)`.** Blueprint from `doortypes.2da` (generic type-0 doors — every `ttr01` building door — need `genericDoor`, e.g. `x3_door_wood001`), position/bearing from the tile rotation, corridor doorways unlocked and every other door locked + plot, idempotent (1 m), generic type-0 doors reported not guessed. `adventure-areas` Phase 5b is one call. Unit-tested on the plan only; not run against a real area.
- **S8. DONE 2026-11-09 (the "name the fix" bullet is a convention applied where hit, not a finished sweep) — let the tools carry their own rules.** Done: `create_creature_blueprint` takes faction names and warns when a blueprint ends in the player faction; placement refusals name the fix (`walkBuffer`/`collisionRadius` values, `adventure_find_walkable`). Done 2026-11-09: `verify_creature` now checks the caps the skills state (`natural_ac_on_pc_class`, `skill_rank_over_cap` at level + 3, `cr_level_mismatch` beyond 2 of the level; so `verify_all` covers them), and placement defaults are per kind (placeables and waypoints 0.5 m collision/clearance, creatures unchanged; skills updated). Not a finished sweep: more "name the fix" errors outside placement, added when one is hit.
- **S9. DONE 2026-11-08 — `skill_lint`.** `src/skill-lint.test.ts` (in `npm run verify`) parses every `.claude/skills/**/SKILL.md`: a `tool_name(` that isn't registered, a parameter the tool doesn't take (from the tool's literal schema), a paragraph over 150 characters copied between skills. First run found two real skill bugs (`resman_search type=`, `create_gear_randomizer includeName`). Scripts and CLI programs that look like calls go in `NOT_TOOLS` (`util/skill-lint.ts`).

## Project Health TODOs (survey 2026-10-01)

Ranked by impact, from a structural survey of tests/CI, skills, docs, and git
history. #8 (typecheck script) is done — `npm run typecheck` / `scripts/verify.sh`.
The rest are open.

1. ~~**DONE — no CI gate.**~~ `.github/workflows/ci.yml` (2026-10-03) runs
   `npm ci && npm run verify` (typecheck, build, lint, test) on every push/PR to
   `master`. This doesn't contradict `scripts/verify.sh`'s "no hosted CI, no
   network" comment — that line is about not depending on real game data/a nim
   toolchain for *module building*, not about gating the server's own
   TypeScript. The suite already runs in ~1s with zero network and degrades to
   skip without `NWN_FOLDER_DATA`/`NWN_FOLDER_USER` set, which is exactly CI's
   case, so it was CI-safe as-is — the gap was just that nothing ran it
   automatically.
2. **TODO — rotation/orientation math is the top bug source.** 17 of the last 100
   commits are fixes to tile rotation, collar orientation, or NPC generation
   (e.g. "Fix CityGate_2x2 collar: 2 of 4 tiles were 180° off", "Fix
   invisible-henchman root cause"). Property-based tests on the offset/rotation
   math would catch this class of bug before it reaches a shipped module.
   **Progress (2026-10-02):** the orientation / corner-height / walkmesh-offset / facing maths now has unit tests
   (`walkmesh.test.ts`, `walkgrid.test.ts`, `facing.test.ts`, `tileset.test.ts`) and a real-data oracle
   (`src/util/tile-oracle.live.test.ts`: 504 real areas, 274,500 neighbour comparisons, mutation-checked) that pins the
   counter-clockwise convention. Still open: property-based round-trip tests for `tile-solver`/`zone-solver`/`feature-collars` rotation.
3. **TODO — area-building skills are thin vs. adventure skills.** The 12 `area-*`
   skills average ~115 lines; `adventure-actors`/`adventure-challenges` run
   900+ lines. An LLM building areas gets far less guidance than one building
   actors/quests — worth expanding the area skills with the same density of
   learned rules.
4. ~~**DONE — most of the raw tool surface had no skill.**~~ Faction, reward,
   gear, verify-*, bulk-*, undo-* tools (most of the 150+ `mcp__nwn-mcp__*`
   tools) had no dedicated skill, unlike `module-explorer`. Exact audit started
   at 34/142 registered tools with zero skill mentions; five slices closed it:
   `.claude/skills/nwn-item-properties/SKILL.md` (decoded against real items in
   `/var/www/storage/qlippoth/the-frozen-north`, user-referenced 2026-10-01),
   `.claude/skills/nwn-database-tools/SKILL.md` (campaign/PW SQLite state),
   `.claude/skills/nwn-dialog-introspection/SKILL.md` (`get_dialog_tree`/
   `flatten_dialog`/`trace_dialog_path`/`find_dialog_scripts` — decoded against
   a real Frozen North quest NPC's conditional `StartingList`, which exposed a
   real `trace_dialog_path` limitation: it always starts from `StartingList[0]`
   regardless of that entry's condition),
   `.claude/skills/nwn-readonly-getters/SKILL.md` (creature/item/store/area
   getters + `verify_module_info`/`verify_faction`/`search_by_field`; also
   found and fixed a live bug — `get_faction_creatures` still read the stale
   `index.creatures` snapshot, the exact bug `list_creatures` was fixed for —
   now reads live GIT data the same way), and, closing the remaining gap
   (2026-10-03): a new `.claude/skills/nwn-tlk-resman-tools/SKILL.md`
   (`tlkify_module`/`search_tlk`/`list_tlk_entries`/`resman_stats`/
   `resman_search`/`resolve_tlk`), a note added to the (global,
   `~/.claude/skills/`) `nwn-web-editor` skill pointing at the MCP tool
   equivalents of its two Python scripts (`generate_area_map`/
   `start_web_editor`/`stop_web_editor` — confirmed these wrap the exact same
   scripts that skill already documents invoking by hand, not a separate
   mechanism), `place_sound` added to `nwn-object-placement` (it's the one
   `place_*` exempt from walkability/bearing), and `rename_tag`/
   `export_resource`/`create_encounter_blueprint` added to `module-explorer`.
   **Found and fixed a real, separate production bug while covering
   `start_web_editor`**: it was registered with an empty `{}` object as its
   annotations argument, which the MCP SDK (`@modelcontextprotocol/sdk`
   ^1.28.0) misinterprets as the 4-arg `(schema, handler)` overload — it
   silently treats that `{}` as the handler itself, so every real call failed
   with `typedHandler is not a function`. Confirmed via a minimal repro
   (any `server.tool(name, desc, schema, {}, handler)` call fails the same
   way; a non-empty annotations object, or omitting it entirely, both work).
   Fixed by dropping the stray argument. See the new "Known Pitfalls" entry
   below — grep the codebase for this pattern before adding another tool.
5. **TODO — inline-only capability gaps.** e.g. `item-models.ts` ("randomised gear
   appearance... out of scope for now") and an unresolved creation-order question
   in `npc-stat-block.ts`. These gaps are discoverable only by reading source —
   worth surfacing in the relevant skill or tool description so an LLM calling the
   tool knows the limitation up front.
6. ~~**DONE — `docs/` index.**~~ `docs/README.md` is a question → document table of contents for every doc and subfolder
   (created 2026-10-02). Keep it current when a doc is added.
7. ~~**DONE 2026-11-09 — integration coverage is thin.**~~ `dialog-journal-encounter.integration.test.ts` (15 tests) covers dialog, journal, encounter and blueprint tools with a write plus a read-back plus the matching `verify_*`, including failure paths; it found and fixed two real bugs (a string `QuestEntry` written to a dword field; creature, item, store, trap and encounter blueprints accepting a resref over 16 characters, now `resrefError`). Original note: Only 2 integration test
   files existed (`tools.integration.test.ts`, `npc-tools.integration.test.ts`)
   against 30+ tool files; dialog, journal, faction, encounter, and blueprint
   tools — the highest blast-radius mutations — had none. First slice done:
   `faction-tools.integration.test.ts` pairs `create_faction`/
   `set_faction_reputation` with `verify_faction`. Dialog, journal, encounter,
   and blueprint tools still need the same treatment.
8. ~~**DONE — standalone typecheck script.**~~ `npm run typecheck` (`tsc --noEmit`)
   added and wired as its own stage in `scripts/verify.sh`, ahead of `build`, so
   CI (if added per #1) can fail fast on type errors alone.
9. **DONE 2026-11-09 — stale parallel branches (checked after `git fetch --prune`: only `master` and the working branch exist locally and on origin; nothing to delete).** 8+ feature branches on origin
   (`area-avenue-rotation`, `encounter-difficulty-checker`, `random-caster-abilities`,
   etc.) with no visible cleanup convention — raises cherry-pick/merge-conflict risk
   and makes auditing "what's actually in master" harder. **Convention now set (2026-11-07):** #15 tracks every
   unmerged branch and commit; the 11 branches listed there as fully merged can be deleted.
10. ~~**DONE — `CHANGELOG.md` was stale, not missing.**~~ Correction to the
    original finding: the file exists (added in the v1.2.0 release commit) but
    stopped at `[1.2.0]` while `package.json` had moved to `1.3.1`. Backfilled
    `[1.3.0]` and `[1.3.1]` entries from the release commit bodies
    (`c834d68`, `f83be47`). Keep extending it on future version bumps.
11. **DONE 2026-11-09 — skill for doors and area transitions.** `area-connections` gained a "Tool sequence" section (`place_tile_doors` / `place_door`, `link_doors`, `create_area_transition`, `place_trigger`, `adventure_create_transition`, then `probe_ground`, `fix_object_heights`, `verify_*`, `check_area_connectivity`). Original request:
    Transition triggers are squares drawn on the tileset floor that move a
    creature to the next area named on the trigger. No skill currently explains
    this mechanic (door-based vs. trigger-based transitions, how the destination
    area/waypoint is specified, `create_area_transition`/`link_doors`/
    `place_trigger` tool sequencing) — worth its own skill, possibly alongside
    or folded into `nwn-area-builder`.
12. **PARTLY DONE (user-raised, 2026-10-01) — examine how tileset rules work for the MCP.** Documented 2026-10-02 in
    `docs/object-placement-and-tilesets.md` and the `nwn-tileset-conventions` skill: what actually constrains tile matching
    (corner terrains, corner heights, crossers; `[PRIMARY/SECONDARY RULES]` are toolset hints and ignored), the counter-clockwise
    rotation (the old paragraph claiming `.set` fields are un-rotated by `Orientation` was wrong and is corrected), per-tileset height
    steps, and which tool answers which tileset question (`get_tileset_details`, `analyze_tileset_rules`). The conventions are
    enforced by the live oracle. Still open: extend `paint_tiles`/`paint_group`/the solver beyond flat tiles (height-transition tiles
    — the corner-height agreement rule and `Transition` are known) and fix any remaining rotation cases at the root.
13. ~~**DONE — two local branches held real, unmerged work; resolved 2026-10-03.**~~
    `live-verify-automation` (3 commits: `run_live_verification`'s fully-automated
    verify-server loop, the `systest-module` skill + `create_systest_instrumentation`,
    a "simple NPC" complexity tier, and a signal-gated weather-variance checker) had
    no remote copy at all and was merged into `master` — see the merge commit for
    the two conflicts it took (`src/index.ts`, `src/util/git-helpers.ts`, both just
    "two branches added something in the same spot," kept both sides).
    `area-avenue-rotation` (9 commits: avenue/rotation support for stamped tile
    groups, two live bug-report cycles after shipping — see its own commit history
    for the handedness-bug/revert sequence) was **not** merged — it went through
    enough live rework after shipping that merging it deserves its own review, not
    a bundled decision. **Correction to the original finding**: this branch turned
    out to already have a remote copy (`origin/area-avenue-rotation` matched it
    exactly) — the earlier "no upstream" read was from the local branch's tracking
    config, not from whether a same-named remote branch existed; always check
    `git log <branch>..origin/<branch>` directly, not just `@{upstream}`, before
    reporting a branch as unpushed. Local tracking has since been set up
    (`git push -u origin area-avenue-rotation`) so it won't recur. Left as its own
    pushed branch, explicitly undecided: develop it further or delete it later.

14. **ACCEPTED AS COMPLETE 2026-11-09 (user) — creature forge gaps.** Monster-class forging is not wanted; palette monsters are placed as-is. `forge_creature`/`create_creature_level_system`
    (`src/tools/creature-forge-tools.ts`, generated NWScript in `src/util/creature-level-script.ts`) cover
    class-based creatures. Five gaps were left; three are now closed in the tools.
    - ~~**Fixed signature spell.**~~ **DONE 2026-11-07:** `forge_creature` `pinnedSpells` (stored as
      `MCP_SA_PINNED`; `inc_cre_level` picks them first at their spell level; checked in game as
      `cl_spell_pinned_<id>`; a spell not on the creature's class list is warned about and ignored). Skills
      updated: `adventure-actors` (Equipment and spells), `adventure-challenges` (Phase 5).
    - ~~**Melee backup weapon for archers.**~~ **DONE 2026-11-07:** `inc_cre_level` `CL_GearOffhand` buys a usable
      melee weapon into the inventory (unequipped) for any creature with a ranged weapon; checked in game as
      `cl_gear_melee_backup`. Skills updated: `adventure-actors`, `adventure-challenges`.
    - ~~**List of spawn-bought loot for `/adventure-rewards`.**~~ **DONE 2026-11-07:** every purchase is kept in
      `MCP_GEAR_LOG` and logged as one `[CL_LOOT] tag= resref= area= droppable= items=resref@slot[xstack]:gp,…`
      line per creature, returned by `run_live_verification` in `otherTaggedLines`. Skill updated:
      `adventure-rewards` (From `## Challenges`). `run_live_verification` now writes them into `adventure.md` `## Spawn Loot` (2026-11-09, `recordLoot`, default on; `adventure-rewards` reads it).
    - **Monster-class creatures** (Animal, Beast, Outsider, Undead, Construct, …). Not forged. **Choosing a
      ready-made monster from the default or custom palette and placing it as-is is acceptable for non-player-class
      creatures** — they don't need to be built. What would still need work, only if wanted: forge support that
      takes a palette creature's own CR/levels and advances it (spec §5.5) — `src/tools/creature-forge-tools.ts`
      (`forgeCreature`: skip the level-1 rebuild, keep creature weapons/hide, use the monster class's own feat
      table), `src/util/creature-level-script.ts` (`LevelUpHenchman` with the monster class; no shopping), and the
      skills `adventure-challenges` (Phase 5 "Monsters", Monster template, Creature Source Blueprints) and
      `adventure-actors` (Ambient Creature Blueprints). Until then both skills already say to use palette monsters.
    - ~~**`compose_encounter` still builds bosses its own way.**~~ **DONE 2026-11-07:** placement mode forges the boss
      (`forgeCreature`, gearRole `elite`, powerLevel `tougher`, faction Hostile — it had no faction before, so composed bosses
      were in the player faction), writes the level system when `cf_spawn` is missing, and the `casterSystem` param and its
      spell wrappers are gone. Support creatures stay palette monsters. `adventure-challenges` Phase 3 now names it for boss
      groups; `docs/encounter-composer-spec.md` and `docs/special-abilities-system.md` carry the update.

15. **TODO (standing, user rule 2026-11-07) — branches and commits not yet merged into `master`.**
    Checked 2026-11-07 after `git fetch --prune`; only `master` and the working branch remain. Update after every commit or merge.
    - **Merged 2026-11-07:** `systest-live-run-and-generalized-spec` was fast-forwarded into `master` (the SPEC_* assertions,
      encounter composer, Hollow Communion playtest fixes, Special-Abilities caster system, creature forge, weapon feat
      packages, area-connections trigger fixes, and this rule), plus `moonglow-run-plugin`'s one unique commit
      (`417da53` "Add moonglow_run_plugin and moonglow_list_plugins"), cherry-picked with an `src/index.ts` import conflict
      resolved. The working branch is now 0 ahead of `master`.
    - **Merged 2026-11-07 (second time):** the working branch fast-forwarded into `master` again with 17 more commits (`master` = `4cc663a`):
      `create_area_transition` / `place_trigger` size options, `create_companion_system` / `create_companion_dialog`,
      `compose_encounter` forging its boss, the `area-avenue-rotation` merge (`df26991`), Cleric domains (`a2ff791`), and
      Wizard schools plus the `run_live_verification` stop-timing fix. The working branch is 0 ahead of `master`.
    - **Merged 2026-11-07 (third time):** the creature forge manual (`c9c1280`, `docs/creature-forge-manual.md`) and this TODO
      update were fast-forwarded into `master`. The working branch is 0 ahead of `master`.
    - **Merged 2026-11-08 (fourth time):** the quest-system work was fast-forwarded into `master`: dialog script parameters and
      native quest fields (`f1747e0`), the quest system (`39b39ec`), search/custom stages (`db5948d`), optional clues, approaching
      NPCs and join/companion/dismiss (`b544602`), and this TODO update. The working branch is 0 ahead of `master`.
    - **Merged 2026-11-09 (fifth time):** the working branch fast-forwarded into `master` and both were pushed: `de41f69` (analyze_walkmesh util,
      create_area default-tile fix), `deb7aca` (S1-S9, adventure composition tools, quest spawn/check runtime, forge and verify fixes, docs) and
      this TODO update. The working branch is 0 ahead of `master`. Only `graphify-out/` remains untracked and is deliberately not committed.
    - **Merged 2026-11-09 (sixth time):** the working branch fast-forwarded into `master` and both were pushed (`master` = `f0fa838`): adopt/audit/focus, the adventures/ folder, scope enforcement, S8, the DM area template, TODOs 26-28 and the Salt Gate fixes. The working branch is 0 ahead of `master`.
    - **Deleted 2026-11-07** (local and `origin/`, all fully merged): `area-design-survey-and-verification`,
      `companion-spell-timing-fix`, `comprehensive-system-test`, `encounter-difficulty-checker`, `live-verify-automation`,
      `loot-intentional-checker`, `random-caster-abilities`, `runtime-verification-system`, `salt-gate-verification-fixes`,
      `spatial-conventions-and-variable-tools`, `weapon-preference-variety`, `moonglow-run-plugin` (its unique commit had
      been cherry-picked; every moonglow file in `master` was checked identical before deleting), and `area-avenue-rotation`
      (fully merged via the working branch).
    - **Not pushed (2026-11-10):** `master` on origin is `657f83b` (local `master` the same); the working branch `systest-live-run-and-generalized-spec` is 6 commits ahead: `1e340ea` dialog rule, `f4d0a8f` `create_dm_area`, `4914238` TODOs 22 and 24, `8f36b5d` module-project rule, `0f9ac61` work plan, and `A1` (CLAUDE.md contradictions fixed). Push when the user asks.
    - **Uncommitted work in the working tree:** only `graphify-out/` (untracked, not for commit).

16. **PARTLY DONE 2026-11-09 — the bug list is verified against TFN's source and the port is planned; no studio code is changed yet (`docs/tfn-quest-findings.md`; the same plan is appended to the studio's `PROGRESS.md`). One correction below: only the two `i = 1` slot loops stop at 19; the `j = 0` loop covers 20.** Original request (user-raised, 2026-11-08) — copy the quest-system fixes and additions into `~/git/Q-tfn-content-studio`.** This
    project's quest system (`docs/quest-system.md`, `src/util/quest-{script,spec,builder}.ts`) was ported from TFN's
    `inc_quest.nss`/`dlg_q_*` and the studio's own courier/rescue/escort runtime, then fixed and extended. Bring the useful parts
    back. **Keep TFN's model, not ours:** TFN is a persistent world with per-player quest state (`SQLocalsPlayer`), NWNX
    quest-giver highlighting, TFN's own XP/loot includes and `party_credit` kill credit — do *not* port this project's
    whole-party credit or vanilla state. Studio rules apply: Python 3.9 stdlib only, write TFN only through
    `changeset.apply_changeset`, generated scripts carry the `// tfn-studio quest runtime` header (`questrun.py`), keep
    `PROGRESS.md`/`MANUAL.md` current, and the studio's tests must stay green.
    - **Bug fixes to propose for TFN's own scripts** (TFN source, `~/git/the-frozen-north/src/nss`, via the studio's change set
      or upstream, not silently):
      - `inc_quest.nss` `AdvanceQuestSphere` ignores its `nTarget` and always calls `AdvanceQuest(..., 1)`, so `dlg_q_adv` with
        `aoe=1` advances the wrong stage for any slot but 1.
      - The slot loops (`for (i = 1; i < HIGHEST_QUEST_COUNT; i++)`, and `j = 0..19` in `UpdateQuestgiverHighlights`) stop at
        19 although the comment and constant say 20 (the studio's `MAX_SLOT = 19` matches the bug; raise both together).
      - `dlg_q_chk_advb` rolls Bluff, shifts alignment toward chaotic and advances the quest *inside a condition*: the engine
        runs conditions whenever it builds the node list, so just seeing the option shifts alignment and rerolls. And a
        successful bluff skips any number of stages (`bBluff` bypasses the one-behind rule), not one. Our fix: roll in an
        action (`q_roll`), store the result, branch on it in the next node's condition.
      - `AdvanceQuest` calls `InitializeItem`/`SetIdentified` on a `CreateItemOnObject` result without checking it.
      - `on_item_acq.nss` only ever advances slot 1 of a quest item.
      - TFN encodes stages as two digits (`GetSubString(sQuest, 0, 2)`): a quest with 100+ stages breaks.
    - **Generator additions for `tfnstudio/quests.py`** (VIAS today: talk, kill, pickup, explore, deliver, rescue, escort), each
      with UI fields in the Quest Builder, `describe`, validation and tests:
      - `search` stage (placeable skill check by the best party member, companions included; tries per player; `assured`
        find so a required clue can't block the quest; item handed over; optional `examine` second check, e.g. a companion's
        Lore on a letter's seal) — needs a `q_search`-style runtime script in `questrun.py`.
      - optional clues (`optional: true` search, no journal entry, pays a reward once).
      - `approach` (an NPC walks up to the first player it sees and starts its conversation; `q_approach` on OnPerception,
        chaining the old handler).
      - `join` / `companion` / `dismiss` (an NPC joins on acceptance as a henchman; a later line needs it present and sends it
        off) — check TFN's henchman system before using `AddHenchman` directly.
      - `deliver` with `keep` (the NPC examines an item the party carries on), stage `script` (TFN's existing
        `questK_self_script`/`questK_pc_script`, not exposed by the studio today), `custom` stages (journal entry only,
        advanced by the module's own script), `trigger` and `use` stages, flat `xp` rewards beside TFN's tiers.
      - Templates (`fetch`, `kill`, `bounty`, `deliver`, `rescue`, `escort`, `investigate`, `persuade-or-fight`) and the
        derived defaults (tag from name, stage numbering, `from`, end stages, level-sized rewards) to shorten specs.
      - A generic condition/action pair driven by script parameters (`q_chk`/`q_act`: items, gold, skill rank, rolls,
        companions, variables; take/give, hostile, unlock, spawn, destroy, leave) — TFN would add these as new
        `dlg_q_*`-style generic scripts beside its existing ones, not replace them.
    - **Runtime details worth carrying over:** a pickup pays once per item (flag on the item); kills by companions, summons
      and familiars credit their master (check against `party_credit.nss` first — TFN may already cover this); the escort
      poll is the studio's own and needs no change.
    - **Not to port:** whole-party journal advance, vanilla `NW_JOURNAL_ENTRY` state, the module-heartbeat bounty clock (TFN has
      SQLite time), `q_mod_acquire`/`q_mod_tick` wrappers (TFN has `on_item_acq`/its own heartbeat).

17. **DONE 2026-11-09 (user: "spawn only into an explored area" is not needed; spawns may target any area, and NWN doesn't run an area with no player in it) (see S6 above; the list below is the original spec).** A class-based bounty is forged with `forge_creature` on its blueprint first.
    Original request (2026-11-08): spawn creatures from dialog parameters as a real quest feature, e.g. a bounty target appearing once the
    bounty is accepted. What exists: `q_act` already takes
    `spawn=<resref> at=<waypoint tag>` (`src/util/quest-script.ts`), but only as a raw dialog parameter. Gaps:
    - **Not in the `build_quest` spec.** No stage/line field emits it, so a quest author has to hand-edit `ActionParams`. Add a
      `spawn` option (on an accept line or a stage's `onStart`) that `quest-builder.ts` turns into the parameters, and pair it
      with the `kill` stage: the spawned creature's tag should be the kill target, so "accept → target appears → kill → return"
      is one spec.
    - **No once-only guard.** Without `target=K` on the same line, re-picking the line spawns again. Store a flag (module local
      keyed on quest + stage) and skip if set; also skip if a creature with that tag is already alive.
    - **Bad fallback.** A missing waypoint spawns at the NPC's own location — a hostile bounty next to the quest giver. Fail
      quietly (log `[QUEST_WARN]`) instead, and have `build_quest` place the waypoint itself (`place_waypoint` in a named area,
      walkable, away from transitions) when the spec names an area but no waypoint.
    - **Options worth having:** `spawn_count` (a bounty and two guards), `spawn_tag` (override so several quests can reuse one
      blueprint), faction/hostility (Hostile=1 by default; see the `create_faction` reputation limitation), and a forge option so
      a class-based bounty is forged (`forge_creature`) rather than a palette pick.
    - **"Already explored" check (optional).** Spawn only into an area at least one party member has entered (an area OnEnter
      flag), or defer the spawn to that area's OnEnter if nobody has been there yet — so the target never appears somewhere
      the party can't reach yet. Update `verify_quest_completability` to treat a spawned kill target as present, and
      `docs/quest-system.md` / `adventure-quests` skill.

18. **DONE 2026-11-09 (see S4 above; the list below is the original spec).** Budgets measured against 1,019 unique hand-built areas: cave base 120, castle interior base 25; interior, dungeon and the rest agree or are deliberately smaller (comment above `BIOME_RULES` in `area-size.ts`). City exterior, desert and ruins had too few samples to tune. (user-raised, 2026-11-08) — area size rules by biome, area type and number of events.** Areas come out too big for
    what happens in them. Wanted rules (to go into the `area-*` skills and, where `adventure_generate_layout` picks a size, into
    code):
    - **Small interiors:** a cabin is **2x2**; an inn is **2x4**. (Today `area-city-interior` caps every home at 3x4 and
      suggests 4x3 for a tavern — tighten both; keep castle interiors exempt.)
    - **Forest:** **4x4 is enough for one event.** A travel area can be **linear, e.g. 3x10**, with one encounter along the way.
      (`area-forest` currently sizes from the 531-area corpus without regard to how many events the area holds.)
    - **General rule to define:** size = f(biome, purpose, event count) — e.g. a minimum footprint per biome, plus N tiles per
      additional event/encounter, and a "linear travel" shape option (long and narrow, entrance and exit at opposite ends).
      Write it as one table shared by every `area-*` skill and `adventure-areas`, and have `/adventure-plot` record each area's
      event count so `/adventure-areas` can size from it. Check the layout generator's real minimums first: BSP needs 14x14 for
      4 rooms (see "Layout Rules"), so small or 3-wide areas must be painted directly (`create_area` + `paint_tiles`/
      `paint_group`) or generated with fewer rooms — confirm what `adventure_generate_layout` does at 2x2, 4x4 and 3x10.

19. **DONE 2026-11-09 except a live test with a real player (see S3 above; the list below is the original spec).** `quest-script.live.test.ts` compiles every generated quest script with the real compiler. (user-raised, 2026-11-08) — one generic check script driven by parameters: any skill, ability or save, at any DC.**
    Examples to cover with no new script each time: DC 10 Dexterity check to avoid a falling-stone trap, DC 10 Strength check to
    force a door open, DC 15 Lore check. What exists: `q_roll` (`src/util/quest-script.ts`) takes `skill=<name> dc=N key=K` and
    is **dialog-only** (it reads `GetPCSpeaker()`), skills only, with the best of the speaker and its companions rolling.
    Gaps to close:
    - **Abilities and saves:** `ability=str|dex|con|int|wis|cha` (d20 + ability modifier vs DC, via `GetAbilityModifier`) and
      `save=fort|reflex|will` (`GetReflexSavingThrow` etc., or `ReflexSave`/`FortitudeSave`/`WillSave` for the engine's own
      result and trap-damage conventions). Today `skill=` only; "Dexterity roll" has no skill behind it.
    - **Other triggers:** a dialog-less entry point so the same parameters work from a trigger OnEnter, a placeable OnUsed/
      OnDisarm, or a door OnFailToOpen (the "force the door" case). The actor is then `GetEnteringObject()`/`GetLastUsedBy()`/
      `GetClickingObject()`; resolve it in one helper so the parameter set is identical in every context.
    - **Outcomes as parameters, not code:** `on_pass`/`on_fail` actions reusing `q_act`'s verbs (`damage=<n> type=<…>`, `unlock`,
      `open`, `spawn`, `set_var`, `advance`/`target=K`, `give_item`), so "fail the Dex check → 3d6 bludgeoning, pass → nothing"
      and "pass the Str check → door opens" need no script. Add `damage_dice`/`damage_type` and a `half_on_pass` flag for
      saves (reflex half damage).
    - **Who rolls:** keep best-of-party (speaker plus companions) as the default for skills, but make it `who=speaker|best|each`
      (a trap should roll for each party member who steps on it; a lore check for the best one). Per-roller attempt cap
      (`tries=N`, tracked on the PC, never the module — see the co-op skill-check rules) and `again=1` as today.
    - **Result for later branching:** keep the `QS_ROLL_<key>` local so a following `q_chk roll=<key>` still works; log one
      `[QUEST] roll …` line (add `ability=`/`save=`) so `run_live_verification` surfaces it.
    - **Spec and tooling:** a `check` option on `build_quest` stages/lines and on `place_trigger`/`place_placeable`/`place_door`
      (or one `add_skill_check` tool) that writes the parameters; DCs named by difficulty (`easy`=10, `moderate`=15, `hard`=20,
      `very hard`=25, or a number) so skills can say "moderate Lore check". Update `adventure-challenges` (traps),
      `adventure-environment` (clue placeables), `adventure-quests`, and the "Skill-check puzzle/investigation challenges" rules.
    - Verify: `verify_coop_rules` should accept it (per-PC tries), and add a unit test per ability/save/skill branch that the
      generated script compiles.

20. **BUILT 2026-11-09 (live check on The Salt Gate Conspiracy pending an MCP restart) — ask the purpose of the work first.** `set_project_scope(kind, scope, phases?, focus?)` records it and returns the focus's guide (`util/focus.ts`: creatures, scripting, story, areas_encounters, quests_dialog, debug, items); `adopt_module` writes `adventure.md` from a hand-built module (gaps = missing sections, unknowns marked `(not recorded)`), `audit_module` reports done/partial/missing per category, `phase_check` skips every phase under `one_feature`/`nwscript_only`, and switching scope clears stale `Scope:`/`Skip phases:` lines. Plan and tables: `docs/guided-workflow.md`. Still open: a live run on a hand-built (non-LLM) module, and TODO #23 (the scope record carrying the test goal).
    wanted. Add an opening question (in `/create-adventure` and as the first thing a session on this MCP does) about scope, so effort goes
    where the user's goal is: only one or two aspects of a module (areas, NPCs, quests, encounters, loot, dialog)? NWScript only? one larger
    feature (a quest system, a companion, a store, a set piece)? or only certain phases of an adventure project? The answer picks the
    skills and tools: scripts-only means `nwn-logic-debug`/`write_script` and no area building; "one feature" means no `adventure.md`
    pipeline; a partial adventure runs only the named phases (`phase_check` already takes a phase). Record the choice in `adventure.md`'s
    `## Module` section (or a session note when there is no adventure) and have each skill read it. Open design points: the exact list of
    scopes, whether the question is a skill step or a tool (`set_project_scope`), and how a later phase behaves when an earlier one was
    skipped on purpose (`phase_check` start must accept a declared skip, not fail on the missing section).

21. **PARTLY DONE 2026-11-08 — how adventures are composed: sizes, encounters, and stitching a rich story together.** Answers and status per bullet: `docs/adventure-composition.md`. Built: `plan_adventure_shape` (areas, events, encounter kinds incl. friendly and chain, in story order), spawn on event stages (multi-part encounters), `verify_story` and the `### Story Graph` format (checked by `phase_check` at `plot` and `polish`), the plot skill's intake/shape/graph steps. Open: outcome-dependent chains, `verify_encounter_chain`, a rival-party shape, a tone/theme check, recurring-NPC checks, an import format for the user's own material, and tuning all numbers against real builds. Original questions: Questions to
    answer in design docs first, then tools and skills (none are settled; the current pipeline is a linear list of areas with one set of
    hostiles and NPCs each):
    - **How many areas, and how large?** `suggest_area_size` (S4) sizes one area from its events; nothing yet decides the *number* of
      areas from a story length, party level or play time. A rule is needed from target play time and party size (areas, events per area,
      total encounters), recorded in `## Module`.
    - **Encounters per area size, and which kinds.** A table of kinds with a budget per tile count: combat, ambush, patrol, guarded camp,
      set-piece boss, trap, skill-check obstacle (`add_skill_check`), social/persuasion, puzzle/clue, discovery, rest. Today `/adventure-challenges`
      places hostiles by role and `compose_encounter` builds a boss group; there is no event-count-per-area rule beyond S4's size growth.
    - **Friendly encounters.** Merchants, a wounded traveller, a recruitable companion (`build_companion`), a rival party, an ally who
      joins for one fight, a safe camp. Needs a kind in the encounter table, a placement rule (not within the hostile aggro range, see
      `/adventure-challenges`), and a hook into quests (`join`/`companion`/`dismiss` already exist).
    - **Multi-part encounters.** A lookout, scout or recon camp met first, then the main force: the first fight (or a parley, or a
      stealth pass) changes the second — alarm raised, patrol missing, a prisoner who talks, supplies taken. Needs a spec shape
      (`encounter chain`: stages, each with a trigger and a consequence flag on the module), a runtime (spawn the next stage, alter its
      strength or position from the outcome of the last, built on the S6 `spawn` and the quest variables), and verification
      (`verify_encounter_chain`: every stage reachable, the outcome flags read).
    - **Building from a rich story.** `/adventure-plot` writes one document from a short prompt. A user with a detailed story, a campaign
      setting, or a pile of separate vignettes has no way to feed it in. Needs an intake step: read the user's material, split it into
      beats (scene, NPC, location, secret, encounter, item), keep the user's own names and wording, and map beats onto areas, events and
      quests instead of inventing replacements.
    - **Stitching disparate encounters and vignettes into one narrative.** Connecting threads: a clue ledger (which discovery points to
      which next beat, with at least two routes to each), recurring NPCs and objects across areas, escalation order (what the party must
      have learned or done before a beat opens), foreshadowing placed in earlier areas, and a payoff list the ending must resolve.
      Candidate tools: a `story_graph` in `adventure.md` (beats and links) with a check that every beat is reachable and every thread
      pays off (`verify_story`), journal entries generated per beat, and `phase_check` end for `plot`/`polish` running it.
    - **Larger narrative from the parts.** Act structure over the areas (setup, complication, turn, climax, resolution), a through-line
      antagonist and motive that each area's content reflects (the Hollow Communion's Venn only got a motive after the fact — see the
      2026-11-08 rework), and a tone/theme list the skills check content against.
    Before any code: write `docs/adventure-composition.md` answering the bullets above with the current pipeline's real limits, then
    split the work into tools and skill changes the same way S1-S9 were.

22. **MOSTLY DONE 2026-11-09 — skill, code and doc disagreements found while updating the docs.** Status per bullet: stale role tables — the Stat Scaling section already says `forge_creature` derives class, feats, gear and spells, left as guidance; area budgets — measured under #18, and each biome `area-*` skill now says when to use the corpus median and when `suggest_area_size`; declared skips — done under #20; generic type-0 doors — left explicit on purpose (no verified default door model; the tool names the fix); stale generated scripts — built: `verify_all` warns `generated_script_stale` for `inc_cre_level`, `cf_spawn` and `inc_companion` that differ from what the generator writes (`util/stale-scripts.ts`; add the other generators, e.g. the quest runtime and `inc_random_abil`, to its registry). Original text: Full text:
    `docs/generation-rules-reference.md` §9 item 6.
    - **Role/stat/gear tables are stale as tool inputs.** §2.3's "Combat Role Templates", "Stat Scaling" and "Gear-by-class pools" describe a
      hand-built stat block; `forge_creature` now derives class, feats, gear and spells. Either trim them to what a model still decides
      (`classId`, `level`, `gearRole`, `powerLevel`) and keep the rest only for monsters, or delete them from `adventure-challenges`/`adventure-actors`.
    - **`suggest_area_size` budgets are unmeasured.** First estimates; the `area-*` skills still quote corpus medians (forest 32×32). Measure a few
      real builds (and the corpus per events-per-area where `adventure.md`-like data exists), tune `BIOME_RULES`, and say in each `area-*` skill
      which number to use when (corpus median = a whole exploration map; the tool = only what the events need).
    - **`phase_check` has no declared-skip state** (also #20): a deliberately skipped phase fails the next phase's start check.
    - **`place_tile_doors` has no default for generic type-0 doors** (every `ttr01` building door). Pick per-tileset defaults, or read the door model
      from the tile, instead of requiring `genericDoor` on every call.
    - **Older modules carry older generated scripts and pools** (`q_act` without `QuestGiveItem`/spawn guards, `inc_cre_level` that readies a second
      spellbook, pools holding concealment spells). Add a `verify_*` check that compares a module's generated includes with the current generator
      output (and names the tool to re-run), so a stale module is reported instead of discovered in play.

23. **TODO (user-raised, 2026-11-09) — check the goal and objectives of every test run.** Each test run (a `run_live_verification`, a systest, a
    playtest, a generated-module build) should state what it is for and what counts as pass before it starts, and the report should be judged
    against that, not just "no errors". Open design points: where the goal is recorded (the `set_project_scope` record, a header in the run's
    output, or a `## Test Goal` section in `adventure.md`), whether a run with no stated goal is refused or only warned, and how each check
    maps back to an objective so a green run that never exercised the objective is reported as such.

24. **DONE 2026-11-09 (findings written; no tool or skill changed yet) — explore the stories created versus how this tool and its skills and tools create them. The findings and the suggested order of work are in `docs/story-vs-pipeline.md`.** Original request: Compare what
    the generated adventures actually contain (premise, beats, NPC motives, quests, encounters, pacing; e.g. The Hollow Communion, The Salt
    Gate Conspiracy) with what the pipeline does to produce them (`/adventure-plot` through `/adventure-rewards`, `plan_adventure_shape`,
    `verify_story`). Look for where the process flattens or drops the story (motive added after the fact, areas that don't carry beats, quests
    that don't follow the plot) and write the findings in a doc under `docs/` before changing any skill or tool. Related: #21.

25. **TODO (user-raised, 2026-11-09) — cutscenes that continue as the player selects dialog options.** A cutscene should advance one beat per
    choice (the player sets the pace of the storytelling) instead of playing as one timed sequence, and every line lands in the player's dialog
    history. Needs design first: how a cutscene is specified (beats with camera/actor actions per dialog node, run from the node's action script
    or native fields), how it fits `build_quest`/`create_dialog` and the Story Graph (a beat can be a cutscene), what the engine allows during a
    conversation (camera, `ActionPlayAnimation`, `ActionJumpToLocation`, fades, `SetCutsceneMode`) and what a headless run can verify. Related: #21, #24.

26. **TODO (user-raised, 2026-11-09) — add horse scripts.** Mounts: scripts and tooling so a module can offer a horse (mount/dismount,
    follow/stay, speed, no mounting indoors or where the tileset forbids it, a quest or store that hands one out). Needs design first: what the
    engine allows (`ActionMountObject`/`ActionDismountObject`, the mount appearance and `horse` feats, `GetIsMounted`), an NWScript include
    generator in the style of `create_companion_system`, a `build_*` helper, a `verify_*` check, and a skill. Related: #25.

27. **DONE 2026-11-09 — `create_dm_area` (user rule).** `src/tools/dm-area-tools.ts` copies the template `src/templates/dm_area.{are,git,gic}` into the module once (registering `dm_area` in `Mod_Area_list`), reads `adventure.md` and `dm-guide.md` from the adventure directory, makes the Book items (`src/util/dm-books.ts`: volumes of about 6,000 characters, tags `dm_book_story[_n]` / `dm_book_guide[_n]`) and replaces the books in `dm_chest`. The area is never redesigned. Not live-checked in the engine: how much text a book description shows (the volume size is a guess), and whether a readable book needs an `OnActivate` script.

28. **PARTLY DONE 2026-11-09 — dialogs return to the main dialog (see Working Style; user rule).** Built: `util/dialog-hub.ts` (`addReturnLinks`: every dead-end NPC answer gets links back to the root's PC options with the hub's conditions, minus the question just asked, and a `[Leave.]` reply is added when there is no exit; `end: true` / Comment "end" keeps a line terminal), `create_dialog` does it by default (`returnToHub: false` opts out), the companion dialog does it (accept and farewell end on purpose), `add_dialog_return_links` retrofits an existing dialog (`endEntries`, `dryRun`), `verify_dialog` warns `dialog_branch_ends` and `dialog_no_exit_reply`, the four dialog skills state it. **Still open:** `build_quest`'s merged lines (the quest builder gives each answer its own `[Leave]` reply instead of returning to the NPC's options, `quest-builder.ts` `leave()`), `add_dialog_node` (hand-added nodes), and running `add_dialog_return_links` over every existing dialog (needs the MCP restarted; The Salt Gate Conspiracy: `dlg_brynna`, `dlg_yorrin`, `dlg_gorrukh`, `dlg_dessa`, `dlg_oswin`, the three henchman dialogs).

29. **TODO (user rule, 2026-11-09) — modules as nasher/JSON projects, built on request.** Today the working copy is the extracted `.mod` in the temp dir and the MCP repacks after most edits (`repack_module`), and `adventures/<Title>/` holds only the story files. Needs design: (1) a project layout under `adventures/<Title>/` in nasher form (`src/` with `*.are.json`, `*.git.json`, `*.utc.json` … and `.nss`; `nasher.cfg`), written from the loaded module (`export_project`) and kept in step after each mutating tool (or flushed on demand), which also covers the old per-module-git-repo TODO (JSON diffs); (2) `load_module` able to open that project (nasher pack into the temp `.mod`, or build the index from the JSON) so it can be resumed in a new session; (3) `repack_module` / build only when the user asks, with the prompt "offer when complete" in the skills (`create-adventure`, `module-explorer`) and no automatic send-after-repack (the `feedback_send_module_after_repack` memory is superseded for module projects: send only when the user accepts the build); (4) `adopt_module` writing the project from an existing `.mod`; (5) docs. Open: nasher vs the nim tools for the pack step (both are in `~/git/nwn-tools`), and whether live verification (`run_live_verification`, which needs a `.mod`) builds a throwaway copy.

## Design Intent

This MCP serves two purposes:

**(a) AI-assisted human module design** — A human author works with an AI assistant to build, modify, and extend NWN modules via natural language. The human stays in creative control.

**(b) AI-driven creative module building** — A small, proof-of-concept tool for building one-shot adventures for yourself and friends. Spoiler-free by design, so the DM can be surprised too. An LLM autonomously designs and constructs module content based on high-level goals: generating quests, writing dialogue, designing areas, placing objects, building story. This is orchestrated via the `/create-adventure` skill and its sub-skill agents.

### How a session starts (user intent, 2026-11-09)

The first thing a session on this MCP does is **ask the user what they are trying to accomplish**, then the LLM drives that goal to completion
with the tools and skills, teaching as it goes (the user may not know how to build or equip a creature, script behaviour, fill story gaps,
design an area with encounters, or add quests, journal entries, dialog and rewards, or may only want a script bug found). Most sessions are on a
module that is **already built but incomplete**: the order is **adopt** (write `adventure.md` from what the module contains), then **review the
module as built so far**, then let the user say how to fill each gap with the LLM's guidance. `set_project_scope` records the answer; the plan,
phase/category table and audit are in `docs/guided-workflow.md`. TODO #20 tracks the remaining build (`focus`, intake, `audit_module`, adopt).

### Spatial Awareness

The `visualize_area` tool returns a **canonical JSON spatial payload** — the LLM's primary instrument for understanding an area (tile grid, walkable zones, zone connectivity, all placed objects with positions and properties). Call it before making placement or quest decisions.

**HTML export tools (`export_area_report`, `export_module_report`) are strictly for human inspection** — downstream of the JSON payload, never depended on by the MCP engine.

### Scope

Scoped to **non-persistent world (non-PW) modules** — single-player and small co-op campaigns. AI-driven content creation targets **instanced objects placed in areas** (GIT contents). Blueprint modification, palette-level changes, and deep 2DA/ruleset authoring are out of scope.

## Tech Stack

- **TypeScript** (ES2022, Node16 modules) — `npm run build` compiles to `dist/`
- **@modelcontextprotocol/sdk** — MCP server framework, stdio transport
- **zod** (v4) — tool parameter validation (MCP SDK requirement)
- **neverwinter.nim tools** — external binaries for binary format conversion

## Quick Start

```bash
npm run build        # Compile TypeScript to dist/
npm run dev          # Run directly with tsx (development)
npm run start        # Run compiled output
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MCP_FOLDER_USERREPORTS` | *(empty)* | Directory where user-facing reports are saved. When unset, reports go to the module temp dir |
| `NIM_FOLDER_NWTOOLS` | *(empty)* | Path to neverwinter.nim binaries |
| `NWN_FOLDER_DATA` | *(empty)* | NWN game install dir — enables base game 2DA/TLK loading via resman |
| `NWN_FOLDER_USER` | *(empty)* | NWN user documents dir — enables custom TLK, HAK, override/, development/ loading |
| `MCP_FOLDER_TEMP` | `%TEMP%/nwn-mcp` | Temp directory for extracted modules |
| `MCP_FOLDER_VERIFYSERVER` | `~/nwn-mcp-verify-server` | Checkout of the throwaway headless-engine verify server, used by `run_live_verification` |

## NWScript Function Reference

`nwscript-docs/` holds one cleaned markdown file per NWScript engine function,
named exactly by function name (e.g. `AngleToVector.md`, `GetSpellUsesLeft.md`),
sourced from nwnlexicon.com and stripped of wiki chrome. To look up a function's
signature, parameters, remarks, or example usage, read `nwscript-docs/<FunctionName>.md`
directly (exact-name match — don't grep/scan the whole directory). Not every engine
function has a page; absence isn't authoritative.

## Architecture

```
.mod file → nwn_erf (extract) → temp dir → nwn_gff (parse each GFF → JSON)
  → in-memory ModuleIndex (tags, scripts, areas, dialogs, creatures, items)
    → MCP tool handlers serve queries & modifications
      → nwn_gff (serialize back) → nwn_erf (repack) → .mod file
```

One module loaded at a time. `load_module` must be called before any other tool.

### Tool Organization

Tools are split between **base tools** (human-orchestrated editing) and **adventure tools** (autonomous module building):

- **Base tools** (`src/tools/*.ts` except `adventure-tools.ts`) — 22 files covering reading, querying, editing, placement, and analysis. Used by both humans and the adventure creator.
- **Adventure tools** (`src/tools/adventure-tools.ts`) — Tools specific to the `/create-adventure` pipeline: `adventure_create_transition`, `adventure_find_walkable`, `adventure_generate_layout`, `adventure_apply_layout`, `adventure_list_features`.

All tools have **MCP annotations** (`readOnlyHint`, `destructiveHint`, `idempotentHint`) set via the 4th positional arg to `server.tool()`.

### Layout Generator

`adventure_generate_layout` (in `src/util/layout-generator.ts`) is server-side procedural layout generation that encodes the area design rules from `adventure-areas/SKILL.md`. Returns zones + crossers ready for `adventure_apply_layout`, plus transition points. Uses `computeValidPairs()` from `src/util/zone-solver.ts` to validate terrain adjacency chains.

#### Unified BSP Pipeline

All 10 styles use a single BSP pipeline, differentiated by `StyleConfig` presets in `layout-generator.ts`:

**Interior styles** (dungeon / cave / dwelling):
- **`dungeon`** — Moderate split variance (±15%), room sizes 60-100% of leaf, margin 2-3, 1 shortcut corridor, 50% S-curves, 30% L-shaped rooms.
- **`cave`** — High variance (±20%), small rooms (40-70% of leaf), margin 2-4, 3 shortcut corridors, 70% S-curves, 10% L-shapes.
- **`dwelling`** — Near-zero variance (±5%), rooms fill 85-100% of leaf, fixed margin 2, no shortcuts, 10% S-curves, no L-shapes.

**Exterior styles** (forest / rural / city / plains / desert / castle / tundra):
- Each has `wallKeywords` (border terrain), `floorKeywords` (room terrain), `crosserKeywords` (roads — unused as crossers, used for terrain corridor keyword matching).
- Obstacle patches (water, trees, cliff) placed inside rooms via `obstacleKeywords` + `obstacleChance`.
- Secondary crossers (stream/river) are **interior-only** — exterior styles never use crosser paths.

#### Layout Rules

- **BSP rooms**: minimum 3x3, margin >= 2 (enforced, never collapses to 1). `minLeaf = 6` ensures each leaf can fit a 3-tile room + 2-tile margin — **this one hardcoded `6` is shared by every style, interior AND exterior.** `StyleConfig.splitThreshold` (10 for most interior styles, 12 for exterior) is assigned in every preset but **confirmed dead — never read anywhere in `bspPartition`** (found 2026-09-19 while designing the avenue-reservation feature below). Wiring it in looks like an obvious fix — DON'T, without also auditing every place that cites it: at a real `splitThreshold=10` minLeaf, a 4-room split needs 20 playable tiles per axis (22x22 total); at 12, exterior styles would need 24 playable (26x26 total) — both far above what's documented and actually relied on today. **The real minimum area for 4 rooms, any style, is 14x14 total (12x12 playable)** — `2 * minLeaf` per axis, off the one true shared constant. The old `adventure-areas` "Interior minimum 12x12" / "Exterior minimum 18x18" lines (replaced 2026-11-08 by `suggest_area_size`, which encodes 9x9 for one room and 14x14 for several) were guidelines, not code: the interior one matches the BSP floor (its "(splitThreshold 10)" parenthetical described config that isn't consulted), and the exterior one is, in practice, a feature-fit headroom figure: BSP itself would happily hand back four 3x3 leaves at 14x14 for exterior too, but a 3x3 room can't fit any real 2x3+ building feature group — 18x18 is a feature-fit headroom guideline, not a value the code enforces or splitThreshold produces. Room size is a random fraction of available leaf space, randomly offset within the leaf.
- **L-shaped rooms**: Adjacent BSP siblings may merge into a single zone with probability `nonRectChance`. The zone solver handles arbitrary shapes.
- **Corridor routing**: axis-overlap detection (straight connection at shared Y/X), L-bend fallback when rooms don't overlap on either axis.
- **S-curves**: Probability controlled by `sCurveChance`. Offsets middle third by 1 tile perpendicular. Bends only on interior wall tiles (never first/last).
- **Shortcut corridors**: `shortcutCount` controls how many T-junction shortcuts between non-adjacent rooms.
- **Interior corridors use crossers** (corridor type only, on wall tiles). **Exterior corridors carve floor terrain zones** through wall terrain — no crosser paths.
- **Corridor edge flags only point wall-to-wall**: crosser edges are NOT generated toward room tiles. Room-boundary corners handle the visual transition. Generating edges toward rooms requests combos like `wall/wall/floor/floor + corridor` that no tileset tile satisfies.
- **Crosser type**: use `corridor` (self-contained per tile). Never use `doorway` — doorway crossers require matched pairs on shared edges (arch geometry split between adjacent tiles).
- **Propagation guard**: crossers don't propagate onto tiles with any non-default corner (boundary or room tiles). Only pure-default tiles receive propagated crossers.
- **Room-corner crosser exclusion**: tiles diagonally adjacent to rooms (but NOT cardinally adjacent) are excluded from corridor crosser paths. These tiles get a single non-wall corner from the corner grid (3-wall+1-floor pattern) and no tileset has crosser tiles for that pattern. Room-EDGE tiles (cardinally adjacent) are kept — the solver's step 1.5 finds corridor-mouth tiles for them.
- **Solver scan-order**: solves bottom-to-top, left-to-right. Fallback chain: (1) exact corners+crossers, (1.5) adjust free corners+keep crossers, (2) exact corners+drop crossers, (3) adjust free corners+drop crossers, (4) all-default fallback. Step 1.5 finds "corridor mouth" tiles by adjusting room-edge corners. Adjustments are written back to the corner grid so downstream tiles see them.
- **Feature group filters**: groups with crosser edges or mismatched terrain corners are excluded from feature packing and `adventure_apply_layout`. Door-containing groups are allowed **only if** every door tile has all corners matching the floor terrain and no crosser edges — this lets freestanding buildings (houses, lodges) pass while rejecting corridor doors and transition doors. Terrain mismatch means a feature tile's corners don't all match the room's floor terrain — placing such a feature locks foreign corners into the grid, creating visual seams and forcing solver fallbacks on neighboring tiles.
- **Feature suggestions**: `suggestedFeatures` array in LayoutResult — packed into rooms targeting 50%+ tile coverage. `adventure_apply_layout` applies zones + crossers + features atomically. Pass `preferredFeatures` (array of group names from `get_tileset_details`) in `LayoutStyle` to prioritize plot-appropriate features over random selection.

#### Stamped-group rotation, entrance detection, and road/avenue preservation (2026-09-19)

User-raised: stamped feature groups (`paint_group`, `adventure_apply_layout`) were placed
at a single fixed orientation with no concept of facing a road, and roads were purely
cosmetic (a crosser-tile texture choice, not a protected, reserved corridor). Three
connected pieces, all in `src/util/tileset.ts` unless noted:

- **`rotateGroupTileIndex(ngc, ngr, columns, rows, rotation)` / `rotatedGroupDimensions()`**
  — the real grid-slot remap a rotated group needs. Rotating a group isn't just a
  per-tile orientation flag: it's rotating which native `(col, row)` maps to which
  `tileId` in the group's own row-major array, plus swapping footprint width/height at
  90°/270°. Derived by transforming the group footprint's own corners through this
  codebase's existing `forwardRotateDoor` point-rotation convention, cross-checked three
  independent ways (direct per-rotation corner-transform, and composing the 90° step
  two/three times to re-derive 180°/270° algebraically — all three agreed) plus a
  bijection test (every native cell visited exactly once) and a "four 90° steps returns
  to identity" algebraic check, both parametrized across multiple group shapes. Wired
  into `paint_group` (new `rotation` param, 0-3), `adventure_apply_layout`'s real
  feature-tile write path, and `findFeatureDoorPosition` (previously hardcoded its
  orientation argument to `0` always). **Handedness verified (2026-11-07):** the oracle test "rotated tile
  groups placed by hand match rotateGroupTileIndex" (`tile-oracle.live.test.ts`, needs `TFN_SRC`) finds 633
  hand-placed rotated groups in 504 real areas; 98.6 % of their 1,886 tiles sit at `Tile_Orientation` = the
  rotation this remap implies (the mirror mapping: 32.9 %, all of it from 180° turns). The "may look scrambled"
  warnings on rotated multi-tile groups were removed: the toolset rotates groups exactly this way.
- **Fixed a real correctness gap the rotation work surfaced**: `adventure_apply_layout`'s
  terrain-corner match check read a tile's *native* corners even for a rotated
  placement — a rotated tile presents different corners outward. Now uses
  `getRotatedCorners`. Curated collar tiles (`feature-collars.ts`) are hand-authored for
  native placement only, so a feature with one clamps `rotation` to 0 with a warning
  rather than silently misplacing its collar.
- **`getGroupEntrances(group, tileset, rotation)`** — generalizes the door-classification
  logic that already existed privately inside `findFeatureDoorPosition` (used only to
  aim transition portals at a building's front door). Returns every EXTERIOR door a
  group has (not just the first), each with a cardinal `side` (N/S/E/W). Deliberately
  computes door geometry at native orientation always and only rotates the reported
  `side` by simple compass arithmetic (N→E→S→W→N per quarter-turn) rather than
  re-deriving positions against a rotated grid — a smaller, independently-checkable
  piece of logic than duplicating the full grid remap. Exposed to callers via
  `get_tileset_details`'s full-mode `entrances` field per group — this data was
  previously unreachable outside `layout-generator.ts`'s private scan.
- **`LayoutStyle.avenue?: boolean`** (`src/util/layout-generator.ts`, default false —
  every existing caller's output is byte-identical without it). When true,
  `packFeatures` is deferred from its normal step-6 position to run *after* step 7 (room
  connections) instead of before — corridors aren't computed until step 7, and
  `packFeatures` previously had zero visibility into them (confirmed: it only receives
  `rooms`, never `crossers`/corridor geometry, so a feature could legally land on tiles
  a corridor also crossed through a room interior). Deferring the *call site* (not
  moving the intricate, exterior/interior-branching corridor-computation code itself)
  keeps this a small, safe reorder — the non-avenue path's call site, arguments, and
  ordering are completely unchanged. The avenue tile set is computed after corridors
  exist: for exterior styles, whatever `floorTiles` gained since a pre-corridor
  snapshot (corridors are carved as floor-terrain zones); for interior styles, every
  crosser path's tiles directly (crossers cover wall tiles specifically, never touching
  `floorTiles` at all). That set seeds `packFeatures`'s `occupied` exclusion, so a
  feature never lands on the avenue, and — for a room adjacent to an avenue tile —
  biases placement toward a position/rotation whose `getGroupEntrances(...).side` faces
  it, trying all 4 rotations before falling back to the ordinary uniform-random
  placement if no facing match fits (scored, not forced). No new "protected crosser"
  solver concept was needed for this: since main connectors, shortcuts, and the
  secondary stream are still computed in their existing relative order (only
  `packFeatures`'s position moved around all of them), nothing about their own mutual
  overlap risk changed — narrower and safer than the original plan's idea of separately
  flagging just the "primary spine" as protected.
- **Verified end-to-end against real tileset data**, not just synthetic unit fixtures:
  `tno01`'s real `Thatch_House_1` group (1x1, one door, native side `N`) run through
  `adventure_generate_layout({avenue:true, preferredFeatures:["Thatch_House_1"]})` at
  4 rooms produced 4 placements, 2 of them with a non-zero `rotation` (the facing bias
  actually engaging), and `adventure_apply_layout` applied all 4 with zero
  `featureWarnings`. 3 new unit tests confirm the avenue-exclusion property holds across
  15 real-generation trials (never a false pass — both "a feature was placed" and "a
  corridor existed" are asserted, not just "no overlap found").
- **Spacing rule (user-raised, from a real hand-built village pair): buildings should
  sit within 1-2 tiles of the avenue, not just somewhere in the adjacent room.** Confirmed
  a real gap in the current design while hand-building "The Twin Villages Waystop": the
  avenue-adjacency bias (above) only checks whether a room touches the avenue at all and
  whether a candidate rotation's entrance faces it — it has **no distance preference**,
  so a feature placed correctly-facing but deep in a large room (e.g. a 3-tile gap to the
  avenue, found in one hand-authored village's west row) still passes today's check. Two
  places this needs to land:
  - **Hand-authoring convention (apply now, no code change needed):** when placing
    buildings via `paint_group`/`adventure_apply_layout` alongside a hand-built avenue
    crosser, keep the gap between a building's road-facing edge and the avenue itself to
    1-2 tiles — enough for a small dooryard, not an open field. Mirror the gap on both
    sides of the avenue for a consistent street frontage.
  - **`packFeatures`'s automatic avenue bias (not yet built):** the position search
    (`layout-generator.ts`) should prefer candidates *closer* to the avenue-adjacent room
    edge, not just any position with a facing match — e.g. bias the random `fx0`/`fy0`
    roll toward that edge, or explicitly rank candidates by distance-to-avenue before
    facing. Not yet implemented; today's automatic placement can legally put a
    correctly-rotated building far from the road it's supposedly fronting.

- **Rotation-handedness saga, "The Twin Villages Waystop" (2026-09-19) — two separate
  bugs, found across two rounds of real user checks, plus a fundamental limitation
  the fix has to work around rather than solve.** Full sequence, since each round's
  wrong diagnosis is as instructive as the eventual fix:
  1. **Round 1 — `bearingToSide`/`rotateSide` calibration, CONFIRMED and fixed.** User
     report: "The buildings should have their doorways facing the road... Almost none
     of them did." Had the user visually check 4 real placed buildings in the toolset
     against their intended facing (one per rotation value 0/1/2/3) — the same
     corpus-cross-check discipline the "Tile rotation" pitfall above prescribes,
     applied via direct human observation since no pre-existing corpus uses these
     specific groups. Two real, independent calibration bugs, both in `tileset.ts`:
     `bearingToSide()` was a full quadrant (90°) out of phase (wrong even at rotation
     0, no rotation involved at all), and `rotateSide()` composed the rotation in the
     wrong direction (added steps; the real direction subtracts). Confirmed by fitting
     all 4 reports to one formula (`actual = (expected + 1 - 2*rotation) mod 4`) —
     both fixed, and this fix is correct and still in place.
  2. **Round 2 — `rotateGroupTileIndex()`, WRONGLY "fixed" by the same commit, then
     reverted.** Round 1's fix also swapped cases 1/3 in `rotateGroupTileIndex()` (the
     multi-tile grid-slot remap), on the assumption it shared the same handedness bug.
     It didn't — a second real user report ("any tile feature larger than one tile is
     broken") showed actual structural corruption (tiles duplicated into two slots,
     buildings broken into disordered pieces), which a real handedness/direction bug
     cannot produce (a bijective remap can flip which way something faces, but can
     never duplicate a tile). Root cause found by cross-checking the formula against
     `~/git/settileLibrary`, a separate, independently-tested NWScript library for
     this exact operation (`TileBlockRotate`/`_TileRotatedOffsetX/Y`): its verified
     90° point-rotation `(ox,oy) -> (-oy,ox)` is algebraically identical to this
     function's ORIGINAL (pre-swap) case 1/3 — confirmed by deriving the general W x H
     inverse from that same point-rotation and checking it cell-by-cell against a 2x2
     example. **The swap was reverted; `rotateGroupTileIndex` is back to its original,
     now cross-verified formula**, and Round 1's compass-calibration fix stayed
     unchanged — the two functions solve genuinely independent problems (which tile ID
     lands in which grid slot, vs. which rotation value to request for a target
     facing) and don't share a bug just because they're both "rotation code".
  3. **The real limitation underneath both rounds, confirmed by the same reference
     library: most multi-tile groups (named houses/inns/towers) cannot be safely
     rotated via grid-remap + per-tile-orientation-bump AT ALL, regardless of how
     correct the index math is.** Quoting settileLibrary's own docs: "The four tiles
     of a tileset tower are four *different* models, one per quadrant... Rotating a
     tile only spins that quadrant's own model, so rearranging the four and bumping
     their orientations scrambles the tower instead of turning it. Rotation is correct
     for tiles whose orientation is meaningful on its own: terrain crossers, roads,
     **single-tile features**. To reface an authored structure you need a
     differently-authored group." A 1x1 feature is exactly a single ordinary tile —
     rotating it via `Tile_Orientation` is the same operation the engine already does
     for every terrain tile, and is safe. A 2x2+ named building is an assembly of
     unique, position-specific meshes; relocating and re-spinning them is a
     structurally valid *tile* rotation that still produces the wrong *building*.
     **`paint_group` and `adventure_apply_layout` now emit an advisory warning
     (not a hard block, since there's no way to tell a genuinely rotation-safe
     multi-tile group from an unsafe one purely from tile data) whenever a rotation
     other than 0 is requested for a group larger than 1x1.**
  **Actual fix applied to the shipped content**, once both of the above were
  understood: rather than rotating multi-tile buildings at all, both villages'
  10-building layouts were rebuilt using ONLY each group's *native* (rotation 0)
  facing — surveyed the full `tno01`/`ttf01` group catalogs for real door bearings
  per group (direct `.set` file reads), and picked whichever named building already
  faces the needed direction unrotated for each side of the road, swapping any
  grass-terrain group that mismatched its dirt-zone surroundings for a dirt-terrain
  equivalent facing the same way. `tno01` had enough variety for a fully-distinct
  10-building set this way; `ttf01`'s much smaller building palette forced real
  repetition (most of one village's houses ended up sharing 1-2 models) — a real,
  visible trade-off of "correct and safe" over "no rotation-scramble risk," not
  something to silently improve later without noting the cause. **None of this
  touches the separately-verified, pre-existing `getRotatedCorners`/
  `getRotatedCrossers`/`forwardRotate` convention** ("Tile rotation" pitfall above) —
  that solves a different problem (which corner terrain a *terrain* tile presents at
  a given orientation) and was never in question. **Lesson reinforced twice in one
  session:** a rotation-handedness or rotation-safety assumption is not verified by
  the code agreeing with itself (bijection tests, algebraic identities, "zero
  warnings" from the solver) — none of those catch a systematically-wrong-but-still-
  structurally-valid rotation, or a mathematically-correct rotation applied to
  content that can't survive it. It takes a real render, a real human observer, or a
  real independently-tested reference implementation to check against — and even
  after finding one bug this way, don't assume every other "rotation-shaped" function
  nearby shares its root cause without checking each one on its own terms.

### Resource Loading

On `load_module`, the server builds a full resman stack (lowest to highest priority):

1. **Base game BIFs** (via `NWN_FOLDER_DATA`)
2. **Module HAKs** (from `Mod_HakList` in IFO)
3. **User override/** (`NWN_FOLDER_USER/override/`)
4. **User development/** (`NWN_FOLDER_USER/development/`)
All 2DAs from the stack are extracted and parsed at load time (~598 base game tables). `load_module` accepts just a filename (e.g., `"mymod.mod"`) which resolves from `NWN_FOLDER_USER/modules/`.

**The temp dir persists across reloads of the same module.** `createTempDir()` derives the dir name deterministically from the module's absolute path, so calling `load_module` again on the same path reuses the same dir instead of wiping it — only switching to a genuinely different module cleans up the old one. This is load-bearing: it's what lets skills persist sidecar files (e.g. `adventure.md`) directly into the temp dir with Write/Edit and have them survive a reload. Don't "clean up" by wiping the temp dir unconditionally in `loadModule` — that destroys sidecar files that aren't part of the `.mod` archive and can't be reconstructed by re-extracting.
**But a reload still re-extracts everything already inside the packed `.mod`, silently reverting any edit made since the last repack.** "Persists" above only covers sidecar files that were never part of the archive (like a freshly generated include, before its first repack). Every `.utc`/`.nss`/`module.ifo`/etc. that already exists inside the `.mod` gets overwritten back to its packed content on `load_module`, even when reusing the same temp dir. Confirmed directly: edits to `a_mod_load.nss`, another creature-spawn script, and `module.ifo`'s `Mod_OnModLoad` field all silently reverted after a same-path `load_module` call issued between the edits and the first `repack_module`. **Never call `load_module` between an edit and its `repack_module`** — make every edit, repack once, and only reload afterward if the in-memory index genuinely needs refreshing.

## GFF Data Model

Every GFF field is type-wrapped: `{ type: "dword", value: 100 }`. Use helpers from `types/gff.ts`:
- `getFieldStr(obj, "Tag")` → unwraps cexostring/resref
- `getFieldNum(obj, "ChallengeRating")` → unwraps byte/char/word/dword/int/float/double
- `getFieldLocStr(obj, "FirstName")` → extracts text from cexolocstring (prefers lang 0/English)
- `getFieldLocStrResolved(obj, "FirstName", tlkLookup)` → resolves `[TLK:N]` strrefs via lookup function
- `getFieldList(obj, "Creature List")` → unwraps list to array of structs
- `setField(obj, "Tag", "cexostring", "my_tag")` → set or create a typed field
- `setFieldNum(obj, "Tile_ID", 42, "int")` / `setFieldStr(obj, "Tag", "my_tag")` → shorthands

`GffObj` type alias (`Record<string, unknown>`) used throughout. `GIT_STRUCT_ID` constants in `config.ts`: CREATURE=4, WAYPOINT=5, SOUND=6, ENCOUNTER=7, DOOR=8, PLACEABLE=9, STORE=11, TRIGGER=1.

## Object Placement

**Position fields differ by type:**
- Creatures/Waypoints/Triggers/Encounters/Sounds/Stores: `XPosition`, `YPosition`, `ZPosition`, `XOrientation`, `YOrientation`
- Placeables/Doors: `X`, `Y`, `Z`, `Bearing` (radians)

**Facing differs by type** (`util/facing.ts`): creatures/waypoints store a world-axis unit vector and the tools' `bearing` is a **compass** angle (0 = north, 90 = east, clockwise); placeables/doors store `Bearing` as a **counter-clockwise** math angle with the model front facing **south** at 0, and the tools' `bearing` is that raw angle (front compass direction = `180° − bearing`). Prefer `faceTowardX/Y`. **Z always comes from the walkmesh** (the `z` parameter is a fallback) and responses report the placed z.

**Blueprint resolution chain:** module parsedGff cache → module resources on disk → resman (base game/HAKs, 120s timeout). Always deep-cloned before mutation.

## Walkmesh Caching

The `wok_cache/` directory is lazy-initialized on first use via `ensureWokCacheDir()` in `walkmesh.ts`. Reset on each `load_module` via `setWokCacheDir(tempDir)`. All walkmesh consumers (placement tools, paint tools) call `ensureWokCacheDir()` — never create the dir manually.

## Undo Stack

Simple undo stack for GIT mutations — `snapshotGitForUndo()` before each mutation, `popUndo()` to revert. Max 50 entries. MCP tools: `undo_last_change`, `undo_history` in `undo-tools.ts`. For bulk rollback of a failed phase, use `bulk_remove_objects` with tag patterns.

## Blueprint Discovery

`list_blueprints` tool searches the full resman stack (base game + HAKs + module) with 3-layer matching:
1. **Resref** — filename substring match
2. **Binary content** — finds tags and hardcoded locstring names in GFF data
3. **TLK names** — resolves strref-based names via `index.baseTlk`/`index.customTlk`

Returns type-specific summaries (utc: CR/race/classes, uti: baseItem/cost, etc.). Results cached in `blueprint_cache/`.

## Area Connectivity

`check_area_connectivity` tool does BFS from the module start area through linked doors/triggers. Returns reachable/unreachable areas and the full transition graph. Implemented in `analysis-tools.ts`, reuses `buildTagToAreaMap`/`buildAreaTransitions` from `tileset-tools.ts`.

## Area Transitions

Three mechanisms for moving between areas:
- **`link_doors`** — bidirectional door-to-door linking. Doors are two-way objects.
- **`create_area_transition`** — one-way trigger→waypoint transition. Places an Area Transition trigger (Type=1, LinkedToFlags=2=Waypoint) in the source area and a waypoint in the target area. Call twice with swapped source/target for two-way transitions.
- **`adventure_create_transition`** — **bidirectional** portal for adventure modules. Single call places a useable blue shaft of light (`plc_solblue`) AND a landing waypoint at both positions simultaneously, guaranteeing the light and waypoint in each area share exact coordinates. Each light's OnUsed script opens a dialog ("Step through?" / "Turn away"). On confirmation, plays VFX_FNF_SUMMON_MONSTER_2 and jumps the PC to the destination waypoint after 2 seconds. The `/create-adventure` pipeline uses this exclusively instead of `create_area_transition`.

## Trap Blueprints

`create_trap_blueprint` creates a UTT trigger blueprint with NWN trap fields: `TrapDetectDC`, `TrapDisarmable`, `TrapFlag`, `TrapOneShot`, and a default square geometry. Place with `place_trigger`, then put the trap's effect on it with `add_skill_check` (a party-wide save with damage dice) — no trap script.

## Quest Completability

`verify_quest_completability` traces all journal quests from quest-giver dialog through `AddJournalQuestEntry` script calls to the end entry. Checks area reachability. Returns structured gaps for each quest.

## Placement Collision Detection

`place_creature` (0.75m radius) and `place_placeable` (1.0m radius) check for nearby objects and **block placement** if another object is within range.
Both take `collisionRadius` to override (`"0"` disables). Defaults per kind (S8, 2026-11-09): creatures 0.75 m; placeables 0.5 m (real hand-built areas pack props tightly: 34 % within 1 m of another prop, 16 % within 0.5 m),
so tight furniture groupings can pass `collisionRadius` 0.3-0.4.

## Walkability Enforcement

All placement and movement tools **block** if the target position is non-walkable or within 1m of a non-walkable surface. Uses `checkPlacementWalkable()` in `walkmesh.ts` which checks the target point plus 4 cardinal probes at a configurable distance (default 1m). `adventure_create_transition` uses a 2m buffer so portals stay clear of walls and cliff edges.

`place_creature`, `place_placeable` and `place_waypoint` take `walkBuffer` to relax the clearance (0 = only the point itself must be walkable). Defaults: creatures 1 m; placeables and waypoints 0.5 m (real props: only 57 % have 1 m of clearance, 74 % have 0.5 m). `probe_ground(area, x, y, buffer)` reports the verdict without placing anything.

**Enforced on:** `place_creature`, `place_placeable`, `place_waypoint`, `place_trigger`, `place_encounter`, `place_store`, `move_object`, `bulk_move_objects`, `create_area_transition`, `adventure_create_transition` (both source and target positions).

**Excluded:** `place_door` (doors sit at tile boundaries near walls), `place_sound` (audio sources don't need walkable positions), movement of Door List and SoundList objects.

## Object Height Correction

`fix_object_heights` adjusts Z height of all placed objects in an area (or all areas) to match the walkmesh ground plane. Iterates creatures, placeables, waypoints, triggers, encounters, stores, and sounds. Only adjusts objects where the walkmesh Z differs from the current Z by more than `tolerance` (default 0.01). The walkmesh check uses the highest walkable face at each position (handles overlapping faces at different heights). `dryRun: true` reports up to 40 samples without writing; `onlyBuried: true` only raises objects that are below the ground and never lowers a deliberately raised prop (about 1 % of objects in correct areas). `move_object` / `bulk_move_objects` keep each object's height above the ground when no `z` is given (`followGround`, default true).

## Spatial Conventions (verified against real data, 2026-10-02)

Full write-up with evidence: `docs/object-placement-and-tilesets.md`; skills: `nwn-object-placement`, `nwn-tileset-conventions`. Enforced by the
env-gated oracle `src/util/tile-oracle.live.test.ts` (base-game tilesets with `NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS`; real areas additionally with
`TFN_SRC=<nasher src folder>`; `ORACLE_VERBOSE=1` prints the measured numbers). **If a change to rotation/height/offset/facing maths fails the oracle, the change is wrong.**

- World metres: +X east, +Y north, origin south-west, 10 m per tile; `Tile_List` row-major from the south-west (`index = tileY*Width + tileX`).
- **Tile orientation is counter-clockwise** (corner TR → TL → BL → BR; edge right → top → left → bottom); `.set` fields are orientation-0 terms, never pre-rotated.
  Neighbour agreement in 504 real areas: corners 99.99 % (clockwise reading: 75 %), crossers 99.99 %, heights 100.00 %.
- **Ground Z = walkmesh Z (node `position` offset included) + `Tile_Height × Transition`.** `Transition` is the tileset's `[GENERAL] Transition=`:
  5 for most outdoor sets, **4 for tcn01, 2 for tno01** (a flat 5 m — the old code — fits those 3.5 % / 0 %; `tileHeightStep()`, `get_tileset_details.heightStep`).
  Flat ground is not always z = 0 (trm02/tno01 +5, ttu01/ttz01 +1). trm02/trs02 ramps span half a level.
- **Walkmeshes:** `<Model>.wok` (not the `.set`'s `WalkMesh=`), vertices relative to the node `position` (54 % of walkmeshes have a Z offset), tile-local ±5 m;
  query points are rotated the opposite way (`n=1: (x,y) → (y,−x)`). **`nwn_resman_extract` extracts nothing if any requested file is missing**
  (tcm02 lacks `tcm02_b92_02.wok`, trs02 lacks `trs02_m00_00.wok`): always extract in batches via `ensureWoksExtracted` / `extractSalvaging` (`util/batch-extract.ts`);
  missing models are cached so they are not re-requested per object.
- **Facing** — three encodings (see Object Placement above); doors that belong to a tile: position = tile centre + door `(x,y)` rotated counter-clockwise by `Tile_Orientation`,
  `Bearing = (doorOrientation + Tile_Orientation×90) % 360` (verified on 3,717 doors, ±180°).
- **Library:** `util/walkmesh.ts` (pure probing), `util/walkgrid.ts` (1 m raster, `findOpenGround`; `adventure_find_walkable clearRadius`), `util/facing.ts`, `util/batch-extract.ts`.

## Zone-Based Terrain Solver

`adventure_apply_layout` (adventure tool) takes the full `LayoutResult` from `adventure_generate_layout` and applies zones + crossers + features atomically via the zone solver (`src/util/zone-solver.ts`). `paint_tiles` and `paint_group` are base tools for direct/manual tile placement — no solving.

**TODO — area prefabs.** Reconstructing complex multi-tile architecture (castle
gates with towers, cave mouths carved into a rise) purely via corner/crosser
matching is fragile — most of one session's worth of user bug reports were exactly
this class of problem. `feature-collars.ts` (see the Pitfalls entry below) is the
cheap fix for *known* height-transition features. Two bigger, not-yet-implemented
approaches — hand-author a piece once, stamp the verified result into generated
areas as an atomic unit instead of re-deriving it tile-by-tile every time — are
fully spec'd out in `docs/area-prefabs-spec.md`: prefabs as oversized feature
groups (smaller lift, reuses most of `packFeatures`), and prefabs as whole BSP
rooms with declared corridor-connection points (bigger lift, needed for something
the size of a full walled castle compound with real interior space). Recommended
sequencing, the exact deliverable a hand-built prefab source area should look
like, and a concrete starter-library TODO (specific prefabs for the *user* to
hand-build in the toolset, two batches, priority order) are all in that doc.

**TODO — reserve guaranteed flat, mutually-matching space for a multi-tile
feature before packing it (user-raised).** Surfaced directly by the Frostmarch
cave fix in "The Six-Fold Trial": `feature-collars.ts` gives a *known*
height-transition feature a correct 1-tile collar, but nothing in the BSP/room
layout stage reserves a larger flat region *around* where that feature will land
— so extending a collar into a believable raised plateau (or any multi-tile
feature that needs several flat, corner-matching tiles on all four sides to sit
in cleanly) is always a manual post-hoc patch, not something the generator
planned room shape/size around. Worth a real look: could `packFeatures` (or the
room-sizing pass before it) query a feature's real footprint + collar
requirement and bias BSP room dimensions/placement to guarantee a flat,
same-terrain, same-height buffer of the right size before ever attempting to
place it — closing the gap between "the collar is correct" and "there's
actually room for the collar." Related to, but distinct from, the area-prefabs
work above (prefabs solve *authoring* a known-good multi-tile piece once;
this solves *making room* for one, prefab or procedural, before packing it).
Still open. A related but separate gap — *reserving a road/avenue* between
stamped groups (not a flat buffer around one feature) — is now built; see
"Stamped-group rotation, entrance detection, and road/avenue preservation"
under Layout Rules above.

**TODO — rebuild a single area in place from an existing/completed module
(user-raised).** No current tool lets you regenerate just one area of an
already-built module using the normal `adventure_generate_layout`/
`adventure_apply_layout` pipeline when that area's design turns out to not suit
the player (bad layout, an unfixable structural bug, or simply "player didn't
like this one") without hand-patching tile-by-tile as this session's Frostmarch/
keepbailey fixes did. Worth scoping: `delete_area` + `create_area` +
`adventure_generate_layout`/`adventure_apply_layout` already exist as the raw
pieces, but re-wiring the area back into the transition graph (doors/portals to
its neighbors), re-placing everything the deleted area held that other systems
already reference (quest triggers, companion recruit points, a key NPC's
dialog-driven state), and deciding what should regenerate vs. carry over
untouched are all real design questions, not just plumbing. A dedicated
`rebuild_area`-style capability (or a documented recipe using existing tools)
would turn "this area has issues" from a multi-hour hand-patch into a
supported, repeatable operation.

**TODO — a per-module git repo, committing the JSON view of each resource, not
raw binary GFF (user-raised).** Each module's temp dir is currently disposable
and regenerable from the packed `.mod` (see the `load_module` re-extraction
pitfall below) — there's no history, and reverting one bad edit means hand
re-extracting from the last repack the way this session's recovery from a
corrupted file did. A real per-module git repo would give that for free, plus
branching/diffing for the area-rebuild TODO above ("try a regenerated area,
diff against the old one, revert if the player doesn't like it"). The design
question the user specifically flagged: commit the **JSON round-trip form**
this project already produces via `nwn_gff` (or generates for tool output),
not the raw binary `.git`/`.utc`/etc. — binary GFF diffs as "changed," which
tells you nothing; the JSON form diffs as "which field on which struct
changed," which is the whole point of having history at all. Needs real
scoping before building: where the repo lives (not `/tmp`, which today's temp
dir intentionally is, for good reason — see the pitfall below), what triggers
a commit (every `repack_module`? every mutating tool call, git-embedded
resources included?), and whether the binary form is committed alongside the
JSON form (probably yes, since the JSON is derived and the binary is what
actually ships) or regenerated from JSON on demand.

**TODO — a systematic test/analysis pass across every native (base-game) tileset,
one throwaway single-area module per tileset (user-raised).** Everything this
project currently knows about a specific tileset's real quirks — `ttf01`'s building
palette being far smaller than `tno01`'s (surfaced only by trying to avoid rotation
in "The Twin Villages Waystop"), most named building groups' doors failing the
`getGroupEntrances` 3m-offset exterior/interior heuristic (found empirically,
group by group, only when a real build needed it), which groups' corner terrain is
Grass vs Dirt vs Forest and so seams against a given zone, which multi-tile groups
are genuinely rotation-safe (single, symmetric-enough models) vs. structurally
unsafe (a unique mesh per tile — see the rotation-handedness saga above) — has come
from hand debugging one real build's specific groups, one tileset at a time, after
something already broke. Doing this proactively, once, for every native tileset
would turn "discover the gap live, at content-build time" into "already known and
documented before it can bite a build."

**What such an area/analysis should capture per tileset**, informed directly by the
gaps this session found the hard way: every named group placed at least once (native
rotation 0, since that's the only rotation always safe to test) with its full
`get_tileset_details` `entrances` result recorded next to its REAL door bearing data
(so the entrance-detection heuristic's actual hit rate per tileset is measured, not
assumed); each group's own corner-terrain pattern tabulated against the tileset's
declared floor/wall/border terrains (which ones will seam against which zone types);
a rough census of building-type variety (how many distinct named groups exist,
usable as a sanity check before promising a build "N distinct buildings" the way
`ttf01`'s sparse palette couldn't actually deliver); and, longer-term, some way to
flag which multi-tile groups are plausibly rotation-safe — there's no automated way
to tell a symmetric/repeatable piece from a unique-mesh-per-tile one from `.set` data
alone (per the settileLibrary finding above), so this might start as a manually
curated allow-list seeded by this pass rather than something fully automatic.

**Not yet scoped — real open questions before building this**: one area per tileset
vs. several (a tileset with hundreds of groups may not fit every one, unrotated,
into a single reasonably-sized area); whether this becomes a new MCP tool (a
`survey_tileset`-style capability that builds the throwaway module itself) or a
one-off script/skill run manually per tileset and its findings folded into this
doc; and how the output should be stored so it stays a living reference rather than
a one-time report — most likely a per-tileset findings doc under `docs/`, in the
same spirit as `docs/encounter-difficulty-findings.md` and the other verified-finding
docs this project already keeps, rather than something baked into `tileset.ts` itself.

**Tooling to prevent the classes of mistakes found late in one session's own
work (user-raised: "how do we avoid these in the future, can we add script
and tooling to keep progress moving forward").** Three real, self-inflicted
mistakes happened in one session while hand-fixing a shipped module. #1 and
#2 below are now fixed with real tooling rather than relying on remembering
prose rules under time pressure; #3 is still open.

1. **FIXED — `setGffByPath`/`modify_gff_field` now coerces a value to the
   field's real GFF type instead of storing whatever the caller sent
   verbatim.** Root cause of "modify_gff_field cannot write float fields" and
   the broader "corruption isn't limited to float fields" pitfall above: MCP
   clients routinely send numeric-looking params as strings (see
   `util/params.ts`'s own comment on why every numeric tool param is
   `z.string()`), and the old `field.value = newValue` had zero type
   awareness — a float field could end up as `{"type":"float","value":"60"}`,
   which `nwn_gff` rejects. `coerceGffValue()` in `util/gff-path.ts` now
   coerces against int/float/string GFF type families on every set (existing
   field: coerce against its real type; new field: coerce against the
   supplied `gffType`), and explicitly **refuses** `struct`/`list`/
   `cexolocstring`/`void` with a clear error rather than attempting and
   silently corrupting — those need real internal structure a flat
   path+value+type API can't express safely; use a typed tool instead. 9 new
   unit tests in `gff-path.test.ts` cover the coercion and the refusal.
   `modify_gff_field` is the one canonical tool for this class of edit now —
   there's no need for a parallel raw-script recipe anymore for simple scalar
   field edits (bulk edits across many structs in a list — the pattern behind
   this session's own faction-flip and store-field-rename fixes — still has
   no dedicated tool; that's real future work, not covered by this fix).
2. **FIXED — `load_module` now refuses to reload/switch when the current
   module has unpacked changes, instead of silently discarding them.** Root
   cause of the "never call load_module between an edit and its repack"
   pitfall being violated anyway: nothing enforced it. `util/dirty-state.ts`
   tracks which temp directories have been written to since their last clean
   point (scoped per-directory, not a single global flag — a global flag
   would make `create_module`'s own throwaway assembly-directory writes look
   like they dirtied whatever *other* module happened to already be loaded,
   a real cross-contamination bug caught while building this). `jsonToGff`
   (the near-universal write path — 30+ call sites across the codebase) and
   `writeAndCompileScript` both mark their target directory dirty on every
   write; `repack_module` and a fresh extraction both clear it. `load_module`
   now checks `isDirtyUnder(currentIndex.tempDir)` before re-extracting and
   throws a clear error naming the fix (`repack_module` first, or pass
   `force: true` to `load_module` to discard deliberately) — covers both
   reloading the *same* module and switching to a *different* one while the
   current module is dirty (switching wipes the old temp dir the same way a
   reload overwrites it). Verified end-to-end against a real module (not just
   unit tests): a scratch write correctly triggers a refusal, and `force:
   true` correctly re-extracts clean. 5 new unit tests in
   `dirty-state.test.ts`, including the cross-contamination case.
3. **FIXED — a race between a dispatched background agent's own
   `load_module` and concurrent direct edits to the same shared temp dir**
   from another process. Both a real orchestrator process and an Agent-tool
   subagent process share one temp dir per module (by design, so sidecar
   files like `adventure.md` persist) — confirmed genuinely separate OS
   processes, not shared in-memory state (a subagent's `load_module` really
   did revert the orchestrator's own pending edits mid-session; if they
   shared process state, reloading would have reused the same in-memory
   index instead of re-extracting). `util/module-lock.ts` adds a real
   file-based lock: a small JSON file (`.mcp-lock`, pid + timestamp) inside
   the temp dir itself, held for as long as a process has that module
   loaded — not just for one call. `load_module` acquires it for the temp
   dir right before extraction and releases the *previous* module's lock
   when switching to a different one; a process exiting without an explicit
   release (session just ends) is caught by a `process.on("exit")` handler
   as a safety net (deliberately not hooking SIGINT/SIGTERM — an MCP stdio
   server's SDK manages its own shutdown signals, and a competing handler
   calling `process.exit()` could short-circuit it). A free lock, a stale
   one (owning pid no longer alive — `process.kill(pid, 0)` liveness check),
   or one this same process already holds are all claimed immediately; one
   genuinely held by another live process gets a short bounded wait (3s,
   for quick transient overlaps) before throwing a clear error naming the
   holder's pid, rather than blocking indefinitely or silently interleaving.
   Verified with a real cross-process test (two separate `node` processes,
   not just unit tests): process A acquires and holds the lock, process B
   correctly refuses while A is active, and a third attempt after A exits
   correctly succeeds once the exit handler has released it. 7 new unit
   tests in `module-lock.test.ts` (the "genuinely locked" case uses an
   injectable short timeout so it doesn't eat the real multi-second wait in
   the suite). This closes the gap the dirty-state guard (item 2) couldn't:
   that guard only sees *this* process's own pending work; this is the
   cross-process half. Still worth keeping the operational habit from
   before as a second layer, not a replacement: avoid dispatching a
   background agent for a module while also doing direct edits on it in the
   same conversation when it's easy to avoid — the lock turns a silent
   revert into a loud, actionable refusal, but a loud refusal mid-workflow
   is still friction worth sidestepping when there's no real need to run
   both at once.

`get_tileset_details` defaults to `detail: "summary"` (~2KB) which includes terrain types, crosser types, valid terrain adjacencies, and group names. Use `detail: "full"` for the complete 60-100KB tile catalog.

### Tile Matching Rules

The **only** determining factors for tile selection from .set files are:
- **Corner terrains:** `TopLeft`, `TopRight`, `BottomLeft`, `BottomRight`
- **Corner heights:** `TopLeftHeight`, `TopRightHeight`, `BottomLeftHeight`, `BottomRightHeight`
- **Edge crossers:** `Top`, `Right`, `Bottom`, `Left`
- **Orientation:** the `.set` `Orientation` field (0/90/180/270 degrees)

The `.set` file `[PRIMARY RULES]` and `[SECONDARY RULES]` sections are **NOT functional for tile solving**. They are toolset autotiling rules for terrain propagation when painting in the toolset. They do not restrict which tiles can be placed where. **IGNORE them entirely.**

### Tile Orientation (corrected 2026-10-02 — see "Spatial Conventions" above)

`Tile_Orientation` n turns a placed tile **n × 90° counter-clockwise**. The `.set` corner terrains, corner heights and crossers are
**already in GIT-orientation-0 terms and are used as written — they are NOT un-rotated by the `.set` `Orientation` field** (an older
version of this paragraph said they were; that transform was removed, see the "orientation un-rotation" pitfall below, and the
live oracle confirms the raw values: 99.99 % of 274,500 real neighbour-corner comparisons agree). `getRotatedCorners` /
`getRotatedCrossers` / `getRotatedCornerHeights(tile, gitOri)` apply the counter-clockwise turn for a placed tile.

The `.set` `Orientation` field is the angle the tile's 3D **model** was authored at. The solver uses it only as a **preference**: it favours
tiles at their natural orientation over rotated alternatives that give the same corner pattern, which avoids visual artifacts from models
placed at non-native orientations.

### Terrain Adjacency Constraint

**Zone layouts must respect tileset terrain adjacency chains.** Tilesets only have transition tiles between specific terrain pairs. If two terrains can't transition directly, a buffer zone of the intermediate terrain is REQUIRED — the solver will NOT fabricate intermediate terrains.

**Before designing zones**, call `get_tileset_details` and check which terrains have transition tiles between them. Common adjacency chains:
- `tno01` (Castle Exterior Rural): `Trees → Grass → CastleWall → Dirt`
- `ttr01` (Rural): `Trees → Grass` (+ Water, Dirt variants)

You cannot skip terrains in the chain. For example, in `tno01` you must place a 1-tile `Grass` zone between `Trees` and `CastleWall` — no direct Trees↔CastleWall transition tiles exist. The solver will warn and fall back to incorrect tiles if adjacencies are invalid.

### Building Full-Tileset Survey Areas — Placement Efficiency, Multi-Area Packing, and Area Size Limits (2026-09-20)

Learned while building `tcn01-survey.mod`, a reference module containing a
dedicated survey area (or areas) per native tileset — every distinct corner
pattern plus every multi-tile feature group, laid out with 1-tile buffers so
each is visually inspectable in the toolset without touching its neighbors.
Covered tcn01, dag01, tno01, tcm02, trm02, ttu01, trs02 this session.

- **Hard confirmed limit: no NWN area can exceed 32x32 tiles per side.**
  `create_area`'s own tool schema states `width`/`height`: "Area width/height
  in tiles (1-32)". For a tileset whose combined pattern+group footprint
  (with 1-tile buffers on all sides, including diagonally) doesn't fit in one
  32x32 area — confirmed for tno01, tcm02, trm02, trs02 in this session, each
  needing 2-3 areas — split across multiple areas rather than attempting an
  oversized single area. There is no workaround; a 48x48 area was proven by a
  packer dry-run to fit everything for tno01/tcm02/trm02, but the engine will
  not create it.
- **Reusable buffer-respecting multi-area bin-packing algorithm** (ad-hoc
  Python, not checked into this repo — reproduce if needed): maintain a
  boolean `blocked` grid per area; `reserve(x0,y0,w,h)` marks the footprint
  **plus a 1-tile halo in all four directions** (including diagonals) as
  blocked; `place_greedy(w,h)` scans row-major for the first position where
  the full `w x h` footprint has zero blocked cells. Sort items
  largest-footprint-first before packing (better bin utilization than
  insertion order). When an area fills up (an item doesn't fit anywhere in
  it), start a fresh area and repack only the still-unplaced items into it —
  repeat until everything is placed. This guarantees no two features (or a
  feature and a reserved center waypoint) are ever closer than 1 tile apart,
  including diagonally, with zero manual coordinate arithmetic. Always
  re-verify the final placement list has zero duplicate `(x,y)` cells via a
  dedicated dedup script before issuing any write calls — eyeballing a large
  single-line JSON array for duplicates is unreliable (produced a false-positive
  "duplicate found" read this session that a script disproved).
- **Major efficiency win: batch raw-tile `paint_tiles` calls instead of
  per-group `paint_group` calls, whenever every placement is at rotation 0.**
  `paint_group`'s only real job beyond a plain tile write is the grid-slot
  remap for non-zero rotation (`rotateGroupTileIndex`) — at rotation 0 that
  remap is the identity, so a group's real world tiles can be computed
  directly as `(origin_x + gc, origin_y + gr, tileIds[gr*cols+gc])` for every
  non-`-1` entry (skipping holes), with no solver/group-awareness needed at
  all. Collecting an entire area's pattern tiles **and** every group's
  individual tiles into one `paint_tiles` array and issuing a single call
  cut this session's workload from an estimated 500+ tool calls (one
  `paint_group`/pattern-tile call each) down to ~10 (one `paint_tiles` call
  per area). `paint_tiles` handles large arrays fine in one call (tested up
  to 398 entries, ~21KB of JSON) — its per-tile response is verbose enough
  that large calls get auto-redirected to a file rather than inlined, which
  does **not** meaningfully consume context, so batching large arrays is safe
  to do freely. **This shortcut only applies at rotation 0** — a rotation
  test (see below) genuinely needs `paint_group`'s remap and cannot be
  batched this way.
- **Rotation-test areas need `paint_group`, not `paint_tiles`, and need
  rotated footprint dimensions during packing.** To build areas showing every
  multi-tile group rotated 90°/180° (done for tcn01: `tcn01_rot90`,
  `tcn01_rot180`), compute each group's *rotated* footprint first —
  `rotated_dims(cols, rows, rotation) = (rows, cols) if rotation is odd else
  (cols, rows)` — and pack using those swapped dimensions (the packer must
  reserve space for the shape the group will actually occupy after rotating,
  not its native shape). Place with `paint_group`'s `rotation` param
  (`"1"`/`"2"`/`"3"` for 90°/180°/270°), which performs the real internal
  grid-slot remap `paint_tiles` cannot.
- **Pattern tiles as a compact "every tile" stand-in.** Raw tile IDs within a
  tileset are mostly cosmetic model variants of the same corner pattern —
  showing every tile ID would be enormous and largely redundant. One
  representative tile per distinct corner-terrain pattern (the keys of
  `tileCatalog` from `get_tileset_details(detail:"full")`) is a much more
  compact and still-complete visual survey of the tileset's terrain-matching
  behavior.
- **World-coordinate note**: a 32x32 area's center in world units is
  `(160, 160)` — 16 tiles × 10 world-units/tile per axis. Useful for placing
  a center waypoint/module entry point without needing `adventure_find_walkable`
  first, when the center tile is known to be walkable.
- **A tileset's terrain can be genuinely, entirely non-walkable — this is a
  real property to report, not a bug.** `dag01`'s default "black" terrain
  fill (`adventure_find_walkable` returning zero candidates anywhere in a
  0-320,0-320 bounding box on `dag01_32`) is a legitimate finding about that
  tileset, confirmed by exhaustive search rather than a single failed probe.
- **Survey areas built this way are intentionally standalone/unreachable.**
  `check_area_connectivity` correctly reports every survey area as
  unreachable from the module's start area — expected and fine for a
  reference/inspection module with no gameplay transitions; do not "fix" this
  by wiring transitions unless the user asks for a playable module.

## Pitfalls that change how a tool call looks

Full record with evidence (including the older, partly superseded entries): `docs/pitfalls.md`.

- **Never call `load_module` between an edit and its `repack_module`** — a reload re-extracts the packed `.mod` and silently reverts unpacked edits (`load_module` now refuses unless `force: true`). See "Resource Loading" above.
- **Do not mix direct `nwn_gff` edits on disk with MCP tools on the same resource in one session** — the tools write their stale in-memory GIT back. Do all tool work first, direct edits last, repack immediately; read back before repacking.
- **Never pass `{}` as the annotations argument of `server.tool()`** — omit it or give real hints (guarded by `tool-registration-shape.test.ts`).
- **`modify_gff_field` is for flat scalar edits only**; prefer a typed tool for dialogs, lists and structs.
- **Equipped item resref field is `TemplateResRef`**, not `EquippedRes`.
- **`write_script` `compile: true` races**: use `write_script(..., compile: false)` then `compile_script`.

- **`nwn_script_comp` positional arg.** Most nim tools use `-i <file>`, but `nwn_script_comp` takes the source file as a **positional argument** (last): `nwn_script_comp [options] [-o out] file.nss`. Using `-i` silently fails.
- **Numeric tool params must use `z.string()`.** The MCP SDK validates JSON Schema before Zod transforms execute, so `z.coerce.number()` fails when clients send strings. Use `z.string()` + `toF()`/`toI()` helpers from `src/util/params.ts`. Same for complex array params — use `z.string()` + `JSON.parse()`.
- **Resman tools are slow.** Every invocation initializes the full resman stack. Default timeout (30s) is too short for piped operations — `resmanCatToJson()` uses 120s.
- **Temp dir contains cache subdirs.** `resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/` — all auto-excluded from `erfPack()` by the `isFile()` filter. Never pack these into the module.
- **`validate_module` false positives.** Base game scripts (`nw_c2_default5`, etc.) and items (`nw_wblms001`) are resolved at runtime — filter these "missing" references.
- **`create_dialog` condition field.** The `condition` on a node goes on the **link pointing to it** (`Active` field), not the node itself.
- **GIT trigger field name is `TriggerList`** (no space), not `"Trigger List"`. Other no-space list names: `SoundList`, `StoreList`, `WaypointList`. With-space names: `Creature List`, `Door List`, `Encounter List`, `Placeable List`.
- **Triggers need Geometry in placed instances.** UTT blueprints from resman do NOT contain geometry. When placing triggers, always ensure the `Geometry` list field exists with at least 4 vertices (PointX/PointY/PointZ). Without geometry, the engine won't detect entry and the toolset won't render the trigger.
- **GIC must be synced with GIT.** The toolset uses the GIC file to index objects in an area. `writeBackGit()` automatically syncs the GIC. Without GIC entries, objects exist in the GIT but the toolset doesn't show them.
- **A placed instance's `VarTable` (and other per-instance fields) is a separate copy from its UTC blueprint's — editing one does not edit the other.** `place_creature`/`create_creature_blueprint`'s own `varTable` param is unaffected by this (it sets the blueprint before the object is ever placed, so there's only one copy to get right at creation time) — the gap is specific to editing a creature that's *already placed* in a `.git`. Confirmed directly: batch-adding `SPEC_*` local variables to 110 already-placed companions' `.utc` files (verified present there via independent `nwn_gff` extraction) produced total silent failure at runtime — every one read back as unset, because the actual placed instances in the area's `.git` still only carried their original vars. The fix wrote the same entries into the `.git`'s `Creature List` directly. Same family of bug as the previously-found `SoundSetFile` case (a `modify_gff_field` write to a blueprint alone left a placed instance's voice unchanged) — treat any field edit made *after* placement as needing both files, never just the blueprint.

## Verification Gate (verify_* tools)

Generated `.nss` has the compiler as its acceptance gate. Nothing played that role for
any other generated file type, so structurally-broken assets shipped silently. The
`verify_*` family (`src/tools/verify-tools.ts` + `src/util/verify/*.ts`) is that gate.

- **Complements `validate_module`, does not replace it.** `validate_module` does
  cross-reference checks (does the named script exist). `verify_*` does intra-file
  structural and semantic checks (does this dialog carry the fields the engine silently
  requires; is this tile ID inside the tileset; is this NPC standing somewhere reachable).
- **Severity is a contract.** `error` = the engine or toolset will misbehave ⇒ blocks.
  `warning` = quality/plausibility ⇒ advisory. Each finding carries a stable `code` so
  skills can branch on a specific defect, and a `fix` naming the tool that repairs it.
- **`verify_all` is the shipping gate.** `shippable: true` means zero errors module-wide.
  `/adventure-polish` runs it last; every other phase verifies its own output before
  writing `success` to `adventure-status.json`.
- **Base-game scripts are whitelisted by prefix** in `isBaseGameScript()`
  (`src/util/verify/common.ts`) — `nw_c2_default*`, `x0_ch_hen_*`, `nw_ch_ac*` and
  friends resolve at runtime and must never be reported as missing.

**Checks and history.** The checks themselves live in `src/util/verify/*.ts` (each finding has a stable `code` and a `fix`); `verify_all` also walks placed GIT creatures, not only `.utc` files. The history of each check, the user-correction rounds, `run_live_verification`, the systest module, the `create_faction` engine limitation and the Hollow Communion playtest rounds are in `docs/verification-history.md`. Read it before changing a check or the live-verification loop.

## Quest system (2026-11-07)

**Standard path for quests: `build_quest(spec, dryRun)`** (+ `create_quest_system`, `remove_quest`); reference
`docs/quest-system.md`, source `src/util/quest-{spec,builder,script,vars}.ts`, `src/tools/quest-tools.ts`. Ported from TFN's
`inc_quest.nss`/`dlg_q_*` and the TFN content studio's courier/rescue/escort runtime: **vanilla** (quest state = the engine's
`NW_JOURNAL_ENTRY<tag>`; no SQLite/NWNX), **whole party** (user decision: any member's advance moves every journal and pays every
player 100 %), TFN's `questK = "<stage>_<tag>"` variable contract and eligibility rules. Every dialog line uses `q_chk`/`q_act`
with script parameters; skill checks roll once in `q_roll` (an action — TFN rolled inside a condition). Fixed TFN bugs: AoE
advances always used `quest1`, slots stopped at 19, Bluff check had condition side effects and skipped stages, unchecked reward
items, two-digit stages, pickups only slot 1. `verify_journal` / `verify_quest_completability` read the quest variables
(`quest-vars.ts`); before that they read only script text and native dialog fields. **Not live-tested:** the headless server has
no player, so no stage can advance there; all scripts compile with `nwn_script_comp`.

## Co-op / Multiplayer Rules

**Every module is assumed to be party-playable by default.** A dialog action script runs
once, on the NPC, with exactly one PC as `GetPCSpeaker()`. Any reward handed to that
object alone reaches one player and silently skips the rest — invisible in solo testing,
which is why it survives to multiplayer. Enforced by `verify_coop_rules`:

- **XP/gold/items must fan out.** Use the generated `inc_reward` helpers
  (`create_reward_system`), or loop `GetFirstFactionMember(oPC, TRUE)` /
  `GetNextFactionMember(oPC, TRUE)` by hand. A bare
  `GiveXPToCreature(GetPCSpeaker(), n)` is an **error**, not a warning.
- **`AddJournalQuestEntry`'s 4th arg (`bAllPartyMembers`) defaults to TRUE** — never pass
  FALSE, or one player's journal advances while the rest cannot complete the quest.
- **Shared quest state must not live on a single PC.** `SetLocalInt(GetPCSpeaker(), ...)`
  gives each player their own copy; use `GetModule()` or the quest giver.
- **Single-player modules opt out** with `coop: false` on `verify_coop_rules`/`verify_all`.
  The same findings are still reported, as warnings rather than errors.

### Skill-check puzzle/investigation challenges (user-specified pattern, 2026-10-13)

A bespoke "use this placeable, roll a skill check" obstacle (a hidden clue under a rug, a
locked strongbox's contents) is currently always orchestrator-authored per module — no
sub-skill builds one by default (see e.g. Hollow Communion's `adventure.md` Custom
Mechanics, which explicitly carves these out of `/adventure-challenges`' scope). Two rules
apply to every one of these, going forward:

- **Cap attempts per PC (1-2), tracked on the PC, not the module.** An unlimited-retry skill
  check is not a check at all — re-click until the d20 cooperates. Track the attempt count as
  a local int on the triggering PC (`GetLocalInt/SetLocalInt(oPC, "<unique>_ATTEMPT")`), not on
  `GetModule()` — a module-level counter would also block a *second* real PC's own attempts in
  a multi-PC party, which this project's co-op convention (every module is party-playable by
  default) says must not happen. Each PC gets their own full attempt budget.
- **Henchmen can "intervene" on the roll — via skill comparison, not by acting themselves.**
  The standard associate AI never autonomously clicks a placeable, so "let the henchman try"
  can't mean literally having them use the object. Instead, the roll uses the BEST skill rank
  among the triggering PC and all of that PC's own henchmen: loop `GetHenchman(oPC, i)` for
  `i = 1..4` (bounded by this project's own henchman-count convention) until
  `GetIsObjectValid()` fails, taking the highest `GetSkillRank()` found. This both answers "can
  a companion help" and matches the kind of design intent already written into Hollow
  Communion's own `adventure.md` ("any sufficiently skilled party member can attempt it... NOT
  hard-gated to needing [a specific companion] present") — that intent existed in the design
  doc but the first-built scripts (`a_clue_rug`/`a_clue_seal`) only ever read the clicking PC's
  own skill, silently ignoring every henchman.
- **Worked reference implementation**: `a_clue_rug`/`a_clue_seal` in Hollow Communion
  (`miller_house`) — a Search check (DC 13) and a Lore check (DC 14) respectively, each capped
  at 2 attempts per PC, each rolling the best Search/Lore rank among the triggering PC and
  their henchmen. Copy this shape for the next module that needs one, rather than re-deriving
  it; nothing about it is module-specific except the two skill/DC/flag constants.
- **CORRECTION (2026-10-13) — the henchman-skill enumeration in the reference
  implementation above was wrong the first time it shipped, and the user caught it live:
  "My henchmen don't appear to be able to assist me in challenge rolls."** The original
  version looped `GetHenchman(oPC, i)` for `i = 1..4` — a real engine function, confirmed to
  *compile*, but never confirmed to actually enumerate a PC's associates at runtime before
  shipping it. **Rule: compiling is not verifying.** Rewritten to use a mechanism this exact
  module had *already* runtime-confirmed correct elsewhere: `c_hen_mine`'s own dialog
  conditional gates on `GetMaster(oHenchman) == oPC`, proven working by the dismiss/rejoin
  dialog flow functioning correctly. The fixed version loops
  `GetFirstFactionMember(oPC, FALSE)`/`GetNextFactionMember(oPC, FALSE)` (bPCOnly FALSE, so it
  walks NPCs too) filtered to `!GetIsPC(oMember) && GetMaster(oMember) == oPC`. **Still not
  independently live-verified** — this project's live verify-server can run a creature through
  real engine logic headlessly, but has no way to simulate an actual logged-in PC client
  clicking a placeable, so the exact trigger path (`GetLastUsedBy()` on a real player's click)
  couldn't be tested before shipping this correction either. If this specific mechanism still
  doesn't work when the user retests, the next thing to check is whether `GetMaster()` itself
  behaves differently for a dismissed-then-rejoined henchman than for one recruited fresh —
  not yet ruled out.

### Rewards are per-player, not a divided pot

**Quest rewards are NOT split by party size — each player receives 100%.** This is the
default policy and the one to keep. `RewardPartyXP`/`RewardPartyGP` in `nw_i0_tool` are
loops calling `GiveXPToCreature(oPartyMember, XP)` with the *same* amount for every
member; they divide nothing. Only **combat** XP is divided by the engine.

`create_reward_system` generates `inc_reward.nss` with the policy baked in:

| Helper | Behaviour under the default FULL policy |
|---|---|
| `CoopRewardXP(oPC, n)` | every player gets `n` |
| `CoopRewardGold(oPC, n)` | every player gets `n` |
| `CoopRewardItem(oPC, r, c)` | every player gets their own copy |
| `CoopRewardClassItem(oPC, t)` | every player gets the tier-`t` item matching **their own** primary class |
| `CoopRewardQuest(oPC, x, g, t)` | all of the above in one call |

- **Policies:** `full` (default, 100% each), `split` (XP/gold divided; items go to the
  triggering PC, since an item cannot be halved), `speaker` (single-player).
  `sharePercent` scales every payout and never rounds a positive reward to zero.
- **Callers pass the triggering PC** (`GetPCSpeaker()`, `GetLastUsedBy()`) and never
  iterate the party themselves. The helpers walk PCs only — `GetFirstFactionMember(oPC,
  TRUE)` — so henchmen never absorb a share.
- **`CoopPrimaryClass` picks the highest base-class level**, so a multiclass PC gets gear
  matching what they actually play rather than whichever class came first.
- **An include cannot compile standalone** (no `main()`), so the tool proves it with a
  throwaway probe script and reports `compiles`. Never trust an unverified include.
- **Placed loot cannot fan out.** A chest with one sword is first-come-first-served, and
  no checker can see it — hand shared signature rewards out from a script instead.

## Henchmen / Companions

**Standard path (2026-11-08): `create_companion_system` (once per module) + `build_companion` per companion (blueprint, forge, placement, dialog, verification in one call; `create_companion_dialog` is the lower-level piece). Earlier (2026-11-07): `create_companion_system` + `create_companion_dialog`
(per companion), source in `src/util/companion-script.ts`.** The party cap is counted from the engine at
join time (living henchmen of PC masters in the recruiting PC's party), never kept in a module counter —
the hand-written Hollow Communion scripts kept `HC_HENCH_COUNT`, missed the decrement on dismiss and then
on death (each permanently blocked recruiting), and decremented on the death of a companion never
recruited. Join raises `SetMaxHenchmen` before `AddHenchman`, so no `a_mod_load` is needed. Compiled
against the real compiler; not live-tested (the headless verify server has no PC to recruit with).

`create_creature_blueprint`'s `henchman: true` wires all 13 script fields to the stock
BioWare associate AI (`x0_ch_hen_*`). These are base-game resources resolved at runtime —
**never write them into the module**.

- **`SetMaxHenchmen()` must run before `AddHenchman()`.** `AddHenchman` is a silent no-op
  when the cap is too low. The generated `a_mod_load` raises it and chains the previous
  `Mod_OnModLoad` handler rather than replacing it.
- **`SetAssociateListenPatterns()` must be called on recruit.** The engine delivers radial
  follow/stand-ground orders as a silent command shout matched in the companion's
  OnConversation handler. Omit this and it ignores every order.
- **`ScriptDialogue` = `x0_ch_hen_conv` and `ScriptHeartbeat` = `x0_ch_hen_heart` carry the
  feature.** The latter tail-calls `nw_ch_ac1`, the actual follow AI. Never set `nw_ch_ac*`
  in a UTC field yourself.
- **Never build a companion on a Commoner chassis** (`nw_bartender`, `nw_oldman`,
  `nw_convict`, `nw_shopkeep` are all class 20). `LevelUpHenchman` grants a Commoner no
  feats and no spellbook — the root cause of the "cleric has no spells" report. Use a
  PC-class chassis and set `startingPackage`.
- **`startingPackage` is not optional — it silently defaults to 0 (Barbarian's package)
  if unset,** which is correct only for an actual Barbarian and wrong for every other
  class, degrading `LevelUpHenchman()`'s feat/skill/spell picks. **Verified rule: for
  every base class's iconic package, `packages.2da` row index equals class ID**
  (Barbarian=0, Bard=1, Cleric=2, Druid=3, Fighter=4, Monk=5, Paladin=6, Ranger=7,
  Rogue=8, Sorcerer=9, Wizard=10) — always set `startingPackage` to the same number as
  the companion's `classes` entry. `verify_creature(henchman:true)` now flags
  `henchman_no_package` when this is missed (`src/util/verify/blueprints.ts`).
- **Appearance needs no chassis clone.** `appearance.2da` rows 0-6 (Dwarf, Elf, Gnome,
  Halfling, Half-Elf, Half-Orc, Human) map 1:1 by label to the same numeric
  `racialtypes.2da` rows used by the `race` field, for the 7 standard PC races. Set
  `race` and `appearance` to the same value and skip `sourceResref` entirely — this was
  the root cause of a "henchmen have no appearance" report: `buildMinimalUtc()`'s own
  defaults are `Race=6` (Human) but `Appearance_Type=0` (Dwarf), a real mismatch out of
  the box, not just an unset field. `verify_creature` now flags
  `appearance_race_mismatch` for any creature (not just henchmen) where these disagree
  within the standard-race range.
- **TODO — randomize head/hair-color/skin-color for standard PC-race NPC appearances
  (user-raised).** `buildMinimalUtc()`'s `Appearance_Head`/`Color_Hair`/`Color_Skin`/
  `Color_Tattoo1`/`Color_Tattoo2` defaults are fixed values matched from two real sample
  henchmen (`hen_dorna.utc`/`hen_linu.utc`, see the "invisible henchmen" pitfall above) —
  every generated NPC on a standard PC-race appearance (rows 0-6, the bullet above)
  currently looks identical unless hand-varied per creature. User wants this randomized,
  following the same approach an existing sibling project, **GvE3** (`~/git/gve3`,
  per this project's shared-tooling convention — see the global CLAUDE.md), already uses
  for its own NPC/PC appearance randomization. **Not yet scoped — GvE3's actual
  implementation (script/table/value ranges) hasn't been read yet, and nothing here
  should be guessed at ahead of that** (matches this project's "never guess, verify
  against real data" discipline — see the 2DA-research-technique memory). Before
  building: find and read GvE3's real randomization script/include, confirm its real
  head-count-per-race/gender source (likely `appearance.2da` or a head-count table) and
  its real `Color_Hair`/`Color_Skin` value ranges (skin-tone ranges plausibly differ by
  race, so don't assume one universal range), then port the verified mechanism rather
  than inventing new ranges. Likely landing spot: a `complexity`-style opt-in on
  `build_npc_stat_block` or a new dedicated appearance-randomization tool, seeded
  deterministically the same way `pickWeaponPreference` is (by the creature's own
  tag/resref) to keep generated content reproducible rather than dice-rolled.
- **An empty `FeatList` on a fresh level-1 blueprint is expected, not a defect** — but
  **verified via a live headless server run: `GetHasFeat()` does NOT reflect any
  engine-computed racial feat set when `FeatList` is empty; it strictly reads the actual
  `FeatList`.** `racialtypes.2da`'s `FeatsTable`/`ExtraFeatsAtFirstLevel`/
  `NormalFeatEveryNthLevel` columns describe what a racial feat progression *should* look
  like, but nothing populates `FeatList` from them automatically — that population is
  meant to happen via the live `LevelUpHenchman()` call below, same as class feats. An
  empty `FeatList` is a legitimate *transient* state on a level-1 blueprint that hasn't
  been leveled yet; it is not a legitimate *permanent* state for any creature a script
  might later `GetHasFeat()`-check. Confirmed in a real end-to-end run: 110/110 companions
  built with `ClassList` set directly to a target level (never run through
  `LevelUpHenchman()`) failed a racial-feat `GetHasFeat()` check, 100% consistently. Don't
  hand-populate `FeatList` to "fix" an apparently-empty one on a level-1, about-to-be-leveled
  blueprint — but don't assume racial feats are "handled automatically" for a creature
  that's meant to stay static at a level above 1 either; it needs a real
  `LevelUpHenchman()` pass.
- **Abilities come from vanilla `LevelUpHenchman(oHench, CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID)`**
  at recruit, looped to the blueprint's `HENCH_LEVEL` local. `bReadyAllSpells = TRUE`
  matters — without it the companion joins with an empty memorized list.
- **CORRECTION, verified via a live headless server run: `LevelUpHenchman()` grants ZERO
  automatic/non-chosen feats — not class proficiencies, not racial feats, at any level,
  for any class.** This directly contradicts the "Class/bonus feats are meant to come
  entirely from the live `LevelUpHenchman()` call" line two bullets above — that line is
  now known wrong and needs fixing, not just this note. Confirmed by direct probe: even
  basic Simple/Martial Weapon Proficiency was absent from a level-5 Fighter after a real,
  successful `LevelUpHenchman()` leveling pass. Automatic feats are apparently a
  character-creation-time concept (package application via the toolset's own character
  creation flow), not something this runtime call ever does for an NPC. **The only proven
  fix**: populate `FeatList` directly at build time — racial feats unconditionally from
  `race_feat_<race>.2da` (every row is automatic, no level gating — the table has no
  `List`/`GrantedOnLevel` columns), class feats from `cls_feat_<class>.2da` filtered to
  `List=3` and `GrantedOnLevel <=` the target level. Full tables for all 7 standard PC
  races and 11 base classes were captured and applied to repair a real module this
  session. **Now applied to `adventure-actors/SKILL.md`'s actual companion-creation
  recipe** — Phase 3b's old "an empty FeatList is expected" claim (and the matching
  claim that feats come from the live `LevelUpHenchman()` call) was corrected in place
  with the four-source static-baking approach (racial/automatic-class/generic-schedule/
  class-bonus-slots), plus new skill-point-baking and equipment-sourcing sections
  covering everything found in the session that finally closed this gap.
  Separately, also confirmed: `LevelUpHenchman()` silently refuses to grant a level in an
  alignment-restricted class (`classes.2da`'s `AlignRestrict` — Monk needs Lawful, Paladin
  needs Lawful Good) when the creature's `LawfulChaotic`/`GoodEvil` don't qualify. A
  companion built at a generic neutral alignment will silently cap at level 1 forever if
  its class is Monk or Paladin — set alignment to match the class before leveling.
- **Static verification can't confirm this actually worked at runtime — `create_spec_verification`
  closes that gap.** It generates `inc_spec_check.nss` (`src/util/spec-check-script.ts`),
  whose `SPEC_VerifyCreature(oCreature)` compares actual runtime race/appearance/class/
  level/package/feats/spells against `SPEC_*` local variables set on the blueprint (via
  `create_creature_blueprint`'s `varTable` — see `adventure-actors/SKILL.md` Phase 3b's
  template), logging `[SPEC_OK]`/`[SPEC_FAIL] tag=... field=... expected=... actual=...`
  lines. `a_hen_join` calls it as its last line. It is gated by the **module** local
  `MCP_VERIFY_MODE` (set `1` by `a_mod_load` during generation, flipped to `0` as the last
  build step before delivery) — `module.ifo` has no `VarTable` field to bake a static flag
  into, unlike UTC/UTP blueprints, so this must be a runtime `SetLocalInt` rather than a
  GFF field. See `docs/runtime-verification-spec.md` for the full design, including the
  build→run→check→repair orchestration loop this is meant to support (not yet
  implemented — see the TODO under "Verification Gate" above for the live-server piece).
  **Representative-feat data is real, verified 2DA lookups for all 11 base classes and
  all 7 standard PC races** (`RACIAL_FEATS`/`CLASS_FEATS` in `src/util/spec-check-script.ts`)
  — `SpecExpectedClassFeat()`/`SpecExpectedRacialFeat()` return `-1` (check skipped, never
  a false pass) only for anything outside those 11 classes/7 races.
- **Companion voices must be TYPE 0 (PC voiceset) rows** from `soundset.2da`. TYPE 3 NPC
  sets are sparse and leave the companion intermittently mute.
- **Static spell-baking IS possible — the GFF struct format was unknown, now verified.**
  An earlier session note claimed "no static spell-list structure exists on `ClassList`"
  and treated spell-granting as solvable only via a live `LevelUpHenchman()` call. That
  was premature — `ClassList[n]` does carry `MemorizedList0`-`MemorizedList9` (one list
  per spell level, 0 = orisons), each entry a struct with `Spell` (word, `spells.2da`
  row), `SpellFlags` (byte, `1` = ready/available), `SpellMetaMagic` (byte, `0` normally).
  Confirmed against two *never-live-leveled* static NPC blueprints in `~/tfndev`
  (`guard_cleric.utc`, `devrandomcleric.utc` — ordinary map NPCs, not henchmen that get
  leveled at recruit) — real BioWare henchmen (Nathyrra, Bim, Valen, checked this same
  session) are NOT useful references here, since they ship at level 1 in a *non-caster*
  base class and only gain their real caster levels via a live leveling call at recruit,
  same as this project's own henchmen. **For a companion, this only helps if you're
  deliberately baking a static caster (no live leveling planned) — a companion that goes
  through the normal recruit-time `LevelUpHenchman()` flow should keep using that, not
  this.** Slot count at level 1 with no metamagic/domain feats: base class table
  (`cls_spgn_<class>.2da`) gives orisons + 1 known-level slots; a positive ability
  modifier for the casting stat adds a same-count bonus spell per spell level the class
  can currently cast (e.g. Wis 16 → +1 first-level slot for a level-1 Cleric). Applied
  once, to one hand-verified test creature (a Human Cleric in Henchman Gear Showcase) —
  not yet wired into `create_creature_blueprint` or the `adventure-actors` skill as a
  general capability. **Superseded by the shipped runtime system below** for the
  "give a caster NPC spells" problem in general — this GFF-struct finding stays useful
  background (it's *how* `MemorizedList` is shaped, which the runtime system below
  never needs to know since it writes through the engine's own setter instead), but
  static per-blueprint baking is no longer the recommended path.
- **BUILT (2026-09-10) — real per-playthrough random caster spellbooks, computed
  entirely in NWScript at `OnSpawn`, no MCP/build-time baking.** User-specified design:
  a caster NPC's spells should be different every time the module loads, calculated by
  NWScript alone, applied by default to every caster NPC this project generates unless
  a story/plot reason calls for a fixed loadout. The previous assumption in this doc
  (echoed above) was that no vanilla-NWScript path exists to mutate a creature's real
  spellbook at runtime — **that assumption was wrong**, found by re-reading the real
  `nwscript.nss` (EE) rather than trusting the earlier note: the engine has native
  `SetMemorizedSpell(object oCreature, int nClassType, int nSpellLevel, int nIndex, int
  nSpellId, int bReady=TRUE, ...)` plus `GetMemorizedSpellCountByLevel`/
  `ClearMemorizedSpell`, gated only to classes where `classes.2da`'s `MemorizesSpells`
  column is `1`. Verified against the real `classes.2da`
  (`/var/www/storage/2DAs/8193.35_2dasource_full/classes.2da`): `MemorizesSpells=1` for
  **Cleric, Druid, Paladin, Ranger, Wizard**; `=0` for **Bard, Sorcerer** (spontaneous
  casters use `SpellbookRestricted=1` instead) — and there is **no runtime setter for
  "known spells"** (`GetKnownSpellCount`/`GetKnownSpellId`/`GetIsInKnownSpellList` exist,
  no `Set`/`Add` equivalent), so true native spellbook randomization only reaches 5 of
  the 7 caster classes.
  - **Tier 1 (Cleric/Druid/Paladin/Ranger/Wizard):** `RA_OnSpawn` builds an eligible
    spell pool per spell level via the real engine function `GetSpellLevelByClass(
    nClassType, nSpellId)` (never hand-parses `spells.2da`'s per-class column text),
    bounded by the real `Get2DARowCount("spells")`, shuffles it with the native
    `JsonArrayTransform(jArr, JSON_ARRAY_SHUFFLE)`, and writes the result via the real
    `SetMemorizedSpell()`. Slot counts per spell level come from `cls_spgn_<class>.2da`
    — confirmed the table's `Level` column is that class's own level directly (row
    index = level − 1) even for a late-casting class: `cls_spgn_pal.2da` rows for
    Paladin levels 1-3 are all `****`, and level 4 (row 3) is the first row with a real
    `SpellLevel1` value, matching Paladin's `MinCastingLevel=4`. Nothing else needs to
    change — the creature's existing, untouched default/henchman combat AI already
    casts from a real memorized spellbook automatically.
  - **Tier 2 (Bard, Sorcerer):** same pool/count logic, but since there's no runtime
    known-spell setter, the chosen spell ids are stored as one `SetLocalJson(oCreature,
    "RA_L<level>", jArr)` per populated spell level instead. `RA_OnEndRound` (wired onto
    `ScriptEndRound`) has a tunable per-round chance to cast one via
    `ActionCastSpellAtObject`'s real, documented `bCheat=TRUE` param, which lets a
    creature cast a spell it doesn't officially know — targets the creature's real
    `GetAttackTarget()`. Known simplification: doesn't distinguish an offensive spell
    from a self/ally-targeted one; low risk since Tier 2 is only two classes whose
    low-level lists skew offensive. **Confirmed fully working end-to-end against a
    real headless server** — no known limitations.
  - **Implementation:** `src/util/random-abilities-script.ts`
    (`generateRandomAbilitiesInclude`) + `src/tools/random-abilities-tools.ts`
    (`create_random_abilities_system` MCP tool), following the exact generator/probe-
    compile pattern `create_reward_system`/`create_spec_verification` already
    established (`writeAndCompileScript` + a throwaway probe script, since an include
    has no `main()`). 24 unit tests in `random-abilities-script.test.ts` (no
    integration test, matching `create_reward_system`/`create_spec_verification`'s own
    precedent — their compile-probe needs a real nim toolchain/resman this suite
    doesn't mock, so generator unit tests are the established coverage bar for this
    tool class).
  - **Wiring is skill-level, not a `create_creature_blueprint` default** — this matches
    the *existing* convention `inc_spec_check`'s `a_hen_spawn` already uses (see
    `adventure-actors/SKILL.md`), not a new mechanism: a small per-role wrapper script
    (`ExecuteScript()` on the creature's original `ScriptSpawn`/`ScriptEndRound`, then
    `RA_OnSpawn`/`RA_OnEndRound`) is written via `write_script` and pointed at by
    `create_creature_blueprint`'s existing `scripts` param override — never touching
    the tool's own default-resolution logic. This is intentionally the safer,
    lower-risk integration point: a direct/human tool caller editing a module by hand
    sees no surprise behavior change, and the "opt-out for a story-specific fixed
    ability" escape hatch is simply *not writing the wrapper* for that one NPC (keep
    using the existing `spells`/`SpecAbilityList` param instead).
  - **Portable by construction**: depends on nothing but base-game 2DAs
    (`classes.2da`, `cls_spgn_*.2da`, `spells.2da`) and base-game engine functions — no
    project-specific table, no MCP dependency, no NWNX. The generated file(s) can be
    copied into any other vanilla module's script resources verbatim, matching the
    portability bar `inc_reward.nss`/`inc_spec_check.nss` already meet.
  - **Wired into the pipeline**: `adventure-actors/SKILL.md` calls
    `create_random_abilities_system` once per module (Phase 3b Step 2, alongside
    `create_spec_verification`), and both the companion recipe (`a_hen_spawn`/
    `a_hen_endround`, chaining the henchman AI) and the Key NPC recipe (`a_ra_spawn`/
    `a_ra_endround`, chaining the plain default AI) wire it in — see the "Tier 1
    real-runtime findings" item immediately below for why this wiring is now known to
    be incomplete for Tier 1 specifically. The `spells`/`SpecAbilityList` param
    remains the documented opt-out for one specific NPC.
  - **CONFIRMED VIA REAL HEADLESS SERVER TESTING (2026-09-10) — Tier 1 has two real,
    unresolved limitations; Tier 2 has none.** A dedicated verification pass (own
    docker `nwnxee/unified` instance, `~/nwn-mcp-verify-server`, module copied in and
    restarted per iteration — see `docs/random-abilities-runtime-findings.md` for the
    full blow-by-blow) found:
    1. **The original per-level-rescan design really did exceed the script
       instruction budget**, exactly as flagged as a risk before shipping: a level 5
       Wizard's first (cheapest) scan succeeded (orisons written) while every later
       spell level silently got nothing, no error logged. Fixed by restructuring to a
       single pass over `spells.2da`, bucketing into ten independent flat JSON arrays
       selected by if/else-if (not nested-array indexing, and not a `switch` — see
       `random-abilities-script.ts`'s header comment for why both alternatives were
       tried and rejected). This fix is confirmed correct and shipped.
    2. **A from-scratch, never-live-leveled blueprint only ever gets level 0
       (cantrip) slots for Tier 1, no matter how good the pool logic is.**
       `GetMemorizedSpellCountByLevel()` — the real bound `SetMemorizedSpell()`
       silently respects — reports 0 for every spell level past 0 on such a
       blueprint, regardless of what `cls_spgn_<class>.2da` states. Since a companion
       doesn't get `LevelUpHenchman()`'d until recruit (`a_hen_join`), which fires
       well after `ScriptSpawn`, wiring `RA_OnSpawn` at `a_hen_spawn` (raw spawn) is
       the wrong timing for Tier 1 — it can only ever roll cantrips. **Not yet fixed**:
       `RA_OnSpawn` should be called after `LevelUpHenchman()` for companions
       (chained into `a_hen_join`), not at `a_hen_spawn`.
    3. **Even after a real `LevelUpHenchman()` pass, a level 5 Wizard's level 2-3
       slots still report 0 from the engine**, while level 0 and level 1 correctly
       became real, populated, readable-back slots. Root cause not isolated — the
       leading candidate is Wizards' `SpellbookRestricted` scribing mechanic (a
       Wizard must "know" a spell before memorizing it, unlike the other four Tier 1
       classes) combined with `LevelUpHenchman()`'s automatic AI possibly not
       populating known spells the way the toolset's own level-up UI would. This
       needs real further investigation (see the doc above for the concrete next
       experiments) before Tier 1 can be trusted above cantrip+1st-level.
       **`docs/tfndev-random-npc-system-findings.md` traces how `~/tfndev`'s own
       mature random-NPC system approaches this exact class of problem, and this
       project tested the leading hypothesis to completion — it's refuted.**
       tfndev's memorizing-class spell writes are plain `SetMemorizedSpell()` too
       (no known-spell pre-step), so the hypothesis was that the real fix is
       upstream, in how a creature gets its class levels: `NWNX_Creature`'s
       level-manipulation functions might correctly initialize per-level
       spell-slot state where vanilla `LevelUpHenchman()` doesn't. **Tested
       directly against a real, working NWNX setup** (a throwaway copy of
       `~/uoa`'s own live production module, run on the exact `nwnxee/unified`
       tag/ABI its real server uses — the project's own module wouldn't load on
       any tag old enough to have a working NWNX ABI, a separate infrastructure
       problem documented in the findings doc): `NWNX_Creature_LevelUp` produces
       **the identical level-2+ ceiling** vanilla `LevelUpHenchman()` does,
       including NWNX's own `GetMaxSpellSlots()` reporting 0, not just
       `GetMemorizedSpellCountByLevel()`. The leveling mechanism was never the
       variable that mattered. **Followed up and also refuted**:
       `NWNX_Creature_AddKnownSpell` on the Tier 1 class itself genuinely worked
       (confirmed via `GetKnownSpellCount` going 0→1) but didn't move the slot
       ceiling at all — and neither did `NWNX_Creature_SetRemainingSpellSlots`, a
       *direct* setter for the exact stuck value. **All three NWNX avenues tried
       hit the identical ceiling — the NWNX route for this specific problem is
       now closed**, not just this one hypothesis; whatever gates it looks
       structural (a per-level slot data structure likely only ever allocated for
       a fixed, small number of levels somewhere in creature initialization, not
       growable afterward by any scripting call, vanilla or NWNX) rather than
       "the right call hasn't been found." A real,
       independently-confirmed instruction-
       budget insight from a separate, real, shipped integration of the same
       tfndev system (UniverseOfArlandia, see
       `~/.claude/projects/-home-qlippoth-git-UniverseOfArlandia/memory/
       random-adventurer-henchman-feature.md`): `ExecuteScript` shares the
       caller's instruction budget, `DelayCommand` gets a fresh one. **Applied**:
       `adventure-actors/SKILL.md`'s `a_hen_spawn`/`a_hen_endround`/`a_ra_spawn`/
       `a_ra_endround` wrapper templates now call `DelayCommand(0.5,
       RA_OnSpawn(OBJECT_SELF))`/`DelayCommand(0.5, RA_OnEndRound(OBJECT_SELF))`
       instead of calling them inline after `ExecuteScript`ing the original
       default script. This is defense-in-depth, not a fix for a currently-
       reproducible failure — the single-pass bucketing fix (above) already
       resolved the one real instruction-budget bug this project found, and the
       Tier 1 level-2+ ceiling (also above) is a separate, NWNX-confirmed-
       structural limitation unrelated to instruction budget at all.
    3b. **CONFIRMED (2026-09-11) — the level-2+ ceiling is Wizard-specific, not a
       general Tier 1 limitation.** Triggered by a real user report: a randomly-
       generated Cleric NPC in a `~/tfndev` live game cast Hold Person (a level-2
       Cleric spell) successfully in combat. Re-ran the exact experiment item 3's
       NWNX investigation had already flagged as the single highest-value next test
       — a Cleric, leveled the identical way (`LevelUpHenchman()` loop to level 5, no
       NWNX) — against `~/nwn-mcp-verify-server`. Result: **every level 0-3 came back
       real and populated** (`L0:slots=5 L1:slots=5 L2:slots=4 L3:slots=3`, all with
       real readback spell IDs), where the identically-tested Wizard got
       `L2:slots=0 L3:slots=0`. Full record in `docs/random-abilities-runtime-
       findings.md`'s "Round 2" section. **Practical consequence: Cleric/Druid/
       Paladin/Ranger companions get a complete, real, freshly-randomized multi-level
       spellbook with zero known limitation once the item-2 wiring-timing fix below
       lands — only Wizard remains capped**, and per the closed NWNX investigation in
       item 3 there's currently no known fix for Wizard specifically in this engine
       build. (Druid/Paladin/Ranger weren't individually retested — they share
       Cleric's lack of `SpellbookRestricted`, so the same result is expected but only
       Cleric is directly confirmed.) This meaningfully raises the priority of item 2's
       `a_hen_spawn`→`a_hen_join` timing fix: it's no longer just "gets Wizard to
       cantrips+1st-level for free," it's "gets four of five Tier 1 classes a fully
       working random spellbook system for free."
    4. **Fix already shipped regardless of the open root cause**: `RA_RollClass` now
       caps every write to `min(cls_spgn slot count, GetMemorizedSpellCountByLevel())`
       rather than trusting the 2DA blindly, so it degrades gracefully (writes only
       what the engine will actually accept, silently skipping the rest) instead of
       wastefully attempting writes that do nothing.
  - **Known follow-up gap**: `verify_creature`'s `caster_no_spells` check only reads
    static build-time state (`MemorizedList`/`SpecAbilityList`) — it has no way to see
    what `RA_OnSpawn` rolls at runtime, so it now false-positives on every caster
    wired to this system (documented as expected in `adventure-actors/SKILL.md`, but
    not actually fixed at the check itself). A real fix would need the check to
    recognize the `RA_OnSpawn`/`RA_OnEndRound` wiring on `ScriptSpawn` and skip itself
    for that creature, rather than relying on the skill doc alone to explain away the
    false positive.
  - **Process pitfall worth remembering for any future work touching this include**:
    NWScript's `#include` resolves at compile time, baked into the including script's
    `.ncs` bytecode, exactly like a C header. Regenerating `inc_random_abil.nss`'s
    *source* via `create_random_abilities_system` (which deliberately never compiles
    it, since an include has no `main()`) has zero runtime effect until every script
    that `#include`s it is *recompiled*. Several rounds of this session's live
    debugging were silently testing stale bytecode from an old compile of the wrapper
    script, because only the include's source was being regenerated between test
    iterations — always recompile every wrapper script after changing an include it
    depends on, not just the include itself.
- **BUILT (2026-10-15) — reliability/efficiency pass via the `mcp-builder` skill, triggered by this session's own
  manual 6-call NPC-leveling dance.** Findings and fixes, in the order built:
  1. `build_npc_stat_block` gained `area`/`tag` support (mirroring `bake_spec_ability_pool`'s existing pattern) —
     previously resref-only, which forced a delete+re-place dance to re-level an already-placed creature.
  2. New tool **`level_creature`** — one call changes a single-class creature's level up OR down by a delta,
     recomputing the full stat block (`applyNpcStatBlock`, factored out of `build_npc_stat_block`'s handler) AND
     re-baking its Special-Abilities pool, directly on whichever object was targeted. Leveling down is real here
     (not subject to `LevelUpHenchman`'s up-only, zero-automatic-feats limitation) because this rewrites the GFF
     stat block directly rather than calling any live engine leveling function.
  3. New static test `tool-registration-shape.test.ts` — parses the real TypeScript AST of every `src/tools/*.ts`
     file and fails if a `server.tool()` call's annotations position (arg 4 of 5) is a literal `{}` — the exact
     shape that silently broke `start_web_editor` (see the Known Pitfalls entry above). Previously caught only by
     accident; now gated by `npm run verify`.
  4. New shared helper `classPositionRollLoop` (`util/nwscript-snippets.ts`) — the identical 1-indexed
     `GetClassByPosition`/`GetLevelByPosition` loop (see the fix entry above) is now generated from one function
     instead of hand-duplicated across `random-abilities-script.ts` and `spec-ability-script.ts`, so a future fix
     (or a future third generator) can't reintroduce that bug independently.
  5. Filled in missing tool annotations: 18 mutating tools (`create_module`, `create_area`, `create_dialog`,
     `create_faction`, `create_creature_blueprint` and its blueprint-type siblings, `compose_encounter`,
     `adventure_create_transition`, `create_area_transition`, journal/write/clone tools, `query_database`) had no
     `destructiveHint`/`idempotentHint` at all — confirmed via real AST parsing (not a text-regex guess, which
     produced false positives against `move_object`/`fix_object_heights`, both already annotated). `create_journal`
     got `idempotentHint: true` instead (it already no-ops safely if one exists); the rest got `destructiveHint: true`.
     159 tools total; only `undo_last_change`/`start_web_editor` remain intentionally bare.
  6. New tool **`build_npc_level_library`** — batch-builds one correctly-leveled blueprint per level in a
     requested array (e.g. `[1,3,5,8,10,12,15,18,20]`), server-side in one call via the existing
     `buildCreatureBlueprint`/`applyNpcStatBlock`/`bakeSpecAbilityPoolForCreature` building blocks — for the
     prebuilt-resref-library pattern (feeding a future in-game dialog-driven leveler, since nothing can be
     level-adjusted correctly by pure NWScript at runtime — no `AddFeat`/`RemoveFeat`/`SetAbilityScore` exist).
     A level whose resref already exists is skipped per-level, not aborting the whole batch.
  7. Normalized `isError` across the tool-execution-failure returns this round touched. Only 2 of 36 tool files
     used the MCP SDK's `isError:true` convention — the rest return a failed lookup/validation as an ordinary
     successful-looking text response, which means a client has no protocol-level signal that the call didn't do
     what was asked (it has to parse the message text itself). New shared helper
     `targetErrorResult()` (`npc-tools.ts`, next to `resolveCreatureTarget`) fixes this for all 7 call sites of
     the shared blueprint-or-placed-instance resolution pattern at once (`build_npc_stat_block`, `level_creature`,
     `equip_npc_by_role`, `respec_weapon_feats`, `remove_feats`, `add_equipped_item_property`,
     `bake_spec_ability_pool`) — DRY in the same spirit as item 4 above, not a one-off patch per tool.
     `level_creature`'s multiclass refusal and `create_spec_ability_system`'s resref-too-16-chars check got the
     same treatment directly. `build_npc_level_library`'s batch result only sets `isError` when EVERY requested
     level failed — a partial batch produced real, usable output, so it correctly stays a normal result with
     `success:false` and a per-level `results` array, not a protocol-level failure. **Deliberately scoped to the
     tools touched by this round's work, not a sweep of all 159 tools** — converting every early-return across
     the whole codebase would need a case-by-case judgment call (informational result vs. genuine failure) this
     pass didn't have the context budget to make safely for tools it didn't already have open; the convention
     (and the new shared helper) are there for the next tool that needs it.
  New tests: 6 for `build_npc_stat_block`/`level_creature` (placed-instance write path, up/down leveling, pool
  widening, clamping, multiclass refusal, MemorizedList-creature warning), 3 for `build_npc_level_library`
  (batch build, partial-failure skip, all-failed `isError`), 2 for the annotations-shape guard, 2 isError
  regression assertions added to existing tests. `npm run verify`: 791 passed, 48 test files, all checks green.
- **BUILT (2026-10-14) — a second, now-default caster system (`SpecAbilityList`
  instead of `MemorizedList`), full design/findings in
  `docs/special-abilities-system.md`.** `inc_spec_ability.nss`
  (`create_spec_ability_system`) + `bake_spec_ability_pool` sidestep
  `GetMemorizedSpellCountByLevel()`'s cantrip-only ceiling entirely, because
  `SpecAbilityList` isn't gated by it — this is the same mechanism base-game
  monsters have always used for innate spell-like abilities. Tradeoff: nothing
  can add a new ability to `SpecAbilityList` at runtime
  (`SetSpellAbilityReady()` only toggles an *existing* entry), so the full
  candidate pool is baked at build time (reading `classes.2da`/
  `cls_spgn_<class>.2da`/`spells.2da` directly, plus the real D&D 3.5
  ability-modifier bonus-spell formula) and `SA_OnSpawn` marks a real-slot-
  sized random subset ready each spawn — **confirmed live** against a
  14-creature test arena (`run_live_verification`): e.g. a level-12 Wizard,
  139 pool entries baked, 28 marked ready at real spawn. `LevelUpHenchman` is
  irrelevant to this system either way — it never touches `SpecAbilityList`.
  **Now the project-wide default**: `/create-adventure`'s pre-flight asks
  Special Abilities (default) vs. Random Abilities (fallback, unchanged) and
  records the choice in `adventure.md`; `/adventure-actors` and
  `compose_encounter` both branch on it, the latter via a `casterSystem`
  param (default `special_abilities`) that also fixes the Random Abilities
  system's boss-specific cantrip ceiling (a boss's `ClassList` is set
  directly, the exact shape that cap depends on).
  **User-facing "toolbar" finding, confirmed not a bug**: a `SpecAbilityList`
  entry marked ready auto-populates the in-game Spellbook/Powers panel
  (`GUI_PANEL_SPELLBOOK`) with zero manual step — that's what the `Ready`
  flag is for. The literal bottom hotbar (`GUI_PANEL_RADIAL_QUICKBAR`) is
  **never** auto-populated by the engine, for any ability/spell/item, for any
  creature — confirmed by grepping the full `nwscript.nss`: there is no
  quickbar-setter function at all. A DM possessing a caster still has to
  manually drag each wanted ability from the Spellbook panel onto a hotbar
  slot; nothing server-side can do that step. See the doc for the full
  write-up and the live log evidence.
  **TODO — handle a live level-up after the pool was already baked.**
  `bake_spec_ability_pool` fixes the candidate pool's membership at whatever
  class level the blueprint had when it ran; a henchman/NPC that is later
  leveled up for real (a live `LevelUpHenchman()` pass, independent of this
  system since it never touches `SpecAbilityList`) can end up with a higher
  `ClassList` level than the baked pool accounts for, so `SA_OnSpawn` has no
  higher-level spells to pick from and the creature's slot allotment at the
  new level is never actually filled — the exact "new spells aren't enabled
  to match the proper slot count" gap. No tool currently detects or re-bakes
  this automatically; the correct fix is either (a) a live-callable re-bake
  (an NWScript-side equivalent of `computeSpecAbilityPool` that can extend
  `SpecAbilityList` at the moment of level-up — blocked by the same "nothing
  can add a new ability to `SpecAbilityList` at runtime" limitation this
  whole system exists to work around, so this may need a GFF-level append
  instead of a pure-NWScript fix), or (b) a documented rule that
  `bake_spec_ability_pool` must always be re-run after any live leveling
  event, with a real check (e.g. a `verify_creature` comparison of baked
  pool's max level against the creature's actual current class level) to
  catch a module that skipped it. Not designed or implemented yet.
  **TODO — auto-fill the DM quickbar at bake time, not just the Spellbook panel.**
  Currently, every ready ability still needs a human to manually drag it from the
  Spellbook/Powers radial onto a hotbar slot each session (see the "toolbar" finding
  above). Real investigation started, confirmed rather than guessed: a real PC `.bic`
  save file (checked directly via `nwn_gff`) DOES carry a `QBList` field — 36 structs,
  each `{QBObjectType (byte), QBINTParam1 (int), QBMultiClass (byte), QBDomainLevel
  (byte), QBMetaType (byte)}`. Sampling one real character's quickbar: `QBObjectType=2`
  entries carry `QBINTParam1` values matching that character's actual memorized
  spells.2da row ids (strongly suggesting `2` = "cast this spell by id"); `QBObjectType=4`
  appears for what looks like a feat slot. **But a `.utc` creature blueprint has NO
  `QBList` field at all** (confirmed empty on a real sample creature) — this is
  currently a PC-`.bic`-only concept in the schema, and three real unknowns block
  building this, none of them safe to guess past:
  1. Whether writing a `QBList` onto a creature's `.utc`/placed-instance GFF has ANY
     effect on what a DM sees when possessing it, or whether DM possession's quickbar
     is sourced from the DM's own persistent client/account state instead, independent
     of the possessed object's own data. Unconfirmed — would need a real possession
     session to observe, which this project's headless verify-server cannot do (no
     graphical client).
  2. The full `QBObjectType` encoding table — only values 0/1/2/4 were seen in one
     sample, not a verified complete mapping, and specifically whether a
     `SpecAbilityList` entry needs the same type code as a known/memorized spell or a
     distinct one (the client treats "Special Abilities" as a separate category from
     memorized spells in the radial even though both key off the same `spells.2da` row
     id — writing the wrong code risks corrupting whatever quickbar state does get
     read, not just failing silently).
  3. If (1) and (2) resolve favorably: `bake_spec_ability_pool`/`create_creature_blueprint`
     would need a new write path appending `QBList` structs for each ready-marked
     ability, bounded to the real 36-slot limit (shared with any feats/other actions
     also being auto-filled), plus a decision on ordering/overflow when a creature has
     more ready abilities than slots. Not designed or implemented yet.
- **FIXED (2026-10-15) — both caster systems' class-position loop had an
  off-by-one, confirmed live via `run_live_verification` while demonstrating
  the "level up a creature" recipe above, not just read from source.**
  `GetClassByPosition`/`GetLevelByPosition`'s `nClassPosition` is
  **1-indexed** (1, 2, or 3 — `nwscript.nss`'s own doc comment: "a
  single-class creature will only have a value in nClassLocation=1"). Both
  `RA_OnSpawn` (`inc_random_abil.nss`, the original Random Abilities system —
  already shipped in every module built with it, including The Hollow
  Communion) and `SA_OnSpawn` (`inc_spec_ability.nss`) looped `0..2` instead
  of `1..3`. Impact is narrow and explains why this went unnoticed through
  every prior live test: position 0 is always `CLASS_TYPE_INVALID` (a wasted
  no-op iteration), but positions 1 and 2 — the real slots for every
  single-class or dual-class creature, which covers essentially every NPC
  this project generates — still fall inside a `0..2` range and rolled
  correctly. Only a genuine **triple-multiclass** creature (a real position 3)
  silently never had its third class's spells/abilities rolled at all.
  **Fix**: both loops changed to `for (i = 1; i <= 3; i++)` in
  `random-abilities-script.ts`/`spec-ability-script.ts`. Regression tests
  added to both `*.test.ts` files pinning the corrected loop text. Any
  already-shipped module's `inc_random_abil.nss`/`inc_spec_ability.nss` needs
  `create_random_abilities_system`/`create_spec_ability_system` re-run (after
  an MCP restart to pick up this fix) to actually get the corrected include —
  regenerating the TypeScript source alone has no effect on an already-built
  module until that tool is re-run against it.
- **FIXED — the feat/spell/equipment bug class (no feats, no spells, wrong equip slot,
  wrong-weight armor, no melee backup, inconsistent cross-area appearance) is now
  caught automatically, and the actual root cause was a documentation gap, not a code
  gap.** A real bug report against a freshly-built module found six non-companion Key
  NPCs (a wizard, an adept, two named humans, a sorcerer, a cleric) all shipped with a
  totally empty `FeatList` and no spells. Root cause, confirmed by reading
  `adventure-actors/SKILL.md` directly: the 4-source static `FeatList` bake (racial +
  automatic class feats + generic schedule + bonus slots, documented above) was written
  entirely inside Phase 3b ("Create Companions"), which opens with "Skip this phase
  entirely if the plot has no companion characters" — a non-companion combat-capable Key
  NPC reasonably read that line and skipped the whole phase, including the feat-bake
  recipe that was never actually companion-specific. **Fix:** Phase 3's Key NPC section
  now cross-references Phase 3b's Ability-scores/FeatList/Skill-points/Equipment
  subsections explicitly for any combat-capable Key NPC, and Phase 3b's own opening note
  now clarifies which parts are henchman-only (dialog/scripts/`HENCH_LEVEL`) vs. reusable
  by any combat-capable creature. Also closed: a non-companion Key NPC never gets a live
  `LevelUpHenchman()` call at all (there's no recruit event), so a caster Key NPC needs
  its `spells` (`SpecAbilityList`) param populated at build time — this is now documented
  explicitly, since it's a real, separate gap from the companion spell path
  (`bReadyAllSpells` at recruit).
  **Four new `verify_creature` checks close the detection gap** (`src/util/verify/blueprints.ts`):
  `empty_featlist` (class levels with zero FeatList), `caster_no_spells` (a spellcasting
  class at/past `classes.2da`'s `MinCastingLevel` with nothing in either `MemorizedList`
  or `SpecAbilityList`), `weapon_proficiency_mismatch` (RightHand/LeftHand item whose
  `baseitems.2da` `ReqFeat0-4` — verified live to be an OR-set of satisfying feats, e.g.
  a Shortbow's `ReqFeat0-2` are Martial Weapon Proficiency/Rogue's bonus proficiency/
  Elf's bonus proficiency, any one sufficing — has no match in `FeatList`), and
  `ranged_weapon_no_melee_backup` (a ranged weapon equipped with no melee-capable weapon
  anywhere in equipment or inventory — NWN's base AI, `ActionEquipMostDamagingMelee` off
  `nw_c2_default9`, auto-switches on ammo depletion but only if one exists to find).
  **FIXED (originally shipped as a weaker `armor_no_proficiency` warning, since
  upgraded to a precise `armor_proficiency_mismatch` error) — the armor weight-class
  precision gap is closed.** The dead end wasn't wrong about where to look
  (`baseitems.2da` really does have a single generic body-armor row (16) shared by
  every weight class, with no `ReqFeat` data or weight-class column of its own), it was
  looking in the wrong place entirely: weight class isn't stored on the base item, it's
  derived from the *equipped item's own AC Bonus item property*
  (`ITEM_PROPERTY_AC_BONUS = 1` in `nwscript.nss`; a `PropertiesList` entry with
  `PropertyName=1`, `CostValue` = the AC bonus amount 0-8 — confirmed directly against a
  real armor item, `crn_stdlthrarmr2.uti`, which carries exactly this). Cross-referenced
  against two more real sources: `armor.2da`'s 9-row `ACBONUS`/`DEXBONUS`/`ACCHECK`/
  `ARCANEFAILURE%`/`WEIGHT` table (row index = AC bonus value, 0-8), and a real, verified
  community equipment-randomizer script (`inc_rand_equip.nss`'s `GetACOfArmorToEquip`,
  found in the `~/tfndev` corpus), whose proficiency-capping logic gives the exact tier
  boundaries: AC bonus 0 needs no proficiency; 1-3 is Light armor (feat 3, ArmProfLgt);
  4-5 is Medium (feat 4, ArmProfMed); 6-8 is Heavy (feat 2, ArmProfHvy) — matching this
  project's already-verified `feat.2da` row numbers exactly. `armorTierFeat()`
  (`src/util/verify/blueprints.ts`) implements the mapping; `armor_proficiency_mismatch`
  reads the Chest-slot item's AC Bonus property, derives its tier, and checks for the
  one matching feat — this is the literal Corin Vale bug (a Rogue with only Light Armor
  Proficiency from its automatic class feats, equipped with Medium armor). An item with
  no AC Bonus property at all degrades to skip (AC bonus treated as 0), not a guess. The
  previous archaeology attempt correctly ruled out `iprp_costtable.2da`/
  `baseitems.2da` as dead ends — the fix came from a different table (`armor.2da`) plus
  a real script, not from either of those.
  **Also fixed at the write path, not just verification**: `set_creature_equipment`
  (`src/tools/creature-tools.ts`) now checks the item's `baseitems.2da` `EquipableSlots`
  hex bitmask against the target slot before writing — confirmed via a live table that
  this bitmask uses the exact same bit values as this project's own `EQUIP_SLOT_MAP`
  (e.g. Cloak = 0x40/64, matching `EQUIP_SLOT_MAP.cloak`) — so a cloak written into the
  chest slot (the literal reported bug) is now a rejected call naming the item's real
  valid slot(s), not a silent success. **Cross-area appearance consistency** is a new
  `validate_module` check (`cross_area_appearance_mismatch`, `src/tools/analysis-tools.ts`):
  groups placed creatures by `Tag` across all areas and warns when the same tag's
  `Race`/`Appearance_Type`/primary class disagree between placements — closes the
  "same named NPC renders differently in two areas" bug class. All five checks and the
  slot-write validation have unit/integration test coverage; `npm run verify` passes.

**BUILT (2026-09-19) — a "simple NPC" tier, option (a) below.** Everything above
(`LevelUpHenchman`, `startingPackage`, `SPEC_VerifyCreature`) assumes an NPC is meant to
progress exactly like a PC of that class — right for companions, wrong for a background
NPC the plot describes as a plain "warrior" or "adept" rather than a named Fighter/Cleric
character. NWN ships no separate Warrior/Expert/Adept/Aristocrat `CLASS_TYPE_*` the way
tabletop D&D 3.5's NPC classes do, and the only true non-PC catch-all,
`CLASS_TYPE_COMMONER` (20), already grants *no* feats or spellbook at all via
`LevelUpHenchman` — too blunt for an NPC that should still fight competently, just without
a PC's full bonus-feat chain (Cleave→Great Cleave, Weapon Specialization, metamagic feats,
epic feats, ...). **Fix:** `buildNpcStatBlock()`'s (`src/util/npc-stat-block.ts`) feat
computation already tagged every pick with a `source` — `"racial"`/`"class_automatic"`/
`"generic_slot"`/`"bonus_slot"` — and `"bonus_slot"` is exactly the PC-style advancement
chain (`cls_bfeat_<class>.2da`'s per-level slots) the TODO called out. A new
`complexity?: "full" | "simple"` param (default `"full"`, identical to prior behavior) on
both `buildNpcStatBlock()` and the `build_npc_stat_block` tool skips filling bonus-feat
slots entirely when `"simple"` — racial/automatic-class/generic-slot feats (basic
proficiencies, the universal "every character gets a feat" slots) are unaffected, so the
NPC is still mechanically competent, just without the advancement chain. Narrow, low-risk
change since the source-tagging already existed — no new read logic needed. **Option (b)
— a repair tool stripping bonus feats from a creature already leveled via a *live*
`LevelUpHenchman()` call — is deliberately still open**, a different mechanism (runtime
feat removal vs. build-time generation) with its own design questions; `complexity:
"simple"` covers the more common case (a background NPC built via `build_npc_stat_block`
from the start).

## Gear Appearance

Generated gear uses the base item's **default** model variant, applied by
`applyDefaultItemModels()` (`src/util/item-models.ts`) after `BaseItem` is final. A
composite weapon (`baseitems.2da` ModelType 2) needs `ModelPart1..3` all non-zero; any
part left at 0 renders as a shapeless blob in the creature's hand.

**TODO — randomised gear appearance.** Once per-base-item model-variant counts can be
derived from the resman stack (baseitems.2da carries no variant count), the helper can
pick a random valid variant per part so generated NPCs stop sharing identical weapons.
Until then "default model" is correct: a wrong variant index renders as nothing at all.

**BUILT (2026-09-16) — weapon *type* selection is now varied, deterministically.**
`CLASS_WEAPON_PREFERENCES` (`src/util/npc-weapon-preferences.ts`, renamed/widened from
the old singular `CLASS_WEAPON_PREFERENCE`) maps each class to a short list of 2-3
proficiency-safe candidate weapons instead of one fixed default, and
`pickWeaponPreference(classId, seed)` chooses among them deterministically by the
creature's own tag/resref (FNV-1a hash mod list length — no `Math.random()`, matching
this project's reproducible-content convention: the same creature always gets the same
weapon, but different same-class NPCs across a module spread across the list instead
of all converging on one). `build_npc_stat_block` (bonus/generic feat-slot picks, seed
= its `resref` param) and `equip_npc_by_role` (default weapon recommendation, seed =
the resolved creature's tag/resref) both switched from the old direct table lookup to
this picker. `respec_weapon_feats` is unaffected — it doesn't consume this table
(verified while making this change: only `build_npc_stat_block` and
`equip_npc_by_role` ever read it), and remains the tool to re-target a creature at a
different weapon after the fact.

Every candidate weapon in every class's list was verified proficiency-safe against
real 2DA data, not assumed from general D&D 3.5 rules: each weapon's real
`baseitems.2da` `ReqFeat0-4` (the same OR-set `verify_creature`'s
`weapon_proficiency_mismatch` check reads) was cross-checked against that class's real
automatic weapon-proficiency feat(s) from `cls_feat_<class>.2da` (`List=3`,
`GrantedOnLevel=1`). **This verification pass found and fixed two real, latent bugs in
the previous single-entry table**: Cleric's old default (Warhammer) and Bard's old
default (Rapier) both require Martial Weapon Proficiency (feat 45) — but
`cls_feat_cler.2da`/`cls_feat_bard.2da` only grant `WeapProfSim` (feat 46, Simple)
automatically in this engine's tables, no martial or class-specific weapon feat for
either class. (Tabletop 3.5 gives a Cleric her deity's favored weapon and a Bard a
small martial exception list; neither exception exists in this engine's automatic
class-feat rows.) A generic Cleric or Bard built via `build_npc_stat_block` with the
old defaults and no further bonus feat would have failed `verify_creature`'s own
`weapon_proficiency_mismatch` check — undetected until this pass, since nothing had
cross-checked the curated table against the verify check's own data source before.
Both entries were replaced with real Simple-weapon options (Cleric: Morningstar/Light
Mace/Quarterstaff; Bard: Sickle/Morningstar/Dagger). Druid (`WeapProfDruid`, feat 48),
Rogue (`WeapProfRogue`, feat 50), and Wizard (`WeapProfWizard`, feat 51) each have
their own class-specific proficiency feat rather than generic Simple/Martial — their
lists are drawn from real weapons whose `ReqFeat0-4` contains that exact feat id,
which lines up closely with each class's real tabletop weapon list (confirmed, not
assumed: Druid's candidates — Quarterstaff/Sickle/Scimitar — and Wizard's —
Quarterstaff/Dagger/Heavy Crossbow — match the tabletop SRD lists almost exactly).
9 new unit tests in `npc-weapon-preferences.test.ts` (determinism, spread across
seeds, Monk still `null`, no duplicate `baseItem` within a class, the two corrected
defaults), plus the existing `npc-stat-block.test.ts`/`npc-tools.integration.test.ts`
coverage updated to assert against the seeded pick rather than one hardcoded weapon.

**BUILT (2026-09-09) — option (a) below, `equip_npc_by_role`, plus `build_npc_stat_block`
and `respec_weapon_feats`.** All three live in `src/tools/npc-tools.ts`, backed by
`src/util/npc-stat-block.ts` (pure, unit-tested stat-block computation) and
`src/util/npc-weapon-preferences.ts` (the curated per-class weapon-preference table
the "Elaboration" bullets below asked for — real, verified baseitem + feat.2da IDs,
not guessed). Scope notes, so a future session doesn't re-litigate these:
- `build_npc_stat_block` writes the mechanical stat block (ability scores, FeatList,
  SkillList, HP, StartingPackage) onto an *existing* blueprint — it does not create
  one (`create_creature_blueprint` still does identity/race/appearance/name) and does
  not compute spells itself. Spells are no longer this tool's gap to close, though —
  see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" under
  Henchmen/Companions below: option (b)'s runtime-include idea shipped, just as its
  own separate system (`create_random_abilities_system`) rather than as part of this
  tool, since it needs to run fresh at `OnSpawn` every playthrough rather than be
  baked once at build time. Primarily targets Henchmen for now; general-NPC use is a
  documented future extension, not blocked by anything in the implementation.
- `equip_npc_by_role` deliberately does **not** do fuzzy blueprint search itself —
  there's no reusable exported search function to call into (`list_blueprints`/
  `resman_search` are inline MCP tool handlers), and inventing a resref would violate
  this project's "never guess" convention. The caller still sources items via
  `list_blueprints`/`resman_search` as documented; the tool's automation is
  proficiency validation (slot bitmask + `FeatList` check, reusing the exact
  `armorTierFeat`/`ReqFeat` logic `verify_creature` uses), a `get_wealth_budget`
  reference figure, a weapon-type recommendation from the preference table when no
  `righthand` item was supplied, and — closing the "Verify-after-generate" bullet
  below — a `verify_creature` pass as its own last step. The **archetype multiplier**
  bullet below (wealthy-noble vs. bandit budget scaling + magic-item preference) is
  **not built** — `equip_npc_by_role` only takes `role` (pc/elite/standard/mook), not
  `archetype`.
- `respec_weapon_feats` auto-detects a creature's current weapon-specific feats by
  reverse-scanning every `baseitems.2da` row's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat`/Epic* columns against its
  `FeatList`, then moves matched tiers onto the target weapon. **Found and fixed a
  real bug while writing its own tests**: a single-pass scan that mutates the
  in-progress feat set while iterating *every* baseitems row let the target weapon's
  own just-added feat get picked up as a spurious "source" match on a later
  iteration (harmless net effect, since it re-added the same feat, but it polluted
  the `removed`/`added` report with duplicate entries) — fixed by detecting matches
  against a frozen snapshot of the *original* `FeatList` in one pass, then applying
  removals/additions in a second pass, and by excluding the target weapon's own row
  from source detection. Verified via a dedicated test that reproduces the original
  bug's exact symptom (spurious entries for the target weapon's own feat IDs).

Today's process (before this) was: for each NPC, search `list_blueprints` +
`resman_search`, read costs via `resolve_blueprint`, check budget against
`get_wealth_budget`, and equip via `set_creature_equipment` — repeated by hand per
creature. This is exactly the kind of deterministic, rule-following work a script
could do instead of an LLM call per NPC. Two shapes worth considering, not yet
designed: (a) a **build-time MCP tool** (`equip_npc_by_role`-style, TypeScript) that
takes `{class, level, role, archetype}` and internally does the search/budget/equip
sequence deterministically — closer to how `create_reward_system` generates
`inc_reward.nss` once and every caller just invokes it; (b) a **runtime NWScript
include**, in the same family as `inc_reward.nss`/`inc_spec_check.nss`, that picks
gear from a curated resref table keyed by class/level at `OnSpawn` — pushes the
decision into the game engine entirely, at the cost of needing that table
hand-curated and kept in sync with the resman stack. Given the armor-appearance gap
(no safe from-scratch default), a curated table of *known-good real resrefs* per
archetype is probably required either way, not purely computed from `baseitems.2da`.

**Elaboration (user-specified, 2026-09-09)** on what the build-time tool's internal
logic should actually cover — this is the fuller spec for option (a) above, not a
separate idea:
- **Feat-driven weapon preference.** Read the creature's `FeatList` first; if it
  already carries a weapon-specific feat (Weapon Focus/Specialization/Improved
  Critical — reverse-lookup via `baseitems.2da`'s `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` columns, the same columns
  the existing "weapon-specific feat means the matching weapon, exactly" rule
  elsewhere in this doc already uses manually), bias the gear search toward that
  exact weapon type instead of picking one arbitrarily. The reverse direction
  (pick a weapon first, then bake the matching proficiency/focus feat chain) is
  already documented under Henchmen/Companions' static feat-baking — this tool
  should be able to run either direction depending on whether feats or gear come
  first for a given NPC.
- **BUILT** — see `npc-weapon-preferences.ts` above. **A curated per-class/archetype weapon-preference table (user-raised: "add
  packages.2da files for various class and level progressions — General Fighter
  focuses on the longsword, while others specialize in other feats and
  weapons").** `packages.2da` already exists and already gives each base class
  an iconic package (see the verified row-equals-classId rule under Henchmen/
  Companions), but it doesn't say *which weapon* that package's feat slots
  should point at — that's a real design choice per archetype, not something
  derivable from the 2DA alone. Needs a curated reference table (not a modified
  copy of the real `packages.2da` — a new project-owned lookup) mapping
  class/archetype → preferred weapon baseitem, so `create_creature_blueprint`'s
  static feat-baking and the feat-driven weapon preference above have a real
  default to fall back on instead of picking arbitrarily when a creature has no
  feats yet to reverse-lookup from. E.g. a generic Fighter defaults toward
  Longsword; a generic Rogue toward Rapier/Shortsword (finesse); a generic
  Ranger toward Longbow — one entry per class to start, expandable to
  sub-archetypes (dual-wielder, archer, tank) later. This is what makes the
  "pick a weapon first, then bake matching feats" direction above actually
  usable without per-NPC guessing.
- **BUILT** — see `respec_weapon_feats` above. **A `respec_weapon_feats`-style tool to swap an already-built creature's
  weapon-specific feats onto a different weapon (user-raised).** Today,
  changing a creature's specialized weapon after the fact means manually
  finding and removing the old weapon's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` (and epic variants)
  from `FeatList` and adding the new weapon's equivalents — easy to get wrong
  by hand, and exactly the kind of mechanical, rule-following swap a script
  should do instead of an LLM editing a feat list field by field. E.g. a
  generic Fighter built with Longsword-focused feats (the class's default per
  the packages-preference table above) should be re-targetable to any other
  weapon — Battleaxe, Rapier, whatever the user wants for that specific NPC —
  via one call: given a creature + a target weapon baseitem, look up which
  weapon-specific feats it currently holds (reverse-lookup via the same
  `baseitems.2da` feat columns used elsewhere), remove them, and add the
  equivalent feats for the new weapon at the same tiers (Focus only, or
  Focus+Specialization+Improved Critical, matching whatever tier the creature
  actually qualifies for/already had). Pairs directly with the feat-driven
  weapon preference and packages-preference-table ideas above — this is the
  "change your mind after the fact" tool to their "get it right the first
  time" tools.
- **Wealth-budget check with an archetype multiplier.** `get_wealth_budget(level,
  role)` already exists and is already used manually for this — the new piece is
  an `archetype` parameter that scales the budget and shifts the item search
  itself (not just a post-hoc affordability check): a "Prince"/wealthy-noble
  archetype should multiply the budget up and *prefer* magic/enchanted variants
  over mundane ones when both exist, while a "bandit"/impoverished archetype
  should do the opposite. This is the concrete meaning `{class, level, role,
  archetype}`'s `archetype` field (already in the signature sketch above) was
  left vague on.
- **BUILT** — see `equip_npc_by_role` above. **Verify-after-generate, closing the loop.** Once equipped, run `verify_creature`
  (now that the `EquippedRes`/`TemplateResRef` bug is fixed — see the Known
  Pitfalls entry — its ranged/ammo and stack-size checks actually fire) as the
  tool's own last step, so "generate gear for this NPC" and "confirm the gear is
  legitimate for their level and class" are one pipeline instead of two separate
  manual steps an LLM has to remember to chain itself.

**BUILT (2026-09-09) — `build_npc_stat_block`, per the TODO immediately below.**
`src/util/npc-stat-block.ts` computes ability scores (Elite Array or a real D&D 3.5
point-buy allocator), the full 4-source `FeatList` bake, `SkillList` (round-robin
spend across real class skills, capped at level+3), and HP — all read live from
`classes.2da`/`racialtypes.2da`/`cls_feat_*`/`cls_bfeat_*`/`cls_skill_*` rather than
re-derived by hand per NPC, closing exactly the bug class described below (verified
by a dedicated unit test suite built against real-data-shaped 2DA fixtures, not just
plausible-looking numbers). **This tool still does not compute spell `MemorizedList`s
itself** — a companion still gets spells from the live `LevelUpHenchman()` call at
recruit, matching the existing, unchanged convention, and a non-companion caster Key
NPC still uses `create_creature_blueprint`'s `spells` param for a fixed loadout when
one is wanted. But "real spellbook baking" as a general problem is no longer deferred
— see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" above: it
shipped as its own runtime NWScript system (`create_random_abilities_system`) rather
than as static baking inside this tool, since the whole point is rolling fresh every
time the module loads rather than being fixed once at build time.

**TODO — reduce how much of NPC generation the LLM does by hand vs. deterministic
code, broadly, not just for gear.** This session's actual work — computing ability
scores, HP, skill-point totals, feat lists, and spell slots from `classes.2da`/
`cls_*.2da` formulas — is mechanical, rule-following arithmetic, not creative
judgment, and every real mistake made this session (a stale skill-point total after
an Int change, an HP formula that needed a second pass, two "no real item" false
negatives) was an arithmetic/lookup slip in exactly that kind of work, not a bad
creative call. A `build_npc_stat_block`-style deterministic tool (given
race/class/level/role, return a fully-populated ability array, `FeatList`,
`SkillList`, spell `MemorizedList`s, and HP — same computation this session did by
hand, moved into tested TypeScript) would remove this whole bug class the same way
`create_reward_system`/`create_spec_verification` already turned other
error-prone patterns into generated, reusable code. The LLM's time is better spent on
what it's actually suited for in this pipeline — plot, dialog, quest design, and
encounter/narrative judgment calls — not re-deriving D&D 3.5 tables from 2DA files
per NPC. **BUILT except spell `MemorizedList`s — see the note immediately above.**

**Alternative approach worth evaluating alongside the above (user-raised): build
one level-20 "master" creature per race/class and level it *down* by truncation,
instead of computing each target level's stats from formulas every time.** Today's
(and the `build_npc_stat_block` TODO's) model computes forward: given a target
level, derive ability scores/feats/skills/spells from `classes.2da`/`cls_*.2da`
formulas. The user's proposal inverts this: build a single level-20 reference
creature per race/class once (maximal `FeatList`/`SkillList`/spell
`MemorizedList`s, fully baked), dump it to JSON, and produce any lower level by
mechanically truncating that JSON — drop `ClassList` levels above the target,
drop `FeatList` entries whose granting level (cross-referenced the same way the
static feat-baking recipe already does) exceeds the target, cap `SkillList`
ranks and spell slots to what the target level would have earned. Worth real
comparison against the forward-computation approach: truncation only needs to
get the level-20 reference right *once* per race/class (a fixed, auditable
artifact, not a formula that has to stay correct for every level 1-20), and the
"raw file in JSON, altered by a script tool" step the user describes is exactly
this project's already-established safe-edit pattern (JSON round-trip via
`nwn_gff`) applied to a new purpose. The open question is whether truncation is
actually simpler than forward computation once feat/skill/spell prerequisites
that only make sense at the *achieved* level are accounted for (e.g. a spell
memorized at level 20 that depends on a metamagic feat also granted along the
way) — needs a real prototype on one race/class pair before deciding this
replaces, rather than complements, `build_npc_stat_block`.

**Canonical creation order + stat-generation arrays for `build_npc_stat_block`
(user-specified, design-only — not implemented yet).** When this tool gets built, the
user's specified pipeline order is: **Race → bake racial feats
(`race_feat_<race>.2da`, unconditional) → generate ability scores (array below, by
target power level) → assign Class → bake class feats (`cls_feat_<class>.2da` +
generic schedule + `cls_bfeat_<class>.2da` bonus slots, all already-verified sources —
see the Henchmen/Companions section above) → determine equipment, filtered by the
proficiency feats just baked** (`verify_creature`'s `weapon_proficiency_mismatch`/
`armor_proficiency_mismatch` checks exist specifically so a tool built to this order can
never reproduce a "Rogue equipped with medium armor"-class bug — equipment selection
comes last, informed by feats, never the other way around).

Stat arrays (D&D 3.5, deterministic — no dice rolling, since generated content in this
project must stay reproducible):
- **Elite Array** `15,14,13,12,10,8` — default for ordinary NPCs with class levels
  (~25-point buy equivalent).
- **Point-buy bands**, for explicitly scaling a unique/named NPC's power level instead
  of always using the Elite Array: Low 15, Standard 25, Challenging 22-28, Tougher 32,
  Epic 36+.
- Classic 4d6-drop-lowest rolling is noted but not recommended for this tool — it's
  non-deterministic.

## Testing

**Everything runs locally and the module-building path needs no hosted service** — modules generated with
this server are one-off and local. `.github/workflows/ci.yml` (2026-10-03) runs only `npm ci && npm run verify`
on push/PR to `master` as a gate on the server's own TypeScript (see TODO #1); nothing else may depend on a
hosted service. The pre-commit hook runs the same gate locally.

- `npm run verify` runs the full gate: build (tsc), lint (biome), test (vitest).
- `npm run hooks:install` installs the pre-commit hook (once per clone). It runs the same
  `scripts/verify.sh` before every commit touching `src/`, `package.json`, `tsconfig.json`
  or `biome.json`; bypass with `git commit --no-verify`.
- Biome ships its binary as a platform-specific optional dependency. If `npm run lint`
  dies with `MODULE_NOT_FOUND`, install it:
  `npm install --no-save @biomejs/cli-$(node -p "process.platform+'-'+process.arch")`.
  `scripts/verify.sh` detects this and skips lint with a message rather than failing opaquely.
- The suite runs in ~1s with no network and no NWN install, which is what makes a
  pre-commit hook tolerable. Checks needing real game data (tilesets, 2DAs, walkmeshes)
  degrade to "skip", never to "fail".
- See `docs/TEST_PLAN.md` for the project-wide test plan and test case specification.
- `src/util/tile-oracle.live.test.ts` is an env-gated **real-data oracle** for the spatial conventions (tile rotation, heights, walkmesh offsets):
  Part A needs `NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS` (base-game tilesets, ~20 s), Part B additionally `TFN_SRC=<…/the-frozen-north/src>` (any nasher
  `src` with `are/*.are.json` + `git/*.git.json`). `ORACLE_VERBOSE=1` prints the measured numbers. Skips (never fails) without the environment.
  Run it after any change to rotation, height, offset or facing maths — see `docs/object-placement-and-tilesets.md` §9.

**BUILT (2026-09-17) — a comprehensive, two-tier "every system" test harness,
answering "what would it take to create test samples from every nwn-mcp system in
a module" with real, runnable code rather than a one-off manual demo.**
- `src/tools/comprehensive-module.integration.test.ts` — one shared synthetic
  module, built up across a single sequence of `it()`s (file-scoped `beforeAll`/
  `afterAll`, deliberately not the usual per-test `beforeEach` reset every other
  `*.integration.test.ts` file uses, since the whole point here is proving the
  SYSTEMS interoperate: a creature built by `create_creature_blueprint` gets
  placed, equipped, statted, and then found by `validate_module`/`verify_all`).
  Covers essentially every mockable system: all blueprint types, placement,
  dialog read+write, journal, factions, object-mgmt, bulk ops, undo, scripts
  (write+read, not compile), wealth budget, 2DA/TLK lookup, resman search
  (graceful-empty, no real BIFs), core resource reads, area/module script
  wiring, analysis, `verify_*` including `verify_all` as the capstone, and
  SQLite database tools (real `sql.js`, no native binary — `../config.js` is
  mocked with a getter so `NWN_FOLDER_USER` points at this test's own temp dir,
  never a real one). Always runs, part of `npm test`/the pre-commit hook, ~0.6s.
- `src/tools/comprehensive-module.live.test.ts` — the companion file for what
  the mocked tier explicitly can't cover honestly: real tile-solving
  (`create_area`/`adventure_generate_layout`/`adventure_apply_layout`),
  `get_tileset_details`, and the real compile-probe half of the four generator
  tools (`create_reward_system`/`create_spec_verification`/
  `create_random_abilities_system`/`create_gear_randomizer`) — all of which need
  a real neverwinter.nim toolchain, a real NWN game-data install, and a real
  `nwnsc` binary to mean anything. **Env-gated, not hardcoded skip or run** —
  `describe.skipIf(!NWN_FOLDER_DATA || !NWN_FOLDER_USER)`, the same "degrade to
  skip, never to fail" convention already used everywhere else in this suite,
  applied to a bigger chunk of coverage than before. Verified working both ways
  on this machine: skips cleanly (5 tests, 0 failures, no slowdown) with the env
  vars unset, and passes for real (4/4, ~5s, including two real bugs in initial
  field-name guesses caught only by actually running it — `adventure_apply_layout`
  returns `tilesResolved` not `tilesPlaced`, `get_tileset_details` returns
  `terrainTypes` not `terrains`) with them set to this project's own real
  `NWN_FOLDER_DATA`/`NWN_FOLDER_USER`. Writes one real throwaway module
  (`nwn_mcp_comprehensive_live_test.mod`) into the real `NWN_FOLDER_USER/modules/`
  directory and deletes it in `afterAll` — confirmed no cruft left behind after a
  real run.
- Two vi.mock lessons worth keeping for any future test file that registers
  many tool groups at once (this file needed far more of module-loader.js's/
  tileset-tools.js's real surface than any single existing test file did):
  prefer `vi.mock(path, async (importOriginal) => ({ ...await importOriginal(),
  requireIndex: ... }))` over hand-listing every export — a hand-written mock
  object silently breaks the moment a tool reaches for a real export
  (`indexAreaCreatures`, `buildTagToAreaMap`) nobody thought to stub, and the
  failure ("[vitest] No X export is defined on the mock") points at the wrong
  place. And check a `nim-tools.js` function's real return TYPE before mocking
  it, not just its rough purpose — `resmanGrep`/`resmanStats` both return plain
  strings (raw CLI output), not the structured objects an untested first-guess
  mock returned; the tools' own handlers do `output.trim().split(...)`/
  `text: output` on the result, so a wrong-shaped mock either throws
  (`.trim is not a function`) or fails deep inside the MCP SDK's own response
  validation.
