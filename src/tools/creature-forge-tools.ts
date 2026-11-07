/**
 * Creature forge — spawn-time levelling tools (docs/creature-forge-spec.md §8.3).
 *
 *   forge_creature                 turn a creature into a valid level-1 build that levels
 *                                  itself at spawn (LevelUpHenchman), buys gear from the
 *                                  module's stores, and gets correct spell abilities.
 *   create_creature_level_system   write and compile inc_cre_level + the cf_spawn wrapper.
 *
 * The LLM supplies the specification (class, target level, role, wealth, stores); the
 * rules (feat legality, slots per day, caster level, proficiency, budgets) are code.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { ResmanOptions } from "../nim-tools.js";
import type { GffObj } from "../types/gff.js";
import { getFieldNum, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import {
  CREATURE_LEVEL_INCLUDE,
  CREATURE_LEVEL_WRAPPER,
  DEFAULT_GEAR_STORES,
  generateCreatureLevelInclude,
  generateCreatureLevelWrapper,
} from "../util/creature-level-script.js";
import { estimateCRFromLevel } from "../util/encounter-difficulty.js";
import { EQUIP_SLOT_MAP } from "../util/equip-slots.js";
import { mergeVarTable, resolveBlueprint } from "../util/git-helpers.js";
import { pickWeaponPreference, seedHash } from "../util/npc-weapon-preferences.js";
import type { PowerLevel } from "../util/npc-stat-block.js";
import { toF, toI } from "../util/params.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { hasCell, isRetired2DARow, listOf, twoDARow } from "../util/verify/common.js";
import type { GearRole } from "../util/wealth.js";
import { applyNpcStatBlock, type CreatureTarget, creatureSeed, resolveCreatureTarget, targetErrorResult } from "./npc-tools.js";

/** Locals from older systems that the forge supersedes (stale once a creature levels at spawn). */
const SUPERSEDED_VARS = ["HENCH_LEVEL", "SPEC_ENABLED", "SPEC_RACE", "SPEC_APPEARANCE", "SPEC_CLASS", "SPEC_LEVEL", "SPEC_PACKAGE"];

/** Creature-only slots kept when gear is replaced (claws, bite, hide). */
const CREATURE_SLOTS = new Set([EQUIP_SLOT_MAP.cweapon_l, EQUIP_SLOT_MAP.cweapon_r, EQUIP_SLOT_MAP.cweapon_b, EQUIP_SLOT_MAP.hide]);

const BASELINE_CLOTHING = "nw_cloth001";

/**
 * Default allowance multiplier on the role's share of DMG wealth-by-level. CONVENTION
 * (user-set 2026-11-07): full PC wealth made NPC gear, and the loot it drops, too rich
 * for the party, so NPCs carry half by default.
 */
export const DEFAULT_GEAR_WEALTH = 0.5;

export interface ForgeParams {
  race: number;
  classId: number;
  /** Absolute target level; 0 to use levelRel. */
  level: number;
  levelRel?: number;
  levelMin?: number;
  levelMax?: number;
  /** Class id per level for a multiclass progression (index 0 = level 1). */
  plan?: number[];
  powerLevel?: PowerLevel;
  complexity?: "full" | "simple";
  gearRole?: GearRole;
  /** Allowance multiplier (default DEFAULT_GEAR_WEALTH); 0 keeps the creature's current gear. */
  gearWealth?: number;
  /** Preferred weapon baseitems.2da rows; default: the class's seeded preference. */
  weapons?: number[];
  /** Script the wrapper runs first; default: the creature's current ScriptSpawn. */
  originalSpawn?: string;
}

export interface ForgeResult {
  target: string;
  targetLevel: number | string;
  levelOneFeats: number[];
  spellPoolSizes: Record<string, Record<string, number>>;
  gear: string;
  originalSpawn: string;
  warnings: string[];
}

/** Deterministic Fisher-Yates shuffle from a string seed. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  const out = [...items];
  let state = seedHash(seed) || 1;
  for (let i = out.length - 1; i > 0; i--) {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Every spell on a class's list, grouped by spell level and shuffled by seed.
 * Reads the spell's own class column (never resolving through Master — the bug that
 * leaked Extract Brain into a Cleric's book) and keeps only real spells (UserType 1).
 */
