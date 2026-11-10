/**
 * Older modules carry older generated scripts (a `q_act` without the item-gift fix, an `inc_cre_level` with the old gear split,
 * a companion include with a different party cap). `findStaleGenerated` regenerates each known generated script with the
 * parameters the module's own copy was built with and reports the ones that differ, naming the tool that rewrites them,
 * so a stale module is reported instead of discovered in play (TODO 22).
 *
 * Add a generator here by giving it a `regenerate(existing)` that reads its own parameters back out of the existing text.
 */

import { COMPANION_INCLUDE, DEFAULT_MAX_COMPANIONS, generateCompanionScripts } from "./companion-script.js";
import { hasHandEditedHeader } from "./hand-edited.js";
import { generateQuestScripts } from "./quest-script.js";
import { generateRandomAbilitiesInclude } from "./random-abilities-script.js";
import { generateSimInclude, SIM_INCLUDE } from "./sim-script.js";
import { generateSpecAbilityInclude } from "./spec-ability-script.js";
import { generateSpecAssertInclude } from "./spec-assert-script.js";
import { generateSpecCheckInclude } from "./spec-check-script.js";
import { generateCreatureLevelInclude, generateCreatureLevelWrapper } from "./creature-level-script.js";

export interface StaleFinding {
  resref: string;
  /** The tool that regenerates it. */
  tool: string;
  message: string;
}

interface GeneratedScript {
  resref: string;
  tool: string;
  regenerate: (existing: string) => string | undefined;
}

const norm = (s: string): string => s.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "").trim();

export const GENERATED_SCRIPTS: GeneratedScript[] = [
  {
    resref: "inc_cre_level",
    tool: "create_creature_level_system",
    regenerate: (existing) => {
      const stores = /const string CL_STORES = "([^"]*)";/.exec(existing)?.[1];
      const droppable = /const int CL_DROPPABLE = (\d);/.exec(existing)?.[1];
      if (stores === undefined || droppable === undefined) return undefined;
      return generateCreatureLevelInclude({ stores: stores.split(",").filter(Boolean), droppable: droppable === "1" });
    },
  },
  { resref: "cf_spawn", tool: "create_creature_level_system", regenerate: () => generateCreatureLevelWrapper() },
  {
    resref: COMPANION_INCLUDE,
    tool: "create_companion_system",
    regenerate: (existing) => {
      const max = Number(/const int CMP_MAX_COMPANIONS = (\d+);/.exec(existing)?.[1] ?? DEFAULT_MAX_COMPANIONS);
      return generateCompanionScripts({ maxCompanions: max })[COMPANION_INCLUDE];
    },
  },
  {
    resref: "inc_random_abil",
    tool: "create_random_abilities_system",
    regenerate: (existing) => {
      const chance = /int RA_CAST_CHANCE_PERCENT = (\d+);/.exec(existing)?.[1];
      return chance === undefined ? undefined : generateRandomAbilitiesInclude({ castChancePercent: Number(chance) });
    },
  },
  { resref: "inc_spec_ability", tool: "create_spec_ability_system", regenerate: () => generateSpecAbilityInclude() },
  { resref: "inc_spec_check", tool: "create_spec_verification", regenerate: () => generateSpecCheckInclude() },
  { resref: "inc_spec_assert", tool: "create_spec_assertions", regenerate: () => generateSpecAssertInclude() },
  { resref: SIM_INCLUDE, tool: "create_quest_system (or create_companion_system)", regenerate: () => generateSimInclude() },
  // The quest runtime: inc_quest and every entry script (q_chk, q_act, ...) come from one generator with no settings.
  ...Object.keys(generateQuestScripts())
    .filter((name) => name !== SIM_INCLUDE)
    .map((name) => ({ resref: name, tool: "create_quest_system", regenerate: () => generateQuestScripts()[name] })),
  // inc_reward is not listed: its class-item tiers are baked into the code and cannot be read back from the file.
];

/** `sources` maps a script resref to its source text. Only scripts the module actually has are checked. */
export function findStaleGenerated(sources: Map<string, string>): StaleFinding[] {
  const out: StaleFinding[] = [];
  for (const g of GENERATED_SCRIPTS) {
    const existing = sources.get(g.resref);
    if (existing === undefined || hasHandEditedHeader(existing)) continue;
    const fresh = g.regenerate(existing);
    if (fresh === undefined) {
      out.push({ resref: g.resref, tool: g.tool, message: `${g.resref} is not in the current generated form (its settings could not be read back)` });
    } else if (norm(fresh) !== norm(existing)) {
      out.push({ resref: g.resref, tool: g.tool, message: `${g.resref} differs from what the current generator writes (an older or hand-edited copy)` });
    }
  }
  return out;
}
