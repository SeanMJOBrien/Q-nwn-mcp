import { describe, expect, it } from "vitest";
import { buildAdoptedAdventure, draftStoryGraph, listNotRecorded } from "./adopt.js";
import { buildAudit } from "./audit.js";
import type { AreaSnap, ModuleSnapshot } from "./module-snapshot.js";
import { parseStoryGraph, verifyStory } from "./story-graph.js";
import { dialogCarriesMotive, isPlaceholder, parsePlotRecord, storyRecordFindings } from "./story-record.js";

const codes = (md: string, opts = {}) => storyRecordFindings(md, parseStoryGraph(md), opts).map((f) => f.code);

const GOOD = `# Adventure: Test

## Module
- **Title:** Test
- **Tone:** grim

## Plot

### Premise
A mill burns.

### Locations

#### 1. Village
- **Resref:** village
- **Role in Story:** where the party hears of the fire

#### 2. Mill
- **Resref:** mill
- **Role in Story:** (not recorded)

#### 3. Cave
- **Resref:** cave
- **Role in Story:** the bandits' lair and the final fight

### Key NPCs

#### Ned the Miller
- **Role:** quest giver
- **Location:** village
- **Motivation:** wants his stolen grain back before winter

### Antagonists
- **Type:** bandits
- **Motivation:** starving deserters who sell grain to the baron

### Story Graph
- beat B1 | title: Arrival | act: setup | area: village | leads: B2
- beat B2 | title: The burnt mill | act: complication | area: mill | leads: B3
- beat B3 | title: The lair | act: climax | area: cave
- thread T1 | title: The grain | planted: B1 | paid: B3
`;

describe("story record (TODO #45-#47)", () => {
  it("parses locations, key NPCs and the antagonists' motive", () => {
    const r = parsePlotRecord(GOOD);
    expect(r.locations.map((l) => l.resref)).toEqual(["village", "mill", "cave"]);
    expect(r.npcs[0]).toMatchObject({
      name: "Ned the Miller",
      motivation: "wants his stolen grain back before winter",
    });
    expect(r.hasAntagonists).toBe(true);
    expect(r.antagonistMotivation).toContain("deserters");
  });

  it("refuses a (not recorded) field; a location with a graph beat needs no Role in Story", () => {
    expect(codes(GOOD)).toEqual(["story_not_recorded"]);
    expect(codes(GOOD, { allowNotRecorded: true })).toEqual([]);
  });

  it("requires a story graph from three locations, a motive per NPC and antagonist, a beat per location", () => {
    const noGraph = GOOD.slice(0, GOOD.indexOf("### Story Graph"));
    const bare = noGraph
      .replace("wants his stolen grain back before winter", "(not recorded)")
      .replace("starving deserters who sell grain to the baron", "[why do they oppose]");
    const c = codes(bare, { allowNotRecorded: true });
    expect(c).toContain("story_graph_required");
    expect(c).toContain("npc_no_motive");
    expect(c).toContain("antagonist_no_motive");
    expect(c.filter((x) => x === "area_no_beat")).toHaveLength(1); // the mill: no role, no beat
  });

  it("a two-location adventure may do without a graph", () => {
    const two =
      GOOD.slice(0, GOOD.indexOf("#### 3. Cave")) +
      GOOD.slice(GOOD.indexOf("### Key NPCs"), GOOD.indexOf("### Story Graph"));
    expect(codes(two, { allowNotRecorded: true })).not.toContain("story_graph_required");
  });

  it("antagonists written as named blocks each need a motive", () => {
    const named = GOOD.replace(
      "### Antagonists\n- **Type:** bandits\n- **Motivation:** starving deserters who sell grain to the baron",
      "### Antagonists\n\n#### Red Hal\n- **Lair/Territory:** cave\n- **Motivation:** none",
    );
    expect(codes(named, { allowNotRecorded: true })).toEqual(["npc_no_motive"]);
  });

  it("placeholders", () => {
    for (const v of ["", "(not recorded)", "[what do they want?]", "TBD", "none", "-"])
      expect(isPlaceholder(v)).toBe(true);
    expect(isPlaceholder("revenge on the baron")).toBe(false);
  });

  it("a dialog carries a motive when some line shares a word with it", () => {
    expect(
      dialogCarriesMotive("wants his stolen grain back before winter", ["Hello.", "They took all my grain!"]),
    ).toBe(true);
    expect(dialogCarriesMotive("wants his stolen grain back before winter", ["Hello, traveller.", "Goodbye."])).toBe(
      false,
    );
  });
});

