/**
 * Asset verification MCP tools.
 *
 * Generated .nss has the compiler as its acceptance gate. Nothing played that
 * role for any other generated file type, so structurally-broken assets shipped
 * silently: dialogs the engine refuses to load, creatures with no perception
 * handler, weapons with no model, objects placed where no player can reach them.
 *
 * These tools are that gate. They complement validate_module (cross-reference
 * checks) with intra-file structural and semantic checks, and are meant to be
 * called by each /create-adventure phase before it reports success.
 *
 * Tools:
 * - verify_creature / verify_item / verify_placeable / verify_door
 * - verify_trigger / verify_encounter / verify_store / verify_waypoint / verify_sound
 * - verify_area / verify_dialog / verify_journal / verify_module_info / verify_faction
 * - verify_all: every applicable checker across the whole module
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { GIT_OBJECT_LISTS, verifyArea } from "../util/verify/area.js";
import {
  verifyCreature,
  verifyDoor,
  verifyEncounter,
  verifyItem,
  verifyPlaceable,
  verifySound,
  verifyStore,
  verifyTrigger,
  verifyWaypoint,
} from "../util/verify/blueprints.js";
import type { VerifyResult } from "../util/verify/common.js";
import { listOf, Report } from "../util/verify/common.js";
import { verifyDialog } from "../util/verify/dialog.js";
import { verifyFaction, verifyJournal, verifyModuleInfo } from "../util/verify/journal.js";
import { verifyJournalPartyFlags, verifyPartyQuestState, verifyPartyRewards } from "../util/verify/scripts.js";

/** Wrap a result set in the standard MCP text payload. */
function payload(body: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }] };
}

/**
 * Resolve a target object: either a standalone blueprint resource, or a placed
 * instance found by tag inside an area's GIT.
 */
function resolveTarget(
  index: ModuleIndex,
  resref: string | undefined,
  extension: string,
  area: string | undefined,
  tag: string | undefined,
  gitList: string,
): { obj?: GffObj; label: string; error?: string } {
  if (resref) {
    const doc = index.parsedGff.get(`${resref.toLowerCase()}.${extension}`);
    if (!doc) return { label: resref, error: `No ${resref}.${extension} in the module` };
    return { obj: doc as GffObj, label: resref };
  }
  if (area && tag) {
    const git = index.parsedGff.get(`${area.toLowerCase()}.git`) as GffObj | undefined;
    if (!git) return { label: `${area}:${tag}`, error: `No ${area}.git in the module` };
    const found = listOf(git, gitList).find((o) => getFieldStr(o, "Tag") === tag);
    if (!found) return { label: `${area}:${tag}`, error: `No object tagged "${tag}" in ${area}'s ${gitList}` };
    return { obj: found, label: `${area}:${tag}` };
  }
  return { label: "?", error: "Provide either `resref` (a blueprint) or both `area` and `tag` (a placed instance)" };
}

/** Shared param shape for the per-object verify tools. */
const targetParams = {
  resref: z.string().optional().describe("Blueprint resref to verify"),
  area: z.string().optional().describe("Area resref, when verifying a placed instance (with `tag`)"),
  tag: z.string().optional().describe("Tag of the placed instance to verify (with `area`)"),
};

const READ_ONLY = { readOnlyHint: true, idempotentHint: true };

/**
 * Scripts wired to the module's OnClientEnter, which are per-player by
 * construction and must be exempt from the party fan-out rule.
 */
function perPlayerScripts(index: ModuleIndex): ReadonlySet<string> {
  const ifoKey = [...index.resources.keys()].find((k) => k.endsWith(".ifo"));
  const ifo = ifoKey ? (index.parsedGff.get(ifoKey) as GffObj | undefined) : undefined;
  const handler = ifo ? getFieldStr(ifo, "Mod_OnClientEntr") : "";
  return new Set(handler ? [handler.toLowerCase()] : []);
}

/**
 * Co-op enforcement switch, shared by verify_coop_rules and verify_all.
 *
 * Co-op is the default because the failure mode is invisible in solo testing.
 * But single-player modules are in scope for this project, and without an
 * opt-out a deliberately personal reward makes an otherwise sound module
 * report shippable: false with no way to say "that was intended".
 */
const COOP_PARAM = z
  .boolean()
  .optional()
  .describe(
    "Enforce co-op reward rules as errors (default true). Pass false for a deliberately single-player module: the same findings are still reported, but as warnings.",
  );

