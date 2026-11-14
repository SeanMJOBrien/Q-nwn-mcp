/**
 * Plot spec: the adventure's plot as one JSON object, so a person or a larger model writes phase 1 once and the
 * later phases (a small local model, or the tools alone) build from it.
 *
 * `PlotSpec` becomes `docs/specs/plot.schema.json` (`npm run specs:schema`). `plotSemanticErrors` holds the rules a
 * schema cannot state, `renderPlot` writes the `## Plot` section in the format of docs/phase-prompts/plot.md (plus a
 * story graph for verify_story), and `moduleFields` gives the `## Module` lines. Pure: no file or module access.
 */

import { type Act, type EncounterKind, planAdventureShape } from "./adventure-shape.js";

export type PlotRace = "dwarf" | "elf" | "gnome" | "halfling" | "half-elf" | "half-orc" | "human";
export type PlotClass = "barbarian" | "bard" | "cleric" | "druid" | "fighter" | "monk" | "paladin" | "ranger" | "rogue" | "sorcerer" | "wizard";

export interface PlotLocation {
  /**
   * Name of the place as players see it. Other parts of the spec refer to the location by this name.
   * @minLength 1
   */
  name: string;
  /**
   * Area resref to build it as: lower-case letters, digits and underscore, at most 16 characters. Default: made from the name.
   * @pattern ^[a-z0-9_]{1,16}$
   */
  resref?: string;
  /**
   * Tileset resref, e.g. ttf01 forest, ttr01 rural, tcn01 city, tin01 house or inn, tde01 dungeon, tdc01 crypt, tdm01 mine or cave.
   * @pattern ^[a-z]{3}[0-9]{2}$
   */
  tileset: string;
  /** hub: where the party gets its task; travel: a road or wilderness to cross; adventure: where things happen; boss: the final fight. */
  purpose: "hub" | "travel" | "adventure" | "boss";
  /**
   * What happens here, in order. Two to four per location is typical.
   * @minItems 1
   */
  events: EncounterKind[];
  /**
   * One sentence: what happens here.
   * @minLength 1
   */
  beat: string;
}

export interface PlotNpc {
  /** @minLength 1 */
  name: string;
  /** Name of the location this person stands in. */
  location: string;
  role: "quest giver" | "merchant" | "companion" | "witness";
  race: PlotRace;
  /** Class; a companion levels in it. Use "fighter" for an ordinary townsperson who never fights. */
  class: PlotClass;
  gender: "male" | "female";
  /**
   * One sentence: what this person wants.
   * @minLength 1
   */
  motive: string;
  /**
   * One sentence: how this person talks.
   * @minLength 1
   */
  voice: string;
}

export interface PlotAntagonist {
  /** @minLength 1 */
  name: string;
  /**
   * Who or what they are, e.g. "a hobgoblin warlord" or "a corrupt harbour master".
   * @minLength 1
   */
  who: string;
  /** Name of the location where the party meets them. */
  location: string;
  /** @minLength 1 */
  motive: string;
  /**
   * How the party stops them.
   * @minLength 1
   */
  defeat: string;
}

export interface PlotQuest {
  /** @minLength 1 */
  name: string;
  /** true for the main quest. Exactly one quest is the main quest; with none marked, the first is. */
  primary?: boolean;
  /** Name of the NPC who gives the quest. */
  giver: string;
  /**
   * The stages in order, one sentence each. The first is the task as given, the last is how it ends and who is told.
   * @minItems 2
   */
  stages: string[];
}

export interface PlotChallenge {
  /** Name of the location. */
  location: string;
  /**
   * Enemy kind and number, e.g. "4 goblins and a goblin shaman".
   * @minLength 1
   */
  enemies: string;
  /** A trap or obstacle here, e.g. "a pit trap in the corridor". */
  obstacle?: string;
}

