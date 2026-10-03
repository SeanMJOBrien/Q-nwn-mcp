/**
 * Integration tests for the local-variable (VarTable) tools:
 * get_object_variables / set_object_variables / remove_object_variable.
 *
 * Covers both targeting modes — a placed GIT instance (area + tag) and a
 * standalone blueprint resource (resref + blueprintType) — since a placed
 * instance's VarTable is a separate copy from its blueprint's and the tools
 * must resolve + write back each correctly.
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

/** A minimal .git document with one creature in the Creature List. */
function makeGitDoc(creatureTag: string): GffObj {
  return {
    __data_type: "GIT ",
    "Creature List": {
      type: "list",
      value: [
        { __struct_id: 4, Tag: { type: "cexostring", value: creatureTag } },
      ],
    },
  } as unknown as GffObj;
}

function seedAreaResource(index: ModuleIndex, areaResref: string, creatureTag: string): string {
  const key = `${areaResref}.git`;
  index.parsedGff.set(key, makeGitDoc(creatureTag) as unknown as GffDocument);
  index.resources.set(key, { resref: areaResref, extension: "git", filePath: path.join(tempDir, key), sizeBytes: 1 });
  return key;
}

/** A minimal standalone .uti blueprint document. */
function makeUtiDoc(tag: string): GffObj {
  return {
    __data_type: "UTI ",
    Tag: { type: "cexostring", value: tag },
  } as unknown as GffObj;
}

