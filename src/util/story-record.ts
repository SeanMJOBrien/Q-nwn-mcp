/**
 * The story record in adventure.md must say who, why and where (TODO #45-#47, docs/story-vs-pipeline.md findings 1, 2, 7, 8):
 * no `(not recorded)` field left in the Module or Plot sections, a story graph once the adventure has a few places, a motive
 * for every key NPC and the antagonists, and a beat for every location (its Role in Story, or a graph beat in that area).
 * Pure: phase_check, verify_story and audit_module call it on the story file's text.
 */

import { parseSections } from "./phase-check.js";
import type { StoryFinding, StoryGraph } from "./story-graph.js";

/** A story graph is required from this many locations on; below it a short linear adventure may do without one. */
export const GRAPH_REQUIRED_LOCATIONS = 3;

export interface RecordLocation {
  name: string;
  resref: string;
  role: string;
}
export interface RecordNpc {
  name: string;
  location: string;
  role: string;
  motivation: string;
}
export interface PlotRecord {
  locations: RecordLocation[];
  npcs: RecordNpc[];
  /** The Antagonists block's Motivation; undefined when the section has no Motivation line. */
  antagonistMotivation?: string;
  /** True when the plot has an Antagonists block with content. */
  hasAntagonists: boolean;
}

/** Empty, `(not recorded)`, a template placeholder `[...]`, or a word that says nothing. */
export function isPlaceholder(value: string | undefined): boolean {
  const v = (value ?? "").trim();
  return (
    v === "" || /\(not recorded\)/i.test(v) || /^\[.*\]$/.test(v) || /^(tbd|todo|none|n\/a|unknown|-+|\?+)\.?$/i.test(v)
  );
}

/** `### Name` blocks of a section (`####` headings inside it), each with its `- **Field:** value` lines. */
function blocks(section: string, sub: string): Array<{ heading: string; fields: Map<string, string> }> {
  const m = new RegExp(`^###\\s+${sub}\\s*$`, "im").exec(section);
  if (!m) return [];
  const rest = section.slice(m.index + m[0].length);
  const end = /^###\s+/m.exec(rest);
  const body = end ? rest.slice(0, end.index) : rest;
  const out: Array<{ heading: string; fields: Map<string, string> }> = [];
  let cur: { heading: string; fields: Map<string, string> } | null = null;
  for (const line of body.split("\n")) {
    const h = /^####\s+(.*?)\s*$/.exec(line);
    if (h) {
      cur = { heading: h[1].replace(/^\d+\.\s*/, "").trim(), fields: new Map() };
      out.push(cur);
      continue;
    }
    const f = /^\s*[-*]\s+\*\*(.+?):\*\*\s*(.*)$/.exec(line);
    if (f && cur) cur.fields.set(f[1].trim().toLowerCase(), f[2].trim());
  }
  return out;
}

/** The fields of a `### Sub` block that has no `####` headings (the Antagonists list). */
function flatFields(section: string, sub: string): Map<string, string> | undefined {
  const m = new RegExp(`^###\\s+${sub}\\s*$`, "im").exec(section);
  if (!m) return undefined;
  const rest = section.slice(m.index + m[0].length);
  const end = /^###\s+/m.exec(rest);
  const body = end ? rest.slice(0, end.index) : rest;
  const fields = new Map<string, string>();
  for (const line of body.split("\n")) {
    const f = /^\s*[-*]\s+\*\*(.+?):\*\*\s*(.*)$/.exec(line);
    if (f) fields.set(f[1].trim().toLowerCase(), f[2].trim());
  }
  return body.trim() ? fields : undefined;
}

