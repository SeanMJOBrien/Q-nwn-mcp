import { describe, expect, it } from "vitest";
import {
  filterForPhase,
  mergeStatus,
  parseScope,
  requiredFor,
  missingSections,
  OWN_SECTION,
  parseSections,
  PHASES,
  REQUIRED_SECTIONS,
  stopMessage,
} from "./phase-check.js";

const DOC = "# Adventure\n\n## Module\nname\n\n## Plot\n\n## Areas\n- a\n";

describe("phase-check", () => {
  it("parses sections and reports empty ones as missing", () => {
    expect([...parseSections(DOC).keys()]).toEqual(["Module", "Plot", "Areas"]);
    expect(missingSections(DOC, ["Module", "Plot", "Areas", "Environment"])).toEqual(["Plot", "Environment"]);
  });
  it("names the missing section in the stop message", () => {
    expect(stopMessage(["Plot"])).toContain("## Plot");
  });
  it("each phase requires exactly the sections before it", () => {
    for (const [i, phase] of PHASES.entries()) {
      if (i === 0) continue;
      expect(REQUIRED_SECTIONS[phase]).toContain(OWN_SECTION[PHASES[i - 1]]);
    }
  });
  it("filters results by object type", () => {
    const r = (type: string) => ({ target: "x", type, status: "fail" as const, errors: [], warnings: [] });
    expect(filterForPhase("actors", [r("utc"), r("are")]).map((x) => x.type)).toEqual(["utc"]);
    expect(filterForPhase("polish", [r("utc"), r("are")])).toHaveLength(2);
    expect(filterForPhase("plot", [r("utc")])).toHaveLength(0);
  });
  it("merges a phase into an existing or malformed status file", () => {
    const entry = { status: "success" as const, warnings: [], errors: [] };
    const a = mergeStatus({ phases: { plot: entry } }, "areas", entry);
    expect(Object.keys(a.phases)).toEqual(["plot", "areas"]);
    expect(Object.keys(mergeStatus("junk", "plot", entry).phases)).toEqual(["plot"]);
  });

  it("reads the declared scope and skipped phases from ## Module", () => {
    const md = "## Module\n- **Title:** X\n- **Scope:** NPCs and quests only\n- **Skip phases:** areas, rewards\n\n## Plot\np\n";
    expect(parseScope(md)).toEqual({ scope: "NPCs and quests only", skip: ["areas", "rewards"] });
    expect(parseScope("## Module\nm\n")).toEqual({ scope: "", skip: [] });
  });

  it("a skipped phase's section is not required by later phases", () => {
    expect(requiredFor("actors", [])).toContain("Areas");
    expect(requiredFor("actors", ["areas"])).not.toContain("Areas");
    expect(requiredFor("actors", ["areas"])).toContain("Plot");
  });
});

import { setScopeFields, skipFromRun } from "./phase-check.js";

describe("setScopeFields", () => {
  it("adds scope and skip lines that parseScope reads back", () => {
    const out = setScopeFields("# A\n\n## Module\n- **Title:** T\n\n## Plot\nx\n", "just quests", skipFromRun(["quests", "challenges"]));
    const got = parseScope(out);
    expect(got.scope).toBe("just quests");
    expect(got.skip).toEqual(["plot", "areas", "environment", "actors", "affordances", "polish", "rewards"]);
    expect(out).toContain("## Plot\nx");
  });
  it("replaces earlier values and drops the skip line when none", () => {
    const first = setScopeFields("## Module\n- **Title:** T\n", "a", ["areas"]);
    const second = setScopeFields(first, "b", []);
    expect(parseScope(second)).toEqual({ scope: "b", skip: [] });
    expect(second.match(/Scope:/g)).toHaveLength(1);
  });
  it("creates the Module section when absent", () => {
    expect(parseScope(setScopeFields("# A\n", "x", [])).scope).toBe("x");
  });
});
