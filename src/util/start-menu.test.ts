import { describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerStartMenuTools } from "../tools/start-menu-tools.js";
import { FOCUS } from "./focus.js";
import { entryPlan, findEntry, menuText, START_MENU } from "./start-menu.js";

describe("start menu", () => {
  it("lists every entry with a unique letter, in order, and the user's examples", () => {
    const keys = START_MENU.map((e) => e.key);
    expect(keys).toEqual([...keys].sort());
    expect(new Set(keys).size).toBe(keys.length);
    const text = menuText();
    expect(text).toContain('A. Create NPCs, henchmen or companions — e.g. "I only need help creating a few NPCs or henchmen"');
    expect(text).toContain("bazaar area with tents and stalls");
    for (const e of START_MENU) if (e.focus) expect(FOCUS).toContain(e.focus);
  });

  it("finds an entry by letter or by words", () => {
    expect(findEntry("c")?.title).toBe("Set a creature's spells, feats or levels");
    expect(findEntry("Option E.")?.key).toBe("E");
    expect(findEntry("I want a market with merchants")?.key).toBe("D");
    expect(findEntry("Z")).toBeUndefined();
  });

  it("says how to start: a new module, the user's module, or the one loaded", () => {
    const h = START_MENU.find((e) => e.key === "H");
    const c = START_MENU.find((e) => e.key === "C");
    if (!h || !c) throw new Error("menu changed");
    expect(entryPlan(h, false).start).toMatch(/^create_module/);
    expect(entryPlan(c, false).start).toMatch(/^load_module/);
    expect(entryPlan(c, true).start).toBe("the loaded module");
    expect(entryPlan(c, true).record).toContain('focus: "creatures"');
  });

  it("serves the menu through the tool and the start prompt", async () => {
    const server = new McpServer({ name: "t", version: "1" });
    registerStartMenuTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    try {
      const menu = JSON.parse(((await c.callTool({ name: "show_menu", arguments: {} })) as { content: Array<{ text: string }> }).content[0].text);
      expect(menu.menu).toBe(menuText());
      const plan = JSON.parse(((await c.callTool({ name: "show_menu", arguments: { choice: "E" } })) as { content: Array<{ text: string }> }).content[0].text);
      expect(plan.firstCalls).toContain("build_quest");
      expect((await c.listPrompts()).prompts.map((p) => p.name)).toContain("start");
      const prompt = await c.getPrompt({ name: "start" });
      expect((prompt.messages[0].content as { text: string }).text).toContain(menuText());
    } finally {
      await c.close();
      await server.close();
    }
  });
});
