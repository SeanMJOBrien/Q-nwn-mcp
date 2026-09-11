# The tfndev/TFN random-NPC system — can we use it, and can we export creatures?

## The question

The user asked whether the random NPC/henchman system previously examined at
`~/tfndev` (The Frozen North, a live PW) could be used for this project — even with
NWNX — and whether creatures built by it could be exported into a `.utc` file or a
module here. This is a research writeup, not an implementation — nothing here has
been built or wired into nwn-mcp.

**There's already a prior writeup of exactly this**, which the user recalled
requesting before: `~/git/tfn-adventurers/SETUP.md` — "TFN Random Adventurer &
Henchman System — Setup Guide," a 425-line document describing a 61-file extraction
of TFN's random-adventurer and henchman-hiring systems, already confirmed to compile
standalone against base NWN scripts + NWNX.

**There's also a second, independent writeup the user pointed to directly**:
`~/.claude/projects/-home-qlippoth-git-UniverseOfArlandia/memory/
random-adventurer-henchman-feature.md` — the record of a *real, completed, deployed*
integration of this exact extracted system into a different live project
(UniverseOfArlandia), committed at `ce82010` and confirmed still live and correct as
of a later verification pass. This isn't theoretical: someone already built this,
shipped it, and found (and fixed) 8 real bugs doing so. Its findings are folded in
below, and it settles several open questions this document would otherwise only be
able to guess at.

This document summarizes both, plus additional tracing this session did into the
actual spell-writing code, and answers the user's two questions directly.

## What the system actually is

Not one thing — three related but separable pieces, all originating in TFN
(`~/tfndev`, aka `~/git/the-frozen-north`) and already extracted once into a portable
form (`~/git/tfn-adventurers`):

1. **Random Adventurer NPC system** (`inc_adventurer.nss` + `inc_rand_spell.nss` +
   `inc_rand_feat.nss` + event scripts) — procedurally builds a fully-statted NPC
   (race, class levels, feats, skills, spells, equipment, alignment, gender,
   appearance, soundset) from one blank `.utc`, entirely at spawn time.
2. **Random spellbook cache** (`inc_rand_spell.nss`'s `RandomSpellbookPopulate`/
   `LoadSpellbook`, `seed_rand_spells.nss`) — a large (4240-line), mature system that
   pre-generates and caches spellbooks so a live spawn doesn't pay the generation
   cost every time.
3. **Henchman hiring system** (`inc_henchman.nss`, 12 named BioWare henchmen,
   level-scaled to the hiring PC).

## Prerequisites — precisely, not "NWNX in general"

`SETUP.md` lists these NWNX plugins as required for the *full* system:
`NWNX_Creature`, `NWNX_Player`, `NWNX_Visibility`, `NWNX_Item`, `NWNX_Util`,
`NWNX_Object`, `NWNX_Area`. That's real and unavoidable for the stat/feat/skill
assignment and henchman-visibility pieces.

