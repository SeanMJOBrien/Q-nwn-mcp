import { describe, it, expect } from "vitest";
import { getFeatureCollar } from "./feature-collars.js";

describe("getFeatureCollar", () => {
  it("returns the curated collar for a known (tileset, group) pair", () => {
    const collar = getFeatureCollar("tts01", "Cave");
    expect(collar).toBeDefined();
    expect(collar!.length).toBe(3);
  });

  it("is case-insensitive on both tileset and group name", () => {
    const collar = getFeatureCollar("TTS01", "cave");
    expect(collar).toBeDefined();
    expect(collar!.length).toBe(3);
  });

  it("returns undefined for an unknown group in a known tileset", () => {
    expect(getFeatureCollar("tts01", "NotARealGroup")).toBeUndefined();
  });

  it("returns undefined for an unknown tileset", () => {
    expect(getFeatureCollar("notarealtileset", "Cave")).toBeUndefined();
  });

  it("has a collar entry for every group this session found and hand-verified", () => {
    // tts01 Cave: north/west/east collar (see docs/tileset-proving-grounds/PROGRESS.md Area 6)
    expect(getFeatureCollar("tts01", "Cave")).toEqual([
      { relX: 0, relY: 1, tileId: 0, orientation: 2 },
      { relX: -1, relY: 0, tileId: 1, orientation: 1 },
      { relX: 1, relY: 0, tileId: 3, orientation: 0 },
    ]);
    // tti01 Cave and Ramp: single east collar (see PROGRESS.md Area 17 follow-up)
    expect(getFeatureCollar("tti01", "Cave")).toEqual([
      { relX: 1, relY: 0, tileId: 3, orientation: 2 },
    ]);
    expect(getFeatureCollar("tti01", "Ramp")).toEqual([
      { relX: 1, relY: 0, tileId: 8, orientation: 2 },
    ]);
    // tcn01 CityGate_2x2: 4 collar tiles, one per corner tower (see PROGRESS.md Area 7 follow-up)
    expect(getFeatureCollar("tcn01", "CityGate_2x2")).toEqual([
      { relX: -1, relY: 0, tileId: 0, orientation: 3 },
      { relX: -1, relY: 1, tileId: 0, orientation: 2 },
      { relX: 2, relY: 0, tileId: 3, orientation: 0 },
      { relX: 2, relY: 1, tileId: 3, orientation: 3 },
    ]);
    // tcn01 ShipDocked_2x2: dock-crosser collar, west and east of the dock row
    // (see docs/tileset-proving-grounds/water-tile-gallery.md)
    expect(getFeatureCollar("tcn01", "ShipDocked_2x2")).toEqual([
      { relX: -1, relY: 1, tileId: 186, orientation: 3 },
      { relX: 2, relY: 1, tileId: 186, orientation: 1 },
    ]);
  });
});
