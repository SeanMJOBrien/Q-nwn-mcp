# Test module spec — "Siege of the Iron Crown"

A hand-specified module used to exercise the companion and verification work end-to-end.
Doubles as the fixture module `docs/TEST_PLAN.md` §6 gap 2 calls for.

## Brief

A castle siege. The party breaches an evil king's fortress and kills him. Three
recruitable companions — wizard, fighter, thief — each with a job the siege actually
needs.

| | |
|---|---|
| **Target party** | 1 PC at level 3 + 3 henchmen at level 3 (4 actors) |
| **Companions** | wizard, fighter, thief — all recruitable, all dismissable |
| **Structure** | Approach → bailey → keep → throne room (4 areas) |
| **Tone** | Grim, martial. A siege already underway; the party is the spear tip. |
| **Play mode** | Solo **and** co-op — co-op reward rules are mandatory, not optional |

## Areas

1. **Approach / gatehouse** — outside the walls. Entry area. The three companions are met
   here (a siege camp at the edge of the map). A barred gate the party must get past;
   the thief's route (a postern door) is the intended solution.
2. **Bailey** — open courtyard between the curtain wall and the keep. Patrolling guards.
   The fighter's stand-up fight.
3. **Keep interior** — corridors and chambers. Traps, a locked strongroom, the captain.
   The thief's second job.
4. **Throne room** — the king, his guard, and the climax.

## Companions

All three: `faction: 2` (Commoner), `henchman: true`, `HENCH_LEVEL = 3`, PC-class
chassis, TYPE 0 soundset matching gender, own recruit dialog with the three-root pattern.

| Role | Chassis | Class | Why the siege needs them |
|------|---------|-------|--------------------------|
| Wizard | `nw_elfmage001` | Wizard | Crowd control against massed guards |
| Fighter | `nw_humanmerc002` | Fighter | Holds the line in the bailey |
| Thief | `nw_halfmerc001` | Rogue | Postern gate, traps, strongroom |

**Never a Commoner chassis** — `LevelUpHenchman` grants a Commoner no feats and no
spellbook, which is the "cleric has no spells" defect.

## Quest

Single quest line, one journal category, with stages for: reach the castle, breach the
gate, cross the bailey, enter the keep, kill the king. Final stage flagged `End=1`.

## Co-op rules (mandatory)

The kill-the-king reward and every quest stage must reach **all** party members:

- XP/gold/items fanned out via `GetFirstFactionMember(oPC, TRUE)` /
  `GetNextFactionMember(oPC, TRUE)`, or `RewardPartyXP`/`RewardPartyGP`.
- `AddJournalQuestEntry` never passed `bAllPartyMembers = FALSE`.
- Shared quest state on `GetModule()`, not on `GetPCSpeaker()`.

`verify_coop_rules` treats violations as errors, so this is enforced, not merely intended.

## Acceptance

The module is done when:

1. `verify_all(checkWalkable: true)` returns `shippable: true` (zero errors).
2. `check_area_connectivity` shows all four areas reachable.
3. `verify_quest_completability` reports no gaps.
4. Each companion passes `verify_creature(henchman: true)` with zero errors.
5. It opens cleanly in the NWN:EE Toolset.
6. In-game (TEST_PLAN TC-H08): each companion recruits, follows, obeys stand-ground and
   follow orders from both the radial and its dialog, uses its class abilities without
   resting first, barks on join/dismiss, and can be dismissed and re-recruited.
7. In-game co-op (TC-M08): two clients, both players receive quest XP, gold and journal
   entries.

## Prerequisites

- MCP server restarted since the henchman/verify build (`henchman` param and `verify_*`
  tools must be present).
- Session started with cwd `~/git/nwn-mcp` so the `/create-adventure` skill and its
  sub-skills are in scope.
