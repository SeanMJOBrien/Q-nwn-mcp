/**
 * The story graph in adventure.md: the beats of the story, how they lead to each other, which clues each gives and needs, and which
 * long threads (a motive, a mystery, a promise) are planted and paid off. verifyStory checks the graph holds together before the
 * module is built around it. Pure and unit-tested; the verify_story tool reads adventure.md.
 *
 * Grammar (one per line under a `## Story` or `### Story Graph` heading; fields after the id are `key: value` split by `|`):
 *   - beat B1 | title: Arrival at Ashwick | act: setup | area: ashwick_vlg | leads: B2, B3 | gives: seal_forged | needs: ...
 *   - thread T1 | title: Venn's motive | planted: B1 | paid: B7
 * `leads` are the beats this one opens; `gives` are clue ids it hands the party; `needs` are clue ids required to open this beat.
 */

import { ACTS } from "./adventure-shape.js";

export interface Beat {
  id: string;
  title: string;
  act: string;
  area: string;
  leads: string[];
  gives: string[];
  needs: string[];
}
export interface Thread {
  id: string;
  title: string;
  planted: string;
  paid: string;
}
export interface StoryGraph {
  beats: Beat[];
  threads: Thread[];
}

const list = (v: string | undefined): string[] =>
  (v ?? "")
    .split(/[,\s]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function fields(rest: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of rest.split("|")) {
    const m = /^\s*([a-z]+)\s*:\s*(.*?)\s*$/i.exec(part);
    if (m) out[m[1].toLowerCase()] = m[2];
  }
  return out;
}

export function parseStoryGraph(markdown: string): StoryGraph {
  const beats: Beat[] = [];
  const threads: Thread[] = [];
  for (const line of markdown.split("\n")) {
    const b = /^\s*[-*]\s*beat\s+(\S+)\s*\|(.*)$/i.exec(line);
    if (b) {
      const f = fields(b[2]);
      beats.push({
        id: b[1],
        title: f.title ?? "",
        act: (f.act ?? "").toLowerCase(),
        area: (f.area ?? "").toLowerCase(),
        leads: list(f.leads),
        gives: list(f.gives),
        needs: list(f.needs),
      });
      continue;
    }
    const t = /^\s*[-*]\s*thread\s+(\S+)\s*\|(.*)$/i.exec(line);
    if (t) {
      const f = fields(t[2]);
      threads.push({ id: t[1], title: f.title ?? "", planted: f.planted ?? "", paid: f.paid ?? "" });
    }
  }
  return { beats, threads };
}

export interface StoryFinding {
  level: "error" | "warning";
  code: string;
  message: string;
}

export function verifyStory(graph: StoryGraph, areas?: Set<string>): StoryFinding[] {
  const out: StoryFinding[] = [];
  const err = (code: string, message: string) => out.push({ level: "error", code, message });
  const warn = (code: string, message: string) => out.push({ level: "warning", code, message });
  if (graph.beats.length === 0) {
    warn("story_no_graph", "adventure.md has no story graph (`- beat B1 | title: … | leads: B2`); fine for a short, linear adventure.");
    return out;
  }
  const byId = new Map<string, Beat>();
  for (const b of graph.beats) {
    if (byId.has(b.id)) err("story_duplicate_beat", `Beat ${b.id} is defined twice.`);
    byId.set(b.id, b);
  }
  for (const b of graph.beats) {
    if (b.act && !(ACTS as readonly string[]).includes(b.act)) warn("story_unknown_act", `Beat ${b.id} has act "${b.act}"; use ${ACTS.join(", ")}.`);
    if (areas && b.area && !areas.has(b.area)) warn("story_unknown_area", `Beat ${b.id} is in area "${b.area}", which isn't in the module.`);
    for (const l of b.leads) if (!byId.has(l)) err("story_dangling_lead", `Beat ${b.id} leads to ${l}, which doesn't exist.`);
    if (b.leads.length === 0 && !["climax", "resolution"].includes(b.act))
      warn("story_dead_end", `Beat ${b.id} (${b.title || "untitled"}) leads nowhere and isn't a climax or resolution.`);
    const from = ACTS.indexOf(b.act as (typeof ACTS)[number]);
    for (const l of b.leads) {
      const to = ACTS.indexOf((byId.get(l)?.act ?? "") as (typeof ACTS)[number]);
      if (from >= 0 && to >= 0 && to < from) warn("story_act_order", `Beat ${b.id} (${b.act}) leads back to ${l} (${byId.get(l)?.act}).`);
    }
  }

  // Reachability from the first beat, and the clues available at each point.
  const first = graph.beats[0];
  const reach = new Set<string>([first.id]);
  const queue = [first.id];
  while (queue.length) {
    const cur = byId.get(queue.shift() as string);
    for (const l of cur?.leads ?? []) {
      if (byId.has(l) && !reach.has(l)) {
        reach.add(l);
        queue.push(l);
      }
    }
  }
  for (const b of graph.beats) if (!reach.has(b.id)) err("story_unreachable_beat", `Beat ${b.id} (${b.title || "untitled"}) can't be reached from ${first.id}.`);
  if (!graph.beats.some((b) => reach.has(b.id) && b.leads.length === 0)) err("story_no_ending", "No reachable beat is an ending (a beat with no leads).");

  const givers = new Map<string, string[]>();
  for (const b of graph.beats) for (const c of b.gives) givers.set(c, [...(givers.get(c) ?? []), b.id]);
  for (const b of graph.beats) {
    for (const c of b.needs) {
      const g = (givers.get(c) ?? []).filter((id) => id !== b.id);
      if (g.length === 0) err("story_clue_never_given", `Beat ${b.id} needs clue "${c}", which no beat gives.`);
      else if (g.length === 1) warn("story_clue_single_route", `Clue "${c}" (needed by ${b.id}) comes only from ${g[0]}; give it a second route so a missed search can't stall the story.`);
    }
  }

  for (const t of graph.threads) {
    for (const [role, id] of [["planted", t.planted], ["paid", t.paid]] as const) {
      if (!byId.has(id)) err("story_thread_beat", `Thread ${t.id} (${t.title || "untitled"}) is ${role} in ${id || "(nothing)"}, which isn't a beat.`);
    }
    if (byId.has(t.planted) && byId.has(t.paid)) {
      const seen = new Set<string>([t.planted]);
      const q = [t.planted];
      while (q.length) for (const l of byId.get(q.shift() as string)?.leads ?? []) if (!seen.has(l)) (seen.add(l), q.push(l));
      if (!seen.has(t.paid)) err("story_thread_unpaid", `Thread ${t.id} (${t.title || "untitled"}): the payoff ${t.paid} can't be reached from where it's planted (${t.planted}).`);
    }
  }
  if (graph.threads.length === 0) warn("story_no_threads", "No threads: add `- thread T1 | title: … | planted: B1 | paid: B7` for each motive, mystery or promise the ending must resolve.");
  return out;
}
