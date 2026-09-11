# Random caster abilities — real headless server findings (2026-09-10)

## Context

`create_random_abilities_system` (`src/util/random-abilities-script.ts` +
`src/tools/random-abilities-tools.ts`) generates `inc_random_abil.nss`, a portable
NWScript include that rolls a caster NPC's spells fresh, entirely in NWScript, every
time a module loads — no MCP/build-time baking. Design and rationale are documented in
full in the file's own header comment and in `CLAUDE.md`'s Henchmen/Companions section
("BUILT (2026-09-10) — real per-playthrough random caster spellbooks"). This document
is the detailed record of the real-headless-server verification pass that followed —
what was tested, what broke, what got fixed, and what is still genuinely open.

Test rig: `~/nwn-mcp-verify-server` (a `nwnxee/unified` docker-compose template,
`NWNX_CORE_SKIP_ALL=yes`), repointed to host port **16666** (was 6199) at the user's
request, for reuse in future verification passes. Test module:
`henchman-gear-showcase.mod`, with disposable throwaway test creatures added (tags
`ra_test_wiz`, `ra_test_sorc`, `ra_test_wiz2`) purely for this pass — not part of the
module's real content.

## Timeline of what was tested and found

1. **Structural test first** (no docker): `create_random_abilities_system`'s real
   compile-probe against the module's actual resman stack succeeded; wrapper scripts
   (`a_ra_spawn`/`a_ra_endround`, chaining `nw_c2_default9`/`nw_c2_default3`) compiled
   cleanly; `create_creature_blueprint`'s `scripts` override applied correctly;
   `verify_creature` produced the expected (documented) `caster_no_spells` false
   positive. This proved the generated NWScript is syntactically and semantically
   valid against real 2DA data — it did not prove runtime behavior.

2. **First real runtime test** (level 5 Wizard + level 5 Sorcerer, both from-scratch
   blueprints, `ScriptSpawn` wired to the wrapper): Sorcerer (Tier 2) came back
   correct immediately — real randomized virtual-ability pools at every populated
   spell level (`abilL0=[37,144,151,416,424,439] abilL1=[...] abilL2=[...]`). Wizard
   (Tier 1) only got 4 orisons (level 0); levels 1-3 got nothing, despite
   `cls_spgn_wiz.2da` giving a level 5 Wizard slots at all four levels (4/3/2/1).

3. **Root-caused bug #1**: the original design rescanned the full ~840-row
   `spells.2da` once per populated spell level. For a class with several populated
   levels (a level 5 Wizard has four), the script's instruction budget ran out
   partway through a later rescan — silently, since `NWNX_Diagnostics` is disabled by
   default and no error surfaces. Fixed by restructuring to bucket every spell into
   its class-specific level pool in a single pass.

4. **First "single pass" fix was itself broken, worse than the bug it replaced.**
   Used one nested `json` array-of-10-arrays (`jPools[nLvl]`), updated via
   `JsonArraySet(jPools, nLvl, jBucket)`. Retested — identical symptom (orisons only).
   Root cause: NWScript's `json` type has copy semantics. Writing one bucket back
   into a shared outer array copies *all ten buckets' accumulated contents* on every
   single match, making the "single pass" O(n²) in the number of matched spells
   rather than O(n) — actually more expensive than the per-level rescan it replaced.

5. **Second fix: ten independent flat JSON array variables**, routed by a `switch`
   statement (avoids the nested-array copy cost — each insert only copies its own
   pool). Retested via a fresh diagnostic script reading back
   `GetMemorizedSpellCountByLevel`/`GetMemorizedSpellId` directly — **still only
   orisons**. Added a `WriteTimestampedLogEntry` right after the per-level pool
   lookup, unconditionally (should fire once per populated spell level, so at least
   4 times for a level 5 Wizard) — **it never fired at all, not even for level 0**,
   despite level 0 demonstrably still writing real spells in the same run.

