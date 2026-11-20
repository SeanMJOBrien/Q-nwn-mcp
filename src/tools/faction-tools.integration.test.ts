/**
 * Integration tests for the faction tools (create_faction, set_faction_reputation)
 * paired with their verify_faction counterpart — faction edits are state-mutating
 * and high blast-radius (a bad FactionID/FactionRep write breaks every creature
 * assigned to that faction), so each mutation is checked against the same
 * verifier the LLM would call to confirm the result.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
  readTextFile: vi.fn(async () => ""),
}));

let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

let tempDir: string;

function createMockIndex(overrides?: Partial<ModuleIndex>): ModuleIndex {
  return {
    modPath: "/fake/mod.mod",
    tempDir,
    moduleName: "TestModule",
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
    ...overrides,
  };
}

/** A minimal .fac GFF document with two factions and no rep entries yet. */
function makeFacDoc(): GffObj {
  return {
    __data_type: "FAC ",
    FactionList: {
      type: "list",
      value: [
        { __struct_id: 0, FactionName: { type: "cexostring", value: "Hostile" }, FactionParentID: { type: "dword", value: 4294967295 }, FactionGlobal: { type: "byte", value: 1 } },
        { __struct_id: 1, FactionName: { type: "cexostring", value: "Commoner" }, FactionParentID: { type: "dword", value: 4294967295 }, FactionGlobal: { type: "byte", value: 1 } },
      ],
    },
    RepList: { type: "list", value: [] },
  } as unknown as GffObj;
}

function seedFacResource(index: ModuleIndex): string {
  const key = "repute.fac";
  index.parsedGff.set(key, makeFacDoc() as unknown as GffDocument);
  index.resources.set(key, { resref: "repute", extension: "fac", filePath: path.join(tempDir, key), sizeBytes: 1 });
  return key;
}

