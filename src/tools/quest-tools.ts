import { SIM_INCLUDE } from "../util/sim-script.js";
/**
 * Quest tools: the parameter-driven, whole-party quest system (docs/quest-system.md).
 *
 *   create_quest_system  shared runtime (inc_quest + q_chk/q_act/q_roll + event wrappers), once per module
 *   build_quest          a minimal quest spec -> journal, dialog, variables, event wiring (dry run first)
 *   remove_quest         undo build_quest for one tag
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldStr } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { QuestBuildError, QuestBuilder, removeQuest } from "../util/quest-builder.js";
import { generateQuestScripts, QUEST_INCLUDE } from "../util/quest-script.js";
import { normalizeQuestSpec, type QuestInput, QuestSpecError, STAGE_KINDS, TEMPLATES } from "../util/quest-spec.js";
import { writeAndCompileScript } from "../util/script-writer.js";

export async function writeQuestSystem(index: ModuleIndex): Promise<{
  scripts: Array<{ resref: string; compiled: boolean | "include"; compilerOutput?: string }>;
  compiled: boolean;
}> {
  const scripts: Array<{ resref: string; compiled: boolean | "include"; compilerOutput?: string }> = [];
  for (const [resref, source] of Object.entries(generateQuestScripts())) {
    const isInclude = resref === QUEST_INCLUDE || resref === SIM_INCLUDE;
    const r = await writeAndCompileScript(index, resref, source, !isInclude);
    scripts.push({
      resref,
      compiled: isInclude ? "include" : r.compiled === true,
      ...(isInclude || r.compiled ? {} : { compilerOutput: r.compilerOutput }),
    });
  }
  return { scripts, compiled: scripts.every((s) => s.compiled !== false) };
}

/** TRUE when some placed object or area in the module has this tag (for tag-convention auto-wiring). */
function tagExists(index: ModuleIndex, tag: string): boolean {
  const t = tag.toLowerCase();
  for (const area of index.areas.keys()) {
    const git = index.parsedGff.get(`${area}.git`);
    if (!git) continue;
    for (const list of ["Creature List", "Placeable List", "TriggerList", "WaypointList"]) {
      // Read without getFieldList, which creates a missing list (a dry run must not change anything).
      const objs = ((git as Record<string, unknown>)[list] as { value?: GffObj[] } | undefined)?.value ?? [];
      if (objs.some((o) => getFieldStr(o, "Tag").toLowerCase() === t)) return true;
    }
  }
  return index.resources.has(`${t}.uti`);
}

