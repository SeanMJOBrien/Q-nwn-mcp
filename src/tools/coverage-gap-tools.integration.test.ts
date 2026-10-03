/**
 * Integration tests for tools that had zero test coverage per the
 * CLAUDE.md "Project Health TODOs" #4 audit: export_resource, tlkify_module,
 * search_tlk, list_tlk_entries (resman/lookup tools), and generate_area_map /
 * start_web_editor / stop_web_editor (the Python-subprocess web tools).
 *
 * The web tools spawn an external Python process via child_process — that's
 * mocked here the same way nim-tools.js is mocked elsewhere, so these tests
 * never touch a real process or the filesystem outside tempDir. process.kill
 * is also mocked globally in this file: start_web_editor/stop_web_editor call
 * it to check/kill the tracked pid, and letting that hit the real OS would be
 * signaling this test runner's own process.
 */

import { describe, it, expect, vi, beforeEach, beforeAll, afterEach, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

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
  resmanGrep: vi.fn(async () => ""),
  resmanStats: vi.fn(async () => "resman stack: 1 container"),
  erfTlkify: vi.fn(async () => "Extracted 12 strings"),
  readTextFile: vi.fn(async () => ""),
}));

vi.mock("child_process", async () => {
  const { promisify } = await import("util");
  // execFile needs BOTH forms: the plain callback form (just in case) and the
  // util.promisify.custom form the real child_process.execFile defines —
  // web-tools.ts calls `promisify(execFile)`, and promisify prefers the custom
  // symbol over generically wrapping the callback (which would otherwise
  // resolve with only the first callback arg, not {stdout, stderr}).
  const execFile = vi.fn((...args: unknown[]) => {
    const callback = args[args.length - 1] as (err: unknown, stdout: string, stderr: string) => void;
    callback(null, "generated map: 3 areas", "");
  });
  (execFile as unknown as Record<symbol, unknown>)[promisify.custom] = async () => ({
    stdout: "generated map: 3 areas",
    stderr: "",
  });
  return {
    execFile,
    spawn: vi.fn(() => ({ pid: 99999, unref: vi.fn() })),
  };
});

let mockIndex: ModuleIndex;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

let tempDir: string;
let webToolsDir: string;

