import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { generateAcquireWrapper, generateQuestScripts } from "./quest-script.js";
import { normalizeQuestSpec, QUEST_KEYS, QuestSpecError, STAGE_KEYS, tagFromName } from "./quest-spec.js";

describe("normalizeQuestSpec", () => {
  it("turns the smallest spec into numbered stages with an ending and a sized reward", () => {
    const q = normalizeQuestSpec({
      name: "Wolves at the Fold",
      giver: "farmer_ned",
      level: 4,
      stages: [
        { do: "talk", journal: "Ned asked me." },
        { do: "kill", target: "wolf_alpha", journal: "Dead." },
        { do: "return", journal: "Paid." },
      ],
    });
    expect(q.tag).toBe("q_wolves_at_the_fold");
    expect(q.stages.map((s) => [s.n, s.from, s.end])).toEqual([
      [1, 0, false],
      [2, 1, false],
      [3, 2, true],
    ]);
    expect(q.stages[2].to).toBe("farmer_ned");
    expect(q.stages[2].reward).toEqual({ xp_tier: 2, xp_level: 4, gold: 100 });
  });

  it("adds the accepting stage when the first stage isn't talking to the giver", () => {
    const q = normalizeQuestSpec({ name: "X", giver: "g", stages: [{ do: "kill", target: "t", journal: "k" }] });
    expect(q.stages.map((s) => s.do)).toEqual(["talk", "kill"]);
    expect(q.notes.join(" ")).toContain("added stage 1");
  });

  it("expands templates, including a persuade-or-fight branch where two stages share a number", () => {
    const q = normalizeQuestSpec({ name: "Debt", giver: "g", template: "persuade-or-fight", target: "thug" });
    expect(q.stages.map((s) => `${s.n}:${s.do}`)).toEqual(["1:talk", "2:talk", "2:kill", "3:return"]);
    expect(q.stages[1].check?.else).toBe("fight");
    const f = normalizeQuestSpec({
      name: "Ring",
      giver: "g",
      template: "fetch",
      itemName: "Marla's ring",
      area: "mill",
    });
    expect(f.stages.map((s) => s.do)).toEqual(["talk", "pickup", "deliver"]);
    const b = normalizeQuestSpec({ name: "Rats", giver: "g", template: "bounty", target: "rat" });
    expect(b.tag.startsWith("b_")).toBe(true);
    expect(b.bounty).toBe(true);
  });

  it("finds a missing giver or target by tag convention", () => {
    const q = normalizeQuestSpec(
      { name: "Wolf", template: "kill" },
      (t) => t === "q_wolf_giver" || t === "q_wolf_target",
    );
    expect(q.giver).toBe("q_wolf_giver");
    expect(q.stages[1].target).toBe("q_wolf_target");
  });

  it("deliver hands over what an earlier stage gave out", () => {
    const q = normalizeQuestSpec({ name: "Parcel", giver: "g", template: "deliver", item: "parcel", to: "smith" });
    expect(q.stages[1].item).toBe("parcel");
    expect(q.stages[0].reward?.item).toBe("parcel");
  });

  it("rejects specs it can't build, naming what is missing", () => {
    expect(() => normalizeQuestSpec({ name: "", giver: "g" })).toThrow(QuestSpecError);
    expect(() => normalizeQuestSpec({ name: "A", stages: [] })).toThrow(/giver/);
    expect(() =>
      normalizeQuestSpec({
        name: "A",
        giver: "g",
        stages: [
          { do: "talk", journal: "x" },
          { do: "kill", journal: "y" },
        ],
      }),
    ).toThrow(/target/);
    expect(() => normalizeQuestSpec({ name: "A", giver: "g", stages: [{ do: "talk" }] })).toThrow(/journal/);
  });

  it("makes short tags", () => {
    expect(tagFromName("The Very Long Name Of A Quest That Goes On")).toHaveLength(27);
  });
});

describe("quest runtime", () => {
  const src = generateQuestScripts();
  it("credits the whole party and pays every player", () => {
    expect(src.inc_quest).toContain("AddJournalQuestEntry(sTag, nStage, oPC, TRUE, FALSE, FALSE)");
    expect(src.inc_quest).toContain("SimFirstPC(oPC)");
    expect(src.inc_quest).toContain("const int QS_MAX_SLOTS = 20;");
  });
  it("advances an AoE stage with its own slot, and credits companions' kills to their master", () => {
    expect(src.q_act).toContain('QuestAdvanceSphere(OBJECT_SELF, StringToInt(s), StringToFloat(sAoe), "talk")');
    expect(src.inc_quest).toContain("if (SimIsPlayer(oCreature)) QuestAdvance(oObject, oCreature, nSlot, sVia);");
    expect(src.q_ondeath).toContain("QuestResolvePC(SimEvent(GetLastKiller()))");
  });
  it("keeps conditions free of side effects: skill checks roll in an action", () => {
    expect(src.q_chk).not.toContain("GetIsSkillSuccessful");
    expect(src.q_chk).not.toContain("AdjustAlignment");
    expect(src.q_roll).toContain("GetIsSkillSuccessful");
  });
  it("chains the module's previous OnAcquireItem and pays an item out once", () => {
    const w = generateAcquireWrapper("x2_mod_def_aqu");
    expect(w).toContain('ExecuteScript("x2_mod_def_aqu", OBJECT_SELF);');
    expect(w).toContain('SetLocalInt(oItem, "QS_DONE", 1)');
  });
});