/** The plot of a short adventure (maps to `write_plot`). */
export interface PlotSpec {
  /**
   * Title of the adventure.
   * @minLength 1
   */
  title: string;
  /**
   * Two or three sentences: what is wrong, who is behind it, what the party must do.
   * @minLength 1
   */
  premise: string;
  /**
   * Character level the adventure is written for.
   * @minimum 1
   * @maximum 20
   * @asType integer
   */
  level: number;
  /**
   * Target play time in minutes.
   * @minimum 20
   * @maximum 600
   * @asType integer
   */
  playMinutes: number;
  /**
   * Number of characters in the party, companions included. Default 4.
   * @minimum 1
   * @maximum 6
   * @asType integer
   */
  partySize?: number;
  /** A word or two: heroic, grim, mystery, comic. */
  tone?: string;
  /**
   * The places, in the order the story visits them. The first is where players start.
   * @minItems 1
   * @maxItems 12
   */
  locations: PlotLocation[];
  /** Pairs of location names the party can walk between. Every location must be reachable from the first. */
  connections?: Array<[string, string]>;
  /** The people the party talks to. */
  npcs: PlotNpc[];
  /** @minItems 1 */
  antagonists: PlotAntagonist[];
  /** @minItems 1 */
  quests: PlotQuest[];
  challenges?: PlotChallenge[];
  /** Name of the NPC who trades, when there is one. */
  merchant?: string;
  /**
   * The reward at the end: an item or gold.
   * @minLength 1
   */
  finalReward: string;
}

export interface PlotError {
  field: string;
  message: string;
}

/** Area resref for a location: the given one, or the name in lower case with other characters dropped, at most 16 long. */
export function locationResref(loc: Pick<PlotLocation, "name" | "resref">): string {
  if (loc.resref) return loc.resref;
  const slug = loc.name
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 16);
  return slug || "area";
}

const key = (name: string) => name.trim().toLowerCase();

/** Rules a schema cannot state. Call after the schema check has passed. */
export function plotSemanticErrors(spec: PlotSpec): PlotError[] {
  const errors: PlotError[] = [];
  const locations = new Map<string, number>();
  const resrefs = new Map<string, number>();
  spec.locations.forEach((l, i) => {
    if (locations.has(key(l.name))) errors.push({ field: `locations[${i}].name`, message: `"${l.name}" is used twice; every location needs its own name` });
    else locations.set(key(l.name), i);
    const resref = locationResref(l);
    if (resrefs.has(resref)) {
      errors.push({ field: `locations[${i}].resref`, message: `the area resref "${resref}" is also that of locations[${resrefs.get(resref)}]; give this location its own resref` });
    } else resrefs.set(resref, i);
  });
  const names = spec.locations.map((l) => l.name).join(", ");
  const needLocation = (value: string, field: string) => {
    if (!locations.has(key(value))) errors.push({ field, message: `"${value}" is not a location. Locations: ${names}` });
  };

  const linked = new Map<number, Set<number>>();
  (spec.connections ?? []).forEach(([a, b], i) => {
    needLocation(a, `connections[${i}][0]`);
    needLocation(b, `connections[${i}][1]`);
    const ia = locations.get(key(a));
    const ib = locations.get(key(b));
    if (ia === undefined || ib === undefined) return;
    if (ia === ib) {
      errors.push({ field: `connections[${i}]`, message: "connects a location to itself" });
      return;
    }
    linked.set(ia, (linked.get(ia) ?? new Set()).add(ib));
    linked.set(ib, (linked.get(ib) ?? new Set()).add(ia));
  });
  const reach = new Set([0]);
  const queue = [0];
  while (queue.length) {
    for (const n of linked.get(queue.shift() as number) ?? []) {
      if (reach.has(n)) continue;
      reach.add(n);
      queue.push(n);
    }
  }
  spec.locations.forEach((l, i) => {
    if (!reach.has(i)) errors.push({ field: "connections", message: `"${l.name}" cannot be reached from "${spec.locations[0].name}"; add a connection to it` });
  });

  const npcs = new Set<string>();
  spec.npcs.forEach((n, i) => {
    if (npcs.has(key(n.name))) errors.push({ field: `npcs[${i}].name`, message: `"${n.name}" is used twice` });
    npcs.add(key(n.name));
    needLocation(n.location, `npcs[${i}].location`);
  });
  const npcNames = spec.npcs.map((n) => n.name).join(", ") || "(none)";
  spec.antagonists.forEach((a, i) => {
    needLocation(a.location, `antagonists[${i}].location`);
  });
  (spec.challenges ?? []).forEach((c, i) => {
    needLocation(c.location, `challenges[${i}].location`);
  });
  spec.quests.forEach((q, i) => {
    if (!npcs.has(key(q.giver))) errors.push({ field: `quests[${i}].giver`, message: `"${q.giver}" is not one of the npcs. NPCs: ${npcNames}` });
  });
  spec.quests.forEach((q, i) => {
    if (q.primary && spec.quests.findIndex((x) => x.primary) !== i) errors.push({ field: `quests[${i}].primary`, message: "only one quest is the main quest" });
  });
  if (spec.merchant !== undefined && !npcs.has(key(spec.merchant))) errors.push({ field: "merchant", message: `"${spec.merchant}" is not one of the npcs. NPCs: ${npcNames}` });
  return errors;
}

