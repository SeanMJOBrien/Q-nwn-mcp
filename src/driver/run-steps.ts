/**
 * Step mode: one phase run as a series of short, fresh conversations, one per open checklist step (get_progress).
 *
 * A long phase in one conversation drifts: the instructions scroll out of a small model's view, old results are
 * dropped, and it loses which area it was on. Here each step gets its own conversation with a step card: the user's
 * goal and decisions, the one step and its call, the facts it needs read from the module (area cards, the plot's
 * block for the place or person) and the phase's rules, and only the few tools that step uses. The module holds the
 * progress, so a new conversation loses nothing. phase_check still judges the phase; if it fails, one repair pass
 * runs in phase mode (run-phase.ts) with the errors.
 */

import type { Phase } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { DRAFTED_SECTIONS, STEP_BASE_TOOLS } from "../util/progress.js";
import { OWN_SECTION } from "../util/phase-check.js";
import type { Chat, ChatMessage, ToolSpec } from "./llm.js";
import { checkOk, clip, DRIVER_ONLY, type HostTool, type PhaseResult, runPhase, type RunPhaseOptions, runTool, type ToolHost, trimContext } from "./run-phase.js";

export interface RunStepsOptions extends RunPhaseOptions {
  /** Model turns per step (default 12). */
  stepTurns?: number;
  /** Step conversations per phase before the driver stops trying (default 60). */
  maxStepRuns?: number;
  /** Tries per step before it is left open (default 2). */
  stepTries?: number;
}

/** Phases run step by step; plot, polish and rewards have no per-item steps and run in phase mode. */
export const STEP_PHASES: readonly Phase[] = ["areas", "environment", "actors", "quests", "challenges", "affordances"];

export interface OpenStep {
  id: string;
  step: string;
  call?: string;
  why?: string;
  areas?: string[];
  subject?: string;
  tools?: string[];
}

interface ProgressAnswer {
  goal?: string;
  decisions?: string[];
  open?: OpenStep[];
}

const STEP_SYSTEM = [
  "You do ONE step of building a Neverwinter Nights module by calling tools.",
  "Read the step card. Use only the tools you are given and only the parameters each tool lists.",
  "Use only names, resrefs, tags and coordinates from the card or from a tool answer. Never invent them; get_area_card gives an area's facts.",
  "When a tool answers with an error, change the named field and call it again. Do not repeat a failing call unchanged.",
  "Do not explain. When the step is done, reply with the single word DONE.",
].join("\n");

