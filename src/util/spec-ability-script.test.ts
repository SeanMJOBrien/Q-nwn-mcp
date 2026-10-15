/**
 * Tests for the Special-Abilities runtime include generator.
 *
 * The generated source cannot be compiled here (needs the real NWN data tree
 * and the nim toolchain — create_spec_ability_system does that with a probe
 * script at runtime), so these assert on the shape that makes the design
 * correct: the real engine calls it must use, the flat-pool shape (not a
 * switch or nested array, per inc_random_abil.nss's documented pitfalls),
 * and the reset-before-reroll idempotency.
 */

import { describe, expect, it } from "vitest";
import { generateSpecAbilityInclude } from "./spec-ability-script.js";

describe("generateSpecAbilityInclude", () => {
  it("uses the real SetSpellAbilityReady()/GetSpellAbilityCount() engine calls, not a workaround", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain("SetSpellAbilityReady(oCreature, i, FALSE);");
    expect(source).toContain("SetSpellAbilityReady(oCreature, JsonGetInt(JsonArrayGet(jPool, j)), TRUE);");
    expect(source).toContain("int nCount = GetSpellAbilityCount(oCreature);");
    expect(source).toContain("int nSpellId = GetSpellAbilitySpell(oCreature, i);");
  });

  it("resets every slot to not-ready before rerolling, so repeated calls are idempotent", () => {
    const source = generateSpecAbilityInclude();
    const resetIdx = source.indexOf("SetSpellAbilityReady(oCreature, i, FALSE);");
    const rollIdx = source.indexOf("SA_RollClass(oCreature,");
    expect(resetIdx).toBeGreaterThan(-1);
    expect(rollIdx).toBeGreaterThan(resetIdx);
  });

  it("uses ten independent flat json pools, not a nested array or a switch on a json local", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain("json jPool9 = JsonArray();");
    expect(source).not.toMatch(/switch\s*\(\s*nLvl\s*\)/);
    expect(source).not.toMatch(/switch\s*\(\s*nSpellLvl\s*\)/);
  });

  it("reads spells.2da's class column directly rather than via GetSpellLevelByClass (no Master-inheritance risk here)", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain('Get2DAString("spells", sClassCol, nSpellId)');
    expect(source).not.toContain("GetSpellLevelByClass");
  });

  it("maps classes.2da's SpellcastingAbil string to the real ABILITY_* constants", () => {
    const source = generateSpecAbilityInclude();
    for (const abil of [
      "ABILITY_STRENGTH",
      "ABILITY_DEXTERITY",
      "ABILITY_CONSTITUTION",
      "ABILITY_INTELLIGENCE",
      "ABILITY_WISDOM",
      "ABILITY_CHARISMA",
    ]) {
      expect(source).toContain(abil);
    }
  });

  it("implements the real D&D 3.5 bonus-spell formula, not a 2DA lookup (no such table exists)", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain("return (nMod - nLevel) / 4 + 1;");
  });

  it("respects MinCastingLevel so a late-casting class (Paladin/Ranger) is skipped until it applies", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain('Get2DAString("classes", "MinCastingLevel", nClassType)');
    expect(source).toContain("if (nClassLevel < nMinLevel) return;");
  });

  it("caps the pick count to the real baked pool size, never over-selecting", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain("if (nPick > nPoolSize) nPick = nPoolSize;");
  });

  it("honors a custom include name in both the #include usage comment and generated API doc", () => {
    const source = generateSpecAbilityInclude({ includeName: "inc_custom_sa" });
    expect(source).toContain('#include "inc_custom_sa"');
  });

  it("exposes exactly the documented public API", () => {
    const source = generateSpecAbilityInclude();
    expect(source).toContain("void SA_OnSpawn(object oCreature)");
  });

  it("rolls class positions 1..3 (1-indexed), not 0..2 — regression for a confirmed off-by-one", () => {
    // GetClassByPosition/GetLevelByPosition's nClassPosition is 1-indexed
    // (1, 2, 3 — see nwscript.nss's own doc comment: "a single-class
    // creature will only have a value in nClassLocation=1"). A 0..2 loop
    // silently wastes position 0 (always CLASS_TYPE_INVALID) and misses
    // real position 3 for a genuine triple-multiclass creature, confirmed
    // live via run_live_verification against the Spec Ability Arena module.
    const source = generateSpecAbilityInclude();
    expect(source).toContain("for (p = 1; p <= 3; p++)");
    expect(source).toContain("SA_RollClass(oCreature, GetClassByPosition(p, oCreature), GetLevelByPosition(p, oCreature));");
  });
});
