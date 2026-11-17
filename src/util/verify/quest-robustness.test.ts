/** container_unusable (verifyPlaceableInventory) and kill_before_accept (findEarlyKillableTargets), from the Quest Test Range. */
import { describe, expect, it } from "vitest";
import type { GffObj } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { findEarlyKillableTargets } from "../quest-vars.js";
import { verifyPlaceableInventory } from "./blueprints.js";
import { Report } from "./common.js";

const v = (type: string, value: unknown) => ({ type, value });
const varTable = (vars: Array<[string, number, unknown]>) =>
  v("list", vars.map(([name, type, value]) => ({ __struct_id: 0, Name: v("cexostring", name), Type: v("dword", type), Value: v(type === 1 ? "int" : "cexostring", value) })));

describe("container_unusable", () => {
  const crate = (useable: number, isStatic = 0) =>
    ({
      Tag: v("cexostring", "crate"),
      HasInventory: v("byte", 1),
      Useable: v("byte", useable),
      Static: v("byte", isStatic),
      ItemList: v("list", [{ __struct_id: 0, TemplateResRef: v("resref", "nw_it_mpotion001") }]),
    }) as unknown as GffObj;
  const run = (o: GffObj) => {
    const r = new Report("crate", "utp");
    verifyPlaceableInventory(r, { resources: new Map() } as unknown as ModuleIndex, o);
    return r.warnings.map((w) => w.code);
  };
  it("warns when a placeable with items can't be opened", () => {
    expect(run(crate(0))).toContain("container_unusable");
    expect(run(crate(1, 1))).toContain("container_unusable");
    expect(run(crate(1))).not.toContain("container_unusable");
  });
});

describe("kill_before_accept", () => {
  const index = (faction: number, extra: Array<[string, number, unknown]> = []) =>
    ({
      areas: new Map([["field", {}]]),
      parsedGff: new Map([
        [
          "field.git",
          {
            "Creature List": v("list", [
              {
                Tag: v("cexostring", "raider"),
                FactionID: v("word", faction),
                ScriptDeath: v("resref", "q_ondeath"),
                VarTable: varTable([["quest1", 3, "2_q_raid"], ["quest_event", 1, 1], ...extra]),
              },
            ]),
          },
        ],
      ]),
    }) as unknown as ModuleIndex;
  it("finds a hostile placed target of stage 2+, and not one that is early or neutral", () => {
    expect(findEarlyKillableTargets(index(1))).toEqual([{ area: "field", creature: "raider", quest: "q_raid", stage: 2 }]);
    expect(findEarlyKillableTargets(index(1, [["quest1_early", 1, 1]]))).toEqual([]);
    expect(findEarlyKillableTargets(index(2))).toEqual([]);
  });
});
