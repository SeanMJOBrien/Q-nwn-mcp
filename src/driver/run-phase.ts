/**
 * Runs one adventure phase with a small model: the short phase prompt, only the phase's tools, repaired
 * arguments, field-named errors, a step limit, and `phase_check` as the judge of "done".
 *
 * The model and the tool host are injected, so the loop is tested without a model or a game install.
 */

import { type Phase } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { isToolAllowed, resolveToolProfile } from "../tool-profiles.js";
import { isSetupError, SetupError } from "../util/setup-check.js";
import { validateSpec } from "../util/spec-validate.js";
import { coerceArgs, type JsonSchemaObject } from "./coerce.js";
import { ContextExceededError, type Chat, type ChatMessage, type ToolCall, type ToolSpec } from "./llm.js";

export interface HostTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}

export interface ToolHost {
  listTools(): Promise<HostTool[]>;
  /** `footer`: the server's progress line, kept apart so `text` stays parseable JSON; the model sees both. */
  callTool(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean; footer?: string }>;
}

export interface RunPhaseOptions {
  /** Most model turns in the phase (default 60). */
  maxSteps?: number;
  /** Times the phase check may fail before the phase is given up (default 3). */
  retries?: number;
  /** Longest tool result handed back to the model, in characters (default 6000). */
  maxResultChars?: number;
  /** Character budget of the conversation; older tool results are dropped past it (default 48000, about 12k tokens). */
  contextChars?: number;
  /** Called for every event, for the log. */
  onEvent?: (event: Record<string, unknown>) => void;
  /** Replaces the phase prompt as the first message (a repair pass after step mode). */
  intro?: string;
}

export interface PhaseResult {
  phase: Phase;
  status: "success" | "failed" | "skipped" | "blocked";
  steps: number;
  toolCalls: number;
  /** Why it stopped, when not a success. */
  reason?: string;
  errors: string[];
  /** Step mode: steps the model could not finish (the phase check may still pass without them). */
  openSteps?: string[];
}

/**
 * A call's identity for the stuck check: the tool and its arguments with keys sorted, so the same arguments in another
 * order count as the same call (a model repeated one failing create_store_blueprint six times, reordering the keys).
 */
export function callSignature(tool: string, args: unknown): string {
  let value = args;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return `${tool} ${value}`;
    }
  }
  const sorted = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(sorted) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, sorted(x)])) : v;
  return `${tool} ${JSON.stringify(sorted(value))}`;
}

/** Identical calls in a row (after the first; failing or not) that end a conversation: the model is stuck. */
export const STUCK_REPEATS = 4;

/** Tools the driver runs itself; never shown to the model. */
export const DRIVER_ONLY = new Set(["load_module", "repack_module", "get_phase_prompt"]);

/** Tools whose arguments have a build spec: checked before the call so the error names the field. */
const SPEC_FOR_TOOL: Record<string, string> = {
  build_companion: "companion",
  build_key_npc: "key-npc",
  create_dialog: "dialog",
  adventure_generate_layout: "area-layout",
};

const SYSTEM = [
  "You build one phase of a Neverwinter Nights adventure module by calling tools.",
  "Follow the numbered steps in order. Call one tool at a time and read its answer before the next call.",
  "Use only the tools you are given and only the parameters each tool lists.",
  "Use only names, resrefs and tags that a tool answer or the story gave you. Never invent them.",
  "When a tool answers with an error, change the named field and call it again. Do not repeat a failing call unchanged.",
  "Do not explain your plan. When the final phase_check answers ok, reply with the single word DONE.",
].join("\n");

export function parseArgs(call: ToolCall): Record<string, unknown> | string {
  if (typeof call.arguments !== "string") return call.arguments ?? {};
  const text = call.arguments.trim();
  if (!text) return {};
  try {
    const v = JSON.parse(text) as unknown;
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : "arguments must be a JSON object";
  } catch (e) {
    return `arguments are not valid JSON (${(e as Error).message})`;
  }
}

/** Spec-shaped view of tool arguments: numbers and lists as real values, only the fields the spec knows. */
export function specErrors(tool: string, args: Record<string, unknown>): Array<{ field: string; message: string }> {
  const kind = SPEC_FOR_TOOL[tool];
  if (!kind) return [];
  const spec: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(args)) {
    if (typeof v !== "string") {
      spec[k] = v;
      continue;
    }
    const t = v.trim();
    if (/^-?\d+(\.\d+)?$/.test(t) && !["resref", "name", "area", "tileset", "conversation", "tag"].includes(k)) spec[k] = Number(t);
    else if ((t.startsWith("[") && t.endsWith("]")) || (t.startsWith("{") && t.endsWith("}"))) {
      try {
        spec[k] = JSON.parse(t);
      } catch (e) {
        return [{ field: k, message: `is not valid JSON (${(e as Error).message})` }];
      }
    } else spec[k] = v;
  }
  // Tool parameters outside the spec (tag, gearWealth, ...) are the tool's to judge.
  return validateSpec(kind, spec).errors.filter((e) => !e.message.startsWith("is not a field of this spec"));
}

