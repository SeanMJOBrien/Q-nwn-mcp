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
import { generateRewardInclude } from "./reward-script.js";
import { generateAppearanceInclude } from "./gear-appearance.js";
import { addToPool, emptyPool, generateTreasureDeathScript, generateTreasureInclude, generateTreasureOpenScript } from "./treasure-script.js";

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

  it("covers the other companion scripts, inc_reward with its tiers, and the treasure system with its pool (#22)", () => {
    const pool = emptyPool();
    addToPool(pool, 4, 2, "tr_sword");
    addToPool(pool, 3, 1, "nw_it_mpotion001");
    addToPool(pool, 3, 1, 'odd"name');
    const rewardOpts = {
      policy: "split" as const,
      sharePercent: 75,
      classItems: [
        { tier: "boss", items: { fighter: "rw_blade", wizard: "rw_staff" }, fallback: "rw_ring" },
        { tier: "minor", items: { cleric: "rw_mace" } },
      ],
    };
    const companions = generateCompanionScripts({ maxCompanions: 3, originalLevelUp: "a_old_lvlup" });
    const fresh = new Map<string, string>([
      ...["c_hen_free", "c_hen_mine", "c_hen_full", "a_hen_join", "a_hen_leave", "a_hen_stay", "a_hen_follow", "a_hen_lvlup"].map((n) => [n, companions[n]] as [string, string]),
      ["inc_reward", generateRewardInclude(rewardOpts)],
      ["inc_appear", generateAppearanceInclude({ armorColors: true, weaponColors: false, weaponModels: true, weaponModelMax: 5 })],
      ["inc_treasure", generateTreasureInclude(pool)],
      ["a_trs_open", generateTreasureOpenScript()],
      ["a_trs_death", generateTreasureDeathScript()],
    ]);
    expect(findStaleGenerated(fresh)).toEqual([]);
    // an old copy of each is found, naming its tool
    const old = new Map(fresh);
    old.set("a_trs_death", fresh.get("a_trs_death")?.replace("nw_c2_default7", "nw_c2_default6") ?? "");
    old.set("inc_treasure", fresh.get("inc_treasure")?.replace("TR_BASE_T2 = 200", "TR_BASE_T2 = 100") ?? "");
    old.set("a_hen_stay", "// older\nvoid main() {}\n");
    const found = findStaleGenerated(old);
    expect(found.map((f) => f.resref).sort()).toEqual(["a_hen_stay", "a_trs_death", "inc_treasure"]);
    expect(found.find((f) => f.resref === "inc_treasure")?.tool).toBe("create_treasure_system");
  });
});
