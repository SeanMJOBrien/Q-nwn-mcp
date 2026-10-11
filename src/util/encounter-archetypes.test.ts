import { describe, expect, it } from "vitest";
import { ARCHETYPES, getArchetype } from "./encounter-archetypes.js";

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
