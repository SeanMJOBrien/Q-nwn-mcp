import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { rebuildCreaturePalette } from "./creature-palette.js";

const cat = (id: number, entries: unknown[] = []) => ({ __struct_id: 0, ID: { type: "byte", value: id }, STRREF: { type: "dword", value: 1 }, ...(entries.length ? { LIST: { type: "list", value: entries } } : {}) });
const tree = () =>
  ({
    MAIN: {
      type: "list",
      value: [
        { __struct_id: 0, STRREF: { type: "dword", value: 6687 }, LIST: { type: "list", value: [cat(0), cat(1)] } },
        { __struct_id: 0, STRREF: { type: "dword", value: 6731 }, LIST: { type: "list", value: [cat(38), cat(43), cat(44, [{ __struct_id: 0, RESREF: { type: "resref", value: "gone" } }])] } },
        cat(46),
      ],
    },
  }) as unknown as GffObj;
const utc = (fields: Record<string, unknown>) => fields as GffObj;

describe("creature palette", () => {
  it("files each blueprint by PaletteID, else by player race, else Custom 1, and drops stale entries", () => {
    const index = {
      parsedGff: new Map<string, GffObj>([
        ["warlord.utc", utc({ Race: { type: "byte", value: 5 }, FactionID: { type: "word", value: 1 }, ChallengeRating: { type: "float", value: 4 }, FirstName: { type: "cexolocstring", value: { "0": "Warlord" } } })],
        ["ox.utc", utc({ Race: { type: "byte", value: 8 }, FactionID: { type: "word", value: 2 }, ChallengeRating: { type: "float", value: 0.5 }, FirstName: { type: "cexolocstring", value: { strref: 12678 } } })],
        ["guide.utc", utc({ PaletteID: { type: "byte", value: 46 }, Race: { type: "byte", value: 6 }, FactionID: { type: "word", value: 2 }, FirstName: { type: "cexolocstring", value: { "0": "Guide" } } })],
      ]),
    } as unknown as ModuleIndex;
    const itp = tree();
    const r = rebuildCreaturePalette(index, itp);
    expect(r.entries).toBe(3);
    expect(r.categories).toEqual({ "0": 1, "43": 1, "46": 1 });
    const text = JSON.stringify(itp);
    expect(text).not.toContain('"gone"');
    expect(text).toContain('"FACTION":{"type":"cexostring","value":"Hostile"}');
    // the PaletteID written back for the toolset; the one that had a valid ID keeps it
    expect(r.paletteIdsSet.sort()).toEqual(["ox", "warlord"]);
    expect(rebuildCreaturePalette(index, itp).paletteIdsSet).toEqual([]);
  });
});
