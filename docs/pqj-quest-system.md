# The Parametrized PQJ Quest System

A manual for `pqj_p_inc.nss` — a simplification of Knat's "PQJ" persistent-quest
library that NWN persistent worlds commonly build on. Everything in this manual
is drawn from a real build: `pqj_ilm_stage2.mod`, a standalone staging module
containing 5 worked examples (one per attachment mechanism) plus all 33 quests
from Legacy of Ilmara's live journal, ported onto this system.

## Why this exists

Legacy of Ilmara's quest system (like many PW modules built on Knat's PQJ
library) implemented every quest stage as a hand-cloned ~40-line template
script, with the quest tag and state number retyped as string literals inside
each clone. An audit of that module found this is a reliable bug factory: a
tag retyped as `"0007"` instead of `"q005"`, another retyped as
`"GALLERY_QUEST"` instead of the journal's actual `"GALERY_QUEST"`, and a
whole login-handler script that was cloned, edited, and never wired to any
module event. Roughly 150 near-identical files, each a fresh chance to get
one string wrong.

`pqj_p_inc.nss` collapses that pattern into a shared function library. Every
quest call site becomes a **one-line** generated script instead of a
40-line template:

```nwscript
// condition script
#include "pqj_p_inc"
int StartingConditional() { return PQJ_At("q005", 7); }

// action script
#include "pqj_p_inc"
void main() { PQJ_Set("q005", 7, TRUE); }
```

**A tested finding drives this design**: real NWN:EE dialog script
*parameters* (`ActionParams`/`ConditionParams`, read via `GetScriptParam()`)
are not usable through current nwn-mcp tooling — `GetScriptParam` itself
compiles fine (confirmed by a throwaway test script), but the GFF-patching
tool (`modify_gff_field`) cannot safely construct the new struct-list fields
those parameters live in. A first attempt corrupted a scratch dialog's
in-memory state on the very first try (every subsequent edit to that
resource failed identically afterward), and a second attempt corrupted an
area's GIT data the same way — including on a plain existing-scalar edit,
not just new-field creation. Don't retry this path expecting a different
result. `pqj_p_inc` gets the same practical win — centralize the logic, keep
each call site tiny — through ordinary one-line scripts instead.

## The `pqj_p_inc.nss` API

| Function | Attachment point | Behavior |
|---|---|---|
| `int PQJ_At(string sTag, int nState)` | dialog condition | exact stage match |
| `int PQJ_AtLeast(string sTag, int nState)` | dialog condition | stage ≥ N |
| `int PQJ_AtMost(string sTag, int nState)` | dialog condition | stage ≤ N (e.g. "not started") |
| `void PQJ_Set(string sTag, int nState, int bParty=FALSE)` | dialog action | advance a stage, optionally to the whole party |
| `void PQJ_Finish(string sTag, int nState, string sItem="", int nGold=0)` | dialog action | turn-in: destroys `sItem` if given, awards `GetJournalQuestExperience(sTag)` XP + `nGold`, propagates to party within 20m |
| `void PQJ_TrigSet()` | trigger `OnEnter` | reads `qTag`/`qState`/`qMin`/`qMax` off **the trigger's own local variables** |
| `void PQJ_DeathSet(string sDefaultOnDeath="")` | creature `OnDeath` | reads `qTag`/`qState` off **the creature's own locals**; chains to `sDefaultOnDeath` first so normal death handling (XP, corpse, alignment, ally alerts) isn't lost |
| `void PQJ_ItemSet(object oPC, object oItem)` | item acquire (called from a dispatcher) | reads `qTag`/`qState`/`qFinish` off **the item's own locals** |

All six build on the existing `pqj_inc.nss` API
(`AddPersistentJournalQuestEntry`/`RetrieveQuestState`) — the persistence
layer itself is untouched, only how each call site gets its parameters
changed.

### Why triggers/creatures/items use local variables, not dialog parameters

Dialog nodes are the only GFF structures with any kind of parameter slot —
and per the finding above, that slot isn't safely usable yet. Triggers,
creature instances, and item instances don't have a parameter slot at all,
but they do have ordinary local variables
(`SetLocalString`/`SetLocalInt`/`GetLocalString`/`GetLocalInt`). Point every
same-shaped trigger/creature/item at the same `PQJ_TrigSet`/`PQJ_DeathSet`
script and let its own locals carry the tag/state.

**Creatures**: `create_creature_blueprint`'s `varTable` parameter sets these
directly at creation — no extra script needed:

```json
varTable: [{"name":"qTag","type":"string","value":"q005"},
           {"name":"qState","type":"int","value":8}]
```

