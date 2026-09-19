import { describe, expect, it } from "vitest";
import { bracketTagCount, parseLiveLogs } from "./result.js";

describe("bracketTagCount", () => {
  it("counts bracket-tagged lines", () => {
    const text = "[SPEC_OK] tag=a\nsome other line\n[SPEC_FAIL] tag=b field=x expected=1 actual=2\n[SYSTEST_DEATH] tag=c killer=d";
    expect(bracketTagCount(text)).toBe(3);
  });

  it("returns 0 for text with no tagged lines", () => {
    expect(bracketTagCount("Loading Module: foo\nServer shutting down")).toBe(0);
  });

  it("does not count a tag that isn't at line start", () => {
    expect(bracketTagCount("some prefix [SPEC_OK] tag=a")).toBe(0);
  });
});

describe("parseLiveLogs", () => {
  it("parses [SPEC_OK] lines into specResults.ok", () => {
    const result = parseLiveLogs("[SPEC_OK] tag=rurik\n[SPEC_OK] tag=wren", "");
    expect(result.specResults.ok).toEqual(["rurik", "wren"]);
    expect(result.specResults.fail).toEqual([]);
  });

  it("parses [SPEC_FAIL] lines into specResults.fail with all four fields", () => {
    const result = parseLiveLogs(
      "[SPEC_FAIL] tag=hos_cbenf field=racial_feat expected=228 actual=-1",
      "",
    );
    expect(result.specResults.fail).toEqual([
      { tag: "hos_cbenf", field: "racial_feat", expected: "228", actual: "-1" },
    ]);
  });

  it("does NOT flag a benign EXOWARNING line by default (confirmed live: even a minimal, clean module emits one)", () => {
    const result = parseLiveLogs(
      "",
      "E [09:37:32] (exofileinternal.cpp:318:ResolveFileName): EXOWARNING: CExoFileInternal::CExoFileInternal() Filename passed contains an undefined alias. FALSE",
    );
    expect(result.engineErrors).toEqual([]);
  });

  it("flags EXOWARNING lines when a caller opts in via a custom errorPatterns list", () => {
    const result = parseLiveLogs("", "I [07:00:06] SomeSubsystem::DoThing() EXOWARNING: unexpected state", ["exowarning"]);
    expect(result.engineErrors).toHaveLength(1);
    expect(result.engineErrors[0].matchedPattern.toLowerCase()).toContain("exowarning");
  });

  it("matches the real historical AddFeat log line via the default 'invalid feat' pattern", () => {
    const result = parseLiveLogs("", "CNWSCreatureStats::AddFeat() EXOWARNING: Invalid Feat FALSE");
    expect(result.engineErrors).toHaveLength(1);
    expect(result.engineErrors[0].matchedPattern).toBe("invalid feat");
  });

  it("matches the invalid feat bug's real historical log shape", () => {
    const result = parseLiveLogs("", "Invalid Feat found on creature load");
    expect(result.engineErrors.some((e) => e.matchedPattern === "invalid feat")).toBe(true);
  });

  it("respects a custom errorPatterns list instead of the default", () => {
    const result = parseLiveLogs("", "TMI: too many instructions", ["tmi"]);
    expect(result.engineErrors).toHaveLength(1);
    // "error"/"exception"/"invalid feat" are NOT in the custom list, so a line
    // containing none of them (but matching the custom pattern) is still caught,
    // and the default patterns are not silently reapplied.
    const notFlagged = parseLiveLogs("", "some other completely unrelated line", ["tmi"]);
    expect(notFlagged.engineErrors).toHaveLength(0);
  });

  it("routes non-SPEC bracket-tagged lines (e.g. future instrumentation) into otherTaggedLines", () => {
    const result = parseLiveLogs("[SYSTEST_DAMAGE] target=orc attacker=paladin amount=12", "");
    expect(result.otherTaggedLines).toEqual(["[SYSTEST_DAMAGE] target=orc attacker=paladin amount=12"]);
    expect(result.specResults.ok).toEqual([]);
    expect(result.specResults.fail).toEqual([]);
  });

  it("ignores blank lines and lines with no bracket tag", () => {
    const result = parseLiveLogs("\n   \nLoading Module: foo\n", "\nServer shutting down\n");
    expect(result.otherTaggedLines).toEqual([]);
    expect(result.specResults.ok).toEqual([]);
    expect(result.engineErrors).toEqual([]);
  });

  it("handles a combined realistic tail with both OK and FAIL lines plus an engine error", () => {
    const serverTail = [
      "Loading Module: the-salt-gate-conspiracy",
      "[SPEC_OK] tag=rurik",
      "[SPEC_FAIL] tag=hos_cbenf field=feat expected=115 actual=-1",
    ].join("\n");
    const engineTail = "EXOWARNING: Invalid Feat FALSE";
    const result = parseLiveLogs(serverTail, engineTail);
    expect(result.specResults.ok).toEqual(["rurik"]);
    expect(result.specResults.fail).toHaveLength(1);
    expect(result.engineErrors.length).toBeGreaterThanOrEqual(1);
  });
});
