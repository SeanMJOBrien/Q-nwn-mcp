/**
 * Script-content checkers.
 *
 * These read .nss source rather than GFF, and catch defects the compiler cannot:
 * code that compiles and runs but is wrong for the module's play context.
 *
 * The main rule here is the co-op / multiplayer reward rule. In a party, a
 * dialog action script runs once, on the NPC, with exactly one PC as
 * GetPCSpeaker(). Any reward handed to that object alone reaches one player and
 * silently skips everyone else. On a solo playthrough this is invisible — which
 * is precisely why it survives to multiplayer.
 */

import type { ModuleIndex } from "../../types/module.js";
import { loadScriptSources, type Report } from "./common.js";

/** Functions that hand something to a single creature. */
const REWARD_FUNCTIONS = [
  "GiveXPToCreature",
  "GiveGoldToCreature",
  "CreateItemOnObject",
  "RewardPartyXP",
  "RewardPartyGP",
  "SetXP",
  "GiveItem",
];

/**
 * Party-iteration idioms that prove the script fans a reward out.
 *
 * RewardPartyXP/RewardPartyGP (nw_i0_tool) qualify because they loop the party
 * handing each member the *same* amount — they do not divide a pot. The Coop*
 * helpers from the generated inc_reward include do the same under the FULL
 * policy, and own the decision under the others.
 */
