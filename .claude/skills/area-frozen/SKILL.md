---
name: area-frozen
description: Build a Frozen Wastes area (tti01) or a Rural Winter area (tts01) — ice, snow and the elevation-heavy cold biomes, calibrated against 137 hand-built areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Frozen and winter areas

Two very different cold tilesets:

- `tti01` (**Frozen Wastes**) — a small, sparse, hostile ice tileset. Only 75 tiles and 16 groups,
  the smallest catalogue in the base game.
- `tts01` (**Rural Winter**) — `ttr01` Rural's full farm/village vocabulary with snow terrain.
  Use this for inhabited cold country; see `area-rural` for the group list, which is shared.

## Measured norms

| Property | Frozen Wastes (`tti01`, n=47) | Rural Winter (`tts01`, n=90) |
|---|---|---|
| Size | **8×8** (64 tiles) | **16×16** (256 tiles) |
| Unique tile IDs | 19 | 33 |
| Tile variety | 25% | 19% |
| **Uses elevation** | **64%** | **79%** |
| Placeables | 20 per area, **41 per 100 tiles** | 43 per area, **37 per 100 tiles** |
| Doors | 1 | 2 |
| Waypoints | 4 | **20** |

**Elevation is the defining feature of both** — 64% and 79%, the two highest in the corpus. Snow
and ice country is built on varying `Tile_Height`, unlike almost every other biome. Drifts,
ridges and frozen falls are height changes, not terrain changes.

This makes cold biomes the **highest-risk areas for object placement**: every raised tile moves the
walkmesh beneath anything standing on it. Verify heights after every terrain pass — see
`area-connections`.

## Frozen Wastes (`tti01`) vocabulary

A deliberately small set. Groups: `Pit`, `Floor`, `Cave`, `Ramp`, `Crystal`, `Ice Creator`,
`Drag Skel 1x2`, `Market 1`, `Market 2`, `EvilCastle`, `Evil Entrance`, `Evil Big Door`,
`Evil Small Door`, `Evil Breach`, `Evil Temple`, `Evil Temple 2`, `Neutral Temple`,
`ChessBoard`, `Portal`.

The `Evil*` cluster is the tileset's centrepiece — a fortress in the ice, with its own doors and
breach. Frozen Wastes is built around "there is one terrible thing out here and you are walking to
it". `Cave` and `Ramp` are the connective pieces; `Crystal` and `Drag Skel 1x2` are landmarks.

With only 75 tiles, **do not expect visual variety** — 19 unique tiles in a 64-tile area is already
25% of the catalogue. The bleakness is the point.

## Building a Frozen Wastes area

1. `create_area(width: "8", height: "8", tileset: "tti01")`. Small.
2. Vary `Tile_Height` across most of the map — drifts and ridges. This is expected here.
3. Place `Cave` and `Ramp` where the player enters and leaves.
4. If this is the destination, drop the `EvilCastle` / `Evil Entrance` cluster and make it visible
   from the entry point.
5. Landmark with `Crystal` and `Drag Skel 1x2` so the player can navigate a white field.
6. Dress to **~41 placeables per 100 tiles** — about 26 objects on 64 tiles. Ice shards, bones,
   frozen debris.
7. **Re-verify every object's Z after the height pass.** Non-negotiable in this biome.
8. Ambience: exterior, `DayNightCycle`, `SkyBox`, and `ChanceSnow` > 0 — this is the one biome
   where weather should actually be on. See `area-ambience`.
9. `verify_area` + `check_area_connectivity`.

## Building a Rural Winter area

Follow `area-rural` for the group vocabulary — it is identical — but use these numbers:
16×16, ~37 placeables per 100 tiles (eight times denser than summer Rural), and expect to vary
`Tile_Height`. Set `ChanceSnow`.

## Pitfalls

- **Elevation without verification.** The two cold tilesets have the highest `Tile_Height` usage
  measured and therefore the highest risk of objects ending up buried or floating.
- **Height-transition features (e.g. `tts01`'s `Cave`) are no longer auto-placeable, and that's
  correct.** `adventure_apply_layout`'s feature-group filter now rejects any group containing a
  tile with non-zero corner height (`!tile.flat`), the same exclusion the zone solver already
  applies to its own placements. Before this fix, a real build placed `tts01`'s `Cave` tile
  (`TopLeft`/`TopRightHeight=1`, `BottomLeft`/`BottomRightHeight=0` — a genuine cave-mouth-in-a-
  rise, not flat despite matching "snow" on every corner by name) into a dead-flat snow field,
  because the filter only checked terrain-name equality, never height. Result: a cave floating in
  an open field with a cliff-edge seam on every side but the entrance — reported directly by a
  user testing the build. **If you want a cave entrance or similar height-transition piece, you
  must hand-terrace the surrounding elevated ground yourself** — this pipeline has no automated
  way to do it. Recipe that worked for `tts01`'s `Cave` (tile 244, `TL=1,TR=1,BL=0,BR=0` at
  placement orientation 0 — top edge elevated, bottom/entrance flat):
  1. Get the cave tile's four effective corner heights at its actual placed orientation
     (`get_tileset_details(detail: "full")` for the raw `.set` corners, then apply the same
     rotation the tile is placed at — `getRotatedCorners`'s case 0-3 in `tileset.ts`, verified
     correct against real human-built areas).
  2. For each side that needs elevated ground (behind/beside the entrance, not the entrance
     face itself), find another tile in the tileset's height-graded family (`tts01`'s `aXX`
     series) whose relevant edge, **at some rotation**, produces the exact two corner heights
     your cave edge has. Try all 4 orientations by hand with the same rotation formula — don't
     assume orientation 0 is the only option; the match is very often only reachable at 90/180/270.
  3. `paint_tiles` each match directly (not through `adventure_apply_layout` — it re-solves the
     whole area, see the "not incremental" pitfall in `CLAUDE.md`). Zero constraint-violation
     warnings on a side confirms an exact height+terrain match; a terrain-name-only warning
     (e.g. `snow vs trees`) one tile further out is an acceptable, much smaller residual seam.
  4. This patches a 1-tile collar immediately around the feature, not a fully seamless terrace —
     say so when reporting the fix. A wider apron is genuinely a hand-modeling task better done
     in the toolset than chased further here.
  5. **TODO — extend the collar into a proper cliff-to-trees transition where trees terrain is
     nearby.** The recipe above reaches only for same-terrain elevation tiles (`tts01`'s `aXX`
     snow slope family). `tts01` separately ships ids 39-48 and 247/248, a family mixing `Snow`
     at height 1 with `Trees` at height 0 in the same tile — the tileset's own purpose-built
     piece for exactly this transition, not yet used by this recipe. If trees terrain sits near
     the feature (a common `tts01`/`ttr01` neighbor), extend the collar 1-2 more tiles outward
     on that side using this family instead of dropping straight back to flat terrain. Same
     method: compute the collar tile's already-placed edge, find which of ids 39-48/247/248 (at
     which orientation) reproduces it exactly. See `docs/tileset-proving-grounds/PROGRESS.md`'s
     Area 6 entry for the specific case this was raised against.
- **Don't expect variety from `tti01`.** 75 tiles total. If the area feels repetitive, that is the
  tileset; add placeable landmarks instead of hunting for tiles.
- **Snow needs `ChanceSnow`.** A frozen area with clear weather reads as a mistake.
- **Rural Winter is not summer Rural with a palette swap** — half the size, eight times the dressing.

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

