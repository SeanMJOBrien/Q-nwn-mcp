# The stories we made versus how the pipeline makes them

Written 2026-11-09 for CLAUDE.md TODO #24. Question: where does the process (`/adventure-plot` through `/adventure-rewards`, `plan_adventure_shape`,
`verify_story`, `phase_check`) flatten or drop the story that was intended? Evidence is from real modules and the fixes they needed:
**The Salt Gate Conspiracy** (this session, found by playing it and reading it back) and **The Hollow Communion** (CLAUDE.md, 2026-10/11 playtests).
Nothing here is changed yet; each finding ends with what to change and where.

## What the pipeline produces

`/adventure-plot` writes one `adventure.md` from a short prompt (premise, locations with events, key NPCs, antagonists, quests, optional story
graph). Each later phase reads its sections and acts alone, autonomously: areas, dressing, actors (1-3 PC replies, "2-4 exchanges maximum"),
quests (`build_quest`), hostiles by role, stores and loot, then polish and rewards. Checks are structural: `verify_*`, `verify_quest_completability`,
`check_area_connectivity`, `verify_story` (only when a story graph exists).

## Findings

| # | Where the story is flattened or dropped | Evidence | What to change |
|---|---|---|---|
| 1 | **The story record can be lost.** It lived in the module's temp directory, outside the `.mod`, so a hand-continued module had no premise, tone or motives on record. | Salt Gate: `adopt_module` found 26 `(not recorded)` fields. | Fixed 2026-11-09: `adventures/<Title>/` holds it. Also require the Plot sections to be filled, not just present (`phase_check` end for `plot` should refuse `(not recorded)`). |
| 2 | **The check passes without a story graph.** `verify_story` says "fine for a short, linear adventure" when no graph exists, so the one tool that tests beats, clues and payoffs never ran. | Salt Gate: `story_no_graph`, 0 beats, 0 threads. | Make the graph required above a size (areas or events), not optional; adopt should draft one from areas, quests and key NPCs. |
| 3 | **A promised payoff has no consumer.** The final journal entry said "carry proof back to the city", and three proof items existed as loot (cask, ledger, Token), but no dialog or script asked for them. The Token was even destroyed earlier by the Ashfang scene. | Salt Gate, found by the player; fixed by hand in the return scene (2026-11-09). | A check "every item or clue a journal entry names has a consumer (a dialog line, a script, a trigger)" and "an item used up by one scene is not needed by a later one". `verify_story` can own it once the graph lists payoffs. |
| 3b | **The quest ends on a boss death, not on a story beat.** Completion is wired to the boss's OnDeath script; the aftermath (who hears, what changes) is nobody's job. | Salt Gate, Hollow Communion: end entries fire on death. | Add an "aftermath" beat to the plot template and let `build_quest` end a quest on a return stage by default. |
| 4 | **Journal timing follows geography, not discovery.** The easy trigger is an area OnEnter, which advances the quest before the player has learned anything. | Hollow Communion (stage 2 on entering the house); Salt Gate (Yorrin's stage 3 on entering the dock area, fixed to the dialog). | A `verify_journal` warning when an area OnEnter advances a quest stage that is not an `explore` stage; `build_quest` already writes the right wiring. |
| 5 | **A choice does not carry its consequence.** Gorrukh's warband stood down in the story and in the journal, but only Gorrukh changed faction; his orcs stayed hostile. | Salt Gate (fixed 2026-11-09). | A stage that changes a creature's stance should name the group (`spawn`-style `affects` list), and a check should flag creatures sharing a tag prefix with a converted NPC. |
| 6 | **Dialog is a dead end per branch, so quest content is unreachable.** Two of Stonewake's three questions ended the conversation; the quest-accept option was only on the third. | Salt Gate (fixed by moving the start to her opening line; rule #28). | The dialog rule (branches return to the main dialog), now in the tools and `verify_dialog`. |
| 7 | **Story is carried by journal text, not by people.** NPC dialog is capped at 2-4 exchanges, so motives and relationships end up in journal entries and the plot document, not in what characters say. | Hollow Communion: the antagonist's motive was only added after the fact (2026-11-08 rework). Salt Gate: Role in Story and NPC motives were never recorded. | Require a motive for each key NPC and the antagonist before the actors phase starts, and let the actor dialog carry at least one line of it; `audit_module` reports NPCs with no motive on record. |
| 8 | **Areas carry encounters, not beats.** `plan_adventure_shape` assigns events (fights, checks, discoveries) to areas by play time; nothing says which story beat an area serves. | Adopted Salt Gate: every location has `Role in Story: (not recorded)`; event counts per area are 7-19 with no beat attached. | Each location records one beat and each beat names its areas (the story graph does this when present); `audit_module` flags an area with no beat. |
| 9 | **No sequel hook.** The pipeline ends at "quest complete", with no thread left for a second chapter. | Salt Gate: the ledger's names point higher than the boss, but nothing built continues it (chapter 2 outline written by hand). | An optional "open thread" field in the plot, and a Chapter 2 template that reuses the same NPCs and items. |
| 10 | **Companions' stories are separate from the plot.** The three recruits have backstories that mention the setting but no stake in any quest. | Salt Gate: Rurik, Wren and Fenn have a recruit scene and nothing else. | A companion line per major beat (a comment when the party reaches the Salt Gate, when the proof is handed in); stored as conditional dialog roots. |

## Where the process helps

`plan_adventure_shape` and the encounter kinds keep fights from running back to back; `build_quest` wires journal, dialog and variables correctly
once the stages are decided; `verify_quest_completability` catches broken chains. The gaps above are all in the layer above those tools: deciding what
the story is, and checking that what was built still says it.

## Suggested order of work

1. Findings 3, 4 and 5 as `verify_*` checks (cheap, they catch real bugs).
2. Findings 1, 2, 7 and 8 as `phase_check` / `audit_module` requirements (the story record must say who, why and where).
3. Finding 6 is done in the tools; its quest-builder half is open (TODO #28).
4. Findings 9 and 10 as plot-template additions.

## Status (2026-11-10)

Findings 3 (payoff, item used up), 4 (journal timing) and 5 (consequence) are `verify_journal` warnings (`util/verify/story-consequences.ts`, TODO #42-#44). The checks are heuristics: they read script text and dialog parameters. 3b, 7, 8, 9, 10 and the story-record requirements (1, 2) are still open (TODO #45-#50).

