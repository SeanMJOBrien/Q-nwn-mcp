/**
 * Generator for the randomised gear appearance include.
 *
 * Ported from the working implementations in ~/git/battlegrounds2 and
 * ~/git/battlefield1142 (`create_barmor.nss`, `create_wep_ftr.nss`), which
 * randomise equipped gear at spawn with CopyItemAndModify. Three things learned
 * from reading those and carried over deliberately:
 *
 * 1. CopyItemAndModify returns a NEW object every call. The original must be
 *    dropped and the return value chained. The reference scripts chain off a
 *    reference they have already destroyed in two places; it survives only
 *    because DestroyObject defers to end of script. This generator does not
 *    repeat that.
 * 2. A weapon's three model parts should share one index. Drawing them
 *    independently gives a hilt, grip and blade from different weapons.
 * 3. Valid weapon model indices are per-base-item — the reference carries a
 *    switch setting its cap to between 3 and 8 depending on weapon type. A
 *    blanket Random(20) produces invalid parts, so weapon model randomisation is
 *    opt-in here and capped, while colour randomisation (a small fixed palette)
 *    is always safe.
 */

/** Armour colour channels carry 176 palette entries, 0-175. */
export const ARMOR_COLOR_MAX = 175;

/** Weapon colour channels carry a much smaller palette. */
export const WEAPON_COLOR_MAX = 4;

/**
 * Conservative default cap for weapon model parts.
 *
 * The reference implementation's per-base-item caps run 3-8; 3 is the smallest
 * of those, so it is valid for every weapon type. Raise it per weapon only when
 * you have checked that base item's actual part count.
 */
export const WEAPON_MODEL_MAX_SAFE = 3;

export interface GearAppearanceOptions {
  /** Randomise armour colours (cloth, leather, metal). Default true. */
  armorColors?: boolean;
  /** Randomise weapon colours. Default true. */
  weaponColors?: boolean;
  /**
   * Randomise weapon model parts. Default false — valid indices depend on the
   * base item, and an out-of-range part renders wrong.
   */
  weaponModels?: boolean;
  /** Cap for weapon model indices when weaponModels is on. */
  weaponModelMax?: number;
  /** Include resref, so the usage comment names the real file. */
  includeName?: string;
}

export interface AppearanceIssue {
  message: string;
  fix: string;
}

/** Validate options before generating. */
export function validateAppearanceOptions(opts: GearAppearanceOptions): AppearanceIssue[] {
  const issues: AppearanceIssue[] = [];
  const max = opts.weaponModelMax ?? WEAPON_MODEL_MAX_SAFE;

  if (!Number.isInteger(max) || max < 1 || max > 8) {
    issues.push({
      message: `weaponModelMax must be a whole number from 1 to 8, got ${max}`,
      fix: "the reference implementation's per-base-item caps run 3-8; use 3 unless you have checked the base item",
    });
  }
  if (opts.armorColors === false && opts.weaponColors === false && opts.weaponModels !== true) {
    issues.push({
      message: "every randomisation channel is disabled — the generated script would do nothing",
      fix: "enable at least one of armorColors, weaponColors or weaponModels",
    });
  }
  return issues;
}

