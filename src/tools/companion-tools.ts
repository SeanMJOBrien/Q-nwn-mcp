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
import { buildResmanOptions, requireIndex } from "../module-loader.js";
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
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { placeCreatureCore } from "../util/creature-placer.js";
import { getGitDoc, writeBackGit } from "../util/git-helpers.js";
import type { PowerLevel } from "../util/npc-stat-block.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { verifyCreature } from "../util/verify/blueprints.js";
import { Report, twoDARow } from "../util/verify/common.js";
import type { GearRole } from "../util/wealth.js";
import { forgeCreature, writeCreatureLevelSystem } from "./creature-forge-tools.js";
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

export interface CompanionDialogArgs {
  creature: string;
  dialog?: string;
  introduction: string;
  backstory: string;
  accept?: string;
  askToJoin?: string;
  partyFull?: string;
  inParty?: string;
  farewell?: string;
  stay?: string;
  follow?: string;
  fallback?: string;
  replace?: boolean;
}

/** Build one companion's dialog and wire it onto its blueprint and placed copies (shared by two tools). */
export async function createCompanionDialog(
  index: ModuleIndex,
  args: CompanionDialogArgs,
): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const creature = args.creature.toLowerCase();
  const dialog = (args.dialog ?? `dlg_hen_${creature}`).toLowerCase().slice(0, 16);
  if (index.resources.has(`${dialog}.dlg`) && !args.replace) {
    return { ok: false, error: `Dialog ${dialog}.dlg already exists; pass replace: true to overwrite it.` };
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
  if (treeErr) return { ok: false, error: treeErr };
  const sizeBytes = await writeDialogDocument(index, dialog, buildDialogDocument(tree));
  const wired = await wireConversation(index, creature, dialog);

  const warnings: string[] = [];
  const missing = COMPANION_SCRIPTS.filter((sc) => sc !== COMPANION_INCLUDE && !index.resources.has(`${sc}.ncs`));
  if (missing.length)
    warnings.push(`Compiled companion scripts missing (${missing.join(", ")}): run create_companion_system.`);
  if (!wired.blueprint && wired.placed.length === 0) {
    warnings.push(
      `No ${creature}.utc blueprint or placed copy found; the dialog was written but not attached to anything.`,
    );
  }
  return { ok: true, result: { success: true, dialog, sizeBytes, wired, ...(warnings.length ? { warnings } : {}) } };
}

/**
 * TYPE 0 (PC) voicesets per class and gender — TYPE 3 NPC sets are sparse and leave a companion mute. A row is used
 * only when soundset.2da confirms it has a RESREF and the right GENDER; otherwise the voice is left unset.
 */
const COMPANION_SOUNDSETS: Record<number, [number, number]> = {
  0: [419, 357],
  4: [419, 357],
  7: [420, 433],
  10: [418, 361],
  9: [418, 361],
  2: [366, 422],
  3: [366, 422],
  8: [367, 421],
  1: [367, 421],
  5: [419, 357],
  6: [419, 357],
};

