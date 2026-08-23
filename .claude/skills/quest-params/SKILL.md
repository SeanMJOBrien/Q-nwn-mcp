---
name: quest-params
description: Build a NEW quest in an existing module using the parametrized PQJ pattern (pqj_p_inc.nss) instead of hand-cloning per-quest template scripts. Trigger on "add a quest" / "create a quest" / "new journal quest" in a module that already uses Knat's persistent-quest library (pqj_inc.nss — see quest-explorer for how to recognize it), or whenever about to clone a `_pqj_*`/`q0NN_*`-style template script. Companion to quest-explorer (audits/fixes the legacy hand-cloned pattern) and adventure-quests (autonomous greenfield generation with vanilla wiring, a different convention entirely — don't mix the two).
---

# Quest Params

Companion to `quest-explorer`. That skill teaches how to recognize and
safely audit/fix a module already using Knat's PQJ persistent-quest library
(`pqj_inc.nss` — `AddPersistentJournalQuestEntry`/`RetrieveQuestState`). This
skill is for **building new quest content** on top of that same library
without repeating its classic failure mode: hand-cloning a ~40-line
template per call site and retyping the quest tag/state/item inside it every
time. That pattern is a bug factory — see `quest-explorer` for real examples
(a retyped tag that silently became `"0007"` instead of `"q005"`, a
`GALLERY_QUEST`/`GALERY_QUEST` spelling mismatch) found by auditing exactly
this kind of module.

## The fix: `pqj_p_inc.nss`, not hand-cloned templates

**Important, tested finding: true NWN:EE dialog script parameters
(`ActionParams`/`ConditionParams`, read via `GetScriptParam()`) are not
currently usable through nwn-mcp's tooling.** `GetScriptParam` itself
compiles fine (the engine supports it), but `modify_gff_field` cannot
reliably construct the new struct-list GFF fields those parameters live in —
attempting it corrupted a scratch dialog's in-memory state on first try
(every subsequent GFF-mutating call on that resource failed identically).
Don't retry this path expecting a different result; treat it as a known
tooling gap unless/until nwn-mcp adds first-class support for it. The
resource itself isn't destroyed and `repack_module` still succeeds around
it — but abandon that resref and any further attempt at that resource, and
don't wire anything real to it.

**The working substitute**: a single include, `pqj_p_inc.nss`, holding all
the logic that used to be duplicated across every clone
(`AddPersistentJournalQuestEntry` calls, party propagation, item
destruction, XP/gold reward). Every call site becomes a **one-line**
generated script instead of a ~40-line template:

```nwscript
// condition script, e.g. resref q005_sc7
#include "pqj_p_inc"
int StartingConditional() { return PQJ_At("q005", 7); }

// action script, e.g. resref q005_at7
#include "pqj_p_inc"
void main() { PQJ_Set("q005", 7, TRUE); }
```

