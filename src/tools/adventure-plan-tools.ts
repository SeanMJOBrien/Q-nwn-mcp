/**
 * plan_adventure_shape and verify_story — the planning side of /adventure-plot (docs/adventure-composition.md).
 */

import { adventureFile } from "../util/adventure-dir.js";
import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { BIOMES } from "../util/area-size.js";
import { planAdventureShape } from "../util/adventure-shape.js";
import { toI } from "../util/params.js";
import { parseStoryGraph, verifyStory } from "../util/story-graph.js";
import { storyRecordFindings } from "../util/story-record.js";
import { checkGuideFacts, storyTexts } from "../util/verify/guide-facts.js";

export function registerAdventurePlanTools(server: McpServer): void {
  server.tool(
    "plan_adventure_shape",
    "From play time and party size, plan how many areas and events an adventure has and which kinds of encounter go where: combat, ambush, boss, chain (scouts or a lookout first, then the main force), social, obstacle (a check gate), trap, discovery, friendly (merchant, traveller, ally) and rest. Returns the events dealt out across the areas in story order (setup, complication, turn, climax), with the minutes and open ground each area's events need, and the size from suggest_area_size when you pass a biome. A plan to start from, not a rule: change it to fit the story.",
    {
      playMinutes: z.string().describe("Target play time in minutes, e.g. 120"),
      partySize: z.string().optional().describe("Players, 1-4 (informational; encounter strength is set later)"),
      friendly: z.boolean().optional().describe("Include friendly encounters and rests (default true)"),
      chains: z.boolean().optional().describe("Allow multi-part (chain) encounters (default true)"),
      biome: z.enum(BIOMES).optional().describe("Size each area for this biome with suggest_area_size"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ playMinutes, partySize, friendly, chains, biome }) => {
      const plan = planAdventureShape({ playMinutes: toI(playMinutes, 120), partySize: partySize ? toI(partySize, 1) : undefined, friendly, chains, biome });
      return { content: [{ type: "text", text: JSON.stringify(plan, null, 2) }] };
    },
  );

  server.tool(
    "verify_story",
    "Check the story graph in adventure.md (lines like `- beat B1 | title: … | act: setup | area: village | leads: B2, B3 | gives: clue | needs: clue` and `- thread T1 | title: … | planted: B1 | paid: B7`): every beat reachable from the first, every lead and area exists, an ending exists, every needed clue is given (warns when only one beat gives it), and every thread's payoff can be reached from where it is planted. Also checks the story and DM guide against the module: a weapon the text gives a creature that it does not carry (guide_weapon_mismatch), a Name (`tag`) the module lacks (story_unknown_tag). Also the story record: no (not recorded) field in Module/Plot (story_not_recorded), a graph once there are 3+ locations (story_graph_required; below that no graph is a warning), a Motivation for every key NPC and the antagonists (npc_no_motive, antagonist_no_motive), and a beat for every location (area_no_beat: its Role in Story, or a graph beat in that area).",
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      const index = requireIndex();
      let md: string;
      try {
        md = await fs.readFile(await adventureFile(index, "story"), "utf8");
      } catch {
        return { content: [{ type: "text", text: `No adventure.md for this module (see get_adventure_dir).` }], isError: true };
      }
      const graph = parseStoryGraph(md);
      const record = storyRecordFindings(md, graph);
      const findings = [...record, ...verifyStory(graph, new Set(index.areas.keys())).filter((f) => !(f.code === "story_no_graph" && record.some((r) => r.code === "story_graph_required")))];
      for (const f of checkGuideFacts(index, await storyTexts(index))) findings.push({ level: "warning", code: f.code, message: f.message });
      const errors = findings.filter((f) => f.level === "error");
      return {
        content: [
          { type: "text", text: JSON.stringify({ ok: errors.length === 0, beats: graph.beats.length, threads: graph.threads.length, findings }, null, 2) },
        ],
        ...(errors.length ? { isError: true } : {}),
      };
    },
  );
}
