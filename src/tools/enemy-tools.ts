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

/** Trap kinds: the save's damage type and the line a player sees. */
const TRAP_KINDS: Record<string, { damage: string; msg: string }> = {
  fire: { damage: "fire", msg: "Flames burst from the ground!" },
  acid: { damage: "acid", msg: "Acid sprays from a hidden nozzle!" },
  spikes: { damage: "piercing", msg: "Spikes shoot up from the floor!" },
  electric: { damage: "electrical", msg: "Lightning crackles through the air!" },
  cold: { damage: "cold", msg: "A blast of frost bursts out!" },
};

/** Trap dice by level (docs/phase-prompts/challenges.md: 1d6 at 1-2, 2d6 at 3-5, 4d6 at 6+). */
const trapDice = (level: number) => (level <= 2 ? "1d6" : level <= 5 ? "2d6" : "4d6");

export function registerTrapTools(server: McpServer): void {
  server.tool(
    "build_trap",
    `Place one trap in an area in one call: a trap blueprint, a trigger on open ground and a party-wide Reflex save with damage for the party's level (DC 10 + level). kind: ${Object.keys(TRAP_KINDS).join(", ")} (default fire).`,
    {
      area: z.string().describe("Area resref"),
      kind: z.string().optional().describe(`${Object.keys(TRAP_KINDS).join(", ")} (default fire)`),
      level: optNumParam("Party level (default: the story's target level, else 3)"),
      region: z.string().optional().describe("Where: center (default), north, south, east, west, NE, NW, SE, SW, or x1,y1,x2,y2"),
    },
    { destructiveHint: true },
    async ({ area, kind, level, region }) => {
      const index = requireIndex();
      const a = area.toLowerCase();
      if (!index.parsedGff.has(`${a}.git`)) return json({ ok: false, field: "area", error: `No area ${a}`, valid: [...index.areas.keys()] }, true);
      const word = (kind ?? "fire").toLowerCase().trim();
      const k = [word, word.replace(/s$/, ""), `${word}s`, word.replace(/^(electricity|lightning|shock)$/, "electric").replace(/^(frost|ice)$/, "cold")].find((w) => TRAP_KINDS[w]) ?? word;
      const def = TRAP_KINDS[k];
      if (!def) return json({ ok: false, field: "kind", error: `"${kind}" is no trap kind`, valid: Object.keys(TRAP_KINDS) }, true);
      const lvl = level !== undefined ? toI(level) : ((await storyLevel(index)) ?? 3);
      let n = 1;
      const id = () => `trap_${a.slice(0, 8)}${n}`.slice(0, 16);
      while (index.resources.has(`${id()}.utt`)) n++;
      const resref = id();
      const made = await callTool("create_trap_blueprint", { resref, tag: resref, name: `${k[0].toUpperCase()}${k.slice(1)} Trap`, detectDC: String(10 + lvl), disarmDC: String(10 + lvl), oneShot: "true" });
      if (made.isError) return json({ ok: false, error: `create_trap_blueprint: ${made.text.slice(0, 200)}` }, true);
      const found = await callTool("adventure_find_walkable", { area: a, clearRadius: "2", count: "4", region: region ?? "center" });
      let placedAt: { x: number; y: number } | undefined;
      for (const p of (found.json?.positions as Array<{ x: number; y: number }> | undefined) ?? []) {
        const r = await callTool("place_trigger", { area: a, blueprint: resref, x: String(p.x), y: String(p.y) });
        if (!r.isError) {
          placedAt = p;
          break;
        }
      }
      if (!placedAt) return json({ ok: false, error: `no open ground for the trap in ${a}`, next: "try another region" }, true);
      const check = { save: "reflex", dc: 10 + lvl, fail_damage: trapDice(lvl), half: "1", damage_type: def.damage, fail_msg: def.msg };
      const wired = await callTool("add_skill_check", { area: a, tag: resref, kind: "trigger", check: JSON.stringify(check) });
      if (wired.isError) return json({ ok: false, error: `add_skill_check: ${wired.text.slice(0, 200)}` }, true);
      return json({ ok: true, area: a, trap: resref, kind: k, at: placedAt, check, next: "get_progress() for the next step" });
    },
  );
}
