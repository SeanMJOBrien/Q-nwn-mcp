import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type PlotSpec, renderPlot } from "./plot-spec.js";
import { type AreaFacts, buildChecklist, type ModuleFacts, nameMatches, nextStep, parsePlotOutline, recentNotes, renderProgress, stepTools } from "./progress.js";

const spec = JSON.parse(readFileSync("docs/specs/plot.example.json", "utf8")) as PlotSpec;
const story = (extra = "") => `# The Mill\n\n## Module\n- **Title:** The Mill\n\n## Plot\n${renderPlot(spec)}\n${extra}`;

const area = (o: Partial<AreaFacts> = {}): AreaFacts => ({
  width: 12, height: 12, tileset: "ttr01", distinctTiles: 1, props: 0, mapPins: 0, creatures: [], encounters: 0, stores: 0, ...o,
});
const facts = (o: Partial<ModuleFacts> = {}): ModuleFacts => ({
  areas: new Map([["_start", area()]]), graph: {}, entryArea: "_start", journalQuests: [], dmAreaResref: "dm_area",
  dmGuideWritten: false, scopeRecorded: true, ...o,
});

describe("build progress checklist", () => {
  it("reads locations, connections, NPCs and quests from a write_plot story", () => {
    const o = parsePlotOutline(renderPlot(spec));
    expect(o.locations.map((l) => l.resref)).toEqual(["blackwater", "millroad", "millcaves"]);
    expect(o.locations[0].tileset).toBe("ttr01");
    expect(o.connections).toContainEqual(["Blackwater Village", "The Mill Road"]);
    expect(o.npcs.map((n) => n.name)).toContain("Elder Maren");
    expect(o.quests.length).toBe(spec.quests.length);
    expect(o.merchant).toBe(true);
  });

  it("with only the plot written, the next step is creating the first area, with its exact call and the phase prompt", () => {
    const { items } = buildChecklist(story(), { plot: { status: "success" } }, facts());
    const next = nextStep(items);
    expect(next?.id).toBe("areas.blackwater.create");
    expect(next?.call).toContain("build_area(spec:");
    expect(next?.call).toContain('\\"resref\\":\\"blackwater\\"');
    expect(next?.call).toContain('\\"tileset\\":\\"ttr01\\"');
    expect(next?.readFirst).toBe('get_phase_prompt(phase: "areas")');
    expect(next?.areas).toEqual(["blackwater"]);
    expect(next?.tools).toContain("build_area");
  });

  it("an area that exists but has one tile everywhere asks for the layout (build_area reuses the empty area)", () => {
    const { items } = buildChecklist(story(), { plot: { status: "success" } }, facts({ areas: new Map([["blackwater", area()]]) }));
    const next = nextStep(items);
    expect(next?.id).toBe("areas.blackwater.tiles");
    expect(next?.call).toContain("build_area(spec:");
    expect(next?.call).toContain("existing empty area");
    expect(next?.readFirst).toBeUndefined();
  });

  it("ticks from the module state: connections, start, pins and placed NPCs", () => {
    const areas = new Map([
      ["blackwater", area({ distinctTiles: 9, props: 8, mapPins: 2, creatures: [{ name: "Maren", hostile: false }] })],
      ["millroad", area({ distinctTiles: 9 })],
    ]);
    const { items } = buildChecklist(story(), { plot: { status: "success" } }, facts({ areas, entryArea: "blackwater", graph: { blackwater: ["millroad"] } }));
    const byId = new Map(items.map((i) => [i.id, i]));
    expect(byId.get("areas.link.blackwater.millroad")?.done).toBe(true);
    expect(byId.get("areas.link.millroad.millcaves")?.done).toBe(false);
    expect(byId.get("areas.start")?.done).toBe(true);
    expect(byId.get("environment.blackwater.pins")?.done).toBe(true);
    expect(byId.get("environment.millroad.pins")?.done).toBe(false);
    expect(byId.get("actors.elder_maren")?.done).toBe(true);
  });

  it("a skipped phase has no steps; a partial phase check says why", () => {
    const { items } = buildChecklist(story(), { plot: { status: "success" }, areas: { status: "partial", errors: ["a", "b"] }, environment: { status: "skipped" } }, facts());
    expect(items.some((i) => i.phase === "environment")).toBe(false);
    expect(items.find((i) => i.id === "areas.check")?.detail).toContain("2 errors");
  });

  it("matches NPC names to placed creatures by containment or surname", () => {
    expect(nameMatches("Harbor-Marshal Brynna Stonewake", "Brynna Stonewake")).toBe(true);
    expect(nameMatches("Captain Yorrin Vask", "Yorrin Vask")).toBe(true);
    expect(nameMatches("Elder Maren", "Goblin")).toBe(false);
  });

  it("the saved form keeps earlier notes and adds the new one", () => {
    const { items } = buildChecklist(story(), undefined, facts());
    const first = renderProgress("The Mill", items, null, "user wants a night-time road");
    expect(first).toContain("- [ ] ");
    expect(first).toContain("user wants a night-time road");
    const second = renderProgress("The Mill", items, first, "bandits instead of goblins");
    expect(second).toContain("user wants a night-time road");
    expect(second).toContain("bandits instead of goblins");
  });

  it("with no story at all the first step is recording the goal or the Module section", () => {
    const { items } = buildChecklist(null, undefined, facts({ scopeRecorded: false }));
    expect(nextStep(items)?.id).toBe("start.scope");
  });

  it("checks what the Challenges, Environment and Affordances sections say they placed, per area", () => {
    const extra = [
      "## Environment",
      "### Caves under the Mill (`millcaves`)",
      "**Containers:** plc_chest1 (chest_cave1) at (61, 44); plc_box1 (box_cave2) at (20, 20)",
      "## Challenges",
      "### Caves under the Mill (`millcaves`)",
      "**Group 1 (medium):** nw_goblina x3 at (55, 62)",
      "**Boss:** Grukk the Shaman (`boss_grukk`), EL 3, with 2 goblins",
      "**Traps:** trap_spike_01 at (55, 45), Reflex DC 12, 1d6; trap_fire_02 at (70, 45), Reflex DC 12, 1d6 fire",
      "## Affordances",
      "### Stores",
      "- General Store (`str_tobb`) in `blackwater` at (46, 62), opened from `dlg_tobb`.",
      "### Container Loot",
      "- `millcaves` box_cave2: 2x cure light wounds",
    ].join("\n");
    const areas = new Map([
      ["blackwater", area({ distinctTiles: 9, storeTags: ["str_tobb"], containers: [] })],
      [
        "millcaves",
        area({
          distinctTiles: 9,
          creatures: [{ name: "Goblin", hostile: true }, { name: "Grukk", hostile: true, resref: "boss_grukk" }],
          triggerTags: ["trap_spike_01"],
          containers: [{ tag: "chest_cave1", items: 0 }],
        }),
      ],
    ]);
    const { items } = buildChecklist(story(extra), { plot: { status: "success" } }, facts({ areas }));
    const byId = new Map(items.map((i) => [i.id, i]));
    expect(byId.get("environment.millcaves.c.chest_cave1")?.done).toBe(true);
    expect(byId.get("environment.millcaves.c.box_cave2")?.done).toBe(false);
    expect(byId.get("challenges.millcaves.boss.grukk_the_shaman")?.done).toBe(true);
    expect(byId.get("challenges.millcaves.trap.trap_spike_01")?.done).toBe(true);
    expect(byId.get("challenges.millcaves.trap.trap_fire_02")?.done).toBe(false);
    expect(byId.get("affordances.store.str_tobb")?.done).toBe(true);
    expect(byId.get("affordances.millcaves.c.box_cave2")?.done).toBe(false);
    // the boss area's chest is left to the rewards phase
    expect(byId.has("affordances.millcaves.loot")).toBe(false);
  });

  it("keeps the latest decisions from the Notes for a new conversation", () => {
    const { items } = buildChecklist(story(), undefined, facts());
    let md = renderProgress("The Mill", items, null, "night-time road");
    md = renderProgress("The Mill", items, md, "bandits instead of goblins");
    const notes = recentNotes(md);
    expect(notes.length).toBe(2);
    expect(notes[1]).toContain("bandits instead of goblins");
  });

  it("names a small tool set for each kind of step", () => {
    expect(stepTools("areas.millroad.create")).toContain("build_area");
    expect(stepTools("areas.link.a.b")).toContain("adventure_create_transition");
    expect(stepTools("environment.millroad.pins")).toContain("dress_area");
    expect(stepTools("challenges.millcaves.trap.trap_spike_01")).toContain("place_trigger");
    expect(stepTools("areas.section")).toEqual(["write_story_section"]);
    for (const id of ["areas.x.create", "actors.maren", "quests.q", "affordances.x.loot"]) expect(stepTools(id).length).toBeLessThanOrEqual(8);
  });
});