**But the spellbook cache specifically does not need NWNX at all** — `SETUP.md`
states this explicitly: it "caches generated spellbooks in a native NWN:EE campaign
database... `GetCampaignInt`/`SetCampaignJson`/etc. — no NWNX plugin required for
this part." This directly narrows (and partially corrects) this project's own earlier
assumption in `CLAUDE.md` ("`randspellbooks`... still depends on NWNX and a
persistent campaign database") — the *campaign database* dependency is real and is a
native EE feature this project already knows how to read (see `CLAUDE.md`'s own
"CPDB blob format" pitfall entry, confirmed against the exact same schema — a `db`
table with `varname`/`playerid`/`vartype`/`payload blob`/`compressed` columns).
**Only the actual spell-writing step needs NWNX**, and only for two of the seven
caster classes.

## Confirmed by a real, shipped integration (UniverseOfArlandia)

The UOA memory file confirms the extraction genuinely works end to end in a real,
different, live project — not just a standalone-compiles claim. A few of its findings
are directly relevant here, beyond just "it's real":

- **The generation entry point is `AdvanceCreatureAlongAdventurerPath`**
  (`inc_adventurer.nss`) — confirmed as "NWNX_Creature-heavy," matching this
  document's own tracing above.
- **A real, independent instruction-budget lesson, directly useful to this project's
  own vanilla-only system regardless of the NWNX question**: UOA's integration moved
  the heavy generation call out of the area's own `OnEnter`-adjacent script and into
  a separately `DelayCommand`-invoked script specifically because *"`ExecuteScript`
  runs in the caller's own instruction budget (no reset), while `DelayCommand`
  genuinely hands it a fresh one. Inline, the heavy generation risked cutting
  [the caller] off before it reached [the caller's] own later setup."* This is a
  real, general NWScript fact this project did not previously have documented
  anywhere, and it's a candidate fix (or at least a mitigation) for this project's
  own confirmed instruction-budget bug in `RA_OnSpawn` — chaining via `DelayCommand`
  rather than a direct in-line/`ExecuteScript` call would give the random-abilities
  roll its own fresh budget rather than sharing whatever the original `ScriptSpawn`
  (`nw_c2_default9`/`x0_ch_hen_spawn`) already spent. **Not yet tried in this
  project** — worth testing before or alongside further algorithmic optimization,
  since it may make the single-pass restructuring less critical (or fix a case the
  restructuring alone doesn't, at higher character levels with even more populated
  spell levels than a level-5 Wizard).
- **A native, non-NWNX mechanism for "exporting"/freezing a randomly-generated
  creature's identity already exists and was used in production**:
  `StoreCampaignObject`/`RetrieveCampaignObject` (real vanilla EE nwscript functions,
  not NWNX) can snapshot and restore a *complete* object — not just its spells, its
  entire runtime state — to/from the campaign database. UOA uses this specifically
  to stop a hired random adventurer from re-rolling a new identity every login. This
  directly answers the "export those creatures" question with a cleaner mechanism
  than manually reading `ClassList`/`MemorizedList` GFF structs by hand: **generate
  a creature once (on an NWNX-enabled server, since generation itself needs
  `NWNX_Creature`), `StoreCampaignObject` it, and the resulting campaign database
  entry is a complete, native, replayable snapshot** — no NWNX needed to *read* or
  *replay* it, only to originally *create* it. Two things not yet verified: (a)
  whether a stored campaign object's internal encoding is the same GFF struct shape
  this project already knows how to parse/write (`Creature List` / `MemorizedList<N>`
  etc.) or some other internal serialization specific to `StoreCampaignObject`, and
  (b) whether `RetrieveCampaignObject` can target a specific area/position
  programmatically in a way this project's tooling could drive (vs. only a live
  script call at runtime). Worth a direct, small experiment before relying on it.

## The NWNX_Creature leveling hypothesis — tested to completion, hypothesis refuted

Ran the "Recommendation" item 2 experiment against `~/nwn-mcp-verify-server`, in two
rounds. Round 1 (steps 1-7 below) got blocked entirely by infrastructure. Round 2
(step 8) got a real, clean, conclusive result by testing against a copy of a
different, already-working module instead of this project's own — **and it refutes
the leading hypothesis.** Full record kept below so a future session doesn't repeat
either the debugging or the experiment.

1. Enabling `NWNX_Creature` needs `NWNX_CREATURE_SKIP=n` in `config/nwserver.env`
   (the per-plugin override pattern — confirmed by reading `~/tfndev/config/
   common.env`, which does the same thing for its own real deployment; `NWNX_CORE_SKIP_ALL`
   only sets the *default*).
2. **Hand-copying tfndev's `nwnx.nss`/`nwnx_creature.nss` (the old `PlaySound(
   "NWNXEE!ABIv2!...")`-based ABI) compiles fine but is rejected at runtime** —
   `NWNXCoreVM.cpp` logs "Bad NWNX ABI call detected" for every call. This image's
   `NWNX_Core` plugin no longer accepts the old ABI.
3. **The current, correct mechanism is different and much simpler**: modern EE
   `nwscript.nss` has *native* engine functions for this — `NWNXCall`, `NWNXPushInt`/
   `NWNXPushObject`/etc., `NWNXPopInt`/etc. (confirmed present in `~/git/nwscript.nss`,
   and matches the current `nwnx_creature.nss` in the real `nwnxee/unified` GitHub repo,
   fetched directly via `gh api repos/nwnxee/unified/contents/...` rather than assumed).
   No shim/include file is needed at all for the ABI layer itself.
4. **This project's own `nwnsc` compiler doesn't know these functions by default** —
   compiling against them fails with `UNDEFINED IDENTIFIER (NWNXPushInt)` unless
   `compile_script`'s `includePaths` param is pointed at a directory containing a
   current EE `nwscript.nss` (`~/git/nwscript.nss` worked). This is a real, useful,
   general finding for any future NWNX work from this project, independent of the
   spell-slot question.
5. **Even after fixing the ABI and the compile, every NWNX call was still rejected**,
   including the engine's own automatic `NWNX_Core_PluginExists` handshake (which
   fires once per session before any of this project's own code runs, confirmed by
   it appearing even on a script that never calls it). This points to a genuine
   internal mismatch between the engine binary and the bundled NWNX plugin build in
   this specific pulled image (`docker exec` into the container found the NWNX
   plugin build dated `20260705_205353Z`/commit `3d4c4e1`, a separate version marker
   from the engine's own `8193.37-17 [26c6e573]` build shown in the boot log) — not
   a NWScript-level bug, and not something fixable by changing the test script
   further.

6. **Tried pinning to a known-good tag instead of `:latest`**: `~/tfndev`'s own
   `docker-compose-dev.yml`/`docker-compose-dev-seed.yml` pin `nwnxee/unified:2f732e7`
   — confirmed not a guess, it's the exact tag the real, currently-running `tfn-server`
   production container on this machine uses too. Pinning our verify server to it and
   reverting to the old-ABI `nwnx.nss`/`nwnx_creature.nss` (the ABI `2f732e7` was
   actually built against) got past the "Bad NWNX ABI call" problem — but hit a
   **different** wall: `2f732e7` (April 2024) is too old to load a module saved by
   this project's current tooling at all — `"This module was created with a updated
   version of Neverwinter Nights."` / `"Unable to load module"`. Tried the next-newest
   locally-cached tag, `09544eb` (December 2024), same result.
