import { describe, expect, it } from "vitest";
import type { GffObj } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { findStoryDefects } from "./story-consequences.js";

const str = (v: string) => ({ type: "cexostring", value: v });
const res = (v: string) => ({ type: "resref", value: v });
const num = (v: number) => ({ type: "word", value: v });
const loc = (v: string) => ({ type: "cexolocstring", value: { "0": v } });
const list = (v: unknown[]) => ({ type: "list", value: v });

const journal = (entries: Array<[number, string]>) =>
  ({ Categories: list([{ Tag: str("q_salt"), Name: loc("Salt"), EntryList: list(entries.map(([id, t]) => ({ ID: { type: "dword", value: id }, Text: loc(t), End: { type: "byte", value: 0 } }))) }]) }) as unknown as GffObj;

const dialog = (nodes: Array<{ script?: string; params?: Record<string, string>; cond?: Record<string, string> }>) => {
  const kv = (o: Record<string, string> | undefined) => list(Object.entries(o ?? {}).map(([k, v], i) => ({ __struct_id: i, Key: str(k), Value: str(v) })));
  return {
    StartingList: list([{ Index: { type: "dword", value: 0 }, Active: res(""), ConditionParams: kv(nodes[0]?.cond) }]),
    EntryList: list(nodes.map((n) => ({ Text: loc("x"), Script: res(n.script ?? ""), ActionParams: kv(n.params), RepliesList: list([]), Comment: str(""), Quest: str("") }))),
    ReplyList: list([]),
  } as unknown as GffObj;
};

function idx(over: { gff?: Record<string, GffObj>; areas?: string[]; items?: Array<{ resref: string; tag: string; name: string }> }): ModuleIndex {
  const parsedGff = new Map<string, GffObj>(Object.entries(over.gff ?? {}));
  const resources = new Map<string, { resref: string; extension: string; filePath: string; sizeBytes: number }>();
  for (const it of over.items ?? []) {
    parsedGff.set(`${it.resref}.uti`, { Tag: str(it.tag), LocalizedName: loc(it.name) } as unknown as GffObj);
    resources.set(`${it.resref}.uti`, { resref: it.resref, extension: "uti", filePath: "", sizeBytes: 1 });
  }
  return { parsedGff, resources, areas: new Map((over.areas ?? []).map((a) => [a, {}])) } as unknown as ModuleIndex;
}

describe("journal_advance_on_enter (#43)", () => {
  const are = (script: string) => ({ OnEnter: res(script) }) as unknown as GffObj;
  it("flags an area OnEnter that advances a stage that is not about arriving, and lets an arrival entry pass", () => {
    const src = new Map([["a_enter", 'void main(){ AddJournalQuestEntry("q_salt", 2, GetEnteringObject()); AddJournalQuestEntry("q_salt", 3, GetEnteringObject()); }']]);
    const j = journal([[2, "The ledger names who paid for the raids."], [3, "I've reached the Salt Road Straits."]]);
    const out = findStoryDefects(idx({ gff: { "area1.are": are("a_enter") }, areas: ["area1"] }), src, j);
    const flagged = out.filter((d) => d.code === "journal_advance_on_enter");
    expect(flagged).toHaveLength(1);
    expect(flagged[0].message).toContain("entry 2");
  });
  it("ignores the builder's own explore wiring (q_onenter)", () => {
    const src = new Map([["q_onenter", 'AddJournalQuestEntry("q_salt", 2, o);']]);
    expect(findStoryDefects(idx({ gff: { "area1.are": are("q_onenter") }, areas: ["area1"] }), src, journal([[2, "Nothing about arriving."]]))).toEqual([]);
  });
});

