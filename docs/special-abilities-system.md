# The Special-Abilities caster system — design, verified behaviour, and how a DM actually sees it in-game

Companion system to `inc_random_abil.nss` (see `docs/random-abilities-runtime-findings.md`
and CLAUDE.md's "Random caster abilities" section) — same goal (a caster NPC gets a
different, realistic spell/ability loadout every time the module loads, computed without
any build-time "fixed spellbook"), different mechanism: `SpecAbilityList` instead of
`MemorizedList`. **This is now the project-wide default** caster system (see "Pipeline
wiring" below) — `inc_random_abil.nss` is kept as an explicit, documented fallback, not
removed.

## Why a second system exists

`inc_random_abil.nss`'s Tier 1 path (`SetMemorizedSpell`) is gated by
`GetMemorizedSpellCountByLevel()`, which silently reports 0 for any spell level a
creature was never *live-leveled* into (confirmed via three independent NWNX avenues —
see CLAUDE.md). `SpecAbilityList` sidesteps this entirely: it is the same mechanism
base-game monsters have used for decades to fire innate spell-like abilities via the
stock combat AI, with zero caster-class levels and zero dependency on
`GetMemorizedSpellCountByLevel()`. The cost: nothing can *add* a new ability to
`SpecAbilityList` at runtime (`SetSpellAbilityReady()` only toggles an *existing*
entry's ready flag — confirmed from the EE 1.88.8193.36 function docs,
`nwscript-docs/SetSpellAbilityReady.md`), so the full candidate pool has to be baked at
build time; a small runtime include then picks which subset is active each spawn.

## Build time: `bake_spec_ability_pool` / `computeSpecAbilityPool`

`src/util/spec-ability-pool.ts`. For each class position (`classId`, `classLevel`):

1. Confirms the class is a real spellcaster (`classes.2da` `SpellCaster=1`) with a real
   `SpellGainTable`/`SpellTableColumn`/`MinCastingLevel`. Skips (never guesses) otherwise.
2. Reads the base per-level slot count from `cls_spgn_<class>.2da` at the row for
   `classLevel`.
3. Adds the real D&D 3.5 PHB Table 1-1 bonus-spell formula —
   `bonus(level, mod) = floor((mod - level)/4) + 1` for `mod >= level >= 1`, else 0 — using
   the ability score named by `classes.2da`'s `SpellcastingAbil` column (WIS for Cleric,
   INT for Wizard, etc.). Not encoded in any 2DA; computed directly, verified by hand
   against the known table.
4. Builds the candidate pool by reading `spells.2da`'s own per-class column directly
   (via `SpellTableColumn`) for every spell at an accessible level — **not**
   `GetSpellLevelByClass()`, which `inc_random_abil.nss` had to special-case around
   because it resolves through a spell row's `Master` column even when the row's own
   column is `"****"` (two real monster/retired rows confirmed leaking in that way).
   Reading the 2DA cell directly has no such inheritance behaviour to guard against.

`buildSpecAbilityListEntries()` merges this across all of a creature's class positions,
**sorts the whole pool by spell level then spell id**, and writes the
`{Spell, SpellCasterLevel, SpellFlags}` struct list. `markReady` (default `false`)
controls whether a deterministic (`seedHash`-based) real-slot-sized subset is marked
ready right now as a static fallback — default-off is deliberate: a dormant pool
(`SpellFlags=0` everywhere) is exactly as inert as having no spells at all, never an
accidental unlimited spellbook, if nothing ever activates it.

Works identically for a henchman, a Key NPC, or a `compose_encounter` boss — it reads
the blueprint's own `ClassList`/`HENCH_LEVEL` and ability scores, nothing live-engine.

## Runtime: `inc_spec_ability.nss` (`SA_OnSpawn`/`SA_RollClass`)

`src/util/spec-ability-script.ts`. Called once per spawn from a tiny chained wrapper
(e.g. `a_sa_spawn`), same pattern as `inc_random_abil.nss`'s wrappers:

```
#include "inc_spec_ability"
void main()
{
    ExecuteScript("nw_c2_default9", OBJECT_SELF); // or the creature's real original ScriptSpawn
    DelayCommand(0.5, SA_OnSpawn(OBJECT_SELF));    // DelayCommand, not inline — fresh instruction budget
}
```

### The complete NWScript-only algorithm, step by step

