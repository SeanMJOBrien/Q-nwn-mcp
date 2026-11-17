import { describe, expect, it } from "vitest";
import { generateSimDriver, nwString, validateSimSpec } from "./sim-driver.js";
import { withSimResult } from "./sim-script.js";

describe("sim driver", () => {
  const spec = {
    steps: [
      { npc: "oswin", script: "q_chk", kind: "condition" as const, expect: false, params: { target: "1" } },
      { label: "accept", npc: "oswin", script: "q_act", params: { target: "1", say: 'he said "hi"' }, expectStage: [{ quest: "q_a", stage: 1 }], expectGold: 5, expectItem: [{ tag: "key", count: 2 }] },
    ],
  };
  it("makes one step function per step, sets parameters, runs the script, and checks", () => {
    const s = generateSimDriver(spec, "a_orig_load");
    expect(s).toContain("void SimStep1()");
    expect(s).toContain("void SimStep2()");
    expect(s).toContain('SetScriptParam("target", "1");');
    expect(s).toContain('SetScriptParam("say", "he said \\"hi\\"");');
    expect(s).toContain('ExecuteScript("q_chk", oNpc);');
    expect(s).toContain('GetLocalInt(GetModule(), "SIM_COND") - 1');
    expect(s).toContain('"NW_JOURNAL_ENTRY" + "q_a"');
    expect(s).toContain('ExecuteScript("a_orig_load", OBJECT_SELF);');
    expect(s).toContain("[SIM_DONE]");
  });
  it("validates", () => {
    expect(validateSimSpec({ steps: [] })).toHaveLength(1);
    expect(validateSimSpec({ steps: [{ npc: "a", script: "bad name" }] })).toHaveLength(1);
    expect(validateSimSpec(spec)).toEqual([]);
  });
  it("escapes strings", () => expect(nwString('a"b\\c\nd')).toBe('"a\\"b\\\\c d"'));
  it("withSimResult wraps a conditional and leaves others alone", () => {
    const w = withSimResult("int StartingConditional()\n{\n return TRUE;\n}\n");
    expect(w).toContain("int SimCondBody()");
    expect(w).toContain("return SimCondResult(SimCondBody());");
    expect(withSimResult("void main(){}")).toBe("void main(){}");
  });
  it("an event step runs with SIM_EVENT set; a giveItem step creates the item on the stand-in", () => {
    const s = generateSimDriver({
      steps: [
        { npc: "qtr_glade", script: "q_onenter", event: true },
        { giveItem: "q_moonpetal_i2" },
      ],
    });
    expect(s).toMatch(/SetLocalInt\(GetModule\(\), "SIM_EVENT", 1\);\s+ExecuteScript\("q_onenter", oNpc\);\s+DeleteLocalInt\(GetModule\(\), "SIM_EVENT"\);/);
    expect(s).toContain('CreateItemOnObject("q_moonpetal_i2", oActor, 1)');
    expect(validateSimSpec({ steps: [{ giveItem: "q_x", script: "q_act" }] })).toEqual(["step 1: a step gives an item or runs a script, not both"]);
    expect(validateSimSpec({ steps: [{ giveItem: "q_x" }] })).toEqual([]);
  });
});
