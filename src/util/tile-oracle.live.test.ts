/**
 * LIVE oracle for the spatial conventions the placement tools rely on. It checks this server's tile / walkmesh /
 * facing maths against REAL game data, so a regression in any convention shows up as a hard failure instead of
 * silently misplaced objects. Nothing here is mocked.
 *
 * ENV-GATED (skips, never fails, when the data is not there - same convention as comprehensive-module.live.test.ts):
 *   Part A  needs NWN_FOLDER_DATA + NIM_FOLDER_NWTOOLS (a real NWN install and the neverwinter.nim tools).
 *           Uses only the base-game tilesets: tile footprints, per-tileset height steps (`Transition`), and that
 *           the rotation maths used by the tile solver (getRotatedCornerHeights) agrees with the one used by the
 *           walkmesh probe (probeTileLocal).
 *   Part B  additionally needs TFN_SRC=/path/to/the-frozen-north/src (any nasher `src` folder with are/*.are.json and
 *           git/*.git.json from human-built areas). Checks the conventions against ~500 real areas:
 *           neighbouring tiles agree on shared corners / crossers / heights under the CCW rotation reading,
 *           and objects stand at the probed ground height (node offsets, Tile_Height x Transition).
 *
 * Findings this file pins (measured on 33 base tilesets and 504 real areas; see docs/object-placement-and-tilesets.md):
 *   - Tile_Orientation n turns a tile n x 90 degrees COUNTER-clockwise.
 *   - The ARE Tile_Height lift per level is the tileset's `Transition` (5 for most outdoor sets, 4 tcn01, 2 tno01),
 *     NOT a constant 5 m: benzor (tcn01) 94% of objects on raised tiles match with Transition, 3.5% with 5.
 *   - Walkmesh vertices are relative to the walkmesh node `position` (57% of woks have a non-zero Z offset).
 */

import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resmanExtract, twodaToJson } from "../nim-tools.js";
import type { ResmanOptions } from "../nim-tools.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import type { GffObj } from "../types/gff.js";
import type { TwoDATable } from "../types/module.js";
import {
  getRotatedCornerHeights,
  getRotatedCorners,
  getRotatedCrossers,
  listAllTilesets,
  parseTilesetFile,
} from "./tileset.js";
import type { TilesetInfo } from "./tileset.js";
import { extractSalvaging } from "./batch-extract.js";
import { parseWokFile, probeAreaPosition, probeTileLocal, readAreaTileGrid, tileHeightStep } from "./walkmesh.js";
import type { WokData } from "./walkmesh.js";

const NWN_FOLDER_DATA = process.env.NWN_FOLDER_DATA;
const NWN_FOLDER_USER = process.env.NWN_FOLDER_USER;
const NIM_FOLDER_NWTOOLS = process.env.NIM_FOLDER_NWTOOLS;
const TFN_SRC = process.env.TFN_SRC;
const haveGame = Boolean(NWN_FOLDER_DATA && NIM_FOLDER_NWTOOLS);
const haveAreas = haveGame && Boolean(TFN_SRC);

// ─── Shared loading (done once, lazily, by whichever part runs first) ───────────────────────────────────

interface BaseGame {
  tilesets: Map<string, TilesetInfo>;
  woks: Map<string, WokData>;
  surfacemat?: TwoDATable;
  dir: string;
}

let baseGamePromise: Promise<BaseGame> | null = null;

