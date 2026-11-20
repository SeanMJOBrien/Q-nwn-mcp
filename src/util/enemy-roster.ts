/**
 * Base-game hostile creatures by kind, for build_enemy_group and suggest_encounter. A small model asked for bandits
 * found only the module's own creatures (the Bandit Leader) and placed the boss as a common enemy in three areas (The
 * Old Mill, 2026-11-18). Every resref below was found with list_blueprints (faction 1 = Hostile; CR as the blueprint
 * states it).
 */

export interface RosterCreature {
  resref: string;
  cr: number;
}

export const ENEMY_ROSTER: Record<string, RosterCreature[]> = {
  bandit: [
    { resref: "nw_bandit001", cr: 0.5 },
    { resref: "nw_bandit002", cr: 0.5 },
    { resref: "nw_bandit003", cr: 1 },
    { resref: "nw_bandit004", cr: 3 },
    { resref: "nw_bandit005", cr: 4 },
    { resref: "nw_bandit006", cr: 7 },
    { resref: "nw_bandit007", cr: 11 },
  ],
  skeleton: [{ resref: "nw_skeleton", cr: 0.5 }],
  zombie: [
    { resref: "nw_zombie01", cr: 1 },
    { resref: "nw_zombie02", cr: 1 },
    { resref: "nw_zombieboss", cr: 8 },
  ],
  ghoul: [
    { resref: "nw_ghoul", cr: 2 },
    { resref: "nw_ghoullord", cr: 5 },
  ],
  goblin: [
    { resref: "nw_goblina", cr: 0.25 },
    { resref: "nw_goblinb", cr: 0.25 },
    { resref: "nw_hobgoblin001", cr: 0.25 },
    { resref: "nw_hobgoblin002", cr: 2 },
    { resref: "nw_goblinboss", cr: 11 },
  ],
  orc: [
    { resref: "nw_orca", cr: 0.25 },
    { resref: "nw_orcb", cr: 0.25 },
    { resref: "nw_orcchiefa", cr: 3 },
    { resref: "nw_orcwiza", cr: 4 },
    { resref: "nw_orcboss", cr: 10 },
  ],
  kobold: [
    { resref: "nw_kobold001", cr: 0.33 },
    { resref: "nw_kobold002", cr: 0.33 },
    { resref: "nw_kobold003", cr: 2 },
    { resref: "nw_kobold004", cr: 2 },
  ],
  gnoll: [
    { resref: "nw_gnoll001", cr: 1 },
    { resref: "nw_gnoll002", cr: 3 },
  ],
  bugbear: [
    { resref: "nw_bugbeara", cr: 2 },
    { resref: "nw_bugbearb", cr: 2 },
    { resref: "nw_bugbearboss", cr: 10 },
  ],
  ogre: [
    { resref: "nw_ogre01", cr: 3 },
    { resref: "nw_ogre02", cr: 3 },
    { resref: "nw_ogremage01", cr: 5 },
    { resref: "nw_ogrechief01", cr: 6 },
  ],
  troll: [
    { resref: "nw_troll", cr: 5 },
    { resref: "nw_trollchief", cr: 7 },
  ],
  wolf: [{ resref: "nw_direwolf", cr: 5 }],
  bear: [
    { resref: "nw_bearkodiak", cr: 6 },
    { resref: "nw_bearpolar", cr: 6 },
  ],
  spider: [{ resref: "ks_small_spider", cr: 0.33 }],
  lizardfolk: [{ resref: "lizardfolkscaven", cr: 2 }],
};

