/**
 * Structural/semantic checkers for blueprint and placed-instance GFF objects:
 * .utc creatures, .uti items, .utp placeables, .utd doors, .utt triggers,
 * .ute encounters, .utm stores, .utw waypoints, .uts sounds.
 */

import { resolveBlueprint } from "../git-helpers.js";
import { EQUIP_SLOT_MAP } from "../equip-slots.js";
import type { ResmanOptions } from "../../nim-tools.js";
import type { GffObj } from "../../types/gff.js";
import { getFieldLocStr, getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import {
  checkResourceRef,
  checkScriptRef,
  checkTwoDARef,
  hasCell,
  hasField,
  isRetired2DARow,
  listOf,
  type Report,
  twoDARow,
} from "./common.js";

/**
 * baseitems.2da's AmmunitionType -> the Equip_ItemList slot that must carry
 * ammo for the weapon to actually fire. 1=bow/arrows, 2=crossbow/bolts,
 * 3=sling/bullets. Verified against the live baseitems.2da via this
 * project's own nwn_twoda CSV pipeline, not by hand-parsing the raw 2DA text.
 */
const AMMO_SLOT_BY_TYPE: Record<string, number> = {
  "1": EQUIP_SLOT_MAP.arrows,
  "2": EQUIP_SLOT_MAP.bolts,
  "3": EQUIP_SLOT_MAP.bullets,
};

/** The 13 UTC creature script fields the engine dispatches on. */
const CREATURE_SCRIPT_FIELDS = [
  "ScriptAttacked",
  "ScriptDamaged",
  "ScriptDeath",
  "ScriptDialogue",
  "ScriptDisturbed",
  "ScriptEndRound",
  "ScriptHeartbeat",
  "ScriptOnBlocked",
  "ScriptOnNotice",
  "ScriptRested",
  "ScriptSpawn",
  "ScriptSpellAt",
  "ScriptUserDefine",
];

/** NWN's Commoner class. Levelling a Commoner grants no feats and no spellbook. */
const CLASS_TYPE_COMMONER = 20;

/**
 * Barbarian. The only class whose packages.2da row happens to equal
 * StartingPackage's GFF default of 0 — every other class silently gets the
 * wrong package (and thus wrong LevelUpHenchman() picks) if left unset.
 */
const CLASS_TYPE_BARBARIAN = 0;

/**
 * appearance.2da rows 0-6 (Dwarf, Elf, Gnome, Halfling, Half-Elf, Half-Orc,
 * Human) map 1:1 by label to the same numeric racialtypes.2da rows used by
 * the `race` field for the 7 standard PC races — verified directly against
 * appearance.2da. buildMinimalUtc()'s own defaults (Race=6/Human,
 * Appearance_Type=0/Dwarf) are a real-world instance of this mismatch, not
 * hypothetical.
 */
const STANDARD_PC_RACE_MAX = 6;

/** Henchman script set — used to detect a partially-wired companion. */
const HENCHMAN_SCRIPT_PREFIX = "x0_ch_hen_";

export interface CreatureVerifyOptions {
  /** Apply the stricter companion rules (script set, class, HENCH_LEVEL, voice). */
  henchman?: boolean;
  /**
   * When set, the equipped RightHand weapon is resolved to check ranged/ammo
   * pairing. Omit to skip that check (e.g. when NWN_FOLDER_DATA isn't
   * configured) — matches verifyArea's "degrade to skip, never to fail"
   * pattern for checks needing real game data.
   */
  resmanOpts?: ResmanOptions;
}

export async function verifyCreature(
  report: Report,
  index: ModuleIndex,
  obj: GffObj,
  opts: CreatureVerifyOptions = {},
): Promise<void> {
  // ─── Identity ───────────────────────────────────────────────────────────
  if (!getFieldStr(obj, "Tag")) {
    report.error("missing_tag", "Creature has no Tag — scripts and dialogs cannot address it", "Tag");
  }
  if (!getFieldLocStr(obj, "FirstName")) {
    report.warn("missing_name", "Creature has no FirstName — it will display as a blank name", "FirstName");
  }

  // ─── Appearance ─────────────────────────────────────────────────────────
  const appearance = getFieldNum(obj, "Appearance_Type");
  checkTwoDARef(report, index, "appearance", appearance, "Appearance_Type", "NAME");

  const race = getFieldNum(obj, "Race");
  if (
    race >= 0 &&
    race <= STANDARD_PC_RACE_MAX &&
    appearance >= 0 &&
    appearance <= STANDARD_PC_RACE_MAX &&
    appearance !== race
  ) {
    report.warn(
      "appearance_race_mismatch",
      `Race is ${race} but Appearance_Type is ${appearance} — for the 7 standard PC races, appearance.2da rows 0-6 match racialtypes.2da rows 0-6, so this creature will render with the wrong body model for its race`,
      "Appearance_Type",
      "create_creature_blueprint with appearance set to the same value as race",
    );
  }

  // ─── Faction ────────────────────────────────────────────────────────────
  const faction = getFieldNum(obj, "FactionID");
  if (faction < 0) {
    report.error("invalid_faction", `FactionID ${faction} is negative`, "FactionID");
  }

  // ─── Classes ────────────────────────────────────────────────────────────
  const classList = listOf(obj, "ClassList");
  if (classList.length === 0) {
    report.error(
      "no_classes",
      "Creature has an empty ClassList — it has no levels, no BAB and no saves",
      "ClassList",
      "create_creature_blueprint with a `classes` array, or clone a class-bearing chassis",
    );
  }
  for (const [i, cls] of classList.entries()) {
    const classId = getFieldNum(cls, "Class");
    checkTwoDARef(report, index, "classes", classId, `ClassList.${i}.Class`);
    if (getFieldNum(cls, "ClassLevel") < 1) {
      report.warn("zero_class_level", `ClassList.${i} has level 0`, `ClassList.${i}.ClassLevel`);
    }
  }

  // ─── Scripts ────────────────────────────────────────────────────────────
  for (const field of CREATURE_SCRIPT_FIELDS) {
    if (!hasField(obj, field)) {
      report.error(
        "missing_script_field",
        `Creature has no ${field} field — that event will not fire`,
        field,
        "create_creature_blueprint writes all 13; use its `scripts` param to set one explicitly",
      );
      continue;
    }
    checkScriptRef(report, index, getFieldStr(obj, field), field);
  }

  // "ScriptPercption" was a misspelling written by older versions of this tool.
  // A creature carrying it has a junk field and, usually, no perception handler.
  if (hasField(obj, "ScriptPercption")) {
    report.error(
      "script_percption_typo",
      'Creature carries the misspelled "ScriptPercption" field — the real UTC field is ScriptOnNotice. No real NWN blueprint uses this name',
      "ScriptPercption",
      "regenerate the blueprint, or modify_gff_field ScriptOnNotice and drop the typo",
    );
  }

  // ─── Conversation ───────────────────────────────────────────────────────
  checkResourceRef(report, index, getFieldStr(obj, "Conversation"), "dlg", "Conversation");

  // ─── Equipment ──────────────────────────────────────────────────────────
  const equipList = listOf(obj, "Equip_ItemList");
  for (const [i, item] of equipList.entries()) {
    const resref = getFieldStr(item, "EquippedRes");
    if (resref) {
      checkResourceRef(report, index, resref, "uti", `Equip_ItemList.${i}.EquippedRes`, "warning");
    }
  }

  // A ranged weapon in RightHand with no matching ammo slot filled cannot
  // actually fire — confirmed against a live, played PW module that this
  // exact gap slipped into 12 of its own creatures (see
  // docs/tfn-corpus-survey/actors.md), so it's a real, easy-to-miss category
  // and not hypothetical.
  if (opts.resmanOpts) {
    const rightHandEntry = equipList.find((e) => e.__struct_id === EQUIP_SLOT_MAP.righthand);
    const rightHandRes = rightHandEntry ? getFieldStr(rightHandEntry, "EquippedRes") : "";
    if (rightHandRes) {
      const itemDoc = await resolveBlueprint(index, rightHandRes, "uti", opts.resmanOpts);
      if (itemDoc) {
        const baseItem = getFieldNum(itemDoc, "BaseItem");
        const baseRow = twoDARow(index, "baseitems", baseItem);
        if (baseRow && hasCell(baseRow, "RangedWeapon")) {
          const ammoType = baseRow.AmmunitionType;
          const ammoSlot = ammoType ? AMMO_SLOT_BY_TYPE[ammoType] : undefined;
          const hasAmmo = ammoSlot !== undefined && equipList.some((e) => e.__struct_id === ammoSlot);
          if (!hasAmmo) {
            report.error(
              "ranged_weapon_no_ammo",
              `RightHand carries a ranged weapon ("${rightHandRes}", BaseItem ${baseItem}) but no matching ammo is equipped — it cannot fire`,
              "Equip_ItemList",
              "set_creature_equipment with the matching ammo (arrows/bolts/bullets) in the ammo slot",
            );
          }
        }
      }
    }
  }

  // ─── Voice ──────────────────────────────────────────────────────────────
  const soundset = getFieldNum(obj, "SoundSetFile");
  const gender = getFieldNum(obj, "Gender");
  if (soundset > 0 && soundset !== 65535) {
    const row = twoDARow(index, "soundset", soundset);
    if (row) {
      if (!hasCell(row, "RESREF")) {
        report.warn(
          "empty_soundset",
          `SoundSetFile=${soundset} resolves to a soundset.2da row with no RESREF — the creature will be mute`,
          "SoundSetFile",
        );
      }
      const rowGender = row.GENDER;
      if (rowGender !== undefined && rowGender !== "****" && Number(rowGender) !== gender) {
        report.warn(
          "soundset_gender_mismatch",
          `SoundSetFile=${soundset} is a gender-${rowGender} voice set but the creature's Gender is ${gender}`,
          "SoundSetFile",
        );
      }
    }
  }

  // ─── Companion-specific rules ───────────────────────────────────────────
  if (opts.henchman) {
    const dialogue = getFieldStr(obj, "ScriptDialogue");
    const heartbeat = getFieldStr(obj, "ScriptHeartbeat");

    if (!dialogue.startsWith(HENCHMAN_SCRIPT_PREFIX)) {
      report.error(
        "henchman_no_command_handler",
        `Companion's ScriptDialogue is "${dialogue}", not the henchman handler — the engine delivers radial follow/stand-ground orders as a silent command shout matched in OnConversation, so the companion will ignore every order`,
        "ScriptDialogue",
        "create_creature_blueprint with henchman:true",
      );
    }
    if (!heartbeat.startsWith(HENCHMAN_SCRIPT_PREFIX)) {
      report.error(
        "henchman_no_follow_ai",
        `Companion's ScriptHeartbeat is "${heartbeat}", not the henchman handler — nothing will drive following`,
        "ScriptHeartbeat",
        "create_creature_blueprint with henchman:true",
      );
    }

    const onlyCommoner =
      classList.length > 0 && classList.every((c) => getFieldNum(c, "Class") === CLASS_TYPE_COMMONER);
    if (onlyCommoner) {
      report.error(
        "henchman_commoner_class",
        "Companion is Commoner class only — LevelUpHenchman() will grant no feats and no spellbook, so it will join with no abilities",
        "ClassList",
        "clone a PC-class chassis (nw_halfcel001, nw_elfmage001, nw_humanmerc002, ...) instead of nw_bartender/nw_oldman/nw_convict",
      );
    }

    const startingPackage = getFieldNum(obj, "StartingPackage");
    const primaryClass = classList.length > 0 ? getFieldNum(classList[0], "Class") : undefined;
    if (primaryClass !== undefined && primaryClass !== CLASS_TYPE_BARBARIAN && startingPackage === 0) {
      report.warn(
        "henchman_no_package",
        `Companion's StartingPackage is 0 (Barbarian's package) but its primary class is ${primaryClass} — LevelUpHenchman() will make Barbarian-appropriate feat/skill/spell picks for the wrong class`,
        "StartingPackage",
        `create_creature_blueprint with startingPackage:${primaryClass} (packages.2da row = class ID for each base class's iconic package)`,
      );
    }

    const vars = listOf(obj, "VarTable");
    const hasLevel = vars.some((v) => getFieldStr(v, "Name").toUpperCase() === "HENCH_LEVEL");
    if (!hasLevel) {
      report.warn(
        "henchman_no_level_var",
        "Companion has no HENCH_LEVEL local variable — the recruit script has no level target and will leave it at level 1",
        "VarTable",
        "create_creature_blueprint with varTable [{name:'HENCH_LEVEL',type:'int',value:<level>}]",
      );
    }

    if (soundset === 0 || soundset === 65535) {
      report.warn(
        "henchman_no_voice",
        "Companion has no soundset — it will be silent on join, dismiss and in combat",
        "SoundSetFile",
        "create_creature_blueprint with a TYPE 0 soundset.2da row matching the creature's gender",
      );
    }
    if (!getFieldStr(obj, "Conversation")) {
      report.error(
        "henchman_no_dialog",
        "Companion has no Conversation — there is no way to recruit or command it",
        "Conversation",
        "create_dialog then set the conversation field",
      );
    }
  }
}

// ─── Items ────────────────────────────────────────────────────────────────

/**
 * baseitems.2da ModelType values.
 *  0 = simple (one model part)
 *  1 = layered / armour
 *  2 = composite — a weapon built from 3 parts; any part left 0 renders as a
 *      shapeless blob in the creature's hand.
 *  3 = armour (uses AC/part columns)
 */
const MODEL_TYPE_COMPOSITE = 2;
const MODEL_TYPE_SIMPLE = 0;

export function verifyItem(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Item has no Tag — scripts cannot address it by tag", "Tag");
  }
  if (!getFieldLocStr(obj, "LocalizedName")) {
    report.warn("missing_name", "Item has no LocalizedName — it will display as its base item name", "LocalizedName");
  }

  const baseItem = getFieldNum(obj, "BaseItem");
  checkTwoDARef(report, index, "baseitems", baseItem, "BaseItem");

  // ─── Model parts ────────────────────────────────────────────────────────
  // A weapon whose model parts are all 0 renders as a bag/blob on the arm.
  const baseRow = twoDARow(index, "baseitems", baseItem);
  if (baseRow) {
    // Existence is not enough: retired rows are still present in the table, and
    // an item pointed at one ships with no icon and a "Bad Strref" type name.
    if (isRetired2DARow(baseRow)) {
      report.error(
        "retired_base_item",
        `BaseItem ${baseItem} is a retired baseitems.2da row (label "${baseRow.label ?? ""}", Name strref "${baseRow.Name ?? ""}") — the item will have no inventory icon and will show "Bad Strref" where its type name belongs`,
        "BaseItem",
        'pick a live row: search_2da(table: "baseitems", column: "label", value: "...") and reject any row labelled DELETED (23, 30, 43, 48, 54, 67, 68)',
      );
    }

    // The inventory icon is derived as i<ItemClass>_<ModelPart1 padded to 3>.
    // With no ItemClass there is no name to derive, so no icon can ever resolve.
    if (!hasCell(baseRow, "ItemClass")) {
      report.error(
        "base_item_no_item_class",
        `BaseItem ${baseItem} has an empty ItemClass column — the inventory icon name (i<ItemClass>_<ModelPart1>) cannot be derived, so the item will render without an icon`,
        "BaseItem",
        "pick a base item row that defines ItemClass",
      );
    }

    const modelType = Number(baseRow.ModelType);
    const part1 = getFieldNum(obj, "ModelPart1");

    if (modelType === MODEL_TYPE_COMPOSITE) {
      const part2 = getFieldNum(obj, "ModelPart2");
      const part3 = getFieldNum(obj, "ModelPart3");
      const missing = [
        part1 === 0 ? "ModelPart1" : null,
        part2 === 0 ? "ModelPart2" : null,
        part3 === 0 ? "ModelPart3" : null,
      ].filter(Boolean);
      if (missing.length > 0) {
        report.error(
          "composite_model_part_zero",
          `Composite-model item (BaseItem ${baseItem}) has ${missing.join(", ")} set to 0 — it will render as a shapeless blob rather than a weapon`,
          missing[0] as string,
          "set model parts from the base item's available models, or clone an existing item of this base type",
        );
      }
    } else if (modelType === MODEL_TYPE_SIMPLE && part1 === 0) {
      report.error(
        "simple_model_part_zero",
        `Item (BaseItem ${baseItem}) has ModelPart1 set to 0 — it has no model and will not render`,
        "ModelPart1",
        "set ModelPart1 to a valid model index for this base item",
      );
    }
  }

  // ─── Properties ─────────────────────────────────────────────────────────
  for (const [i, prop] of listOf(obj, "PropertiesList").entries()) {
    const propertyName = getFieldNum(prop, "PropertyName");
    checkTwoDARef(report, index, "itempropdef", propertyName, `PropertiesList.${i}.PropertyName`);
  }

  if (getFieldNum(obj, "StackSize") < 1) {
    report.warn("zero_stack", "StackSize is 0 — the item may not be usable", "StackSize");
  }
}

