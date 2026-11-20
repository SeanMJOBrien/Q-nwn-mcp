import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { withLenientArgs } from "./lenient-args.js";
import { numParam, optNumParam } from "./params.js";

async function connect(register: (s: McpServer) => void) {
  const server = new McpServer({ name: "t", version: "1" });
  register(withLenientArgs(server));
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const client = new Client({ name: "c", version: "1" });
  await client.connect(b);
  return client;
}

const text = (r: unknown) => ((r as { content: Array<{ text: string }> }).content[0]?.text ?? "");

describe("lenient tool arguments (open models)", () => {
  it("passes numbers, booleans, arrays and objects to the handler as the strings it expects", async () => {
    let seen: Record<string, unknown> = {};
    const client = await connect((s) =>
      s.tool(
        "echo",
        "test",
        { x: numParam("x"), y: optNumParam("y"), list: z.string().describe("JSON array"), obj: z.string().optional(), flag: z.boolean().optional() },
        async (args) => {
          seen = args;
          return { content: [{ type: "text", text: "ok" }] };
        },
      ),
    );
    const r = await client.callTool({ name: "echo", arguments: { x: 12, y: "3.5", list: ["a", "b"], obj: { k: 1 }, flag: "true" } });
    expect(text(r)).toBe("ok");
    expect(seen).toEqual({ x: "12", y: "3.5", list: '["a","b"]', obj: '{"k":1}', flag: true });
  });

  it("refuses an argument the tool does not have, naming the real parameters", async () => {
    let called = false;
    const client = await connect((s) =>
      s.tool("forge", "test", { race: numParam("race"), level: numParam("level"), domains: z.string().optional() }, async () => {
        called = true;
        return { content: [{ type: "text", text: "ok" }] };
      }),
    );
    const r = await client.callTool({ name: "forge", arguments: { race: 6, level: 1, stats: "STR+4", type: "cleric" } });
    expect(called).toBe(false);
    expect((r as { isError?: boolean }).isError).toBe(true);
    expect(text(r)).toContain('"stats", "type"');
    expect(text(r)).toContain("race (required), level (required), domains");
  });

  it("still refuses a missing required argument", async () => {
    const client = await connect((s) => s.tool("need", "test", { x: numParam("x") }, async () => ({ content: [{ type: "text", text: "ok" }] })));
    const r = await client.callTool({ name: "need", arguments: {} });
    expect((r as { isError?: boolean }).isError).toBe(true);
  });
});
