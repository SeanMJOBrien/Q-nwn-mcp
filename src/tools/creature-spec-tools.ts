/**
 * build_creature: one character from a spec written in names (util/creature-spec.ts), in one call.
 *
 * Resolves every name to its game ID first and refuses the whole spec on any unknown or ambiguous name (nothing is
 * written). Then: shared scripts if missing, the blueprint (henchman AI for a companion), the build (spawn levelling
 * with the chosen package, or a fixed build at the level), alignment, look, gear made and equipped, placement, the
 * recruit dialog, and a verify_creature pass. The result echoes what each name became and where each requested feat
 * ended up. The spec is kept in the module project as creatures/<resref>.json for a rebuild.
 */

import fs from "node:fs/promises";
import path from "node:path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import type { ResmanOptions } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldNum, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { buildTlkLookup } from "../util/area-data.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import { CREATURE_LEVEL_WRAPPER } from "../util/creature-level-script.js";
import { placeCreatureCore } from "../util/creature-placer.js";
import {
  ARMOR_TEMPLATES,
  type ColorNames,
  type CreatureSpec,
  type ResolvedCreature,
  type ResolvedGearItem,
  resolveCreatureSpec,
} from "../util/creature-spec.js";
import { packageFeatOrder } from "../util/feat-legality.js";
import { getVarTableEntries, mergeVarTable, resolveBlueprint } from "../util/git-helpers.js";
import { applyDefaultItemModels } from "../util/item-models.js";
import { buildNpcStatBlock } from "../util/npc-stat-block.js";
import { flatSyncReport, projectDirFor } from "../util/project-sync.js";
import { isProjectDir } from "../util/project.js";
import { validateSpec } from "../util/spec-validate.js";
import { armorBaseAC, verifyCreature } from "../util/verify/blueprints.js";
import { listOf, Report } from "../util/verify/common.js";
import { companionSoundset, createCompanionDialog, writeCompanionSystem } from "./companion-tools.js";
import { forgeCreature, writeCreatureLevelSystem } from "./creature-forge-tools.js";
import { applyNpcStatBlock, resolveCreatureTarget } from "./npc-tools.js";

const COLOR_NAMES_FILE = path.join(import.meta.dirname, "..", "data", "color-names.json");

async function loadColorNames(): Promise<ColorNames | null> {
  try {
    return JSON.parse(await fs.readFile(COLOR_NAMES_FILE, "utf8")) as ColorNames;
  } catch {
    return null;
  }
}

const armorCache = new Map<string, Array<{ resref: string; name: string; ac: number }>>();

/** Name and torso AC of the base game's armour blueprints (read once per module). */
async function armorTemplates(index: ModuleIndex, resmanOpts: ResmanOptions): Promise<Array<{ resref: string; name: string; ac: number }>> {
  const hit = armorCache.get(index.modPath);
  if (hit) return hit;
  const tlk = buildTlkLookup(index);
  const out: Array<{ resref: string; name: string; ac: number }> = [];
  for (const resref of ARMOR_TEMPLATES) {
    const doc = (await resolveBlueprint(index, resref, "uti", resmanOpts).catch(() => null)) as GffObj | null;
    if (!doc) continue;
    const ac = armorBaseAC(index, doc);
    const loc = (doc.LocalizedName as { value?: Record<string, unknown> } | undefined)?.value ?? {};
    const name = (typeof loc.id === "number" && tlk ? tlk(loc.id) : undefined) ?? (loc["0"] as string | undefined) ?? resref;
    if (ac !== undefined) out.push({ resref, name, ac });
  }
  if (out.length) armorCache.set(index.modPath, out);
  return out;
}

async function specFile(index: ModuleIndex, resref: string): Promise<string | null> {
  if (flatSyncReport()) return null;
  try {
    const dir = await projectDirFor(index);
    return (await isProjectDir(dir)) ? path.join(dir, "creatures", `${resref}.json`) : null;
  } catch {
    return null;
  }
}

const SLOT_SHORT: Record<string, string> = {
  armor: "arm",
  helmet: "hlm",
  weapon: "wpn",
  offhand: "off",
  cloak: "clk",
  boots: "bts",
  gloves: "glv",
  belt: "blt",
  amulet: "amu",
  leftRing: "rgl",
  rightRing: "rgr",
};

