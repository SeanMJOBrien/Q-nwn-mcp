import { describe, expect, it } from "vitest";
import { parseStoryGraph, verifyStory } from "./story-graph.js";

const GOOD = `## Story
- beat B1 | title: Arrival | act: setup | area: village | leads: B2, B3 | gives: letter
- beat B2 | title: The cabin | act: complication | area: village | leads: B4 | gives: seal | needs: letter
- beat B3 | title: Elder | act: complication | area: village | leads: B4 | gives: seal
- beat B4 | title: The keep | act: climax | area: keep
- thread T1 | title: Venn's motive | planted: B1 | paid: B4
`;
const codes = (md: string, areas?: Set<string>) => verifyStory(parseStoryGraph(md), areas).map((f) => f.code);

describe("story graph", () => {
  it("parses beats, clues and threads", () => {
    const g = parseStoryGraph(GOOD);
    expect(g.beats.map((b) => b.id)).toEqual(["B1", "B2", "B3", "B4"]);
    expect(g.beats[1]).toMatchObject({ leads: ["B4"], gives: ["seal"], needs: ["letter"], area: "village" });
    expect(g.threads[0]).toMatchObject({ planted: "B1", paid: "B4" });
  });
  it("a sound graph has no errors", () => {
    expect(verifyStory(parseStoryGraph(GOOD), new Set(["village", "keep"])).filter((f) => f.level === "error")).toEqual([]);
  });
  it("finds a dangling lead, an unreachable beat and a missing ending", () => {
    const c = codes("- beat B1 | act: setup | leads: B9\n- beat B2 | act: climax\n");
    expect(c).toContain("story_dangling_lead");
    expect(c).toContain("story_unreachable_beat");
  });
  it("finds a clue nobody gives, and warns about a single route", () => {
    expect(codes("- beat B1 | act: setup | leads: B2\n- beat B2 | act: climax | needs: key\n")).toContain("story_clue_never_given");
    expect(codes("- beat B1 | act: setup | leads: B2 | gives: key\n- beat B2 | act: climax | needs: key\n")).toContain("story_clue_single_route");
  });
  it("finds a thread whose payoff can't be reached from where it is planted", () => {
    const md = "- beat B1 | act: setup | leads: B2\n- beat B2 | act: climax\n- beat B3 | act: complication | leads: B2\n- thread T | planted: B2 | paid: B3\n";
    expect(codes(md)).toContain("story_thread_unpaid");
  });
  it("warns on an unknown area and a dead end; an empty graph is only a warning", () => {
    expect(codes("- beat B1 | act: setup | area: nowhere | leads: B2\n- beat B2 | act: complication\n", new Set(["village"]))).toEqual(
      expect.arrayContaining(["story_unknown_area", "story_dead_end"]),
    );
    expect(verifyStory(parseStoryGraph("no beats here")).map((f) => f.level)).toEqual(["warning"]);
  });
});
