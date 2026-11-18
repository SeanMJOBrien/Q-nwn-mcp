/**
 * The start menu (util/start-menu.ts): show_menu lists what nwn-mcp can help with, show_menu(choice) gives the plan
 * for one entry, and the MCP prompt `start` sends the menu as an opening message. No module needs to be loaded.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getIndex } from "../module-loader.js";
import { entryPlan, findEntry, menuText, START_MENU } from "../util/start-menu.js";

const text = (body: unknown, isError = false) => ({
  content: [{ type: "text" as const, text: typeof body === "string" ? body : JSON.stringify(body, null, 1) }],
  ...(isError ? { isError: true } : {}),
});

export function registerStartMenuTools(server: McpServer): void {
  server.tool(
    "show_menu",
    "The start menu: what nwn-mcp can help with, as a lettered list of goals (NPCs and henchmen, areas, a creature's spells, a market with merchants, a quest and journal for a dialog, encounters, loot, a whole adventure, reviewing a module, script bugs, scripts, checking and building). Call it at the start of a session when the user has not said what they want, and show the menu to them as it is. When they pick a letter or describe their goal, call show_menu(choice) for the plan: how to start, what to ask, the skills and the first calls. Needs no module.",
    {
      choice: z.string().optional().describe('The letter the user picked ("C"), or their goal in their own words'),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ choice }) => {
      if (!choice?.trim()) {
        return text({
          menu: menuText(),
          next: "Show the menu to the user exactly as it is and wait for their answer; then call show_menu(choice: <their letter or words>).",
        });
      }
      const entry = findEntry(choice);
      if (!entry) {
        return text(
          {
            ok: false,
            field: "choice",
            error: `"${choice}" matches no menu entry. Letters: ${START_MENU.map((e) => e.key).join(", ")}; or ask the user what they want and work from their words.`,
          },
          true,
        );
      }
      return text(entryPlan(entry, getIndex() !== null));
    },
  );

  // Tool-only stand-ins (tests, the tool CLI's recorder) have no prompts.
  if (typeof (server as { prompt?: unknown }).prompt !== "function") return;
  server.prompt("start", "Open with the nwn-mcp menu: what it can help with, as a lettered list of goals", () => ({
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            "Show me this menu of what you can help with in Neverwinter Nights, exactly as written, and wait for my choice. " +
            "When I pick a letter or describe my goal, call show_menu(choice) and follow its plan.\n\n" +
            menuText(),
        },
      },
    ],
  }));
}
