import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { draftDmGuide } from "./dm-guide-draft.js";
import { type PlotSpec, renderPlot } from "./plot-spec.js";

describe("DM guide draft", () => {
  it("covers the plot, the people, the quests and every place with what the sections put there", () => {
    const plot = JSON.parse(readFileSync(path.join(import.meta.dirname, "..", "..", "docs", "specs", "plot.example.json"), "utf8")) as PlotSpec;
    const first = plot.locations[0];
    const resref = first.resref ?? first.name.toLowerCase().replace(/[^a-z0-9]/g, "");
    const story = [
      "# Mill", "## Module", "- **Target Level:** 2", "- **Party Size:** 4", "## Plot", renderPlot(plot),
      "## Actors", `### ${first.name} (\`${resref}\`)`, "**Key NPCs:** Elder Maren (`elder`), dialog `elder`, at (45, 65)",
      "## Challenges", `### ${first.name} (\`${resref}\`)`, "**Group 1:** nw_bandit003 x2 at (62, 67)",
    ].join("\n");
    const guide = draftDmGuide(story, "Mill");
    expect(guide).toContain("# Mill: DM guide");
    expect(guide).toContain("- **Target Level:** 2");
    expect(guide).toContain("## The story");
    expect(guide).toContain("## Quests");
    expect(guide).toContain(`### ${first.name}`);
    expect(guide).toContain("Elder Maren (`elder`)");
    expect(guide).toContain("nw_bandit003 x2");
    expect(guide.length).toBeGreaterThan(400);
  });
});
