import { describe, expect, it } from "vitest";
import { classSpellPools } from "../tools/creature-forge-tools.js";
import type { ModuleIndex } from "../types/module.js";
import { DEFAULT_GEAR_STORES, generateCreatureLevelInclude, generateCreatureLevelWrapper } from "./creature-level-script.js";
import { WEALTH_BY_LEVEL } from "./wealth.js";

describe("generateCreatureLevelInclude", () => {
  it("fills every template slot", () => {
    const src = generateCreatureLevelInclude();
    expect(src).not.toContain("%%");
    expect(src).toContain(`const string CL_STORES = "${DEFAULT_GEAR_STORES.join(",")}";`);
    expect(src).toContain("const int CL_DROPPABLE = 1;");
    expect(src).toContain(`if (nLevel == 5) return ${WEALTH_BY_LEVEL[5]};`);
    expect(src).toContain("void CL_OnSpawn(object oCreature)");
  });

  it("uses the module's named stores and drops invalid names", () => {
    const src = generateCreatureLevelInclude({ stores: ["My_Smith", "bad name!", "nw_storeweap001"], droppable: false });
    expect(src).toContain('const string CL_STORES = "my_smith,nw_storeweap001";');
    expect(src).toContain("const int CL_DROPPABLE = 0;");
  });

  it("never hands out the unspent allowance as gold", () => {
    const src = generateCreatureLevelInclude();
    expect(src).not.toMatch(/GiveGoldToCreature/);
  });

  it("wrapper runs the original spawn script before levelling", () => {
    const src = generateCreatureLevelWrapper();
    expect(src).toContain('#include "inc_cre_level"');
    expect(src.indexOf("ExecuteScript")).toBeLessThan(src.indexOf("CL_OnSpawn"));
  });
});

describe("classSpellPools", () => {
  const index = {
    twodaTables: new Map([
      ["classes", { columns: [], rows: new Map([[2, { SpellCaster: "1", SpellTableColumn: "Cleric" }], [4, { SpellCaster: "0" }]]) }],
      [
        "spells",
        {
          columns: [],
          rows: new Map([
            [1, { Label: "A", Cleric: "1", UserType: "1" }],
            [2, { Label: "B", Cleric: "1", UserType: "1" }],
            [3, { Label: "C", Cleric: "****", UserType: "1", Master: "1" }], // not on the list, even via Master
            [4, { Label: "D", Cleric: "0", UserType: "1" }],
            [5, { Label: "E", Cleric: "2", UserType: "2" }], // special ability row, not a spell
          ]),
        },
      ],
    ]),
  } as unknown as ModuleIndex;

  it("groups only the class's own spells by level, deterministically", () => {
    const pools = classSpellPools(index, 2, "seed")!;
    expect(Object.keys(pools).sort()).toEqual(["0", "1"]);
    expect([...pools["1"]].sort()).toEqual([1, 2]);
    expect(pools["0"]).toEqual([4]);
    expect(classSpellPools(index, 2, "seed")).toEqual(pools);
  });

  it("returns nothing for a non-caster", () => {
    expect(classSpellPools(index, 4, "seed")).toBeUndefined();
  });
});
