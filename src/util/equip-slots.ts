/**
 * Equipment slot constants shared between blueprint creation and creature equipment tools.
 */

/** Equipment slot name → __struct_id bitmask */
export const EQUIP_SLOT_MAP: Record<string, number> = {
  head: 1, chest: 2, boots: 4, arms: 8,
  righthand: 16, lefthand: 32, cloak: 64,
  leftring: 128, rightring: 256, neck: 512,
  belt: 1024, arrows: 2048, bullets: 4096, bolts: 8192,
  // Creature-only slots (claws, bite, hide). Masks verified against 505 real
  // Frozen North creature blueprints: 16384 (150 uses), 32768 (125), 65536 (159),
  // 131072 (219).
  cweapon_l: 16384, cweapon_r: 32768, cweapon_b: 65536, hide: 131072,
};

/** __struct_id bitmask → slot name (reverse map) */
export const EQUIP_SLOT_NAMES: Record<number, string> = Object.fromEntries(
  Object.entries(EQUIP_SLOT_MAP).map(([name, id]) => [id, name]),
);
