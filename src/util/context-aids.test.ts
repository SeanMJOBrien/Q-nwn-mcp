import { describe, expect, it } from "vitest";
import { z } from "zod";
import { checkAreaSpec, renderCard, spreadPoints } from "../tools/area-build-tools.js";
import { AREA_RECIPES, pickFeatures } from "./area-recipes.js";
import { getKeptResult, keepResult, shapeLongText, valueAtPath } from "./result-store.js";
import { resultShapingFromEnv, shapeResult } from "./result-shaping.js";
import { callTool, isReadOnlyTool, recordTools } from "./tool-registry.js";

describe("long results kept behind an id", () => {
  const big = { area: "mill", tiles: Array.from({ length: 400 }, (_, i) => ({ x: i % 20, y: Math.floor(i / 20), id: i })), objects: { creatures: [{ tag: "maren" }] } };
  const text = JSON.stringify(big);

  it("answers an outline with the id, and the kept result gives each part back", () => {
    const id = keepResult(text);
    const out = shapeLongText(text, 2000, id);
    expect(out.length).toBeLessThanOrEqual(2000);
    const o = JSON.parse(out);
    expect(o.resultId).toBe(id);
    expect(o.outline.area).toBe("mill");
    expect(o.outline.tiles.list).toBe(400);
    expect(getKeptResult(id)).toBe(text);
    const part = valueAtPath(JSON.parse(text), "objects.creatures.0.tag");
    expect(part).toEqual({ ok: true, value: "maren" });
  });

  it("a wrong path says what is there", () => {
    const r = valueAtPath(big, "objects.doors");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("creatures");
  });

  it("short results are unchanged; plain text is cut with an offset to continue", () => {
    expect(shapeLongText("short", 100, "r1")).toBe("short");
    const plain = "x".repeat(5000);
    expect(shapeLongText(plain, 1000, "r9")).toContain('offset: ');
  });
});

describe("progress line and result shaping", () => {
  it("is on with a profile, off without, and the env overrides", () => {
    expect(resultShapingFromEnv(true, {})).toEqual({ footer: true, limit: 6000 });
    expect(resultShapingFromEnv(false, {})).toEqual({ footer: false, limit: 0 });
    expect(resultShapingFromEnv(false, { MCP_PROGRESS_FOOTER: "1", MCP_RESULT_LIMIT: "3000" })).toEqual({ footer: true, limit: 3000 });
  });

  it("adds the line as its own text item and keeps long results, not for get_progress or phase_check", async () => {
    const footer = async () => "[progress 3/10 · areas · next: x → y]";
    const r = await shapeResult("create_area", { content: [{ type: "text", text: "{\"ok\":true}" }] }, false, { footer: true, limit: 100 }, footer);
    expect(r.content?.length).toBe(2);
    expect(r.content?.[0].text).toBe("{\"ok\":true}");
    expect(r.content?.[1].text).toContain("[progress 3/10");
    const long = JSON.stringify({ a: "y".repeat(500) });
    const kept = await shapeResult("visualize_area", { content: [{ type: "text", text: long }] }, true, { footer: false, limit: 200 }, footer);
    expect(JSON.parse(kept.content?.[0].text ?? "").resultId).toMatch(/^r\d+$/);
    const whole = await shapeResult("phase_check", { content: [{ type: "text", text: long }] }, true, { footer: true, limit: 200 }, footer);
    expect(whole.content?.[0].text).toBe(long);
    const own = await shapeResult("get_progress", { content: [{ type: "text", text: "{}" }] }, false, { footer: true, limit: 0 }, footer);
    expect(own.content?.length).toBe(1);
  });
});

describe("tool registry", () => {
  it("records handlers and runs them with lenient arguments", async () => {
    const registered: string[] = [];
    const fake = { tool: (name: string) => registered.push(name) };
    const server = recordTools(fake);
    server.tool("t_add", "adds", { a: z.string(), b: z.string().optional() }, { readOnlyHint: true }, async ({ a, b }: { a: string; b?: string }) => ({
      content: [{ type: "text", text: JSON.stringify({ sum: Number(a) + Number(b ?? 0) }) }],
    }));
    expect(registered).toEqual(["t_add"]);
    expect(isReadOnlyTool("t_add")).toBe(true);
    const r = await callTool("t_add", { a: 2, b: "3" });
    expect(r.json).toEqual({ sum: 5 });
    expect((await callTool("nope", {})).isError).toBe(true);
  });
});

