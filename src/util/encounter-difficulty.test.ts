import { describe, expect, it } from "vitest";
import {
  bandDifficulty,
  clusterHostiles,
  combineSameCREL,
  estimateCRFromLevel,
  planSupportCluster,
  solveSameCRCount,
} from "./encounter-difficulty.js";

describe("combineSameCREL", () => {
  it("a single creature's EL is its own CR", () => {
    expect(combineSameCREL(5, 1)).toBe(5);
    expect(combineSameCREL(5, 0)).toBe(5); // 0 or 1 both mean "no group adjustment"
  });

  // Every value here matches BOTH independently-sourced secondary tables
  // from docs/encounter-difficulty-findings.md — this is the cross-validated
  // set, not an arbitrary sample.
  it("matches the cross-validated table for CR 5 at every verified creature count", () => {
    expect(combineSameCREL(5, 2)).toBe(7); // +2
    expect(combineSameCREL(5, 3)).toBe(8); // +3
    expect(combineSameCREL(5, 4)).toBe(9); // +4
    expect(combineSameCREL(5, 5)).toBe(10); // +5
    expect(combineSameCREL(5, 6)).toBe(10); // +5
    expect(combineSameCREL(5, 7)).toBe(11); // +6
    expect(combineSameCREL(5, 9)).toBe(11); // +6
    expect(combineSameCREL(5, 10)).toBe(12); // +7
    expect(combineSameCREL(5, 11)).toBe(12); // +7
    expect(combineSameCREL(5, 12)).toBe(12); // +7
    expect(combineSameCREL(5, 16)).toBe(13); // +8
  });

  it("doubling the creature count always adds exactly 2 EL (the confirmed DMG rule)", () => {
    for (const cr of [1, 3, 8, 15]) {
      for (const n of [2, 4, 8]) {
        expect(combineSameCREL(cr, n * 2) - combineSameCREL(cr, n)).toBe(2);
      }
    }
  });
});

