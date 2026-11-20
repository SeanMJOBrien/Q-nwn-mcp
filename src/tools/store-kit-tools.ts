/**
 * build_store: a merchant's shop in one call, the five-call recipe of docs/phase-prompts/affordances.md (store
 * blueprint with a general stock, placed beside the merchant, an OpenStore script, a "Show me what you have" line on the
 * merchant's greeting). A small model spent twenty turns on an invented store name and source blueprint (The Old Mill,
 * 2026-11-18); the driver now runs this itself when the plot names a merchant.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import { callTool } from "../util/tool-registry.js";

const json = (body: unknown, isError = false) => ({ content: [{ type: "text" as const, text: JSON.stringify(body, null, 1) }], ...(isError ? { isError: true } : {}) });

/** A general store's stock: base-game potions, kits, ammunition, simple weapons and armour (resrefs checked in play). */
export const GENERAL_STOCK: Array<{ resref: string; category: number }> = [
  { resref: "nw_it_mpotion001", category: 2 },
  { resref: "nw_it_mpotion020", category: 2 },
  { resref: "nw_it_mpotion002", category: 2 },
  { resref: "nw_it_medkit001", category: 4 },
  { resref: "nw_it_torch001", category: 4 },
  { resref: "nw_wamar001", category: 1 },
  { resref: "nw_wambo001", category: 1 },
  { resref: "nw_wswls001", category: 1 },
  { resref: "nw_wswdg001", category: 1 },
  { resref: "nw_wblml001", category: 1 },
  { resref: "nw_wbwsh001", category: 1 },
  { resref: "nw_aarcl001", category: 0 },
  { resref: "nw_aarcl012", category: 0 },
  { resref: "nw_ashsw001", category: 0 },
];

export function registerStoreKitTools(server: McpServer): void {
  server.tool(
    "build_store",
    "Give a merchant a shop in one call: a store with a general stock (potions, kits, ammunition, simple weapons and armour), placed beside the merchant, and a \"Show me what you have for sale.\" line on the merchant's greeting that opens it. merchant: the merchant creature's tag (it needs a conversation; build_key_npc gives one).",
    {
      merchant: z.string().describe("Tag of the merchant creature"),
      name: z.string().optional().describe('Store name (default "<merchant name>\'s Goods")'),
    },
    { destructiveHint: true },
    async ({ merchant, name }) => {
      const index = requireIndex();
      const want = merchant.toLowerCase();
      let found: { area: string; c: GffObj } | undefined;
      const people: string[] = [];
      for (const [area] of index.areas) {
        const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
        if (!git) continue;
        for (const c of getFieldList(git, "Creature List")) {
          if (getFieldNum(c, "FactionID") !== 1) people.push(getFieldStr(c, "Tag").toLowerCase());
          if (!found && getFieldStr(c, "Tag").toLowerCase() === want) found = { area, c };
        }
      }
      if (!found) return json({ success: false, field: "merchant", error: `no creature tagged ${merchant}`, valid: [...new Set(people)].slice(0, 15) }, true);
      const dialog = getFieldStr(found.c, "Conversation").toLowerCase();
      if (!dialog) return json({ success: false, field: "merchant", error: `${merchant} has no conversation to open the store from`, next: "give the merchant a dialog (build_key_npc with conversation)" }, true);
      const resref = `str_${want}`.slice(0, 16);
      const steps: string[] = [];
      if (!index.resources.has(`${resref}.utm`)) {
        const who = `${getFieldLocStr(found.c, "FirstName")} ${getFieldLocStr(found.c, "LastName")}`.trim() || merchant;
        const made = await callTool("create_store_blueprint", {
          resref,
          tag: resref,
          name: name ?? `${who}'s Goods`,
          markUp: "120",
          markDown: "80",
          inventory: JSON.stringify(GENERAL_STOCK.map((i) => ({ ...i, infinite: true }))),
        });
        if (made.isError) return json({ success: false, error: `create_store_blueprint: ${made.text.slice(0, 300)}` }, true);
        steps.push("store blueprint");
      }
      const git = index.parsedGff.get(`${found.area}.git`) as GffObj;
      if (!getFieldList(git, "StoreList").some((s) => getFieldStr(s, "Tag").toLowerCase() === resref)) {
        const mx = getFieldNum(found.c, "XPosition");
        const my = getFieldNum(found.c, "YPosition");
        let placed = false;
        for (const [dx, dy] of [[1.2, 0], [-1.2, 0], [0, 1.2], [0, -1.2], [2, 2], [-2, -2]]) {
          const r = await callTool("place_store", { area: found.area, blueprint: resref, x: String(mx + dx), y: String(my + dy) });
          if (!r.isError) {
            placed = true;
            break;
          }
        }
        if (!placed) return json({ success: false, error: `no free spot beside ${merchant} for the store`, steps }, true);
        steps.push("store placed");
      }
      const script = `a_${resref}`.slice(0, 16);
      if (!index.resources.has(`${script}.ncs`)) {
        const w = await callTool("write_script", { resref: script, source: `void main() { OpenStore(GetNearestObjectByTag("${resref}"), GetPCSpeaker()); }`, compile: "false" });
        if (w.isError) return json({ success: false, error: `write_script: ${w.text.slice(0, 200)}`, steps }, true);
        const c = await callTool("compile_script", { resref: script });
        if (c.isError) return json({ success: false, error: `compile_script: ${c.text.slice(0, 300)}`, steps }, true);
        steps.push("open-store script");
      }
      const tree = await callTool("get_dialog_tree", { dialog });
      if (!tree.text.includes(script)) {
        const line = await callTool("add_dialog_node", { dialog, parentType: "entry", parentIndex: "0", text: "Show me what you have for sale.", script });
        if (line.isError) return json({ success: false, error: `add_dialog_node: ${line.text.slice(0, 200)}`, steps }, true);
        steps.push(`shop line on ${dialog}`);
      }
      return json({ success: true, store: resref, area: found.area, merchant: want, dialog, steps: steps.length ? steps : ["already in place"], next: "talk to the merchant in play to check the store opens" });
    },
  );
}