/** Advice, not faults: how the plot compares with what plan_adventure_shape suggests for the play time. */
export function plotWarnings(spec: PlotSpec): string[] {
  const out: string[] = [];
  const plan = planAdventureShape({ playMinutes: spec.playMinutes, partySize: spec.partySize });
  const events = spec.locations.reduce((n, l) => n + l.events.length, 0);
  if (spec.locations.length > plan.areaCount + 1 || spec.locations.length < plan.areaCount - 1) {
    out.push(`${spec.locations.length} locations for ${spec.playMinutes} minutes; plan_adventure_shape suggests ${plan.areaCount}.`);
  }
  if (events > plan.totalEvents * 1.5 || events < plan.totalEvents * 0.5) {
    out.push(`${events} events for ${spec.playMinutes} minutes; plan_adventure_shape suggests about ${plan.totalEvents}.`);
  }
  if (!spec.locations.some((l) => l.events.includes("boss"))) out.push('No location has a "boss" event; the adventure has no final fight.');
  if (!spec.locations.some((l) => l.purpose === "hub")) out.push('No location has purpose "hub"; make sure the quest giver stands where players start.');
  const giver = spec.npcs.find((n) => key(n.name) === key((spec.quests.find((q) => q.primary) ?? spec.quests[0]).giver));
  if (giver && key(giver.location) !== key(spec.locations[0].name)) {
    out.push(`The main quest's giver, ${giver.name}, is in "${giver.location}", not in the starting location "${spec.locations[0].name}".`);
  }
  return out;
}

/** The `## Module` lines a plot spec fixes. `Idea` and `Difficulty` are only added when the section has none. */
export function moduleFields(spec: PlotSpec): Array<{ name: string; value: string; onlyIfAbsent?: boolean }> {
  return [
    { name: "Title", value: spec.title },
    { name: "Target Level", value: String(spec.level) },
    { name: "Party Size", value: String(spec.partySize ?? 4) },
    ...(spec.tone ? [{ name: "Tone", value: spec.tone }] : [{ name: "Tone", value: "adventurous", onlyIfAbsent: true }]),
    { name: "Difficulty", value: "standard", onlyIfAbsent: true },
    { name: "Estimated Duration", value: `${spec.playMinutes} minutes` },
    { name: "Idea", value: oneLine(spec.premise), onlyIfAbsent: true },
  ];
}

/** Sets `- **Name:** value` lines in a `## Module` body: replaces a line that exists, appends one that does not. */
export function setModuleFields(body: string, fields: Array<{ name: string; value: string; onlyIfAbsent?: boolean }>): string {
  const lines = body.split("\n");
  while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
  for (const f of fields) {
    const at = lines.findIndex((l) => new RegExp(`^[-*]\\s*\\*\\*${f.name}:\\*\\*`, "i").test(l));
    const line = `- **${f.name}:** ${f.value}`;
    if (at < 0) lines.push(line);
    else if (!f.onlyIfAbsent) lines[at] = line;
  }
  return lines.join("\n");
}

const oneLine = (text: string) => text.replace(/\s+/g, " ").trim();
/** `|` separates the fields of a story-graph line, so a title must not contain one. */
const graphTitle = (text: string) => oneLine(text).replace(/\|/g, "/");

