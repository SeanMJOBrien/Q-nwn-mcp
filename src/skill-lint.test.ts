import path from "path";
import { fileURLToPath } from "url";
import { describe, expect, it } from "vitest";
import { collectTools, findCalls, findDuplicateParagraphs, lintCalls, readSkills } from "./util/skill-lint.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tools = collectTools(path.join(ROOT, "src", "tools"));
const skills = readSkills(path.join(ROOT, ".claude", "skills"));

describe("skill_lint", () => {
  it("finds the registered tools and the skills", () => {
    expect(tools.has("place_creature")).toBe(true);
    expect(tools.has("verify_item")).toBe(true);
    expect(skills.length).toBeGreaterThan(20);
  });

  it("every tool call in a skill names a registered tool with real parameters", () => {
    expect(lintCalls(skills, tools)).toEqual([]);
  });

  it("no paragraph over 150 characters is copied between skills", () => {
    expect(findDuplicateParagraphs(skills)).toEqual([]);
  });

  it("the lint itself catches a wrong tool and a wrong parameter", () => {
    const fake = [{ name: "x", text: "Call `place_creature(area: a, bogus: 1)` then `no_such_tool(a: 1)`." }];
    expect(findCalls(fake[0]).map((c) => c.args)).toEqual([["area", "bogus"], ["a"]]);
    const problems = lintCalls(fake, tools);
    expect(problems.some((p) => p.includes("bogus"))).toBe(true);
    expect(problems.some((p) => p.includes("no_such_tool"))).toBe(true);
  });
});
