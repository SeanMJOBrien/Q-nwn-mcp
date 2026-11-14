import { describe, expect, it } from "vitest";
import { briefAreaPayload, briefDefault, briefModuleSummary, briefVerifyAll, resolveBrief } from "./brief.js";
import type { VerifyResult } from "./verify/common.js";

describe("briefDefault / resolveBrief", () => {
  it("is off with no profile, on with one, off with all", () => {
    expect(briefDefault({})).toBe(false);
    expect(briefDefault({ MCP_TOOL_PROFILE: "quests,verify" })).toBe(true);
    expect(briefDefault({ MCP_TOOL_PROFILE: "all" })).toBe(false);
  });
  it("MCP_BRIEF_RESULTS overrides the profile, the parameter overrides both", () => {
    expect(briefDefault({ MCP_BRIEF_RESULTS: "1" })).toBe(true);
    expect(briefDefault({ MCP_BRIEF_RESULTS: "0", MCP_TOOL_PROFILE: "areas" })).toBe(false);
    expect(resolveBrief(false, { MCP_BRIEF_RESULTS: "1" })).toBe(false);
    expect(resolveBrief(true, {})).toBe(true);
  });
});

describe("briefAreaPayload", () => {
  const tileGrid = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      tileGrid.push({
        col,
        row,
        walkablePercent: row === 2 ? 0 : col === 3 ? 40 : 100,
        hasWater: row === 2 && col === 0,
        groupName: row === 0 && col === 0 ? "House" : null,
        materials: { Grass: 100 },
        cornerTerrains: ["a", "b", "c", "d"],
      });
    }
  }
  const objects = Array.from({ length: 45 }, (_, i) => ({ type: "placeable", name: "Crate", tag: `crate${i}`, x: 1.234, y: 5.678 }));
  objects.push({ type: "door", name: "door1", tag: "door1", x: 10, y: 10, linkedTo: "door2" } as never);
  const full = {
    area: { resref: "a1", name: "A", tag: "A1", width: 4, height: 3, tileset: "Rural" },
    tileGrid,
    zones: [{ id: 1, tileCount: 8 }],
    features: [],
    objects,
  };

  it("draws the map north-up with one char per tile", () => {
    const b = briefAreaPayload(full);
    expect(b.map).toEqual([" 2 ~###", " 1 ...:", " 0 F..:"]);
  });
  it("groups and caps objects, keeps links, rounds positions", () => {
    const b = briefAreaPayload(full);
    const placeables = b.objects.placeables as Array<Record<string, unknown>>;
    expect(placeables).toHaveLength(40);
    expect(b.objects.placeablesNotShown).toBe(5);
    expect(placeables[0]).toEqual({ tag: "crate0", x: 1.2, y: 5.7, name: "Crate" });
    expect((b.objects.doors as Array<Record<string, unknown>>)[0]).toEqual({ tag: "door1", x: 10, y: 10, linkedTo: "door2" });
  });
  it("is much smaller than the full payload", () => {
    expect(JSON.stringify(briefAreaPayload(full)).length).toBeLessThan(JSON.stringify(full, null, 2).length / 2);
  });
});

describe("briefModuleSummary", () => {
  it("replaces long lists with counts and names", () => {
    const dialogs = Array.from({ length: 35 }, (_, i) => ({ resref: `d${i}`, entries: 3, replies: 3, usedBy: [] }));
    const b = briefModuleSummary({ moduleName: "M", dialogs, questVariables: ["a", "b"], loadWarnings: [] });
    expect(b.moduleName).toBe("M");
    expect(b.dialogCount).toBe(35);
    expect(b.dialogs).toHaveLength(30);
    expect(b.dialogsNotShown).toBe(5);
    expect(b.questVariableCount).toBe(2);
    expect("questVariables" in b).toBe(false);
  });
});

describe("briefVerifyAll", () => {
  const mk = (target: string, codes: string[], warns: string[] = []): VerifyResult => ({
    target,
    type: "creature",
    status: codes.length ? "fail" : warns.length ? "warn" : "pass",
    errors: codes.map((code) => ({ code, message: `${code} on ${target}`, fix: `fix ${code}` })),
    warnings: warns.map((code) => ({ code, message: code })),
  });

  it("shows one finding per code before repeats, most frequent first, capped", () => {
    const results = [mk("a", ["x", "y"]), mk("b", ["x"]), mk("c", ["x", "z"], ["w"]), mk("d", [])];
    const b = briefVerifyAll(results, 4);
    expect(b.shippable).toBe(false);
    expect(b.errorCount).toBe(5);
    expect(b.fixFirst.map((f) => f.code)).toEqual(["x", "y", "z", "x"]);
    expect(b.fixFirst[0]).toEqual({ target: "a", type: "creature", code: "x", message: "x on a", fix: "fix x" });
    expect(b.errorsNotShown).toBe(1);
    expect(b.warningsByCode).toEqual([{ code: "w", count: 1 }]);
  });
  it("lists one warning per code that has a repair, with its target, most frequent code first", () => {
    const w = (target: string, code: string, fix?: string): VerifyResult => ({
      target,
      type: "dialog",
      status: "warn",
      errors: [],
      warnings: [{ code, message: `${code} on ${target}`, ...(fix ? { fix } : {}) }],
    });
    const b = briefVerifyAll([w("m", "desc_empty", "set_module_description"), w("d1", "branch_ends", "add_dialog_return_links(dialog: d1)"), w("d2", "branch_ends", "x"), w("c", "no_fix")]);
    expect(b.warningsWithFix).toEqual([
      { target: "d1", type: "dialog", code: "branch_ends", message: "branch_ends on d1", fix: "add_dialog_return_links(dialog: d1)" },
      { target: "m", type: "dialog", code: "desc_empty", message: "desc_empty on m", fix: "set_module_description" },
    ]);
  });

  it("a clean module is shippable with an empty list", () => {
    const b = briefVerifyAll([mk("a", [], ["w"])]);
    expect(b.shippable).toBe(true);
    expect(b.fixFirst).toEqual([]);
    expect(b.next).toMatch(/No errors/);
  });
});