// ─── Placeables ───────────────────────────────────────────────────────────

export function verifyPlaceable(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Placeable has no Tag", "Tag");
  }

  checkTwoDARef(report, index, "placeables", getFieldNum(obj, "Appearance"), "Appearance", "ModelName");

  // The engine and toolset read LocName. Setting LocalizedName does nothing.
  if (!getFieldLocStr(obj, "LocName")) {
    if (getFieldLocStr(obj, "LocalizedName")) {
      report.error(
        "placeable_wrong_name_field",
        "Placeable sets LocalizedName but not LocName — the engine and toolset read LocName, so the display name will not appear",
        "LocName",
        "modify_gff_field the LocName field (cexolocstring) instead",
      );
    } else {
      report.warn(
        "missing_name",
        "Placeable has no LocName — it will display its appearance's default name",
        "LocName",
      );
    }
  }

  const hasInventory = getFieldNum(obj, "HasInventory") === 1;
  const items = listOf(obj, "ItemList");
  if (items.length > 0 && !hasInventory) {
    report.error(
      "inventory_not_enabled",
      `Placeable holds ${items.length} item(s) but HasInventory is 0 — the contents are unreachable`,
      "HasInventory",
      "add_items_to_container sets this automatically",
    );
  }
  for (const [i, item] of items.entries()) {
    checkResourceRef(report, index, getFieldStr(item, "InventoryRes"), "uti", `ItemList.${i}.InventoryRes`, "warning");
  }

  for (const field of ["OnUsed", "OnOpen", "OnClosed", "OnDeath", "OnHeartbeat", "OnDisturbed"]) {
    if (hasField(obj, field)) checkScriptRef(report, index, getFieldStr(obj, field), field);
  }
}

