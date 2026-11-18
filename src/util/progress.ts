/**
 * The per-module build checklist behind get_progress: one list of small, checkable steps from an empty module to a
 * shippable one, each ticked from the module's real state (not from what a model says it did), and the single next
 * step with the exact call to make.
 *
 * Small models lose their place: they generate a layout and never create the area, or finish the areas and forget
 * the map pins. phase_check only knows whole phases. This list is finer (per area, per NPC, per quest), so "what
 * now?" always has one concrete answer. Pure: the tool gathers ModuleFacts, this file decides.
 */

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
}

/** Tools every step may use besides its own. */
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
    if (id.includes(".trap.")) return ["create_trap_blueprint", "place_trigger", "add_skill_check", "adventure_find_walkable"];
    if (id.includes(".boss.")) return ["build_key_npc", "compose_encounter", "list_creature_samples", "adventure_find_walkable", "get_area_creatures"];
    return ["suggest_encounter", "compose_encounter", "place_creature", "place_encounter", "list_creature_samples", "adventure_find_walkable", "get_area_creatures"];
  }
  if (phase === "affordances") {
    if (id === "affordances.gold") return ["set_starting_gold", "get_wealth_budget"];
    if (id.startsWith("affordances.store")) return ["create_store_blueprint", "place_store", "adventure_find_walkable", "get_dialog_tree", "add_dialog_node", "list_creatures"];
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
  locations: Array<{ name: string; resref: string; tileset?: string; purpose?: string }>;
  connections: Array<[string, string]>;
  npcs: Array<{ name: string; location?: string; role?: string }>;
  quests: Array<{ name: string; giver?: string }>;
  /** Locations that the Challenges list names. */
  challengeLocations: string[];
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
  containers?: Array<{ tag: string; items: number }>;
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
    return { name, resref, tileset: field(b, "Tileset")?.split(/\s/)[0], purpose: field(b, "Purpose")?.toLowerCase() };
  });
  const connections: Array<[string, string]> = [];
  for (const line of (sub.get("connections") ?? "").split("\n")) {
    const m = /^\s*-\s*(.+?)\s*<->\s*(.+?)(?:\s+via\s+.*)?$/.exec(line);
    if (m) connections.push([m[1].trim(), m[2].trim()]);
  }
  const npcs = blocks(sub.get("key npcs") ?? "", 4).map(([h, b]) => ({
    name: h.trim(),
    location: field(b, "Location"),
    role: field(b, "Role")?.toLowerCase(),
  }));
  const quests = blocks(sub.get("quest objectives") ?? "", 4)
    .map(([h, b]) => ({
      name: h.replace(/^(primary|side)\s+quest:\s*/i, "").replace(/\s*\(optional\)\s*$/i, "").trim(),
      giver: /\*\*Giver:\*\*\s*(.+)/.exec(b)?.[1].trim(),
    }))
    .filter((q) => q.name);
  const challengeText = sub.get("challenges") ?? "";
  const challengeLocations = locations.filter((l) => norm(challengeText).includes(norm(l.name))).map((l) => l.name);
  const economy = norm(sub.get("loot economy") ?? sub.get("loot & economy") ?? "");
  const merchantLine = /merchants?:?\s*(.*)/.exec(economy)?.[1] ?? "";
  const merchant =
    npcs.some((n) => n.role?.includes("merchant")) || (merchantLine !== "" && !/^none\b/.test(merchantLine));
  return { locations, connections, npcs, quests, challengeLocations, merchant };
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

