/**
 * Encounter composer tool — F5 of docs/encounter-composer-spec.md.
 *
 * Wires F1 (archetype library), F2 (reverse EL solver) and F3 (support-roster
 * chooser) together into the single call the feature was planned around: an
 * LLM says "I need a necromancer for a CR 6 battle" and gets back a plan,
 * not a sequence of manual build_npc_stat_block/get_balance_report steps.
 *
 * Dry-run only, per the spec doc's own build order (step 4: "dry-run mode
 * only first (no placement) so the roster-planning logic can be reviewed and
 * tested in isolation before it touches a real module"). Placement mode
 * (actually calling create_creature_blueprint/place_creature) is a planned
 * follow-up (F6), not built here — this tool never touches a loaded module
 * and needs none loaded, since every input it reads is either a caller
 * param or one of F1-F3's own pure, static tables.
 *
 * Deliberately narrower than the original design sketch:
 * - `roles: string[]` became a single `role: string` — the math this tool
 *   wires together (planSupportCluster) is built for one named boss; how
 *   multiple named bosses in one fight would combine is the same kind of
 *   unverified mixed-CR question this project already declines to guess at
 *   (see combineSameCREL's own doc comment). Revisit once there's a real
 *   multi-boss need and a real source for that combination rule.
 * - The boss's own CR is a required input (`bossCR`), not derived from
 *   `targetEL`. Nothing in F1-F3 can honestly split "how much of this
 *   fight's difficulty should the boss alone carry vs. its support" — that
 *   split IS the unverified mixed-CR question. The caller decides the
 *   boss's power level; this tool only answers "given that, does support
 *   close the gap to the target, and with what."
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  bandDifficulty,
  planSupportCluster,
} from "../util/encounter-difficulty.js";
import { ARCHETYPES, getArchetype, pickSupportCandidate } from "../util/encounter-archetypes.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";

export function registerEncounterComposerTools(server: McpServer): void {
  server.tool(
    "compose_encounter",
    "Dry-run planner: given a thematic role (e.g. 'necromancer') and a target Encounter Level, report whether the " +
      "boss alone meets it and, if not, a real support-creature cluster that closes the gap. Wires together the " +
      "archetype library (role name -> class/level), the reverse EL solver (target EL -> required support count), " +
      "and the support-roster chooser (a real base-game blueprint for the archetype's natural minion type) — see " +
      "docs/encounter-composer-spec.md. PLANNING ONLY: builds nothing, places nothing, needs no module loaded. " +
      "Reports the boss's and the support cluster's EL as two separate numbers, never one combined figure — no " +
      "verified DMG rule exists for combining different-CR groups into a single EL (see get_balance_report's own " +
      "per-cluster convention). Call list_blueprints/resolve_blueprint yourself to confirm a returned support " +
      "resref before using it — this tool's own candidate table is curated but not re-validated against the " +
      "currently-loaded module's resman stack on every call.",
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
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ role, bossCR, targetEL, partyLevel }) => {
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

      const result = {
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
        nextSteps:
          "Dry-run only. To actually build this: create_creature_blueprint for the boss (class=boss.classId, " +
          "level=boss.level), then place_creature it; for the support cluster, place_creature support.count " +
          "copies of support.resref (a real base-game blueprint — verify with get_item_details/resolve_blueprint " +
          "first if targeting a different module's resman stack).",
      };

      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    },
  );
}
