import { describe, expect, it } from "vitest";
import { planTileDoors } from "./tile-doors.js";
import type { TileDefinition } from "./tileset.js";

function tile(id: number, crosser: string, type: number): TileDefinition {
  return {
    id,
    crossers: { top: crosser, right: "", bottom: "", left: "" },
    doorPlacements: [{ x: 0, y: -3, z: 0, orientation: 90, type }],
  } as unknown as TileDefinition;
}
const resref = (t: number) => (t === 17 ? "nw_door_ttr_08" : undefined);

describe("planTileDoors", () => {
  const tiles = [tile(0, "", 17), tile(1, "corridor", 17), tile(2, "", 0)];

  it("places a door at the tile-rotated position and locks a gate but not a corridor doorway", () => {
    const plan = planTileDoors(
      [
        { col: 2, row: 3, tileId: 0, orientation: 0 },
        { col: 5, row: 5, tileId: 1, orientation: 0 },
      ],
      tiles,
      resref,
      [],
    );
    expect(plan.doors).toHaveLength(2);
    expect(plan.doors[0]).toMatchObject({ x: 25, y: 32, bearing: 90, blueprint: "nw_door_ttr_08", lock: true });
    expect(plan.doors[1].lock).toBe(false);
  });

  it("rotates the position with the tile orientation", () => {
    const plan = planTileDoors([{ col: 0, row: 0, tileId: 0, orientation: 1 }], tiles, resref, []);
    expect(plan.doors[0].x).toBeCloseTo(5 + 3);
    expect(plan.doors[0].y).toBeCloseTo(5);
    expect(plan.doors[0].bearing).toBe(180);
  });

  it("skips a generic door type instead of guessing, and leaves an existing door alone", () => {
    const plan = planTileDoors(
      [
        { col: 0, row: 0, tileId: 2, orientation: 0 },
        { col: 2, row: 3, tileId: 0, orientation: 0 },
      ],
      tiles,
      resref,
      [{ x: 25.2, y: 32.1 }],
    );
    expect(plan.doors).toHaveLength(0);
    expect(plan.alreadyPlaced).toBe(1);
    expect(plan.skipped[0].reason).toContain("doortypes.2da");
  });
});
