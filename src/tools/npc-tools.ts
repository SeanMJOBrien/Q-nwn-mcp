/**
 * Deterministic NPC generation tools — reduces the per-NPC manual arithmetic/
 * lookup work (ability scores, feats, skill points, HP, gear search, weapon
 * feat picks) that was the source of every real mistake in the sessions that
 * built this project's own test modules, per CLAUDE.md's "reduce how much of
 * NPC generation the LLM does by hand vs. deterministic code" TODO.
 *
 * Tools:
 * - build_npc_stat_block: race -> racial feats -> ability scores -> class ->
 *   class feats -> skill points -> HP, on an existing creature blueprint.
 *   Primarily for Henchmen for now (companions are always built as a
 *   blueprint before placement) — general-NPC support is a documented future
 *   extension, not a limitation of the underlying computation.
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
import { getFieldList, getFieldNum, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { EQUIP_SLOT_MAP } from "../util/equip-slots.js";
import { getGitDoc, resolveBlueprint, writeBackGit } from "../util/git-helpers.js";
import { buildNpcStatBlock, type PowerLevel } from "../util/npc-stat-block.js";
import { CLASS_WEAPON_PREFERENCE } from "../util/npc-weapon-preferences.js";
import { numParam, optNumParam, toI } from "../util/params.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { armorTierFeat, REQ_FEAT_COLUMNS, verifyCreature } from "../util/verify/blueprints.js";
import { hasCell, listOf, Report, twoDARow } from "../util/verify/common.js";
import { budgetBreakdown, type GearRole } from "../util/wealth.js";

// ─── Shared target resolution (blueprint OR placed instance) ──────────────

interface CreatureTarget {
  obj: GffObj;
  label: string;
  save: () => Promise<void>;
}

async function resolveCreatureTarget(
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

export function registerNpcTools(server: McpServer): void {
  // ─── build_npc_stat_block ───────────────────────────────────────────────

  server.tool(
    "build_npc_stat_block",
    "Compute and write a full mechanical stat block (ability scores, FeatList, SkillList, HP, StartingPackage) onto an EXISTING creature blueprint (.utc, created via create_creature_blueprint), following the canonical race->racial feats->ability scores->class->class feats->skill points->HP creation order. " +
      "Reads race_feat_<race>.2da, cls_feat_<class>.2da (List=3 automatic feats), cls_bfeat_<class>.2da (bonus feat slots), cls_skill_<class>.2da (class skills), and classes.2da/racialtypes.2da live from the loaded module — nothing hardcoded except a small curated per-class weapon preference used to fill bonus/generic feat slots. " +
      "Deterministic, no dice rolling: 'elite' power level uses the literal Elite Array (15/14/13/12/10/8); other levels use a D&D 3.5 point-buy budget. Primarily intended for Henchmen (companions are always built as a blueprint before placement); works on any single-class creature blueprint. Does not set race/appearance/gender/name — those are create_creature_blueprint's job, set them first.",
    {
      resref: z
        .string()
        .describe(
          "Existing creature blueprint resref (must already exist — create it with create_creature_blueprint first)",
        ),
      race: numParam("Racial type (racialtypes.2da row, 0-6 for the standard PC races)"),
      classId: numParam(
        "Class (classes.2da row). Class IDs: 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin 7=Ranger 8=Rogue 9=Sorcerer 10=Wizard",
      ),
      level: numParam("Target character level (1-20)"),
      powerLevel: z
        .enum(["elite", "low", "standard", "tougher", "epic"])
        .optional()
        .describe(
          "Ability-score generation band (default elite = literal Elite Array 15/14/13/12/10/8). Others are D&D 3.5 point-buy budgets: low=15, standard=25, tougher=32, epic=36.",
        ),
    },
    { idempotentHint: true },
    async ({ resref, race, classId, level, powerLevel }) => {
      const index = requireIndex();
      const key = `${resref.toLowerCase()}.utc`;
      const doc = index.parsedGff.get(key);
      if (!doc) {
        return {
          content: [
            { type: "text", text: `No ${key} in the module — create it with create_creature_blueprint first.` },
          ],
        };
      }
      const obj = doc as GffObj;

      const result = buildNpcStatBlock(index, {
        race: toI(race),
        classId: toI(classId),
        level: toI(level),
        powerLevel: (powerLevel as PowerLevel | undefined) ?? "elite",
      });

      const existingRace = getFieldNum(obj, "Race");
      const raceWarning =
        existingRace !== toI(race)
          ? [
              `Blueprint's existing Race field (${existingRace}) differs from race param (${toI(race)}) — this tool only writes the mechanical stat block, not identity fields; update Race/Appearance_Type separately if that mismatch is real.`,
            ]
          : [];

      // Ability scores
      setField(obj, "Str", "byte", result.abilityScores.str);
      setField(obj, "Dex", "byte", result.abilityScores.dex);
      setField(obj, "Con", "byte", result.abilityScores.con);
      setField(obj, "Int", "byte", result.abilityScores.int);
      setField(obj, "Wis", "byte", result.abilityScores.wis);
      setField(obj, "Cha", "byte", result.abilityScores.cha);

      // Classes
      obj.ClassList = {
        type: "list",
        value: result.classes.map((c) => ({
          __struct_id: 2,
          Class: { type: "int", value: c.class },
          ClassLevel: { type: "short", value: c.level },
        })),
      };

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

      const filePath = path.join(index.tempDir, key);
      await jsonToGff(doc, filePath);
      const stat = await fs.stat(filePath);
      const entry = index.resources.get(key);
      if (entry) entry.sizeBytes = stat.size;
      index.parsedGff.set(key, doc);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                resref,
                abilityScores: result.abilityScores,
                classes: result.classes,
                featCount: result.feats.length,
                feats: result.feats,
                skillPointsSpent: result.skillRanks.reduce((sum, s) => sum + s.rank, 0),
                hp: result.hp,
                startingPackage: result.startingPackage,
                warnings: [...raceWarning, ...result.warnings],
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── equip_npc_by_role ──────────────────────────────────────────────────

  server.tool(
    "equip_npc_by_role",
    "Equip a creature (blueprint or placed instance) with caller-supplied gear, validated against its baked FeatList proficiencies before equipping — never guesses a real item resref itself (source items with list_blueprints/resman_search first, exactly as documented). " +
      "Rejects (or with force:true, equips anyway and warns) a weapon/shield the creature has none of the baseitems.2da ReqFeat proficiency feats for, and Chest-slot armor whose AC-Bonus-derived weight tier has no matching Armor Proficiency feat. " +
      "Reports a get_wealth_budget reference figure for the given level/role, recommends a weapon type from a curated per-class preference when no righthand item was supplied, and runs verify_creature as its own last step so gear validity and legitimacy are confirmed in one call.",
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
      if ("error" in target) return { content: [{ type: "text", text: target.error }] };
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
        let profReason: string | undefined;
        if ((slotId === EQUIP_SLOT_MAP.righthand || slotId === EQUIP_SLOT_MAP.lefthand) && baseRow) {
          const reqFeats = REQ_FEAT_COLUMNS.map((col) => baseRow[col])
            .filter((v) => v !== undefined && v !== "" && v !== "****")
            .map(Number);
          if (reqFeats.length > 0 && !reqFeats.some((f) => featIds.has(f))) {
            profReason = `not proficient — needs one of feat.2da rows ${reqFeats.join(", ")}`;
          }
        } else if (slotId === EQUIP_SLOT_MAP.chest) {
          const acBonusProp = listOf(itemObj, "PropertiesList").find((p) => getFieldNum(p, "PropertyName") === 1);
          const acBonus = acBonusProp ? getFieldNum(acBonusProp, "CostValue") : 0;
          const requiredFeat = armorTierFeat(acBonus);
          if (requiredFeat !== undefined && !featIds.has(requiredFeat)) {
            profReason = `not proficient with this armor's weight tier — needs feat.2da row ${requiredFeat}`;
          }
        }
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
        !equipMap.righthand && resolvedClassId !== undefined ? CLASS_WEAPON_PREFERENCE[resolvedClassId] : undefined;
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
      if ("error" in target) return { content: [{ type: "text", text: target.error }] };
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
}
