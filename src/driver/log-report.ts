/**
 * Reads a driver run's transcripts (driver-log/<stamp>-<phase>.jsonl) and says where the model got stuck: the
 * patterns found by hand in five real runs (2026-11-18/19) - the same call repeated, refusals by field, names the
 * module does not have, steps left open, setup errors - so the next run's log is read in seconds.
 *
 *   node dist/cli/drive.js --report <driver-log folder> [--json]
 *
 * Pure: `analyzeRun` takes the parsed events per phase; the CLI does the file reading.
 */

import { callSignature } from "./run-phase.js";

export type LogEvent = Record<string, unknown> & { event: string };

export interface PhaseReport {
  phase: string;
  modelTurns: number;
  toolCalls: number;
  failedCalls: number;
  refusedCalls: number;
  driverSteps: number;
  driverStepsFailed: number;
  stepsDone: number;
  stepsLeftOpen: string[];
  phaseCheck?: { ok: boolean; errors: string[] };
  repair: boolean;
  /** The same call (tool and arguments, in any order) several times in a row. */
  repeats: Array<{ tool: string; times: number; args: string; outcome: string }>;
  /** Refusals before the call, by tool and field. */
  refusedFields: Array<{ tool: string; field: string; message: string; times: number }>;
  /** Failures that name something the module does not have (a creature, area, blueprint, container, dialog). */
  unknownNames: Array<{ tool: string; name: string; message: string }>;
  /** The most frequent failure messages, by tool. */
  failures: Array<{ tool: string; message: string; times: number }>;
  stuck: string[];
  setupErrors: string[];
}

export interface RunReport {
  phases: PhaseReport[];
  /** One line per finding, worst first. */
  findings: string[];
}

/** A failure message with the varying parts (numbers, quoted values, paths) replaced, so like failures group. */
export function messageShape(text: string): string {
  let t = text;
  try {
    const v = JSON.parse(text) as Record<string, unknown>;
    t = String(v.error ?? v.detail ?? v.message ?? text);
  } catch {
    // plain text
  }
  return t
    .replace(/\s+/g, " ")
    .replace(/\/[\w./-]+/g, "<path>")
    .replace(/(?<![\w.])-?\d+(\.\d+)?(?![\w])/g, "<n>")
    .slice(0, 140);
}

const UNKNOWN = [
  /no creature with tag or blueprint (\S+)/i,
  /Blueprint not found: (\S+?)\.ut[a-z]/i,
  /Source blueprint not found: (\S+?)\.ut[a-z]/i,
  /Container '([^']+)' not found/i,
  /'([^']+)' is not a container/i,
  /No area (\S+?)[.,]/i,
  /There is no area "([^"]+)"/i,
  /No trigger tagged (\S+)/i,
  /references "([^"]+)" but no \S+ exists/i,
];

