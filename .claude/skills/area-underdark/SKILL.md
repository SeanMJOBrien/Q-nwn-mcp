---
name: area-underdark
description: Build an Underdark area (ttu01) — drow cities, svirfneblin warrens, illithid lairs and chasm bridges, calibrated against 207 hand-built areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Underdark areas

Tileset `ttu01` (**Underdark**). 303 tiles, 34 groups. This is a *settled* underground tileset —
whole cities of several races — not a cave crawl. For raw caves use `area-dungeon` (`tdm01`).

## Measured norms

Medians from 207 areas.

| Property | Value |
|---|---|
| Size | **12×12** (128 tiles) |
| Unique tile IDs | 32 |
| Tile variety | **30%** |
| **Uses elevation** | **36%** |
| Placeables | 60 per area, **60 per 100 tiles** |
| Doors | 1 |
| Triggers | 1 |
| Waypoints | 3 |

Underdark is unusual on two axes. It is **dense** — 60 placeables per 100 tiles, the second
highest measured — and it is one of only four biomes that routinely varies `Tile_Height` (36%).
Underground cities are built on ledges above chasms, and the tileset expects vertical layering.

Low door count (1) despite being a city: movement is by ramp, stair and bridge within the area,
not through doors.

## Terrain and crossers

- **Terrain:** `Floor`, `Rock`, `Water`, `Chasym`, plus the racial district terrains
  `Drow`, `Svirfneblin`, `Poor`
- **Crossers:** `Wall`, `Stream`, `Bridge`

The racial terrains are the key idea: paint `Drow` and the tiles change character wholesale.
A district is a terrain, not a set of props.

## Feature groups

| Purpose | Groups |
|---|---|
| **Vertical** | `Stairs Down`, `Stairs Up`, `Ramp Up`, `Ramp Down` |
| **Chasm crossing** | `Chasym Bridge Door`, `Water Bridge Door`, `Wall Door` |
| **Drow** | `Drow Building`, `Drow Market`, `Docked Drow Boat` |
| **Illithid** | `Illithid Building`, `Illithid Building2`, `Illithid Market`, `Illithid Grand Lair` |
| **Svirfneblin** | `Svirfneblin Building`, `Svirfneblin Building 2x2` |
| **Duergar / dwarf** | `Dugar Building`, `Dwarf Market` |
| **Beholder** | `Beholder Market`, `Beholder Entrance` |
| **Slavery** | `Slave Trade Post`, `Slave Huts` |
| **Other** | `Temple`, `Tower`, `Rock Formation`, `Cave`, `Dock`, `Docked Longboat`, `Gates` |

`Illithid Grand Lair` and `Beholder Entrance` are boss-lair groups — one per adventure, at most.

## Building one

1. `create_area(width: "12", height: "12", tileset: "ttu01", defaultTerrain: "Rock")`.
2. Cut a `Chasym` band across part of the map — this is the signature Underdark feature and the
   main source of tile variety. Cross it with `Chasym Bridge Door`.
3. Paint one or two racial district terrains (`Drow`, `Svirfneblin`, `Poor`) as coherent blocks.
   Mixing three races in a 12×12 reads as a theme park.
4. Place the matching building and market groups inside their district.
5. Use `Ramp Up`/`Ramp Down` and `Stairs Up`/`Stairs Down` to layer the space vertically, and vary
   `Tile_Height` — this is one of the few biomes where that is normal. **Re-verify object heights
   afterwards** (see `area-connections`).
6. Dress heavily: **~60 placeables per 100 tiles**, so ~75 objects in a 12×12. Fungus, crystal,
   rubble, webbing, market goods.
7. Ambience: interior — `IsNight = 1`, `FogClipDist ≤ 45`. Underdark ambient loop. See `area-ambience`.
8. `verify_area` + `check_area_connectivity`. Chasms isolate zones more often than any other terrain.

## Pitfalls

- **One or two races per area.** The tileset offers six; a single area should read as somebody's
  territory.
- **Elevation demands verification.** 36% of Underdark areas vary tile height. Every raised tile
  moves the walkmesh under anything standing on it.
- **Chasms break connectivity silently.** Always run `check_area_connectivity` after painting one.
- **Don't use it for caves.** Underdark is architecture. A natural cavern is `tdm01` — see
  `area-dungeon`.
- **`Slave Trade Post` / `Slave Huts` carry narrative weight.** Place them because the story is
  about that, not as set dressing.

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