export function registerVerifyTools(server: McpServer): void {
  // ─── Per-object blueprint/instance checkers ─────────────────────────────

  const simpleCheckers: Array<{
    tool: string;
    ext: string;
    gitList: string;
    label: string;
    fn: (r: Report, i: ModuleIndex, o: GffObj) => void;
  }> = [
    { tool: "verify_item", ext: "uti", gitList: "List", label: "item", fn: verifyItem },
    { tool: "verify_placeable", ext: "utp", gitList: "Placeable List", label: "placeable", fn: verifyPlaceable },
    { tool: "verify_door", ext: "utd", gitList: "Door List", label: "door", fn: verifyDoor },
    { tool: "verify_trigger", ext: "utt", gitList: "TriggerList", label: "trigger", fn: verifyTrigger },
    { tool: "verify_encounter", ext: "ute", gitList: "Encounter List", label: "encounter", fn: verifyEncounter },
    { tool: "verify_store", ext: "utm", gitList: "StoreList", label: "store", fn: verifyStore },
    { tool: "verify_waypoint", ext: "utw", gitList: "WaypointList", label: "waypoint", fn: verifyWaypoint },
    { tool: "verify_sound", ext: "uts", gitList: "SoundList", label: "sound", fn: verifySound },
  ];

  for (const { tool, ext, gitList, label, fn } of simpleCheckers) {
    server.tool(
      tool,
      `Verify a ${label} (.${ext}) blueprint or placed instance is structurally and semantically acceptable. Returns errors (blocking) and warnings (advisory).`,
      targetParams,
      READ_ONLY,
      async ({ resref, area, tag }) => {
        const index = requireIndex();
        const { obj, label: target, error } = resolveTarget(index, resref, ext, area, tag, gitList);
        if (error || !obj)
          return payload({
            target,
            type: ext,
            status: "fail",
            errors: [{ code: "target_not_found", message: error }],
            warnings: [],
          });

        const report = new Report(target, ext);
        fn(report, index, obj);
        return payload(report.result());
      },
    );
  }

  // ─── Creature (extra henchman option) ───────────────────────────────────

  server.tool(
    "verify_creature",
    "Verify a creature (.utc) blueprint or placed instance. Checks identity, appearance (including a Race/Appearance_Type mismatch check for the 7 standard PC races), classes, all 13 script fields, conversation, equipment and voice. Pass henchman:true to additionally apply companion rules (associate AI wired, non-Commoner class, StartingPackage set for the companion's class, HENCH_LEVEL set, voice present).",
    {
      ...targetParams,
      henchman: z.boolean().optional().describe("Apply the stricter companion checks"),
    },
    READ_ONLY,
    async ({ resref, area, tag, henchman }) => {
      const index = requireIndex();
      const { obj, label: target, error } = resolveTarget(index, resref, "utc", area, tag, "Creature List");
      if (error || !obj)
        return payload({
          target,
          type: "utc",
          status: "fail",
          errors: [{ code: "target_not_found", message: error }],
          warnings: [],
        });

      const report = new Report(target, "utc");
      const resmanOpts = await buildResmanOptions(index);
      await verifyCreature(report, index, obj, { henchman, resmanOpts });
      return payload(report.result());
    },
  );

  // ─── Dialog ─────────────────────────────────────────────────────────────

  server.tool(
    "verify_dialog",
    "Verify a dialog (.dlg). Checks the fields the engine silently requires (missing any makes it refuse to load the conversation), dangling link indices, script/condition references, node reachability, and that a root is reachable unconditionally.",
    { resref: z.string().describe("Dialog resref") },
    READ_ONLY,
    async ({ resref }) => {
      const index = requireIndex();
      const doc = index.parsedGff.get(`${resref.toLowerCase()}.dlg`) as GffObj | undefined;
      if (!doc)
        return payload({
          target: resref,
          type: "dlg",
          status: "fail",
          errors: [{ code: "target_not_found", message: `No ${resref}.dlg in the module` }],
          warnings: [],
        });

      const report = new Report(resref, "dlg");
      verifyDialog(report, index, doc);
      return payload(report.result());
    },
  );

  // ─── Area ───────────────────────────────────────────────────────────────

  server.tool(
    "verify_area",
    "Verify an area (.are/.git/.gic). Checks tile count against dimensions, tile IDs against the tileset, area scripts, object positions within bounds, and GIC/GIT sync. Pass checkWalkable:true to additionally confirm interactive objects sit in the area's main walkable zone (catches NPCs placed somewhere the player cannot reach).",
    {
      area: z.string().describe("Area resref"),
      checkWalkable: z
        .boolean()
        .optional()
        .describe("Run the walkmesh reachability pass (slower — extracts .wok data)"),
    },
    READ_ONLY,
    async ({ area, checkWalkable }) => {
      const index = requireIndex();
      const report = new Report(area, "are");
      const resmanOpts = await buildResmanOptions(index);
      await verifyArea(report, index, area.toLowerCase(), { checkWalkable, resmanOpts });
      return payload(report.result());
    },
  );

  // ─── Journal, module info, faction ──────────────────────────────────────

  server.tool(
    "verify_journal",
    "Verify the journal (.jrl). Checks every quest has an End entry, entry IDs are unique, and that scripted AddJournalQuestEntry awards and journal entries agree in both directions.",
    { resref: z.string().optional().describe("Journal resref (defaults to the module's only .jrl)") },
    READ_ONLY,
    async ({ resref }) => {
      const index = requireIndex();
      const key = resref ? `${resref.toLowerCase()}.jrl` : [...index.resources.keys()].find((k) => k.endsWith(".jrl"));
      const doc = key ? (index.parsedGff.get(key) as GffObj | undefined) : undefined;
      if (!doc)
        return payload({
          target: resref ?? "(none)",
          type: "jrl",
          status: "fail",
          errors: [{ code: "target_not_found", message: "No .jrl found in the module" }],
          warnings: [],
        });

      const report = new Report(key!.replace(/\.jrl$/, ""), "jrl");
      await verifyJournal(report, index, doc);
      return payload(report.result());
    },
  );

  server.tool(
    "verify_module_info",
    "Verify module info (.ifo). Checks the entry area exists and the entry position is inside its bounds, that Mod_Area_list matches the actual .are resources, and that every module event script resolves.",
    {},
    READ_ONLY,
    async () => {
      const index = requireIndex();
      const key = [...index.resources.keys()].find((k) => k.endsWith(".ifo"));
      const doc = key ? (index.parsedGff.get(key) as GffObj | undefined) : undefined;
      if (!doc)
        return payload({
          target: "module",
          type: "ifo",
          status: "fail",
          errors: [{ code: "target_not_found", message: "No .ifo found in the module" }],
          warnings: [],
        });

      const report = new Report("module", "ifo");
      verifyModuleInfo(report, index, doc);
      return payload(report.result());
    },
  );

  server.tool(
    "verify_faction",
    "Verify the faction table (.fac). Checks every reputation entry references a real faction and that reputation values are in range.",
    {},
    READ_ONLY,
    async () => {
      const index = requireIndex();
      const key = [...index.resources.keys()].find((k) => k.endsWith(".fac"));
      const doc = key ? (index.parsedGff.get(key) as GffObj | undefined) : undefined;
      if (!doc)
        return payload({
          target: "repute",
          type: "fac",
          status: "fail",
          errors: [{ code: "target_not_found", message: "No .fac found in the module" }],
          warnings: [],
        });

      const report = new Report("repute", "fac");
      verifyFaction(report, index, doc);
      return payload(report.result());
    },
  );

  // ─── Co-op / multiplayer rules ──────────────────────────────────────────

  server.tool(
    "verify_coop_rules",
    "Verify the module follows co-op/multiplayer reward rules. Every module is assumed to be playable in a party, so rewards handed to a single PC are errors: in co-op only the player who happened to be talking receives them and the rest silently get nothing. Checks XP/gold/item rewards, journal party flags, and quest state stored per-PC.",
    { coop: COOP_PARAM },
    READ_ONLY,
    async ({ coop }) => {
      const index = requireIndex();
      const report = new Report("module", "coop");
      const opts = { enforce: coop !== false, perPlayerScripts: perPlayerScripts(index) };
      await verifyPartyRewards(report, index, opts);
      await verifyJournalPartyFlags(report, index, opts);
      await verifyPartyQuestState(report, index, opts);
      return payload(report.result());
    },
  );

  // ─── verify_all ─────────────────────────────────────────────────────────

  server.tool(
    "verify_all",
    "Run every applicable checker across the whole module: all blueprints, all areas, all dialogs, the journal, module info, factions, and the co-op reward rules. Returns a per-target breakdown plus a rollup. Use this as the final acceptance gate before shipping a generated module.",
    {
      checkWalkable: z.boolean().optional().describe("Include the per-area walkmesh reachability pass (slower)"),
      coop: COOP_PARAM,
    },
    READ_ONLY,
    async ({ checkWalkable, coop }) => {
      const index = requireIndex();
      const results: VerifyResult[] = [];
      const resmanOpts = await buildResmanOptions(index);

      // Blueprints, by extension.
      const blueprintCheckers: Array<[string, (r: Report, i: ModuleIndex, o: GffObj) => void]> = [
        ["uti", verifyItem],
        ["utp", verifyPlaceable],
        ["utd", verifyDoor],
        ["utt", verifyTrigger],
        ["ute", verifyEncounter],
        ["utm", verifyStore],
        ["utw", verifyWaypoint],
        ["uts", verifySound],
      ];

      for (const [key, entry] of index.resources) {
        if (entry.extension === "utc") {
          const doc = index.parsedGff.get(key) as GffObj | undefined;
          if (!doc) continue;
          const report = new Report(entry.resref, "utc");
          // A creature wired with the associate AI is a companion; hold it to
          // the stricter rules automatically.
          const isHenchman = getFieldStr(doc, "ScriptHeartbeat").startsWith("x0_ch_hen_");
          await verifyCreature(report, index, doc, { henchman: isHenchman, resmanOpts });
          results.push(report.result());
          continue;
        }
        const checker = blueprintCheckers.find(([ext]) => ext === entry.extension);
        if (!checker) continue;
        const doc = index.parsedGff.get(key) as GffObj | undefined;
        if (!doc) continue;
        const report = new Report(entry.resref, entry.extension);
        checker[1](report, index, doc);
        results.push(report.result());
      }

      // Dialogs.
      for (const [key, entry] of index.resources) {
        if (entry.extension !== "dlg") continue;
        const doc = index.parsedGff.get(key) as GffObj | undefined;
        if (!doc) continue;
        const report = new Report(entry.resref, "dlg");
        verifyDialog(report, index, doc);
        results.push(report.result());
      }

      // Areas.
      for (const areaResref of index.areas.keys()) {
        const report = new Report(areaResref, "are");
        await verifyArea(report, index, areaResref, { checkWalkable, resmanOpts });
        results.push(report.result());
      }

      // Journal.
      const jrlKey = [...index.resources.keys()].find((k) => k.endsWith(".jrl"));
      if (jrlKey) {
        const doc = index.parsedGff.get(jrlKey) as GffObj | undefined;
        if (doc) {
          const report = new Report(jrlKey.replace(/\.jrl$/, ""), "jrl");
          await verifyJournal(report, index, doc);
          results.push(report.result());
        }
      }

      // Module info.
      const ifoKey = [...index.resources.keys()].find((k) => k.endsWith(".ifo"));
      if (ifoKey) {
        const doc = index.parsedGff.get(ifoKey) as GffObj | undefined;
        if (doc) {
          const report = new Report("module", "ifo");
          verifyModuleInfo(report, index, doc);
          results.push(report.result());
        }
      }

      // Factions.
      const facKey = [...index.resources.keys()].find((k) => k.endsWith(".fac"));
      if (facKey) {
        const doc = index.parsedGff.get(facKey) as GffObj | undefined;
        if (doc) {
          const report = new Report("repute", "fac");
          verifyFaction(report, index, doc);
          results.push(report.result());
        }
      }

      // Co-op rules — module-wide, not per-asset.
      const coopReport = new Report("module", "coop");
      const coopOpts = { enforce: coop !== false, perPlayerScripts: perPlayerScripts(index) };
      await verifyPartyRewards(coopReport, index, coopOpts);
      await verifyJournalPartyFlags(coopReport, index, coopOpts);
      await verifyPartyQuestState(coopReport, index, coopOpts);
      results.push(coopReport.result());

      const failed = results.filter((r) => r.status === "fail");
      const warned = results.filter((r) => r.status === "warn");
      const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
      const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);

      // Group error codes by frequency so a caller sees the dominant problem first.
      const byCode = new Map<string, number>();
      for (const r of results) {
        for (const e of r.errors) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
      }
      const topCodes = [...byCode.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count }));

      return payload({
        shippable: errorCount === 0,
        checked: results.length,
        failedTargets: failed.length,
        warnedTargets: warned.length,
        errorCount,
        warningCount,
        errorsByCode: topCodes,
        // Only surface targets with something to say — a clean module returns a short payload.
        results: results.filter((r) => r.status !== "pass"),
      });
    },
  );

  void GIT_OBJECT_LISTS;
}