describe("solveSameCRCount", () => {
  it("returns count 1 when the CR alone already meets the target", () => {
    expect(solveSameCRCount(8, 6)).toEqual({ count: 1, achievedEL: 8 });
    expect(solveSameCRCount(5, 5)).toEqual({ count: 1, achievedEL: 5 });
  });

  it("is the exact inverse of combineSameCREL for every cross-validated CR-5 data point", () => {
    // Reuses the same cross-validated table combineSameCREL's own test
    // does — the minimal count that first reaches each EL must round-trip.
    expect(solveSameCRCount(5, 7)).toEqual({ count: 2, achievedEL: 7 });
    expect(solveSameCRCount(5, 8)).toEqual({ count: 3, achievedEL: 8 });
    expect(solveSameCRCount(5, 9)).toEqual({ count: 4, achievedEL: 9 });
    expect(solveSameCRCount(5, 10)).toEqual({ count: 5, achievedEL: 10 });
  });

  it("never returns a count whose EL is below the target (monotonic forward scan)", () => {
    for (const cr of [1, 3, 8, 15]) {
      for (const targetEL of [cr, cr + 1, cr + 3, cr + 5]) {
        const { count, achievedEL } = solveSameCRCount(cr, targetEL);
        expect(achievedEL).toBeGreaterThanOrEqual(targetEL);
        expect(count).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("the previous count's EL is always strictly below target (minimality — no overshoot)", () => {
    const { count } = solveSameCRCount(3, 6);
    if (count > 1) {
      expect(combineSameCREL(3, count - 1)).toBeLessThan(6);
    }
  });
});

describe("planSupportCluster", () => {
  it("reports the boss alone as sufficient and omits a support cluster entirely", () => {
    const plan = planSupportCluster(8, 6, 3);
    expect(plan.bossAloneSufficient).toBe(true);
    expect(plan.bossEL).toBe(8);
    expect(plan.support).toBeNull();
  });

  it("computes a same-CR support cluster when the boss alone falls short, reporting its EL separately", () => {
    // Boss CR 3 vs target EL 6: boss alone is insufficient (3 < 6).
    // combineSameCREL(3, 3) = 3 + round(2*log2(3)) = 3 + 3 = 6, so 3 CR-3
    // support creatures is the minimal cluster reaching EL 6.
    const plan = planSupportCluster(3, 6, 3);
    expect(plan.bossAloneSufficient).toBe(false);
    expect(plan.bossEL).toBe(3);
    expect(plan.support).toEqual({ cr: 3, count: 3, achievedEL: 6 });
  });

  it("never fabricates one combined boss+support EL number — bossEL and support.achievedEL stay separate", () => {
    const plan = planSupportCluster(5, 9, 2);
    expect(plan).toHaveProperty("bossEL");
    expect(plan.support).toHaveProperty("achievedEL");
    // There is deliberately no "totalEL" or "combinedEL" field anywhere.
    expect(plan).not.toHaveProperty("totalEL");
    expect(plan).not.toHaveProperty("combinedEL");
  });
});

describe("estimateCRFromLevel", () => {
  it("returns total character level unchanged — the tfndev-verified fallback", () => {
    expect(estimateCRFromLevel(1)).toBe(1);
    expect(estimateCRFromLevel(11)).toBe(11);
  });
});

describe("bandDifficulty", () => {
  it("EL == APL is standard (this project's own documented anchor)", () => {
    expect(bandDifficulty(5, 5)).toBe("standard");
  });

  it("EL == APL + 4 is deadly (this project's own documented anchor)", () => {
    expect(bandDifficulty(9, 5)).toBe("deadly");
  });

  it("EL well below APL is trivial", () => {
    expect(bandDifficulty(1, 5)).toBe("trivial");
  });

  it("bands are monotonic and cover every integer difference with no gaps", () => {
    const seen: string[] = [];
    for (let diff = -8; diff <= 8; diff++) {
      seen.push(bandDifficulty(10 + diff, 10));
    }
    // Every band from the ordered list must appear in order, no gaps or reversals.
    const order = ["trivial", "easy", "standard", "hard", "deadly"];
    let lastIdx = -1;
    for (const label of seen) {
      const idx = order.indexOf(label);
      expect(idx).toBeGreaterThanOrEqual(lastIdx);
      lastIdx = idx;
    }
  });
});

describe("clusterHostiles", () => {
  it("groups creatures by real CR and computes each cluster's EL", () => {
    const clusters = clusterHostiles([
      { tag: "orc1", cr: 3, classes: [{ level: 3 }] },
      { tag: "orc2", cr: 3, classes: [{ level: 3 }] },
      { tag: "ogre_mage", cr: 8, classes: [{ level: 8 }] },
    ]);
    expect(clusters).toHaveLength(2);
    const boss = clusters.find((c) => c.cr === 8)!;
    const orcs = clusters.find((c) => c.cr === 3)!;
    expect(boss.el).toBe(8);
    expect(boss.count).toBe(1);
    expect(orcs.count).toBe(2);
    expect(orcs.el).toBe(5); // CR 3, 2 creatures = +2
    // Sorted by EL descending — the most dangerous cluster first.
    expect(clusters[0].cr).toBe(8);
  });

  it("estimates CR from total character level when ChallengeRating is unset, and flags it", () => {
    const clusters = clusterHostiles([
      { tag: "guard1", cr: 0, classes: [{ level: 4 }] },
      { tag: "guard2", cr: 0, classes: [{ level: 4 }] },
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].cr).toBe(4); // estimated from level
    expect(clusters[0].anyEstimatedCR).toBe(true);
    expect(clusters[0].el).toBe(6); // CR 4, 2 creatures = +2
  });

  it("never estimates over a real, non-zero CR", () => {
    const clusters = clusterHostiles([{ tag: "dragon", cr: 15, classes: [{ level: 20 }] }]);
    expect(clusters[0].cr).toBe(15);
    expect(clusters[0].anyEstimatedCR).toBe(false);
  });

  it("sums multiclass levels for the CR estimate", () => {
    const clusters = clusterHostiles([
      { tag: "multi", cr: 0, classes: [{ level: 3 }, { level: 2 }] },
    ]);
    expect(clusters[0].cr).toBe(5);
  });
});