function loadBaseGame(): Promise<BaseGame> {
  baseGamePromise ??= (async () => {
    const resman: ResmanOptions = { root: NWN_FOLDER_DATA, userDir: NWN_FOLDER_USER };
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-oracle-"));
    const tilesets = new Map<string, TilesetInfo>();
    const woks = new Map<string, WokData>();
    for (const set of (await listAllTilesets(resman)).sort()) {
      try {
        await resmanExtract(dir, { ...resman, files: [`${set}.set`] });
      } catch {
        continue;
      }
      const info = parseTilesetFile(await fs.readFile(path.join(dir, `${set}.set`), "utf-8"), set);
      tilesets.set(set, info);
      const models = [...new Set(info.tiles.map((t) => t.model.toLowerCase()).filter(Boolean))];
      // some tiles (tcm02, trs02, ...) have no walkmesh and nwn_resman_extract then extracts nothing at all: salvage the rest
      await extractSalvaging(models.map((m) => `${m}.wok`), (batch) => resmanExtract(dir, { ...resman, files: batch }));
      for (const m of models) {
        try {
          woks.set(m, parseWokFile(await fs.readFile(path.join(dir, `${m}.wok`), "utf-8")));
        } catch {
          // missing .wok
        }
      }
    }
    let surfacemat: TwoDATable | undefined;
    try {
      await resmanExtract(dir, { ...resman, files: ["surfacemat.2da"] });
      const raw = await twodaToJson(path.join(dir, "surfacemat.2da"));
      surfacemat = { columns: raw.columns, rows: new Map(raw.rows) };
    } catch {
      // the built-in fallback table is used
    }
    return { tilesets, woks, surfacemat, dir };
  })();
  return baseGamePromise;
}

afterAll(async () => {
  if (baseGamePromise) {
    const { dir } = await baseGamePromise;
    await fs.rm(dir, { recursive: true, force: true });
  }
});

const pct = (num: number, den: number): number => (den === 0 ? 0 : (100 * num) / den);

/** ORACLE_VERBOSE=1 prints the measured numbers behind each assertion (useful when a threshold needs a second look). */
function report(label: string, values: Record<string, number | string>): void {
  if (process.env.ORACLE_VERBOSE) console.info(`[oracle] ${label}: ${Object.entries(values).map(([k, v]) => `${k}=${typeof v === "number" ? Math.round(v * 100) / 100 : v}`).join("  ")}`);
}

// ─── Part A: base-game tilesets ─────────────────────────────────────────────────────────────────────────

