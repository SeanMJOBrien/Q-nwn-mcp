import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import { aggregateCatalog, levelBand, querySamples, summarizeCreature, type CatalogLookups } from "./creature-catalog.js";

const look: CatalogLookups = {
  raceLabel: (n) => (n === 19 ? "Undead" : `Race${n}`),
  className: (n) => ({ 4: "Fighter", 2: "Cleric", 19: "Undead" })[n] ?? `c${n}`,
  isPlayerClass: (n) => n === 4 || n === 2,
  baseItemLabel: (n) => ({ 1: "Longsword", 2: "LargeShield" })[n] ?? `i${n}`,
  itemBaseItem: (r) => ({ sword: 1, shield: 2 })[r],
};

const f = (v: number, t = "int") => ({ type: t, value: v });
const doc = (o: { race: number; cls: number; level: number; cr: number; hp: number; vars?: string[]; equip?: Array<[number, string]> }): GffObj =>
  ({
    FirstName: { type: "cexolocstring", value: { "0": "Secret Name" } },
    Race: f(o.race, "byte"),
    ChallengeRating: f(o.cr, "float"),
    MaxHitPoints: f(o.hp, "short"),
    Str: f(14), Dex: f(12), Con: f(13), Int: f(10), Wis: f(10), Cha: f(8),
    ClassList: { type: "list", value: [{ Class: f(o.cls), ClassLevel: f(o.level, "short") }] },
    FeatList: { type: "list", value: [{ Feat: f(1) }, { Feat: f(2) }] },
    SkillList: { type: "list", value: [{ Rank: f(2, "byte") }] },
    VarTable: { type: "list", value: (o.vars ?? []).map((n, i) => ({ __struct_id: i, Name: { type: "cexostring", value: n }, Type: f(1, "dword"), Value: f(1) })) },
    Equip_ItemList: { type: "list", value: (o.equip ?? []).map(([mask, res]) => ({ __struct_id: mask, EquippedRes: { type: "resref", value: res } })) },
  }) as unknown as GffObj;

describe("creature catalog", () => {
  it("levelBand groups levels", () => {
    expect([1, 4, 5, 12, 17, 30].map(levelBand)).toEqual(["1-4", "1-4", "5-8", "9-12", "17-20", "21+"]);
  });
  it("summarises a creature: type, class, role, equipment base items", () => {
    const s = summarizeCreature(doc({ race: 6, cls: 4, level: 7, cr: 7, hp: 70, vars: ["boss"], equip: [[16, "sword"], [32, "shield"]] }), "x", look);
    expect(s).toMatchObject({ type: "player-race", primaryClass: "Fighter", level: 7, role: "boss", playerClass: true, hasShield: true, feats: 2, skillRanks: 2 });
    expect(s.equipment).toEqual([{ slot: "righthand", baseItem: "Longsword" }, { slot: "lefthand", baseItem: "LargeShield" }]);
    expect(summarizeCreature(doc({ race: 19, cls: 19, level: 3, cr: 2, hp: 20 }), "u", look)).toMatchObject({ type: "undead", playerClass: false });
  });
  it("aggregates into categories with ranges, no names, and a build recipe for player classes only", () => {
    const ds = [
      summarizeCreature(doc({ race: 6, cls: 4, level: 5, cr: 5, hp: 50 }), "a", look),
      summarizeCreature(doc({ race: 6, cls: 4, level: 7, cr: 7, hp: 70 }), "b", look),
      summarizeCreature(doc({ race: 19, cls: 19, level: 3, cr: 2, hp: 20 }), "c", look),
    ];
    const cats = aggregateCatalog(ds, (n) => ({ fighter: 4, undead: 19 })[n]);
    expect(cats).toHaveLength(2);
    const fighter = cats.find((c) => c.class === "fighter");
    expect(fighter).toMatchObject({ count: 2, levelBand: "5-8", cr: { min: 5, median: 6, max: 7 }, hp: { median: 60 } });
    expect(fighter?.buildWith).toMatchObject({ tool: "build_key_npc", args: { classId: 4, level: 6 } });
    expect(cats.find((c) => c.type === "undead")?.buildWith.tool).toBe("place_creature");
    expect(JSON.stringify(cats)).not.toContain("Secret Name");
  });
  it("querySamples finds the nearest CR and filters by type and class", () => {
    const cats = aggregateCatalog(
      [5, 9, 13].map((l) => summarizeCreature(doc({ race: 6, cls: 4, level: l, cr: l, hp: l * 10 }), `f${l}`, look)),
      () => 4,
    );
    expect(querySamples(cats, { cr: 9, limit: 1 })[0].levelBand).toBe("9-12");
    expect(querySamples(cats, { class: "cleric" })).toEqual([]);
    expect(querySamples(cats, { type: "player-race", level: 13 })[0].levelBand).toBe("13-16");
  });
});
