import { describe, expect, it } from "vitest";
import { extractSalvaging } from "./batch-extract.js";

/** Behaves like nwn_resman_extract: if ANY requested name is missing the whole call throws and extracts nothing. */
function fakeResman(missing: Set<string>) {
  const done = new Set<string>();
  const calls: string[][] = [];
  return {
    done,
    calls,
    extract: async (batch: string[]) => {
      calls.push(batch);
      if (batch.some((n) => missing.has(n))) throw new Error("Can't obtain a value from a `none`");
      for (const n of batch) done.add(n);
    },
  };
}

const names = (n: number) => Array.from({ length: n }, (_, i) => `tile_${String(i).padStart(3, "0")}.wok`);

describe("extractSalvaging", () => {
  it("one call when nothing is missing", async () => {
    const r = fakeResman(new Set());
    const res = await extractSalvaging(names(50), r.extract);
    expect(res.calls).toBe(1);
    expect(res.failed).toEqual([]);
    expect(res.extracted).toHaveLength(50);
    expect(r.done.size).toBe(50);
  });

  it("extracts everything that exists when some resources are missing (the tool alone would extract nothing)", async () => {
    const all = names(40);
    const missing = new Set([all[7], all[8], all[31]]);
    const r = fakeResman(missing);
    // the real tool, given all 40 at once, extracts none of them
    await expect(r.extract(all)).rejects.toThrow();
    expect(r.done.size).toBe(0);

    const res = await extractSalvaging(all, r.extract);
    expect(new Set(res.failed)).toEqual(missing);
    expect(r.done.size).toBe(37);
    for (const n of all) expect(r.done.has(n)).toBe(!missing.has(n));
  });

  it("needs far fewer calls than extracting one by one", async () => {
    const all = names(256);
    const r = fakeResman(new Set([all[100], all[200]]));
    const res = await extractSalvaging(all, r.extract);
    expect(res.failed).toHaveLength(2);
    expect(res.calls).toBeLessThan(40);   // ~2 x log2(256) x 2, versus 256 single calls
  });

  it("de-duplicates names and ignores an empty list", async () => {
    const r = fakeResman(new Set());
    const res = await extractSalvaging(["a.wok", "b.wok", "a.wok"], r.extract);
    expect(res.extracted).toEqual(["a.wok", "b.wok"]);
    expect((await extractSalvaging([], r.extract)).calls).toBe(0);
  });

  it("gives up quickly when nothing ever succeeds (tool missing or broken), instead of one call per name", async () => {
    const all = names(500);
    let calls = 0;
    const res = await extractSalvaging(all, async () => {
      calls++;
      throw new Error("spawn nwn_resman_extract ENOENT");
    });
    expect(calls).toBeLessThanOrEqual(6);
    expect(res.extracted).toEqual([]);
    expect(res.failed).toHaveLength(500);
  });

  it("keeps going after a success even when later batches fail", async () => {
    const all = names(64);
    const r = fakeResman(new Set(all.slice(32)));   // the whole second half is missing
    const res = await extractSalvaging(all, r.extract);
    expect(res.extracted).toHaveLength(32);
    expect(res.failed).toHaveLength(32);
  });
});
