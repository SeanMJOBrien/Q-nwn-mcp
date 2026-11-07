/**
 * Companion (henchman) tools.
 *
 *   create_companion_system  shared recruit/dismiss/order scripts, once per module
 *   create_companion_dialog  one companion's four-root dialog, wired onto its blueprint and placed copies
 *
 * Script source lives in util/companion-script.ts.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import {
  buildCompanionDialogTree,
  COMPANION_INCLUDE,
  COMPANION_SCRIPTS,
  type CompanionDialogText,
  DEFAULT_MAX_COMPANIONS,
  generateCompanionScripts,
} from "../util/companion-script.js";
import { getGitDoc, writeBackGit } from "../util/git-helpers.js";
import { toI } from "../util/params.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { buildDialogDocument, validateTree, writeDialogDocument } from "./dialog-write-tools.js";
import { resolveCreatureTarget } from "./npc-tools.js";

export interface CompanionSystemResult {
  scripts: Array<{ resref: string; compiled: boolean | "include"; compilerOutput?: string }>;
  compiled: boolean;
  maxCompanions: number;
}

/** Write every companion script; the include is proven by the scripts that include it. */
export async function writeCompanionSystem(
  index: ModuleIndex,
  maxCompanions = DEFAULT_MAX_COMPANIONS,
): Promise<CompanionSystemResult> {
  const sources = generateCompanionScripts({ maxCompanions });
  const scripts: CompanionSystemResult["scripts"] = [];
  for (const [resref, source] of Object.entries(sources)) {
    const isInclude = resref === COMPANION_INCLUDE;
    const r = await writeAndCompileScript(index, resref, source, !isInclude);
    scripts.push({
      resref,
      compiled: isInclude ? "include" : r.compiled === true,
      ...(isInclude || r.compiled ? {} : { compilerOutput: r.compilerOutput }),
    });
  }
  return { scripts, compiled: scripts.every((s) => s.compiled !== false), maxCompanions };
}

/** Set `Conversation` on a creature blueprint and on every placed copy of it (matched by TemplateResRef). */
async function wireConversation(
  index: ModuleIndex,
  creature: string,
  dialog: string,
): Promise<{ blueprint: boolean; placed: string[] }> {
  const res = creature.toLowerCase();
  let blueprint = false;
  const target = await resolveCreatureTarget(index, res, undefined, undefined, "create_companion_dialog", "companion");
  if (!("error" in target)) {
    setField(target.obj, "Conversation", "resref", dialog);
    await target.save();
    blueprint = true;
  }
  const placed: string[] = [];
  for (const area of index.areas.keys()) {
    let git: ReturnType<typeof getGitDoc>;
    try {
      git = getGitDoc(index, area);
    } catch {
      continue;
    }
    const matches = getFieldList(git.obj, "Creature List").filter(
      (c: GffObj) => getFieldStr(c, "TemplateResRef").toLowerCase() === res,
    );
    if (matches.length === 0) continue;
    snapshotGitForUndo(git.doc, area, "create_companion_dialog", `Set Conversation ${dialog} on ${res}`);
    for (const c of matches) {
      setField(c, "Conversation", "resref", dialog);
      placed.push(`${area}:${getFieldStr(c, "Tag")}`);
    }
    await writeBackGit(index, area, git.doc);
  }
  return { blueprint, placed };
}

