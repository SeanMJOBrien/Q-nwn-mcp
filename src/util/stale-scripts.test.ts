import { describe, expect, it } from "vitest";
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
});
