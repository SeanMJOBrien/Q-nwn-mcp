import { describe, expect, it } from "vitest";
import { blueprintWord, notFoundText } from "./blueprint-hint.js";

describe("blueprint hints", () => {
  it("finds the word worth searching for in a guessed resref", () => {
    expect(blueprintWord("plc_crate")).toBe("crate");
    expect(blueprintWord("plc_crate4")).toBe("crate");
    expect(blueprintWord("nw_plc_rock3")).toBe("rock");
    expect(blueprintWord("x2_easy_crate2.utp")).toBe("crate");
    expect(blueprintWord("x2")).toBe("");
  });

  it("names the search when no tool can run it", async () => {
    expect(await notFoundText("utp", "plc_crate")).toBe('Blueprint not found: plc_crate.utp. list_blueprints(type: "utp", pattern: "crate") finds real ones.');
  });
});
