---
name: area-dungeon
description: Build Dungeon, Mines and Caverns, Crypt or Sewers areas (tde01/tdm01/tdc01/tds01) — the shared small-and-varied dungeon shape, calibrated against 1,269 hand-built areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Dungeon areas — Dungeon, Mines, Crypt, Sewers

Four tilesets sharing one structural vocabulary and one shape:

| Tileset | Name | n | Size | Tiles | Unique | Variety | Placeables/100t | Doors |
|---|---|---|---|---|---|---|---|---|
| `tdm01` | **Mines and Caverns** | 747 | 10×11 | 112 | 30 | 27% | 23 | 1 |
| `tdc01` | **Crypt** | 253 | 9×10 | 90 | 30 | 29% | 32 | 3 |
| `tde01` | **Dungeon** | 167 | 9×10 | 81 | 28 | 31% | 23 | 3 |
| `tds01` | **Sewers** | 102 | 16×16 | 256 | 52 | 26% | 3.1 | 3 |

**The dungeon shape is small and highly varied** — roughly 10×10, ~30 distinct tile IDs, a
variety ratio of 26–31%. This is the exact inverse of the forest (32×32, 15 tiles, 1%). A dungeon
that is 24×24 and built from 12 tile types is not a dungeon; it is a cave-textured field.

**Elevation is ~0–1% across all four.** Verticality comes from `Pit`/`Chasm` terrain and the
stairs/platform groups, never from `Tile_Height`.

Sewers are the outlier: twice the size, half the tile density of dressing. Long tunnels, little furniture.

## Shared vocabulary

All four use the same group skeleton — learn it once:

| Purpose | Groups |
|---|---|
| **Terrain** | `Floor`, `Wall`, `Corridor`, `Doorway`, plus a hazard: `Pit` (crypt/sewer/dungeon), `Water` (mines), `Lava` (dungeon), `Chasym` |
| **Vertical** | `StairsUp`, `StairsDown`, `StairsUp_2x2`, `StairsDown_2x2` |
| **Platforms** | `Platform01_2x2`–`Platform05_1x2` |
| **Structure** | `Pillar01`, `Pillar02`, `Pillar03`, `Pillar_1x2`, `WallSection01_1x2`, `WallSection02_1x2` |
| **Doors** | `BigDoor01`–`BigDoor04`, `FenceDoor01`, `FenceDoor02`, `BridgeDoor01`, `Door_Trans` |
| **Crossing** | `Bridge`, `Fence` |
| **Reward** | `Treasure01`, `Treasure02` |
| **Exits** | `Exit01`, `Exit02`, `Exit03` |

Tileset-specific highlights:
- **Mines** (`tdm01`): `Tracks` crosser (mine cart rails), `IceColumn`, `CrystalCasket01`,
  `Platform01`–`05` — the most vertical-feeling of the four.
- **Crypt** (`tdc01`): `MassGrave`, `MidwallDoorway`.
- **Dungeon** (`tde01`): `Lava` terrain and `EnergySource` — the elemental/infernal flavour.
- **Sewers** (`tds01`): `Camp`, `CampWall` — sewers in this corpus are frequently somebody's hideout.

## Building one

1. `create_area(width: "10", height: "11", tileset: "tdm01")` — pick the tileset for flavour, keep
   the size. Do not exceed ~12×12 unless building sewers.
2. Lay `Corridor` terrain as the spine, then open `Floor` chambers off it. A dungeon is a graph of
   rooms joined by corridors; draw that graph before painting.
3. Add a hazard band — `Pit`, `Water`, `Chasym` or `Lava` — with a `Bridge` and a `BridgeDoor01`
   as the chokepoint. This is the standard dungeon set-piece and where the tile variety comes from.
4. Place `StairsDown`/`StairsUp` where the dungeon continues to another area, and `Exit01`/`Exit02`
   where it reaches the surface.
5. Put `Treasure01`/`Treasure02` groups at dead ends — reward exploration, not the critical path.
6. `Pillar*` and `WallSection*` break up large chambers so they do not read as boxes.
7. Dress to **~23–32 placeables per 100 tiles** (≈25–35 objects in a 100-tile dungeon). Rubble,
   bones, crates, braziers. Sewers are the exception at ~3.
8. Ambience: interior, so `IsNight = 1`, `FogClipDist ≤ 45`, and a dungeon ambient loop. See
   `area-ambience`.
9. `verify_area` and `check_area_connectivity` — hazard terrain is the most common cause of an
   unreachable zone.

## Encounters

Dungeons are where the encounter rules bite. See `adventure-challenges` for the EL system, but
note the spatial part here:

- Corridors are chokepoints — good for a lone tough sentry, bad for a ranged party fight.
- Chambers are where groups belong. Size the group to the chamber, not to the area.
- The hazard bridge is the classic ambush point: hostiles on the far side, player committed.
- Keep hostiles ≥10 tiles from the entry stairs so the player can orient.

## Pitfalls

- **Don't build big.** ~100 tiles. Four dungeon areas of 10×10 beat one of 20×20, and give you
  three more places to put a door.
- **Don't under-vary the tiles.** 26–31% variety is the signature. If `visualize_area` reports 10
  unique tiles in a 100-tile dungeon, add pillars, platforms and wall sections.
- **Don't raise tiles.** Use `Pit`/`Chasym` terrain and the stairs groups.
- **Treasure at dead ends, not on the path.**

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

