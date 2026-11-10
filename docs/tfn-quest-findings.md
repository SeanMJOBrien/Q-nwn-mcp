# TFN quest-script findings and the port plan for the content studio

Verified 2026-11-09 against `~/git/the-frozen-north/src/nss` (read only). Context: TODO #16 in `CLAUDE.md`. This project's quest system
(`docs/quest-system.md`) was ported from TFN's `inc_quest.nss` / `dlg_q_*` and then fixed; this note is what to carry back. **Keep TFN's model, not ours:** per-player state
(`SQLocalsPlayer`), NWNX quest-giver highlighting, TFN's XP and loot includes and `party_credit` kill credit. Do not port whole-party journal advance or vanilla journal state.
TFN is changed only through the studio's `changeset.apply_changeset` or upstream, never silently.

## 1. Bugs in TFN's own scripts (all confirmed in the source)

| # | Where | What the code does | Effect | Fix |
|---|---|---|---|---|
| 1 | `inc_quest.nss:295` `AdvanceQuestSphere(oQuestObject, nTarget, fRadius)` | calls `AdvanceQuest(oQuestObject, oPC, 1)`, ignoring `nTarget` | `dlg_q_adv` with `aoe=1` advances slot 1 whatever `target` says | pass `nTarget` |
| 2 | `inc_quest.nss:24,194,305` | `HIGHEST_QUEST_COUNT = 20` but the loops are `for (i = 1; i < HIGHEST_QUEST_COUNT; i++)` | slots 1-19 only; slot 20 is never scanned (`:346` uses `j=0; j<20`, which is fine) | `i <= HIGHEST_QUEST_COUNT`, or lower the constant to 19 and say so; raise the studio's `MAX_SLOT = 19` together |
| 3 | `dlg_q_chk_advb.nss` | a **condition script** rolls Bluff, shifts alignment (`AdjustAlignment ... CHAOTIC`), gives skill XP and calls `AdvanceQuest(..., TRUE)` | the engine runs conditions when it builds the node list, so merely seeing the option shifts alignment, rerolls and can advance; `bBluff` also lets a success skip stages, not just one | roll in an action script (this project's `q_roll`), store the result on the PC, branch on it in the next node's condition |
| 4 | `inc_quest.nss:245-247` | `CreateItemOnObject(sRewardItem, oPC, 1)` then `InitializeItem` / `SetIdentified` with no validity check | a bad reward resref calls both on `OBJECT_INVALID` | `if (GetIsObjectValid(oItem))` |
| 5 | `on_item_acq.nss:142-147` | an item tagged `quest` always runs `AdvanceQuest(oItem, oPC, 1)` | a quest item only ever advances slot 1 | read the slot from an item variable, default 1 |
| 6 | `inc_quest.nss:147-148,163-164,179` | `GetSubString(sQuest, 0, 2)` for the stage | two-digit stages: a quest with 100+ stages breaks | document the 99-stage limit, or widen the encoding |

## 2. Generator additions for `tfnstudio/quests.py` (it covers talk, kill, pickup, explore, deliver, rescue, escort)

Each needs UI fields in the Quest Builder, `describe`, validation, tests, `MANUAL.md` and a regenerated `MANUAL.html`. Reference implementations here: `src/util/quest-{spec,builder,script}.ts`.

1. `search` stage: a placeable skill check by the best party member (companions included), tries per player, an `assured` find so a required clue cannot block the quest, item handed over, optional `examine` second check. Needs a `q_search`-style script in `questrun.py` (`SCRIPTS`, header `// tfn-studio quest runtime`).
2. Optional clues (`optional: true` search, no journal entry, pays a reward once).
3. `approach` (an NPC walks to the first player it sees and starts its conversation; `q_approach` on OnPerception, chaining the old handler).
4. `join` / `companion` / `dismiss`. Check TFN's henchman system before using `AddHenchman` directly.
5. `deliver` with `keep`; stage `script` (TFN's existing `questK_self_script` / `questK_pc_script`, not exposed by the studio); `custom` stages (journal entry only); `trigger` and `use` stages; flat `xp` beside TFN's tiers.
6. Templates (`fetch`, `kill`, `bounty`, `deliver`, `rescue`, `escort`, `investigate`, `persuade-or-fight`) and derived defaults (tag from name, stage numbering, `from`, end stages, level-sized rewards).
7. A generic condition/action pair driven by script parameters (`q_chk` / `q_act`: items, gold, skill rank, rolls, companions, variables; take/give, hostile, unlock, spawn, destroy, leave), added beside TFN's `dlg_q_*` scripts, not replacing them; plus the generic check (`q_check`, ability / save / skill at any DC) and `spawn` as a stage option.

Runtime details worth carrying: a pickup pays once per item (flag on the item); kills by companions, summons and familiars credit their master (check `party_credit.nss` first, TFN may already cover this); the escort poll is the studio's own and needs no change.

## 3. Status

Sections 1 and the plan in section 2 are written; **no studio code is changed and nothing in TFN was touched.** Correction to the original TODO: only the two `i = 1` loops stop at 19; the `j = 0` loop at line 346 covers all 20 slots.
