/**
 * Curated per-class weapon preference table (user-specified: "add packages.2da
 * files for various class and level progressions — General Fighter focuses on
 * the longsword, while others specialize in other feats and weapons").
 *
 * packages.2da already gives each base class an iconic package (row index =
 * class ID, verified elsewhere in this project), but it names no preferred
 * *weapon* — that's a real design choice, not derivable from any 2DA column.
 * `packages.2da`'s own `FeatPref2DA` column (e.g. Fighter -> PackFTFight1.2da)
 * was checked and rejected as a source: it's an epic-feat menu list in
 * FeatIndex order, not a sensible "pick this first" priority.
 *
 * All baseitem and feat.2da row IDs below were verified directly against a
 * live baseitems.2da/feat.2da (not guessed): baseitems.2da rows 0=shortsword,
 * 1=longsword, 5=warhammer, 8=longbow, 18=greataxe, 50=quarterstaff,
 * 51=rapier; feat.2da WeapFoc/WeapSpe/ImpCrit rows read the same way.
 *
 * Shared by three tools so a change of preference (or a user override) stays
 * in one place: `build_npc_stat_block` (bonus/generic feat-slot picks),
 * `equip_npc_by_role` (default weapon search target), and
 * `respec_weapon_feats` (default "to" weapon, and the source of truth for
 * which feats to strip when moving a creature off its current weapon).
 */
export interface WeaponPreference {
  /** baseitems.2da row. */
  baseItem: number;
  label: string;
  /** feat.2da rows — read the item's own Epic* columns for epic-tier feats. */
  weaponFocusFeat: number;
  weaponSpecializationFeat: number;
  weaponImprovedCriticalFeat: number;
}

/**
 * class ID (classes.2da row, 0-10) -> preferred weapon. `null` for Monk: it
 * fights unarmed, which has its own feat.2da row family
 * (WeapFocUnArm/WeapSpeUnArm/ImpCritUnArm, baseitem 255,
 * FEAT_WEAPON_FOCUS_CREATURE-adjacent) rather than a normal weapon chain — not
 * verified for this table yet, so left unset rather than guessed.
 */
export const CLASS_WEAPON_PREFERENCE: Record<number, WeaponPreference | null> = {
  0: {
    baseItem: 18,
    label: "Greataxe",
    weaponFocusFeat: 111,
    weaponSpecializationFeat: 149,
    weaponImprovedCriticalFeat: 73,
  }, // Barbarian
  1: {
    baseItem: 51,
    label: "Rapier",
    weaponFocusFeat: 104,
    weaponSpecializationFeat: 142,
    weaponImprovedCriticalFeat: 66,
  }, // Bard
  2: {
    baseItem: 5,
    label: "Warhammer",
    weaponFocusFeat: 115,
    weaponSpecializationFeat: 153,
    weaponImprovedCriticalFeat: 77,
  }, // Cleric
  3: {
    baseItem: 50,
    label: "Quarterstaff",
    weaponFocusFeat: 96,
    weaponSpecializationFeat: 134,
    weaponImprovedCriticalFeat: 58,
  }, // Druid
  4: {
    baseItem: 1,
    label: "Longsword",
    weaponFocusFeat: 106,
    weaponSpecializationFeat: 144,
    weaponImprovedCriticalFeat: 68,
  }, // Fighter
  5: null, // Monk
  6: {
    baseItem: 1,
    label: "Longsword",
    weaponFocusFeat: 106,
    weaponSpecializationFeat: 144,
    weaponImprovedCriticalFeat: 68,
  }, // Paladin
  7: {
    baseItem: 8,
    label: "Longbow",
    weaponFocusFeat: 101,
    weaponSpecializationFeat: 139,
    weaponImprovedCriticalFeat: 63,
  }, // Ranger
  8: {
    baseItem: 51,
    label: "Rapier",
    weaponFocusFeat: 104,
    weaponSpecializationFeat: 142,
    weaponImprovedCriticalFeat: 66,
  }, // Rogue
  9: {
    baseItem: 50,
    label: "Quarterstaff",
    weaponFocusFeat: 96,
    weaponSpecializationFeat: 134,
    weaponImprovedCriticalFeat: 58,
  }, // Sorcerer
  10: {
    baseItem: 50,
    label: "Quarterstaff",
    weaponFocusFeat: 96,
    weaponSpecializationFeat: 134,
    weaponImprovedCriticalFeat: 58,
  }, // Wizard
};

/** Universal filler feats for generic/bonus feat slots with no weapon left to pick — verified feat.2da rows. */
export const TOUGHNESS_FEAT = 40;
export const CLEAVE_FEAT = 6;
export const DODGE_FEAT = 10;
