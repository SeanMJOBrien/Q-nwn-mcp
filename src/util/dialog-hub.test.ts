import { describe, expect, it } from "vitest";
import { buildDialogDocument } from "../tools/dialog-write-tools.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import { addReturnLinks, dialogShape } from "./dialog-hub.js";

const doc = () =>
  buildDialogDocument([
    {
      speaker: "npc",
      text: "Welcome.",
      children: [
        { speaker: "pc", text: "Who are you?", children: [{ speaker: "npc", text: "A harbor-marshal." }] },
        { speaker: "pc", text: "What happened?", children: [{ speaker: "npc", text: "Raids." }] },
        { speaker: "pc", text: "Bye." },
      ],
    },
  ]) as unknown as GffObj;

describe("addReturnLinks", () => {
  it("sends each dead-end answer back to the hub, minus the question just asked, and keeps the exit", () => {
    const d = doc();
    const r = addReturnLinks(d);
    expect(r.linked).toEqual([1, 2]);
    expect(r.exitsAdded).toBe(0);
    const entries = getFieldList(d, "EntryList");
    // answer 1 (reached via reply 0) offers replies 1 and 2; answer 2 (reply 1) offers 0 and 2
    expect(getFieldList(entries[1], "RepliesList").map((l) => getFieldNum(l, "Index"))).toEqual([1, 2]);
    expect(getFieldList(entries[2], "RepliesList").map((l) => getFieldNum(l, "Index"))).toEqual([0, 2]);
    expect(dialogShape(d).deadEnds).toEqual([]);
  });
  it("adds an exit reply when the hub has none, and is idempotent", () => {
    const d = buildDialogDocument([
      { speaker: "npc", text: "Hi.", children: [{ speaker: "pc", text: "Q", children: [{ speaker: "npc", text: "A" }] }] },
    ]) as unknown as GffObj;
    const r = addReturnLinks(d);
    expect(r.exitsAdded).toBe(1);
    expect(getFieldList(d, "ReplyList")).toHaveLength(2);
    expect(addReturnLinks(d).linked).toEqual([]);
  });
  it("leaves entries marked as ending, and one-line greetings, alone", () => {
    const d = buildDialogDocument([{ speaker: "npc", text: "Hello." }]) as unknown as GffObj;
    expect(addReturnLinks(d).noHub).toEqual([0]);
    const e = doc();
    const entries = getFieldList(e, "EntryList");
    (entries[1] as Record<string, unknown>).Comment = { type: "cexostring", value: "end" };
    expect(addReturnLinks(e).terminal).toEqual([1]);
  });
  it("keeps link conditions so one-shot options still hide themselves", () => {
    const d = buildDialogDocument([
      {
        speaker: "npc",
        text: "Hi.",
        children: [
          { speaker: "pc", text: "Give item", condition: "c_has", conditionParams: { item: "x" }, children: [{ speaker: "npc", text: "Thanks." }] },
          { speaker: "pc", text: "Other", children: [{ speaker: "npc", text: "Ok." }] },
          { speaker: "pc", text: "Bye." },
        ],
      },
    ]) as unknown as GffObj;
    addReturnLinks(d);
    const entries = getFieldList(d, "EntryList");
    const back = getFieldList(entries[2], "RepliesList");
    expect(back.map((l) => (l.Active as { value: string }).value)).toEqual(["c_has", ""]);
  });

  it("an answer that changes state re-enters the dialog so the start conditions pick the active line", () => {
    const d = buildDialogDocument([
      {
        speaker: "npc",
        text: "Quest offer.",
        condition: "q_chk",
        conditionParams: { target: "1" },
        children: [
          { speaker: "pc", text: "I accept.", children: [{ speaker: "npc", text: "Good.", script: "q_act", params: { target: "1" } }] },
          { speaker: "pc", text: "No.", children: [{ speaker: "npc", text: "Pity." }] },
          { speaker: "pc", text: "Bye." },
        ],
      },
      { speaker: "npc", text: "Greetings." },
    ]) as unknown as GffObj;
    const r = addReturnLinks(d);
    expect(r.linked.length).toBe(2);
    const entries = getFieldList(d, "EntryList");
    const replies = getFieldList(d, "ReplyList");
    const reenterIdx = replies.findIndex((x) => getFieldStr(x, "Comment") === "hub:reenter");
    expect(reenterIdx).toBeGreaterThanOrEqual(0);
    // "Good." (runs a script) goes through the re-entry reply, whose entries mirror the start list with its conditions
    const good = entries.findIndex((e) => getFieldLocStr(e, "Text") === "Good.");
    expect(getFieldList(entries[good], "RepliesList").map((l) => getFieldNum(l, "Index"))).toEqual([reenterIdx]);
    const targets = getFieldList(replies[reenterIdx], "EntriesList");
    expect(targets).toHaveLength(getFieldList(d, "StartingList").length);
    expect(getFieldStr(targets[0], "Active")).toBe("q_chk");
    // "Pity." changes nothing, so it returns to the hub as before
    const pity = entries.findIndex((e) => getFieldLocStr(e, "Text") === "Pity.");
    expect(getFieldList(entries[pity], "RepliesList").map((l) => getFieldNum(l, "Index"))).not.toContain(reenterIdx);
  });

  it("records a forced end in the dialog so it is not reported again", () => {
    const d = doc();
    addReturnLinks(d, { endEntries: [1] });
    const entries = getFieldList(d, "EntryList");
    expect(getFieldStr(entries[1], "Comment")).toBe("end");
    expect(dialogShape(d).deadEnds).toEqual([]);
  });
});
