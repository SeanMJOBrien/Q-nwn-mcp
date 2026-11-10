/**
 * audit_module: the read-only review of a module as built so far, one row per category in pipeline order, each with a state
 * (done / partial / missing), the evidence, and the phase and focus that would fill it. Pure: the tool gathers the inputs.
 */

import type { Focus } from "./focus.js";
import type { ModuleSnapshot } from "./module-snapshot.js";
import type { Phase } from "./phase-check.js";

export type AuditState = "done" | "partial" | "missing" | "not_applicable";

export interface AuditRow {
  category: string;
  phase?: Phase;
  focus: Focus;
  state: AuditState;
  summary: string;
  findings: string[];
}

export interface VerifyCounts {
  errors: number;
  warnings: number;
  /** The most frequent codes, e.g. ["empty_featlist x3"]. */
  top: string[];
}

export interface AuditInput {
  snapshot: ModuleSnapshot;
  /** Verify results per phase (errors and warnings of the object types that phase owns). */
  verify: Partial<Record<Phase, VerifyCounts>> & { all?: VerifyCounts };
  story: { exists: boolean; notRecorded: number; errors: number; warnings: number };
  dmGuideExists: boolean;
}

function row(r: AuditRow): AuditRow {
  return r;
}

function verifyFindings(v: VerifyCounts | undefined): string[] {
  if (!v || (v.errors === 0 && v.warnings === 0)) return [];
  return [`verify: ${v.errors} errors, ${v.warnings} warnings${v.top.length ? ` (${v.top.join(", ")})` : ""}`];
}

