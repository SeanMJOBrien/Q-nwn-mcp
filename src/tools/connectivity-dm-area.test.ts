import { describe, expect, it } from "vitest";
import type { ModuleIndex } from "../types/module.js";
import { computeConnectivity } from "./analysis-tools.js";

describe("computeConnectivity", () => {
  it("does not report the DM area as unreachable: it is disconnected on purpose", () => {
    const index = {
      areas: new Map([["town", {}], ["cellar", {}], ["dm_area", {}]]),
      parsedGff: new Map(),
      resources: new Map(),
      tags: new Map(),
    } as unknown as ModuleIndex;
    const c = computeConnectivity(index, "town");
    expect(c.unreachable).toEqual(["cellar"]);
    expect(c.byDesign).toEqual(["dm_area"]);
  });
});
