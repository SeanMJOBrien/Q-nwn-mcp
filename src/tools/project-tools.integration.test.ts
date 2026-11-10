import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../module-loader.js")>();
  return { ...actual, requireIndex: () => mockIndex };
});

let tempDir: string;
let client: Client;
let prev: string | undefined;

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(path.join(tempDir, "mod"), { recursive: true });
  prev = process.env.MCP_FOLDER_ADVENTURES;
  process.env.MCP_FOLDER_ADVENTURES = path.join(tempDir, "adv");
  const mod = path.join(tempDir, "mod");
  await fs.writeFile(path.join(mod, "a.nss"), "void main() {}\n");
  await fs.writeFile(path.join(mod, "a.ncs"), Buffer.from([1, 2, 3]));
  await fs.writeFile(path.join(mod, "x.2da"), "2DA V2.0\n");
  mockIndex = { modPath: "/m/demo.mod", tempDir: mod, moduleName: "Demo Module", resources: new Map(), areas: new Map(), dialogs: new Map(), parsedGff: new Map() } as unknown as ModuleIndex;
  const add = (name: string, ext: string) => mockIndex.resources.set(name, { resref: name.split(".")[0], extension: ext, filePath: path.join(mod, name), sizeBytes: 1 });
  add("module.ifo", "ifo");
  add("area1.git", "git");
  add("a.nss", "nss");
  add("a.ncs", "ncs");
  add("x.2da", "2da");
  add("broken.utc", "utc");
  mockIndex.parsedGff.set("module.ifo", { Mod_Name: { type: "cexolocstring", value: "x" } } as unknown as GffObj);
  mockIndex.parsedGff.set("area1.git", { "Creature List": { type: "list", value: [] } } as unknown as GffObj);
  const server = new McpServer({ name: "t", version: "1" });
  const { registerProjectTools } = await import("./project-tools.js");
  registerProjectTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "c", version: "1" });
  await Promise.all([server.connect(a), client.connect(b)]);
});

afterEach(async () => {
  if (prev === undefined) process.env.MCP_FOLDER_ADVENTURES = undefined;
  else process.env.MCP_FOLDER_ADVENTURES = prev;
  await fs.rm(tempDir, { recursive: true, force: true });
});

const run = async (args: Record<string, unknown> = {}) => {
  const r = (await client.callTool({ name: "export_project", arguments: args })) as { content: Array<{ text: string }> };
  return JSON.parse(r.content[0].text);
};

describe("export_project", () => {
  it("writes GFF as JSON, scripts and other files as they are, plus manifest and nasher.cfg", async () => {
    const out = await run();
    expect(out).toMatchObject({ gff: 2, scripts: 1, compiled: 1, other: 1 });
    expect(out.skipped).toHaveLength(1);
    const dir = path.join(tempDir, "adv", "Demo-Module");
    expect(JSON.parse(await fs.readFile(path.join(dir, "src/ifo/module.ifo.json"), "utf-8"))).toEqual(mockIndex.parsedGff.get("module.ifo"));
    expect(await fs.readFile(path.join(dir, "src/nss/a.nss"), "utf-8")).toBe("void main() {}\n");
    expect([...(await fs.readFile(path.join(dir, "src/ncs/a.ncs")))]).toEqual([1, 2, 3]);
    expect(await fs.readFile(path.join(dir, "src/other/x.2da"), "utf-8")).toContain("2DA");
    const manifest = JSON.parse(await fs.readFile(path.join(dir, "project.json"), "utf-8"));
    expect(manifest.resources).toEqual(["a.ncs", "a.nss", "area1.git", "module.ifo", "x.2da"]);
    expect(await fs.readFile(path.join(dir, "nasher.cfg"), "utf-8")).toContain("Demo Module");
  });

  it("leaves unchanged files untouched on a second export", async () => {
    await run();
    const f = path.join(tempDir, "adv", "Demo-Module", "src/nss/a.nss");
    const before = (await fs.stat(f)).mtimeMs;
    await new Promise((r) => setTimeout(r, 20));
    await run();
    expect((await fs.stat(f)).mtimeMs).toBe(before);
  });
});
