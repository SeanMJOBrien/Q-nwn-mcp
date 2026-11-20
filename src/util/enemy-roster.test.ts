import { describe, expect, it } from "vitest";
import { challengeGroups, ENEMY_ROSTER, groupEncounterLevel, pickGroup, rosterKind } from "./enemy-roster.js";

describe("enemy roster", () => {
  it("reads kinds from plural and story words", () => {
    expect(rosterKind("bandits")).toBe("bandit");
    expect(rosterKind("Brigands")).toBe("bandit");
    expect(rosterKind("undead")).toBe("skeleton");
    expect(rosterKind("wolves")).toBe("wolf");
    expect(rosterKind("dragon")).toBeUndefined();
  });

  it("sizes a group for the party level, or fits the creature to a given count", () => {
    const g = pickGroup("bandit", 3);
    expect(g.length).toBeGreaterThanOrEqual(2);
    expect(g.length).toBeLessThanOrEqual(6);
    expect(g.every((c) => c.cr <= 3)).toBe(true);
    const two = pickGroup("bandit", 3, 2);
    expect(two).toHaveLength(2);
    expect(two[0].cr).toBe(1); // EL 3 with two creatures: CR 3 - 2 log2(2) = 1
    expect(pickGroup("skeleton", 3, 4).map((c) => c.resref)).toEqual(Array(4).fill("nw_skeleton"));
    expect(pickGroup("nothing", 3)).toEqual([]);
    // CR 1/4 goblins: six of them for a level-2 party (four CR 1/4 make CR 1)
    expect(pickGroup("goblin", 2)).toHaveLength(6);
    expect(groupEncounterLevel([0.25, 0.25, 0.25, 0.25])).toBe(1);
    expect(groupEncounterLevel([1, 1])).toBe(3);
  });

  it("reads enemy groups from a plot challenge line", () => {
    expect(challengeGroups("2 bandits, 1 trap")).toEqual([{ kind: "bandit", count: 2, word: "bandits" }]);
    expect(challengeGroups("several monsters at the gate, 3 orcs").map((g) => g.kind)).toEqual(["ogre", "orc"]);
    expect(challengeGroups("a pit trap")).toEqual([]);
  });

  it("every kind has creatures", () => {
    for (const [k, list] of Object.entries(ENEMY_ROSTER)) expect(list.length, k).toBeGreaterThan(0);
  });
});