/** Make one item blueprint in the module and return its object (for equipping). */
async function makeItem(
  index: ModuleIndex,
  resmanOpts: ResmanOptions,
  creature: string,
  item: ResolvedGearItem,
): Promise<{ resref: string; obj: GffObj } | { error: string }> {
  const resref = `${creature.slice(0, 12)}_${SLOT_SHORT[item.slot]}`.slice(0, 16);
  let doc: GffDocument;
  if (item.template) {
    const src = await resolveBlueprint(index, item.template, "uti", resmanOpts);
    if (!src) return { error: `${item.template}.uti could not be read` };
    doc = src;
  } else {
    doc = {
      __data_type: "UTI ",
      AddCost: { type: "dword", value: 0 },
      BaseItem: { type: "int", value: item.baseItem },
      Charges: { type: "byte", value: 0 },
      Cost: { type: "dword", value: 0 },
      Cursed: { type: "byte", value: 0 },
      Description: { type: "cexolocstring", value: {} },
      DescIdentified: { type: "cexolocstring", value: {} },
      Identified: { type: "byte", value: 1 },
      ModelPart1: { type: "byte", value: 1 },
      Plot: { type: "byte", value: 0 },
      PropertiesList: { type: "list", value: [] },
      StackSize: { type: "word", value: 1 },
      Stolen: { type: "byte", value: 0 },
    } as unknown as GffDocument;
  }
  const obj = doc as GffObj;
  setField(obj, "Tag", "cexostring", resref);
  setField(obj, "TemplateResRef", "resref", resref);
  setField(obj, "Identified", "byte", 1);
  obj.LocalizedName = { type: "cexolocstring", value: { "0": item.name } };
  applyDefaultItemModels(obj, index);
  for (const [field, value] of Object.entries(item.colors)) setField(obj, field, "byte", value);
  const existing = listOf(obj, "PropertiesList");
  obj.PropertiesList = {
    type: "list",
    value: [
      ...existing,
      ...item.properties.map((p) => ({
        __struct_id: 0,
        PropertyName: { type: "word", value: p.propertyName },
        Subtype: { type: "word", value: p.subType },
        CostTable: { type: "byte", value: p.costTable },
        CostValue: { type: "word", value: p.costValue },
        Param1: { type: "byte", value: p.param1 },
        Param1Value: { type: "byte", value: p.param1Value },
        ChanceAppear: { type: "byte", value: 100 },
      })),
    ],
  };
  const filePath = path.join(index.tempDir, `${resref}.uti`);
  await jsonToGff(doc, filePath);
  const stat = await fs.stat(filePath);
  index.resources.set(`${resref}.uti`, { resref, extension: "uti", filePath, sizeBytes: stat.size });
  index.parsedGff.set(`${resref}.uti`, doc);
  return { resref, obj: structuredClone(obj) };
}

/** Map the spec's power level to the stat block's. */
function statPower(p: CreatureSpec["powerLevel"]): "standard" | "elite" | "tougher" | "epic" {
  return p === "low" ? "standard" : p === "standard" || !p ? "elite" : p;
}

/**
 * Feats a spawn-levelled creature is predicted to hold at its level: its level-1 feats, then each later slot filled
 * with the first legal feat in the package's order (how LevelUpHenchman picks). Engine-checked 2026-11-17: Seamus
 * (Gladiator package) held Power Attack, Cleave and Exotic Proficiency at 6 but not Weapon Focus (Bastard Sword).
 */
function predictSpawnFeats(index: ModuleIndex, r: ResolvedCreature, levelOne: number[], power: CreatureSpec["powerLevel"]): Set<number> {
  const block = buildNpcStatBlock(index, {
    race: r.race,
    classId: r.classId,
    level: r.level,
    powerLevel: statPower(power),
    preferredFeats: levelOne,
    packageId: r.packageId,
    packageOrderOnly: true,
  });
  return new Set(block.feats.map((f) => f.feat));
}

