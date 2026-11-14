import { describe, expect, it } from "vitest";
import { registerAll } from "./register-all.js";
import {
  CORE_TOOLS,
  TOOL_PROFILES,
  filterToolsByProfile,
  isToolAllowed,
  matchesPattern,
  resolveToolProfile,
} from "./tool-profiles.js";

function collect(profileEnv: string | undefined): string[] {
  const names: string[] = [];
  const fake = { tool: (n: string) => void names.push(n) };
  registerAll(filterToolsByProfile(fake, resolveToolProfile(profileEnv)) as never);
  return names;
}

describe("tool profiles", () => {
  const all = collect(undefined);

  it("default and 'all' register every tool", () => {
    expect(all.length).toBeGreaterThan(150);
    expect(collect("all")).toEqual(all);
    expect(collect("")).toEqual(all);
  });

  it("quests,verify lists fewer than 40 tools and keeps the core", () => {
    const names = collect("quests,verify");
    expect(names.length).toBeLessThan(40);
    expect(names).toContain("build_quest");
    expect(names).toContain("verify_all");
    expect(names).toContain("load_module");
    expect(names).not.toContain("paint_tiles");
  });

  it("every exact entry names a real tool and every glob matches something", () => {
    for (const [profile, patterns] of Object.entries({ core: CORE_TOOLS, ...TOOL_PROFILES })) {
      for (const p of patterns) {
        const hits = all.filter((n) => matchesPattern(n, p));
        expect(hits.length, `${profile}: "${p}" matches no tool`).toBeGreaterThan(0);
      }
    }
  });

  it("each single profile stays small enough for a weak model", () => {
    for (const name of Object.keys(TOOL_PROFILES)) {
      const n = collect(name).length;
      if (name === "read") expect(n).toBeLessThan(110);
      else expect(n, `${name} has ${n} tools`).toBeLessThan(60);
    }
  });

  it("rejects an unknown profile name", () => {
    expect(() => resolveToolProfile("quests,bogus")).toThrow(/bogus/);
  });

  it("isToolAllowed is permissive with no profile", () => {
    expect(isToolAllowed("anything", null)).toBe(true);
  });
});
