---
name: area-rural
description: Build a Rural or Rural Winter area (ttr01/tts01) — farmland, villages, roads and settlements, calibrated against 899 hand-built rural areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Rural and Rural Winter areas

Tileset `ttr01` (**Rural**) and `tts01` (**Rural Winter**) — the same group vocabulary with snow
terrain substituted. This is the workhorse settlement tileset: villages, farms, roads, the outdoor
half of most low-level adventures.

## Measured norms

| Property | Rural (`ttr01`, n=809) | Rural Winter (`tts01`, n=90) |
|---|---|---|
| Size | **24×24** (576 tiles) | **16×16** (256 tiles) |
| Unique tile IDs | 26 | 33 |
| Tile variety | **8%** | 19% |
| Uses elevation | **37%** | **79%** |
| Placeables | 10 per area, **4.5 per 100 tiles** | 43 per area, **37 per 100 tiles** |
| Doors | 1 | 2 |
| Triggers | 2 | 2 |
| Waypoints | 3 | **20** |

Two things stand out. Rural is **sparse** — 4.5 placeables per 100 tiles, an order of magnitude
below forest or dungeon. The buildings come from tile *groups*, not from placeables, so a village
that looks full may contain almost no placed objects. And rural is the first biome where
**elevation genuinely matters**: 37% of areas vary `Tile_Height`, rising to 79% in winter. Rolling
ground is part of the look.

Rural Winter's 20 median waypoints are spawn-system infrastructure from the source worlds, not a
pattern to copy into a one-shot.

## Terrain and crossers

- **Terrain:** `grass` (default), `water`, `trees`
- **Crossers:** `road`, `stream`, `wall1`, `wall2`
- **Valid adjacencies:** `grass ↔ trees`, `grass ↔ water`, `trees ↔ water`

`road` is the backbone of nearly every rural area — lay it first and hang settlements off it.
`wall1`/`wall2` with their gate groups turn a hamlet into a defended village.

## Feature groups

283 tiles and 60+ groups; this is the richest exterior vocabulary in the base game.

| Purpose | Groups |
|---|---|
| **Settlement** | `House 1`, `House 2`, `Turf House`, `Inn 1x2`, `Granary`, `Barracks 1x2`, `Barracks 2x2`, `Tower`, `Tower 1x2`, `Guard Tower 1x2`, `Wizard Tower 1x2`, `Cloaktower 2x2` |
| **Farming** | `Farm 1 2x2`, `Farm 2 1x2`, `Farm 3 1x2`, `Barn 1 2x2`, `Barn 2 1x2`, `Barn 3 1x2`, `Field 1 2x2`, `Field 2 2x2`, `Field 3 1x2`, `Field`, `Orchard`, `Windmill 2x2`, `Garden 1`, `Garden 2` |
| **Sacred** | `Temple Good 3x2`, `Good Temple 3x3`, `Temple Neutral 2x2`, `Neutral Temple 2x2`, `Temple Evil 3x2`, `Evil Temple 2x3`, `Shrine 1`, `Shrine 2` |
| **Burial** | `Graves 1`–`Graves 5`, `Mausoleum 1`, `Mausoleum 2` |
| **Water** | `Ship Docked 1 2x2`, `Ship Docked 2 2x2`, `Ship Floating 1x2`, `Footbridge` |
| **Conflict** | `Warzone 1x2`, `Warzone 1`, `Warzone 2`, `Ruined Cart` |
| **Landmark** | `Well`, `Menhir`, `Crystal`, `Tree`, `Tree Hollow`, `Dragon Skeleton 1x2`, `Ant Hill`, `Cave`, `Caravan Wagon 1`, `Caravan Wagon 2` |
| **Structural** | `Wall 1 Gate`, `Wall 2 Gate`, `Wall 1 Gate w/ Road`, `Wall 2 Gate w/ Road`, `Ramp`, `Bridge Door` |

`Cave` is the standard hand-off to a dungeon area. The `w/ Road` gate variants exist so a road
crosser passes cleanly through a wall — use those rather than fighting the solver.

## Building one

1. `create_area(width: "24", height: "24", tileset: "ttr01", defaultTerrain: "grass")`.
2. Lay a `road` crosser across the area first. Everything else hangs off it.
3. Place the settlement groups along the road. A village is typically 4–8 building groups; a
   farmstead 2–3 plus fields.
4. Add `trees` terrain in blocks at the edges to frame the space, and `water` with a `Footbridge`
   or ship group if the plot wants a shore.
5. Vary `Tile_Height` on a few tiles for rolling ground — this is the one exterior family where
   elevation is normal. Keep changes gentle and check walkability afterwards.
6. Dress lightly: **~4.5 placeables per 100 tiles**, so roughly 25 objects on a 24×24. Carts,
   barrels, crates near buildings; almost nothing in open fields.
7. Ambience: `DayNightCycle` on, `SkyBox` set. See `area-ambience`.
8. `verify_area` + `check_area_connectivity`.

## Pitfalls

- **Don't over-dress.** Rural is the sparsest content biome measured. Buildings are groups; adding
  placeable clutter to fake density makes it look like a junkyard.
- **Use the `w/ Road` gate groups** when a road meets a wall, or the crosser solver will leave a
  seam.
- **Elevation needs verification.** Raising tiles moves the walkmesh. After any `Tile_Height`
  change, re-check that placed objects still sit on the ground — see `area-connections` for the
  height-verification method.
- **Winter is not a reskin.** `tts01` areas are half the size and eight times as dense as their
  summer equivalents in the corpus. If you switch tileset, re-tune the numbers.

## Group names: use the display name

`paint_group` matches the tileset's **display** names, not the raw identifiers in the
`.set` file. The tables above list groups as the `.set` names them; the tool wants the spaced
form — `Stone Room 1 1x2`, not `StoneRoom01_1x2`.

Call `paint_group` with a deliberately wrong name to have it print every valid group for that
tileset, then copy the name exactly:

```
paint_group(area: "...", feature: "?", x: "0", y: "0")
```

Two further things the corpus build surfaced:

- **Crosser and corner mismatch warnings are real.** A group placed against a different terrain
  reports e.g. `corner mismatch (dirt vs grass)` — a visible seam. Either place a matching
  transition tile or accept the seam knowingly.
- **Interior room groups are mostly wall.** A `tic01` room tile reports 17-35% walkable; that is
  normal for interiors and is why hand-built castle interiors are only ~30 tiles.