export function classSpellPools(index: ModuleIndex, classId: number, seed: string): Record<string, number[]> | undefined {
  const classRow = twoDARow(index, "classes", classId);
  if (!classRow || classRow.SpellCaster !== "1" || !hasCell(classRow, "SpellTableColumn")) return undefined;
  const column = classRow.SpellTableColumn;
  const byLevel: Record<string, number[]> = {};
  for (const [spellId, row] of index.twodaTables.get("spells")?.rows ?? []) {
    if (isRetired2DARow(row)) continue;
    if (hasCell(row, "UserType") && row.UserType !== "1") continue;
    const cell = row[column];
    if (!cell || cell === "****") continue;
    const level = Number(cell);
    if (!Number.isInteger(level) || level < 0 || level > 9) continue;
    (byLevel[String(level)] ??= []).push(spellId);
  }
  const pools: Record<string, number[]> = {};
  for (const [level, ids] of Object.entries(byLevel)) pools[level] = seededShuffle(ids.sort((a, b) => a - b), `${seed}:${classId}:${level}`);
  return Object.keys(pools).length > 0 ? pools : undefined;
}

/** Moves alignment inside a class's restriction (Monk lawful; Paladin lawful good; Barbarian/Bard not lawful). */
function fitAlignment(obj: GffObj, classIds: number[], warnings: string[]): void {
  const lc = getFieldNum(obj, "LawfulChaotic");
  const ge = getFieldNum(obj, "GoodEvil");
  let newLc = lc;
  let newGe = ge;
  if (classIds.includes(5) || classIds.includes(6)) newLc = Math.max(lc, 85);
  if (classIds.includes(6)) newGe = Math.max(ge, 85);
  if ((classIds.includes(0) || classIds.includes(1)) && newLc >= 70) newLc = 50;
  if (newLc !== lc || newGe !== ge) {
    setField(obj, "LawfulChaotic", "byte", newLc);
    setField(obj, "GoodEvil", "byte", newGe);
    warnings.push(`alignment moved ${lc}/${ge} -> ${newLc}/${newGe} so LevelUpHenchman accepts the class`);
  }
}

function removeVars(obj: GffObj, names: string[]): void {
  const table = obj.VarTable as { value?: GffObj[] } | undefined;
  if (!table || !Array.isArray(table.value)) return;
  const drop = new Set(names.map((n) => n.toLowerCase()));
  table.value = table.value.filter((v) => !drop.has(getFieldStr(v, "Name").toLowerCase()));
}

