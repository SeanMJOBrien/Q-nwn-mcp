# Open TODOs

One line per open item: `#id P<priority> title: what closes it` (P1 = next). Details, when an item has more: `docs/todo/<id>.md`.
Edit on the web: https://claude.ai/artifact/2sXeZJfkKsL3CbGfg164ar (tick "work on this next", notes, new items; then "start the next tasks": the shared `todo-page` skill).
Done items and full history: `docs/todo-archive.md`. Packages per item: `docs/work-plan.md`. Grep `^- #<id> ` to find one.

## #15 branches and commits not in master (standing rule)
Update in the same commit as the work; amend to "pushed" just before the push (`git fetch --prune`, `git rev-list --count origin/master..<b>`).
- 2026-11-20: `master` = the line without small-model work (was `pre-local-models`; old master tagged `archive/master-2026-11-19`).
- `local-models` (worktree `../Q-nwn-mcp-local-models`): the small-model line, parked for later; it splits from master at `1840e37` and has 70 commits not in master; pushed.
- Other repos: Q-tfn-content-studio `8f873ee` (branch `feature/random-camp-events`) and Q-nwn-manager `93fe5ad`, both not pushed.

## Open
- #19 P2 generic check live test: one simulation step per `q_check`/`q_roll` with a stand-in that has the skill (`19.md`).
- #20 P2 guided workflow live run: `adopt_module` on a module with no story (`20.md`).
- #53 P2 quest building without an LLM: every package in `docs/quest-frontends-work-plan.md` done (`53.md`).
- #2 P3 rotation maths: property-based round-trip tests for tile/zone solver and feature-collar rotation (`02.md`).
- #12 P4 tileset rules beyond flat tiles: `paint_tiles`/`paint_group`/solver place height-transition tiles; oracle passes.
- #16 P4 port the quest fixes to the TFN content studio: studio tests green with `docs/tfn-quest-findings.md` fixes (`16.md`).
- #54 P4 creature spec ability scores and skills: spec builds, `verify_creature` passes, engine shows them (`54.md`).
- #55 P4 spells in `build_creature` fixed mode: fixed level-7 Wizard and Cleric verify and cast (`55.md`).
- #21 P5 adventure composition: rival party, tone check, recurring NPCs, import format (`21.md`).
- #32 P5 rebuild one area in place: design first (`30.md`).
- #40 P5 Hollow Communion open questions (armor AC premise, Elowen's 2nd-level slot): `docs/verification-history.md`.
- #48 P5 aftermath beat: plot template gains one; `build_quest` ends a quest on a return stage by default.
- #56 P5 coloured light props for dark areas: five colours shown in the game (`56.md`).
- #23 mostly done, state the goal of every test run: systest skill and tests carry a goal (`23.md`).
- #28 mostly done, dialogs return to the main dialog: a live conversation check (`28.md`).
- #34 built, NPC appearance: body parts beyond the head, portraits, facial hair, a live look (`34.md`).
- #25 P6 cutscenes per dialog choice: X5 verified example; three decisions for the user (`25.md`).
- #26 P6 horse scripts: design first (`ActionMountObject`, mount feats, indoor limits), generator, `verify_*`, skill.
- #30 #31 #33 P6 area prefabs, flat space for multi-tile features, per-tileset survey: design first (`30.md`).
- #35 P6 randomised gear appearance: `docs/gear-and-npc-generation-history.md`.
- #37 P6 auto-fill the DM quickbar: three unknowns in `docs/henchmen-and-caster-history.md`.
- #49 P6 sequel hook: optional open-thread field in the plot, Chapter 2 template reusing NPCs and items.
- #50 P6 companion lines per beat: a conditional dialog root per major beat on each companion.
