import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import { getScriptParams } from "../util/dialog-params.js";
import { buildDialogDocument, paramList, parseParamsArg } from "./dialog-write-tools.js";

describe("dialog script parameters and native quest fields", () => {
  const doc = buildDialogDocument([
    {
      speaker: "npc",
      text: "Wolves have been at my flock.",
      condition: "q_chk",
      conditionParams: { target: "1", mode: "eligible" },
      children: [
        {
          speaker: "pc",
          text: "I'll hunt them.",
          children: [{ speaker: "npc", text: "Thank you.", script: "q_act", params: { target: "1" }, quest: "q_wolves", questEntry: 1 }],
        },
      ],
    },
  ]) as unknown as GffObj;

  it("writes ConditionParams on links and ActionParams on nodes, readable back with GetScriptParam's shape", () => {
    const start = getFieldList(doc, "StartingList")[0];
    expect(getFieldStr(start, "Active")).toBe("q_chk");
    expect(getScriptParams(start, "ConditionParams")).toEqual({ target: "1", mode: "eligible" });
    const accept = getFieldList(doc, "EntryList")[1];
    expect(getScriptParams(accept, "ActionParams")).toEqual({ target: "1" });
  });

  it("writes Quest/QuestEntry only on nodes that advance the journal", () => {
    const [offer, accept] = getFieldList(doc, "EntryList");
    expect(getFieldStr(accept, "Quest")).toBe("q_wolves");
    expect(getFieldNum(accept, "QuestEntry")).toBe(1);
    expect(getFieldStr(offer, "Quest")).toBe("");
    expect("QuestEntry" in offer).toBe(false);
  });

  it("always carries the param lists, empty when unused, like toolset dialogs", () => {
    const reply = getFieldList(doc, "ReplyList")[0];
    expect(reply.ActionParams).toEqual({ type: "list", value: [] });
    const link = getFieldList(reply, "EntriesList")[0];
    expect(link.ConditionParams).toEqual({ type: "list", value: [] });
  });

  it("numbers param structs by position with cexostring Key/Value", () => {
    expect(paramList({ a: "1", b: "x" }).value).toEqual([
      { __struct_id: 0, Key: { type: "cexostring", value: "a" }, Value: { type: "cexostring", value: "1" } },
      { __struct_id: 1, Key: { type: "cexostring", value: "b" }, Value: { type: "cexostring", value: "x" } },
    ]);
  });

  it("parses tool params as flat string maps and rejects anything else", () => {
    expect(parseParamsArg('{"target":2,"aoe":true}', "params")).toEqual({ target: "2", aoe: "true" });
    expect(parseParamsArg(undefined, "params")).toBeUndefined();
    expect(() => parseParamsArg("[1]", "params")).toThrow();
    expect(() => parseParamsArg('{"a":{"b":1}}', "params")).toThrow();
  });
});
