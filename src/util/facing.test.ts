import { describe, expect, it } from "vitest";
import {
  compassToOrientation,
  normalizeRadians,
  orientationToCompass,
  orientationToward,
  placeableBearingForCompass,
  placeableBearingToward,
  placeableFrontCompass,
} from "./facing.js";

const DEG = Math.PI / 180;

describe("compassToOrientation (creatures / waypoints)", () => {
  it("0 = north, 90 = east, 180 = south, 270 = west", () => {
    expect(compassToOrientation(0)).toEqual([0, 1]);
    expect(compassToOrientation(90)).toEqual([1, 0]);
    expect(compassToOrientation(180)).toEqual([0, -1]);
    expect(compassToOrientation(270)).toEqual([-1, 0]);
  });

  it("never produces negative zero", () => {
    for (const b of [0, 90, 180, 270, 360]) {
      for (const v of compassToOrientation(b)) expect(Object.is(v, -0)).toBe(false);
    }
  });

  it("round-trips through orientationToCompass", () => {
    for (const b of [0, 30, 90, 135, 180, 225, 270, 315]) {
      const [x, y] = compassToOrientation(b);
      expect(orientationToCompass(x, y)).toBeCloseTo(b, 0);
    }
  });
});

describe("orientationToward", () => {
  it("returns a unit vector toward the target", () => {
    expect(orientationToward({ x: 0, y: 0 }, { x: 0, y: 5 })).toEqual([0, 1]);
    expect(orientationToward({ x: 2, y: 2 }, { x: -3, y: 2 })).toEqual([-1, 0]);
    const [x, y] = orientationToward({ x: 0, y: 0 }, { x: 3, y: 4 })!;
    expect(x).toBeCloseTo(0.6, 5);
    expect(y).toBeCloseTo(0.8, 5);
  });

  it("is null for coincident points", () => {
    expect(orientationToward({ x: 1, y: 1 }, { x: 1, y: 1 })).toBeNull();
  });
});

describe("placeable Bearing (counter-clockwise, front faces south at 0)", () => {
  it("Bearing 0 faces south, +90 degrees faces east, 180 faces north, -90 faces west", () => {
    expect(placeableFrontCompass(0)).toBe(180);
    expect(placeableFrontCompass(90 * DEG)).toBe(90);
    expect(placeableFrontCompass(180 * DEG)).toBe(0);
    expect(placeableFrontCompass(-90 * DEG)).toBe(270);
  });

  it("placeableBearingForCompass is the inverse of placeableFrontCompass", () => {
    for (const c of [0, 45, 90, 135, 180, 225, 270, 315]) {
      expect(placeableFrontCompass(placeableBearingForCompass(c))).toBeCloseTo(c, 1);
    }
  });

  it("placeableBearingToward makes the front face the target (verified convention: Bearing = angle to target + 90 deg)", () => {
    // chair at the origin, table due east: front must face east => compass 90
    const east = placeableBearingToward({ x: 0, y: 0 }, { x: 4, y: 0 })!;
    expect(east).toBeCloseTo(Math.PI / 2, 4);
    expect(placeableFrontCompass(east)).toBe(90);
    // table due north => front faces north => compass 0, Bearing = pi
    const north = placeableBearingToward({ x: 0, y: 0 }, { x: 0, y: 4 })!;
    expect(Math.abs(north)).toBeCloseTo(Math.PI, 4);
    expect(placeableFrontCompass(north)).toBe(0);
    // table due south => Bearing 0
    expect(placeableBearingToward({ x: 0, y: 0 }, { x: 0, y: -4 })).toBeCloseTo(0, 4);
  });

  it("agrees with a real-data fact: a chair whose table lies at math angle theta has Bearing theta + 90 deg", () => {
    for (const thetaDeg of [-170, -90, -30, 0, 45, 120, 179]) {
      const t = thetaDeg * DEG;
      const b = placeableBearingToward({ x: 0, y: 0 }, { x: Math.cos(t) * 2, y: Math.sin(t) * 2 })!;
      expect(normalizeRadians(b - (t + Math.PI / 2))).toBeCloseTo(0, 3);
    }
  });

  it("is null for coincident points", () => {
    expect(placeableBearingToward({ x: 3, y: 3 }, { x: 3, y: 3 })).toBeNull();
  });

  it("creature and placeable raw bearings only agree at 90 and 270", () => {
    const creatureFront = (b: number) => b; // compass
    const placeableFront = (b: number) => placeableFrontCompass(b * DEG);
    expect(placeableFront(90)).toBe(creatureFront(90));
    expect(placeableFront(270)).toBe(creatureFront(270));
    expect(placeableFront(0)).not.toBe(creatureFront(0));
    expect(placeableFront(180)).not.toBe(creatureFront(180));
  });
});

describe("normalizeRadians", () => {
  it("maps into (-PI, PI]", () => {
    expect(normalizeRadians(3 * Math.PI)).toBeCloseTo(Math.PI, 6);
    expect(normalizeRadians(-3 * Math.PI)).toBeCloseTo(Math.PI, 6);
    expect(normalizeRadians(0.5)).toBeCloseTo(0.5, 9);
    expect(normalizeRadians(-Math.PI)).toBeCloseTo(Math.PI, 9);
  });
});