function actFor(i: number, count: number): Act {
  if (count === 1 || i === count - 1) return "climax";
  const f = i / (count - 1);
  if (f < 0.25) return "setup";
  return f < 0.65 ? "complication" : "turn";
}

/** For each location, the later locations it opens: its connections further on in the story, and always a way forward. */
function leads(spec: PlotSpec): number[][] {
  const index = new Map(spec.locations.map((l, i) => [key(l.name), i]));
  const out: Array<Set<number>> = spec.locations.map(() => new Set<number>());
  for (const [a, b] of spec.connections ?? []) {
    const ia = index.get(key(a));
    const ib = index.get(key(b));
    if (ia === undefined || ib === undefined || ia === ib) continue;
    out[Math.min(ia, ib)].add(Math.max(ia, ib));
  }
  // A location nothing earlier opens is reached from the one before it in story order.
  for (let i = 1; i < spec.locations.length; i++) if (!out.slice(0, i).some((s) => s.has(i))) out[i - 1].add(i);
  return out.map((s) => [...s].sort((x, y) => x - y));
}

/** The `## Plot` section body. */
export function renderPlot(spec: PlotSpec): string {
  const md: string[] = [];
  md.push("### Premise", oneLine(spec.premise), "");

  md.push("### Locations");
  spec.locations.forEach((l, i) => {
    md.push(
      `#### ${i + 1}. ${l.name}`,
      `- **Resref:** ${locationResref(l)}`,
      `- **Tileset:** ${l.tileset}`,
      `- **Purpose:** ${l.purpose}`,
      `- **Events:** ${l.events.join(", ")}`,
      `- **Travel:** ${l.purpose === "travel" ? "yes" : "no"}`,
      `- **Beat:** ${oneLine(l.beat)}`,
      "",
    );
  });

  md.push("### Connections");
  if (spec.connections?.length) for (const [a, b] of spec.connections) md.push(`- ${a} <-> ${b}`);
  else md.push("- (none: a single location)");
  md.push("");

  md.push("### Key NPCs");
  for (const n of spec.npcs) {
    md.push(
      `#### ${n.name}`,
      `- **Location:** ${n.location}`,
      `- **Role:** ${n.role}`,
      `- **Race, class, gender:** ${n.race} ${n.class}, ${n.gender}`,
      `- **Motive:** ${oneLine(n.motive)}`,
      `- **Voice:** ${oneLine(n.voice)}`,
      "",
    );
  }
  if (!spec.npcs.length) md.push("- (none)", "");

  md.push("### Antagonists");
  for (const a of spec.antagonists) md.push(`- **${a.name}:** ${oneLine(a.who)}, in ${a.location}. Motive: ${oneLine(a.motive)} Stopped by: ${oneLine(a.defeat)}`);
  md.push("");

  md.push("### Quest Objectives");
  const primary = spec.quests.find((q) => q.primary) ?? spec.quests[0];
  for (const q of spec.quests) {
    md.push(`#### ${q === primary ? "Primary" : "Side"} Quest: ${q.name}`, `**Giver:** ${q.giver}`);
    q.stages.forEach((s, i) => {
      md.push(`**Stage ${i + 1}${i === q.stages.length - 1 ? " (Resolution)" : ""}:** ${oneLine(s)}`);
    });
    md.push("");
  }

  md.push("### Challenges");
  for (const c of spec.challenges ?? []) md.push(`- ${c.location}: ${oneLine(c.enemies)}${c.obstacle ? `, ${oneLine(c.obstacle)}` : ""}`);
  if (!spec.challenges?.length) md.push("- (none listed: take the enemies from each location's events)");
  md.push("");

  md.push("### Loot & Economy", `- Merchant: ${spec.merchant ?? "none"}. Final reward: ${oneLine(spec.finalReward)}`, "");

  md.push("### Story Graph");
  const opens = leads(spec);
  spec.locations.forEach((l, i) => {
    const next = opens[i].map((n) => `B${n + 1}`).join(", ");
    md.push(`- beat B${i + 1} | title: ${graphTitle(l.beat)} | act: ${actFor(i, spec.locations.length)} | area: ${locationResref(l)}${next ? ` | leads: ${next}` : ""}`);
  });
  return md.join("\n");
}
