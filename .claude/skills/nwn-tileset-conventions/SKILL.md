---
name: nwn-tileset-conventions
description: Use when reasoning about tile rotation, tile corners/crossers/heights, tile coordinates, walkmeshes or ground heights — painting or solving tiles by hand, computing where a tile's built-in door or feature is in the world, explaining why tiles do not match, or debugging "wrong rotation", "180° off", "object sunk into a hill", "Tile_Height". Trigger on paint_tiles/paint_group/adventure_apply_layout rotation problems, get_tileset_details/analyze_tileset_rules questions, and any maths mixing tile indices, Tile_Orientation, Tile_Height, .set heights or .wok data.
---

# Tileset conventions (verified)

Background for the placement tools. Evidence and numbers: `docs/object-placement-and-tilesets.md`; the conventions are enforced by the
env-gated oracle `src/util/tile-oracle.live.test.ts`. If you change rotation/height maths and that oracle fails, the change is wrong.

## Grid and coordinates

- World metres: **+X east, +Y north**, origin at the **south-west** corner; a tile is **10 × 10 m**.
- `Tile_List` is **row-major from the south-west**: `index = tileY × Width + tileX`; tile centre `(tileX×10+5, tileY×10+5)`.
- `paint_group` x,y is the **bottom-left** tile of the group.

## Rotation: counter-clockwise, and the `.set` is already in orientation-0 terms

- `Tile_Orientation = n` rotates the tile **n × 90° counter-clockwise** (seen from above).
  Corner after a quarter turn: TR → TL → BL → BR → TR. Edge: right → top → left → bottom.
- The `.set` corner terrains, corner heights and crossers are **orientation-0 values — never pre-rotate them**. Use
  `getRotatedCorners`, `getRotatedCrossers`, `getRotatedCornerHeights` (all the same permutation) to get a placed tile's world-side values.
- The `.set` `Orientation=` field is the angle the **model** was authored at: a *preference* for the solver (use a tile at its natural
  orientation when several rotations give the same corners). It is not a transform for the corner fields.
- To test whether two neighbours match: east neighbour — `A.TR == B.TL`, `A.BR == B.BL`, crossers `A.right == B.left`; north neighbour —
  `A.TL == B.BL`, `A.TR == B.BR`, crossers `A.top == B.bottom`. Real areas satisfy this **99.99 %** of the time (the clockwise reading: 75 %).
- Tile matching depends only on **corner terrains, corner heights, crossers** (and orientation preference). The `.set`
  `[PRIMARY RULES]`/`[SECONDARY RULES]` are toolset autotiling hints and do not constrain what may be placed — ignore them.
- Door placements of a tile (`[TILEnDOORm]`): world position = tile centre + `(x, y)` rotated **counter-clockwise** by `Tile_Orientation`
  (`n=1: (x,y) → (−y, x)`); `Bearing = (doorOrientation + Tile_Orientation×90) % 360`. Checked on 3,717 real doors.

## Heights

```
ground z = walkmesh z (node offset included) + Tile_Height × Transition(tileset)
```

- **`Transition` is per tileset** (`[GENERAL] Transition=` in the `.set`; `get_tileset_details` reports it as `heightStep`): **5** for most outdoor
  sets (ttr01, tts01, tts02, tti01, ttu01, ttz01, trm02, tms01, tcm02, trs02, tss13), **4** for tcn01, **2** for tno01, 3 for interiors and
  dungeons (which have no height levels). A flat 5 m is wrong on tcn01/tno01: objects there match 3.5 % / 0 % with 5 m and 94 % / 93 %
  with the tileset's own step.
- Neighbouring tiles must agree on shared corners: `Tile_Height(A) + rotatedCornerHeight(A, c) == Tile_Height(B) + rotatedCornerHeight(B, c)`
  (100.00 % of 274,500 real comparisons).
- **Flat ground is not at z = 0** in every tileset (trm02/tno01 +5, ttu01/ttz01 +1, tbw01 ≈ +5.1, tss13 ≈ +1.9). trm02/trs02 ramps span half a level.
- `paint_tiles`, `paint_group` and the solver place **flat** tiles only. If you add elevation: read `Transition`, enforce the corner-height
  agreement above, then run `fix_object_heights` (dry run first) — placeables do not snap to the ground at runtime.

## Walkmeshes

- The walkmesh of a tile is `<Model>.wok` (`Model=` in the `.set`), **not** the `.set`'s `WalkMesh=` field.
- Vertices are tile-local (`[-5, +5]`, +Y north) and **relative to the node `position`** — add it (54 % of walkmeshes have a Z offset;
  interiors −1.5 m, caves −1.6 … −2.2 m). Rotate the *query point* the opposite way (`n=1: (x,y) → (y,−x)`).
- Materials come from `surfacemat.2da` (`Walk` column). With overlapping faces the highest **walkable** face wins.
- Do not hand-roll this: `probe_ground` (read-only) and `adventure_find_walkable` use `probeAreaPosition` with all of the above.
- Extraction trap: `nwn_resman_extract` extracts **nothing** if any requested file is missing (tcm02 has no `tcm02_b92_02.wok`, trs02 no
  `trs02_m00_00.wok`). Use `ensureWoksExtracted`/`extractSalvaging`, never one big call.

## Which tool answers what

| Question | Tool |
|---|---|
| Terrain types, adjacencies, groups, tile counts | `get_tileset_details` (`detail: summary` or `full`) |
| Is the `.set` data trustworthy (group shapes, flat filler tiles per terrain, matching collisions)? | `analyze_tileset_rules` |
| What is the walkable zone / connectivity of an area? | `visualize_area`, `check_area_connectivity` |
| Is this exact spot walkable and what is its Z? | `probe_ground` |
| Where is a clear footprint? | `adventure_find_walkable` with `clearRadius` |
| Lay out and paint an area | `adventure_generate_layout` → `adventure_apply_layout` (solver); `paint_tiles`/`paint_group` for manual overrides |

## Pitfalls

- **"180° off" tile bugs** are almost always a clockwise/counter-clockwise or pre-rotation slip. Check against the neighbour rules above.
- **Do not guess `Transition`.** Read it from the tileset; a custom tileset may use a fractional value.
- **Do not trust tile-centre arithmetic** for positions on decorated terrain — probe it.
