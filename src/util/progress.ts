/**
 * The per-module build checklist behind get_progress: one list of small, checkable steps from an empty module to a
 * shippable one, each ticked from the module's real state (not from what a model says it did), and the single next
 * step with the exact call to make.
 *
 * Small models lose their place: they generate a layout and never create the area, or finish the areas and forget
 * the map pins. phase_check only knows whole phases. This list is finer (per area, per NPC, per quest), so "what
 * now?" always has one concrete answer. Pure: the tool gathers ModuleFacts, this file decides.
 */

import { AREA_RECIPES } from "./area-recipes.js";
import { challengeGroups } from "./enemy-roster.js";
import { OWN_SECTION, PHASES, type Phase, parseSections } from "./phase-check.js";

export type ProgressPhase = "start" | Phase | "ship";

export interface ProgressItem {
  id: string;
  phase: ProgressPhase;
  label: string;
  done: boolean;
  /** The call (or action) that does this step. */
  call?: string;
  /** Why it is not done, when the state says more than "not yet". */
  detail?: string;
  /** Area resrefs the step is about (for the step's facts: get_area_card). */
  areas?: string[];
  /** The location, NPC or quest the step is about, as the plot names it. */
  subject?: string;
  /** The few tools the step needs (a step-mode driver shows only these, plus the always-on ones). */
  tools?: string[];
  /**
   * A call that does the whole step with no choice left to make (a build_area spec from the plot, dress_area with the
   * tileset's kit, a section drafted from the module): the step-mode driver runs it itself and asks the model only if
   * the step is still open after it. A small model given these steps invented props, sections and copied examples.
   */
  auto?: { tool: string; args: Record<string, unknown> };
}

/** Tools every step may use besides its own. */
/** Phases whose story section write_story_section drafts from the module (draft: true). */
export const DRAFTED_SECTIONS: readonly Phase[] = ["areas", "environment", "actors", "challenges", "affordances", "rewards"];

export const STEP_BASE_TOOLS = ["get_progress", "get_area_card", "get_result", "read_story", "undo_last_change"];

/** The tools one step needs, by its id. */
export function stepTools(id: string): string[] {
  const [phase] = id.split(".");
  if (id.endsWith(".section")) return ["write_story_section"];
  if (id.endsWith(".check")) return ["phase_check"];
  if (id === "start.scope") return ["set_project_scope"];
  if (id === "start.module") return ["write_story_section"];
  if (phase === "plot") return ["write_plot", "plan_adventure_shape", "list_tilesets", "suggest_area_size"];
  if (phase === "areas") {
    if (id.startsWith("areas.link.")) return ["adventure_create_transition", "link_doors", "get_area_doors", "adventure_find_walkable", "probe_ground"];
    if (id === "areas.start") return ["set_module_start", "adventure_find_walkable"];
    return ["build_area", "adventure_list_features", "delete_area", "visualize_area"];
  }
  if (phase === "environment") {
    if (id.endsWith(".pins")) return ["dress_area", "place_waypoint", "probe_ground", "get_area_doors"];
    return ["dress_area", "place_placeable", "list_blueprints", "adventure_find_walkable", "probe_ground"];
  }
  if (phase === "actors") return ["build_key_npc", "build_creature", "list_creature_samples", "adventure_find_walkable", "get_dialog_tree", "verify_creature"];
  if (phase === "quests") return ["build_quest", "get_dialog_tree", "list_creatures", "list_items", "get_journal", "verify_quest_completability"];
  if (phase === "challenges") {
    if (id.includes(".trap.") || id.endsWith(".plottrap")) return ["build_trap", "create_trap_blueprint", "place_trigger", "add_skill_check", "adventure_find_walkable"];
    if (id.includes(".boss.")) return ["build_key_npc", "compose_encounter", "list_creature_samples", "adventure_find_walkable", "get_area_creatures"];
    return ["build_enemy_group", "suggest_encounter", "place_creature", "place_encounter", "adventure_find_walkable", "get_area_creatures"];
  }
  if (phase === "affordances") {
    if (id === "affordances.gold") return ["set_starting_gold", "get_wealth_budget"];
    if (id.startsWith("affordances.store")) return ["build_store", "create_store_blueprint", "place_store", "get_dialog_tree", "add_dialog_node", "list_creatures"];
    return ["add_items_to_container", "list_treasure_samples", "import_treasure_item", "list_blueprints", "get_wealth_budget", "get_area_placeables"];
  }
  if (id === "polish.verify") return ["verify_all", "check_area_connectivity", "add_dialog_return_links", "prune_dialog_orphans", "fix_object_heights", "move_object", "remove_object"];
  if (id === "rewards.dmguide") return ["write_dm_guide"];
  if (id === "rewards.dmarea") return ["create_dm_area"];
  return [];
}

/** The last `n` lines of a progress file's Notes: the decisions a new conversation must keep. */
export function recentNotes(progressFile: string | null, n = 6): string[] {
  if (!progressFile) return [];
  const notes = (parseSections(progressFile).get("Notes") ?? "").split("\n").map((l) => l.trim()).filter((l) => l.startsWith("- "));
  return notes.slice(-n).map((l) => l.slice(2));
}

/** A JSON spec written as a tool-call argument: `"{\"a\":1}"`. */
const specArg = (o: Record<string, unknown>) => JSON.stringify(JSON.stringify(o));

export interface PlotOutline {
  locations: Array<{ name: string; resref: string; tileset?: string; purpose?: string; events?: string; beat?: string }>;
  connections: Array<[string, string]>;
  npcs: Array<{ name: string; location?: string; role?: string; who?: string; motive?: string; voice?: string }>;
  quests: Array<{ name: string; giver?: string; stages?: string[] }>;
  /** Locations that the Challenges list names. */
  challengeLocations: string[];
  /** The Challenges list's text per location ("The Mill: 2 bandits, 1 trap" -> "2 bandits, 1 trap"), by location name. */
  challengeLines?: Record<string, string>;
  merchant: boolean;
}

