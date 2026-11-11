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
import { getVarTableEntries, mergeVarTable, resolveBlueprint } from "../util/git-helpers.js";
import type { PowerLevel } from "../util/npc-stat-block.js";
import { pickWeaponPreference, seedHash } from "../util/npc-weapon-preferences.js";
import { toF, toI } from "../util/params.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { hasCell, isRetired2DARow, listOf, twoDARow } from "../util/verify/common.js";
import type { GearRole } from "../util/wealth.js";
import {
  applyNpcStatBlock,
  type CreatureTarget,
  creatureSeed,
  resolveCreatureTarget,
  targetErrorResult,
} from "./npc-tools.js";

/** Locals from older systems that the forge supersedes (stale once a creature levels at spawn). */
const SUPERSEDED_VARS = [
  "HENCH_LEVEL",
  "SPEC_ENABLED",
  "SPEC_RACE",
  "SPEC_APPEARANCE",
  "SPEC_CLASS",
  "SPEC_LEVEL",
  "SPEC_PACKAGE",
];

/** Creature-only slots kept when gear is replaced (claws, bite, hide). */
const CREATURE_SLOTS = new Set([
  EQUIP_SLOT_MAP.cweapon_l,
  EQUIP_SLOT_MAP.cweapon_r,
  EQUIP_SLOT_MAP.cweapon_b,
  EQUIP_SLOT_MAP.hide,
]);

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
  /** spells.2da rows always picked first at their spell level (a boss's signature spell). */
  pinnedSpells?: number[];
  /** domains.2da rows for a class that picks domains (Cleric); default: the creature's package domains. */
  domains?: number[];
  /** spellschools.2da row for a class that picks a school (Wizard); default: the creature's package school. */
  school?: number;
}

