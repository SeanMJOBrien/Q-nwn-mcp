# Placeable-to-tile positioning — TFN corpus (item 5)

Original question (from `CLAUDE.md`'s TODO): "which exact tile ID/orientation a
given placeable type is conventionally placed on or near." Answer, with a
significant refinement the raw question didn't anticipate: **wrong granularity —
there's essentially no tile-*ID* convention, but a strong tile-*terrain* one.**

## Method

- Raw pass (`areas_placeables_raw.json`): for every placed placeable across all
  504 areas, resolve world X/Y → tile column/row (`floor(x/10)`, `floor(y/10)`,
  10m tiles — same convention as `area-html.ts`/`walkmesh.ts` elsewhere in this
  project) → look up that tile's `Tile_ID`/`Tile_Orientation` from the area's
  `Tile_List`. Aggregate by `(tileset, TemplateResRef)`.
- Terrain refinement (`placeable_terrain_raw.json`): same placements, but each
  tile's ID is resolved to its **dominant corner terrain** (mode of the 4 corner
  terrain names, read directly from the tileset's `.set` file) instead of left
  as a raw numeric ID.

## Finding: tile-ID level shows no real convention

Across every tileset checked, `dominant_share` (how concentrated a placeable
type's instances are on its single most common tile) at the **tile-ID** level
was low — typically 0.05–0.35. Example (`tno01`, castle exterior):

| Placeable | Instances | Dominant tile-ID share | Top 3 tile IDs |
|---|---|---|---|
| `plc_pileskulls` | 60 | 0.18 | 258, 261, 261 (different orientations) |
| `plx_ballista` | 51 | 0.20 | 243, 242, 242 |
| `x2_plc_psheets` | 38 | 0.05 | 261, 261, 242 |

A tileset carries many aesthetic tile-ID variants that share the same terrain
(different rubble/cobble patterns that are all still "dirt," for instance), and
placement scatters freely across all of them. Taken at face value, the original
premise ("placeable X always goes on tile ID Y") doesn't hold.

## Refined finding: terrain-level convention is strong

Re-aggregating by **dominant corner terrain** instead of raw tile ID (only
possible for the 4 tilesets with a cached `.set` file available in this sandbox —
`tno01`, `tic01`, `ttr01`, `ttf01`; see Coverage below) tells a very different
story — mean `dominant_share` jumps to **0.76–0.95**:

| Tileset | Templates checked | Mean dominant terrain share |
|---|---|---|
| `ttf01` (forest) | 31 | **0.95** |
| `ttr01` (rural) | 74 | **0.87** |
| `tno01` (castle ext.) | 131 | **0.79** |
| `tic01` (castle int.) | 236 | **0.76** |

Concrete examples:

| Tileset | Placeable | n | Dominant share | Top terrains |
|---|---|---|---|---|
| `ttr01` | `plc_tree` | 88 | 0.89 | grass (78), water (9) |
| `ttr01` | `plc_shrub`, `plc_flamelarge`, `plc_dustplume`, `plc_solyellow` | 26–30 each | **1.00** | grass only |
| `ttr01` | `x0_fallentimber` | 27 | **1.00** | water only |
| `ttf01` | `plc_tree`, `plc_haybundle`, `plc_bloodstain`, `treas_smallchest` | 11–29 each | **1.00** | forest only |
| `tic01` | `treas_barrel`, `plc_rubble`, `treas_chest` | 57–75 each | 0.79–0.91 | `wall` (tic01's floor terrain — see `CLAUDE.md`'s "Interior tilesets fill with wall, not floor" pitfall) |
| `tno01` | `plc_pileskulls` | 60 | 0.82 | dirt (49), castlewall (11) |

## What this means for the pipeline

`packFeatures`/general placement in `adventure_apply_layout` already places
objects by *room/zone* (a terrain region), not by hunting for a specific tile
ID — so **this finding mostly validates current behavior** rather than
revealing a missing rule. The one actionable refinement worth flagging: a few
placeables lean on a *secondary* terrain beyond the obvious floor one (e.g.
`tic01`'s `plc_pileskulls`/`plc_bones` show meaningful `jail` presence
alongside `wall`) — suggesting some decorations are purpose-tied to a room's
*sub-type* (a jail cell vs. a generic hall), not just its floor terrain. Not
explored further here — a real follow-up would need per-room-purpose tagging
in the corpus, which isn't available from tile data alone.

## Coverage caveat — important

Terrain-level decoding needs the tileset's `.set` file, which is **not present
in this analysis environment** as game data (no `NWN_FOLDER_DATA`/base install
here). What made this possible at all: cached `.set` files left behind by
*prior* `nwn-mcp` sessions in `/tmp/nwn-mcp/*/tileset_cache/`, which happened
to cover 4 of the 27 tilesets present in the TFN corpus (`tno01`, `tic01`,
`ttf01`, `ttr01`). The other 23 tilesets — including `tin01` (2,673 placed
placeables, the single largest sample in the corpus) and `ttu01` — have raw
tile-ID data in `areas_placeables_raw.json` but no terrain refinement.

To extend this: either point at a machine with `NWN_FOLDER_DATA` set (so the
real `nwn-mcp` tools — `get_tileset_details` — can resolve terrain for any
tileset), or load a module using each missing tileset through `nwn-mcp` once
(which populates `tileset_cache/` as a side effect) before re-running this
analysis offline.
