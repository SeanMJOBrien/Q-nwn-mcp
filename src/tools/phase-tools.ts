/**
 * phase_check — the start and end checks of every /create-adventure phase in one call.
 *
 *   step "start": fails with the missing adventure.md section (replaces the pre-check paragraph each skill used to carry).
 *   step "end":   checks the phase's own section was appended, runs the verifiers that belong to the phase
 *                 (area connectivity for areas; the matching verify_* results for the rest) and writes the phase's
 *                 entry to adventure-status.json.
 */

import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { adventureFileNames, adventurePath as advFile, ensureAdventureDir } from "../util/adventure-dir.js";
import { defaultFocus, FOCUS, guideFor, type Focus } from "../util/focus.js";
import type { GffObj } from "../types/gff.js";
import { getFieldStr } from "../types/gff.js";
import {
  clearScopeFields,
  filterForPhase,
  mergeStatus,
  missingSections,
  OWN_SECTION,
  parseScope,
  PHASES,
  type Phase,
  type PhaseEntry,
  requiredFor,
  SCOPE_KINDS,
  scopeSkipsPipeline,
  setScopeFields,
  skipFromRun,
  stopMessage,
} from "../util/phase-check.js";
import { computeConnectivity } from "./analysis-tools.js";
import { parseStoryGraph, verifyStory } from "../util/story-graph.js";
import { collectVerifyResults } from "./verify-tools.js";

function text(body: unknown, isError = false) {
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }], ...(isError ? { isError: true } : {}) };
}

