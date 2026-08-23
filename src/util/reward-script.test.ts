/**
 * Tests for the co-op reward include generator.
 *
 * The generated source cannot be compiled here (that needs the NWN data tree
 * and the nim toolchain — create_reward_system does it with a probe script at
 * runtime), so these assert on the two things that make the include correct:
 * the distribution shape for each policy, and the class dispatch table.
 */

import { describe, expect, it } from "vitest";
import {
  BASE_CLASS_TYPES,
  generateRewardInclude,
  POLICY_CODES,
  validateRewardOptions,
} from "./reward-script.js";

describe("generateRewardInclude — policy", () => {
  it("defaults to FULL so every player receives 100% of every reward", () => {
    const source = generateRewardInclude();
    expect(source).toContain(`int COOP_POLICY        = ${POLICY_CODES.full};`);
    expect(source).toContain("int COOP_SHARE_PERCENT = 100;");
  });

  it("bakes in the requested policy and share", () => {
    const source = generateRewardInclude({ policy: "split", sharePercent: 75 });
    expect(source).toContain(`int COOP_POLICY        = ${POLICY_CODES.split};`);
    expect(source).toContain("int COOP_SHARE_PERCENT = 75;");
  });

  it("divides by party size only under SPLIT", () => {
    // The division is guarded by a policy test, so the same generated source
    // serves every policy — the guard is what must be present.
    const source = generateRewardInclude();
    expect(source).toContain("if (COOP_POLICY == COOP_POLICY_SPLIT) nEach = nXP / CoopPartySize(oPC);");
    expect(source).toContain("if (COOP_POLICY == COOP_POLICY_SPLIT) nEach = nGold / CoopPartySize(oPC);");
  });

  it("walks PCs only, so henchmen never absorb a share", () => {
    const source = generateRewardInclude();
    expect(source).toContain("GetFirstFactionMember(oPC, TRUE)");
    expect(source).toContain("GetNextFactionMember(oPC, TRUE)");
    expect(source).not.toContain("GetFirstFactionMember(oPC, FALSE)");
  });

  it("never rounds a positive reward down to nothing", () => {
    const source = generateRewardInclude({ sharePercent: 1 });
    expect(source).toContain("if (nResult < 1) nResult = 1;");
  });

  it("guards CoopPartySize against dividing by zero", () => {
    expect(generateRewardInclude()).toContain("if (nCount < 1) nCount = 1;");
  });
});

describe("generateRewardInclude — class items", () => {
  const tiers = [
    {
      tier: "boss",
      items: { fighter: "it_bosssword", wizard: "it_bossrobe", cleric: "it_bossmace" },
      fallback: "it_bossring",
    },
  ];

  it("emits a dispatch branch per class using the NWScript constant", () => {
    const source = generateRewardInclude({ classItems: tiers });
    expect(source).toContain('if (nClass == CLASS_TYPE_FIGHTER) return "it_bosssword";');
    expect(source).toContain('if (nClass == CLASS_TYPE_WIZARD) return "it_bossrobe";');
    expect(source).toContain('if (nClass == CLASS_TYPE_CLERIC) return "it_bossmace";');
  });

  it("falls back to the tier default for classes with no entry", () => {
    expect(generateRewardInclude({ classItems: tiers })).toContain('return "it_bossring";');
  });

  it("returns empty string for a tier with no fallback, so callers give nothing", () => {
    const source = generateRewardInclude({
      classItems: [{ tier: "side", items: { rogue: "it_dagger" } }],
    });
    expect(source).toContain('return "";');
  });

  it("resolves each party member's own class, not the speaker's", () => {
    // This is the whole point of the feature: a four-player party walks away
    // with four different items, not four copies of the speaker's.
    const source = generateRewardInclude({ classItems: tiers });
    expect(source).toContain("string sResRef = CoopClassItem(oMember, sTier);");
  });

  it("picks the highest base class so multiclass PCs get sensible gear", () => {
    const source = generateRewardInclude();
    expect(source).toContain("int CoopPrimaryClass(object oPC)");
    expect(source).toContain("GetLevelByClass(nClass, oPC)");
    expect(source).toContain("for (nClass = 0; nClass <= 10; nClass++)");
  });

  it("emits a stub lookup when no tiers are configured", () => {
    const source = generateRewardInclude();
    expect(source).toContain("string CoopClassItem(object oPC, string sTier)");
    expect(source).not.toContain("CLASS_TYPE_FIGHTER");
  });

  it("names the real include in the usage comment", () => {
    // A custom resref with the default name in the comment sends every caller
    // to a file that does not exist.
    expect(generateRewardInclude({ includeName: "inc_loot" })).toContain('#include "inc_loot"');
    expect(generateRewardInclude()).toContain('#include "inc_reward"');
  });

  it("exposes all eleven base classes", () => {
    expect(Object.keys(BASE_CLASS_TYPES)).toHaveLength(11);
    expect(BASE_CLASS_TYPES.wizard).toBe(10);
    expect(BASE_CLASS_TYPES.barbarian).toBe(0);
  });
});

describe("validateRewardOptions", () => {
  it("accepts the defaults", () => {
    expect(validateRewardOptions({})).toEqual([]);
  });

  it("rejects a share percentage outside 1-100", () => {
    expect(validateRewardOptions({ sharePercent: 0 })).toHaveLength(1);
    expect(validateRewardOptions({ sharePercent: 150 })).toHaveLength(1);
    expect(validateRewardOptions({ sharePercent: 100 })).toEqual([]);
  });

  it("rejects an unknown class name rather than silently dropping it", () => {
    const issues = validateRewardOptions({
      classItems: [{ tier: "boss", items: { warlock: "it_pact" } }],
    });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("warlock");
  });

  it("rejects a resref longer than NWN's 16-character field", () => {
    const issues = validateRewardOptions({
      classItems: [{ tier: "boss", items: { fighter: "it_a_very_long_resref_name" } }],
    });
    expect(issues.some((i) => i.message.includes("16"))).toBe(true);
  });

  it("rejects a tier that could never hand anything out", () => {
    const issues = validateRewardOptions({ classItems: [{ tier: "empty", items: {} }] });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("no items and no fallback");
  });

  it("rejects duplicate tier names, since only the first would match", () => {
    const issues = validateRewardOptions({
      classItems: [
        { tier: "boss", items: { fighter: "it_a" } },
        { tier: "boss", items: { wizard: "it_b" } },
      ],
    });
    expect(issues.some((i) => i.message.includes("defined twice"))).toBe(true);
  });
});