This section describes **only** what runs in the shipped engine at spawn time — no MCP,
no TypeScript, no build-time tooling. It assumes `SpecAbilityList` already has a baked
candidate pool sitting on the creature (see "Build time" above) — this runtime half
can only pick *which* of those already-present entries are active; it can never add one.

**1. Trigger.** A tiny wrapper, chained onto the creature's real `ScriptSpawn`, calls
`SA_OnSpawn(OBJECT_SELF)` via `DelayCommand(0.5, ...)` (not inline — gives the call a
fresh instruction budget, separate from whatever the original spawn script already
burned):

```
#include "inc_spec_ability"
void main()
{
    ExecuteScript("nw_c2_default9", OBJECT_SELF); // the creature's real original ScriptSpawn
    DelayCommand(0.5, SA_OnSpawn(OBJECT_SELF));
}
```

**2. `SA_OnSpawn(oCreature)` — the entry point.**
- Validity check (`GetIsObjectValid`) — no-op on an invalid object.
- Reads `GetSpellAbilityCount(oCreature)` (how many `SpecAbilityList` entries exist) and
  calls `SetSpellAbilityReady(oCreature, i, FALSE)` on every single one. This guarantees
  a clean slate every spawn — nothing from a previous roll (or a stray `markReady:true`
  bake) carries over.
- Loops the creature's class positions and calls `SA_RollClass` once per position:
  ```
  int p;
  for (p = 1; p <= 3; p++)
      SA_RollClass(oCreature, GetClassByPosition(p, oCreature), GetLevelByPosition(p, oCreature));
  ```
  **`nClassPosition` is 1-indexed** (1, 2, or 3 — confirmed from `nwscript.nss`'s own doc
  comment: "a single-class creature will only have a value in nClassLocation=1"). A
  single-class creature (the common case) only has real data at position 1; positions 2
  and 3 come back `CLASS_TYPE_INVALID`/level 0 and `SA_RollClass` no-ops on them
  immediately. A genuine triple-multiclass creature gets all three positions rolled
  independently, each against that class's own slot table.

**3. `SA_RollClass(oCreature, nClassType, nClassLevel)` — one class position's roll.**
Eligibility gates, in order, any one of which no-ops the whole function for this
position:
- `nClassType == CLASS_TYPE_INVALID` (no class in this position).
- `classes.2da`'s `SpellCaster` column for this class isn't `"1"`.
- No `SpellGainTable` or `SpellTableColumn` cell for this class.
- `nClassLevel` is below this class's `MinCastingLevel` (e.g. a level-3 Paladin: real
  class, real spellcasting tables exist, but Paladins don't cast until level 4 — no-op).
- `GetSpellAbilityCount(oCreature) == 0` (nothing was ever baked onto this creature).

Once past the gates:
- **Ability modifier**: reads `classes.2da`'s `SpellcastingAbil` column (`STR`.."CHA"),
  maps it to the matching `ABILITY_*` constant, and calls
  `GetAbilityModifier(nAbilConst, oCreature)` — live, at this exact moment, off the
  creature's *current* ability scores.
- **Bucket the pool by spell level, in one pass.** Loops every index `0..GetSpellAbilityCount-1`,
  reads `GetSpellAbilitySpell(oCreature, i)` to get the spell id, looks that id up in
  `spells.2da`'s column named by `SpellTableColumn` (e.g. Wizard's `Wiz_Sorc` column) to
  get that spell's level **for this specific class**, and appends the index `i` into one
  of ten flat JSON arrays (one per spell level 0-9) — not a nested array, not a `switch`
  assigning a json local per case, both deliberately avoided (see the code comment for
  why; same defensive shape `inc_random_abil.nss` uses for its own, larger scan).
- **For each spell level 0-9, compute the real slot count:**
  - `nBase` = `cls_spgn_<class>.2da`'s `SpellLevel<N>` cell at row `nClassLevel - 1`
    (0 if `"****"` or the row doesn't exist).
  - `nBonus` = the D&D 3.5 PHB Table 1-1 ability-modifier bonus-spell formula, for spell
    levels 1-9 only (never for level 0/cantrips): `(nAbilMod - nSpellLvl) / 4 + 1` when
    `nAbilMod >= nSpellLvl`, else `0`. This is computed directly in `SA_BonusSpells` —
    it isn't encoded in any 2DA.
  - `nSlots = nBase + nBonus`. If `nSlots <= 0`, this spell level gets nothing.
- **Pick which pool entries fill those slots.** Takes that spell level's bucket (the
  `SpecAbilityList` indices gathered above), shuffles it with the engine's own
  `JsonArrayTransform(jPool, JSON_ARRAY_SHUFFLE)`, caps the pick count at
  `min(nSlots, bucket size)`, and calls `SetSpellAbilityReady(oCreature, <index>, TRUE)`
  for each of the chosen indices.