/** The `## Name` blocks of a phase prompt: [name, text]. */
export function promptSections(body: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  const marks = [...body.matchAll(/^## (.+)$/gm)];
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? body.length) : body.length;
    out.push([m[1].trim(), body.slice(m.index ?? 0, end).trim()]);
  });
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** The plot's `#### ` block about `subject` (a location, NPC or quest), clipped. */
export function plotBlock(plot: string, subject: string): string | undefined {
  const want = norm(subject);
  if (!want) return undefined;
  const marks = [...plot.matchAll(/^#### (.+)$/gm)];
  for (let i = 0; i < marks.length; i++) {
    const head = norm(marks[i][1].replace(/^\d+\.\s*/, "").replace(/^(primary|side) quest:\s*/i, ""));
    if (!head || !(head.includes(want) || want.includes(head))) continue;
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? plot.length) : plot.length;
    return clip(plot.slice(marks[i].index ?? 0, end).trim(), 1200);
  }
  return undefined;
}

/**
 * The field errors in a failed tool result (`fields: [{field, message}]`, as build_area and the driver's spec check
 * answer), each with the value the model gave, as lines for later step cards.
 */
export function refusedFields(tool: string, text: string, args?: Record<string, unknown>): Array<{ key: string; line: string }> {
  let body: { fields?: Array<{ field?: string; message?: string }> };
  try {
    body = JSON.parse(text) as typeof body;
  } catch {
    return [];
  }
  if (!Array.isArray(body.fields)) return [];
  let spec: Record<string, unknown> = {};
  const raw = args?.spec;
  if (raw && typeof raw === "object") spec = raw as Record<string, unknown>;
  else if (typeof raw === "string") {
    try {
      spec = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      spec = {};
    }
  }
  return body.fields
    .filter((f) => f.field && f.message)
    .map((f) => {
      const field = f.field as string;
      const given = spec[field] ?? args?.[field];
      const was = given === undefined ? "" : ` (was ${clip(JSON.stringify(given), 60)})`;
      const message = (f.message as string).replace(/; fields: .*/, "");
      return { key: `${tool}.${field}.${message}`, line: `${tool} ${field}: ${message}${was}` };
    });
}

/** The step card: everything the step needs and nothing else. */
export function stepCard(o: {
  phase: Phase;
  step: OpenStep;
  openCount: number;
  goal?: string;
  decisions?: string[];
  facts: string[];
  rules: string;
  format?: string;
  /** Field errors earlier steps of this phase were refused with, so a fresh conversation does not repeat them. */
  refused?: string[];
}): string {
  const lines: string[] = [];
  if (o.goal) lines.push(`Adventure goal (the user's words): ${o.goal}`);
  if (o.decisions?.length) lines.push(`Decisions so far (keep to them):\n${o.decisions.map((d) => `- ${d}`).join("\n")}`);
  lines.push(`Phase: ${o.phase}. ${o.openCount} step${o.openCount === 1 ? "" : "s"} still open in this phase; you do this one only.`);
  lines.push("", `YOUR STEP: ${o.step.step}`, `Do it with: ${o.step.call ?? "(see the rules)"}`);
  if (o.step.why) lines.push(`Why it is open: ${o.step.why}`);
  if (o.facts.length) lines.push("", "Facts:", ...o.facts);
  if (o.refused?.length) lines.push("", "Refused earlier in this phase (do not repeat these mistakes):", ...o.refused.map((r) => `- ${r}`));
  if (o.format) lines.push("", o.format);
  if (o.rules) lines.push("", `Rules for this phase:\n${o.rules}`);
  lines.push("", "When the step is done, reply DONE.");
  return lines.join("\n");
}

export async function runPhaseSteps(host: ToolHost, chat: Chat, phase: Phase, options: RunStepsOptions = {}): Promise<PhaseResult> {
  const log = options.onEvent ?? (() => {});
  const stepTurns = options.stepTurns ?? 12;
  const maxRuns = options.maxStepRuns ?? 60;
  const tries = options.stepTries ?? 2;
  const maxResult = options.maxResultChars ?? 6000;
  const budget = options.contextChars ?? 48_000;
  const result: PhaseResult = { phase, status: "failed", steps: 0, toolCalls: 0, errors: [] };

  const start = checkOk((await host.callTool("phase_check", { phase, step: "start" })).text);
  if (start.skipped) return { ...result, status: "skipped" };
  if (!start.ok) return { ...result, status: "blocked", reason: start.errors[0], errors: start.errors };

  const prompt = loadPhasePrompt(phase);
  const sections = promptSections(prompt.body);
  const rules = sections.filter(([n]) => !/^steps$/i.test(n) && !/^format/i.test(n)).map(([, t]) => t).join("\n\n");
  const format = sections.find(([n]) => /^format/i.test(n))?.[1];
  const allTools = await host.listTools();
  const toolByName = new Map(allTools.map((t) => [t.name, t]));

  const progress = async (): Promise<ProgressAnswer> => {
    try {
      return JSON.parse((await host.callTool("get_progress", { phase })).text) as ProgressAnswer;
    } catch {
      return {};
    }
  };
  const textOf = async (name: string, args: Record<string, unknown>) => {
    if (!toolByName.has(name)) return undefined;
    const r = await host.callTool(name, args);
    return r.isError ? undefined : r.text;
  };

  const givenUp = new Set<string>();
  const attempts = new Map<string, number>();
  let runs = 0;
  let plot: string | undefined;
  const refused = new Map<string, string>();

  while (runs < maxRuns) {
    const p = await progress();
    const open = (p.open ?? []).filter((o) => !o.id.endsWith(".check") && !givenUp.has(o.id));
    if (!open.length) break;
    const step = open[0];
    runs++;

    // A section the module can write itself (Areas, Environment): the driver drafts it from the real state; a small
    // model writing it invents positions and objects.
    if (step.id === `${phase}.section` && DRAFTED_SECTIONS.includes(phase) && toolByName.has("write_story_section")) {
      const r = await host.callTool("write_story_section", { section: OWN_SECTION[phase], draft: true });
      log({ event: "driver_step", id: step.id, tool: "write_story_section", isError: r.isError, result: r.text.slice(0, 300) });
      if (!r.isError) {
        log({ event: "step_done", id: step.id });
        continue;
      }
    }

    // The facts: the plot's block for the subject, the card of each area, all areas for a section.
    const facts: string[] = [];
    if (step.subject) {
      plot ??= (await textOf("read_story", { sections: "Plot" })) ?? "";
      const block = plotBlock(plot, step.subject);
      if (block) facts.push(block);
    }
    for (const a of step.areas ?? []) {
      const card = await textOf("get_area_card", { area: a });
      if (card) facts.push(card);
    }
    const isSection = step.id.endsWith(".section");
    if (isSection) {
      const all = await textOf("get_area_card", {});
      if (all) facts.push(`Areas:\n${all}`);
    }

    const names = [...new Set([...(step.tools ?? []), ...STEP_BASE_TOOLS])].filter((n) => toolByName.has(n) && !DRIVER_ONLY.has(n));
    const byName = new Map(names.map((n) => [n, toolByName.get(n) as HostTool]));
    const specs: ToolSpec[] = names.map((n) => {
      const t = toolByName.get(n) as HostTool;
      return { name: t.name, description: t.description, parameters: t.inputSchema as Record<string, unknown> };
    });
    const card = stepCard({ phase, step, openCount: open.length, goal: p.goal, decisions: p.decisions, facts, rules: isSection ? "" : rules, format: isSection ? format : undefined, refused: [...refused.values()].slice(-8) });
    log({ event: "step", id: step.id, step: step.step, tools: names, cardChars: card.length });

    const messages: ChatMessage[] = [
      { role: "system", content: STEP_SYSTEM },
      { role: "user", content: card },
    ];
    let lastFailing = "";
    for (let turn = 0; turn < stepTurns; turn++) {
      trimContext(messages, budget);
      const reply = await chat(messages, specs);
      result.steps++;
      messages.push(reply);
      log({ event: "model", step: result.steps, id: step.id, content: reply.content.slice(0, 300), calls: reply.tool_calls?.map((c) => c.name) ?? [] });
      if (!reply.tool_calls?.length) break;
      for (const call of reply.tool_calls) {
        result.toolCalls++;
        const out = await runTool(call, byName, host, log);
        messages.push({ role: "tool", tool_call_id: call.id, content: clip(out.text, maxResult) });
        const signature = `${call.name} ${JSON.stringify(out.args ?? call.arguments)}`;
        if (out.isError && signature === lastFailing) {
          messages.push({ role: "user", content: `That is the same failing call to ${call.name}. Change the field its error names, or reply DONE if the step cannot be done.` });
        }
        lastFailing = out.isError ? signature : "";
        if (out.isError) for (const r of refusedFields(call.name, out.raw ?? out.text, out.args)) refused.set(r.key, r.line);
      }
    }

    const still = ((await progress()).open ?? []).some((o) => o.id === step.id);
    if (still) {
      const n = (attempts.get(step.id) ?? 0) + 1;
      attempts.set(step.id, n);
      if (n >= tries) {
        givenUp.add(step.id);
        log({ event: "step_left_open", id: step.id, step: step.step });
      }
    } else log({ event: "step_done", id: step.id });
  }

  const openSteps = [...givenUp];
  const end = checkOk((await host.callTool("phase_check", { phase, step: "end" })).text);
  log({ event: "phase_check_end", by: "driver", ok: end.ok, errors: end.errors.slice(0, 10) });
  if (end.ok) return { ...result, status: "success", errors: [], ...(openSteps.length ? { openSteps } : {}) };

  // One repair pass in phase mode, with the errors and the phase's tools.
  const intro =
    `The ${phase} phase is built, but phase_check(phase: "${phase}", step: "end") reports:\n` +
    `${end.errors.slice(0, 8).map((e) => `- ${e}`).join("\n")}\n` +
    `Repair these with the tools (get_area_card shows an area), then call phase_check(phase: "${phase}", step: "end").`;
  log({ event: "repair", errors: end.errors.slice(0, 8) });
  const repaired = await runPhase(host, chat, phase, { ...options, intro });
  return {
    ...repaired,
    steps: result.steps + repaired.steps,
    toolCalls: result.toolCalls + repaired.toolCalls,
    ...(openSteps.length ? { openSteps } : {}),
  };
}