// ─── Geometry-bearing objects: triggers, encounters, doors ────────────────

/**
 * Verify a Geometry vertex list. A trigger or encounter without at least 3
 * non-degenerate vertices is invisible to the engine's entry detection AND to
 * the toolset — it silently does nothing.
 */
function verifyGeometry(report: Report, obj: GffObj, xField: string, yField: string): void {
  const geometry = listOf(obj, "Geometry");
  if (geometry.length === 0) {
    report.error(
      "missing_geometry",
      "Object has no Geometry — the engine will not detect entry and the toolset will not render it. Blueprints from resman do not carry geometry; placed instances must add it",
      "Geometry",
      "place_trigger/place_encounter generate a default square when the blueprint lacks one",
    );
    return;
  }
  if (geometry.length < 3) {
    report.error(
      "degenerate_geometry",
      `Geometry has only ${geometry.length} vertices — at least 3 are needed to enclose an area`,
      "Geometry",
    );
    return;
  }

  // All points identical → zero-area region that can never be entered.
  const first = { x: getFieldNum(geometry[0], xField), y: getFieldNum(geometry[0], yField) };
  const allSame = geometry.every((p) => getFieldNum(p, xField) === first.x && getFieldNum(p, yField) === first.y);
  if (allSame) {
    report.error(
      "zero_area_geometry",
      "All Geometry vertices are at the same point — the region has zero area and can never be entered",
      "Geometry",
    );
  }
}

