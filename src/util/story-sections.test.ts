import { describe, expect, it } from "vitest";
import { pickSections, setSection, stripOwnHeading } from "./story-sections.js";

const doc = "# Title\n\n## Module\n\n- **Level:** 3\n\n## Plot\n\n### Premise\nOld text.\n\n## Areas\n\nA.\n";

describe("setSection", () => {
  it("appends a new section", () => {
    const out = setSection(doc, "Actors", "People.");
    expect(out.endsWith("## Areas\n\nA.\n\n## Actors\n\nPeople.\n")).toBe(true);
  });
  it("replaces an existing section and leaves the others alone", () => {
    const out = setSection(doc, "Plot", "### Premise\nNew text.");
    expect(out).toBe("# Title\n\n## Module\n\n- **Level:** 3\n\n## Plot\n\n### Premise\nNew text.\n\n## Areas\n\nA.\n");
  });
  it("replaces the last section", () => {
    expect(setSection(doc, "Areas", "B.")).toBe("# Title\n\n## Module\n\n- **Level:** 3\n\n## Plot\n\n### Premise\nOld text.\n\n## Areas\n\nB.\n");
  });
  it("starts a document", () => {
    expect(setSection("", "Module", "x")).toBe("## Module\n\nx\n");
  });
  it("is stable when applied twice", () => {
    const once = setSection(doc, "Plot", "P");
    expect(setSection(once, "Plot", "P")).toBe(once);
  });
});

describe("stripOwnHeading", () => {
  it("drops a repeated heading and keeps sub-headings", () => {
    expect(stripOwnHeading("Plot", "## Plot\n\n### Premise\nx")).toBe("### Premise\nx");
    expect(stripOwnHeading("Plot", "### Premise\nx")).toBe("### Premise\nx");
  });
});

describe("pickSections", () => {
  it("returns the named sections in document order and names the missing ones", () => {
    const r = pickSections(doc, ["areas", "Module", "Quests"]);
    expect(r.text).toBe("## Module\n\n- **Level:** 3\n\n## Areas\n\nA.");
    expect(r.missing).toEqual(["Quests"]);
    expect(r.available).toEqual(["Module", "Plot", "Areas"]);
  });
  it("returns everything with no names", () => {
    expect(pickSections(doc, []).text).toContain("## Plot");
  });
});
