import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GffDocument } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
let tempDir: string;
vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [] }),
}));

async function client() {
  const { registerObjectMgmtTools } = await import("./object-mgmt-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerObjectMgmtTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, close: async () => { await c.close(); await server.close(); } };
}

async function add(name: string, ext: string, body: string, gff?: unknown) {
  const filePath = path.join(tempDir, `${name}.${ext}`);
  await fs.writeFile(filePath, body);
  mockIndex.resources.set(`${name}.${ext}`, { resref: name, extension: ext, filePath, sizeBytes: body.length });
  if (gff) mockIndex.parsedGff.set(`${name}.${ext}`, gff as GffDocument);
}

describe("remove_resource", () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rm-res-"));
    mockIndex = {
      modPath: "/x.mod", tempDir, moduleName: "T", resources: new Map(), tags: new Map(), scripts: new Map(), areas: new Map(), dialogs: new Map(),
      creatures: [], items: [], parsedGff: new Map(), twodaTables: new Map(), customTlk: null, baseTlk: null, hakList: [], customTlkName: "", loadWarnings: [],
    } as unknown as ModuleIndex;
  });

  it("removes a script and its compiled file, refusing while another script still names it", async () => {
    await add("a_old", "nss", "void main(){}");
    await add("a_old", "ncs", "x");
    await add("a_user", "nss", 'void main(){ ExecuteScript("a_old", OBJECT_SELF); }');
    const { c, close } = await client();
    const refused = (await c.callTool({ name: "remove_resource", arguments: { resource: "a_old", type: "nss" } })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(refused.isError).toBe(true);
    expect(JSON.parse(refused.content[0].text).referencedBy).toEqual(["a_user.nss"]);
    expect(mockIndex.resources.has("a_old.nss")).toBe(true);
    const done = (await c.callTool({ name: "remove_resource", arguments: { resource: "a_old", type: "nss", force: true } })) as { content: Array<{ text: string }> };
    expect(JSON.parse(done.content[0].text).removed).toBe(true);
    expect(mockIndex.resources.has("a_old.nss")).toBe(false);
    expect(mockIndex.resources.has("a_old.ncs")).toBe(false);
    await expect(fs.access(path.join(tempDir, "a_old.nss"))).rejects.toThrow();
    await close();
  });

  it("removes an unreferenced blueprint and reports a missing one", async () => {
    await add("tr_dart", "uti", "x", { Tag: { type: "cexostring", value: "TR_DART" } });
    const { c, close } = await client();
    const ok = (await c.callTool({ name: "remove_resource", arguments: { resource: "tr_dart", type: "uti" } })) as { content: Array<{ text: string }> };
    expect(JSON.parse(ok.content[0].text).removed).toBe(true);
    const missing = (await c.callTool({ name: "remove_resource", arguments: { resource: "nope", type: "uti" } })) as { isError?: boolean };
    expect(missing.isError).toBe(true);
    await close();
  });
});