export function registerQuestTools(server: McpServer): void {
  server.tool(
    "create_quest_system",
    "Write and compile the shared quest runtime, once per module (build_quest also does it if missing): inc_quest " +
      "(quest state is the engine's own journal; whole-party credit — any member's advance moves everyone's journal and pays " +
      "every player 100%), q_chk (one dialog condition for every check, set by parameters: quest stage, items, gold, skill " +
      "rank, an earlier roll, a companion, a variable, escort state), q_act (one dialog action: advance and pay, take/give " +
      "items or gold, set a variable, turn hostile, unlock a door, spawn, destroy, leave, start an escort), q_roll (a skill " +
      "check rolled once, as an action) and the event wrappers q_ondeath, q_onenter, q_trigger, q_onused. Overwrites " +
      "earlier versions of these scripts.",
    {},
    async () => {
      const index = requireIndex();
      const r = await writeQuestSystem(index);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: r.compiled, ...r }, null, 2) }],
        ...(r.compiled ? {} : { isError: true }),
      };
    },
  );

  server.tool(
    "build_quest",
    "Build a whole quest from a short spec: journal category and entries, the giver's (and other NPCs') dialog merged into " +
      "their existing conversation, stage variables on every object involved (blueprint and placed copies), event wiring " +
      "(chaining existing handlers), unplaced kill targets placed, quest items created, rewards sized. Always run with " +
      "dryRun: true first and read the plan. Rebuilding the same tag replaces only what this quest made. Smallest spec: " +
      '{"name","giver","stages":[{"do","journal"}, ...]}. Stage kinds: ' +
      `${STAGE_KINDS.join(", ")}. Templates (one line instead of stages): ${TEMPLATES.join(", ")}. ` +
      "Stage 1 is accepting the quest from the giver; stages number themselves and each follows the previous; the last " +
      "stage ends the quest and gets a reward sized by `level` unless you give one. Objects tagged <tag>_giver/_target/" +
      "_captive/_npc/_item fill missing fields. See docs/quest-system.md for every field.",
    {
      spec: z
        .string()
        .describe(
          'JSON quest spec, e.g. {"name":"Wolves at the Fold","giver":"farmer_ned","level":3,"stages":[{"do":"talk","journal":"Ned asked me to deal with the wolves."},{"do":"kill","target":"wolf_alpha","area":"fold_hills","journal":"The alpha wolf is dead."},{"do":"return","journal":"Ned paid me."}]}. ' +
            "Stage fields: do, journal, to (NPC for talk/deliver), target (kill/rescue/escort/use), item / itemName / from_creature / in (pickup, deliver), " +
            'area / x / y / radius (explore, trigger, escort destination, placing a kill target), check {skill, dc, else:"fight"|"end"}, reward {xp_tier, gold, item}, ' +
            "n / from / end (branches and alternative endings), dialog lines offer, accept, acceptReply, decline, declineReply, text, reply, reminder, missing, plea, arrive.",
        ),
      dryRun: z.boolean().optional().describe("Plan only, change nothing (default false). Do this first."),
    },
    { destructiveHint: true },
    async ({ spec, dryRun }) => {
      const index = requireIndex();
      let input: QuestInput;
      try {
        input = JSON.parse(spec) as QuestInput;
      } catch (e) {
        return { content: [{ type: "text", text: `spec is not valid JSON: ${(e as Error).message}` }], isError: true };
      }
      try {
        const normalized = normalizeQuestSpec(input, (tag) => tagExists(index, tag));
        let systemWritten = false;
        if (!index.resources.has(`${QUEST_INCLUDE}.nss`) && !dryRun) {
          const sys = await writeQuestSystem(index);
          if (!sys.compiled)
            return {
              content: [
                { type: "text", text: JSON.stringify({ error: "quest runtime failed to compile", ...sys }, null, 2) },
              ],
              isError: true,
            };
          systemWritten = true;
        }
        const resman = await buildResmanOptions(index);
        const builder = new QuestBuilder(index, resman, normalized, dryRun === true);
        if (dryRun && !index.resources.has(`${QUEST_INCLUDE}.nss`)) {
          // A dry run doesn't write the runtime; let the plan run anyway.
          index.resources.set(`${QUEST_INCLUDE}.nss`, {
            resref: QUEST_INCLUDE,
            extension: "nss",
            filePath: "",
            sizeBytes: 0,
          });
          try {
            const report = await builder.build();
            report.notes.push("the quest runtime will be written on the real build");
            return { content: [{ type: "text", text: JSON.stringify({ success: true, ...report }, null, 2) }] };
          } finally {
            index.resources.delete(`${QUEST_INCLUDE}.nss`);
          }
        }
        const report = await builder.build();
        if (systemWritten) report.notes.push("quest runtime written (create_quest_system)");
        // Later phases (rewards, polish) rebuild from this exact spec.
        report.adventureMd += `\n- **Spec:** \`${JSON.stringify(input)}\``;
        return { content: [{ type: "text", text: JSON.stringify({ success: true, ...report }, null, 2) }] };
      } catch (e) {
        if (e instanceof QuestSpecError || e instanceof QuestBuildError) {
          return { content: [{ type: "text", text: e.message }], isError: true };
        }
        throw e;
      }
    },
  );

  server.tool(
    "remove_quest",
    "Remove a quest built by build_quest: its journal category, its dialog nodes (other dialog lines stay), its stage " +
      "variables on every object, and triggers it created. Event scripts it wired stay in place (they do nothing without " +
      "the variables); blueprints and items it created stay too.",
    { tag: z.string().describe("Quest tag, e.g. q_wolves_at_the_fold") },
    { destructiveHint: true },
    async ({ tag }) => {
      const index = requireIndex();
      const removed = await removeQuest(index, await buildResmanOptions(index), tag.toLowerCase());
      return {
        content: [{ type: "text", text: JSON.stringify({ success: true, tag, variablesRemoved: removed }, null, 2) }],
      };
    },
  );
}
