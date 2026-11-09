import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
let tempDir: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ dirs: [mockIndex.tempDir] }),
}));

async function client(): Promise<{ c: Client; close: () => Promise<void> }> {
  const { registerPhaseTools } = await import("./phase-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerPhaseTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, close: async () => { await c.close(); await server.close(); } };
}

function body(r: unknown): Record<string, unknown> {
  return JSON.parse(((r as { content: Array<{ text: string }> }).content[0]).text);
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-phase-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = {
    tempDir,
    resources: new Map(),
    parsedGff: new Map(),
    areas: new Map(),
    twodaTables: new Map(),
  } as unknown as ModuleIndex;
});
afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("phase_check", () => {
  it("start: stops naming the missing section", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n");
    const { c, close } = await client();
    try {
      const r = await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } });
      expect(r.isError).toBe(true);
      expect(body(r).missing).toEqual(["Plot"]);
    } finally {
      await close();
    }
  });

  it("start: passes when every section is present", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n## Plot\np\n");
    const { c, close } = await client();
    try {
      const r = await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } });
      expect(body(r).ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("end: writes the status entry, partial when the phase section is missing", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n## Plot\np\n");
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "phase_check", arguments: { phase: "plot", step: "end" } }));
      expect(r.status).toBe("success");
      const r2 = body(await c.callTool({ name: "phase_check", arguments: { phase: "environment", step: "end", errors: '["boom"]' } }));
      expect(r2.status).toBe("partial");
      const file = JSON.parse(await fs.readFile(path.join(tempDir, "adventure-status.json"), "utf8"));
      expect(file.phases.plot.status).toBe("success");
      expect(file.phases.environment.errors).toContain("boom");
    } finally {
      await close();
    }
  });

  it("a declared skip: skipped on both steps, recorded, and later phases don't need its section", async () => {
    await fs.writeFile(
      path.join(tempDir, "adventure.md"),
      "## Module\n- **Scope:** quests only\n- **Skip phases:** areas\n## Plot\np\n",
    );
    const { c, close } = await client();
    try {
      const a = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } }));
      expect(a.skipped).toBe(true);
      const e = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "end" } }));
      expect(e.skipped).toBe(true);
      const file = JSON.parse(await fs.readFile(path.join(tempDir, "adventure-status.json"), "utf8"));
      expect(file.phases.areas.status).toBe("skipped");
      const env = body(await c.callTool({ name: "phase_check", arguments: { phase: "environment", step: "start" } }));
      expect(env.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("plot end runs the story graph check: a dangling lead makes the phase partial", async () => {
    await fs.writeFile(
      path.join(tempDir, "adventure.md"),
      "## Module\nm\n## Plot\np\n### Story Graph\n- beat B1 | act: setup | leads: B9\n- beat B2 | act: climax\n",
    );
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "phase_check", arguments: { phase: "plot", step: "end" } }));
      expect(r.status).toBe("partial");
      expect(JSON.stringify(r.errors)).toContain("story_dangling_lead");
    } finally {
      await close();
    }
  });
});
