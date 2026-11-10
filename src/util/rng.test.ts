import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { mulberry32, random, withSeed } from "./rng.js";

describe("rng", () => {
  it("the same seed gives the same stream, a different seed another", () => {
    const a = withSeed(7, () => [random(), random(), random()]);
    const b = withSeed(7, () => [random(), random(), random()]);
    const c = withSeed("other", () => [random(), random(), random()]);
    expect(a).toEqual(b);
    expect(a).not.toEqual(c);
    expect(a.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(mulberry32(7)()).toBe(a[0]);
  });
  it("restores the previous stream after a seeded run, even when it throws", () => {
    expect(() => withSeed(1, () => { throw new Error("x"); })).toThrow("x");
    const x = random();
    expect(x).toBeGreaterThanOrEqual(0);
  });
  it("no source file outside rng.ts calls Math.random", () => {
    const root = path.join(import.meta.dirname, "..");
    const bad: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) { if (e.name !== "templates" && e.name !== "nwscript-override") walk(full); continue; }
        if (!e.name.endsWith(".ts") || e.name.includes(".test.") || e.name === "rng.ts") continue;
        fs.readFileSync(full, "utf8").split("\n").forEach((line, i) => {
          const code = line.trim();
          if (!code.startsWith("//") && !code.startsWith("*") && !code.startsWith("/*") && /Math\.random\(/.test(code)) bad.push(`${path.relative(root, full)}:${i + 1}`);
        });
      }
    };
    walk(root);
    expect(bad).toEqual([]);
  });
});
