#!/usr/bin/env node
/**
 * Adventure driver: builds a module phase by phase with a small model on an OpenAI-compatible endpoint.
 *
 *   node dist/cli/drive.js --module <project dir | file.mod> --endpoint http://localhost:11434/v1 --model qwen2.5:14b
 *
 * Step mode (the default for areas, environment, actors, quests, challenges and affordances; src/driver/run-steps.ts):
 * one short, fresh conversation per open step of get_progress's checklist, with a step card (goal, decisions, the step
 * and its call, the facts from the module, the phase's rules) and only that step's few tools. Phase mode (plot,
 * polish, rewards, or --mode phase): the short phase prompt and the phase's tools in one conversation. Either way the
 * arguments are repaired and checked and `phase_check` decides when the phase is done. A phase already recorded as a
 * success is skipped, so a run can be resumed.
 * The .mod is never built here; that stays a separate, explicit step.
 *
 * Options:
 *   --module <path>          module project directory or .mod to work on
 *   --create <title>         create a new empty module with this title instead (needs NWN_FOLDER_USER)
 *   --endpoint <url>         base URL ending in /v1 (or DRIVE_ENDPOINT, OPENAI_BASE_URL)
 *   --model <name>           model name (or DRIVE_MODEL)
 *   --api-key <key>          bearer token, if the endpoint wants one (or OPENAI_API_KEY)
 *   --phases <a,b,...>       phases to run, in pipeline order (default: all nine)
 *   --force                  run a phase again although it is recorded as a success
 *   --plot <file.json>       a plot written by a person or a stronger model (docs/specs/plot.schema.json): the driver
 *                            writes the Module and Plot sections from it and no model runs the plot phase. Without
 *                            --module or --create, a new module is created with the plot's title
 *   --idea <text> --level <n> --party <n> --minutes <n> --tone <word>
 *                            write the story's Module section when the story has none
 *   --max-steps <n>          model turns per phase (default 60)
 *   --retries <n>            failed phase checks tolerated per phase (default 3)
 *   --context-chars <n>      conversation budget in characters (default 48000)
 *   --mode step|phase        step (default): one conversation per checklist step where the phase has steps;
 *                            phase: one conversation per phase
 *   --step-turns <n>         model turns per step in step mode (default 12)
 *   --escalate-model <name> [--escalate-endpoint <url>] [--escalate-api-key <key>]
 *                            a stronger model that gets one attempt at a phase the first model failed
 *   --log <dir>              where the transcripts go (default: <adventure dir>/driver-log)
 *   --dry-run                show the plan (phases, tools, prompt sizes); call no model, change nothing
 *   --report <dir|file> [--json]
 *                            read a finished run's transcripts (the newest run in a driver-log folder, or one .jsonl)
 *                            and report where the model got stuck: repeated calls, refusals by field, names the module
 *                            does not have, steps left open, failed checks
 *
 * Output: progress lines on stderr, one JSON summary on stdout. Exit code 0 when every phase ended as
 * success or skipped, 2 when a phase failed or was blocked, 1 on a usage or connection error.
 */

import fs from "fs";
import path from "path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { JsonSchemaObject } from "../driver/coerce.js";
import { type Chat, openAiChat } from "../driver/llm.js";
import { type PhaseResult, type ToolHost, runAutoSteps, runPhase } from "../driver/run-phase.js";
import { runPhaseSteps, STEP_PHASES } from "../driver/run-steps.js";
import { analyzeRun, type LogEvent, renderReport } from "../driver/log-report.js";
import { FOOTER_PREFIX } from "../util/result-shaping.js";
import { isToolAllowed, resolveToolProfile } from "../tool-profiles.js";
import { PHASES, type Phase } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { normalizePlotSpec, type PlotSpec, plotWarnings } from "../util/plot-spec.js";
import { loadSettingsFile } from "../util/settings-file.js";
import { SetupError, setupProblems } from "../util/setup-check.js";
import { validateSpec } from "../util/spec-validate.js";

