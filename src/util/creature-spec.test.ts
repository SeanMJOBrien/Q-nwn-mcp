import { describe, expect, it } from "vitest";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import {
  matchRow,
  namedRows,
  normName,
  parseAlignment,
  resolveColor,
  resolveCreatureSpec,
  resolveItemProperty,
} from "./creature-spec.js";

function table(rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns: Object.keys(rows[0]?.[1] ?? {}), rows: new Map(rows) };
}

/** A small module index: just the 2DAs and TLK lines the resolver reads. */
function makeIndex(): ModuleIndex {
  const tlk = new Map<number, string>([
    [1, "Human"],
    [2, "Fighter"],
    [3, "Wizard"],
    [10, "Power Attack"],
    [11, "Cleave"],
    [12, "Weapon Focus (Bastard Sword)"],
    [13, "Weapon Proficiency (exotic)"],
    [20, "Attack Bonus"],
    [21, "Enhancement Bonus"],
    [22, "Ability Bonus"],
    [23, "Strength"],
    [30, "Bastard Sword"],
    [31, "Large Shield"],
    [40, "Default Fighter"],
    [41, "Fighter, Gladiator"],
  ]);
  const twoda = new Map<string, TwoDATable>([
    ["racialtypes", table([[6, { Name: "1", Label: "Human", FeatsTable: "****" }]])],
    [
      "classes",
      table([
        [4, { Name: "2", Label: "Fighter", SpellCaster: "0", FeatsTable: "****", PickDomains: "0", PickSchool: "0" }],
        [10, { Name: "3", Label: "Wizard", SpellCaster: "1", FeatsTable: "****", PickDomains: "0", PickSchool: "1" }],
      ]),
    ],
    [
      "feat",
      table([
        [28, { FEAT: "10", LABEL: "PowerAtk", PREREQFEAT1: "****", PREREQFEAT2: "****" }],
        [6, { FEAT: "11", LABEL: "Cleave", PREREQFEAT1: "28", PREREQFEAT2: "****" }],
        [123, { FEAT: "12", LABEL: "WeapFocBSw", PREREQFEAT1: "44", PREREQFEAT2: "****" }],
        [44, { FEAT: "13", LABEL: "WeapProfExotic", PREREQFEAT1: "****", PREREQFEAT2: "****" }],
      ]),
    ],
    [
      "packages",
      table([
        [4, { Name: "40", Label: "Fighter", ClassID: "4", FeatPref2DA: "****" }],
        [25, { Name: "41", Label: "Fighter_Gladiator", ClassID: "4", FeatPref2DA: "****" }],
      ]),
    ],
    [
      "baseitems",
      table([
        [3, { Name: "30", label: "bastardsword", ReqFeat0: "44", EquipableSlots: "0x1c030", WeaponWield: "****" }],
        [56, { Name: "31", label: "largeshield", ReqFeat0: "32", EquipableSlots: "0x20", WeaponWield: "****" }],
      ]),
    ],
    [
      "itempropdef",
      table([
        [56, { Name: "20", Label: "AttackBonus", SubTypeResRef: "****", CostTableResRef: "2" }],
        [6, { Name: "21", Label: "Enhancement", SubTypeResRef: "****", CostTableResRef: "2" }],
        [0, { Name: "22", Label: "Ability", SubTypeResRef: "IPRP_ABILITIES", CostTableResRef: "1" }],
      ]),
    ],
    [
      "iprp_costtable",
      table([
        [1, { Name: "IPRP_BONUSCOST", Label: "Bonus" }],
        [2, { Name: "IPRP_MELEECOST", Label: "Melee" }],
      ]),
    ],
    ["iprp_meleecost", table([[1, { Name: "****", Label: "1" }], [2, { Name: "****", Label: "2" }]])],
    ["iprp_bonuscost", table([[1, { Name: "****", Label: "1" }], [2, { Name: "****", Label: "2" }]])],
    ["iprp_abilities", table([[0, { Name: "23", Label: "STR" }]])],
    ["phenotype", table([[0, { Label: "Normal" }], [2, { Label: "Large" }]])],
  ]);
  return { twodaTables: twoda, baseTlk: tlk, customTlk: null, parsedGff: new Map(), resources: new Map() } as unknown as ModuleIndex;
}

const colorNames = { hair: { brown: 1 }, skin: { "lightly tanned": 2 }, metal: { copper: 17 }, cloth: { red: 37 } };