/** Words that name a roster kind ("bandits", "undead", "brigands" -> the kind). */
const KIND_WORDS: Record<string, string> = {
  bandits: "bandit",
  brigand: "bandit",
  brigands: "bandit",
  thug: "bandit",
  thugs: "bandit",
  raider: "bandit",
  raiders: "bandit",
  outlaw: "bandit",
  outlaws: "bandit",
  skeletons: "skeleton",
  undead: "skeleton",
  zombies: "zombie",
  ghouls: "ghoul",
  goblins: "goblin",
  hobgoblin: "goblin",
  hobgoblins: "goblin",
  orcs: "orc",
  kobolds: "kobold",
  gnolls: "gnoll",
  bugbears: "bugbear",
  ogres: "ogre",
  trolls: "troll",
  wolves: "wolf",
  direwolf: "wolf",
  bears: "bear",
  spiders: "spider",
  lizardmen: "lizardfolk",
  monster: "ogre",
  monsters: "ogre",
};

/** The roster kind a word names, or undefined. */
export function rosterKind(word: string): string | undefined {
  const w = word.toLowerCase().trim();
  if (ENEMY_ROSTER[w]) return w;
  if (KIND_WORDS[w]) return KIND_WORDS[w];
  const single = w.replace(/e?s$/, "");
  return ENEMY_ROSTER[single] ? single : undefined;
}

/**
 * Creatures and count for a fight of encounter level ~= the party level: n creatures of CR c make EL ~= c + 2 log2(n),
 * so n = 2^((level - c) / 2). Picks the strongest creature that still gives a group of 2-6 (or the weakest when none
 * does), alternating its variants of the same CR; a given count is kept.
 */
export function pickGroup(kind: string, level: number, count?: number): RosterCreature[] {
  const pool = ENEMY_ROSTER[kind] ?? [];
  if (!pool.length) return [];
  const byCr = [...pool].sort((a, b) => b.cr - a.cr);
  const groupSize = (c: number) => Math.round(2 ** ((level - effectiveCr(c)) / 2));
  let pick = byCr.find((c) => c.cr <= level && groupSize(c.cr) >= 2 && groupSize(c.cr) <= 6) ?? byCr.find((c) => c.cr <= level) ?? byCr[byCr.length - 1];
  const n = Math.max(1, Math.min(12, count ?? Math.max(1, Math.min(6, groupSize(pick.cr)))));
  if (count !== undefined && count > 0) {
    // With a count, the creature that fits that many: EL ~= c + 2 log2(n) -> c = level - 2 log2(n).
    const want = level - 2 * Math.log2(n);
    pick = byCr.reduce((best, c) => (Math.abs(effectiveCr(c.cr) - want) < Math.abs(effectiveCr(best.cr) - want) ? c : best), byCr[0]);
  }
  const variants = pool.filter((c) => c.cr === pick.cr);
  return Array.from({ length: n }, (_, i) => variants[i % variants.length]);
}

/**
 * A CR on the scale where doubling the creatures adds 2: below 1, four CR 1/4 creatures make CR 1, so CR c counts as
 * 1 + 2 log2(c) (1/2 -> -1, 1/4 -> -3).
 */
export function effectiveCr(cr: number): number {
  return cr >= 1 ? cr : 1 + 2 * Math.log2(Math.max(cr, 0.1));
}

/** The encounter level of a group: the strongest creature's CR plus 2 per doubling of the group. */
export function groupEncounterLevel(crs: number[]): number {
  if (!crs.length) return 0;
  const el = Math.max(...crs.map(effectiveCr)) + 2 * Math.log2(crs.length);
  return Math.round(Math.max(el, 0) * 10) / 10;
}

/** The enemy groups a plot challenge line names: "2 bandits, 1 trap" -> [{kind: bandit, count: 2}]. */
export function challengeGroups(text: string): Array<{ kind: string; count?: number; word: string }> {
  const out: Array<{ kind: string; count?: number; word: string }> = [];
  for (const m of text.toLowerCase().matchAll(/(?:(\d+)\s+)?([a-z]+)/g)) {
    const kind = rosterKind(m[2]);
    if (kind && !out.some((g) => g.kind === kind)) out.push({ kind, ...(m[1] ? { count: Number(m[1]) } : {}), word: m[2] });
  }
  return out;
}
