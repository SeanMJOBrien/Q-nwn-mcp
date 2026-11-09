/** suggest_area_size — the sizing rules (util/area-size.ts) as one call. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { BIOMES, INTERIOR_PURPOSES, suggestAreaSize } from "../util/area-size.js";
import { toI } from "../util/params.js";

export function registerAreaSizeTools(server: McpServer): void {
  server.tool(
    "suggest_area_size",
    "Suggest width x height for an area from its biome, purpose and number of events (encounters, conversations, searches, set pieces). Cabin 2x2, inn 2x4, a forest with one event 4x4, a forest road 3x10 with shape=linear; every further event adds tiles, never past 32 per side. Also says how to build it: adventure_generate_layout from 9x9 up (with the room count it can manage), paint_tiles/paint_group by hand below that and for linear strips. Call it before create_area.",
    {
      biome: z.enum(BIOMES).describe("forest, rural, city_exterior, castle_exterior, desert, frozen, ruins, underdark, dungeon, cave, castle_interior or interior"),
      purpose: z.enum(INTERIOR_PURPOSES).optional().describe("Required for biome=interior: cabin, home, inn, tavern, shop or hall"),
      events: z.string().describe("Number of distinct events in the area (at least 1)"),
      shape: z.enum(["compact", "linear"]).optional().describe("linear = long and narrow travel area, entrance and exit at opposite ends"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ biome, purpose, events, shape }) => {
      try {
        const r = suggestAreaSize({ biome, purpose, events: toI(events, 1), shape });
        return { content: [{ type: "text", text: JSON.stringify(r, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: (e as Error).message }], isError: true };
      }
    },
  );
}