const VALUE_FLAGS = new Set([
  "module", "create", "endpoint", "model", "api-key", "phases", "idea", "level", "party", "minutes", "tone",
  "max-steps", "retries", "context-chars", "mode", "step-turns", "escalate-model", "escalate-endpoint", "escalate-api-key", "log", "plot", "report",
]);
const BOOL_FLAGS = new Set(["force", "dry-run", "help", "json"]);

export function parseDriveArgs(argv: string[]): { flags: Record<string, string>; bools: Set<string>; error?: string } {
  const flags: Record<string, string> = {};
  const bools = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) return { flags, bools, error: `unexpected argument "${a}"` };
    const name = a.slice(2);
    if (BOOL_FLAGS.has(name)) bools.add(name);
    else if (VALUE_FLAGS.has(name)) {
      const v = argv[++i];
      if (v === undefined) return { flags, bools, error: `--${name} needs a value` };
      flags[name] = v;
    } else return { flags, bools, error: `unknown option --${name}` };
  }
  return { flags, bools };
}

export function parsePhases(value: string | undefined): Phase[] {
  if (!value) return [...PHASES];
  const names = value.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const unknown = names.filter((n) => !(PHASES as readonly string[]).includes(n));
  if (unknown.length) throw new Error(`unknown phase(s): ${unknown.join(", ")}. Phases: ${PHASES.join(", ")}`);
  return PHASES.filter((p) => names.includes(p));
}

const say = (line: string) => process.stderr.write(`${line}\n`);

function finish(code: number, summary: Record<string, unknown>): never {
  fs.writeSync(1, `${JSON.stringify(summary, null, 2)}\n`);
  process.exit(code);
}