function createMockIndex(overrides?: Partial<ModuleIndex>): ModuleIndex {
  return {
    modPath: path.join(tempDir, "mymod.mod"),
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
  tempDir = path.join(os.tmpdir(), `nwn-mcp-covgaptest-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("export_resource", () => {
  it("copies the resource's file to outputPath and reports its size", async () => {
    const sourcePath = path.join(tempDir, "source", "my_sword.uti");
    await fs.mkdir(path.dirname(sourcePath), { recursive: true });
    await fs.writeFile(sourcePath, "fake uti bytes");
    mockIndex.resources.set("my_sword.uti", { resref: "my_sword", extension: "uti", filePath: sourcePath, sizeBytes: 14 });

    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient([registerWriteTools]);
    try {
      const outputPath = path.join(tempDir, "exported", "my_sword.uti");
      const result = await client.callTool({
        name: "export_resource",
        arguments: { resref: "my_sword", type: "uti", outputPath },
      });
      const parsed = parseResult(result) as { success: boolean; outputPath: string; sizeBytes: number };
      expect(parsed.success).toBe(true);
      expect(parsed.sizeBytes).toBe(14);

      const written = await fs.readFile(outputPath, "utf-8");
      expect(written).toBe("fake uti bytes");
    } finally {
      await cleanup();
    }
  });

  it("errors clearly when the resource isn't in the module", async () => {
    const { registerWriteTools } = await import("./write-tools.js");
    const { client, cleanup } = await createTestClient([registerWriteTools]);
    try {
      const result = await client.callTool({
        name: "export_resource",
        arguments: { resref: "nonexistent", type: "uti", outputPath: path.join(tempDir, "out.uti") },
      });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/Resource not found/);
    } finally {
      await cleanup();
    }
  });
});

describe("tlkify_module", () => {
  it("calls erfTlkify and reports the generated tlk/mod paths", async () => {
    const { registerResmanTools } = await import("./resman-tools.js");
    const { client, cleanup } = await createTestClient([registerResmanTools]);
    try {
      const outputTlkPath = path.join(tempDir, "out.tlk");
      const result = await client.callTool({
        name: "tlkify_module",
        arguments: { outputTlkPath },
      });
      const parsed = parseResult(result) as { success: boolean; tlkFile: string; modFile: string; output: string };
      expect(parsed.success).toBe(true);
      expect(parsed.tlkFile).toBe(outputTlkPath);
      expect(parsed.modFile).toMatch(/\.tlkified\.mod$/);
      expect(parsed.output).toBe("Extracted 12 strings");
    } finally {
      await cleanup();
    }
  });

  it("respects an explicit outputModPath instead of deriving one", async () => {
    const { registerResmanTools } = await import("./resman-tools.js");
    const { client, cleanup } = await createTestClient([registerResmanTools]);
    try {
      const outputModPath = path.join(tempDir, "custom-name.mod");
      const result = await client.callTool({
        name: "tlkify_module",
        arguments: { outputTlkPath: path.join(tempDir, "out.tlk"), outputModPath },
      });
      const parsed = parseResult(result) as { modFile: string };
      expect(parsed.modFile).toBe(outputModPath);
    } finally {
      await cleanup();
    }
  });
});

describe("search_tlk / list_tlk_entries", () => {
  function seedTlks() {
    mockIndex.customTlk = new Map([
      [16777216, "Welcome to the Salt Gate"],
      [16777217, "The gate is locked"],
    ]);
    mockIndex.baseTlk = new Map([
      [100, "Hello there"],
      [101, "Welcome, traveler"],
    ]);
  }

  it("search_tlk matches case-insensitively across both tables by default", async () => {
    seedTlks();
    const { registerLookupTools } = await import("./lookup-tools.js");
    const { client, cleanup } = await createTestClient([registerLookupTools]);
    try {
      const result = await client.callTool({ name: "search_tlk", arguments: { query: "welcome" } });
      const parsed = parseResult(result) as { matchCount: number; matches: Array<{ source: string; strref: number }> };
      expect(parsed.matchCount).toBe(2);
      expect(parsed.matches.map(m => m.source).sort()).toEqual(["base", "custom"]);
    } finally {
      await cleanup();
    }
  });

  it("search_tlk source:custom narrows to just the custom table", async () => {
    seedTlks();
    const { registerLookupTools } = await import("./lookup-tools.js");
    const { client, cleanup } = await createTestClient([registerLookupTools]);
    try {
      const result = await client.callTool({ name: "search_tlk", arguments: { query: "welcome", source: "custom" } });
      const parsed = parseResult(result) as { matchCount: number; matches: Array<{ strref: number }> };
      expect(parsed.matchCount).toBe(1);
      expect(parsed.matches[0].strref).toBe(16777216);
    } finally {
      await cleanup();
    }
  });

  it("list_tlk_entries defaults to the custom table only", async () => {
    seedTlks();
    const { registerLookupTools } = await import("./lookup-tools.js");
    const { client, cleanup } = await createTestClient([registerLookupTools]);
    try {
      const result = await client.callTool({ name: "list_tlk_entries", arguments: {} });
      const parsed = parseResult(result) as { count: number; entries: Array<{ source: string }> };
      expect(parsed.count).toBe(2);
      expect(parsed.entries.every(e => e.source === "custom")).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("list_tlk_entries applies a substring filter", async () => {
    seedTlks();
    const { registerLookupTools } = await import("./lookup-tools.js");
    const { client, cleanup } = await createTestClient([registerLookupTools]);
    try {
      const result = await client.callTool({ name: "list_tlk_entries", arguments: { filter: "locked" } });
      const parsed = parseResult(result) as { count: number; entries: Array<{ text: string }> };
      expect(parsed.count).toBe(1);
      expect(parsed.entries[0].text).toBe("The gate is locked");
    } finally {
      await cleanup();
    }
  });

  it("reports no tables available rather than throwing when neither TLK is loaded", async () => {
    const { registerLookupTools } = await import("./lookup-tools.js");
    const { client, cleanup } = await createTestClient([registerLookupTools]);
    try {
      const result = await client.callTool({ name: "search_tlk", arguments: { query: "anything" } });
      const text = result.content.find((c) => c.type === "text")?.text as string;
      expect(text).toMatch(/No TLK tables available/);
    } finally {
      await cleanup();
    }
  });
});

describe("web tools (generate_area_map / start_web_editor / stop_web_editor)", () => {
  beforeAll(async () => {
    // WEB_TOOLS_DIR is resolved once, from this env var, when web-tools.js is
    // first imported — set it before that happens, to a dir holding the two
    // scripts assertScript() checks for, so neither a real install nor the
    // real home directory is required.
    webToolsDir = path.join(os.tmpdir(), `nwn-mcp-webtools-${Date.now()}`);
    await fs.mkdir(webToolsDir, { recursive: true });
    await fs.writeFile(path.join(webToolsDir, "nwn_area_map.py"), "# stub\n");
    await fs.writeFile(path.join(webToolsDir, "nwn_web_editor.py"), "# stub\n");
    process.env.MCP_FOLDER_WEBTOOLS = webToolsDir;

    // start_web_editor/stop_web_editor probe and signal the tracked pid via
    // process.kill — mock it so nothing ever reaches the real OS (the mocked
    // spawn's pid isn't a real process, and this test runner's own pid must
    // never be signaled).
    vi.spyOn(process, "kill").mockImplementation(() => true);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    delete process.env.MCP_FOLDER_WEBTOOLS;
    await fs.rm(webToolsDir, { recursive: true, force: true });
  });

  it("generate_area_map runs the mocked script and reports its output", async () => {
    const { registerWebTools } = await import("./web-tools.js");
    const { client, cleanup } = await createTestClient([registerWebTools]);
    try {
      const outputPath = path.join(tempDir, "map.html");
      const result = await client.callTool({
        name: "generate_area_map",
        arguments: { outputPath, dir: tempDir },
      });
      const parsed = parseResult(result) as { success: boolean; outputPath: string; summary: string };
      expect(parsed.success).toBe(true);
      expect(parsed.summary).toBe("generated map: 3 areas");
    } finally {
      await cleanup();
    }
  });

  it("start_web_editor tracks the process, refuses a second start, and stop_web_editor releases it", async () => {
    const { registerWebTools } = await import("./web-tools.js");
    const { client, cleanup } = await createTestClient([registerWebTools]);
    try {
      const startResult = await client.callTool({
        name: "start_web_editor",
        arguments: { dir: tempDir, port: 8341 },
      });
      const started = parseResult(startResult) as { success: boolean; pid: number; url: string };
      expect(started.success).toBe(true);
      expect(started.url).toContain("8341");

      // Starting again while one is tracked should refuse, not spawn a second one.
      const secondStart = await client.callTool({
        name: "start_web_editor",
        arguments: { dir: tempDir, port: 8342 },
      });
      const secondText = secondStart.content.find((c) => c.type === "text")?.text as string;
      expect(secondText).toMatch(/already running/);

      const stopResult = await client.callTool({ name: "stop_web_editor", arguments: {} });
      const stopText = stopResult.content.find((c) => c.type === "text")?.text as string;
      expect(stopText).toMatch(/Stopped web editor/);

      // Stopping again with nothing tracked reports that cleanly.
      const secondStop = await client.callTool({ name: "stop_web_editor", arguments: {} });
      const secondStopText = secondStop.content.find((c) => c.type === "text")?.text as string;
      expect(secondStopText).toMatch(/No tracked web editor/);
    } finally {
      await cleanup();
    }
  });
});