const PARTY_ITERATION_PATTERNS = [
  /GetFirstFactionMember\s*\(/,
  /GetNextFactionMember\s*\(/,
  /GetFirstPC\s*\(/,
  /GetNextPC\s*\(/,
  /RewardPartyXP\s*\(/,
  /RewardPartyGP\s*\(/,
  /CoopReward(?:XP|Gold|Item|ClassItem|Quest)\s*\(/,
];

/** Single-PC sources that, used alone, reward only one player. */
const SINGLE_PC_PATTERNS = [
  /GetPCSpeaker\s*\(/,
  /GetLastUsedBy\s*\(/,
  /GetEnteringObject\s*\(/,
  /GetLastOpenedBy\s*\(/,
  /GetLastDisarmed\s*\(/,
];

export interface ScriptFinding {
  resref: string;
  line: number;
  snippet: string;
}

export interface CoopOptions {
  /**
   * When false, co-op findings are reported as warnings rather than errors.
   *
   * Co-op is the default assumption, but single-player modules are explicitly
   * in scope for this project, and a deliberately personal reward should not
   * make an otherwise sound module unshippable.
   */
  enforce?: boolean;

  /**
   * Scripts that are per-player by construction and must not be flagged.
   *
   * The module's OnClientEnter handler runs once for *each* connecting player,
   * so `GiveGoldToCreature(GetEnteringObject(), n)` there reaches everybody —
   * one player at a time. Fanning it out across the party would be the actual
   * bug: every connect would pay the whole party again.
   *
   * This is deliberately narrow. An *area* OnEnter fires for whoever crosses the
   * boundary first and genuinely does need to fan out, so only the module-level
   * client-enter handler qualifies.
   */
  perPlayerScripts?: ReadonlySet<string>;
}

/** Report an error normally, or a warning when co-op enforcement is off. */
function emitter(report: Report, opts: CoopOptions) {
  return opts.enforce === false ? report.warn.bind(report) : report.error.bind(report);
}

/** Remove commented-out code so it can't trigger a finding. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
}

/**
 * Strip comments and blank out string literals, so a function name mentioned in
 * a line of dialogue can't be mistaken for a call.
 *
 * Only for checks that match on function names. Checks that need to read a
 * string argument (a quest tag, say) must use stripComments alone.
 */
function stripNoise(source: string): string {
  return stripComments(source).replace(/"(?:[^"\\]|\\.)*"/g, '""');
}

/**
 * Check every module script that hands out a reward for party coverage.
 *
 * Co-op is the default assumption for every module, so a single-target reward is
 * an error, not a warning. The failure mode is invisible in solo testing and
 * only appears when a second player joins — exactly the bug class that must not
 * ship. A deliberately personal reward should be made explicit by iterating the
 * party and filtering, rather than by rewarding only the speaker.
 */
export async function verifyPartyRewards(
  report: Report,
  index: ModuleIndex,
  opts: CoopOptions = {},
): Promise<void> {
  const sources = await loadScriptSources(index);
  const emit = emitter(report, opts);

  for (const [resref, raw] of sources) {
    if (opts.perPlayerScripts?.has(resref.toLowerCase())) continue;

    const source = stripNoise(raw);

    const rewardCalls = REWARD_FUNCTIONS.filter((fn) => new RegExp(`\\b${fn}\\s*\\(`).test(source));
    if (rewardCalls.length === 0) continue;

    const iteratesParty = PARTY_ITERATION_PATTERNS.some((p) => p.test(source));
    if (iteratesParty) continue;

    const usesSinglePC = SINGLE_PC_PATTERNS.some((p) => p.test(source));
    if (!usesSinglePC) continue;

    emit(
      "reward_not_party_wide",
      `Script "${resref}" calls ${rewardCalls.join(", ")} against a single PC (GetPCSpeaker/GetLastUsedBy/GetEnteringObject) with no party iteration — in co-op only that one player is rewarded and the rest silently get nothing`,
      resref,
      'call CoopRewardXP/CoopRewardGold/CoopRewardItem from the generated inc_reward include (create_reward_system), or loop GetFirstFactionMember(oPC, TRUE) / GetNextFactionMember(oPC, TRUE) yourself',
    );
  }
}

/**
 * Check journal awards for the party flag.
 *
 * AddJournalQuestEntry's 4th parameter (bAllPartyMembers) defaults to TRUE, so
 * the common case is safe — but explicitly passing FALSE gives only the speaker
 * the journal entry while everyone else keeps a stale quest state.
 */
export async function verifyJournalPartyFlags(
  report: Report,
  index: ModuleIndex,
  opts: CoopOptions = {},
): Promise<void> {
  const sources = await loadScriptSources(index);
  const emit = emitter(report, opts);
  // AddJournalQuestEntry(tag, id, oPC, bAllPartyMembers, ...) — 4th arg.
  // The oPC argument is commonly a call like GetPCSpeaker(), so the character
  // class must allow parentheses; only a comma ends that argument.
  const pattern = /AddJournalQuestEntry\s*\(\s*"([^"]+)"\s*,\s*\d+\s*,\s*[^,]+,\s*(FALSE|0)\b/g;

  for (const [resref, raw] of sources) {
    for (const match of stripComments(raw).matchAll(pattern)) {
      emit(
        "journal_not_party_wide",
        `Script "${resref}" awards quest "${match[1]}" with bAllPartyMembers=FALSE — in co-op only one player's journal advances, leaving the rest unable to complete the quest`,
        resref,
        "pass TRUE (or omit the argument — it defaults to TRUE)",
      );
    }
  }
}

/**
 * Check that quest state stored in local variables is not written to a single PC.
 *
 * SetLocalInt(GetPCSpeaker(), ...) stores progress on one player. A second
 * player who then talks to the NPC reads 0 and sees the quest as never started —
 * the party desynchronises. Module-scoped state (or state on the quest giver)
 * keeps every player in the same place in the quest.
 */
export async function verifyPartyQuestState(
  report: Report,
  index: ModuleIndex,
  _opts: CoopOptions = {},
): Promise<void> {
  // Already a warning at every enforcement level, so CoopOptions is accepted
  // only to keep the three co-op checkers callable through one signature.
  const sources = await loadScriptSources(index);
  const pattern =
    /\bSet(?:Local)(?:Int|String|Float|Object)\s*\(\s*(GetPCSpeaker|GetLastUsedBy|GetEnteringObject)\s*\(/g;

  for (const [resref, raw] of sources) {
    const seen = new Set<string>();
    for (const match of stripNoise(raw).matchAll(pattern)) {
      if (seen.has(match[1])) continue;
      seen.add(match[1]);
      report.warn(
        "quest_state_on_single_pc",
        `Script "${resref}" stores quest state on ${match[1]}() — in co-op each player carries their own copy, so progress made by one is invisible to the others`,
        resref,
        "store shared quest state on GetModule() or the quest giver, or write it to every party member",
      );
    }
  }
}
