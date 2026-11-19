import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { normalizePlotSpec } from "./plot-spec.js";
import { validateSpec } from "./spec-validate.js";

describe("plot normalisation", () => {
  it("makes the 7B model's refused Millers Daughter plot (run 7) valid, reporting each change", () => {
    const raw = JSON.parse(readFileSync(path.join(import.meta.dirname, "fixtures", "plot-run7.json"), "utf8"));
    expect(validateSpec("plot", raw).ok).toBe(false);
    const { spec, adjusted } = normalizePlotSpec(raw);
    const checked = validateSpec("plot", spec);
    expect(checked.errors).toEqual([]);
    const s = spec as { locations: Array<{ purpose: string; beat: string }>; npcs: Array<{ name: string; role: string }>; antagonists: Array<{ name: string }>; merchant?: string };
    expect(s.locations[4].purpose).toBe("boss");
    expect(s.npcs.map((n) => n.role)).toEqual(["quest giver", "companion", "companion"]);
    expect(s.antagonists.map((a) => a.name)).toEqual(["Bandit Chief"]);
    expect(s.merchant).toBeUndefined();
    expect(s.locations.every((l) => l.beat.length > 0)).toBe(true);
    expect(adjusted.join("\n")).toContain('purpose "climax" read as "boss"');
    expect(adjusted.join("\n")).toContain('"Bandit Chief" (role antagonist) dropped: already an antagonist');
  });
});