async function main(): Promise<void> {
  const { flags, bools, error } = parseDriveArgs(process.argv.slice(2));
  if (error || bools.has("help")) {
    say(error ? `error: ${error}` : "");
    say("usage: drive --module <dir|.mod> | --create <title>  --endpoint <url/v1> --model <name> [--phases a,b] [--dry-run] (see the header of src/cli/drive.ts)");
    process.exit(error ? 1 : 0);
  }
  // A finished run's transcripts: where the model got stuck (src/driver/log-report.ts). No server, no model.
  if (flags.report) {
    const run = readRunLogs(flags.report);
    if ("error" in run) finish(1, { ok: false, error: run.error });
    const report = analyzeRun(run.phases);
    if (bools.has("json")) finish(0, { ok: true, stamp: run.stamp, ...report });
    fs.writeSync(1, `${renderReport(report)}\n\n(${run.stamp}: ${run.phases.map((p) => p.phase).join(", ")})\n`);
    process.exit(0);
  }
  const dryRun = bools.has("dry-run");
  const endpoint = flags.endpoint ?? process.env.DRIVE_ENDPOINT ?? process.env.OPENAI_BASE_URL;
  const model = flags.model ?? process.env.DRIVE_MODEL;
  let phases: Phase[];
  try {
    phases = parsePhases(flags.phases);
  } catch (e) {
    finish(1, { ok: false, error: (e as Error).message });
  }
  let plot: PlotSpec | undefined;
  if (flags.plot) {
    const read = readPlotFile(flags.plot);
    if ("errors" in read) finish(1, { ok: false, error: `--plot ${flags.plot}: the plot has errors`, fields: read.errors });
    plot = read.plot;
    if (!flags.module && !flags.create) flags.create = plot.title;
  }
  const plotInfo = plot ? { plot: { file: flags.plot, locations: plot.locations.length, quests: plot.quests.length, warnings: plotWarnings(plot) } } : {};
  if (!flags.module && !flags.create) finish(1, { ok: false, error: "give --module <project dir | .mod> or --create <title>" });
  if (!dryRun && (!endpoint || !model)) finish(1, { ok: false, error: "give --endpoint and --model (or DRIVE_ENDPOINT and DRIVE_MODEL)" });
  const mode = (flags.mode ?? "step").toLowerCase();
  if (mode !== "step" && mode !== "phase") finish(1, { ok: false, error: "--mode is step or phase" });

  // The tools and game folders, before a model is asked anything: a missing tool otherwise fails every step.
  loadSettingsFile();
  const setup = setupProblems();
  if (setup.length && !dryRun) {
    finish(1, { ok: false, error: "The machine is not set up for building modules; nothing was run.", setup, fix: "Set the paths in nwn-mcp.env (see nwn-mcp.env.example) or the environment, then run again." });
  }

  // One server for the whole run, with every tool: the driver decides per phase which ones the model sees.
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.MCP_TOOL_PROFILE = "";
  env.MCP_BRIEF_RESULTS = "1";
  // The progress line on every result, and long results kept behind an id (src/util/result-shaping.ts).
  env.MCP_PROGRESS_FOOTER = env.MCP_PROGRESS_FOOTER || "1";
  env.MCP_RESULT_LIMIT = env.MCP_RESULT_LIMIT || "6000";
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [path.join(import.meta.dirname, "..", "index.js")],
    env,
    stderr: "ignore",
  });
  const client = new Client({ name: "nwn-adventure-driver", version: "1" });
  await client.connect(transport);

  const host: ToolHost = {
    listTools: async () =>
      (await client.listTools()).tools.map((t) => ({ name: t.name, description: t.description ?? "", inputSchema: t.inputSchema as JsonSchemaObject })),
    callTool: async (name, args) => {
      const r = (await client.callTool({ name, arguments: args }, undefined, { timeout: 600_000 })) as {
        content?: Array<{ type: string; text?: string }>;
        isError?: boolean;
      };
      const parts = (r.content ?? []).map((c) => c.text ?? "");
      const footer = parts.filter((t) => t.startsWith(FOOTER_PREFIX)).join("\n");
      return { text: parts.filter((t) => !t.startsWith(FOOTER_PREFIX)).join("\n"), isError: r.isError === true, ...(footer ? { footer } : {}) };
    },
  };
  const stop = async (code: number, summary: Record<string, unknown>): Promise<never> => {
    await client.close().catch(() => {});
    finish(code, summary);
  };

  // get_progress between phases: the whole build's checklist from the module state (also saved as <Title>-progress.md).
  const progress = async () => {
    try {
      const r = JSON.parse((await host.callTool("get_progress", {})).text) as {
        done: number;
        total: number;
        next: string | { step: string; call?: string };
        progressFile?: string;
      };
      const nextText = typeof r.next === "string" ? r.next : `${r.next.step}${r.next.call ? ` (${r.next.call})` : ""}`;
      return { ...r, nextText };
    } catch {
      return undefined;
    }
  };

  try {
    const allTools = await host.listTools();

    if (dryRun && !flags.module) {
      // Nothing to load: describe the plan from the prompts alone.
      await stop(0, { ok: true, dryRun: true, ...(setup.length ? { setup } : {}), ...plotInfo, phases: phases.map((p) => planRow(p, allTools.map((t) => t.name), mode)) });
    }

    if (flags.create) {
      if (dryRun) await stop(0, { ok: true, dryRun: true, ...(setup.length ? { setup } : {}), wouldCreate: flags.create, ...plotInfo, phases: phases.map((p) => planRow(p, allTools.map((t) => t.name), mode)) });
      const filename = flags.create.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const made = await host.callTool("create_module", { name: flags.create, filename });
      let existing: { exists?: boolean; project?: string; modPath?: string } = {};
      try {
        existing = JSON.parse(made.text) as typeof existing;
      } catch { /* a plain-text answer */ }
      if (made.isError && existing.exists) {
        // Made by an earlier run: continue it, from its project when there is one (every edit is there).
        const from = existing.project ?? existing.modPath ?? "";
        const loaded = await host.callTool("load_module", { modPath: from });
        if (loaded.isError) await stop(1, { ok: false, error: `load_module: ${loaded.text.slice(0, 500)}` });
        say(`continuing the existing module "${flags.create}" from ${from} (delete it and its project to start over)`);
      } else if (made.isError) {
        await stop(1, { ok: false, error: `create_module: ${made.text.slice(0, 500)}` });
      } else say(`created module "${flags.create}"`);
    } else {
      const loaded = await host.callTool("load_module", { modPath: flags.module });
      if (loaded.isError) await stop(1, { ok: false, error: `load_module: ${loaded.text.slice(0, 500)}` });
      say(`loaded ${flags.module}`);
    }

    const dirInfo = JSON.parse((await host.callTool("get_adventure_dir", {})).text) as {
      dir: string;
      files: Record<string, { path: string; exists: boolean }>;
    };
    const done = recordedSuccess(dirInfo.files.status?.path);

    if (dryRun) {
      await stop(0, {
        ok: true,
        dryRun: true,
        ...(setup.length ? { setup } : {}),
        adventureDir: dirInfo.dir,
        storyExists: dirInfo.files.story?.exists ?? false,
        ...plotInfo,
        phases: phases.map((p) => ({ ...planRow(p, allTools.map((t) => t.name), mode), recorded: done.has(p) ? "success (would skip)" : "not done" })),
      });
    }

    // A plot from a file: written by the driver, checked by phase_check; no model runs the plot phase.
    if (plot) {
      const wrote = await host.callTool("write_plot", { spec: JSON.stringify(plot) });
      if (wrote.isError) await stop(1, { ok: false, error: `write_plot: ${wrote.text.slice(0, 800)}` });
      for (const w of (JSON.parse(wrote.text) as { warnings?: string[] }).warnings ?? []) say(`plot: note: ${w}`);
      const end = JSON.parse((await host.callTool("phase_check", { phase: "plot", step: "end" })).text) as { ok?: boolean; errors?: string[]; error?: string };
      if (!end.ok) await stop(2, { ok: false, stoppedAt: "plot", error: "The plot from --plot did not pass the plot phase check.", errors: end.errors ?? [end.error] });
      done.add("plot");
      say(`plot: written from ${flags.plot} (${plot.locations.length} locations, ${plot.quests.length} quests)`);
    }

    // The story's Module section: the facts every phase reads.
    const story = await host.callTool("read_story", { sections: "Module" });
    if (story.isError || story.text.includes("Not in the story yet: Module")) {
      if (!flags.idea) {
        await stop(1, { ok: false, error: "The story has no Module section. Give --idea <text> (and --level, --party, --minutes, --tone) so the driver can write it." });
      }
      const title = flags.create ?? path.basename(dirInfo.dir).replace(/-/g, " ");
      const minutes = Number(flags.minutes ?? 90);
      const body = [
        `- **Title:** ${title}`,
        `- **Target Level:** ${flags.level ?? "3"}`,
        `- **Party Size:** ${flags.party ?? "4"}`,
        `- **Tone:** ${flags.tone ?? "adventurous"}`,
        `- **Difficulty:** standard`,
        `- **Estimated Duration:** ${minutes} minutes`,
        `- **Idea:** ${flags.idea}`,
      ].join("\n");
      const wrote = await host.callTool("write_story_section", { section: "Module", text: body });
      if (wrote.isError) await stop(1, { ok: false, error: `write_story_section: ${wrote.text.slice(0, 300)}` });
      say("wrote the Module section");
    }

    // The goal: a driver run builds the adventure from the plot or the idea; record
    // it so get_progress does not keep asking for it.
    if (!dirInfo.files.scope?.exists) {
      const goal = plot?.premise ?? flags.idea ?? `Build the adventure "${flags.create ?? path.basename(dirInfo.dir).replace(/-/g, " ")}"`;
      // Always the whole adventure: --phases picks this run's phases, not the build's (some_phases would skip the rest
      // in every later run).
      const scoped = await host.callTool("set_project_scope", { kind: "whole_adventure", scope: goal });
      if (!scoped.isError) say("recorded the goal from the plot or idea");
    }

    const logDir = flags.log ?? path.join(dirInfo.dir, "driver-log");
    fs.mkdirSync(logDir, { recursive: true });
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const chat = openAiChat({ endpoint: endpoint as string, model: model as string, apiKey: flags["api-key"] ?? process.env.OPENAI_API_KEY });
    const strong: Chat | undefined = flags["escalate-model"]
      ? openAiChat({
          endpoint: flags["escalate-endpoint"] ?? (endpoint as string),
          model: flags["escalate-model"],
          apiKey: flags["escalate-api-key"] ?? flags["api-key"] ?? process.env.OPENAI_API_KEY,
        })
      : undefined;
    const options = {
      maxSteps: flags["max-steps"] ? Number(flags["max-steps"]) : undefined,
      retries: flags.retries ? Number(flags.retries) : undefined,
      contextChars: flags["context-chars"] ? Number(flags["context-chars"]) : undefined,
      stepTurns: flags["step-turns"] ? Number(flags["step-turns"]) : undefined,
    };

    const results: Array<PhaseResult & { model?: string }> = [];
    for (const phase of phases) {
      if (done.has(phase) && !bools.has("force")) {
        say(`${phase}: already a success, skipped (use --force to run it again)`);
        results.push({ phase, status: "skipped", steps: 0, toolCalls: 0, errors: [], reason: "recorded as success" });
        continue;
      }
      // Driver-run steps of earlier phases that are still open (a step added since that phase passed, e.g. a chest
      // for a fight found later): done before this phase starts.
      const earlier = PHASES.slice(0, PHASES.indexOf(phase)).filter((p) => p !== "plot");
      if (earlier.length && allTools.some((t) => t.name === "get_progress")) {
        const sweepLog = path.join(logDir, `${stamp}-${phase}-sweep.jsonl`);
        const ran = await runAutoSteps(host, allTools, earlier, (e) => fs.appendFileSync(sweepLog, `${JSON.stringify(e)}\n`));
        if (ran) say(`${phase}: first ran ${ran} open driver step(s) of earlier phases`);
      }
      const attempt = async (who: Chat, name: string, suffix: string) => {
        const file = path.join(logDir, `${stamp}-${phase}${suffix}.jsonl`);
        const stepMode = mode === "step" && STEP_PHASES.includes(phase);
        say(`${phase}: started with ${name}${stepMode ? " (one conversation per step)" : ""}`);
        const run = stepMode ? runPhaseSteps : runPhase;
        const r = await run(host, who, phase, {
          ...options,
          onEvent: (e) => {
            fs.appendFileSync(file, `${JSON.stringify(e)}\n`);
            if (e.event === "tool") say(`  ${phase}: ${String(e.tool)}${e.isError ? "  -> error" : ""}`);
            if (e.event === "refused") say(`  ${phase}: ${String(e.tool)}  -> refused before the call`);
            if (e.event === "step") say(`  ${phase}: step: ${String(e.step)}`);
            if (e.event === "step_left_open") say(`  ${phase}: left open after its tries: ${String(e.step)}`);
          },
        });
        say(`${phase}: ${r.status}${r.reason ? ` (${r.reason})` : ""}, ${r.steps} turns, ${r.toolCalls} tool calls${r.openSteps?.length ? `, ${r.openSteps.length} steps left open` : ""}`);
        return r;
      };
      let r = await attempt(chat, model as string, "");
      let used = model as string;
      if (r.status === "failed" && strong) {
        say(`${phase}: handing over to ${flags["escalate-model"]}`);
        r = await attempt(strong, flags["escalate-model"], "-escalated");
        used = flags["escalate-model"];
      }
      results.push({ ...r, model: used });
      if (r.status === "failed" || r.status === "blocked") break; // later phases need this one
      const p = await progress();
      if (p) say(`progress: ${p.done} of ${p.total} steps; next: ${p.nextText}`);
    }
    const finalProgress = await progress();

    const bad = results.find((r) => r.status === "failed" || r.status === "blocked");
    await stop(bad ? 2 : 0, {
      ok: !bad,
      adventureDir: dirInfo.dir,
      log: logDir,
      phases: results,
      ...(finalProgress ? { progress: { done: finalProgress.done, total: finalProgress.total, next: finalProgress.next, file: finalProgress.progressFile } } : {}),
      ...(bad
        ? { stoppedAt: bad.phase, next: `Fix the errors listed for "${bad.phase}" (by hand or with a stronger model), then run again: finished phases are skipped.` }
        : { next: "All requested phases are done. The .mod is not built: build it with repack_module when you want to play." }),
    });
  } catch (e) {
    if (e instanceof SetupError) {
      await stop(1, { ok: false, error: e.message, setup: setupProblems(), fix: "Fix the setup (nwn-mcp.env or the environment), then run the same command again: finished phases are skipped." });
    }
    await stop(1, { ok: false, error: (e as Error).message });
  }
}

