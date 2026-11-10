/**
 * get_adventure_dir / adopt_module / audit_module — the start of a session on an existing module: where its story files live,
 * writing the story record from what the module contains, and reviewing what is done and what is missing.
 */

import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { buildAdoptedAdventure, hasStoryContent } from "../util/adopt.js";
import { ADVENTURE_FILES, ensureAdventureDir } from "../util/adventure-dir.js";
import { buildAudit, gapList, type VerifyCounts } from "../util/audit.js";
import { exportProject, isProjectDir } from "../util/project.js";
import { gatherSnapshot } from "../util/module-snapshot.js";
import { filterForPhase, PHASES, type Phase } from "../util/phase-check.js";
import { parseStoryGraph, verifyStory } from "../util/story-graph.js";
import type { VerifyResult } from "../util/verify/common.js";
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

async function exists(file: string): Promise<boolean> {
  return (await readIfExists(file)) !== null;
}

function counts(results: VerifyResult[]): VerifyCounts {
  const byCode = new Map<string, number>();
  let errors = 0;
  let warnings = 0;
  for (const r of results) {
    errors += r.errors.length;
    warnings += r.warnings.length;
    for (const e of r.errors) byCode.set(e.code, (byCode.get(e.code) ?? 0) + 1);
  }
  const top = [...byCode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([code, n]) => `${code} x${n}`);
  return { errors, warnings, top };
}

export function registerAdoptTools(server: McpServer): void {
  server.tool(
    "get_adventure_dir",
    "Where this module's own files live: `adventures/<Title-With-Dashes>/` (git-ignored) holding adventure.md (the story), dm-guide.md, adventure-status.json and project-scope.json. Creates the folder and moves over any of those files an older run left in the module's temp dir. Every adventure skill reads and writes adventure.md and dm-guide.md here, not in the temp dir.",
    {},
    { idempotentHint: true },
    async () => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const files: Record<string, { path: string; exists: boolean }> = {};
      for (const [key, name] of Object.entries(ADVENTURE_FILES)) {
        const p = path.join(dir, name);
        files[key] = { path: p, exists: await exists(p) };
      }
      return text({ dir, title: index.moduleName, files });
    },
  );

  server.tool(
    "adopt_module",
    "Write adventure.md from what the loaded module already contains (areas, creatures, dialogs, journal, stores), so the adventure phases and the review can work on a hand-built or half-built module. Only sections the module has content for are written; a missing section is a gap to fill (listed in `gaps`). Anything it cannot know (tone, premise, motives, roles) is marked `(not recorded)` for the user to fill in — ask them, never invent it. Also writes the module as a project beside it (every resource as JSON in src/, see export_project). Keeps the recorded Scope/Skip phases. Refuses to replace an adventure.md that already has story content unless overwrite is true. Run audit_module next.",
    {
      overwrite: z.boolean().optional().describe("Replace an adventure.md that already has story content (default false)"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ overwrite }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const file = path.join(dir, ADVENTURE_FILES.story);
      const existing = await readIfExists(file);
      if (hasStoryContent(existing) && !overwrite) {
        return text({ ok: false, error: `${file} already has story content. Use audit_module to review it, or pass overwrite: true to adopt over it.`, file }, true);
      }
      const result = buildAdoptedAdventure(gatherSnapshot(index), existing);
      await fs.writeFile(file, result.markdown);
      // The module becomes a project (docs/module-projects.md): every resource as JSON beside the story files.
      const hadProject = await isProjectDir(dir);
      const project = await exportProject(index, dir);
      return text({
        ok: true,
        file,
        project: { dir, created: !hadProject, gff: project.gff, scripts: project.scripts, skipped: project.skipped },
        gaps: result.gaps,
        notRecorded: [...new Set(result.notRecorded)],
        next: "Show the user what was adopted, ask them to fill the (not recorded) fields in their own words, then call audit_module and let them choose which gaps to fill.",
      });
    },
  );

  server.tool(
    "audit_module",
    "Read-only review of the loaded module as built so far: one row per category in pipeline order (story, areas, dressing, friendly creatures and dialog, quests, hostile creatures and encounters, stores and loot, scripts, consistency, rewards), each done / partial / missing with the evidence and the phase and focus that would fill it. Uses verify_* results, area connectivity, the journal, the story record in adventure.md and the module description. Show the gaps to the user and let them pick which to fill; the fixes are the focus's skills (see set_project_scope focus).",
    {
      coop: z.boolean().optional().describe("false for a single-player module"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ coop }) => {
      const index = requireIndex();
      const dir = await ensureAdventureDir(index);
      const snapshot = gatherSnapshot(index);
      const results = await collectVerifyResults(index, { coop });

      const verify: Record<string, VerifyCounts> = { all: counts(results) };
      for (const phase of PHASES as readonly Phase[]) {
        if (phase === "plot" || phase === "polish" || phase === "rewards") continue;
        verify[phase] = counts(filterForPhase(phase, results));
      }

      const md = await readIfExists(path.join(dir, ADVENTURE_FILES.story));
      let storyErrors = 0;
      let storyWarnings = 0;
      if (md) {
        for (const f of verifyStory(parseStoryGraph(md), new Set(index.areas.keys()))) {
          if (f.level === "error") storyErrors++;
          else storyWarnings++;
        }
      }
      const rows = buildAudit({
        snapshot,
        verify,
        story: { exists: md !== null, notRecorded: md ? (md.match(/\(not recorded\)/g) ?? []).length : 0, errors: storyErrors, warnings: storyWarnings },
        dmGuideExists: await exists(path.join(dir, ADVENTURE_FILES.dmGuide)),
      });

      return text({
        module: snapshot.title,
        adventureDir: dir,
        gaps: gapList(rows),
        rows,
        next: "Tell the user what is done and what is missing, in plain words, and ask which gaps they want to fill. Then call set_project_scope with their goal (kind, focus) and use that focus's skills.",
      });
    },
  );
}