This still means one `.nss` per attachment point (NWN dialogs don't have a
mechanism to share one script across nodes without real engine parameters),
but each one is now three lines, not forty — trivially reviewable, and with
almost nothing left to typo. The actual typo-resistance comes from **where
the tag string comes from**: always copy it from a live `get_journal()` call
(or the design tool's export) into the one-line wrapper, never retype it
from memory.

### `pqj_p_inc.nss` API

| Function | Use for |
|---|---|
| `int PQJ_At(string sTag, int nState)` | dialog condition: exact stage match |
| `int PQJ_AtLeast(string sTag, int nState)` | dialog condition: stage ≥ N |
| `int PQJ_AtMost(string sTag, int nState)` | dialog condition: stage ≤ N (e.g. "not started") |
| `void PQJ_Set(string sTag, int nState, int bParty=FALSE)` | dialog action: advance a stage |
| `void PQJ_Finish(string sTag, int nState, string sItem="", int nGold=0)` | dialog action: turn-in — destroys `sItem` if given, awards `GetJournalQuestExperience(sTag)` XP + `nGold`, propagates to party within 20m |
| `void PQJ_TrigSet()` | trigger `OnEnter` — reads `qTag`/`qState`/`qMin`/`qMax` off the **trigger's own local variables** |
| `void PQJ_DeathSet(string sDefaultOnDeath="")` | creature `OnDeath` — reads `qTag`/`qState` off the **creature's own locals**; chains to `sDefaultOnDeath` first so normal death handling (XP, corpse, alignment, ally alerts) isn't lost |
| `void PQJ_ItemSet(object oPC, object oItem)` | item `OnAcquire` (call from the module's `x2_item_events` `X2_ITEM_EVENT_ACQUIRE` branch) — reads `qTag`/`qState`/`qFinish` off the **item's own locals** |

Live at `pqj_p_inc.nss` in Legacy of Ilmara as of this writing — `#include`
it the same way existing scripts `#include "pqj_inc"`.

## Why triggers/creatures/items use local variables, not parameters

Dialog nodes are the only GFF structures with a parameter slot at all (and
that slot isn't usable yet per above). Triggers, creature instances, and
item instances don't have one — but they DO have ordinary local variables
(`SetLocalString`/`SetLocalInt`/`GetLocalString`/`GetLocalInt`). Point every
same-shaped trigger/creature/item at the **same** `PQJ_TrigSet`/
`PQJ_DeathSet`/`PQJ_ItemSet` script and let its own locals carry the
tag/state — this is the exact working pattern this module already uses
successfully elsewhere (a discovery trigger's `OnEnter`, a boss's
`OnDeath`), just centralized into one script instead of one clone per quest.

**Updated finding — avoid `modify_gff_field` for this entirely, don't just
avoid *creating* new fields with it.** A later build on this system hit a
second corruption from it, this time on a plain *existing-scalar* edit (an
area's GIT data), not just new struct-list creation. Treat `modify_gff_field`
as unsafe for this workflow across the board, not only for the `VarTable`
struct-list case originally flagged.

**What to use instead, per attachment type** (confirmed working on a real
38-quest build):

- **Creatures**: `create_creature_blueprint` takes a `varTable` parameter
  that sets local variables directly at creation time — no extra script
  needed:
  ```json
  varTable: [{"name":"qTag","type":"string","value":"q005"},
             {"name":"qState","type":"int","value":8}]
  ```
  Pair with `ScriptDeath: "pqj_p_death"` on the same blueprint (a one-line
  `PQJ_DeathSet("nw_c2_default7")` wrapper, reused by every kill-quest
  target in the module).
- **Triggers**: no safe creation-time variable slot was found — use a
  *dispatcher* script instead: one file, one small block per
  trigger-driven quest, each block setting locals then immediately calling
  `PQJ_TrigSet()`:
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
  Set as the `OnEnter` on every trigger-driven-quest area/trigger that
  shares this shape — one dispatcher can hold blocks for several unrelated
  quests.
- **Items**: no per-instance script slot and no blueprint-creation
  variable slot either (`create_item_blueprint` has no `varTable` param) —
  same dispatcher shape, wired to the module's single `Mod_OnAcquirItem`
  event, branching on `GetTag(oItem)` per item.

## Workflow for a new quest

1. **Journal first.** `add_journal_quest` (tag, name, **xp — load-bearing,
   `PQJ_Finish` reads it live via `GetJournalQuestExperience`**, priority),
   then `add_journal_entry` per stage, `end: true` on the final one.
2. **Write one-line wrapper scripts** per dialog attachment point, per the
   table above. Name them however this module's convention already runs
   (see `quest-explorer` for the observed shape,
   e.g. `<tag>_sc<N>`/`<tag>_at<N>`) — consistency with existing content
   matters more than a new convention.
   - Use `write_script(resref, source, compile: false)` then a **separate**
     `compile_script(resref)` call — `write_script`'s built-in
     `compile: true` has a race that intermittently throws a spurious ENOENT
     on the `.ncs` output path even when the source is fine; the two-step
     form is reliable.
3. **Wire dialog nodes** with `add_dialog_node`/`edit_dialog_node`,
   attaching the one-line scripts as `condition`/`script`. Same
   StartingList-ordering rule as `module-explorer`: higher stages first,
   unconditioned/default entry last.
4. For trigger/creature/item-driven stages, write the tiny local-var-setting
   init (or set the scalar `VarTable` entries directly if they already
   exist on that blueprint) and point the instance's event field at the
   shared `PQJ_TrigSet`/`PQJ_DeathSet`/`PQJ_ItemSet`.
5. `repack_module`.
6. **Verify like `quest-explorer` teaches**: don't trust `verify_journal`/
   `verify_quest_completability` blindly on a module that also has legacy
   `AddPersistentJournalQuestEntry`-wrapped content elsewhere — but a
   *new* quest built entirely on `pqj_p_inc` should actually pass those
   verifiers cleanly, since `PQJ_Set`/`PQJ_Finish` ultimately still call
   `AddJournalQuestEntry` through the same wrapper chain the verifiers
   already can't see through. Cross-check with `search_scripts` for the
   tag/`PQJ_` calls the same way `quest-explorer` describes, and with
   `list_script_references` — but remember trigger `OnEnter` and creature
   `OnDeath` attachments don't show up in `list_script_references` (tested
   and confirmed this session); check those with `get_area_triggers`/
   `get_area_creatures` directly instead. One more gap: `list_script_references`
   also returned empty for scripts on dialogs *created earlier in the same
   session* — its index appears to be built at load time, not updated
   incrementally as you add content. `flatten_dialog` and `get_resource` on
   the raw `.dlg` stayed accurate throughout and are the reliable way to
   confirm wiring on anything you just built.

## Full reference manual

A complete worked example (a real `ex_fetch`/`ex_kill`-style quest end to
end, with actual `flatten_dialog` output) plus a per-quest reference table
lives in `docs/pqj-quest-system.md` in this repo — read it before building
anything nontrivial on this system.
