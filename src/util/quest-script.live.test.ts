/**
 * Env-gated: compiles every generated quest runtime script (inc_quest, q_act, q_check, q_roll, ...) with the real nwn_script_comp.
 * Skips without NWN_FOLDER_DATA + NIM_FOLDER_NWTOOLS. Run after any change to src/util/quest-script.ts.
 */
import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { NIM_FOLDER_NWTOOLS, NWN_FOLDER_DATA, NWN_FOLDER_USER } from "../config.js";
import { compileScript } from "../nim-tools.js";
import { generateCreatureLevelInclude, generateCreatureLevelWrapper } from "./creature-level-script.js";
import { COMPANION_SCRIPTS, generateCompanionScripts } from "./companion-script.js";
import { generateQuestScripts, QUEST_SCRIPTS } from "./quest-script.js";

describe.skipIf(!NWN_FOLDER_DATA || !NIM_FOLDER_NWTOOLS)("generated quest scripts compile", () => {
  it("every entry-point script compiles against the real compiler", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-questcomp-"));
    try {
      const scripts: Record<string, string> = { ...generateQuestScripts(), ...generateCompanionScripts({ originalLevelUp: "a_old_lvlup" }), inc_cre_level: generateCreatureLevelInclude(), cf_spawn: generateCreatureLevelWrapper() };
      for (const [name, src] of Object.entries(scripts)) await fs.writeFile(path.join(dir, `${name}.nss`), src);
      const override = path.resolve(import.meta.dirname, "../nwscript-override");
      const failures: string[] = [];
      for (const name of [...QUEST_SCRIPTS, ...COMPANION_SCRIPTS]) {
        if (!(name in scripts)) continue;
        const r = await compileScript(path.join(dir, `${name}.nss`), path.join(dir, `${name}.ncs`), {
          resman: { root: NWN_FOLDER_DATA, userDir: NWN_FOLDER_USER || undefined, dirs: [dir, override] },
        });
        if (!r.success) failures.push(`${name}: ${r.output.slice(-300)}`);
      }
      expect(failures).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
