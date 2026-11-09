import { describe, expect, it } from "vitest";
import { CHECK_PARAMS } from "../tools/check-tools.js";
import { generateQuestScripts, QUEST_SCRIPTS } from "./quest-script.js";

describe("q_check", () => {
  const scripts = generateQuestScripts();

  it("is part of the quest runtime", () => {
    expect(QUEST_SCRIPTS).toContain("q_check");
    expect(QUEST_SCRIPTS).toContain("q_check_evt");
    expect(scripts.q_check).toContain("void main()");
    expect(scripts.q_check_evt).toContain('ExecuteScript("q_check"');
  });

  it("rolls skills, abilities and all three saves", () => {
    const src = scripts.q_check;
    expect(src).toContain("GetIsSkillSuccessful");
    expect(src).toContain("GetAbilityModifier");
    for (const save of ["FortitudeSave", "ReflexSave", "WillSave"]) expect(src).toContain(save);
  });

  it("maps every named difficulty to the documented DC", () => {
    const src = scripts.q_check;
    expect(src).toContain('sD == "easy") return 10');
    expect(src).toContain('sD == "hard") return 20');
    expect(src).toContain("return 25");
    expect(src).toContain("return 15");
  });

  it("copies exactly the parameters add_skill_check accepts", () => {
    const listText = /string sList = ([\s\S]*?);\n/.exec(scripts.q_check_evt)?.[1] ?? "";
    const wrapper = [...listText.matchAll(/[a-z_]+(?=,)/g)].map((m) => m[0]).sort();
    expect(wrapper).toEqual([...CHECK_PARAMS].sort());
  });

  it("reads every parameter it documents", () => {
    for (const name of CHECK_PARAMS) {
      const base = name.replace(/^(pass_|fail_)/, "");
      expect(scripts.q_check, name).toContain(base);
    }
  });
});

describe("q_check_evt actor", () => {
  it("also resolves the player who disarmed a trap (placeable OnDisarm)", async () => {
    const { generateQuestScripts } = await import("./quest-script.js");
    expect(generateQuestScripts().q_check).toContain("GetLastDisarmed()");
  });
});

describe("q_check ability damage", () => {
  it("applies a temporary, capped ability decrease per roller, halved on a passed save", async () => {
    const { generateQuestScripts } = await import("./quest-script.js");
    const src = generateQuestScripts().q_check;
    expect(src).toContain("EffectAbilityDecrease(nAbility, nAmount)");
    expect(src).toContain("DURATION_TYPE_TEMPORARY");
    expect(src).toContain("if (nAmount > 10) nAmount = 10;");
    expect(src).toMatch(/CheckDamage\(oRoller, bPass\);\s+CheckAbilityDamage\(oRoller, bPass\);/);
  });
});

describe("QuestSpawn", () => {
  it("is shared by q_act and by QuestAdvance (event stages)", async () => {
    const { generateQuestScripts } = await import("./quest-script.js");
    const o = generateQuestScripts();
    expect(o.inc_quest).toContain("void QuestSpawn(");
    expect(o.inc_quest).toContain('GetLocalString(oObject, sBase + "_spawn")');
    expect(o.q_act).toContain("QuestSpawn(s, GetScriptParam(\"at\")");
  });
});
