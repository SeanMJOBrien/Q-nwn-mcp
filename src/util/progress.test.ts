import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { type PlotSpec, renderPlot } from "./plot-spec.js";
import { type AreaFacts, buildChecklist, type ModuleFacts, nameMatches, nextStep, parsePlotOutline, renderProgress } from "./progress.js";

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
    expect(next?.call).toContain('create_area(resref: "blackwater"');
    expect(next?.call).toContain('tileset: "ttr01"');
    expect(next?.readFirst).toBe('get_phase_prompt(phase: "areas")');
  });

  it("an area that exists but has one tile everywhere asks for the layout, by layoutId", () => {
    const { items } = buildChecklist(story(), { plot: { status: "success" } }, facts({ areas: new Map([["blackwater", area()]]) }));
    const next = nextStep(items);
    expect(next?.id).toBe("areas.blackwater.tiles");
    expect(next?.call).toContain('adventure_apply_layout(area: "blackwater", layoutId:');
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
});
