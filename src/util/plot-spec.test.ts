import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { parseSections } from "./phase-check.js";
import { locationResref, moduleFields, type PlotSpec, plotSemanticErrors, plotWarnings, renderPlot, setModuleFields } from "./plot-spec.js";
import { validateSpec } from "./spec-validate.js";
import { parseStoryGraph, verifyStory } from "./story-graph.js";

const example = (): PlotSpec => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "..", "docs", "specs", "plot.example.json"), "utf8"));
const fields = (spec: unknown) => validateSpec("plot", spec).errors.map((e) => e.field);

describe("plot spec", () => {
  it("the example file passes the schema and the rules", () => {
    expect(validateSpec("plot", example())).toEqual({ ok: true, errors: [] });
  });

  it("names the failing field for a schema fault", () => {
    const noTitle: Partial<PlotSpec> = example();
    delete noTitle.title;
    expect(fields(noTitle)).toEqual(["title"]);
    const s = example();
    (s.locations[0] as { purpose: string }).purpose = "dungeon";
    (s.locations[1].events as string[]).push("riddle");
    s.locations[2].resref = "Too Long A Resref Name";
    s.quests[0].stages = ["only one"];
    expect(fields(s)).toEqual(["locations[0].purpose", "locations[1].events[2]", "locations[2].resref", "quests[0].stages"]);
  });

  it("checks names against each other", () => {
    const s = example();
    s.npcs[1].location = "The Tavern";
    s.quests[0].giver = "Nobody";
    s.merchant = "Old Tom";
    s.antagonists[0].location = "Elsewhere";
    s.connections = [["Blackwater Village", "The Mill Road"], ["The Mill Road", "The Mill Road"], ["The Mill Road", "Nowhere"]];
    expect(plotSemanticErrors(s).map((e) => e.field)).toEqual([
      "connections[1]",
      "connections[2][1]",
      "connections", // the caves are cut off now
      "npcs[1].location",
      "antagonists[0].location",
      "quests[0].giver",
      "merchant",
    ]);
    expect(plotSemanticErrors(s)[2].message).toContain('"Caves under the Mill" cannot be reached');
  });

  it("refuses two locations with one name or one resref, and a second main quest", () => {
    const s = example();
    s.locations[1].name = "blackwater village";
    s.locations[2].resref = "blackwater";
    s.quests.push({ ...s.quests[0], name: "Another", primary: true });
    const got = plotSemanticErrors(s).map((e) => e.field);
    expect(got).toContain("locations[1].name");
    expect(got).toContain("locations[2].resref");
    expect(got).toContain("quests[1].primary");
  });

  it("makes a resref from the name when none is given", () => {
    expect(locationResref({ name: "The Old Mill-Road, East" })).toBe("oldmillroadeast");
    expect(locationResref({ name: "Caves under the Mill of Blackwater" })).toBe("cavesunderthemil");
    expect(locationResref({ name: "X", resref: "given" })).toBe("given");
  });

  it("renders the Plot section with every heading the later phases read and a story graph that holds", () => {
    const md = renderPlot(example());
    for (const heading of ["Premise", "Locations", "Connections", "Key NPCs", "Antagonists", "Quest Objectives", "Challenges", "Loot & Economy", "Story Graph"]) {
      expect(md, heading).toContain(`### ${heading}\n`);
    }
    expect(md).not.toMatch(/^##\s/m); // one section: nothing above ###
    expect(md).toContain("#### 2. The Mill Road\n- **Resref:** millroad\n- **Tileset:** ttf01\n- **Purpose:** travel\n- **Events:** ambush, discovery\n- **Travel:** yes");
    expect(md).toContain("- Blackwater Village <-> The Mill Road");
    expect(md).toContain("- **Race, class, gender:** halfling rogue, male");
    expect(md).toContain("#### Primary Quest: The Missing Miller\n**Giver:** Elder Maren\n**Stage 1:**");
    expect(md).toContain("**Stage 4 (Resolution):** The party returns to Elder Maren");
    expect(md).toContain("- Merchant: Tobb the Pedlar. Final reward: 300 gold");

    const graph = parseStoryGraph(md);
    expect(graph.beats.map((b) => [b.id, b.act, b.area, b.leads])).toEqual([
      ["B1", "setup", "blackwater", ["B2"]],
      ["B2", "complication", "millroad", ["B3"]],
      ["B3", "climax", "millcaves", []],
    ]);
    expect(verifyStory(graph).filter((f) => f.level === "error")).toEqual([]);
    // it survives being stored as a section
    expect(parseSections(`# T\n\n## Plot\n\n${md}\n`).get("Plot")).toContain("### Story Graph");
  });

  it("every beat stays reachable when the story order differs from the connections", () => {
    const s = example();
    // hub connects to the caves only; the road hangs off the caves
    s.connections = [["Blackwater Village", "Caves under the Mill"], ["Caves under the Mill", "The Mill Road"]];
    expect(plotSemanticErrors(s)).toEqual([]);
    const graph = parseStoryGraph(renderPlot(s));
    expect(verifyStory(graph).filter((f) => f.level === "error")).toEqual([]);
    expect(graph.beats[0].leads).toEqual(["B2", "B3"]);
  });

  it("a `|` in a beat does not break the story graph line", () => {
    const s = example();
    s.locations[0].beat = "Talk | then leave";
    expect(parseStoryGraph(renderPlot(s)).beats[0]).toMatchObject({ title: "Talk / then leave", area: "blackwater" });
  });

  it("compares the plot with the suggested shape and notes a missing boss", () => {
    const s = example();
    expect(plotWarnings(s)).toEqual([]);
    expect(plotWarnings({ ...s, playMinutes: 90 })).toEqual(["3 locations for 90 minutes; plan_adventure_shape suggests 5."]);
    s.locations[2].events = ["combat"];
    s.npcs[0].location = "The Mill Road";
    const notes = plotWarnings(s).join("\n");
    expect(notes).toContain('No location has a "boss" event');
    expect(notes).toContain("Elder Maren, is in \"The Mill Road\"");
  });

  it("sets the Module lines: replaces its own, keeps the rest, adds Idea and Difficulty only when absent", () => {
    const before = "- **Title:** Old\n- **Scope:** whole adventure\n- **Idea:** the user's own words\n";
    expect(setModuleFields(before, moduleFields(example())).split("\n")).toEqual([
      "- **Title:** The Mill on Blackwater",
      "- **Scope:** whole adventure",
      "- **Idea:** the user's own words",
      "- **Target Level:** 2",
      "- **Party Size:** 4",
      "- **Tone:** heroic",
      "- **Difficulty:** standard",
      "- **Estimated Duration:** 60 minutes",
    ]);
    expect(setModuleFields("", moduleFields(example()))).toContain("- **Idea:** The miller of Blackwater has gone missing");
  });
});
