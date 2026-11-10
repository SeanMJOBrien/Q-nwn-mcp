# Co-op skill checks and rewards

Moved verbatim from CLAUDE.md (work-plan A5, 2026-11-10).

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