/** Applies the forge to one creature object (blueprint or placed instance). Does not save. */
export async function forgeCreature(
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  target: CreatureTarget,
  params: ForgeParams,
): Promise<ForgeResult> {
  const obj = target.obj;
  const warnings: string[] = [];
  const seed = creatureSeed(obj);
  const plan = params.plan && params.plan.length > 0 ? params.plan : undefined;
  const firstClass = plan ? plan[0] : params.classId;

  // 1. A legal level-1 build (feat-legality.ts gates every pick). The engine levels it from here.
  const { result, raceWarning, casterWarning } = applyNpcStatBlock(index, target, {
    race: params.race,
    classId: firstClass,
    level: 1,
    powerLevel: params.powerLevel,
    complexity: params.complexity,
    seed,
  });
  warnings.push(...raceWarning, ...result.warnings);
  void casterWarning; // spell abilities are written at spawn by inc_cre_level, not at build time

  const classIds = [...new Set(plan ?? [params.classId])];
  fitAlignment(obj, classIds, warnings);

  // 2. Levelling plan and target.
  const targetLevel = params.level > 0 ? params.level : 0;
  setField(obj, "ChallengeRating", "float", estimateCRFromLevel(targetLevel > 0 ? targetLevel : Math.max(1, params.levelMin ?? 1)));
  removeVars(obj, SUPERSEDED_VARS);
  const vars: Array<{ name: string; type: "int" | "float" | "string"; value: number | string }> = [
    { name: "MCP_LEVEL", type: "int", value: targetLevel },
    { name: "MCP_LEVEL_REL", type: "int", value: params.levelRel ?? 0 },
    { name: "MCP_LEVEL_MIN", type: "int", value: params.levelMin ?? (targetLevel > 0 ? 0 : 1) },
    { name: "MCP_LEVEL_MAX", type: "int", value: params.levelMax ?? 0 },
    { name: "MCP_LEVEL_PLAN", type: "string", value: plan ? plan.join(",") : "" },
  ];

  // 3. Spell pools per caster class (inc_cre_level picks the right count at the reached level).
  const pools: Record<string, Record<string, number[]>> = {};
  for (const classId of classIds) {
    const p = classSpellPools(index, classId, seed);
    if (p) pools[String(classId)] = p;
  }
  vars.push({ name: "MCP_SA_POOL", type: "string", value: Object.keys(pools).length > 0 ? JSON.stringify(pools) : "" });
  if (Object.keys(pools).length > 0) obj.SpecAbilityList = { type: "list", value: [] };

  // 4. Gear settings. With an allowance, start from baseline clothing and creature-only slots.
  const wealth = params.gearWealth ?? DEFAULT_GEAR_WEALTH;
  const weapons =
    params.weapons ?? (() => {
      const pref = pickWeaponPreference(firstClass, seed);
      return pref ? [pref.baseItem] : [];
    })();
  vars.push(
    { name: "MCP_GEAR_WEALTH", type: "float", value: wealth },
    { name: "MCP_GEAR_ROLE", type: "string", value: params.gearRole ?? "standard" },
    { name: "MCP_GEAR_WEAPONS", type: "string", value: weapons.join(",") },
  );
  let gear = "kept";
  if (wealth > 0) {
    const kept = listOf(obj, "Equip_ItemList").filter((e) => CREATURE_SLOTS.has(e.__struct_id as number));
    const clothing = await resolveBlueprint(index, BASELINE_CLOTHING, "uti", resmanOpts);
    if (clothing) {
      const item = clothing as GffObj;
      delete item.__data_type;
      item.__struct_id = EQUIP_SLOT_MAP.chest;
      setField(item, "Dropable", "byte", 0);
      kept.push(item);
    } else warnings.push(`${BASELINE_CLOTHING}.uti not found; creature starts with no clothing until it shops`);
    obj.Equip_ItemList = { type: "list", value: kept };
    gear = `bought at spawn (role ${params.gearRole ?? "standard"}, x${wealth})`;
  }
  mergeVarTable(obj, vars);

  // 5. Wire the spawn wrapper, remembering the original handler.
  const current = getFieldStr(obj, "ScriptSpawn");
  const originalSpawn = params.originalSpawn ?? (current === CREATURE_LEVEL_WRAPPER ? "nw_c2_default9" : current || "nw_c2_default9");
  mergeVarTable(obj, [{ name: "MCP_ORIG_SPAWN", type: "string", value: originalSpawn }]);
  setField(obj, "ScriptSpawn", "resref", CREATURE_LEVEL_WRAPPER);

  return {
    target: target.label,
    targetLevel: targetLevel > 0 ? targetLevel : `party average ${(params.levelRel ?? 0) >= 0 ? "+" : ""}${params.levelRel ?? 0}`,
    levelOneFeats: result.feats.map((f) => f.feat),
    spellPoolSizes: Object.fromEntries(
      Object.entries(pools).map(([c, p]) => [c, Object.fromEntries(Object.entries(p).map(([l, ids]) => [l, ids.length]))]),
    ),
    gear,
    originalSpawn,
    warnings,
  };
}

/** Writes inc_cre_level and cf_spawn, compiling the wrapper (which proves the include). */
export async function writeCreatureLevelSystem(
  index: ModuleIndex,
  stores?: string[],
  droppable?: boolean,
): Promise<{ include: string; wrapper: string; compiled: boolean; compilerOutput?: string; stores: string[] }> {
  await writeAndCompileScript(index, CREATURE_LEVEL_INCLUDE, generateCreatureLevelInclude({ stores, droppable }), false);
  const wrapper = await writeAndCompileScript(index, CREATURE_LEVEL_WRAPPER, generateCreatureLevelWrapper(), true);
  return {
    include: `${CREATURE_LEVEL_INCLUDE}.nss`,
    wrapper: `${CREATURE_LEVEL_WRAPPER}.nss`,
    compiled: wrapper.compiled === true,
    compilerOutput: wrapper.compiled ? undefined : wrapper.compilerOutput,
    stores: stores && stores.length > 0 ? stores : DEFAULT_GEAR_STORES,
  };
}

