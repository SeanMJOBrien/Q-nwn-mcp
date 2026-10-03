/**
 * Local variable (VarTable) editing tools.
 *
 * Tools:
 * - get_object_variables: Read local variables on a placed instance or a standalone blueprint
 * - set_object_variables: Merge local variables onto a placed instance or a standalone blueprint
 * - remove_object_variable: Remove one (or all) local variables from a placed instance or blueprint
 *
 * A single target can be either:
 * - a PLACED instance: area + tag (searches every GIT list, or just listName if given),
 *   or area + listName + index
 * - a standalone BLUEPRINT resource: resref + blueprintType
 *
 * IMPORTANT: a placed instance's VarTable is a separate copy from its blueprint's —
 * editing one does not edit the other. See the "separate copy" pitfall in CLAUDE.md.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import {
  getGitDoc,
  writeBackGit,
  mergeVarTable,
  getVarTableEntries,
  removeVarTableEntry,
  clearVarTable,
} from "../util/git-helpers.js";
import type { VarTableEntry } from "../util/git-helpers.js";
import { getFieldStr, getFieldList } from "../types/gff.js";
import type { GffObj, GffDocument } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { optNumParam, toI } from "../util/params.js";
import { snapshotGitForUndo } from "../util/undo.js";

/** GIT list names that can carry placed objects with their own VarTable. */
const GIT_LIST_NAMES = [
  "Creature List", "Placeable List", "Door List", "TriggerList",
  "Encounter List", "StoreList", "WaypointList", "SoundList",
];

const BLUEPRINT_TYPES = ["utc", "uti", "utp", "utd", "utt", "utw", "uts", "utm", "ute"] as const;

type ResolveResult =
  | { ok: true; kind: "placed"; obj: GffObj; gitDoc: GffDocument; area: string; label: string }
  | { ok: true; kind: "blueprint"; obj: GffObj; doc: GffDocument; filePath: string; label: string }
  | { ok: false; error: string };

/** Shared targeting params for all three tools in this file. */
const targetParams = {
  area: z.string().optional().describe(
    "Area resref — set (with tag, or listName+index) to target a placed instance. Omit when targeting a standalone blueprint via resref.",
  ),
  listName: z.string().optional().describe(
    "GIT list name to narrow a placed-instance search: 'Creature List', 'Placeable List', 'Door List', 'TriggerList', 'Encounter List', 'StoreList', 'WaypointList', 'SoundList'. If omitted and tag is given, every list in the area is searched.",
  ),
  tag: z.string().optional().describe("Tag of the placed object (first match within the searched list(s))"),
  index: optNumParam("0-based index within listName — alternative to tag, requires listName"),
  resref: z.string().optional().describe(
    "Blueprint resref — set with blueprintType to target a standalone blueprint resource instead of a placed instance.",
  ),
  blueprintType: z.enum(BLUEPRINT_TYPES).optional().describe(
    "Blueprint extension: utc=creature, uti=item, utp=placeable, utd=door, utt=trigger, utw=waypoint, uts=sound, utm=store/merchant, ute=encounter. Required with resref.",
  ),
};