describe("challenge steps from the plot", () => {
  it("hand the driver a build_enemy_group call from the plot's challenge line", async () => {
    const { buildChecklist } = await import("./progress.js");
    const story = "## Module\n- **Target Level:** 3\n## Plot\n### Locations\n#### 1. The Mill\n- **Resref:** mill\n- **Tileset:** ttr01\n- **Purpose:** adventure\n### Challenges\n- The Mill: 2 bandits, 1 trap\n";
    const facts = {
      areas: new Map([["mill", { width: 9, height: 9, tileset: "ttr01", distinctTiles: 4, props: 6, mapPins: 1, creatures: [], encounters: 0, stores: 0, storeTags: [], triggerTags: [], containers: [] }]]),
      graph: {},
      entryArea: "mill",
      journalQuests: [],
      dmAreaResref: "dm_area",
      dmGuideWritten: false,
      scopeRecorded: true,
    };
    const { items } = buildChecklist(story, undefined, facts as never);
    const step = items.find((i) => i.id === "challenges.mill");
    expect(step?.auto).toEqual({ tool: "build_enemy_group", args: { area: "mill", kind: "bandit", count: "2" } });
    expect(step?.call).toContain("(the plot: 2 bandits, 1 trap)");
  });
});

describe("actor and quest steps from the plot", () => {
  const story = [
    "## Module", "- **Target Level:** 3", "## Plot", "### Locations", "#### 1. Mill", "- **Resref:** mill", "- **Tileset:** ttf02",
    "#### 2. Bandit Camp", "- **Resref:** banditcamp", "- **Tileset:** ttf02",
    "### Key NPCs", "#### Mill Owner", "- **Location:** Mill", "- **Role:** quest giver", "- **Race, class, gender:** human cleric, male",
    "#### Bandit Leader", "- **Location:** Bandit Camp", "- **Role:** antagonist", "- **Race, class, gender:** half-orc fighter, female",
    "### Quest Objectives", "#### Primary Quest: Rescue the Millers Daughter",
    "**Stage 1:** The Mill Owner asks the party to rescue his daughter.", "**Stage 2:** The party defeats the Bandit Leader.", "**Stage 3 (Resolution):** The daughter is home.",
  ].join("\n");
  const area = (creatures: Array<{ name: string; hostile: boolean; tag: string; resref: string }>) => ({ width: 9, height: 9, tileset: "ttf02", distinctTiles: 4, props: 6, mapPins: 1, creatures, encounters: 0, stores: 0, storeTags: [], triggerTags: [], containers: [] });
  const facts = (mill: Parameters<typeof area>[0], camp: Parameters<typeof area>[0]) =>
    ({ areas: new Map([["mill", area(mill)], ["banditcamp", area(camp)]]), graph: {}, entryArea: "mill", journalQuests: [], dmAreaResref: "dm_area", dmGuideWritten: false, scopeRecorded: true }) as never;

  it("hand the driver build_key_npc with the plot's name, race, class, gender and faction", () => {
    const { items } = buildChecklist(story, undefined, facts([], []));
    expect(items.find((i) => i.id === "actors.mill_owner")?.auto).toEqual({
      tool: "build_key_npc",
      args: { resref: "mill_owner", name: "Mill Owner", area: "mill", race: "6", classId: "2", level: "3", gender: "0", faction: "commoner", conversation: "mill_owner" },
    });
    expect(items.find((i) => i.id === "actors.bandit_leader")?.auto?.args).toMatchObject({ race: "5", classId: "4", level: "4", gender: "1", faction: "hostile" });
  });

  it("hand the driver a talk-kill-return quest with the real tags once both people stand", () => {
    expect(buildChecklist(story, undefined, facts([], [])).items.find((i) => i.id.startsWith("quests.rescue"))?.auto).toBeUndefined();
    const placed = facts([{ name: "Mill Owner", hostile: false, tag: "mill_owner", resref: "mill_owner" }], [{ name: "Bandit Leader", hostile: true, tag: "bandit_leader", resref: "bandit_leader" }]);
    const step = buildChecklist(story, undefined, placed).items.find((i) => i.id.startsWith("quests.rescue"));
    const spec = JSON.parse(String(step?.auto?.args.spec));
    expect(spec).toMatchObject({ name: "Rescue the Millers Daughter", giver: "mill_owner", level: 3 });
    expect(spec.stages.map((s: { do: string }) => s.do)).toEqual(["talk", "kill", "return"]);
    expect(spec.stages[1]).toMatchObject({ target: "bandit_leader", journal: "The party defeats the Bandit Leader." });
    expect(buildChecklist(story, undefined, placed).items.find((i) => i.id === "actors.mill_owner")?.done).toBe(true);
  });
});
