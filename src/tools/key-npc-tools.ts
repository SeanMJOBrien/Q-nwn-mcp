/**
 * build_key_npc: the non-companion twin of build_companion (work-plan F2, docs/creature-tools.md). One call builds a
 * combat-capable key NPC or boss: blueprint (default AI), forge_creature, placement, and a verify_creature pass.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { checkCreatureSpot, findPlacedCreature, placeCreatureCore } from "../util/creature-placer.js";
import { callTool, hasTool } from "../util/tool-registry.js";
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
      "create_dialog and `conversation`; a conversation resref that does not exist yet gets a greeting dialog). The spot is checked before anything is written; calling it again for a creature built earlier places that one (or answers that it is already placed) instead of failing. Replaces create_creature_blueprint + forge_creature + place_creature. Standard PC " +
      "races only (race and appearance are the same number, 0-6); use the individual tools for another look. For a creature " +
      "that must carry a named plot item, pass gearWealth 0 and equip the item afterwards with set_creature_equipment.",
    {
      resref: z.string().describe("Blueprint resref (max 16 characters); also the tag unless `tag` is given"),
      name: z.string().describe("Display name"),
      area: z.string().describe("Area resref to place the NPC in"),
      x: numParam("X position (metres)"),
      y: numParam("Y position (metres)"),
      race: numParam("racialtypes.2da row, 0-6: Dwarf, Elf, Gnome, Halfling, Half-Elf, Half-Orc, Human"),
      classId: numParam(
        "0 Barbarian 1 Bard 2 Cleric 3 Druid 4 Fighter 5 Monk 6 Paladin 7 Ranger 8 Rogue 9 Sorcerer 10 Wizard",
      ),
      level: numParam("Absolute target level (reached at spawn)"),
      gender: numParam("0 male, 1 female"),
      faction: z
        .enum(["hostile", "commoner", "merchant", "defender"])
        .optional()
        .describe("Standard faction (default hostile for a boss; use commoner for a friendly NPC)"),
      gearRole: z.enum(["pc", "elite", "standard", "mook"]).optional().describe("Gear budget role (default elite)"),
      lootable: z
        .boolean()
        .optional()
        .describe(
          "Leave a lootable body (default true: its gear drops as a corpse like any other fighter; false drops a loose bag)",
        ),
      conversation: z.string().optional().describe("Dialog resref to attach (build it with create_dialog)"),
      tag: z.string().optional().describe("Tag (default: resref)"),
      bearing: optNumParam("Compass facing in degrees (0 north, 90 east); default 0"),
      pinnedSpells: z.string().optional().describe("JSON array of spells.2da rows always picked first"),
      domains: z.string().optional().describe("Cleric: JSON array of two domains.2da rows"),
      school: optNumParam("Wizard: spellschools.2da row"),
      powerLevel: z
        .string()
        .optional()
        .describe("low | standard | tougher | epic (default standard); tougher and epic are for a genuine boss"),
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
      if (race < 0 || race > 6)
        return fail("race must be 0-6 (a standard PC race); use the individual tools for another look");
      if (level < 1) return fail("level must be at least 1");
      const conversation = args.conversation?.toLowerCase();
      if (conversation && !/^[a-z0-9_]{1,16}$/.test(conversation)) {
        return fail(
          `conversation "${args.conversation}" is not a valid resref: lower-case letters, digits and _, at most 16 characters (e.g. "${conversation.replace(/[^a-z0-9_]/g, "").slice(0, 16)}")`,
        );
      }

      // Built before? Placed: nothing to do. Not placed (an earlier placement failed): place it now, no rebuild.
      const exists = index.resources.has(`${resref}.utc`);
      const placedAlready = exists ? findPlacedCreature(index, resref) : null;
      if (placedAlready) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(
                {
                  success: true,
                  alreadyBuilt: true,
                  resref,
                  area: placedAlready.area,
                  position: { x: Math.round(placedAlready.x * 10) / 10, y: Math.round(placedAlready.y * 10) / 10 },
                  next: `${resref} is already built and placed; nothing to do. Use another resref for a second NPC, or move_object to move this one.`,
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // The spot first, before anything is written.
      const resmanOpts = await buildResmanOptions(index);
      const spot = await checkCreatureSpot(index, resmanOpts, args.area, toF(args.x), toF(args.y));
      if (!spot.ok) {
        return fail(`nothing was built: ${spot.error}`, {
          fix: `adventure_find_walkable(area: "${args.area}", clearRadius: "2") gives open ground away from other objects; call build_key_npc again with that x and y`,
        });
      }
      let pinned: number[] | undefined;
      let domains: number[] | undefined;
      try {
        pinned = args.pinnedSpells ? (JSON.parse(args.pinnedSpells) as number[]) : undefined;
        domains = args.domains ? (JSON.parse(args.domains) as number[]) : undefined;
      } catch {
        return fail("pinnedSpells and domains must be JSON arrays of numbers");
      }

      const steps: string[] = [];
      let forged: Awaited<ReturnType<typeof forgeCreature>> | undefined;
      if (exists) steps.push("blueprint from an earlier call reused");
      else {
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
          ...(conversation ? { conversation } : {}),
        });
        if (!built.success) return fail(`blueprint: ${built.error}`);
        steps.push("blueprint built");

        const target = await resolveCreatureTarget(index, resref, undefined, undefined, "build_key_npc", "key NPC");
        if ("error" in target) return fail(target.error, { steps });
        forged = await forgeCreature(index, resmanOpts, target, {
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
      }

      // A named dialog that does not exist yet: a greeting with a way out, for build_quest to add lines to.
      if (conversation && !index.resources.has(`${conversation}.dlg`) && hasTool("create_dialog")) {
        const made = await callTool("create_dialog", {
          resref: conversation,
          nodes: JSON.stringify([{ speaker: "npc", text: `Well met. I am ${args.name}.` }]),
        });
        if (!made.isError) steps.push(`greeting dialog ${conversation} created`);
      }

      const placed = await placeCreatureCore(index, resmanOpts, {
        area: args.area,
        blueprint: resref,
        x: toF(args.x),
        y: toF(args.y),
        bearing: args.bearing !== undefined ? toF(args.bearing) : 0,
      });
      if (!placed.success) {
        return fail(
          `built ${resref}, but placing it failed (call build_key_npc again with another x and y: the blueprint is reused): ${placed.error} ${placed.detail ?? ""}`.trim(),
          { steps, position: placed.position },
        );
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
                ...(forged
                  ? {
                      forged: {
                        level: forged.targetLevel,
                        gear: forged.gear,
                        spellPoolSizes: forged.spellPoolSizes,
                        ...(forged.warnings.length ? { warnings: forged.warnings } : {}),
                      },
                    }
                  : {}),
                verify: report.result(),
                next: "Done: the NPC is built and placed; do not call build_key_npc again for it. A quest adds its lines to the NPC's dialog with build_quest.",
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