describe("payoff items (#42)", () => {
  const items = [{ resref: "aff_cask", tag: "AFF_SALTCSK", name: "Salt Casks" }];
  it("flags an item the journal names that nothing asks for, and passes once a dialog takes it", () => {
    const j = journal([[7, "I should carry the Salt Casks back to Stonewake."]]);
    const bare = findStoryDefects(idx({ items }), new Map(), j);
    expect(bare.map((d) => d.code)).toContain("payoff_item_no_consumer");
    const withDlg = findStoryDefects(idx({ items, gff: { "dlg_b.dlg": dialog([{ script: "q_act", params: { take_item: "AFF_SALTCSK" } }]) } }), new Map(), j);
    expect(withDlg.map((d) => d.code)).not.toContain("payoff_item_no_consumer");
    const withScript = findStoryDefects(idx({ items }), new Map([["c_has", 'GetItemPossessedBy(oPC, "AFF_SALTCSK")']]), j);
    expect(withScript.map((d) => d.code)).not.toContain("payoff_item_no_consumer");
  });
  it("giving the item (CreateItemOnObject, give_item) is not a consumer", () => {
    const j = journal([[7, "Carry the Salt Casks home."]]);
    const out = findStoryDefects(idx({ items, gff: { "dlg_b.dlg": dialog([{ script: "q_act", params: { give_item: "aff_cask" } }]) } }), new Map([["a_give", 'CreateItemOnObject("aff_cask", oPC);']]), j);
    expect(out.map((d) => d.code)).toContain("payoff_item_no_consumer");
  });
  it("flags an item one scene destroys and another still needs", () => {
    const src = new Map([
      ["a_ashfang", 'DestroyObject(GetItemPossessedBy(oPC, "qi_token"));'],
      ["c_return_has", 'return GetIsObjectValid(GetItemPossessedBy(oPC, "qi_token"));'],
    ]);
    const out = findStoryDefects(idx({}), src, journal([[1, "x"]]));
    const d = out.find((x) => x.code === "item_consumed_then_needed");
    expect(d?.message).toContain("qi_token");
    expect(d?.message).toContain("c_return_has");
  });
});

describe("stance_change_group (#44)", () => {
  const creature = (tag: string, faction: number, extra: Record<string, unknown> = {}) => ({ Tag: str(tag), FactionID: num(faction), ...extra });
  const git = (cs: unknown[]) => ({ "Creature List": list(cs) }) as unknown as GffObj;
  it("flags a conversion of one creature while creatures sharing its tag prefix keep the old faction", () => {
    const src = new Map([["a_standdown", 'ChangeToStandardFaction(GetObjectByTag("ashf_chief"), STANDARD_FACTION_COMMONER);']]);
    const gff = { "area1.git": git([creature("ashf_chief", 1), creature("ashf_raider1", 1), creature("ashf_raider2", 1), creature("gate_guard", 1)]) };
    const out = findStoryDefects(idx({ gff, areas: ["area1"] }), src, journal([[1, "x"]]));
    const d = out.find((x) => x.code === "stance_change_group");
    expect(d?.message).toContain("2 creature(s)");
  });
  it("a loop over the group, or a lone creature, passes", () => {
    const loop = new Map([["a_standdown", 'object o = GetFirstObjectInArea(); while (GetIsObjectValid(o)) { ChangeToStandardFaction(o, STANDARD_FACTION_COMMONER); o = GetNextObjectInArea(); }']]);
    const gff = { "area1.git": git([creature("ashf_chief", 1), creature("ashf_raider1", 1)]) };
    expect(findStoryDefects(idx({ gff, areas: ["area1"] }), loop, journal([[1, "x"]])).map((d) => d.code)).not.toContain("stance_change_group");
    const lone = new Map([["a_standdown", 'ChangeToStandardFaction(GetObjectByTag("gorrukh"), STANDARD_FACTION_COMMONER);']]);
    expect(findStoryDefects(idx({ gff: { "area1.git": git([creature("gorrukh", 1), creature("raider1", 1)]) }, areas: ["area1"] }), lone, journal([[1, "x"]])).map((d) => d.code)).not.toContain("stance_change_group");
  });
});