export interface AreaFacts {
  width: number;
  height: number;
  tileset: string;
  distinctTiles: number;
  props: number;
  mapPins: number;
  creatures: Array<{ name: string; hostile: boolean; tag?: string; resref?: string }>;
  encounters: number;
  stores: number;
  /** Tags of placed stores. */
  storeTags?: string[];
  /** Tags of placed triggers (traps, transitions). */
  triggerTags?: string[];
  /** Placeables with an inventory, and how many items each holds. */
  containers?: Array<{ tag: string; items: number; gold?: number; resrefs?: string[] }>;
}

/** What a phase's own story section says it placed, per area (the section formats in docs/phase-prompts/). */
export interface SectionTargets {
  /** Challenges: area resref -> boss (name/resref) and trap tags. */
  fights: Map<string, { bosses: Array<{ name: string; resref?: string }>; traps: string[] }>;
  /** Environment: area resref -> container tags. */
  containers: Map<string, string[]>;
  /** Affordances: [area, container tag] that hold loot; [area, store tag]. */
  loot: Array<[string, string]>;
  stores: Array<[string, string]>;
}

/** Area blocks `### Name (\`resref\`)` of a section; a resref is taken only when it is a known area. */
function areaBlocks(section: string, known: Set<string>): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const [h, b] of blocks(section, 3)) {
    const r = /`([a-z0-9_]+)`/.exec(h)?.[1] ?? /\(([a-z0-9_]+)\)/.exec(h)?.[1];
    if (r && known.has(r)) out.push([r, b]);
  }
  return out;
}

