import { describe, expect, it } from "vitest";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../types/module.js";
import { applyDefaultItemModels } from "./item-models.js";

function makeIndex(modelType?: string): ModuleIndex {
  const twodaTables = new Map<string, TwoDATable>();
  if (modelType !== undefined) {
    twodaTables.set("baseitems", {
      columns: ["ModelType"],
      rows: new Map([[4, { ModelType: modelType }]]),
    });
  }
  return {
    modPath: "",
    tempDir: "",
    moduleName: "",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables,
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
  };
}

const item = (parts: Partial<Record<"ModelPart1" | "ModelPart2" | "ModelPart3", number>>): GffObj => {
  const obj: GffObj = { BaseItem: { type: "int", value: 4 } } as GffObj;
  for (const [field, value] of Object.entries(parts)) {
    obj[field] = { type: "byte", value };
  }
  return obj;
};

describe("applyDefaultItemModels", () => {
  it("fills all three parts for a composite weapon", () => {
    const obj = item({});
    const defaulted = applyDefaultItemModels(obj, makeIndex("2"));

    expect(defaulted).toEqual(["ModelPart1", "ModelPart2", "ModelPart3"]);
    expect((obj.ModelPart1 as { value: number }).value).toBe(1);
    expect((obj.ModelPart2 as { value: number }).value).toBe(1);
    expect((obj.ModelPart3 as { value: number }).value).toBe(1);
  });

  it("fills only the zeroed parts, leaving explicit choices alone", () => {
    const obj = item({ ModelPart1: 5, ModelPart2: 0, ModelPart3: 0 });
    const defaulted = applyDefaultItemModels(obj, makeIndex("2"));

    expect(defaulted).toEqual(["ModelPart2", "ModelPart3"]);
    expect((obj.ModelPart1 as { value: number }).value).toBe(5);
  });

  it("only requires ModelPart1 for a simple-model item", () => {
    const obj = item({});
    const defaulted = applyDefaultItemModels(obj, makeIndex("0"));

    expect(defaulted).toEqual(["ModelPart1"]);
    expect(obj.ModelPart2).toBeUndefined();
  });

  it("does nothing when every part is already set", () => {
    const obj = item({ ModelPart1: 2, ModelPart2: 3, ModelPart3: 4 });
    expect(applyDefaultItemModels(obj, makeIndex("2"))).toEqual([]);
  });

  it("falls back to ModelPart1 when baseitems.2da is unavailable", () => {
    const obj = item({});
    expect(applyDefaultItemModels(obj, makeIndex())).toEqual(["ModelPart1"]);
  });
});