export function registerCompanionTools(server: McpServer): void {
  server.tool(
    "create_companion_system",
    "Write and compile the shared companion (henchman) scripts, once per module: inc_companion (party cap counted from the " +
      "engine each time, no counter), conditions c_hen_mine / c_hen_full / c_hen_free and actions a_hen_join / a_hen_leave / " +
      "a_hen_stay / a_hen_follow. Join raises the henchman cap before AddHenchman, sets listen patterns and starts the companion " +
      "in follow mode; dismissing or a companion's death frees its slot automatically. Overwrites earlier versions of these " +
      "scripts. Then build each companion with create_companion_dialog.",
    {
      maxCompanions: z
        .string()
        .optional()
        .describe(
          `Companions allowed in the whole party at once, all PCs combined (default ${DEFAULT_MAX_COMPANIONS}, max 10)`,
        ),
    },
    { destructiveHint: true },
    async ({ maxCompanions }) => {
      const index = requireIndex();
      const result = await writeCompanionSystem(index, maxCompanions !== undefined ? toI(maxCompanions) : undefined);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: result.compiled, ...result }, null, 2) }],
        ...(result.compiled ? {} : { isError: true }),
      };
    },
  );

  server.tool(
    "create_companion_dialog",
    "Build one companion's dialog and set it as the Conversation of its blueprint and every placed copy. Four roots, first TRUE " +
      "wins: in the speaker's party (hold position / follow / part ways / never mind), free but party full, free (introduction, " +
      "backstory, join), and an unconditional fallback so it never opens empty. You write the character's lines; the order " +
      "lines and scripts are fixed. Needs create_companion_system first.",
    {
      creature: z.string().describe("Companion blueprint resref (also matches placed copies by TemplateResRef)"),
      dialog: z.string().optional().describe("Dialog resref (default dlg_hen_<creature>, cut to 16 characters)"),
      introduction: z.string().describe("First-meeting line: who they are and why they are here"),
      backstory: z.string().describe('Answer to "Tell me about yourself"'),
      accept: z.string().optional().describe('Line when they agree to join (default "I\'ll come with you.")'),
      askToJoin: z.string().optional().describe('PC line asking them to join (default "Will you travel with me?")'),
      partyFull: z.string().optional().describe("Line when they are free but the party is full"),
      inParty: z.string().optional().describe('Greeting when the speaker leads them (default "What do you need?")'),
      farewell: z.string().optional().describe("Line when dismissed"),
      stay: z.string().optional().describe("Reply to the hold-position order"),
      follow: z.string().optional().describe("Reply to the follow order"),
      fallback: z.string().optional().describe("Line for anyone else, e.g. another player's companion"),
      replace: z.boolean().optional().describe("Overwrite an existing dialog with this resref (default false)"),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const creature = args.creature.toLowerCase();
      const dialog = (args.dialog ?? `dlg_hen_${creature}`).toLowerCase().slice(0, 16);
      if (index.resources.has(`${dialog}.dlg`) && !args.replace) {
        return {
          content: [{ type: "text", text: `Dialog ${dialog}.dlg already exists; pass replace: true to overwrite it.` }],
          isError: true,
        };
      }
      const text: CompanionDialogText = {
        introduction: args.introduction,
        backstory: args.backstory,
        accept: args.accept,
        askToJoin: args.askToJoin,
        partyFull: args.partyFull,
        inParty: args.inParty,
        farewell: args.farewell,
        stay: args.stay,
        follow: args.follow,
        fallback: args.fallback,
      };
      const tree = buildCompanionDialogTree(text);
      const treeErr = validateTree(tree, "npc");
      if (treeErr) return { content: [{ type: "text", text: treeErr }], isError: true };
      const sizeBytes = await writeDialogDocument(index, dialog, buildDialogDocument(tree));
      const wired = await wireConversation(index, creature, dialog);

      const warnings: string[] = [];
      const missing = COMPANION_SCRIPTS.filter((s) => s !== COMPANION_INCLUDE && !index.resources.has(`${s}.ncs`));
      if (missing.length)
        warnings.push(`Compiled companion scripts missing (${missing.join(", ")}): run create_companion_system.`);
      if (!wired.blueprint && wired.placed.length === 0) {
        warnings.push(
          `No ${creature}.utc blueprint or placed copy found; the dialog was written but not attached to anything.`,
        );
      }
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: true, dialog, sizeBytes, wired, ...(warnings.length ? { warnings } : {}) },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
