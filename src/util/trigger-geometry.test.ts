import { describe, expect, it } from "vitest";
import { rectTriggerGeometry, rectTriggerPoints } from "./trigger-geometry.js";

describe("rectTriggerPoints", () => {
  it("lays the width across a north-south route at bearing 0", () => {
    expect(rectTriggerPoints(6, 2)).toEqual([
      { x: -3, y: -1 },
      { x: 3, y: -1 },
      { x: 3, y: 1 },
      { x: -3, y: 1 },
    ]);
  });

  it("turns clockwise by compass bearing and keeps the size", () => {
    const east = rectTriggerPoints(6, 2, 90);
    const xs = east.map((p) => p.x);
    const ys = east.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBe(2); // depth along X (route runs east)
    expect(Math.max(...ys) - Math.min(...ys)).toBe(6); // width along Y
    const diag = rectTriggerPoints(4, 4, 45);
    expect(Math.max(...diag.map((p) => p.x))).toBeCloseTo(2 * Math.SQRT2, 2);
  });

  it("keeps counter-clockwise winding at every bearing", () => {
    for (const b of [0, 37, 90, 180, 270]) {
      const p = rectTriggerPoints(5, 3, b);
      let area2 = 0;
      for (let i = 0; i < p.length; i++) {
        const q = p[(i + 1) % p.length];
        area2 += p[i].x * q.y - q.x * p[i].y;
      }
      expect(area2 / 2).toBeCloseTo(15, 1);
    }
  });

  it("builds a GFF Geometry list raised above the walk plane", () => {
    const g = rectTriggerGeometry(4, 4) as { type: string; value: Array<Record<string, { value: number }>> };
    expect(g.type).toBe("list");
    expect(g.value).toHaveLength(4);
    expect(g.value[0].PointZ.value).toBe(0.025);
  });
});
