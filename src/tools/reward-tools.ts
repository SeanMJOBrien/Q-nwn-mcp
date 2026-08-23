/**
 * Co-op reward system tool.
 *
 * Generates the `inc_reward` include that every quest and dialog action script
 * uses to hand out XP, gold and items. The point is that no phase of the
 * pipeline — and no human author — has to re-derive party fan-out, which is the
 * defect co-op modules ship most often and solo testing never catches.
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { optNumParam, toI } from "../util/params.js";
import {
  type ClassItemTier,
  type RewardPolicy,
  BASE_CLASS_TYPES,
  generateRewardInclude,
  validateRewardOptions,
} from "../util/reward-script.js";
import { writeAndCompileScript } from "../util/script-writer.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_rwd_probe";

/**
 * An include has no main(), so the compiler rejects it on its own. Compiling a
 * throwaway script that includes it is the only way to prove the generated
 * source is valid before it reaches a real caller.
 */
async function compileProbe(index: ModuleIndex, includeName: string): Promise<{ ok: boolean; output: string }> {
  const source = `#include "${includeName}"

void main()
{
    object oPC = GetFirstPC();
    CoopRewardQuest(oPC, 1, 1, "");
    CoopRewardItem(oPC, "", 1);
    CoopRewardClassItem(oPC, "");
}
`;
  const result = await writeAndCompileScript(index, PROBE_RESREF, source, true);
  const ok = result.compiled === true;
  const output = result.compilerOutput ?? "";

  // Clean up: the probe must not ship in the module.
  for (const ext of ["nss", "ncs"]) {
    const key = `${PROBE_RESREF}.${ext}`;
    const entry = index.resources.get(key);
    if (entry?.filePath) await fsPromises.rm(entry.filePath, { force: true });
    index.resources.delete(key);
  }
  // writeAndCompileScript may have written the .ncs without registering it on
  // failure; remove it by path as well.
  await fsPromises.rm(path.join(index.tempDir, `${PROBE_RESREF}.ncs`), { force: true });

  return { ok, output };
}

/** Parse and shape-check the classItems JSON payload. */
function parseClassItems(raw: string | undefined): { tiers?: ClassItemTier[]; error?: string } {
  if (!raw) return { tiers: [] };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return { error: `classItems is not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!Array.isArray(parsed)) {
    return { error: 'classItems must be a JSON array of {tier, items, fallback} objects' };
  }

  const tiers: ClassItemTier[] = [];
  for (const entry of parsed) {
    if (typeof entry !== "object" || entry === null) {
      return { error: "each classItems entry must be an object" };
    }
    const record = entry as Record<string, unknown>;
    if (typeof record.tier !== "string") {
      return { error: 'each classItems entry needs a string "tier"' };
    }
    if (typeof record.items !== "object" || record.items === null) {
      return { error: `tier "${record.tier}" needs an "items" object mapping class name to resref` };
    }
    const items: Record<string, string> = {};
    for (const [className, resref] of Object.entries(record.items as Record<string, unknown>)) {
      if (typeof resref !== "string") {
        return { error: `tier "${record.tier}", class "${className}": resref must be a string` };
      }
      items[className.toLowerCase()] = resref.toLowerCase();
    }
    tiers.push({
      tier: record.tier,
      items,
      ...(typeof record.fallback === "string" ? { fallback: record.fallback.toLowerCase() } : {}),
    });
  }
  return { tiers };
}

/** Report class-item resrefs with no matching .uti in the module. */
function missingItemBlueprints(index: ModuleIndex, tiers: ClassItemTier[]): string[] {
  const missing = new Set<string>();
  for (const tier of tiers) {
    const refs = [...Object.values(tier.items), ...(tier.fallback ? [tier.fallback] : [])];
    for (const resref of refs) {
      if (resref && !index.resources.has(`${resref}.uti`)) missing.add(resref);
    }
  }
  return [...missing];
}

export function registerRewardTools(server: McpServer): void {
  server.tool(
    "create_reward_system",
    "Generate the co-op reward include (inc_reward) that quest and dialog scripts call to hand out XP, gold and items. " +
      "By default every player in the party receives 100% of every reward, matching BioWare's own RewardPartyXP/RewardPartyGP. " +
      "Optionally bakes in a class-appropriate item table so each player gets gear suiting their own primary class. " +
      "Rerun with different options to change policy; the include is regenerated in place.",
    {
      policy: z
        .enum(["full", "split", "speaker"])
        .optional()
        .describe(
          "full (default): each player gets 100% of every reward. split: XP/gold divided among players, items to the triggering PC. speaker: only the triggering PC is rewarded (single-player modules).",
        ),
      sharePercent: optNumParam("Percentage of the nominal amount each recipient receives, 1-100 (default 100)"),
      classItems: z
        .string()
        .optional()
        .describe(
          'JSON array of reward tiers: [{"tier":"boss","items":{"fighter":"it_sword","wizard":"it_robe"},"fallback":"it_ring"}]. ' +
            `Valid class names: ${Object.keys(BASE_CLASS_TYPES).join(", ")}.`,
        ),
      resref: z.string().optional().describe("Include resref to write (default inc_reward, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ policy, sharePercent, classItems, resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_reward").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
        };
      }

      const parsed = parseClassItems(classItems);
      if (parsed.error) return { content: [{ type: "text", text: parsed.error }] };
      const tiers = parsed.tiers ?? [];

      const options = {
        policy: (policy ?? "full") as RewardPolicy,
        sharePercent: toI(sharePercent, 100),
        classItems: tiers,
        includeName,
      };

      const issues = validateRewardOptions(options);
      if (issues.length > 0) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ success: false, issues }, null, 2),
            },
          ],
        };
      }

      const source = generateRewardInclude(options);
      const written = await writeAndCompileScript(index, includeName, source, false);
      const probe = await compileProbe(index, includeName);

      // A generated include that does not compile is worse than none at all:
      // every caller fails later, far from the cause.
      const missing = missingItemBlueprints(index, tiers);

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
                policy: options.policy,
                sharePercent: options.sharePercent,
                tiers: tiers.map((t) => t.tier),
                api: [
                  "CoopRewardXP(object oPC, int nXP)",
                  "CoopRewardGold(object oPC, int nGold)",
                  "CoopRewardItem(object oPC, string sResRef, int nCount = 1)",
                  "CoopRewardClassItem(object oPC, string sTier)",
                  "CoopRewardQuest(object oPC, int nXP, int nGold, string sTier = \"\")",
                ],
                usage: `#include "${includeName}"`,
                ...(missing.length > 0
                  ? {
                      missingItemBlueprints: missing,
                      note: "These resrefs have no .uti in the module yet. Create them with create_item_blueprint before shipping, or CoopRewardClassItem will silently give nothing.",
                    }
                  : {}),
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