describe.skipIf(!haveGame)("tile / walkmesh conventions on the base-game tilesets (LIVE)", () => {
  let game: BaseGame;
  beforeAll(async () => {
    game = await loadBaseGame();
  }, 300_000);

  it("finds the base tilesets and reads their metres-per-level Transition", () => {
    expect(game.tilesets.size).toBeGreaterThanOrEqual(25);
    // values measured on the shipped .set files: outdoor sets with height levels use 5, the two exceptions use 4 and 2
    const known: Record<string, number> = { ttr01: 5, tts01: 5, tts02: 5, ttu01: 5, ttz01: 5, tti01: 5, trm02: 5, tcn01: 4, tno01: 2 };
    for (const [set, step] of Object.entries(known)) {
      const info = game.tilesets.get(set);
      if (info) expect(tileHeightStep(info), set).toBe(step);
    }
  });

  it("walkmesh vertices lie inside the 10 m tile footprint once the node offset is applied (>= 99.9%)", () => {
    let inside = 0;
    let total = 0;
    for (const wok of game.woks.values()) {
      for (const [x, y] of wok.verts) {
        total++;
        if (Math.abs(x) <= 5.05 && Math.abs(y) <= 5.05) inside++;
      }
    }
    report("footprint", { vertices: total, insidePct: pct(inside, total) });
    expect(total).toBeGreaterThan(100_000);
    expect(pct(inside, total)).toBeGreaterThanOrEqual(99.9);
  });

  it("about half of the walkmeshes (54% of the base game's) carry a node Z offset, which the parser applies", () => {
    const withOffset = [...game.woks.values()].filter((w) => w.offset && Math.abs(w.offset[2]) > 1e-6).length;
    report("node offsets", { woks: game.woks.size, withOffsetPct: pct(withOffset, game.woks.size) });
    expect(pct(withOffset, game.woks.size)).toBeGreaterThan(40);
    expect(pct(withOffset, game.woks.size)).toBeLessThan(80);
  });

  /** Corner-to-corner height differences of every tile that has height levels, measured on its real mesh. */
  function cornerPairs(orientation: number, step: (info: TilesetInfo) => number, only?: (set: string) => boolean) {
    const out = { pairs: 0, ok: 0, bySet: new Map<string, { pairs: number; ok: number; ok5: number }>() };
    const spots: Array<[string, number, number]> = [["topLeft", -4.5, 4.5], ["topRight", 4.5, 4.5], ["bottomLeft", -4.5, -4.5], ["bottomRight", 4.5, -4.5]];
    for (const [set, info] of game.tilesets) {
      if (only && !only(set)) continue;
      const entry = { pairs: 0, ok: 0, ok5: 0 };
      for (const tile of info.tiles) {
        const wok = game.woks.get(tile.model.toLowerCase());
        const raw = tile.cornerHeights;
        if (!wok || !raw || tile.flat) continue;
        const levels = getRotatedCornerHeights(tile, orientation) as unknown as Record<string, number>;
        const zs = spots.map(([, x, y]) => {
          const r = probeTileLocal(wok, x, y, orientation, 0, game.surfacemat);
          return r.walkable ? r.z : undefined;
        });
        for (let a = 0; a < 4; a++) {
          for (let b = a + 1; b < 4; b++) {
            const za = zs[a];
            const zb = zs[b];
            const dl = levels[spots[a][0]] - levels[spots[b][0]];
            if (za === undefined || zb === undefined || dl === 0) continue;
            entry.pairs++;
            if (Math.abs(za - zb - dl * step(info)) <= 0.6) entry.ok++;
            if (Math.abs(za - zb - dl * 5) <= 0.6) entry.ok5++;
          }
        }
      }
      out.bySet.set(set, entry);
      out.pairs += entry.pairs;
      out.ok += entry.ok;
    }
    return out;
  }

  // trm02 and trs02 (the "02" medieval rural family) build their ramps over HALF a level: a one-level corner difference
  // is 2.5 m of mesh, not 5 m, so their corner differences are not whole levels (55% fit). Objects standing on their raised
  // tiles still match the probed height (97.6% in the TFN areas, Part B), so only this corner-difference oracle skips them.
  const wholeLevelRamps = (set: string) => set !== "trm02" && set !== "trs02";

  it("corner height differences equal (level difference x the tileset's Transition) on the real meshes (>= 95%)", () => {
    const r = cornerPairs(0, tileHeightStep, wholeLevelRamps);
    report("corner differences @ Transition (no trm02/trs02)", { pairs: r.pairs, okPct: pct(r.ok, r.pairs) });
    for (const [set, st] of r.bySet) if (st.pairs) report(`  ${set}`, { pairs: st.pairs, atTransitionPct: pct(st.ok, st.pairs), atFlat5Pct: pct(st.ok5, st.pairs) });
    expect(r.pairs).toBeGreaterThan(1000);
    expect(pct(r.ok, r.pairs)).toBeGreaterThanOrEqual(95);
  });

  it("a flat 5 m per level would be wrong: tcn01 (Transition 4) and tno01 (Transition 2) only fit their own step", () => {
    const r = cornerPairs(0, tileHeightStep);
    for (const set of ["tcn01", "tno01"]) {
      const s = r.bySet.get(set);
      if (!s) continue;
      report(`corner differences ${set}`, { pairs: s.pairs, atTransitionPct: pct(s.ok, s.pairs), atFlat5Pct: pct(s.ok5, s.pairs) });
      expect(s.pairs, set).toBeGreaterThan(50);
      expect(pct(s.ok, s.pairs), `${set} with its Transition`).toBeGreaterThanOrEqual(95);
      expect(pct(s.ok5, s.pairs), `${set} with a flat 5 m`).toBeLessThanOrEqual(10);
    }
  });

  it("getRotatedCornerHeights and the walkmesh probe rotate the same way at every orientation (>= 95%)", () => {
    for (const orientation of [1, 2, 3]) {
      const r = cornerPairs(orientation, tileHeightStep, wholeLevelRamps);
      report(`rotation ${orientation}`, { pairs: r.pairs, okPct: pct(r.ok, r.pairs) });
      expect(r.pairs, `orientation ${orientation}`).toBeGreaterThan(1000);
      expect(pct(r.ok, r.pairs), `orientation ${orientation}`).toBeGreaterThanOrEqual(95);
    }
  });
});

