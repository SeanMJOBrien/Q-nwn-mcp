/**
 * Tests for the runtime creature-spec-verification include generator.
 *
 * The generated source cannot be compiled here (that needs the NWN data tree
 * and the nim toolchain — create_spec_verification does it with a probe
 * script at runtime), so these assert on the shape that makes the include
 * correct: the verify-mode gate, the SPEC_ENABLED presence check, the field
 * comparisons, and the feat lookup tables' honesty about what's unconfirmed.
 */

import { describe, expect, it } from "vitest";
import { CLASS_FEATS, generateSpecCheckInclude, RACIAL_FEATS } from "./spec-check-script.js";

describe("generateSpecCheckInclude — gating", () => {
  it("is a no-op unless MCP_VERIFY_MODE is set on the module", () => {
    const source = generateSpecCheckInclude();
    expect(source).toContain('if (!GetLocalInt(GetModule(), "MCP_VERIFY_MODE")) return;');
  });

  it("is a no-op unless the specific creature carries SPEC_ENABLED", () => {
    const source = generateSpecCheckInclude();
    expect(source).toContain('if (GetLocalInt(oCreature, "SPEC_ENABLED") != MCP_SPEC_ENABLED_FLAG) return;');
  });

  it("has no already-ran guard, so a creature can be checked more than once", () => {
    const source = generateSpecCheckInclude();
    expect(source).not.toMatch(/SPEC_CHECKED|SPEC_ALREADY_RUN|bAlreadyChecked/);
  });

  it("gates the headless self-test the same way as SPEC_VerifyCreature", () => {
    const source = generateSpecCheckInclude();
    const fn = source.slice(source.indexOf("void SPEC_SelfTestOnSpawn"));
    expect(fn).toContain('if (!GetLocalInt(GetModule(), "MCP_VERIFY_MODE")) return;');
    expect(fn).toContain('if (GetLocalInt(oCreature, "SPEC_ENABLED") != MCP_SPEC_ENABLED_FLAG) return;');
  });

  it("only levels the creature while it's under its own target level, and bounds the loop", () => {
    const source = generateSpecCheckInclude();
    expect(source).toContain("while (GetLevelByClass(nExpectClass, oCreature) < nExpectLevel && nGuard < 40)");
  });

  it("verifies after leveling, so the self-test actually checks what it just did", () => {
    const source = generateSpecCheckInclude();
    const fn = source.slice(
      source.indexOf("void SPEC_SelfTestOnSpawn"),
      source.indexOf("void SPEC_SelfTestOnSpawn") + 800,
    );
    expect(fn).toContain("SPEC_VerifyCreature(oCreature);");
  });

  it("uses the default include name in the usage comment, or a custom one", () => {
    expect(generateSpecCheckInclude()).toContain('#include "inc_spec_check"');
    expect(generateSpecCheckInclude({ includeName: "inc_spc" })).toContain('#include "inc_spc"');
  });
});

describe("generateSpecCheckInclude — field checks", () => {
  const source = generateSpecCheckInclude();

  it("compares race, appearance, level, hit dice and package against SPEC_* vars", () => {
    expect(source).toContain('GetLocalInt(oCreature, "SPEC_RACE")');
    expect(source).toContain('GetLocalInt(oCreature, "SPEC_APPEARANCE")');
    expect(source).toContain('GetLocalInt(oCreature, "SPEC_CLASS")');
    expect(source).toContain('GetLocalInt(oCreature, "SPEC_LEVEL")');
    expect(source).toContain('GetLocalInt(oCreature, "SPEC_PACKAGE")');
    expect(source).toContain("GetCreatureStartingPackage(oCreature)");
    expect(source).toContain("GetHitDice(oCreature)");
  });

  it("logs one grep-able [SPEC_FAIL] line per failed field, and [SPEC_OK] only when every check passed", () => {
    expect(source).toContain('"[SPEC_FAIL] tag=" + sTag + " field=" + sField');
    expect(source).toContain('if (bPass) WriteTimestampedLogEntry("[SPEC_OK] tag=" + sTag);');
  });

  it("only checks spells for known-spells casters (Sorcerer/Wizard from 1, Bard from 2)", () => {
    expect(source).toContain("SpecIsCasterAtLevel(nExpectClass, nExpectLevel)");
    expect(source).toContain("if (nClass == CLASS_TYPE_SORCERER || nClass == CLASS_TYPE_WIZARD)");
    expect(source).toContain("return nLevel >= 1;");
    expect(source).toContain("if (nClass == CLASS_TYPE_BARD)");
    expect(source).toContain("return nLevel >= 2;");
  });

  it("never checks spell_count for prepared-caster classes (GetKnownSpellCount is structurally 0 for them)", () => {
    // Cleric/Druid/Paladin/Ranger cast from their full class list rather than
    // a personal known-spells list -- verified via a live end-to-end run.
    expect(source).not.toContain("CLASS_TYPE_CLERIC ||");
    expect(source).not.toContain("CLASS_TYPE_PALADIN || nClass == CLASS_TYPE_RANGER");
  });

  it("sums known spells across every spell level via the real GetKnownSpellCount builtin", () => {
    expect(source).toContain("GetKnownSpellCount(oCreature, nClass, nLevel)");
  });
});

describe("generateSpecCheckInclude — feat lookup tables", () => {
  it("emits a branch for every one of the 7 standard PC races", () => {
    const source = generateSpecCheckInclude();
    for (let race = 0; race <= 6; race++) {
      expect(source).toContain(`if (nRace == ${race})`);
    }
  });

  it("emits a branch for every one of the 11 base classes by constant name", () => {
    const source = generateSpecCheckInclude();
    for (const constant of [
      "CLASS_TYPE_BARBARIAN",
      "CLASS_TYPE_BARD",
      "CLASS_TYPE_CLERIC",
      "CLASS_TYPE_DRUID",
      "CLASS_TYPE_FIGHTER",
      "CLASS_TYPE_MONK",
      "CLASS_TYPE_PALADIN",
      "CLASS_TYPE_RANGER",
      "CLASS_TYPE_ROGUE",
      "CLASS_TYPE_SORCERER",
      "CLASS_TYPE_WIZARD",
    ]) {
      expect(source).toContain(`if (nClass == ${constant})`);
    }
  });

  it("has a real, non-null representative feat for every one of the 11 base classes", () => {
    for (const feat of Object.values(CLASS_FEATS)) {
      expect(feat).not.toBeNull();
    }
  });

  it("has a real, non-null representative racial feat for all 7 standard PC races", () => {
    for (let race = 0; race <= 6; race++) {
      expect(RACIAL_FEATS[race]).not.toBeNull();
    }
  });
});
