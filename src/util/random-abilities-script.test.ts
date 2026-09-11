/**
 * Tests for the random-caster-abilities include generator.
 *
 * The generated source cannot be compiled here (needs the real NWN data tree
 * and the nim toolchain — create_random_abilities_system does that with a
 * probe script at runtime), so these assert on the shape that makes the
 * design correct: the Tier 1 (real spellbook) vs Tier 2 (virtual ability)
 * branch, the engine functions it must call rather than hand-parse 2DA text,
 * and the tuning/validation surface.
 */

import { describe, expect, it } from "vitest";
import { generateRandomAbilitiesInclude, validateRandomAbilitiesOptions } from "./random-abilities-script.js";

describe("generateRandomAbilitiesInclude — Tier 1 (real spellbook)", () => {
  it("uses the real SetMemorizedSpell() engine call, not a workaround", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("SetMemorizedSpell(oCreature, nClassType, nSpellLvl, i, JsonGetInt(JsonArrayGet(jPool, i)), TRUE);");
  });

  it("caps the write count to the engine's real GetMemorizedSpellCountByLevel, not just the 2DA's stated slots", () => {
    // Confirmed against a real headless server: cls_spgn_<class>.2da's stated
    // slot count is not always what the engine will actually let
    // SetMemorizedSpell() write — a from-scratch (never live-leveled)
    // blueprint reports 0 real engine slots for every spell level past 0
    // regardless of the 2DA, and even a properly leveled Wizard still
    // reports 0 at levels 2+ despite the 2DA saying otherwise. Without this
    // cap the code would attempt writes that silently do nothing.
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("int nEngineSlots = nSlots;");
    expect(source).toContain("if (bMemorizes) nEngineSlots = GetMemorizedSpellCountByLevel(oCreature, nClassType, nSpellLvl);");
    expect(source).toContain("if (nPick > nEngineSlots) nPick = nEngineSlots;");
    expect(source).toContain("if (nPick <= 0) continue;");
  });

  it("only takes the Tier 1 branch for a MemorizesSpells class", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('Get2DAString("classes", "MemorizesSpells", nClassType) == "1"');
  });

  it("resolves the class's own spell-gain table rather than a hardcoded one", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('GetStringLowerCase(Get2DAString("classes", "SpellGainTable", nClassType))');
  });

  it("respects MinCastingLevel so a late-casting class (Paladin/Ranger) is skipped until it applies", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('Get2DAString("classes", "MinCastingLevel", nClassType)');
    expect(source).toContain("if (nClassLevel < nMinLevel) return;");
  });

  it("reads spell slot counts by class level - 1, matching the real cls_spgn_<class>.2da row convention", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('Get2DAString(sGainTable, "SpellLevel" + IntToString(nSpellLvl), nClassLevel - 1)');
  });

  it("uses the real engine function GetSpellLevelByClass instead of hand-parsing spells.2da", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("int nLvl = GetSpellLevelByClass(nClassType, nSpellId);");
    expect(source).toContain('Get2DARowCount("spells")');
  });

  it("buckets every spell into its level pool in a SINGLE pass, not one scan per populated spell level", () => {
    // Regression test #1: rescanning spells.2da once per populated spell
    // level let a level 5 Wizard's cheap first scan (orisons) succeed while
    // every later level silently got nothing — confirmed against a live
    // headless server, instruction budget exhausted mid-rescan with no error
    // logged. The scanning loop must appear exactly once in the function.
    const source = generateRandomAbilitiesInclude();
    expect(source.match(/for \(nSpellId = 0; nSpellId < nSpellRowCount; nSpellId\+\+\)/g)).toHaveLength(1);
  });

  it("uses ten independent flat pool arrays, not one nested array-of-arrays", () => {
    // Regression test #2: a first "single pass" fix using ONE nested
    // array-of-10-arrays (jPools[nLvl]) was still broken the same way, worse
    // even — confirmed against a live headless server a second time.
    // NWScript's json type has copy semantics, so writing one bucket back
    // into a shared outer array (JsonArraySet(jPools, nLvl, jBucket)) copies
    // ALL ten buckets' accumulated contents on every single match, making
    // that shape O(n^2) in the number of matched spells rather than O(n) —
    // actually costlier than the per-level rescan it was meant to replace.
    // Ten independent flat arrays, routed with if/else-if, keep each
    // insert's cost proportional to only its own pool's size.
    const source = generateRandomAbilitiesInclude();
    expect(source).not.toContain("jPools = JsonArraySet(jPools");
    expect(source).not.toContain("json jPools = JsonArray()");
    expect(source).toContain("json jPool0 = JsonArray();");
    expect(source).toContain("json jPool9 = JsonArray();");
    expect(source).toContain("if (nLvl == 0) jPool0 = JsonArrayInsert(jPool0, jId);");
    expect(source).toContain("else if (nLvl == 9) jPool9 = JsonArrayInsert(jPool9, jId);");
    expect(source).toContain("if (nSpellLvl == 0) jPool = jPool0;");
    expect(source).toContain("else jPool = jPool9;");
  });

  it("shuffles the eligible pool with the native JSON shuffle transform", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("JsonArrayTransform(jPool, JSON_ARRAY_SHUFFLE)");
  });

  it("never picks more spells than the pool actually has", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("if (nPick > nPoolSize) nPick = nPoolSize;");
  });
});

