import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import { getScriptParams } from "./dialog-params.js";

function node(fieldName: "ActionParams" | "ConditionParams", pairs: Array<[string, string]>): GffObj {
  return {
    [fieldName]: {
      type: "list",
      value: pairs.map(([key, value], i) => ({
        __struct_id: i,
        Key: { type: "cexostring", value: key },
        Value: { type: "cexostring", value },
      })),
    },
  };
}

describe("getScriptParams", () => {
  it("reads Key/Value pairs into a plain map", () => {
    const n = node("ActionParams", [
      ["quest", "q_test"],
      ["stage", "10"],
    ]);
    expect(getScriptParams(n, "ActionParams")).toEqual({ quest: "q_test", stage: "10" });
  });

  it("returns an empty map when the field is missing entirely", () => {
    expect(getScriptParams({}, "ConditionParams")).toEqual({});
  });

  it("returns an empty map when the field is an empty list", () => {
    const n = node("ConditionParams", []);
    expect(getScriptParams(n, "ConditionParams")).toEqual({});
  });

  it("skips an entry with no Key", () => {
    const n: GffObj = {
      ActionParams: {
        type: "list",
        value: [{ __struct_id: 0, Value: { type: "cexostring", value: "orphan" } }],
      },
    };
    expect(getScriptParams(n, "ActionParams")).toEqual({});
  });

  it("reads ActionParams and ConditionParams independently off the same node", () => {
    const n = {
      ...node("ActionParams", [["reward_gold", "50"]]),
      ...node("ConditionParams", [["op", "at"]]),
    };
    expect(getScriptParams(n, "ActionParams")).toEqual({ reward_gold: "50" });
    expect(getScriptParams(n, "ConditionParams")).toEqual({ op: "at" });
  });
});