function companionSoundset(index: ModuleIndex, classId: number, gender: number): number | undefined {
  const row = COMPANION_SOUNDSETS[classId]?.[gender === 1 ? 1 : 0];
  if (row === undefined) return undefined;
  const r = twoDARow(index, "soundset", row);
  if (!r || !r.RESREF || r.RESREF === "****") return undefined;
  const g = r.GENDER;
  if (g !== undefined && g !== "****" && Number(g) !== gender) return undefined;
  return row;
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
      const r = await createCompanionDialog(requireIndex(), args);
      if (!r.ok) return { content: [{ type: "text", text: r.error }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(r.result, null, 2) }] };
    },
  );

  server.tool(
    "build_companion",
    "Build one companion end to end in a single call: shared scripts if missing (create_companion_system, " +
      "create_creature_level_system), a henchman blueprint (stock x0_ch_hen_* AI, Commoner faction, a PC voiceset chosen " +
      "from class and gender), forge_creature on it (legal level-1 build, spawn-time levelling, gear, spell abilities, " +
      "domains/school), the placed copy, the four-root recruit dialog, and a verify_creature pass. Replaces " +
      "create_creature_blueprint + place_creature + forge_creature (x2) + create_companion_dialog. You supply the character: " +
      "name, race, class, level, and the dialog lines. Standard PC races only (race and appearance are the same number, " +
      "0-6); use the individual tools for a non-standard look.",
    {
      resref: z.string().describe("Blueprint resref (max 16 characters); also the tag unless `tag` is given"),
      name: z.string().describe("Display name"),
      area: z.string().describe("Area resref to place the companion in"),
      x: numParam("X position (metres)"),
      y: numParam("Y position (metres)"),
      race: numParam("racialtypes.2da row, 0-6: Dwarf, Elf, Gnome, Halfling, Half-Elf, Half-Orc, Human"),
      classId: numParam(
        "0 Barbarian 1 Bard 2 Cleric 3 Druid 4 Fighter 5 Monk 6 Paladin 7 Ranger 8 Rogue 9 Sorcerer 10 Wizard",
      ),
      level: numParam("Absolute target level (reached at spawn)"),
      gender: numParam("0 male, 1 female"),
      introduction: z.string().describe("First-meeting line: who they are and why they are here"),
      backstory: z.string().describe('Answer to "Tell me about yourself"'),
      accept: z.string().optional().describe("Line when they agree to join"),
      farewell: z.string().optional().describe("Line when dismissed"),
      partyFull: z.string().optional().describe("Line when they are free but the party is full"),
      tag: z.string().optional().describe("Tag (default: resref)"),
      bearing: optNumParam("Compass facing in degrees (0 north, 90 east); default 0"),
      pinnedSpells: z.string().optional().describe("JSON array of spells.2da rows always picked first"),
      domains: z.string().optional().describe("Cleric: JSON array of two domains.2da rows"),
      school: optNumParam("Wizard: spellschools.2da row"),
      powerLevel: z.string().optional().describe("low | standard | tougher | epic (default standard)"),
      gearWealth: optNumParam('Allowance multiplier; "0" keeps current gear (a specific plot item)'),
      soundset: optNumParam("Override the voiceset row (default: chosen from class and gender)"),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const resref = args.resref.toLowerCase();
      const tag = (args.tag ?? args.resref).toLowerCase();
      const race = toI(args.race);
      const classId = toI(args.classId);
      const level = toI(args.level);
      const gender = toI(args.gender, 0);
      const fail = (error: string, extra: Record<string, unknown> = {}) => ({
        content: [{ type: "text" as const, text: JSON.stringify({ success: false, error, ...extra }, null, 2) }],
        isError: true,
      });
      if (resref.length > 16) return fail(`resref "${resref}" is longer than 16 characters`);
      if (race < 0 || race > 6)
        return fail("race must be 0-6 (a standard PC race); use the individual tools for another look");
      if (level < 1) return fail("level must be at least 1");
      if (index.resources.has(`${resref}.utc`)) return fail(`${resref}.utc already exists`);
      let pinned: number[] | undefined;
      let domains: number[] | undefined;
      try {
        pinned = args.pinnedSpells ? (JSON.parse(args.pinnedSpells) as number[]) : undefined;
        domains = args.domains ? (JSON.parse(args.domains) as number[]) : undefined;
      } catch {
        return fail("pinnedSpells and domains must be JSON arrays of numbers");
      }

      const steps: string[] = [];
      if (!index.resources.has("a_hen_join.ncs")) {
        const sys = await writeCompanionSystem(index);
        if (!sys.compiled) return fail("the companion system failed to compile", { scripts: sys.scripts });
        steps.push("companion system written");
      }
      if (!index.resources.has("cf_spawn.ncs")) {
        const sys = await writeCreatureLevelSystem(index);
        if (!sys.compiled) return fail(`the creature level system failed to compile: ${sys.compilerOutput}`);
        steps.push("creature level system written");
      }

      const soundset = args.soundset !== undefined ? toI(args.soundset) : companionSoundset(index, classId, gender);
      const built = await buildCreatureBlueprint(index, {
        resref,
        tag,
        name: args.name,
        faction: 2,
        henchman: true,
        race,
        appearance: race,
        gender,
        ...(soundset !== undefined ? { soundset } : {}),
      });
      if (!built.success) return fail(`blueprint: ${built.error}`);
      steps.push("blueprint built");

      const resmanOpts = await buildResmanOptions(index);
      const target = await resolveCreatureTarget(index, resref, undefined, undefined, "build_companion", "companion");
      if ("error" in target) return fail(target.error, { steps });
      // Forge the blueprint first so the placed copy inherits the build and the spawn wiring.
      const forged = await forgeCreature(index, resmanOpts, target, {
        race,
        classId,
        level,
        gearRole: "pc" as GearRole,
        powerLevel: args.powerLevel as PowerLevel | undefined,
        gearWealth: args.gearWealth !== undefined ? toF(args.gearWealth) : undefined,
        originalSpawn: "x0_ch_hen_spawn",
        pinnedSpells: pinned,
        domains,
        school: args.school !== undefined ? toI(args.school) : undefined,
      });
      await target.save();
      steps.push("forged");

      const placed = await placeCreatureCore(index, resmanOpts, {
        area: args.area,
        blueprint: resref,
        x: toF(args.x),
        y: toF(args.y),
        bearing: args.bearing !== undefined ? toF(args.bearing) : 0,
      });
      if (!placed.success) {
        return fail(
          `built and forged ${resref}, but placing it failed: ${placed.error} ${placed.detail ?? ""}`.trim(),
          {
            steps,
            position: placed.position,
          },
        );
      }
      steps.push("placed");

      const dialog = await createCompanionDialog(index, {
        creature: resref,
        introduction: args.introduction,
        backstory: args.backstory,
        accept: args.accept,
        farewell: args.farewell,
        partyFull: args.partyFull,
        replace: true,
      });
      if (!dialog.ok) return fail(`dialog: ${dialog.error}`, { steps });
      steps.push("dialog wired");

      const doc = index.parsedGff.get(`${resref}.utc`) as GffObj;
      const report = new Report(resref, "utc");
      await verifyCreature(report, index, doc, { henchman: true });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                resref,
                tag,
                area: args.area,
                position: placed.placedPosition,
                voiceset: soundset ?? "none (no valid TYPE 0 row found)",
                steps,
                forged: {
                  level: forged.targetLevel,
                  gear: forged.gear,
                  spellPoolSizes: forged.spellPoolSizes,
                  ...(forged.warnings.length ? { warnings: forged.warnings } : {}),
                },
                dialog: dialog.result,
                verify: report.result(),
                next: "run_live_verification: fix any [SPEC_FAIL] lines",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
