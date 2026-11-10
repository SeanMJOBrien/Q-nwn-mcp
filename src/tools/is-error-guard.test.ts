/**
 * A tool call that fails must set isError (TODO E6), so a client gets a protocol-level signal instead of parsing prose.
 * Static guard: a single-line `return { content: [{ type: "text", text: ... }] }` whose text reads as a failure
 * ("not found", "Invalid", "must", "out of range", "failed", ...) has to carry isError. New code can use errorResult()
 * from util/tool-result.ts.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const FAIL = /not found|Not found|Invalid|invalid|must be|must have|must |out of range|Cannot|cannot|requires|Failed|failed|No module loaded/;
const RET = /return \{\s*content: \[\{ type: "text"(?: as const)?, text: ([^\n]{0,260}?)\}\],?\s*\};?/g;

describe("isError guard", () => {
  it("no tool returns a failure message without isError", () => {
    const dir = import.meta.dirname;
    const bad: string[] = [];
    for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".ts") && !n.includes(".test."))) {
      const src = fs.readFileSync(path.join(dir, f), "utf8");
      for (const m of src.matchAll(RET)) {
        if (FAIL.test(m[1])) bad.push(`${f}: ${m[1].slice(0, 80)}`);
      }
    }
    expect(bad).toEqual([]);
  });
});
