/**
 * Encounter composer tool — F5 (dry-run), F6 (placement) and F4 (ally-side
 * reinforcement, report-only) of docs/encounter-composer-spec.md.
 *
 * Wires F1 (archetype library), F2 (reverse EL solver) and F3
 * (support-roster chooser) together into the single call the feature was
 * planned around: an LLM says "I need a necromancer for a CR 6 battle" and
 * gets back a plan — or, with an `area` given, a built and placed roster.
 *
 * F6 needed a real refactor to become possible at all: create_creature_
 * blueprint's and place_creature's core logic lived entirely inside their
 * MCP tool handlers, with no reusable exported function — unlike
 * write_script's writeAndCompileScript. Extracted into
 * src/util/creature-builder.ts and src/util/creature-placer.ts
 * (behavior-preserving — the original MCP tools are now thin wrappers
 * around the same functions, confirmed by the full existing test suite
 * passing unchanged).
 *
 * Deliberately narrower than the original design sketch:
 * - `role` is singular, not `roles: string[]` — see planSupportCluster's
 *   own scope limit (no verified mixed-boss combination rule).
 * - `bossCR` is a required caller input, not derived from `targetEL` — see
 *   the same scope limit; nothing can honestly split a fight's difficulty
 *   between a boss and its support without a source for that split.
 * - Placement mode forges the boss (forgeCreature, 2026-11-07): it levels, shops and gets spell abilities
 *   at spawn through cf_spawn, like every other class-based creature. It used to build its own stat block,
 *   equip only clothing and wire a separate caster system, and it never set a faction (0 = player).
 * - F4 is report-only, per the spec's own "deliberately conservative for a
 *   first version" design: when partyLevel is given and the worse of the
 *   boss's/support's band is "hard" or "deadly", `allyRecommendation`
 *   surfaces that fact and names the existing companion pipeline
 *   (create_creature_blueprint henchman:true + forge_creature + create_companion_dialog) as the
 *   way to add a reinforcing ally — it never builds one itself. `partySize`
 *   is accepted purely as a caveat label, never folded into the EL/band math
 *   — see encounter-difficulty.ts's bandDifficulty doc comment for why no
 *   party-size adjustment formula is applied.
 */

import { random } from "../util/rng.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { forgeCreature, writeCreatureLevelSystem } from "./creature-forge-tools.js";
import { resolveCreatureTarget } from "./npc-tools.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { findSimpleWalkableSpots, placeCreatureCore } from "../util/creature-placer.js";
import { ARCHETYPES, getArchetype, pickSupportCandidate } from "../util/encounter-archetypes.js";
import {
  bandDifficulty,
  type DifficultyLabel,
  difficultyRank,
  planSupportCluster,
} from "../util/encounter-difficulty.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";
import { verifyCreature } from "../util/verify/blueprints.js";
import { Report } from "../util/verify/common.js";

/** Keep resref within NWN's 16-char limit — see this project's own documented bug class for what happens when a generator doesn't. */
function shortResref(role: string): string {
  const suffix = random().toString(36).slice(2, 8);
  return `ce_${role.slice(0, 3)}_${suffix}`.slice(0, 16);
}