export function parsePlotRecord(markdown: string): PlotRecord {
  const plot = parseSections(markdown).get("Plot") ?? "";
  const locations = blocks(plot, "Locations").map((b) => ({
    name: b.heading,
    resref: (b.fields.get("resref") ?? "").replace(/`/g, "").toLowerCase(),
    role: b.fields.get("role in story") ?? "",
  }));
  const npcs = blocks(plot, "Key NPCs").map((b) => ({
    name: b.heading,
    location: b.fields.get("location") ?? "",
    role: b.fields.get("role") ?? "",
    motivation: b.fields.get("motivation") ?? b.fields.get("motive") ?? "",
  }));
  const antagonists = flatFields(plot, "Antagonists");
  const named = blocks(plot, "Antagonists");
  // Antagonists written as `#### Name` blocks count as people with a motive each.
  for (const b of named)
    npcs.push({
      name: b.heading,
      location: b.fields.get("lair/territory") ?? "",
      role: "antagonist",
      motivation: b.fields.get("motivation") ?? b.fields.get("motive") ?? "",
    });
  return {
    locations,
    npcs,
    antagonistMotivation: named.length ? undefined : (antagonists?.get("motivation") ?? antagonists?.get("motive")),
    hasAntagonists: !!antagonists && antagonists.size > 0 && !named.length,
  };
}

/** `(not recorded)` fields in the Module and Plot sections, with the heading each sits under. */
function notRecordedInPlot(markdown: string): string[] {
  const out: string[] = [];
  let section = "";
  let where = "";
  for (const line of markdown.split("\n")) {
    const s = /^##\s+(.+?)\s*$/.exec(line);
    if (s) {
      section = s[1];
      where = section;
      continue;
    }
    const h = /^#{3,4}\s+(.*)$/.exec(line);
    if (h) {
      where = h[1]
        .replace(/^\d+\.\s*/, "")
        .replace(/`/g, "")
        .trim();
      continue;
    }
    if ((section !== "Module" && section !== "Plot") || !line.includes("(not recorded)")) continue;
    const label = /^[-*]\s+\*\*(.+?):\*\*/.exec(line);
    out.push(`${where}: ${label ? label[1] : "text"}`);
  }
  return out;
}

export interface RecordOptions {
  /** Skip the `(not recorded)` check (an adopted module under review, where those fields are the user's to fill). */
  allowNotRecorded?: boolean;
}

/**
 * Findings for the story record: `story_not_recorded`, `story_graph_required`, `npc_no_motive`, `antagonist_no_motive`,
 * `area_no_beat`. All are errors: phase_check(plot, end) blocks on them; audit_module lists them.
 */
export function storyRecordFindings(markdown: string, graph: StoryGraph, options: RecordOptions = {}): StoryFinding[] {
  const out: StoryFinding[] = [];
  const err = (code: string, message: string) => out.push({ level: "error", code, message });
  const record = parsePlotRecord(markdown);

  if (!options.allowNotRecorded) {
    const missing = notRecordedInPlot(markdown);
    if (missing.length)
      err(
        "story_not_recorded",
        `${missing.length} story field(s) still (not recorded): ${missing.slice(0, 12).join("; ")}${missing.length > 12 ? " …" : ""}. Ask the user and record their words.`,
      );
  }

  if (record.locations.length >= GRAPH_REQUIRED_LOCATIONS && graph.beats.length === 0) {
    err(
      "story_graph_required",
      `${record.locations.length} locations and no story graph: add ### Story Graph to ## Plot with one \`- beat B1 | title: … | act: setup | area: <resref> | leads: B2\` line per beat and a \`- thread T1 | title: … | planted: B1 | paid: B5\` line per motive or mystery.`,
    );
  }

  for (const n of record.npcs) {
    if (isPlaceholder(n.motivation))
      err(
        "npc_no_motive",
        `${n.name}${isPlaceholder(n.role) ? "" : ` (${n.role})`} has no Motivation: what do they want? Record it before the actors phase.`,
      );
  }
  if (record.hasAntagonists && isPlaceholder(record.antagonistMotivation)) {
    err(
      "antagonist_no_motive",
      'The Antagonists have no Motivation: why do they oppose the party? Make it more than "evil".',
    );
  }

  const beatAreas = new Set(graph.beats.map((b) => b.area).filter(Boolean));
  for (const l of record.locations) {
    if (isPlaceholder(l.role) && !(l.resref && beatAreas.has(l.resref))) {
      err(
        "area_no_beat",
        `${l.name}${l.resref ? ` (${l.resref})` : ""} serves no story beat: fill its Role in Story, or give it a beat in the story graph (area: ${l.resref || "<resref>"}).`,
      );
    }
  }
  return out;
}

/** The record codes that must be in place before the actors phase builds the people. */
export const ACTOR_PREREQUISITES = new Set(["npc_no_motive", "antagonist_no_motive"]);

const STOP = new Set(
  "about above after again against because before being below between could doing during every from further having himself herself itself their there these those through under until where which while whose would should".split(
    " ",
  ),
);

/** Content words of a motive (5+ letters, not common words), as 5-letter stems for a loose match. */
export function motiveStems(motivation: string): string[] {
  const words = motivation.toLowerCase().match(/[a-z']{5,}/g) ?? [];
  return [...new Set(words.filter((w) => !STOP.has(w)).map((w) => w.slice(0, 5)))];
}

/** True when some line of the NPC's dialog carries a word of the motive (TODO #46: the actor dialog carries a line of it). */
export function dialogCarriesMotive(motivation: string, dialogTexts: string[]): boolean {
  const stems = motiveStems(motivation);
  if (stems.length === 0) return true;
  const text = dialogTexts.join(" ").toLowerCase();
  const words = new Set((text.match(/[a-z']{5,}/g) ?? []).map((w) => w.slice(0, 5)));
  return stems.some((s) => words.has(s));
}
