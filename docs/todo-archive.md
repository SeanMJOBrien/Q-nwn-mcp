# TODO archive

Moved verbatim from CLAUDE.md (work-plan A5, 2026-11-10): the Skill-prompt reduction list (S1-S9) and the numbered Project Health TODOs (#1-#29) with their full history and original specs. Numbers are unchanged and are referenced from code comments, skills and docs. CLAUDE.md now keeps one line per open item. TODOs that were unnumbered inside other moved sections (area prefabs, flat-space reservation, rebuild one area, per-module git repo, tileset survey, appearance randomisation, gear appearance, level-up after bake, quickbar, verify-server commit, encounter composer question, Hollow Communion open questions) are numbered #30-#40 in CLAUDE.md; their text is in the history docs named there.

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