export interface ForgeResult {
  target: string;
  targetLevel: number | string;
  levelOneFeats: number[];
  spellPoolSizes: Record<string, Record<string, number>>;
  gear: string;
  originalSpawn: string;
  /** School written per school-picking class, with its opposition school. */
  school?: Record<string, { id: number; label: string; opposition?: string }>;
  /** Domains written per domain-picking class, with their power feats. */
  domains?: Record<string, Array<{ id: number; label: string; feat?: number }>>;
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
 * Spells a combat creature must never get as a spell-like ability: the default combat AI casts self-buffs before
 * a fight, so a pool holding any of these produced a boss that turned invisible (or unattackable) and stood still.
 * Matched by spells.2da label (Invisibility Purge is a dispel and stays).
 */
const SELF_CONCEALMENT_LABELS = new Set([
  "darkness",
  "invisibility",
  "improved_invisibility",
  "invisibility_sphere",
  "sanctuary",
  "ethereal_visage",
  "ghostly_visage",
]);

export function isSelfConcealmentSpell(index: ModuleIndex, spellId: number): boolean {
  const label = twoDARow(index, "spells", spellId)?.Label;
  return !!label && SELF_CONCEALMENT_LABELS.has(label.toLowerCase());
}

/**
 * Every spell on a class's list, grouped by spell level and shuffled by seed.
 * Reads the spell's own class column (never resolving through Master — the bug that
 * leaked Extract Brain into a Cleric's book) and keeps only real spells (UserType 1).
 */
export function classSpellPools(
  index: ModuleIndex,
  classId: number,
  seed: string,
): Record<string, number[]> | undefined {
  const classRow = twoDARow(index, "classes", classId);
  if (!classRow || classRow.SpellCaster !== "1" || !hasCell(classRow, "SpellTableColumn")) return undefined;
  const column = classRow.SpellTableColumn;
  const byLevel: Record<string, number[]> = {};
  for (const [spellId, row] of index.twodaTables.get("spells")?.rows ?? []) {
    if (isRetired2DARow(row)) continue;
    if (hasCell(row, "UserType") && row.UserType !== "1") continue;
    if (isSelfConcealmentSpell(index, spellId)) continue;
    const cell = row[column];
    if (!cell || cell === "****") continue;
    const level = Number(cell);
    if (!Number.isInteger(level) || level < 0 || level > 9) continue;
    (byLevel[String(level)] ??= []).push(spellId);
  }
  const pools: Record<string, number[]> = {};
  for (const [level, ids] of Object.entries(byLevel))
    pools[level] = seededShuffle(
      ids.sort((a, b) => a - b),
      `${seed}:${classId}:${level}`,
    );
  return Object.keys(pools).length > 0 ? pools : undefined;
}

/** A usable domains.2da row: has a label and a granted power feat. */
function isDomainRow(index: ModuleIndex, id: number): boolean {
  const row = twoDARow(index, "domains", id);
  return !!row && hasCell(row, "Label") && hasCell(row, "GrantedFeat");
}

/**
 * The two domains for a class that picks them (classes.2da PickDomains = 1), or undefined for any other class.
 * Requested domains win; otherwise the package's Domain1/Domain2 (what LevelUpHenchman uses for a class gained
 * later), falling back to the class's own package row.
 */
export function chooseDomains(
  index: ModuleIndex,
  classId: number,
  packageId: number | undefined,
  requested: number[] | undefined,
  warnings: string[],
): [number, number] | undefined {
  if (twoDARow(index, "classes", classId)?.PickDomains !== "1") return undefined;
  if (requested && requested.length > 0) {
    const valid = [...new Set(requested)].filter((d) => isDomainRow(index, d));
    if (valid.length === 2) return [valid[0], valid[1]];
    warnings.push(
      `domains ${JSON.stringify(requested)} must be two different domains.2da rows; using the package domains instead`,
    );
  }
  for (const pkg of [packageId, Number(twoDARow(index, "classes", classId)?.Package)]) {
    if (pkg === undefined || !Number.isInteger(pkg)) continue;
    const row = twoDARow(index, "packages", pkg);
    if (!row || Number(row.ClassID) !== classId) continue;
    const d1 = Number(row.Domain1);
    const d2 = Number(row.Domain2);
    if (isDomainRow(index, d1) && isDomainRow(index, d2) && d1 !== d2) return [d1, d2];
  }
  warnings.push(`no usable domains found for class ${classId}; it will have none`);
  return undefined;
}

/**
 * The school for a class that picks one (classes.2da PickSchool = 1), or undefined for any other class. Requested
 * school wins; otherwise the package's School (what LevelUpHenchman uses), falling back to the class's own package.
 * 0 is General (no specialization).
 */
export function chooseSchool(
  index: ModuleIndex,
  classId: number,
  packageId: number | undefined,
  requested: number | undefined,
  warnings: string[],
): number | undefined {
  if (twoDARow(index, "classes", classId)?.PickSchool !== "1") return undefined;
  const valid = (id: number) => Number.isInteger(id) && hasCell(twoDARow(index, "spellschools", id) ?? {}, "Letter");
  if (requested !== undefined) {
    if (valid(requested)) return requested;
    warnings.push(`school ${requested} is not a spellschools.2da row; using the package school instead`);
  }
  for (const pkg of [packageId, Number(twoDARow(index, "classes", classId)?.Package)]) {
    if (pkg === undefined || !Number.isInteger(pkg)) continue;
    const row = twoDARow(index, "packages", pkg);
    if (!row || Number(row.ClassID) !== classId) continue;
    const school = Number(row.School);
    if (valid(school)) return school;
  }
  return 0;
}

/** spells.2da School letter of a specialist's opposition school (undefined for General). */
export function oppositionLetter(index: ModuleIndex, school: number): string | undefined {
  if (school <= 0) return undefined;
  const opposition = Number(twoDARow(index, "spellschools", school)?.Opposition);
  if (!Number.isInteger(opposition)) return undefined;
  const letter = twoDARow(index, "spellschools", opposition)?.Letter;
  return letter && letter !== "****" ? letter : undefined;
}

/** Domain spells by spell level for the given domains: { "1": [13], "3": [42, 171] }. */
export function domainSpells(index: ModuleIndex, domains: number[]): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const d of domains) {
    const row = twoDARow(index, "domains", d);
    if (!row) continue;
    for (let level = 1; level <= 9; level++) {
      const cell = row[`Level_${level}`];
      if (!cell || cell === "****") continue;
      const spell = Number(cell);
      if (!Number.isInteger(spell) || isSelfConcealmentSpell(index, spell)) continue;
      const list = (out[String(level)] ??= []);
      if (!list.includes(spell)) list.push(spell);
    }
  }
  return out;
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

  // Domains (Cleric): written on the class entry, their power feats added to the level-1 feats, and their
  // spells added to that class's spell pool (inc_cre_level fills one slot per spell level with one).
  const domainsByClass: Record<string, [number, number]> = {};
  const packageId = getFieldNum(obj, "StartingPackage");
  for (const classId of classIds) {
    const chosen = chooseDomains(
      index,
      classId,
      classId === firstClass ? packageId : undefined,
      params.domains,
      warnings,
    );
    if (!chosen) continue;
    domainsByClass[String(classId)] = chosen;
    const entry = listOf(obj, "ClassList").find((c) => getFieldNum(c, "Class") === classId);
    if (entry) {
      setField(entry, "Domain1", "byte", chosen[0]);
      setField(entry, "Domain2", "byte", chosen[1]);
      const feats = listOf(obj, "FeatList");
      for (const d of chosen) {
        const feat = Number(twoDARow(index, "domains", d)?.GrantedFeat);
        if (Number.isInteger(feat) && !feats.some((f) => getFieldNum(f, "Feat") === feat)) {
          feats.push({ __struct_id: 1, Feat: { type: "word", value: feat } } as unknown as GffObj);
        }
      }
    } else {
      warnings.push(
        `class ${classId} is gained after level 1; LevelUpHenchman gives it the package's domains, not ${chosen.join("/")}`,
      );
    }
  }

  // School (Wizard): written on the class entry; a specialist's opposition-school spells leave its pool, and
  // inc_cre_level adds the engine's specialist slot at spell levels 1-9 (live-verified: none at cantrips).
  const schoolByClass: Record<string, number> = {};
  for (const classId of classIds) {
    const school = chooseSchool(
      index,
      classId,
      classId === firstClass ? packageId : undefined,
      params.school,
      warnings,
    );
    if (school === undefined) continue;
    schoolByClass[String(classId)] = school;
    const entry = listOf(obj, "ClassList").find((c) => getFieldNum(c, "Class") === classId);
    if (entry) setField(entry, "School", "byte", school);
    else
      warnings.push(
        `class ${classId} is gained after level 1; LevelUpHenchman gives it the package's school, not ${school}`,
      );
  }

  // 2. Levelling plan and target.
  const targetLevel = params.level > 0 ? params.level : 0;
  setField(
    obj,
    "ChallengeRating",
    "float",
    estimateCRFromLevel(targetLevel > 0 ? targetLevel : Math.max(1, params.levelMin ?? 1)),
  );
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
  const domainPools: Record<string, Record<string, number[]>> = {};
  for (const classId of classIds) {
    const p = classSpellPools(index, classId, seed);
    if (!p) continue;
    const opposed = oppositionLetter(index, schoolByClass[String(classId)] ?? 0);
    if (opposed) {
      for (const level of Object.keys(p))
        p[level] = p[level].filter((id) => twoDARow(index, "spells", id)?.School !== opposed);
    }
    const doms = domainsByClass[String(classId)];
    if (doms) {
      // A domain spell is cast at its domain level; drop it from any other level of the class pool so each
      // spell ability has one unambiguous spell level.
      const ds = domainSpells(index, doms);
      const all = new Set(Object.values(ds).flat());
      for (const level of Object.keys(p)) p[level] = p[level].filter((id) => !all.has(id));
      for (const [level, ids] of Object.entries(ds)) p[level] = [...(p[level] ?? []), ...ids];
      domainPools[String(classId)] = ds;
    }
    pools[String(classId)] = p;
  }
  vars.push(
    { name: "MCP_SA_POOL", type: "string", value: Object.keys(pools).length > 0 ? JSON.stringify(pools) : "" },
    {
      name: "MCP_SA_DOMAIN",
      type: "string",
      value: Object.keys(domainPools).length > 0 ? JSON.stringify(domainPools) : "",
    },
    {
      name: "MCP_DOMAINS",
      type: "string",
      value: Object.keys(domainsByClass).length > 0 ? JSON.stringify(domainsByClass) : "",
    },
    {
      name: "MCP_SCHOOL",
      type: "string",
      value: Object.keys(schoolByClass).length > 0 ? JSON.stringify(schoolByClass) : "",
    },
  );

  // Pinned spells must be on one of the creature's class lists, or they can never be picked.
  const pinned = (params.pinnedSpells ?? []).filter((spell) => {
    const onList = Object.values(pools).some((p) => Object.values(p).some((ids) => ids.includes(spell)));
    if (!onList) warnings.push(`pinned spell ${spell} is not on any of this creature's class spell lists — ignored`);
    return onList;
  });
  vars.push({ name: "MCP_SA_PINNED", type: "string", value: pinned.join(",") });
  if (Object.keys(pools).length > 0) obj.SpecAbilityList = { type: "list", value: [] };

  // 4. Gear settings. With an allowance, start from baseline clothing and creature-only slots.
  const wealth = params.gearWealth ?? DEFAULT_GEAR_WEALTH;
  const weapons =
    params.weapons ??
    (() => {
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
  // Forging again must not lose the handler the first forge remembered (a companion's x0_ch_hen_spawn): when the spawn script is
  // already the wrapper, keep MCP_ORIG_SPAWN as it is.
  const remembered = getVarTableEntries(obj).find((v) => v.name.toUpperCase() === "MCP_ORIG_SPAWN" && typeof v.value === "string")?.value as string | undefined;
  const originalSpawn =
    params.originalSpawn ?? (current === CREATURE_LEVEL_WRAPPER ? remembered || "nw_c2_default9" : current || "nw_c2_default9");
  mergeVarTable(obj, [{ name: "MCP_ORIG_SPAWN", type: "string", value: originalSpawn }]);
  setField(obj, "ScriptSpawn", "resref", CREATURE_LEVEL_WRAPPER);

  return {
    target: target.label,
    targetLevel:
      targetLevel > 0 ? targetLevel : `party average ${(params.levelRel ?? 0) >= 0 ? "+" : ""}${params.levelRel ?? 0}`,
    levelOneFeats: result.feats.map((f) => f.feat),
    spellPoolSizes: Object.fromEntries(
      Object.entries(pools).map(([c, p]) => [
        c,
        Object.fromEntries(Object.entries(p).map(([l, ids]) => [l, ids.length])),
      ]),
    ),
    gear,
    originalSpawn,
    ...(Object.keys(schoolByClass).length > 0
      ? {
          school: Object.fromEntries(
            Object.entries(schoolByClass).map(([c, id]) => {
              const opposition = oppositionLetter(index, id);
              return [
                c,
                {
                  id,
                  label: twoDARow(index, "spellschools", id)?.Label ?? String(id),
                  ...(opposition ? { opposition } : {}),
                },
              ];
            }),
          ),
        }
      : {}),
    ...(Object.keys(domainsByClass).length > 0
      ? {
          domains: Object.fromEntries(
            Object.entries(domainsByClass).map(([c, ds]) => [
              c,
              ds.map((d) => {
                const row = twoDARow(index, "domains", d);
                const feat = Number(row?.GrantedFeat);
                return { id: d, label: row?.Label ?? String(d), ...(Number.isInteger(feat) ? { feat } : {}) };
              }),
            ]),
          ),
        }
      : {}),
    warnings,
  };
}

/** Writes inc_cre_level and cf_spawn, compiling the wrapper (which proves the include). */
export async function writeCreatureLevelSystem(
  index: ModuleIndex,
  stores?: string[],
  droppable?: boolean,
  scalePercent?: number,
): Promise<{ include: string; wrapper: string; compiled: boolean; compilerOutput?: string; stores: string[] }> {
  await writeAndCompileScript(
    index,
    CREATURE_LEVEL_INCLUDE,
    generateCreatureLevelInclude({ stores, droppable, scalePercent }),
    false,
  );
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
      stores: z
        .string()
        .optional()
        .describe('JSON array of store tags or resrefs, e.g. ["nw_storeweap001","my_smith"]'),
      droppable: z.boolean().optional().describe("Whether bought gear can drop as loot (default true)"),
      scalePercent: z.string().optional().describe("Slight size variation at spawn: each creature is shown between (100 - n) % and (100 + n) % of its normal size (default 5; 0 turns it off; at most 25)"),
    },
    { destructiveHint: true },
    async ({ stores, droppable, scalePercent }) => {
      const index = requireIndex();
      let storeList: string[] | undefined;
      if (stores) {
        try {
          storeList = JSON.parse(stores);
        } catch {
          return { content: [{ type: "text", text: "stores must be a JSON array of strings" }], isError: true };
        }
      }
      const result = await writeCreatureLevelSystem(index, storeList, droppable, scalePercent !== undefined ? Number(scalePercent) : undefined);
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
      "engine refuses to equip items a creature isn't proficient with; ranged creatures also get a melee backup weapon in " +
      "their inventory; every purchase is logged as a [CL_LOOT] line that run_live_verification returns), and casters get " +
      "spell abilities with the correct spells, caster level and slots per day (`pinnedSpells` are always picked first). A Cleric gets two `domains` (default: its package's): their power feats now and one domain spell per spell level at spawn. A Wizard gets a `school` (default: its package's, General): a specialist gains a slot per spell level 1-9 and loses its opposition school. Target a blueprint (`resref`) or a placed instance (`area`+`tag`); call it " +
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
      powerLevel: z
        .enum(["elite", "low", "standard", "tougher", "epic"])
        .optional()
        .describe("Ability-score band (default elite)"),
      complexity: z.enum(["full", "simple"]).optional().describe("'simple' = required feats only (minions, commoners)"),
      gearRole: z
        .enum(["pc", "elite", "standard", "mook"])
        .optional()
        .describe("Wealth share: pc/elite 100%, standard 50%, mook 25% (default standard)"),
      gearWealth: z
        .string()
        .optional()
        .describe("Allowance multiplier on the role share (default 0.5; 0 keeps current gear)"),
      weapons: z.string().optional().describe("JSON array of preferred baseitems.2da rows"),
      originalSpawn: z
        .string()
        .optional()
        .describe("Spawn script to run before levelling (default: the creature's current ScriptSpawn)"),
      pinnedSpells: z
        .string()
        .optional()
        .describe(
          "JSON array of spells.2da rows a caster always gets first at their spell level (e.g. a boss's signature spell)",
        ),
      school: z
        .string()
        .optional()
        .describe(
          "Wizard only: spellschools.2da row chosen for the character (0 General, 1 Abjuration, 2 Conjuration, 3 Divination, 4 Enchantment, 5 Evocation, 6 Illusion, 7 Necromancy, 8 Transmutation). A specialist gets one extra slot per spell level 1-9 and never its opposition school's spells. Default: the package's (General).",
        ),
      domains: z
        .string()
        .optional()
        .describe(
          "Cleric only: JSON array of two domains.2da rows chosen for the character (0 Air, 1 Animal, 3 Death, 4 Destruction, 5 Earth, 6 Evil, 7 Fire, 8 Good, 9 Healing, 10 Knowledge, 13 Magic, 14 Plant, 15 Protection, 16 Strength, 17 Sun, 18 Travel, 19 Trickery, 20 War, 21 Water). Default: the package's (Healing and Sun for the Cleric package).",
        ),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);
      const target = await resolveCreatureTarget(
        index,
        args.resref,
        args.area,
        args.tag,
        "forge_creature",
        `Forge ${args.tag ?? args.resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      let plan: number[] | undefined;
      let weapons: number[] | undefined;
      let pinnedSpells: number[] | undefined;
      let domains: number[] | undefined;
      try {
        domains = args.domains ? (JSON.parse(args.domains) as number[]) : undefined;
        plan = args.plan ? (JSON.parse(args.plan) as number[]) : undefined;
        weapons = args.weapons ? (JSON.parse(args.weapons) as number[]) : undefined;
        pinnedSpells = args.pinnedSpells ? (JSON.parse(args.pinnedSpells) as number[]) : undefined;
      } catch {
        return {
          content: [{ type: "text", text: "plan, weapons, pinnedSpells and domains must be JSON arrays of numbers" }],
          isError: true,
        };
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
        pinnedSpells,
        domains,
        school: args.school !== undefined ? toI(args.school) : undefined,
      });
      await target.save();
      const hasSystem = index.resources.has(`${CREATURE_LEVEL_WRAPPER}.ncs`);
      if (!hasSystem) result.warnings.push("cf_spawn.ncs is not in the module yet — run create_creature_level_system");
      return { content: [{ type: "text", text: JSON.stringify({ success: true, ...result }, null, 2) }] };
    },
  );
}
