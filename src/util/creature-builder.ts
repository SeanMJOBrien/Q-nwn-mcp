/**
 * Core creature-blueprint-building logic for `create_creature_blueprint`,
 * extracted so it can be called directly — not just via the MCP tool's
 * string-param wrapper — by `compose_encounter`'s placement mode (F6,
 * docs/encounter-composer-spec.md). Behavior-preserving extraction: the
 * `create_creature_blueprint` MCP tool (src/tools/blueprint-tools.ts) is now
 * a thin shim that JSON.parses its string params and calls this function —
 * same field writes, same equipment/inventory resolution, same response
 * shape.
 */

import path from "path";
import fs from "fs/promises";

import { buildResmanOptions } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import { resolveBlueprint, buildMinimalUtc, mergeVarTable } from "./git-helpers.js";
import type { VarTableEntry } from "./git-helpers.js";
import { setField } from "../types/gff.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { EQUIP_SLOT_MAP } from "./equip-slots.js";
import type { ModuleIndex } from "../types/module.js";

/**
 * Standard non-associate creature AI. Applied to every creature unless the
 * `henchman` preset or an explicit `scripts` override says otherwise.
 */
export const DEFAULT_CREATURE_SCRIPTS: Record<string, string> = {
  ScriptAttacked: "nw_c2_default5",
  ScriptDamaged: "nw_c2_default6",
  ScriptDeath: "nw_c2_default7",
  ScriptDialogue: "nw_c2_default4",
  ScriptDisturbed: "nw_c2_default8",
  ScriptEndRound: "nw_c2_default3",
  ScriptHeartbeat: "nw_c2_default1",
  ScriptOnBlocked: "nw_c2_defaulte",
  ScriptOnNotice: "nw_c2_default2",
  ScriptRested: "nw_c2_defaulta",
  ScriptSpawn: "nw_c2_default9",
  ScriptSpellAt: "nw_c2_defaultb",
  ScriptUserDefine: "nw_c2_defaultd",
};

/**
 * Stock BioWare henchman/associate AI. These are base-game resources resolved at
 * runtime — never write them into the module.
 *
 * Two of these carry the whole feature:
 *  - ScriptDialogue (x0_ch_hen_conv) matches the engine's silent command shout via
 *    GetListenPatternNumber(); without it the companion ignores every radial order.
 *  - ScriptHeartbeat (x0_ch_hen_heart) tail-calls nw_ch_ac1, the actual follow AI.
 */
export const HENCHMAN_CREATURE_SCRIPTS: Record<string, string> = {
  ScriptAttacked: "x0_ch_hen_attack",
  ScriptDamaged: "x0_ch_hen_damage",
  ScriptDeath: "x0_ch_hen_death",
  ScriptDialogue: "x0_ch_hen_conv",
  ScriptDisturbed: "x0_ch_hen_distrb",
  ScriptEndRound: "x0_ch_hen_combat",
  ScriptHeartbeat: "x0_ch_hen_heart",
  ScriptOnBlocked: "x0_ch_hen_block",
  ScriptOnNotice: "x0_ch_hen_percep",
  ScriptRested: "x0_ch_hen_rest",
  ScriptSpawn: "x0_ch_hen_spawn",
  ScriptSpellAt: "x0_ch_hen_spell",
  ScriptUserDefine: "x0_ch_hen_usrdef",
};

/** The 13 UTC creature script fields, for validating `scripts` overrides. */
export const CREATURE_SCRIPT_FIELDS: ReadonlySet<string> = new Set(Object.keys(DEFAULT_CREATURE_SCRIPTS));

export interface CreatureBuildParams {
  resref: string;
  tag: string;
  name: string;
  sourceResref?: string;
  appearance?: number;
  faction?: number;
  cr?: number;
  hp?: number;
  race?: number;
  gender?: number;
  conversation?: string;
  str?: number;
  dex?: number;
  con?: number;
  int?: number;
  wis?: number;
  cha?: number;
  naturalAC?: number;
  classes?: Array<{ class: number; level: number }>;
  feats?: number[];
  spells?: Array<{ spell: number; level: number }>;
  equipment?: Record<string, string>;
  inventory?: Array<{ resref: string; quantity?: number }>;
  lootable?: boolean;
  henchman?: boolean;
  scripts?: Record<string, string>;
  soundset?: number;
  startingPackage?: number;
  varTable?: VarTableEntry[];
}