/**
 * The newest run in a driver-log folder (files `<stamp>-<phase>[-escalated].jsonl`), or one transcript file, as
 * events per phase in pipeline order.
 */
export function readRunLogs(target: string): { stamp: string; phases: Array<{ phase: string; events: LogEvent[] }> } | { error: string } {
  let files: string[];
  try {
    files = fs.statSync(target).isDirectory() ? fs.readdirSync(target).filter((f) => f.endsWith(".jsonl")).map((f) => path.join(target, f)) : [target];
  } catch {
    return { error: `cannot read ${target}` };
  }
  const parsed = files
    .map((f) => {
      const m = /^(\d{4}-\d{2}-\d{2}T[\d-]+Z)-([a-z]+(?:-sweep)?)(-escalated)?\.jsonl$/.exec(path.basename(f));
      return { file: f, stamp: m?.[1] ?? "", phase: m ? `${m[2]}${m[3] ?? ""}` : path.basename(f, ".jsonl") };
    })
    .filter((x) => x.stamp || files.length === 1);
  if (!parsed.length) return { error: `no driver transcripts (<stamp>-<phase>.jsonl) in ${target}` };
  const stamp = parsed.map((x) => x.stamp).sort().pop() ?? "";
  const order = (p: string) => {
    const i = (PHASES as readonly string[]).indexOf(p.replace(/-escalated$/, ""));
    return (i < 0 ? 99 : i) + (p.endsWith("-escalated") ? 0.5 : 0);
  };
  const phases = parsed
    .filter((x) => x.stamp === stamp)
    .sort((a, b) => order(a.phase) - order(b.phase))
    .map((x) => ({
      phase: x.phase,
      events: fs
        .readFileSync(x.file, "utf8")
        .split("\n")
        .filter((l) => l.trim())
        .flatMap((l) => {
          try {
            return [JSON.parse(l) as LogEvent];
          } catch {
            return [];
          }
        }),
    }));
  return { stamp: stamp || path.basename(target), phases };
}

