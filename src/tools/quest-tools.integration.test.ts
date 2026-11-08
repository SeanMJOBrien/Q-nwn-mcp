import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { getScriptParams } from "../util/dialog-params.js";
import { getVarTableEntries } from "../util/git-helpers.js";
import { collectQuestVarAwards } from "../util/quest-vars.js";

vi.mock("../nim-tools.js", () => ({
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  compileScript: vi.fn(async (_nss: string, ncs: string) => {
    await fs.writeFile(ncs, "NCS");
    return { success: true, output: "" };
  }),
}));

let mockIndex: ModuleIndex;
let tempDir: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ dirs: [mockIndex.tempDir] }),
  buildDialogSummary: () => ({}),
}));
vi.mock("./tileset-tools.js", () => ({ invalidateTagToAreaCache: vi.fn() }));

const v = (type: string, value: unknown) => ({ type, value });

function creature(tag: string, extra: Record<string, unknown> = {}): GffObj {
  return {
    __struct_id: 4,
    Tag: v("cexostring", tag),
    TemplateResRef: v("resref", tag),
    FirstName: v("cexolocstring", { "0": tag }),
    ScriptDeath: v("resref", "nw_c2_default7"),
    Conversation: v("resref", ""),
    ...extra,
  } as unknown as GffObj;
}

async function addResource(key: string, doc: unknown): Promise<void> {
  const [resref, extension] = key.split(".");
  const filePath = path.join(tempDir, key);
  await fs.writeFile(filePath, JSON.stringify(doc));
  mockIndex.resources.set(key, { resref, extension, filePath, sizeBytes: 1 });
  mockIndex.parsedGff.set(key, doc as GffDocument);
}

async function client() {
  const { registerQuestTools } = await import("./quest-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerQuestTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, done: async () => (await c.close(), await server.close()) };
}

const json = (r: unknown) => JSON.parse((r as { content: Array<{ text: string }> }).content[0].text);
const vars = (o: GffObj) => Object.fromEntries(getVarTableEntries(o).map((e) => [e.name, e.value]));

const SPEC = JSON.stringify({
  name: "Wolves at the Fold",
  giver: "farmer_ned",
  level: 4,
  stages: [
    { do: "talk", journal: "Ned asked me to deal with the wolves.", offer: "Wolves are taking my sheep." },
    { do: "kill", target: "wolf_alpha", journal: "The alpha wolf is dead." },
    { do: "return", journal: "Ned paid me.", text: "You did it! Here." },
  ],
});

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-quest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = {
    tempDir,
    resources: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
  } as unknown as ModuleIndex;
  mockIndex.areas.set("fold", {} as never);
  await addResource("fold.git", {
    __data_type: "GIT ",
    "Creature List": v("list", [creature("farmer_ned"), creature("wolf_alpha")]),
    "Placeable List": v("list", []),
    TriggerList: v("list", []),
  });
  await addResource("fold.are", {
    __data_type: "ARE ",
    OnEnter: v("resref", ""),
    Width: v("int", 4),
    Height: v("int", 4),
  });
  await addResource("farmer_ned.utc", { __data_type: "UTC ", ...creature("farmer_ned") });
  await addResource("module.ifo", { __data_type: "IFO ", Mod_OnAcquirItem: v("resref", "") });
});
afterEach(async () => fs.rm(tempDir, { recursive: true, force: true }));