export function buildAudit(input: AuditInput): AuditRow[] {
  const { snapshot: s, verify, story } = input;
  const rows: AuditRow[] = [];
  const hostile = s.areas.flatMap((a) => a.creatures.filter((c) => c.hostile));
  const friendly = s.areas.flatMap((a) => a.creatures.filter((c) => !c.hostile));

  // Story
  {
    const findings: string[] = [];
    let state: AuditState = "done";
    if (!story.exists) {
      state = "missing";
      findings.push("no adventure.md: run adopt_module to write the story record from the module");
    } else {
      if (story.notRecorded > 0) {
        state = "partial";
        findings.push(`${story.notRecorded} story field(s) still (not recorded): premise, tone, motives, roles`);
      }
      if (story.errors > 0) {
        state = "partial";
        findings.push(`story graph: ${story.errors} error(s)`);
      }
      if (story.warnings > 0) findings.push(`story graph: ${story.warnings} warning(s)`);
    }
    rows.push(row({ category: "Story (premise, beats, motives, ending)", phase: "plot", focus: "story", state, summary: state === "done" ? "story recorded and consistent" : "story is incomplete or unrecorded", findings }));
  }

  // Areas
  {
    const findings: string[] = [];
    let state: AuditState = "done";
    if (s.areas.length === 0) {
      state = "missing";
      findings.push("no areas");
    } else {
      if (s.unreachableAreas.length) {
        state = "partial";
        findings.push(`not reachable from the start area: ${s.unreachableAreas.join(", ")}`);
      }
      const empty = s.areas.filter((a) => a.creatures.length + a.placeables === 0).map((a) => a.resref);
      if (empty.length) {
        state = "partial";
        findings.push(`areas with nothing in them: ${empty.join(", ")}`);
      }
    }
    findings.push(...verifyFindings(verify.areas));
    if (verify.areas?.errors) state = state === "missing" ? state : "partial";
    rows.push(row({ category: "Areas and transitions", phase: "areas", focus: "areas_encounters", state, summary: `${s.areas.length} area(s)`, findings }));
  }

  // Environment
  {
    const bare = s.areas.filter((a) => a.placeables + a.sounds === 0).map((a) => a.resref);
    const findings: string[] = [];
    let state: AuditState = s.areas.length === 0 ? "missing" : bare.length === s.areas.length ? "missing" : bare.length ? "partial" : "done";
    if (bare.length) findings.push(`no props or sounds in: ${bare.join(", ")}`);
    findings.push(...verifyFindings(verify.environment));
    if (verify.environment?.errors && state === "done") state = "partial";
    rows.push(row({ category: "Dressing (props, sound, waypoints)", phase: "environment", focus: "areas_encounters", state, summary: `${s.areas.length - bare.length} of ${s.areas.length} areas dressed`, findings }));
  }

  // Actors
  {
    const talking = friendly.filter((c) => c.conversation);
    const findings: string[] = [];
    let state: AuditState = friendly.length === 0 ? "missing" : s.dialogCount === 0 ? "partial" : "done";
    if (friendly.length === 0) findings.push("no friendly creatures");
    else if (talking.length === 0) findings.push("friendly creatures exist but none has a dialog");
    const noOne = s.areas.filter((a) => !a.creatures.some((c) => !c.hostile)).map((a) => a.resref);
    if (friendly.length && noOne.length) findings.push(`areas with no friendly creature (fine for wilderness): ${noOne.join(", ")}`);
    findings.push(...verifyFindings(verify.actors));
    if (verify.actors?.errors && state === "done") state = "partial";
    rows.push(row({ category: "Friendly creatures and dialog", phase: "actors", focus: "creatures", state, summary: `${friendly.length} friendly, ${talking.length} with a dialog, ${s.dialogCount} dialog files`, findings }));
  }

  // Quests
  {
    const noEnd = s.quests.filter((q) => !q.hasEnd).map((q) => q.name);
    const findings: string[] = [];
    let state: AuditState = s.quests.length === 0 ? "missing" : noEnd.length ? "partial" : "done";
    if (s.quests.length === 0) findings.push("no journal quests");
    if (noEnd.length) findings.push(`quests with no end entry: ${noEnd.join(", ")}`);
    findings.push(...verifyFindings(verify.quests));
    if (verify.quests?.errors && state === "done") state = "partial";
    findings.push("also run verify_quest_completability (quest wiring through dialogs)");
    rows.push(row({ category: "Quests, journal and dialog wiring", phase: "quests", focus: "quests_dialog", state, summary: `${s.quests.length} quest(s)`, findings }));
  }

  // Challenges
  {
    const entry = s.entryArea;
    const bare = s.areas.filter((a) => a.resref !== entry && !a.creatures.some((c) => c.hostile)).map((a) => a.resref);
    const findings: string[] = [];
    let state: AuditState = hostile.length === 0 ? "missing" : bare.length ? "partial" : "done";
    if (hostile.length === 0) findings.push("no hostile creatures");
    if (hostile.length && bare.length) findings.push(`no hostile creature in: ${bare.join(", ")} (may be intended: social or discovery areas)`);
    findings.push(...verifyFindings(verify.challenges));
    if (verify.challenges?.errors && state === "done") state = "partial";
    findings.push("run get_balance_report with the party level to judge difficulty");
    rows.push(row({ category: "Hostile creatures, encounters and traps", phase: "challenges", focus: "areas_encounters", state, summary: `${hostile.length} hostile creature(s)`, findings }));
  }

  // Affordances
  {
    const stores = s.areas.reduce((n, a) => n + a.stores, 0) + s.storeBlueprints;
    const findings: string[] = [];
    let state: AuditState = stores + s.itemBlueprints === 0 ? "missing" : "done";
    if (state === "missing") findings.push("no stores, items or loot blueprints");
    findings.push(...verifyFindings(verify.affordances));
    if (verify.affordances?.errors && state === "done") state = "partial";
    rows.push(row({ category: "Stores, loot and gold", phase: "affordances", focus: "items", state, summary: `${stores} store(s), ${s.itemBlueprints} item blueprint(s)`, findings }));
  }

  // Scripts
  {
    const findings: string[] = [];
    let state: AuditState = s.scripts === 0 ? "not_applicable" : s.uncompiledScripts.length ? "partial" : "done";
    if (s.uncompiledScripts.length) findings.push(`scripts with no compiled .ncs: ${s.uncompiledScripts.slice(0, 15).join(", ")}${s.uncompiledScripts.length > 15 ? " …" : ""}`);
    findings.push("behaviour bugs are not visible here: use run_live_verification or the debug focus");
    rows.push(row({ category: "Scripts and behaviour", focus: "scripting", state, summary: `${s.scripts} script source(s)`, findings }));
  }

  // Polish
  {
    const all = verify.all;
    const findings = verifyFindings(all);
    const state: AuditState = !all ? "not_applicable" : all.errors > 0 ? "partial" : "done";
    rows.push(row({ category: "Consistency and structure (verify_all)", phase: "polish", focus: "debug", state, summary: all ? (all.errors === 0 ? "shippable" : `${all.errors} error(s) block shipping`) : "not run", findings }));
  }

  // Rewards and hand-off
  {
    const findings: string[] = [];
    const has = [s.description.trim().length > 0, s.hasRewardSystem, input.dmGuideExists];
    if (!has[0]) findings.push("no module description for the player");
    if (!has[1]) findings.push("no reward helper (inc_reward): quests may not pay every party member");
    if (!has[2]) findings.push("no DM guide");
    const n = has.filter(Boolean).length;
    rows.push(row({ category: "Rewards and hand-off", phase: "rewards", focus: "items", state: n === 3 ? "done" : n === 0 ? "missing" : "partial", summary: `${n} of 3 hand-off items present`, findings }));
  }

  // DM area and books (rule 2026-11-09: every module has a disconnected DM area with a chest holding the story book and the DM guide book)
  {
    const d = s.dmArea;
    const findings: string[] = [];
    if (!d) findings.push("no DM area (resref or name containing \"dm\"): create one with no transitions into it");
    else {
      if (!d.disconnected) findings.push(`${d.resref} is reachable by players: remove every transition into it`);
      if (!d.hasWaypoint) findings.push(`${d.resref} has no waypoint for the DM to jump to`);
      if (!d.chest) findings.push(`${d.resref} has no chest placeable holding the books`);
      if (!d.storyBook) findings.push("no story book (a book item tagged/named \"story\") in the DM area chest");
      if (!d.guideBook) findings.push("no DM guide book (a book item tagged/named \"guide\") in the DM area chest");
    }
    const ok = !!d && d.disconnected && d.hasWaypoint && d.chest && d.storyBook && d.guideBook;
    rows.push(row({ category: "DM area and books", focus: "items", state: ok ? "done" : !d ? "missing" : "partial", summary: ok ? `${d?.resref}: story book and DM guide book in a chest` : d ? "DM area incomplete" : "no DM area", findings }));
  }

  return rows;
}

/** The non-done rows in pipeline order, as a plain list the LLM can offer the user. */
export function gapList(rows: AuditRow[]): string[] {
  return rows.filter((r) => r.state === "missing" || r.state === "partial").map((r) => `${r.category} [${r.state}] — ${r.phase ? `phase ${r.phase}, ` : ""}focus ${r.focus}`);
}
