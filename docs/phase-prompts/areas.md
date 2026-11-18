---
phase: areas
profile: areas
specs: area-layout
reads: Module, Plot
writes: Areas
---
# Phase 2: Areas

You build one area per location in the plot and connect them. The tools know the layout rules; you choose the tileset, size, style and features.

## Steps

1. `phase_check(phase: "areas", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Module,Plot")`. List the locations and the Connections.
3. For each location, in order, one call builds it (size, features, layout, area, terrain, tile doors, music):
   `build_area(spec: "{\"resref\":\"darkforest\",\"name\":\"The Dark Forest\",\"tileset\":\"ttf01\",\"connections\":2,\"events\":3}")`.
   Use the location's **Resref** and **Tileset**; `connections` = its number of Connections; add `"travel":true` when Travel is yes, `"purpose":"inn"` for a house, inn or shop (cabin, home, inn, tavern, shop or hall), `"features":[...]` to choose groups from `adventure_list_features`. On an error fix the named field and call it again (an empty area it made is reused). If it reports solver warnings and the area looks wrong: `delete_area`, then build again with `"rooms":2` or `"safeMode":true`.
   By hand instead: `suggest_area_size`, `adventure_generate_layout`, `create_area`, `adventure_apply_layout(area: "darkforest", layoutId: "layout_1")` (`area` is the resref, never the layoutId), `place_tile_doors(area: "darkforest")`, `set_area_properties(area: "darkforest", musicDay: "1")`.
4. For each line in Connections, one call: `adventure_create_transition(areaA: "village", aX: "85", aY: "45", areaB: "darkforest", bX: "15", bY: "15", tag: "vil_for")`. Use the free transition points `get_area_card(area: "village")` shows (build_area keeps them). If a point is refused, get one with `adventure_find_walkable(area: "village", count: "3", clearRadius: "2")`.
5. `set_module_start(area: "village")` with the area where the story opens. It sets the players' start point and removes the empty `_start` area.
6. `check_area_connectivity()`: `unreachable` must be empty.
7. `write_story_section(section: "Areas", text: "...")`, then `phase_check(phase: "areas", step: "end")`. Then `get_progress()`: what is still open, and the next step.

## Style by tileset

| Kind of place | Tileset | style `type` | size `biome` |
|---|---|---|---|
| Forest | `ttf01` | forest | forest |
| Farmland, village | `ttr01` | rural | rural |
| Town streets | `tcn01` | city | city_exterior |
| House, inn, shop | `tin01` | dwelling | interior |
| Dungeon | `tde01` | dungeon | dungeon |
| Crypt | `tdc01` | dungeon | dungeon |
| Mine, cave | `tdm01` | cave | cave |
| Desert | `ttd01` | desert | desert |
| Castle outside | `tno01` | castle | castle_exterior |
| Snow | `tts01` | tundra | frozen |

## Music and sound

| Place | musicDay / musicNight | musicBattle | ambientSndDay | skyBox, dayNightCycle |
|---|---|---|---|---|
| Countryside, forest | 1 / 3 | 34 | 33 forest, 30 open | 1, true |
| Town | 16 / 16 | 10 | 30 | 1, true |
| Dungeon, cave, crypt | 7 / 7 (13 for horror) | 10 | 60 | 0, false |
| House, inn | 7 / 7 | 10 | none | 0, false |

## Rules

- One transition call connects both directions. Never call it twice for the same pair.
- A transition `tag` is unique and at most 11 characters.
- Do not paint tiles by hand and do not set fog amounts.
- `build_area` picks the feature groups (buildings, landmarks) itself: leave `features` out, or give a list of group names from `adventure_list_features`. Size is `width`/`height` (9-32 tiles), or leave it out. By hand, pass `preferredFeatures` in the layout style.

## Format of the section

```
### <Name> (`resref`)
- **Tileset:** ttf01, 16x16, style forest
- **Features:** <group names placed>
- **Transitions:** to `village` at (15, 15), tag vil_for
```
