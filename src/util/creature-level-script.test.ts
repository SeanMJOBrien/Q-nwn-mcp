import { describe, expect, it } from "vitest";
import { chooseDomains, classSpellPools, domainSpells } from "../tools/creature-forge-tools.js";
import type { ModuleIndex } from "../types/module.js";
import {
  DEFAULT_GEAR_STORES,
  generateCreatureLevelInclude,
  generateCreatureLevelWrapper,
} from "./creature-level-script.js";
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
    const src = generateCreatureLevelInclude({
      stores: ["My_Smith", "bad name!", "nw_storeweap001"],
      droppable: false,
    });
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
      [
        "classes",
        {
          columns: [],
          rows: new Map([
            [2, { SpellCaster: "1", SpellTableColumn: "Cleric" }],
            [4, { SpellCaster: "0" }],
          ]),
        },
      ],
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

describe("pinned spells, melee backup and loot log", () => {
  const src = generateCreatureLevelInclude();
  it("picks pinned spells before the random pool", () => {
    expect(src).toContain('GetLocalString(oCreature, "MCP_SA_PINNED")');
    expect(src.indexOf("MCP_SA_PINNED")).toBeLessThan(src.indexOf("int nOffset = Random(nPoolSize);"));
    expect(src).toContain('"cl_spell_pinned_" + sPin');
  });
  it("buys an unequipped melee backup for ranged weapons", () => {
    expect(src).toContain("CL_Pick(oCreature, INVENTORY_SLOT_RIGHTHAND, 5, nBackup, 0)");
    expect(src).toContain("CL_Buy(oCreature, oBackup, -1, 0)");
    expect(src).toContain('"cl_gear_melee_backup"');
  });
  it("logs one [CL_LOOT] line per creature", () => {
    expect(src).toContain('"[CL_LOOT] tag="');
    expect(src).toContain('"MCP_GEAR_LOG"');
  });
});

describe("cleric domains", () => {
  const index = {
    twodaTables: new Map([
      [
        "classes",
        {
          columns: [],
          rows: new Map([
            [2, { PickDomains: "1", Package: "2" }],
            [4, { PickDomains: "0" }],
          ]),
        },
      ],
      ["packages", { columns: [], rows: new Map([[2, { ClassID: "2", Domain1: "9", Domain2: "17" }]]) }],
      [
        "domains",
        {
          columns: [],
          rows: new Map([
            [3, { Label: "DEATH", GrantedFeat: "310", Level_4: "127", Level_5: "52" }],
            [6, { Label: "EVIL", GrantedFeat: "315", Level_1: "371", Level_3: "370", Level_5: "52" }],
            [9, { Label: "HEALING", GrantedFeat: "318", Level_2: "35", Level_5: "79" }],
            [11, { Label: "****", GrantedFeat: "****" }],
            [17, { Label: "SUN", GrantedFeat: "322", Level_2: "156", Level_7: "183" }],
          ]),
        },
      ],
    ]),
  } as unknown as ModuleIndex;

  it("defaults to the package's domains and only for classes that pick them", () => {
    const w: string[] = [];
    expect(chooseDomains(index, 2, 2, undefined, w)).toEqual([9, 17]);
    expect(chooseDomains(index, 4, 4, [3, 6], w)).toBeUndefined();
    expect(w).toEqual([]);
  });

  it("uses two valid requested domains, else warns and falls back", () => {
    const w: string[] = [];
    expect(chooseDomains(index, 2, 2, [3, 6], w)).toEqual([3, 6]);
    expect(chooseDomains(index, 2, 2, [3, 11], w)).toEqual([9, 17]);
    expect(w).toHaveLength(1);
  });

  it("lists domain spells by spell level without duplicates", () => {
    expect(domainSpells(index, [3, 6])).toEqual({ "1": [371], "3": [370], "4": [127], "5": [52] });
  });

  it("fills the domain slot first and checks domains in game", () => {
    const src = generateCreatureLevelInclude();
    expect(src).toContain('GetLocalString(oCreature, "MCP_SA_DOMAIN")');
    expect(src.indexOf("The domain slot")).toBeLessThan(src.indexOf("int nOffset = Random(nPoolSize);"));
    expect(src).toContain('"cl_domain_" + IntToString(nClass)');
    expect(src).toContain('"cl_spell_domain_" + IntToString(nClass)');
    expect(src).toContain("GetDomain(oCreature, 1, nClass)");
  });
});
