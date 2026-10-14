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
 * - Placement mode does NOT equip the boss with a specific weapon/armor
 *   item. `equip_npc_by_role` deliberately never guesses a real item
 *   resref itself (this project's established discipline) — it only
 *   validates and reports a budget/recommendation for gear the CALLER has
 *   already sourced via list_blueprints/resman_search. This tool reports
 *   the same real budget (gearBudget) and weapon-type recommendation
 *   (pickWeaponPreference) directly — the same functions equip_npc_by_role
 *   itself uses — but leaves finding and equipping a real item resref as
 *   the caller's own next step, named explicitly in the response.
 * - F4 is report-only, per the spec's own "deliberately conservative for a
 *   first version" design: when partyLevel is given and the worse of the
 *   boss's/support's band is "hard" or "deadly", `allyRecommendation`
 *   surfaces that fact and names the existing companion pipeline
 *   (create_creature_blueprint henchman:true + build_npc_stat_block) as the
 *   way to add a reinforcing ally — it never builds one itself. `partySize`
 *   is accepted purely as a caveat label, never folded into the EL/band math
 *   — see encounter-difficulty.ts's bandDifficulty doc comment for why no
 *   party-size adjustment formula is applied.
 */

import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import { ensureRandomAbilitiesInclude } from "./random-abilities-tools.js";
import { ensureSpecAbilityInclude } from "./spec-ability-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { findSimpleWalkableSpots, placeCreatureCore } from "../util/creature-placer.js";
import { buildNpcStatBlock } from "../util/npc-stat-block.js";
import { buildSpecAbilityListEntries } from "../util/spec-ability-pool.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { ARCHETYPES, getArchetype, pickSupportCandidate } from "../util/encounter-archetypes.js";
import {
  bandDifficulty,
  type DifficultyLabel,
  difficultyRank,
  planSupportCluster,
} from "../util/encounter-difficulty.js";
import { pickWeaponPreference } from "../util/npc-weapon-preferences.js";
import { numParam, optNumParam, toF, toI } from "../util/params.js";
import { verifyCreature } from "../util/verify/blueprints.js";
import { Report } from "../util/verify/common.js";
import { gearBudget } from "../util/wealth.js";

/** Keep resref within NWN's 16-char limit — see this project's own documented bug class for what happens when a generator doesn't. */
function shortResref(role: string): string {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `ce_${role.slice(0, 3)}_${suffix}`.slice(0, 16);
}

/**
 * classIds create_random_abilities_system supports — real memorized
 * spellbook via SetMemorizedSpell (Tier 1) vs. a virtual-ability list cast
 * via ActionCastSpellAtObject's bCheat param (Tier 2), per the tiers
 * documented in random-abilities-script.ts's own header (classes.2da's
 * MemorizesSpells column). Duplicated as a plain set here rather than
 * importing that module's internals, since this file only needs membership.
 */
const TIER1_CASTER_CLASSES = new Set([2, 3, 6, 7, 10]); // Cleric, Druid, Paladin, Ranger, Wizard
const TIER2_CASTER_CLASSES = new Set([1, 9]); // Bard, Sorcerer

export function registerEncounterComposerTools(server: McpServer): void {
  server.tool(
    "compose_encounter",
    "Given a thematic role (e.g. 'necromancer') and a target Encounter Level, report whether the boss alone meets " +
      "it and, if not, a real support-creature cluster that closes the gap. Wires together the archetype library " +
      "(role name -> class/level), the reverse EL solver (target EL -> required support count), and the " +
      "support-roster chooser (a real base-game blueprint for the archetype's natural minion type) — see " +
      "docs/encounter-composer-spec.md. Without `area`: dry-run, builds and places nothing, needs no module " +
      "loaded. With `area`: builds a real stat block for the boss (ability scores, FeatList, HP — via " +
      "buildNpcStatBlock), equips baseline clothing so it's never bare, wires the random-abilities caster system " +
      "onto its spawn script when its class supports one (reported as placed.boss.spellsWired), places it and " +
      "the support cluster, runs verify_creature on the boss, and reports a real wealth-budget + weapon-type " +
      "recommendation — but does NOT equip a specific weapon/armor item beyond that baseline, since no tool in " +
      "this project guesses a real item resref; search for one yourself (list_blueprints/resman_search) and " +
      "finish gearing with equip_npc_by_role. Reports the boss's and the support cluster's EL as two separate " +
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
      bossCR: numParam(
        "The boss's own target CR (and, via the archetype's levelForCR, its class level). This tool does not " +
          "derive the boss's power level from targetEL — see this file's own header comment for why.",
      ),
      targetEL: numParam("Desired overall Encounter Level for the fight."),
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
      casterSystem: z
        .enum(["special_abilities", "random_abilities"])
        .optional()
        .describe(
          "Which random-caster system wires the boss's spells (only matters if the archetype's class is a real " +
            "spellcaster). Default 'special_abilities' (SpecAbilityList, via inc_spec_ability.nss) — unlike " +
            "'random_abilities' (the previous MemorizedList-based system), it isn't capped to cantrip-level " +
            "spells by this boss's class levels being set directly rather than through a live LevelUpHenchman() " +
            "pass (a confirmed real limitation of the previous system for exactly this use). Pass " +
            "'random_abilities' only to deliberately use the previous method.",
        ),
    },
    async ({ role, bossCR, targetEL, partyLevel, partySize, area, casterSystem }) => {
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
            ? "This tool does not auto-build an ally. Use the existing companion pipeline: " +
              "create_creature_blueprint (henchman: true) + build_npc_stat_block for the stat block, then place " +
              "and recruit as normal."
            : undefined,
        };
      }

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
      const BOSS_RACE = 6; // Human — a neutral default; caller can rebuild with a different race/appearance if the archetype calls for one.

      // Real stat block (ability scores, FeatList, HP, StartingPackage) —
      // without this the boss ships with an empty FeatList (no proficiencies,
      // no automatic class/racial feats) and no equipped clothing, a
      // confirmed real bug ("Thug caster had no clothes") from this tool
      // shipping a blueprint with nothing but class/race/appearance set.
      const statBlock = buildNpcStatBlock(index, {
        race: BOSS_RACE,
        classId: archetype.classId,
        level: bossLevel,
        powerLevel: "elite",
        seed: bossResref,
      });

      // Spellcasting classes get zero spells from buildNpcStatBlock (it
      // deliberately doesn't compute MemorizedList) and zero from
      // buildCreatureBlueprint (no `spells` param passed here) — another
      // confirmed real bug ("Thug caster had no spells"). Wire a runtime
      // random-caster system when the archetype's class actually supports
      // it. Default is special_abilities (SpecAbilityList) — see this
      // tool's own casterSystem param doc for why: unlike random_abilities,
      // it isn't gated by a live LevelUpHenchman() pass this boss never gets.
      const isCasterClass = TIER1_CASTER_CLASSES.has(archetype.classId) || TIER2_CASTER_CLASSES.has(archetype.classId);
      let bossScripts: Record<string, string> | undefined;
      const spellWiringWarnings: string[] = [];
      let specAbilityEntries: Awaited<ReturnType<typeof buildSpecAbilityListEntries>>["entries"] | undefined;

      if (isCasterClass && casterSystem !== "random_abilities") {
        const include = await ensureSpecAbilityInclude(index);
        const built = buildSpecAbilityListEntries(
          index,
          [{ classId: archetype.classId, classLevel: bossLevel }],
          statBlock.abilityScores,
          false, // dormant — SA_OnSpawn resets/rerolls on every real spawn
          bossResref,
        );
        spellWiringWarnings.push(...built.warnings);
        if (built.entries.length > 0) {
          specAbilityEntries = built.entries;
          const spawnWrapper = `ce_${archetype.name.slice(0, 3)}_spn`.slice(0, 16);
          const spawnSource =
            `#include "${include.includeName}"\n\n` +
            `void main()\n{\n    ExecuteScript("nw_c2_default9", OBJECT_SELF);\n` +
            `    DelayCommand(0.5, SA_OnSpawn(OBJECT_SELF));\n}\n`;
          const spawnWritten = await writeAndCompileScript(index, spawnWrapper, spawnSource, true);
          if (spawnWritten.compiled) {
            bossScripts = { ScriptSpawn: spawnWrapper };
          } else {
            spellWiringWarnings.push(`Special-abilities spawn wrapper failed to compile: ${spawnWritten.compilerOutput}`);
            specAbilityEntries = undefined;
          }
        } else {
          spellWiringWarnings.push("No eligible special abilities were found for this archetype's class/level.");
        }
      } else if (isCasterClass && casterSystem === "random_abilities") {
        const include = await ensureRandomAbilitiesInclude(index);
        const isTier2 = TIER2_CASTER_CLASSES.has(archetype.classId);
        const spawnWrapper = `ce_${archetype.name.slice(0, 3)}_spn`.slice(0, 16);
        const spawnSource =
          `#include "${include.includeName}"\n\n` +
          `void main()\n{\n    ExecuteScript("nw_c2_default9", OBJECT_SELF);\n` +
          `    DelayCommand(0.5, RA_OnSpawn(OBJECT_SELF));\n}\n`;
        const spawnWritten = await writeAndCompileScript(index, spawnWrapper, spawnSource, true);
        if (spawnWritten.compiled) {
          bossScripts = { ScriptSpawn: spawnWrapper };
          // Confirmed real engine limitation (CLAUDE.md, "Random caster abilities" ->
          // "Tier 1 real-runtime findings" item 2): a creature whose ClassList was set
          // directly (as this boss's was, via buildCreatureBlueprint) rather than via a
          // live LevelUpHenchman() call only ever gets cantrip (level 0) slots from
          // SetMemorizedSpell() — there is no recruit-style event for a hostile boss to
          // level through. This still closes "no spells at all," not "full spellbook."
          // (This is exactly the limitation the default special_abilities system avoids.)
          spellWiringWarnings.push(
            "RA_OnSpawn is wired, but this boss's class levels were set directly (never " +
              "run through a live LevelUpHenchman() pass) — per this project's own confirmed " +
              "findings, that caps it to cantrip-level (level 0) spells at spawn, not the " +
              "full spellbook a leveled companion would get.",
          );
        } else {
          spellWiringWarnings.push(`Random-abilities spawn wrapper failed to compile: ${spawnWritten.compilerOutput}`);
        }

        if (isTier2 && bossScripts) {
          const endRoundWrapper = `ce_${archetype.name.slice(0, 3)}_end`.slice(0, 16);
          const endRoundSource =
            `#include "${include.includeName}"\n\n` +
            `void main()\n{\n    ExecuteScript("nw_c2_default3", OBJECT_SELF);\n` +
            `    RA_OnEndRound(OBJECT_SELF);\n}\n`;
          const endRoundWritten = await writeAndCompileScript(index, endRoundWrapper, endRoundSource, true);
          if (endRoundWritten.compiled) {
            bossScripts.ScriptEndRound = endRoundWrapper;
          } else {
            spellWiringWarnings.push(`Random-abilities end-round wrapper failed to compile: ${endRoundWritten.compilerOutput}`);
          }
        }
      }

      const buildResult = await buildCreatureBlueprint(index, {
        resref: bossResref,
        tag: bossTag,
        name: bossName,
        classes: [{ class: archetype.classId, level: bossLevel }],
        race: BOSS_RACE,
        appearance: BOSS_RACE,
        gender: 0,
        str: statBlock.abilityScores.str,
        dex: statBlock.abilityScores.dex,
        con: statBlock.abilityScores.con,
        int: statBlock.abilityScores.int,
        wis: statBlock.abilityScores.wis,
        cha: statBlock.abilityScores.cha,
        feats: statBlock.feats.map((f) => f.feat),
        hp: statBlock.hp,
        startingPackage: statBlock.startingPackage,
        // Baseline clothing so the boss is never bare — the same rule
        // adventure-actors already applies to every companion, generalized
        // here. AC bonus 0, so it needs no proficiency feat and is always
        // safe to equip regardless of class.
        equipment: { chest: "nw_cloth001" },
        ...(bossScripts ? { scripts: bossScripts } : {}),
      });
      if (!buildResult.success) {
        result.success = false;
        result.error = `Failed to build boss blueprint: ${buildResult.error}`;
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      }

      // Write the baked (special_abilities) pool directly onto the just-built
      // blueprint doc, before placement, so the placed instance inherits it —
      // buildCreatureBlueprint's own `spells` param wasn't used above because
      // it writes every entry ready=1 unconditionally, not the sorted/dormant
      // shape SA_OnSpawn expects (see buildSpecAbilityListEntries's doc comment).
      if (specAbilityEntries) {
        const bossKey = `${bossResref}.utc`;
        const bossBlueprintDoc = index.parsedGff.get(bossKey) as GffObj;
        bossBlueprintDoc.SpecAbilityList = {
          type: "list",
          value: specAbilityEntries.map((e) => ({
            __struct_id: 0,
            Spell: { type: "word", value: e.spell },
            SpellCasterLevel: { type: "byte", value: e.classLevel },
            SpellFlags: { type: "byte", value: e.ready ? 1 : 0 },
          })),
        };
        // Persist to disk too — placeCreatureCore's resolveBlueprint reads
        // the in-memory parsedGff first (already updated above) so the
        // PLACED instance inherits this correctly either way, but the
        // standalone blueprint FILE must also be flushed or repack_module
        // (which packs from disk, not from parsedGff) would ship a
        // SpecAbilityList-less .utc alongside a populated placed instance.
        const bossFilePath = path.join(index.tempDir, bossKey);
        await jsonToGff(bossBlueprintDoc as GffDocument, bossFilePath);
        const bossStat = await fs.stat(bossFilePath);
        const bossEntry = index.resources.get(bossKey);
        if (bossEntry) bossEntry.sizeBytes = bossStat.size;
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

      const weaponPref = pickWeaponPreference(archetype.classId, bossResref);
      const budget = gearBudget(bossLevel, "elite");

      result.placed = {
        area,
        boss: {
          resref: bossResref,
          tag: bossTag,
          position: placeResult.placedPosition,
          verify: verifyResult,
          spellsWired: bossScripts !== undefined,
          ...(spellWiringWarnings.length > 0 ? { spellWiringWarnings } : {}),
        },
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
