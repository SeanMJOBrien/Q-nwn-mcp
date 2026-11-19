/**
 * build_enemy_group: a group of hostile base-game creatures of one kind placed on open ground in one call
 * (util/enemy-roster.ts). The plot's challenge lines ("The Mill: 2 bandits") become real enemies without a model
 * having to know any creature resref: a small model found only the module's own creatures and placed the boss as
 * a common enemy (The Old Mill, 2026-11-18).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { adventurePath, findAdventureDir } from "../util/adventure-dir.js";
import { ENEMY_ROSTER, groupEncounterLevel, pickGroup, rosterKind } from "../util/enemy-roster.js";
import { optNumParam, toI } from "../util/params.js";
import { callTool } from "../util/tool-registry.js";

const json = (body: unknown, isError = false) => ({ content: [{ type: "text" as const, text: JSON.stringify(body, null, 1) }], ...(isError ? { isError: true } : {}) });

/** The story's target level, when the Module section names one. */
async function storyLevel(index: ReturnType<typeof requireIndex>): Promise<number | undefined> {
  try {
    const dir = await findAdventureDir(index);
    if (!dir) return undefined;
    const m = /\*\*(?:Target )?Level:\*\*\s*(\d+)/i.exec(readFileSync(adventurePath(dir, "story"), "utf8"));
    return m ? Number(m[1]) : undefined;
  } catch {
    return undefined;
  }
}

export function registerEnemyTools(server: McpServer): void {
  server.tool(
    "build_enemy_group",
    `Place a group of hostile base-game creatures of one kind in an area, in one call: picks creatures and a count for a fight of the party's level (or the count you give), finds open ground and places them. kind: ${Object.keys(ENEMY_ROSTER).join(", ")} (plurals and words like "brigands", "undead", "monsters" work). The level defaults to the story's target level.`,
    {
      area: z.string().describe("Area resref"),
      kind: z.string().describe(`What they are: ${Object.keys(ENEMY_ROSTER).join(", ")}`),
      count: optNumParam("How many (default: as many as make a fight of the party's level)"),
      level: optNumParam("Party level (default: the story's target level, else 3)"),
      region: z.string().optional().describe("Where in the area: center (default), north, south, east, west, NE, NW, SE, SW, or x1,y1,x2,y2"),
    },
    { destructiveHint: true },
    async ({ area, kind, count, level, region }) => {
      const index = requireIndex();
      const a = area.toLowerCase();
      if (!index.parsedGff.has(`${a}.git`)) return json({ ok: false, field: "area", error: `No area ${a}. Areas: ${[...index.areas.keys()].join(", ")}` }, true);
      const k = rosterKind(kind);
      if (!k) return json({ ok: false, field: "kind", error: `"${kind}" is no kind this tool knows. Kinds: ${Object.keys(ENEMY_ROSTER).join(", ")}` }, true);
      const lvl = level !== undefined ? toI(level) : ((await storyLevel(index)) ?? 3);
      const group = pickGroup(k, lvl, count !== undefined ? toI(count) : undefined);
      const found = await callTool("adventure_find_walkable", { area: a, clearRadius: "1", count: String(Math.min(10, group.length * 2 + 2)), region: region ?? "center" });
      let spots = ((found.json?.positions as Array<{ x: number; y: number }> | undefined) ?? []).slice();
      if (spots.length < group.length && !region) {
        const more = await callTool("adventure_find_walkable", { area: a, clearRadius: "1", count: "10", region: "0,0,320,320" });
        spots = [...spots, ...((more.json?.positions as Array<{ x: number; y: number }> | undefined) ?? [])];
      }
      const placed: Array<{ resref: string; cr: number; x: number; y: number }> = [];
      const failed: string[] = [];
      for (const c of group) {
        let ok = false;
        while (spots.length && !ok) {
          const s = spots.shift() as { x: number; y: number };
          const r = await callTool("place_creature", { area: a, blueprint: c.resref, x: String(s.x), y: String(s.y) });
          if (!r.isError && r.json?.success === true) {
            placed.push({ ...c, x: s.x, y: s.y });
            ok = true;
          } else if (/not found/i.test(r.text)) {
            failed.push(`${c.resref}: ${r.text.slice(0, 120)}`);
            break;
          }
        }
        if (!ok && !failed.some((f) => f.startsWith(c.resref))) failed.push(`${c.resref}: no open ground left`);
      }
      const el = groupEncounterLevel(placed.map((p) => p.cr));
      return json(
        {
          ok: placed.length > 0,
          area: a,
          kind: k,
          partyLevel: lvl,
          placed,
          ...(failed.length ? { failed } : {}),
          encounterLevel: el,
          next: placed.length ? "get_progress() for the next step" : "Try another region, or place_creature by hand at a point from adventure_find_walkable.",
        },
        placed.length === 0,
      );
    },
  );
}