7. **Every locally-cached tag was checked** (`docker images nwnxee/unified`):
   `:latest` (2026-07-05) is the *only* one new enough to load the module — every
   older tag (`09544eb`, `695efc6`, `2f732e7`, `de24514`, `78bd6a4`, `b419e42`,
   `build8193.34`, `6687fe1`, `ba4646c`) is too old. So the two failure modes bracket
   every tag actually available here: too new → internal ABI mismatch; old enough to
   have a consistent ABI → too old to load the module. No currently-cached tag
   satisfies both.

8. **Round 2 — tested against a copy of `~/uoa`'s own real module instead.**
   Confirmed via `~/uoa`'s own `docker-compose.yml`/`config/nwserver.env`
   (a genuinely live production deployment) that it pins `nwnxee/unified:09544eb`
   with `NWNX_CREATURE_SKIP=no` — meaning `09544eb` is not "too old" in general, it
   was specifically too old for a module built by *this project's own* `nwn_gff`/
   `nwn_erf` tooling. Copied `~/uoa/server/modules/UOA.mod` (never touching the
   original), loaded it via this project's own `load_module`, added one throwaway
   test creature (tag `zzra_test_nwnx`, a from-scratch level-1 Wizard) with an
   `OnSpawn` wrapper using the module's own already-present, real, working
   `nwnx.nss`/`nwnx_creature.nss` (no need to guess an ABI this time — it's the same
   `NWNX_PushArgumentInt(plugin, function, value)`-per-call style, a third distinct
   variant from both the old tfndev/`2f732e7` ABI and the modern native one).
   Repacked, deployed to the verify server pinned to `09544eb` with UOA's real
   `hak`/`tlk` directories mounted read-only (avoiding a 19GB local copy), and
   `NWNX_Creature`/`NWNX_Object` enabled. **This finally worked structurally** — the
   module loaded, the plugin call succeeded, no ABI errors. Result:
   ```
   ZZRA_NWNX_A actualLevel=5 L0:engineSlots=4,nwnxMax=4,nwnxRemain=0
                              L1:engineSlots=3,nwnxMax=3,nwnxRemain=0
                              L2:engineSlots=0,nwnxMax=0,nwnxRemain=0
                              L3:engineSlots=0,nwnxMax=0,nwnxRemain=0
   ```
   `NWNX_Creature_LevelUp` (called 4 times, bringing the creature from level 1 to a
   confirmed real level 5) produces **the exact same level-2+ ceiling** vanilla
   `LevelUpHenchman()` does in this project's own testing
   (`docs/random-abilities-runtime-findings.md`) — including `nwnxMax` (NWNX's own
   query for the *theoretical maximum* slots, not just remaining) reporting 0, not
   just the vanilla `GetMemorizedSpellCountByLevel()`. This rules out "vanilla
   leveling doesn't initialize slot state correctly, but NWNX's leveling does" as
   the explanation — **both leveling mechanisms produce an identical ceiling**, so
   the real cause is something else neither this project's system nor this
   experiment has isolated yet (candidates: something about how this specific
   engine build computes/caches per-level Wizard slots regardless of how the level
   was granted; the Wizard-specific `SpellbookRestricted`/known-spell mechanic
   after all, just not fixable by `NWNX_Creature_LevelUp` alone; or a `NWNX_Creature`
   function this experiment didn't try, such as directly forcing known spells via
   `NWNX_Creature_AddKnownSpell` *before* leveling rather than after).