/** Reads and checks a plot file. Errors name the failing field. */
export function readPlotFile(file: string): { plot: PlotSpec } | { errors: Array<{ field: string; message: string }> } {
  let spec: unknown;
  try {
    spec = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return { errors: [{ field: "", message: `cannot read it as JSON: ${(e as Error).message}` }] };
  }
  const normal = normalizePlotSpec(spec);
  const checked = validateSpec("plot", normal.spec);
  return checked.ok ? { plot: normal.spec as PlotSpec } : { errors: checked.errors };
}

function planRow(phase: Phase, toolNames: string[], mode: string) {
  const prompt = loadPhasePrompt(phase);
  const profile = resolveToolProfile(prompt.profile.join(","));
  return {
    phase,
    profile: prompt.profile.join(","),
    runs: mode === "step" && STEP_PHASES.includes(phase) ? "one conversation per step" : "one conversation",
    tools: toolNames.filter((n) => isToolAllowed(n, profile)).length,
    promptBytes: Buffer.byteLength(prompt.body, "utf8"),
    reads: prompt.reads,
    writes: prompt.writes,
  };
}

/** Phases the status file records as a success. */
export function recordedSuccess(statusPath: string | undefined): Set<Phase> {
  const done = new Set<Phase>();
  if (!statusPath || !fs.existsSync(statusPath)) return done;
  try {
    const file = JSON.parse(fs.readFileSync(statusPath, "utf8")) as { phases?: Record<string, { status?: string }> };
    for (const p of PHASES) if (file.phases?.[p]?.status === "success") done.add(p);
  } catch {
    /* an unreadable status file means nothing is recorded */
  }
  return done;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(import.meta.filename)) {
  await main();
}
