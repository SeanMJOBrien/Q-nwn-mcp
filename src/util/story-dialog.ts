/**
 * TODO #46: the actor dialog carries a line of each key NPC's motive. For every key NPC in the story's Plot whose Motivation
 * is recorded, finds the placed creature of that name, reads its conversation and reports the NPC when no line shares a word
 * with the motive (a loose 5-letter-stem match; a warning, never a block).
 */

import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { dialogCarriesMotive, isPlaceholder, parsePlotRecord } from "./story-record.js";

function dialogTexts(index: ModuleIndex, resref: string): string[] {
  const doc = index.parsedGff.get(`${resref.toLowerCase()}.dlg`) as GffObj | undefined;
  if (!doc) return [];
  return [...getFieldList(doc, "EntryList"), ...getFieldList(doc, "ReplyList")]
    .map((n) => getFieldLocStr(n, "Text"))
    .filter(Boolean);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function motivesNotSpoken(index: ModuleIndex, markdown: string): string[] {
  const placed: Array<{ name: string; conversation: string }> = [];
  for (const [resref] of index.areas) {
    const git = index.parsedGff.get(`${resref}.git`) as GffObj | undefined;
    if (!git) continue;
    for (const c of getFieldList(git, "Creature List")) {
      placed.push({
        name: norm(`${getFieldLocStr(c, "FirstName")} ${getFieldLocStr(c, "LastName")}`),
        conversation: getFieldStr(c, "Conversation"),
      });
    }
  }
  const out: string[] = [];
  for (const npc of parsePlotRecord(markdown).npcs) {
    if (isPlaceholder(npc.motivation) || npc.role === "antagonist") continue;
    const want = norm(npc.name);
    const match =
      placed.find((p) => p.name === want) ??
      placed.find((p) => p.name && (p.name.includes(want) || want.includes(p.name)));
    if (!match?.conversation) continue;
    if (!dialogCarriesMotive(npc.motivation, dialogTexts(index, match.conversation))) {
      out.push(
        `${npc.name}'s dialog (${match.conversation}) never touches their motive ("${npc.motivation.slice(0, 80)}"): give them one line of it.`,
      );
    }
  }
  return out;
}
