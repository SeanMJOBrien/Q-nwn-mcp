/**
 * Random-caster-abilities tool.
 *
 * Generates the `inc_random_abil` include whose RA_OnSpawn/RA_OnEndRound
 * functions pick a caster NPC's spells fresh, in NWScript, every time the
 * module loads — see src/util/random-abilities-script.ts for the full design
 * (the Tier 1/Tier 2 split, the verified engine functions/2DA columns it
 * relies on, and the wiring pattern).
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { generateRandomAbilitiesInclude, validateRandomAbilitiesOptions } from "../util/random-abilities-script.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { optNumParam, toI } from "../util/params.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_ra_probe";

/**
 * An include has no main(), so the compiler rejects it on its own. Compiling a
 * throwaway script that includes it is the only way to prove the generated
 * source is valid before it reaches a real caller. Mirrors reward-tools.ts's
 * compileProbe() exactly — same temp-dir placement, same cleanup.
 */
async function compileProbe(index: ModuleIndex, includeName: string): Promise<{ ok: boolean; output: string }> {
  const source = `#include "${includeName}"

void main()
{
    RA_OnSpawn(OBJECT_SELF);
    RA_OnEndRound(OBJECT_SELF);
}
`;
  const result = await writeAndCompileScript(index, PROBE_RESREF, source, true);
  const ok = result.compiled === true;
  const output = result.compilerOutput ?? "";

  for (const ext of ["nss", "ncs"]) {
    const key = `${PROBE_RESREF}.${ext}`;
    const entry = index.resources.get(key);
    if (entry?.filePath) await fsPromises.rm(entry.filePath, { force: true });
    index.resources.delete(key);
  }
  await fsPromises.rm(path.join(index.tempDir, `${PROBE_RESREF}.ncs`), { force: true });

  return { ok, output };
}

export function registerRandomAbilitiesTools(server: McpServer): void {
  server.tool(
    "create_random_abilities_system",
    "Generate the random-caster-abilities include (inc_random_abil by default). Its RA_OnSpawn(oCreature) rolls a " +
      "fresh, random spell/ability set for a caster creature every time the module loads, computed entirely in " +
      "NWScript from base-game classes.2da/cls_spgn_<class>.2da/spells.2da — no build-time baking. For Cleric/Druid/" +
      "Paladin/Ranger/Wizard it writes a REAL memorized spellbook via the engine's own SetMemorizedSpell(), picked " +
      "up automatically by the creature's existing combat AI. For Bard/Sorcerer (spontaneous casters, no runtime " +
      "known-spell setter exists) it stores a virtual ability list instead; RA_OnEndRound(oCreature), wired onto " +
      "ScriptEndRound, has a tunable per-round chance to cast one via ActionCastSpellAtObject's bCheat param. " +
      "Depends on nothing but base-game 2DAs and engine functions — no project-specific table, no NWNX — so the " +
      "generated file is portable to any other vanilla module verbatim. " +
      "WIRING (chain, never replace): write a tiny per-role wrapper script that calls ExecuteScript() on the " +
      "creature's original ScriptSpawn/ScriptEndRound first, then RA_OnSpawn/RA_OnEndRound, and pass it via " +
      "create_creature_blueprint's `scripts` param — same pattern already used for inc_spec_check's a_hen_spawn. " +
      "A caster that needs a fixed, story-specific ability instead: don't wire it this way, use the existing " +
      "`spells` param (SpecAbilityList) as before.",
    {
      resref: z.string().optional().describe("Include resref to write (default inc_random_abil, max 16 chars)"),
      castChancePercent: optNumParam(
        "Percent chance per combat round a Tier-2 (Bard/Sorcerer) creature casts a stored virtual ability, 1-100 (default 35). Tier 1 classes are unaffected — they cast from a real spellbook via the creature's normal combat AI.",
      ),
    },
    { idempotentHint: true },
    async ({ resref, castChancePercent }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_random_abil").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
        };
      }

      const options = {
        includeName,
        castChancePercent: toI(castChancePercent, 35),
      };

      const issues = validateRandomAbilitiesOptions(options);
      if (issues.length > 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: false, issues }, null, 2) }],
        };
      }

      const source = generateRandomAbilitiesInclude(options);
      const written = await writeAndCompileScript(index, includeName, source, false);
      const probe = await compileProbe(index, includeName);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: probe.ok,
                written: written.written,
                sizeBytes: written.sizeBytes,
                compiles: probe.ok,
                ...(probe.ok ? {} : { compilerOutput: probe.output }),
                castChancePercent: options.castChancePercent,
                api: ["void RA_OnSpawn(object oCreature)", "void RA_OnEndRound(object oCreature)"],
                usage: `#include "${includeName}"`,
                tiers: {
                  tier1RealSpellbook: ["cleric", "druid", "paladin", "ranger", "wizard"],
                  tier2VirtualAbility: ["bard", "sorcerer"],
                },
                wiring:
                  "Chain, never replace: write a per-role wrapper that calls ExecuteScript() on the creature's " +
                  "original ScriptSpawn (and, for Tier 2 classes, ScriptEndRound) first, then RA_OnSpawn/" +
                  "RA_OnEndRound, and pass it via create_creature_blueprint's scripts param.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