/** Every step, in build order. */
export function buildChecklist(
  story: string | null,
  status: Record<string, PhaseStatus> | undefined,
  facts: ModuleFacts,
): { items: ProgressItem[]; outline: PlotOutline | null } {
  const items: ProgressItem[] = [];
  const add = (phase: ProgressPhase, id: string, label: string, done: boolean, call?: string, detail?: string, about: { areas?: string[]; subject?: string } = {}) => {
    const tools = stepTools(id);
    items.push({
      id, phase, label, done,
      ...(call ? { call } : {}),
      ...(detail && !done ? { detail } : {}),
      ...(about.areas?.length ? { areas: about.areas } : {}),
      ...(about.subject ? { subject: about.subject } : {}),
      ...(tools.length ? { tools } : {}),
    });
  };
  const sections = story ? parseSections(story) : new Map<string, string>();
  const has = (s: string) => (sections.get(s) ?? "").trim().length > 0;
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
    add(p, `${p}.section`, `story section "## ${OWN_SECTION[p]}" written`, has(OWN_SECTION[p]), `write_story_section(section: "${OWN_SECTION[p]}", text: "...")`);

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
      ...targets.fights.keys(),
    ].filter((r): r is string => !!r),
  );

  // areas
  if (!skipped("areas")) {
    for (const l of locs) {
      const a = facts.areas.get(l.resref);
      const ts = l.tileset ?? a?.tileset ?? "<tileset>";
      const links = (outline?.connections ?? []).filter(([x, y]) => resrefOf(x) === l.resref || resrefOf(y) === l.resref).length;
      const build = `build_area(spec: ${specArg({ resref: l.resref, name: l.name, tileset: ts, connections: Math.max(1, links) })})`;
      const about = { areas: [l.resref], subject: l.name };
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
        `adventure_create_transition(areaA: "${ra}", aX: "<x>", aY: "<y>", areaB: "${rb}", bX: "<x>", bY: "<y>", tag: "<tag>") at the free transition points get_area_card shows, or link_doors(...) between door tags`,
        undefined, { areas: [ra, rb] });
    }
    if (locs.length) {
      const first = locs[0].resref;
      const okStart = facts.entryArea !== "" && facts.entryArea !== "_start" && facts.areas.has(facts.entryArea) && !facts.areas.has("_start");
      add("areas", "areas.start", "module start set in a story area (the empty _start area removed)", okStart, `set_module_start(area: "${first}", x: "<x>", y: "<y>")`, undefined, { areas: [first] });
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
      add("environment", `environment.${l.resref}.props`, `${l.name}: dressed with props (at least 5)`, a.props >= 5,
        `dress_area(area: "${l.resref}", props: "[\\"<blueprint>\\", ...]") places them on open ground, or place_placeable(area: "${l.resref}", ...) one by one`, `${a.props} placed`, about);
      add("environment", `environment.${l.resref}.pins`, `${l.name}: map pins at doors, shops and key places`, a.mapPins > 0,
        `dress_area(area: "${l.resref}") pins every exit; place_waypoint(area: "${l.resref}", ..., mapNote: "Bram's Smithy") for a shop or quest giver`, undefined, about);
      if (fightAreas.has(l.resref) && a.containers) {
        add("environment", `environment.${l.resref}.container`, `${l.name}: a container (chest, crate, barrel) for loot`, a.containers.length > 0,
          `place_placeable(area: "${l.resref}", blueprint: "plc_chest1", ...)`, undefined, about);
      }
      for (const tag of targets.containers.get(l.resref) ?? []) {
        const there = (a.containers ?? []).some((c) => c.tag.toLowerCase() === tag);
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
      const placedIn = [...facts.areas].filter(([, a]) => a.creatures.some((c) => nameMatches(n.name, c.name))).map(([r]) => r);
      add("actors", `actors.${norm(n.name).replace(/ /g, "_")}`, `${n.name} placed${where ? ` in ${where}` : ""}`, placedIn.length > 0,
        `build_key_npc(...) or build_creature(spec: "{...}") with place in "${where ?? "<area>"}"`, undefined, { areas: where ? [where] : [], subject: n.name });
    }
    section("actors");
    endCheck("actors");
  }

  // quests
  if (!skipped("quests")) {
    for (const q of outline?.quests ?? []) {
      const built = facts.journalQuests.some((j) => nameMatches(q.name, j));
      add("quests", `quests.${norm(q.name).replace(/ /g, "_")}`, `quest "${q.name}" built (journal + dialog)`, built,
        `build_quest(spec: "{...}")${q.giver ? `, giver ${q.giver}` : ""}`, undefined, { subject: q.name });
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
      const about = { areas: [r], subject: name };
      add("challenges", `challenges.${r}`, `${name}: enemies placed`, hostile, `suggest_encounter(...) then place_creature(area: "${r}", ...)`, undefined, about);
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
      add("affordances", "affordances.store", "the merchant's store placed", stores > 0, "create_store_blueprint(...), then place_store(...)");
    }
    for (const [r, tag] of targets.stores) {
      const a = facts.areas.get(r);
      if (a?.storeTags) add("affordances", `affordances.store.${tag}`, `store ${tag} (named in ## Affordances) is in ${r}`, a.storeTags.some((x) => x.toLowerCase() === tag), `place_store(area: "${r}", blueprint: "${tag}", ...)`, undefined, { areas: [r] });
    }
    for (const l of locs) {
      const a = facts.areas.get(l.resref);
      if (!a?.containers?.length || /boss/.test(l.purpose ?? "")) continue; // the boss room's chest is the rewards phase's
      add("affordances", `affordances.${l.resref}.loot`, `${l.name}: loot in at least one container`, a.containers.some((c) => c.items > 0),
        `add_items_to_container(area: "${l.resref}", containerTag: "${a.containers[0].tag}", items: "[...]")`, undefined, { areas: [l.resref], subject: l.name });
    }
    for (const [r, tag] of targets.loot) {
      const c = facts.areas.get(r)?.containers?.find((x) => x.tag.toLowerCase() === tag);
      if (facts.areas.get(r)?.containers) add("affordances", `affordances.${r}.c.${tag}`, `container ${tag} in ${r} holds the loot ## Affordances names`, !!c && c.items > 0,
        `add_items_to_container(area: "${r}", containerTag: "${tag}", items: "[...]")`, undefined, { areas: [r] });
    }
    if (facts.startingGold !== undefined) {
      const level = /\*\*(?:Target )?Level:\*\*\s*(\d+)/i.exec(sections.get("Module") ?? "")?.[1] ?? "<level>";
      add("affordances", "affordances.gold", `players start at level ${level} with the gold for it`, facts.startingGold, `set_starting_gold(level: "${level}")`);
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
    add("rewards", "rewards.dmguide", "DM guide written", facts.dmGuideWritten, 'write_dm_guide(text: "...")');
    add("rewards", "rewards.dmarea", "DM area with the story and DM-guide books", facts.areas.has(facts.dmAreaResref), "create_dm_area()");
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