6. **This was a process mistake, not a new bug**: NWScript's `#include` resolves at
   *compile time*, baked into the including script's `.ncs` bytecode — exactly like a
   C header. `create_random_abilities_system` regenerates only `inc_random_abil.nss`'s
   *source* (deliberately never compiles it, since an include has no `main()`). The
   wrapper script (`a_ra_spawn.nss`, which `#include`s it) had only been recompiled
   once, several fixes earlier. Every test after that point — the switch-based fix,
   the debug logging, an if/else-if rewrite tried as an alternative hypothesis — was
   silently re-running the *same stale bytecode* from that one earlier compile.
   **None of those fixes were ever actually tested until this was caught.**
   Recompiling the wrapper (`write_script` with `compile: true`, same source) after
   every `inc_random_abil.nss` regeneration resolved the confusion immediately —
   the very next test showed the debug line firing correctly for all three
   `GetClassByPosition` loop iterations.

7. **With genuinely fresh bytecode, the real per-level debug trace showed the pool
   logic and slot lookup are both completely correct**: for the Wizard, `lvl=1
   slotStr=3 slots=3 poolLen=35`, `lvl=2 slotStr=2 slots=2 poolLen=33`, `lvl=3
   slotStr=1 slots=1 poolLen=32` — real, valid 2DA-sourced slot counts and real,
   correctly-filtered eligible pools (35/33/32 candidate spells respectively).
   Yet the actual memorized-spellbook readback still showed nothing past level 0.

8. **Isolated to `SetMemorizedSpell` itself, not the pool-building code**: a direct
   diagnostic (`GetMemorizedSpellCountByLevel(oCreature, CLASS_TYPE_WIZARD, 1)`)
   returned **0** — the engine's own bound, independent of anything this include
   computes. A manual `SetMemorizedSpell(oCreature, CLASS_TYPE_WIZARD, 1, 0, 50,
   TRUE)` (spell id 50, independently confirmed to be a real level-1 Wizard spell)
   silently no-opped: `GetMemorizedSpellId` read back `-1`, and
   `GetMemorizedSpellCountByLevel` still reported 0 afterward. `SetMemorizedSpell`'s
   own doc bounds writes to `0 <= nIndex < GetMemorizedSpellCountByLevel()` — since
   that count was 0, the write was rejected/ignored exactly as documented.
   `GetKnownSpellCount` also returned 0 at every level including 0, ruling out "must
   have a known spell first" as the gate (orisons wrote fine despite 0 known).

9. **Tested whether a real leveling pass fixes it.** Built a second test creature at
   level 1, with an `OnSpawn` wrapper that loops `LevelUpHenchman(oSelf,
   CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID)` up to level 5 — the exact pattern
   `SPEC_SelfTestOnSpawn` (`inc_spec_check.nss`) already uses — *before* calling
   `RA_OnSpawn`. Result: **level 0 and level 1 now both correctly show real,
   engine-recognized slots** (`L0:slots=4 L1:slots=3`, with 3 real spells memorized
   and read back: `174,714,522`). **Level 2 and level 3 still show `slots=0`** from
   the engine, despite `cls_spgn_wiz.2da` stating 2 and 1 slots respectively at
   character level 5.

## What's confirmed, precisely

| | From-scratch (never leveled) | Leveled live via `LevelUpHenchman()` |
|---|---|---|
| **Tier 1 level 0 (cantrips), any class** | ✅ works | ✅ works |
| **Tier 1 level 1, Wizard** | ❌ engine reports 0 slots | ✅ works |
| **Tier 1 level 2+, Wizard** | ❌ engine reports 0 slots | ❌ **still** reports 0 slots — confirmed Wizard-specific, see "Round 2" below |
| **Tier 1 level 0-3, Cleric** | not tested | ✅ **works at every level** (Round 2, 2026-09-11) — WIS-based, no `SpellbookRestricted` |
| **Tier 2 (Bard/Sorcerer), any populated level** | ✅ works | (not retested leveled; no reason to expect a difference — Tier 2 never touches `SetMemorizedSpell`) |

The pool-selection, slot-count-lookup, and shuffle logic are proven correct at every
level tested (the debug trace showed correct data flowing in for levels 1-3 even when
the write silently failed). **The remaining gap is Wizard-specific**, not a general
Tier 1 or engine-wide `SetMemorizedSpell` limitation — see "Round 2" below, where an
identically-leveled Cleric got real, populated slots at every level 0-3.

## Fixes already shipped from this pass

- Single-pass bucketing (ten flat arrays, `switch`-routed) instead of per-level
  rescanning — fixes the real instruction-budget bug, confirmed via the debug trace
  now correctly reaching every populated spell level.
