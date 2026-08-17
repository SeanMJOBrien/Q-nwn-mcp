/**
 * .dlg structural checker.
 *
 * The NWN engine silently refuses to load a dialog whose entries/replies are
 * missing standard fields — no error, the conversation just never opens. That
 * makes this the single highest-value checker in the family.
 */

import type { GffObj } from "../../types/gff.js";
import { getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { checkScriptRef, hasField, listOf, type Report } from "./common.js";

/** Fields every entry/reply struct must carry or the engine won't load the DLG. */
const REQUIRED_NODE_FIELDS = ["Animation", "AnimLoop", "Comment", "Delay", "Quest", "Script", "Sound", "Text"];

/** Fields every link struct must carry. */
const REQUIRED_LINK_FIELDS = ["Index", "Active", "IsChild"];

export function verifyDialog(report: Report, index: ModuleIndex, doc: GffObj): void {
  const entries = listOf(doc, "EntryList");
  const replies = listOf(doc, "ReplyList");
  const starting = listOf(doc, "StartingList");

  if (starting.length === 0) {
    report.error(
      "dialog_no_start",
      "Dialog has an empty StartingList — the conversation has no entry point and will never open",
      "StartingList",
    );
  }
  if (entries.length === 0) {
    report.error(
      "dialog_no_entries",
      "Dialog has an empty EntryList — there is nothing for the NPC to say",
      "EntryList",
    );
  }

  // ─── Mandatory field completeness ───────────────────────────────────────
  const checkNodeFields = (nodes: GffObj[], listName: string, linkField: string) => {
    for (const [i, node] of nodes.entries()) {
      for (const field of REQUIRED_NODE_FIELDS) {
        if (!hasField(node, field)) {
          report.error(
            "dialog_missing_node_field",
            `${listName}.${i} is missing the "${field}" field — the engine silently refuses to load dialogs with incomplete nodes`,
            `${listName}.${i}.${field}`,
            "rebuild via create_dialog/add_dialog_node, whose helpers populate every mandatory field",
          );
        }
      }
      // Action script on the node.
      checkScriptRef(report, index, getFieldStr(node, "Script"), `${listName}.${i}.Script`);
      // Links out of this node.
      checkLinks(listOf(node, linkField), `${listName}.${i}.${linkField}`);
    }
  };

  const checkLinks = (links: GffObj[], path: string) => {
    for (const [i, link] of links.entries()) {
      for (const field of REQUIRED_LINK_FIELDS) {
        if (!hasField(link, field)) {
          report.error(
            "dialog_missing_link_field",
            `${path}.${i} is missing the "${field}" field — link structs require it`,
            `${path}.${i}.${field}`,
          );
        }
      }
      checkScriptRef(report, index, getFieldStr(link, "Active"), `${path}.${i}.Active`);
    }
  };

  checkNodeFields(entries, "EntryList", "RepliesList");
  checkNodeFields(replies, "ReplyList", "EntriesList");
  checkLinks(starting, "StartingList");

  // ─── Dangling indices ───────────────────────────────────────────────────
  // A link pointing past the end of its target list crashes the conversation.
  const checkIndices = (links: GffObj[], path: string, limit: number, targetName: string) => {
    for (const [i, link] of links.entries()) {
      const target = getFieldNum(link, "Index");
      if (target < 0 || target >= limit) {
        report.error(
          "dialog_dangling_index",
          `${path}.${i} points at ${targetName}[${target}] but that list has ${limit} entries — this dangling index breaks the conversation`,
          `${path}.${i}.Index`,
        );
      }
    }
  };

  checkIndices(starting, "StartingList", entries.length, "EntryList");
  for (const [i, entry] of entries.entries()) {
    checkIndices(listOf(entry, "RepliesList"), `EntryList.${i}.RepliesList`, replies.length, "ReplyList");
  }
  for (const [i, reply] of replies.entries()) {
    checkIndices(listOf(reply, "EntriesList"), `ReplyList.${i}.EntriesList`, entries.length, "EntryList");
  }

  // ─── Reachability ───────────────────────────────────────────────────────
  const reachedEntries = new Set<number>();
  const reachedReplies = new Set<number>();
  const walkEntry = (idx: number) => {
    if (idx < 0 || idx >= entries.length || reachedEntries.has(idx)) return;
    reachedEntries.add(idx);
    for (const link of listOf(entries[idx], "RepliesList")) walkReply(getFieldNum(link, "Index"));
  };
  const walkReply = (idx: number) => {
    if (idx < 0 || idx >= replies.length || reachedReplies.has(idx)) return;
    reachedReplies.add(idx);
    for (const link of listOf(replies[idx], "EntriesList")) walkEntry(getFieldNum(link, "Index"));
  };
  for (const link of starting) walkEntry(getFieldNum(link, "Index"));

  const orphanEntries = entries.length - reachedEntries.size;
  const orphanReplies = replies.length - reachedReplies.size;
  if (orphanEntries > 0) {
    report.warn(
      "dialog_orphan_nodes",
      `${orphanEntries} entry node(s) are unreachable from StartingList — dead content the player can never see`,
      "EntryList",
    );
  }
  if (orphanReplies > 0) {
    report.warn("dialog_orphan_nodes", `${orphanReplies} reply node(s) are unreachable from StartingList`, "ReplyList");
  }

  // ─── Unconditional root ─────────────────────────────────────────────────
  // If every root has a condition and they all evaluate false, the NPC has
  // nothing to say and the conversation opens empty.
  if (starting.length > 0 && starting.every((link) => getFieldStr(link, "Active") !== "")) {
    report.warn(
      "dialog_all_roots_conditional",
      "Every StartingList root has an Active condition — if all evaluate false the conversation opens with no text. Add an unconditional fallback root last",
      "StartingList",
    );
  }
}
