---
name: area-castle
description: Build Castle Interior (tic01) and Castle Exterior Rural (tno01) areas — keeps, halls, jails, baileys and gatehouses, calibrated against 613 hand-built castle areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Castle areas — interior and exterior

Two tilesets that pair: `tic01` (**Castle Interior**) for the keep, and `tno01`
(**Castle Exterior, Rural**) for the walls, bailey and approach.

## Measured norms

| Property | Castle Interior (`tic01`, n=546) | Castle Exterior (`tno01`, n=67) |
|---|---|---|
| Size | **6×6** (30 tiles) | **24×21** (~512 tiles) |
| Unique tile IDs | 12 | **80** |
| Tile variety | **43%** | 28% |
| Uses elevation | **0%** | **34%** |
| Placeables | 22 per area, **73 per 100 tiles** | 21 per area, **5.4 per 100 tiles** |
| Doors | **4** | 5 |
| Triggers | 0 | 1 |
| Waypoints | 2 | 5 |
| Static creatures | 1 | **22** |

Two very different jobs.

**Castle Interior is small, dense and door-heavy** — 30 tiles, 73 placeables per 100 tiles, 4
doors. A keep is a sequence of rooms, each behind a door, each full of furniture. It has the
highest placeable density of any interior in the corpus.

**Castle Exterior is the one biome with a large static creature population** — a median of 22.
Garrisons are set-pieces: the builder wants those guards exactly where they were placed, not
spawned. If you are building a defended castle, place the defenders.

## Castle Interior (`tic01`)

Room groups follow the same *room + matching door* pattern as city interiors:

| Room type | Room groups | Doors |
|---|---|---|
| Storage | `StorageRoom`, `StorageRoom01_1x2`, `StorageRoom02_1x2` | `DoorStorage01`, `DoorStorage02` |
| Bedroom (rich) | `Bedroom`, `Bedroom01_1x2`, `Bedroom02_1x2` | `DoorRich01`, `DoorRich02` |
| Library | `LibraryRoom`, `LibraryRoom01_1x2`, `LibraryRoom02_1x2` | `DoorLibrary01`, `DoorLibrary02` |
| **Jail** | `JailRoom`, `JailRoom01_1x2`, `JailRoom02_1x2` | `DoorJail01`, `DoorJail02` |
| Stone hall | `StoneRoom`, `StoneRoom01_1x2`, `StoneRoom02_1x2` | `DoorStone01`, `DoorStone02` |

Structural: `Corridor`, `CorridorExit`, `CorridorExitBig`, `Doorway`, `Wall`, `StairsUp`,
`StairsDown`.

**Terrain vocabulary:** `Storage`, `Rich`, `Library`, `Jail`, `Stone`, `Corridor`, `Wall`,
`Doorway`. Note these are *terrain* names — you paint room character, then place the matching door.

Build order: corridors first as the spine, then rooms off them, then the matching doors. A throne
room is a `StoneRoom` with the big corridor exit; a dungeon cell block is `JailRoom` + `DoorJail01`.

## Castle Exterior (`tno01`)

80 unique tiles in the median area — the richest exterior tile mix in the corpus, because curtain
walls, towers and gatehouses all need their own pieces. 34% use elevation: castles sit on raised
ground and the tileset expects it.

Use it for the approach, the gatehouse, the bailey and the wall walk. Pair each with a `tic01`
interior behind a door.

## Building a keep sequence

1. **Approach** — `tno01`, 24×21. The gatehouse, the outer wall, the garrison. Place the static
   defenders; this is where the median of 22 comes from.
2. **Bailey** — `tno01`, similar size. Courtyard between outer wall and keep.
3. **Keep interior** — `tic01`, 6×6. `Corridor` spine, 3–4 rooms off it, matching doors.
4. **Throne / objective room** — `tic01`, 6×6 or smaller, `StoneRoom` with a `CorridorExitBig`.
5. Connect interior↔exterior with **doors**, not portals — a castle has literal doors and the
   corpus uses them (4–5 per area). See `area-connections`.
6. Interior ambience: `IsNight = 1`, `FogClipDist ≤ 45`. Exterior: `DayNightCycle` on, `SkyBox`.
7. Dress interiors heavily (**~73 per 100 tiles**, so ~22 objects in a 30-tile keep room set) and
   exteriors lightly (**~5 per 100 tiles**).

## Pitfalls

- **Don't build a big keep interior.** 30 tiles is the median. Rooms behind doors, not one hall.
- **Don't leave the bailey empty.** Castle exterior is the static-garrison biome; an undefended
  castle reads as abandoned, which is fine only if that is the story.
- **Match the door group to the room terrain.** `DoorJail01` on a library is visibly wrong.
- **Elevation on the exterior needs re-verification.** 34% of castle exteriors vary `Tile_Height`;
  after any change, re-check that transitions and placeables still sit on the walkmesh
  (`area-connections` has the method).

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