/** Where each requested feat ended up. */
function featPlan(index: ModuleIndex, r: ResolvedCreature, featsHeld: Set<number>, predicted?: Set<number>): Array<Record<string, unknown>> {
  const tlk = buildTlkLookup(index);
  const name = (f: number) => {
    const row = index.twodaTables.get("feat")?.rows.get(f);
    return (tlk && row ? tlk(Number(row.FEAT)) : undefined) ?? row?.LABEL ?? String(f);
  };
  const inPackage = new Set(packageFeatOrder(index, r.packageId));
  const best = r.packageScores[0];
  return r.feats.map((f) => {
    if (featsHeld.has(f)) return { feat: name(f), status: r.build === "spawn" ? "taken at level 1" : `taken (level ${r.level})` };
    if (r.build === "fixed") return { feat: name(f), status: `not taken: no free slot or a requirement is not met at level ${r.level}` };
    if (predicted?.has(f)) return { feat: name(f), status: `predicted by level ${r.level}: the package order reaches it (confirm with run_live_verification)` };
    return {
      feat: name(f),
      status:
        (inPackage.has(f)
          ? `not predicted: it is in the package's list, but earlier entries fill the slots up to level ${r.level}`
          : "NOT in the package's feat list: the spawn level-ups will not pick it") +
        (best && best.id !== r.packageId && best.matches > 0 ? `; package "${best.name}" holds ${best.matches} of the requested feats` : "") +
        '; use build "fixed" for exactly these feats',
    };
  });
}

function fail(error: string, extra: Record<string, unknown> = {}) {
  return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ success: false, error, ...extra }, null, 2) }] };
}

