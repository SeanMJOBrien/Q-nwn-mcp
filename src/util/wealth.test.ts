import { describe, expect, it } from "vitest";
import {
  budgetBreakdown,
  expectedEnhancement,
  gearBudget,
  STARTING_GOLD_LEVEL_1,
  WEALTH_BY_LEVEL,
  wealthByLevel,
} from "./wealth.js";

describe("wealthByLevel", () => {
  // Spot-checks against D&D 3.5 DMG Table 5-1 (p.135). If these drift, the
  // table has been edited away from its source.
  it("matches the DMG table", () => {
    expect(wealthByLevel(2)).toBe(900);
    expect(wealthByLevel(3)).toBe(2_700);
    expect(wealthByLevel(5)).toBe(9_000);
    expect(wealthByLevel(10)).toBe(49_000);
    expect(wealthByLevel(20)).toBe(760_000);
  });

  it("uses the project default at level 1, which the DMG table omits", () => {
    expect(wealthByLevel(1)).toBe(STARTING_GOLD_LEVEL_1);
    expect(WEALTH_BY_LEVEL[1]).toBe(0);
  });

  it("clamps out-of-range levels rather than returning undefined", () => {
    expect(wealthByLevel(0)).toBe(STARTING_GOLD_LEVEL_1);
    expect(wealthByLevel(-5)).toBe(STARTING_GOLD_LEVEL_1);
    expect(wealthByLevel(40)).toBe(760_000);
    expect(wealthByLevel(Number.NaN)).toBe(0);
  });

  it("increases monotonically", () => {
    for (let level = 3; level <= 20; level++) {
      expect(wealthByLevel(level)).toBeGreaterThan(wealthByLevel(level - 1));
    }
  });
});

describe("gearBudget", () => {
  it("gives elites full PC wealth — the CR +1 trade", () => {
    expect(gearBudget(5, "elite")).toBe(gearBudget(5, "pc"));
  });

  it("scales rank-and-file down", () => {
    expect(gearBudget(10, "standard")).toBe(24_500);
    expect(gearBudget(10, "mook")).toBe(12_250);
  });
});

describe("expectedEnhancement", () => {
  it("keeps low levels mundane", () => {
    expect(expectedEnhancement(1)).toBe(0);
    expect(expectedEnhancement(2)).toBe(0);
  });

  it("puts +1 in the 3-5 band, matching the siege module's level-3 party", () => {
    expect(expectedEnhancement(3)).toBe(1);
    expect(expectedEnhancement(5)).toBe(1);
    expect(expectedEnhancement(6)).toBe(2);
  });

  it("never exceeds +5", () => {
    for (let level = 1; level <= 20; level++) {
      expect(expectedEnhancement(level)).toBeLessThanOrEqual(5);
    }
  });
});

describe("budgetBreakdown", () => {
  it("splits the budget across slots without inventing money", () => {
    const b = budgetBreakdown(8, "pc");
    expect(b.total).toBe(27_000);
    const summed = Object.values(b.slots).reduce((n, v) => n + v, 0);
    // Rounding per slot may drift by a gold piece or two, never more.
    expect(Math.abs(summed - b.total)).toBeLessThanOrEqual(5);
  });

  it("reports the level it actually used after clamping", () => {
    expect(budgetBreakdown(99).level).toBe(20);
  });
});
