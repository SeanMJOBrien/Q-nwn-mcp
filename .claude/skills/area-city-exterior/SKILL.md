---
name: area-city-exterior
description: Build a City Exterior area (tcn01) — streets, districts, markets and docks, calibrated against 210 hand-built city areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# City Exterior areas

Tileset `tcn01` (**City Exterior**). 408 tiles, 89 groups — the densest structural vocabulary in
the base game.

## Measured norms

Medians from 210 areas.

| Property | Value |
|---|---|
| Size | **22×21** (~482 tiles) |
| Unique tile IDs | **40** |
| Tile variety | 14% |
| Uses elevation | 23% |
| Placeables | 30 per area, **6.2 per 100 tiles** |
| **Doors** | **11** — by far the highest of any biome |
| Triggers | 3 |
| Waypoints | 7 |
| Static creatures | 1 |

**The defining statistic is doors: a median of 11 per area.** A city is a set of buildings you can
go into, and each of those is a door to an interior area. If your city has two doors it is a stage
set, not a city. Budget the interiors before you build the exterior — see `area-city-interior`.

Placeable density is low (6.2/100 tiles) for the same reason as Rural: the buildings *are* tiles.

This module's `tcn01` corpus is too thin (n=3) to independently confirm the door figure above, but
the same "polished builds are door-heavier than the blanket average" pattern held cleanly on every
other checked tileset, `tno01` (Castle Exterior) included — see `docs/tfn-corpus-survey/areas.md`
if you want the numbers. Treat 11 as a floor, not a ceiling, for a build meant to feel finished.
The same linkage rule applies here as in `area-rural`: every door needs `check_area_connectivity`
to confirm it actually resolves to an interior area — a door to nowhere is worse than no door.

## Terrain and crossers

- **Terrain:** `cobble`, `water`, `building`, `evilcastle`, `goodcastle`
- **Crossers:** `wall`, `stream`, `dock`, `bridge`

`cobble` is the street surface and your default. `building` is the solid block terrain that streets
run between — a city is carved out of `building`, not assembled on `cobble`. `dock` plus `water`
gives a harbour district.

## Feature groups

| Purpose | Groups |
|---|---|
| **Housing (poor)** | `SlumHouse01`, `SlumHouse02`, `SlumHouse_1x2`, `SlumInn01_1x2`, `SlumInn02_1x2`, `SlumMarket01`, `SlumMarket02` |
| **Housing (ordinary)** | `House`, `House01_2x3`, `House02_2x2`, `House03_2x2`, `House04_2x2`, `House05_2x2`, `House06_2x2`, `House07_1x2`, `House08_1x2`, `House09_1x2`, `House10_1x2` |
| **Commerce** | `Market01`, `Market02`, `Market_2x1` |
| **Civic** | `Plaza01`, `Plaza02`, `Plaza_2x2`, `Fountain_1x2`, `RuinPark_1x2` |
| **Sacred** | `GoodTemple_3x3`, `NeutralTemple_2x2` |
| **Military** | `Barracks_2x2`, `WallGate` |

The `Slum*` set against the ordinary `House*` set is how you build districts. A city area that
mixes them at random reads as noise; a city that puts slums on one side of a wall and houses on
the other reads as a place with a history.

## Building one

1. `create_area(width: "22", height: "21", tileset: "tcn01", defaultTerrain: "cobble")`.
2. Block out districts with `building` terrain, then cut streets through as `cobble`. Work
   subtractively — this is the opposite of the forest/rural workflow.
3. Place a `Plaza_2x2` or `Fountain_1x2` as the area's centre of gravity. Cities need a place where
   the player naturally stops.
4. Line the streets with housing groups, keeping districts coherent.
5. Add a `wall` crosser with `WallGate` if the city has a defended quarter or an edge.
6. **Plan the doors.** Every building group the player can enter needs a door linked to an interior
   area. Pick 3–6 that actually open (inn, shop, temple, target house) and leave the rest as
   scenery — but place real doors on the enterable ones and link them properly. See
   `area-connections`.
7. Dress to **~6 placeables per 100 tiles** — about 30 objects: market stalls, barrels, crates,
   signage. Concentrate at the plaza and market.
8. Ambience: exterior, `DayNightCycle` on. City ambient sound is essential — see `area-ambience`.
9. `verify_area`, `check_area_connectivity`, and `verify_door` on every linked door.

## Pitfalls

- **Under-dooring.** The corpus median is 11. This is the one biome where the door count is the
  quality signal.
- **Don't carve streets one tile wide everywhere.** Mix a wide main street with narrow alleys, or
  the whole area reads as a maze.
- **District coherence beats variety.** 40 unique tiles is the median — that is *lots* of variety
  already. Spend it on districts, not on making every building different.
- **Doors need interiors.** A door linked to nothing is worse than a decorative one. If you cannot
  afford the interior area, do not place an openable door.

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

