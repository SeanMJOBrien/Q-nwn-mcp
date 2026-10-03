import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// nwn_resman_extract crashes and extracts NOTHING when any requested resource is missing; mimic that.
const state = vi.hoisted(() => ({ missing: new Set<string>(), calls: [] as string[][] }));

vi.mock("../nim-tools.js", async () => {
  const nodeFs = await import("fs/promises");
  const nodePath = await import("path");
  const WOK = "beginwalkmeshgeom m\nnode aabb wok\n  position 0.0 0.0 0.0\n  verts 3\n    -5 -5 0\n    5 -5 0\n    -5 5 0\n  faces 1\n    0 1 2  1  0 1 2  3\nendnode\nendwalkmeshgeom m\n";
  return {
    resmanExtract: vi.fn(async (dest: string, opts: { files?: string[] }) => {
      const files = opts.files ?? [];
      state.calls.push(files);
      if (files.some((f) => state.missing.has(f))) throw new Error("Can't obtain a value from a `none`");
      await nodeFs.mkdir(dest, { recursive: true });
      for (const f of files) await nodeFs.writeFile(nodePath.join(dest, f), WOK);
    }),
    resmanGrep: vi.fn(async () => ""),
  };
});

import { clearWokCache, ensureWoksExtracted, getWokForTile } from "./walkmesh.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "wok-extract-"));
  state.missing = new Set();
  state.calls = [];
  clearWokCache();
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("ensureWoksExtracted", () => {
  it("extracts the walkmeshes that exist even when another requested one does not (tcm02 / trs02 situation)", async () => {
    state.missing = new Set(["zzz_missing.wok"]);
    await ensureWoksExtracted(["tile_a", "TILE_B", "zzz_missing", "tile_c"], {}, dir);
    for (const m of ["tile_a", "tile_b", "tile_c"]) {
      expect((await getWokForTile(m, {}, dir))?.verts, m).toHaveLength(3);
    }
    expect(await getWokForTile("zzz_missing", {}, dir)).toBeNull();
  });

  it("does not ask for a missing walkmesh again, however many objects stand on that tile", async () => {
    state.missing = new Set(["zzz_missing.wok"]);
    await ensureWoksExtracted(["tile_a", "zzz_missing"], {}, dir);
    const before = state.calls.length;
    for (let i = 0; i < 25; i++) expect(await getWokForTile("zzz_missing", {}, dir)).toBeNull();
    await ensureWoksExtracted(["zzz_missing", "tile_a"], {}, dir);
    expect(state.calls.length).toBe(before);
  });

  it("a single missing model found through getWokForTile is remembered too", async () => {
    state.missing = new Set(["nope.wok"]);
    expect(await getWokForTile("nope", {}, dir)).toBeNull();
    const before = state.calls.length;
    expect(await getWokForTile("nope", {}, dir)).toBeNull();
    expect(state.calls.length).toBe(before);
  });

  it("skips models that are already extracted on disk", async () => {
    await ensureWoksExtracted(["tile_a", "tile_b"], {}, dir);
    clearWokCache();   // forget the parsed data but keep the files, as after a module reload
    state.calls = [];
    await ensureWoksExtracted(["tile_a", "tile_b"], {}, dir);
    expect(state.calls).toEqual([]);
  });

  it("clearWokCache forgets the missing list (a different module / install may have the file)", async () => {
    state.missing = new Set(["zzz_missing.wok"]);
    expect(await getWokForTile("zzz_missing", {}, dir)).toBeNull();
    clearWokCache();
    state.missing = new Set();
    expect(await getWokForTile("zzz_missing", {}, dir)).not.toBeNull();
  });
});
