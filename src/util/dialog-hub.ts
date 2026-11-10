/**
 * Dialog structure rule (user, 2026-11-09): a branch must not end the conversation. After an NPC answer the
 * conversation returns to the main dialog state (the root entry's PC options) and continues until the player
 * picks the exit option. `addReturnLinks` adds those return links to a built DLG document.
 *
 * Hub = the PC replies of a root (StartingList) entry. The exit is a hub reply with no NPC answer; one is added
 * ("[Leave.]") when the hub has none. Every NPC entry reached from the root that has no replies of its own
 * (a dead end) gets links back to the hub (same conditions as the hub's own links, so one-shot options still hide
 * themselves), minus the reply that led to it. An entry whose Comment is "end" stays terminal on purpose (a fight
 * starts, a cutscene takes over).
 */

import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";

/** Comment value that marks an NPC entry as deliberately ending the conversation. */
export const END_MARK = "end";

export interface ReturnLinkOptions {
  /** Entry indices that must stay terminal (in addition to those whose Comment is "end"). */
  endEntries?: Iterable<number>;
  /** When set, only these dead-end entries are linked (used when merging lines into an existing dialog). */
  onlyEntries?: Iterable<number>;
  exitText?: string;
}

export interface ReturnLinkResult {
  /** Entries that now return to the hub. */
  linked: number[];
  /** Dead-end entries left terminal on purpose. */
  terminal: number[];
  /** Exit replies added. */
  exitsAdded: number;
  /** Root entries with no PC options (a one-line greeting): nothing to return to. */
  noHub: number[];
}

function linkCopy(l: GffObj, structId: number): GffObj {
  return JSON.parse(JSON.stringify({ ...l, __struct_id: structId })) as GffObj;
}

export function addReturnLinks(doc: GffObj, options: ReturnLinkOptions = {}): ReturnLinkResult {
  const entries = getFieldList(doc, "EntryList");
  const replies = getFieldList(doc, "ReplyList");
  const starting = getFieldList(doc, "StartingList");
  const forcedEnd = new Set(options.endEntries ?? []);
  const only = options.onlyEntries ? new Set(options.onlyEntries) : undefined;
  const result: ReturnLinkResult = { linked: [], terminal: [], exitsAdded: 0, noHub: [] };
  const assigned = new Set<number>();

  for (const s of starting) {
    const root = getFieldNum(s, "Index");
    const rootEntry = entries[root];
    if (!rootEntry || assigned.has(root)) continue;
    assigned.add(root);
    const hubLinks = getFieldList(rootEntry, "RepliesList");
    if (hubLinks.length === 0) {
      result.noHub.push(root);
      continue;
    }
    const hasExit = hubLinks.some((l) => getFieldList(replies[getFieldNum(l, "Index")] ?? {}, "EntriesList").length === 0);
    if (!hasExit) {
      const exit = {
        __struct_id: replies.length,
        Animation: { type: "dword", value: 0 },
        AnimLoop: { type: "byte", value: 1 },
        Comment: { type: "cexostring", value: "" },
        Delay: { type: "dword", value: 4294967295 },
        EntriesList: { type: "list", value: [] },
        Quest: { type: "cexostring", value: "" },
        Script: { type: "resref", value: "" },
        Sound: { type: "resref", value: "" },
        Text: { type: "cexolocstring", value: { "0": options.exitText ?? "[Leave.]" } },
        ActionParams: { type: "list", value: [] },
      } as unknown as GffObj;
      replies.push(exit);
      hubLinks.push({
        __struct_id: hubLinks.length,
        Index: { type: "dword", value: replies.length - 1 },
        Active: { type: "resref", value: "" },
        ConditionParams: { type: "list", value: [] },
        IsChild: { type: "byte", value: 0 },
      } as unknown as GffObj);
      result.exitsAdded++;
    }

    // Walk everything reachable from the root, remembering which reply led to each entry.
    const parents = new Map<number, Set<number>>();
    const seen = new Set<number>([root]);
    const stack: number[] = [root];
    while (stack.length) {
      const e = stack.pop() as number;
      for (const rl of getFieldList(entries[e], "RepliesList")) {
        const r = getFieldNum(rl, "Index");
        for (const el of getFieldList(replies[r] ?? {}, "EntriesList")) {
          const next = getFieldNum(el, "Index");
          if (next === root) continue;
          if (!parents.has(next)) parents.set(next, new Set());
          parents.get(next)?.add(r);
          if (!seen.has(next)) {
            seen.add(next);
            stack.push(next);
          }
        }
      }
    }

    for (const [e, viaReplies] of parents) {
      if (assigned.has(e)) continue;
      const entry = entries[e];
      if (getFieldList(entry, "RepliesList").length > 0) continue;
      if (getFieldStr(entry, "Comment") === END_MARK || forcedEnd.has(e)) {
        result.terminal.push(e);
        continue;
      }
      if (only && !only.has(e)) continue;
      const out = getFieldList(entry, "RepliesList");
      for (const hl of hubLinks) {
        if (viaReplies.has(getFieldNum(hl, "Index"))) continue; // do not offer the question just asked
        out.push(linkCopy(hl, out.length));
      }
      result.linked.push(e);
    }
  }
  return result;
}

/** Dead-end NPC entries and whether each conversation root has an exit; used by verify_dialog. */
export function dialogShape(doc: GffObj): { deadEnds: number[]; rootsWithoutExit: number[] } {
  const entries = getFieldList(doc, "EntryList");
  const replies = getFieldList(doc, "ReplyList");
  const deadEnds: number[] = [];
  const rootsWithoutExit: number[] = [];
  const roots = new Set(getFieldList(doc, "StartingList").map((s) => getFieldNum(s, "Index")));
  for (const root of roots) {
    const hub = getFieldList(entries[root] ?? {}, "RepliesList");
    if (hub.length === 0) continue;
    if (!hub.some((l) => getFieldList(replies[getFieldNum(l, "Index")] ?? {}, "EntriesList").length === 0)) rootsWithoutExit.push(root);
  }
  entries.forEach((e, i) => {
    if (roots.has(i)) return;
    if (getFieldList(e, "RepliesList").length === 0 && getFieldStr(e, "Comment") !== END_MARK) deadEnds.push(i);
  });
  return { deadEnds, rootsWithoutExit };
}

/** First words of an entry's text, for messages. */
export function entryLabel(doc: GffObj, i: number): string {
  return getFieldLocStr(getFieldList(doc, "EntryList")[i] ?? {}, "Text").slice(0, 50);
}
