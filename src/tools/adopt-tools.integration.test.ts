import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
let root: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ dirs: [mockIndex.tempDir] }),
}));
vi.mock("./verify-tools.js", () => ({ collectVerifyResults: async () => [] }));

const f = (type: string, value: unknown) => ({ type, value });
const list = (items: unknown[]) => f("list", items);

function creature(tag: string, faction: number, level: number, conversation = "") {
  return {
    Tag: f("cexostring", tag),
    FirstName: f("cexolocstring", { 0: tag }),
    FactionID: f("word", faction),
    Conversation: f("resref", conversation),
    ClassList: list([{ ClassLevel: f("short", level) }]),
  };
}

async function client() {
  const { registerAdoptTools } = await import("./adopt-tools.js");
  const { registerPhaseTools } = await import("./phase-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerAdoptTools(server);
  registerPhaseTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, close: async () => { await c.close(); await server.close(); } };
}
const body = (r: unknown): Record<string, unknown> => JSON.parse(((r as { content: Array<{ text: string }> }).content[0]).text);

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-adopt-"));
  process.env.MCP_FOLDER_ADVENTURES = path.join(root, "adventures");
  const tempDir = path.join(root, "temp");
  await fs.mkdir(tempDir);
  mockIndex = {
    modPath: `${root}/m.mod`,
    tempDir,
    moduleName: "The Salt Gate Conspiracy",
    resources: new Map([["j.jrl", { resref: "j", extension: "jrl", filePath: "", sizeBytes: 0 }]]),
    parsedGff: new Map<string, unknown>([
      ["module.ifo", { Mod_Entry_Area: f("resref", "gate"), Mod_Description: f("cexolocstring", { 0: "" }) }],
      [
        "gate.git",
        {
          "Creature List": list([creature("orc", 1, 3), creature("mira", 4, 1, "mira_dlg")]),
          "Placeable List": list([{}, {}]),
          SoundList: list([]),
          WaypointList: list([]),
          "Door List": list([]),
          TriggerList: list([]),
          StoreList: list([]),
        },
      ],
      [
        "j.jrl",
        { Categories: list([{ Tag: f("cexostring", "salt"), Name: f("cexolocstring", { 0: "Salt" }), EntryList: list([{ ID: f("dword", 1), End: f("word", 0) }]) }]) },
      ],
    ]),
    areas: new Map([["gate", { resref: "gate", name: "The Gate", width: 8, height: 8, tileset: "tcn01", isInterior: false }]]),
    dialogs: new Map(),
    twodaTables: new Map(),
  } as unknown as ModuleIndex;
});
afterEach(async () => {
  delete process.env.MCP_FOLDER_ADVENTURES;
  await fs.rm(root, { recursive: true, force: true });
});

describe("adventure directory, adopt and audit", () => {
  it("get_adventure_dir names the titled folder", async () => {
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "get_adventure_dir", arguments: {} }));
      expect(r.dir).toBe(path.join(root, "adventures", "The-Salt-Gate-Conspiracy"));
      expect((r.files as Record<string, { exists: boolean }>).story.exists).toBe(false);
    } finally {
      await close();
    }
  });

  it("adopt_module writes the story record, reports gaps, and refuses to overwrite it", async () => {
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "adopt_module", arguments: {} }));
      expect(r.ok).toBe(true);
      expect(r.gaps).toEqual(["affordances", "polish", "rewards"]);
      const file = r.file as string;
      expect(file).toBe(path.join(root, "adventures", "The-Salt-Gate-Conspiracy", "adventure.md"));
      const md = await fs.readFile(file, "utf8");
      expect(md).toContain("# Adventure: The Salt Gate Conspiracy");
      expect(md).toContain("mira");
      const again = await c.callTool({ name: "adopt_module", arguments: {} });
      expect(again.isError).toBe(true);
      const forced = body(await c.callTool({ name: "adopt_module", arguments: { overwrite: true } }));
      expect(forced.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("audit_module shows what is done and what is missing, and phase_check sees the adopted story", async () => {
    const { c, close } = await client();
    try {
      const before = body(await c.callTool({ name: "audit_module", arguments: {} }));
      const rows0 = before.rows as Array<{ phase?: string; state: string }>;
      expect(rows0.find((r) => r.phase === "plot")?.state).toBe("missing");
      await c.callTool({ name: "adopt_module", arguments: {} });
      const after = body(await c.callTool({ name: "audit_module", arguments: {} }));
      const rows = after.rows as Array<{ phase?: string; state: string }>;
      expect(rows.find((r) => r.phase === "plot")?.state).toBe("partial");
      expect(rows.find((r) => r.phase === "quests")?.state).toBe("partial"); // a quest with no end entry
      expect(rows.find((r) => r.phase === "challenges")?.state).toBe("done");
      expect((after.gaps as string[]).length).toBeGreaterThan(0);
      // The adopted record lets a phase start; the gap (no affordances) shows as a missing section for the next phase.
      const ok = body(await c.callTool({ name: "phase_check", arguments: { phase: "quests", step: "start" } }));
      expect(ok.ok).toBe(true);
      const gap = await c.callTool({ name: "phase_check", arguments: { phase: "polish", step: "start" } });
      expect(gap.isError).toBe(true);
    } finally {
      await close();
    }
  });

  it("set_project_scope with a focus returns that focus's guide, and reads it back", async () => {
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "set_project_scope", arguments: { kind: "one_feature", scope: "equip my guards", focus: "creatures" } }));
      expect(r.focus).toBe("creatures");
      expect((r.guide as { skills: string[] }).skills).toContain("creature-forge");
      const read = body(await c.callTool({ name: "set_project_scope", arguments: {} }));
      expect((read.guide as { focus: string }).focus).toBe("creatures");
      const ns = body(await c.callTool({ name: "set_project_scope", arguments: { kind: "nwscript_only", scope: "fix scripts" } }));
      expect(ns.focus).toBe("scripting");
    } finally {
      await close();
    }
  });
});
