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
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr } from "../types/gff.js";
import { DM_AREA_RESREF } from "../util/dm-books.js";
import { type AreaFacts, buildChecklist, type ModuleFacts, nextStep, type PhaseStatus, renderProgress } from "../util/progress.js";
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
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { moduleFields, type PlotSpec, plotWarnings, renderPlot, setModuleFields } from "../util/plot-spec.js";
import { validateSpec } from "../util/spec-validate.js";
import { pickSections, setSection, stripOwnHeading } from "../util/story-sections.js";
import { computeConnectivity } from "./analysis-tools.js";
import { parseStoryGraph, verifyStory } from "../util/story-graph.js";
import { collectVerifyResults } from "./verify-tools.js";

const key = (name: string) => name.trim().toLowerCase();

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

/** What get_progress needs to know about the loaded module. */
export function gatherModuleFacts(index: ReturnType<typeof requireIndex>, scopeRecorded: boolean, dmGuideWritten: boolean): ModuleFacts {
  const areas = new Map<string, AreaFacts>();
  for (const [resref] of index.areas) {
    const are = (index.parsedGff.get(`${resref}.are`) ?? {}) as GffObj;
    const git = (index.parsedGff.get(`${resref}.git`) ?? {}) as GffObj;
    const tiles = new Set(getFieldList(are, "Tile_List").map((t) => getFieldNum(t, "Tile_ID")));
    areas.set(resref, {
      width: getFieldNum(are, "Width"),
      height: getFieldNum(are, "Height"),
      tileset: getFieldStr(are, "Tileset").toLowerCase(),
      distinctTiles: tiles.size,
      props: getFieldList(git, "Placeable List").length,
      mapPins: getFieldList(git, "WaypointList").filter((w) => getFieldNum(w, "HasMapNote") === 1).length,
      creatures: getFieldList(git, "Creature List").map((c) => ({
        name: `${getFieldLocStr(c, "FirstName")} ${getFieldLocStr(c, "LastName")}`.trim(),
        hostile: getFieldNum(c, "FactionID") === 1,
        tag: getFieldStr(c, "Tag"),
        resref: getFieldStr(c, "TemplateResRef").toLowerCase(),
      })),
      encounters: getFieldList(git, "Encounter List").length,
      stores: getFieldList(git, "StoreList").length,
      storeTags: getFieldList(git, "StoreList").map((st) => getFieldStr(st, "Tag")),
      triggerTags: getFieldList(git, "TriggerList").map((t) => getFieldStr(t, "Tag")),
      containers: getFieldList(git, "Placeable List")
        .filter((pl) => getFieldNum(pl, "HasInventory") === 1)
        .map((pl) => ({ tag: getFieldStr(pl, "Tag"), items: getFieldList(pl, "ItemList").length })),
    });
  }
  const entryArea = getFieldStr((index.parsedGff.get("module.ifo") ?? {}) as GffObj, "Mod_Entry_Area").toLowerCase();
  const start = index.areas.has(entryArea) ? entryArea : [...index.areas.keys()][0];
  const graph = start ? computeConnectivity(index, start).graph : {};
  const jrl = (index.parsedGff.get("module.jrl") ?? {}) as GffObj;
  const journalQuests = getFieldList(jrl, "Categories").flatMap((c) => [getFieldLocStr(c, "Name"), getFieldStr(c, "Tag")].filter(Boolean));
  return { areas, graph, entryArea, journalQuests, dmAreaResref: DM_AREA_RESREF, dmGuideWritten, scopeRecorded };
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
          next: status === "success" ? "get_progress() for the next step" : "fix the errors above, then run this check again",
        },
        false,
      );
    },
  );

  server.tool(
    "get_progress",
    "Where the build of this module stands and the ONE next step, with the exact call. Ticks every step of the whole process (goal, story, each area created and laid out, each connection, start point, props and map pins per area, each key NPC, each quest, enemies, store, verify, DM guide and area) from the module's real state, and saves the checklist as the module's progress file (<Title>-progress.md in its folder). Call it at the start of a session, after each step, and whenever unsure what to do next. `note` adds a line to the file's Notes (decisions, open questions) that later sessions read.",
    {
      note: z.string().optional().describe("One line to add to the Notes, e.g. a decision or what to ask the user"),
      full: z.boolean().optional().describe("true: return every step, not only the open ones of the current phase"),
      phase: z.string().optional().describe('Only this phase\'s open steps, e.g. "areas" (start, plot, areas, environment, actors, quests, challenges, affordances, polish, rewards, ship)'),
    },
    { idempotentHint: true },
    async ({ note, full, phase }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const story = await readIfExists(advFile(dir, "story"));
      let status: Record<string, PhaseStatus> | undefined;
      try {
        const raw = await readIfExists(advFile(dir, "status"));
        status = raw ? (JSON.parse(raw) as { phases?: Record<string, PhaseStatus> }).phases : undefined;
      } catch {
        status = undefined;
      }
      const facts = gatherModuleFacts(index, (await readIfExists(advFile(dir, "scope"))) !== null, (await readIfExists(advFile(dir, "dmGuide"))) !== null);
      const { items } = buildChecklist(story, status, facts);
      const progressPath = advFile(dir, "progress");
      const md = renderProgress(index.moduleName, items, await readIfExists(progressPath), note);
      await fs.writeFile(progressPath, md, "utf8");
      const next = nextStep(items);
      const done = items.filter((i) => i.done).length;
      const open = items.filter((i) => !i.done && (full || i.phase === (phase?.toLowerCase() || next?.phase)));
      return text({
        module: index.moduleName,
        done,
        total: items.length,
        phase: next?.phase ?? "done",
        next: next
          ? { step: next.label, call: next.call, ...(next.detail ? { why: next.detail } : {}), ...(next.readFirst ? { readFirst: next.readFirst } : {}) }
          : "Every step is done.",
        [full ? "steps" : "openInThisPhase"]: (full ? items : open).map((i) => `${i.done ? "[x]" : "[ ]"} ${i.label}`),
        ...(phase && !full ? { open: open.map((i) => ({ id: i.id, step: i.label, call: i.call, ...(i.detail ? { why: i.detail } : {}) })) } : {}),
        progressFile: progressPath,
        rule: "Do the next step, then call get_progress again. Build the .mod only when the user asks.",
      });
    },
  );

  // ─── Story file access and short phase prompts (for clients with no file tools, and small models) ───

  server.tool(
    "read_story",
    "Read the story file (adventure.md) of the loaded module: all `## Section` blocks, or only the named ones. Use it at the start of a phase to get the sections the phase needs.",
    {
      sections: z.string().optional().describe('Comma-separated section names, e.g. "Module,Plot". Omit for the whole story'),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ sections }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const md = await readIfExists(advFile(dir, "story"));
      if (md === null) {
        return text({ ok: false, error: "There is no story file yet. Write the Module section first with write_story_section, or run adopt_module on an existing module." }, true);
      }
      const names = (sections ?? "").split(",").map((n) => n.trim()).filter(Boolean);
      const picked = pickSections(md, names);
      const note = picked.missing.length ? `\n\n(Not in the story yet: ${picked.missing.join(", ")}. Sections present: ${picked.available.join(", ")})` : "";
      return { content: [{ type: "text" as const, text: `${picked.text}${note}` }] };
    },
  );

  server.tool(
    "write_story_section",
    "Write one `## Section` of the story file (adventure.md): replaces the section when it exists, appends it otherwise, and leaves every other section untouched. Each phase writes its own section this way before phase_check(step: \"end\"). Give the section body only, without the `## Name` heading.",
    {
      section: z.string().describe("Section name: Module, Plot, Areas, Environment, Actors, Quests, Challenges, Affordances, Polish or Rewards"),
      text: z.string().describe("The section body in markdown (sub-headings start at ###)"),
    },
    { idempotentHint: true },
    async ({ section, text: body }) => {
      const index = requireIndex();
      const name = section.replace(/^#+\s*/, "").trim();
      const known = ["Module", ...Object.values(OWN_SECTION)];
      const canonical = known.find((k) => k.toLowerCase() === name.toLowerCase());
      if (!canonical) return text({ ok: false, field: "section", error: `"${section}" is not a story section. Use one of: ${known.join(", ")}` }, true);
      const clean = stripOwnHeading(canonical, body);
      if (!clean) return text({ ok: false, field: "text", error: "The section text is empty." }, true);
      if (/^##\s/m.test(clean)) return text({ ok: false, field: "text", error: "The text contains a `## ` heading. Write one section per call and start sub-headings at ###." }, true);
      const dir = await ensureAdventureDir(index);
      const storyPath = advFile(dir, "story");
      const before = (await readIfExists(storyPath)) ?? `# ${index.moduleName}\n`;
      const replaced = pickSections(before, [canonical]).missing.length === 0;
      await fs.writeFile(storyPath, setSection(before, canonical, clean), "utf8");
      const phase = (Object.keys(OWN_SECTION) as Phase[]).find((p) => OWN_SECTION[p] === canonical);
      return text({
        ok: true,
        section: canonical,
        action: replaced ? "replaced" : "added",
        characters: clean.length,
        file: storyPath,
        ...(phase ? { next: `phase_check(phase: "${phase}", step: "end")` } : {}),
      });
    },
  );

  server.tool(
    "write_plot",
    "Write the adventure's plot from one JSON object (schema: docs/specs/plot.schema.json, or `node dist/cli/spec.js schema plot`): the places in story order, how they connect, the people, the antagonists, the quests with their stages, the challenges and the final reward. Checks the object (answers with the failing `field`), then writes the story's `## Plot` section in the standard format with a story graph, and the title, level, party size and play time into `## Module`. Use it when a person or a stronger model has written the plot, so the later phases build from it. `dryRun: true` checks and returns the text without writing.",
    {
      spec: z.string().describe("The plot as a JSON object (PlotSpec)"),
      dryRun: z.boolean().optional().describe("true: check and return the section text, write nothing"),
    },
    { idempotentHint: true },
    async ({ spec, dryRun }) => {
      const index = requireIndex();
      let parsed: unknown;
      try {
        parsed = JSON.parse(spec);
      } catch (e) {
        return text({ ok: false, field: "spec", error: `not valid JSON: ${(e as Error).message}` }, true);
      }
      const checked = validateSpec("plot", parsed);
      if (!checked.ok) return text({ ok: false, error: "Fix these fields and call write_plot again.", fields: checked.errors.slice(0, 12) }, true);
      const plot = parsed as PlotSpec;
      const body = renderPlot(plot);
      const warnings = plotWarnings(plot);
      if (key(plot.title) !== key(index.moduleName)) warnings.push(`The plot's title is "${plot.title}" but the loaded module is "${index.moduleName}"; the story file keeps the module's name.`);
      if (dryRun) return text({ ok: true, dryRun: true, warnings, plot: body });

      const dir = await ensureAdventureDir(index);
      const storyPath = advFile(dir, "story");
      const before = (await readIfExists(storyPath)) ?? `# ${index.moduleName}\n`;
      const moduleBody = pickSections(before, ["Module"]);
      const oldModule = moduleBody.missing.length ? "" : stripOwnHeading("Module", moduleBody.text);
      let md = setSection(before, "Module", setModuleFields(oldModule, moduleFields(plot)));
      md = setSection(md, "Plot", body);
      await fs.writeFile(storyPath, md, "utf8");
      return text({
        ok: true,
        locations: plot.locations.length,
        npcs: plot.npcs.length,
        quests: plot.quests.length,
        warnings,
        file: storyPath,
        next: 'phase_check(phase: "plot", step: "end")',
      });
    },
  );

  server.tool(
    "write_dm_guide",
    "Write the DM guide file of the loaded module (spoilers included; for the person running the game). create_dm_area then puts it, with the story, into the books in the DM chest.",
    {
      text: z.string().describe("The whole guide in markdown"),
    },
    { idempotentHint: true },
    async ({ text: body }) => {
      const index = requireIndex();
      if (body.trim().length < 200) return text({ ok: false, field: "text", error: "The guide is too short to run a game from (under 200 characters)." }, true);
      const dir = await ensureAdventureDir(index);
      const guidePath = advFile(dir, "dmGuide");
      await fs.writeFile(guidePath, `${body.trim()}\n`, "utf8");
      return text({ ok: true, characters: body.trim().length, file: guidePath, next: "create_dm_area()" });
    },
  );

  server.tool(
    "get_phase_prompt",
    "The short instructions for one adventure phase (under 4 KB): the steps, the tool order and the rules, written for a small model. Also names the tool profile the phase needs (MCP_TOOL_PROFILE), the build specs it uses and the story sections it reads and writes. Needs no module loaded.",
    {
      phase: z.enum(PHASES).describe("plot, areas, environment, actors, quests, challenges, affordances, polish or rewards"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ phase }) => {
      const prompt = loadPhasePrompt(phase as Phase);
      const header = [
        `Phase: ${prompt.phase}`,
        `Tool profile: MCP_TOOL_PROFILE=${prompt.profile.join(",")}`,
        ...(prompt.specs.length ? [`Specs: ${prompt.specs.join(", ")} (schemas in docs/specs/, quest: docs/quest-spec.schema.json)`] : []),
        `Reads: ${prompt.reads.join(", ")}`,
        `Writes: ${prompt.writes}`,
      ].join("\n");
      return { content: [{ type: "text" as const, text: `${header}\n\n${prompt.body}` }] };
    },
  );
}
