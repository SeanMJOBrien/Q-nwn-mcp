/**
 * Dialog creation MCP tools.
 *
 * Tools:
 * - create_dialog: Create a new DLG conversation file from a simplified tree
 * - add_dialog_node: Add a node to an existing dialog
 * - edit_dialog_node: Edit text/script/sound/comment on an existing dialog node
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { buildDialogSummary, requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { addReturnLinks, dialogShape, entryLabel } from "../util/dialog-hub.js";
import { numParam, optNumParam, toI } from "../util/params.js";

// ─── Types ──────────────────────────────────────────────────────────────────

/** EE script parameters (GetScriptParam): key -> value, both strings. */
export type ScriptParams = Record<string, string>;

export interface InputNode {
  speaker: "npc" | "pc";
  text: string;
  script?: string;
  /** ActionParams for this node's script. */
  params?: ScriptParams;
  condition?: string;
  /** ConditionParams for the condition on the link leading to this node. */
  conditionParams?: ScriptParams;
  /** Native journal advance: the node sets this journal tag to `questEntry` when it plays (no script needed). */
  quest?: string;
  questEntry?: number;
  /** NPC line that deliberately ends the conversation (a fight starts, a cutscene takes over); skipped by the return-to-hub rule. */
  end?: boolean;
  children?: InputNode[];
}

/** The `{Key, Value}` cexostring struct list ActionParams/ConditionParams use (verified against 417 TFN dialogs). */
export function paramList(params?: ScriptParams): { type: "list"; value: GffObj[] } {
  return {
    type: "list",
    value: Object.entries(params ?? {}).map(
      ([k, v], i) =>
        ({
          __struct_id: i,
          Key: { type: "cexostring", value: k },
          Value: { type: "cexostring", value: String(v) },
        }) as unknown as GffObj,
    ),
  };
}

/** Parse a tool's JSON params argument ('{"target":"2"}') into string values; throws on anything but a flat object. */
export function parseParamsArg(raw: string | undefined, name: string): ScriptParams | undefined {
  if (raw === undefined || raw === "") return undefined;
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error(`${name} must be a JSON object of key -> value`);
  const out: ScriptParams = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (!k) throw new Error(`${name} has an empty key`);
    if (v !== null && typeof v === "object") throw new Error(`${name}.${k} must be a string, number or boolean`);
    out[k] = String(v);
  }
  return out;
}

export interface NodeExtras {
  end?: boolean;
  params?: ScriptParams;
  quest?: string;
  questEntry?: number;
}

