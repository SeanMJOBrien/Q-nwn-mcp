import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerCreatureCatalogTools } from "./creature-catalog-tools.js";

describe("list_creature_samples", () => {
  it("returns categories near a CR from the committed catalog, with build recipes", async () => {
    const server = new McpServer({ name: "t", version: "1" });
    registerCreatureCatalogTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    const r = (await c.callTool({ name: "list_creature_samples", arguments: { cr: "7", type: "player-race", limit: "3" } })) as { content: Array<{ text: string }>; isError?: boolean };
    expect(r.isError).toBeFalsy();
    const out = JSON.parse(r.content[0].text);
    expect(out.catalog.categories).toBeGreaterThan(50);
    expect(out.matches).toHaveLength(3);
    for (const m of out.matches) {
      expect(m.type).toBe("player-race");
      expect(m.buildWith.tool).toMatch(/build_key_npc|forge_creature/);
    }
    const monsters = (await c.callTool({ name: "list_creature_samples", arguments: { type: "undead", limit: "2" } })) as { content: Array<{ text: string }> };
    expect(JSON.parse(monsters.content[0].text).matches[0].buildWith.tool).toBe("place_creature");
    await c.close();
    await server.close();
  });
});
