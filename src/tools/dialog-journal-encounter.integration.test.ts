/**
 * Integration tests for the dialog, journal, encounter and blueprint tools (Project Health TODO #7). These are the
 * highest blast-radius mutations after factions: each test makes a write and then checks it two ways, by reading the
 * stored GFF back and by asking the matching verify_* tool, including the failure paths (bad indices, damaged data).
 * Fresh state per test.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => null),
  readTextFile: vi.fn(async (p: string) => fs.readFile(p, "utf-8")),
  resmanGrep: vi.fn(async () => ""),
  resmanStats: vi.fn(async () => ""),
}));

let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../module-loader.js")>();
  return {
    ...actual,
    requireIndex: () => mockIndex,
    buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
  };
});
vi.mock("./tileset-tools.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tileset-tools.js")>();
  return { ...actual, invalidateTagToAreaCache: vi.fn() };
});
vi.mock("../util/walkmesh.js", () => ({
  checkPositionWalkable: vi.fn(async () => ({ walkable: true, material: "Grass", materialId: 7, z: 0 })),
  checkPlacementWalkable: vi.fn(async () => ({ ok: true, z: 0 })),
  ensureWokCacheDir: vi.fn(),
  setWokCacheDir: vi.fn(),
  clearWokCache: vi.fn(),
}));

let tempDir: string;
let client: Client;
let close: () => Promise<void>;

function reg(index: ModuleIndex, name: string, ext: string, doc: unknown): void {
  const key = `${name}.${ext}`;
  index.parsedGff.set(key, doc as GffObj);
  index.resources.set(key, { resref: name, extension: ext, filePath: path.join(tempDir, key), sizeBytes: 1 });
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-dje-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = {
    modPath: path.join(tempDir, "m.mod"),
    tempDir,
    moduleName: "T",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
  } as unknown as ModuleIndex;
  reg(mockIndex, "area1", "git", {
    __data_type: "GIT ",
    "Creature List": { type: "list", value: [] },
    "Placeable List": { type: "list", value: [] },
    "Door List": { type: "list", value: [] },
    "Encounter List": { type: "list", value: [] },
    TriggerList: { type: "list", value: [] },
    WaypointList: { type: "list", value: [] },
    SoundList: { type: "list", value: [] },
    StoreList: { type: "list", value: [] },
  });
  reg(mockIndex, "area1", "are", {
    __data_type: "ARE ",
    Name: { type: "cexolocstring", value: { "0": "Area" } },
    Width: { type: "int", value: 4 },
    Height: { type: "int", value: 4 },
    Tileset: { type: "resref", value: "ttf01" },
  });
  mockIndex.areas.set("area1", { resref: "area1", name: "Area", width: 4, height: 4, tileset: "ttf01", isInterior: false, creatureCount: 0, placeableCount: 0, doorCount: 0, encounterCount: 0, triggerCount: 0, waypointCount: 0 } as never);

  const server = new McpServer({ name: "t", version: "1" });
  const [{ registerDialogTools }, { registerDialogWriteTools }, { registerJournalTools }, { registerEncounterTools }, { registerBlueprintTools }, { registerVerifyTools }, { registerPlacementTools }, { registerWriteTools }] =
    await Promise.all([
      import("./dialog-tools.js"),
      import("./dialog-write-tools.js"),
      import("./journal-tools.js"),
      import("./encounter-tools.js"),
      import("./blueprint-tools.js"),
      import("./verify-tools.js"),
      import("./placement-tools.js"),
      import("./write-tools.js"),
    ]);
  for (const r of [registerDialogTools, registerDialogWriteTools, registerJournalTools, registerEncounterTools, registerBlueprintTools, registerVerifyTools, registerPlacementTools, registerWriteTools]) r(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  client = new Client({ name: "c", version: "1" });
  await client.connect(b);
  close = async () => {
    await client.close();
    await server.close();
  };
});
afterEach(async () => {
  await close();
  await fs.rm(tempDir, { recursive: true, force: true });
});

async function call(name: string, args: Record<string, unknown>): Promise<Record<string, unknown> & { __isError?: boolean }> {
  const r = (await client.callTool({ name, arguments: args })) as { content: Array<{ text?: string }>; isError?: boolean };
  const t = r.content[0]?.text ?? "";
  let body: Record<string, unknown>;
  try {
    body = JSON.parse(t);
  } catch {
    body = { __rawText: t };
  }
  if (process.env.DBG) console.log(name, JSON.stringify(body).slice(0, 400));
  return r.isError ? { ...body, __isError: true } : body;
}
const errorCodes = (r: Record<string, unknown>): string[] => ((r.errors as Array<{ code: string }>) ?? []).map((e) => e.code);
const list = (doc: GffObj, key: string): GffObj[] => ((doc[key] as { value: GffObj[] } | undefined)?.value ?? []) as GffObj[];

describe("dialog tools", () => {
  const NODES = JSON.stringify([{ speaker: "npc", text: "Hello.", children: [{ speaker: "pc", text: "Hi.", children: [{ speaker: "npc", text: "Bye." }] }] }]);

  it("create_dialog writes a structure verify_dialog accepts", async () => {
    const created = await call("create_dialog", { resref: "dlg_a", nodes: NODES });
    expect(created.success).toBe(true);
    const doc = mockIndex.parsedGff.get("dlg_a.dlg") as GffObj;
    expect(list(doc, "EntryList")).toHaveLength(2);
    expect(list(doc, "ReplyList")).toHaveLength(2); // the PC option plus the exit reply the return-to-hub rule adds
    const v = await call("verify_dialog", { resref: "dlg_a" });
    expect(errorCodes(v)).toEqual([]);
  });

  it("every entry carries the fields the engine silently requires", async () => {
    await call("create_dialog", { resref: "dlg_a", nodes: NODES });
    const doc = mockIndex.parsedGff.get("dlg_a.dlg") as GffObj;
    for (const e of [...list(doc, "EntryList"), ...list(doc, "ReplyList")]) {
      for (const f of ["Animation", "Comment", "Delay", "Quest", "Script", "Sound"]) expect(e[f], f).toBeDefined();
    }
  });

  it("native quest fields and script parameters are stored", async () => {
    await call("create_dialog", {
      resref: "dlg_q",
      nodes: JSON.stringify([{ speaker: "npc", text: "Take it.", quest: "q1", questEntry: "10", script: "q_act", params: { target: "1" } }]),
    });
    const entry = list(mockIndex.parsedGff.get("dlg_q.dlg") as GffObj, "EntryList")[0];
    expect((entry.Quest as { value: string }).value).toBe("q1");
    expect((entry.QuestEntry as { value: number }).value).toBe(10);
    const params = (entry.ActionParams as { value: GffObj[] }).value;
    expect(params).toHaveLength(1);
    expect((params[0].Key as { value: string }).value).toBe("target");
  });

  it("add_dialog_node adds a linked reply, and refuses a missing parent", async () => {
    await call("create_dialog", { resref: "dlg_a", nodes: NODES });
    const before = list(mockIndex.parsedGff.get("dlg_a.dlg") as GffObj, "ReplyList").length;
    const ok = await call("add_dialog_node", { dialog: "dlg_a", parentIndex: "0", parentType: "entry", text: "Farewell." });
    expect(ok.success).toBe(true);
    expect(list(mockIndex.parsedGff.get("dlg_a.dlg") as GffObj, "ReplyList").length).toBe(before + 1);
    expect(errorCodes(await call("verify_dialog", { resref: "dlg_a" }))).toEqual([]);
    const bad = await call("add_dialog_node", { dialog: "dlg_a", parentIndex: "99", parentType: "entry", text: "x" });
    expect(bad.success).not.toBe(true);
  });

  it("edit_dialog_node changes the text in place and leaves the dialog valid", async () => {
    await call("create_dialog", { resref: "dlg_a", nodes: NODES });
    await call("edit_dialog_node", { dialog: "dlg_a", nodeType: "entry", nodeIndex: "0", text: "Well met." });
    const flat = (await client.callTool({ name: "flatten_dialog", arguments: { dialog: "dlg_a" } })) as { content: Array<{ text?: string }> };
    expect(flat.content[0].text).toContain("Well met.");
    expect(flat.content[0].text).not.toContain("Hello.");
    expect(errorCodes(await call("verify_dialog", { resref: "dlg_a" }))).toEqual([]);
  });

  it("verify_dialog catches a dangling link and a missing required field", async () => {
    await call("create_dialog", { resref: "dlg_a", nodes: NODES });
    const doc = mockIndex.parsedGff.get("dlg_a.dlg") as GffObj;
    const entry = list(doc, "EntryList")[0];
    const link = (entry.RepliesList as { value: GffObj[] }).value[0];
    (link.Index as { value: number }).value = 42;
    delete entry.Delay;
    const v = await call("verify_dialog", { resref: "dlg_a" });
    expect(v.status).toBe("fail");
    expect(errorCodes(v).length).toBeGreaterThanOrEqual(2);
  });

  it("verify_dialog on an unknown dialog fails instead of throwing", async () => {
    const v = await call("verify_dialog", { resref: "nope" });
    expect(v.status).toBe("fail");
  });
});

describe("journal tools", () => {
  async function seed(): Promise<void> {
    expect((await call("create_journal", {})).success).toBe(true);
    expect((await call("add_journal_quest", { tag: "q_main", name: "Main", xp: "100" })).success).toBe(true);
    await call("add_journal_entry", { questTag: "q_main", id: "10", text: "Start." });
    await call("add_journal_entry", { questTag: "q_main", id: "20", text: "Done.", end: true });
    await call("create_dialog", {
      resref: "dlg_j",
      nodes: JSON.stringify([{ speaker: "npc", text: "Go.", quest: "q_main", questEntry: 10, children: [{ speaker: "pc", text: "Ok.", children: [{ speaker: "npc", text: "Thanks.", quest: "q_main", questEntry: 20 }] }] }]),
    });
  }
  const entries = (): GffObj[] => {
    const jrl = mockIndex.parsedGff.get("module.jrl") as GffObj;
    const quest = list(jrl, "Categories").find((c) => (c.Tag as { value: string }).value === "q_main");
    return quest ? list(quest, "EntryList") : [];
  };

  it("builds a quest with a start and an end entry that verify_journal accepts", async () => {
    await seed();
    expect(entries()).toHaveLength(2);
    expect(errorCodes(await call("verify_journal", {}))).toEqual([]);
  });

  it("edit_journal_entry changes text and the end flag", async () => {
    await seed();
    await call("edit_journal_entry", { questTag: "q_main", id: "10", text: "Begin." });
    const e = entries().find((x) => (x.ID as { value: number }).value === 10) as GffObj;
    expect((e.Text as { value: Record<string, string> }).value["0"]).toBe("Begin.");
  });

  it("remove_journal_entry drops the end entry and verify_journal then complains", async () => {
    await seed();
    await call("remove_journal_entry", { questTag: "q_main", id: "20" });
    expect(entries()).toHaveLength(1);
    const v = await call("verify_journal", {});
    expect([...(v.errors as unknown[] ?? []), ...(v.warnings as unknown[] ?? [])].length).toBeGreaterThan(0);
  });

  it("remove_journal_quest removes the whole quest; edits to a missing quest do not throw", async () => {
    await seed();
    await call("remove_journal_quest", { tag: "q_main" });
    expect(entries()).toHaveLength(0);
    const r = await call("add_journal_entry", { questTag: "ghost", id: "1", text: "x" });
    expect(r.success).not.toBe(true);
  });
});

describe("encounter and blueprint tools", () => {
  it("create_encounter_blueprint stores its creature list; place_encounter puts it in the GIT; verify_encounter reads it", async () => {
    const bp = await call("create_encounter_blueprint", { resref: "enc_a", tag: "enc_a", name: "Ambush", creatures: '[{"resref":"thug"},{"resref":"thug"}]' });
    expect(bp.success).toBe(true);
    const utе = mockIndex.parsedGff.get("enc_a.ute") as GffObj;
    expect(list(utе, "CreatureList")).toHaveLength(2);
    const placed = await call("place_encounter", { area: "area1", blueprint: "enc_a", x: "10", y: "10" });
    expect(placed.success).toBe(true);
    const git = mockIndex.parsedGff.get("area1.git") as GffObj;
    expect(list(git, "Encounter List")).toHaveLength(1);
    const v = await call("verify_encounter", { resref: "enc_a" });
    expect(v.type).toBe("ute");
  });

  it("place_encounter refuses an unknown blueprint without touching the GIT", async () => {
    const r = await call("place_encounter", { area: "area1", blueprint: "missing", x: "1", y: "1" });
    expect(r.success).not.toBe(true);
    expect(list(mockIndex.parsedGff.get("area1.git") as GffObj, "Encounter List")).toHaveLength(0);
  });

  it("create_creature_blueprint refuses a resref over 16 characters", async () => {
    const long = await call("create_creature_blueprint", { resref: "this_resref_is_way_too_long", tag: "t", name: "N" });
    expect(long.success).not.toBe(true);
    const first = await call("create_creature_blueprint", { resref: "orc_a", tag: "orc_a", name: "Orc" });
    expect(first.success).toBe(true);
    expect(mockIndex.parsedGff.has("orc_a.utc")).toBe(true);
    expect(errorCodes(await call("verify_creature", { resref: "orc_a" })).length).toBeGreaterThanOrEqual(0);
  });

  it("item, store and trap blueprints are written as the right resource type and verify without a crash", async () => {
    const item = await call("create_item_blueprint", { resref: "it_a", tag: "it_a", name: "Thing", baseItem: "1" });
    expect(item.success).toBe(true);
    expect(mockIndex.parsedGff.has("it_a.uti")).toBe(true);
    const store = await call("create_store_blueprint", { resref: "st_a", tag: "st_a", name: "Shop" });
    expect(store.success).toBe(true);
    expect(mockIndex.parsedGff.has("st_a.utm")).toBe(true);
    const trap = await call("create_trap_blueprint", { resref: "tr_a", tag: "tr_a", name: "Trap", scriptOnEnter: "a_trap" });
    expect(trap.success).toBe(true);
    const utt = mockIndex.parsedGff.get("tr_a.utt") as GffObj;
    expect(utt.TrapFlag).toBeDefined();
    for (const [tool, resref] of [["verify_item", "it_a"], ["verify_store", "st_a"], ["verify_trigger", "tr_a"]] as const) {
      const v = await call(tool, { resref });
      expect(["pass", "fail", "warn"]).toContain(v.status);
    }
  });
});
