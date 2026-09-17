/**
 * Encounter difficulty math for get_balance_report's partyLevel feature.
 *
 * See docs/encounter-difficulty-findings.md for the full research trail —
 * what's a direct DMG quote, what's cross-validated against secondary
 * sources, what's derived from a real corpus, and what's still an open
 * scope limit. Summary:
 *
 *  - combineSameCREL: the D&D 3.5 DMG's real "Table 3-1: Encounter Numbers"
 *    rule for N identical-CR creatures fighting as one group. Verified
 *    against a literal DMG quote surfaced via search ("two creatures of the
 *    same CR = EL+2", matching adventure-challenges/SKILL.md's own stated
 *    rule) and cross-checked against two independent secondary-source
 *    tables — every value either table reports is reproduced exactly by
 *    `cr + round(2 * log2(count))`. NOT verified for MIXED-CR groups — the
 *    real DMG's pairwise "how much does a weaker creature add" rule wasn't
 *    found through any accessible source, so this project deliberately
 *    reports one EL per same-CR cluster rather than collapsing a mixed group
 *    into one fabricated number.
 *
 *  - estimateCRFromLevel: CR ≈ total character level, confirmed against 505
 *    real, well-balanced creatures from ~/tfndev (a mature, actively-played
 *    PW) — every base class's mean(CR - level) sits within +/-0.3 across the
 *    reliable level 1-11 sample, no class needs its own correction. Only
 *    used when a creature's real ChallengeRating is 0/unset (the
 *    create_encounter_blueprint hardcoded-CR-0 gap verify_all already
 *    flags as `encounter_cr_unset`) — never overrides a real, non-zero CR.
 *
 *  - bandDifficulty: the EL/APL bands already documented in
 *    adventure-challenges/SKILL.md ("EL=APL is a standard encounter",
 *    "EL=APL+4 risks a character death; reserve for the boss").
 */

/**
 * EL adjustment for `count` identical-CR creatures fighting as one group.
 * `count <= 1` returns `cr` unchanged (a single creature's EL is its own CR).
 */
export function combineSameCREL(cr: number, count: number): number {
  if (count <= 1) return cr;
  return cr + Math.round(2 * Math.log2(count));
}

/** CR ≈ total character level — see the module doc comment for the real-data backing. */
export function estimateCRFromLevel(totalLevel: number): number {
  return totalLevel;
}

export type DifficultyLabel = "trivial" | "easy" | "standard" | "hard" | "deadly";

/**
 * Bands an Encounter Level against average party level (APL). Thresholds are
 * this project's own two documented anchors (adventure-challenges/SKILL.md):
 * EL=APL -> "standard", EL=APL+4 -> "deadly, reserve for the boss". The
 * intermediate "easy"/"hard" bands are a straightforward symmetric fill
 * between those two anchors, not independently sourced.
 */
export function bandDifficulty(el: number, partyLevel: number): DifficultyLabel {
  const diff = el - partyLevel;
  if (diff <= -4) return "trivial";
  if (diff <= -1) return "easy";
  if (diff <= 1) return "standard";
  if (diff <= 3) return "hard";
  return "deadly";
}

export interface HostileCluster {
  /** Effective CR — real ChallengeRating, or the estimated fallback. */
  cr: number;
  count: number;
  el: number;
  /** True if one or more creatures in this cluster had no real CR and were estimated. */
  anyEstimatedCR: boolean;
  tags: string[];
}

/**
 * Group hostile (faction-1) creatures by effective CR and compute each
 * cluster's EL via combineSameCREL. Does NOT combine different-CR clusters
 * into one number — see the module doc comment's scope limit. Sorted by EL
 * descending, so the most dangerous cluster is first.
 */
export function clusterHostiles(
  creatures: Array<{ tag: string; cr: number; classes: Array<{ level: number }> }>,
): HostileCluster[] {
  const byCR = new Map<number, { tags: string[]; estimated: boolean[] }>();
  for (const c of creatures) {
    const totalLevel = c.classes.reduce((sum, cl) => sum + cl.level, 0);
    const estimated = c.cr <= 0;
    const effectiveCR = estimated ? estimateCRFromLevel(totalLevel) : c.cr;
    const bucket = byCR.get(effectiveCR) ?? { tags: [], estimated: [] };
    bucket.tags.push(c.tag);
    bucket.estimated.push(estimated);
    byCR.set(effectiveCR, bucket);
  }

  const clusters: HostileCluster[] = [];
  for (const [cr, bucket] of byCR) {
    clusters.push({
      cr,
      count: bucket.tags.length,
      el: combineSameCREL(cr, bucket.tags.length),
      anyEstimatedCR: bucket.estimated.some(Boolean),
      tags: bucket.tags,
    });
  }
  return clusters.sort((a, b) => b.el - a.el);
}
