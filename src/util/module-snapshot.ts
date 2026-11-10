/** A plain summary of a loaded module (no I/O), the input to adopt_module and audit_module. */

import { computeConnectivity } from "../tools/analysis-tools.js";
import { buildAreaTransitions, buildTagToAreaMap } from "../tools/tileset-tools.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

export interface CreatureSnap {
  tag: string;
  name: string;
  level: number;
  hostile: boolean;
  conversation: string;
  area: string;
}
export interface AreaSnap {
  resref: string;
  name: string;
  tileset: string;
  width: number;
  height: number;
  isInterior: boolean;
  creatures: CreatureSnap[];
  placeables: number;
  sounds: number;
  waypoints: number;
  doors: number;
  triggers: number;
  stores: number;
  transitionsTo: string[];
}
export interface QuestSnap {
  tag: string;
  name: string;
  entries: number;
  hasEnd: boolean;
}
export interface ModuleSnapshot {
  title: string;
  description: string;
  entryArea: string;
  areas: AreaSnap[];
  unreachableAreas: string[];
  quests: QuestSnap[];
  dialogCount: number;
  itemBlueprints: number;
  storeBlueprints: number;
  scripts: number;
  uncompiledScripts: string[];
  hasRewardSystem: boolean;
  hasQuestSystem: boolean;
}

/** Hostile faction id in a stock module's faction table. */
export const HOSTILE_FACTION = 1;

export function gatherSnapshot(index: ModuleIndex): ModuleSnapshot {
  const ifo = (index.parsedGff.get("module.ifo") ?? {}) as GffObj;
  const entryArea = (getFieldStr(ifo, "Mod_Entry_Area") || [...index.areas.keys()][0] || "").toLowerCase();
  const tagToArea = buildTagToAreaMap(index);

  const areas: AreaSnap[] = [];
  for (const [resref, summary] of index.areas) {
    const git = (index.parsedGff.get(`${resref}.git`) ?? {}) as GffObj;
    const creatures: CreatureSnap[] = getFieldList(git, "Creature List").map((c) => ({
      tag: getFieldStr(c, "Tag"),
      name: [getFieldLocStr(c, "FirstName"), getFieldLocStr(c, "LastName")].filter(Boolean).join(" ") || getFieldStr(c, "Tag"),
      level: getFieldList(c, "ClassList").reduce((n, k) => n + getFieldNum(k, "ClassLevel"), 0),
      hostile: getFieldNum(c, "FactionID") === HOSTILE_FACTION,
      conversation: getFieldStr(c, "Conversation"),
      area: resref,
    }));
    areas.push({
      resref,
      name: summary.name || resref,
      tileset: summary.tileset,
      width: summary.width,
      height: summary.height,
      isInterior: summary.isInterior,
      creatures,
      placeables: getFieldList(git, "Placeable List").length,
      sounds: getFieldList(git, "SoundList").length,
      waypoints: getFieldList(git, "WaypointList").length,
      doors: getFieldList(git, "Door List").length,
      triggers: getFieldList(git, "TriggerList").length,
      stores: getFieldList(git, "StoreList").length,
      transitionsTo: [...new Set(buildAreaTransitions(index, resref, tagToArea).map((t) => t.targetArea))],
    });
  }

  const quests: QuestSnap[] = [];
  for (const [key, entry] of index.resources) {
    if (entry.extension !== "jrl") continue;
    const doc = index.parsedGff.get(key) as GffObj | undefined;
    if (!doc) continue;
    for (const cat of getFieldList(doc, "Categories")) {
      const entries = getFieldList(cat, "EntryList");
      quests.push({
        tag: getFieldStr(cat, "Tag"),
        name: getFieldLocStr(cat, "Name") || getFieldStr(cat, "Tag"),
        entries: entries.length,
        hasEnd: entries.some((e) => getFieldNum(e, "End") === 1),
      });
    }
  }

  const nss = new Set<string>();
  const ncs = new Set<string>();
  const resrefs = new Set<string>();
  let itemBlueprints = 0;
  let storeBlueprints = 0;
  for (const entry of index.resources.values()) {
    if (entry.extension === "nss") nss.add(entry.resref.toLowerCase());
    if (entry.extension === "ncs") ncs.add(entry.resref.toLowerCase());
    if (entry.extension === "uti") itemBlueprints++;
    if (entry.extension === "utm") storeBlueprints++;
    resrefs.add(entry.resref.toLowerCase());
  }
  // An include has no main(), so it never has a .ncs; only scripts that other things run count.
  const uncompiledScripts = [...nss].filter((r) => !ncs.has(r) && !r.startsWith("inc_"));

  let unreachableAreas: string[] = [];
  if (entryArea && index.areas.has(entryArea)) unreachableAreas = computeConnectivity(index, entryArea).unreachable;

  return {
    title: index.moduleName,
    description: getFieldLocStr(ifo, "Mod_Description"),
    entryArea,
    areas,
    unreachableAreas,
    quests,
    dialogCount: index.dialogs.size,
    itemBlueprints,
    storeBlueprints,
    scripts: nss.size,
    uncompiledScripts,
    hasRewardSystem: resrefs.has("inc_reward"),
    hasQuestSystem: resrefs.has("inc_quest") || resrefs.has("q_act"),
  };
}
