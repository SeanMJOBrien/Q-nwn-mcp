/**
 * Regression test for a real bug found while live-testing the systest-module
 * skill (branch systest-live-run-and-generalized-spec): compile_script wrote
 * a real .ncs file to disk but never registered it in index.resources, so
 * every verify_* check using checkScriptRef() (src/util/verify/common.ts)
 * kept reporting "uncompiled_script" for scripts that had, in fact, compiled
 * successfully moments earlier in the same session.
 *
 * This is exactly this project's own documented "reference index staleness"
 * bug class (see CLAUDE.md's list_script_references/find_orphans pitfall),
 * now confirmed for compile_script specifically — and a real-world hit,
 * since this project's own documented convention for avoiding write_script's
 * compile:true race is the two-step write_script(compile:false) +
 * compile_script() pattern this test exercises.
 *
 * writeAndCompileScript (src/util/script-writer.ts, used by write_script's
 * own compile:true path and by every script-generator tool) already
 * registered the .ncs correctly — only the standalone compile_script tool
 * handler was missing this step. Fixed in src/tools/script-tools.ts.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { ModuleIndex } from "../types/module.js";

// ─── Mocks ────────────────────────────────────────────────────────────────

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async () => {}),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
  readTextFile: vi.fn(async (filePath: string) => fs.readFile(filePath, "utf-8")),
  disassembleNcs: vi.fn(async () => ""),
  // Mirrors a real nwnsc success: writes the .ncs file to disk, same as the
  // real compileScript (src/nim-tools.ts) does via the real compiler binary.
  compileScript: vi.fn(async (_src: string, outPath: string) => {
    await fs.writeFile(outPath, Buffer.from([0x4e, 0x43, 0x53, 0x20]));
    return { success: true, output: "" };
  }),
}));

let mockIndex: ModuleIndex;
let tempDir: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

function createMockIndex(): ModuleIndex {
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
  } as unknown as ModuleIndex;
}

async function createTestClient(registerFn: (server: McpServer) => void): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerFn(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function json(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const t = result.content.find((c) => c.type === "text")?.text ?? "{}";
  return JSON.parse(t);
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-script-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("compile_script registers the compiled .ncs in index.resources", () => {
  it("is visible to index.resources immediately after compiling (the two-step write_script(compile:false) + compile_script() pattern)", async () => {
    const { registerScriptTools } = await import("./script-tools.js");
    const { client, cleanup } = await createTestClient(registerScriptTools);
    try {
      const written = await client.callTool({
        name: "write_script",
        arguments: { resref: "a_test_script", source: "void main() { }", compile: false },
      });
      expect(json(written).success).toBe(true);
      expect(mockIndex.resources.has("a_test_script.ncs")).toBe(false);

      const compiled = await client.callTool({
        name: "compile_script",
        arguments: { resref: "a_test_script" },
      });
      expect(json(compiled).success).toBe(true);

      // This is the actual regression: before the fix, compile_script never
      // touched index.resources, so this stayed false even though the real
      // .ncs file existed on disk and the compile genuinely succeeded.
      expect(mockIndex.resources.has("a_test_script.ncs")).toBe(true);
      const entry = mockIndex.resources.get("a_test_script.ncs");
      expect(entry?.extension).toBe("ncs");
      expect(entry?.filePath).toContain("a_test_script.ncs");
    } finally {
      await cleanup();
    }
  });

  it("records a real sizeBytes matching the file actually written to disk", async () => {
    const { registerScriptTools } = await import("./script-tools.js");
    const { client, cleanup } = await createTestClient(registerScriptTools);
    try {
      await client.callTool({ name: "write_script", arguments: { resref: "a_sized", source: "void main() { }", compile: false } });
      await client.callTool({ name: "compile_script", arguments: { resref: "a_sized" } });

      const entry = mockIndex.resources.get("a_sized.ncs");
      const onDiskSize = (await fs.stat(entry!.filePath)).size;
      expect(entry?.sizeBytes).toBe(onDiskSize);
    } finally {
      await cleanup();
    }
  });
});
