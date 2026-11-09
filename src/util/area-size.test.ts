import { describe, expect, it } from "vitest";
import { suggestAreaSize } from "./area-size.js";

describe("suggestAreaSize", () => {
  it("cabin is 2x2 and inn is 2x4", () => {
    const cabin = suggestAreaSize({ biome: "interior", purpose: "cabin", events: 1 });
    expect([cabin.width, cabin.height]).toEqual([2, 2]);
    expect(cabin.method).toBe("paint_direct");
    const inn = suggestAreaSize({ biome: "interior", purpose: "inn", events: 1 });
    expect([inn.width, inn.height]).toEqual([2, 4]);
    expect(inn.notes.join(" ")).toContain("upper floor of the same size");
  });
  it("a forest with one event is 4x4; linear is 3x10", () => {
    const f = suggestAreaSize({ biome: "forest", events: 1 });
    expect([f.width, f.height]).toEqual([4, 4]);
    const l = suggestAreaSize({ biome: "forest", events: 1, shape: "linear" });
    expect([l.width, l.height, l.shape]).toEqual([3, 10, "linear"]);
  });
  it("more events grow the area, never past 32 per side", () => {
    const a = suggestAreaSize({ biome: "forest", events: 1 }).tiles;
    const b = suggestAreaSize({ biome: "forest", events: 4 }).tiles;
    expect(b).toBeGreaterThan(a);
    const huge = suggestAreaSize({ biome: "city_exterior", events: 500 });
    expect(huge.width).toBeLessThanOrEqual(32);
    expect(huge.height).toBeLessThanOrEqual(32);
    expect(suggestAreaSize({ biome: "forest", events: 100, shape: "linear" }).height).toBe(32);
  });
  it("small interiors stop at their cap and say so", () => {
    const r = suggestAreaSize({ biome: "interior", purpose: "cabin", events: 10 });
    expect(r.width).toBeLessThanOrEqual(3);
    expect(r.height).toBeLessThanOrEqual(4);
    expect(r.notes.join(" ")).toContain("cap");
  });
  it("picks the build method from the generator's real minimums", () => {
    expect(suggestAreaSize({ biome: "forest", events: 1 }).method).toBe("paint_direct");
    const city = suggestAreaSize({ biome: "city_exterior", events: 4 });
    expect(city.method).toBe("adventure_generate_layout");
    expect(city.rooms).toBe(4);
    expect(suggestAreaSize({ biome: "dungeon", events: 2 }).rooms).toBe(1);
  });
  it("needs a purpose for an interior and ignores linear where unsupported", () => {
    expect(() => suggestAreaSize({ biome: "interior", events: 1 })).toThrow();
    const r = suggestAreaSize({ biome: "city_exterior", events: 1, shape: "linear" });
    expect(r.shape).toBe("compact");
    expect(r.notes.join(" ")).toContain("no linear");
  });
});
