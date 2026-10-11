import { describe, expect, it } from "vitest";
import { ARCHETYPES, getArchetype, pickSupportCandidate } from "./encounter-archetypes.js";

describe("getArchetype", () => {
  it("finds the necromancer archetype case-insensitively", () => {
    expect(getArchetype("necromancer")).toBeDefined();
    expect(getArchetype("Necromancer")).toBeDefined();
    expect(getArchetype("NECROMANCER")).toBeDefined();
  });

  it("trims whitespace before lookup", () => {
    expect(getArchetype("  necromancer  ")).toBeDefined();
  });

  it("returns undefined for an archetype not yet in the table, rather than guessing one", () => {
    expect(getArchetype("bandit_captain")).toBeUndefined();
    expect(getArchetype("")).toBeUndefined();
  });
});

describe("necromancer archetype", () => {
  const necromancer = ARCHETYPES.necromancer;

  it("maps to the Wizard class (classes.2da row 10)", () => {
    expect(necromancer.classId).toBe(10);
  });

  it("levelForCR reuses the verified CR ~= level correlation directly", () => {
    expect(necromancer.levelForCR(1)).toBe(1);
    expect(necromancer.levelForCR(6)).toBe(6);
    expect(necromancer.levelForCR(12)).toBe(12);
  });

  it("names undead_minion as its natural support type", () => {
    expect(necromancer.naturalSupport).toBe("undead_minion");
  });

  it("surfaces the real, already-confirmed Wizard Tier-1 spell-slot caveat", () => {
    expect(necromancer.caveat).toBeDefined();
    expect(necromancer.caveat).toContain("cantrips");
  });
});

describe("pickSupportCandidate", () => {
  it("returns null for a null naturalSupport (an archetype with no minion type)", () => {
    expect(pickSupportCandidate(null, 5)).toBeNull();
  });

  it("picks the highest-CR real candidate that does not exceed the target CR", () => {
    // undead_minion candidates: skeleton (CR 0.5), zombie01 (CR 1).
    const pick = pickSupportCandidate("undead_minion", 1);
    expect(pick?.resref).toBe("nw_zombie01");
  });

  it("falls back to the lowest-CR real candidate when the target CR is below every option", () => {
    const pick = pickSupportCandidate("undead_minion", 0.1);
    expect(pick?.resref).toBe("nw_skeleton");
  });

  it("never fabricates a candidate CR that doesn't match a real blueprint", () => {
    const pick = pickSupportCandidate("undead_minion", 3);
    // Still the real zombie01 (CR 1) — the highest real option at/below 3,
    // not an invented CR-3 blueprint.
    expect(pick).toEqual({ resref: "nw_zombie01", tag: "NW_ZOMBIE01", cr: 1 });
  });

  it("returns a verified base-game resref, not a guess", () => {
    const pick = pickSupportCandidate("undead_minion", 0.5);
    expect(pick?.resref).toBe("nw_skeleton");
    expect(pick?.tag).toBe("NW_SKELETON");
  });
});
