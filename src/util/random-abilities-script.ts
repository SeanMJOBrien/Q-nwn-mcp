/**
 * Generator for the random-caster-abilities include (`inc_random_abil` by
 * default).
 *
 * Every caster NPC this project generates otherwise gets a hand-picked,
 * build-time-fixed spell/ability list (create_creature_blueprint's `spells`
 * param, SpecAbilityList) or nothing. This include computes a fresh, random
 * ability roster **entirely in NWScript** — no MCP/build-time baking — so a
 * module can reroll different spells for the same NPC on every playthrough.
 *
 * Two tiers, because the engine itself draws this line on classes.2da's
 * MemorizesSpells column:
 *
 *  - Tier 1 (Cleric/Druid/Paladin/Ranger/Wizard — MemorizesSpells=1): writes a
 *    REAL memorized spellbook via the native SetMemorizedSpell() (an EE
 *    addition, not NWNX). The creature's existing stock combat AI casts from
 *    this automatically — nothing else needs to change. **Confirmed real and
 *    significant limitations — see "TIER 1 KNOWN LIMITATIONS" below.**
 *  - Tier 2 (Bard/Sorcerer — spontaneous casters): there is no runtime setter
 *    for "known spells" (only GetKnownSpellCount/GetKnownSpellId/
 *    GetIsInKnownSpellList — no Set/Add equivalent), so a real spellbook can't
 *    be written for them. Instead the chosen spell ids are stored as a local
 *    JSON array and cast via ActionCastSpellAtObject's documented bCheat
 *    param, which lets a creature cast a spell it doesn't officially know.
 *    This needs one extra hook at ScriptEndRound (RA_OnEndRound) that Tier 1
 *    creatures never touch. **Confirmed fully working end-to-end against a
 *    real headless server — no known limitations.**
 *
 * Slot/ability counts for both tiers come from the same cls_spgn_<class>.2da
 * table every class already has (row index = that class's own level - 1;
 * SpellLevel0-SpellLevel9 columns give the count, verified directly against
 * cls_spgn_pal.2da where levels 1-3 are **** and level 4 is the first real
 * row, matching Paladin's MinCastingLevel=4). Eligible spells per level come
 * from the real engine function GetSpellLevelByClass(), not a hand-parsed
 * spells.2da column — bounded by the real Get2DARowCount("spells") instead of
 * a guessed constant, and bucketed into ten independent flat JSON arrays in a
 * SINGLE pass over the table (RA_RollClass), not one pass per populated spell
 * level and not one nested array-of-arrays either.
 *
 * That specific shape is load-bearing, found by two rounds of testing against
 * a real headless server, not by guessing: (1) rescanning spells.2da once per
 * populated spell level let a level 5 Wizard's cheap first scan (orisons)
 * succeed while every later level silently got nothing — the script's
 * instruction budget ran out partway through a later rescan with no error
 * logged, since NWNX_Diagnostics is normally disabled; (2) a first "single
 * pass" fix using one nested array-of-10-arrays was STILL broken the same
 * way, and for a worse reason — NWScript's json type has copy semantics, so
 * writing one bucket back into a shared outer array copies all ten buckets'
 * accumulated contents on every match, making that "single pass" O(n^2) in
 * the number of matched spells and more expensive than the rescan it
 * replaced. Ten independent flat arrays, selected with a plain if/else-if
 * chain (NOT a switch — see below), keep each insert's cost proportional to
 * its own pool's size — O(n) for the whole scan again. Pool shuffling uses
 * the native JsonArrayTransform(..., JSON_ARRAY_SHUFFLE) rather than
 * hand-rolled dedup/random logic.
 *
 * Why if/else instead of switch: a `switch` on an int, assigning a `json`
 * local per case, was the first attempt at routing to the ten flat pools.
 * When a WriteTimestampedLogEntry placed right after it never fired — not
 * even for level 0, which independently confirmed *worked* — that pointed at
 * the switch+json construct itself silently faulting at runtime with no
 * error logged (again, NWNX_Diagnostics off). Switching to if/else-if
 * (the most conservative, best-tested NWScript control-flow construct)
 * fixed it. This was never conclusively proven to be a switch-specific
 * defect in this NWScript VM — a stale-compile mistake (see below) muddied
 * several rounds of this investigation — but if/else is what is now shipped
 * and confirmed working, so treat `switch` assigning a `json`/complex-typed
 * local per case as suspect in this codebase until someone re-isolates it.
 *
 * PROCESS PITFALL, worth remembering for any future work on this include:
 * NWScript's #include resolves at COMPILE TIME, baked into the including
 * script's .ncs bytecode — exactly like a C header. Regenerating
 * inc_random_abil.nss's SOURCE via create_random_abilities_system (which
 * deliberately never compiles it, since an include has no main()) has ZERO
 * runtime effect until every script that #includes it is recompiled too.
 * Multiple debugging rounds against the live verify server were silently
 * testing stale bytecode from an old compile of the wrapper script, because
 * only the include's .nss source was being regenerated — the fix was as
 * simple as recompiling the wrapper, but confirming that was the issue cost
 * several confusing round trips.
 *
 * TIER 1 KNOWN LIMITATIONS — confirmed against a real headless server
 * (2026-09), not yet resolved:
 *  1. A from-scratch blueprint (built directly via create_creature_blueprint
 *     with classes:[{class,level}], never live-leveled) only gets level 0
 *     (cantrip/orison) slots — GetMemorizedSpellCountByLevel() reports 0 for
 *     every higher level regardless of what cls_spgn_<class>.2da says, and
 *     SetMemorizedSpell() silently no-ops past that bound (0 <= nIndex <
 *     GetMemorizedSpellCountByLevel()). This means RA_OnSpawn, called at raw
 *     ScriptSpawn (before any leveling), can only ever populate cantrips for
 *     a companion — companions don't get LevelUpHenchman()'d until recruit
 *     (a_hen_join), which fires well after ScriptSpawn.
 *  2. Leveling a test creature live via LevelUpHenchman() (mirroring
 *     SPEC_SelfTestOnSpawn's pattern) BEFORE calling RA_OnSpawn fixes level 0
 *     AND level 1 — both confirmed real, correctly populated, and readable
 *     back. But level 2 and 3 STILL report 0 engine slots even after real
 *     leveling, for a level 5 Wizard that cls_spgn_wiz.2da says should have
 *     2 and 1 slots there respectively. Root cause not yet isolated — one
 *     candidate not yet tested is Wizards' SpellbookRestricted mechanic
 *     (Wizards must "know"/scribe a spell before memorizing it, unlike the
 *     other four Tier 1 classes, which know their whole class list
 *     automatically) combined with LevelUpHenchman()'s automatic AI possibly
 *     not adding known spells at every level the way a real player leveling
 *     up through the toolset UI would.
 *  3. Consequence: RA_OnSpawn/RA_RollClass now caps every write to
 *     min(cls_spgn slot count, GetMemorizedSpellCountByLevel()) rather than
 *     trusting the 2DA blindly, so it degrades gracefully (writes what the
 *     engine will actually accept) instead of wastefully attempting writes
 *     that silently do nothing. It does NOT fix limitations 1-2 above.
 *  4. Not yet done: wiring RA_OnSpawn to fire after LevelUpHenchman() for
 *     companions (chained into a_hen_join, not a_hen_spawn) to at least get
 *     limitation 1 for free: level 0-1 spells for every Tier 1 companion.
 *     Non-companion Key NPCs never get a live leveling call at all, so they
 *     are stuck at cantrips-only for Tier 1 classes until limitation 2 is
 *     understood, or they should keep using the static `spells` param
 *     instead for anything above a cantrip.
 *
 * Depends on nothing but base-game 2DAs and base-game engine functions — no
 * project-specific table, no MCP dependency, no NWNX. The compiled/source
 * files are portable to any other vanilla module verbatim.
 */

