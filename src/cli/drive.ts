#!/usr/bin/env node
/**
 * Adventure driver: builds a module phase by phase with a small model on an OpenAI-compatible endpoint.
 *
 *   node dist/cli/drive.js --module <project dir | file.mod> --endpoint http://localhost:11434/v1 --model qwen2.5:14b
 *
 * For each phase it gives the model the short phase prompt (docs/phase-prompts) and only that phase's tools,
 * repairs and checks the arguments, and lets `phase_check` decide when the phase is done. Every phase starts
 * with a fresh conversation. A phase already recorded as a success is skipped, so a run can be resumed.
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
 *   --escalate-model <name> [--escalate-endpoint <url>] [--escalate-api-key <key>]
 *                            a stronger model that gets one attempt at a phase the first model failed
 *   --log <dir>              where the transcripts go (default: <adventure dir>/driver-log)
 *   --dry-run                show the plan (phases, tools, prompt sizes); call no model, change nothing
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
import { type PhaseResult, type ToolHost, runPhase } from "../driver/run-phase.js";
import { isToolAllowed, resolveToolProfile } from "../tool-profiles.js";
import { PHASES, type Phase } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { type PlotSpec, plotWarnings } from "../util/plot-spec.js";
import { validateSpec } from "../util/spec-validate.js";

const VALUE_FLAGS = new Set([
  "module", "create", "endpoint", "model", "api-key", "phases", "idea", "level", "party", "minutes", "tone",
  "max-steps", "retries", "context-chars", "escalate-model", "escalate-endpoint", "escalate-api-key", "log", "plot",
]);
const BOOL_FLAGS = new Set(["force", "dry-run", "help"]);

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

  // One server for the whole run, with every tool: the driver decides per phase which ones the model sees.
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) if (v !== undefined) env[k] = v;
  env.MCP_TOOL_PROFILE = "";
  env.MCP_BRIEF_RESULTS = "1";
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
      return { text: (r.content ?? []).map((c) => c.text ?? "").join("\n"), isError: r.isError === true };
    },
  };
  const stop = async (code: number, summary: Record<string, unknown>): Promise<never> => {
    await client.close().catch(() => {});
    finish(code, summary);
  };

  try {
    const allTools = await host.listTools();

    if (dryRun && !flags.module) {
      // Nothing to load: describe the plan from the prompts alone.
      await stop(0, { ok: true, dryRun: true, ...plotInfo, phases: phases.map((p) => planRow(p, allTools.map((t) => t.name))) });
    }

    if (flags.create) {
      if (dryRun) await stop(0, { ok: true, dryRun: true, wouldCreate: flags.create, ...plotInfo, phases: phases.map((p) => planRow(p, allTools.map((t) => t.name))) });
      const filename = flags.create.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const made = await host.callTool("create_module", { name: flags.create, filename });
      if (made.isError) await stop(1, { ok: false, error: `create_module: ${made.text.slice(0, 500)}` });
      say(`created module "${flags.create}"`);
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
        adventureDir: dirInfo.dir,
        storyExists: dirInfo.files.story?.exists ?? false,
        ...plotInfo,
        phases: phases.map((p) => ({ ...planRow(p, allTools.map((t) => t.name)), recorded: done.has(p) ? "success (would skip)" : "not done" })),
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
    };

    const results: Array<PhaseResult & { model?: string }> = [];
    for (const phase of phases) {
      if (done.has(phase) && !bools.has("force")) {
        say(`${phase}: already a success, skipped (use --force to run it again)`);
        results.push({ phase, status: "skipped", steps: 0, toolCalls: 0, errors: [], reason: "recorded as success" });
        continue;
      }
      const attempt = async (who: Chat, name: string, suffix: string) => {
        const file = path.join(logDir, `${stamp}-${phase}${suffix}.jsonl`);
        say(`${phase}: started with ${name}`);
        const r = await runPhase(host, who, phase, {
          ...options,
          onEvent: (e) => {
            fs.appendFileSync(file, `${JSON.stringify(e)}\n`);
            if (e.event === "tool") say(`  ${phase}: ${String(e.tool)}${e.isError ? "  -> error" : ""}`);
            if (e.event === "refused") say(`  ${phase}: ${String(e.tool)}  -> refused before the call`);
          },
        });
        say(`${phase}: ${r.status}${r.reason ? ` (${r.reason})` : ""}, ${r.steps} turns, ${r.toolCalls} tool calls`);
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
    }

    const bad = results.find((r) => r.status === "failed" || r.status === "blocked");
    await stop(bad ? 2 : 0, {
      ok: !bad,
      adventureDir: dirInfo.dir,
      log: logDir,
      phases: results,
      ...(bad
        ? { stoppedAt: bad.phase, next: `Fix the errors listed for "${bad.phase}" (by hand or with a stronger model), then run again: finished phases are skipped.` }
        : { next: "All requested phases are done. The .mod is not built: build it with repack_module when you want to play." }),
    });
  } catch (e) {
    await stop(1, { ok: false, error: (e as Error).message });
  }
}

/** Reads and checks a plot file. Errors name the failing field. */
export function readPlotFile(file: string): { plot: PlotSpec } | { errors: Array<{ field: string; message: string }> } {
  let spec: unknown;
  try {
    spec = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    return { errors: [{ field: "", message: `cannot read it as JSON: ${(e as Error).message}` }] };
  }
  const checked = validateSpec("plot", spec);
  return checked.ok ? { plot: spec as PlotSpec } : { errors: checked.errors };
}

function planRow(phase: Phase, toolNames: string[]) {
  const prompt = loadPhasePrompt(phase);
  const profile = resolveToolProfile(prompt.profile.join(","));
  return {
    phase,
    profile: prompt.profile.join(","),
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
