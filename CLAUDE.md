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

Stamped-group rotation, `getGroupEntrances`, the avenue option and the rotation-handedness saga (multi-tile groups are not rotation-safe; use native rotation 0) are in `docs/layout-rotation-history.md`.

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

Open area TODOs (prefabs, reserve flat space, rebuild one area, per-module git repo, tileset survey) and the three tooling fixes are in `docs/area-todos-and-tooling-history.md`.

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

Notes on building full-tileset survey areas (32x32 limit, packing, batching `paint_tiles`) are in `docs/survey-areas-notes.md`.

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
Further companion findings (static feat baking, `LevelUpHenchman` limits, spell baking, Random Abilities, Special Abilities, `level_creature`, class-position fix) are in `docs/henchmen-and-caster-history.md`, with open TODOs for appearance randomisation, level-up after a baked pool and quickbar auto-fill.

## Gear Appearance

Generated gear uses the base item's **default** model variant, applied by
`applyDefaultItemModels()` (`src/util/item-models.ts`) after `BaseItem` is final. A
composite weapon (`baseitems.2da` ModelType 2) needs `ModelPart1..3` all non-zero; any
part left at 0 renders as a shapeless blob in the creature's hand.

History of gear appearance, weapon preferences, `equip_npc_by_role`, `build_npc_stat_block` and the creation order is in `docs/gear-and-npc-generation-history.md` (includes the open TODO for randomised gear appearance).

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

The full test-harness history (comprehensive mocked and live tiers, vi.mock lessons) is in `docs/testing-history.md`.
