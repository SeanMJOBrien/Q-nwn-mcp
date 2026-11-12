import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
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
vi.mock("../util/walkmesh.js", () => ({
  checkPlacementWalkable: vi.fn(async () => ({ ok: true, z: 0.5 })),
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
      const snapshot = JSON.stringify([...mockIndex.parsedGff.entries()].sort(([a], [b]) => a.localeCompare(b)));
      const again = json(await c.callTool({ name: "build_quest", arguments: { spec: SPEC } }));
      const dlg2 = mockIndex.parsedGff.get(`${dlgRes}.dlg`) as unknown as GffObj;
      const snapshot2 = JSON.stringify([...mockIndex.parsedGff.entries()].sort(([a], [b]) => a.localeCompare(b)));
      if (snapshot !== snapshot2) {
        const a = JSON.parse(snapshot) as Array<[string, unknown]>;
        const b = JSON.parse(snapshot2) as Array<[string, unknown]>;
        const diff = b.filter(([k, d], i) => JSON.stringify(d) !== JSON.stringify(a[i]?.[1])).map(([k]) => k);
        const walk = (x: unknown, y: unknown, path: string, out: string[]) => {
          if (JSON.stringify(x) === JSON.stringify(y)) return;
          if (x && y && typeof x === "object" && typeof y === "object") {
            for (const k of new Set([...Object.keys(x), ...Object.keys(y)]))
              walk((x as Record<string, unknown>)[k], (y as Record<string, unknown>)[k], `${path}.${k}`, out);
          } else out.push(`${path}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
        };
        const out: string[] = [];
        for (const [k, d] of b) walk(a.find(([kk]) => kk === k)?.[1], d, k, out);
        throw new Error(
          `identical rebuild changed (${diff.join(", ")}): ${out.slice(0, 12).join(" | ")} ${JSON.stringify(again).length}`,
        );
      }
      expect(getFieldList(dlg2, "EntryList").length).toBe(nodes);
      expect(vars(getFieldList(git, "Creature List")[1]).quest1).toBe("2_q_wolves_at_the_fold");

      // Remove.
      json(await c.callTool({ name: "remove_quest", arguments: { tag: "q_wolves_at_the_fold" } }));
      expect(vars(getFieldList(git, "Creature List")[0]).quest1).toBeUndefined();
      expect(vars(getFieldList(git, "Creature List")[1]).quest_event).toBeUndefined();
      // the conversation and the journal the quest created are gone, and Ned has no conversation again
      expect(mockIndex.parsedGff.has(`${dlgRes}.dlg`)).toBe(false);
      expect(mockIndex.resources.has(`${dlgRes}.dlg`)).toBe(false);
      expect(getFieldStr(getFieldList(git, "Creature List")[0], "Conversation")).toBe("");
      expect(mockIndex.parsedGff.has("module.jrl")).toBe(false);
    } finally {
      await done();
    }
  });

  it("build then remove puts the module back as it was (only the shared runtime scripts stay)", async () => {
    (mockIndex.parsedGff.get("module.ifo") as unknown as GffObj).Mod_OnAcquirItem = v("resref", "x2_mod_def_aqu");
    await addResource("bounty_orc.utc", { __data_type: "UTC ", ...creature("bounty_orc") });
    const specs = [
      SPEC,
      JSON.stringify({
        name: "Pelt",
        giver: "farmer_ned",
        template: "fetch",
        itemName: "Wolf pelt",
        journal: ["a", "b", "c"],
      }),
      JSON.stringify({
        name: "Orc Bounty",
        giver: "farmer_ned",
        template: "bounty",
        target: "bounty_orc",
        spawn: { resref: "bounty_orc", area: "fold", x: 20, y: 20, count: 2, tag: "bounty_orc_1" },
      }),
    ];
    const tags = ["q_wolves_at_the_fold", "q_pelt", "b_orc_bounty"];
    // an empty list or empty resref is the same as none (the mock objects start without them; real GFF always has both)
    const snap = () =>
      new Map(
        [...mockIndex.parsedGff.entries()].map(([k, d]) => [
          k,
          JSON.stringify(d, (_key, val) =>
            val &&
            typeof val === "object" &&
            ((val.type === "list" && val.value?.length === 0) || (val.type === "resref" && val.value === ""))
              ? undefined
              : val,
          ),
        ]),
      );
    const { c, done } = await client();
    try {
      for (let i = 0; i < specs.length; i++) {
        const before = snap();
        const resourcesBefore = new Set(mockIndex.resources.keys());
        json(await c.callTool({ name: "build_quest", arguments: { spec: specs[i] } }));
        json(await c.callTool({ name: "remove_quest", arguments: { tag: tags[i] } }));
        const after = snap();
        const problems: string[] = [];
        for (const [k, d] of before) if (after.get(k) !== d) problems.push(`changed: ${k}`);
        for (const k of after.keys()) if (!before.has(k)) problems.push(`left behind: ${k}`);
        const stray = [...mockIndex.resources.keys()].filter(
          (k) => !resourcesBefore.has(k) && !/^(inc_quest|inc_sim|q_[a-z_]+)\.(nss|ncs)$/.test(k),
        );
        problems.push(...stray.map((k) => `resource left behind: ${k}`));
        if (problems.length) {
          for (const [k, d] of before) {
            if (after.get(k) === d) continue;
            const a = JSON.parse(d) as unknown;
            const b = JSON.parse(after.get(k) ?? "null") as unknown;
            const walk = (x: unknown, y: unknown, at: string): void => {
              if (JSON.stringify(x) === JSON.stringify(y)) return;
              if (x && y && typeof x === "object" && typeof y === "object")
                for (const key of new Set([...Object.keys(x), ...Object.keys(y)]))
                  walk((x as Record<string, unknown>)[key], (y as Record<string, unknown>)[key], `${at}.${key}`);
              else problems.push(`${k}${at}: ${JSON.stringify(x)} -> ${JSON.stringify(y)}`);
            };
            walk(a, b, "");
          }
        }
        expect(problems, `${tags[i]}: ${problems.join("; ")}`).toEqual([]);
      }
    } finally {
      await done();
    }
  });

  it("quest answers return to a hub: About <quest> for each active subject, plus [Leave]; removed with the quest", async () => {
    const { c, done } = await client();
    try {
      json(await c.callTool({ name: "build_quest", arguments: { spec: SPEC } }));
      const dlg = mockIndex.parsedGff.get("dq_farmer_ned.dlg") as unknown as GffObj;
      const entries = getFieldList(dlg, "EntryList");
      const replies = getFieldList(dlg, "ReplyList");
      const text = (n: GffObj) => getFieldLocStr(n, "Text");
      const hubReplies = replies.filter((r) => /:hub:/.test(getFieldStr(r, "Comment")));
      expect(hubReplies.map(text).every((t) => t.startsWith("About: "))).toBe(true);
      expect(hubReplies.length).toBeGreaterThanOrEqual(2); // the offer and a reminder
      expect(replies.filter((r) => getFieldStr(r, "Comment") === "mcpq:_hub:leave")).toHaveLength(1);
      const accept = entries.find((e) => /s1:accept$/.test(getFieldStr(e, "Comment"))) as GffObj;
      const links = getFieldList(accept, "RepliesList");
      expect(links.length).toBeGreaterThanOrEqual(2);
      const targets = links.map((l) => getFieldStr(replies[getFieldNum(l, "Index")], "Comment"));
      expect(targets).toContain("mcpq:_hub:leave");
      expect(targets.some((t) => /:hub:s1$/.test(t))).toBe(true); // reminder for the quest now running
      const conds = links.filter((l) => getFieldStr(l, "Active") === "q_chk");
      expect(conds.length).toBeGreaterThan(0);
      // the explicit exit is still the only way out: no entry from this quest ends the talk by accident
      json(await c.callTool({ name: "remove_quest", arguments: { tag: "q_wolves_at_the_fold" } }));
      expect(mockIndex.parsedGff.has("dq_farmer_ned.dlg")).toBe(false); // nothing left in it: the builder's dialog goes
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

  it("spawns a bounty target on accept: waypoint placed, q_act parameters set, kill needs no placed copy", async () => {
    await addResource("bounty_orc.utc", { __data_type: "UTC ", ...creature("bounty_orc") });
    const { c, done } = await client();
    try {
      const spec = JSON.stringify({
        name: "Orc Bounty",
        giver: "farmer_ned",
        template: "bounty",
        target: "bounty_orc",
        spawn: { resref: "bounty_orc", area: "fold", x: 20, y: 20, count: 2, tag: "bounty_orc_1" },
      });
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec } }));
      expect(r.success).toBe(true);

      const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
      const wps = getFieldList(git, "WaypointList");
      expect(wps.map((w) => getFieldStr(w, "Tag"))).toEqual(["b_orc_bounty_s1_spawn"]);
      // The target was not placed in the area; the spawn creates it.
      expect(getFieldList(git, "Creature List").map((x) => getFieldStr(x, "Tag"))).not.toContain("bounty_orc");

      const ned = getFieldList(git, "Creature List").find((x) => getFieldStr(x, "Tag") === "farmer_ned") as GffObj;
      const dlg = mockIndex.parsedGff.get(`${getFieldStr(ned, "Conversation")}.dlg`) as unknown as GffObj;
      const accept = getFieldList(dlg, "EntryList").find((e) => getFieldStr(e, "Script") === "q_act") as GffObj;
      expect(getScriptParams(accept, "ActionParams")).toMatchObject({
        target: "1",
        spawn: "bounty_orc",
        at: "b_orc_bounty_s1_spawn",
        spawn_count: "2",
        spawn_tag: "bounty_orc_1",
        spawn_key: "b_orc_bounty_1",
      });
      // The blueprint carries the kill wiring the spawned copies inherit.
      const bp = mockIndex.parsedGff.get("bounty_orc.utc") as unknown as GffObj;
      expect(getFieldStr(bp, "ScriptDeath")).toBe("q_ondeath");
    } finally {
      await done();
    }
  });

  it("a spawn can depend on an earlier outcome: flag, ifSet and ifUnset reach the q_act line", async () => {
    await addResource("bounty_orc.utc", { __data_type: "UTC ", ...creature("bounty_orc") });
    const { c, done } = await client();
    try {
      const spec = JSON.stringify({
        name: "Orc Bounty",
        giver: "farmer_ned",
        template: "bounty",
        target: "bounty_orc",
        spawn: {
          resref: "bounty_orc",
          area: "fold",
          x: 20,
          y: 20,
          count: 2,
          tag: "bounty_orc_1",
          flag: { var: "orc_alarm", ifSet: 5, ifUnset: 1 },
        },
      });
      expect(json(await c.callTool({ name: "build_quest", arguments: { spec } })).success).toBe(true);
      const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
      const ned = getFieldList(git, "Creature List").find((x) => getFieldStr(x, "Tag") === "farmer_ned") as GffObj;
      const dlg = mockIndex.parsedGff.get(`${getFieldStr(ned, "Conversation")}.dlg`) as unknown as GffObj;
      const accept = getFieldList(dlg, "EntryList").find((e) => getFieldStr(e, "Script") === "q_act") as GffObj;
      expect(getScriptParams(accept, "ActionParams")).toMatchObject({
        spawn_flag: "orc_alarm",
        spawn_flag_set: "5",
        spawn_flag_unset: "1",
      });
      const bad = (await c.callTool({
        name: "build_quest",
        arguments: { spec: spec.replace('"ifSet":5', '"ifSet":9') },
      })) as { content: Array<{ text: string }>; isError?: boolean };
      expect(bad.isError).toBe(true);
      expect(bad.content[0].text).toContain("flag.ifSet");
    } finally {
      await done();
    }
  });

  it("an ability check with a named difficulty uses q_check; a plain skill check still uses q_roll", async () => {
    const { c, done } = await client();
    try {
      const spec = (check: object) =>
        JSON.stringify({
          name: "Hard Talk",
          giver: "farmer_ned",
          stages: [
            { do: "talk", journal: "a" },
            { do: "talk", journal: "b", check, end: true },
          ],
        });
      const reply = () => {
        const dlg = mockIndex.parsedGff.get("dq_farmer_ned.dlg") as unknown as GffObj;
        return getFieldList(dlg, "ReplyList").find((r) => getFieldStr(r, "Comment").endsWith(":try")) as GffObj;
      };
      json(
        await c.callTool({ name: "build_quest", arguments: { spec: spec({ ability: "cha", difficulty: "hard" }) } }),
      );
      expect(getFieldStr(reply(), "Script")).toBe("q_check");
      expect(getScriptParams(reply(), "ActionParams")).toMatchObject({
        ability: "cha",
        difficulty: "hard",
        who: "best",
      });
      json(await c.callTool({ name: "remove_quest", arguments: { tag: "q_hard_talk" } }));
      json(await c.callTool({ name: "build_quest", arguments: { spec: spec({ skill: "persuade", dc: 15 }) } }));
      expect(getFieldStr(reply(), "Script")).toBe("q_roll");
    } finally {
      await done();
    }
  });

  it("an encounter chain: killing the lookout brings in the main force (spawn on an event stage)", async () => {
    await addResource("wolf_pack.utc", { __data_type: "UTC ", ...creature("wolf_pack") });
    const { c, done } = await client();
    try {
      const spec = JSON.stringify({
        name: "Lookout and Pack",
        giver: "farmer_ned",
        stages: [
          { do: "talk", journal: "Ned wants the wolves gone." },
          {
            do: "kill",
            target: "wolf_alpha",
            journal: "The lookout is dead; the pack is coming.",
            spawn: { resref: "wolf_pack", area: "fold", x: 25, y: 25, count: 3, tag: "wolf_pack_1" },
          },
          { do: "kill", target: "wolf_pack", journal: "The pack is destroyed." },
          { do: "return", journal: "Ned paid me." },
        ],
      });
      const r = json(await c.callTool({ name: "build_quest", arguments: { spec } }));
      expect(r.success).toBe(true);
      const git = mockIndex.parsedGff.get("fold.git") as unknown as GffObj;
      const wolf = getFieldList(git, "Creature List").find((x) => getFieldStr(x, "Tag") === "wolf_alpha") as GffObj;
      expect(vars(wolf)).toMatchObject({
        quest1_spawn: "wolf_pack",
        quest1_spawn_at: "q_lookout_and_pack_s2_spawn",
        quest1_spawn_key: "q_lookout_and_pack_2",
        quest1_spawn_count: "3",
        quest1_spawn_tag: "wolf_pack_1",
      });
      // The pack is spawned, not placed in the area; its death script is on the blueprint.
      expect(getFieldList(git, "Creature List").map((x) => getFieldStr(x, "Tag"))).not.toContain("wolf_pack");
      const bp = mockIndex.parsedGff.get("wolf_pack.utc") as unknown as GffObj;
      expect(getFieldStr(bp, "ScriptDeath")).toBe("q_ondeath");
      expect(getFieldList(git, "WaypointList").map((w) => getFieldStr(w, "Tag"))).toContain(
        "q_lookout_and_pack_s2_spawn",
      );
    } finally {
      await done();
    }
  });

  it("refuses a spawn on a stage that isn't advanced from a dialog line", async () => {
    const { c, done } = await client();
    try {
      const spec = JSON.stringify({
        name: "Bad Spawn",
        giver: "farmer_ned",
        stages: [
          { do: "talk", journal: "a" },
          { do: "custom", journal: "b", spawn: { resref: "x", at: "wp" } },
        ],
      });
      const r = await c.callTool({ name: "build_quest", arguments: { spec } });
      expect(JSON.stringify(r)).toContain("not escort or custom");
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
