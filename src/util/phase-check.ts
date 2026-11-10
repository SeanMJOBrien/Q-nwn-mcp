/**
 * Pure logic behind phase_check: which adventure.md sections each /create-adventure phase needs before it starts and
 * appends when it ends, which verify targets belong to which phase, and how a phase entry merges into
 * adventure-status.json. Kept free of I/O so it is unit-testable.
 */

import type { VerifyResult } from "./verify/common.js";

export const PHASES = [
  "plot",
  "areas",
  "environment",
  "actors",
  "quests",
  "challenges",
  "affordances",
  "polish",
  "rewards",
] as const;
export type Phase = (typeof PHASES)[number];

/** Sections a phase needs before it can start (taken from the pre-check lists the skills used to carry). */
export const REQUIRED_SECTIONS: Record<Phase, string[]> = {
  plot: ["Module"],
  areas: ["Module", "Plot"],
  environment: ["Module", "Plot", "Areas"],
  actors: ["Module", "Plot", "Areas", "Environment"],
  quests: ["Module", "Plot", "Areas", "Environment", "Actors"],
  challenges: ["Module", "Plot", "Areas", "Environment", "Actors", "Quests"],
  affordances: ["Module", "Plot", "Areas", "Environment", "Actors", "Quests", "Challenges"],
  polish: ["Module", "Plot", "Areas", "Environment", "Actors", "Quests", "Challenges", "Affordances"],
  rewards: ["Module", "Plot", "Areas", "Environment", "Actors", "Quests", "Challenges", "Affordances", "Polish"],
};

/** The section each phase appends to adventure.md. */
export const OWN_SECTION: Record<Phase, string> = {
  plot: "Plot",
  areas: "Areas",
  environment: "Environment",
  actors: "Actors",
  quests: "Quests",
  challenges: "Challenges",
  affordances: "Affordances",
  polish: "Polish",
  rewards: "Rewards",
};

/** Verify-result target types (the Report `type`) that count against each phase at its end. `null` = everything. */
export const PHASE_VERIFY_TYPES: Record<Phase, string[] | null> = {
  plot: [],
  areas: ["are"],
  environment: ["are", "utp", "utw", "uts"],
  actors: ["utc", "dlg", "utm"],
  quests: ["dlg", "jrl", "coop"],
  challenges: ["utc", "ute", "utt"],
  affordances: ["utm", "uti", "utp"],
  polish: null,
  rewards: null,
};

/** Map of section name -> body text for every `## Heading` in the document. */
export function parseSections(markdown: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = markdown.split("\n");
  let current: string | null = null;
  let body: string[] = [];
  const flush = () => {
    if (current !== null) sections.set(current, body.join("\n").trim());
  };
  for (const line of lines) {
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) {
      flush();
      current = m[1];
      body = [];
    } else if (current !== null) {
      body.push(line);
    }
  }
  flush();
  return sections;
}

/** Required sections that are absent or have no content. */
export function missingSections(markdown: string, required: string[]): string[] {
  const sections = parseSections(markdown);
  return required.filter((name) => !(sections.get(name) ?? "").length);
}

export function stopMessage(missing: string[]): string {
  return `ERROR: adventure.md is missing required section ${missing.map((m) => `## ${m}`).join(", ")}. The prerequisite skill has not run or failed. Cannot proceed.`;
}

/** Keeps the verify results that belong to a phase. */
export function filterForPhase(phase: Phase, results: VerifyResult[]): VerifyResult[] {
  const types = PHASE_VERIFY_TYPES[phase];
  if (types === null) return results;
  return results.filter((r) => types.includes(r.type));
}

/**
 * What the user asked for, read from `## Module`: `- **Scope:** <text>` and `- **Skip phases:** areas, rewards`.
 * A phase listed under Skip phases is not run, and no later phase requires the section it would have appended.
 */