export function verifyTrigger(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Trigger has no Tag", "Tag");
  }
  verifyGeometry(report, obj, "PointX", "PointY");

  for (const field of [
    "ScriptOnEnter",
    "ScriptOnExit",
    "ScriptHeartbeat",
    "ScriptUserDefine",
    "OnDisarm",
    "OnTrapTriggered",
  ]) {
    if (hasField(obj, field)) checkScriptRef(report, index, getFieldStr(obj, field), field);
  }

  // Trap fields, when this trigger is a trap.
  if (getFieldNum(obj, "TrapFlag") === 1) {
    const detect = getFieldNum(obj, "TrapDetectDC");
    const disarm = getFieldNum(obj, "DisarmDC");
    if (detect < 0 || detect > 250) {
      report.warn("implausible_trap_dc", `TrapDetectDC ${detect} is outside the usual 0-250 range`, "TrapDetectDC");
    }
    if (disarm < 0 || disarm > 250) {
      report.warn("implausible_trap_dc", `DisarmDC ${disarm} is outside the usual 0-250 range`, "DisarmDC");
    }
  }
}

export function verifyEncounter(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Encounter has no Tag", "Tag");
  }
  // UTE geometry uses X/Y, not PointX/PointY — a genuine NWN schema difference.
  verifyGeometry(report, obj, "X", "Y");

  const creatures = listOf(obj, "CreatureList");
  if (creatures.length === 0) {
    report.error(
      "encounter_no_creatures",
      "Encounter has an empty CreatureList — it will spawn nothing",
      "CreatureList",
      "create_encounter_blueprint with a `creatures` array",
    );
  }
  for (const [i, entry] of creatures.entries()) {
    checkResourceRef(report, index, getFieldStr(entry, "ResRef"), "utc", `CreatureList.${i}.ResRef`, "warning");
    // create_encounter_blueprint hardcodes these to 0 rather than reading them
    // from the referenced .utc, which makes encounter summaries useless.
    if (getFieldNum(entry, "CR") === 0) {
      report.warn(
        "encounter_cr_unset",
        `CreatureList.${i} has CR 0 — populate it from the referenced creature so difficulty reporting works`,
        `CreatureList.${i}.CR`,
      );
    }
  }

  for (const field of ["OnEntered", "OnExit", "OnExhausted", "OnHeartbeat", "OnUserDefined"]) {
    if (hasField(obj, field)) checkScriptRef(report, index, getFieldStr(obj, field), field);
  }
}