export function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}\n[... ${text.length - max} more characters not shown]`;
}

/** Drops the oldest tool results until the conversation fits the budget. The system and first user message stay. */
export function trimContext(messages: ChatMessage[], budget: number): void {
  const size = () => messages.reduce((n, m) => n + m.content.length + JSON.stringify(m.tool_calls ?? "").length, 0);
  for (let i = 2; i < messages.length - 4 && size() > budget; i++) {
    const m = messages[i];
    if (m.role === "tool" && m.content.length > 80) m.content = "[earlier result removed to save space]";
  }
}

/** The smallest conversation the driver will shrink to before it gives up on a context overflow (about 1k tokens). */
export const MIN_CONTEXT_CHARS = 4_000;

/**
 * Asks the model. When the server reports that the conversation is longer than its context window, the budget is
 * halved (the budget object is shared across the turns of a phase or step, so later turns start small too), the
 * conversation is trimmed to it, and the same turn is asked again. At the minimum the overflow is thrown.
 */
export async function askWithinContext(
  chat: Chat,
  messages: ChatMessage[],
  tools: ToolSpec[],
  budget: { chars: number },
  log: (event: Record<string, unknown>) => void,
): Promise<ChatMessage> {
  for (;;) {
    trimContext(messages, budget.chars);
    try {
      return await chat(messages, tools);
    } catch (e) {
      if (!(e instanceof ContextExceededError) || budget.chars <= MIN_CONTEXT_CHARS) throw e;
      budget.chars = Math.max(MIN_CONTEXT_CHARS, Math.floor(budget.chars / 2));
      log({ event: "context_exceeded", budget: budget.chars, message: (e as Error).message.slice(0, 300) });
    }
  }
}

/** The driver has already run the start check, so the model need not spend a turn on it. */
export function withoutStartCheck(body: string, phase: Phase): string {
  const line = new RegExp(`^1\\. \`phase_check\\(phase: "${phase}", step: "start"\\)\`.*$`, "m");
  return body.replace(line, "1. (Already done for you: the start check passed.)");
}

interface ProgressStep {
  id?: string;
  step: string;
  call?: string;
  why?: string;
  /** A call the driver runs itself (progress.ts `auto`). */
  auto?: { tool: string; args: Record<string, unknown> };
}

/** Open steps as a short list for the model ("" when there are none). */
export function planText(open: ProgressStep[], heading: string): string {
  if (!open.length) return "";
  const lines = open.slice(0, 12).map((o) => `- ${o.step}${o.call ? `: ${o.call}` : ""}${o.why ? ` (${o.why})` : ""}`);
  if (open.length > 12) lines.push(`- ... and ${open.length - 12} more (get_progress lists them)`);
  return `${heading ? `\n\n${heading}:` : ""}\n${lines.join("\n")}`;
}

export function checkOk(text: string): { ok: boolean; skipped: boolean; errors: string[] } {
  try {
    const r = JSON.parse(text) as { ok?: boolean; skipped?: boolean; errors?: string[]; stop?: string; error?: string };
    return { ok: r.ok === true, skipped: r.skipped === true, errors: r.errors ?? [r.stop ?? r.error ?? "phase check failed"].filter(Boolean) };
  } catch {
    return { ok: false, skipped: false, errors: [text.slice(0, 300)] };
  }
}

/**
 * One tool call of the model: arguments parsed, coerced to the schema and checked against the build spec before the
 * call (a refusal names the field), then run. `text` is what the model sees (with the server's progress line).
 */
