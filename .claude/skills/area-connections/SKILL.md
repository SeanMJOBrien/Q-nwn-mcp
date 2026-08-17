---
name: area-connections
description: Connect areas to each other — doors first, trigger volumes second, light-shaft portals last. Includes LinkedTo wiring, trigger geometry rules, and the walkmesh height verification that keeps transitions reachable.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Connecting areas

## What real modules do

Measured across 12,507 hand-built areas in `~/git`:

| Connection style | Areas | Share |
|---|---|---|
| **Doors only** | 6,144 | **79%** |
| Triggers only | 984 | 13% |
| Both | 688 | 9% |

38,281 doors against 10,629 triggers — and of those triggers only **475 are `Type 2`** (area
transition). The rest are traps (7,080) and generic script volumes (3,074).

**Doors are how areas connect.** Trigger volumes are a distant second, used where there is no wall
to hang a door on. Free-standing light-shaft portals are a fallback, not a default.

## The order of preference

### 1. Doors — the default

Use whenever the two areas meet at a wall, gate, stair or building face. Every interior tileset
ships matching door groups (`DoorInn01`, `DoorJail01`, `BigDoor01`…) — paint the door group into
the tile, then place the door.

**A door-to-door transition needs no script.** Set `LinkedTo` on each door to the *tag* of its
partner and `LinkedToFlags` to the door kind. The engine does the rest. Attaching an OnUsed script
to a linked door **breaks** the built-in transition — this is the most common way to make a door
that visibly opens and does nothing.

Stock door blueprints, by corpus frequency — use these rather than inventing:

| Blueprint | Uses | Fits |
|---|---|---|
| `door_normal001` | 14,311 | the default for almost everything |
| `door_oth002` | 3,924 | |
| `nw_door_normal` | 3,707 | base-game generic |
| `x3_door_oth001` | 1,031 | |
| `nw_door_fancy` | 989 | keeps, temples, feature rooms |
| `door_001`, `door_fancy001` | 716 / 665 | |
| `nw_door_ttr_11`, `nw_door_ttr_29` | 581 / 394 | Rural — tileset-matched |
| `x3_door_stn002` | 492 | stone/dungeon |
| `nw_door_jeweled`, `nw_door_grate` | 474 / 469 | treasure rooms, cells |

Verify each with `verify_door` after linking.

### 2. Trigger volumes — where there is no wall

Use for open terrain: the edge of a forest, a road leaving a rural area, a desert pass.

- **Geometry: median 5 vertices, minimum 3.** A trigger with fewer than 3 verts is invisible to
  both the engine and the toolset — it silently never fires.
- Set `Type` to 2 for an area transition. (Type 1 is a trap, type 0 a script volume.)
- Place it *across* the route, not on it, and make it wide enough that a running player cannot
  clip past a corner.

### 3. Light-shaft portals — last resort

`adventure_create_transition` places a useable `plc_solblue` shaft plus a landing waypoint on both
sides in a single call, guaranteeing the light and waypoint share coordinates. It is reliable and
fully scripted, which is why the generation pipeline has leaned on it — but it is not what
hand-built modules look like. Reserve it for:

- open terrain where a trigger would be ambiguous,
- a magical transition that *should* look magical,
- cases where door linking has already failed verification.

Tag limit is **11 characters** (resrefs become `a_at_<tag>` / `a_rt_<tag>`, max 16). Call it once
per pair — it builds both directions.

## Transition height — the check that matters

A transition the player cannot reach is worse than no transition. Creatures are snapped to the
ground by the engine at runtime; **placeables are not** — a placeable renders at exactly its stored
Z. So a light-shaft or door placed below the true ground sinks into the terrain and becomes
unusable, while creatures at the same coordinates look fine.

**Do not trust a single height sample.** A tile's walkable surface is not one height:
`tno01_p01_01` spans 0.00–1.12 m across its own footprint. Sampling only tile centres — where the
surface is usually flat — hides all intra-tile variation and produces a false all-clear.

Verification, in increasing order of confidence:

1. `fix_object_heights` — snaps every placed object in an area to the server's walkmesh model.
   Cheap, run it always.
2. `adventure_find_walkable` at the exact transition coordinates. **Note it refuses areas smaller
   than its edge buffer** — a 2×2 area returns "region too small" for every query.
3. **Ground truth**: parse the tile's `.wok` from the game data and interpolate the walkmesh
   triangle at the object's exact `(x, y)`. This is independent of the server's model and is the
   only check that catches a wrong height model:
   - map tile ID → model via the tileset's `.set` (`[TILEn] Model=`),
   - extract `<model>.wok` with `nwn_resman_extract`,
   - convert world → tile-local coords, apply the tile's `Tile_Orientation` rotation,
   - find the covering triangle, interpolate Z, add `Tile_Height × 5.0`,
   - reject any object whose covering face is a non-walkable surface
     (`Undefined`, `Obscuring`, `Nonwalk`, `Transparent`, `Lava`, `BottomlessPit`, `DeepWater`).

Run this after **any** change to `Tile_Height`, and always in the elevation-heavy biomes —
Rural Winter (79%), Frozen Wastes (64%), Rural (37%), Underdark (36%), Castle Exterior (34%).

## Verification checklist

- `verify_door` on every linked door; `verify_trigger` on every trigger.
- `check_area_connectivity` per area — hazard terrain (`Chasm`, `Pit`, `Water`, `Cliff`) is the
  most common cause of a zone the player can see but not reach.
- Confirm both halves of every transition exist and point at each other. A one-way link strands
  the player.
- Confirm the landing point is walkable **and** that a path exists from it to the rest of the area.

## Pitfalls

- **Never script a linked door.** The `LinkedTo` transition is engine-level; a script on top of it
  breaks it.
- **A trigger with <3 vertices does not exist.**
- **Tag length ≤ 11 characters** for `adventure_create_transition`.
- **Both directions.** Doors need `LinkedTo` set on each side; the portal tool does both for you.
- **Placed instances are GIT snapshots.** Editing a door or trigger *blueprint* after placement
  changes nothing the player sees — edit the placed instance.
