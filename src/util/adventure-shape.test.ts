import { describe, expect, it } from "vitest";
import { ENCOUNTER_KINDS, planAdventureShape } from "./adventure-shape.js";

describe("planAdventureShape", () => {
  it("fills the time with events, one boss per ~90 minutes, boss last", () => {
    const p = planAdventureShape({ playMinutes: 180 });
    expect(p.kinds.boss).toBe(2);
    expect(p.totalEvents).toBeGreaterThan(8);
    const sum = p.areas.reduce((a, x) => a + x.events.length, 0);
    expect(sum).toBe(p.totalEvents);
    expect(p.areas[p.areas.length - 1].events).toContain("boss");
    expect(p.areas[p.areas.length - 1].act).toBe("climax");
    expect(p.areas[0].act).toBe("setup");
  });
  it("opens with a friendly or discovery event", () => {
    const p = planAdventureShape({ playMinutes: 120 });
    expect(["friendly", "discovery"]).toContain(p.areas[0].events[0]);
  });
  it("more time means more areas and events; short runs still get two areas", () => {
    const short = planAdventureShape({ playMinutes: 45 });
    const long = planAdventureShape({ playMinutes: 360 });
    expect(short.areaCount).toBeGreaterThanOrEqual(2);
    expect(long.areaCount).toBeGreaterThan(short.areaCount);
    expect(long.totalEvents).toBeGreaterThan(short.totalEvents);
  });
  it("leaves out friendly encounters and chains on request, and says so", () => {
    const p = planAdventureShape({ playMinutes: 150, friendly: false, chains: false });
    expect(p.kinds.friendly).toBeUndefined();
    expect(p.kinds.rest).toBeUndefined();
    expect(p.kinds.chain).toBeUndefined();
    expect(p.notes.join(" ")).toContain("No friendly");
  });
  it("sizes areas through suggest_area_size when a biome is given and warns when events outgrow it", () => {
    const p = planAdventureShape({ playMinutes: 240, biome: "forest" });
    expect(p.areas.every((a) => a.size)).toBe(true);
    expect(p.notes.some((n) => n.includes("want about"))).toBe(true);
  });
  it("only uses known kinds", () => {
    const p = planAdventureShape({ playMinutes: 200 });
    for (const a of p.areas) for (const k of a.events) expect(ENCOUNTER_KINDS).toContain(k);
  });
});
