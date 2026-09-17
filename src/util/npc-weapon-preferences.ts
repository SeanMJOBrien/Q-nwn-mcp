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
 * 1=longsword, 2=battleaxe, 5=warhammer, 6=heavycrossbow, 8=longbow,
 * 9=lightmace, 11=shortbow, 18=greataxe, 22=dagger, 47=morningstar,
 * 50=quarterstaff, 51=rapier, 53=scimitar, 60=sickle; feat.2da WeapFoc/
 * WeapSpe/ImpCrit rows read the same way.
 *
 * Shared by three tools so a change of preference (or a user override) stays
 * in one place: `build_npc_stat_block` (bonus/generic feat-slot picks),
 * `equip_npc_by_role` (default weapon search target), and
 * `respec_weapon_feats` (default "to" weapon, and the source of truth for
 * which feats to strip when moving a creature off its current weapon).
 *
 * RANDOMIZED SELECTION (2026-09-16): each class maps to a SHORT LIST of 2-3
 * plausible weapons, not one fixed default — so same-class NPCs across a
 * generated module don't all converge on one weapon, mechanically and
 * visually. Every entry in every list is verified proficiency-safe for that
 * class: each weapon's real `baseitems.2da` `ReqFeat0-4` (the same OR-set
 * `verify_creature`'s `weapon_proficiency_mismatch` check already reads) was
 * cross-checked against that class's real automatic weapon-proficiency
 * feat(s) from `cls_feat_<class>.2da` (`List=3`, `GrantedOnLevel=1`) — not
 * guessed from general D&D 3.5 rules, which NWN's own class tables sometimes
 * diverge from (see the two corrections below). `pickWeaponPreference()`
 * chooses deterministically by seed (a creature's tag/resref), matching this
 * project's no-dice-rolling convention for generated content: the same seed
 * always picks the same weapon, so regenerating a module is reproducible, but
 * different NPCs of the same class land on different weapons.
 *
 * Two real corrections made verifying this data, not just widened lists:
 * Cleric's and Bard's previous single defaults (Warhammer, Rapier) both
 * require Martial Weapon Proficiency (feat 45) — but `cls_feat_cler.2da`/
 * `cls_feat_bard.2da` only grant `WeapProfSim` (feat 46, Simple) automatically
 * for either class in this engine's tables, no martial or bard/cleric-
 * specific weapon feat. (Tabletop 3.5 gives a Cleric proficiency with her
 * deity's favored weapon and a Bard a small martial exception list — neither
 * exception exists in this engine's `cls_feat_*.2da` automatic-feat rows, so
 * a generic NWN Cleric/Bard with no further bonus feat is NOT actually
 * proficient with a Warhammer/Rapier despite that being the previous default
 * here.) Both entries were replaced with real Simple-weapon options — this
 * was a latent bug in the shipped table, not something the widening
 * introduced. Druid (feat 48, `WeapProfDruid`), Rogue (feat 50,
 * `WeapProfRogue`), and Wizard (feat 51, `WeapProfWizard`) each have their own
 * class-specific proficiency feat rather than generic Simple/Martial — their
 * lists are drawn from real weapons whose `ReqFeat0-4` contains that exact
 * feat id, which happens to line up closely with each class's real tabletop
 * weapon list (Druid: club/dagger/quarterstaff/scimitar/shortspear/sickle;
 * Wizard: club/dagger/heavy or light crossbow/quarterstaff).
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

const LONGSWORD: WeaponPreference = { baseItem: 1, label: "Longsword", weaponFocusFeat: 106, weaponSpecializationFeat: 144, weaponImprovedCriticalFeat: 68 };
const GREATAXE: WeaponPreference = { baseItem: 18, label: "Greataxe", weaponFocusFeat: 111, weaponSpecializationFeat: 149, weaponImprovedCriticalFeat: 73 };
const BATTLEAXE: WeaponPreference = { baseItem: 2, label: "Battleaxe", weaponFocusFeat: 110, weaponSpecializationFeat: 148, weaponImprovedCriticalFeat: 72 };
const WARHAMMER: WeaponPreference = { baseItem: 5, label: "Warhammer", weaponFocusFeat: 115, weaponSpecializationFeat: 153, weaponImprovedCriticalFeat: 77 };
const QUARTERSTAFF: WeaponPreference = { baseItem: 50, label: "Quarterstaff", weaponFocusFeat: 96, weaponSpecializationFeat: 134, weaponImprovedCriticalFeat: 58 };
const RAPIER: WeaponPreference = { baseItem: 51, label: "Rapier", weaponFocusFeat: 104, weaponSpecializationFeat: 142, weaponImprovedCriticalFeat: 66 };
const SCIMITAR: WeaponPreference = { baseItem: 53, label: "Scimitar", weaponFocusFeat: 105, weaponSpecializationFeat: 143, weaponImprovedCriticalFeat: 67 };
const SICKLE: WeaponPreference = { baseItem: 60, label: "Sickle", weaponFocusFeat: 98, weaponSpecializationFeat: 136, weaponImprovedCriticalFeat: 60 };
const MORNINGSTAR: WeaponPreference = { baseItem: 47, label: "Morningstar", weaponFocusFeat: 95, weaponSpecializationFeat: 133, weaponImprovedCriticalFeat: 57 };
const LIGHT_MACE: WeaponPreference = { baseItem: 9, label: "Light Mace", weaponFocusFeat: 94, weaponSpecializationFeat: 132, weaponImprovedCriticalFeat: 56 };
const DAGGER: WeaponPreference = { baseItem: 22, label: "Dagger", weaponFocusFeat: 90, weaponSpecializationFeat: 128, weaponImprovedCriticalFeat: 52 };
const LONGBOW: WeaponPreference = { baseItem: 8, label: "Longbow", weaponFocusFeat: 101, weaponSpecializationFeat: 139, weaponImprovedCriticalFeat: 63 };
const SHORTBOW: WeaponPreference = { baseItem: 11, label: "Shortbow", weaponFocusFeat: 102, weaponSpecializationFeat: 140, weaponImprovedCriticalFeat: 64 };
const SHORTSWORD: WeaponPreference = { baseItem: 0, label: "Shortsword", weaponFocusFeat: 103, weaponSpecializationFeat: 141, weaponImprovedCriticalFeat: 65 };
const HEAVY_CROSSBOW: WeaponPreference = { baseItem: 6, label: "Heavy Crossbow", weaponFocusFeat: 92, weaponSpecializationFeat: 130, weaponImprovedCriticalFeat: 54 };

/**
 * class ID (classes.2da row, 0-10) -> a short list of proficiency-safe
 * candidate weapons. `null` for Monk: it fights unarmed, which has its own
 * feat.2da row family (WeapFocUnArm/WeapSpeUnArm/ImpCritUnArm, baseitem 255,
 * FEAT_WEAPON_FOCUS_CREATURE-adjacent) rather than a normal weapon chain — not
 * verified for this table yet, so left unset rather than guessed.
 */
export const CLASS_WEAPON_PREFERENCES: Record<number, WeaponPreference[] | null> = {
  0: [GREATAXE, BATTLEAXE, WARHAMMER], // Barbarian — WeapProfMar+WeapProfSim (full martial)
  1: [SICKLE, MORNINGSTAR, DAGGER], // Bard — WeapProfSim only (see header: Rapier was a mismatch)
  2: [MORNINGSTAR, LIGHT_MACE, QUARTERSTAFF], // Cleric — WeapProfSim only (see header: Warhammer was a mismatch)
  3: [QUARTERSTAFF, SICKLE, SCIMITAR], // Druid — WeapProfDruid
  4: [LONGSWORD, BATTLEAXE, WARHAMMER], // Fighter — full martial
  5: null, // Monk
  6: [LONGSWORD, WARHAMMER, SCIMITAR], // Paladin — full martial
  7: [LONGBOW, SHORTBOW, SCIMITAR], // Ranger — full martial
  8: [RAPIER, SHORTSWORD, SHORTBOW], // Rogue — WeapProfRogue
  9: [QUARTERSTAFF, DAGGER, SICKLE], // Sorcerer — WeapProfSim only
  10: [QUARTERSTAFF, DAGGER, HEAVY_CROSSBOW], // Wizard — WeapProfWizard
};

/**
 * Deterministic string hash (FNV-1a, 32-bit) — this project generates
 * reproducible content, never rolls dice, so weapon variety has to come from
 * a stable function of the creature's own identity, not Math.random().
 */
function seedHash(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Pick one candidate from CLASS_WEAPON_PREFERENCES[classId], deterministically
 * by seed (a creature's tag or resref) — the same creature always gets the
 * same weapon on every regeneration, but different same-class creatures
 * spread across the class's candidate list instead of all converging on one
 * default. Returns null for a class with no candidates (Monk) or an unknown
 * class ID.
 */
export function pickWeaponPreference(classId: number, seed: string): WeaponPreference | null {
  const candidates = CLASS_WEAPON_PREFERENCES[classId];
  if (!candidates || candidates.length === 0) return null;
  return candidates[seedHash(seed) % candidates.length];
}

/** Universal filler feats for generic/bonus feat slots with no weapon left to pick — verified feat.2da rows. */
export const TOUGHNESS_FEAT = 40;
export const CLEAVE_FEAT = 6;
export const DODGE_FEAT = 10;
