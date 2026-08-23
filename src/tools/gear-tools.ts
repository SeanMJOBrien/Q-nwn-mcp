/**
 * Gear tools: wealth-by-level budgets, and randomised gear appearance.
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { numParam, optNumParam, toI } from "../util/params.js";
import {
  type GearAppearanceOptions,
  generateAppearanceInclude,
  validateAppearanceOptions,
} from "../util/gear-appearance.js";
import { type GearRole, budgetBreakdown, ROLE_SHARE } from "../util/wealth.js";
import { writeAndCompileScript } from "../util/script-writer.js";

const PROBE_RESREF = "_app_probe";

/** An include has no main(), so a throwaway caller is the only compile proof. */
async function compileProbe(index: ModuleIndex, includeName: string): Promise<{ ok: boolean; output: string }> {
  const source = `#include "${includeName}"

void main()
{
    GearRandomizeCreature(OBJECT_SELF);
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

export function registerGearTools(server: McpServer): void {
  server.tool(
    "get_wealth_budget",
    "Gear budget in gold for a character of a given level and combat role, from D&D 3.5 DMG Table 5-1 (Character Wealth by Level). " +
      "Returns the total, a per-slot split, and the enhancement bonus that level can plausibly carry. " +
      "Spend it against real blueprint costs — NWN prices items from itempropdef.2da, not from the 3.5e formula.",
    {
      level: numParam("Character level (1-20)"),
      role: z
        .enum(["pc", "elite", "standard", "mook"])
        .optional()
        .describe(
          "pc: full budget. elite: full budget (a named enemy given PC wealth is worth CR +1). standard: half. mook: quarter. Default pc.",
        ),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ level, role }) => {
      const breakdown = budgetBreakdown(toI(level), (role ?? "pc") as GearRole);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                ...breakdown,
                roleShare: ROLE_SHARE[breakdown.role],
                source: "D&D 3.5 DMG Table 5-1, p.135. Level 1 is a project default (150gp) — the table starts at level 2.",
                note: "Budget only. Read actual costs with resolve_blueprint; a +1 longsword is 1648gp in NWN, not the 3.5e price.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "create_gear_randomizer",
    "Generate an include that randomises the appearance of a creature's equipped gear at spawn — armour and weapon colours, optionally weapon model parts. " +
      "Call GearRandomizeCreature(OBJECT_SELF) from a creature's OnSpawn handler so identical blueprints produce visibly different characters.",
    {
      armorColors: z.boolean().optional().describe("Randomise armour cloth/leather/metal colours (default true)"),
      weaponColors: z.boolean().optional().describe("Randomise weapon colours (default true)"),
      weaponModels: z
        .boolean()
        .optional()
        .describe(
          "Randomise weapon model parts (default false). Valid indices depend on the base item — an out-of-range part renders wrong.",
        ),
      weaponModelMax: optNumParam("Cap for weapon model indices, 1-8 (default 3, the smallest safe cap across base items)"),
      resref: z.string().optional().describe("Include resref to write (default inc_appear, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ armorColors, weaponColors, weaponModels, weaponModelMax, resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_appear").toLowerCase();

      if (includeName.length > 16) {
        return { content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }] };
      }

      const options: GearAppearanceOptions = {
        armorColors,
        weaponColors,
        weaponModels,
        weaponModelMax: weaponModelMax !== undefined ? toI(weaponModelMax) : undefined,
        includeName,
      };

      const issues = validateAppearanceOptions(options);
      if (issues.length > 0) {
        return { content: [{ type: "text", text: JSON.stringify({ success: false, issues }, null, 2) }] };
      }

      const source = generateAppearanceInclude(options);
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
                api: [
                  "GearRandomizeCreature(object oCreature)",
                  "GearRandomizeArmor(object oCreature)",
                  "GearRandomizeWeapon(object oCreature, int nSlot)",
                ],
                usage: `#include "${includeName}"`,
                wiring:
                  "Write an OnSpawn script that calls GearRandomizeCreature(OBJECT_SELF) then ExecuteScript(\"nw_c2_default9\", OBJECT_SELF), and set it as the creature's ScriptSpawn.",
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