function questFields(extras?: NodeExtras): Record<string, unknown> {
  if (!extras?.quest) return { Quest: { type: "cexostring", value: "" } };
  return {
    Quest: { type: "cexostring", value: extras.quest },
    QuestEntry: { type: "dword", value: Number(extras.questEntry ?? 0) },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Build a link struct for StartingList, RepliesList, or EntriesList. */
export function makeLink(index: number, condition?: string, conditionParams?: ScriptParams): GffObj {
  return {
    __struct_id: 0,
    Index: { type: "dword", value: index },
    Active: { type: "resref", value: condition || "" },
    ConditionParams: paramList(conditionParams),
    IsChild: { type: "byte", value: 0 },
  } as unknown as GffObj;
}

/** Build an NPC entry struct with all standard NWN DLG fields. */
export function makeEntry(text: string, script?: string, extras?: NodeExtras): GffObj {
  return {
    __struct_id: 0,
    ActionParams: paramList(extras?.params),
    Animation: { type: "dword", value: 0 },
    AnimLoop: { type: "byte", value: 1 },
    Comment: { type: "cexostring", value: extras?.end ? "end" : "" },
    Delay: { type: "dword", value: 4294967295 },
    ...questFields(extras),
    RepliesList: { type: "list", value: [] },
    Script: { type: "resref", value: script || "" },
    Sound: { type: "resref", value: "" },
    Speaker: { type: "cexostring", value: "" },
    Text: { type: "cexolocstring", value: { "0": text } },
  } as unknown as GffObj;
}

/** Build a PC reply struct with all standard NWN DLG fields. */
export function makeReply(text: string, script?: string, extras?: NodeExtras): GffObj {
  return {
    __struct_id: 0,
    ActionParams: paramList(extras?.params),
    Animation: { type: "dword", value: 0 },
    AnimLoop: { type: "byte", value: 1 },
    Comment: { type: "cexostring", value: "" },
    Delay: { type: "dword", value: 4294967295 },
    EntriesList: { type: "list", value: [] },
    ...questFields(extras),
    Script: { type: "resref", value: script || "" },
    Sound: { type: "resref", value: "" },
    Text: { type: "cexolocstring", value: { "0": text } },
  } as unknown as GffObj;
}

/**
 * Validate that the tree alternates NPC↔PC correctly.
 * Returns an error message string, or null if valid.
 */
export function validateTree(nodes: InputNode[], expectedSpeaker: "npc" | "pc"): string | null {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.speaker !== expectedSpeaker) {
      return `Node "${node.text.slice(0, 40)}..." has speaker="${node.speaker}" but expected "${expectedSpeaker}"`;
    }
    if (node.children?.length) {
      const nextSpeaker = expectedSpeaker === "npc" ? "pc" : "npc";
      const childErr = validateTree(node.children, nextSpeaker as "npc" | "pc");
      if (childErr) return childErr;
    }
  }
  return null;
}

/**
 * Flatten a tree of InputNodes into EntryList (NPC), ReplyList (PC), and StartingList.
 */
function flattenTree(roots: InputNode[]): {
  entryList: GffObj[];
  replyList: GffObj[];
  startingList: GffObj[];
} {
  const entryList: GffObj[] = [];
  const replyList: GffObj[] = [];
  const startingList: GffObj[] = [];

  function processEntry(node: InputNode): number {
    const entry = makeEntry(node.text, node.script, node);
    const idx = entryList.length;
    entryList.push(entry);

    if (node.children) {
      const replies = getFieldList(entry, "RepliesList");
      for (const child of node.children) {
        const replyIdx = processReply(child);
        replies.push(makeLink(replyIdx, child.condition, child.conditionParams));
      }
    }
    return idx;
  }

  function processReply(node: InputNode): number {
    const reply = makeReply(node.text, node.script, node);
    const idx = replyList.length;
    replyList.push(reply);

    if (node.children) {
      const entries = getFieldList(reply, "EntriesList");
      for (const child of node.children) {
        const entryIdx = processEntry(child);
        entries.push(makeLink(entryIdx, child.condition, child.conditionParams));
      }
    }
    return idx;
  }

  for (const root of roots) {
    const entryIdx = processEntry(root);
    startingList.push(makeLink(entryIdx, root.condition, root.conditionParams));
  }

  return { entryList, replyList, startingList };
}

/** A complete DLG document (every field the engine requires) from a validated node tree. */
export function buildDialogDocument(roots: InputNode[]): GffDocument {
  const { entryList, replyList, startingList } = flattenTree(roots);
  return {
    __data_type: "DLG ",
    DelayEntry: { type: "dword", value: 0 },
    DelayReply: { type: "dword", value: 0 },
    NumWords: { type: "dword", value: 0 },
    EndConverAbort: { type: "resref", value: "" },
    EndConversation: { type: "resref", value: "" },
    PreventZoomIn: { type: "byte", value: 0 },
    StartingList: { type: "list", value: startingList },
    EntryList: { type: "list", value: entryList },
    ReplyList: { type: "list", value: replyList },
  };
}

