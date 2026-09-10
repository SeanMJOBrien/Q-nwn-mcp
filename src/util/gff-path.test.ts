import { describe, it, expect } from "vitest";
import { getGffByPath, setGffByPath } from "./gff-path.js";
import type { GffDocument, GffObj } from "../types/gff.js";

// Minimal GFF document fixtures
function makeDoc(): GffDocument {
  return {
    Tag: { type: "cexostring", value: "MY_TAG" },
    ChallengeRating: { type: "float", value: 3.5 },
    FactionID: { type: "dword", value: 1 },
    ClassList: {
      type: "list",
      value: [
        {
          __struct_id: 0,
          Class: { type: "int", value: 1 },
          ClassLevel: { type: "short", value: 5 },
        },
        {
          __struct_id: 0,
          Class: { type: "int", value: 4 },
          ClassLevel: { type: "short", value: 2 },
        },
      ],
    },
    Nested: {
      type: "struct",
      value: {
        __struct_id: 0,
        Inner: { type: "cexostring", value: "deep" },
      },
    },
  } as unknown as GffDocument;
}

describe("getGffByPath", () => {
  it("reads a top-level scalar field", () => {
    const doc = makeDoc();
    const field = getGffByPath(doc, "Tag");
    expect(field).toEqual({ type: "cexostring", value: "MY_TAG" });
  });

  it("reads a top-level numeric field", () => {
    const doc = makeDoc();
    const field = getGffByPath(doc, "ChallengeRating");
    expect(field?.value).toBe(3.5);
  });

  it("reads a list item by index", () => {
    const doc = makeDoc();
    const field = getGffByPath(doc, "ClassList.0.Class");
    expect(field?.value).toBe(1);
  });

  it("reads a second list item by index", () => {
    const doc = makeDoc();
    const field = getGffByPath(doc, "ClassList.1.ClassLevel");
    expect(field?.value).toBe(2);
  });

  it("navigates into nested struct", () => {
    const doc = makeDoc();
    const field = getGffByPath(doc, "Nested.Inner");
    expect(field?.value).toBe("deep");
  });

  it("returns undefined for missing top-level field", () => {
    const doc = makeDoc();
    expect(getGffByPath(doc, "NonExistent")).toBeUndefined();
  });

  it("returns undefined for out-of-bounds list index", () => {
    const doc = makeDoc();
    expect(getGffByPath(doc, "ClassList.99.Class")).toBeUndefined();
  });

  it("returns undefined for negative list index", () => {
    const doc = makeDoc();
    expect(getGffByPath(doc, "ClassList.-1.Class")).toBeUndefined();
  });

  it("returns undefined for missing nested field", () => {
    const doc = makeDoc();
    expect(getGffByPath(doc, "Nested.Missing")).toBeUndefined();
  });
});

describe("setGffByPath", () => {
  it("updates a top-level scalar field", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "Tag", "NEW_TAG");
    expect("previousValue" in result && result.previousValue).toBe("MY_TAG");
    expect((doc as GffObj).Tag).toEqual({ type: "cexostring", value: "NEW_TAG" });
  });

  it("updates a list item field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "ClassList.0.Class", 99);
    const field = getGffByPath(doc, "ClassList.0.Class");
    expect(field?.value).toBe(99);
  });

  it("returns error for missing field without gffType", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "MissingField", "value");
    expect("error" in result).toBe(true);
  });

  it("creates a new field when gffType is provided", () => {
    const doc = makeDoc();
    setGffByPath(doc, "NewField", "hello", "cexostring");
    const field = getGffByPath(doc, "NewField");
    expect(field?.value).toBe("hello");
  });

  it("returns error for path that doesn't exist at intermediate node", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "Nonexistent.Nested.Field", "value");
    expect("error" in result).toBe(true);
  });

  // Regression coverage for the documented modify_gff_field corruption:
  // MCP clients routinely send numeric-looking params as strings (see
  // util/params.ts) — a float/int field must coerce that back to a real
  // number, not store the string verbatim.
  it("coerces a string value to a real number on an existing float field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "ChallengeRating", "7.5");
    const field = (doc as GffObj).ChallengeRating as { type: string; value: unknown };
    expect(field.value).toBe(7.5);
    expect(typeof field.value).toBe("number");
  });

  it("coerces a string value to a real integer on an existing int/dword field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "FactionID", "2");
    const field = (doc as GffObj).FactionID as { type: string; value: unknown };
    expect(field.value).toBe(2);
    expect(typeof field.value).toBe("number");
  });

  it("truncates a float passed for an integer-typed field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "FactionID", 2.9);
    const field = (doc as GffObj).FactionID as { type: string; value: unknown };
    expect(field.value).toBe(2);
  });

  it("coerces a numeric value to a string on an existing cexostring field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "Tag", 123 as unknown as string);
    const field = (doc as GffObj).Tag as { type: string; value: unknown };
    expect(field.value).toBe("123");
  });

  it("returns an error rather than storing NaN for an unparseable number", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "ChallengeRating", "not-a-number");
    expect("error" in result).toBe(true);
    const field = (doc as GffObj).ChallengeRating as { type: string; value: unknown };
    expect(field.value).toBe(3.5); // unchanged
  });

  it("coerces a string value on a newly-created float field", () => {
    const doc = makeDoc();
    setGffByPath(doc, "NewFloat", "12.5", "float");
    const field = getGffByPath(doc, "NewFloat");
    expect(field?.value).toBe(12.5);
    expect(typeof field?.value).toBe("number");
  });

  it("refuses to set an existing list-typed field", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "ClassList", []);
    expect("error" in result).toBe(true);
    // Original list must survive untouched.
    expect(getGffByPath(doc, "ClassList.0.Class")?.value).toBe(1);
  });

  it("refuses to create a new list-typed field", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "NewList", [], "list");
    expect("error" in result).toBe(true);
    expect(getGffByPath(doc, "NewList")).toBeUndefined();
  });

  it("refuses to set an existing struct-typed field", () => {
    const doc = makeDoc();
    const result = setGffByPath(doc, "Nested", {});
    expect("error" in result).toBe(true);
  });
});
