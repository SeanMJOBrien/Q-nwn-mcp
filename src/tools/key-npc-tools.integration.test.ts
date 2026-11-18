import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ dirs: [] }),
  buildDialogSummary: () => ({}),
}));

const base = { resref: "boss_a", name: "Boss A", area: "a1", x: "10", y: "10", race: "6", classId: "2", level: "8", gender: "0" };

describe("build_key_npc validation", () => {
  it("refuses a bad resref, race, level, conversation and a bad spot before writing, with isError", async () => {
    mockIndex = { tempDir: "/tmp/none", resources: new Map([["boss_a.utc", {}]]), areas: new Map(), parsedGff: new Map() } as unknown as ModuleIndex;
    const { registerKeyNpcTools } = await import("./key-npc-tools.js");
    const server = new McpServer({ name: "t", version: "1" });
    registerKeyNpcTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    const run = async (args: Record<string, unknown>) => {
      const r = (await c.callTool({ name: "build_key_npc", arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
      return { ...JSON.parse(r.content[0].text), isError: r.isError };
    };
    expect((await run({ ...base, resref: "x".repeat(17) })).error).toContain("16 characters");
    expect((await run({ ...base, resref: "other", race: "20" })).error).toContain("race must be 0-6");
    expect((await run({ ...base, resref: "other", level: "0" })).error).toContain("level");
    // an existing blueprint is reused, but only on a good spot: here the area does not exist, so nothing is written
    const dup = await run(base);
    expect(dup.error).toContain("nothing was built: No area a1");
    expect(dup.fix).toContain("adventure_find_walkable");
    expect(dup.isError).toBe(true);
    expect((await run({ ...base, resref: "other", conversation: "dlg_bandit_leader" })).error).toContain("at most 16 characters");
    await c.close();
    await server.close();
  });
});