// ─── Part B: real, human-built areas ────────────────────────────────────────────────────────────────────

interface LoadedArea {
  name: string;
  are: GffObj;
  tileset: string;
}

async function readJson(file: string): Promise<GffObj> {
  return JSON.parse(await fs.readFile(file, "utf-8")) as GffObj;
}

async function loadAreas(): Promise<LoadedArea[]> {
  const dir = path.join(TFN_SRC as string, "are");
  const out: LoadedArea[] = [];
  for (const file of (await fs.readdir(dir)).filter((f) => f.endsWith(".are.json")).sort()) {
    const are = await readJson(path.join(dir, file));
    out.push({ name: file.replace(/\.are\.json$/, ""), are, tileset: getFieldStr(are, "Tileset").toLowerCase() });
  }
  return out;
}

describe.skipIf(!haveAreas)("conventions against real, human-built areas (LIVE, TFN_SRC)", () => {
  let game: BaseGame;
  let areas: LoadedArea[];
  beforeAll(async () => {
    game = await loadBaseGame();
    areas = await loadAreas();
  }, 600_000);

  it("neighbouring tiles agree on shared corners, crossers and heights under the counter-clockwise reading", () => {
    const corners = { ok: 0, total: 0, cw: 0 };
    const crossers = { ok: 0, total: 0 };
    const heights = { ok: 0, total: 0 };
    for (const { are, tileset } of areas) {
      const info = game.tilesets.get(tileset);
      if (!info) continue;
      const grid = readAreaTileGrid(are);
      const at = (x: number, y: number) => {
        const t = grid.tiles[y * grid.width + x];
        const def = t ? info.tiles[t.id] : undefined;
        return t && def ? { t, def } : null;
      };
      const ccw = (n: ReturnType<typeof at>) => getRotatedCorners(n!.def, n!.t.orientation);
      const cw = (n: ReturnType<typeof at>) => getRotatedCorners(n!.def, (4 - (n!.t.orientation % 4)) % 4);
      const h = (n: ReturnType<typeof at>) => getRotatedCornerHeights(n!.def, n!.t.orientation);
      for (let y = 0; y < grid.height; y++) {
        for (let x = 0; x < grid.width; x++) {
          const a = at(x, y);
          if (!a) continue;
          const east = x + 1 < grid.width ? at(x + 1, y) : null;
          const north = y + 1 < grid.height ? at(x, y + 1) : null;
          if (east) {
            const [ca, cb] = [ccw(a), ccw(east)];
            const [wa, wb] = [cw(a), cw(east)];
            corners.total += 2;
            corners.ok += Number(ca.topRight === cb.topLeft) + Number(ca.bottomRight === cb.bottomLeft);
            corners.cw += Number(wa.topRight === wb.topLeft) + Number(wa.bottomRight === wb.bottomLeft);
            crossers.total++;
            crossers.ok += Number(getRotatedCrossers(a.def, a.t.orientation).right === getRotatedCrossers(east.def, east.t.orientation).left);
            const [ha, hb] = [h(a), h(east)];
            heights.total += 2;
            heights.ok += Number(a.t.height + ha.topRight === east.t.height + hb.topLeft) + Number(a.t.height + ha.bottomRight === east.t.height + hb.bottomLeft);
          }
          if (north) {
            const [ca, cb] = [ccw(a), ccw(north)];
            const [wa, wb] = [cw(a), cw(north)];
            corners.total += 2;
            corners.ok += Number(ca.topLeft === cb.bottomLeft) + Number(ca.topRight === cb.bottomRight);
            corners.cw += Number(wa.topLeft === wb.bottomLeft) + Number(wa.topRight === wb.bottomRight);
            crossers.total++;
            crossers.ok += Number(getRotatedCrossers(a.def, a.t.orientation).top === getRotatedCrossers(north.def, north.t.orientation).bottom);
            const [ha, hb] = [h(a), h(north)];
            heights.total += 2;
            heights.ok += Number(a.t.height + ha.topLeft === north.t.height + hb.bottomLeft) + Number(a.t.height + ha.topRight === north.t.height + hb.bottomRight);
          }
        }
      }
    }
    report("neighbours", { areas: areas.length, cornerEdges: corners.total, cornersCcwPct: pct(corners.ok, corners.total), cornersCwPct: pct(corners.cw, corners.total), crossersPct: pct(crossers.ok, crossers.total), heightsPct: pct(heights.ok, heights.total) });
    expect(corners.total).toBeGreaterThan(100_000);
    expect(pct(corners.ok, corners.total)).toBeGreaterThanOrEqual(99.5);
    expect(pct(crossers.ok, crossers.total)).toBeGreaterThanOrEqual(99.5);
    expect(pct(heights.ok, heights.total)).toBeGreaterThanOrEqual(99.9);
    // the clockwise reading must visibly lose, or this test would not tell the two apart
    expect(pct(corners.cw, corners.total)).toBeLessThanOrEqual(80);
  }, 600_000);

  /** Z of creatures / waypoints / placeables against the probed ground, grouped by tileset. */
  async function objectHeights(select: (a: LoadedArea) => boolean) {
    const stats = new Map<string, { objects: number; walkable: number; within: number; within5: number; step: number }>();
    for (const area of areas) {
      if (!select(area)) continue;
      const info = game.tilesets.get(area.tileset);
      if (!info) continue;
      const grid = readAreaTileGrid(area.are);
      const models = info.tiles.map((t) => t.model);
      const getWok = (m: string) => game.woks.get(m.toLowerCase());
      const step = tileHeightStep(info);
      const git = await readJson(path.join(TFN_SRC as string, "git", `${area.name}.git.json`)).catch(() => null);
      if (!git) continue;
      const s = stats.get(area.tileset) ?? { objects: 0, walkable: 0, within: 0, within5: 0, step };
      for (const [list, xk, yk, zk] of [["Creature List", "XPosition", "YPosition", "ZPosition"], ["WaypointList", "XPosition", "YPosition", "ZPosition"]] as const) {
        for (const inst of getFieldList(git, list)) {
          const x = getFieldNum(inst, xk);
          const y = getFieldNum(inst, yk);
          const z = getFieldNum(inst, zk);
          const probe = probeAreaPosition(grid, models, getWok, x, y, game.surfacemat, step);
          s.objects++;
          if (!probe.walkable || probe.z === undefined) continue;
          s.walkable++;
          if (Math.abs(z - probe.z) <= 0.5) s.within++;
          const tileHeight = grid.tiles[Math.floor(y / 10) * grid.width + Math.floor(x / 10)]?.height ?? 0;
          if (Math.abs(z - (probe.z - tileHeight * step + tileHeight * 5)) <= 0.5) s.within5++;
        }
      }
      stats.set(area.tileset, s);
    }
    return stats;
  }

  it("existing creatures and waypoints stand on walkable ground at the probed height (node offsets, Tile_Height x Transition)", async () => {
    // a deterministic sample: every 6th area, always including the ones that prove the per-tileset step
    const anchors = new Set(["benzor", "river_mirar", "luskan_south"]);
    const stats = await objectHeights((a) => anchors.has(a.name) || areas.indexOf(a) % 6 === 0);
    let objects = 0;
    let walkable = 0;
    let within = 0;
    for (const s of stats.values()) {
      objects += s.objects;
      walkable += s.walkable;
      within += s.within;
    }
    for (const [set, st] of stats) report(`objects ${set}`, { objects: st.objects, walkablePct: pct(st.walkable, st.objects), withinPct: pct(st.within, st.walkable) });
    report("objects total", { objects, walkablePct: pct(walkable, objects), withinPct: pct(within, walkable) });
    expect(objects).toBeGreaterThan(2000);
    expect(pct(walkable, objects)).toBeGreaterThanOrEqual(93);
    expect(pct(within, walkable)).toBeGreaterThanOrEqual(95);
  }, 600_000);

  it("on raised tiles of tcn01 (Transition 4) and tno01 (Transition 2) objects fit the tileset's step, not a flat 5 m", async () => {
    const raised = (a: LoadedArea) => ["tcn01", "tno01"].includes(a.tileset) && getFieldList(a.are, "Tile_List").some((t) => getFieldNum(t, "Tile_Height") > 0);
    const stats = await objectHeights(raised);
    // whole-area numbers (flat tiles included) stay high with the right step; the flat-5 reading is checked on objects
    // that stand on raised tiles in the dedicated per-tile loop below
    for (const [set, st] of stats) report(`whole-area ${set}`, { objects: st.objects, walkable: st.walkable, withinPct: pct(st.within, st.walkable) });
    for (const [set, st] of stats) expect(pct(st.within, st.walkable), set).toBeGreaterThanOrEqual(90);

    const onRaised = { right: 0, flat5: 0, total: 0 };
    for (const area of areas.filter(raised)) {
      const info = game.tilesets.get(area.tileset);
      if (!info) continue;
      const grid = readAreaTileGrid(area.are);
      const models = info.tiles.map((t) => t.model);
      const step = tileHeightStep(info);
      const git = await readJson(path.join(TFN_SRC as string, "git", `${area.name}.git.json`)).catch(() => null);
      if (!git) continue;
      for (const [list, xk, yk, zk] of [["Creature List", "XPosition", "YPosition", "ZPosition"], ["WaypointList", "XPosition", "YPosition", "ZPosition"], ["Placeable List", "X", "Y", "Z"]] as const) {
        for (const inst of getFieldList(git, list)) {
          const x = getFieldNum(inst, xk);
          const y = getFieldNum(inst, yk);
          const z = getFieldNum(inst, zk);
          const tileHeight = grid.tiles[Math.floor(y / 10) * grid.width + Math.floor(x / 10)]?.height ?? 0;
          if (!tileHeight) continue;
          const probe = probeAreaPosition(grid, models, (m) => game.woks.get(m.toLowerCase()), x, y, game.surfacemat, step);
          if (!probe.walkable || probe.z === undefined) continue;
          onRaised.total++;
          onRaised.right += Number(Math.abs(z - probe.z) <= 0.5);
          onRaised.flat5 += Number(Math.abs(z - (probe.z - tileHeight * step + tileHeight * 5)) <= 0.5);
        }
      }
    }
    report("objects on raised tcn01/tno01 tiles", { total: onRaised.total, withTransitionPct: pct(onRaised.right, onRaised.total), withFlat5Pct: pct(onRaised.flat5, onRaised.total) });
    expect(onRaised.total).toBeGreaterThan(100);
    expect(pct(onRaised.right, onRaised.total)).toBeGreaterThanOrEqual(85);
    expect(pct(onRaised.flat5, onRaised.total)).toBeLessThanOrEqual(15);
  }, 600_000);
});

if (!haveGame) {
  // Explicit, greppable note in the run log for why the file skipped.
  describe("tile / walkmesh conventions (LIVE)", () => {
    it.skip("NWN_FOLDER_DATA / NIM_FOLDER_NWTOOLS not set - skipping the real-data oracle (set TFN_SRC as well for the real-area checks)", () => {});
  });
} else if (!haveAreas) {
  describe("conventions against real areas (LIVE)", () => {
    it.skip("TFN_SRC not set - skipping the real-area checks (point it at a nasher src folder with are/ and git/)", () => {});
  });
}
