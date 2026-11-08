/**
 * Quest-variable evidence for the journal checks: which objects advance which stage of which quest through the
 * parameter-driven quest system's `questK = "<stage>_<tag>"` variables (build_quest, TFN). A creature with a conversation
 * advances its stages through that dialog, recorded as "dlg:<resref>"; anything else as "<kind>:<tag or resref>".
 */

import type { GffObj } from "../types/gff.js";
import { getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { getVarTableEntries } from "./git-helpers.js";

/** tag -> stage -> sources. */
export type QuestVarAwards = Map<string, Map<number, string[]>>;

const SLOT_RE = /^quest\d{1,2}$/i;
const VALUE_RE = /^(\d+)_(.+)$/;

function scan(obj: GffObj, label: string, out: QuestVarAwards): void {
  const conv = getFieldStr(obj, "Conversation");
  for (const e of getVarTableEntries(obj)) {
    if (!SLOT_RE.test(e.name) || typeof e.value !== "string") continue;
    const m = VALUE_RE.exec(e.value);
    if (!m) continue;
    const tag = m[2].toLowerCase();
    const stage = Number(m[1]);
    let byStage = out.get(tag);
    if (!byStage) out.set(tag, (byStage = new Map()));
    const sources = byStage.get(stage) ?? [];
    const source = conv ? `dlg:${conv.toLowerCase()}` : label;
    if (!sources.includes(source)) sources.push(source);
    byStage.set(stage, sources);
  }
}

export function collectQuestVarAwards(index: ModuleIndex): QuestVarAwards {
  const out: QuestVarAwards = new Map();
  for (const [key, entry] of index.resources) {
    if (!["utc", "uti", "utp", "utt", "are"].includes(entry.extension)) continue;
    const doc = index.parsedGff.get(key);
    if (doc) scan(doc as GffObj, `${entry.extension}:${entry.resref}`, out);
  }
  for (const area of index.areas.keys()) {
    const git = index.parsedGff.get(`${area}.git`) as Record<string, unknown> | undefined;
    if (!git) continue;
    for (const [list, kind] of [
      ["Creature List", "creature"],
      ["Placeable List", "placeable"],
      ["TriggerList", "trigger"],
    ] as const) {
      const objs = (git[list] as { value?: GffObj[] } | undefined)?.value ?? [];
      for (const o of objs) scan(o, `${kind}:${getFieldStr(o, "Tag")}`, out);
    }
  }
  return out;
}
