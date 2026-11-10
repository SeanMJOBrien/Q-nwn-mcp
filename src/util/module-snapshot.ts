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
  x: number;
  y: number;
}
/**
 * Something that happens in an area, as opposed to something that stands in it. A fight is a group of hostiles
 * within FIGHT_RADIUS metres of each other (one event however many creatures); a usable is a placeable the player
 * can use that does something (inventory, a script or a dialog); a trigger counts when it runs a script on enter;
 * a talker is a friendly creature with a dialog. Props, sounds, doors and idle creatures are scenery.
 */
export interface AreaEvents {
  fights: number;
  usables: number;
  triggers: number;
  talkers: number;
  total: number;
}
export const FIGHT_RADIUS = 12;
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
  events: AreaEvents;
  stores: number;
  transitionsTo: string[];
}
export interface QuestSnap {
  tag: string;
  name: string;
  entries: number;
  hasEnd: boolean;
}
/** The DM area every module must have: disconnected, with a chest holding the story book and the DM guide book. */
export interface DmAreaSnap {
  resref: string;
  disconnected: boolean;
  hasWaypoint: boolean;
  chest: boolean;
  storyBook: boolean;
  guideBook: boolean;
}
/** BASE_ITEM_BOOK in baseitems.2da. */
export const BOOK_BASE_ITEM = 74;
const DM_AREA = /(^|[^a-z])dm([^a-z]|$)|dungeon.?master/i;

export interface ModuleSnapshot {
  dmArea?: DmAreaSnap;
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

/** Groups hostiles that stand within FIGHT_RADIUS of each other (single linkage) and returns the group count. */
export function countFights(hostiles: { x: number; y: number }[]): number {
  const parent = hostiles.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < hostiles.length; i++)
    for (let j = i + 1; j < hostiles.length; j++)
      if (Math.hypot(hostiles[i].x - hostiles[j].x, hostiles[i].y - hostiles[j].y) <= FIGHT_RADIUS) parent[find(i)] = find(j);
  return new Set(hostiles.map((_, i) => find(i))).size;
}

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
      x: getFieldNum(c, "XPosition"),
      y: getFieldNum(c, "YPosition"),
    }));
    const usables = getFieldList(git, "Placeable List").filter(
      (p) =>
        getFieldNum(p, "Useable") === 1 &&
        (getFieldNum(p, "HasInventory") === 1 || getFieldStr(p, "OnUsed") !== "" || getFieldStr(p, "Conversation") !== ""),
    ).length;
    const eventTriggers = getFieldList(git, "TriggerList").filter((t) => getFieldStr(t, "ScriptOnEnter") !== "").length;
    const talkers = creatures.filter((c) => !c.hostile && c.conversation !== "").length;
    const fights = countFights(creatures.filter((c) => c.hostile));
    const events: AreaEvents = { fights, usables, triggers: eventTriggers, talkers, total: fights + usables + eventTriggers + talkers };
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
      events,
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

  let dmArea: DmAreaSnap | undefined;
  for (const [resref, summary] of index.areas) {
    if (!DM_AREA.test(resref) && !DM_AREA.test(summary.name || "")) continue;
    const git = (index.parsedGff.get(`${resref}.git`) ?? {}) as GffObj;
    const books = getFieldList(git, "Placeable List")
      .filter((p) => getFieldNum(p, "HasInventory") === 1)
      .flatMap((p) => getFieldList(p, "ItemList"))
      .filter((i) => getFieldNum(i, "BaseItem") === BOOK_BASE_ITEM)
      .map((i) => `${getFieldStr(i, "Tag")} ${getFieldLocStr(i, "LocalizedName")}`);
    dmArea = {
      resref,
      disconnected: unreachableAreas.includes(resref) || (entryArea !== "" && resref !== entryArea && !areas.some((a) => a.resref !== resref && a.transitionsTo.includes(resref))),
      hasWaypoint: getFieldList(git, "WaypointList").length > 0,
      chest: getFieldList(git, "Placeable List").some((p) => getFieldNum(p, "HasInventory") === 1),
      storyBook: books.some((b) => /story/i.test(b)),
      guideBook: books.some((b) => /guide/i.test(b)),
    };
    break;
  }

  return {
    dmArea,
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
