---
name: area-desert
description: Build a Desert area (ttd01) — dunes, chasms, oases, adobe settlements and desert cities, calibrated against 137 hand-built areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Desert areas

Tileset `ttd01` (**Desert**). 212 tiles, 40 groups.

> **Naming trap:** the Desert tileset is `ttd01`. `tde01` is **Dungeon** (lava and stone), despite
> the suggestive letters. Confirm with `get_tileset_details` before building — this pair has been
> mixed up before.

## Measured norms

Medians from 137 areas.

| Property | Value |
|---|---|
| Size | **10×12** (100 tiles) |
| Unique tile IDs | 33 |
| Tile variety | **31%** |
| Uses elevation | 1% |
| Placeables | 24 per area, **24 per 100 tiles** |
| Doors | 1 |
| Triggers | **4** |
| Waypoints | **8** |

Desert behaves structurally like a dungeon — ~100 tiles, ~31% variety — rather than like the other
exteriors. It is an open-air maze of chasms and cliffs, not a field. Note the high trigger and
waypoint counts: deserts in this corpus are heavily scripted, typically for heat, sandstorms and
patrol routes.

## Terrain and crossers

- **Terrain:** `Desert` (default), `Cliff`, `Chasm`
- **Crossers:** `Road`, `Wall`, `Trench`, `Bridge`

`Cliff` and `Chasm` do the same job here that walls do in a dungeon — they define the walkable
route. `Trench` with `TrenchBridge01`/`02` is the desert's chokepoint idiom.

## Feature groups

| Purpose | Groups |
|---|---|
| **Settlement** | `DesertCityBlock_2x2`, `DesertCityBlock_2_2x2`, `AdobeBuilding_1x2`, `AdobeBuilding_2x2`, `Marketplace` |
| **Camps** | `Camp01_2x2`, `Camp02_1x2`, `Camp 2`, `Camp`, `SmallTent`, `CaravanWagon2` |
| **Water** | `Oasis_3x3` |
| **Sacred** | `Temple_3x2`, `NeutralTemple_2x2`, `GoodTemple_3x3`, `EvilTemple_2x3` |
| **Ruins** | `Ruin01_2x2`, `Ruin02_1x2`, `Ruin`, `GiantHead`, `CarvedCorner` |
| **Vertical** | `CliffStairs`, `ChasmStairs` |
| **Crossings** | `TrenchBridge01`, `TrenchBridge02`, `BridgeDoor01`, `WallGate01`, `WallGate02` |
| **Exits** | `Carved_Exit_2x2`, `Exit` |

`Oasis_3x3` is the single most useful group in the set — it is the only reason to stop in a desert,
so it is where you put NPCs, quests and ambushes.

`GiantHead` and `CarvedCorner` are the "lost civilisation" pieces; pair them with `Ruin*` groups.

## Building one

1. `create_area(width: "10", height: "12", tileset: "ttd01", defaultTerrain: "Desert")`.
2. Cut `Cliff` and `Chasm` to define the route — treat this like carving a dungeon, not painting a field.
3. Place **one** `Oasis_3x3` if the area is a destination, and hang the content off it.
4. Add a settlement (`DesertCityBlock_2x2` + `AdobeBuilding_*` + `Marketplace`) or a camp
   (`Camp01_2x2` + `SmallTent` + `CaravanWagon2`), not both.
5. Use `ChasmStairs`/`CliffStairs` to make the vertical readable without touching `Tile_Height`.
6. Dress to **~24 placeables per 100 tiles** — about 24 objects. Bones, rocks, dead scrub, tent
   goods. Keep open sand genuinely open.
7. Ambience: exterior, `DayNightCycle` on, `SkyBox` set, wind ambient. Deserts are also the natural
   place for `ChanceRain = 0` and a hot, bright `SunAmbientColor`. See `area-ambience`.
8. `verify_area` + `check_area_connectivity` — chasms isolate zones.

## Pitfalls

- **Don't confuse `ttd01` with `tde01`.** Desert vs Dungeon.
- **Don't build it like a field.** 31% tile variety means carved terrain, not open sand.
- **One oasis.** Two makes the desert stop being hostile.
- **Watch the trigger count.** 4 is the median because desert areas script environmental effects;
  if you are adding heat or sandstorm scripting, that is normal and expected here.
- **`Tile_Height` stays flat** — 1% adoption. `Cliff` and `Chasm` carry the elevation.

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

