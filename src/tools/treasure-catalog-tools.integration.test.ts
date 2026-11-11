import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerTreasureCatalogTools } from "./treasure-catalog-tools.js";

describe("list_treasure_samples", () => {
  it("returns categories near a level from the committed catalog and filters by kind and property", async () => {
    const server = new McpServer({ name: "t", version: "1" });
    registerTreasureCatalogTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    const call = async (args: Record<string, string>) => {
      const r = (await c.callTool({ name: "list_treasure_samples", arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
      expect(r.isError).toBeFalsy();
      return JSON.parse(r.content[0].text);
    };
    const near = await call({ level: "5", group: "armor", limit: "3" });
    expect(near.catalog.categories).toBeGreaterThan(50);
    expect(near.categories).toHaveLength(3);
    for (const cat of near.categories) expect(cat.group).toBe("armor");
    // nearest first: the first armor category suits level 5
    expect(near.categories[0].level.min).toBeLessThanOrEqual(5);
    expect(near.categories[0].level.max).toBeGreaterThanOrEqual(5);
    const rings = await call({ value: "2000", group: "ring", limit: "2" });
    expect(rings.categories[0].group).toBe("ring");
    await c.close();
    await server.close();
  });
});