- `RA_RollClass` caps every write to `min(cls_spgn slot count,
  GetMemorizedSpellCountByLevel())` rather than trusting the 2DA blindly, so it
  degrades gracefully — writes only what the engine will actually accept — instead of
  wastefully attempting writes that silently do nothing. This does not fix the root
  cause; it makes the symptom harmless instead of wasteful.
- All temporary `WriteTimestampedLogEntry` debug instrumentation removed from the
  shipped file before this was committed.

## Round 2 — Cleric test confirms the ceiling is Wizard-specific (2026-09-11)

Triggered by a real user combat report: a randomly-generated Cleric NPC in a
**`~/tfndev`** live game (a different project, using its own NWNX-based system — see
`docs/tfndev-random-npc-system-findings.md`) successfully cast Hold Person, a level-2
Cleric spell, in actual combat. tfndev's own write path for Cleric goes through the
same vanilla `SetMemorizedSpell()` this project uses (only Sorcerer/Bard route through
NWNX there), so a live level-2 Cleric cast was real evidence against "every Tier 1
class hits a level-2+ ceiling" and for "it's specific to Wizard."

Ran the exact experiment the "Concrete next experiments" list below already
prioritized as highest-value, on this project's own **vanilla-only** system (no
NWNX involved) against `~/nwn-mcp-verify-server`: a from-scratch level-1 Cleric
(`ra_test_cler`, WIS 16, `startingPackage=2`), `ScriptSpawn` wired to loop
`LevelUpHenchman(oSelf, CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID)` up to level 5 —
identical methodology to the Wizard test (`a_ra_spawn2`/`ra_test_wiz2`) — then
`RA_OnSpawn` and a diagnostic read of `GetMemorizedSpellCountByLevel`/
`GetMemorizedSpellId` for levels 0-3.

Result — clean, unambiguous, every level populated:

```
RA_CLER_CHECK guard=4 actualLevel=5 L0:slots=5 L1:slots=5 L2:slots=4 L3:slots=3
RA_CLER_CHECK_SPELLS L0=431,33,151,189,100,
RA_CLER_CHECK_SPELLS L1=155,139,148,32,32,
RA_CLER_CHECK_SPELLS L2=175,49,83,34,
RA_CLER_CHECK_SPELLS L3=145,106,434,
```