describe("QuestSpecError says where", () => {
  const where = (spec: Parameters<typeof normalizeQuestSpec>[0]): { stage?: number; field?: string } => {
    try {
      normalizeQuestSpec(spec);
    } catch (e) {
      if (e instanceof QuestSpecError) return { stage: e.stage, field: e.field };
      throw e;
    }
    return {};
  };
  const base = { name: "Q", giver: "ned" };
  it("names the target box of a kill stage without a target", () => {
    expect(where({ ...base, stages: [{ do: "talk", journal: "a" }, { do: "kill", journal: "b" }] })).toEqual({
      stage: 2,
      field: "target",
    });
  });
  it("names the journal box, the check and top-level fields", () => {
    expect(where({ ...base, stages: [{ do: "talk", journal: "" }] })).toEqual({ stage: 1, field: "journal" });
    expect(
      where({ ...base, stages: [{ do: "talk", journal: "a" }, { do: "talk", journal: "b", check: { dc: 10 } }] }),
    ).toEqual({ stage: 2, field: "check" });
    expect(where({ name: "", giver: "ned", stages: [{ do: "talk", journal: "a" }] })).toEqual({
      stage: undefined,
      field: "name",
    });
  });
});

describe("spec keys", () => {
  it("the accepted keys equal the generated schema (run npm run quest:schema after changing QuestInput)", () => {
    const schema = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../../docs/quest-spec.schema.json"), "utf8"));
    expect([...QUEST_KEYS].sort()).toEqual(Object.keys(schema.definitions.QuestInput.properties).sort());
    expect([...STAGE_KEYS].sort()).toEqual(Object.keys(schema.definitions.StageInput.properties).sort());
  });

  it("rejects an unknown or misspelt field and names it", () => {
    expect(() => normalizeQuestSpec({ name: "X", giver: "ned", template: "kill", target: "w", jorunal: ["a"] } as never)).toThrow(
      /unknown field\(s\) jorunal/,
    );
    expect(() =>
      normalizeQuestSpec({ name: "X", giver: "ned", stages: [{ do: "talk", journal: "a" }, { do: "pickup", itemname: "Pelt", journal: "b" }] } as never),
    ).toThrow(/stages\[1\]: unknown field\(s\) itemname \(did you mean itemName\?\)/);
    expect(() => normalizeQuestSpec({ $schema: "x", name: "X", giver: "ned", template: "kill", target: "w" } as never)).not.toThrow();
  });

  it("fetch passes the holder (in / from_creature) to its pickup stage", () => {
    const q = normalizeQuestSpec({ name: "Moonpetal", giver: "mara", template: "fetch", itemName: "Moonpetal", in: "old_crate" });
    expect(q.stages[1]).toMatchObject({ do: "pickup", in: "old_crate" });
    const r = normalizeQuestSpec({ name: "Pelt", giver: "ned", template: "fetch", itemName: "Pelt", from_creature: "wolf" });
    expect(r.stages[1]).toMatchObject({ do: "pickup", from_creature: "wolf" });
  });
});

describe("event-stage options", () => {
  const base = { name: "Raid", giver: "ned" };
  it("quest-level defaults reach the stages that take them; marker defaults stay per kind", () => {
    const q = normalizeQuestSpec({ ...base, template: "kill", target: "raider", early: true, none: "Too soon.", respawn: 30 });
    const kill = q.stages.find((s) => s.do === "kill");
    expect(kill).toMatchObject({ early: true, none: "Too soon.", respawn: 30 });
    expect(q.stages.find((s) => s.do === "return")).not.toHaveProperty("early");
  });
  it("refuses an option on a stage kind it does nothing for, and bad values", () => {
    const st = (extra: object) => ({ ...base, stages: [{ do: "talk", journal: "a" }, { journal: "b", ...extra }] }) as never;
    expect(() => normalizeQuestSpec(st({ do: "talk", early: true }))).toThrow(/early works on kill, pickup/);
    expect(() => normalizeQuestSpec(st({ do: "talk", none: "x" }))).toThrow(/none works on/);
    expect(() => normalizeQuestSpec(st({ do: "kill", target: "w", respawn: 2 }))).toThrow(/respawn is whole seconds from 6/);
    expect(() => normalizeQuestSpec(st({ do: "explore", area: "a", respawn: 30 }))).toThrow(/respawn works on kill/);
    expect(() => normalizeQuestSpec(st({ do: "trigger", area: "a", x: 1, y: 2, marker: true }))).not.toThrow();
    expect(() => normalizeQuestSpec(st({ do: "kill", target: "w", marker: true }))).toThrow(/marker works on escort, trigger/);
    expect(() => normalizeQuestSpec(st({ do: "kill", target: "w", early: true, from: 0 }))).toThrow(/early needs the stage to follow/);
    expect(() => normalizeQuestSpec({ ...base, template: "bounty", target: "w", early: true })).toThrow(/bounty can't have early/);
  });
});
