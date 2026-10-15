/**
 * Deterministic NPC generation tools — reduces the per-NPC manual arithmetic/
 * lookup work (ability scores, feats, skill points, HP, gear search, weapon
 * feat picks) that was the source of every real mistake in the sessions that
 * built this project's own test modules, per CLAUDE.md's "reduce how much of
 * NPC generation the LLM does by hand vs. deterministic code" TODO.
 *
 * Tools:
 * - build_npc_stat_block: race -> racial feats -> ability scores -> class ->
 *   class feats -> skill points -> HP, on an existing creature blueprint OR
 *   a placed instance (resref, or area+tag). Primarily for Henchmen for now
 *   (companions are always built as a blueprint before placement) —
 *   general-NPC support is a documented future extension, not a limitation
 *   of the underlying computation.
 * - level_creature: change an existing creature's level up OR down by a
 *   delta in one call — build_npc_stat_block's full stat-block recompute
 *   PLUS a Special-Abilities pool re-bake, written directly onto whichever
 *   object (blueprint or placed instance) was targeted. Exists because
 *   leveling an already-placed creature used to need manual delete+
 *   re-place to sync the instance (build_npc_stat_block only ever wrote a
 *   standalone blueprint) — this closes that gap in one call.
 * - equip_npc_by_role: validates and equips caller-supplied gear against the
 *   creature's actual baked proficiency feats (never guesses a real item
 *   resref — the caller still sources items via list_blueprints/
 *   resman_search, exactly as documented), reports a wealth-budget reference
 *   figure, recommends a weapon type when none was supplied, and closes the
 *   loop with a verify_creature pass on its own last step.
 * - respec_weapon_feats: swaps a creature's weapon-specific feat tier(s) from
 *   whatever weapon it's currently specced for onto a different weapon, at
 *   the same tiers it already had.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr, setField, setFieldNum } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { EQUIP_SLOT_MAP } from "../util/equip-slots.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { getGitDoc, mergeVarTable, resolveBlueprint, writeBackGit } from "../util/git-helpers.js";
import { buildNpcStatBlock, type PowerLevel } from "../util/npc-stat-block.js";
import { pickWeaponPreference } from "../util/npc-weapon-preferences.js";
import { numParam, optNumParam, toI } from "../util/params.js";
import { bakeSpecAbilityPoolForCreature } from "../util/spec-ability-pool.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { checkEquipProficiency, verifyCreature } from "../util/verify/blueprints.js";
import { hasCell, listOf, Report, twoDARow } from "../util/verify/common.js";
import { budgetBreakdown, type GearRole } from "../util/wealth.js";

/** classes.2da rows that cast spells at all (MemorizesSpells=1 or a spontaneous caster) — see random-abilities-script.ts's own header for the same 7-class split. */
const CASTER_CLASS_IDS = new Set([1, 2, 3, 6, 7, 9, 10]); // Bard, Cleric, Druid, Paladin, Ranger, Sorcerer, Wizard

// ─── Shared target resolution (blueprint OR placed instance) ──────────────

export interface CreatureTarget {
  obj: GffObj;
  label: string;
  save: () => Promise<void>;
}

/** Shared by spec-ability-tools.ts's bake_spec_ability_pool — same blueprint-or-placed-instance resolution. */
export async function resolveCreatureTarget(
  index: ModuleIndex,
  resref: string | undefined,
  area: string | undefined,
  tag: string | undefined,
  toolName: string,
  description: string,
): Promise<CreatureTarget | { error: string }> {
  if (resref) {
    const key = `${resref.toLowerCase()}.utc`;
    const doc = index.parsedGff.get(key);
    if (!doc) return { error: `No ${key} in the module` };
    const obj = doc as GffObj;
    return {
      obj,
      label: resref,
      save: async () => {
        const filePath = path.join(index.tempDir, key);
        await jsonToGff(doc as GffDocument, filePath);
        const stat = await fs.stat(filePath);
        const entry = index.resources.get(key);
        if (entry) entry.sizeBytes = stat.size;
        index.parsedGff.set(key, doc);
      },
    };
  }
  if (area && tag) {
    const { doc: gitDoc, obj: git } = getGitDoc(index, area);
    const creatureList = getFieldList(git, "Creature List");
    const creature = creatureList.find((c) => getFieldStr(c, "Tag") === tag);
    if (!creature) return { error: `Creature '${tag}' not found in ${area}` };
    snapshotGitForUndo(gitDoc, area, toolName, description);
    return {
      obj: creature,
      label: `${area}:${tag}`,
      save: async () => writeBackGit(index, area, gitDoc),
    };
  }
  return { error: "Provide either `resref` (a blueprint) or both `area` and `tag` (a placed instance)" };
}

/**
 * Shared MCP tool-result shape for a failed resolveCreatureTarget() call.
 * Sets isError:true — per MCP best practice, a tool execution failure (the
 * requested target doesn't exist) should be reported at the result level,
 * not returned as an ordinary successful-looking text response, so a client
 * can tell "ran, but failed" apart from "ran and succeeded" without having
 * to parse the message text itself. Centralizing this also means every
 * resolveCreatureTarget call site (7, across npc-tools.ts and
 * spec-ability-tools.ts, as of this writing) gets the fix identically
 * rather than needing the same one-line change repeated by hand.
 */
export function targetErrorResult(target: { error: string }): {
  content: Array<{ type: "text"; text: string }>;
  isError: true;
} {
  return { content: [{ type: "text", text: target.error }], isError: true };
}

