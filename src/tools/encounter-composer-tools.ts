/**
 * Encounter composer tool — F5 (dry-run) and F6 (placement) of
 * docs/encounter-composer-spec.md.
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
 * - Placement mode does NOT equip the boss with a specific weapon/armor
 *   item. `equip_npc_by_role` deliberately never guesses a real item
 *   resref itself (this project's established discipline) — it only
 *   validates and reports a budget/recommendation for gear the CALLER has
 *   already sourced via list_blueprints/resman_search. This tool reports
 *   the same real budget (gearBudget) and weapon-type recommendation
 *   (pickWeaponPreference) directly — the same functions equip_npc_by_role
 *   itself uses — but leaves finding and equipping a real item resref as
 *   the caller's own next step, named explicitly in the response.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  bandDifficulty,
  planSupportCluster,
} from "../util/encounter-difficulty.js";
import { ARCHETYPES, getArchetype, pickSupportCandidate } from "../util/encounter-archetypes.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";
import { requireIndex, buildResmanOptions } from "../module-loader.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { placeCreatureCore, findSimpleWalkableSpots } from "../util/creature-placer.js";
import { pickWeaponPreference } from "../util/npc-weapon-preferences.js";
import { gearBudget } from "../util/wealth.js";
import { Report } from "../util/verify/common.js";
import { verifyCreature } from "../util/verify/blueprints.js";
import type { GffObj } from "../types/gff.js";

/** Keep resref within NWN's 16-char limit — see this project's own documented bug class for what happens when a generator doesn't. */
function shortResref(role: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
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
      "loaded. With `area`: builds the boss blueprint, places it and the support cluster in that area of the " +
      "currently-loaded module, runs verify_creature on the boss, and reports a real wealth-budget + weapon-type " +
      "recommendation — but does NOT equip a specific item, since no tool in this project guesses a real item " +
      "resref; search for one yourself (list_blueprints/resman_search) and finish gearing with " +
      "equip_npc_by_role. Reports the boss's and the support cluster's EL as two separate numbers, never one " +
      "combined figure — no verified DMG rule exists for combining different-CR groups into a single EL.",
    {
      role: z.string().describe(
        `Archetype name (case-insensitive). Currently recognized: ${Object.keys(ARCHETYPES).join(", ")}. ` +
          "An unrecognized role returns an error naming the recognized list — never a guessed mapping.",
      ),
      bossCR: numParam(
        "The boss's own target CR (and, via the archetype's levelForCR, its class level). This tool does not " +
          "derive the boss's power level from targetEL — see this file's own header comment for why.",
      ),
      targetEL: numParam("Desired overall Encounter Level for the fight."),
      partyLevel: optNumParam(
        "Average party level, used only to band the boss's and the support cluster's difficulty " +
          "(trivial/easy/standard/hard/deadly) for human-readable context — not part of the EL math itself.",
      ),
      area: z.string().optional().describe(
        "Area resref to build and place into. Omit for a dry-run (plan only, no module needed). When given, needs " +
          "a module already loaded (load_module) and that area to exist in it.",
      ),
    },
    async ({ role, bossCR, targetEL, partyLevel, area }) => {
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

      const bossCRNum = toF(bossCR);
      const targetELNum = toF(targetEL);
      const partyLevelNum = partyLevel !== undefined ? toI(partyLevel) : undefined;
      const bossLevel = archetype.levelForCR(bossCRNum);

      const supportCandidate = pickSupportCandidate(archetype.naturalSupport, bossCRNum);
      const plan = supportCandidate
        ? planSupportCluster(bossCRNum, targetELNum, supportCandidate.cr)
        : planSupportCluster(bossCRNum, targetELNum, bossCRNum);

      const result: Record<string, unknown> = {
        success: true,
        role: archetype.name,
        boss: {
          classId: archetype.classId,
          level: bossLevel,
          cr: bossCRNum,
          el: plan.bossEL,
          band: partyLevelNum !== undefined ? bandDifficulty(plan.bossEL, partyLevelNum) : undefined,
        },
        bossAloneSufficient: plan.bossAloneSufficient,
        support:
          plan.support && supportCandidate
            ? {
                resref: supportCandidate.resref,
                tag: supportCandidate.tag,
                cr: plan.support.cr,
                count: plan.support.count,
                el: plan.support.achievedEL,
                band: partyLevelNum !== undefined ? bandDifficulty(plan.support.achievedEL, partyLevelNum) : undefined,
              }
            : null,
        caveat: archetype.caveat,
        note:
          "boss.el and support.el are reported separately, never combined into one figure — see this tool's own " +
          "description for why. support is null when the boss alone already meets targetEL, or when this " +
          "archetype has no naturalSupport candidate yet.",
      };

      if (!area) {
        result.nextSteps =
          "Dry-run only (no area given). To build this: create_creature_blueprint for the boss (class=boss.classId, " +
          "level=boss.level), then place_creature it; for the support cluster, place_creature support.count " +
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

      const buildResult = await buildCreatureBlueprint(index, {
        resref: bossResref,
        tag: bossTag,
        name: bossName,
        classes: [{ class: archetype.classId, level: bossLevel }],
        race: 6, // Human — a neutral default; caller can rebuild with a different race/appearance if the archetype calls for one.
        appearance: 6,
        gender: 0,
      });
      if (!buildResult.success) {
        result.success = false;
        result.error = `Failed to build boss blueprint: ${buildResult.error}`;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

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

      // verify_creature on the just-built boss blueprint (not yet gear-checked, since no item was equipped).
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

      const weaponPref = pickWeaponPreference(archetype.classId, bossResref);
      const budget = gearBudget(bossLevel, "elite");

      result.placed = {
        area,
        boss: { resref: bossResref, tag: bossTag, position: placeResult.placedPosition, verify: verifyResult },
        support: placedSupport,
      };
      result.gearing = {
        wealthBudgetGp: budget,
        recommendedWeapon: weaponPref ? { baseItem: weaponPref.baseItem, label: weaponPref.label } : null,
      };
      result.nextSteps =
        "Boss and support are placed. Gearing is NOT done — search for a real weapon item " +
        (weaponPref ? `(recommended type: ${weaponPref.label})` : "") +
        ` via list_blueprints/resman_search, then call equip_npc_by_role(resref: "${bossResref}", equipment: ` +
        '{"righthand": "<real resref>"}) to finish gearing and re-verify. Never fabricate a resref yourself.';

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
