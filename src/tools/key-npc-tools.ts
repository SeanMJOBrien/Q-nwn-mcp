/**
 * build_key_npc: the non-companion twin of build_companion (work-plan F2, docs/creature-tools.md). One call builds a
 * combat-capable key NPC or boss: blueprint (default AI), forge_creature, placement, and a verify_creature pass.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { placeCreatureCore } from "../util/creature-placer.js";
import type { PowerLevel } from "../util/npc-stat-block.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";
import { verifyCreature } from "../util/verify/blueprints.js";
import { Report } from "../util/verify/common.js";
import type { GearRole } from "../util/wealth.js";
import { forgeCreature, writeCreatureLevelSystem } from "./creature-forge-tools.js";
import { resolveCreatureTarget } from "./npc-tools.js";

const FACTIONS: Record<string, number> = { hostile: 1, commoner: 2, merchant: 3, defender: 4 };

export function registerKeyNpcTools(server: McpServer): void {
  server.tool(
    "build_key_npc",
    "Build one combat-capable key NPC or boss end to end in a single call: the creature level system if missing, a " +
      "blueprint with the standard AI (faction hostile, commoner, merchant or defender; standard factions only), " +
      "forge_creature on it (legal level-1 build, spawn-time levelling, gear, spell abilities, domains/school), the placed " +
      "copy, and a verify_creature pass. The non-companion twin of build_companion (no recruit dialog; attach one with " +
      "create_dialog and `conversation`). Replaces create_creature_blueprint + forge_creature + place_creature. Standard PC " +
      "races only (race and appearance are the same number, 0-6); use the individual tools for another look. For a creature " +
      "that must carry a named plot item, pass gearWealth 0 and equip the item afterwards with set_creature_equipment.",
    {
      resref: z.string().describe("Blueprint resref (max 16 characters); also the tag unless `tag` is given"),
      name: z.string().describe("Display name"),
      area: z.string().describe("Area resref to place the NPC in"),
      x: numParam("X position (metres)"),
      y: numParam("Y position (metres)"),
      race: numParam("racialtypes.2da row, 0-6: Dwarf, Elf, Gnome, Halfling, Half-Elf, Half-Orc, Human"),
      classId: numParam("0 Barbarian 1 Bard 2 Cleric 3 Druid 4 Fighter 5 Monk 6 Paladin 7 Ranger 8 Rogue 9 Sorcerer 10 Wizard"),
      level: numParam("Absolute target level (reached at spawn)"),
      gender: numParam("0 male, 1 female"),
      faction: z.enum(["hostile", "commoner", "merchant", "defender"]).optional().describe("Standard faction (default hostile for a boss; use commoner for a friendly NPC)"),
      gearRole: z.enum(["pc", "elite", "standard", "mook"]).optional().describe("Gear budget role (default elite)"),
      lootable: z.boolean().optional().describe("Leave a lootable body (default true: its gear drops as a corpse like any other fighter; false drops a loose bag)"),
      conversation: z.string().optional().describe("Dialog resref to attach (build it with create_dialog)"),
      tag: z.string().optional().describe("Tag (default: resref)"),
      bearing: optNumParam("Compass facing in degrees (0 north, 90 east); default 0"),
      pinnedSpells: z.string().optional().describe("JSON array of spells.2da rows always picked first"),
      domains: z.string().optional().describe("Cleric: JSON array of two domains.2da rows"),
      school: optNumParam("Wizard: spellschools.2da row"),
      powerLevel: z.string().optional().describe("low | standard | tougher | epic (default standard); tougher and epic are for a genuine boss"),
      gearWealth: optNumParam('Allowance multiplier; "0" keeps current gear (a specific plot item)'),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const resref = args.resref.toLowerCase();
      const tag = (args.tag ?? args.resref).toLowerCase();
      const race = toI(args.race);
      const classId = toI(args.classId);
      const level = toI(args.level);
      const fail = (error: string, extra: Record<string, unknown> = {}) => ({
        content: [{ type: "text" as const, text: JSON.stringify({ success: false, error, ...extra }, null, 2) }],
        isError: true,
      });
      if (resref.length > 16) return fail(`resref "${resref}" is longer than 16 characters`);
      if (race < 0 || race > 6) return fail("race must be 0-6 (a standard PC race); use the individual tools for another look");
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
      if (!index.resources.has("cf_spawn.ncs")) {
        const sys = await writeCreatureLevelSystem(index);
        if (!sys.compiled) return fail(`the creature level system failed to compile: ${sys.compilerOutput}`);
        steps.push("creature level system written");
      }
      const built = await buildCreatureBlueprint(index, {
        resref,
        tag,
        name: args.name,
        faction: FACTIONS[args.faction ?? "hostile"],
        race,
        appearance: race,
        gender: toI(args.gender, 0),
        lootable: args.lootable ?? true,
        ...(args.conversation ? { conversation: args.conversation } : {}),
      });
      if (!built.success) return fail(`blueprint: ${built.error}`);
      steps.push("blueprint built");

      const resmanOpts = await buildResmanOptions(index);
      const target = await resolveCreatureTarget(index, resref, undefined, undefined, "build_key_npc", "key NPC");
      if ("error" in target) return fail(target.error, { steps });
      const forged = await forgeCreature(index, resmanOpts, target, {
        race,
        classId,
        level,
        gearRole: (args.gearRole ?? "elite") as GearRole,
        powerLevel: args.powerLevel as PowerLevel | undefined,
        gearWealth: args.gearWealth !== undefined ? toF(args.gearWealth) : undefined,
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
        return fail(`built and forged ${resref}, but placing it failed: ${placed.error} ${placed.detail ?? ""}`.trim(), { steps, position: placed.position });
      }
      steps.push("placed");

      const doc = index.parsedGff.get(`${resref}.utc`) as GffObj;
      const report = new Report(resref, "utc");
      await verifyCreature(report, index, doc);
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
                faction: args.faction ?? "hostile",
                steps,
                forged: { level: forged.targetLevel, gear: forged.gear, spellPoolSizes: forged.spellPoolSizes, ...(forged.warnings.length ? { warnings: forged.warnings } : {}) },
                verify: report.result(),
                next: "attach a dialog if it talks (create_dialog, then edit the blueprint's conversation); run_live_verification and fix any [SPEC_FAIL] lines",
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
