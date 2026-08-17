/**
 * Wealth-by-level: how much gear value a character should carry.
 *
 * Source: D&D 3.5 Dungeon Master's Guide, Table 5-1 "Character Wealth by Level"
 * (p. 135). NWN is built on the 3.0/3.5 ruleset, so this is the closest thing to
 * an authoritative answer for "what should a level N character be carrying".
 *
 * IMPORTANT — this is a *budget*, not a price list. NWN does not use 3.5e item
 * pricing: the engine derives an item's cost from its properties via
 * itempropdef.2da's Cost column and the cost tables. Measured against the game's
 * own blueprints, a +1 longsword is 1,648 gp in NWN where the 3.5e formula gives
 * ~2,315. So spend these budgets against *actual blueprint costs* read from the
 * module or resman — never against a computed 3.5e price.
 */

/**
 * Total gp value of gear a PC of each level is expected to carry.
 * Index is character level; index 0 is unused.
 *
 * Level 1 is deliberately 0: the DMG gives 1st-level characters starting gold by
 * class from the Player's Handbook rather than a wealth total, so there is no
 * single correct number. Callers wanting a level-1 figure should pass an explicit
 * one — see STARTING_GOLD_LEVEL_1.
 */
export const WEALTH_BY_LEVEL: readonly number[] = [
  0, // unused
  0, // 1 — by class, see STARTING_GOLD_LEVEL_1
  900,
  2_700,
  5_400,
  9_000,
  13_000,
  19_000,
  27_000,
  36_000,
  49_000,
  66_000,
  88_000,
  110_000,
  150_000,
  200_000,
  260_000,
  340_000,
  440_000,
  580_000,
  760_000,
];

/**
 * A workable level-1 figure, since the DMG declines to give one.
 *
 * CONVENTION, not rule: PHB starting gold runs roughly 70-200 gp depending on
 * class. 150 sits mid-range and buys a weapon, armour and a little kit.
 */
export const STARTING_GOLD_LEVEL_1 = 150;

/** Highest level the DMG table covers here. */
export const MAX_WEALTH_LEVEL = 20;

/**
 * How a character relates to the party in combat, which governs how much of the
 * PC budget they get.
 *
 * CONVENTION. The DMG's own NPC gear table is a separate, lower set of values
 * that this project has not verified, so these shares are a documented stand-in
 * rather than a transcription. One genuine 3.5e rule anchors the top of the
 * scale: a classed NPC given gear equal to full PC wealth is worth **CR +1**
 * over its nominal CR. Treat "elite" as exactly that trade.
 */
export type GearRole = "pc" | "elite" | "standard" | "mook";

export const ROLE_SHARE: Record<GearRole, number> = {
  /** A player character, or a companion expected to pull equal weight. */
  pc: 1,
  /** Named enemy or boss. Full PC wealth — counts as CR +1. */
  elite: 1,
  /** A competent rank-and-file opponent. */
  standard: 0.5,
  /** Fodder, present to be outnumbered. */
  mook: 0.25,
};

/** PC gear budget in gp for a given level, clamped to the table's range. */
export function wealthByLevel(level: number): number {
  if (!Number.isFinite(level)) return 0;
  const clamped = Math.max(1, Math.min(MAX_WEALTH_LEVEL, Math.floor(level)));
  if (clamped === 1) return STARTING_GOLD_LEVEL_1;
  return WEALTH_BY_LEVEL[clamped];
}

/** Gear budget for a character at `level` filling `role`. */
export function gearBudget(level: number, role: GearRole = "pc"): number {
  return Math.round(wealthByLevel(level) * ROLE_SHARE[role]);
}

/**
 * The enhancement bonus a character of this level can plausibly be carrying.
 *
 * CONVENTION, derived from the budget rather than stated in any book: at each
 * level, roughly half the budget goes on the primary weapon or armour, and NWN's
 * own blueprint costs set what that buys (+1 ≈ 1.6k, +2 ≈ 7.2k, +3 ≈ 16.9k for a
 * longsword). Use it to pick a tier, then confirm the actual blueprint cost.
 */
export function expectedEnhancement(level: number): number {
  if (level <= 2) return 0;
  if (level <= 5) return 1;
  if (level <= 8) return 2;
  if (level <= 12) return 3;
  if (level <= 16) return 4;
  return 5;
}

/**
 * Split a gear budget across equipment slots.
 *
 * CONVENTION. The shape matters more than the exact percentages: a character
 * whose whole budget went on a weapon is as wrong as one with none. Reserving a
 * consumables slice keeps generated NPCs from being all statline and no tactics.
 */
export const SLOT_SHARE: Record<string, number> = {
  weapon: 0.35,
  armor: 0.3,
  shield: 0.1,
  accessories: 0.15,
  consumables: 0.1,
};

export interface BudgetBreakdown {
  level: number;
  role: GearRole;
  total: number;
  expectedEnhancement: number;
  slots: Record<string, number>;
}

/** Full budget breakdown for a character, ready to shop against. */
export function budgetBreakdown(level: number, role: GearRole = "pc"): BudgetBreakdown {
  const total = gearBudget(level, role);
  const slots: Record<string, number> = {};
  for (const [slot, share] of Object.entries(SLOT_SHARE)) {
    slots[slot] = Math.round(total * share);
  }
  return {
    level: Math.max(1, Math.min(MAX_WEALTH_LEVEL, Math.floor(level))),
    role,
    total,
    expectedEnhancement: expectedEnhancement(level),
    slots,
  };
}
