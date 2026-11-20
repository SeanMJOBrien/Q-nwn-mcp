import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerAdventureTools } from "./adventure-tools.js";

describe("adventure_apply_layout by layoutId", () => {
  it("with no layout given and none generated, says to generate first and pass the layoutId", async () => {
    const server = new McpServer({ name: "t", version: "1" });
    registerAdventureTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const client = new Client({ name: "c", version: "1" });
    await client.connect(b);
    const r = (await client.callTool({ name: "adventure_apply_layout", arguments: { area: "x" } })) as { isError?: boolean; content: Array<{ text: string }> };
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("adventure_generate_layout");
    expect(r.content[0].text).toContain("layoutId");
    const unknown = (await client.callTool({ name: "adventure_apply_layout", arguments: { area: "x", layoutId: "layout_99" } })) as { content: Array<{ text: string }> };
    expect(unknown.content[0].text).toContain('No generated layout "layout_99"');
  });
});