**4. Net effect**: by the time `SA_OnSpawn` returns, every spell level the creature's
class/level/ability-score combination legitimately qualifies for has exactly the right
*number* of `Ready` entries (never more than the real rules allow, never fewer than the
pool can supply), and *which* specific spells those are is re-randomized independently
every time the module loads — because the shuffle+pick happens fresh on every call, with
no stored state from the previous spawn.

**Idempotent by design**: calling `SA_OnSpawn` again on the same creature (e.g. after a
companion's deferred-leveling pass completes) is safe — it always starts by un-readying
everything, so there's no accumulation across repeated calls.

**FIXED (2026-10-15)** — the position loop above used to run `0..2` instead of `1..3`,
confirmed live while demonstrating the "level up a creature" recipe. Position 0 is
always invalid, so single- and dual-class creatures were accidentally unaffected (their
real positions 1-2 still fell inside the old range) — only a genuine triple-multiclass
creature ever lost a position's worth of rolling. See CLAUDE.md's matching entry.

**Caveat on pool membership vs. slot count**: slot *count* is recomputed live every
spawn; pool *membership* (which spells even exist as candidates) is fixed at whatever
class level the blueprint had when `bake_spec_ability_pool` ran. If a class level climbs
higher after the bake (e.g. a live `LevelUpHenchman()` pass), newly-unlocked higher-level
spells won't be in the pool until it's re-baked. Bake after the creature's final class
level is set — the existing `deferLeveling`/`HENCH_LEVEL` pattern (`build_npc_stat_block`)
already gives you that ordering for free.

## Is this compatible with henchmen that call `LevelUpHenchman`?

Yes, and `LevelUpHenchman` is simply irrelevant to this system — it never reads or
writes `SpecAbilityList` at all (confirmed: that field is not part of the engine's
spellcasting-progression state `LevelUpHenchman` manages). Whether `a_hen_join`/
`a_hen_spawn` calls `LevelUpHenchman` has zero effect, positive or negative, on
`bake_spec_ability_pool` or `SA_OnSpawn` — both read the creature's actual live
`ClassList`/ability scores at the time they run, regardless of how those got there.

## Sort-by-level is permanent, by construction

`SetSpellAbilityReady()` only ever toggles a `Ready` flag on an *existing* index — it
never reorders or rewrites the physical `SpecAbilityList` array. Since
`buildSpecAbilityListEntries` sorts once, at bake time, every future `SA_OnSpawn` reroll
still presents whichever subset got marked ready in level order. No re-sorting is ever
needed after the first bake.

## How a DM actually sees and uses these abilities in-game — verified, not guessed

**Confirmed live** (`run_live_verification` against the Spec Ability Arena module,
2026-10-14 — see "Live verification evidence" below): `SA_OnSpawn` genuinely marks a
real, non-trivial number of entries ready at real engine spawn time, scaled correctly
per class/level (e.g. a level-12 Wizard: 139 pool entries, 28 marked ready; a level-12
Cleric: 96 pool entries, 36 marked ready). The on-disk `.mod` always shows every entry
`SpellFlags=0` (dormant) — that's expected; `SA_OnSpawn` only runs in a live engine, so
the toolset's static view (and a direct `nwn_gff` dump of the packed module) will never
show a ready entry. **If you're checking whether the bake worked by looking at the
module file or the toolset, you're looking at the wrong half of the system** — the
pool existing (non-empty `SpecAbilityList`) confirms the build-time half; only an actual
running server confirms the runtime half.

**Two genuinely different UI surfaces exist in the client, confirmed from
`nwscript.nss`'s own `GUI_PANEL_*` constants** (not guessed):

```
int GUI_PANEL_SPELLBOOK         = 7;   // the Spells/Powers book — shows known spells,
                                        // memorized spells, AND ready Special Abilities
int GUI_PANEL_RADIAL_QUICKBAR   = 22;  // the bottom action-bar hotbar — 36 slots,
                                        // 3 pages, drag-and-drop only
```

- **The Spellbook panel is what auto-populates from game state.** A `SpecAbilityList`
  entry with `SpellFlags=1` (ready) shows up there automatically, the same way a
  memorized spell or a known spell does — no manual step, no script call needed. This
  is the entire point of the `Ready` flag (the same flag the toolset's own "Special
  Abilities" tab exposes as a per-entry checkbox): it controls whether that ability is
  *available to use* right now, and "available to use" is read directly from the
  Spellbook panel.
- **The Quickbar (the literal bottom hotbar — what "toolbar slots" almost always
  means) is never auto-populated by the engine, for *any* ability, spell, or item, for
  *any* creature.** Confirmed by grepping the full `nwscript.nss` for a setter: there is
  no `SetQuickBarButton`-style function, no script-level way to place anything into a
  quickbar slot. The only way an ability reaches a hotbar slot is a human — a player, or
  a DM possessing a creature — opening the Spellbook (or Feats, or Inventory) radial and
  manually dragging it onto an empty slot. This is **not a limitation of this project's
  implementation** — it's how NWN's quickbar has always worked, for a PC's own spells
  exactly as much as for a possessed NPC's.

**Practical consequence for "none of the toolbar slots have any special abilities
assigned": this is expected, not a bug.** The fix already shipped (sort-by-level,
real pool, real runtime activation) puts the ready abilities exactly where the engine
is designed to surface them automatically — the Spellbook panel (`GUI_PANEL_SPELLBOOK`),
sorted by level. Getting them onto the literal hotbar still needs one manual
drag-per-ability from a human looking at that panel while possessing the creature; there
is no server-side or script mechanism that can do that step instead. If a DM wants a
possessed caster's abilities on their own hotbar for quick clicking, the recipe is:
possess → open the Spells/Powers book → drag each ready entry you want onto a quickbar
slot. This only needs doing once per session per creature (quickbar layout isn't
per-spawn state), and the sort-by-level guarantee means that panel is always presented
in a predictable, level-ordered layout to drag from.

## Live verification evidence (2026-10-14)

Ran against `spec_ability_arena.mod` (14 level-12 casters, one per class, see
"Spec Ability Arena module" below) via `run_live_verification`, with a temporary
diagnostic wrapper logging `GetSpellAbilityCount`/`GetSpellAbilityReady` 1 second after
spawn:

```
[ARENA_SA] tag=hos_cler total=96  ready=36
[ARENA_SA] tag=hos_rng  total=22  ready=6
[ARENA_SA] tag=hos_pal  total=22  ready=6
[ARENA_SA] tag=hos_drd  total=68  ready=30
[ARENA_SA] tag=hos_wiz  total=139 ready=28
[ARENA_SA] tag=hos_sorc total=139 ready=42
[ARENA_SA] tag=def_bard total=67  ready=18
```

(Defender-side creatures matched their Hostile-side counterparts exactly, as expected —
same class/level/ability scores.) This confirms, for real, in a real headless engine,
not just read from source: the pool bakes correctly, `SA_OnSpawn` runs, and a real
non-empty, correctly-scaled subset is marked ready every time. The diagnostic wrapper
was reverted after this run — it was never meant to ship.

## Pipeline wiring — this is the default, project-wide

- **`/create-adventure`'s pre-flight** now warns and asks (2-option): Special Abilities
  (default) or Random Abilities (the previous system), recording the answer in
  `adventure.md`'s `## Module` section as `Caster System: ...`.
- **`/adventure-actors`** reads that field. Its companion recipe's default path is the
  Special Abilities recipe (simpler than Random Abilities' — no leveling-timing
  dependency, since the pool only needs the blueprint's final `ClassList`/`HENCH_LEVEL`,
  not a live `LevelUpHenchman()` pass). The full original Random Abilities recipe is kept,
  unmodified, as the explicit fallback when `adventure.md` says so.
- **`compose_encounter`** (bosses) takes a `casterSystem` param, default
  `"special_abilities"`. This is a strict improvement over the old default for a boss
  specifically: a boss's `ClassList` is set directly (no recruit event to level through),
  which is exactly the shape that caps Random Abilities' Tier 1 path at cantrips — Special
  Abilities has no such ceiling, so a directly-leveled boss now gets a real multi-level
  spell/ability pool out of the box.

## TODO — handle a live level-up after the pool was already baked

`bake_spec_ability_pool` fixes the candidate pool's *membership* at whatever class
level the blueprint had when it ran. A henchman/NPC that is later leveled up for real
(a live `LevelUpHenchman()` pass — independent of this system, since that call never
touches `SpecAbilityList` either way) can end up with a higher `ClassList` level than
the baked pool accounts for. `SA_OnSpawn` then has no higher-level spells to pick from,
so the creature's slot allotment at the new level is never actually filled — new spell
slots exist (the engine/2DA say so) but nothing is available to fill them.

Not designed or implemented yet. Two real directions, neither started:

- **(a) A live re-bake.** Would need an NWScript-side equivalent of
  `computeSpecAbilityPool` that can *extend* `SpecAbilityList` at the moment of
  level-up — blocked by the same "nothing can add a new ability to `SpecAbilityList`
  at runtime" limitation this whole system exists to work around (`SetSpellAbilityReady`
  only toggles an existing entry). May need a GFF-level append from outside the running
  engine instead of a pure-NWScript fix, which doesn't fit this system's "everything
  happens at `OnSpawn`" model at all.
