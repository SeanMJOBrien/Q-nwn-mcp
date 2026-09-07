/**
 * Runtime creature-spec-verification tool.
 *
 * Generates the `inc_spec_check` include (`SPEC_VerifyCreature()`) that closes
 * the gap every static `verify_*` tool leaves open: none of them can prove the
 * engine actually *behaves* as intended once a real server loads the module.
 * See docs/runtime-verification-spec.md for the full design.
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { CLASS_FEATS, generateSpecCheckInclude, RACIAL_FEATS } from "../util/spec-check-script.js";
import { writeAndCompileScript } from "../util/script-writer.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_spc_probe";

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
    SPEC_VerifyCreature(OBJECT_SELF);
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

export function registerSpecCheckTools(server: McpServer): void {
  server.tool(
    "create_spec_verification",
    "Generate the runtime creature-spec-verification include (inc_spec_check by default). " +
      "Its SPEC_VerifyCreature(oCreature) function compares a creature's actual runtime race/appearance/class/level/" +
      "package/feats/spells against SPEC_* local variables set on its blueprint (via create_creature_blueprint's " +
      "varTable), logging one [SPEC_OK]/[SPEC_FAIL] line per creature per check. Only active when the module local " +
      "MCP_VERIFY_MODE is set (e.g. from a_mod_load) — a no-op in the delivered module. Call SPEC_VerifyCreature() " +
      "from OnSpawn and immediately after any LevelUpHenchman() or other leveling call. " +
      "See docs/runtime-verification-spec.md for the full design and how to read the log.",
    {
      resref: z.string().optional().describe("Include resref to write (default inc_spec_check, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_spec_check").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
        };
      }

      const source = generateSpecCheckInclude({ includeName });
      const written = await writeAndCompileScript(index, includeName, source, false);
      const probe = await compileProbe(index, includeName);

      const uncheckedRacialFeats = Object.entries(RACIAL_FEATS)
        .filter(([, feat]) => feat === null)
        .map(([race]) => race);
      const uncheckedClassFeats = Object.entries(CLASS_FEATS)
        .filter(([, feat]) => feat === null)
        .map(([classId]) => classId);

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
                api: ["void SPEC_VerifyCreature(object oCreature)"],
                usage: `#include "${includeName}"`,
                specVars: ["SPEC_ENABLED", "SPEC_RACE", "SPEC_APPEARANCE", "SPEC_CLASS", "SPEC_LEVEL", "SPEC_PACKAGE"],
                gate: 'Only runs when GetLocalInt(GetModule(), "MCP_VERIFY_MODE") is non-zero.',
                ...(uncheckedRacialFeats.length > 0 || uncheckedClassFeats.length > 0
                  ? {
                      note:
                        `Representative-feat checks are skipped (return -1, never fail) for: ` +
                        `race rows [${uncheckedRacialFeats.join(", ")}], class IDs [${uncheckedClassFeats.join(", ")}] ` +
                        `— not yet confirmed against real 2DA data.`,
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