**Status: the specific hypothesis tested (NWNX-native leveling instead of vanilla
`LevelUpHenchman()`) is refuted — it does not fix the level-2+ ceiling.** This is a
real, clean, conclusive negative result, not a blocked experiment. It does *not*
close off NWNX entirely — `NWNX_Creature_AddKnownSpell` (confirmed to exist and to
be what tfndev's own code calls for Bard/Sorcerer) was never tried on a Tier 1 class
in this pass and remains a real, untried next candidate. The verify server was fully
reverted: `docker-compose.yml` back to `:latest`, the UOA test module and read-only
hak/tlk mounts removed, `config/nwserver.env`'s `NWNX_CREATURE_SKIP`/
`NWNX_OBJECT_SKIP` overrides removed and `NWN_MODULE` restored to
`henchman-gear-showcase` (back to the original all-skipped, zero-NWNX baseline for
`inc_spec_check.nss`-style testing).

## The actual answer to "how do they get past what we hit"

This session's own runtime testing (`docs/random-abilities-runtime-findings.md`)
found that vanilla `SetMemorizedSpell()` silently respects the engine's own
`GetMemorizedSpellCountByLevel()`, which stayed at 0 for a Wizard's level 2+ slots
even after a real `LevelUpHenchman()` pass. Tracing `inc_rand_spell.nss`'s actual
write code (`:688-705`, and again at `:4160-4193`) found:

```nwscript
if (nClass == CLASS_TYPE_SORCERER || nClass == CLASS_TYPE_BARD)
{
    NWNX_Creature_AddKnownSpell(oCreature, nClass, nThisLevel, nThisSpell);
    ...
}
else
{
    ...
    SetMemorizedSpell(oCreature, nClass, nThisLevel, nIndex, nThisSpell, TRUE, nThisMetamagic, nThisDomain);
}
```

- **For Sorcerer/Bard (this project's Tier 2)**: `NWNX_Creature_AddKnownSpell` is
  exactly the missing primitive this project's own investigation confirmed doesn't
  exist in vanilla EE nwscript (only getters — `GetKnownSpellCount`/`GetKnownSpellId`/
  `GetIsInKnownSpellList` — no setter). This project's Tier 2 sidesteps the whole
  problem differently (a virtual ability list + `ActionCastSpellAtObject`'s `bCheat`
  param) and is confirmed fully working without NWNX — a different, NWNX-free
  solution to the same gap tfndev closes with `NWNX_Creature_AddKnownSpell`.
- **For the memorizing classes (this project's Tier 1, including Wizard)**: tfndev
  calls vanilla `SetMemorizedSpell()` directly, with **no** preceding
  `NWNX_Creature_AddKnownSpell` call — so "must know the spell first" is *not* how
  tfndev gets past the level-2+ wall. The likely real answer is upstream of the spell
  call entirely: `SETUP.md` lists `NWNX_Creature` for "level manipulation" as a hard
  prerequisite for the whole system. **Hypothesis, not yet confirmed**: NWNX_Creature
  likely has its own level-granting function that correctly initializes a creature's
  full internal per-level spell-slot state as a direct object/GFF-level operation,
  in a way vanilla `LevelUpHenchman()`'s AI-driven leveling does not — consistent
  with this project's own already-documented, separate finding that
  `LevelUpHenchman()` grants zero automatic feats either. This would mean the fix for
  this project's own level-2+ Tier 1 gap is available, but only by adopting
  `NWNX_Creature` for the leveling step specifically, not by anything achievable in
  vanilla NWScript. **Not yet verified — the concrete next test is building a
  creature via `NWNX_Creature`'s level-manipulation call (instead of vanilla
  `LevelUpHenchman()`) on the existing verify server and rechecking
  `GetMemorizedSpellCountByLevel` at levels 2+.**
- **Independent confirmation of this project's own instruction-budget finding**:
  `SETUP.md` separately calls out `NWNX_Util` as needed "to raise the VM instruction
  limit during spellbook generation (large JSON-heavy loops)." This project hit and
  fixed the same class of problem (`docs/random-abilities-runtime-findings.md`,
  finding #3) purely by making the algorithm cheaper (single-pass bucketing) rather
  than asking for a bigger budget — vanilla-only means the algorithm has to fit the
  fixed budget; an NWNX-enabled approach can just raise the ceiling instead. Real,
  independent validation that this class of instruction-budget problem is a
  recognized, non-hypothetical constraint in this exact problem space, not something
  specific to this project's own code.

## Can this project's own verify server test the NWNX_Creature hypothesis?

Yes, directly. `~/nwn-mcp-verify-server` already runs `nwnxee/unified` — it *has*
`NWNX_Creature` available, just currently disabled via `NWNX_CORE_SKIP_ALL=yes` in
`config/nwserver.env`. Testing the hypothesis above would mean: flip that off (or
selectively un-skip `NWNX_Creature`), write a throwaway test script calling whichever
`NWNX_Creature` level-manipulation function tfndev's system uses, and recheck
`GetMemorizedSpellCountByLevel` at levels 2+ the same way this session already did
for the vanilla path. This is a bounded, cheap experiment with the infrastructure
already in place — no new environment needed.

## "Export creatures to a creature file or our module" — three real options

1. **Adopt the extracted system wholesale** (`~/git/tfn-adventurers`, already
   confirmed compiling standalone). This is the literal designed use case of that
   repo. Trade-off: the *shipped* module would require players to run it on a
   NWNX-enabled dedicated server — a real regression for this project's stated scope
   (single-player and small co-op, "for yourself and friends," no assumed dedicated
   server). This conflicts with `inc_spec_check.nss`'s own established principle
   ("deliberately uses zero NWNX_* functions") and would need explicit user sign-off
   as a scope change, not something to do silently.
2. **Use it as an offline authoring tool, ship the *output* with zero NWNX
   dependency.** Stand up the extracted system on an NWNX-enabled server (the
   existing verify server would work), spawn N sample creatures per class/level/role
   with it, let it populate real, validated memorized spellbooks, then snapshot each
   resulting *live* creature's `Creature List` struct (its now-real, populated
   `MemorizedList0-9`) into a static `.utc` via this project's existing GFF
   round-trip tooling (`nwn_gff` JSON export → extract the struct → write into a new
   blueprint). The struct format is already fully verified in this project
   (`CLAUDE.md`'s "Static spell-baking IS possible" entry: `MemorizedList<N>` entries
   are `{Spell, SpellFlags, SpellMetaMagic}` structs). The result is a **library of
   real, professionally-generated spellbook variants**, usable in any module with
   zero NWNX and zero runtime dependency on tfndev's code — at the cost of "N fixed
   variants" rather than "infinite reroll every playthrough," which is the same
   trade-off this session's own first (rejected) design proposal made, but now
   backed by mature, validated data instead of freshly synthesized spell picks.
3. **Import the pre-seeded spellbook cache directly**, per `SETUP.md`'s own
   documented procedure: `sqlite3 <module>/database/randspellbooks.sqlite3 <
   seeded_database/randspellbooks.txt`. This is real, already-computed data (840 KB
   dump) — readable with this project's existing campaign-database knowledge without
   running any server at all. Caveat, confirmed via `~/git/the-frozen-north/
   SEED_SYSTEM.md`: **spellbook seeding is currently disabled in TFN's own live
   server** (`SEED_SPELLBOOKS = 0`) — the dump may be stale relative to TFN's current
   content, and cache keys are built from `inc_adventurer.nss`'s own path/class
   constants, so they'd only line up with an unmodified copy of that file's
   definitions, not with this project's own class/role model. Worth reading the dump
   directly (`sqlite3 seeded_database/randspellbooks.txt` reconstitutes a real
   queryable DB) before assuming it's usable as-is.

## Recommendation

Don't adopt the full NWNX system into nwn-mcp's shipped output — it changes this
project's hosting requirements for every module it builds, which is a real scope
decision the user should make deliberately, not something to fold in as a side
effect of chasing one bug. The two next concrete, bounded, low-risk steps that don't
require that decision:

1. **Try the `DelayCommand` instruction-budget fix first — cheapest, purely vanilla,
   no NWNX question involved at all.** UOA's own integration lesson (above) is a
   real, general NWScript fact this project didn't have documented: `ExecuteScript`
   shares the caller's instruction budget, `DelayCommand` gets a fresh one. Wiring
   `RA_OnSpawn`/`RA_OnEndRound` via `DelayCommand(0.0, ...)` instead of a direct
   in-line call after `ExecuteScript`ing the original default script may make the
   single-pass bucketing fix even more headroom-safe, and is worth testing
   regardless of anything else in this document.
2. **The NWNX_Creature leveling hypothesis — tested to completion, refuted.**
   `NWNX_Creature_LevelUp` produces the identical level-2+ spell-slot ceiling
   vanilla `LevelUpHenchman()` does — confirmed against `~/uoa`'s own real, live
   NWNX setup (see "The NWNX_Creature leveling hypothesis" section above for the
   full record). Don't re-run this experiment; the leveling mechanism was never the
   variable that mattered. The one real, untried thread left in the NWNX direction
   is `NWNX_Creature_AddKnownSpell` on a Tier 1 class (tfndev's own code only calls
   it for Bard/Sorcerer) — worth one more small experiment before concluding NWNX
   can't help here at all, using the same `~/uoa`-module-copy technique (the only
   one confirmed to actually work end-to-end) rather than fighting `nwnxee/unified`
   tag/ABI compatibility again.
3. **If that's confirmed too, evaluate option 2 above** (use tfndev's system
   offline as an authoring tool, ship only the resulting static, NWNX-free `.utc`
   data) as a real path to give this project's own Tier 1 casters full multi-level
   spellbooks without changing this project's hosting requirements at all.
   `StoreCampaignObject` (also above) may be a cleaner
   mechanism for the "export" step than manual GFF struct extraction — worth a
   small experiment to confirm its encoding before committing to either approach.

All three are scoped as follow-up research/decisions — #1 untried, #2's leveling
hypothesis tested and refuted (its `AddKnownSpell` follow-up still untried), #3
gated on that follow-up.