/** Write a DLG document into the module and register it in the index. Returns its size in bytes. */
export async function writeDialogDocument(index: ModuleIndex, resref: string, doc: GffDocument): Promise<number> {
  const resrefLower = resref.toLowerCase();
  const key = `${resrefLower}.dlg`;
  const filePath = path.join(index.tempDir, key);
  await jsonToGff(doc, filePath);
  const stat = await fs.stat(filePath);
  index.resources.set(key, { resref: resrefLower, extension: "dlg", filePath, sizeBytes: stat.size });
  index.parsedGff.set(key, doc);
  index.dialogs.set(resrefLower, buildDialogSummary(resrefLower, doc, index.creatures));
  return stat.size;
}

// ─── Tool Registration ──────────────────────────────────────────────────────

export function registerDialogWriteTools(server: McpServer): void {
  // ─── create_dialog ────────────────────────────────────────────────────

  server.tool(
    "create_dialog",
    "Create a new DLG conversation file from a simplified tree structure. Root nodes must be NPC lines (speaker: 'npc'). The tree alternates NPC→PC→NPC.",
    {
      resref: z.string().describe("Dialog filename without extension"),
      nodes: z
        .string()
        .describe(
          "JSON array of dialog tree nodes: [{ speaker: 'npc'|'pc', text: string, script?: string, params?: {key: value}, condition?: string, conditionParams?: {key: value}, quest?: string, questEntry?: number, children?: [...] }]. params are the script's ActionParams and conditionParams the condition's ConditionParams (read with GetScriptParam); quest + questEntry advance that journal stage natively when the node plays. end: true on an NPC line ends the conversation there on purpose (every other branch returns to the main dialog).",
        ),
      returnToHub: z
        .boolean()
        .optional()
        .describe(
          "Dialog rule (default true): every NPC answer that would end the conversation instead returns to the main dialog (the first NPC line's PC options), and an exit reply (\"[Leave.]\") is added when none exists, so the conversation only ends when the player leaves. Pass false only for a deliberately linear dialog.",
        ),
    },
    { destructiveHint: true },
    async ({ resref, nodes, returnToHub }) => {
      const index = requireIndex();
      const resrefLower = resref.toLowerCase();
      const key = `${resrefLower}.dlg`;

      if (index.resources.has(key)) {
        return {
          content: [{ type: "text", text: `Dialog already exists: ${key}. Use add_dialog_node to modify it.` }],
          isError: true,
        };
      }

      let parsed: InputNode[];
      try {
        parsed = JSON.parse(nodes);
      } catch (e) {
        return {
          content: [{ type: "text", text: `Invalid JSON: ${(e as Error).message}` }],
          isError: true,
        };
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        return {
          content: [{ type: "text", text: "nodes must be a non-empty JSON array" }],
          isError: true,
        };
      }

      const treeErr = validateTree(parsed, "npc");
      if (treeErr) {
        return {
          content: [{ type: "text", text: `Tree validation failed: ${treeErr}` }],
          isError: true,
        };
      }

      const doc = buildDialogDocument(parsed);
      const hub = returnToHub === false ? undefined : addReturnLinks(doc as unknown as GffObj);
      const sizeBytes = await writeDialogDocument(index, resrefLower, doc);
      const entryList = getFieldList(doc, "EntryList");
      const replyList = getFieldList(doc, "ReplyList");
      const startingList = getFieldList(doc, "StartingList");

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                resref: resrefLower,
                entries: entryList.length,
                replies: replyList.length,
                startingNodes: startingList.length,
                returnsToHub: hub ? { linked: hub.linked.length, exitsAdded: hub.exitsAdded, terminal: hub.terminal.length } : false,
                sizeBytes,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── add_dialog_return_links ──────────────────────────────────────────

  server.tool(
    "add_dialog_return_links",
    "Apply the dialog rule to an existing dialog: every NPC answer that ends the conversation returns to the main dialog (the root line's PC options) instead, and an exit reply is added when the root has none, so the conversation ends only when the player picks the exit. Links keep the hub's conditions (a one-shot option hides itself). Entries listed in endEntries, or marked end, stay terminal on purpose (a fight starts, a recruit joins). dryRun lists what would change.",
    {
      dialog: z.string().describe("Dialog resref"),
      endEntries: z.string().optional().describe("JSON array of NPC entry indices that must keep ending the conversation, e.g. [4,7]"),
      dryRun: z.boolean().optional().describe("Report only, change nothing"),
    },
    { destructiveHint: true },
    async ({ dialog, endEntries, dryRun }) => {
      const index = requireIndex();
      const key = `${dialog.toLowerCase()}.dlg`;
      const doc = index.parsedGff.get(key) as GffDocument | undefined;
      if (!doc) return { content: [{ type: "text", text: `Dialog not found: ${key}` }], isError: true };
      let ends: number[] = [];
      if (endEntries) {
        try {
          ends = (JSON.parse(endEntries) as unknown[]).map((n) => Number(n));
        } catch {
          return { content: [{ type: "text", text: "endEntries must be a JSON array of numbers" }], isError: true };
        }
      }
      const before = dialogShape(doc as unknown as GffObj);
      const work = dryRun ? (JSON.parse(JSON.stringify(doc)) as GffDocument) : doc;
      const r = addReturnLinks(work as unknown as GffObj, { endEntries: ends });
      if (!dryRun && (r.linked.length > 0 || r.exitsAdded > 0)) await writeDialogDocument(index, dialog, doc);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                dialog: dialog.toLowerCase(),
                dryRun: !!dryRun,
                returnedToHub: r.linked.map((i) => ({ entry: i, text: entryLabel(doc as unknown as GffObj, i) })),
                exitRepliesAdded: r.exitsAdded,
                keptTerminal: r.terminal,
                noMainDialog: r.noHub,
                deadEndsBefore: before.deadEnds.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── add_dialog_node ──────────────────────────────────────────────────

  server.tool(
    "add_dialog_node",
    "Add a node to an existing dialog. If parentType is 'entry', adds a PC reply linked from that entry. If parentType is 'reply', adds an NPC entry linked from that reply. If parentType is 'dialog', adds a new NPC root entry to the StartingList (use for quest-stage branching with condition scripts). For 'dialog' mode, parentIndex controls insertion position: 0 inserts at the beginning (evaluated first), -1 or omit appends at the end (evaluated last).",
    {
      dialog: z.string().describe("Dialog resref"),
      parentIndex: numParam(
        "Index of parent node in its list (EntryList or ReplyList). For parentType 'dialog': 0=insert at start, -1=append at end",
      ),
      parentType: z
        .enum(["entry", "reply", "dialog"])
        .describe(
          "Type of parent: 'entry' adds PC reply, 'reply' adds NPC entry, 'dialog' adds NPC root entry to StartingList",
        ),
      text: z.string().describe("Dialog text for the new node"),
      script: z.string().optional().describe("Action script resref (runs when node plays)"),
      condition: z.string().optional().describe("Condition script on the link from parent"),
      params: z.string().optional().describe('JSON object of ActionParams for the node\'s script, e.g. {"target":"2"}'),
      conditionParams: z
        .string()
        .optional()
        .describe('JSON object of ConditionParams for the condition, e.g. {"quest":"q_wolf","op":"at","stage":"1"}'),
      quest: z.string().optional().describe("Journal tag this node advances natively when it plays"),
      questEntry: optNumParam("Journal entry ID (stage) the node sets; needs quest"),
    },
    { destructiveHint: true },
    async ({
      dialog,
      parentIndex,
      parentType,
      text,
      script,
      condition,
      params,
      conditionParams,
      quest,
      questEntry,
    }) => {
      let extras: NodeExtras;
      let condParams: ScriptParams | undefined;
      try {
        extras = {
          params: parseParamsArg(params, "params"),
          quest,
          questEntry: questEntry !== undefined ? toI(questEntry) : undefined,
        };
        condParams = parseParamsArg(conditionParams, "conditionParams");
      } catch (e) {
        return { content: [{ type: "text", text: (e as Error).message }], isError: true };
      }
      if (questEntry !== undefined && !quest) {
        return { content: [{ type: "text", text: "questEntry needs quest (the journal tag)" }], isError: true };
      }
      const index = requireIndex();
      const parentIdx = toI(parentIndex);
      const resrefLower = dialog.toLowerCase();
      const key = `${resrefLower}.dlg`;

      const doc = index.parsedGff.get(key);
      if (!doc) {
        return {
          content: [{ type: "text", text: `Dialog not found: ${key}` }],
          isError: true,
        };
      }

      const dlg = doc as GffObj;
      const entries = getFieldList(dlg, "EntryList");
      const replies = getFieldList(dlg, "ReplyList");

      // ─── parentType: "dialog" — add a new NPC root entry to StartingList ─
      if (parentType === "dialog") {
        const newEntry = makeEntry(text, script, extras);
        const newIndex = entries.length;
        entries.push(newEntry);

        const startingList = getFieldList(dlg, "StartingList");
        const link = makeLink(newIndex, condition, condParams);

        if (parentIdx <= 0 || parentIdx >= startingList.length) {
          // -1 or 0: insert at the beginning (highest priority, evaluated first)
          // Also handles out-of-range: append at end
          if (parentIdx === -1) {
            startingList.push(link);
          } else {
            startingList.unshift(link);
          }
        } else {
          startingList.splice(parentIdx, 0, link);
        }

        // Write back to disk
        const entry = index.resources.get(key);
        if (!entry) {
          return {
            content: [{ type: "text", text: `Resource entry not found for ${key}` }],
            isError: true,
          };
        }
        await jsonToGff(doc, entry.filePath);

        const summary = buildDialogSummary(resrefLower, doc, index.creatures);
        index.dialogs.set(resrefLower, summary);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  dialog: resrefLower,
                  addedType: "entry",
                  addedIndex: newIndex,
                  parentType: "dialog",
                  startingListPosition: parentIdx === -1 ? startingList.length - 1 : parentIdx <= 0 ? 0 : parentIdx,
                  totalEntries: entries.length,
                  totalReplies: replies.length,
                  totalStartingNodes: startingList.length,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // ─── parentType: "entry" or "reply" — add child node ─────────────────
      const parentList = parentType === "entry" ? entries : replies;
      if (parentIdx < 0 || parentIdx >= parentList.length) {
        return {
          content: [
            { type: "text", text: `${parentType} index ${parentIdx} out of range (0-${parentList.length - 1})` },
          ],
          isError: true,
        };
      }

      const parentNode = parentList[parentIdx];
      const targetList = parentType === "entry" ? replies : entries;
      const linkListName = parentType === "entry" ? "RepliesList" : "EntriesList";
      const newNodeType = parentType === "entry" ? "reply" : "entry";

      // Build the new node
      const newNode = newNodeType === "entry" ? makeEntry(text, script, extras) : makeReply(text, script, extras);

      const newIndex = targetList.length;
      targetList.push(newNode);

      // Ensure parent has the link list (handles previously-leaf nodes)
      let links: GffObj[];
      try {
        links = getFieldList(parentNode, linkListName);
      } catch {
        setField(parentNode, linkListName, "list", []);
        links = getFieldList(parentNode, linkListName);
      }
      links.push(makeLink(newIndex, condition, condParams));

      // Write back to disk
      const entry = index.resources.get(key);
      if (!entry) {
        return {
          content: [{ type: "text", text: `Resource entry not found for ${key}` }],
          isError: true,
        };
      }
      await jsonToGff(doc, entry.filePath);

      // Rebuild dialog summary
      const summary = buildDialogSummary(resrefLower, doc, index.creatures);
      index.dialogs.set(resrefLower, summary);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                dialog: resrefLower,
                addedType: newNodeType,
                addedIndex: newIndex,
                parentType,
                parentIndex: parentIdx,
                totalEntries: entries.length,
                totalReplies: replies.length,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── edit_dialog_node ────────────────────────────────────────────────

  server.tool(
    "edit_dialog_node",
    "Edit an existing dialog node's text, script, sound, or comment. Supports partial updates — only provided fields are changed. Note: conditions live on links (Active field), not nodes — use modify_gff_field for those.",
    {
      dialog: z.string().describe("Dialog resref"),
      nodeType: z.enum(["entry", "reply"]).describe("Node type: 'entry' (NPC line) or 'reply' (PC line)"),
      nodeIndex: numParam("Index of the node in EntryList or ReplyList"),
      text: z.string().optional().describe("New dialog text"),
      script: z.string().optional().describe("New action script resref (runs when node plays)"),
      sound: z.string().optional().describe("New sound resref"),
      comment: z.string().optional().describe("New builder comment"),
      params: z.string().optional().describe("JSON object replacing the node's ActionParams ('{}' clears them)"),
      quest: z.string().optional().describe("Journal tag the node advances natively ('' clears it)"),
      questEntry: optNumParam("Journal entry ID the node sets (with quest)"),
    },
    { idempotentHint: true },
    async ({ dialog, nodeType, nodeIndex, text, script, sound, comment, params, quest, questEntry }) => {
      let newParams: ScriptParams | undefined;
      try {
        newParams = parseParamsArg(params, "params");
      } catch (e) {
        return { content: [{ type: "text", text: (e as Error).message }], isError: true };
      }
      if (
        text === undefined &&
        script === undefined &&
        sound === undefined &&
        comment === undefined &&
        newParams === undefined &&
        quest === undefined &&
        questEntry === undefined
      ) {
        return {
          content: [
            {
              type: "text",
              text: "Must provide at least one field to edit (text, script, sound, comment, params, quest or questEntry)",
            },
          ],
          isError: true,
        };
      }

      const index = requireIndex();
      const idx = toI(nodeIndex);
      const resrefLower = dialog.toLowerCase();
      const key = `${resrefLower}.dlg`;

      const doc = index.parsedGff.get(key);
      if (!doc) {
        return { content: [{ type: "text", text: `Dialog not found: ${key}` }], isError: true };
      }

      const dlg = doc as GffObj;
      const list = nodeType === "entry" ? getFieldList(dlg, "EntryList") : getFieldList(dlg, "ReplyList");

      if (idx < 0 || idx >= list.length) {
        return {
          content: [{ type: "text", text: `${nodeType} index ${idx} out of range (0-${list.length - 1})` }],
          isError: true,
        };
      }

      const node = list[idx];
      const changes: Record<string, unknown> = {};
      const oldText = getFieldLocStr(node, "Text");

      if (text !== undefined) {
        setField(node, "Text", "cexolocstring", { "0": text });
        changes.text = text;
      }
      if (script !== undefined) {
        setField(node, "Script", "resref", script);
        changes.script = script;
      }
      if (sound !== undefined) {
        setField(node, "Sound", "resref", sound);
        changes.sound = sound;
      }
      if (comment !== undefined) {
        setField(node, "Comment", "cexostring", comment);
        changes.comment = comment;
      }
      if (newParams !== undefined) {
        node.ActionParams = paramList(newParams);
        changes.params = newParams;
      }
      if (quest !== undefined) {
        setField(node, "Quest", "cexostring", quest);
        if (quest === "") delete node.QuestEntry;
        changes.quest = quest;
      }
      if (questEntry !== undefined && (quest ?? getFieldStr(node, "Quest"))) {
        setField(node, "QuestEntry", "dword", toI(questEntry));
        changes.questEntry = toI(questEntry);
      }

      // Write back to disk
      const entry = index.resources.get(key);
      if (!entry) {
        return { content: [{ type: "text", text: `Resource entry not found for ${key}` }], isError: true };
      }
      await jsonToGff(doc, entry.filePath);

      // Rebuild dialog summary
      const summary = buildDialogSummary(resrefLower, doc, index.creatures);
      index.dialogs.set(resrefLower, summary);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                dialog: resrefLower,
                nodeType,
                nodeIndex: idx,
                oldText,
                changes,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
