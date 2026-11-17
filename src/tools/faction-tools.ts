/**
 * Faction management MCP tools.
 *
 * Tools:
 * - create_faction: Add a new faction to the module's .fac file
 * - set_faction_reputation: Modify reputation between two factions
 */

import { z } from "zod";

import { numParam, optNumParam, toI } from "../util/params.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import { getFieldStr, getFieldNum, getFieldList } from "../types/gff.js";
import { canonicalRepList, mutualReputation, newFactionReputation } from "../util/faction-replist.js";
import type { GffObj, GffDocument } from "../types/gff.js";

/** Find the .fac document and resource entry from the module index. */
function findFacDoc(index: ReturnType<typeof requireIndex>): {
  doc: GffDocument; obj: GffObj; filePath: string;
} | null {
  for (const [key, entry] of index.resources) {
    if (entry.extension === "fac") {
      const doc = index.parsedGff.get(key);
      if (doc) return { doc, obj: doc as GffObj, filePath: entry.filePath };
    }
  }
  return null;
}

export function registerFactionTools(server: McpServer): void {

  // ─── create_faction ───────────────────────────────────────────────────

  server.tool(
    "create_faction",
    "Add a new faction to the module's .fac file with reputation both ways toward every existing faction " +
      "(defaultReputation, 50 = neutral), and rewrite the reputation table in the toolset's layout, which the engine needs " +
      "(engine-checked: a custom faction written this way takes part in GetReputation/GetIsEnemy). Use it for a side the " +
      "standard factions do not fit, e.g. a prisoner the Hostile guards must not attack; then set_faction_reputation for " +
      "pairs that differ and set the creature's FactionID to the returned factionId.",
    {
      name: z.string().describe("Faction display name"),
      parentId: optNumParam("Parent faction ID (default 4294967295 = no parent)"),
      global: optNumParam("Global flag (0 or 1, default 0)"),
      defaultReputation: optNumParam("Default reputation toward all existing factions (0-100, default 50)"),
    },
    { destructiveHint: true },
    async ({ name, parentId, global: globalFlag, defaultReputation }) => {
      const parentIdN = toI(parentId, 4294967295);
      const globalN = toI(globalFlag, 0);
      const defaultRepN = toI(defaultReputation, 50);

      const index = requireIndex();
      const fac = findFacDoc(index);
      if (!fac) return { content: [{ type: "text", text: "No .fac file found in module." }] };

      const factionList = getFieldList(fac.obj, "FactionList");
      const repList = getFieldList(fac.obj, "RepList");

      const newFactionId = factionList.length;

      // Add the faction entry.
      //
      // FactionGlobal is `word`, NOT `byte` — confirmed by dumping a real
      // toolset-authored .fac (branch systest-live-run-and-generalized-spec):
      // every pre-existing FactionList entry carries FactionGlobal as a
      // `word`. The previous `byte` here was a real type mismatch of the
      // same class as FactionRep below.
      factionList.push({
        __struct_id: newFactionId,
        FactionName: { type: "cexostring", value: name },
        FactionParentID: { type: "dword", value: parentIdN },
        FactionGlobal: { type: "word", value: globalN },
      });

      // Rebuild the whole RepList in the toolset's layout (util/faction-replist.ts). Appending rows at the end, as this
      // tool used to, left the engine ignoring the new faction (engine-checked 2026-11-17).
      fac.obj.RepList = {
        type: "list",
        value: canonicalRepList(factionList.length, repList, {
          overrides: newFactionReputation(newFactionId, factionList.length, defaultRepN),
        }),
      };

      await jsonToGff(fac.doc, fac.filePath);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            factionId: newFactionId,
            name,
            parentId: parentIdN,
            global: globalN,
            reputationRows: factionList.length * (factionList.length - 1),
            defaultReputation: defaultRepN,
          }, null, 2),
        }],
      };
    },
  );

  // ─── set_faction_reputation ───────────────────────────────────────────

  server.tool(
    "set_faction_reputation",
    "Modify reputation between two factions, in BOTH directions (NWN's reputation table is directional per " +
      "(FactionID1, FactionID2) pair — setting only one direction leaves the engine reading a friendly 100 default " +
      "for the other, confirmed live). Rewrites the whole table in the toolset's layout (which also repairs a .fac written " +
      "by an older create_faction); custom factions (5+) work in play. The PC faction (0) holds no opinions, so only the " +
      "other faction's opinion of the PCs is set when one side is 0.",
    {
      faction1: numParam("First faction ID"),
      faction2: numParam("Second faction ID"),
      reputation: numParam("Reputation value (0=hostile, 50=neutral, 100=friendly)"),
    },
    { idempotentHint: true },
    async ({ faction1, faction2, reputation }) => {
      const f1 = toI(faction1), f2 = toI(faction2), rep = toI(reputation);

      const index = requireIndex();
      const fac = findFacDoc(index);
      if (!fac) return { content: [{ type: "text", text: "No .fac file found in module." }] };

      const factionList = getFieldList(fac.obj, "FactionList");
      const repList = getFieldList(fac.obj, "RepList");

      // Validate faction IDs
      if (f1 < 0 || f1 >= factionList.length) {
        return { isError: true, content: [{ type: "text", text: `Invalid faction1 ID: ${f1}. Valid range: 0-${factionList.length - 1}` }] };
      }
      if (f2 < 0 || f2 >= factionList.length) {
        return { isError: true, content: [{ type: "text", text: `Invalid faction2 ID: ${f2}. Valid range: 0-${factionList.length - 1}` }] };
      }

      // Both directions (the table is directional), every value a dword, and the whole list rewritten in the toolset's
      // layout, which also repairs a .fac an older create_faction left in the appended layout.
      const has = (a: number, b: number) =>
        repList.some((e) => getFieldNum(e, "FactionID1") === a && getFieldNum(e, "FactionID2") === b);
      const forwardAction = f2 === 0 ? "skipped (the PC faction holds no opinions)" : has(f1, f2) ? "updated" : "created";
      const reverseAction = f1 === 0 ? "skipped (the PC faction holds no opinions)" : has(f2, f1) ? "updated" : "created";
      fac.obj.RepList = {
        type: "list",
        value: canonicalRepList(factionList.length, repList, { overrides: mutualReputation(f1, f2, rep) }),
      };

      await jsonToGff(fac.doc, fac.filePath);

      const f1Name = getFieldStr(factionList[f1], "FactionName");
      const f2Name = getFieldStr(factionList[f2], "FactionName");

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            faction1: { id: f1, name: f1Name },
            faction2: { id: f2, name: f2Name },
            reputation: rep,
            action: { forward: forwardAction, reverse: reverseAction },
          }, null, 2),
        }],
      };
    },
  );
}
