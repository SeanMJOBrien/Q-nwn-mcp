# Player simulation (work-plan phase C)

Problem: the headless verify server has no player, so quests, recruiting, skill checks and dialog actions are compiled but never run.

## C1 spike result (2026-11-10)

(a) A real or NWNX-created player object on the headless server: not attempted further. nwserver has no way to create or log in a PC without a game client, and no NWNX plugin does it.

(b) A stand-in creature as the player, measured on the real engine with a throwaway module (`create_module`, a module OnModLoad script spawning `nw_bartender` as the stand-in and `nw_oldman` as an NPC, logged through `run_live_verification`):

| Call on the stand-in | Result |
|---|---|
| `GetIsPC(oSim)` | 0 (every `GetIsPC` check in the generated scripts rejects it) |
| `AddJournalQuestEntry(tag, n, oSim, FALSE)` then `GetLocalInt(oSim, "NW_JOURNAL_ENTRY"+tag)` | 1: the quest state local is set on a non-PC even with no `Module.jrl` (the engine warns "No Module.jrl file") |
| `AddHenchman(oSim, oNpc)`, `GetMaster`, `GetHenchman` | work (master is the stand-in, `GetHenchman(oSim,1)` is the NPC) |
| `GetFirstFactionMember(oSim, TRUE)` (PC only) | invalid; with `FALSE` it lists the stand-in and the henchman |
| `GiveGoldToCreature`, `GiveXPToCreature`, `GetGold`, `GetXP` | work (50 gold, 100 xp read back) |
| `GetPCSpeaker()` | invalid (no conversation) |
| `GetSkillRank(SKILL_SEARCH, oSim)` | 0 on the commoner stand-in (use a creature with ranks for check tests) |

So journal, henchmen, rewards and skill checks run on a stand-in. What blocks it is only the places that ask "is this a PC": `GetIsPC` (companion script line ~47, quest script lines ~101, 320, 509, 525, 548, 823, 1095, 1205, 1309), PC-only faction loops (`GetFirstFactionMember(o, TRUE)` in the reward and quest helpers), and the actor lookup (`GetPCSpeaker()` and friends: `quest-script.ts` 633, 717, 811, 1038; `companion-script.ts` 119-160).

## Decision for C2

One module local, `MCP_TEST_ACTOR` (object, set by the driver on the module object), and two helpers in the generated includes:

- `SimIsPlayer(o)` = `GetIsPC(o)` or `o == GetLocalObject(GetModule(), "MCP_TEST_ACTOR")`;
- `SimSpeaker()` = the test actor when set, else `GetPCSpeaker()`.

Generated scripts use them in place of `GetIsPC` and `GetPCSpeaker()`; PC-only faction loops become inclusive loops that keep the `SimIsPlayer` filter. Without the local set, behaviour is unchanged for real players.

Not measurable on a stand-in (stays "not checkable" in C3): real conversation UI, `GetPCSpeaker()` inside the engine's own dialog flow, OnClientEnter, per-player persistence, the NPC dialog-condition gating that the dialog engine evaluates (the driver calls the condition and action scripts directly).

## C2 result (2026-11-10): `run_live_verification` with `simulate`

Usage: `run_live_verification({ simulate: '{"steps":[...]}', expectedCheckLines: "<steps + quest log lines + 1>" })`. Each step: `npc` (tag), `script` (`q_act`, `q_chk`, `q_roll`, `a_hen_join`, ...), `params` (the dialog node's script parameters), `kind: "condition"` with `expect`, and optional `expectStage`, `expectGold`, `expectItem`. The result has `simResults.ok/fail/done`. Set `expectedCheckLines` high enough that the run does not stop before `[SIM_DONE]` (quest scripts log `[QUEST]` lines that count too).

Measured on the real engine with a throwaway module (one commoner giver, `build_quest` with a two-stage talk/return quest):
- `SetScriptParam` then `ExecuteScript` on the NPC passes the parameters to `q_chk` and `q_act`; a condition's result is read back through `SIM_COND`.
- Accept and hand-in: quest stage 1 and 2 reached on the stand-in, gold paid, "no longer eligible" and "hand-in eligible" conditions correct (5 of 5).
- A deliberately wrong run reported all three failures (wrong stage, NPC not found, wrong condition result) and `[SIM_DONE] ok=0 fail=3`, so a failure is not silent.
- The module's own `.mod` and project were not touched: the driver exists only in the throwaway build.

Limits: a module built before `inc_sim` needs `create_quest_system` / `create_companion_system` re-run. `inc_reward` still loops on real PCs only. Dialog flow (condition gating on the dialog engine, node order) is not exercised; steps call the scripts a node would call.

## C3: what is checked how (2026-11-10)

Runs: a throwaway two-stage quest module (above) and The Salt Gate Conspiracy (project loaded with `load_module`, `create_quest_system` and `create_companion_system` re-run so the scripts carry `inc_sim`). Salt Gate run: 13 of 13 steps passed, no engine errors.

| Feature | Status |
|---|---|
| Quest accept, advance, eligibility conditions (`q_chk`, `q_act` talk stages) | checked by simulation (both modules; Oswin's "A Merchant's Worry": offer eligible, accepted, stage 1, hand-in not yet eligible) |
| Quest hand-in with gold reward | checked by simulation (throwaway module: stage 2, 50 gold) |
| Companion recruit, `c_hen_free` / `c_hen_mine`, party of 3, dismiss (`a_hen_join`, `a_hen_leave`) | checked by simulation (Rurik, Wren, Fenn) |
| Companion levelling and gear at spawn (`inc_cre_level`) | checked live by the existing `[SPEC_OK]` lines (this run: Rurik, Wren, Fenn level 10, gear, Wren's cleric slots and domains) |
| Skill checks (`q_roll`, `q_check`, `add_skill_check`) | not checked yet; steps can call them, none written. Next: one step per check with a stand-in that has the skill |
| Explore, trigger, use, kill stages | not checkable with the driver: they depend on `GetEnteringObject`, `GetLastUsedBy`, `GetLastKiller` events |
| Escort, spawn-on-accept, hostile flip, give/take items (`q_act` options) | possible with steps (`expectItem`), not run |
| Dialog flow: node order, which root is shown, return-to-hub | not checkable: needs the dialog engine and a real conversation; `verify_dialog` covers the static shape |
| Rewards (`inc_reward`) | not checkable: loops on real PCs only |
| Hand-written Salt Gate scripts (`a_qsalt_*`, `c_qret_*`) | not run: they call `GetPCSpeaker()` directly |

Test goals (TODO #23): `run_live_verification` takes `goal`. Without it the result carries a warning; with `simulate` the result carries a `verdict` (every step passed, `[SIM_DONE]` seen, no engine error). Takes effect after the next MCP restart.
