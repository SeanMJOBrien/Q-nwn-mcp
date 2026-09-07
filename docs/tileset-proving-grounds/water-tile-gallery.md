# Water Tile Gallery — `tcn01` (City Exterior)

**Purpose:** every one of `tcn01`'s 50 non-group water-touching tiles, packed into
a single 10x5 area (`pg_water_gal`) for direct visual examination in the toolset —
created after a user report that City Exterior's water-edge tiles show the only
visual flaws seen in that tileset so far, following the `tileset.ts` `.set`-parsing
fix (see `CLAUDE.md`'s "Pitfalls Found by Building a Real Module").

**Revision note (first pass):** the first version of this gallery was 10x8 and
included 25 additional tiles that are members of multi-tile decorative feature
groups (ships, boathouse, docks — see the removed "Rows 5-7" section below). The
toolset rejected those on load ("A bad tile group was found on Row 5, Column 9. It
was removed from the map.") — it validates any tile belonging to a registered
multi-tile group against that group's expected shape, and strips instances placed
without their correctly-positioned siblings. Since displaying those properly
requires assembling each group as a whole block (a different placement technique,
`paint_group`, not covered by this gallery), they were removed rather than fixed
here. The 50 tiles below are not members of any group and are unaffected by this
issue.

**Revision note (second pass) — every tile was originally placed at GIT
`Orientation=0`, and that was the wrong baseline for 18 of the 50.** A user report
("`tcn01_b02_04`, `tcn01_b02_03`, `tcn01_b02_01` are all incorrectly facing 180
degrees... `tcn01_a14_01` is incorrectly turned 90 degrees counterclockwise")
turned out to be a real, reproducible visual problem — but not a solver/parsing
bug. Verified two ways before touching anything:

1. **An automated cross-check against `~/tfndev`'s real, human-built `tcn01` areas**
   (`aqueducts`, `benzor`, `tobaro`, `westbenzorslums` — real placements of all four
   reported tiles, at every GIT orientation 0-3) found **0 corner-terrain mismatches
   across 204 real neighbor edges** touching these tiles, using this codebase's own
   `getRotatedCorners()` exactly as the solver calls it. The rotation/corner-parsing
   math is correct — this was not a repeat of the earlier `.set`-Orientation parsing
   bug (see `CLAUDE.md`).
2. **The real cause: this gallery forced every tile to GIT `Orientation=0`, but a
   tile whose `.set` `Orientation` field is non-zero has a *different* natural GIT
   orientation** — `round(setOrientation / 90) % 4`, exactly the formula the zone
   solver itself uses for its "prefer natural orientation" placement preference
   (`zone-solver.ts`, `naturalOri`). A tile authored at `.set Orientation=180` and
   displayed at GIT orientation 0 is showing a pose 180° away from how its model was
   actually designed to be seen — which is precisely "facing 180 degrees from where
   they should," and a `.set Orientation=90` tile shown at GIT 0 is missing that 90°
   CW rotation, i.e. it reads as turned 90° CCW from where it should be. Both user
   reports match their tile's real `.set Orientation` value exactly.

**Fix applied:** 18 of the 50 tiles (every one with a non-zero `.set Orientation`)
were repainted at their natural GIT orientation instead of the previous blanket 0 —
see the `ori=` column below, all others unchanged at `ori=0`. The corner/crosser
data in the table below was also regenerated directly from `parseTilesetFile()` +
`getRotatedCorners()` (the actual code path, not hand-transcribed) — the original
table had several transcription errors (e.g. `b02_01` was listed
`cobble/water/cobble/water`; the real, parsed value is `water/cobble/water/cobble`).

**How it was built:** `create_area(pg_water_gal, tcn01, 10x8)`, then `paint_tiles`
placed all 75 tiles directly (no solving) at their own grid cell — after the second
pass, at each tile's **natural** orientation (see above), not a blanket 0. Adjacent
cells are unrelated tiles by design (`paint_tiles` reports corner/crosser
"constraint violation" warnings for nearly every cell — expected and harmless,
since this is a specimen board, not a coherent scene). Grid row 0 is at the south
(bottom) of the area per NWN's tile-index convention; row 4 is north.

**What to look for:** report back which grid cell(s) still look incorrect and how
(which direction, what looks mismatched). Before assuming a code bug, check this
tile's `ori=` value below against its natural orientation — a cell already shown at
its natural pose and still looking wrong is a much stronger signal than one that
wasn't (which is what happened here).

## Legend (col, row → tile)

| Col | Row | Tile ID | Model | Corners (TL/TR/BL/BR) | Crossers | Group | Orientation |
|---|---|---|---|---|---|---|---|
| 0 | 0 | 7 | tcn01_b01_01 | cobble/cobble/water/cobble | none | — | ori=0 (natural=0) |
| 1 | 0 | 8 | tcn01_b02_01 | water/cobble/water/cobble | none | — | ori=2 (natural=2) |
| 2 | 0 | 9 | tcn01_b03_01 | water/cobble/cobble/water | none | — | ori=0 (natural=0) |
| 3 | 0 | 10 | tcn01_b04_01 | cobble/water/water/water | none | — | ori=3 (natural=3) |
| 4 | 0 | 11 | tcn01_b06_01 | cobble/cobble/water/cobble | none | — | ori=0 (natural=0) |
| 5 | 0 | 12 | tcn01_b07_01 | water/cobble/water/cobble | none | — | ori=2 (natural=2) |
| 6 | 0 | 14 | tcn01_b09_01 | cobble/water/water/water | none | — | ori=3 (natural=3) |
| 7 | 0 | 160 | tcn01_b11_01 | cobble/cobble/water/cobble | none | — | ori=0 (natural=0) |
| 8 | 0 | 161 | tcn01_b12_01 | water/cobble/cobble/cobble | none | — | ori=0 (natural=0) |
| 9 | 0 | 162 | tcn01_b13_01 | cobble/water/cobble/water | none | — | ori=1 (natural=1) |
| 0 | 1 | 163 | tcn01_b14_01 | cobble/water/cobble/water | none | — | ori=1 (natural=1) |
| 1 | 1 | 164 | tcn01_b15_01 | water/cobble/cobble/cobble | none | — | ori=0 (natural=0) |
| 2 | 1 | 165 | tcn01_b16_01 | cobble/cobble/water/cobble | none | — | ori=0 (natural=0) |
| 3 | 1 | 166 | tcn01_b20_01 | water/water/water/water | none | — | ori=0 (natural=0) |
| 4 | 1 | 216 | tcn01_b02_03 | water/cobble/water/cobble | none | — | ori=2 (natural=2) |
| 5 | 1 | 217 | tcn01_b03_02 | water/cobble/cobble/water | none | — | ori=0 (natural=0) |
| 6 | 1 | 220 | tcn01_b04_02 | cobble/water/water/water | none | — | ori=3 (natural=3) |
| 7 | 1 | 223 | tcn01_b01_02 | cobble/cobble/water/cobble | none | — | ori=0 (natural=0) |
| 8 | 1 | 297 | tcn01_b02_04 | water/cobble/water/cobble | none | — | ori=2 (natural=2) |
| 9 | 1 | 13 | tcn01_b08_01 | water/cobble/cobble/water | R:wall | — | ori=0 (natural=0) |
| 0 | 2 | 155 | tcn01_h13_01 | water/cobble/water/cobble | R:wall | — | ori=3 (natural=3) |
| 1 | 2 | 156 | tcn01_j13_01 | water/cobble/water/cobble | R:stream | — | ori=2 (natural=2) |
| 2 | 2 | 182 | tcn01_k01_01 | water/water/water/water | B:dock,L:dock | — | ori=0 (natural=0) |
| 3 | 2 | 183 | tcn01_k02_01 | water/water/water/water | T:dock,B:dock | — | ori=0 (natural=0) |
| 4 | 2 | 184 | tcn01_k03_01 | water/water/water/water | T:dock,B:dock,L:dock | — | ori=0 (natural=0) |
| 5 | 2 | 185 | tcn01_k04_01 | water/water/water/water | T:dock,R:dock,B:dock,L:dock | — | ori=0 (natural=0) |
| 6 | 2 | 186 | tcn01_k05_01 | water/water/water/water | T:dock | — | ori=0 (natural=0) |
| 7 | 2 | 188 | tcn01_k09_01 | water/cobble/water/cobble | L:dock | — | ori=0 (natural=0) |
| 8 | 2 | 189 | tcn01_l01_01 | water/water/water/water | B:bridge,L:bridge | — | ori=0 (natural=0) |
| 9 | 2 | 190 | tcn01_l02_01 | water/water/water/water | T:bridge,B:bridge | — | ori=0 (natural=0) |
| 0 | 3 | 191 | tcn01_l03_01 | water/water/water/water | T:bridge,B:bridge,L:bridge | — | ori=0 (natural=0) |
| 1 | 3 | 192 | tcn01_l04_01 | water/water/water/water | T:bridge,R:bridge,B:bridge,L:bridge | — | ori=0 (natural=0) |
| 2 | 3 | 194 | tcn01_l05_01 | water/water/water/water | T:bridge | — | ori=0 (natural=0) |
| 3 | 3 | 195 | tcn01_l09_01 | water/cobble/water/cobble | L:bridge | — | ori=0 (natural=0) |
| 4 | 3 | 211 | tcn01_k05_02 | water/water/water/water | T:dock | — | ori=0 (natural=0) |
| 5 | 3 | 212 | tcn01_k02_02 | water/water/water/water | T:dock,B:dock | — | ori=0 (natural=0) |
| 6 | 3 | 213 | tcn01_k01_02 | water/water/water/water | B:dock,L:dock | — | ori=0 (natural=0) |
| 7 | 3 | 235 | tcn01_l02_02 | water/water/water/water | T:bridge,B:bridge | — | ori=0 (natural=0) |
| 8 | 3 | 236 | tcn01_l01_02 | water/water/water/water | B:bridge,L:bridge | — | ori=0 (natural=0) |
| 9 | 3 | 272 | tcn01_j17_01 | water/cobble/water/cobble | R:stream | — | ori=2 (natural=2) |
| 0 | 4 | 306 | tcn01_a06_01 | building/building/water/building | none | — | ori=0 (natural=0) |
| 1 | 4 | 307 | tcn01_a07_01 | water/building/water/building | none | — | ori=0 (natural=0) |
| 2 | 4 | 308 | tcn01_a08_01 | water/building/building/water | none | — | ori=0 (natural=0) |
| 3 | 4 | 309 | tcn01_a09_01 | building/water/water/water | none | — | ori=0 (natural=0) |
| 4 | 4 | 310 | tcn01_a11_01 | building/cobble/water/cobble | none | — | ori=2 (natural=2) |
| 5 | 4 | 311 | tcn01_a12_01 | water/cobble/building/cobble | none | — | ori=2 (natural=2) |
| 6 | 4 | 312 | tcn01_a13_01 | building/cobble/water/water | none | — | ori=2 (natural=2) |
| 7 | 4 | 313 | tcn01_a14_01 | water/water/building/cobble | none | — | ori=1 (natural=1) |
| 8 | 4 | 314 | tcn01_a15_01 | building/cobble/building/water | none | — | ori=2 (natural=2) |
| 9 | 4 | 315 | tcn01_a16_01 | building/water/building/cobble | none | — | ori=1 (natural=1) |

**Rows 0-3** (cols 0-9, minus a few already covered): plain water/cobble edge and
corner tiles, plus dock/bridge/stream crosser-carrying tiles — the tiles the zone
solver actually paints during normal area generation, and the ones most likely to
have been affected by the just-fixed `.set`-Orientation parsing bug.

**Row 4**: waterfront **building** corner tiles (`building`/`water`/`cobble`
three-way corners) — a third terrain family worth checking, not covered by the
castle-wall investigation.

**Not included** (removed after a toolset load error — see Revision note above):
25 tiles that are members of multi-tile decorative feature groups (ships, docks,
boathouse: `DockDoor`, `BridgeDoor`, `Boathouse`, `ShipDocked_2x2`,
`ShipFloating_1x2`, `Boat`, `Merchant_Docked`, `Merchant_Ship_Undockable`,
`Weathered_Docked`, `Weathered_Ship_Undockable` — tile IDs 187, 193, 215, 241-244,
253, 298, 320-335).

**On the ship/dock feature group specifically:** a separate user report flagged
that `ShipDocked_2x2` (tile IDs 241 `o19_01`/242 `p19_01`, both `R:dock,L:dock`
crossers) has no enforced connection to an actual dock tile (`k02_01`/`k05_01`/etc)
when placed by the generator — i.e. nothing currently guarantees the feature's
dock-crosser edge lands against a real dock rather than open water or a wall. This
is a real generator gap, not a rotation bug, and is being tracked separately (see
`CLAUDE.md`'s "Doors/gates architecture" pitfall for the closest existing analogue —
`feature-collars.ts`'s curated-adjacency-table pattern is the likely fix shape).
