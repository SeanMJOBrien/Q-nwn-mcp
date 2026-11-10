/** move_store_item: put a store's item into the right StoreList tab (work-plan F3). */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr, setField } from "../types/gff.js";
import { getGitDoc, writeBackGit } from "../util/git-helpers.js";
import { optNumParam, toI } from "../util/params.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { errorResult } from "../util/tool-result.js";

const PANELS = ["armor and shields", "weapons and ammunition", "potions and scrolls", "wands", "miscellaneous"];

export function registerStoreMoveTools(server: McpServer): void {
  server.tool(
    "move_store_item",
    "Move an item between the tabs (StoreList categories) of a store: a store blueprint (resref) or a placed store (area + tag). " +
      "Without toCategory the item goes to the tab its own baseitems.2da StorePanel names (0 armor and shields, 1 weapons and ammunition, 2 potions and scrolls, 3 wands, 4 miscellaneous), " +
      "which is what fixes a verify_store store_item_miscategorized finding. `item` is the item's resref or tag. All matching items move.",
    {
      item: z.string().describe("Item resref or tag"),
      resref: z.string().optional().describe("Store blueprint resref (a .utm), or give area + tag for a placed store"),
      area: z.string().optional().describe("Area resref of a placed store"),
      tag: z.string().optional().describe("Tag of the placed store"),
      toCategory: optNumParam("Target tab 0-4 (default: the item's own StorePanel)"),
    },
    { destructiveHint: true },
    async ({ item, resref, area, tag, toCategory }) => {
      const index = requireIndex();
      let store: GffObj | undefined;
      let save: () => Promise<void>;
      if (resref) {
        const key = `${resref.toLowerCase()}.utm`;
        const doc = index.parsedGff.get(key) as GffObj | undefined;
        const entry = index.resources.get(key);
        if (!doc || !entry) return errorResult(`Store blueprint not found: ${key}`);
        store = doc;
        save = () => jsonToGff(doc as never, entry.filePath);
      } else if (area && tag) {
        let git: { doc: never; obj: GffObj };
        try {
          git = getGitDoc(index, area) as never;
        } catch (e) {
          return errorResult((e as Error).message);
        }
        store = getFieldList(git.obj, "StoreList").find((s) => getFieldStr(s, "Tag") === tag);
        if (!store) return errorResult(`Store '${tag}' not found in ${area}`);
        snapshotGitForUndo(git.doc as never, area, "move_store_item", `Move ${item} in ${tag}`);
        save = () => writeBackGit(index, area, git.doc);
      } else {
        return errorResult("give resref (a store blueprint) or area + tag (a placed store)");
      }

      const cats = getFieldList(store, "StoreList");
      const want = item.toLowerCase();
      const moved: Array<{ item: string; from: number; to: number }> = [];
      for (let from = 0; from < cats.length; from++) {
        const list = getFieldList(cats[from], "ItemList");
        for (let k = list.length - 1; k >= 0; k--) {
          const it = list[k];
          if (getFieldStr(it, "TemplateResRef").toLowerCase() !== want && getFieldStr(it, "Tag").toLowerCase() !== want) continue;
          let to: number;
          if (toCategory !== undefined) to = toI(toCategory);
          else {
            const panel = index.twodaTables.get("baseitems")?.rows.get(getFieldNum(it, "BaseItem"))?.StorePanel;
            if (panel === undefined || panel === "****" || Number.isNaN(Number(panel))) return errorResult(`baseitems.2da has no StorePanel for this item (BaseItem ${getFieldNum(it, "BaseItem")}); pass toCategory (${PANELS.map((p, i) => `${i} ${p}`).join(", ")})`);
            to = Number(panel);
          }
          if (to < 0 || to > 4) return errorResult("toCategory must be 0-4");
          if (to === from) continue;
          list.splice(k, 1);
          let dest = cats.find((c) => (c as { __struct_id?: number }).__struct_id === to);
          if (!dest) {
            dest = { __struct_id: to, ItemList: { type: "list", value: [] } } as unknown as GffObj;
            cats.push(dest);
            setField(dest, "ItemList", "list", []);
          }
          const target = getFieldList(dest, "ItemList");
          (it as { __struct_id: number }).__struct_id = target.length;
          target.push(it);
          moved.push({ item: getFieldStr(it, "TemplateResRef"), from, to });
        }
        list.forEach((x, n) => {
          (x as { __struct_id: number }).__struct_id = n;
        });
      }
      if (moved.length === 0) return errorResult(`No item '${item}' needs moving (not in this store, or already in the right tab)`);
      await save();
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, moved }, null, 2) }] };
    },
  );
}