Compare to the Wizard's `RA_CHECK7 guard=4 actualLevel=5 L0:slots=4 L1:slots=3
L2:slots=0 L3:slots=0` from the same rig, same methodology, same `LevelUpHenchman()`
loop. **The level-2+ ceiling is confirmed Wizard-specific, not a general Tier-1 or
engine-wide limitation.** This resolves research item 1's leading hypothesis without
even needing the `GetKnownSpellCount` sub-experiment — a real, live, fully-leveled
Cleric got real, populated, engine-recognized slots at every level cls_spgn_cler.2da
says it should have, with no NWNX and no special handling beyond the leveling loop
every Tier 1 class already gets.

**Practical consequence**: once the companion wiring-timing fix in item 2 below
lands (`RA_OnSpawn` called after `LevelUpHenchman()`, not before), Cleric/Druid/
Paladin/Ranger companions get a REAL, complete, multi-level, freshly-randomized
spellbook — no known limitation left for those four classes. Wizard remains the one
confirmed exception, and per the closed NWNX investigation
(`docs/tfndev-random-npc-system-findings.md`) there is currently no known fix for it
in this engine build, vanilla or NWNX. Druid/Paladin/Ranger were not individually
retested — they share Cleric's "no `SpellbookRestricted`" trait, so the same result
is expected, but only Cleric has been directly confirmed.

Verify server was reverted to its clean baseline afterward (`docker-compose down`,
no config changes retained; the throwaway `ra_test_cler` creature was left in
`henchman-gear-showcase.mod` alongside the pre-existing `ra_test_wiz`/`ra_test_sorc`/
`ra_test_wiz2`/`ra_test_wiz` fixtures, matching this project's existing precedent of
leaving prior test creatures in place rather than cleaning them out of this
scratch/test module).

## Plan for further research

1. **Isolate the level-2+ root cause — RESOLVED for the Tier-1-vs-Wizard-specific
   question (2026-09-11, see "Round 2" above).** Confirmed: Cleric does not hit the
   ceiling at all through level 3 when leveled the same way. What remains genuinely
   open is *why* Wizard specifically hits it — the `SpellbookRestricted`/known-spell
   theory is still unconfirmed (the `GetKnownSpellCount` check below was never run),
   and the NWNX investigation closed off the leading fix candidates without finding
   the actual mechanism. Not worth further investment without a new concrete lead —
   see `docs/tfndev-random-npc-system-findings.md`'s recommendation.
   - Directly check `GetKnownSpellCount(oCreature, CLASS_TYPE_WIZARD, 2)` and
     `GetKnownSpellCount(oCreature, CLASS_TYPE_WIZARD, 3)` on the leveled test
     creature — if these are 0 while level 0/1 are nonzero, that's a strong
     confirmation of the "known spells gate the slot count" theory, and the next
     step is finding a way to add known spells (there is no `SetKnownSpell`/
     `AddKnownSpell` in vanilla EE nwscript — this may mean Wizard-specific handling
     needs its own separate mechanism, or NWNX, to ever reach level 2+).
2. **Fix the wiring timing for companions regardless of the level-2+ outcome.**
   `RA_OnSpawn` is currently chained into `a_hen_spawn` (raw `ScriptSpawn`, before
   recruit) — confirmed via this pass's own from-scratch tests that this can only
   ever roll cantrips for Tier 1, since real slots don't exist until after a real
   `LevelUpHenchman()` pass. `adventure-actors/SKILL.md`'s `a_hen_join` (recruit
   script) already calls `LevelUpHenchman()` in a loop — `RA_OnSpawn` should be
   called immediately after that loop completes, not from `a_hen_spawn`. This is a
   real, scoped SKILL.md fix independent of resolving the level-2+ mystery, and gets
   every Tier 1 companion at least cantrips + 1st-level spells for free once done.
3. **Non-companion Key NPCs have no leveling event at all**, ever — they're stuck at
   cantrips-only for Tier 1 classes regardless of the level-2+ investigation's
   outcome, unless a Key NPC recipe is given its own one-time `LevelUpHenchman()`
   loop purely to initialize slot state (discarding the resulting stat changes it
   doesn't want, which is awkward) or unless the level-2+ root cause turns out to
   have a workaround that doesn't need real leveling at all. Until one of those
   lands, a Key NPC caster above cantrip level should keep using the static `spells`
   param instead of this system.
4. **Consider whether the tfndev random-henchman system offers a shortcut** (see the
   user's separate question this session about `~/tfndev`'s `inc_rand_spell.nss` and
   whether its already-solved approach — which does use NWNX and a persistent
   campaign database — could either inform a fix here or be used directly, with its
   output creatures exported into this project's modules). That investigation is
   separate from this document; see the session notes / commit history for its
   findings once complete.

## Process lessons worth keeping

- **Always recompile every script that `#include`s a changed include.** Regenerating
  an include's source alone has zero runtime effect — NWScript resolves `#include` at
  compile time. This cost several confusing debugging rounds in this pass alone.
- **`docker logs` shows the full accumulated buffer across restarts, not just since
  the last restart** — use `--since <timestamp>` (captured right before the restart)
  or diff against a known line count, not a bare tail, when checking output after an
  iterative fix-and-restart cycle.
- **A `switch` statement assigning a `json`/complex-typed local per case was suspect**
  in this NWScript VM during this investigation, though never conclusively isolated
  as the actual defect (the stale-compile process mistake above muddied that specific
  round of testing). The shipped code uses if/else-if instead, which is confirmed
  working. Worth re-isolating with a clean, minimal repro if this class of construct
  is needed again.
- **Don't trust a 2DA's stated value as the engine's real bound for anything the
  engine also computes/caches itself** (spell slots here; this project has already
  separately learned the same lesson for feats — `LevelUpHenchman()` grants zero
  automatic feats despite `cls_feat_<class>.2da`/`race_feat_<race>.2da` describing
  what "should" be granted). When a query function exists for the real value
  (`GetMemorizedSpellCountByLevel` here), use it to cap/validate rather than
  computing independently from the 2DA and hoping they agree.