export function parseScope(markdown: string): { scope: string; skip: Phase[] } {
  const module = parseSections(markdown).get("Module") ?? "";
  const field = (name: string): string => {
    const m = new RegExp(`^[-*]\\s*\\*\\*${name}:\\*\\*\\s*(.*)$`, "im").exec(module);
    return m ? m[1].trim() : "";
  };
  const skip = field("Skip phases")
    .toLowerCase()
    .split(/[,\s]+/)
    .filter((p): p is Phase => (PHASES as readonly string[]).includes(p));
  return { scope: field("Scope"), skip };
}

/** Sections a phase needs, leaving out the ones only a deliberately skipped phase would have written. */
export function requiredFor(phase: Phase, skip: Phase[]): string[] {
  const skipped = new Set(skip.map((p) => OWN_SECTION[p]));
  return REQUIRED_SECTIONS[phase].filter((s) => !skipped.has(s));
}

export interface PhaseEntry {
  status: "success" | "partial" | "failed" | "skipped";
  warnings: string[];
  errors: string[];
}
export interface StatusFile {
  phases: Record<string, PhaseEntry>;
}

/** Merges one phase entry into the status document (creating it when missing or malformed). */
export function mergeStatus(existing: unknown, phase: Phase, entry: PhaseEntry): StatusFile {
  const doc: StatusFile =
    existing && typeof existing === "object" && typeof (existing as StatusFile).phases === "object"
      ? (existing as StatusFile)
      : { phases: {} };
  doc.phases[phase] = entry;
  return doc;
}

export const SCOPE_KINDS = ["whole_adventure", "some_phases", "one_feature", "nwscript_only"] as const;
export type ScopeKind = (typeof SCOPE_KINDS)[number];

/** Phases to skip so that only `run` remain (the order of PHASES is kept). */
export function skipFromRun(run: Phase[]): Phase[] {
  return PHASES.filter((p) => !run.includes(p));
}

/**
 * Writes `- **Scope:**` and `- **Skip phases:**` into the `## Module` section (replacing existing lines, appending
 * missing ones, creating the section when absent). An empty skip list removes the Skip phases line.
 */
export function setScopeFields(markdown: string, scope: string, skip: Phase[]): string {
  const lines = markdown.split("\n");
  let start = lines.findIndex((l) => /^##\s+Module\s*$/.test(l));
  if (start < 0) {
    const tail = markdown.endsWith("\n") || markdown === "" ? "" : "\n";
    return `${markdown}${tail}\n## Module\n${fieldLines(scope, skip).join("\n")}\n`;
  }
  let end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
  if (end < 0) end = lines.length;
  const body = lines.slice(start + 1, end).filter((l) => !/^[-*]\s*\*\*(Scope|Skip phases):\*\*/i.test(l));
  while (body.length > 0 && body[body.length - 1].trim() === "") body.pop();
  const out = [...lines.slice(0, start + 1), ...body, ...fieldLines(scope, skip), "", ...lines.slice(end)];
  start = 0;
  return out.join("\n");
}

function fieldLines(scope: string, skip: Phase[]): string[] {
  const out = [`- **Scope:** ${scope}`];
  if (skip.length) out.push(`- **Skip phases:** ${skip.join(", ")}`);
  return out;
}

/** Removes the `Scope:` and `Skip phases:` lines from `## Module` (used when the scope stops being a pipeline scope). */
export function clearScopeFields(markdown: string): string {
  return markdown
    .split("\n")
    .filter((l) => !/^[-*]\s*\*\*(Scope|Skip phases):\*\*/i.test(l))
    .join("\n");
}

/** True when the recorded project-scope.json says the adventure pipeline is not in use (one feature, NWScript only). */
export function scopeSkipsPipeline(record: unknown): record is { kind: ScopeKind; scope: string } {
  if (!record || typeof record !== "object") return false;
  const r = record as { kind?: unknown; usesAdventurePipeline?: unknown };
  return (
    typeof r.kind === "string" &&
    (SCOPE_KINDS as readonly string[]).includes(r.kind) &&
    r.usesAdventurePipeline === false
  );
}