export interface NpcStatBlockParams {
  race: number;
  classId: number;
  level: number;
  powerLevel?: PowerLevel;
  complexity?: "full" | "simple";
  deferLeveling?: boolean;
  /** Seed for deterministic bonus/generic feat-slot weapon picks — pass the target's resref/tag. */
  seed: string;
}

export interface NpcStatBlockApplyResult {
  result: ReturnType<typeof buildNpcStatBlock>;
  raceWarning: string[];
  casterWarning: string[];
}

/**
 * The core of build_npc_stat_block, factored out so level_creature can reuse
 * it against either a blueprint or a placed instance (via CreatureTarget)
 * without duplicating the race->ability scores->class->feats->skills->HP
 * write sequence. Mutates `target.obj` in place; callers call `target.save()`
 * themselves once they're done (level_creature also bakes a spec-ability
 * pool before saving, so the save has to happen after both steps).
 */
export function applyNpcStatBlock(
  index: ModuleIndex,
  target: CreatureTarget,
  params: NpcStatBlockParams,
): NpcStatBlockApplyResult {
  const obj = target.obj;

  const result = buildNpcStatBlock(index, {
    race: params.race,
    classId: params.classId,
    level: params.level,
    powerLevel: params.powerLevel ?? "elite",
    seed: params.seed,
    complexity: params.complexity ?? "full",
  });

  const existingRace = getFieldNum(obj, "Race");
  const raceWarning =
    existingRace !== params.race
      ? [
          `Blueprint's existing Race field (${existingRace}) differs from race param (${params.race}) — this tool only writes the mechanical stat block, not identity fields; update Race/Appearance_Type separately if that mismatch is real.`,
        ]
      : [];

  // Ability scores
  setField(obj, "Str", "byte", result.abilityScores.str);
  setField(obj, "Dex", "byte", result.abilityScores.dex);
  setField(obj, "Con", "byte", result.abilityScores.con);
  setField(obj, "Int", "byte", result.abilityScores.int);
  setField(obj, "Wis", "byte", result.abilityScores.wis);
  setField(obj, "Cha", "byte", result.abilityScores.cha);

  // Classes — merge onto any existing ClassList entry for the same class rather than
  // replacing it outright. A blueprint can already carry static spells baked directly
  // into ClassList[n].MemorizedList0-9 (the documented GFF struct format — see
  // CLAUDE.md's "Static spell-baking IS possible" section); blindly overwriting the
  // whole list here would silently wipe them, a real, confirmed-possible contributor
  // to a caster shipping with no spells memorized.
  const existingClasses = getFieldList(obj, "ClassList");
  obj.ClassList = {
    type: "list",
    value: result.classes.map((c) => {
      const existing = existingClasses.find((e) => getFieldNum(e, "Class") === c.class);
      const entry: GffObj = existing ? { ...existing } : { __struct_id: 2 };
      entry.Class = { type: "int", value: c.class };
      entry.ClassLevel = { type: "short", value: c.level };
      return entry;
    }),
  };

  // deferLeveling: every stat above was computed for the real target
  // `level`, but ClassList's own ClassLevel is deliberately rolled back
  // to 1 here, after the fact, so a_hen_spawn/a_hen_join's leveling loop
  // (for (i = GetHitDice(...); i < nTargetLevel; i++)) has real ground to
  // climb — without this, GetHitDice() already reports the target level
  // from the moment this blueprint is saved, so that loop never runs and
  // the engine never sees a real level-up event. HENCH_LEVEL (merged via
  // mergeVarTable, matching create_creature_blueprint's own varTable
  // convention) carries the real target level forward for both the
  // runtime leveling loop and verify_creature's level-formula checks.
  // This tool only ever writes exactly one ClassList entry (`result.classes`
  // is always a single-element array — see buildNpcStatBlock), so there's
  // no multiclass ambiguity to guard against here.
  if (params.deferLeveling) {
    const classListEntries = getFieldList(obj, "ClassList");
    setFieldNum(classListEntries[0], "ClassLevel", 1, "short");
    mergeVarTable(obj, [{ name: "HENCH_LEVEL", type: "int", value: params.level }]);
  }

  // Feats
  obj.FeatList = {
    type: "list",
    value: result.feats.map((f) => ({ __struct_id: 1, Feat: { type: "word", value: f.feat } })),
  };

  // SkillList — a fixed-size list (skills.2da row count, default 28), Rank byte per entry.
  const skillCount = index.twodaTables.get("skills")?.rows.size || 28;
  const ranks = new Map(result.skillRanks.map((s) => [s.skillIndex, s.rank]));
  obj.SkillList = {
    type: "list",
    value: Array.from({ length: skillCount }, (_, i) => ({
      __struct_id: 0,
      Rank: { type: "byte", value: ranks.get(i) ?? 0 },
    })),
  };

  // HP
  setField(obj, "MaxHitPoints", "short", result.hp);
  setField(obj, "CurrentHitPoints", "short", result.hp);
  setField(obj, "HitPoints", "short", result.hp);

  // StartingPackage — packages.2da row = class ID convention, verified elsewhere in this project.
  setField(obj, "StartingPackage", "byte", result.startingPackage);

  // Spellcasting-class-with-no-spells check. build_npc_stat_block deliberately doesn't
  // compute spells — see this project's own documented gap ("a non-companion Key NPC
  // never gets a live LevelUpHenchman() call... needs its spells param populated at
  // build time"). Confirmed real, shipped instance of exactly this: a Key NPC built
  // this way with no spells ever added. Non-mutating reads only (listOf, never
  // getFieldList) — this is a read-only check, not a write.
  const casterClasses = result.classes.filter((c) => CASTER_CLASS_IDS.has(c.class));
  const hasAnySpells =
    listOf(obj, "SpecAbilityList").length > 0 ||
    getFieldList(obj, "ClassList").some((cls) =>
      Array.from({ length: 10 }, (_, lvl) => listOf(cls, `MemorizedList${lvl}`).length > 0).some(Boolean),
    );
  const casterWarning =
    casterClasses.length > 0 && !hasAnySpells
      ? [
          `classId ${casterClasses.map((c) => c.class).join(", ")} is a spellcasting class, but this ` +
            "blueprint has no spells anywhere (no SpecAbilityList, no ClassList MemorizedList entries) — " +
            "build_npc_stat_block does not compute them. Populate create_creature_blueprint's `spells` param " +
            "for a fixed loadout, or wire create_random_abilities_system (chained onto ScriptSpawn) for a " +
            "random one, before this NPC is used in play. A non-companion caster never gets a live " +
            "LevelUpHenchman() call to grant spells any other way.",
        ]
      : [];

  return { result, raceWarning, casterWarning };
}

