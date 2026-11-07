import { describe, expect, it } from "vitest";
import type { ModuleIndex } from "../types/module.js";
import { type FeatCheckState, featLegality, packageFeatOrder } from "./feat-legality.js";

function table(columns: string[], rows: Array<[number, Record<string, string>]>) {
  return { columns, rows: new Map(rows) };
}

function makeIndex(): ModuleIndex {
  const twodaTables = new Map();
  twodaTables.set(
    "feat",
    table(
      ["FEAT", "ALLCLASSESCANUSE", "PREREQFEAT1", "MINSTR", "MINATTACKBONUS", "OrReqFeat0", "OrReqFeat1", "REQSKILL", "ReqSkillMinRanks", "MinLevel", "MinLevelClass", "PreReqEpic"],
      [
        [28, { FEAT: "1", ALLCLASSESCANUSE: "1", MINSTR: "13" }], // Power Attack
        [6, { FEAT: "1", ALLCLASSESCANUSE: "1", PREREQFEAT1: "28" }], // Cleave
        [68, { FEAT: "1", ALLCLASSESCANUSE: "0", MINATTACKBONUS: "8" }], // Improved Critical
        [50, { FEAT: "1", ALLCLASSESCANUSE: "1", OrReqFeat0: "1", OrReqFeat1: "2" }],
        [60, { FEAT: "1", ALLCLASSESCANUSE: "1", REQSKILL: "5", ReqSkillMinRanks: "4" }],
        [70, { FEAT: "1", ALLCLASSESCANUSE: "0", MinLevel: "4", MinLevelClass: "4" }],
        [80, { FEAT: "1", ALLCLASSESCANUSE: "1", PreReqEpic: "1" }],
        [90, { FEAT: "****", ALLCLASSESCANUSE: "1" }], // retired row
      ],
    ),
  );
  twodaTables.set("packages", table(["FeatPref2DA"], [[4, { FeatPref2DA: "PACKFT_TEST" }]]));
  twodaTables.set("packft_test", table(["FeatIndex"], [[1, { FeatIndex: "6" }], [0, { FeatIndex: "28" }]]));
  return { twodaTables } as unknown as ModuleIndex;
}

function state(overrides: Partial<FeatCheckState> = {}): FeatCheckState {
  return {
    level: 1,
    classId: 4,
    classLevel: 1,
    bab: 1,
    abilities: { str: 15, dex: 13, con: 14, int: 10, wis: 12, cha: 8 },
    featIds: new Set(),
    skillRanks: new Map(),
    fortSave: 4,
    maxSpellLevel: 0,
    ...overrides,
  };
}

describe("featLegality", () => {
  const index = makeIndex();
  const fighterAccess = new Map([
    [68, 1],
    [70, 2],
  ]);

  it("requires PREREQFEAT1 (Cleave needs Power Attack)", () => {
    expect(featLegality(index, 6, state(), "generic", fighterAccess)).toContain("PREREQFEAT1 28 missing");
    expect(featLegality(index, 6, state({ featIds: new Set([28]) }), "generic", fighterAccess)).toEqual([]);
  });

  it("checks ability minimums and BAB", () => {
    expect(featLegality(index, 28, state({ abilities: { ...state().abilities, str: 12 } }), "generic", fighterAccess)).toEqual(["str 12 < 13"]);
    expect(featLegality(index, 68, state({ bab: 1 }), "bonus", fighterAccess)).toEqual(["BAB 1 < 8"]);
  });

  it("checks OR requirements, skill ranks, class-level minimums and epic", () => {
    expect(featLegality(index, 50, state(), "generic", fighterAccess)).toEqual(["needs one of 1,2"]);
    expect(featLegality(index, 50, state({ featIds: new Set([2]) }), "generic", fighterAccess)).toEqual([]);
    expect(featLegality(index, 60, state({ skillRanks: new Map([[5, 3]]) }), "generic", fighterAccess)).toEqual(["skill 5 ranks 3 < 4"]);
    expect(featLegality(index, 70, state(), "bonus", fighterAccess)).toEqual(["level 1 < 4"]);
    expect(featLegality(index, 80, state(), "generic", fighterAccess)).toEqual(["epic only"]);
  });

  it("enforces class access per slot type and rejects retired rows", () => {
    expect(featLegality(index, 70, state({ level: 4, classLevel: 4 }), "generic", fighterAccess)).toEqual([
      "class can't take it in a general slot",
    ]);
    expect(featLegality(index, 28, state(), "bonus", fighterAccess)).toEqual(["not a class bonus feat"]);
    expect(featLegality(index, 90, state(), "generic", fighterAccess)).toEqual(["retired row"]);
  });

  it("reads the package feat order by row index", () => {
    expect(packageFeatOrder(index, 4)).toEqual([28, 6]);
  });
});