export interface CreatureBuildResult {
  success: boolean;
  error?: string;
  created?: string;
  tag?: string;
  name?: string;
  source?: string;
  sizeBytes?: number;
  henchman?: boolean;
  scripts?: Record<string, string>;
  soundset?: number;
  startingPackage?: number;
  scriptWarnings?: string[];
  equipped?: string[];
  equipmentWarnings?: string[];
}

/** Build a new creature blueprint (.utc), with the exact same logic as the create_creature_blueprint MCP tool. */
export async function buildCreatureBlueprint(
  index: ModuleIndex,
  params: CreatureBuildParams,
): Promise<CreatureBuildResult> {
  const {
    resref, tag, name, sourceResref, appearance, faction, cr, hp, race, gender, conversation,
    str, dex, con, int: intStat, wis, cha, naturalAC, classes, feats, spells, equipment,
    inventory, lootable, henchman, scripts, soundset, startingPackage, varTable,
  } = params;

  const resrefLower = resref.toLowerCase();
  const key = `${resrefLower}.utc`;

  if (index.resources.has(key)) {
    return { success: false, error: `Resource already exists: ${key}` };
  }

  const needsResman = !!sourceResref || !!equipment || !!inventory;
  const resmanOpts = needsResman ? await buildResmanOptions(index) : undefined;

  let doc: GffDocument;

  if (sourceResref) {
    const source = await resolveBlueprint(index, sourceResref, "utc", resmanOpts!);
    if (!source) {
      return { success: false, error: `Source blueprint not found: ${sourceResref}.utc` };
    }
    doc = source;
  } else {
    doc = buildMinimalUtc();
  }

  const obj = doc as GffObj;

  obj.__data_type = "UTC ";
  setField(obj, "Tag", "cexostring", tag);
  setField(obj, "TemplateResRef", "resref", resrefLower);
  obj.FirstName = { type: "cexolocstring", value: { "0": name } };

  if (appearance !== undefined) setField(obj, "Appearance_Type", "word", appearance);
  if (faction !== undefined) setField(obj, "FactionID", "word", faction);
  if (cr !== undefined) setField(obj, "ChallengeRating", "float", cr);
  if (hp !== undefined) {
    setField(obj, "MaxHitPoints", "short", hp);
    setField(obj, "CurrentHitPoints", "short", hp);
    setField(obj, "HitPoints", "short", hp);
  }
  if (race !== undefined) setField(obj, "Race", "byte", race);
  if (gender !== undefined) setField(obj, "Gender", "byte", gender);
  if (conversation !== undefined) setField(obj, "Conversation", "resref", conversation);
  if (str !== undefined) setField(obj, "Str", "byte", str);
  if (dex !== undefined) setField(obj, "Dex", "byte", dex);
  if (con !== undefined) setField(obj, "Con", "byte", con);
  if (intStat !== undefined) setField(obj, "Int", "byte", intStat);
  if (wis !== undefined) setField(obj, "Wis", "byte", wis);
  if (cha !== undefined) setField(obj, "Cha", "byte", cha);
  if (naturalAC !== undefined) setField(obj, "NaturalAC", "byte", naturalAC);
  if (lootable !== undefined) setField(obj, "Lootable", "byte", lootable ? 1 : 0);
  if (soundset !== undefined) setField(obj, "SoundSetFile", "word", soundset);
  if (startingPackage !== undefined) setField(obj, "StartingPackage", "byte", startingPackage);

  const scriptWarnings: string[] = [];
  const scriptSet: Record<string, string> = {
    ...(henchman ? HENCHMAN_CREATURE_SCRIPTS : DEFAULT_CREATURE_SCRIPTS),
  };
  if (scripts) {
    for (const [field, script] of Object.entries(scripts)) {
      if (!CREATURE_SCRIPT_FIELDS.has(field)) {
        scriptWarnings.push(`Unknown creature script field ignored: ${field}`);
        continue;
      }
      scriptSet[field] = script;
    }
  }
  for (const [field, script] of Object.entries(scriptSet)) {
    setField(obj, field, "resref", script);
  }
  delete (obj as GffObj).ScriptPercption;

  if (varTable) {
    mergeVarTable(obj, varTable);
  }

  if (classes) {
    obj.ClassList = {
      type: "list",
      value: classes.map((c) => ({
        __struct_id: 2,
        Class: { type: "int", value: c.class },
        ClassLevel: { type: "short", value: c.level },
      })),
    };
  }

  if (feats) {
    obj.FeatList = {
      type: "list",
      value: feats.map((f) => ({
        __struct_id: 1,
        Feat: { type: "word", value: f },
      })),
    };
  }

  if (spells) {
    obj.SpecAbilityList = {
      type: "list",
      value: spells.map((s) => ({
        __struct_id: 0,
        Spell: { type: "word", value: s.spell },
        SpellCasterLevel: { type: "byte", value: s.level },
        SpellFlags: { type: "byte", value: 1 },
      })),
    };
  }

  if (equipment) {
    const equipList: GffObj[] = [];
    const failedItems: string[] = [];

    for (const [slotName, itemResref] of Object.entries(equipment)) {
      const slotId = EQUIP_SLOT_MAP[slotName.toLowerCase()];
      if (slotId === undefined) {
        failedItems.push(`Unknown slot: ${slotName}`);
        continue;
      }
      const itemDoc = await resolveBlueprint(index, itemResref, "uti", resmanOpts!);
      if (!itemDoc) {
        failedItems.push(`Item not found: ${itemResref}.uti`);
        continue;
      }
      const itemObj = itemDoc as GffObj;
      itemObj.__struct_id = slotId;
      setField(itemObj, "Dropable", "byte", 1);
      equipList.push(itemObj);
    }

    obj.Equip_ItemList = { type: "list", value: equipList };

    if (failedItems.length > 0) {
      console.error(`Equipment warnings for ${resrefLower}: ${failedItems.join(", ")}`);
    }
  }

  if (inventory) {
    const itemList: GffObj[] = [];
    const failedInv: string[] = [];

    for (let i = 0; i < inventory.length; i++) {
      const { resref: itemResref, quantity } = inventory[i];
      const itemDoc = await resolveBlueprint(index, itemResref, "uti", resmanOpts!);
      if (!itemDoc) {
        failedInv.push(`Item not found: ${itemResref}.uti`);
        continue;
      }
      const itemObj = itemDoc as GffObj;
      itemObj.__struct_id = 0;
      setField(itemObj, "Dropable", "byte", 1);
      setField(itemObj, "Identified", "byte", 1);
      setField(itemObj, "Repos_PosX", "word", itemList.length % 6);
      setField(itemObj, "Repos_Posy", "word", Math.floor(itemList.length / 6));
      if (quantity && quantity > 1) {
        setField(itemObj, "StackSize", "word", quantity);
      }
      itemList.push(itemObj);
    }

    obj.ItemList = { type: "list", value: itemList };

    if (failedInv.length > 0) {
      console.error(`Inventory warnings for ${resrefLower}: ${failedInv.join(", ")}`);
    }
  }

  const filePath = path.join(index.tempDir, `${resrefLower}.utc`);
  await jsonToGff(doc, filePath);

  const stat = await fs.stat(filePath);
  index.resources.set(key, {
    resref: resrefLower,
    extension: "utc",
    filePath,
    sizeBytes: stat.size,
  });
  index.parsedGff.set(key, doc);

  const result: CreatureBuildResult = {
    success: true,
    created: key,
    tag,
    name,
    source: sourceResref || "scratch",
    sizeBytes: stat.size,
    henchman: !!henchman,
    scripts: scriptSet,
  };
  if (soundset !== undefined) result.soundset = soundset;
  if (startingPackage !== undefined) result.startingPackage = startingPackage;
  if (scriptWarnings.length > 0) result.scriptWarnings = scriptWarnings;

  if (equipment) {
    const equipped: string[] = [];
    const failed: string[] = [];
    for (const [slotName, itemResref] of Object.entries(equipment)) {
      const slotId = EQUIP_SLOT_MAP[slotName.toLowerCase()];
      if (slotId === undefined) { failed.push(`Unknown slot: ${slotName}`); continue; }
      const equipItems = (obj.Equip_ItemList as { value?: GffObj[] })?.value || [];
      if (equipItems.some((e) => e.__struct_id === slotId)) {
        equipped.push(`${slotName}: ${itemResref}`);
      } else {
        failed.push(`${slotName}: ${itemResref} (not found)`);
      }
    }
    result.equipped = equipped;
    if (failed.length > 0) result.equipmentWarnings = failed;
  }

  return result;
}
