import { describe, expect, it } from "vitest";
import { factionWarning, parseFaction } from "./placement-hints.js";

describe("placement hints", () => {
  it("parses faction names and ids", () => {
    expect(parseFaction("Hostile")).toBe(1);
    expect(parseFaction("commoner")).toBe(2);
    expect(parseFaction("4")).toBe(4);
    expect(parseFaction("orcs")).toBeUndefined();
    expect(parseFaction(undefined)).toBeUndefined();
  });
  it("warns only about the player faction and names the fix", () => {
    expect(factionWarning(0)).toContain("hostile");
    expect(factionWarning(undefined)).toBeTruthy();
    expect(factionWarning(1)).toBeUndefined();
    expect(factionWarning(2)).toBeUndefined();
  });
});
