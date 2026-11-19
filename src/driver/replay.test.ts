/**
 * Replay tests: a real model's recorded calls from the 2026-11-18/19 runs (src/driver/fixtures/, paths removed) fed back
 * through the step-mode driver, each against a host that answers with the recorded results. They keep the incidents
 * fixed: a model repeating one failing call must be stopped, whatever order its arguments come in.
 *
 * The scripted model plays the recorded turns of one step in order; once they run out it says DONE. The host answers
 * each call with the result recorded for the same call (tool and arguments in any order), and keeps the step open.
 */

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeRun, type LogEvent } from "./log-report.js";
import type { ChatMessage, ToolCall } from "./llm.js";
import { callSignature, STUCK_REPEATS, type ToolHost } from "./run-phase.js";
import { runPhaseSteps } from "./run-steps.js";

const fixture = (name: string): LogEvent[] =>
  fs
    .readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as LogEvent);

/** The events of the first conversation(s) about one step, up to the next step or the phase check. */
function stepEvents(events: LogEvent[], stepId: string, from = 0): LogEvent[] {
  const start = events.findIndex((e, i) => i >= from && e.event === "step" && e.id === stepId);
  const out: LogEvent[] = [];
  for (let i = start; i >= 0 && i < events.length; i++) {
    const e = events[i];
    if (i > start && ((e.event === "step" && e.id !== stepId) || e.event === "phase_check_end" || e.event === "step_left_open")) break;
    out.push(e);
  }
  return out;
}

/** The model's recorded turns: each turn's tool calls with the arguments its tool or refused events carried. */
function recordedTurns(events: LogEvent[]): ChatMessage[] {
  const turns: ChatMessage[] = [];
  let n = 0;
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.event !== "model") continue;
    const names = (e.calls as string[]) ?? [];
    if (!names.length) {
      turns.push({ role: "assistant", content: String(e.content ?? "DONE") || "DONE" });
      continue;
    }
    const calls: ToolCall[] = [];
    let j = i + 1;
    for (const name of names) {
      while (j < events.length && !((events[j].event === "tool" || events[j].event === "refused") && events[j].tool === name)) j++;
      const args = (events[j]?.args as Record<string, unknown> | undefined) ?? {};
      calls.push({ id: `c${++n}`, name, arguments: JSON.stringify(args) });
      j++;
    }
    turns.push({ role: "assistant", content: "", tool_calls: calls });
  }
  return turns;
}

/** A host that answers with the recorded results and keeps the one step open. */
function replayHost(events: LogEvent[], stepId: string, step: string) {
  const answers = new Map<string, Array<{ text: string; isError: boolean }>>();
  const tools = new Set<string>(["phase_check", "get_progress", "get_area_card", "read_story", "get_result", "undo_last_change"]);
  for (const e of events) {
    if (e.event !== "tool") continue;
    const tool = String(e.tool);
    tools.add(tool);
    const sig = callSignature(tool, e.args ?? {});
    const list = answers.get(sig) ?? [];
    list.push({ text: String(e.result ?? ""), isError: e.isError === true });
    answers.set(sig, list);
  }
  for (const e of events) if (e.event === "refused" || e.event === "model") for (const t of (e.calls as string[] | undefined) ?? [String(e.tool ?? "")]) if (t) tools.add(t);
  const calls: string[] = [];
  const host: ToolHost = {
    listTools: async () => [...tools].map((name) => ({ name, description: name, inputSchema: { type: "object" } })),
    callTool: async (name, args) => {
      if (name === "get_progress") return { text: JSON.stringify({ open: [{ id: stepId, step, tools: [...tools] }] }), isError: false };
      if (name === "phase_check") return { text: JSON.stringify({ ok: args.step === "start", errors: ["the step is still open"] }), isError: false };
      if (["get_area_card", "read_story", "get_result", "undo_last_change"].includes(name)) return { text: "", isError: false };
      calls.push(name);
      const list = answers.get(callSignature(name, args));
      const a = list && list.length > 1 ? list.shift() : list?.[0];
      return a ?? { text: JSON.stringify({ ok: true }), isError: false };
    },
  };
  return { host, calls };
}

async function replay(file: string, phase: "actors" | "quests" | "affordances", stepId: string) {
  const all = fixture(file);
  const events = stepEvents(all, stepId);
  const step = String(events[0]?.step ?? stepId);
  const turns = recordedTurns(events);
  const { host, calls } = replayHost(events, stepId, step);
  const log: LogEvent[] = [];
  let t = 0;
  const chat = async (): Promise<ChatMessage> => turns[t++] ?? { role: "assistant", content: "DONE" };
  await runPhaseSteps(host, chat, phase, { stepTries: 1, maxSteps: 1, onEvent: (e) => log.push(e as LogEvent) });
  return { calls, log, turns };
}

describe("replays of real runs", () => {
  it("run 5: the model asking build_quest for an invented giver is stopped after five identical calls", async () => {
    const { calls, log } = await replay("run5-quests.jsonl", "quests", "quests.rescue_the_millers_daughter");
    expect(log.some((e) => e.event === "stuck" && e.tool === "build_quest")).toBe(true);
    expect(calls.filter((c) => c === "build_quest").length).toBeLessThanOrEqual(STUCK_REPEATS + 1);
  });

  it("run 4: six create_store_blueprint calls with their keys reordered count as one repeated call", async () => {
    const { calls, log } = await replay("run4-affordances.jsonl", "affordances", "affordances.store.str_general");
    expect(log.some((e) => e.event === "stuck" && e.tool === "create_store_blueprint")).toBe(true);
    // before the fix all six reached the host; the run of identical calls is now cut at five
    const lastPlace = calls.lastIndexOf("place_store");
    const firstPlace = calls.indexOf("place_store");
    expect(calls.slice(firstPlace + 1, lastPlace < firstPlace + 1 ? undefined : lastPlace).filter((c) => c === "create_store_blueprint").length).toBeLessThanOrEqual(STUCK_REPEATS + 1);
  });

  it("run 3: build_key_npc repeated after its first success is stopped", async () => {
    const { log, calls } = await replay("run3-actors.jsonl", "actors", "actors.bandit_leader");
    expect(log.some((e) => e.event === "stuck")).toBe(true);
    expect(calls.filter((c) => c === "build_key_npc").length).toBeLessThanOrEqual(STUCK_REPEATS + 1);
  });
});

describe("the run report on real logs", () => {
  it("names the invented giver, the repeated call and the open step of run 5", () => {
    const report = analyzeRun([{ phase: "quests", events: fixture("run5-quests.jsonl") }]);
    const text = report.findings.join("\n");
    expect(text).toContain('build_quest used "farmer_ned", which the module does not have');
    expect(text).toContain("build_quest called 5 times in a row with the same arguments (failed)");
    expect(text).toContain("stuck - build_quest x5");
    expect(text).toContain('step left open - quest "Rescue the Millers Daughter"');
  });

  it("groups run 4's reordered store calls as one repeat and finds the invented chest", () => {
    const report = analyzeRun([{ phase: "affordances", events: fixture("run4-affordances.jsonl") }]);
    const text = report.findings.join("\n");
    expect(text).toMatch(/create_store_blueprint called [56] times in a row/);
    expect(text).toContain('add_items_to_container used "chest_crypt1"');
    expect(text).toContain('create_store_blueprint used "uti_str_general"');
  });
});