export function parseSectionTargets(sections: Map<string, string>, knownAreas: Set<string>): SectionTargets {
  const fights: SectionTargets["fights"] = new Map();
  const challenges = sections.get("Challenges") ?? "";
  for (const [r, b] of areaBlocks(challenges, knownAreas)) {
    const bosses = [...b.matchAll(/\*\*Boss:\*\*\s*([^(,\n]+?)\s*(?:\(`([a-z0-9_]+)`\))?\s*(?:,|$)/gm)].map((m) => ({ name: m[1].trim(), resref: m[2] }));
    const trapLine = /\*\*Traps?:\*\*\s*(.+)/.exec(b)?.[1] ?? "";
    const traps = [...trapLine.matchAll(/([a-z0-9_]+)\s+at\s*\(/g)].map((m) => m[1]);
    fights.set(r, { bosses: bosses.filter((x) => x.name && !/^none\b/i.test(x.name)), traps });
  }
  // Lines like "- ashfalldowns: ..." also name a fight area.
  for (const line of challenges.split("\n")) {
    const r = /^\s*-\s*`?([a-z0-9_]+)`?\s*:/.exec(line)?.[1];
    if (r && knownAreas.has(r) && !fights.has(r)) fights.set(r, { bosses: [], traps: [] });
  }
  const containers: SectionTargets["containers"] = new Map();
  for (const [r, b] of areaBlocks(sections.get("Environment") ?? "", knownAreas)) {
    const line = /\*\*Containers?:\*\*\s*(.+)/.exec(b)?.[1] ?? "";
    const tags = [...line.matchAll(/\(([a-z0-9_]+)\)/g)].map((m) => m[1]);
    if (tags.length) containers.set(r, tags);
  }
  const loot: Array<[string, string]> = [];
  const stores: Array<[string, string]> = [];
  for (const line of (sections.get("Affordances") ?? "").split("\n")) {
    const l = /^\s*-\s*`([a-z0-9_]+)`\s+([A-Za-z0-9_]+)\s*:/.exec(line);
    if (l && knownAreas.has(l[1])) loot.push([l[1], l[2].toLowerCase()]);
    const st = /\(`([a-z0-9_]+)`\)\s+in\s+`([a-z0-9_]+)`/.exec(line);
    if (st && knownAreas.has(st[2])) stores.push([st[2], st[1]]);
  }
  return { fights, containers, loot, stores };
}

export interface ModuleFacts {
  areas: Map<string, AreaFacts>;
  /** Area -> areas it has a transition to. */
  graph: Record<string, string[]>;
  entryArea: string;
  journalQuests: string[];
  dmAreaResref: string;
  dmGuideWritten: boolean;
  scopeRecorded: boolean;
  /** module.ifo has a player-facing description. */
  descriptionSet?: boolean;
  /** The OnClientEnter handler gives starting gold (set_starting_gold's script, or a hand-written GiveGoldToCreature). */
  startingGold?: boolean;
}

export interface PhaseStatus {
  status: string;
  errors?: string[];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[—–-]/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

function field(block: string, name: string): string | undefined {
  const m = new RegExp(`^\\s*-\\s*\\*\\*${name}:\\*\\*\\s*(.+)$`, "im").exec(block);
  return m ? m[1].trim() : undefined;
}

/** Split `text` at headings of exactly `level` hashes: [heading, body][]. */
function blocks(text: string, level: number): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const re = new RegExp(`^#{${level}}\\s+(.+?)\\s*$`, "gm");
  const marks = [...text.matchAll(re)];
  marks.forEach((m, i) => {
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    out.push([m[1], text.slice(start, end)]);
  });
  return out;
}

/** The parts of a `## Plot` section the checklist needs (write_plot's format and the adventure-plot skill's). */
export function parsePlotOutline(plot: string): PlotOutline {
  const sub = new Map(blocks(plot, 3).map(([h, b]) => [norm(h), b]));
  const locations = blocks(sub.get("locations") ?? "", 4).map(([h, b]) => {
    const name = h.replace(/^\d+\.\s*/, "").trim();
    const resref = (field(b, "Resref") ?? name.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16)).split(/\s/)[0].toLowerCase();
    return {
      name,
      resref,
      tileset: field(b, "Tileset")?.split(/\s/)[0],
      purpose: field(b, "Purpose")?.toLowerCase(),
      events: field(b, "Events")?.toLowerCase(),
      beat: field(b, "Beat"),
    };
  });
  const connections: Array<[string, string]> = [];
  for (const line of (sub.get("connections") ?? "").split("\n")) {
    const m = /^\s*-\s*(.+?)\s*<->\s*(.+?)(?:\s+via\s+.*)?$/.exec(line);
    // One link per pair of places, whichever way round or however often the plot lists it.
    if (m && !connections.some(([x, y]) => (norm(x) === norm(m[1]) && norm(y) === norm(m[2])) || (norm(x) === norm(m[2]) && norm(y) === norm(m[1])))) connections.push([m[1].trim(), m[2].trim()]);
  }
  const npcs = blocks(sub.get("key npcs") ?? "", 4).map(([h, b]) => ({
    name: h.trim(),
    location: field(b, "Location"),
    role: field(b, "Role")?.toLowerCase(),
    who: field(b, "Race, class, gender")?.toLowerCase(),
    motive: field(b, "Motive"),
    voice: field(b, "Voice"),
  }));
  // Antagonists (write_plot: "- **Name:** who, in Location. Motive: ..."): people too, built hostile by the actors phase.
  for (const line of (sub.get("antagonists") ?? "").split("\n")) {
    const m = /^\s*-\s*\*\*(.+?):\*\*\s*(.*)$/.exec(line);
    if (!m || npcs.some((n) => norm(n.name) === norm(m[1]))) continue;
    const rest = m[2];
    const where = /,?\s+in\s+([^.]+)\./.exec(rest)?.[1]?.trim() ?? locations.find((l) => norm(rest).includes(norm(l.name)))?.name;
    npcs.push({ name: m[1].trim(), location: where, role: "antagonist", who: rest.split(/,\s+in\s+|\.\s/)[0].toLowerCase(), motive: /Motive:\s*([^.]+)/.exec(rest)?.[1]?.trim(), voice: undefined });
  }
  const quests = blocks(sub.get("quest objectives") ?? "", 4)
    .map(([h, b]) => ({
      name: h.replace(/^(primary|side)\s+quest:\s*/i, "").replace(/\s*\(optional\)\s*$/i, "").trim(),
      giver: /\*\*Giver:\*\*\s*(.+)/.exec(b)?.[1].trim(),
      stages: [...b.matchAll(/\*\*Stage \d+[^*]*:\*\*\s*(.+)/g)].map((m) => m[1].trim()),
    }))
    .filter((q) => q.name);
  const challengeText = sub.get("challenges") ?? "";
  const challengeLocations = locations.filter((l) => norm(challengeText).includes(norm(l.name))).map((l) => l.name);
  const challengeLines: Record<string, string> = {};
  for (const line of challengeText.split("\n")) {
    const m = /^\s*-\s*(.+?)\s*:\s*(.+)$/.exec(line);
    const loc = m ? locations.find((l) => norm(l.name) === norm(m[1]) || l.resref === m[1].trim().toLowerCase()) : undefined;
    if (m && loc) challengeLines[loc.name] = m[2].trim();
  }
  const economy = norm(sub.get("loot economy") ?? sub.get("loot & economy") ?? "");
  const merchantLine = /merchants?:?\s*(.*)/.exec(economy)?.[1] ?? "";
  const merchant =
    npcs.some((n) => n.role?.includes("merchant")) || (merchantLine !== "" && !/^none\b/.test(merchantLine));
  return { locations, connections, npcs, quests, challengeLocations, challengeLines, merchant };
}

/** A placed creature is this NPC when one name holds the other, or they share a surname. */
export function nameMatches(npc: string, creature: string): boolean {
  const a = norm(npc);
  const b = norm(creature);
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const lastA = a.split(" ").pop() ?? "";
  const lastB = b.split(" ").pop() ?? "";
  return lastA.length >= 4 && lastA === lastB;
}

function phaseDone(status: Record<string, PhaseStatus> | undefined, p: Phase): boolean {
  const s = status?.[p]?.status;
  return s === "success" || s === "skipped";
}

/** A container's loot for the party's level: two healing potions and some coin. */
export function starterLoot(level: number): Array<{ resref: string; quantity: number }> {
  return [
    { resref: "nw_it_mpotion001", quantity: 2 },
    { resref: "nw_it_gold001", quantity: Math.max(10, level * 25) },
  ];
}

/** A person's resref and tag from the plot's name: "Mill Owner" -> mill_owner. */
export function npcResref(name: string): string {
  return name.toLowerCase().replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 16) || "npc";
}

const RACES: Array<[RegExp, number]> = [[/half[- ]?elf/, 4], [/half[- ]?orc/, 5], [/dwarf/, 0], [/elf/, 1], [/gnome/, 2], [/halfling/, 3], [/human/, 6]];
const CLASSES: Array<[RegExp, number]> = [
  [/barbarian/, 0], [/bard/, 1], [/cleric|priest/, 2], [/druid/, 3], [/fighter|warrior|soldier|guard/, 4], [/monk/, 5],
  [/paladin/, 6], [/ranger/, 7], [/rogue|thief/, 8], [/sorcerer/, 9], [/wizard|mage/, 10],
];