async function createTestClient(registerFns: Array<(server: McpServer) => void>): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  for (const fn of registerFns) fn(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const textBlock = result.content.find((c) => c.type === "text");
  return textBlock?.text ? JSON.parse(textBlock.text) : null;
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-factiontest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

const pairsOf = (repList: GffObj[]) =>
  repList.map((e) => [(e.FactionID1 as { value: number }).value, (e.FactionID2 as { value: number }).value]);
const repOf = (repList: GffObj[], a: number, b: number) =>
  (repList.find((e) => (e.FactionID1 as { value: number }).value === a && (e.FactionID2 as { value: number }).value === b)
    ?.FactionRep as { value: number } | undefined)?.value;

describe("create_faction + verify_faction", () => {
  it("adds a faction and leaves a table verify_faction accepts", async () => {
    seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { registerVerifyTools } = await import("./verify-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools, registerVerifyTools]);
    try {
      const createResult = await client.callTool({
        name: "create_faction",
        arguments: { name: "Merchants", defaultReputation: "75" },
      });
      const created = parseResult(createResult) as { success: boolean; factionId: number; reputationRows: number };
      expect(created.success).toBe(true);
      expect(created.factionId).toBe(2);
      expect(created.reputationRows).toBe(6); // 3 factions x 2 opinion-holders (faction 0 holds none)

      const verifyResult = await client.callTool({ name: "verify_faction", arguments: {} });
      const verified = parseResult(verifyResult) as { status: string; errors: unknown[] };
      expect(verified.status).toBe("pass");
      expect(verified.errors).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("writes the whole table in the toolset's layout (the layout the engine needs for a custom faction)", async () => {
    const key = seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools]);
    try {
      await client.callTool({ name: "create_faction", arguments: { name: "Merchants", defaultReputation: "75" } });

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const repList = (doc.RepList as { value: GffObj[] }).value;
      // FactionID1 outer 0..2, FactionID2 inner 1..2, no row toward faction 0.
      expect(pairsOf(repList)).toEqual([[0, 1], [0, 2], [1, 1], [1, 2], [2, 1], [2, 2]]);
      expect(repList.map((e) => e.__struct_id)).toEqual([0, 1, 2, 3, 4, 5]);
      expect(repOf(repList, 2, 1)).toBe(75); // faction 1's opinion of the new faction
      expect(repOf(repList, 1, 2)).toBe(75); // the new faction's opinion of faction 1
      expect(repOf(repList, 0, 2)).toBe(75);
      expect(repOf(repList, 2, 2)).toBe(100); // self
      expect(repOf(repList, 0, 1)).toBe(50); // an old pair with no row gets the neutral default
      for (const e of repList) {
        for (const f of ["FactionID1", "FactionID2", "FactionRep"]) expect((e[f] as { type: string }).type).toBe("dword");
      }

      const factionList = (doc.FactionList as { value: GffObj[] }).value;
      expect((factionList[2].FactionGlobal as { type: string }).type).toBe("word");
    } finally {
      await cleanup();
    }
  });
});

describe("set_faction_reputation + verify_faction", () => {
  it("sets both opinions, skips the opinion of faction 0 (it holds none), and leaves the table valid", async () => {
    const key = seedFacResource(mockIndex);
    const doc = mockIndex.parsedGff.get(key) as GffObj;
    // A third faction in the old appended layout: rows toward faction 0, no self row, out of order.
    (doc.FactionList as { value: GffObj[] }).value.push({
      __struct_id: 2,
      FactionName: { type: "cexostring", value: "Prisoner" },
      FactionParentID: { type: "dword", value: 4294967295 },
      FactionGlobal: { type: "word", value: 1 },
    });
    (doc.RepList as { value: GffObj[] }).value.push(
      { __struct_id: 0, FactionID1: { type: "dword", value: 2 }, FactionID2: { type: "dword", value: 0 }, FactionRep: { type: "dword", value: 50 } },
      { __struct_id: 1, FactionID1: { type: "dword", value: 1 }, FactionID2: { type: "dword", value: 2 }, FactionRep: { type: "dword", value: 30 } },
    );

    const { registerFactionTools } = await import("./faction-tools.js");
    const { registerVerifyTools } = await import("./verify-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools, registerVerifyTools]);
    try {
      const setResult = await client.callTool({
        name: "set_faction_reputation",
        arguments: { faction1: "0", faction2: "1", reputation: "10" },
      });
      const set = parseResult(setResult) as { success: boolean; reputation: number; action: { forward: string; reverse: string } };
      expect(set.success).toBe(true);
      expect(set.action.forward).toBe("created");
      expect(set.action.reverse).toMatch(/^skipped/);

      const repList = (doc.RepList as { value: GffObj[] }).value;
      expect(pairsOf(repList)).toEqual([[0, 1], [0, 2], [1, 1], [1, 2], [2, 1], [2, 2]]);
      expect(repOf(repList, 0, 1)).toBe(10);
      expect(repOf(repList, 1, 2)).toBe(30); // an existing value survives the rewrite
      expect(repOf(repList, 2, 2)).toBe(100);

      const verifyResult = await client.callTool({ name: "verify_faction", arguments: {} });
      const verified = parseResult(verifyResult) as { status: string; errors: unknown[]; warnings: unknown[] };
      expect(verified.status).toBe("pass");
    } finally {
      await cleanup();
    }
  });

  it("sets a faction's opinion of itself once", async () => {
    const key = seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools]);
    try {
      await client.callTool({ name: "set_faction_reputation", arguments: { faction1: "1", faction2: "1", reputation: "80" } });
      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const repList = (doc.RepList as { value: GffObj[] }).value;
      expect(repList).toHaveLength(2);
      expect(repOf(repList, 1, 1)).toBe(80);
    } finally {
      await cleanup();
    }
  });

  it("rejects an out-of-range faction ID before writing, so verify_faction never sees a bad reference", async () => {
    seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools]);
    try {
      const result = await client.callTool({
        name: "set_faction_reputation",
        arguments: { faction1: "0", faction2: "99", reputation: "50" },
      });
      const text = (result.content as Array<{ type: string; text?: string }>)[0]?.text ?? "";
      expect(text).toContain("Invalid faction2 ID");
    } finally {
      await cleanup();
    }
  });
});