export async function buildCreatureFromJson(specText: string, dryRun?: boolean) {
  let spec: CreatureSpec;
  try {
    spec = JSON.parse(specText) as CreatureSpec;
  } catch (e) {
    return fail(`spec is not valid JSON: ${(e as Error).message}`);
  }
  const shape = validateSpec("creature", spec);
  if (!shape.ok) return fail("the spec does not match the creature schema", { errors: shape.errors });

  const index = requireIndex();
  const resmanOpts = await buildResmanOptions(index);
  const resref = spec.resref.toLowerCase();
  const templates = spec.gear?.armor ? await armorTemplates(index, resmanOpts) : [];
  const res = resolveCreatureSpec(index, spec, { armorTemplates: templates, colorNames: await loadColorNames() });
  if (!res.ok) return fail("some names did not resolve; nothing was written", { errors: res.errors, warnings: res.warnings });
  const r = res.creature;
  const warnings = [...res.warnings];

  if (dryRun) {
    // Show where the requested feats would land, from the same stat block the build uses.
    const preview = buildNpcStatBlock(index, {
      race: r.race,
      classId: r.classId,
      level: r.build === "fixed" ? r.level : 1,
      powerLevel: statPower(spec.powerLevel),
      seed: resref,
      preferredFeats: r.feats,
      packageId: r.packageId,
      weaponBaseItem: r.gear.find((g) => g.slot === "weapon")?.baseItem,
    });
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            {
              dryRun: true,
              resolved: r.resolved,
              addedFeats: r.addedFeats,
              packages: r.packageScores,
              featPlan: featPlan(
                index,
                r,
                new Set(preview.feats.map((f) => f.feat)),
                r.build === "spawn" ? predictSpawnFeats(index, r, preview.feats.map((f) => f.feat), spec.powerLevel) : undefined,
              ),
              ...(warnings.length ? { warnings } : {}),
            },
            null,
            2,
          ),
        },
      ],
    };
  }

  if (index.resources.has(`${resref}.utc`)) return fail(`${resref}.utc already exists`);
  const steps: string[] = [];
  const isCompanion = spec.role === "companion";
  if (isCompanion && !index.resources.has("a_hen_join.ncs")) {
    const sys = await writeCompanionSystem(index);
    if (!sys.compiled) return fail("the companion system failed to compile", { scripts: sys.scripts });
    steps.push("companion system written");
  }
  if (!index.resources.has("cf_spawn.ncs")) {
    const sys = await writeCreatureLevelSystem(index);
    if (!sys.compiled) return fail(`the creature level system failed to compile: ${sys.compilerOutput}`);
    steps.push("creature level system written");
  }

  const soundset = isCompanion ? companionSoundset(index, r.classId, r.gender) : undefined;
  const built = await buildCreatureBlueprint(index, {
    resref,
    tag: resref,
    name: spec.name,
    faction: r.faction,
    henchman: isCompanion,
    race: r.race,
    appearance: r.race,
    gender: r.gender,
    ...(soundset !== undefined ? { soundset } : {}),
    ...(!isCompanion && spec.conversation ? { conversation: spec.conversation } : {}),
    ...(!isCompanion ? { lootable: true } : {}),
  });
  if (!built.success) return fail(`blueprint: ${built.error}`);
  steps.push("blueprint built");

  const target = await resolveCreatureTarget(index, resref, undefined, undefined, "build_creature", "creature");
  if ("error" in target) return fail(target.error, { steps });
  const obj = target.obj;
  if (r.alignment) {
    setField(obj, "LawfulChaotic", "byte", r.alignment.lawfulChaotic);
    setField(obj, "GoodEvil", "byte", r.alignment.goodEvil);
  }

  const powerLevel = spec.powerLevel;
  const weaponBase = r.gear.find((g) => g.slot === "weapon")?.baseItem;
  let buildInfo: Record<string, unknown>;
  if (r.build === "spawn") {
    const forged = await forgeCreature(index, resmanOpts, target, {
      race: r.race,
      classId: r.classId,
      level: r.level,
      gearRole: isCompanion ? "pc" : spec.role === "enemy" ? "elite" : "standard",
      powerLevel: powerLevel === "low" ? undefined : powerLevel,
      gearWealth: r.gear.length > 0 ? 0 : undefined,
      originalSpawn: isCompanion ? "x0_ch_hen_spawn" : undefined,
      preferredFeats: r.feats,
      packageId: r.packageId,
      ...(weaponBase !== undefined ? { weapons: [weaponBase] } : {}),
      ...(r.domains ? { domains: r.domains } : {}),
      ...(r.school !== undefined ? { school: r.school } : {}),
      ...(r.pinnedSpells.length ? { pinnedSpells: r.pinnedSpells } : {}),
    });
    warnings.push(...forged.warnings);
    buildInfo = { mode: "spawn", levelOne: "built", targetLevel: forged.targetLevel, gear: r.gear.length ? "as specified" : forged.gear };
    steps.push("forged (levels at spawn)");
  } else {
    const applied = applyNpcStatBlock(index, target, {
      race: r.race,
      classId: r.classId,
      level: r.level,
      powerLevel: statPower(powerLevel),
      seed: resref,
      preferredFeats: r.feats,
      packageId: r.packageId,
      weaponBaseItem: weaponBase,
    });
    warnings.push(...applied.result.warnings);
    // The recruit script levels a companion up to HENCH_LEVEL; a fixed build is already there.
    if (isCompanion) mergeVarTable(obj, [{ name: "HENCH_LEVEL", type: "int", value: r.level }]);
    buildInfo = { mode: "fixed", level: r.level, hp: applied.result.hp };
    steps.push(`built at level ${r.level}`);
  }

  // Look. Scale needs the cf_spawn wrapper (it applies MCP_SCALE); a forged creature already has it.
  if (r.phenotype !== undefined) setField(obj, "Phenotype", "int", r.phenotype);
  if (r.head !== undefined) setField(obj, "Appearance_Head", "byte", r.head);
  for (const [field, value] of Object.entries(r.colors)) setField(obj, field, "byte", value);
  if (r.scalePercent !== undefined) {
    mergeVarTable(obj, [{ name: "MCP_SCALE", type: "float", value: r.scalePercent / 100 }]);
    if (getFieldStr(obj, "ScriptSpawn") !== CREATURE_LEVEL_WRAPPER) {
      const original = getFieldStr(obj, "ScriptSpawn");
      if (!getVarTableEntries(obj).some((v) => v.name.toUpperCase() === "MCP_ORIG_SPAWN")) {
        mergeVarTable(obj, [{ name: "MCP_ORIG_SPAWN", type: "string", value: original }]);
      }
      setField(obj, "ScriptSpawn", "resref", CREATURE_LEVEL_WRAPPER);
    }
  }

  // Gear: make each item, then equip it (replacing whatever that slot held).
  const items: Array<{ slot: string; resref: string; name: string }> = [];
  if (r.gear.length > 0) {
    const masks = new Set(r.gear.map((g) => g.slotMask));
    const kept = listOf(obj, "Equip_ItemList").filter((e) => !masks.has(e.__struct_id as number));
    for (const g of r.gear) {
      const made = await makeItem(index, resmanOpts, resref, g);
      if ("error" in made) return fail(`gear.${g.slot}: ${made.error}`, { steps });
      const equipped = made.obj;
      delete (equipped as Record<string, unknown>).__data_type;
      equipped.__struct_id = g.slotMask;
      setField(equipped, "Dropable", "byte", spec.role === "enemy" ? 1 : 0);
      kept.push(equipped);
      items.push({ slot: g.slot, resref: made.resref, name: g.name });
    }
    obj.Equip_ItemList = { type: "list", value: kept };
    steps.push(`gear made and equipped (${items.length})`);
  }
  await target.save();

  let position: unknown;
  if (spec.place) {
    const placed = await placeCreatureCore(index, resmanOpts, {
      area: spec.place.area,
      blueprint: resref,
      x: spec.place.x,
      y: spec.place.y,
      bearing: spec.place.bearing ?? 0,
    });
    if (!placed.success) return fail(`built ${resref}, but placing it failed: ${placed.error} ${placed.detail ?? ""}`.trim(), { steps });
    position = placed.placedPosition;
    steps.push("placed");
  }
  if (isCompanion && spec.companion) {
    const dialog = await createCompanionDialog(index, { creature: resref, ...spec.companion, replace: true });
    if (!dialog.ok) return fail(`dialog: ${dialog.error}`, { steps });
    steps.push("recruit dialog wired");
  }

  const file = await specFile(index, resref);
  if (file) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, `${JSON.stringify(spec, null, 2)}\n`);
    steps.push(`spec kept in ${file}`);
  }

  const doc = index.parsedGff.get(`${resref}.utc`) as GffObj;
  const report = new Report(resref, "utc");
  await verifyCreature(report, index, doc, { henchman: isCompanion });
  const held = new Set(listOf(doc, "FeatList").map((f) => getFieldNum(f, "Feat")));
  const verify = report.result();
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(
          {
            success: true,
            resref,
            ...(position ? { position } : {}),
            resolved: r.resolved,
            build: buildInfo,
            startingPackage: r.packageId,
            featPlan: featPlan(index, r, held, r.build === "spawn" ? predictSpawnFeats(index, r, [...held], spec.powerLevel) : undefined),
            ...(r.addedFeats.length ? { addedFeats: r.addedFeats } : {}),
            ...(items.length ? { items } : {}),
            steps,
            verify: { status: verify.status, errors: verify.errors, warnings: verify.warnings },
            ...(warnings.length ? { warnings } : {}),
            next: r.build === "spawn" ? "run_live_verification to see the spawn level-up ([SPEC_OK] lines)" : undefined,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export function registerCreatureSpecTools(server: McpServer): void {
  server.tool(
    "build_creature",
    "Build one creature from a spec written in names, in one call: race, class, level, package, feats, alignment, " +
      "look (phenotype, scale, hair/skin colour, head), gear with item properties in words, placement, and for a " +
      "companion the recruit dialog. Every name is resolved to its game ID first (feat.2da, packages.2da, baseitems.2da, " +
      "itempropdef.2da, ...); an unknown or ambiguous name refuses the whole spec with the field and the nearest matches. " +
      'build "spawn" (default) makes a level-1 build that levels itself at spawn with the package (requested feats go ' +
      'into the level-1 slots; the package picks the rest, as it does for every later level-up); build "fixed" builds ' +
      "the creature at its level with exactly the requested feats (non-casters). package \"auto\" picks the class " +
      "package whose feat list holds the most requested feats. Prerequisites and weapon/armour proficiencies are added " +
      "and reported. Use dryRun to see what each name becomes and where each feat lands before writing. Schema: " +
      "docs/specs/creature.schema.json (node dist/cli/spec.js schema creature). Example spec: " +
      '{"resref":"seamus","name":"Seamus Worlan","role":"companion","race":"human","gender":"male","class":"fighter",' +
      '"level":6,"feats":["Power Attack","Cleave","Weapon Focus (Bastard Sword)"],"look":{"phenotype":"large",' +
      '"scale":107},"gear":{"armor":{"base":"chainmail"},"weapon":{"base":"bastard sword","properties":["attack bonus +1"]},' +
      '"offhand":{"base":"large shield","properties":["ac bonus +1"]}},"place":{"area":"tavern","x":12,"y":8},' +
      '"companion":{"introduction":"...","backstory":"..."}}',
    {
      spec: z.string().describe("The creature spec as JSON (see the description and docs/specs/creature.schema.json)"),
      dryRun: z.boolean().optional().describe("Resolve and report only; write nothing"),
    },
    { destructiveHint: true },
    async ({ spec, dryRun }) => buildCreatureFromJson(spec, dryRun),
  );
}
