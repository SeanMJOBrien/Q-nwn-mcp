---
name: area-city-interior
description: Build a City Interior area (tin01/tni01) — inns, taverns, homes and shops as small room-scale areas, calibrated against 7,735 hand-built interiors.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# City Interior areas — inns, taverns, homes, shops

Tileset `tin01` (**City Interior**) and `tni01`/`tni02` (**City Interior 2**). This is the "living
space" tileset: everywhere the player goes indoors that is not a castle or a dungeon.

## Measured norms

`tin01` is the most common tileset in the entire corpus (7,504 areas), but **8,050 of the
interiors surveyed are procedurally generated 2×2 player-housing rooms** from persistent-world
housing systems. Those are excluded below — they are not hand-built design.

| Property | Hand-built value |
|---|---|
| Size | **~3×3**, median **8 tiles**; p10 = 8, p90 = 60 |
| Tile variety | high (64% for `tni01`) |
| Uses elevation | **0%** |
| Placeables | 4 per area for `tni01`; **3.1 per 100 tiles** |
| Doors | **3–5** |
| Waypoints | 4 |
| Static creatures | 1 |

**Interiors are rooms, not maps.** The median hand-built interior is 8 tiles. A 16×16 tavern is
wrong — build an 8-tile common room and put the cellar behind a door.

Interiors are also where the corpus's strongest area-settings conventions live: **97% set
`IsNight`** and **94% set `FogClipDist` ≤ 45**. An interior without those looks like an exterior
with a roof.

## Room groups

Both tilesets share a vocabulary organised as *room type* + *door of that type*:

| Room type | Room groups | Matching door group |
|---|---|---|
| Living room | `Livingroom`, `Livingroom01_1x2`, `Livingroom02_1x2` | `DoorLivingroom01` |
| Kitchen | `KitchenRoom`, `KitchenRoom01_1x2`, `KitchenRoom02_1x2` | `DoorKitchen01` |
| **Inn / tavern** | `InnRoom`, `InnRoom01_1x2`, `InnRoom02_1x2` | `DoorInn01` |
| Shop | `ShopRoom`, `Shop01_1x2`, `ShopRoom02_1x2` | `DoorShop01` |
| Whole dwellings | `HomeLower01_2x2`–`HomeLower05_2x2`, `HomeUpper01_2x2`–`HomeUpper03_2x2` | — |

Structural groups: `Corridor`, `CorridorExit`, `CorridorExitBig`, `Doorway`, `DoorTrans`,
`StairsUp`, `StairsDown`, `Wall`. `tni01` adds `Tent`, `Baracks`, `Temple Evil`.

**Use the matching door group for the room type.** `DoorInn01` into an `InnRoom` is a different
model from `DoorKitchen01`; mismatching them is the interior equivalent of a texture seam.

`HomeLower*`/`HomeUpper*` 2×2 groups are complete dwellings — the fastest way to build a house is
one `HomeLower01_2x2` plus stairs to a `HomeUpper01_2x2`, rather than assembling rooms by hand.

## Building a tavern (the common case)

1. `create_area(width: "4", height: "3", tileset: "tin01")` — 12 tiles is generous for a tavern.
2. Paint an `InnRoom01_1x2` or `InnRoom02_1x2` as the common room.
3. Add `DoorInn01` where the player enters from the street, and link it to the city exterior.
4. If the plot needs a back room or cellar: `Corridor` + `DoorKitchen01` + a `KitchenRoom`, or
   `StairsDown` to a separate small area.
5. Place the barkeep, patrons and the store object. This is one of the few biomes with a nonzero
   static creature median — interiors are where NPCs live.
6. Dress at **~3 placeables per 100 tiles**, but note this is a small area: 3–6 objects. Tables and
   chairs are usually part of the room group already — check `visualize_area` before adding your own.
7. **Ambience is mandatory here.** `IsNight = 1`, `FogClipDist ≤ 45`, interior music and a tavern
   ambient loop. See `area-ambience`.
8. `verify_area` and `verify_door`.

## Pitfalls

- **Don't build big.** p90 is 60 tiles. If you are past 8×8 for an inn, split it.
- **Don't set `DayNightCycle` or a `SkyBox`** on an interior — set `IsNight` instead, so the
  lighting is stable.
- **Don't raise tiles.** 0% elevation adoption across the corpus.
- **Don't duplicate room furniture.** The `*Room` groups ship with their own props baked into the
  tiles.
- **Beware the housing-system inflation.** If you look at raw counts for `tin01` you will conclude
  interiors are 2×2; that is thousands of generated player homes, not design guidance.

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

