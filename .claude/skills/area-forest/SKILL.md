---
name: area-forest
description: Build a Forest area (ttf01/ttf02) — sizing, terrain painting, feature groups, and object density, calibrated against 531 hand-built forest areas.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Forest areas

Tileset `ttf01` (**Forest**), `ttf02` (Forest 2 — same vocabulary, richer tile catalogue: 58 unique
tiles in the median area against ttf01's 15).

## Measured norms

Medians from 507 `ttf01` areas across the corpus in `~/git`.

| Property | Value | What it means |
|---|---|---|
| Size | **32×32** (1024 tiles) | The largest biome in the corpus. Forests are maps, not rooms. |
| Unique tile IDs | **15** | |
| Tile variety | **1%** | The defining statistic — see below. |
| Uses elevation | **1%** | Keep `Tile_Height` at 0 throughout. |
| Placeables | 33 per area, **58 per 100 tiles** | Dense dressing on a huge canvas. |
| Doors | **0** | Forests connect by trigger or portal, not doors. |
| Triggers | 2 | |
| Waypoints | 4 | |

**Forest is vast and built from very few pieces.** 1024 tiles drawn from 15 distinct tile IDs is
the single most distinctive shape in the survey. Do not "add variety" to a forest — repetition
*is* the forest. Variety comes from the feature groups you drop into it and from placeable
dressing, never from the tile mix.

## Terrain and crossers

- **Terrain:** `forest` (default), `cliff`, `pit`
- **Crossers:** `road`, `stream`, `bridge`, `wall`
- **Valid adjacencies:** `cliff ↔ forest`, `cliff ↔ pit`, `forest ↔ pit`

There is no grass terrain here — a clearing is forest tiles with the canopy groups left off, not a
different terrain. `cliff` is what gives a forest edges; use it to close the map rather than
relying on the area boundary.

Run a `road` crosser through the area if the plot involves travel: it reads instantly as "the way
through" and gives the player a spine to navigate by. A `stream` with one or two `bridge` crossings
is the cheapest way to divide a forest into zones without walls.

## Feature groups

Drop 2–5 of these into an otherwise uniform canopy. They are the content.

| Group | Size | Use for |
|---|---|---|
| `Grove 3x3` | 3×3 | Set-piece clearing — druid circle, ritual site, boss arena |
| `Ruin 1 2x2`, `Ruin 2 1x2`, `Ruin` | 2×2 / 2×1 / 1×1 | Old structures, quest sites |
| `Temple 3x2` | 2×3 | A major objective |
| `Camp 1 2x2`, `Camp 2 1x2`, `Camp` | varies | Bandit/hunter camps — the standard hostile encounter site |
| `Shack 1 2x2`, `Shack 2 1x2`, `Lodge 2x2` | 2×2 / 2×1 | Hermits, woodsmen, safe houses |
| `Graveyard 1x2`, `Graveyard` | 2×1 / 1×1 | Undead encounters |
| `Webbed Forest`, `Webbed Corner` | 1×1 | Spider territory — telegraphs the encounter before it triggers |
| `Big Tree`, `Tower` | 1×1 | Landmarks for navigation |
| `Exit 1 2x3`, `Exit 2 2x2`, `Exit` | varies | **Where area transitions belong** |
| `Meeting Area 1x2` | 2×1 | Dialogue set-pieces |
| `Stream Bridge 1/2`, `Bridge Door 1` | 1×1 | Stream crossings |
| `Wall Gate 1/2` | 1×1 | Gated forest walls |

`Chessboard` and `Portal` are novelty groups — skip unless the plot calls for them.

## Building one

1. `create_area(width: "32", height: "32", tileset: "ttf01", defaultTerrain: "forest")` — or 24×24
   for a smaller transit forest. Below 16×16 a forest stops reading as one; use a Rural area instead.
2. Paint a `road` crosser end to end, or a `stream` with 1–2 bridges, to establish a spine.
3. `paint_group` 2–5 feature groups from the table, spaced well apart. Use `adventure_list_features`
   afterwards to confirm they landed.
4. Add `cliff` terrain along one or two edges to close the map.
5. Dress to **~58 placeables per 100 tiles** — for 1024 tiles that is roughly 590 objects, which is
   a lot. In practice: cluster dressing around the feature groups and along the road, and leave
   deep canopy sparse. Uniform scatter across 1024 tiles both looks wrong and costs frame rate.
6. Ambience: see `area-ambience`. Exterior, so `DayNightCycle` on and a `SkyBox`.
7. Verify with `verify_area` and `check_area_connectivity` — a `cliff`/`pit` band can silently
   isolate a zone.

## Pitfalls

- **Don't scatter placeables uniformly.** The density figure is an area-wide average, not a
  per-tile instruction. Clustered dressing with empty canopy between is what the corpus actually shows.
- **Don't use doors.** 0 doors is the corpus median for forests. Connect via `Exit` groups plus a
  trigger volume or light-shaft portal — see `area-connections`.
- **Don't raise tiles.** 1% elevation adoption. `pit` and `cliff` terrain give you verticality
  without touching `Tile_Height`.
- **Spider webs are a promise.** `Webbed Forest` tiles with no spiders behind them reads as an
  unfinished area.

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

