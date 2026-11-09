/** The "name the fix" tails of placement refusals, so a skill doesn't have to repeat them. */

export const WALK_FIX =
  "Fix: move it (adventure_find_walkable / probe_ground find open ground), or lower walkBuffer — 0.5 for furniture against a wall, 0 to check only the point itself.";

export const COLLISION_FIX =
  "Fix: choose another position, or lower collisionRadius to 0.3-0.5 for an intentional grouping (table and chairs, items on a shelf, a campfire ring); 0 disables the check.";

export const STANDARD_FACTIONS: Record<string, number> = { pc: 0, hostile: 1, commoner: 2, merchant: 3, defender: 4 };

/** Parses a faction given as a number or a standard faction name. Returns undefined for anything else. */
export function parseFaction(v: string | undefined): number | undefined {
  if (v === undefined) return undefined;
  const t = v.trim().toLowerCase();
  if (t in STANDARD_FACTIONS) return STANDARD_FACTIONS[t];
  return /^\d+$/.test(t) ? parseInt(t, 10) : undefined;
}

/** Warning for a creature left in the player faction: it fights for the party and hostile creatures ignore it. */
export function factionWarning(faction: number | undefined): string | undefined {
  if (faction === undefined || faction === 0) {
    return "Faction is 0 (the player faction): this creature counts as the party, not as an NPC. Fix: faction \"hostile\" (1) for an enemy, \"commoner\" (2) for an NPC or ambient creature, \"merchant\" (3), \"defender\" (4); a companion recruited later keeps 2.";
  }
  return undefined;
}
