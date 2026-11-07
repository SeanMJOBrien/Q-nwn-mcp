import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

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

async function client() {
  const { registerCompanionTools } = await import("./companion-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerCompanionTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, done: async () => (await c.close(), await server.close()) };
}

const text = (r: unknown) => JSON.parse((r as { content: Array<{ text: string }> }).content[0].text);

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-cmp-${Date.now()}-${Math.random().toString(36).slice(2)}`);
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
});
afterEach(async () => fs.rm(tempDir, { recursive: true, force: true }));

describe("companion tools", () => {
  it("writes and compiles the shared scripts", async () => {
    const { c, done } = await client();
    try {
      const r = text(await c.callTool({ name: "create_companion_system", arguments: { maxCompanions: "2" } }));
      expect(r.success).toBe(true);
      expect(r.maxCompanions).toBe(2);
      expect(r.scripts.map((s: { resref: string }) => s.resref)).toContain("a_hen_join");
      expect(mockIndex.resources.has("a_hen_join.ncs")).toBe(true);
      expect(mockIndex.resources.has("inc_companion.ncs")).toBe(false);
    } finally {
      await done();
    }
  });

  it("builds the dialog and wires it onto the blueprint and its placed copies", async () => {
    const utc = {
      __data_type: "UTC ",
      Tag: { type: "cexostring", value: "elya" },
      TemplateResRef: { type: "resref", value: "elya" },
    };
    mockIndex.parsedGff.set("elya.utc", utc as unknown as GffDocument);
    mockIndex.resources.set("elya.utc", {
      resref: "elya",
      extension: "utc",
      filePath: path.join(tempDir, "elya.utc"),
      sizeBytes: 1,
    });
    const git = {
      __data_type: "GIT ",
      "Creature List": {
        type: "list",
        value: [
          {
            __struct_id: 4,
            Tag: { type: "cexostring", value: "elya" },
            TemplateResRef: { type: "resref", value: "elya" },
          },
        ],
      },
    };
    mockIndex.parsedGff.set("village.git", git as unknown as GffDocument);
    mockIndex.areas.set("village", {} as never);
    const gitPath = path.join(tempDir, "village.git");
    await fs.writeFile(gitPath, JSON.stringify(git));
    mockIndex.resources.set("village.git", { resref: "village", extension: "git", filePath: gitPath, sizeBytes: 1 });

    const { c, done } = await client();
    try {
      await c.callTool({ name: "create_companion_system", arguments: {} });
      const r = text(
        await c.callTool({
          name: "create_companion_dialog",
          arguments: { creature: "elya", introduction: "I'm Elya.", backstory: "Temple." },
        }),
      );
      expect(r.dialog).toBe("dlg_hen_elya");
      expect(r.wired).toEqual({ blueprint: true, placed: ["village:elya"] });
      expect(r.warnings).toBeUndefined();
      expect((utc as unknown as Record<string, { value: string }>).Conversation.value).toBe("dlg_hen_elya");
      const placed = (git["Creature List"].value[0] as unknown as Record<string, { value: string }>).Conversation.value;
      expect(placed).toBe("dlg_hen_elya");

      const dlg = mockIndex.parsedGff.get("dlg_hen_elya.dlg") as unknown as Record<string, { value: GffObj[] }>;
      expect(dlg.StartingList.value.map((l) => (l.Active as { value: string }).value)).toEqual([
        "c_hen_mine",
        "c_hen_full",
        "c_hen_free",
        "",
      ]);

      const again = await c.callTool({
        name: "create_companion_dialog",
        arguments: { creature: "elya", introduction: "x", backstory: "y" },
      });
      expect(again.isError).toBe(true);
    } finally {
      await done();
    }
  });

  it("warns when the scripts or the creature are missing", async () => {
    const { c, done } = await client();
    try {
      const r = text(
        await c.callTool({
          name: "create_companion_dialog",
          arguments: { creature: "nobody", introduction: "x", backstory: "y" },
        }),
      );
      expect(r.warnings).toHaveLength(2);
    } finally {
      await done();
    }
  });
});