describe("build_area spec and recipes", () => {
  it("accepts a short spec and names the failing field", () => {
    const ok = checkAreaSpec({ resref: "millroad", name: "The Mill Road", tileset: "TTR01", connections: 2 });
    expect("spec" in ok && ok.spec.tileset).toBe("ttr01");
    const bad = checkAreaSpec({ resref: "Mill Road", name: "", tileset: "xyz01", colour: "red" });
    expect("errors" in bad).toBe(true);
    if ("errors" in bad) expect(bad.errors.map((e) => e.field).sort()).toEqual(["colour", "name", "resref", "style"]);
  });

  it("knows the style, biome and music of the usual tilesets", () => {
    expect(AREA_RECIPES.ttf01.style).toBe("forest");
    expect(AREA_RECIPES.tin01.biome).toBe("interior");
    expect(AREA_RECIPES.tdm01.music.dayNightCycle).toBe(false);
  });

  it("picks features that share a word with the area first, then the smallest", () => {
    const groups = [
      { name: "Big Castle", columns: 4, rows: 4 },
      { name: "Windmill", columns: 2, rows: 2 },
      { name: "Mill House", columns: 2, rows: 3 },
      { name: "Well", columns: 1, rows: 1 },
    ];
    expect(pickFeatures(groups, "The Old Mill", 2)).toEqual(["Mill House", "Well"]);
  });
});

describe("dress_area spread and area cards", () => {
  it("spreads points apart and away from what to avoid", () => {
    const grid = Array.from({ length: 100 }, (_, i) => ({ x: (i % 10) * 5, y: Math.floor(i / 10) * 5 }));
    const picked = spreadPoints(grid, 4, [{ x: 0, y: 0 }], 4);
    expect(picked.length).toBe(4);
    for (const p of picked) expect(Math.hypot(p.x, p.y)).toBeGreaterThanOrEqual(4);
    const d = Math.min(...picked.flatMap((a, i) => picked.slice(i + 1).map((b) => Math.hypot(a.x - b.x, a.y - b.y))));
    expect(d).toBeGreaterThan(20);
  });

  it("a card lists exits, free transition points, pins and open ground in a few lines", () => {
    const card = renderCard(
      {
        resref: "millroad", name: "The Mill Road", tileset: "ttr01", width: 10, height: 20, tileKinds: 9,
        exits: [{ x: 15, y: 15, to: "blackwater", kind: "" }], doors: [], pins: [{ x: 17, y: 17, text: "To Blackwater" }],
        props: 6, propPoints: [], containers: [{ x: 50, y: 50, tag: "chest_1", items: 2 }], friendly: [], hostile: 3, stores: [], triggers: [],
      },
      { style: "rural", features: [], transitionPoints: [{ x: 15, y: 14 }, { x: 85, y: 190, direction: "north" }] },
      [{ x: 40, y: 60 }],
    );
    expect(card.split("\n").length).toBeLessThanOrEqual(7);
    expect(card).toContain("to blackwater at (15, 15)");
    expect(card).toContain("(85, 190) north");
    expect(card).not.toContain("(15, 14)");
    expect(card).toContain("open ground: (40, 60)");
  });
});

describe("starting gold and containers", async () => {
  const { startKitSource, xpForLevel, START_KIT_MARK } = await import("../tools/start-kit-tools.js");
  const { isContainerPlaceable } = await import("./containers.js");
  const { buildChecklist } = await import("./progress.js");

  it("writes a once-per-player script that tops up to the wealth and chains the old handler", () => {
    const src = startKitSource(3, 2700, true, "x2_mod_def_enter");
    expect(START_KIT_MARK.exec(src)?.slice(1)).toEqual(["3", "2700"]);
    expect(src).toContain(`const int START_XP = ${xpForLevel(3)};`);
    expect(xpForLevel(3)).toBe(3000);
    expect(src).toContain('const string PREVIOUS_ENTER = "x2_mod_def_enter";');
    expect(src).toContain("GiveGoldToCreature(oPC, nShort)");
    expect(startKitSource(3, 100, false, "")).toContain("const int START_XP = 0;");
  });

  it("an empty placed chest is still a container", () => {
    const f = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).map(([k, x]) => [k, typeof x === "number" ? { type: "byte", value: x } : { type: "resref", value: x }]));
    expect(isContainerPlaceable(f({ TemplateResRef: "plc_chest1", Tag: "Chest", HasInventory: 0 }))).toBe(true);
    expect(isContainerPlaceable(f({ TemplateResRef: "plc_well", Tag: "Well", HasInventory: 0 }))).toBe(false);
    expect(isContainerPlaceable(f({ TemplateResRef: "plc_well", Tag: "Well", HasInventory: 1 }))).toBe(true);
  });

  it("the checklist asks for starting gold at the story's level", () => {
    const story = "# M\n\n## Module\n- **Target Level:** 3\n";
    const base = { areas: new Map(), graph: {}, entryArea: "", journalQuests: [], dmAreaResref: "dm_area", dmGuideWritten: false, scopeRecorded: true };
    const open = buildChecklist(story, undefined, { ...base, startingGold: false }).items.find((i) => i.id === "affordances.gold");
    expect(open?.done).toBe(false);
    expect(open?.call).toBe('set_starting_gold(level: "3")');
    expect(buildChecklist(story, undefined, { ...base, startingGold: true }).items.find((i) => i.id === "affordances.gold")?.done).toBe(true);
  });
});
