import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it, vi } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
vi.mock("../module-loader.js", () => ({ requireIndex: () => mockIndex }));
const written: unknown[] = [];
vi.mock("../nim-tools.js", () => ({ jsonToGff: vi.fn(async (doc: unknown) => { written.push(doc); }) }));

const item = (resref: string, base: number) => ({ __struct_id: 0, TemplateResRef: { type: "resref", value: resref }, Tag: { type: "cexostring", value: resref }, BaseItem: { type: "int", value: base } });
const cat = (id: number, items: unknown[]) => ({ __struct_id: id, ItemList: { type: "list", value: items } });

describe("move_store_item", () => {
  it("moves an item to the tab its StorePanel names, or to an explicit tab, and refuses a missing item", async () => {
    const store = { StoreList: { type: "list", value: [cat(0, []), cat(1, []), cat(2, []), cat(3, []), cat(4, [item("nw_kukri", 42)])] } };
    mockIndex = {
      parsedGff: new Map([["shop.utm", store as unknown as GffObj]]),
      resources: new Map([["shop.utm", { filePath: "/tmp/shop.utm" }]]),
      twodaTables: new Map([["baseitems", { rows: new Map([[42, { StorePanel: "1" }]]) }]]),
    } as unknown as ModuleIndex;
    const { registerStoreMoveTools } = await import("./store-move-tools.js");
    const server = new McpServer({ name: "t", version: "1" });
    registerStoreMoveTools(server);
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    const c = new Client({ name: "c", version: "1" });
    await c.connect(b);
    const run = async (args: Record<string, unknown>) => {
      const r = (await c.callTool({ name: "move_store_item", arguments: args })) as { content: Array<{ text: string }>; isError?: boolean };
      return { text: r.content[0].text, isError: !!r.isError };
    };
    const r = await run({ resref: "shop", item: "nw_kukri" });
    expect(r.isError).toBe(false);
    expect(JSON.parse(r.text).moved).toEqual([{ item: "nw_kukri", from: 4, to: 1 }]);
    const cats = (store.StoreList.value as Array<{ ItemList: { value: unknown[] } }>);
    expect(cats[1].ItemList.value).toHaveLength(1);
    expect(cats[4].ItemList.value).toHaveLength(0);
    expect(written).toHaveLength(1);
    const again = await run({ resref: "shop", item: "nw_kukri" });
    expect(again.isError).toBe(true);
    const forced = await run({ resref: "shop", item: "nw_kukri", toCategory: "4" });
    expect(forced.isError).toBe(false);
    await c.close();
    await server.close();
  });
});
