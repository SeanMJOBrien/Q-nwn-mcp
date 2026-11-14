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
3. For each location, in order:
   1. `suggest_area_size(biome: "forest", events: "3")` with the location's biome and number of events. Add `shape: "linear"` when Travel is yes. For a house, inn or shop use `biome: "interior"` with `purpose: "inn"` (cabin, home, inn, tavern, shop or hall). Use the width and height it returns.
   2. `adventure_list_features(tileset: "ttf01", style: "forest")`. Choose 3 to 6 group names that fit the location, best first.
   3. `adventure_generate_layout(tileset: "ttf01", width: "16", height: "16", style: "{\"type\":\"forest\",\"rooms\":3,\"preferredFeatures\":[\"...\"]}", transitionCount: "2")`. `transitionCount` = the number of Connections of this location.
   4. `create_area(resref: "darkforest", name: "The Dark Forest", width: "16", height: "16", tileset: "ttf01")`. Resref: lower case, no spaces, at most 16 characters.
   5. `adventure_apply_layout(area: "darkforest", layout: "<the whole result of step 3>")`. If it reports `solverWarnings`, generate again with fewer rooms or `"safeMode":true`.
   6. `place_tile_doors(area: "darkforest")`.
   7. `set_area_properties(area: "darkforest", musicDay: "1", musicNight: "3", musicBattle: "10", ambientSndDay: "33", skyBox: "1", dayNightCycle: true)` with values from the table.
4. For each line in Connections, one call: `adventure_create_transition(areaA: "village", aX: "85", aY: "45", areaB: "darkforest", bX: "15", bY: "15", tag: "vil_for")`. Use the transition points from each layout result. If a point is refused, get one with `adventure_find_walkable(area: "village", count: "3", clearRadius: "2")`.
5. `check_area_connectivity()`: `unreachable` must be empty.
6. `write_story_section(section: "Areas", text: "...")`, then `phase_check(phase: "areas", step: "end")`.

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
- Always pass `preferredFeatures`; without it the area has no buildings or landmarks.

## Format of the section

```
### <Name> (`resref`)
- **Tileset:** ttf01, 16x16, style forest
- **Features:** <group names placed>
- **Transitions:** to `village` at (15, 15), tag vil_for
```
