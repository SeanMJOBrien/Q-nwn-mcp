import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import {
  aggregateTreasure,
  fitLevel,
  itemTier,
  queryTreasureCategories,
  queryTreasureItems,
  summarizeItem,
  treasureGroup,
  type TreasureLookups,
} from "./treasure-catalog.js";

const look: TreasureLookups = {
  baseItemLabel: (n) => ({ 1: "Longsword", 16: "Armor", 52: "Ring", 49: "Potions" })[n] ?? `item${n}`,
  baseItemSlots: (n) => (n === 1 ? 0x30 : n === 52 ? 0x180 : 0),
  propName: (n) => ({ 6: "Enhancement", 16: "Damage", 0: "Ability" })[n] ?? `prop${n}`,
};

function item(base: number, cost: number, props: Array<[number, number]> = [], extra: GffObj = {}): GffObj {
  return {
    BaseItem: { type: "int", value: base },
    Cost: { type: "dword", value: cost },
    AddCost: { type: "dword", value: 0 },
    Plot: { type: "byte", value: 0 },
    StackSize: { type: "word", value: 1 },
    Tag: { type: "cexostring", value: "T" },
    LocalizedName: { type: "cexolocstring", value: { "0": "Sample" } },
    PropertiesList: {
      type: "list",
      value: props.map(([id, v]) => ({
        PropertyName: { type: "word", value: id },
        Subtype: { type: "word", value: 0 },
        CostTable: { type: "byte", value: 2 },
        CostValue: { type: "word", value: v },
      })),
    },
    ...extra,
  } as GffObj;
}

describe("treasure catalog", () => {
  it("tiers by value and fits a level by a third of the level's wealth", () => {
    expect(itemTier(100)).toBe(1);
    expect(itemTier(175)).toBe(2);
    expect(itemTier(2000)).toBe(3);
    expect(itemTier(7000)).toBe(4);
    expect(itemTier(16000)).toBe(5);
    expect(fitLevel(50)).toBe(1);
    expect(fitLevel(1648)).toBe(4); // a +1 sword
    expect(fitLevel(10_000_000)).toBe(20);
  });

  it("groups by base item label and slots", () => {
    expect(treasureGroup("Armor", 0)).toBe("armor");
    expect(treasureGroup("Large Shield", 0)).toBe("shield");
    expect(treasureGroup("Longsword", 0x30)).toBe("weapon");
    expect(treasureGroup("Ring", 0x180)).toBe("ring");
    expect(treasureGroup("Spell Scroll", 0)).toBe("scroll");
    expect(treasureGroup("Whatever", 0)).toBe("misc");
  });

  it("summarises an item and reads its enhancement bonus", () => {
    const s = summarizeItem(item(1, 1648, [[6, 1], [16, 3]]), "sword1", look);
    expect(s).toMatchObject({ group: "weapon", cost: 1648, tier: 2, level: 4, enchant: 1, name: "Sample" });
    expect(s.props.map((p) => p.name)).toEqual(["Enhancement", "Damage"]);
  });

  it("aggregates by kind and tier, leaves out plot and free items, and ranks by level", () => {
    const items = [
      summarizeItem(item(1, 1648, [[6, 1]]), "a", look),
      summarizeItem(item(1, 1700, [[6, 1]]), "b", look),
      summarizeItem(item(1, 9000, [[6, 3]]), "c", look),
      summarizeItem(item(1, 0), "free", look),
      summarizeItem(item(1, 500, [], { Plot: { type: "byte", value: 1 } }), "plot", look),
    ];
    const cats = aggregateTreasure(items);
    expect(cats).toHaveLength(2);
    const t2 = cats.find((c) => c.tier === 2);
    expect(t2).toMatchObject({ group: "weapon", count: 2 });
    expect(t2?.cost).toEqual({ min: 1648, median: 1674, max: 1700 });
    expect(t2?.enchant).toEqual({ min: 1, median: 1, max: 1 });
    const near4 = queryTreasureCategories(cats, { level: 4 });
    expect(near4[0].tier).toBe(2);
    expect(queryTreasureCategories(cats, { level: 12, property: "enhance" })[0].tier).toBe(4);
    expect(queryTreasureCategories(cats, { group: "ring" })).toHaveLength(0);
    const picks = queryTreasureItems(items, { level: 4, limit: 2 });
    expect(picks.map((p) => p.resref)).toEqual(["a", "b"]);
  });
});
