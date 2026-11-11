import { describe, expect, it } from "vitest";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { NIM_FOLDER_NWTOOLS, NWN_FOLDER_DATA, NWN_FOLDER_USER } from "../config.js";
import { compileScript } from "../nim-tools.js";
import {
  addToPool,
  emptyPool,
  generateTreasureDeathScript,
  generateTreasureInclude,
  generateTreasureOpenScript,
  kindOfGroup,
  poolSize,
  TREASURE_INCLUDE,
} from "./treasure-script.js";

describe("treasure include", () => {
  it("maps catalog groups to loot kinds", () => {
    expect(kindOfGroup("weapon")).toBe(4);
    expect(kindOfGroup("ammo")).toBe(5);
    expect(kindOfGroup("shield")).toBe(6);
    expect(kindOfGroup("boots")).toBe(7);
    expect(kindOfGroup("ring")).toBe(8);
    expect(kindOfGroup("potion")).toBe(3);
    expect(kindOfGroup("scroll")).toBe(2);
    expect(kindOfGroup("wand")).toBe(0);
    expect(kindOfGroup("consumable")).toBe(0);
    expect(kindOfGroup("gem")).toBe(1);
  });

  it("bakes the pool as JSON, keeps tiers within 1-5 and does not repeat a resref", () => {
    const pool = emptyPool();
    addToPool(pool, 4, 2, "sword_a");
    addToPool(pool, 4, 2, "sword_a");
    addToPool(pool, 3, 9, "potion_x");
    expect(poolSize(pool)).toBe(2);
    expect(pool["3"]["5"]).toEqual(["potion_x"]);
    const src = generateTreasureInclude(pool);
    expect(src).toContain('\\"sword_a\\"');
    expect(src).toContain("TR_FillOnce");
    // the source world's constants
    expect(src).toContain("const int TR_BASE_T1 = 2000;");
    expect(src).toContain("const int TR_MID_T3 = 7;");
    expect(src).toContain("(68.0 + atan((nCR - nMid) * 0.6)) / 158.0");
  });

  it("ports the boss-tier table and the creature drop chance", () => {
    const src = generateTreasureInclude(emptyPool());
    expect(src).toContain("int TR_BossTier(int nCR, int bSemiboss)");
    expect(src).toContain("if (nCR == 13) return Random(100) < 80 ? 5 : 4;");
    expect(src).toContain("30.0 * pow(2.0, (nMonsterCR - nAreaCR) / 2.0)");
    expect(generateTreasureDeathScript()).toContain('"nw_c2_default7"');
  });

  it("splits a large pool across several string constants", () => {
    const pool = emptyPool();
    for (let i = 0; i < 1500; i++) addToPool(pool, 4, 1 + (i % 5), `long_item_resref_${i}`);
    const src = generateTreasureInclude(pool);
    expect(src).toContain("TR_POOL_1");
    expect(src).toMatch(/JsonParse\(TR_POOL_0 \+ TR_POOL_1/);
  });
});

describe.skipIf(!NWN_FOLDER_DATA || !NIM_FOLDER_NWTOOLS)("generated treasure scripts compile", () => {
  it("the include and the OnOpen script compile against the real compiler", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-trscomp-"));
    try {
      const pool = emptyPool();
      for (let i = 0; i < 1500; i++) addToPool(pool, i % 9, 1 + (i % 5), `item_${i}`);
      await fs.writeFile(path.join(dir, `${TREASURE_INCLUDE}.nss`), generateTreasureInclude(pool));
      await fs.writeFile(path.join(dir, "a_trs_open.nss"), generateTreasureOpenScript());
      await fs.writeFile(path.join(dir, "a_trs_death.nss"), generateTreasureDeathScript());
      const failures: string[] = [];
      for (const name of ["a_trs_open", "a_trs_death"]) {
        const r = await compileScript(path.join(dir, `${name}.nss`), path.join(dir, `${name}.ncs`), {
          resman: { root: NWN_FOLDER_DATA, userDir: NWN_FOLDER_USER || undefined, dirs: [dir, path.resolve(import.meta.dirname, "../nwscript-override")] },
        });
        if (!r.success) failures.push(`${name}: ${r.output.slice(-400)}`);
      }
      expect(failures).toEqual([]);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
