import { describe, expect, it } from "vitest";
import { bookBlueprint, bookSpecs, splitVolumes } from "./dm-books.js";

describe("DM books", () => {
  it("keeps short text in one volume and splits long text at paragraph breaks", () => {
    expect(splitVolumes("one\n\ntwo", 100)).toEqual(["one\n\ntwo"]);
    const para = "x".repeat(40);
    const v = splitVolumes([para, para, para, para].join("\n\n"), 100);
    expect(v).toHaveLength(2);
    expect(v.every((s) => s.length <= 100)).toBe(true);
    expect(v.join("\n\n")).toBe([para, para, para, para].join("\n\n"));
  });
  it("cuts a single over-long paragraph and never loses text", () => {
    const text = "word ".repeat(100).trim();
    const v = splitVolumes(text, 120);
    expect(v.every((s) => s.length <= 120)).toBe(true);
    expect(v.join(" ").replace(/\s+/g, " ")).toBe(text);
  });
  it("names single books and volumes with resrefs the audit finds (story / guide) within 16 characters", () => {
    const one = bookSpecs("guide", "The Salt Gate Conspiracy", "short");
    expect(one).toHaveLength(1);
    expect(one[0].resref).toBe("dm_book_guide");
    const many = bookSpecs("story", "T", "p\n\n".repeat(5000));
    expect(many.length).toBeGreaterThan(1);
    expect(many[0].resref).toBe("dm_book_story_1");
    expect(many.every((b) => b.resref.length <= 16 && /story/.test(b.tag))).toBe(true);
    expect(many[1].name).toContain("Volume 2 of");
  });
  it("builds a Book item (base item 74) with the text as its description", () => {
    const doc = bookBlueprint(bookSpecs("story", "T", "hello")[0]) as unknown as Record<string, { value: unknown }>;
    expect(doc.BaseItem.value).toBe(74);
    expect((doc.Description.value as Record<string, string>)["0"]).toBe("hello");
  });
});