/** Generate the NWScript source for the appearance include. */
export function generateAppearanceInclude(opts: GearAppearanceOptions = {}): string {
  const armorColors = opts.armorColors !== false;
  const weaponColors = opts.weaponColors !== false;
  const weaponModels = opts.weaponModels === true;
  const weaponModelMax = opts.weaponModelMax ?? WEAPON_MODEL_MAX_SAFE;
  const includeName = opts.includeName ?? "inc_appear";

  const armorBody = armorColors
    ? `    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_CLOTH1,   Random(GEAR_ACOLOR_MAX));
    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_CLOTH2,   Random(GEAR_ACOLOR_MAX));
    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_LEATHER1, Random(GEAR_ACOLOR_MAX));
    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_LEATHER2, Random(GEAR_ACOLOR_MAX));
    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_METAL1,   Random(GEAR_ACOLOR_MAX));
    oItem = GearApply(oItem, ITEM_APPR_TYPE_ARMOR_COLOR, ITEM_APPR_ARMOR_COLOR_METAL2,   Random(GEAR_ACOLOR_MAX));`
    : "    // Armour colour randomisation disabled at generation time.";

  const weaponColorBody = weaponColors
    ? `    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_COLOR, ITEM_APPR_WEAPON_COLOR_TOP,    Random(GEAR_WCOLOR_MAX) + 1);
    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_COLOR, ITEM_APPR_WEAPON_COLOR_MIDDLE, Random(GEAR_WCOLOR_MAX) + 1);
    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_COLOR, ITEM_APPR_WEAPON_COLOR_BOTTOM, Random(GEAR_WCOLOR_MAX) + 1);`
    : "    // Weapon colour randomisation disabled at generation time.";

  const weaponModelBody = weaponModels
    ? `    // One index for all three parts, so hilt, grip and blade read as one weapon.
    int nModel = Random(GEAR_WMODEL_MAX) + 1;
    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_MODEL, ITEM_APPR_WEAPON_MODEL_TOP,    nModel);
    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_MODEL, ITEM_APPR_WEAPON_MODEL_MIDDLE, nModel);
    oItem = GearApply(oItem, ITEM_APPR_TYPE_WEAPON_MODEL, ITEM_APPR_WEAPON_MODEL_BOTTOM, nModel);`
    : "    // Weapon model randomisation disabled — valid indices are per-base-item.";

  return `// Randomised gear appearance.
//
// GENERATED by nwn-mcp create_gear_randomizer — do not hand-edit. Technique
// ported from the battlegrounds2 / battlefield1142 modules.
//
// Call GearRandomizeCreature(OBJECT_SELF) from a creature's OnSpawn handler.
// Every equipped item is replaced by a recoloured copy, so two guards on the
// stock blueprints produce two differently-dyed guards.
//
// Usage:
//
//     #include "${includeName}"
//     void main()
//     {
//         GearRandomizeCreature(OBJECT_SELF);
//         ExecuteScript("nw_c2_default9", OBJECT_SELF);   // chain the stock spawn AI
//     }

int GEAR_ACOLOR_MAX = ${ARMOR_COLOR_MAX};
int GEAR_WCOLOR_MAX = ${WEAPON_COLOR_MAX};
int GEAR_WMODEL_MAX = ${weaponModelMax};

// Replace oItem with a copy carrying one changed appearance value.
//
// CopyItemAndModify returns a NEW object; the original must be dropped and the
// return value chained. Passing a stale reference into the next call is the
// standard way this goes wrong, and it fails silently — the later edits land on
// an object that is already gone.
object GearApply(object oItem, int nType, int nIndex, int nValue)
{
    if (!GetIsObjectValid(oItem)) return OBJECT_INVALID;

    object oNew = CopyItemAndModify(oItem, nType, nIndex, nValue, TRUE);
    if (!GetIsObjectValid(oNew)) return oItem;   // modify refused; keep the original

    DestroyObject(oItem);
    return oNew;
}

// Recolour the armour in oCreature's chest slot and re-equip it.
void GearRandomizeArmor(object oCreature)
{
    object oItem = GetItemInSlot(INVENTORY_SLOT_CHEST, oCreature);
    if (!GetIsObjectValid(oItem)) return;

${armorBody}

    if (!GetIsObjectValid(oItem)) return;
    AssignCommand(oCreature, ActionEquipItem(oItem, INVENTORY_SLOT_CHEST));
}

// Recolour the weapon in the given slot and re-equip it.
void GearRandomizeWeapon(object oCreature, int nSlot = INVENTORY_SLOT_RIGHTHAND)
{
    object oItem = GetItemInSlot(nSlot, oCreature);
    if (!GetIsObjectValid(oItem)) return;

${weaponColorBody}

${weaponModelBody}

    if (!GetIsObjectValid(oItem)) return;
    AssignCommand(oCreature, ActionEquipItem(oItem, nSlot));
}

// Randomise everything oCreature is wearing and wielding.
//
// Runs once. The marker local stops a creature that re-runs its spawn handler
// (or is caught by a second randomiser) from being recoloured twice, which would
// otherwise churn the item objects for no visible gain.
void GearRandomizeCreature(object oCreature)
{
    if (GetLocalInt(oCreature, "GEAR_RANDOMIZED")) return;
    SetLocalInt(oCreature, "GEAR_RANDOMIZED", 1);

    GearRandomizeArmor(oCreature);
    GearRandomizeWeapon(oCreature, INVENTORY_SLOT_RIGHTHAND);
    GearRandomizeWeapon(oCreature, INVENTORY_SLOT_LEFTHAND);
}
`;
}
