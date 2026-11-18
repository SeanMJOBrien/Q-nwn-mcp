/**
 * Runs one adventure phase with a small model: the short phase prompt, only the phase's tools, repaired
 * arguments, field-named errors, a step limit, and `phase_check` as the judge of "done".
 *
 * The model and the tool host are injected, so the loop is tested without a model or a game install.
 */

import { type Phase } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { isToolAllowed, resolveToolProfile } from "../tool-profiles.js";
import { validateSpec } from "../util/spec-validate.js";
import { coerceArgs, type JsonSchemaObject } from "./coerce.js";
import type { Chat, ChatMessage, ToolCall, ToolSpec } from "./llm.js";

export interface HostTool {
  name: string;
  description: string;
  inputSchema: JsonSchemaObject;
}

export interface ToolHost {
  listTools(): Promise<HostTool[]>;
  callTool(name: string, args: Record<string, unknown>): Promise<{ text: string; isError: boolean }>;
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
}

export interface PhaseResult {
  phase: Phase;
  status: "success" | "failed" | "skipped" | "blocked";
  steps: number;
  toolCalls: number;
  /** Why it stopped, when not a success. */
  reason?: string;
  errors: string[];
}

/** Tools the driver runs itself; never shown to the model. */
const DRIVER_ONLY = new Set(["load_module", "repack_module", "get_phase_prompt"]);

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

function parseArgs(call: ToolCall): Record<string, unknown> | string {
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

function clip(text: string, max: number): string {
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
}

/** Open steps as a short list for the model ("" when there are none). */
export function planText(open: ProgressStep[], heading: string): string {
  if (!open.length) return "";
  const lines = open.slice(0, 12).map((o) => `- ${o.step}${o.call ? `: ${o.call}` : ""}${o.why ? ` (${o.why})` : ""}`);
  if (open.length > 12) lines.push(`- ... and ${open.length - 12} more (get_progress lists them)`);
  return `${heading ? `\n\n${heading}:` : ""}\n${lines.join("\n")}`;
}

function checkOk(text: string): { ok: boolean; skipped: boolean; errors: string[] } {
  try {
    const r = JSON.parse(text) as { ok?: boolean; skipped?: boolean; errors?: string[]; stop?: string; error?: string };
    return { ok: r.ok === true, skipped: r.skipped === true, errors: r.errors ?? [r.stop ?? r.error ?? "phase check failed"].filter(Boolean) };
  } catch {
    return { ok: false, skipped: false, errors: [text.slice(0, 300)] };
  }
}

export async function runPhase(host: ToolHost, chat: Chat, phase: Phase, options: RunPhaseOptions = {}): Promise<PhaseResult> {
  const maxSteps = options.maxSteps ?? 60;
  const retries = options.retries ?? 3;
  const maxResult = options.maxResultChars ?? 6000;
  const budget = options.contextChars ?? 48_000;
  const log = options.onEvent ?? (() => {});
  const result: PhaseResult = { phase, status: "failed", steps: 0, toolCalls: 0, errors: [] };

  const prompt = loadPhasePrompt(phase);
  const profile = resolveToolProfile(prompt.profile.join(","));
  const allTools = await host.listTools();
  const hostTools = allTools.filter((t) => isToolAllowed(t.name, profile) && !DRIVER_ONLY.has(t.name));
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
  const planAtStart = await openSteps();
  if (planAtStart.length) log({ event: "plan", open: planAtStart.map((o) => o.step) });

  const messages: ChatMessage[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: `${withoutStartCheck(prompt.body, phase)}${planText(planAtStart, "Steps open in this phase now (get_progress)")}\n\nBegin with step 2.` },
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
    trimContext(messages, budget);
    const reply = await chat(messages, toolSpecs);
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
      const answer = (text: string) => messages.push({ role: "tool", tool_call_id: call.id, content: clip(text, maxResult) });
      const refuse = (error: string, extra: Record<string, unknown> = {}) => {
        log({ event: "refused", tool: call.name, error, ...extra });
        answer(JSON.stringify({ ok: false, error, ...extra }));
      };
      const tool = byName.get(call.name);
      if (!tool) {
        refuse(`There is no tool "${call.name}" in this phase. Tools: ${[...byName.keys()].join(", ")}`);
        continue;
      }
      const parsed = parseArgs(call);
      if (typeof parsed === "string") {
        refuse(parsed);
        continue;
      }
      const { args, errors } = coerceArgs(tool.inputSchema, parsed);
      const problems = errors.length ? errors : specErrors(call.name, args);
      if (problems.length) {
        refuse("Fix these fields and call the tool again.", { fields: problems.slice(0, 6) });
        continue;
      }

      const out = await host.callTool(call.name, args);
      log({ event: "tool", tool: call.name, args, isError: out.isError, result: out.text.slice(0, 800) });
      answer(out.text);

      const signature = `${call.name} ${JSON.stringify(args)}`;
      if (out.isError && signature === lastFailing) sameFailures++;
      else sameFailures = 0;
      lastFailing = out.isError ? signature : "";
      if (sameFailures >= 2) {
        messages.push({ role: "user", content: `You repeated the same failing call to ${call.name}. Read its error and change the arguments, or go on to the next step.` });
        sameFailures = 0;
      }

      if (call.name === "phase_check" && args.phase === phase && args.step === "end") {
        const end = checkOk(out.text);
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
