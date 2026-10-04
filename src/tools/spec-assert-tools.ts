/**
 * Generic runtime-assertion tool.
 *
 * Generates the `inc_spec_assert` include — see src/util/spec-assert-script.ts
 * for the full design: it generalizes inc_spec_check's [SPEC_OK]/[SPEC_FAIL]
 * log protocol beyond fixed creature-stat fields to any runtime condition a
 * custom quest/encounter/trigger/dialog script wants to assert.
 */

import fsPromises from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { generateSpecAssertInclude } from "../util/spec-assert-script.js";
import { writeAndCompileScript } from "../util/script-writer.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_spa_probe";

/**
 * An include has no main(), so the compiler rejects it on its own. Compiling a
 * throwaway script that includes it is the only way to prove the generated
 * source is valid before it reaches a real caller. Mirrors
 * spec-check-tools.ts's compileProbe() exactly — same temp-dir placement,
 * same cleanup.
 */
async function compileProbe(index: ModuleIndex, includeName: string): Promise<{ ok: boolean; output: string }> {
  const source = `#include "${includeName}"

void main()
{
    SPEC_AssertInt("probe", "int_field", 1, 1);
    SPEC_AssertString("probe", "string_field", "a", "a");
    SPEC_AssertBool("probe", "bool_field", TRUE);
    SPEC_AssertBool("probe", "bool_field2", FALSE, "custom_description");
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

export function registerSpecAssertTools(server: McpServer): void {
  server.tool(
    "create_spec_assertions",
    "Generate the generic runtime-assertion include (inc_spec_assert by default) — generalizes " +
      "create_spec_verification's [SPEC_OK]/[SPEC_FAIL] log protocol beyond fixed creature-stat fields to ANY " +
      "runtime condition. SPEC_AssertInt(sTag, sField, nExpected, nActual), SPEC_AssertString(sTag, sField, " +
      "sExpected, sActual) and SPEC_AssertBool(sTag, sField, bCondition, sActualDescription='') each log one " +
      "[SPEC_OK]/[SPEC_FAIL] line immediately, independently of any other assertion — call from a custom quest " +
      "condition/action script, an encounter's spawn script, a trigger, or a dialog node action script to check " +
      "things like spawn counts, faction/hostility setup, or journal/quest state at runtime. run_live_verification " +
      "already parses this exact log format with zero additional configuration (specResults.ok/fail). Only active " +
      "when the module local MCP_VERIFY_MODE is set (e.g. from a_mod_load) — a no-op in the delivered module, same " +
      "convention as create_spec_verification/create_systest_instrumentation. " +
      "See docs/runtime-verification-spec.md §4/§5 for the full design.",
    {
      resref: z.string().optional().describe("Include resref to write (default inc_spec_assert, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_spec_assert").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
        };
      }

      const source = generateSpecAssertInclude({ includeName });
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
                  "void SPEC_AssertInt(string sTag, string sField, int nExpected, int nActual)",
                  "void SPEC_AssertString(string sTag, string sField, string sExpected, string sActual)",
                  "void SPEC_AssertBool(string sTag, string sField, int bCondition, string sActualDescription = \"\")",
                ],
                usage: `#include "${includeName}"`,
                gate: 'Only runs when GetLocalInt(GetModule(), "MCP_VERIFY_MODE") is non-zero.',
                note:
                  "Each call logs immediately and independently (one [SPEC_OK]/[SPEC_FAIL] line per call) — unlike " +
                  "SPEC_VerifyCreature's one-line-after-all-fields-pass bundling. sField/sExpected/sActual must not " +
                  "contain spaces (the run_live_verification log parser splits on whitespace).",
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