function area(resref: string, transitionsTo: string[]): AreaSnap {
  return {
    resref,
    name: resref[0].toUpperCase() + resref.slice(1),
    tileset: "ttr01",
    width: 8,
    height: 8,
    isInterior: false,
    creatures: [],
    placeables: 1,
    sounds: 0,
    waypoints: 0,
    doors: 0,
    triggers: 0,
    events: { fights: 0, usables: 0, triggers: 0, talkers: 0, total: 0 },
    stores: 0,
    transitionsTo,
  };
}
function snap(over: Partial<ModuleSnapshot> = {}): ModuleSnapshot {
  return {
    title: "Test",
    description: "A mill burns.",
    entryArea: "village",
    areas: [area("cave", ["mill"]), area("village", ["mill"]), area("mill", ["village", "cave"]), area("dmroom", [])],
    unreachableAreas: [],
    quests: [{ name: "The Grain", tag: "q_grain", entries: 3, hasEnd: true }],
    dialogCount: 0,
    itemBlueprints: 0,
    storeBlueprints: 0,
    scripts: 0,
    uncompiledScripts: [],
    hasRewardSystem: false,
    hasQuestSystem: false,
    dmArea: { resref: "dmroom", disconnected: true, hasWaypoint: true, chest: true, storyBook: true, guideBook: true },
    ...over,
  } as ModuleSnapshot;
}

describe("adopt drafts a story graph (TODO #45)", () => {
  it("one beat per area in reach order, a return beat, a thread per quest; it passes verify_story", () => {
    const lines = draftStoryGraph(snap());
    expect(lines).toEqual([
      "- beat B1 | title: Village | act: setup | area: village | leads: B2",
      "- beat B2 | title: Mill | act: complication | area: mill | leads: B3",
      "- beat B3 | title: Cave | act: climax | area: cave | leads: B4",
      "- beat B4 | title: Return to Village | act: resolution | area: village",
      "- thread T1 | title: The Grain | planted: B1 | paid: B4",
    ]);
    const md = buildAdoptedAdventure(snap(), null).markdown;
    const graph = parseStoryGraph(md);
    expect(graph.beats).toHaveLength(4);
    const findings = verifyStory(graph, new Set(["village", "mill", "cave"]));
    expect(findings.filter((f) => f.level === "error")).toEqual([]);
    expect(findings.map((f) => f.code)).not.toContain("story_no_graph");
    // Each location now serves a beat; motives and roles are still the user's to fill.
    const c = codes(md, { allowNotRecorded: true });
    expect(c).not.toContain("area_no_beat");
    expect(c).not.toContain("story_graph_required");
    expect(listNotRecorded(md).some((f) => f.where === "Story Graph" || f.field === "(text)")).toBe(false);
  });

  it("audit lists NPCs without a motive and areas without a beat", () => {
    const rows = buildAudit({
      snapshot: snap(),
      verify: {},
      story: {
        exists: true,
        notRecorded: 0,
        errors: 0,
        warnings: 0,
        noMotive: ["Ned (quest giver)"],
        noBeat: ["Mill (mill)"],
        graphRequired: true,
      },
      dmGuideExists: true,
    });
    const story = rows[0];
    expect(story.state).toBe("partial");
    expect(story.findings.join("\n")).toMatch(/no motive on record for: Ned/);
    expect(story.findings.join("\n")).toMatch(/serve no story beat: Mill/);
    expect(story.findings.join("\n")).toMatch(/no story graph/);
  });
});