export function registerCreatureForgeTools(server: McpServer): void {
  server.tool(
    "create_creature_level_system",
    "Write and compile the spawn-time levelling system: inc_cre_level.nss (LevelUpHenchman loop, store shopping with a " +
      "level-scaled allowance, spell abilities written at the right caster level and slots per day, in-game verification " +
      "logging [SPEC_OK]/[SPEC_FAIL]) and the cf_spawn OnSpawn wrapper used by every forged creature. Call once per module " +
      "before forge_creature. `stores` names the store tags/resrefs NPCs buy from (default: four base-game stores). " +
      "Unspent allowance is discarded, never given as gold.",
    {
      stores: z.string().optional().describe('JSON array of store tags or resrefs, e.g. ["nw_storeweap001","my_smith"]'),
      droppable: z.boolean().optional().describe("Whether bought gear can drop as loot (default true)"),
    },
    { destructiveHint: true },
    async ({ stores, droppable }) => {
      const index = requireIndex();
      let storeList: string[] | undefined;
      if (stores) {
        try {
          storeList = JSON.parse(stores);
        } catch {
          return { content: [{ type: "text", text: "stores must be a JSON array of strings" }], isError: true };
        }
      }
      const result = await writeCreatureLevelSystem(index, storeList, droppable);
      return {
        content: [{ type: "text", text: JSON.stringify({ success: result.compiled, ...result }, null, 2) }],
        ...(result.compiled ? {} : { isError: true }),
      };
    },
  );

  server.tool(
    "forge_creature",
    "Make a creature level itself correctly at spawn. Writes a LEGAL level-1 build (every feat checked against feat.2da " +
      "requirements; package feat order), fits alignment to the class, then sets the levelling plan: at spawn " +
      "LevelUpHenchman takes it to `level` (or the party's average level + `levelRel`), it buys gear from the module's " +
      "stores within a gold allowance that grows with level (role share x `gearWealth`, default 0.5; proficiency-checked, since the " +
      "engine refuses to equip items a creature isn't proficient with), and casters get spell abilities with the correct " +
      "spells, caster level and slots per day. Target a blueprint (`resref`) or a placed instance (`area`+`tag`); call it " +
      "for both copies. Needs create_creature_level_system once per module. Placed creatures spawn at module load, before " +
      "any PC exists, so use an absolute `level` for them; `levelRel` suits creatures spawned later by script or encounter.",
    {
      resref: z.string().optional().describe("Blueprint resref"),
      area: z.string().optional().describe("Area resref of a placed instance (with tag)"),
      tag: z.string().optional().describe("Tag of the placed instance"),
      race: z.string().describe("racialtypes.2da row"),
      classId: z.string().describe("classes.2da row (first class; see plan for multiclass)"),
      level: z.string().optional().describe("Absolute target level (default 0 = use levelRel)"),
      levelRel: z.string().optional().describe("Offset from the party's average level at spawn"),
      levelMin: z.string().optional().describe("Minimum level"),
      levelMax: z.string().optional().describe("Maximum level"),
      plan: z.string().optional().describe("JSON array of class ids, one per level, for multiclass order"),
      powerLevel: z.enum(["elite", "low", "standard", "tougher", "epic"]).optional().describe("Ability-score band (default elite)"),
      complexity: z.enum(["full", "simple"]).optional().describe("'simple' = required feats only (minions, commoners)"),
      gearRole: z.enum(["pc", "elite", "standard", "mook"]).optional().describe("Wealth share: pc/elite 100%, standard 50%, mook 25% (default standard)"),
      gearWealth: z.string().optional().describe("Allowance multiplier on the role share (default 0.5; 0 keeps current gear)"),
      weapons: z.string().optional().describe("JSON array of preferred baseitems.2da rows"),
      originalSpawn: z.string().optional().describe("Spawn script to run before levelling (default: the creature's current ScriptSpawn)"),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);
      const target = await resolveCreatureTarget(index, args.resref, args.area, args.tag, "forge_creature", `Forge ${args.tag ?? args.resref}`);
      if ("error" in target) return targetErrorResult(target);
      let plan: number[] | undefined;
      let weapons: number[] | undefined;
      try {
        plan = args.plan ? (JSON.parse(args.plan) as number[]) : undefined;
        weapons = args.weapons ? (JSON.parse(args.weapons) as number[]) : undefined;
      } catch {
        return { content: [{ type: "text", text: "plan and weapons must be JSON arrays of numbers" }], isError: true };
      }
      const result = await forgeCreature(index, resmanOpts, target, {
        race: toI(args.race),
        classId: toI(args.classId),
        level: toI(args.level, 0),
        levelRel: args.levelRel !== undefined ? toI(args.levelRel) : undefined,
        levelMin: args.levelMin !== undefined ? toI(args.levelMin) : undefined,
        levelMax: args.levelMax !== undefined ? toI(args.levelMax) : undefined,
        plan,
        powerLevel: args.powerLevel as PowerLevel | undefined,
        complexity: args.complexity,
        gearRole: args.gearRole as GearRole | undefined,
        gearWealth: args.gearWealth !== undefined ? toF(args.gearWealth) : undefined,
        weapons,
        originalSpawn: args.originalSpawn,
      });
      await target.save();
      const hasSystem = index.resources.has(`${CREATURE_LEVEL_WRAPPER}.ncs`);
      if (!hasSystem) result.warnings.push("cf_spawn.ncs is not in the module yet — run create_creature_level_system");
      return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 2) }] };
    },
  );
}