export async function runTool(
  call: ToolCall,
  byName: Map<string, HostTool>,
  host: ToolHost,
  log: (event: Record<string, unknown>) => void,
): Promise<{ text: string; isError: boolean; refused: boolean; args?: Record<string, unknown>; raw?: string }> {
  const refuse = (error: string, extra: Record<string, unknown> = {}, args?: Record<string, unknown>) => {
    log({ event: "refused", tool: call.name, error, ...extra, ...(args ? { args } : {}) });
    return { text: JSON.stringify({ ok: false, error, ...extra }), isError: true, refused: true };
  };
  const tool = byName.get(call.name);
  if (!tool) return refuse(`There is no tool "${call.name}" here. Tools: ${[...byName.keys()].join(", ")}`);
  const parsed = parseArgs(call);
  if (typeof parsed === "string") return refuse(parsed);
  const { args, errors } = coerceArgs(tool.inputSchema, parsed);
  const problems = errors.length ? errors : specErrors(call.name, args);
  if (problems.length) return { ...refuse("Fix these fields and call the tool again.", { fields: problems.slice(0, 6) }, args), args };
  const out = await host.callTool(call.name, args);
  log({ event: "tool", tool: call.name, args, isError: out.isError, result: out.text.slice(0, 800) });
  // A missing tool or game folder: no argument fixes it, so the run stops here instead of the model retrying.
  if (isSetupError(out.text)) {
    log({ event: "setup_error", tool: call.name, error: out.text.slice(0, 400) });
    throw new SetupError(call.name, out.text);
  }
  return { text: out.footer ? `${out.text}\n\n${out.footer}` : out.text, isError: out.isError, refused: false, args, raw: out.text };
}

/**
 * Run the driver-run steps (progress.ts `auto`) of these phases, one at a time, reading the progress again after each:
 * one step can make the next possible (the DM area needs the guide). Each call is tried once.
 */
export async function runAutoSteps(host: ToolHost, allTools: HostTool[], phases: string[], log: (event: Record<string, unknown>) => void): Promise<number> {
  const tried = new Set<string>();
  let ran = 0;
  for (let round = 0; round < 40; round++) {
    let next: { id?: string; auto: { tool: string; args: Record<string, unknown> } } | undefined;
    for (const ph of phases) {
      let open: Array<{ id?: string; auto?: { tool: string; args: Record<string, unknown> } }> = [];
      try {
        open = (JSON.parse((await host.callTool("get_progress", { phase: ph })).text) as { open?: typeof open }).open ?? [];
      } catch {
        open = [];
      }
      const o = open.find((x) => x.auto && allTools.some((t) => t.name === x.auto?.tool) && !tried.has(callSignature(x.auto.tool, x.auto.args)));
      if (o?.auto) {
        next = { id: o.id, auto: o.auto };
        break;
      }
    }
    if (!next) break;
    tried.add(callSignature(next.auto.tool, next.auto.args));
    const r = await host.callTool(next.auto.tool, next.auto.args);
    ran++;
    log({ event: "driver_step", id: next.id, tool: next.auto.tool, args: next.auto.args, isError: r.isError, result: r.text.slice(0, 300) });
  }
  return ran;
}