function seedItemBlueprint(index: ModuleIndex, resref: string, tag: string): string {
  const key = `${resref}.uti`;
  index.parsedGff.set(key, makeUtiDoc(tag) as unknown as GffDocument);
  index.resources.set(key, { resref, extension: "uti", filePath: path.join(tempDir, key), sizeBytes: 1 });
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
  tempDir = path.join(os.tmpdir(), `nwn-mcp-vartest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("placed-instance targeting (area + tag)", () => {
  it("set_object_variables then get_object_variables round-trips a variable", async () => {
    const key = seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const setResult = await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          tag: "hench_01",
          variables: JSON.stringify([{ name: "HENCH_LEVEL", type: "int", value: 5 }]),
        },
      });
      const set = parseResult(setResult) as { success: boolean; variables: Array<{ name: string; value: number }> };
      expect(set.success).toBe(true);
      expect(set.variables).toEqual([{ name: "HENCH_LEVEL", type: "int", value: 5 }]);

      // Confirm it was actually written back to the GIT doc, not just returned.
      const doc = mockIndex.parsedGff.get(key) as GffObj;
      const creature = (doc["Creature List"] as { value: GffObj[] }).value[0];
      expect(creature.VarTable).toBeDefined();

      const getResult = await client.callTool({
        name: "get_object_variables",
        arguments: { area: "testarea", tag: "hench_01" },
      });
      const got = parseResult(getResult) as { variables: Array<{ name: string; value: number }> };
      expect(got.variables).toEqual([{ name: "HENCH_LEVEL", type: "int", value: 5 }]);
    } finally {
      await cleanup();
    }
  });

  it("merges by name instead of duplicating, and leaves unrelated variables alone", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          tag: "hench_01",
          variables: JSON.stringify([
            { name: "HENCH_LEVEL", type: "int", value: 3 },
            { name: "SPEC_RACE", type: "int", value: 1 },
          ]),
        },
      });
      const setResult = await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          tag: "hench_01",
          variables: JSON.stringify([{ name: "hench_level", type: "int", value: 9 }]),
        },
      });
      const set = parseResult(setResult) as { variables: Array<{ name: string; value: number }> };
      expect(set.variables).toHaveLength(2);
      expect(set.variables.find(v => v.name === "HENCH_LEVEL")?.value).toBe(9);
      expect(set.variables.find(v => v.name === "SPEC_RACE")?.value).toBe(1);
    } finally {
      await cleanup();
    }
  });

  it("finds the object by tag without listName by searching every GIT list", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({
        name: "get_object_variables",
        arguments: { area: "testarea", tag: "hench_01" },
      });
      const got = parseResult(result) as { target: string };
      expect(got.target).toContain("Creature List");
    } finally {
      await cleanup();
    }
  });

  it("remove_object_variable removes one variable by name and reports remaining", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          tag: "hench_01",
          variables: JSON.stringify([
            { name: "HENCH_LEVEL", type: "int", value: 3 },
            { name: "SPEC_RACE", type: "int", value: 1 },
          ]),
        },
      });

      const removeResult = await client.callTool({
        name: "remove_object_variable",
        arguments: { area: "testarea", tag: "hench_01", name: "HENCH_LEVEL" },
      });
      const removed = parseResult(removeResult) as { success: boolean; removedCount: number; remainingVariables: Array<{ name: string }> };
      expect(removed.success).toBe(true);
      expect(removed.removedCount).toBe(1);
      expect(removed.remainingVariables).toEqual([{ name: "SPEC_RACE", type: "int", value: 1 }]);
    } finally {
      await cleanup();
    }
  });

  it("remove_object_variable with all:true clears every variable", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          tag: "hench_01",
          variables: JSON.stringify([
            { name: "HENCH_LEVEL", type: "int", value: 3 },
            { name: "SPEC_RACE", type: "int", value: 1 },
          ]),
        },
      });

      const removeResult = await client.callTool({
        name: "remove_object_variable",
        arguments: { area: "testarea", tag: "hench_01", all: true },
      });
      const removed = parseResult(removeResult) as { removedCount: number; remainingVariables: unknown[] };
      expect(removed.removedCount).toBe(2);
      expect(removed.remainingVariables).toEqual([]);
    } finally {
      await cleanup();
    }
  });

  it("supports listName + index targeting as an alternative to tag", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const setResult = await client.callTool({
        name: "set_object_variables",
        arguments: {
          area: "testarea",
          listName: "Creature List",
          index: "0",
          variables: JSON.stringify([{ name: "HENCH_LEVEL", type: "int", value: 7 }]),
        },
      });
      const set = parseResult(setResult) as { success: boolean; target: string };
      expect(set.success).toBe(true);
      expect(set.target).toContain("Creature List[0]");
    } finally {
      await cleanup();
    }
  });

  it("returns a clear error instead of throwing when the tag isn't found", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({
        name: "get_object_variables",
        arguments: { area: "testarea", tag: "nonexistent" },
      });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/No object tagged 'nonexistent' found/);
    } finally {
      await cleanup();
    }
  });

  it("remove_object_variable reports a missing variable name without mutating state", async () => {
    seedAreaResource(mockIndex, "testarea", "hench_01");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({
        name: "remove_object_variable",
        arguments: { area: "testarea", tag: "hench_01", name: "NOT_SET" },
      });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/not found/);
    } finally {
      await cleanup();
    }
  });
});

describe("standalone blueprint targeting (resref + blueprintType)", () => {
  it("set_object_variables writes to the blueprint resource file, not a GIT", async () => {
    const key = seedItemBlueprint(mockIndex, "my_special_item", "my_special_item");
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const setResult = await client.callTool({
        name: "set_object_variables",
        arguments: {
          resref: "my_special_item",
          blueprintType: "uti",
          variables: JSON.stringify([{ name: "LOOT_INTENTIONAL", type: "int", value: 1 }]),
        },
      });
      const set = parseResult(setResult) as { success: boolean; target: string };
      expect(set.success).toBe(true);
      expect(set.target).toContain("blueprint my_special_item.uti");

      const onDisk = JSON.parse(await fs.readFile(mockIndex.resources.get(key)!.filePath, "utf-8")) as GffObj;
      expect(onDisk.VarTable).toBeDefined();
    } finally {
      await cleanup();
    }
  });

  it("errors clearly when the blueprint isn't a real module resource (resman-only)", async () => {
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({
        name: "get_object_variables",
        arguments: { resref: "nw_wswls001", blueprintType: "uti" },
      });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/not found as a module resource/);
    } finally {
      await cleanup();
    }
  });

  it("requires blueprintType alongside resref", async () => {
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({
        name: "get_object_variables",
        arguments: { resref: "my_special_item" },
      });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/'blueprintType' is required/);
    } finally {
      await cleanup();
    }
  });
});

describe("invalid targeting", () => {
  it("errors when neither a placed-instance target nor a blueprint target is given", async () => {
    const { registerVariableTools } = await import("./variable-tools.js");
    const { client, cleanup } = await createTestClient([registerVariableTools]);
    try {
      const result = await client.callTool({ name: "get_object_variables", arguments: {} });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/Provide either/);
    } finally {
      await cleanup();
    }
  });
});