export function verifyDoor(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Door has no Tag — it cannot be a link target", "Tag");
  }
  checkTwoDARef(report, index, "genericdoors", getFieldNum(obj, "GenericType"), "GenericType");

  const linkedTo = getFieldStr(obj, "LinkedTo");
  const linkedToFlags = getFieldNum(obj, "LinkedToFlags");
  if (linkedTo && linkedToFlags === 0) {
    report.error(
      "door_link_flags_unset",
      `Door has LinkedTo "${linkedTo}" but LinkedToFlags is 0 — the engine will not treat it as a transition`,
      "LinkedToFlags",
      "link_doors sets both sides correctly",
    );
  }

  for (const field of [
    "OnOpen",
    "OnClosed",
    "OnDeath",
    "OnHeartbeat",
    "OnLock",
    "OnUnlock",
    "OnFailToOpen",
    "OnClick",
    "OnUserDefined",
  ]) {
    if (hasField(obj, field)) checkScriptRef(report, index, getFieldStr(obj, field), field);
  }
}

// ─── Stores, waypoints, sounds ────────────────────────────────────────────

export function verifyStore(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Store has no Tag", "Tag");
  }

  const markUp = getFieldNum(obj, "MarkUp");
  const markDown = getFieldNum(obj, "MarkDown");
  if (markUp > 0 && markDown > 0 && markDown > markUp) {
    report.warn(
      "store_markdown_exceeds_markup",
      `MarkDown (${markDown}) exceeds MarkUp (${markUp}) — the store buys higher than it sells, which players can farm`,
      "MarkDown",
    );
  }

  let itemCount = 0;
  for (const [i, category] of listOf(obj, "StoreList").entries()) {
    for (const [j, item] of listOf(category, "ItemList").entries()) {
      itemCount++;
      checkResourceRef(
        report,
        index,
        getFieldStr(item, "InventoryRes"),
        "uti",
        `StoreList.${i}.ItemList.${j}.InventoryRes`,
        "warning",
      );
    }
  }
  if (itemCount === 0) {
    report.warn("store_empty", "Store has no inventory in any category", "StoreList");
  }
}

export function verifyWaypoint(report: Report, _index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.error(
      "missing_tag",
      "Waypoint has no Tag — waypoints are addressed exclusively by tag, so an untagged one is unreachable",
      "Tag",
      "place_waypoint with a tag",
    );
  }
}

export function verifySound(report: Report, index: ModuleIndex, obj: GffObj): void {
  if (!getFieldStr(obj, "Tag")) {
    report.warn("missing_tag", "Sound has no Tag", "Tag");
  }

  const sounds = listOf(obj, "Sounds");
  if (sounds.length === 0) {
    report.error("sound_no_clips", "Sound object has an empty Sounds list — it will play nothing", "Sounds");
  }

  const volume = getFieldNum(obj, "Volume");
  if (volume < 0 || volume > 127) {
    report.warn("implausible_volume", `Volume ${volume} is outside the 0-127 range`, "Volume");
  }
  void index;
}
