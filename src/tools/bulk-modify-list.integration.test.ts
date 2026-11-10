import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", async (orig) => ({ ...(await orig<typeof import("../module-loader.js")>()), requireIndex: () => mockIndex, buildResmanOptions: async () => ({}) }));
const written: unknown[] = [];
vi.mock("../nim-tools.js", async (orig) => ({ ...(await orig<typeof import("../nim-tools.js")>()), jsonToGff: vi.fn(async (d: unknown) => { written.push(d); }), gffToJson: vi.fn(async () => ({})) }));

const creature = (tag: string, faction: number) => ({ __struct_id: 4, Tag: { type: "cexostring", value: tag }, FactionID: { type: "word", value: faction } });

describe("bulk_modify_list", () => {
  it("sets a field on every matching struct, coerces strings, dry-runs, and changes nothing on failure", async () => {
    const git = { "Creature List": { type: "list", value: [creature("a", 2), creature("b", 1), creature("c", 2)] } };
    mockIndex = { parsedGff: new Map([["area.git", git as unknown as GffObj]]), resources: new Map([["area.git", { filePath: "/tmp/area.git" }]]) } as unknown as ModuleIndex;
    const { registerWriteTools } = await import("./write-tools.js");
    const server = new McpServer({ name: "t", version: "1" });
    registerWriteTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    const run = async (args: Record<string, unknown>) => {
      const r = (await c.callTool({ name: "bulk_modify_list", arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
      return { ...JSON.parse(r.content[0].text.startsWith("{") ? r.content[0].text : "{}"), text: r.content[0].text, isError: !!r.isError };
    };
    const base = { resource: "area", type: "git", listPath: "Creature List", where: '{"FactionID":2}', set: '{"FactionID":"4"}' };
    const dry = await run({ ...base, dryRun: true });
    expect(dry.text).toContain("matched");
    expect(dry.matched).toBe(2);
    expect(written).toHaveLength(0);
    const real = await run(base);
    expect(real.matched).toBe(2);
    const list = (mockIndex.parsedGff.get("area.git") as unknown as { "Creature List": { value: Array<{ FactionID: { value: number } }> } })["Creature List"].value;
    expect(list.map((x) => x.FactionID.value)).toEqual([4, 1, 4]);
    expect(written).toHaveLength(1);
    const bad = await run({ ...base, where: undefined, set: '{"Nope":"1"}' });
    expect(bad.isError).toBe(true);
    expect(list.map((x) => x.FactionID.value)).toEqual([4, 1, 4]);
    await c.close();
    await server.close();
  });
});
