import { describe, expect, it } from "vitest";
import { generateQuestScripts } from "./quest-script.js";
import { generateRandomAbilitiesInclude } from "./random-abilities-script.js";
import { generateSimInclude } from "./sim-script.js";
import { generateSpecAbilityInclude } from "./spec-ability-script.js";
import { generateSpecAssertInclude } from "./spec-assert-script.js";
import { generateSpecCheckInclude } from "./spec-check-script.js";
import { generateCompanionScripts } from "./companion-script.js";
import { generateCreatureLevelInclude, generateCreatureLevelWrapper } from "./creature-level-script.js";
import { findStaleGenerated } from "./stale-scripts.js";

describe("findStaleGenerated", () => {
  it("is quiet for freshly generated scripts, with the settings they were built with", () => {
    const sources = new Map([
      ["inc_cre_level", generateCreatureLevelInclude({ stores: ["my_smith", "nw_storeweap001"], droppable: false })],
      ["cf_spawn", generateCreatureLevelWrapper()],
      ["inc_companion", generateCompanionScripts({ maxCompanions: 2 }).inc_companion],
    ]);
    expect(findStaleGenerated(sources)).toEqual([]);
  });
  it("names the tool for an older or hand-edited copy", () => {
    const old = generateCreatureLevelInclude().replace("CL_GearLeft(oCreature, 45)", "CL_GearLeft(oCreature, 35)");
    const found = findStaleGenerated(new Map([["inc_cre_level", old]]));
    expect(found).toHaveLength(1);
    expect(found[0].tool).toBe("create_creature_level_system");
  });
  it("ignores scripts the module does not have, and reports an unreadable one", () => {
    expect(findStaleGenerated(new Map())).toEqual([]);
    expect(findStaleGenerated(new Map([["inc_cre_level", "// something else"]]))).toHaveLength(1);
  });
  it("skips a script marked hand-edited", () => {
    const patched = `// hand-edited: Salt Gate store list\n${generateCreatureLevelInclude().replace("CL_GearLeft(oCreature, 45)", "CL_GearLeft(oCreature, 35)")}`;
    expect(findStaleGenerated(new Map([["inc_cre_level", patched]]))).toEqual([]);
  });

  it("covers the quest runtime, inc_sim, random and special abilities and the spec includes", () => {
    const fresh = new Map<string, string>([
      ["inc_sim", generateSimInclude()],
      ["inc_spec_ability", generateSpecAbilityInclude()],
      ["inc_spec_check", generateSpecCheckInclude()],
      ["inc_spec_assert", generateSpecAssertInclude()],
      ["inc_random_abil", generateRandomAbilitiesInclude({ castChancePercent: 50 })],
      ...Object.entries(generateQuestScripts()).filter(([n]) => n !== "inc_sim"),
    ]);
    expect(findStaleGenerated(fresh)).toEqual([]);
    const old = new Map(fresh);
    old.set("q_act", `${fresh.get("q_act")}\n// an older copy`.replace("void main()", "void main() /* old */"));
    old.set("inc_spec_check", "int x;");
    const names = findStaleGenerated(old).map((f) => f.resref).sort();
    expect(names).toEqual(["inc_spec_check", "q_act"]);
  });
});

