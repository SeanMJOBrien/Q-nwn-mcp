# Water Tile Gallery — `tcn01` (City Exterior)

**Purpose:** every one of `tcn01`'s 50 non-group water-touching tiles, packed into
a single 10x5 area (`pg_water_gal`) for direct visual examination in the toolset —
created after a user report that City Exterior's water-edge tiles show the only
visual flaws seen in that tileset so far, following the `tileset.ts` `.set`-parsing
fix (see `CLAUDE.md`'s "Pitfalls Found by Building a Real Module").

**Revision note:** the first version of this gallery was 10x8 and included 25
additional tiles that are members of multi-tile decorative feature groups (ships,
boathouse, docks — see the removed "Rows 5-7" section below). The toolset rejected
those on load ("A bad tile group was found on Row 5, Column 9. It was removed from
the map.") — it validates any tile belonging to a registered multi-tile group
against that group's expected shape, and strips instances placed without their
correctly-positioned siblings. Since displaying those properly requires assembling
each group as a whole block (a different placement technique, `paint_group`, not
covered by this gallery), they were removed rather than fixed here. The 50 tiles
below are not members of any group and are unaffected by this issue.

**How it was built:** `create_area(pg_water_gal, tcn01, 10x8)`, then `paint_tiles`
placed all 75 tiles directly (no solving) at their own grid cell, each at
`Tile_Orientation=0` — i.e. each tile's exact native/default authored pose, so what
you see is precisely that tile's own model and walkmesh, independent of any solver
logic. Adjacent cells are unrelated tiles by design (`paint_tiles` reported
corner/crosser "constraint violation" warnings for nearly every cell — expected and
harmless, since this is a specimen board, not a coherent scene). Grid row 0 is at
the south (bottom) of the area per NWN's tile-index convention; row 7 is north.

**What to look for:** since the just-fixed bug only affected tiles with a non-zero
`.set` `Orientation` field, cross-reference a tile's row/col below against its
`.set` `Orientation` (not shown here — check `get_tileset_details(tcn01, "full")`
or the cached `tileset_cache/tcn01.set`) if a specific cell looks wrong. Report
back which grid cell(s) look incorrect and how (which direction, what looks
mismatched) — that plus this legend is enough to identify the exact tile ID and
model without needing to re-derive anything.

## Legend (col, row → tile)

| Col | Row | Tile ID | Model | Corners (TL/TR/BL/BR) | Crossers | Group |
|---|---|---|---|---|---|---|
| 0 | 0 | 7 | tcn01_b01_01 | cobble/cobble/water/cobble | none | — |
| 1 | 0 | 8 | tcn01_b02_01 | cobble/water/cobble/water | none | — |
| 2 | 0 | 9 | tcn01_b03_01 | water/cobble/cobble/water | none | — |
| 3 | 0 | 10 | tcn01_b04_01 | water/water/cobble/water | none | — |
| 4 | 0 | 11 | tcn01_b06_01 | cobble/cobble/water/cobble | none | — |
| 5 | 0 | 12 | tcn01_b07_01 | cobble/water/cobble/water | none | — |
| 6 | 0 | 14 | tcn01_b09_01 | water/water/cobble/water | none | — |
| 7 | 0 | 160 | tcn01_b11_01 | cobble/cobble/water/cobble | none | — |
| 8 | 0 | 161 | tcn01_b12_01 | water/cobble/cobble/cobble | none | — |
| 9 | 0 | 162 | tcn01_b13_01 | cobble/cobble/water/water | none | — |
| 0 | 1 | 163 | tcn01_b14_01 | cobble/cobble/water/water | none | — |
| 1 | 1 | 164 | tcn01_b15_01 | water/cobble/cobble/cobble | none | — |
| 2 | 1 | 165 | tcn01_b16_01 | cobble/cobble/water/cobble | none | — |
| 3 | 1 | 166 | tcn01_b20_01 | water/water/water/water | none | — |
| 4 | 1 | 216 | tcn01_b02_03 | cobble/water/cobble/water | none | — |
| 5 | 1 | 217 | tcn01_b03_02 | water/cobble/cobble/water | none | — |
| 6 | 1 | 220 | tcn01_b04_02 | water/water/cobble/water | none | — |
| 7 | 1 | 223 | tcn01_b01_02 | cobble/cobble/water/cobble | none | — |
| 8 | 1 | 297 | tcn01_b02_04 | cobble/water/cobble/water | none | — |
| 9 | 1 | 13 | tcn01_b08_01 | water/cobble/cobble/water | R:wall | — |
| 0 | 2 | 155 | tcn01_h13_01 | cobble/cobble/water/water | T:wall | — |
| 1 | 2 | 156 | tcn01_j13_01 | cobble/water/cobble/water | L:stream | — |
| 2 | 2 | 182 | tcn01_k01_01 | water/water/water/water | B:dock,L:dock | — |
| 3 | 2 | 183 | tcn01_k02_01 | water/water/water/water | T:dock,B:dock | — |
| 4 | 2 | 184 | tcn01_k03_01 | water/water/water/water | T:dock,B:dock,L:dock | — |
| 5 | 2 | 185 | tcn01_k04_01 | water/water/water/water | T:dock,R:dock,B:dock,L:dock | — |
| 6 | 2 | 186 | tcn01_k05_01 | water/water/water/water | T:dock | — |
| 7 | 2 | 188 | tcn01_k09_01 | water/cobble/water/cobble | L:dock | — |
| 8 | 2 | 189 | tcn01_l01_01 | water/water/water/water | B:bridge,L:bridge | — |
| 9 | 2 | 190 | tcn01_l02_01 | water/water/water/water | T:bridge,B:bridge | — |
| 0 | 3 | 191 | tcn01_l03_01 | water/water/water/water | T:bridge,B:bridge,L:bridge | — |
| 1 | 3 | 192 | tcn01_l04_01 | water/water/water/water | T:bridge,R:bridge,B:bridge,L:bridge | — |
| 2 | 3 | 194 | tcn01_l05_01 | water/water/water/water | T:bridge | — |
| 3 | 3 | 195 | tcn01_l09_01 | water/cobble/water/cobble | L:bridge | — |
| 4 | 3 | 211 | tcn01_k05_02 | water/water/water/water | T:dock | — |
| 5 | 3 | 212 | tcn01_k02_02 | water/water/water/water | T:dock,B:dock | — |
| 6 | 3 | 213 | tcn01_k01_02 | water/water/water/water | B:dock,L:dock | — |
| 7 | 3 | 235 | tcn01_l02_02 | water/water/water/water | T:bridge,B:bridge | — |
| 8 | 3 | 236 | tcn01_l01_02 | water/water/water/water | B:bridge,L:bridge | — |
| 9 | 3 | 272 | tcn01_j17_01 | cobble/water/cobble/water | L:stream | — |
| 0 | 4 | 306 | tcn01_a06_01 | building/building/water/building | none | — |
| 1 | 4 | 307 | tcn01_a07_01 | water/building/water/building | none | — |
| 2 | 4 | 308 | tcn01_a08_01 | water/building/building/water | none | — |
| 3 | 4 | 309 | tcn01_a09_01 | building/water/water/water | none | — |
| 4 | 4 | 310 | tcn01_a11_01 | cobble/water/cobble/building | none | — |
| 5 | 4 | 311 | tcn01_a12_01 | cobble/building/cobble/water | none | — |
| 6 | 4 | 312 | tcn01_a13_01 | water/water/cobble/building | none | — |
| 7 | 4 | 313 | tcn01_a14_01 | building/water/cobble/water | none | — |
| 8 | 4 | 314 | tcn01_a15_01 | water/building/cobble/building | none | — |
| 9 | 4 | 315 | tcn01_a16_01 | building/building/cobble/water | none | — |

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
253, 298, 320-335). Examining those properly would need `paint_group` to place
each as a complete, correctly-shaped block rather than isolated single tiles.
