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
2. **Test the NWNX_Creature leveling hypothesis on the existing verify server** —
   cheap, uses infrastructure already in place, and would definitively confirm or
   rule out the leading theory for this project's own level-2+ gap, purely as
   research (doesn't obligate adopting NWNX for anything shipped).
3. **If confirmed, evaluate option 2 above** (use tfndev's system offline as an
   authoring tool, ship only the resulting static, NWNX-free `.utc` data) as a
   real path to give this project's own Tier 1 casters full multi-level spellbooks
   without changing this project's hosting requirements at all. `StoreCampaignObject`
   (also above) may be a cleaner mechanism for the "export" step than manual GFF
   struct extraction — worth a small experiment to confirm its encoding before
   committing to either approach.

Both are scoped as follow-up research/decisions, not started here.
