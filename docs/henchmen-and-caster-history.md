# Henchmen and caster systems history

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

- **TODO — randomize head/hair-color/skin-color for standard PC-race NPC appearances
  (user-raised).** `buildMinimalUtc()`'s `Appearance_Head`/`Color_Hair`/`Color_Skin`/
  `Color_Tattoo1`/`Color_Tattoo2` defaults are fixed values matched from two real sample
  henchmen (`hen_dorna.utc`/`hen_linu.utc`, see the "invisible henchmen" pitfall above) —
  every generated NPC on a standard PC-race appearance (rows 0-6, the bullet above)
  currently looks identical unless hand-varied per creature. User wants this randomized,
  following the same approach an existing sibling project, **GvE3** (`~/git/gve3`,
  per this project's shared-tooling convention — see the global CLAUDE.md), already uses
  for its own NPC/PC appearance randomization. **Not yet scoped — GvE3's actual
  implementation (script/table/value ranges) hasn't been read yet, and nothing here
  should be guessed at ahead of that** (matches this project's "never guess, verify
  against real data" discipline — see the 2DA-research-technique memory). Before
  building: find and read GvE3's real randomization script/include, confirm its real
  head-count-per-race/gender source (likely `appearance.2da` or a head-count table) and
  its real `Color_Hair`/`Color_Skin` value ranges (skin-tone ranges plausibly differ by
  race, so don't assume one universal range), then port the verified mechanism rather
  than inventing new ranges. Likely landing spot: a `complexity`-style opt-in on
  `build_npc_stat_block` or a new dedicated appearance-randomization tool, seeded
  deterministically the same way `pickWeaponPreference` is (by the creature's own
  tag/resref) to keep generated content reproducible rather than dice-rolled.
- **An empty `FeatList` on a fresh level-1 blueprint is expected, not a defect** — but
  **verified via a live headless server run: `GetHasFeat()` does NOT reflect any
  engine-computed racial feat set when `FeatList` is empty; it strictly reads the actual
  `FeatList`.** `racialtypes.2da`'s `FeatsTable`/`ExtraFeatsAtFirstLevel`/
  `NormalFeatEveryNthLevel` columns describe what a racial feat progression *should* look
  like, but nothing populates `FeatList` from them automatically — that population is
  meant to happen via the live `LevelUpHenchman()` call below, same as class feats. An
  empty `FeatList` is a legitimate *transient* state on a level-1 blueprint that hasn't
  been leveled yet; it is not a legitimate *permanent* state for any creature a script
  might later `GetHasFeat()`-check. Confirmed in a real end-to-end run: 110/110 companions
  built with `ClassList` set directly to a target level (never run through
  `LevelUpHenchman()`) failed a racial-feat `GetHasFeat()` check, 100% consistently. Don't
  hand-populate `FeatList` to "fix" an apparently-empty one on a level-1, about-to-be-leveled
  blueprint — but don't assume racial feats are "handled automatically" for a creature
  that's meant to stay static at a level above 1 either; it needs a real
  `LevelUpHenchman()` pass.
- **Abilities come from vanilla `LevelUpHenchman(oHench, CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID)`**
  at recruit, looped to the blueprint's `HENCH_LEVEL` local. `bReadyAllSpells = TRUE`
  matters — without it the companion joins with an empty memorized list.
- **CORRECTION, verified via a live headless server run: `LevelUpHenchman()` grants ZERO
  automatic/non-chosen feats — not class proficiencies, not racial feats, at any level,
  for any class.** This directly contradicts the "Class/bonus feats are meant to come
  entirely from the live `LevelUpHenchman()` call" line two bullets above — that line is
  now known wrong and needs fixing, not just this note. Confirmed by direct probe: even
  basic Simple/Martial Weapon Proficiency was absent from a level-5 Fighter after a real,
  successful `LevelUpHenchman()` leveling pass. Automatic feats are apparently a
  character-creation-time concept (package application via the toolset's own character
  creation flow), not something this runtime call ever does for an NPC. **The only proven
  fix**: populate `FeatList` directly at build time — racial feats unconditionally from
  `race_feat_<race>.2da` (every row is automatic, no level gating — the table has no
  `List`/`GrantedOnLevel` columns), class feats from `cls_feat_<class>.2da` filtered to
  `List=3` and `GrantedOnLevel <=` the target level. Full tables for all 7 standard PC
  races and 11 base classes were captured and applied to repair a real module this
  session. **Now applied to `adventure-actors/SKILL.md`'s actual companion-creation
  recipe** — Phase 3b's old "an empty FeatList is expected" claim (and the matching
  claim that feats come from the live `LevelUpHenchman()` call) was corrected in place
  with the four-source static-baking approach (racial/automatic-class/generic-schedule/
  class-bonus-slots), plus new skill-point-baking and equipment-sourcing sections
  covering everything found in the session that finally closed this gap.
  Separately, also confirmed: `LevelUpHenchman()` silently refuses to grant a level in an
  alignment-restricted class (`classes.2da`'s `AlignRestrict` — Monk needs Lawful, Paladin
  needs Lawful Good) when the creature's `LawfulChaotic`/`GoodEvil` don't qualify. A
  companion built at a generic neutral alignment will silently cap at level 1 forever if
  its class is Monk or Paladin — set alignment to match the class before leveling.
- **Static verification can't confirm this actually worked at runtime — `create_spec_verification`
  closes that gap.** It generates `inc_spec_check.nss` (`src/util/spec-check-script.ts`),
  whose `SPEC_VerifyCreature(oCreature)` compares actual runtime race/appearance/class/
  level/package/feats/spells against `SPEC_*` local variables set on the blueprint (via
  `create_creature_blueprint`'s `varTable` — see `adventure-actors/SKILL.md` Phase 3b's
  template), logging `[SPEC_OK]`/`[SPEC_FAIL] tag=... field=... expected=... actual=...`
  lines. `a_hen_join` calls it as its last line. It is gated by the **module** local
  `MCP_VERIFY_MODE` (set `1` by `a_mod_load` during generation, flipped to `0` as the last
  build step before delivery) — `module.ifo` has no `VarTable` field to bake a static flag
  into, unlike UTC/UTP blueprints, so this must be a runtime `SetLocalInt` rather than a
  GFF field. See `docs/runtime-verification-spec.md` for the full design, including the
  build→run→check→repair orchestration loop this is meant to support (not yet
  implemented — see the TODO under "Verification Gate" above for the live-server piece).
  **Representative-feat data is real, verified 2DA lookups for all 11 base classes and
  all 7 standard PC races** (`RACIAL_FEATS`/`CLASS_FEATS` in `src/util/spec-check-script.ts`)
  — `SpecExpectedClassFeat()`/`SpecExpectedRacialFeat()` return `-1` (check skipped, never
  a false pass) only for anything outside those 11 classes/7 races.
- **Companion voices must be TYPE 0 (PC voiceset) rows** from `soundset.2da`. TYPE 3 NPC
  sets are sparse and leave the companion intermittently mute.
- **Static spell-baking IS possible — the GFF struct format was unknown, now verified.**
  An earlier session note claimed "no static spell-list structure exists on `ClassList`"
  and treated spell-granting as solvable only via a live `LevelUpHenchman()` call. That
  was premature — `ClassList[n]` does carry `MemorizedList0`-`MemorizedList9` (one list
  per spell level, 0 = orisons), each entry a struct with `Spell` (word, `spells.2da`
  row), `SpellFlags` (byte, `1` = ready/available), `SpellMetaMagic` (byte, `0` normally).
  Confirmed against two *never-live-leveled* static NPC blueprints in `~/tfndev`
  (`guard_cleric.utc`, `devrandomcleric.utc` — ordinary map NPCs, not henchmen that get
  leveled at recruit) — real BioWare henchmen (Nathyrra, Bim, Valen, checked this same
  session) are NOT useful references here, since they ship at level 1 in a *non-caster*
  base class and only gain their real caster levels via a live leveling call at recruit,
  same as this project's own henchmen. **For a companion, this only helps if you're
  deliberately baking a static caster (no live leveling planned) — a companion that goes
  through the normal recruit-time `LevelUpHenchman()` flow should keep using that, not
  this.** Slot count at level 1 with no metamagic/domain feats: base class table
  (`cls_spgn_<class>.2da`) gives orisons + 1 known-level slots; a positive ability
  modifier for the casting stat adds a same-count bonus spell per spell level the class
  can currently cast (e.g. Wis 16 → +1 first-level slot for a level-1 Cleric). Applied
  once, to one hand-verified test creature (a Human Cleric in Henchman Gear Showcase) —
  not yet wired into `create_creature_blueprint` or the `adventure-actors` skill as a
  general capability. **Superseded by the shipped runtime system below** for the
  "give a caster NPC spells" problem in general — this GFF-struct finding stays useful
  background (it's *how* `MemorizedList` is shaped, which the runtime system below
  never needs to know since it writes through the engine's own setter instead), but
  static per-blueprint baking is no longer the recommended path.
- **BUILT (2026-09-10) — real per-playthrough random caster spellbooks, computed
  entirely in NWScript at `OnSpawn`, no MCP/build-time baking.** User-specified design:
  a caster NPC's spells should be different every time the module loads, calculated by
  NWScript alone, applied by default to every caster NPC this project generates unless
  a story/plot reason calls for a fixed loadout. The previous assumption in this doc
  (echoed above) was that no vanilla-NWScript path exists to mutate a creature's real
  spellbook at runtime — **that assumption was wrong**, found by re-reading the real
  `nwscript.nss` (EE) rather than trusting the earlier note: the engine has native
  `SetMemorizedSpell(object oCreature, int nClassType, int nSpellLevel, int nIndex, int
  nSpellId, int bReady=TRUE, ...)` plus `GetMemorizedSpellCountByLevel`/
  `ClearMemorizedSpell`, gated only to classes where `classes.2da`'s `MemorizesSpells`
  column is `1`. Verified against the real `classes.2da`
  (`/var/www/storage/2DAs/8193.35_2dasource_full/classes.2da`): `MemorizesSpells=1` for
  **Cleric, Druid, Paladin, Ranger, Wizard**; `=0` for **Bard, Sorcerer** (spontaneous
  casters use `SpellbookRestricted=1` instead) — and there is **no runtime setter for
  "known spells"** (`GetKnownSpellCount`/`GetKnownSpellId`/`GetIsInKnownSpellList` exist,
  no `Set`/`Add` equivalent), so true native spellbook randomization only reaches 5 of
  the 7 caster classes.
  - **Tier 1 (Cleric/Druid/Paladin/Ranger/Wizard):** `RA_OnSpawn` builds an eligible
    spell pool per spell level via the real engine function `GetSpellLevelByClass(
    nClassType, nSpellId)` (never hand-parses `spells.2da`'s per-class column text),
    bounded by the real `Get2DARowCount("spells")`, shuffles it with the native
    `JsonArrayTransform(jArr, JSON_ARRAY_SHUFFLE)`, and writes the result via the real
    `SetMemorizedSpell()`. Slot counts per spell level come from `cls_spgn_<class>.2da`
    — confirmed the table's `Level` column is that class's own level directly (row
    index = level − 1) even for a late-casting class: `cls_spgn_pal.2da` rows for
    Paladin levels 1-3 are all `****`, and level 4 (row 3) is the first row with a real
    `SpellLevel1` value, matching Paladin's `MinCastingLevel=4`. Nothing else needs to
    change — the creature's existing, untouched default/henchman combat AI already
    casts from a real memorized spellbook automatically.
  - **Tier 2 (Bard, Sorcerer):** same pool/count logic, but since there's no runtime
    known-spell setter, the chosen spell ids are stored as one `SetLocalJson(oCreature,
    "RA_L<level>", jArr)` per populated spell level instead. `RA_OnEndRound` (wired onto
    `ScriptEndRound`) has a tunable per-round chance to cast one via
    `ActionCastSpellAtObject`'s real, documented `bCheat=TRUE` param, which lets a
    creature cast a spell it doesn't officially know — targets the creature's real
    `GetAttackTarget()`. Known simplification: doesn't distinguish an offensive spell
    from a self/ally-targeted one; low risk since Tier 2 is only two classes whose
    low-level lists skew offensive. **Confirmed fully working end-to-end against a
    real headless server** — no known limitations.
  - **Implementation:** `src/util/random-abilities-script.ts`
    (`generateRandomAbilitiesInclude`) + `src/tools/random-abilities-tools.ts`
    (`create_random_abilities_system` MCP tool), following the exact generator/probe-
    compile pattern `create_reward_system`/`create_spec_verification` already
    established (`writeAndCompileScript` + a throwaway probe script, since an include
    has no `main()`). 24 unit tests in `random-abilities-script.test.ts` (no
    integration test, matching `create_reward_system`/`create_spec_verification`'s own
    precedent — their compile-probe needs a real nim toolchain/resman this suite
    doesn't mock, so generator unit tests are the established coverage bar for this
    tool class).
  - **Wiring is skill-level, not a `create_creature_blueprint` default** — this matches
    the *existing* convention `inc_spec_check`'s `a_hen_spawn` already uses (see
    `adventure-actors/SKILL.md`), not a new mechanism: a small per-role wrapper script
    (`ExecuteScript()` on the creature's original `ScriptSpawn`/`ScriptEndRound`, then
    `RA_OnSpawn`/`RA_OnEndRound`) is written via `write_script` and pointed at by
    `create_creature_blueprint`'s existing `scripts` param override — never touching
    the tool's own default-resolution logic. This is intentionally the safer,
    lower-risk integration point: a direct/human tool caller editing a module by hand
    sees no surprise behavior change, and the "opt-out for a story-specific fixed
    ability" escape hatch is simply *not writing the wrapper* for that one NPC (keep
    using the existing `spells`/`SpecAbilityList` param instead).
  - **Portable by construction**: depends on nothing but base-game 2DAs
    (`classes.2da`, `cls_spgn_*.2da`, `spells.2da`) and base-game engine functions — no
    project-specific table, no MCP dependency, no NWNX. The generated file(s) can be
    copied into any other vanilla module's script resources verbatim, matching the
    portability bar `inc_reward.nss`/`inc_spec_check.nss` already meet.
  - **Wired into the pipeline**: `adventure-actors/SKILL.md` calls
    `create_random_abilities_system` once per module (Phase 3b Step 2, alongside
    `create_spec_verification`), and both the companion recipe (`a_hen_spawn`/
    `a_hen_endround`, chaining the henchman AI) and the Key NPC recipe (`a_ra_spawn`/
    `a_ra_endround`, chaining the plain default AI) wire it in — see the "Tier 1
    real-runtime findings" item immediately below for why this wiring is now known to
    be incomplete for Tier 1 specifically. The `spells`/`SpecAbilityList` param
    remains the documented opt-out for one specific NPC.
  - **CONFIRMED VIA REAL HEADLESS SERVER TESTING (2026-09-10) — Tier 1 has two real,
    unresolved limitations; Tier 2 has none.** A dedicated verification pass (own
    docker `nwnxee/unified` instance, `~/nwn-mcp-verify-server`, module copied in and
    restarted per iteration — see `docs/random-abilities-runtime-findings.md` for the
    full blow-by-blow) found:
    1. **The original per-level-rescan design really did exceed the script
       instruction budget**, exactly as flagged as a risk before shipping: a level 5
       Wizard's first (cheapest) scan succeeded (orisons written) while every later
       spell level silently got nothing, no error logged. Fixed by restructuring to a
       single pass over `spells.2da`, bucketing into ten independent flat JSON arrays
       selected by if/else-if (not nested-array indexing, and not a `switch` — see
       `random-abilities-script.ts`'s header comment for why both alternatives were
       tried and rejected). This fix is confirmed correct and shipped.
    2. **A from-scratch, never-live-leveled blueprint only ever gets level 0
       (cantrip) slots for Tier 1, no matter how good the pool logic is.**
       `GetMemorizedSpellCountByLevel()` — the real bound `SetMemorizedSpell()`
       silently respects — reports 0 for every spell level past 0 on such a
       blueprint, regardless of what `cls_spgn_<class>.2da` states. Since a companion
       doesn't get `LevelUpHenchman()`'d until recruit (`a_hen_join`), which fires
       well after `ScriptSpawn`, wiring `RA_OnSpawn` at `a_hen_spawn` (raw spawn) is
       the wrong timing for Tier 1 — it can only ever roll cantrips. **Not yet fixed**:
       `RA_OnSpawn` should be called after `LevelUpHenchman()` for companions
       (chained into `a_hen_join`), not at `a_hen_spawn`.
    3. **Even after a real `LevelUpHenchman()` pass, a level 5 Wizard's level 2-3
       slots still report 0 from the engine**, while level 0 and level 1 correctly
       became real, populated, readable-back slots. Root cause not isolated — the
       leading candidate is Wizards' `SpellbookRestricted` scribing mechanic (a
       Wizard must "know" a spell before memorizing it, unlike the other four Tier 1
       classes) combined with `LevelUpHenchman()`'s automatic AI possibly not
       populating known spells the way the toolset's own level-up UI would. This
       needs real further investigation (see the doc above for the concrete next
       experiments) before Tier 1 can be trusted above cantrip+1st-level.
       **`docs/tfndev-random-npc-system-findings.md` traces how `~/tfndev`'s own
       mature random-NPC system approaches this exact class of problem, and this
       project tested the leading hypothesis to completion — it's refuted.**
       tfndev's memorizing-class spell writes are plain `SetMemorizedSpell()` too
       (no known-spell pre-step), so the hypothesis was that the real fix is
       upstream, in how a creature gets its class levels: `NWNX_Creature`'s
       level-manipulation functions might correctly initialize per-level
       spell-slot state where vanilla `LevelUpHenchman()` doesn't. **Tested
       directly against a real, working NWNX setup** (a throwaway copy of
       `~/uoa`'s own live production module, run on the exact `nwnxee/unified`
       tag/ABI its real server uses — the project's own module wouldn't load on
       any tag old enough to have a working NWNX ABI, a separate infrastructure
       problem documented in the findings doc): `NWNX_Creature_LevelUp` produces
       **the identical level-2+ ceiling** vanilla `LevelUpHenchman()` does,
       including NWNX's own `GetMaxSpellSlots()` reporting 0, not just
       `GetMemorizedSpellCountByLevel()`. The leveling mechanism was never the
       variable that mattered. **Followed up and also refuted**:
       `NWNX_Creature_AddKnownSpell` on the Tier 1 class itself genuinely worked
       (confirmed via `GetKnownSpellCount` going 0→1) but didn't move the slot
       ceiling at all — and neither did `NWNX_Creature_SetRemainingSpellSlots`, a
       *direct* setter for the exact stuck value. **All three NWNX avenues tried
       hit the identical ceiling — the NWNX route for this specific problem is
       now closed**, not just this one hypothesis; whatever gates it looks
       structural (a per-level slot data structure likely only ever allocated for
       a fixed, small number of levels somewhere in creature initialization, not
       growable afterward by any scripting call, vanilla or NWNX) rather than
       "the right call hasn't been found." A real,
       independently-confirmed instruction-
       budget insight from a separate, real, shipped integration of the same
       tfndev system (UniverseOfArlandia, see
       `~/.claude/projects/-home-qlippoth-git-UniverseOfArlandia/memory/
       random-adventurer-henchman-feature.md`): `ExecuteScript` shares the
       caller's instruction budget, `DelayCommand` gets a fresh one. **Applied**:
       `adventure-actors/SKILL.md`'s `a_hen_spawn`/`a_hen_endround`/`a_ra_spawn`/
       `a_ra_endround` wrapper templates now call `DelayCommand(0.5,
       RA_OnSpawn(OBJECT_SELF))`/`DelayCommand(0.5, RA_OnEndRound(OBJECT_SELF))`
       instead of calling them inline after `ExecuteScript`ing the original
       default script. This is defense-in-depth, not a fix for a currently-
       reproducible failure — the single-pass bucketing fix (above) already
       resolved the one real instruction-budget bug this project found, and the
       Tier 1 level-2+ ceiling (also above) is a separate, NWNX-confirmed-
       structural limitation unrelated to instruction budget at all.
    3b. **CONFIRMED (2026-09-11) — the level-2+ ceiling is Wizard-specific, not a
       general Tier 1 limitation.** Triggered by a real user report: a randomly-
       generated Cleric NPC in a `~/tfndev` live game cast Hold Person (a level-2
       Cleric spell) successfully in combat. Re-ran the exact experiment item 3's
       NWNX investigation had already flagged as the single highest-value next test
       — a Cleric, leveled the identical way (`LevelUpHenchman()` loop to level 5, no
       NWNX) — against `~/nwn-mcp-verify-server`. Result: **every level 0-3 came back
       real and populated** (`L0:slots=5 L1:slots=5 L2:slots=4 L3:slots=3`, all with
       real readback spell IDs), where the identically-tested Wizard got
       `L2:slots=0 L3:slots=0`. Full record in `docs/random-abilities-runtime-
       findings.md`'s "Round 2" section. **Practical consequence: Cleric/Druid/
       Paladin/Ranger companions get a complete, real, freshly-randomized multi-level
       spellbook with zero known limitation once the item-2 wiring-timing fix below
       lands — only Wizard remains capped**, and per the closed NWNX investigation in
       item 3 there's currently no known fix for Wizard specifically in this engine
       build. (Druid/Paladin/Ranger weren't individually retested — they share
       Cleric's lack of `SpellbookRestricted`, so the same result is expected but only
       Cleric is directly confirmed.) This meaningfully raises the priority of item 2's
       `a_hen_spawn`→`a_hen_join` timing fix: it's no longer just "gets Wizard to
       cantrips+1st-level for free," it's "gets four of five Tier 1 classes a fully
       working random spellbook system for free."
    4. **Fix already shipped regardless of the open root cause**: `RA_RollClass` now
       caps every write to `min(cls_spgn slot count, GetMemorizedSpellCountByLevel())`
       rather than trusting the 2DA blindly, so it degrades gracefully (writes only
       what the engine will actually accept, silently skipping the rest) instead of
       wastefully attempting writes that do nothing.
  - **Known follow-up gap**: `verify_creature`'s `caster_no_spells` check only reads
    static build-time state (`MemorizedList`/`SpecAbilityList`) — it has no way to see
    what `RA_OnSpawn` rolls at runtime, so it now false-positives on every caster
    wired to this system (documented as expected in `adventure-actors/SKILL.md`, but
    not actually fixed at the check itself). A real fix would need the check to
    recognize the `RA_OnSpawn`/`RA_OnEndRound` wiring on `ScriptSpawn` and skip itself
    for that creature, rather than relying on the skill doc alone to explain away the
    false positive.
  - **Process pitfall worth remembering for any future work touching this include**:
    NWScript's `#include` resolves at compile time, baked into the including script's
    `.ncs` bytecode, exactly like a C header. Regenerating `inc_random_abil.nss`'s
    *source* via `create_random_abilities_system` (which deliberately never compiles
    it, since an include has no `main()`) has zero runtime effect until every script
    that `#include`s it is *recompiled*. Several rounds of this session's live
    debugging were silently testing stale bytecode from an old compile of the wrapper
    script, because only the include's source was being regenerated between test
    iterations — always recompile every wrapper script after changing an include it
    depends on, not just the include itself.
- **BUILT (2026-10-15) — reliability/efficiency pass via the `mcp-builder` skill, triggered by this session's own
  manual 6-call NPC-leveling dance.** Findings and fixes, in the order built:
  1. `build_npc_stat_block` gained `area`/`tag` support (mirroring `bake_spec_ability_pool`'s existing pattern) —
     previously resref-only, which forced a delete+re-place dance to re-level an already-placed creature.
  2. New tool **`level_creature`** — one call changes a single-class creature's level up OR down by a delta,
     recomputing the full stat block (`applyNpcStatBlock`, factored out of `build_npc_stat_block`'s handler) AND
     re-baking its Special-Abilities pool, directly on whichever object was targeted. Leveling down is real here
     (not subject to `LevelUpHenchman`'s up-only, zero-automatic-feats limitation) because this rewrites the GFF
     stat block directly rather than calling any live engine leveling function.
  3. New static test `tool-registration-shape.test.ts` — parses the real TypeScript AST of every `src/tools/*.ts`
     file and fails if a `server.tool()` call's annotations position (arg 4 of 5) is a literal `{}` — the exact
     shape that silently broke `start_web_editor` (see the Known Pitfalls entry above). Previously caught only by
     accident; now gated by `npm run verify`.
  4. New shared helper `classPositionRollLoop` (`util/nwscript-snippets.ts`) — the identical 1-indexed
     `GetClassByPosition`/`GetLevelByPosition` loop (see the fix entry above) is now generated from one function
     instead of hand-duplicated across `random-abilities-script.ts` and `spec-ability-script.ts`, so a future fix
     (or a future third generator) can't reintroduce that bug independently.
  5. Filled in missing tool annotations: 18 mutating tools (`create_module`, `create_area`, `create_dialog`,
     `create_faction`, `create_creature_blueprint` and its blueprint-type siblings, `compose_encounter`,
     `adventure_create_transition`, `create_area_transition`, journal/write/clone tools, `query_database`) had no
     `destructiveHint`/`idempotentHint` at all — confirmed via real AST parsing (not a text-regex guess, which
     produced false positives against `move_object`/`fix_object_heights`, both already annotated). `create_journal`
     got `idempotentHint: true` instead (it already no-ops safely if one exists); the rest got `destructiveHint: true`.
     159 tools total; only `undo_last_change`/`start_web_editor` remain intentionally bare.
  6. New tool **`build_npc_level_library`** — batch-builds one correctly-leveled blueprint per level in a
     requested array (e.g. `[1,3,5,8,10,12,15,18,20]`), server-side in one call via the existing
     `buildCreatureBlueprint`/`applyNpcStatBlock`/`bakeSpecAbilityPoolForCreature` building blocks — for the
     prebuilt-resref-library pattern (feeding a future in-game dialog-driven leveler, since nothing can be
     level-adjusted correctly by pure NWScript at runtime — no `AddFeat`/`RemoveFeat`/`SetAbilityScore` exist).
     A level whose resref already exists is skipped per-level, not aborting the whole batch.
  7. Normalized `isError` across the tool-execution-failure returns this round touched. Only 2 of 36 tool files
     used the MCP SDK's `isError:true` convention — the rest return a failed lookup/validation as an ordinary
     successful-looking text response, which means a client has no protocol-level signal that the call didn't do
     what was asked (it has to parse the message text itself). New shared helper
     `targetErrorResult()` (`npc-tools.ts`, next to `resolveCreatureTarget`) fixes this for all 7 call sites of
     the shared blueprint-or-placed-instance resolution pattern at once (`build_npc_stat_block`, `level_creature`,
     `equip_npc_by_role`, `respec_weapon_feats`, `remove_feats`, `add_equipped_item_property`,
     `bake_spec_ability_pool`) — DRY in the same spirit as item 4 above, not a one-off patch per tool.
     `level_creature`'s multiclass refusal and `create_spec_ability_system`'s resref-too-16-chars check got the
     same treatment directly. `build_npc_level_library`'s batch result only sets `isError` when EVERY requested
     level failed — a partial batch produced real, usable output, so it correctly stays a normal result with
     `success:false` and a per-level `results` array, not a protocol-level failure. **Deliberately scoped to the
     tools touched by this round's work, not a sweep of all 159 tools** — converting every early-return across
     the whole codebase would need a case-by-case judgment call (informational result vs. genuine failure) this
     pass didn't have the context budget to make safely for tools it didn't already have open; the convention
     (and the new shared helper) are there for the next tool that needs it.
  New tests: 6 for `build_npc_stat_block`/`level_creature` (placed-instance write path, up/down leveling, pool
  widening, clamping, multiclass refusal, MemorizedList-creature warning), 3 for `build_npc_level_library`
  (batch build, partial-failure skip, all-failed `isError`), 2 for the annotations-shape guard, 2 isError
  regression assertions added to existing tests. `npm run verify`: 791 passed, 48 test files, all checks green.
- **BUILT (2026-10-14) — a second, now-default caster system (`SpecAbilityList`
  instead of `MemorizedList`), full design/findings in
  `docs/special-abilities-system.md`.** `inc_spec_ability.nss`
  (`create_spec_ability_system`) + `bake_spec_ability_pool` sidestep
  `GetMemorizedSpellCountByLevel()`'s cantrip-only ceiling entirely, because
  `SpecAbilityList` isn't gated by it — this is the same mechanism base-game
  monsters have always used for innate spell-like abilities. Tradeoff: nothing
  can add a new ability to `SpecAbilityList` at runtime
  (`SetSpellAbilityReady()` only toggles an *existing* entry), so the full
  candidate pool is baked at build time (reading `classes.2da`/
  `cls_spgn_<class>.2da`/`spells.2da` directly, plus the real D&D 3.5
  ability-modifier bonus-spell formula) and `SA_OnSpawn` marks a real-slot-
  sized random subset ready each spawn — **confirmed live** against a
  14-creature test arena (`run_live_verification`): e.g. a level-12 Wizard,
  139 pool entries baked, 28 marked ready at real spawn. `LevelUpHenchman` is
  irrelevant to this system either way — it never touches `SpecAbilityList`.
  **Now the project-wide default**: `/create-adventure`'s pre-flight asks
  Special Abilities (default) vs. Random Abilities (fallback, unchanged) and
  records the choice in `adventure.md`; `/adventure-actors` and
  `compose_encounter` both branch on it, the latter via a `casterSystem`
  param (default `special_abilities`) that also fixes the Random Abilities
  system's boss-specific cantrip ceiling (a boss's `ClassList` is set
  directly, the exact shape that cap depends on).
  **User-facing "toolbar" finding, confirmed not a bug**: a `SpecAbilityList`
  entry marked ready auto-populates the in-game Spellbook/Powers panel
  (`GUI_PANEL_SPELLBOOK`) with zero manual step — that's what the `Ready`
  flag is for. The literal bottom hotbar (`GUI_PANEL_RADIAL_QUICKBAR`) is
  **never** auto-populated by the engine, for any ability/spell/item, for any
  creature — confirmed by grepping the full `nwscript.nss`: there is no
  quickbar-setter function at all. A DM possessing a caster still has to
  manually drag each wanted ability from the Spellbook panel onto a hotbar
  slot; nothing server-side can do that step. See the doc for the full
  write-up and the live log evidence.
  **TODO — handle a live level-up after the pool was already baked.**
  `bake_spec_ability_pool` fixes the candidate pool's membership at whatever
  class level the blueprint had when it ran; a henchman/NPC that is later
  leveled up for real (a live `LevelUpHenchman()` pass, independent of this
  system since it never touches `SpecAbilityList`) can end up with a higher
  `ClassList` level than the baked pool accounts for, so `SA_OnSpawn` has no
  higher-level spells to pick from and the creature's slot allotment at the
  new level is never actually filled — the exact "new spells aren't enabled
  to match the proper slot count" gap. No tool currently detects or re-bakes
  this automatically; the correct fix is either (a) a live-callable re-bake
  (an NWScript-side equivalent of `computeSpecAbilityPool` that can extend
  `SpecAbilityList` at the moment of level-up — blocked by the same "nothing
  can add a new ability to `SpecAbilityList` at runtime" limitation this
  whole system exists to work around, so this may need a GFF-level append
  instead of a pure-NWScript fix), or (b) a documented rule that
  `bake_spec_ability_pool` must always be re-run after any live leveling
  event, with a real check (e.g. a `verify_creature` comparison of baked
  pool's max level against the creature's actual current class level) to
  catch a module that skipped it. Not designed or implemented yet.
  **TODO — auto-fill the DM quickbar at bake time, not just the Spellbook panel.**
  Currently, every ready ability still needs a human to manually drag it from the
  Spellbook/Powers radial onto a hotbar slot each session (see the "toolbar" finding
  above). Real investigation started, confirmed rather than guessed: a real PC `.bic`
  save file (checked directly via `nwn_gff`) DOES carry a `QBList` field — 36 structs,
  each `{QBObjectType (byte), QBINTParam1 (int), QBMultiClass (byte), QBDomainLevel
  (byte), QBMetaType (byte)}`. Sampling one real character's quickbar: `QBObjectType=2`
  entries carry `QBINTParam1` values matching that character's actual memorized
  spells.2da row ids (strongly suggesting `2` = "cast this spell by id"); `QBObjectType=4`
  appears for what looks like a feat slot. **But a `.utc` creature blueprint has NO
  `QBList` field at all** (confirmed empty on a real sample creature) — this is
  currently a PC-`.bic`-only concept in the schema, and three real unknowns block
  building this, none of them safe to guess past:
  1. Whether writing a `QBList` onto a creature's `.utc`/placed-instance GFF has ANY
     effect on what a DM sees when possessing it, or whether DM possession's quickbar
     is sourced from the DM's own persistent client/account state instead, independent
     of the possessed object's own data. Unconfirmed — would need a real possession
     session to observe, which this project's headless verify-server cannot do (no
     graphical client).
  2. The full `QBObjectType` encoding table — only values 0/1/2/4 were seen in one
     sample, not a verified complete mapping, and specifically whether a
     `SpecAbilityList` entry needs the same type code as a known/memorized spell or a
     distinct one (the client treats "Special Abilities" as a separate category from
     memorized spells in the radial even though both key off the same `spells.2da` row
     id — writing the wrong code risks corrupting whatever quickbar state does get
     read, not just failing silently).
  3. If (1) and (2) resolve favorably: `bake_spec_ability_pool`/`create_creature_blueprint`
     would need a new write path appending `QBList` structs for each ready-marked
     ability, bounded to the real 36-slot limit (shared with any feats/other actions
     also being auto-filled), plus a decision on ordering/overflow when a creature has
     more ready abilities than slots. Not designed or implemented yet.
- **FIXED (2026-10-15) — both caster systems' class-position loop had an
  off-by-one, confirmed live via `run_live_verification` while demonstrating
  the "level up a creature" recipe above, not just read from source.**
  `GetClassByPosition`/`GetLevelByPosition`'s `nClassPosition` is
  **1-indexed** (1, 2, or 3 — `nwscript.nss`'s own doc comment: "a
  single-class creature will only have a value in nClassLocation=1"). Both
  `RA_OnSpawn` (`inc_random_abil.nss`, the original Random Abilities system —
  already shipped in every module built with it, including The Hollow
  Communion) and `SA_OnSpawn` (`inc_spec_ability.nss`) looped `0..2` instead
  of `1..3`. Impact is narrow and explains why this went unnoticed through
  every prior live test: position 0 is always `CLASS_TYPE_INVALID` (a wasted
  no-op iteration), but positions 1 and 2 — the real slots for every
  single-class or dual-class creature, which covers essentially every NPC
  this project generates — still fall inside a `0..2` range and rolled
  correctly. Only a genuine **triple-multiclass** creature (a real position 3)
  silently never had its third class's spells/abilities rolled at all.
  **Fix**: both loops changed to `for (i = 1; i <= 3; i++)` in
  `random-abilities-script.ts`/`spec-ability-script.ts`. Regression tests
  added to both `*.test.ts` files pinning the corrected loop text. Any
  already-shipped module's `inc_random_abil.nss`/`inc_spec_ability.nss` needs
  `create_random_abilities_system`/`create_spec_ability_system` re-run (after
  an MCP restart to pick up this fix) to actually get the corrected include —
  regenerating the TypeScript source alone has no effect on an already-built
  module until that tool is re-run against it.
- **FIXED — the feat/spell/equipment bug class (no feats, no spells, wrong equip slot,
  wrong-weight armor, no melee backup, inconsistent cross-area appearance) is now
  caught automatically, and the actual root cause was a documentation gap, not a code
  gap.** A real bug report against a freshly-built module found six non-companion Key
  NPCs (a wizard, an adept, two named humans, a sorcerer, a cleric) all shipped with a
  totally empty `FeatList` and no spells. Root cause, confirmed by reading
  `adventure-actors/SKILL.md` directly: the 4-source static `FeatList` bake (racial +
  automatic class feats + generic schedule + bonus slots, documented above) was written
  entirely inside Phase 3b ("Create Companions"), which opens with "Skip this phase
  entirely if the plot has no companion characters" — a non-companion combat-capable Key
  NPC reasonably read that line and skipped the whole phase, including the feat-bake
  recipe that was never actually companion-specific. **Fix:** Phase 3's Key NPC section
  now cross-references Phase 3b's Ability-scores/FeatList/Skill-points/Equipment
  subsections explicitly for any combat-capable Key NPC, and Phase 3b's own opening note
  now clarifies which parts are henchman-only (dialog/scripts/`HENCH_LEVEL`) vs. reusable
  by any combat-capable creature. Also closed: a non-companion Key NPC never gets a live
  `LevelUpHenchman()` call at all (there's no recruit event), so a caster Key NPC needs
  its `spells` (`SpecAbilityList`) param populated at build time — this is now documented
  explicitly, since it's a real, separate gap from the companion spell path
  (`bReadyAllSpells` at recruit).
  **Four new `verify_creature` checks close the detection gap** (`src/util/verify/blueprints.ts`):
  `empty_featlist` (class levels with zero FeatList), `caster_no_spells` (a spellcasting
  class at/past `classes.2da`'s `MinCastingLevel` with nothing in either `MemorizedList`
  or `SpecAbilityList`), `weapon_proficiency_mismatch` (RightHand/LeftHand item whose
  `baseitems.2da` `ReqFeat0-4` — verified live to be an OR-set of satisfying feats, e.g.
  a Shortbow's `ReqFeat0-2` are Martial Weapon Proficiency/Rogue's bonus proficiency/
  Elf's bonus proficiency, any one sufficing — has no match in `FeatList`), and
  `ranged_weapon_no_melee_backup` (a ranged weapon equipped with no melee-capable weapon
  anywhere in equipment or inventory — NWN's base AI, `ActionEquipMostDamagingMelee` off
  `nw_c2_default9`, auto-switches on ammo depletion but only if one exists to find).
  **FIXED (originally shipped as a weaker `armor_no_proficiency` warning, since
  upgraded to a precise `armor_proficiency_mismatch` error) — the armor weight-class
  precision gap is closed.** The dead end wasn't wrong about where to look
  (`baseitems.2da` really does have a single generic body-armor row (16) shared by
  every weight class, with no `ReqFeat` data or weight-class column of its own), it was
  looking in the wrong place entirely: weight class isn't stored on the base item, it's
  derived from the *equipped item's own AC Bonus item property*
  (`ITEM_PROPERTY_AC_BONUS = 1` in `nwscript.nss`; a `PropertiesList` entry with
  `PropertyName=1`, `CostValue` = the AC bonus amount 0-8 — confirmed directly against a
  real armor item, `crn_stdlthrarmr2.uti`, which carries exactly this). Cross-referenced
  against two more real sources: `armor.2da`'s 9-row `ACBONUS`/`DEXBONUS`/`ACCHECK`/
  `ARCANEFAILURE%`/`WEIGHT` table (row index = AC bonus value, 0-8), and a real, verified
  community equipment-randomizer script (`inc_rand_equip.nss`'s `GetACOfArmorToEquip`,
  found in the `~/tfndev` corpus), whose proficiency-capping logic gives the exact tier
  boundaries: AC bonus 0 needs no proficiency; 1-3 is Light armor (feat 3, ArmProfLgt);
  4-5 is Medium (feat 4, ArmProfMed); 6-8 is Heavy (feat 2, ArmProfHvy) — matching this
  project's already-verified `feat.2da` row numbers exactly. `armorTierFeat()`
  (`src/util/verify/blueprints.ts`) implements the mapping; `armor_proficiency_mismatch`
  reads the Chest-slot item's AC Bonus property, derives its tier, and checks for the
  one matching feat — this is the literal Corin Vale bug (a Rogue with only Light Armor
  Proficiency from its automatic class feats, equipped with Medium armor). An item with
  no AC Bonus property at all degrades to skip (AC bonus treated as 0), not a guess. The
  previous archaeology attempt correctly ruled out `iprp_costtable.2da`/
  `baseitems.2da` as dead ends — the fix came from a different table (`armor.2da`) plus
  a real script, not from either of those.
  **Also fixed at the write path, not just verification**: `set_creature_equipment`
  (`src/tools/creature-tools.ts`) now checks the item's `baseitems.2da` `EquipableSlots`
  hex bitmask against the target slot before writing — confirmed via a live table that
  this bitmask uses the exact same bit values as this project's own `EQUIP_SLOT_MAP`
  (e.g. Cloak = 0x40/64, matching `EQUIP_SLOT_MAP.cloak`) — so a cloak written into the
  chest slot (the literal reported bug) is now a rejected call naming the item's real
  valid slot(s), not a silent success. **Cross-area appearance consistency** is a new
  `validate_module` check (`cross_area_appearance_mismatch`, `src/tools/analysis-tools.ts`):
  groups placed creatures by `Tag` across all areas and warns when the same tag's
  `Race`/`Appearance_Type`/primary class disagree between placements — closes the
  "same named NPC renders differently in two areas" bug class. All five checks and the
  slot-write validation have unit/integration test coverage; `npm run verify` passes.

**BUILT (2026-09-19) — a "simple NPC" tier, option (a) below.** Everything above
(`LevelUpHenchman`, `startingPackage`, `SPEC_VerifyCreature`) assumes an NPC is meant to
progress exactly like a PC of that class — right for companions, wrong for a background
NPC the plot describes as a plain "warrior" or "adept" rather than a named Fighter/Cleric
character. NWN ships no separate Warrior/Expert/Adept/Aristocrat `CLASS_TYPE_*` the way
tabletop D&D 3.5's NPC classes do, and the only true non-PC catch-all,
`CLASS_TYPE_COMMONER` (20), already grants *no* feats or spellbook at all via
`LevelUpHenchman` — too blunt for an NPC that should still fight competently, just without
a PC's full bonus-feat chain (Cleave→Great Cleave, Weapon Specialization, metamagic feats,
epic feats, ...). **Fix:** `buildNpcStatBlock()`'s (`src/util/npc-stat-block.ts`) feat
computation already tagged every pick with a `source` — `"racial"`/`"class_automatic"`/
`"generic_slot"`/`"bonus_slot"` — and `"bonus_slot"` is exactly the PC-style advancement
chain (`cls_bfeat_<class>.2da`'s per-level slots) the TODO called out. A new
`complexity?: "full" | "simple"` param (default `"full"`, identical to prior behavior) on
both `buildNpcStatBlock()` and the `build_npc_stat_block` tool skips filling bonus-feat
slots entirely when `"simple"` — racial/automatic-class/generic-slot feats (basic
proficiencies, the universal "every character gets a feat" slots) are unaffected, so the
NPC is still mechanically competent, just without the advancement chain. Narrow, low-risk
change since the source-tagging already existed — no new read logic needed. **Option (b)
— a repair tool stripping bonus feats from a creature already leveled via a *live*
`LevelUpHenchman()` call — is deliberately still open**, a different mechanism (runtime
feat removal vs. build-time generation) with its own design questions; `complexity:
"simple"` covers the more common case (a background NPC built via `build_npc_stat_block`
from the start).
