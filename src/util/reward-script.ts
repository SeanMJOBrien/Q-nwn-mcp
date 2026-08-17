/**
 * Generator for the co-op reward include (`inc_reward` by default).
 *
 * Why this is generated rather than hand-written per module: reward fan-out is
 * the single most common co-op defect, and it is invisible in solo testing. A
 * dialog action script runs once, on the NPC, with one PC as GetPCSpeaker() —
 * so `GiveXPToCreature(GetPCSpeaker(), 500)` rewards exactly one player and
 * silently skips everyone else. Generating the distribution logic once, from a
 * tested template, means no phase of the pipeline has to re-derive it.
 *
 * The default policy is FULL: every player receives 100% of every reward. That
 * matches BioWare's own RewardPartyXP/RewardPartyGP in nw_i0_tool, which loop
 * the party handing each member the *same* amount rather than dividing a pot.
 */

/** How a reward is distributed across the party. */
export type RewardPolicy = "full" | "split" | "speaker";

/** Numeric value baked into the generated include for each policy. */
export const POLICY_CODES: Record<RewardPolicy, number> = {
  full: 0,
  split: 1,
  speaker: 2,
};

/**
 * The eleven base classes, by the name a caller writes in `classItems`.
 *
 * Prestige classes are deliberately absent: every prestige character still has
 * base-class levels, so keying off the highest base class always resolves.
 */
export const BASE_CLASS_TYPES: Record<string, number> = {
  barbarian: 0,
  bard: 1,
  cleric: 2,
  druid: 3,
  fighter: 4,
  monk: 5,
  paladin: 6,
  ranger: 7,
  rogue: 8,
  sorcerer: 9,
  wizard: 10,
};

/** NWScript CLASS_TYPE_* constant name for a base class, for readable output. */
const CLASS_CONSTANTS: Record<string, string> = {
  barbarian: "CLASS_TYPE_BARBARIAN",
  bard: "CLASS_TYPE_BARD",
  cleric: "CLASS_TYPE_CLERIC",
  druid: "CLASS_TYPE_DRUID",
  fighter: "CLASS_TYPE_FIGHTER",
  monk: "CLASS_TYPE_MONK",
  paladin: "CLASS_TYPE_PALADIN",
  ranger: "CLASS_TYPE_RANGER",
  rogue: "CLASS_TYPE_ROGUE",
  sorcerer: "CLASS_TYPE_SORCERER",
  wizard: "CLASS_TYPE_WIZARD",
};

/** One named reward tier and the per-class blueprints it hands out. */
export interface ClassItemTier {
  /** Tier name scripts pass to CoopRewardClassItem, e.g. "boss". */
  tier: string;
  /** Class name (see BASE_CLASS_TYPES) to item blueprint resref. */
  items: Record<string, string>;
  /** Item given to any class with no explicit entry. Omit for "nothing". */
  fallback?: string;
}

export interface RewardSystemOptions {
  policy?: RewardPolicy;
  /** Percentage of the nominal amount each recipient gets. 1-100, default 100. */
  sharePercent?: number;
  classItems?: ClassItemTier[];
  /** Resref the include is written as, so the usage comment names the real file. */
  includeName?: string;
}

export interface ValidationIssue {
  message: string;
  fix: string;
}

/** A resref must fit the 16-character GFF field and carry no exotic characters. */
function checkResref(resref: string, where: string, issues: ValidationIssue[]): void {
  if (resref.length > 16) {
    issues.push({
      message: `${where}: resref "${resref}" is ${resref.length} characters — NWN truncates at 16`,
      fix: "shorten the blueprint resref to 16 characters or fewer",
    });
  }
  if (!/^[a-z0-9_]*$/.test(resref)) {
    issues.push({
      message: `${where}: resref "${resref}" contains characters outside a-z, 0-9 and underscore`,
      fix: "rename the blueprint to lowercase alphanumerics and underscores",
    });
  }
}

/**
 * Validate options before generating. Returns the problems that would produce a
 * script which compiles but misbehaves, so the tool can refuse rather than emit
 * a subtly broken include.
 */