describe("creature spec: names", () => {
  it("normalizes names for matching", () => {
    expect(normName("Weapon Focus (Bastard Sword)")).toBe("weapon focus bastard sword");
    expect(normName("  Half-Orc ")).toBe("half orc");
  });

  it("matches by display name, label or row number, and suggests near names", () => {
    const rows = namedRows(makeIndex(), "feat", "FEAT", "LABEL");
    expect(matchRow(rows, "power attack")).toMatchObject({ row: { id: 28 } });
    expect(matchRow(rows, "PowerAtk")).toMatchObject({ row: { id: 28 } });
    expect(matchRow(rows, 6)).toMatchObject({ row: { id: 6 } });
    const miss = matchRow(rows, "Cleve", "feat");
    expect("error" in miss && miss.error).toContain('did you mean "Cleave"');
  });

  it("suggests a multi-word name from one of its words", () => {
    const rows = namedRows(makeIndex(), "packages", "Name", "Label");
    const miss = matchRow(rows, "Gladiatr", "package");
    expect("error" in miss && miss.error).toContain("Fighter, Gladiator");
  });

  it("reads colours by palette number or chart name, and refuses unknown names", () => {
    expect(resolveColor(4, "hair", colorNames)).toEqual({ index: 4, how: "4" });
    expect(resolveColor("Brown", "hair", colorNames)).toMatchObject({ index: 1 });
    expect(resolveColor("red", "leather", colorNames)).toMatchObject({ index: 37 }); // leather shares the cloth chart
    expect(resolveColor(200, "hair", colorNames)).toHaveProperty("error");
    expect(resolveColor("chartreuse", "hair", colorNames)).toHaveProperty("error");
    expect(resolveColor("red", "tattoo", colorNames)).toHaveProperty("error"); // no tattoo chart: numbers only
  });

  it("parses alignments", () => {
    expect(parseAlignment("Lawful Good")).toEqual({ lawfulChaotic: 85, goodEvil: 85 });
    expect(parseAlignment("true neutral")).toEqual({ lawfulChaotic: 50, goodEvil: 50 });
    expect(parseAlignment("chaotic evil")).toEqual({ lawfulChaotic: 15, goodEvil: 15 });
    expect(parseAlignment("sort of nice")).toBeUndefined();
  });

  it("reads item properties in words: property, subtype and value", () => {
    const index = makeIndex();
    expect(resolveItemProperty(index, "attack bonus +1")).toMatchObject({ propertyName: 56, costTable: 2, costValue: 1 });
    expect(resolveItemProperty(index, "enhancement bonus +2")).toMatchObject({ propertyName: 6, costValue: 2 });
    expect(resolveItemProperty(index, "ability bonus strength +2")).toMatchObject({ propertyName: 0, subType: 0, costTable: 1, costValue: 2 });
    expect(resolveItemProperty(index, "attack bonus")).toHaveProperty("error"); // needs a value
    expect(resolveItemProperty(index, "attak bonus +1")).toHaveProperty("error");
  });
});

describe("creature spec: resolve", () => {
  const base = { resref: "seamus", name: "Seamus", role: "npc" as const, race: "human", gender: "male" as const, class: "fighter", level: 6 };

  it("adds prerequisites in front of what needs them, and a weapon's proficiency", () => {
    const res = resolveCreatureSpec(
      makeIndex(),
      { ...base, build: "fixed", feats: ["Cleave", "Weapon Focus (Bastard Sword)"], gear: { weapon: { base: "bastard sword", properties: ["attack bonus +1"] } } },
      { armorTemplates: [], colorNames },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const f = res.creature.feats;
    expect(f.indexOf(28)).toBeLessThan(f.indexOf(6)); // Power Attack before Cleave
    expect(f.indexOf(44)).toBeLessThan(f.indexOf(123)); // Exotic proficiency before Weapon Focus
    expect(res.creature.addedFeats.map((a) => a.feat).sort()).toEqual([28, 44]);
    expect(res.creature.gear[0]).toMatchObject({ baseItem: 3, name: "Bastard Sword +1", slotMask: 16 });
  });

  it("refuses the whole spec with every bad field named", () => {
    const res = resolveCreatureSpec(
      makeIndex(),
      { ...base, class: "fightr", feats: ["Cleve"], package: "Gladiatr", look: { hair: "chartreuse" }, gear: { armor: { base: "chain" } } },
      { armorTemplates: [], colorNames },
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.map((e) => e.field).sort()).toEqual(["class", "feats[0]", "gear.armor.base", "look.hair", "package"]);
  });

  it("picks an armour template by name, and a named package of the class", () => {
    const res = resolveCreatureSpec(
      makeIndex(),
      { ...base, package: "Fighter, Gladiator", gear: { armor: { base: "chainmail", color: "copper" }, weapon: { base: "bastard sword" } } },
      { armorTemplates: [{ resref: "nw_aarcl003", name: "Scale Mail", ac: 4 }, { resref: "nw_aarcl004", name: "Chainmail", ac: 5 }], colorNames },
    );
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.creature.packageId).toBe(25);
    expect(res.creature.gear.find((g) => g.slot === "armor")).toMatchObject({ template: "nw_aarcl004", armorAC: 5, colors: { Metal1Color: 17, Metal2Color: 17 } });
  });

  it("refuses a fixed build for a caster, recruit lines on a non-companion, and a hostile companion", () => {
    const res = resolveCreatureSpec(
      makeIndex(),
      { ...base, class: "wizard", build: "fixed", companion: { introduction: "a", backstory: "b" } },
      { armorTemplates: [], colorNames },
    );
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.map((e) => e.field).sort()).toEqual(["build", "companion"]);
    const hostile = resolveCreatureSpec(
      makeIndex(),
      { ...base, role: "companion", faction: "hostile", companion: { introduction: "a", backstory: "b" } },
      { armorTemplates: [], colorNames },
    );
    expect(!hostile.ok && hostile.errors.map((e) => e.field)).toEqual(["faction"]);
  });
});
