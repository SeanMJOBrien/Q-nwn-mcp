/**
 * set_starting_gold — players start at the adventure's level with the gold that level should carry.
 *
 * Writes the module's OnClientEnter script (`a_mod_enter`), once per player:
 *   - XP raised to the start of the target level (when `setLevel`), so a new level-1 character levels up at once;
 *   - gold topped up to the wealth for that level (DMG table 5-1, util/wealth.ts: 2,700 gp at level 3), counting the
 *     gold, inventory and equipment the character already has, so a rich character gets nothing and a returning one
 *     cannot farm it.
 * A handler already on OnClientEnter keeps running: the new script calls it first. OnClientEnter fires once for each
 * player, so paying the entering player is correct here (verify_coop_rules exempts this handler).
 */

import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldStr } from "../types/gff.js";
import { callTool } from "../util/tool-registry.js";
import { MAX_WEALTH_LEVEL, wealthByLevel } from "../util/wealth.js";

export const START_KIT_SCRIPT = "a_mod_enter";
export const START_KIT_MARK = /MCP_START_KIT level=(\d+) gold=(\d+)/;

function json(body: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 1) }], ...(isError ? { isError: true } : {}) };
}

/** XP at the start of `level` (NWN: 500 * level * (level - 1)). */
export const xpForLevel = (level: number) => 500 * level * (level - 1);

export function startKitSource(level: number, gold: number, setLevel: boolean, previous: string): string {
  return `// ${START_KIT_SCRIPT}: start kit written by set_starting_gold. MCP_START_KIT level=${level} gold=${gold}
// Once per player: XP to the start of level ${level}${setLevel ? "" : " (off)"}, gold topped up to ${gold} gp of total wealth.
// OnClientEnter fires for each player, so paying the entering player reaches everyone.

const int START_LEVEL = ${level};
const int START_XP = ${setLevel ? xpForLevel(level) : 0};
const int START_WEALTH = ${gold};
const string PREVIOUS_ENTER = "${previous}";

// Gold plus the value of everything carried and worn.
int StartKitWorth(object oPC)
{
    int nWorth = GetGold(oPC);
    object oItem = GetFirstItemInInventory(oPC);
    while (GetIsObjectValid(oItem))
    {
        nWorth += GetGoldPieceValue(oItem);
        oItem = GetNextItemInInventory(oPC);
    }
    int nSlot;
    for (nSlot = 0; nSlot < 14; nSlot++)
    {
        object oWorn = GetItemInSlot(nSlot, oPC);
        if (GetIsObjectValid(oWorn)) nWorth += GetGoldPieceValue(oWorn);
    }
    return nWorth;
}

void main()
{
    if (PREVIOUS_ENTER != "") ExecuteScript(PREVIOUS_ENTER, OBJECT_SELF);

    object oPC = GetEnteringObject();
    if (!GetIsPC(oPC) || GetIsDM(oPC)) return;
    if (GetLocalInt(oPC, "MCP_START_KIT")) return;
    SetLocalInt(oPC, "MCP_START_KIT", 1);

    if (START_XP > 0 && GetXP(oPC) < START_XP) SetXP(oPC, START_XP);
    int nShort = START_WEALTH - StartKitWorth(oPC);
    if (nShort > 0) GiveGoldToCreature(oPC, nShort);
}
`;
}

export function registerStartKitTools(server: McpServer): void {
  server.tool(
    "set_starting_gold",
    `Players start at the adventure's level with the right gold. Writes the module's OnClientEnter script (${START_KIT_SCRIPT}): once per player it raises XP to the start of \`level\` (setLevel, default true) and tops gold up to the wealth for that level (default: DMG wealth by level, 2,700 gp at level 3), counting what the character already carries. An existing OnClientEnter handler keeps running (called first). Run it again to change the numbers.`,
    {
      level: z.string().describe("The adventure's target level, e.g. 3"),
      gold: z.string().optional().describe("Total wealth in gp to top up to (default: wealth by level)"),
      setLevel: z.boolean().optional().describe("Raise XP to the start of the level (default true)"),
    },
    { idempotentHint: true },
    async ({ level, gold, setLevel }) => {
      const index = requireIndex();
      const lvl = Math.floor(Number(level));
      if (!Number.isFinite(lvl) || lvl < 1 || lvl > MAX_WEALTH_LEVEL) return json({ ok: false, field: "level", error: `a level from 1 to ${MAX_WEALTH_LEVEL}` }, true);
      const amount = gold !== undefined ? Math.floor(Number(gold)) : wealthByLevel(lvl);
      if (!Number.isFinite(amount) || amount < 0) return json({ ok: false, field: "gold", error: "a whole number of gp, 0 or more" }, true);
      const raise = setLevel !== false;

      // Keep the handler that was there (or the one our earlier script chained).
      const ifo = (index.parsedGff.get("module.ifo") ?? {}) as GffObj;
      let previous = getFieldStr(ifo, "Mod_OnClientEntr").toLowerCase();
      if (previous === START_KIT_SCRIPT) {
        try {
          const old = await fs.readFile(path.join(index.tempDir, `${START_KIT_SCRIPT}.nss`), "utf8");
          if (START_KIT_MARK.test(old)) previous = /PREVIOUS_ENTER = "([^"]*)"/.exec(old)?.[1] ?? "";
          else return json({ ok: false, error: `OnClientEnter already runs a hand-written ${START_KIT_SCRIPT}; rename it or merge it by hand before using this tool.` }, true);
        } catch {
          previous = "";
        }
      }

      const wrote = await callTool("write_script", { resref: START_KIT_SCRIPT, source: startKitSource(lvl, amount, raise, previous), compile: false });
      if (wrote.isError) return json({ ok: false, failedAt: "write_script", error: wrote.text.slice(0, 400) }, true);
      const compiled = await callTool("compile_script", { resref: START_KIT_SCRIPT });
      if (compiled.isError || compiled.json?.success !== true) return json({ ok: false, failedAt: "compile_script", error: compiled.text.slice(0, 600) }, true);
      const set = await callTool("set_module_scripts", { Mod_OnClientEntr: START_KIT_SCRIPT });
      if (set.isError) return json({ ok: false, failedAt: "set_module_scripts", error: set.text.slice(0, 400) }, true);
      return json({
        ok: true,
        script: START_KIT_SCRIPT,
        level: lvl,
        xp: raise ? xpForLevel(lvl) : "unchanged",
        wealth: amount,
        ...(previous ? { chained: previous } : {}),
        note: "Each player, once: XP to the start of the level, then gold up to the wealth figure counting what they carry.",
        next: "get_progress() for the next step",
      });
    },
  );
}