export async function runPhase(host: ToolHost, chat: Chat, phase: Phase, options: RunPhaseOptions = {}): Promise<PhaseResult> {
  const maxSteps = options.maxSteps ?? 60;
  const retries = options.retries ?? 3;
  const maxResult = options.maxResultChars ?? 6000;
  const budget = { chars: options.contextChars ?? 48_000 };
  const log = options.onEvent ?? (() => {});
  const result: PhaseResult = { phase, status: "failed", steps: 0, toolCalls: 0, errors: [] };

  const prompt = loadPhasePrompt(phase);
  const profile = resolveToolProfile(prompt.profile.join(","));
  const allTools = await host.listTools();
  // The plot is written as checked JSON (write_plot), never as free text: a small model's free-text plot named
  // tilesets, people and quests the later phases could not match (The Old Mill and Millers Daughter, 2026-11-18/19).
  const typedPlot = phase === "plot" && allTools.some((t) => t.name === "write_plot");
  const hostTools = allTools.filter((t) => isToolAllowed(t.name, profile) && !DRIVER_ONLY.has(t.name) && !(typedPlot && t.name === "write_story_section"));
  const hasProgress = allTools.some((t) => t.name === "get_progress");
  const byName = new Map(hostTools.map((t) => [t.name, t]));
  const toolSpecs: ToolSpec[] = hostTools.map((t) => ({ name: t.name, description: t.description, parameters: t.inputSchema as Record<string, unknown> }));

  const start = checkOk((await host.callTool("phase_check", { phase, step: "start" })).text);
  if (start.skipped) return { ...result, status: "skipped" };
  if (!start.ok) return { ...result, status: "blocked", reason: start.errors[0], errors: start.errors };

  // The plan: this phase's open steps as get_progress sees them in the module (per area, NPC, quest...).
  const openSteps = async (): Promise<ProgressStep[]> => {
    if (!hasProgress) return [];
    try {
      const r = JSON.parse((await host.callTool("get_progress", { phase })).text) as { open?: ProgressStep[] };
      return (r.open ?? []).filter((o) => !/\.(check|section)$/.test(o.id ?? ""));
    } catch {
      return [];
    }
  };
  // Steps that leave no choice (progress.ts `auto`): run by the driver before the model is asked, as in step mode.
  if (hasProgress) await runAutoSteps(host, allTools, [phase], log);
  const planAtStart = await openSteps();
  if (planAtStart.length) log({ event: "plan", open: planAtStart.map((o) => o.step) });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: options.intro ?? `${withoutStartCheck(prompt.body, phase)}${planText(planAtStart, "Steps open in this phase now (get_progress)")}\n\nBegin with step 2.` },
  ];
  // phase_check judges the phase; get_progress may still list steps it does not check (a map pin, an NPC). The model
  // is told once and may then finish.
  let nudged = false;
  const accept = async (): Promise<boolean> => {
    if (nudged) return true;
    const open = await openSteps();
    if (!open.length) return true;
    nudged = true;
    log({ event: "progress_open", open: open.map((o) => o.step) });
    messages.push({
      role: "user",
      content: `phase_check passed, but these steps of the phase are still open:${planText(open, "")}\nDo them now (leave out one the story does not need), then call phase_check(phase: "${phase}", step: "end") again.`,
    });
    return false;
  };
  let failedChecks = 0;
  let lastFailing = "";
  let sameFailures = 0;

  const judge = async (): Promise<boolean> => {
    const end = checkOk((await host.callTool("phase_check", { phase, step: "end" })).text);
    log({ event: "phase_check_end", by: "driver", ok: end.ok, errors: end.errors.slice(0, 10) });
    if (end.ok) return accept();
    result.errors = end.errors;
    failedChecks++;
    messages.push({
      role: "user",
      content: `The phase is not finished. phase_check reports:\n${end.errors.slice(0, 5).map((e) => `- ${e}`).join("\n")}\nRepair these with the tools, then call phase_check(phase: "${phase}", step: "end").`,
    });
    return false;
  };

  while (result.steps < maxSteps) {
    if (failedChecks > retries) return { ...result, reason: `the phase check failed ${failedChecks} times` };
    const reply = await askWithinContext(chat, messages, toolSpecs, budget, log);
    result.steps++;
    messages.push(reply);
    log({ event: "model", step: result.steps, content: reply.content.slice(0, 500), calls: reply.tool_calls?.map((c) => c.name) ?? [] });

    if (!reply.tool_calls?.length) {
      // The model stopped calling tools: it believes it is done, or it is lost. The phase check decides.
      if (await judge()) return { ...result, status: "success", errors: [] };
      continue;
    }

    for (const call of reply.tool_calls) {
      result.toolCalls++;
      const out = await runTool(call, byName, host, log);
      messages.push({ role: "tool", tool_call_id: call.id, content: clip(out.text, maxResult) });
      // The same failing call again and again (refused before the call or failed in it): warn once, then stop. A
      // repair pass sent one refused create_dialog 50 times (The Old Mill, 2026-11-18).
      // A successful call repeated is as stuck as a failing one: list_tilesets 57 times in a row (The Old Mill).
      const signature = callSignature(call.name, out.args ?? call.arguments);
      if (signature === lastFailing) sameFailures++;
      else sameFailures = 0;
      lastFailing = signature;
      if (sameFailures === 1 && !out.isError) {
        messages.push({ role: "user", content: `You already have the result of this ${call.name} call. Use it and go on to the next step; do not call it again.` });
      }
      if (sameFailures === 2) {
        messages.push({ role: "user", content: `You repeated the same call to ${call.name}. ${out.isError ? "Read its error and change the arguments" : "Use the answer you have"}, or go on to the next step.` });
      }
      if (sameFailures >= STUCK_REPEATS) {
        log({ event: "stuck", tool: call.name, repeats: sameFailures + 1 });
        return { ...result, reason: `stuck: the same call to ${call.name} ${sameFailures + 1} times in a row` };
      }
      if (out.refused || !out.args) continue;
      const args = out.args;

      if (call.name === "phase_check" && args.phase === phase && args.step === "end") {
        const end = checkOk(out.raw ?? out.text);
        if (end.ok) {
          if (await accept()) return { ...result, status: "success", errors: [] };
          continue;
        }
        result.errors = end.errors;
        failedChecks++;
      }
    }
  }
  return { ...result, reason: `stopped after ${maxSteps} model turns` };
}
