---
name: nwn-object-placement
description: Use when placing, moving, orienting or re-heighting objects in an area — props, furniture, camps, creatures, waypoints, doors — or when something is buried, floating, facing the wrong way, or "blocked by walkability/collision". Trigger on "place a table with chairs", "build a camp", "face the NPC toward…", "put this on the table", "the object is underground/floating", "move this group", "fix heights", "where is open ground", or any use of place_creature/place_placeable/place_waypoint/place_door/move_object/bulk_move_objects/fix_object_heights/probe_ground/adventure_find_walkable.
---

# Placing objects correctly

Every rule here was verified against real, human-built areas — see `docs/object-placement-and-tilesets.md` for the evidence.
Tile/orientation/height background is in the `nwn-tileset-conventions` skill.

## The six rules

1. **Z comes from the walkmesh, not from you.** Every `place_*` sets Z to the exact ground height (mesh height + node offset +
   `Tile_Height × Transition`). The `z` parameter is only a fallback when no walkmesh exists. **Ground is not z = 0**: raised tiles,
   and tilesets whose flat ground sits at +1 / +5 (ttu01, ttz01, trm02, tno01 …) are normal. Never "fix" a non-zero Z by hand.
   The response reports the **placed** z.
2. **Probe before you guess.** `probe_ground(area, x, y)` → walkable?, surface, `groundZ`, `heightStep`, the tile, and whether the
   spot passes the placement check. Cheap and read-only: use it for any doubtful position and to pick a prop's height.
3. **Face with `faceTowardX/Y`, not with raw numbers.** The same `bearing` means different directions per object type (rule 4).
4. **`bearing` is not one convention.**
   * `place_creature` / `place_waypoint`: **compass** degrees — 0 = north, 90 = east, 180 = south, 270 = west (clockwise).
   * `place_placeable` / `place_door`: **raw GFF Bearing**, counter-clockwise, and the model's **front faces SOUTH at 0**
     (east at 90, north at 180). A placeable's front compass direction is `180 − bearing`. The response shows `frontFacesCompass`.
   * They agree only at 90 and 270. If you must compute: chair at `(cx, cy)` facing a table at `(tx, ty)` →
     `bearing = atan2(ty − cy, tx − cx) + 90°` (that is exactly what `faceTowardX/Y` does).
5. **Real designers are less strict than the defaults.** Only 57 % of real props have 1 m of walkable clearance (74 % at 0.5 m) and 34 %
   sit within 1 m of another prop. So: `walkBuffer: 0.5` (or 0) for furniture against walls, `collisionRadius: 0.3–0.5` for
   chairs at a table, keep the defaults for creatures and anything a player must walk past.
6. **Height above the ground is `zOffset`.** An item on a table is `zOffset: 0.8` (check `probe_ground` for the floor first);
   a hanging lantern is a larger offset. Without it everything sits on the floor.

## Recipes

**Furnish a room.** `visualize_area` (walkable zones, existing objects) → place the anchor (table) → place each chair with
`faceTowardX/Y` = the table, `collisionRadius: 0.4`, `walkBuffer: 0.5` → place table items with `zOffset`.

**Build a camp / a ring of props.** `adventure_find_walkable` with `clearRadius` = the camp radius (e.g. `6`) → it returns spots whose
whole `(2r+1) × (2r+1)` m footprint is ≥ 97 % walkable, nearest first, each with exact Z → place the fire in the middle, tents and logs
around it, every one facing the fire. Do **not** use tile centres: `col*10+5, row*10+5` can be non-walkable on decorated tiles.

**NPC placement.** Choose the spot with `probe_ground`/`adventure_find_walkable`, then `faceTowardX/Y` toward where the player arrives
(door, path, the counter's open side). Creatures keep the 1 m walkable buffer and 0.75 m collision radius.

**Entrance waypoints.** `place_waypoint` with `faceTowardX/Y` set to the middle of the area (or a compass `bearing`: door on the north
edge → 180, south → 0, east → 270, west → 90).

**Move things.** `move_object` / `bulk_move_objects` keep each object's **height above the ground** when you do not pass `z`
(`followGround`, default true), so props on a table stay on the table and objects do not sink when moved to higher ground.
Pass `followGround: false` only if you really want Z untouched. `offsetZ` adds on top.

**Heights look wrong.** `fix_object_heights(area, dryRun: true)` first — it lists what would change (up to 40 samples). It also resets
deliberately raised props (about 1 % of objects in correct areas), so use `onlyBuried: true` to only raise objects that are below the
ground, and `tolerance` to ignore small differences. Run it after any `Tile_Height` change or after editing positions by hand.

**Doors that belong to a tile.** Position = tile centre + the `.set` door `(x, y)` rotated counter-clockwise by `Tile_Orientation`;
`bearing = (doorOrientation + Tile_Orientation × 90) % 360` (raw GFF degrees; a door looks the same turned 180°). `place_door` does not
block on walkability — doors sit at tile boundaries.

## Tool parameter cheat-sheet

| Tool | Parameters that matter here |
|---|---|
| `probe_ground` | `area`, `x`, `y`, `buffer` (clearance for the verdict, default 1) |
| `place_creature` | `bearing` (compass), `faceTowardX/Y`, `walkBuffer`, `collisionRadius` (0.75) |
| `place_placeable` | `bearing` (raw GFF CCW), `faceTowardX/Y`, `zOffset`, `collisionRadius` (1.0), `walkBuffer` |
| `place_waypoint` | `bearing` (compass), `faceTowardX/Y`, `walkBuffer` |
| `place_door` | `bearing` (raw GFF CCW) |
| `move_object` | `x`, `y`, optional `z`, `followGround` |
| `bulk_move_objects` | `offsetX/Y/Z`, `followGround` (default true) |
| `fix_object_heights` | `dryRun`, `tolerance`, `onlyBuried` |
| `adventure_find_walkable` | `region` (`north`/`NE`/… or `'x1,y1,x2,y2'`), `count` (max 10), `clearRadius` (footprint search), `avoidEdges` |

`faceTowardX` and `faceTowardY` must be given together and must differ from the object's own position.

## Pitfalls

- **"Placement blocked" is information, not an error to bypass.** Read the reason: not walkable (move it — use `probe_ground`), within
  the buffer of a wall (lower `walkBuffer` only if a prop *should* hug the wall), or too close to another object (lower
  `collisionRadius` only for intentional groupings).
- **Props do not snap to the ground at runtime; creatures do.** A placeable renders at exactly its stored Z, so a wrong Z buries it while
  a creature at the same coordinates looks fine. After bulk edits run `fix_object_heights` (dry run first).
- **Do not estimate Z from tile height arithmetic.** The step per `Tile_Height` level is the tileset's `Transition` (5 for most
  outdoor sets, 4 for tcn01, 2 for tno01) and flat ground has a per-tileset offset. `probe_ground` already includes both.
- **Older saved heights may be wrong.** Versions before 2026-10-02 ignored the walkmesh node offset (57 % of walkmeshes have one: interiors by
  −1.5 m) and used a flat 5 m per level. `fix_object_heights` repairs those.
- **Tile coordinates are row-major from the south-west.** World position = tile × 10; there is no flipped Y.
- **Placed instances are snapshots.** Editing a blueprint later changes nothing already placed; edit the instance (`modify_gff_field`).
