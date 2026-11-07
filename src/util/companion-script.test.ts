import { describe, expect, it } from "vitest";
import { buildCompanionDialogTree, COMPANION_SCRIPTS, generateCompanionScripts } from "./companion-script.js";

describe("generateCompanionScripts", () => {
  const src = generateCompanionScripts();

  it("writes every script, include first", () => {
    expect(Object.keys(src)).toEqual([...COMPANION_SCRIPTS]);
    expect(src.inc_companion).toContain("const int CMP_MAX_COMPANIONS = 3;");
  });

  it("counts the party from the engine and keeps no counter", () => {
    expect(src.inc_companion).toContain("GetFirstFactionMember(oPC, FALSE)");
    expect(src.inc_companion).toContain("GetAssociateType(oCreature) != ASSOCIATE_TYPE_HENCHMAN");
    expect(src.inc_companion).toContain("GetIsDead(oCreature)");
    for (const s of Object.values(src)) {
      expect(s).not.toMatch(/SetLocalInt\(GetModule\(\)/);
      expect(s).not.toContain("HC_HENCH_COUNT");
    }
  });

  it("raises the cap and sets listen patterns before AddHenchman, then orders follow", () => {
    const join = src.inc_companion.slice(src.inc_companion.indexOf("int CMP_Join"));
    expect(join.indexOf("SetMaxHenchmen(")).toBeLessThan(join.indexOf("AddHenchman(oPC"));
    expect(join.indexOf("SetAssociateListenPatterns(")).toBeLessThan(join.indexOf("AddHenchman(oPC"));
    expect(join.indexOf("AddHenchman(oPC")).toBeLessThan(join.indexOf("HENCHMAN_CMD_FOLLOW"));
  });

  it("clamps the party cap", () => {
    expect(generateCompanionScripts({ maxCompanions: 0 }).inc_companion).toContain("CMP_MAX_COMPANIONS = 1;");
    expect(generateCompanionScripts({ maxCompanions: 99 }).inc_companion).toContain("CMP_MAX_COMPANIONS = 10;");
  });

  it("wires each action to the shared include", () => {
    expect(src.a_hen_join).toContain("CMP_Join(OBJECT_SELF, GetPCSpeaker())");
    expect(src.a_hen_leave).toContain("CMP_Leave(OBJECT_SELF)");
    expect(src.a_hen_stay).toContain("HENCHMAN_CMD_STANDGROUND");
    expect(src.c_hen_full).toContain("!CMP_PartyHasRoom(GetPCSpeaker())");
  });
});

describe("buildCompanionDialogTree", () => {
  const tree = buildCompanionDialogTree({ introduction: "I'm Elya.", backstory: "I served the temple." });

  it("orders roots so the first TRUE condition wins and the last always matches", () => {
    expect(tree.map((r) => r.condition)).toEqual(["c_hen_mine", "c_hen_full", "c_hen_free", undefined]);
  });

  it("puts each script on the NPC line that confirms it", () => {
    const scripts: string[] = [];
    const walk = (n: (typeof tree)[number]) => {
      if (n.script) {
        expect(n.speaker).toBe("npc");
        scripts.push(n.script);
      }
      n.children?.forEach(walk);
    };
    tree.forEach(walk);
    expect(new Set(scripts)).toEqual(new Set(["a_hen_stay", "a_hen_follow", "a_hen_leave", "a_hen_join"]));
  });

  it("offers no join option when the party is full", () => {
    const full = JSON.stringify(tree[1]);
    expect(full).not.toContain("a_hen_join");
    expect(full).toContain("I served the temple.");
  });
});