export interface RandomAbilitiesOptions {
  /** Include resref to write, so the usage comment names the real file. */
  includeName?: string;
  /**
   * Percent chance per combat round a Tier-2 (spontaneous-caster) creature
   * fires one of its stored virtual abilities instead of its normal attack.
   * 1-100, default 35. Flat per-round chance, not a depleting daily
   * resource — these are framed as innate/at-will special abilities, not
   * Vancian-limited spells, which fits "special abilities instead of a full
   * spellbook" for the classes a real spellbook can't reach.
   */
  castChancePercent?: number;
}

export interface ValidationIssue {
  message: string;
  fix: string;
}

export function validateRandomAbilitiesOptions(opts: RandomAbilitiesOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const chance = opts.castChancePercent ?? 35;
  if (!Number.isInteger(chance) || chance < 1 || chance > 100) {
    issues.push({
      message: `castChancePercent must be a whole number from 1 to 100, got ${chance}`,
      fix: "pass a value from 1 to 100, or omit it for the default of 35",
    });
  }
  return issues;
}

/** Generate the full NWScript source for the random-abilities include. */
export function generateRandomAbilitiesInclude(opts: RandomAbilitiesOptions = {}): string {
  const includeName = opts.includeName ?? "inc_random_abil";
  const chance = opts.castChancePercent ?? 35;

  return `// Random caster abilities, computed entirely at runtime.
//
// GENERATED by nwn-mcp create_random_abilities_system — do not hand-edit.
// Rerun the tool with different options to change the tuning; hand edits are
// lost on regeneration.
//
// WHY: a caster NPC's spells are picked fresh by NWScript every time the
// module loads (RA_OnSpawn, called once per spawn) rather than being baked
// into the .utc at build time — so the same NPC can hand you something
// different on your next playthrough. Nothing here depends on this MCP
// server, a project-specific 2DA, or NWNX: only base-game classes.2da/
// cls_spgn_<class>.2da/spells.2da and base-game engine functions. Copy this
// file (and RA_OnEndRound's wiring, for Tier 2 classes) into any other
// vanilla module's script resources and it works unmodified.
//
// TIER 1 — Cleric, Druid, Paladin, Ranger, Wizard (classes.2da MemorizesSpells
// = 1). RA_OnSpawn writes a REAL memorized spellbook via the engine's own
// SetMemorizedSpell() — the creature's stock combat AI (nw_c2_default3,
// x0_ch_hen_combat, or whatever ScriptEndRound is already wired) casts from
// it automatically. No further hook needed for these classes.
//
// TIER 2 — Bard, Sorcerer (spontaneous casters, MemorizesSpells = 0). The
// engine has no runtime setter for a creature's known-spell list, so a real
// spellbook can't be written for these two. RA_OnSpawn instead stores the
// chosen spell ids as local JSON arrays; RA_OnEndRound (called from
// ScriptEndRound) has a ${chance}% chance per combat round to cast one of
// them at the creature's current attack target via ActionCastSpellAtObject's
// bCheat param, which lets a creature cast a spell it doesn't officially
// know. This does not track daily uses — these are framed as innate/at-will
// special abilities for the two classes a real spellbook can't reach, not
// Vancian-limited spells.
//
// KNOWN SIMPLIFICATION: RA_OnEndRound always targets the creature's current
// attack target — it does not distinguish an offensive spell from a
// self/ally-targeted one (e.g. a buff). Low risk in practice since Tier 2 is
// only Bard/Sorcerer, whose low-level spell lists skew offensive, but a
// future revision could check spells.2da's TargetType to route self/ally
// spells differently.
//
// WIRING — chain, never replace a creature's existing ScriptSpawn/
// ScriptEndRound. Write a tiny per-role wrapper script and point
// create_creature_blueprint's \`scripts\` param at it (the exact pattern this
// project already uses for inc_spec_check's a_hen_spawn):
//
//     #include "${includeName}"
//     void main()
//     {
//         ExecuteScript("nw_c2_default9", OBJECT_SELF); // or the henchman/original ScriptSpawn
//         RA_OnSpawn(OBJECT_SELF);
//     }
//
// and, only for a creature that might roll a Tier-2 class (Bard/Sorcerer;
// harmless to wire for every caster, since RA_OnEndRound no-ops instantly for
// a creature with no stored Tier-2 abilities):
//
//     #include "${includeName}"
//     void main()
//     {
//         ExecuteScript("nw_c2_default3", OBJECT_SELF); // or the henchman/original ScriptEndRound
//         RA_OnEndRound(OBJECT_SELF);
//     }
//
// OPT-OUT: a caster NPC that needs a fixed, story-specific ability instead of
// a random one simply isn't wired this way — use create_creature_blueprint's
// existing \`spells\` param (SpecAbilityList) as before, and don't point
// ScriptSpawn/ScriptEndRound at the wrappers above for that creature.

int RA_CAST_CHANCE_PERCENT = ${chance};

// Roll and apply a random ability set for one of oCreature's class positions.
// No-ops immediately for a non-caster class, an unused class position
// (nClassType == CLASS_TYPE_INVALID), or a class not yet at its
// MinCastingLevel.
void RA_RollClass(object oCreature, int nClassType, int nClassLevel)
{
    if (nClassType == CLASS_TYPE_INVALID) return;
    if (Get2DAString("classes", "SpellCaster", nClassType) != "1") return;

    string sMinLevel = Get2DAString("classes", "MinCastingLevel", nClassType);
    int nMinLevel = (GetStringLength(sMinLevel) > 0) ? StringToInt(sMinLevel) : 1;
    if (nClassLevel < nMinLevel) return;

    string sGainTable = GetStringLowerCase(Get2DAString("classes", "SpellGainTable", nClassType));
    if (GetStringLength(sGainTable) == 0) return;

    int bMemorizes = (Get2DAString("classes", "MemorizesSpells", nClassType) == "1");
    int nSpellRowCount = Get2DARowCount("spells");
    int bAnyTier2 = FALSE;

    // Bucket every spell id into its class-specific level pool in ONE pass
    // over spells.2da, rather than rescanning the whole table once per
    // populated spell level — rescanning per level can exceed the script's
    // instruction budget partway through a later level, silently aborting
    // with no error logged and leaving that level's spells unmemorized.
    // Confirmed for real against a live headless server, twice:
    //   1. The original per-level-rescan version: a level 5 Wizard correctly
    //      got 4 random orisons (level 0, the first scan) but zero spells at
    //      levels 1-3, even though cls_spgn_wiz.2da gives it real slots at
    //      all four levels.
    //   2. A first "single pass" fix using ONE nested array-of-10-arrays
    //      (jPools[nLvl]) was still broken the same way, and for a worse
    //      reason: NWScript's json type has copy semantics, so every
    //      JsonArraySet(jPools, nLvl, jBucket) call to update one bucket
    //      copies the ENTIRE outer structure — all ten buckets' accumulated
    //      contents — making the "single pass" O(n^2) in the number of
    //      matched spells, not O(n). It was actually MORE expensive than the
    //      per-level rescan it replaced.
    // The fix that actually works: ten independent flat json array
    // variables, routed with a switch instead of nested-array indexing. A
    // flat JsonArrayInsert only ever copies its own pool's current contents,
    // not all ten pools' combined contents, so the total cost across the
    // whole scan is O(n) again.
    json jPool0 = JsonArray();
    json jPool1 = JsonArray();
    json jPool2 = JsonArray();
    json jPool3 = JsonArray();
    json jPool4 = JsonArray();
    json jPool5 = JsonArray();
    json jPool6 = JsonArray();
    json jPool7 = JsonArray();
    json jPool8 = JsonArray();
    json jPool9 = JsonArray();

    int nSpellId;
    for (nSpellId = 0; nSpellId < nSpellRowCount; nSpellId++)
    {
        int nLvl = GetSpellLevelByClass(nClassType, nSpellId);
        json jId = JsonInt(nSpellId);
        if (nLvl == 0) jPool0 = JsonArrayInsert(jPool0, jId);
        else if (nLvl == 1) jPool1 = JsonArrayInsert(jPool1, jId);
        else if (nLvl == 2) jPool2 = JsonArrayInsert(jPool2, jId);
        else if (nLvl == 3) jPool3 = JsonArrayInsert(jPool3, jId);
        else if (nLvl == 4) jPool4 = JsonArrayInsert(jPool4, jId);
        else if (nLvl == 5) jPool5 = JsonArrayInsert(jPool5, jId);
        else if (nLvl == 6) jPool6 = JsonArrayInsert(jPool6, jId);
        else if (nLvl == 7) jPool7 = JsonArrayInsert(jPool7, jId);
        else if (nLvl == 8) jPool8 = JsonArrayInsert(jPool8, jId);
        else if (nLvl == 9) jPool9 = JsonArrayInsert(jPool9, jId);
    }

    int nSpellLvl;
    for (nSpellLvl = 0; nSpellLvl <= 9; nSpellLvl++)
    {
        string sSlotStr = Get2DAString(sGainTable, "SpellLevel" + IntToString(nSpellLvl), nClassLevel - 1);
        int nSlots = (GetStringLength(sSlotStr) > 0) ? StringToInt(sSlotStr) : 0;
        if (nSlots <= 0) continue;

        json jPool = JsonArray();
        if (nSpellLvl == 0) jPool = jPool0;
        else if (nSpellLvl == 1) jPool = jPool1;
        else if (nSpellLvl == 2) jPool = jPool2;
        else if (nSpellLvl == 3) jPool = jPool3;
        else if (nSpellLvl == 4) jPool = jPool4;
        else if (nSpellLvl == 5) jPool = jPool5;
        else if (nSpellLvl == 6) jPool = jPool6;
        else if (nSpellLvl == 7) jPool = jPool7;
        else if (nSpellLvl == 8) jPool = jPool8;
        else jPool = jPool9;

        int nPoolSize = JsonGetLength(jPool);
        if (nPoolSize == 0) continue;

        // cls_spgn_<class>.2da's stated slot count is not always what the
        // engine will actually accept: confirmed against a live headless
        // server that a from-scratch (never live-leveled) blueprint reports
        // GetMemorizedSpellCountByLevel() = 0 for every level past 0 even
        // though the 2DA says otherwise, and that even a properly leveled
        // (via LevelUpHenchman()) Wizard still reports 0 at levels 2+ despite
        // 2 real 2DA slots there. SetMemorizedSpell() silently no-ops past
        // GetMemorizedSpellCountByLevel()'s bound (0 <= nIndex < that count),
        // so capping to it here avoids wasted writes that would otherwise
        // silently do nothing.
        int nEngineSlots = nSlots;
        if (bMemorizes) nEngineSlots = GetMemorizedSpellCountByLevel(oCreature, nClassType, nSpellLvl);

        jPool = JsonArrayTransform(jPool, JSON_ARRAY_SHUFFLE);
        int nPick = nSlots;
        if (nPick > nPoolSize) nPick = nPoolSize;
        if (nPick > nEngineSlots) nPick = nEngineSlots;
        if (nPick <= 0) continue;

        if (bMemorizes)
        {
            int i;
            for (i = 0; i < nPick; i++)
                SetMemorizedSpell(oCreature, nClassType, nSpellLvl, i, JsonGetInt(JsonArrayGet(jPool, i)), TRUE);
        }
        else
        {
            SetLocalJson(oCreature, "RA_L" + IntToString(nSpellLvl), JsonArrayGetRange(jPool, 0, nPick - 1));
            bAnyTier2 = TRUE;
        }
    }

    if (bAnyTier2) SetLocalInt(oCreature, "RA_TIER2", TRUE);
}

// Call once from a chained OnSpawn wrapper (see the header comment above).
// Rolls every class position oCreature has — safe to call on a non-caster,
// which no-ops on every position.
void RA_OnSpawn(object oCreature)
{
    if (!GetIsObjectValid(oCreature)) return;

    int i;
    for (i = 0; i < 3; i++)
        RA_RollClass(oCreature, GetClassByPosition(i, oCreature), GetLevelByPosition(i, oCreature));
}

// Call from a chained ScriptEndRound wrapper. No-op unless RA_OnSpawn stored
// at least one Tier-2 (spontaneous-caster) ability on this creature — safe to
// wire on every creature, including Tier-1-only and non-caster ones.
void RA_OnEndRound(object oCreature)
{
    if (!GetLocalInt(oCreature, "RA_TIER2")) return;
    if (Random(100) >= RA_CAST_CHANCE_PERCENT) return;

    object oTarget = GetAttackTarget(oCreature);
    if (!GetIsObjectValid(oTarget)) return;

    // Collect every populated spell level into one flat "(level, poolIndex)"
    // choice by picking a random populated level, then a random entry in it.
    json jLevels = JsonArray();
    int nSpellLvl;
    for (nSpellLvl = 0; nSpellLvl <= 9; nSpellLvl++)
    {
        json jLevelPool = GetLocalJson(oCreature, "RA_L" + IntToString(nSpellLvl));
        if (JsonGetType(jLevelPool) == JSON_TYPE_ARRAY && JsonGetLength(jLevelPool) > 0)
            jLevels = JsonArrayInsert(jLevels, JsonInt(nSpellLvl));
    }

    int nLevelCount = JsonGetLength(jLevels);
    if (nLevelCount == 0) return;

    int nChosenLevel = JsonGetInt(JsonArrayGet(jLevels, Random(nLevelCount)));
    json jPool = GetLocalJson(oCreature, "RA_L" + IntToString(nChosenLevel));
    int nSpellId = JsonGetInt(JsonArrayGet(jPool, Random(JsonGetLength(jPool))));

    ActionCastSpellAtObject(nSpellId, oTarget, METAMAGIC_ANY, TRUE);
}
`;
}
