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

describe("create_faction + verify_faction", () => {
  it("adds a faction with bilateral reputation entries that verify_faction accepts", async () => {
    seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { registerVerifyTools } = await import("./verify-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools, registerVerifyTools]);
    try {
      const createResult = await client.callTool({
        name: "create_faction",
        arguments: { name: "Merchants", defaultReputation: "75" },
      });
      const created = parseResult(createResult) as { success: boolean; factionId: number; reputationEntriesAdded: number };
      expect(created.success).toBe(true);
      expect(created.factionId).toBe(2);
      // 2 existing factions x 2 directions each — see the real bug this
      // fixed (branch systest-live-run-and-generalized-spec): the old code
      // wrote only the new->existing direction, leaving the engine reading
      // a friendly 100 default for the unset reverse direction live.
      expect(created.reputationEntriesAdded).toBe(4);

      const verifyResult = await client.callTool({ name: "verify_faction", arguments: {} });
      const verified = parseResult(verifyResult) as { status: string; errors: unknown[] };
      expect(verified.status).toBe("pass");
      expect(verified.errors).toHaveLength(0);
    } finally {
      await cleanup();
    }
  });

  it("writes reputation entries in both directions for every existing faction", async () => {
    const key = seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools]);
    try {
      await client.callTool({ name: "create_faction", arguments: { name: "Merchants", defaultReputation: "75" } });

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const repList = (doc.RepList as { value: GffObj[] }).value;
      const pairs = repList.map((e) => [
        (e.FactionID1 as { value: number }).value,
        (e.FactionID2 as { value: number }).value,
      ]);
      // New faction (2) <-> each existing faction (0, 1), both directions.
      expect(pairs).toEqual(
        expect.arrayContaining([[2, 0], [0, 2], [2, 1], [1, 2]]),
      );
      expect(repList.every((e) => (e.FactionRep as { value: number }).value === 75)).toBe(true);

      // The actual root cause found live: FactionRep MUST be `dword` to
      // match every real toolset-authored entry. GFF struct fields are
      // looked up by (label, type) together — an `int`-typed FactionRep
      // with the right label was still invisible to a real engine's loader,
      // silently falling back to a friendly 100 default regardless of the
      // FactionID values or direction (both already-fixed separately above).
      expect(repList.every((e) => (e.FactionRep as { type: string }).type === "dword")).toBe(true);

      const factionList = (doc.FactionList as { value: GffObj[] }).value;
      expect((factionList[2].FactionGlobal as { type: string }).type).toBe("word");
    } finally {
      await cleanup();
    }
  });
});

describe("set_faction_reputation + verify_faction", () => {
  it("creates entries in both directions and leaves the faction table valid", async () => {
    const key = seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { registerVerifyTools } = await import("./verify-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools, registerVerifyTools]);
    try {
      const setResult = await client.callTool({
        name: "set_faction_reputation",
        arguments: { faction1: "0", faction2: "1", reputation: "10" },
      });
      const set = parseResult(setResult) as {
        success: boolean;
        reputation: number;
        action: { forward: string; reverse: string };
      };
      expect(set.success).toBe(true);
      expect(set.reputation).toBe(10);
      // Real bug fixed (branch systest-live-run-and-generalized-spec): the
      // old code wrote only one direction and reported a flat "created"
      // string — a real headless engine then read a friendly 100 default
      // for the unset reverse direction regardless of what was set here.
      expect(set.action).toEqual({ forward: "created", reverse: "created" });

      const verifyResult = await client.callTool({ name: "verify_faction", arguments: {} });
      const verified = parseResult(verifyResult) as { status: string; errors: unknown[] };
      expect(verified.status).toBe("pass");

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const repList = (doc.RepList as { value: GffObj[] }).value;
      expect(repList).toHaveLength(2);
      const pairs = repList.map((e) => [
        (e.FactionID1 as { value: number }).value,
        (e.FactionID2 as { value: number }).value,
      ]);
      expect(pairs).toEqual(expect.arrayContaining([[0, 1], [1, 0]]));
      expect(repList.every((e) => (e.FactionRep as { value: number }).value === 10)).toBe(true);
      // The actual root cause found live — see create_faction's test above.
      expect(repList.every((e) => (e.FactionRep as { type: string }).type === "dword")).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("writes only one entry when faction1 equals faction2 (reputation toward itself)", async () => {
    const key = seedFacResource(mockIndex);

    const { registerFactionTools } = await import("./faction-tools.js");
    const { client, cleanup } = await createTestClient([registerFactionTools]);
    try {
      const setResult = await client.callTool({
        name: "set_faction_reputation",
        arguments: { faction1: "0", faction2: "0", reputation: "100" },
      });
      const set = parseResult(setResult) as { action: { forward: string; reverse: string } };
      expect(set.action).toEqual({ forward: "created", reverse: "created" });

      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const repList = (doc.RepList as { value: GffObj[] }).value;
      expect(repList).toHaveLength(1);
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