Real example from this build (`ex_kill`'s target, `ex_kil_orc.utc`):
`ScriptDeath: "pqj_p_death"`, `varTable: qTag="ex_kill", qState=2` — one
shared `pqj_p_death.nss` (`PQJ_DeathSet("nw_c2_default7")`) reused by every
kill-quest target in the module.

**Triggers**: no equivalent creation-time variable slot was found safe to use
generically, so this build uses a *dispatcher* script — one file, one small
block per trigger-driven quest, each block setting locals then immediately
calling `PQJ_TrigSet()` in the same execution (harmless to repeat; each call
consumes its own locals before the next block runs):

```nwscript
#include "pqj_p_inc"
void main()
{
    SetLocalString(OBJECT_SELF, "qTag", "q011");
    SetLocalInt(OBJECT_SELF, "qState", 2);
    SetLocalInt(OBJECT_SELF, "qMin", 1);
    SetLocalInt(OBJECT_SELF, "qMax", 1);
    PQJ_TrigSet();
}
```

This build's actual dispatcher, `stg_trig_ent.nss`, holds three such blocks
(`ex_trig`, `q011`, `TD_QUEST001`) set as the `OnEnter` script on the staging
areas.

**Items**: no per-instance script slot and no blueprint-creation variable
slot either (`create_item_blueprint` has no `varTable` param), so this build
uses the same dispatcher shape wired to the module's single
`Mod_OnAcquirItem` event:

```nwscript
#include "pqj_p_inc"
void main()
{
    object oItem = GetModuleItemAcquired();
    object oPC = GetModuleItemAcquiredBy();
    string sTag = GetTag(oItem);

    if (sTag == "eis_blade")
    {
        SetLocalString(oItem, "qTag", "EISIG_QUEST");
        SetLocalInt(oItem, "qState", 2);
    }
    // one block per item-triggered quest

    PQJ_ItemSet(oPC, oItem);
}
```

## Two-step compile workaround

`write_script`'s built-in `compile: true` has a race that intermittently
throws a spurious `ENOENT` on the `.ncs` output path even when the source is
fine (hit repeatedly during this build). The reliable pattern:

```
write_script(resref, source, compile: false)
compile_script(resref)   // separate call
```

## Worked example, end to end

The simplest demo quest in this build, `ex_fetch` ("Example: Fetch and
Turn-in"), built with `add_journal_quest`/`add_journal_entry`,
`create_dialog`, and two one-line scripts. Its real `flatten_dialog` output:

```
Dialog: ex_kil_d          (kill-quest sibling, shown here — same shape)
Entries: 3, Replies: 4
Scripts: ex_kil_a1, ex_kil_fin
Conditions: ex_kil_c0, ex_kil_c2
---
[NPC #0] "Greetings, traveler."
  [PC #0] [if: ex_kil_c0] "What do you need?"
    [NPC #1] "An orc raider has been troubling us. Slay it." {runs: ex_kil_a1}
      [PC #1] "I'll deal with it." [END]
  [PC #2] [if: ex_kil_c2] "The orc raider is dead."
    [NPC #2] "Well done! Here is your reward." {runs: ex_kil_fin}
      [PC #3] "Thank you." [END]
```

`ex_kil_a1.nss` (accept): `PQJ_Set("ex_kill", 1);`
`ex_kil_fin.nss` (turn-in): `PQJ_Finish("ex_kill", 3, "", 25);`
`ex_kil_c0.nss`/`ex_kil_c2.nss` (conditions): `PQJ_AtMost`/`PQJ_At` one-liners.
The kill target's blueprint carries `ScriptDeath: pqj_p_death`,
`varTable: qTag="ex_kill", qState=2` — no per-quest death script at all.

## Verifying a quest built this way

`verify_journal`/`verify_quest_completability` will report **every** quest
here as `quest_never_awarded` — this is expected, not a bug. Both tools do a
literal source-text search for `AddJournalQuestEntry(`, and this system now
wraps that call **two layers deep** (`PQJ_Set`/`PQJ_Finish` →
`AddPersistentJournalQuestEntry` → `AddJournalQuestEntry`). Confirmed on this
build: `search_scripts("PQJ_Set(\"ex_fetch\"")` finds the real call;
`get_resource` on the `.dlg` confirms the `Script`/`Active` GFF fields are
actually set. See the `quest-explorer` skill for the full methodology.

One more tool caveat found during this build: `list_script_references`
returned empty results for scripts on dialogs *created earlier in the same
session* (its index appears to be built at load time, not updated
incrementally) — `flatten_dialog` and `get_resource` remained accurate and
are the reliable way to confirm wiring on anything just built.

## Reference: the 38 demo quests

Five shape examples, each isolating one `pqj_p_inc` attachment mechanism:

| Tag | Demonstrates |
|---|---|
| `ex_fetch` | `PQJ_At` / `PQJ_Set` / `PQJ_Finish` — plain dialog fetch quest |
| `ex_kill` | `PQJ_DeathSet`, chained to a stock `nw_c2_default7` OnDeath |
| `ex_trig` | `PQJ_TrigSet` via an OnEnter dispatcher |
| `ex_item` | `PQJ_ItemSet` via the `Mod_OnAcquirItem` dispatcher |
| `ex_party` | `PQJ_Set(..., bParty=TRUE)` and `PQJ_Finish`'s always-on party propagation |

Plus all 33 quests from Legacy of Ilmara's real journal (tags, names,
entries, XP ported verbatim from `get_journal()`), rebuilt on this system —
see the session notes for which of those were fully re-mechanized versus
compressed to their dialog-only critical path, and the specific fix applied
to `TD_QUEST001`'s previously-unplaceable quest item.