describe("generateRandomAbilitiesInclude — Tier 2 (virtual ability, spontaneous casters)", () => {
  it("stores the chosen pool as local JSON rather than a real spellbook write", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('SetLocalJson(oCreature, "RA_L" + IntToString(nSpellLvl), JsonArrayGetRange(jPool, 0, nPick - 1));');
  });

  it("flags the creature as Tier 2 so RA_OnEndRound knows to check it", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('SetLocalInt(oCreature, "RA_TIER2", TRUE);');
  });

  it("RA_OnEndRound no-ops immediately for a creature with no Tier-2 abilities stored", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain('if (!GetLocalInt(oCreature, "RA_TIER2")) return;');
  });

  it("casts via ActionCastSpellAtObject's bCheat param, since these spells aren't officially known", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("ActionCastSpellAtObject(nSpellId, oTarget, METAMAGIC_ANY, TRUE);");
  });

  it("bakes in the configured cast chance and gates on it", () => {
    const source = generateRandomAbilitiesInclude({ castChancePercent: 60 });
    expect(source).toContain("int RA_CAST_CHANCE_PERCENT = 60;");
    expect(source).toContain("if (Random(100) >= RA_CAST_CHANCE_PERCENT) return;");
  });

  it("defaults the cast chance to 35", () => {
    expect(generateRandomAbilitiesInclude()).toContain("int RA_CAST_CHANCE_PERCENT = 35;");
  });

  it("targets the creature's real current attack target, not a guessed object", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("object oTarget = GetAttackTarget(oCreature);");
    expect(source).toContain("if (!GetIsObjectValid(oTarget)) return;");
  });
});

describe("generateRandomAbilitiesInclude — entry points and naming", () => {
  it("exposes RA_OnSpawn and RA_OnEndRound as the two wiring hooks", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("void RA_OnSpawn(object oCreature)");
    expect(source).toContain("void RA_OnEndRound(object oCreature)");
  });

  it("rolls every class position so a multiclass creature gets every eligible caster class considered", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("for (i = 0; i < 3; i++)");
    expect(source).toContain("RA_RollClass(oCreature, GetClassByPosition(i, oCreature), GetLevelByPosition(i, oCreature));");
  });

  it("names the real include in the usage comment", () => {
    expect(generateRandomAbilitiesInclude({ includeName: "inc_abil2" })).toContain('#include "inc_abil2"');
    expect(generateRandomAbilitiesInclude()).toContain('#include "inc_random_abil"');
  });

  it("documents the chain-never-replace wiring pattern, matching inc_spec_check's precedent", () => {
    const source = generateRandomAbilitiesInclude();
    expect(source).toContain("ExecuteScript(");
  });
});

describe("validateRandomAbilitiesOptions", () => {
  it("accepts the defaults", () => {
    expect(validateRandomAbilitiesOptions({})).toEqual([]);
  });

  it("rejects a cast chance outside 1-100", () => {
    expect(validateRandomAbilitiesOptions({ castChancePercent: 0 })).toHaveLength(1);
    expect(validateRandomAbilitiesOptions({ castChancePercent: 101 })).toHaveLength(1);
    expect(validateRandomAbilitiesOptions({ castChancePercent: 100 })).toEqual([]);
  });

  it("rejects a non-integer cast chance", () => {
    expect(validateRandomAbilitiesOptions({ castChancePercent: 35.5 })).toHaveLength(1);
  });
});