describe("build_quest", () => {
  it("dry run plans without changing anything", async () => {
    const before = JSON.stringify([...mockIndex.parsedGff.entries()]);
    const { c, done } = await client();
    try {
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec: SPEC, dryRun: true } }));
      expect(r.dryRun).toBe(true);
      expect(r.stages.map((s: { do: string }) => s.do)).toEqual(["talk", "kill", "return"]);
      expect(r.dialogs[0].lines.length).toBeGreaterThan(0);
      const after = JSON.stringify([...mockIndex.parsedGff.entries()]);
      if (after !== before) {
        const b = JSON.parse(before) as Array<[string, unknown]>;
        const a = JSON.parse(after) as Array<[string, unknown]>;
        const changed = a
          .filter(([k, d]) => JSON.stringify(d) !== JSON.stringify(b.find(([kk]) => kk === k)?.[1]))
          .map(([k]) => k);
        throw new Error(`dry run changed: ${changed.join(", ")} ${JSON.stringify(a.find(([k]) => k === changed[0]))}`);
      }
      expect(mockIndex.resources.has("inc_quest.nss")).toBe(false);
    } finally {
      await done();
    }
  });

  it("builds journal, dialog, stage variables and kill wiring; rebuilds idempotently; removes cleanly", async () => {
    const { c, done } = await client();
    try {
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec: SPEC } }));
      expect(r.success).toBe(true);
      expect(mockIndex.resources.has("q_chk.ncs")).toBe(true);

      const jrl = mockIndex.parsedGff.get("module.jrl") as unknown as GffObj;
      const cat = getFieldList(jrl, "Categories").find(
        (x) => getFieldStr(x, "Tag") === "q_wolves_at_the_fold",
      ) as GffObj;
      expect(getFieldList(cat, "EntryList").map((e) => [getFieldNum(e, "ID"), getFieldNum(e, "End")])).toEqual([
        [1, 0],
        [2, 0],
        [3, 1],
      ]);

      const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
      const [ned, wolf] = getFieldList(git, "Creature List");
      expect(vars(ned)).toMatchObject({
        quest1: "1_q_wolves_at_the_fold",
        quest2: "3_q_wolves_at_the_fold",
        quest2_reward_xp_tier: 2,
        quest2_reward_gold: 100,
      });
      expect(vars(wolf)).toMatchObject({
        quest1: "2_q_wolves_at_the_fold",
        quest_event: 1,
        MCP_Q_ORIG_DEATH: "nw_c2_default7",
      });
      expect(getFieldStr(wolf, "ScriptDeath")).toBe("q_ondeath");

      const dlgRes = getFieldStr(ned, "Conversation");
      expect(dlgRes).toBe("dq_farmer_ned");
      const dlg = mockIndex.parsedGff.get(`${dlgRes}.dlg`) as unknown as GffObj;
      const roots = getFieldList(dlg, "StartingList").map((l) => [
        getFieldStr(l, "Active"),
        getScriptParams(l, "ConditionParams"),
      ]);
      expect(roots[0]).toEqual(["q_chk", { target: "2" }]);
      expect(roots).toContainEqual(["q_chk", { target: "1" }]);
      expect(roots).toContainEqual(["q_chk", { quest: "q_wolves_at_the_fold", stage: "1", op: "at" }]);
      expect(roots[roots.length - 1]).toEqual(["", {}]); // the unconditional greeting stays last

      // The journal checks see every stage: talk stages through the giver's dialog, the kill through the wolf.
      const awards = collectQuestVarAwards(mockIndex).get("q_wolves_at_the_fold");
      expect([...(awards?.keys() ?? [])].sort()).toEqual([1, 2, 3]);
      expect(awards?.get(1)).toContain("dlg:dq_farmer_ned");
      expect(awards?.get(2)).toContain("creature:wolf_alpha");

      // Rebuild: same slots, no duplicated nodes.
      const nodes = getFieldList(dlg, "EntryList").length;
      json(await c.callTool({ name: "build_quest", arguments: { spec: SPEC } }));
      const dlg2 = mockIndex.parsedGff.get(`${dlgRes}.dlg`) as unknown as GffObj;
      expect(getFieldList(dlg2, "EntryList").length).toBe(nodes);
      expect(vars(getFieldList(git, "Creature List")[1]).quest1).toBe("2_q_wolves_at_the_fold");

      // Remove.
      json(await c.callTool({ name: "remove_quest", arguments: { tag: "q_wolves_at_the_fold" } }));
      expect(vars(getFieldList(git, "Creature List")[0]).quest1).toBeUndefined();
      expect(vars(getFieldList(git, "Creature List")[1]).quest_event).toBeUndefined();
      expect(getFieldList(mockIndex.parsedGff.get(`${dlgRes}.dlg`) as unknown as GffObj, "EntryList").length).toBe(1);
      expect(getFieldList(mockIndex.parsedGff.get("module.jrl") as unknown as GffObj, "Categories")).toHaveLength(0);
    } finally {
      await done();
    }
  });

  it("wires a pickup item into the holder and the module's OnAcquireItem, chaining the old handler", async () => {
    (mockIndex.parsedGff.get("module.ifo") as unknown as GffObj).Mod_OnAcquirItem = v("resref", "x2_mod_def_aqu");
    const { c, done } = await client();
    try {
      const spec = JSON.stringify({
        name: "Pelt",
        giver: "farmer_ned",
        template: "fetch",
        itemName: "Wolf pelt",
        journal: ["a", "b", "c"],
      });
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec } }));
      expect(r.warnings.join(" ")).toContain("nobody carries it");
      const item = mockIndex.parsedGff.get("q_pelt_i2.uti") as unknown as GffObj;
      expect(vars(item)).toMatchObject({ quest1: "2_q_pelt", quest_event: 1 });
      expect(getFieldStr(mockIndex.parsedGff.get("module.ifo") as unknown as GffObj, "Mod_OnAcquirItem")).toBe(
        "q_mod_acquire",
      );
      const wrapper = await fs.readFile(path.join(tempDir, "q_mod_acquire.nss"), "utf8");
      expect(wrapper).toContain('ExecuteScript("x2_mod_def_aqu", OBJECT_SELF);');
    } finally {
      await done();
    }
  });

  it("wires a search stage with a companion examine check, a kept item and a stage script", async () => {
    const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
    (git["Placeable List"] as { value: GffObj[] }).value.push({
      __struct_id: 9,
      Tag: v("cexostring", "old_chest"),
      OnUsed: v("resref", "old_used"),
      Useable: v("byte", 0),
    } as unknown as GffObj);
    (git["Creature List"] as { value: GffObj[] }).value.push(creature("capt_holt"));
    const spec = JSON.stringify({
      name: "Letter",
      giver: "farmer_ned",
      stages: [
        { do: "talk", journal: "a" },
        {
          do: "search",
          target: "old_chest",
          itemName: "Torn letter",
          journal: "b",
          check: { skill: "search", dc: 13, pass: "A letter!" },
          examine: { skill: "lore", dc: 14, var: "HC_SEAL", pass: "The seal is forged." },
        },
        { do: "deliver", keep: true, journal: "c", text: "Show me... forged." },
        { do: "deliver", to: "capt_holt", journal: "d", script: "a_gate_pass" },
      ],
    });
    const { c, done } = await client();
    try {
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec } }));
      expect(r.success).toBe(true);
      const chest = (git["Placeable List"] as { value: GffObj[] }).value[0];
      expect(getFieldStr(chest, "OnUsed")).toBe("q_search");
      expect(vars(chest)).toMatchObject({
        quest1: "2_q_letter",
        quest_event: 1,
        MCP_Q_ORIG_USED: "old_used",
        quest_search_skill: "search",
        quest_search_dc: 13,
        quest_search_assured: 1,
        quest_search_item: "q_letter_i2",
        quest_search_bonus_skill: "lore",
        quest_search_bonus_var: "HC_SEAL",
      });
      expect(mockIndex.parsedGff.has("q_letter_i2.uti")).toBe(true);
      expect(mockIndex.parsedGff.has("q_letter_i3.uti")).toBe(false); // deliver reuses the found letter
      const holt = (git["Creature List"] as { value: GffObj[] }).value[2];
      expect(vars(holt)).toMatchObject({ quest1: "4_q_letter", quest1_self_script: "a_gate_pass" });
      // The giver looks at the letter without taking it; Holt takes it.
      const ned = mockIndex.parsedGff.get("dq_farmer_ned.dlg") as unknown as GffObj;
      const keepNode = getFieldList(ned, "EntryList").find((e) =>
        getFieldStr(e, "Comment").endsWith("s3:advance"),
      ) as GffObj;
      expect(getScriptParams(keepNode, "ActionParams")).toEqual({ target: "2" });
      const holtDlg = mockIndex.parsedGff.get("dq_capt_holt.dlg") as unknown as GffObj;
      const takeNode = getFieldList(holtDlg, "EntryList").find((e) =>
        getFieldStr(e, "Comment").endsWith("s4:advance"),
      ) as GffObj;
      expect(getScriptParams(takeNode, "ActionParams")).toEqual({
        target: "1",
        take_item: "q_letter_i2",
        take_count: "1",
      });
    } finally {
      await done();
    }
  });

  it("optional clue, an approaching NPC that joins, and a turn-in that needs and dismisses it", async () => {
    const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
    (git["Placeable List"] as { value: GffObj[] }).value.push({
      __struct_id: 9,
      Tag: v("cexostring", "rug"),
      OnUsed: v("resref", ""),
    } as unknown as GffObj);
    (git["Creature List"] as { value: GffObj[] }).value.push(
      creature("dog", { ScriptOnNotice: v("resref", "x0_ch_hen_percep") }),
    );
    const { c, done } = await client();
    try {
      const dog = JSON.stringify({
        name: "Dog",
        giver: "dog",
        stages: [
          { do: "talk", journal: "a", approach: "*whines*", join: true },
          { do: "talk", to: "farmer_ned", companion: "dog", dismiss: "dog", journal: "b", reward: { xp: 50 } },
          { do: "search", optional: true, target: "rug", check: { skill: "search", dc: 13 }, reward: { xp: 75 } },
        ],
      });
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec: dog } }));
      expect(r.success).toBe(true);
      const [, , dogObj] = (git["Creature List"] as { value: GffObj[] }).value;
      expect(getFieldStr(dogObj, "ScriptOnNotice")).toBe("q_approach");
      expect(vars(dogObj)).toMatchObject({ MCP_Q_ORIG_NOTICE: "x0_ch_hen_percep", quest_approach_bark: "*whines*" });
      const dogDlg = mockIndex.parsedGff.get("dq_dog.dlg") as unknown as GffObj;
      const accept = getFieldList(dogDlg, "EntryList").find((e) =>
        getFieldStr(e, "Comment").endsWith("s1:accept"),
      ) as GffObj;
      expect(getScriptParams(accept, "ActionParams")).toEqual({ target: "1", join: "1" });
      const ned = mockIndex.parsedGff.get("dq_farmer_ned.dlg") as unknown as GffObj;
      const turnIn = getFieldList(ned, "StartingList").find(
        (l) => getScriptParams(l, "ConditionParams").companion === "dog",
      ) as GffObj;
      expect(getScriptParams(turnIn, "ConditionParams")).toEqual({ target: "1", companion: "dog" });
      const adv = getFieldList(ned, "EntryList")[getFieldNum(turnIn, "Index")];
      expect(getScriptParams(adv, "ActionParams")).toEqual({ target: "1", dismiss: "dog" });
      // The optional clue: no journal entry, available from stage 1, pays its reward, never assured.
      const rug = (git["Placeable List"] as { value: GffObj[] }).value[0];
      expect(vars(rug)).toMatchObject({
        quest1: "1_q_dog",
        quest1_reward_xp: 75,
        quest_search_optional: 1,
        quest_search_assured: 0,
      });
      const jrl = mockIndex.parsedGff.get("module.jrl") as unknown as GffObj;
      const cat = getFieldList(jrl, "Categories").find((x) => getFieldStr(x, "Tag") === "q_dog") as GffObj;
      expect(getFieldList(cat, "EntryList").map((e) => getFieldNum(e, "ID"))).toEqual([1, 2]);
    } finally {
      await done();
    }
  });

  it("explains a spec it can't build", async () => {
    const { c, done } = await client();
    try {
      const r = await c.callTool({
        name: "build_quest",
        arguments: { spec: JSON.stringify({ name: "X", giver: "nobody", stages: [{ do: "talk", journal: "x" }] }) },
      });
      expect(r.isError).toBe(true);
      expect((r as { content: Array<{ text: string }> }).content[0].text).toContain("nobody");
    } finally {
      await done();
    }
  });
});
