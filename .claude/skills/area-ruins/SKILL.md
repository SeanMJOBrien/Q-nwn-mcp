---
name: area-ruins
description: Build a Ruins area (tdr01) — collapsed drow/elven cities, plazas, amphitheatres and overgrown gardens, calibrated against 140 hand-built areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Ruins areas

Tileset `tdr01` (**Ruins**). 274 tiles, 36 groups. Fallen architecture — a city that used to be
somewhere, now half-collapsed. Both interior and exterior variants of every feature.

## Measured norms

Medians from 140 areas.

| Property | Value |
|---|---|
| Size | **7×6** (52 tiles) — the smallest exterior-feeling biome measured |
| Unique tile IDs | 17 |
| Tile variety | **48%** — the highest in the corpus |
| Uses elevation | 0% |
| Placeables | 32 per area, **175 per 100 tiles** — **by far the densest biome measured** |
| Doors | 1 |
| Waypoints | 1 |

Ruins are **small and extraordinarily dense**. 175 placeables per 100 tiles is nearly three times
the next biome (Underdark at 60) and fifty times Rural. And 48% tile variety on a 52-tile area
means almost every tile is different from its neighbours.

That combination *is* the aesthetic: rubble everywhere, no two corners alike. A sparse ruin reads
as an unfinished area, not a ruined one.

## Terrain and crossers

- **Terrain:** `Floor`, `Wall`, `Chasm`, `Plaza`, `Alley`, `Corridor`, `Fence`, `Doorway`
- **Crossers:** `Bridge`

`Plaza` and `Alley` are the two character terrains — a grand public space against cramped
back-ways. `Chasm` is where the city has fallen in.

## Feature groups

Note the consistent `Interior*` / `Exterior*` prefixing — this tileset covers both, and mixing
them carelessly is the main way to make a ruin look wrong.

| Purpose | Groups |
|---|---|
| **Grand exterior** | `Amphitheater_2x2`, `ExteriorStage_2x2`, `Mosaic_Plaza_2x2`, `ExteriorFountain`, `ExteriorFountain_1x2`, `ExteriorPool` |
| **Collapsed structure** | `ExteriorRuinedTower_2x2`, `RuinedHouse`, `InteriorRubble`, `ExteriorWalkway_2x2` |
| **Overgrowth** | `ExteriorOvergrownGarden` |
| **Interior** | `InteriorMosaic_2x2`, `InteriorHallDoor`, `SleepingPlatform`, `TentInterior_2x2` |
| **Vertical** | `InteriorStairsUp`, `InteriorStairsDown`, `ExteriorStairsUp`, `ExteriorStairsDown`, `ExteriorStairsUp_2x2`, `ExteriorStairsDown_2x2` |
| **Exits & doors** | `ExteriorExit01`, `ExteriorExit02`, `BridgeDoor01`, `InteriorFenceDoor`, `ExteriorFenceDoor`, `Door_Trans`, `Door_Trans_Exterior` |

`TentInterior_2x2` and `SleepingPlatform` exist because somebody is *living* in the ruin — use
them when the ruin is occupied, which it usually should be.

## Building one

1. `create_area(width: "7", height: "6", tileset: "tdr01")`. Small. If you need a larger ruined
   city, build three or four 7×6 areas and link them — that is what the corpus does.
2. Decide interior or exterior and **stay consistent** with the group prefixes. A single area
   mixing `ExteriorFountain` with `InteriorMosaic_2x2` needs a wall and a `Door_Trans` between them.
3. Paint a `Plaza` block as the centrepiece and `Alley` for the approaches.
4. Drop one grand group — `Amphitheater_2x2`, `ExteriorStage_2x2` or `Mosaic_Plaza_2x2` — as the
   thing this ruin was famous for.
5. Break it with `Chasm` and `ExteriorRuinedTower_2x2` / `RuinedHouse`.
6. **Dress extremely heavily: ~175 placeables per 100 tiles**, so roughly 90 objects on a 52-tile
   area. Rubble, broken columns, roots, scattered stone. This is the single most important step —
   under-dressing is what makes a generated ruin look like a bare floor.
7. Ambience: match interior/exterior choice. See `area-ambience`.
8. `verify_area`, `check_area_connectivity` (chasms isolate), and watch the object count against
   performance.

## Pitfalls

- **Under-dressing is the failure mode.** 175/100 tiles. If you place 20 objects in a ruin you have
  built an empty room with cracked textures.
- **Don't mix Interior and Exterior groups** in the same space without a wall between them.
- **Don't build big.** 52 tiles is the median; the density target becomes unmanageable on a large map.
- **Occupy it.** Ruins in this corpus usually have somebody camped in them — `TentInterior_2x2`,
  `SleepingPlatform`, and a reason for the player to care.

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

