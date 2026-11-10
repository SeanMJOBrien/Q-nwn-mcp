/** create_dm_area: copies the fixed template area once, registers it, and (re)writes the two books in the chest. */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

const chestGit = () => ({
  __data_type: "GIT ",
  "Creature List": { type: "list", value: [] },
  "Placeable List": {
    type: "list",
    value: [{ __struct_id: 9, Tag: { type: "cexostring", value: "dm_chest" }, HasInventory: { type: "byte", value: 1 }, Useable: { type: "byte", value: 1 }, ItemList: { type: "list", value: [] } }],
  },
  "Door List": { type: "list", value: [] },
  "Encounter List": { type: "list", value: [] },
  TriggerList: { type: "list", value: [] },
  WaypointList: { type: "list", value: [{ __struct_id: 5, Tag: { type: "cexostring", value: "DM_AREA" } }] },
  SoundList: { type: "list", value: [] },
  StoreList: { type: "list", value: [] },
});

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async (file: string) => (file.endsWith(".git") ? chestGit() : { __data_type: "X   " })),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
}));
let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../module-loader.js")>();
  return { ...actual, requireIndex: () => mockIndex };
});
vi.mock("./tileset-tools.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tileset-tools.js")>();
  return { ...actual, invalidateTagToAreaCache: vi.fn() };
});

let tempDir: string;
let client: Client;
let prevAdventures: string | undefined;

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-dm-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(path.join(tempDir, "mod"), { recursive: true });
  prevAdventures = process.env.MCP_FOLDER_ADVENTURES;
  process.env.MCP_FOLDER_ADVENTURES = path.join(tempDir, "adv");
  mockIndex = {
    modPath: path.join(tempDir, "m.mod"),
    tempDir: path.join(tempDir, "mod"),
    moduleName: "Demo Module",
    resources: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    parsedGff: new Map(),
  } as unknown as ModuleIndex;
  mockIndex.parsedGff.set("module.ifo", { Mod_Area_list: { type: "list", value: [] } } as unknown as GffObj);
  mockIndex.resources.set("module.ifo", { resref: "module", extension: "ifo", filePath: path.join(tempDir, "mod", "module.ifo"), sizeBytes: 1 });
  const server = new McpServer({ name: "t", version: "1" });
  const { registerDmAreaTools } = await import("./dm-area-tools.js");
  registerDmAreaTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "c", version: "1" });
  await Promise.all([server.connect(a), client.connect(b)]);
});

afterEach(async () => {
  if (prevAdventures === undefined) process.env.MCP_FOLDER_ADVENTURES = undefined;
  else process.env.MCP_FOLDER_ADVENTURES = prevAdventures;
  await fs.rm(tempDir, { recursive: true, force: true });
});

const call = async (args: Record<string, unknown>) => {
  const r = (await client.callTool({ name: "create_dm_area", arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
  return { text: r.content[0].text, isError: !!r.isError };
};

describe("create_dm_area", () => {
  it("needs story text", async () => {
    const r = await call({});
    expect(r.isError).toBe(true);
    expect(r.text).toContain("No story text");
  });

  it("copies the template, registers the area and fills the chest with both books", async () => {
    const r = await call({ story: "The whole story.", guide: "How to run it." });
    expect(r.isError).toBe(false);
    const out = JSON.parse(r.text);
    expect(out.areaCopied).toBe(true);
    expect(out.books.map((b: { resref: string }) => b.resref)).toEqual(["dm_book_story", "dm_book_guide"]);
    expect(mockIndex.areas.has("dm_area")).toBe(true);
    const ifo = mockIndex.parsedGff.get("module.ifo") as GffObj;
    expect(JSON.stringify(ifo)).toContain("dm_area");
    const git = mockIndex.parsedGff.get("dm_area.git") as GffObj;
    const chest = (git["Placeable List"] as { value: GffObj[] }).value[0];
    const tags = (chest.ItemList as { value: GffObj[] }).value.map((i) => (i.Tag as { value: string }).value);
    expect(tags).toEqual(["dm_book_story", "dm_book_guide"]);
    expect(mockIndex.resources.has("dm_book_story.uti")).toBe(true);
  });

  it("is idempotent: a second run replaces the books and does not copy the area again", async () => {
    await call({ story: "v1", guide: "g1" });
    const r = JSON.parse((await call({ story: "v2 text", guide: "g2 text" })).text);
    expect(r.areaCopied).toBe(false);
    const git = mockIndex.parsedGff.get("dm_area.git") as GffObj;
    const chest = (git["Placeable List"] as { value: GffObj[] }).value[0];
    const items = (chest.ItemList as { value: GffObj[] }).value;
    expect(items).toHaveLength(2);
    expect(JSON.stringify(items[0])).toContain("v2 text");
  });

  it("makes only the story book and warns when there is no DM guide", async () => {
    const r = JSON.parse((await call({ story: "Only a story." })).text);
    expect(r.books).toHaveLength(1);
    expect(r.warnings.join(" ")).toContain("No DM guide");
  });
});
