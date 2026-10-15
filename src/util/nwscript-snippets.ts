/**
 * Small, shared NWScript source snippets used by more than one generator in
 * this project. Exists specifically to stop a bug class from being
 * reintroduced independently per generator — see classPositionRollLoop's
 * own doc comment for the concrete example that motivated this file.
 */

/**
 * The "roll every real class position" loop body shared by
 * inc_random_abil.nss's RA_OnSpawn and inc_spec_ability.nss's SA_OnSpawn.
 *
 * GetClassByPosition/GetLevelByPosition's nClassPosition is 1-indexed (1, 2,
 * or 3 — confirmed from nwscript.nss's own doc comment: "a single-class
 * creature will only have a value in nClassLocation=1"). Before this was
 * shared, BOTH generators independently hand-wrote a 0..2 loop — a real,
 * confirmed bug (found 2026-10-15 via run_live_verification, see CLAUDE.md)
 * that wasted iteration 0 (always CLASS_TYPE_INVALID) and silently never
 * rolled position 3 for a genuine triple-multiclass creature. Single- and
 * dual-class creatures were accidentally unaffected, since positions 1-2
 * still fell inside the old 0..2 range — which is exactly why the bug went
 * unnoticed through every prior live test. Centralizing the loop here means
 * a future fix, or a future third generator needing the same pattern,
 * cannot reintroduce this independently.
 *
 * @param varName the loop counter's variable name (each generator picks its
 *   own, e.g. "i" or "p", to avoid colliding with a variable already in
 *   scope at the call site).
 * @param rollFnName the per-class-position roll function to call, e.g.
 *   "RA_RollClass" or "SA_RollClass".
 */
export function classPositionRollLoop(varName: string, rollFnName: string): string {
  return `int ${varName};
    for (${varName} = 1; ${varName} <= 3; ${varName}++)
        ${rollFnName}(oCreature, GetClassByPosition(${varName}, oCreature), GetLevelByPosition(${varName}, oCreature));`;
}