async function readIfExists(file: string): Promise<string | null> {
  try {
    return await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
}

async function recordStatus(dir: string, phase: Phase, entry: PhaseEntry): Promise<string> {
  const statusPath = advFile(dir, "status");
  let existing: unknown;
  const raw = await readIfExists(statusPath);
  if (raw) {
    try {
      existing = JSON.parse(raw);
    } catch {
      existing = undefined;
    }
  }
  await fs.writeFile(statusPath, JSON.stringify(mergeStatus(existing, phase, entry), null, 2));
  return statusPath;
}

export function registerPhaseTools(server: McpServer): void {
  server.tool(
    "set_project_scope",
    "Record what the user wants from this session, so effort goes to their goal. Ask them first (whole adventure, only some phases, one feature, or NWScript only), then call this. Always writes project-scope.json in the module temp dir. For whole_adventure and some_phases it also writes `Scope:` and `Skip phases:` into adventure.md's ## Module (creating adventure.md when missing); phase_check then returns skipped for the skipped phases and later phases stop requiring their sections. `phases` lists the phases to RUN for some_phases (everything else is skipped). With no arguments it returns the recorded scope.",
    {
      kind: z.enum(SCOPE_KINDS).optional().describe("whole_adventure | some_phases | one_feature | nwscript_only"),
      scope: z.string().optional().describe("One line, the user's own words: what they asked for"),
      phases: z.string().optional().describe("JSON array of phases to run (some_phases only), e.g. [\"quests\",\"challenges\"]"),
      focus: z.enum(FOCUS).optional().describe("What help is wanted: creatures | scripting | story | areas_encounters | quests_dialog | debug | items. Returns that focus's guide (skills, first calls, what to ask)."),
    },
    { idempotentHint: true },
    async ({ kind, scope, phases, focus }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const scopePath = advFile(dir, "scope");
      if (!kind) {
        const raw = await readIfExists(scopePath);
        if (raw) {
          const rec = JSON.parse(raw) as { focus?: Focus };
          return text({ ...rec, ...(rec.focus ? { guide: guideFor(rec.focus) } : {}), adventureDir: dir });
        }
        return text({ recorded: false, adventureDir: dir, message: "No scope recorded. Ask the user what they are trying to accomplish (for an existing module, adopt_module then audit_module first), then call set_project_scope." });
      }
      if (!scope?.trim()) return text({ ok: false, error: "scope is required: one line in the user's words." }, true);
      let run: Phase[] = [];
      if (kind === "some_phases") {
        let parsed: unknown;
        try {
          parsed = JSON.parse(phases ?? "[]");
        } catch {
          return text({ ok: false, error: "phases must be a JSON array of phase names." }, true);
        }
        const names = Array.isArray(parsed) ? parsed.map(String) : [];
        const bad = names.filter((n) => !(PHASES as readonly string[]).includes(n));
        if (names.length === 0 || bad.length > 0) {
          return text({ ok: false, error: `some_phases needs "phases": a JSON array drawn from ${PHASES.join(", ")}${bad.length ? ` (unknown: ${bad.join(", ")})` : ""}.` }, true);
        }
        run = names as Phase[];
      }
      const skip: Phase[] = kind === "some_phases" ? skipFromRun(run) : [];
      const usesPipeline = kind === "whole_adventure" || kind === "some_phases";
      let wroteAdventure = false;
      if (usesPipeline) {
        const adventurePath = advFile(dir, "story");
        const md = (await readIfExists(adventurePath)) ?? `# Adventure: ${index.moduleName}\n`;
        await fs.writeFile(adventurePath, setScopeFields(md, scope.trim(), skip));
        wroteAdventure = true;
      } else {
        // Switching away from a pipeline scope: drop the old Scope/Skip lines so phase_check can't follow them.
        const adventurePath = advFile(dir, "story");
        const md = await readIfExists(adventurePath);
        if (md !== null && clearScopeFields(md) !== md) {
          await fs.writeFile(adventurePath, clearScopeFields(md));
          wroteAdventure = true;
        }
      }
      const chosenFocus: Focus | undefined = focus ?? defaultFocus(kind);
      const record = { kind, scope: scope.trim(), run: kind === "some_phases" ? run : undefined, skip, usesAdventurePipeline: usesPipeline, ...(chosenFocus ? { focus: chosenFocus } : {}) };
      await fs.writeFile(scopePath, JSON.stringify(record, null, 2));
      const next =
        kind === "nwscript_only"
          ? "No adventure pipeline: use write_script / compile_script and nwn-logic-debug; do not build areas."
          : kind === "one_feature"
            ? "No adventure.md pipeline: build just that feature with the matching tool (build_quest, build_companion, compose_encounter, create_store_blueprint...) in the existing module."
            : `Run the pipeline; phase_check skips ${skip.length ? skip.join(", ") : "nothing"}.`;
      return text({ ok: true, ...record, wroteAdventure, adventureDir: dir, next, ...(chosenFocus ? { guide: guideFor(chosenFocus) } : {}) });
    },
  );

  server.tool(
    "phase_check",
    "Start and end check for one /create-adventure phase. A phase named under `Skip phases` in adventure.md's ## Module (the user's declared scope) returns skipped:true on both steps — do nothing — and no later phase requires its section. step=\"start\": verifies the adventure.md sections the phase needs exist and are non-empty — if not it returns isError with the exact message to STOP on. step=\"end\": verifies the phase appended its own section, runs the verifiers for that phase (area connectivity for 'areas'; verify_* findings of the matching object types for the others; everything for 'polish'/'rewards'), and writes the phase's entry to adventure-status.json (success / partial with the error list). Pass `warnings`/`errors` for anything the phase itself wants recorded. For 'quests' also run verify_quest_completability.",
    {
      phase: z.enum(PHASES).describe("plot, areas, environment, actors, quests, challenges, affordances, polish or rewards"),
      step: z.enum(["start", "end"]),
      warnings: z.string().optional().describe("JSON array of extra warning strings to record (end only)"),
      errors: z.string().optional().describe("JSON array of extra error strings to record (end only)"),
      coop: z.boolean().optional().describe("false for a single-player module (end only)"),
    },
    { idempotentHint: true },
    async ({ phase, step, warnings, errors, coop }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const adventurePath = advFile(dir, "story");
      // One feature / NWScript only: the adventure pipeline is not in use, so no phase runs.
      const recordedRaw = await readIfExists(advFile(dir, "scope"));
      let recorded: unknown;
      try {
        recorded = recordedRaw ? JSON.parse(recordedRaw) : undefined;
      } catch {
        recorded = undefined;
      }
      if (scopeSkipsPipeline(recorded)) {
        return text({
          ok: true,
          phase,
          step,
          skipped: true,
          scope: recorded.scope,
          kind: recorded.kind,
          message: `Phase ${phase} is skipped: the recorded scope is ${recorded.kind} ("${recorded.scope}"), which does not use the adventure pipeline. Do nothing. To run the pipeline, call set_project_scope with whole_adventure or some_phases.`,
        });
      }
      const md = await readIfExists(adventurePath);
      if (md === null) {
        return text({ ok: false, phase, step, error: `No adventure.md in ${dir}. Run /adventure-plot first (new adventure), or adopt_module (existing module).` }, true);
      }

      const { scope, skip } = parseScope(md);
      const p = phase as Phase;

      // A phase the user chose to skip: nothing to check or run; record it so the status file shows why.
      if (skip.includes(p)) {
        if (step === "end") await recordStatus(dir, p, { status: "skipped", warnings: [], errors: [] });
        return text({ ok: true, phase, step, skipped: true, scope, message: `Phase ${p} is skipped by the declared scope (Skip phases in ## Module). Do nothing and move on.` });
      }

      if (step === "start") {
        const required = requiredFor(p, skip);
        const missing = missingSections(md, required);
        if (missing.length > 0) {
          return text({ ok: false, phase, step, missing, stop: stopMessage(missing) }, true);
        }
        return text({ ok: true, phase, step, required, ...(scope ? { scope } : {}), ...(skip.length ? { skippedPhases: skip } : {}) });
      }

      // step === "end"
      const errorList: string[] = [];
      const warningList: string[] = [];
      const extra = (raw: string | undefined): string[] => {
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed.map(String) : [];
      };
      errorList.push(...extra(errors));
      warningList.push(...extra(warnings));

      if (missingSections(md, [OWN_SECTION[p]]).length > 0) {
        errorList.push(`adventure.md has no non-empty "## ${OWN_SECTION[p]}" section — the phase must append it.`);
      }

      let connectivity: { unreachable: string[] } | undefined;
      if (p === "areas") {
        const start =
          getFieldStr((index.parsedGff.get("module.ifo") ?? {}) as GffObj, "Mod_Entry_Area").toLowerCase() ||
          [...index.areas.keys()][0];
        if (start && index.areas.has(start)) {
          const c = computeConnectivity(index, start);
          connectivity = { unreachable: c.unreachable };
          if (c.unreachable.length > 0) {
            errorList.push(`Areas not reachable from ${start}: ${c.unreachable.join(", ")} — fix transitions before the next phase.`);
          }
        }
      }

      // The story graph (if the plot wrote one) is checked when the story is written and again at the polish pass.
      if (p === "plot" || p === "polish") {
        for (const f of verifyStory(parseStoryGraph(md), new Set(index.areas.keys()))) {
          // Areas don't exist yet when the plot ends, so an unknown area is only worth reporting at polish.
          if (p === "plot" && f.code === "story_unknown_area") continue;
          (f.level === "error" ? errorList : warningList).push(`story [${f.code}] ${f.message}`);
        }
      }

      const results = filterForPhase(p, await collectVerifyResults(index, { coop }));
      for (const r of results) {
        for (const e of r.errors) errorList.push(`${r.target} [${e.code}] ${e.message}${e.fix ? ` Fix: ${e.fix}` : ""}`);
        for (const w of r.warnings) warningList.push(`${r.target} [${w.code}] ${w.message}`);
      }

      const status = errorList.length === 0 ? "success" : "partial";
      const statusPath = await recordStatus(dir, p, { status, warnings: warningList, errors: errorList });

      return text(
        {
          ok: status === "success",
          phase: p,
          step,
          status,
          errorCount: errorList.length,
          warningCount: warningList.length,
          errors: errorList.slice(0, 40),
          warnings: warningList.slice(0, 40),
          ...(connectivity ? { connectivity } : {}),
          statusFile: statusPath,
          ...(p === "quests" ? { alsoRun: "verify_quest_completability" } : {}),
        },
        false,
      );
    },
  );
}
