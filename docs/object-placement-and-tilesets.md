# Object placement and tileset conventions — verified against real data

Written 2026-10-02. Everything below was measured on real data, not assumed: the 33 base-game tilesets and their 12,182
walkmeshes (`.wok`), and **504 human-built areas** of The Frozen North (TFN: 137,250 shared tile edges, ~2,700 sampled
creatures/waypoints plus thousands of props). The checks are automated in
[`src/util/tile-oracle.live.test.ts`](../src/util/tile-oracle.live.test.ts) (see [§9](#9-reproducing-the-evidence)).
Skills that use these facts: `nwn-object-placement`, `nwn-tileset-conventions`, `area-connections`,
`adventure-environment`, `adventure-areas`.

> **Rule of thumb for this codebase:** every spatial convention here has a real-data oracle. If you change rotation,
> height, offset or facing maths and the oracle fails, the change is wrong — not the oracle.

## 1. Coordinates and the tile grid

* World units are **metres**: **+X east, +Y north**, origin at the **south-west** corner of the area. A tile is **10 m × 10 m**.
* `Tile_List` in the `.are` is **row-major from the south-west**: `index = tileY * Width + tileX`. The tile centre is
  `(tileX * 10 + 5, tileY * 10 + 5)`.
* Tile-local coordinates (what a walkmesh is stored in) are centred: `[-5, +5]` on both axes, +Y north.

## 2. Tile orientation — counter-clockwise

* `Tile_Orientation` **n** turns the tile **n × 90° counter-clockwise** seen from above (+Y north).
  A corner moves TR → TL → BL → BR → TR; an edge moves right → top → left → bottom.
* The `.set` fields (`TopLeft…`, `Top…`, `…Height`) are already in **orientation-0 terms**. Do **not** pre-rotate them.
  The `.set` `Orientation=` field is the angle the *model* was authored at; it is only a preference hint for the solver
  ("natural orientation"), never a transform to apply to the corner/crosser fields. (An older `CLAUDE.md` paragraph that
  said the parser un-rotates by `Orientation` was wrong and has been corrected.)
* To map a world point into a rotated tile's local frame, rotate the **point** the opposite way: for n = 1, `(x, y) → (y, −x)`
  (`rotateForOrientation` in `walkmesh.ts`).

**Evidence (live oracle, 504 areas, 274,500 neighbour corner comparisons):** neighbouring tiles agree on their shared corner
terrain **99.99 %** of the time and on shared crossers **99.99 %** under the counter-clockwise reading; the clockwise reading
agrees only **75 %**. Flipping `rotateForOrientation` in a scratch copy makes 3 live tests fail (mutation check, §9).

## 3. Heights

Three independent things add up to the ground height `z` at a point:

```
z = meshZ(point)  +  Tile_Height × Transition(tileset)
    └ walkmesh triangle interpolation, node offset already included (§4)
```

* **Corner heights** (`TopLeftHeight` … in the `.set`) are integer *levels*. Neighbouring tiles share corners, and the rule
  `Tile_Height(A) + rotatedCornerHeight(A, corner) == Tile_Height(B) + rotatedCornerHeight(B, same corner)` holds for
  **100.00 %** of the 274,500 comparisons (`getRotatedCornerHeights`, same rotation as the corner terrains).
* **`Tile_Height`** (per tile, in the `.are`) raises the whole tile by that many levels.
* **A level is `Transition` metres — a per-tileset value, not a constant.** It is `[GENERAL] Transition=` in the `.set`:

  | `Transition` | Tilesets (base game) |
  |---|---|
  | **5** | ttr01, tts01, tts02, tti01, ttu01, ttz01, trm02, tms01, tcm02, trs02, tss13 |
  | **4** | tcn01 |
  | 3 | the interiors / dungeons / caves (no height levels at all): dag01, tbw01, tdc01, tde01, tdm01, tdr01, tds01, tdt01, tib01, tic01, tid01, tii01, tin01, tni01, tni02, tsw01, ttd01, ttf01, ttf02 |
  | **2** | tno01 |
  | 1 | twc03 |

  Real objects standing on raised tiles: **tcn01** (`benzor`): **93.9 %** within 0.5 m using `Transition = 4`, **3.5 %** with a flat
  5 m. **tno01** areas: **92.6 %** vs **0 %**. Corner-to-corner mesh differences agree with `Δlevel × Transition` for tcn01
  (**100 %** vs 0 % with 5 m) and tno01 (**98.9 %** vs 0 %). A flat 5 m — what this server used before — is only right for the
  `Transition = 5` sets, which is most outdoor tilesets, which is why it looked correct for so long.
  `tileHeightStep()` in `walkmesh.ts` implements this (falls back to 5 when the value is missing).
* **Flat ground is not always at z = 0.** The *flat* tiles' walkmesh of some tilesets sits at a constant offset: trm02 and tno01
  **+5**, tbw01 ≈ +5.1, tss13 ≈ +1.9, ttu01 and ttz01 **+1**. Never assume `z = 0` for ground; probe it.
* **trm02 and trs02 (the "02" medieval-rural family) build their ramps over half a level**: a one-level corner difference is
  2.5 m of mesh, not 5 m, so only 55 % of their corner differences are whole levels. Objects on their raised tiles still match
  the probed height (trm02: 97.6 %), so object placement is correct; only a "corner difference = whole levels" check does not apply.

## 4. Walkmeshes (`.wok`)

* The walkmesh of a tile is **`<Model>.wok`**, where `Model=` is the tile's model in the `.set` — **not** the `.set`'s
  `WalkMesh=` field (which names something else, e.g. `msb01`).
* Vertices are **tile-local and relative to the walkmesh node's `position`**. **54 %** of the 12,182 base-game walkmeshes have a
  non-zero Z offset (57 % of those TFN uses; −10.9 m … +27.1 m; interiors by −1.5 m, caves by −1.6 … −2.2 m). The parser must add it
  back (`parseWokFile`); ignoring it made every ground height wrong. With the offset applied, **99.98 %** of the 533,504 vertices lie
  inside the 10 m footprint (`|x|, |y| ≤ 5.05`).
* Faces carry a surface material id → `surfacemat.2da` (`Walk` column) decides walkability. Where several faces cover a point
  (a bridge over a pit) the **walkable face with the highest Z** wins; if none is walkable the highest blocking face is reported.
* **A few tiles have no walkmesh**: exactly one model each in tcm02 (`tcm02_b92_02`) and trs02 (`trs02_m00_00`), out of 1,850 and 1,305
  models. `nwn_resman_extract a.wok missing.wok b.wok` **crashes and extracts nothing — not even `a.wok`.** One all-in-one call over a
  whole tileset (or any area that uses such a tile) therefore silently yields no walkmeshes at all: before the fix, every object in a
  tcm02 or trs02 area probed as "not walkable".
  `src/util/batch-extract.ts` bisects a failed batch (about 23 calls to find one missing file among 1,850) so every file that exists is extracted
  (`ensureWoksExtracted` in `walkmesh.ts`), and models that do not exist are remembered so they are not re-requested for every object on that tile.

**Evidence:** of a sample of 2,695 existing creatures and waypoints (every 6th TFN area plus the raised-tile anchors) **97.5 %** probe as
walkable and of those **99.81 %** stand within 0.5 m of the probed height. Ignoring the node offset in a scratch copy makes 4 live
tests fail.

## 5. Facing — three different encodings

| Object | Stored as | This server's `bearing` parameter | Helper |
|---|---|---|---|
| Creatures, waypoints (and stores) | `XOrientation`/`YOrientation`: a unit vector in **world axes** (+X east, +Y north) pointing the way it **faces** | **compass** degrees: 0 = north, 90 = east, clockwise → vector `(sin b, cos b)` | `compassToOrientation` |
| Placeables, doors | `Bearing`: **radians, counter-clockwise** (math angle); the model **front faces SOUTH at 0** | **raw GFF** degrees, counter-clockwise | `placeableBearingForCompass`, `placeableBearingToward` |
| Tile (`.are`) | `Tile_Orientation` 0–3 quarter-turns **counter-clockwise** | — | — |

* A placeable's front compass direction is **`180° − Bearing°`**. The same raw number therefore means different directions per
  object type: `bearing: 0` makes a creature face **north** but a placeable face **south**. They agree only at 90 (east) and 270 (west).
* **Always prefer `faceTowardX`/`faceTowardY`** on `place_creature`, `place_placeable` and `place_waypoint`: the server computes the
  right encoding for the object type.
* Evidence for placeables: 591 chair/table pairs — `Bearing = (math angle toward the table) + 90°` with resultant length 0.78 (0.92 for
  the most common chair model); the clockwise reading scores 0.23. Wall furniture (ovens, beds, bookcases): `Bearing = (math angle toward
  the wall) − 90°`.
* **Doors that belong to a tile** (a `.set` `[TILEnDOORm]` placement): world position = tile centre + the door's `(x, y)` rotated
  counter-clockwise by the tile orientation; `Bearing = (doorOrientation + Tile_Orientation × 90) % 360` degrees. Checked on **3,717
  real doors**: positions match; the bearing matches exactly or ±180° (a door is symmetric).

## 6. How real designers place things

Measured on 24 TFN areas / 5,561 props — use these to calibrate what the tools should *allow*, not what a designer "ought" to do:

* Only **57 %** of props pass a 1 m four-point walkable buffer; **74 %** pass 0.5 m. Props against walls and cliff edges are normal.
* **34 %** of props sit within 1 m of another prop, **16 %** within 0.5 m (tables with chairs, shelves, crates).
* About **1 %** of objects in correct areas differ from the ground height on purpose (items on tables, hanging lanterns).
* Creatures and waypoints stand on the walkmesh; props may be raised.

## 7. What the tools do now

| Tool | Behaviour |
|---|---|
| `probe_ground` *(new, read-only)* | Walkable? surface, **exact ground Z**, `heightStep` used, the tile (col/row/id/orientation/height level), and the placement verdict for a `buffer`. Use it before placing, and to pick a Z for a prop. |
| every `place_*` | **Z is the walkmesh ground height**; the `z` parameter is only a fallback when no walkmesh is available. Responses report the **placed** z (they used to echo the requested one). |
| `place_creature` | `bearing` = compass; `faceTowardX/Y`; `walkBuffer` (default 1 m; 0 = only the point must be walkable); `collisionRadius` (default 0.75 m). |
| `place_placeable` | `bearing` = raw GFF CCW (response includes `frontFacesCompass`); `faceTowardX/Y`; **`zOffset`** (height above ground, e.g. an item on a table); **`collisionRadius`** (default 1.0 m; real areas often use less); `walkBuffer`. |
| `place_waypoint` | `bearing` = compass; `faceTowardX/Y`; `walkBuffer`. |
| `place_door` | `bearing` = raw GFF CCW (see §5 for tile doors); no walkability block (doors sit at tile boundaries). |
| `move_object`, `bulk_move_objects` | **`followGround`** (default true): when z is not given, the object keeps its height above the ground, i.e. Z changes by the ground-height difference between the old and new position. |
| `fix_object_heights` | **`dryRun`**, **`tolerance`**, **`onlyBuried`** (raise buried objects, never lower raised props). Default behaviour (snap everything) is unchanged but now uses the corrected ground height. |
| `adventure_find_walkable` | **`clearRadius`**: finds spots where a whole `(2r+1) × (2r+1)` m footprint is ≥ 97 % walkable (a camp, a ring of chairs), nearest first, each with its exact Z. |

Library map: `util/walkmesh.ts` (pure probing: `probeTileLocal`, `probeAreaPosition`, `tileHeightStep`, node offsets, wok cache),
`util/walkgrid.ts` (1 m raster, `findOpenGround`, `loadAreaWalkGrid`), `util/facing.ts` (all facing conversions),
`util/batch-extract.ts` (extraction that survives missing resources), `util/tileset.ts` (`getRotatedCorners/Crossers/CornerHeights`).

## 8. Open points

* **Painting tiles with heights.** `paint_tiles`, `paint_group` and the solver only place **flat** tiles (`Tile_Height = 0`, no
  height-transition tiles). The height rules above are enough to extend them (neighbours must agree on
  `Tile_Height + rotatedCornerHeight`), but nothing builds hills yet. Any new elevation code **must** read `Transition`, and re-verify
  object heights afterwards (`fix_object_heights dryRun`).
* **trs02 `northern_east`**: 16 of 40 objects stand 1.0–1.2 m *above* the probed ground (props on features); not a model gap, but not
  explained either.
* **Intel Macs / non-neverwinter.nim hosts**: only the walkmesh *model* is verified here; extraction needs the neverwinter.nim tools.
* The mesh near a tile edge is only checked against its neighbour through corner heights, not triangle-by-triangle.

## 9. Reproducing the evidence

```bash
# Part A: base-game tilesets only
NIM_FOLDER_NWTOOLS=<…/neverwinter> NWN_FOLDER_DATA=<NWN install> NWN_FOLDER_USER=<NWN user dir> \
  npx vitest run src/util/tile-oracle.live.test.ts
# Part B: also real, human-built areas (any nasher `src` folder with are/*.are.json and git/*.git.json)
TFN_SRC=<…/the-frozen-north/src> ORACLE_VERBOSE=1 … npx vitest run src/util/tile-oracle.live.test.ts
```

Without the environment variables the file **skips** with an explicit note. `ORACLE_VERBOSE=1` prints the measured numbers behind each
assertion. Mutation checks done on a scratch copy of the tree: flipping the rotation direction fails 3 live tests, a flat 5 m height
step fails 5, ignoring the walkmesh node offset fails 4. The same facts are covered offline by `walkmesh.test.ts`, `walkgrid.test.ts`,
`facing.test.ts`, `tileset.test.ts`, `batch-extract.test.ts`, `walkmesh-extract.test.ts` and
`tools/placement-conventions.integration.test.ts` (which pins the tool-level behaviour of §7; 18 of its 21 tests fail against the pre-change code).

The Python sibling project `~/git/Q-tfn-content-studio` carries the same height-step and extraction fixes (`tfnstudio/walkmesh.py`,
`tfnstudio/gamedata.py`) with its own real-area calibration test.
