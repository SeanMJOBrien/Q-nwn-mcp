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
 *
 *  - solveSameCRCount / planSupportCluster: the reverse direction — given a
 *    target EL, how many creatures does it take, instead of auditing a
 *    roster that already exists. See docs/encounter-composer-spec.md (F2)
 *    for the feature this was planned under. Deliberately does NOT attempt
 *    a mixed-CR "boss + weaker support = one combined EL" formula — the
 *    real DMG rule for that was never found through any accessible source
 *    (see combineSameCREL's own note above), so planSupportCluster reports
 *    the boss's own EL and a same-CR support cluster's own EL as two
 *    separate numbers, exactly mirroring clusterHostiles's existing
 *    per-cluster (not per-fight) convention — never a fabricated combined
 *    figure.
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

/**
 * The exact inverse of combineSameCREL: the minimum count of same-CR
 * creatures whose combined EL reaches or exceeds `targetEL`. Since
 * combineSameCREL is non-decreasing in count, this is a direct forward scan
 * (count = 1, 2, 3, ...), not a search — there's no case where a larger
 * count produces a lower EL. `count` is always >= 1 (you can't have zero
 * creatures and still call it a support cluster); if `cr` alone already
 * meets or exceeds `targetEL`, this correctly returns `{ count: 1,
 * achievedEL: cr }` — the caller decides whether a single creature was
 * even necessary by comparing `cr` to `targetEL` directly.
 *
 * Bounded at 256 creatures as a sanity guard — the EL-vs-count curve grows
 * logarithmically (each doubling adds exactly +2 EL, confirmed above), so a
 * realistic EL gap (even the full deadly-encounter range this project
 * bands, APL+4) never approaches this; hitting the bound means `targetEL`
 * or `cr` is a degenerate input, not a real encounter design.
 */
export function solveSameCRCount(cr: number, targetEL: number): { count: number; achievedEL: number } {
  let count = 1;
  let achievedEL = combineSameCREL(cr, count);
  while (achievedEL < targetEL && count < 256) {
    count++;
    achievedEL = combineSameCREL(cr, count);
  }
  return { count, achievedEL };
}

export interface SupportClusterPlan {
  /** Whether the boss's own CR already meets or exceeds targetEL on its own. */
  bossAloneSufficient: boolean;
  /** The boss's own EL contribution (always just its CR — a single creature). */
  bossEL: number;
  /**
   * The support cluster's own count/EL — present only when a cluster was
   * actually asked for (supportCR given) and the boss alone wasn't already
   * sufficient. Its EL is reported standalone, NOT combined with bossEL —
   * see the module doc comment's scope limit.
   */
  support: { cr: number; count: number; achievedEL: number } | null;
}

/**
 * Plan a support cluster for a named "boss" creature against a target EL.
 * Deliberately returns the boss's and the support cluster's EL as two
 * separate figures rather than one fabricated combined number — see the
 * module doc comment. When the boss alone already meets or exceeds
 * `targetEL`, `support` is `null` — this function's only job is answering
 * "is support needed, and if so how much"; a caller that wants a thematic
 * escort anyway even when none is strictly required (F3's job, not this
 * one) can ignore `bossAloneSufficient` and ask for one directly.
 */
export function planSupportCluster(bossCR: number, targetEL: number, supportCR: number): SupportClusterPlan {
  const bossAloneSufficient = bossCR >= targetEL;
  if (bossAloneSufficient) {
    return { bossAloneSufficient, bossEL: bossCR, support: null };
  }
  const { count, achievedEL } = solveSameCRCount(supportCR, targetEL);
  return {
    bossAloneSufficient,
    bossEL: bossCR,
    support: { cr: supportCR, count, achievedEL },
  };
}

export type DifficultyLabel = "trivial" | "easy" | "standard" | "hard" | "deadly";

/**
 * Bands an Encounter Level against average party level (APL). Thresholds are
 * this project's own two documented anchors (adventure-challenges/SKILL.md):
 * EL=APL -> "standard", EL=APL+4 -> "deadly, reserve for the boss". The
 * intermediate "easy"/"hard" bands are a straightforward symmetric fill
 * between those two anchors, not independently sourced.
 *
 * Deliberately takes no party-SIZE argument, only level. The DMG's EL/CR
 * system is calibrated to a 4-character party, and a smaller/larger party
 * should in principle shift the effective difficulty — but a real research
 * pass for docs/encounter-composer-spec.md's F4 turned up three mutually
 * contradictory secondary-source claims for the exact adjustment (a flat
 * +-1 EL per character above/below 4; a non-linear -2/-1/0/+1/+2 table for
 * 1/2/3/5/6 PCs; and a separate claim that only 5-6 PCs is +1 and 7-9 is
 * +2), with no DMG page number any source could actually quote. Per this
 * project's "never guess" convention, no formula is applied — F4
 * (compose_encounter's allyRecommendation) surfaces partySize only as a
 * plain, undemonstrated-magnitude caveat, never folds it into the band.
 */
export function bandDifficulty(el: number, partyLevel: number): DifficultyLabel {
  const diff = el - partyLevel;
  if (diff <= -4) return "trivial";
  if (diff <= -1) return "easy";
  if (diff <= 1) return "standard";
  if (diff <= 3) return "hard";
  return "deadly";
}

/** Severity order for DifficultyLabel, for picking the worse of two bands (e.g. boss vs. support cluster). */
export function difficultyRank(label: DifficultyLabel): number {
  return { trivial: 0, easy: 1, standard: 2, hard: 3, deadly: 4 }[label];
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