function resolveTarget(
  index: ModuleIndex,
  area: string | undefined,
  listName: string | undefined,
  tag: string | undefined,
  objIndex: number | undefined,
  resref: string | undefined,
  blueprintType: string | undefined,
): ResolveResult {
  if (resref) {
    if (!blueprintType) {
      return { ok: false, error: "'blueprintType' is required when 'resref' is given." };
    }
    const key = `${resref.toLowerCase()}.${blueprintType}`;
    const doc = index.parsedGff.get(key);
    const entry = index.resources.get(key);
    if (!doc || !entry) {
      return {
        ok: false,
        error: `Blueprint '${resref}.${blueprintType}' not found as a module resource. Only blueprints that exist as real files in this module can be edited directly — a base-game/HAK-only blueprint has no file to write back to. Place an instance first (then target it by area+tag), or create the blueprint via create_*_blueprint.`,
      };
    }
    return { ok: true, kind: "blueprint", obj: doc as GffObj, doc, filePath: entry.filePath, label: `blueprint ${resref}.${blueprintType}` };
  }

  if (!area) {
    return {
      ok: false,
      error: "Provide either 'resref'+'blueprintType' (standalone blueprint) or 'area'+'tag' / 'area'+'listName'+'index' (placed instance).",
    };
  }
  if (tag === undefined && objIndex === undefined) {
    return { ok: false, error: "Provide 'tag' or 'index' to identify the placed object within the area." };
  }

  let gitDoc: GffDocument, git: GffObj;
  try {
    ({ doc: gitDoc, obj: git } = getGitDoc(index, area));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  const listsToSearch = listName ? [listName] : GIT_LIST_NAMES;
  for (const list of listsToSearch) {
    const items = getFieldList(git, list);
    let obj: GffObj | undefined;
    let foundIdx = -1;
    if (tag !== undefined) {
      foundIdx = items.findIndex(e => getFieldStr(e, "Tag") === tag);
      if (foundIdx >= 0) obj = items[foundIdx];
    } else if (objIndex !== undefined) {
      if (objIndex >= 0 && objIndex < items.length) {
        obj = items[objIndex];
        foundIdx = objIndex;
      }
    }
    if (obj) {
      return {
        ok: true,
        kind: "placed",
        obj,
        gitDoc,
        area,
        label: `${area}:${list}[${foundIdx}] (tag=${getFieldStr(obj, "Tag") || "none"})`,
      };
    }
  }

  return {
    ok: false,
    error: listName
      ? `Object not found in ${area}'s '${listName}'${tag !== undefined ? ` with tag '${tag}'` : ` at index ${objIndex}`}.`
      : `No object tagged '${tag}' found in any GIT list in area '${area}'. Pass listName to narrow the search.`,
  };
}

export function registerVariableTools(server: McpServer): void {

  // ─── get_object_variables ───────────────────────────────────────────────

  server.tool(
    "get_object_variables",
    "Read the local variables (VarTable) on a creature, placed object, or blueprint — either a placed instance (area + tag, or area + listName + index) or a standalone blueprint (resref + blueprintType). These are the static GFF defaults GetLocalInt/GetLocalFloat/GetLocalString read at runtime unless a script overwrites them first; use find_variable_usage to see which scripts read/write a given name.",
    { ...targetParams },
    { readOnlyHint: true, idempotentHint: true },
    async ({ area, listName, tag, index: objIndexStr, resref, blueprintType }) => {
      const index = requireIndex();
      const objIndex = objIndexStr !== undefined ? toI(objIndexStr) : undefined;

      const result = resolveTarget(index, area, listName, tag, objIndex, resref, blueprintType);
      if (!result.ok) return { content: [{ type: "text", text: result.error }] };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ target: result.label, variables: getVarTableEntries(result.obj) }, null, 2),
        }],
      };
    },
  );

  // ─── set_object_variables ───────────────────────────────────────────────

  server.tool(
    "set_object_variables",
    "Set local variables (VarTable entries) on a creature, placed object, or blueprint — either a placed instance (area + tag, or area + listName + index) or a standalone blueprint (resref + blueprintType). Merges by name (case-insensitive): an existing variable of the same name is overwritten in place, others are left alone. IMPORTANT: a placed instance's VarTable is a separate copy from its blueprint's — editing one does not edit the other.",
    {
      ...targetParams,
      variables: z.string().describe(
        'JSON array of local variables to set: [{"name":"HENCH_LEVEL","type":"int","value":5}]. type is one of int|float|string.',
      ),
    },
    { idempotentHint: true },
    async ({ area, listName, tag, index: objIndexStr, resref, blueprintType, variables }) => {
      const index = requireIndex();
      const objIndex = objIndexStr !== undefined ? toI(objIndexStr) : undefined;

      let entries: VarTableEntry[];
      try {
        entries = JSON.parse(variables) as VarTableEntry[];
      } catch {
        return { content: [{ type: "text", text: "Invalid JSON for 'variables' parameter." }] };
      }

      const result = resolveTarget(index, area, listName, tag, objIndex, resref, blueprintType);
      if (!result.ok) return { content: [{ type: "text", text: result.error }] };

      try {
        if (result.kind === "placed") {
          snapshotGitForUndo(result.gitDoc, result.area, "set_object_variables", `Set variables on ${result.label}`);
          mergeVarTable(result.obj, entries);
          await writeBackGit(index, result.area, result.gitDoc);
        } else {
          mergeVarTable(result.obj, entries);
          await jsonToGff(result.doc, result.filePath);
        }
      } catch (e) {
        return { content: [{ type: "text", text: e instanceof Error ? e.message : String(e) }] };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            target: result.label,
            set: entries.map(e => ({ name: e.name, type: e.type, value: e.value })),
            variables: getVarTableEntries(result.obj),
          }, null, 2),
        }],
      };
    },
  );

  // ─── remove_object_variable ─────────────────────────────────────────────

  server.tool(
    "remove_object_variable",
    "Remove one local variable (by name) or every local variable from a creature, placed object, or blueprint's VarTable — either a placed instance (area + tag, or area + listName + index) or a standalone blueprint (resref + blueprintType).",
    {
      ...targetParams,
      name: z.string().optional().describe("Name of the variable to remove (case-insensitive). Omit and pass all=true to clear every variable instead."),
      all: z.boolean().optional().describe("Remove every variable instead of one by name (default false)"),
    },
    { destructiveHint: true },
    async ({ area, listName, tag, index: objIndexStr, resref, blueprintType, name, all }) => {
      if (!name && !all) {
        return { content: [{ type: "text", text: "Provide 'name' to remove one variable, or 'all': true to clear every variable." }] };
      }
      const index = requireIndex();
      const objIndex = objIndexStr !== undefined ? toI(objIndexStr) : undefined;

      const result = resolveTarget(index, area, listName, tag, objIndex, resref, blueprintType);
      if (!result.ok) return { content: [{ type: "text", text: result.error }] };

      if (!all) {
        const exists = getVarTableEntries(result.obj).some(v => v.name.toLowerCase() === name!.toLowerCase());
        if (!exists) {
          return { content: [{ type: "text", text: `Variable '${name}' not found on ${result.label}.` }] };
        }
      }

      if (result.kind === "placed") {
        snapshotGitForUndo(result.gitDoc, result.area, "remove_object_variable", `Remove variable(s) from ${result.label}`);
      }

      const removedCount = all ? clearVarTable(result.obj) : (removeVarTableEntry(result.obj, name!) ? 1 : 0);

      if (result.kind === "placed") {
        await writeBackGit(index, result.area, result.gitDoc);
      } else {
        await jsonToGff(result.doc, result.filePath);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            target: result.label,
            removedCount,
            remainingVariables: getVarTableEntries(result.obj),
          }, null, 2),
        }],
      };
    },
  );
}