/** build_key_npc arguments for a plot person: race, class and gender from "human cleric, male", faction from the role. */
function keyNpcArgs(n: { name: string; role?: string; who?: string }, tag: string, area: string, level: number): Record<string, string> {
  const who = n.who ?? "";
  const hostile = /antagonist|villain|enemy|boss|leader of the|bandit/.test(n.role ?? "");
  return {
    resref: tag,
    name: n.name,
    area,
    race: String(RACES.find(([re]) => re.test(who))?.[1] ?? 6),
    classId: String(CLASSES.find(([re]) => re.test(who))?.[1] ?? 4),
    level: String(hostile ? level + 1 : level),
    gender: /female|woman/.test(who) ? "1" : "0",
    faction: hostile ? "hostile" : /merchant/.test(n.role ?? "") ? "merchant" : "commoner",
    ...(hostile ? {} : { conversation: tag }),
  };
}

/** build_companion arguments for a plot companion: the plot's motive and voice become its first lines. */
function companionArgs(n: { name: string; who?: string; motive?: string; voice?: string }, tag: string, area: string, level: number): Record<string, string> {
  const who = n.who ?? "";
  return {
    resref: tag,
    name: n.name,
    area,
    race: String(RACES.find(([re]) => re.test(who))?.[1] ?? 6),
    classId: String(CLASSES.find(([re]) => re.test(who))?.[1] ?? 4),
    level: String(level),
    gender: /female|woman/.test(who) ? "1" : "0",
    introduction: `I am ${n.name}.${n.motive ? ` I want to ${n.motive.replace(/^to\s+/i, "").replace(/\.$/, "")}.` : ""} I will fight beside you if you will have me.`,
    backstory: n.voice || n.motive || `${n.name} has served the village for years.`,
  };
}

/** The description players read before they start (docs/phase-prompts/rewards.md shape), from the Module fields. */
export function moduleDescription(module: string, outline: PlotOutline | null): string {
  const f = (name: string) => new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, "i").exec(module)?.[1]?.trim();
  const tone = f("Tone") ?? "adventurous";
  const party = f("Party Size") ?? "4";
  const level = f("Target Level") ?? f("Level") ?? "3";
  const difficulty = f("Difficulty") ?? "standard";
  const minutes = f("Estimated Duration") ?? "90 minutes";
  const companions = (outline?.npcs ?? []).filter((n) => /companion|henchm/.test(n.role ?? "")).length;
  const idea = (f("Idea") ?? "").split(/(?<=[.!?])\s/)[0];
  return `${tone[0].toUpperCase()}${tone.slice(1)} adventure for ${party} character(s) of level ${level}. ${difficulty[0].toUpperCase()}${difficulty.slice(1)} difficulty. ${companions} recruitable companion(s). About ${minutes}.${idea ? ` ${idea}` : ""}`.slice(0, 600);
}

/** The main quest's reward by target level (docs/phase-prompts/rewards.md table): set when the quest is built. */
export function questReward(level: number): { xp: number; gold: number } {
  if (level <= 2) return { xp: 300, gold: 100 };
  if (level <= 4) return { xp: 600, gold: 300 };
  if (level <= 6) return { xp: 1200, gold: 700 };
  if (level <= 8) return { xp: 2000, gold: 1500 };
  return { xp: 3000, gold: 2500 };
}

/** A container tag as the section formats write it (lower case, no spaces): "Chest - 1" -> "chest___1". */
export function tagKey(tag: string): string {
  return tag.toLowerCase().replace(/[^a-z0-9_]/g, "_");
}

/**
 * A build_quest spec from the plot: the giver gives it (talk), the foe is defeated (kill), the giver is told
 * (return), with the plot's stage lines as the journal. Only when both stand in the module, by their real tags.
 */
function questSpec(
  q: { name: string; giver?: string; stages?: string[] },
  npcs: Array<{ name: string; role?: string }>,
  facts: ModuleFacts,
  level: number,
): Record<string, unknown> | null {
  const people = [...facts.areas.values()].flatMap((a) => a.creatures);
  const find = (name: string | undefined, hostile: boolean) =>
    name ? people.find((c) => c.hostile === hostile && (c.tag?.toLowerCase() === npcResref(name) || nameMatches(name, c.name))) : undefined;
  const giverName = q.giver ?? npcs.find((n) => /quest giver|giver/.test(n.role ?? ""))?.name ?? npcs.find((n) => !/antagonist|villain|enemy|boss/.test(n.role ?? ""))?.name;
  const foeName = npcs.find((n) => /antagonist|villain|enemy|boss/.test(n.role ?? ""))?.name;
  const giver = find(giverName, false);
  const foe = find(foeName, true);
  if (!giver?.tag || !foe?.tag) return null;
  const st = q.stages ?? [];
  const line = (i: number, fallback: string) => (st[i] ?? fallback).replace(/\s+/g, " ").slice(0, 200);
  return {
    name: q.name,
    giver: giver.tag.toLowerCase(),
    level,
    stages: [
      { do: "talk", journal: line(0, `${giverName} asked for help.`) },
      // early: a foe killed before the quest reaches this stage still counts (it stands hostile from the start).
      { do: "kill", target: foe.tag.toLowerCase(), journal: line(1, `Defeat ${foeName}.`), early: true },
      { do: "return", journal: line(2, `Tell ${giverName} it is done.`), reward: questReward(level) },
    ],
  };
}

/** Enemies that suit an area when the plot names none: undead below ground in crypts and dungeons, goblins in caves. */
function defaultEnemyKind(tileset: string): string {
  if (/^td[ecs]/.test(tileset)) return "skeleton";
  if (tileset === "tdm01") return "goblin";
  return "bandit";
}

