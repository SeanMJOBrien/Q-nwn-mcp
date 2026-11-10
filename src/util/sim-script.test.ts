import { describe, expect, it } from "vitest";
import { generateCompanionScripts } from "./companion-script.js";
import { generateQuestScripts } from "./quest-script.js";
import { generateSimInclude } from "./sim-script.js";

describe("inc_sim", () => {
  it("defines the four helpers on the MCP_TEST_ACTOR module local", () => {
    const s = generateSimInclude();
    for (const f of ["object SimActor()", "int SimIsPlayer(object oObject)", "object SimSpeaker()", "object SimFirstPC(object oPC)", "object SimNextPC(object oPC)"]) expect(s).toContain(f);
    expect(s).toContain('GetLocalObject(GetModule(), "MCP_TEST_ACTOR")');
  });
  it("quest and companion systems ship it and no longer ask the engine directly", () => {
    for (const sources of [generateQuestScripts(), generateCompanionScripts()]) {
      expect(sources.inc_sim).toBeDefined();
      for (const [name, src] of Object.entries(sources)) {
        if (name === "inc_sim") continue;
        expect(src).not.toMatch(/GetIsPC\(|GetPCSpeaker\(\)/);
        expect(src).not.toMatch(/Get(First|Next)FactionMember\(oPC, TRUE\)/);
      }
    }
  });
});
