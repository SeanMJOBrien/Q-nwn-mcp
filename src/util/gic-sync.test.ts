import { describe, expect, it, vi } from "vitest";
import type { GffObj } from "../types/gff.js";

vi.mock("../nim-tools.js", () => ({}));
vi.mock("../tools/tileset-tools.js", () => ({ invalidateTagToAreaCache: () => {} }));

const list = (value: GffObj[]) => ({ type: "list", value });
const comment = (id: number, text: string): GffObj => ({ __struct_id: id, Comment: { type: "cexostring", value: text } });
const objects = (n: number): GffObj[] => Array.from({ length: n }, () => ({ __struct_id: 0 }));

describe("syncGicLists", () => {
  it("keeps the toolset comments and reports no change when the lists already match", async () => {
    const { syncGicLists } = await import("./git-helpers.js");
    const gic: GffObj = { "Creature List": list([comment(4, "the innkeeper")]), "Door List": list([comment(8, "cellar door")]) };
    const git: GffObj = { "Creature List": list(objects(1)), "Door List": list(objects(1)) };
    for (const name of ["Encounter List", "Placeable List", "SoundList", "StoreList", "TriggerList", "WaypointList"]) {
      gic[name] = list([]);
      git[name] = list([]);
    }
    expect(syncGicLists(gic, git)).toBe(false);
    expect((gic["Creature List"] as { value: GffObj[] }).value[0]).toEqual(comment(4, "the innkeeper"));
  });

  it("appends an empty comment with the list's struct id for a new object and trims a shorter list", async () => {
    const { syncGicLists } = await import("./git-helpers.js");
    const gic: GffObj = { WaypointList: list([comment(5, "patrol start")]), "Door List": list([comment(8, "a"), comment(8, "b")]) };
    const git: GffObj = { WaypointList: list(objects(2)), "Door List": list(objects(1)), TriggerList: list(objects(1)) };
    expect(syncGicLists(gic, git)).toBe(true);
    expect((gic.WaypointList as { value: GffObj[] }).value).toEqual([comment(5, "patrol start"), comment(5, "")]);
    expect((gic["Door List"] as { value: GffObj[] }).value).toEqual([comment(8, "a")]);
    expect((gic.TriggerList as { value: GffObj[] }).value).toEqual([comment(1, "")]);
  });
});