/** The name a failure says the module does not have, if it says so. */
export function unknownName(text: string): string | undefined {
  for (const re of UNKNOWN) {
    const m = re.exec(text);
    if (m) return m[1].replace(/[".,]+$/, "");
  }
  return undefined;
}

export function analyzePhase(phase: string, events: LogEvent[]): PhaseReport {
  const r: PhaseReport = {
    phase,
    modelTurns: 0,
    toolCalls: 0,
    failedCalls: 0,
    refusedCalls: 0,
    driverSteps: 0,
    driverStepsFailed: 0,
    stepsDone: 0,
    stepsLeftOpen: [],
    repair: false,
    repeats: [],
    refusedFields: [],
    unknownNames: [],
    failures: [],
    stuck: [],
    setupErrors: [],
  };
  const fields = new Map<string, { tool: string; field: string; message: string; times: number }>();
  const failures = new Map<string, { tool: string; message: string; times: number }>();
  let streak: { sig: string; tool: string; times: number; args: string; outcome: string } | undefined;
  const closeStreak = () => {
    if (streak && streak.times >= 3) r.repeats.push({ tool: streak.tool, times: streak.times, args: streak.args.slice(0, 160), outcome: streak.outcome });
    streak = undefined;
  };
  for (const e of events) {
    switch (e.event) {
      case "model":
        r.modelTurns++;
        break;
      case "step":
        closeStreak();
        break;
      case "tool":
      case "refused": {
        r.toolCalls++;
        const tool = String(e.tool ?? "?");
        const refused = e.event === "refused";
        const failed = refused || e.isError === true;
        const text = String(refused ? (e.error ?? "") : (e.result ?? ""));
        if (refused) {
          r.refusedCalls++;
          for (const f of (e.fields as Array<{ field?: string; message?: string }> | undefined) ?? []) {
            const key = `${tool}|${f.field}|${f.message}`;
            const got = fields.get(key);
            if (got) got.times++;
            else fields.set(key, { tool, field: String(f.field), message: String(f.message ?? "").replace(/; fields: .*/, ""), times: 1 });
          }
        } else if (failed) r.failedCalls++;
        if (failed && !refused) {
          const shape = messageShape(text);
          const key = `${tool}|${shape}`;
          const got = failures.get(key);
          if (got) got.times++;
          else failures.set(key, { tool, message: shape, times: 1 });
          const name = unknownName(text);
          if (name && !r.unknownNames.some((u) => u.tool === tool && u.name === name)) r.unknownNames.push({ tool, name, message: shape });
        }
        // A phase_check the model ran itself (a repair pass) also decides the phase.
        if (tool === "phase_check" && !refused && (e.args as Record<string, unknown> | undefined)?.phase === phase && (e.args as Record<string, unknown>).step === "end") {
          const ok = /"ok":\s*true/.test(text);
          r.phaseCheck = { ok, errors: ok ? [] : (r.phaseCheck?.errors ?? []) };
        }
        const sig = callSignature(tool, e.args ?? {});
        const outcome = refused ? "refused" : failed ? "failed" : "ok";
        if (streak && streak.sig === sig) streak.times++;
        else {
          closeStreak();
          streak = { sig, tool, times: 1, args: JSON.stringify(e.args ?? {}), outcome };
        }
        break;
      }
      case "driver_step":
        r.driverSteps++;
        if (e.isError === true) r.driverStepsFailed++;
        break;
      case "step_done":
        r.stepsDone++;
        break;
      case "step_left_open":
        r.stepsLeftOpen.push(String(e.step ?? e.id));
        break;
      case "phase_check_end":
        r.phaseCheck = { ok: e.ok === true, errors: ((e.errors as string[] | undefined) ?? []).slice(0, 8) };
        break;
      case "repair":
        r.repair = true;
        closeStreak();
        break;
      case "stuck":
        r.stuck.push(`${String(e.tool)} x${String(e.repeats)}${e.id ? ` (${String(e.id)})` : ""}`);
        break;
      case "setup_error":
        r.setupErrors.push(`${String(e.tool)}: ${String(e.error ?? "").slice(0, 200)}`);
        break;
    }
  }
  closeStreak();
  r.refusedFields = [...fields.values()].sort((a, b) => b.times - a.times).slice(0, 10);
  r.failures = [...failures.values()].sort((a, b) => b.times - a.times).slice(0, 10);
  return r;
}

export function analyzeRun(byPhase: Array<{ phase: string; events: LogEvent[] }>): RunReport {
  const phases = byPhase.map((p) => analyzePhase(p.phase, p.events));
  const findings: string[] = [];
  for (const p of phases) {
    for (const s of p.setupErrors) findings.push(`${p.phase}: setup error - ${s}`);
    if (p.phaseCheck && !p.phaseCheck.ok) findings.push(`${p.phase}: phase check failed - ${p.phaseCheck.errors.slice(0, 3).join("; ")}`);
    for (const s of p.stuck) findings.push(`${p.phase}: stuck - ${s}`);
    for (const x of p.repeats) findings.push(`${p.phase}: ${x.tool} called ${x.times} times in a row with the same arguments (${x.outcome})`);
    for (const u of p.unknownNames) findings.push(`${p.phase}: ${u.tool} used "${u.name}", which the module does not have - ${u.message}`);
    for (const f of p.refusedFields.filter((x) => x.times >= 2)) findings.push(`${p.phase}: ${f.tool} refused ${f.times} times for ${f.field}: ${f.message}`);
    for (const s of p.stepsLeftOpen) findings.push(`${p.phase}: step left open - ${s}`);
    if (p.driverStepsFailed) findings.push(`${p.phase}: ${p.driverStepsFailed} of ${p.driverSteps} driver-run steps failed`);
  }
  return { phases, findings };
}

/** The report as short markdown. */
export function renderReport(run: RunReport): string {
  const out: string[] = ["# Driver run report", ""];
  out.push("| phase | model turns | tool calls | failed | refused | driver steps | steps done | left open | check |", "|---|---|---|---|---|---|---|---|---|");
  for (const p of run.phases) {
    const check = p.phaseCheck ? (p.phaseCheck.ok ? "pass" : "FAIL") : "-";
    out.push(`| ${p.phase} | ${p.modelTurns} | ${p.toolCalls} | ${p.failedCalls} | ${p.refusedCalls} | ${p.driverSteps}${p.driverStepsFailed ? ` (${p.driverStepsFailed} failed)` : ""} | ${p.stepsDone} | ${p.stepsLeftOpen.length} | ${check}${p.repair ? " after repair" : ""} |`);
  }
  out.push("", "## Findings", "");
  out.push(...(run.findings.length ? run.findings.map((f) => `- ${f}`) : ["- none: every phase passed without repeats, refusals or unknown names"]));
  const fails = run.phases.flatMap((p) => p.failures.filter((f) => f.times >= 2).map((f) => `- ${p.phase}: ${f.tool} x${f.times}: ${f.message}`));
  if (fails.length) out.push("", "## Repeated failures", "", ...fails);
  return out.join("\n");
}
