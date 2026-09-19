/**
 * Systems-test instrumentation tool.
 *
 * Generates the `inc_systest_log` include used by the systest-module skill's
 * combat fixtures — see src/util/systest-log-script.ts for the full design
 * (why it takes just `object oCreature` per function, and the chain-never-
 * replace wiring convention).
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { generateSystestLogInclude } from "../util/systest-log-script.js";
import { writeAndCompileScript } from "../util/script-writer.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_stl_probe";

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
    SYSTEST_LogDamage(OBJECT_SELF);
    SYSTEST_LogDeath(OBJECT_SELF);
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

export function registerSystestTools(server: McpServer): void {
  server.tool(
    "create_systest_instrumentation",
    "Generate the systems-test logging include (inc_systest_log by default), used by the systest-module skill's " +
      "combat fixtures. SYSTEST_LogDamage(oCreature)/SYSTEST_LogDeath(oCreature), chained onto ScriptDamaged/" +
      "ScriptDeath, log [SYSTEST_DAMAGE] target=<tag> attacker=<tag> amount=<n> / [SYSTEST_DEATH] tag=<tag> " +
      "killer=<tag> via the engine's own OnDamaged/OnDeath event context (GetLastDamager/GetTotalDamageDealt/" +
      "GetLastHostileActor) — ExecuteScript() doesn't forward custom arguments to a chained wrapper, so both " +
      "functions take just the creature. Only active when the module local MCP_VERIFY_MODE is set (e.g. from " +
      "a_mod_load) — a no-op in the delivered module, same convention as create_spec_verification. " +
      "WIRING (chain, never replace): write a per-role wrapper that calls ExecuteScript() on the creature's " +
      "original ScriptDamaged/ScriptDeath first, then SYSTEST_LogDamage(OBJECT_SELF)/SYSTEST_LogDeath(OBJECT_SELF), " +
      "and pass it via create_creature_blueprint's scripts param. Run the resulting module through " +
      "run_live_verification and read otherTaggedLines for these lines.",
    {
      resref: z.string().optional().describe("Include resref to write (default inc_systest_log, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_systest_log").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
        };
      }

      const source = generateSystestLogInclude({ includeName });
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
                api: ["void SYSTEST_LogDamage(object oCreature)", "void SYSTEST_LogDeath(object oCreature)"],
                usage: `#include "${includeName}"`,
                logTags: ["[SYSTEST_DAMAGE] target=<tag> attacker=<tag> amount=<n>", "[SYSTEST_DEATH] tag=<tag> killer=<tag>"],
                gate: 'Only runs when GetLocalInt(GetModule(), "MCP_VERIFY_MODE") is non-zero.',
                wiring:
                  "Chain, never replace: write a per-role wrapper that calls ExecuteScript() on the creature's " +
                  "original ScriptDamaged/ScriptDeath first, then SYSTEST_LogDamage/SYSTEST_LogDeath, and pass it " +
                  "via create_creature_blueprint's scripts param.",
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