/** Every step, in build order. */
export function buildChecklist(
  story: string | null,
  status: Record<string, PhaseStatus> | undefined,
  facts: ModuleFacts,
): { items: ProgressItem[]; outline: PlotOutline | null } {
  const items: ProgressItem[] = [];
  const add = (
    phase: ProgressPhase,
    id: string,
    label: string,
    done: boolean,
    call?: string,
    detail?: string,
    about: { areas?: string[]; subject?: string; auto?: ProgressItem["auto"] } = {},
  ) => {
    const tools = stepTools(id);
    items.push({
      id, phase, label, done,
      ...(call ? { call } : {}),
      ...(detail && !done ? { detail } : {}),
      ...(about.areas?.length ? { areas: about.areas } : {}),
      ...(about.subject ? { subject: about.subject } : {}),
      ...(tools.length ? { tools } : {}),
      ...(about.auto && !done ? { auto: about.auto } : {}),
    });
  };
  const sections = story ? parseSections(story) : new Map<string, string>();
  const has = (s: string) => (sections.get(s) ?? "").trim().length > 0;
  const targetLevel = Number(/\*\*(?:Target )?Level:\*\*\s*(\d+)/i.exec(sections.get("Module") ?? "")?.[1] ?? 3) || 3;
  const skipped = (p: Phase) => status?.[p]?.status === "skipped";
  const endCheck = (p: Phase) => {
    const s = status?.[p];
    add(
      p,
      `${p}.check`,
      `phase_check end passes for ${p}`,
      phaseDone(status, p),
      `phase_check(phase: "${p}", step: "end")`,
      s?.status === "partial" ? `last run: partial, ${s.errors?.length ?? 0} errors; fix them and run it again` : undefined,
    );
  };
  const section = (p: Phase) =>
    add(
      p,
      `${p}.section`,
      `story section "## ${OWN_SECTION[p]}" written`,
      has(OWN_SECTION[p]),
      DRAFTED_SECTIONS.includes(p) ? `write_story_section(section: "${OWN_SECTION[p]}", draft: true)` : `write_story_section(section: "${OWN_SECTION[p]}", text: "...")`,
      undefined,
      DRAFTED_SECTIONS.includes(p) ? { auto: { tool: "write_story_section", args: { section: OWN_SECTION[p], draft: true } } } : {},
    );

  // start
  add("start", "start.scope", "the user's goal recorded", facts.scopeRecorded, 'set_project_scope(kind: "whole_adventure", scope: "<the user\'s words>")');
  add("start", "start.module", "story file has a ## Module section (title, level, party size)", has("Module"), 'write_story_section(section: "Module", text: "...")');

  // plot
  const outline = has("Plot") ? parsePlotOutline(sections.get("Plot") ?? "") : null;
  if (!skipped("plot")) {
    add("plot", "plot.section", "## Plot written (locations, connections, NPCs, quests)", has("Plot"), 'get_phase_prompt(phase: "plot"), then write_plot(spec: "{...}")');
    if (outline) {
      add("plot", "plot.locations", "the plot names its locations with resrefs", outline.locations.length > 0, 'write_plot(spec: "{...}")', "no #### locations under ### Locations");
    }
    endCheck("plot");
  }
  const locs = outline?.locations ?? [];
  const resrefOf = (name: string | undefined) => {
    if (!name) return undefined;
    const n = norm(name);
    return locs.find((l) => norm(l.name) === n || l.resref === name.toLowerCase())?.resref ?? locs.find((l) => n.includes(norm(l.name)))?.resref;
  };

  const targets = parseSectionTargets(sections, new Set(facts.areas.keys()));
  const fightAreas = new Set<string>(
    [
      ...(outline?.challengeLocations ?? []).map(resrefOf),
      ...locs.filter((l) => /boss|combat|dungeon/.test(l.purpose ?? "")).map((l) => l.resref),
      // A place whose events are a fight (combat, ambush, boss) needs enemies even when the Challenges list forgets it
      // (Millers Daughter: the forest ambush and the attack on the village gate got none).
      ...locs.filter((l) => /\b(combat|ambush|boss)\b/.test(l.events ?? "")).map((l) => l.resref),
      ...targets.fights.keys(),
    ].filter((r): r is string => !!r),
  );

  // areas
  if (!skipped("areas")) {
    for (const l of locs) {
      const a = facts.areas.get(l.resref);
      const ts = l.tileset ?? a?.tileset ?? "<tileset>";
      const links = (outline?.connections ?? []).filter(([x, y]) => resrefOf(x) === l.resref || resrefOf(y) === l.resref).length;
      const specObj = { resref: l.resref, name: l.name, tileset: ts, connections: Math.max(1, links) };
      const build = `build_area(spec: ${specArg(specObj)})`;
      // A tileset with a recipe needs nothing more from the model: the driver runs the call itself.
      const auto = AREA_RECIPES[ts] ? { tool: "build_area", args: { spec: JSON.stringify(specObj) } } : undefined;
      const about = { areas: [l.resref], subject: l.name, auto };
      add("areas", `areas.${l.resref}.create`, `${l.name}: area ${l.resref} created`, !!a, build, undefined, about);
      add("areas", `areas.${l.resref}.tiles`, `${l.name}: terrain laid out`, !!a && a.distinctTiles > 1,
        a ? `${build} (lays out the existing empty area)` : build,
        a ? "every tile is the same: no layout applied yet" : undefined, about);
    }
    for (const [x, y] of outline?.connections ?? []) {
      const ra = resrefOf(x);
      const rb = resrefOf(y);
      if (!ra || !rb) continue;
      const linked = (facts.graph[ra] ?? []).includes(rb) || (facts.graph[rb] ?? []).includes(ra);
      add("areas", `areas.link.${ra}.${rb}`, `${x} <-> ${y} connected`, linked,
        `adventure_create_transition(areaA: "${ra}", areaB: "${rb}") (uses the free transition points build_area left; give aX/aY/bX/bY to choose)`,
        undefined, { areas: [ra, rb], auto: { tool: "adventure_create_transition", args: { areaA: ra, areaB: rb } } });
    }
    if (locs.length) {
      const first = locs[0].resref;
      const okStart = facts.entryArea !== "" && facts.entryArea !== "_start" && facts.areas.has(facts.entryArea) && !facts.areas.has("_start");
      add("areas", "areas.start", "module start set in a story area (the empty _start area removed)", okStart, `set_module_start(area: "${first}") (picks a spot)`, undefined,
        { areas: [first], auto: { tool: "set_module_start", args: { area: first } } });
    }
    section("areas");
    endCheck("areas");
  }

  // environment
  if (!skipped("environment")) {
    for (const l of locs) {
      const a = facts.areas.get(l.resref);
      if (!a) continue;
      const about = { areas: [l.resref], subject: l.name };
      const dressAuto = { auto: { tool: "dress_area", args: { area: l.resref } } };
      add("environment", `environment.${l.resref}.props`, `${l.name}: dressed with props (at least 5)`, a.props >= 5,
        `dress_area(area: "${l.resref}") places props that suit the area on open ground (or give props: real resrefs from list_blueprints)`, `${a.props} placed`, { ...about, ...(a.props < 5 ? dressAuto : {}) });
      add("environment", `environment.${l.resref}.pins`, `${l.name}: map pins at doors, shops and key places`, a.mapPins > 0,
        `dress_area(area: "${l.resref}") pins every exit; for a shop or quest giver standing here: place_waypoint(area: "${l.resref}", ..., mapNote: "<its name>")`, undefined, { ...about, auto: { tool: "dress_area", args: { area: l.resref, props: "[]" } } });
      if (fightAreas.has(l.resref) && a.containers) {
        add("environment", `environment.${l.resref}.container`, `${l.name}: a container (chest, crate, barrel) for loot`, a.containers.length > 0,
          `dress_area(area: "${l.resref}", props: "[\\"plc_chest1\\"]", pins: "none")`, undefined,
          { ...about, auto: { tool: "dress_area", args: { area: l.resref, props: JSON.stringify(["plc_chest1"]), pins: "none" } } });
      }
      for (const tag of targets.containers.get(l.resref) ?? []) {
        const there = (a.containers ?? []).some((c) => tagKey(c.tag) === tag);
        if (a.containers) add("environment", `environment.${l.resref}.c.${tag}`, `${l.name}: container ${tag} (named in ## Environment) is placed`, there,
          `place_placeable(area: "${l.resref}", ...) with tag ${tag}, or correct the Environment section`, undefined, about);
      }
    }
    section("environment");
    endCheck("environment");
  }

  // actors
  if (!skipped("actors")) {
    for (const n of outline?.npcs ?? []) {
      const where = resrefOf(n.location);
      const tag = npcResref(n.name);
      const placedIn = [...facts.areas].filter(([, a]) => a.creatures.some((c) => c.tag?.toLowerCase() === tag || nameMatches(n.name, c.name))).map(([r]) => r);
      // Everything build_key_npc needs is in the plot: the driver builds the person itself, with the plot's name (a model
      // renamed "Mill Owner" to "Miller", built him three times and left the last one hostile; 2026-11-19).
      // A companion is a henchman the party recruits (build_companion), everyone else a key NPC (Millers Daughter:
      // the militia meant as henchmen were built as plain NPCs).
      const companion = /companion|henchm/.test(n.role ?? "");
      const tool = companion ? "build_companion" : "build_key_npc";
      const args = where ? (companion ? companionArgs(n, tag, where, targetLevel) : keyNpcArgs(n, tag, where, targetLevel)) : undefined;
      const shown = args ? Object.fromEntries(Object.entries(args).filter(([k]) => k !== "introduction" && k !== "backstory")) : undefined;
      add("actors", `actors.${norm(n.name).replace(/ /g, "_")}`, `${n.name} placed${where ? ` in ${where}` : ""}`, placedIn.length > 0,
        shown ? `${tool}(${Object.entries(shown).map(([k, v]) => `${k}: "${v}"`).join(", ")}${companion ? ', introduction: "...", backstory: "..."' : ""})` : `${tool}(...) with place in "${where ?? "<area>"}"`,
        undefined, { areas: where ? [where] : [], subject: n.name, ...(args ? { auto: { tool, args } } : {}) });
    }
    section("actors");
    endCheck("actors");
  }

  // quests
  if (!skipped("quests")) {
    for (const q of outline?.quests ?? []) {
      const built = facts.journalQuests.some((j) => nameMatches(q.name, j));
      // The giver and the foe as the module has them (tags): a model invented "farmer_ned" nine times (2026-11-19).
      const spec = questSpec(q, outline?.npcs ?? [], facts, targetLevel);
      add("quests", `quests.${norm(q.name).replace(/ /g, "_")}`, `quest "${q.name}" built (journal + dialog)`, built,
        spec ? `build_quest(spec: ${specArg(spec)})` : `build_quest(spec: "{...}") with the giver's tag from get_area_card`, undefined,
        { subject: q.name, ...(spec ? { auto: { tool: "build_quest", args: { spec: JSON.stringify(spec) } } } : {}) });
    }
    section("quests");
    endCheck("quests");
  }

  // challenges: every fight area has enemies; each boss and trap the section names is in that area
  if (!skipped("challenges")) {
    for (const r of fightAreas) {
      const a = facts.areas.get(r);
      const name = locs.find((l) => l.resref === r)?.name ?? r;
      const hostile = !!a && (a.encounters > 0 || a.creatures.some((c) => c.hostile));
      // The plot's line for the place names the enemies ("2 bandits"): the driver places them itself.
      const line = outline?.challengeLines?.[name] ?? "";
      const beat = locs.find((l) => l.resref === r)?.beat ?? "";
      const group = challengeGroups(line)[0] ?? challengeGroups(beat)[0] ?? { kind: defaultEnemyKind(a?.tileset ?? "") };
      const enemyArgs = { area: r, kind: group.kind, ...(group.count ? { count: String(group.count) } : {}) };
      const about = { areas: [r], subject: name, auto: { tool: "build_enemy_group", args: enemyArgs } };
      add("challenges", `challenges.${r}`, `${name}: enemies placed`, hostile,
        `build_enemy_group(area: "${r}", kind: "${group.kind}"${group.count ? `, count: "${group.count}"` : ""})${line ? ` (the plot: ${line})` : ""}`, undefined, about);
      // A trap or obstacle the plot names here ("a pit trap"): the driver places one.
      if (/trap/i.test(line) && a?.triggerTags) {
        const kind = /acid/i.test(line) ? "acid" : /spike|pit|dart|blade/i.test(line) ? "spikes" : /lightning|electric|shock/i.test(line) ? "electric" : /cold|frost|ice/i.test(line) ? "cold" : "fire";
        add("challenges", `challenges.${r}.plottrap`, `${name}: the trap the plot names is placed`, a.triggerTags.some((x) => x.toLowerCase().startsWith("trap")),
          `build_trap(area: "${r}", kind: "${kind}")`, undefined, { areas: [r], subject: name, auto: { tool: "build_trap", args: { area: r, kind } } });
      }
      const t = targets.fights.get(r);
      for (const b of t?.bosses ?? []) {
        const placed = !!a && a.creatures.some((c) => c.hostile && ((b.resref && (c.resref === b.resref || c.tag?.toLowerCase() === b.resref)) || nameMatches(b.name, c.name)));
        add("challenges", `challenges.${r}.boss.${norm(b.name).replace(/ /g, "_")}`, `${name}: boss ${b.name} placed (hostile)`, placed,
          `build_key_npc(..., area: "${r}", faction: "hostile") or compose_encounter(..., area: "${r}")`, undefined, { areas: [r], subject: b.name });
      }
      for (const tag of t?.traps ?? []) {
        if (!a?.triggerTags) continue;
        add("challenges", `challenges.${r}.trap.${tag}`, `${name}: trap ${tag} placed`, a.triggerTags.some((x) => x.toLowerCase() === tag),
          `place_trigger(area: "${r}", blueprint: "${tag}", ...), then add_skill_check(area: "${r}", tag: "${tag}", kind: "trigger", ...)`, undefined, about);
      }
    }
    section("challenges");
    endCheck("challenges");
  }

  // affordances
  if (!skipped("affordances")) {
    if (outline?.merchant) {
      const stores = [...facts.areas.values()].reduce((s, a) => s + a.stores, 0);
      // The merchant the plot names, by the tag it stands with: build_store does the five calls of the recipe.
      const merchantName = (outline.npcs ?? []).find((n) => /merchant/.test(n.role ?? ""))?.name;
      const merchant = merchantName ? [...facts.areas.values()].flatMap((x) => x.creatures).find((c) => !c.hostile && (c.tag?.toLowerCase() === npcResref(merchantName) || nameMatches(merchantName, c.name))) : undefined;
      add("affordances", "affordances.store", "the merchant's store placed", stores > 0,
        merchant?.tag ? `build_store(merchant: "${merchant.tag.toLowerCase()}")` : "build_store(merchant: \"<the merchant's tag>\")", undefined,
        merchant?.tag ? { auto: { tool: "build_store", args: { merchant: merchant.tag.toLowerCase() } } } : {});
    }
    for (const [r, tag] of targets.stores) {
      const a = facts.areas.get(r);
      if (a?.storeTags) add("affordances", `affordances.store.${tag}`, `store ${tag} (named in ## Affordances) is in ${r}`, a.storeTags.some((x) => x.toLowerCase() === tag), `place_store(area: "${r}", blueprint: "${tag}", ...)`, undefined, { areas: [r] });
    }
    for (const l of locs) {
      const a = facts.areas.get(l.resref);
      if (!a?.containers?.length || /boss/.test(l.purpose ?? "")) continue; // the boss room's chest is the rewards phase's
      add("affordances", `affordances.${l.resref}.loot`, `${l.name}: loot in at least one container`, a.containers.some((c) => c.items > 0),
        `add_items_to_container(area: "${l.resref}", containerTag: "${a.containers[0].tag}", items: "[...]")`, undefined,
        { areas: [l.resref], subject: l.name, auto: { tool: "add_items_to_container", args: { area: l.resref, containerTag: a.containers[0].tag, items: JSON.stringify(starterLoot(targetLevel)) } } });
    }
    for (const [r, tag] of targets.loot) {
      const c = facts.areas.get(r)?.containers?.find((x) => tagKey(x.tag) === tag);
      if (facts.areas.get(r)?.containers) add("affordances", `affordances.${r}.c.${tag}`, `container ${tag} in ${r} holds the loot ## Affordances names`, !!c && c.items > 0,
        `add_items_to_container(area: "${r}", containerTag: "${tag}", items: "[...]")`, undefined, { areas: [r] });
    }
    if (facts.startingGold !== undefined) {
      const level = /\*\*(?:Target )?Level:\*\*\s*(\d+)/i.exec(sections.get("Module") ?? "")?.[1] ?? "<level>";
      add("affordances", "affordances.gold", `players start at level ${level} with the gold for it`, facts.startingGold, `set_starting_gold(level: "${level}")`, undefined,
        level !== "<level>" ? { auto: { tool: "set_starting_gold", args: { level } } } : {});
    }
    section("affordances");
    endCheck("affordances");
  }

  // polish and rewards
  if (!skipped("polish")) {
    section("polish");
    add("polish", "polish.verify", "verify_all: shippable, no errors", phaseDone(status, "polish"), "verify_all(), fix each error, then phase_check(phase: \"polish\", step: \"end\")");
  }
  if (!skipped("rewards")) {
    // The final reward in the boss's area: gold the plot names goes in by the driver; an item is the model's to choose.
    const economy = (sections.get("Plot") ?? "").match(/Final reward:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
    const goldAmount = Number(/(\d[\d,]*)\s*(gold|gp)\b/i.exec(economy)?.[1]?.replace(/,/g, "") ?? 0);
    const bossLoc = locs.find((l) => /boss/.test(l.purpose ?? "")) ?? locs.find((l) => norm(l.name) === norm((outline?.npcs ?? []).find((n) => n.role === "antagonist")?.location ?? "")) ?? locs[locs.length - 1];
    const bossArea = bossLoc ? facts.areas.get(bossLoc.resref) : undefined;
    if (bossLoc && bossArea?.containers && economy) {
      const box = bossArea.containers[0];
      const done = goldAmount > 0 ? bossArea.containers.some((c) => (c.gold ?? 0) >= goldAmount) : bossArea.containers.some((c) => (c.resrefs ?? []).some((r) => r.startsWith("rw_")));
      const auto = goldAmount > 0
        ? box
          ? { tool: "add_items_to_container", args: { area: bossLoc.resref, containerTag: box.tag, items: JSON.stringify([{ resref: "nw_it_gold001", quantity: goldAmount }]) } }
          : { tool: "dress_area", args: { area: bossLoc.resref, props: JSON.stringify(["plc_chest1"]), pins: "none" } }
        : undefined;
      add("rewards", "rewards.final", `the final reward (${economy}) in ${bossLoc.name}`, done,
        goldAmount > 0 ? `add_items_to_container(area: "${bossLoc.resref}", containerTag: "${box?.tag ?? "<chest>"}", items: "[{\\"resref\\":\\"nw_it_gold001\\",\\"quantity\\":${goldAmount}}]")`
          : `list_treasure_samples(...), import_treasure_item(sample: "<id>", resref: "rw_final", name: "<a name from the story>"), then add_items_to_container(area: "${bossLoc.resref}", containerTag: "${box?.tag ?? "<chest>"}", items: "[{\\"resref\\":\\"rw_final\\"}]")`,
        undefined, { areas: [bossLoc.resref], ...(auto ? { auto } : {}) });
    }
    const descr = moduleDescription(sections.get("Module") ?? "", outline);
    add("rewards", "rewards.description", "the module description players read is set", facts.descriptionSet === true, `set_module_description(description: "${descr.replace(/"/g, "'")}")`, undefined,
      facts.descriptionSet === undefined ? {} : { auto: { tool: "set_module_description", args: { description: descr } } });
    // The DM guide is drafted from the story, the DM area built from the template: both by the driver.
    add("rewards", "rewards.dmguide", "DM guide written", facts.dmGuideWritten, "write_dm_guide(draft: true) (drafted from the story; text adds notes)", undefined,
      { auto: { tool: "write_dm_guide", args: { draft: true } } });
    add("rewards", "rewards.dmarea", "DM area with the story and DM-guide books", facts.areas.has(facts.dmAreaResref), "create_dm_area()", undefined,
      { auto: { tool: "create_dm_area", args: {} } });
    section("rewards");
    endCheck("rewards");
  }
  add("ship", "ship.offer", "offer to build the .mod (build only when the user says yes)", false, "ask the user; on yes: repack_module()");
  return { items, outline };
}

/** The first step not done, with a hint to read the phase's instructions when it begins a new phase. */
export function nextStep(items: ProgressItem[]): (ProgressItem & { firstOfPhase: boolean; readFirst?: string }) | null {
  const i = items.findIndex((it) => !it.done);
  if (i < 0) return null;
  const it = items[i];
  const firstOfPhase = !items.some((x) => x.phase === it.phase && x.done);
  const readFirst = firstOfPhase && (PHASES as readonly string[]).includes(it.phase) ? `get_phase_prompt(phase: "${it.phase}")` : undefined;
  return { ...it, firstOfPhase, ...(readFirst ? { readFirst } : {}) };
}

/** The checklist as the form saved in the module's folder. Lines under "## Notes" in `previous` are kept. */
export function renderProgress(title: string, items: ProgressItem[], previous: string | null, note?: string): string {
  const notes = previous ? (parseSections(previous).get("Notes") ?? "").trim() : "";
  const allNotes = [notes, note ? `- ${new Date().toISOString().slice(0, 16).replace("T", " ")} ${note.trim()}` : ""].filter(Boolean).join("\n");
  const done = items.filter((i) => i.done).length;
  const next = nextStep(items);
  const md: string[] = [
    `# Build progress: ${title}`,
    "",
    "Written by get_progress from the module's real state; ticks are not typed by hand. Run get_progress again after any step.",
    "",
    `**${done} of ${items.length} steps done.** Next: ${next ? `${next.label} — \`${next.call ?? ""}\`` : "nothing left"}`,
    "",
  ];
  let phase: ProgressPhase | null = null;
  for (const it of items) {
    if (it.phase !== phase) {
      phase = it.phase;
      md.push("", `## ${phase[0].toUpperCase()}${phase.slice(1)}`, "");
    }
    md.push(`- [${it.done ? "x" : " "}] ${it.label}${it.done ? "" : ` — \`${it.call ?? ""}\``}${it.detail ? ` (${it.detail})` : ""}`);
  }
  md.push("", "## Notes", "", allNotes || "(decisions and open questions; get_progress(note: \"...\") adds a line)", "");
  return md.join("\n");
}