export function registerNpcTools(server: McpServer): void {
  // ─── build_npc_stat_block ───────────────────────────────────────────────

  server.tool(
    "build_npc_stat_block",
    "Compute and write a full mechanical stat block (ability scores, FeatList, SkillList, HP, StartingPackage) onto an EXISTING creature blueprint OR a placed instance, following the canonical race->racial feats->ability scores->class->class feats->skill points->HP creation order. " +
      "Reads race_feat_<race>.2da, cls_feat_<class>.2da (List=3 automatic feats), cls_bfeat_<class>.2da (bonus feat slots), cls_skill_<class>.2da (class skills), and classes.2da/racialtypes.2da live from the loaded module — nothing hardcoded except a small curated per-class weapon preference used to fill bonus/generic feat slots. " +
      "Deterministic, no dice rolling: 'elite' power level uses the literal Elite Array (15/14/13/12/10/8); other levels use a D&D 3.5 point-buy budget. Primarily intended for Henchmen (companions are always built as a blueprint before placement); works on any single-class creature blueprint or placed instance. Does not set race/appearance/gender/name — those are create_creature_blueprint's job, set them first. " +
      "For re-leveling an ALREADY-PLACED creature in one call (no manual delete+re-place dance to sync the instance), prefer level_creature instead.",
    {
      resref: z
        .string()
        .optional()
        .describe(
          "Existing creature blueprint resref (must already exist — create it with create_creature_blueprint first). Omit when using area+tag instead.",
        ),
      area: z.string().optional().describe("Area resref, when targeting a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to target (with `area`)"),
      race: numParam("Racial type (racialtypes.2da row, 0-6 for the standard PC races)"),
      classId: numParam(
        "Class (classes.2da row). Class IDs: 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin 7=Ranger 8=Rogue 9=Sorcerer 10=Wizard",
      ),
      level: numParam("Target character level (1-20)"),
      powerLevel: z
        .enum(["elite", "low", "standard", "tougher", "epic"])
        .optional()
        .describe(
          "Ability-score generation band (default elite = literal Elite Array 15/14/13/12/10/8, 25-point-buy " +
            "equivalent). Others are D&D 3.5 point-buy budgets, scaled to keep the same descending shape as the " +
            "Elite Array rather than spiking one stat: low=15 (below Elite's ceiling), standard=25 (reproduces " +
            "Elite Array exactly), tougher=32/epic=36 (above it). Use 'tougher'/'epic' only for a genuine boss-tier " +
            "creature — an ordinary NPC, including a flavorfully-named mook ('Thug', 'Bandit'), should stay at the " +
            "default 'elite' so no ability score exceeds the Elite Array's own ceiling.",
        ),
      complexity: z
        .enum(["full", "simple"])
        .optional()
        .describe(
          "'full' (default) computes every feat category including PC-style class bonus-feat slots (Weapon Specialization, Cleave->Great Cleave, metamagic, epic feats). 'simple' skips that category — for a background NPC the plot just calls a plain 'warrior'/'adept' rather than a named PC-progression character: still competent (racial/automatic-class/generic feat slots unaffected), just without the full advancement chain.",
        ),
      deferLeveling: z
        .boolean()
        .optional()
        .describe(
          "For a companion that will go through a_hen_join/a_hen_spawn's live LevelUpHenchman() loop: compute every stat (ability scores, FeatList, SkillList, HP) for the real target `level` as normal, but write ClassList's own ClassLevel as 1 and set a HENCH_LEVEL VarTable local to the real target level. " +
            "Without this, a companion's ClassList already equals its HENCH_LEVEL from the moment it's built, so that leveling loop's own `for (i = GetHitDice(...); i < nTargetLevel; i++)` never runs — meaning the engine never sees a real level-up event, and GetMemorizedSpellCountByLevel() silently returns fewer real spell slots than cls_spgn_<class>.2da promises for any level past the first (confirmed, real, user-reported bug: a Cleric/Wizard companion with empty spell slots at 2nd/3rd level despite the UI showing them as available). verify_creature's level-formula checks (hp_formula_mismatch, skill_points_formula_mismatch, ability_score_base_exceeds_elite) already read HENCH_LEVEL instead of the raw ClassLevel, so they correctly see this as the intentional pre-level state it is, not a stale-data bug.",
        ),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, race, classId, level, powerLevel, complexity, deferLeveling }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "build_npc_stat_block",
        `Build stat block for ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);

      const { result, raceWarning, casterWarning } = applyNpcStatBlock(index, target, {
        race: toI(race),
        classId: toI(classId),
        level: toI(level),
        powerLevel: powerLevel as PowerLevel | undefined,
        complexity: complexity as "full" | "simple" | undefined,
        deferLeveling,
        seed: target.label,
      });

      await target.save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                abilityScores: result.abilityScores,
                classes: result.classes,
                featCount: result.feats.length,
                feats: result.feats,
                skillPointsSpent: result.skillRanks.reduce((sum, s) => sum + s.rank, 0),
                hp: result.hp,
                startingPackage: result.startingPackage,
                complexity: (complexity as "full" | "simple" | undefined) ?? "full",
                warnings: [...raceWarning, ...result.warnings, ...casterWarning],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── level_creature ─────────────────────────────────────────────────────

  server.tool(
    "level_creature",
    "Change a creature's level (up OR down) by a delta, in one call — recomputes its FULL stat block at the new level " +
      "(build_npc_stat_block's race->racial feats->ability scores->class->class feats->skill points->HP sequence) " +
      "AND re-bakes its Special-Abilities pool (bake_spec_ability_pool) to match, then writes both directly onto " +
      "the SAME object (blueprint or placed instance) — no delete+re-place dance needed to sync a placed instance. " +
      "Reads the creature's CURRENT race and single ClassList entry to determine class and current level; `delta` " +
      "is added to the current level and clamped to 1-20 (negative deltas level DOWN — this writes a fresh stat " +
      "block for the new level directly via GFF, so it isn't subject to the live engine's LevelUpHenchman() " +
      "one-way-only limitation). Only works on single-class creatures, matching build_npc_stat_block's own scope. " +
      "Does not touch equipment, name, or race/appearance. " +
      "NOTE on spells specifically: the Special-Abilities pool's membership (which spells exist as candidates) is " +
      "rebuilt fresh at the new level every call, so raising OR lowering level both correctly widen/narrow which " +
      "spells are eligible — there is no 'pool was baked too low' staleness to worry about, unlike re-leveling a " +
      "creature that still uses the OLDER inc_random_abil.nss/MemorizedList system. Only use this on a creature " +
      "already using the Special-Abilities system (has a non-empty SpecAbilityList, or is about to be wired to " +
      "it) — a MemorizedList-based caster's spells are not recomputed by this tool at all.",
    {
      resref: z.string().optional().describe("Blueprint resref to re-level. Omit when using area+tag instead."),
      area: z.string().optional().describe("Area resref, when targeting a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to target (with `area`)"),
      delta: numParam(
        "Level change, positive or negative (e.g. '3' to level up 3, '-5' to level down 5). Result is clamped to 1-20.",
      ),
      powerLevel: z
        .enum(["elite", "low", "standard", "tougher", "epic"])
        .optional()
        .describe("Ability-score generation band for the recomputed stat block — see build_npc_stat_block (default elite)."),
      complexity: z
        .enum(["full", "simple"])
        .optional()
        .describe("Feat-computation complexity for the recomputed stat block — see build_npc_stat_block (default full)."),
      markReady: z
        .boolean()
        .optional()
        .describe(
          "Passed through to the spec-ability re-bake (default false, dormant pool — SA_OnSpawn activates a " +
            "real subset at the creature's next spawn). See bake_spec_ability_pool's own markReady doc.",
        ),
    },
    { idempotentHint: false },
    async ({ resref, area, tag, delta, powerLevel, complexity, markReady }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "level_creature",
        `Level ${tag ?? resref} by ${delta}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj } = target;

      const classList = listOf(obj, "ClassList");
      if (classList.length !== 1) {
        return {
          content: [
            {
              type: "text",
              text: `level_creature only supports a single-class creature (found ${classList.length} ClassList entries on ${target.label}).`,
            },
          ],
          isError: true,
        };
      }

      const classId = getFieldNum(classList[0], "Class");
      const currentLevel = getFieldNum(classList[0], "ClassLevel");
      const race = getFieldNum(obj, "Race");
      const newLevel = Math.max(1, Math.min(20, currentLevel + toI(delta)));

      const { result, raceWarning, casterWarning } = applyNpcStatBlock(index, target, {
        race,
        classId,
        level: newLevel,
        powerLevel: powerLevel as PowerLevel | undefined,
        complexity: complexity as "full" | "simple" | undefined,
        seed: target.label,
      });

      const hadSpecAbilities = listOf(obj, "SpecAbilityList").length > 0;
      let specAbility: { totalPoolSize: number; readyCount: number } | undefined;
      if (hadSpecAbilities) {
        const { entries } = bakeSpecAbilityPoolForCreature(index, obj, markReady ?? false, target.label);
        obj.SpecAbilityList = {
          type: "list",
          value: entries.map((e) => ({
            __struct_id: 0,
            Spell: { type: "word", value: e.spell },
            SpellCasterLevel: { type: "byte", value: e.classLevel },
            SpellFlags: { type: "byte", value: e.ready ? 1 : 0 },
          })),
        };
        specAbility = { totalPoolSize: entries.length, readyCount: entries.filter((e) => e.ready).length };
      }

      await target.save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                previousLevel: currentLevel,
                newLevel,
                delta: toI(delta),
                abilityScores: result.abilityScores,
                featCount: result.feats.length,
                hp: result.hp,
                specAbility,
                warnings: [
                  ...raceWarning,
                  ...result.warnings,
                  ...casterWarning,
                  ...(!hadSpecAbilities && CASTER_CLASS_IDS.has(classId)
                    ? [
                        "This is a spellcasting class but had no SpecAbilityList to re-bake — if this creature " +
                          "uses the older MemorizedList-based Random Abilities system instead, its spells were " +
                          "NOT recomputed by this call.",
                      ]
                    : []),
                ],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── build_npc_level_library ───────────────────────────────────────────

  server.tool(
    "build_npc_level_library",
    "Batch-build a resref library of correctly-leveled creature blueprints for one race/class — one " +
      "build_npc_stat_block (+ bake_spec_ability_pool) pass per level in `levels`, done server-side in a single " +
      "call instead of an LLM looping N separate tool calls. Each blueprint is named " +
      "`<resrefPrefix>_lvl<NN>` (zero-padded, e.g. sa_wiz_lvl05, sa_wiz_lvl20). " +
      "Intended for a 'spawn the correct pre-built level X creature' recipe (e.g. an in-game dialog-driven " +
      "leveler) where every hard part — ability scores, FeatList, SkillList, HP, and (if bakeSpecAbilities) a " +
      "correctly-leveled Special-Abilities pool — has to already be correct at build time, since none of it is " +
      "script-writable at runtime in vanilla NWScript (no AddFeat/RemoveFeat/SetRace/SetAbilityScore exist at " +
      "all, and LevelUpHenchman() grants zero automatic feats). " +
      "A level whose resref already exists is skipped (per-level, not aborting the whole batch) — rerun with a " +
      "different resrefPrefix, or clean up the existing blueprints first.",
    {
      resrefPrefix: z
        .string()
        .describe("Resref prefix for every blueprint in this library, e.g. 'sa_wiz'. Final resrefs are '<prefix>_lvl<NN>'."),
      name: z.string().describe("Base display name — each blueprint's FirstName becomes '<name> (Level N)'."),
      race: numParam("Racial type (racialtypes.2da row, 0-6 for the standard PC races)"),
      classId: numParam(
        "Class (classes.2da row). Class IDs: 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin 7=Ranger 8=Rogue 9=Sorcerer 10=Wizard",
      ),
      levels: z.string().describe("JSON array of target levels to build, e.g. '[1,3,5,8,10,12,15,18,20]'."),
      appearance: optNumParam(
        "Appearance row from appearance.2da. Defaults to the same value as `race` — the verified convention for " +
          "the 7 standard PC races (set race and appearance to the same number, no chassis clone needed).",
      ),
      gender: optNumParam("Gender (0=male, 1=female)"),
      faction: optNumParam("Faction ID"),
      powerLevel: z
        .enum(["elite", "low", "standard", "tougher", "epic"])
        .optional()
        .describe("Ability-score generation band for every level built — see build_npc_stat_block (default elite)."),
      complexity: z
        .enum(["full", "simple"])
        .optional()
        .describe("Feat-computation complexity for every level built — see build_npc_stat_block (default full)."),
      bakeSpecAbilities: z
        .boolean()
        .optional()
        .describe(
          "Also bake a Special-Abilities pool at each level (default true). Set false for a non-caster class, " +
            "or when this library will use the older MemorizedList-based Random Abilities system instead.",
        ),
      markReady: z
        .boolean()
        .optional()
        .describe("Passed through to each level's spec-ability bake — see bake_spec_ability_pool's own doc (default false)."),
    },
    { destructiveHint: true },
    async ({ resrefPrefix, name, race, classId, levels, appearance, gender, faction, powerLevel, complexity, bakeSpecAbilities, markReady }) => {
      const index = requireIndex();
      const raceN = toI(race);
      const classIdN = toI(classId);
      const levelList: number[] = JSON.parse(levels);
      const doBakeSpec = bakeSpecAbilities ?? true;

      const results: Array<{
        level: number;
        resref: string;
        success: boolean;
        error?: string;
        hp?: number;
        featCount?: number;
        specAbilityPoolSize?: number;
      }> = [];

      for (const level of levelList) {
        const resref = `${resrefPrefix}_lvl${String(level).padStart(2, "0")}`;

        const buildResult = await buildCreatureBlueprint(index, {
          resref,
          tag: resref,
          name: `${name} (Level ${level})`,
          race: raceN,
          appearance: appearance !== undefined ? toI(appearance) : raceN,
          gender: gender !== undefined ? toI(gender) : undefined,
          faction: faction !== undefined ? toI(faction) : undefined,
          classes: [{ class: classIdN, level }],
        });
        if (!buildResult.success) {
          results.push({ level, resref, success: false, error: buildResult.error });
          continue;
        }

        const target = await resolveCreatureTarget(
          index,
          resref,
          undefined,
          undefined,
          "build_npc_level_library",
          `Build level ${level} library entry`,
        );
        if ("error" in target) {
          results.push({ level, resref, success: false, error: target.error });
          continue;
        }

        const { result: statResult } = applyNpcStatBlock(index, target, {
          race: raceN,
          classId: classIdN,
          level,
          powerLevel: powerLevel as PowerLevel | undefined,
          complexity: complexity as "full" | "simple" | undefined,
          seed: resref,
        });

        let specAbilityPoolSize: number | undefined;
        if (doBakeSpec) {
          const { entries } = bakeSpecAbilityPoolForCreature(index, target.obj, markReady ?? false, resref);
          target.obj.SpecAbilityList = {
            type: "list",
            value: entries.map((e) => ({
              __struct_id: 0,
              Spell: { type: "word", value: e.spell },
              SpellCasterLevel: { type: "byte", value: e.classLevel },
              SpellFlags: { type: "byte", value: e.ready ? 1 : 0 },
            })),
          };
          specAbilityPoolSize = entries.length;
        }

        await target.save();
        results.push({
          level,
          resref,
          success: true,
          hp: statResult.hp,
          featCount: statResult.feats.length,
          specAbilityPoolSize,
        });
      }

      const builtCount = results.filter((r) => r.success).length;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: results.every((r) => r.success),
                builtCount,
                totalRequested: levelList.length,
                results,
              },
              null,
              2,
            ),
          },
        ],
        // Only the all-failed case is a genuine tool execution failure — a
        // partial batch (some levels built, some skipped because their
        // resref already existed) produced real, usable output, so it stays
        // a normal result; the per-level `results` array is where a caller
        // finds out which ones failed and why.
        ...(results.length > 0 && builtCount === 0 ? { isError: true } : {}),
      };
    },
  );

  // ─── equip_npc_by_role ──────────────────────────────────────────────────

  server.tool(
    "equip_npc_by_role",
    "Equip a creature (blueprint or placed instance) with caller-supplied gear, validated against its baked FeatList proficiencies before equipping — never guesses a real item resref itself (source items with list_blueprints/resman_search first, exactly as documented). " +
      "Rejects (or with force:true, equips anyway and warns) a weapon/shield the creature has none of the baseitems.2da ReqFeat proficiency feats for, and Chest-slot armor whose AC-Bonus-derived weight tier has no matching Armor Proficiency feat. " +
      "Reports a get_wealth_budget reference figure for the given level/role, recommends a weapon type from a curated per-class preference list when no righthand item was supplied (deterministically varied by the creature's own tag/resref, so same-class NPCs don't all converge on one weapon), and runs verify_creature as its own last step so gear validity and legitimacy are confirmed in one call.",
    {
      resref: z.string().optional().describe("Blueprint resref to equip"),
      area: z.string().optional().describe("Area resref, when equipping a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to equip (with `area`)"),
      classId: optNumParam(
        "Class (classes.2da row), for the weapon-type recommendation and wealth budget. Defaults to the creature's own ClassList[0].",
      ),
      level: optNumParam(
        "Character level, for the wealth budget reference. Defaults to the creature's own ClassList[0] level.",
      ),
      role: z
        .enum(["pc", "elite", "standard", "mook"])
        .optional()
        .describe("Combat role for the wealth budget (default pc)"),
      equipment: z
        .string()
        .describe(
          'JSON object mapping slot names to item resrefs: {"righthand": "nw_wswls001", "chest": "nw_cloth001"}',
        ),
      force: z
        .boolean()
        .optional()
        .describe(
          "Equip an item even if the creature lacks the proficiency feat for it (default false — such items are skipped with a reason)",
        ),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, classId, level, role, equipment: equipJson, force }) => {
      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);

      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "equip_npc_by_role",
        `Equip ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj: creature, save } = target;

      let equipMap: Record<string, string>;
      try {
        equipMap = JSON.parse(equipJson);
      } catch {
        return { content: [{ type: "text", text: "Invalid JSON for equipment parameter." }] };
      }

      const classList = listOf(creature, "ClassList");
      const resolvedClassId =
        classId !== undefined ? toI(classId) : classList.length > 0 ? getFieldNum(classList[0], "Class") : undefined;
      const resolvedLevel =
        level !== undefined
          ? toI(level)
          : classList.reduce((sum, c) => sum + getFieldNum(c, "ClassLevel"), 0) || undefined;

      const featIds = new Set(listOf(creature, "FeatList").map((f) => getFieldNum(f, "Feat")));

      let equipList = getFieldList(creature, "Equip_ItemList");
      if (!creature.Equip_ItemList) {
        creature.Equip_ItemList = { type: "list", value: [] };
        equipList = (creature.Equip_ItemList as { value: GffObj[] }).value;
      }

      const equipped: Array<{ slot: string; resref: string; warning?: string }> = [];
      const skipped: Array<{ slot: string; resref: string; reason: string }> = [];

      for (const [slotName, itemResref] of Object.entries(equipMap)) {
        const slotId = EQUIP_SLOT_MAP[slotName.toLowerCase()];
        if (slotId === undefined) {
          skipped.push({ slot: slotName, resref: itemResref, reason: "unknown slot" });
          continue;
        }

        const itemDoc = await resolveBlueprint(index, itemResref, "uti", resmanOpts);
        if (!itemDoc) {
          skipped.push({ slot: slotName, resref: itemResref, reason: "blueprint not found" });
          continue;
        }
        const itemObj = itemDoc as GffObj;
        const baseItem = getFieldNum(itemObj, "BaseItem");
        const baseRow = twoDARow(index, "baseitems", baseItem);

        if (baseRow && hasCell(baseRow, "EquipableSlots")) {
          const mask = Number(baseRow.EquipableSlots);
          if (!Number.isNaN(mask) && (mask & slotId) === 0) {
            skipped.push({
              slot: slotName,
              resref: itemResref,
              reason: `BaseItem ${baseItem} is not equipable in slot "${slotName}"`,
            });
            continue;
          }
        }

        // Proficiency check — weapons/shields via ReqFeat0-4, Chest armor via its AC Bonus tier.
        // Shared with set_creature_equipment so there's one place this logic can get wrong.
        const profReason = checkEquipProficiency(slotId, itemObj, baseRow, featIds);
        if (profReason && !force) {
          skipped.push({ slot: slotName, resref: itemResref, reason: profReason });
          continue;
        }

        delete itemObj.__data_type;
        itemObj.__struct_id = slotId;
        setField(itemObj, "Dropable", "byte", 1);
        const existingIdx = equipList.findIndex((e) => (e as GffObj).__struct_id === slotId);
        if (existingIdx >= 0) equipList.splice(existingIdx, 1);
        equipList.push(itemObj);
        equipped.push({ slot: slotName, resref: itemResref, ...(profReason ? { warning: profReason } : {}) });
      }

      await save();

      const recommendedWeapon =
        !equipMap.righthand && resolvedClassId !== undefined
          ? pickWeaponPreference(resolvedClassId, target.label)
          : undefined;
      const budget =
        resolvedLevel !== undefined ? budgetBreakdown(resolvedLevel, (role as GearRole) ?? "pc") : undefined;

      const report = new Report(target.label, "utc");
      await verifyCreature(report, index, creature, { resmanOpts });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                equipped,
                skipped: skipped.length > 0 ? skipped : undefined,
                recommendedWeapon: recommendedWeapon
                  ? {
                      baseItem: recommendedWeapon.baseItem,
                      label: recommendedWeapon.label,
                      note: "No righthand item supplied — search for a real blueprint of this base item type",
                    }
                  : undefined,
                budgetReference: budget,
                verify: report.result(),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── respec_weapon_feats ────────────────────────────────────────────────

  const WEAPON_FEAT_COLUMNS = [
    "WeaponFocusFeat",
    "WeaponSpecializationFeat",
    "WeaponImprovedCriticalFeat",
    "EpicWeaponFocusFeat",
    "EpicWeaponSpecializationFeat",
  ] as const;

  server.tool(
    "respec_weapon_feats",
    "Swap a creature's weapon-specific feats (Weapon Focus/Specialization/Improved Critical, and their epic tiers) from whatever weapon they currently cover onto a different weapon, at the same tiers it already had. " +
      "Primarily for General Fighter / package-based builds where the weapon type is a story/user choice rather than fixed at creation. Auto-detects the current weapon by scanning baseitems.2da's WeaponFocusFeat/WeaponSpecializationFeat/WeaponImprovedCriticalFeat columns (and their Epic variants) against the creature's FeatList — pass fromBaseItem to scope detection to one specific weapon if the creature has feats for more than one.",
    {
      resref: z.string().optional().describe("Blueprint resref to respec"),
      area: z.string().optional().describe("Area resref, when respeccing a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to respec (with `area`)"),
      toBaseItem: numParam("baseitems.2da row of the new weapon to specialize in"),
      fromBaseItem: optNumParam(
        "baseitems.2da row of the specific weapon to move feats away from (default: auto-detect from FeatList)",
      ),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, toBaseItem, fromBaseItem }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "respec_weapon_feats",
        `Respec weapon feats on ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj: creature, save } = target;

      const toRow = twoDARow(index, "baseitems", toI(toBaseItem));
      if (!toRow) {
        return { content: [{ type: "text", text: `baseitems.2da has no row ${toI(toBaseItem)}` }] };
      }

      const featList = listOf(creature, "FeatList");
      const originalFeatIds = new Set(featList.map((f) => getFieldNum(f, "Feat")));
      const toBaseItemNum = toI(toBaseItem);

      const sourceBaseItems =
        fromBaseItem !== undefined
          ? [toI(fromBaseItem)]
          : [...(index.twodaTables.get("baseitems")?.rows.entries() ?? [])]
              .map(([row]) => row)
              .filter((row) => row !== toBaseItemNum); // never treat the target weapon as its own source

      const removed: Array<{ tier: string; feat: number; fromBaseItem: number }> = [];
      const added: Array<{ tier: string; feat: number }> = [];
      const skippedTiers: string[] = [];

      // Phase 1: detect matches against the ORIGINAL FeatList only — a frozen
      // snapshot, so a feat added while respeccing one weapon is never
      // mistaken for a match on a later source row in the same scan.
      const matches: Array<{ tier: (typeof WEAPON_FEAT_COLUMNS)[number]; feat: number; fromBaseItem: number }> = [];
      for (const srcRow of sourceBaseItems) {
        const srcData = twoDARow(index, "baseitems", srcRow);
        if (!srcData) continue;
        for (const column of WEAPON_FEAT_COLUMNS) {
          const featVal = srcData[column];
          if (!featVal || featVal === "****") continue;
          const featNum = Number(featVal);
          if (originalFeatIds.has(featNum)) matches.push({ tier: column, feat: featNum, fromBaseItem: srcRow });
        }
      }

      // Phase 2: apply — remove every matched source feat, add the target
      // weapon's equivalent tier (skipping a tier the target weapon has no
      // feat for, rather than guessing).
      const featIds = new Set(originalFeatIds);
      for (const { tier, feat, fromBaseItem: srcRow } of matches) {
        featIds.delete(feat);
        removed.push({ tier, feat, fromBaseItem: srcRow });

        const newFeatVal = toRow[tier];
        if (!newFeatVal || newFeatVal === "****") {
          skippedTiers.push(`${tier}: target weapon (BaseItem ${toBaseItemNum}) has no feat for this tier`);
          continue;
        }
        const newFeatNum = Number(newFeatVal);
        if (!featIds.has(newFeatNum)) {
          featIds.add(newFeatNum);
          added.push({ tier, feat: newFeatNum });
        }
      }

      if (removed.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  message:
                    "No weapon-specific feats found to respec" +
                    (fromBaseItem !== undefined
                      ? ` for BaseItem ${toI(fromBaseItem)}`
                      : " (auto-detect scanned every baseitems.2da row)"),
                },
                null,
                2,
              ),
            },
          ],
        };
      }

      creature.FeatList = {
        type: "list",
        value: [...featIds].map((f) => ({ __struct_id: 1, Feat: { type: "word", value: f } })),
      };

      await save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                toBaseItem: toI(toBaseItem),
                removed,
                added,
                skippedTiers: skippedTiers.length > 0 ? skippedTiers : undefined,
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── remove_feats ────────────────────────────────────────────────────────
  // Gap found applying verify_creature to a real module: several checks
  // (weapon_feat_non_melee_class, invalid_feat_id) name "remove the feat" as
  // their fix, but no tool actually did a plain removal — respec_weapon_feats
  // always re-adds a matching feat for a replacement weapon (toBaseItem is
  // required), which is the wrong shape when the fix is "this class shouldn't
  // have a per-weapon investment feat at all," not "retarget it."

  server.tool(
    "remove_feats",
    "Remove specific feats from a creature's FeatList by feat.2da row id, with nothing added back. " +
      "Use this for verify_creature findings whose fix is a plain removal — e.g. weapon_feat_non_melee_class " +
      "(a Weapon Focus/Specialization/Improved Critical tier on a class that shouldn't have one) or invalid_feat_id. " +
      "For swapping a weapon-investment tier onto a different weapon (not removing it outright), use respec_weapon_feats instead.",
    {
      resref: z.string().optional().describe("Blueprint resref to edit"),
      area: z.string().optional().describe("Area resref, when editing a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to edit (with `area`)"),
      feats: z.string().describe('JSON array of feat.2da row ids to remove, e.g. "[95,133]"'),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, feats }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "remove_feats",
        `Remove feats from ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj: creature, save } = target;

      const toRemove = new Set<number>(JSON.parse(feats));
      const featList = listOf(creature, "FeatList");
      const before = featList.map((f) => getFieldNum(f, "Feat"));
      const removed = before.filter((f) => toRemove.has(f));
      const kept = before.filter((f) => !toRemove.has(f));

      creature.FeatList = {
        type: "list",
        value: kept.map((f) => ({ __struct_id: 1, Feat: { type: "word", value: f } })),
      };
      await save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                removed,
                notFound: [...toRemove].filter((f) => !before.includes(f)),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── add_equipped_item_property ─────────────────────────────────────────
  // Gap found while investigating a real armor-mechanics bug: several base-
  // game NPC "costume" armor items (the `nw_aarcl0XX` family, at minimum)
  // have a genuinely empty PropertiesList — confirmed directly against the
  // real base-game .uti, not a copying bug — so they provide zero real AC
  // bonus despite looking like Chain/Banded/whatever armor. add_item_property
  // only ever targets a standalone item blueprint resource; there was no way
  // to add a property to an item already embedded in a creature's
  // Equip_ItemList (a different struct entirely, per the documented
  // "placed instance is a separate copy" pattern this project already
  // knows about for ClassList/FeatList).

  server.tool(
    "add_equipped_item_property",
    "Add an item property (itempropdef.2da row) to an item already equipped on a creature's Equip_ItemList, by slot. " +
      "Use this to give a cosmetic-only armor piece (empty PropertiesList — common on some base-game NPC costume items) a real " +
      "ITEM_PROPERTY_AC_BONUS (propertyName 1, costTable 2, costValue = the AC bonus 0-8) so its mechanical AC matches its " +
      "visual tier, and verify_creature's armor_proficiency_mismatch check has something real to compare against. " +
      "For a standalone item blueprint (not yet equipped on anyone), use add_item_property instead.",
    {
      resref: z.string().optional().describe("Blueprint resref to edit"),
      area: z.string().optional().describe("Area resref, when editing a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to edit (with `area`)"),
      slot: z
        .string()
        .describe(
          "Equip slot name: head, chest, boots, arms, righthand, lefthand, cloak, leftring, rightring, neck, belt, arrows, bullets, bolts",
        ),
      propertyName: numParam("itempropdef.2da row — e.g. 1 for AC_BONUS"),
      subType: optNumParam("Subtype value (default 0)"),
      costTable: optNumParam("Cost table index — e.g. 2 for AC_BONUS's cost table"),
      costValue: numParam("Cost value — e.g. the AC bonus amount for propertyName 1"),
      param1: optNumParam("Param1 table index (default 255 = no param)"),
      param1Value: optNumParam("Param1 value (default 0)"),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, slot, propertyName, subType, costTable, costValue, param1, param1Value }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "add_equipped_item_property",
        `Add item property on ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj: creature, save } = target;

      const slotId = EQUIP_SLOT_MAP[slot.toLowerCase()];
      if (slotId === undefined) {
        return {
          content: [{ type: "text", text: `Unknown slot '${slot}'. Valid: ${Object.keys(EQUIP_SLOT_MAP).join(", ")}` }],
        };
      }

      const equipList = listOf(creature, "Equip_ItemList");
      const item = equipList.find((e) => (e as { __struct_id?: number }).__struct_id === slotId) as GffObj | undefined;
      if (!item) {
        return { content: [{ type: "text", text: `Nothing equipped in slot '${slot}' on ${target.label}` }] };
      }

      const properties = getFieldList(item, "PropertiesList");
      properties.push({
        __struct_id: 0,
        PropertyName: { type: "word", value: toI(propertyName) },
        Subtype: { type: "word", value: toI(subType, 0) },
        CostTable: { type: "byte", value: toI(costTable, 0) },
        CostValue: { type: "word", value: toI(costValue) },
        Param1: { type: "byte", value: toI(param1, 255) },
        Param1Value: { type: "byte", value: toI(param1Value, 0) },
        ChanceAppear: { type: "byte", value: 100 },
      } as unknown as GffObj);
      item.PropertiesList = { type: "list", value: properties };

      await save();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                slot,
                added: {
                  propertyName: toI(propertyName),
                  subType: toI(subType, 0),
                  costTable: toI(costTable, 0),
                  costValue: toI(costValue),
                },
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
