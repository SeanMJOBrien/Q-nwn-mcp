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
import { getFieldStr, getFieldNum, getFieldList, setField } from "../types/gff.js";
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
    "Add a new faction to the module's .fac file with bilateral reputation entries (both directions) for all " +
      "existing factions.",
    {
      name: z.string().describe("Faction display name"),
      parentId: optNumParam("Parent faction ID (default 4294967295 = no parent)"),
      global: optNumParam("Global flag (0 or 1, default 0)"),
      defaultReputation: optNumParam("Default reputation toward all existing factions (0-100, default 50)"),
    },
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

      // Add bilateral reputation entries for all existing factions — BOTH
      // directions, and as `dword`, NOT `int`.
      //
      // Two real, compounding bugs found live (branch
      // systest-live-run-and-generalized-spec), building a module with two
      // factions meant to be mutually hostile and finding GetReputation()/
      // GetIsEnemy() always reported a friendly 100 for BOTH directions no
      // matter what was written here:
      //  1. This loop wrote only the new->existing direction, leaving the
      //     reverse (existing->new) entry completely absent from the .fac.
      //     Fixing direction alone did NOT fix the live behavior.
      //  2. The real root cause: every pre-existing, toolset-authored
      //     RepList entry carries FactionRep as a `dword`; this code wrote
      //     it as `int`. GFF struct fields are looked up by (label, type)
      //     together, not label alone — the engine's loader asking for a
      //     `dword`-typed FactionRep simply does not find an `int`-typed one
      //     with the same label, so every entry this function ever wrote was
      //     silently invisible to the live engine regardless of its FactionID
      //     values or direction, falling back to a friendly default (100).
      // Confirmed fixed end-to-end: after correcting both, a real headless
      // engine run's GetIsEnemy() check passed for the first time.
      for (let i = 0; i < newFactionId; i++) {
        repList.push({
          __struct_id: repList.length,
          FactionID1: { type: "dword", value: newFactionId },
          FactionID2: { type: "dword", value: i },
          FactionRep: { type: "dword", value: defaultRepN },
        });
        repList.push({
          __struct_id: repList.length,
          FactionID1: { type: "dword", value: i },
          FactionID2: { type: "dword", value: newFactionId },
          FactionRep: { type: "dword", value: defaultRepN },
        });
      }

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
            reputationEntriesAdded: newFactionId * 2,
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
      "for the other, confirmed live). Creates either entry if it doesn't already exist.",
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
        return { content: [{ type: "text", text: `Invalid faction1 ID: ${f1}. Valid range: 0-${factionList.length - 1}` }] };
      }
      if (f2 < 0 || f2 >= factionList.length) {
        return { content: [{ type: "text", text: `Invalid faction2 ID: ${f2}. Valid range: 0-${factionList.length - 1}` }] };
      }

      // Two real, compounding bugs found live (branch
      // systest-live-run-and-generalized-spec) — see create_faction's own
      // comment above for the full story. Summary: (1) NWN's reputation
      // table is directional per (FactionID1, FactionID2) pair, so both
      // (f1,f2) and (f2,f1) need setting/creating, not just whichever
      // direction the caller happened to name first; (2) FactionRep must be
      // written as `dword`, matching every real toolset-authored entry —
      // GFF struct fields are looked up by (label, type) together, so an
      // `int`-typed FactionRep is invisible to the engine's loader even
      // though the label matches, silently falling back to a friendly
      // default (100) regardless of direction or FactionID values.
      const upsertRep = (id1: number, id2: number): "updated" | "created" => {
        for (const entry of repList) {
          if (getFieldNum(entry, "FactionID1") === id1 && getFieldNum(entry, "FactionID2") === id2) {
            setField(entry, "FactionRep", "dword", rep);
            return "updated";
          }
        }
        repList.push({
          __struct_id: repList.length,
          FactionID1: { type: "dword", value: id1 },
          FactionID2: { type: "dword", value: id2 },
          FactionRep: { type: "dword", value: rep },
        });
        return "created";
      };

      const forwardAction = upsertRep(f1, f2);
      const reverseAction = f2 !== f1 ? upsertRep(f2, f1) : forwardAction;

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
