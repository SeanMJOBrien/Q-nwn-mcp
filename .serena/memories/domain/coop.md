# Co-op rules (`verify_coop_rules`; `docs/coop-skill-checks-and-rewards.md`)

Every module is party-playable by default. A dialog action script runs once, on the NPC, with one `GetPCSpeaker()`.
- XP/gold/items fan out: generated `inc_reward` helpers (`create_reward_system`) or `GetFirstFactionMember(oPC, TRUE)`/`GetNextFactionMember` loops. Bare `GiveXPToCreature(GetPCSpeaker(), n)` is an error.
- `AddJournalQuestEntry` 4th arg (`bAllPartyMembers`) TRUE, never FALSE.
- Shared quest state on `GetModule()` or the quest giver, never `SetLocalInt(GetPCSpeaker(), ...)`.
- Each player gets 100 % of a reward, never a divided pot.
- Skill-check puzzles: 1-2 attempts per PC tracked on the PC; best skill among the PC and its henchmen (`GetMaster(oMember) == oPC`).
- Single-player opt-out: `coop: false` on `verify_coop_rules`/`verify_all` (same findings as warnings).