- **(b) A documented rule + a real check.** Require `bake_spec_ability_pool` to be
  re-run after any live leveling event, and add a `verify_creature` comparison of the
  baked pool's maximum represented class level against the creature's actual current
  `ClassList` level, flagging a mismatch instead of trusting the skill doc alone to
  remember the rule (the same "corrections become rules validated by script" discipline
  this project applies everywhere else).

## TODO — auto-fill the DM quickbar at bake time, not just the Spellbook panel

Right now every ready ability still needs a human to manually drag it from the
Spellbook/Powers radial onto a hotbar slot each session (see "How a DM actually sees
and uses these abilities in-game" above). Real investigation started on whether this
can be automated — confirmed facts below, not guesses:

- **A real PC `.bic` save file DOES carry a `QBList` field** — checked directly via
  `nwn_gff` against a real, actually-played character. 36 structs, each
  `{QBObjectType (byte), QBINTParam1 (int), QBMultiClass (byte), QBDomainLevel (byte),
  QBMetaType (byte)}`. Sampling that character's real quickbar: `QBObjectType=2`
  entries carry `QBINTParam1` values matching that character's own memorized
  `spells.2da` row ids — strongly suggesting `2` means "cast this spell by id."
  `QBObjectType=4` appeared on what looks like a feat-use slot.
- **A `.utc` creature blueprint has NO `QBList` field at all** — confirmed empty on a
  real sample creature. This is currently a PC-`.bic`-only concept in the schema.

Three real unknowns block building this — none safe to guess past, per this project's
own "encode unverified data as a skip, never a guess" rule:

1. Whether writing a `QBList` onto a creature's `.utc`/placed-instance GFF has ANY
   effect on what a DM sees when possessing it, or whether DM possession's quickbar is
   sourced from the DM's own persistent client/account state instead, independent of
   the possessed object's own data. Unconfirmed — would need a real possession session
   to observe; this project's headless verify-server can't do that (no graphical
   client, a documented existing limitation).
2. The full `QBObjectType` encoding table — only values 0/1/2/4 were seen in one
   sample, not a verified complete mapping, and specifically whether a
   `SpecAbilityList` entry needs the same type code as a known/memorized spell or a
   distinct one. The client treats "Special Abilities" as a separate radial category
   from memorized spells even though both key off the same `spells.2da` row id —
   writing the wrong code risks corrupting whatever quickbar state does get read, not
   just failing silently.
3. If (1) and (2) resolve favorably: `bake_spec_ability_pool`/`create_creature_blueprint`
   would need a new write path appending `QBList` structs for each ready-marked
   ability, bounded to the real 36-slot limit (shared with any feats/other actions also
   being auto-filled), plus a decision on ordering/overflow when a creature has more
   ready abilities than slots.

Not designed or implemented yet.

## Spec Ability Arena module

A disposable diagnostic module (`spec_ability_arena.mod`, not committed to this repo,
rebuildable from scratch if needed) — a single flat 2x2 area, 14 level-12 NPCs (one of
each casting class: Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Wizard), in two
mirrored 7-wide lines 8 tiles apart (Hostile faction at y=14, Defender faction at y=6,
facing each other), module entry point behind the Defender line. Built specifically to
observe this system's spell allotment and in-combat usage across every casting class at
once. Every creature shares the `a_sa_spawn` wrapper script.