export function validateRewardOptions(opts: RewardSystemOptions): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const share = opts.sharePercent ?? 100;
  if (!Number.isInteger(share) || share < 1 || share > 100) {
    issues.push({
      message: `sharePercent must be a whole number from 1 to 100, got ${share}`,
      fix: "pass 100 for full rewards, or a smaller percentage to scale every payout",
    });
  }

  const seenTiers = new Set<string>();
  for (const tier of opts.classItems ?? []) {
    if (!tier.tier) {
      issues.push({ message: "a tier has an empty name", fix: "give every tier a name scripts can pass" });
      continue;
    }
    if (seenTiers.has(tier.tier)) {
      issues.push({
        message: `tier "${tier.tier}" is defined twice — only the first would ever match`,
        fix: "merge the duplicate tiers into one",
      });
    }
    seenTiers.add(tier.tier);

    if (Object.keys(tier.items).length === 0 && !tier.fallback) {
      issues.push({
        message: `tier "${tier.tier}" has no items and no fallback — it would always return nothing`,
        fix: "add at least one class item or a fallback",
      });
    }

    for (const [className, resref] of Object.entries(tier.items)) {
      if (!(className.toLowerCase() in BASE_CLASS_TYPES)) {
        issues.push({
          message: `tier "${tier.tier}" names unknown class "${className}"`,
          fix: `use one of: ${Object.keys(BASE_CLASS_TYPES).join(", ")}`,
        });
      }
      checkResref(resref, `tier "${tier.tier}", class "${className}"`, issues);
    }
    if (tier.fallback) checkResref(tier.fallback, `tier "${tier.tier}" fallback`, issues);
  }

  return issues;
}

/** Human-readable description of the policy, for the generated header comment. */
function policyComment(policy: RewardPolicy, share: number): string {
  const scaled = share === 100 ? "" : ` scaled to ${share}%`;
  switch (policy) {
    case "full":
      return `FULL — every player in the party receives 100% of each reward${scaled}.\n// A four-player party therefore costs four times the nominal payout. That is\n// the intended co-op behaviour: nobody is penalised for playing together.`;
    case "split":
      return `SPLIT — XP and gold are divided evenly among the players${scaled}.\n// Items cannot be divided, so they go to the triggering PC alone.`;
    case "speaker":
      return `SPEAKER — only the PC who triggered the reward receives it${scaled}.\n// This is a single-player policy; a co-op party will see rewards go to one\n// player. Chosen deliberately, not by default.`;
  }
}

/** Emit the CoopClassItem lookup for the configured tiers. */
function classItemFunction(tiers: ClassItemTier[]): string {
  if (tiers.length === 0) {
    return `// Blueprint resref of the sTier reward suiting oPC's primary class.
// No class tiers were configured, so this always returns "".
string CoopClassItem(object oPC, string sTier)
{
    return "";
}`;
  }

  const branches = tiers
    .map((tier) => {
      const lines = Object.entries(tier.items)
        .filter(([className]) => className.toLowerCase() in BASE_CLASS_TYPES)
        .map(([className, resref]) => {
          const constant = CLASS_CONSTANTS[className.toLowerCase()];
          return `        if (nClass == ${constant}) return "${resref}";`;
        })
        .join("\n");
      const fallback = `        return "${tier.fallback ?? ""}";`;
      return `    if (sTier == "${tier.tier}")\n    {\n${lines}\n${fallback}\n    }`;
    })
    .join("\n");

  return `// Blueprint resref of the sTier reward suiting oPC's primary class.
// Returns "" when the tier is unknown, or when the class has no entry and the
// tier defines no fallback — callers must treat "" as "give nothing".
string CoopClassItem(object oPC, string sTier)
{
    int nClass = CoopPrimaryClass(oPC);
${branches}
    return "";
}`;
}

/**
 * Generate the full NWScript source for the reward include.
 *
 * Globals are declared as plain `int` rather than `const int` to match
 * nwscript.nss's own convention and stay compatible with every compiler.
 */