export function registerEncounterComposerTools(server: McpServer): void {
  server.tool(
    "compose_encounter",
    "Given a thematic role (e.g. 'necromancer') and a target Encounter Level, report whether the boss alone meets " +
      "it and, if not, a real support-creature cluster that closes the gap. Wires together the archetype library " +
      "(role name -> class/level), the reverse EL solver (target EL -> required support count), and the " +
      "support-roster chooser (a real base-game blueprint for the archetype's natural minion type) — see " +
      "docs/encounter-composer-spec.md. Without `area`: dry-run, builds and places nothing, needs no module " +
      "loaded. With `area`: builds a Hostile boss and forges it like forge_creature (gearRole elite, powerLevel " +
      "tougher): a legal level-1 build now, and at spawn it levels to its CR, buys proficient gear from stores and, " +
      "for a caster, gets spell abilities at the right caster level. Writes the shared level system (cf_spawn) if " +
      "the module lacks it. Places the boss and the support cluster (ready-made palette monsters) and runs " +
      "verify_creature on the boss. Reports the boss's and the support cluster's EL as two separate " +
      "numbers, never one combined figure — no verified DMG rule exists for combining different-CR groups into " +
      "a single EL. When " +
      "partyLevel is given and the fight bands 'hard'/'deadly', also returns allyRecommendation flagging that and " +
      "naming the existing companion pipeline as the way to add a reinforcing ally — never builds one itself.",
    {
      role: z
        .string()
        .describe(
          `Archetype name (case-insensitive). Currently recognized: ${Object.keys(ARCHETYPES).join(", ")}. ` +
            "An unrecognized role returns an error naming the recognized list — never a guessed mapping.",
        ),
      bossCR: optNumParam(
        "The boss's own CR (and, via the archetype's levelForCR, its class level). Default: targetEL, so the boss " +
          "carries the whole fight alone. Give a lower value to add support creatures.",
      ),
      targetEL: numParam(
        "Desired Encounter Level of the WHOLE fight. A request for 'a CR 6 battle' means this (user decision, " +
          "2026-11-11): EL 6 for the entire fight, not the boss's own CR. With bossCR omitted the boss is built at CR = targetEL.",
      ),
      partyLevel: optNumParam(
        "Average party level, used only to band the boss's and the support cluster's difficulty " +
          "(trivial/easy/standard/hard/deadly) for human-readable context — not part of the EL math itself.",
      ),
      partySize: optNumParam(
        "Number of PCs facing this fight. Purely a caveat label on allyRecommendation (e.g. 'smaller than the " +
          "DMG's assumed 4-character party') — never folded into the band/EL math, since no DMG-sourced formula " +
          "for the exact size adjustment could be verified (see encounter-difficulty.ts).",
      ),
      area: z
        .string()
        .optional()
        .describe(
          "Area resref to build and place into. Omit for a dry-run (plan only, no module needed). When given, needs " +
            "a module already loaded (load_module) and that area to exist in it.",
        ),
    },
    { destructiveHint: true },
    async ({ role, bossCR, targetEL, partyLevel, partySize, area }) => {
      const archetype = getArchetype(role);
      if (!archetype) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: `Unrecognized role "${role}".`,
                  recognizedRoles: Object.keys(ARCHETYPES),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      // 'CR N' in a request is the whole fight's EL (user decision 2026-11-11): the boss alone is that fight unless a lower bossCR is given.
      const targetELNum = toF(targetEL);
      const bossCRNum = bossCR !== undefined ? toF(bossCR) : targetELNum;
      const partyLevelNum = partyLevel !== undefined ? toI(partyLevel) : undefined;
      const partySizeNum = partySize !== undefined ? toI(partySize) : undefined;
      const bossLevel = archetype.levelForCR(bossCRNum);

      const supportCandidate = pickSupportCandidate(archetype.naturalSupport, bossCRNum);
      const plan = supportCandidate
        ? planSupportCluster(bossCRNum, targetELNum, supportCandidate.cr)
        : planSupportCluster(bossCRNum, targetELNum, bossCRNum);

      const bossBand: DifficultyLabel | undefined =
        partyLevelNum !== undefined ? bandDifficulty(plan.bossEL, partyLevelNum) : undefined;
      const supportBand: DifficultyLabel | undefined =
        partyLevelNum !== undefined && plan.support
          ? bandDifficulty(plan.support.achievedEL, partyLevelNum)
          : undefined;

      const result: Record<string, unknown> = {
        success: true,
        role: archetype.name,
        boss: {
          classId: archetype.classId,
          level: bossLevel,
          cr: bossCRNum,
          el: plan.bossEL,
          band: bossBand,
        },
        bossAloneSufficient: plan.bossAloneSufficient,
        targetEL: targetELNum,
        bossCrDerived: bossCR === undefined,
        support:
          plan.support && supportCandidate
            ? {
                resref: supportCandidate.resref,
                tag: supportCandidate.tag,
                cr: plan.support.cr,
                count: plan.support.count,
                el: plan.support.achievedEL,
                band: supportBand,
              }
            : null,
        caveat: archetype.caveat,
        note:
          "boss.el and support.el are reported separately, never combined into one figure — see this tool's own " +
          "description for why. support is null when the boss alone already meets targetEL, or when this " +
          "archetype has no naturalSupport candidate yet.",
      };

      // ─── F4: ally-side reinforcement — report-only ─────────────────────
      // Only meaningful when partyLevel was given (band needs it). Flags,
      // never auto-builds — see this file's own header comment for why.
      if (partyLevelNum !== undefined) {
        const worstBand =
          supportBand && difficultyRank(supportBand) > difficultyRank(bossBand as DifficultyLabel)
            ? supportBand
            : (bossBand as DifficultyLabel);
        const recommended = difficultyRank(worstBand) >= difficultyRank("hard");
        result.allyRecommendation = {
          recommended,
          band: worstBand,
          reason: recommended
            ? `This encounter bands as "${worstBand}" for a party at level ${partyLevelNum} — consider a ` +
              "reinforcing ally if the party shouldn't face that alone."
            : `This encounter bands as "${worstBand}" for a party at level ${partyLevelNum} — no ally flagged.`,
          partySizeCaveat:
            partySizeNum !== undefined && partySizeNum < 4
              ? `partySize ${partySizeNum} is smaller than the DMG's assumed 4-character party — the true ` +
                "difficulty is plausibly higher than the band above, but no verified formula exists for exactly " +
                "how much (see encounter-difficulty.ts's bandDifficulty doc comment), so this is a caveat, not an " +
                "adjustment."
              : undefined,
          howToAddAlly: recommended
            ? "This tool does not auto-build an ally. Use the companion pipeline: create_creature_blueprint " +
              "(henchman: true), place_creature, forge_creature (gearRole pc) and create_companion_dialog."
            : undefined,
        };
      }

      if (!area) {
        result.nextSteps =
          "Dry-run only (no area given). To build this: create_creature_blueprint for the boss (faction 1), " +
          "place_creature it, then forge_creature the blueprint and the placed copy (classId=boss.classId, " +
          "level=boss.level, gearRole elite); for the support cluster, place_creature support.count " +
          "copies of support.resref. Or call compose_encounter again with an area to do this automatically.";
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // ─── Placement mode ─────────────────────────────────────────────────

      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);

      const spotsNeeded = 1 + (plan.support?.count ?? 0);
      const spots = await findSimpleWalkableSpots(index, resmanOpts, area, spotsNeeded);
      if (spots.length < spotsNeeded) {
        result.success = false;
        result.error = `Only found ${spots.length} walkable spot(s) in ${area}, needed ${spotsNeeded}. Try a larger or less crowded area.`;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      const bossResref = shortResref(archetype.name);
      const bossTag = `compose_${archetype.name}_boss`;
      const bossName = archetype.name.charAt(0).toUpperCase() + archetype.name.slice(1);
      const BOSS_RACE = 6; // Human — a neutral default; caller can rebuild with a different race/appearance if the archetype calls for one.

      // The boss is forged like every other class-based creature: a legal level-1 build now, levelled by
      // LevelUpHenchman at spawn, gear bought from stores within its allowance, spell abilities for a caster
      // (inc_cre_level / cf_spawn). The level system is shared, so write it once if this module lacks it.
      const levelSystemWritten = !index.resources.has("cf_spawn.ncs");
      if (levelSystemWritten) {
        const sys = await writeCreatureLevelSystem(index);
        if (!sys.compiled) {
          result.success = false;
          result.error = `The creature level system (cf_spawn) failed to compile: ${sys.compilerOutput}`;
          return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: true };
        }
      }

      const buildResult = await buildCreatureBlueprint(index, {
        resref: bossResref,
        tag: bossTag,
        name: bossName,
        race: BOSS_RACE,
        appearance: BOSS_RACE,
        gender: 0,
        faction: 1, // Hostile; the blueprint default (0) is the player faction
      });
      if (!buildResult.success) {
        result.success = false;
        result.error = `Failed to build boss blueprint: ${buildResult.error}`;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }
      const bossTarget = await resolveCreatureTarget(index, bossResref, undefined, undefined, "compose_encounter", "boss");
      if ("error" in bossTarget) {
        result.success = false;
        result.error = bossTarget.error;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], isError: true };
      }
      // Forge the blueprint before placing it, so the placed copy inherits the build and spawn wiring.
      const forged = await forgeCreature(index, resmanOpts, bossTarget, {
        race: BOSS_RACE,
        classId: archetype.classId,
        level: bossLevel,
        gearRole: "elite",
        powerLevel: "tougher",
        originalSpawn: "nw_c2_default9",
      });
      // forgeCreature only changes the in-memory document; without this the .utc on disk stays the bare build.
      await bossTarget.save();

      const bossSpot = spots[0];
      const placeResult = await placeCreatureCore(index, resmanOpts, {
        area,
        blueprint: bossResref,
        x: bossSpot.x,
        y: bossSpot.y,
        collisionRadius: 0,
      });
      if (!placeResult.success) {
        result.success = false;
        result.error = `Built the boss blueprint but failed to place it: ${placeResult.error}`;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // verify_creature on the just-built boss blueprint — has baseline clothing and a real
      // FeatList/stat block now, but no weapon yet (see result.gearing/nextSteps below).
      const bossDoc = index.parsedGff.get(`${bossResref}.utc`) as GffObj;
      const report = new Report(bossResref, "utc");
      await verifyCreature(report, index, bossDoc);
      const verifyResult = report.result();

      const placedSupport: Array<{ resref: string; position: { x: number; y: number; z: number } }> = [];
      if (plan.support && supportCandidate) {
        for (let i = 0; i < plan.support.count; i++) {
          const spot = spots[1 + i];
          const supportPlace = await placeCreatureCore(index, resmanOpts, {
            area,
            blueprint: supportCandidate.resref,
            x: spot.x,
            y: spot.y,
            collisionRadius: 0,
          });
          if (supportPlace.success && supportPlace.placedPosition) {
            placedSupport.push({ resref: supportCandidate.resref, position: supportPlace.placedPosition });
          }
        }
      }

      result.placed = {
        area,
        boss: {
          resref: bossResref,
          tag: bossTag,
          position: placeResult.placedPosition,
          verify: verifyResult,
          forged: {
            level: forged.targetLevel,
            gear: forged.gear,
            spellPoolSizes: forged.spellPoolSizes,
            ...(forged.warnings.length > 0 ? { warnings: forged.warnings } : {}),
          },
        },
        support: placedSupport,
        ...(levelSystemWritten ? { levelSystemWritten: "inc_cre_level + cf_spawn" } : {}),
      };
      result.nextSteps =
        "Boss and support are placed. The boss levels, buys its gear and gets its spell abilities when it spawns; " +
        "run_live_verification shows its [SPEC_OK]/[SPEC_FAIL] checks and a [CL_LOOT] line with what it bought. " +
        `For a fixed signature spell or a plot item, call forge_creature again on ${bossResref} and on the placed copy ` +
        "(pinnedSpells, or gearWealth 0 plus set_creature_equipment).";

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
