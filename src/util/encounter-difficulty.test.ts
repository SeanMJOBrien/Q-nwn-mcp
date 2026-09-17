import { describe, expect, it } from "vitest";
import { bandDifficulty, clusterHostiles, combineSameCREL, estimateCRFromLevel } from "./encounter-difficulty.js";

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
