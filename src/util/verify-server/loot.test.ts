import { describe, expect, it } from "vitest";
import { parseLootLines, renderSpawnLoot, upsertSpawnLoot } from "./loot.js";

const LINE = "[Mon Nov 09 12:00:00] [CL_LOOT] tag=thug1 resref=hos_thug1 area=road droppable=1 items=nw_wswls001@4:15,nw_arrow@11x24:12";

describe("spawn loot", () => {
  it("parses items with slot, stack and price, and ignores other lines", () => {
    const [c] = parseLootLines(["noise", LINE]);
    expect(c.tag).toBe("thug1");
    expect(c.droppable).toBe(true);
    expect(c.items).toEqual([
      { resref: "nw_wswls001", slot: "4", stack: 1, gp: 15 },
      { resref: "nw_arrow", slot: "11", stack: 24, gp: 12 },
    ]);
  });
  it("keeps one entry per creature when a line repeats", () => {
    expect(parseLootLines([LINE, LINE])).toHaveLength(1);
  });
  it("upsert appends once then replaces in place", () => {
    const loot = parseLootLines([LINE]);
    const once = upsertSpawnLoot("## Module\nm\n\n## Rewards\nr\n", loot);
    expect(once).toContain("## Spawn Loot");
    const twice = upsertSpawnLoot(once, parseLootLines([LINE.replace("thug1", "thug2")]));
    expect(twice.match(/## Spawn Loot/g)).toHaveLength(1);
    expect(twice).toContain("thug2");
    expect(twice).not.toContain("thug1 [");
    expect(twice).toContain("## Rewards");
  });
  it("says so when nothing was bought", () => {
    expect(renderSpawnLoot([{ tag: "a", resref: "b", area: "c", droppable: true, items: [] }])).toContain("nothing bought");
  });
});