export function generateRewardInclude(opts: RewardSystemOptions = {}): string {
  const policy = opts.policy ?? "full";
  const share = opts.sharePercent ?? 100;
  const tiers = opts.classItems ?? [];
  const includeName = opts.includeName ?? "inc_reward";

  return `// Co-op reward distribution.
//
// GENERATED by nwn-mcp create_reward_system — do not hand-edit. Re-run the tool
// with different options to change the policy; hand edits are lost and, worse,
// silently diverge from what the verifier expects.
//
// Policy: ${policyComment(policy, share)}
//
// Usage from a quest or dialog action script:
//
//     #include "${includeName}"
//     void main()
//     {
//         object oPC = GetPCSpeaker();
//         CoopRewardQuest(oPC, 250, 100, "boss");
//     }
//
// Every helper takes the *triggering* PC and fans out from there, so callers
// never iterate the party themselves.

// ── Policy, baked in at generation time ────────────────────────────────────
int COOP_POLICY_FULL    = 0;
int COOP_POLICY_SPLIT   = 1;
int COOP_POLICY_SPEAKER = 2;

int COOP_POLICY        = ${POLICY_CODES[policy]};
int COOP_SHARE_PERCENT = ${share};

// ── Party helpers ──────────────────────────────────────────────────────────

// Number of players in oPC's party. Never returns less than 1, so callers can
// divide by it safely. Henchmen and summons are excluded: the TRUE argument to
// GetFirstFactionMember restricts the walk to PCs.
int CoopPartySize(object oPC)
{
    int nCount = 0;
    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        nCount++;
        oMember = GetNextFactionMember(oPC, TRUE);
    }
    if (nCount < 1) nCount = 1;
    return nCount;
}

// Apply COOP_SHARE_PERCENT, never rounding a positive reward down to nothing.
int CoopShare(int nAmount)
{
    if (nAmount <= 0) return 0;
    int nResult = (nAmount * COOP_SHARE_PERCENT) / 100;
    if (nResult < 1) nResult = 1;
    return nResult;
}

// The class oPC has the most levels in, so a multiclass character gets gear
// matching what they actually play rather than whichever class came first.
int CoopPrimaryClass(object oPC)
{
    int nBest = CLASS_TYPE_INVALID;
    int nBestLevel = 0;
    int nClass;
    for (nClass = 0; nClass <= 10; nClass++)
    {
        int nLevel = GetLevelByClass(nClass, oPC);
        if (nLevel > nBestLevel)
        {
            nBestLevel = nLevel;
            nBest = nClass;
        }
    }
    if (nBest == CLASS_TYPE_INVALID) nBest = GetClassByPosition(1, oPC);
    return nBest;
}

// ── Rewards ────────────────────────────────────────────────────────────────

// Award nXP under the configured policy.
void CoopRewardXP(object oPC, int nXP)
{
    if (nXP <= 0) return;

    if (COOP_POLICY == COOP_POLICY_SPEAKER)
    {
        GiveXPToCreature(oPC, CoopShare(nXP));
        return;
    }

    int nEach = nXP;
    if (COOP_POLICY == COOP_POLICY_SPLIT) nEach = nXP / CoopPartySize(oPC);
    nEach = CoopShare(nEach);

    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        GiveXPToCreature(oMember, nEach);
        oMember = GetNextFactionMember(oPC, TRUE);
    }
}

// Award nGold under the configured policy.
void CoopRewardGold(object oPC, int nGold)
{
    if (nGold <= 0) return;

    if (COOP_POLICY == COOP_POLICY_SPEAKER)
    {
        GiveGoldToCreature(oPC, CoopShare(nGold));
        return;
    }

    int nEach = nGold;
    if (COOP_POLICY == COOP_POLICY_SPLIT) nEach = nGold / CoopPartySize(oPC);
    nEach = CoopShare(nEach);

    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        GiveGoldToCreature(oMember, nEach);
        oMember = GetNextFactionMember(oPC, TRUE);
    }
}

// Create sResRef on every player (FULL), or on the triggering PC alone.
// An item cannot be divided, so SPLIT behaves like SPEAKER here.
void CoopRewardItem(object oPC, string sResRef, int nCount = 1)
{
    if (sResRef == "" || nCount <= 0) return;

    if (COOP_POLICY != COOP_POLICY_FULL)
    {
        CreateItemOnObject(sResRef, oPC, nCount);
        return;
    }

    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        CreateItemOnObject(sResRef, oMember, nCount);
        oMember = GetNextFactionMember(oPC, TRUE);
    }
}

${classItemFunction(tiers)}

// Give every player the sTier item matching *their own* primary class, so a
// party of four walks away with four different rewards rather than four copies
// of whatever suited the one who happened to be talking.
void CoopRewardClassItem(object oPC, string sTier)
{
    if (COOP_POLICY != COOP_POLICY_FULL)
    {
        string sSolo = CoopClassItem(oPC, sTier);
        if (sSolo != "") CreateItemOnObject(sSolo, oPC);
        return;
    }

    object oMember = GetFirstFactionMember(oPC, TRUE);
    while (GetIsObjectValid(oMember))
    {
        string sResRef = CoopClassItem(oMember, sTier);
        if (sResRef != "") CreateItemOnObject(sResRef, oMember);
        oMember = GetNextFactionMember(oPC, TRUE);
    }
}

// One call for the common quest-completion case. Pass "" as sTier to skip the
// class item, or 0 for either amount to skip that payout.
void CoopRewardQuest(object oPC, int nXP, int nGold, string sTier = "")
{
    CoopRewardXP(oPC, nXP);
    CoopRewardGold(oPC, nGold);
    if (sTier != "") CoopRewardClassItem(oPC, sTier);
}
`;
}
