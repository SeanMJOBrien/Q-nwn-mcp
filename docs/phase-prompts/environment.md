---
phase: environment
profile: areas
reads: Plot, Areas
writes: Environment
---
# Phase 3: Environment

You dress each area with objects, sounds and map notes so it looks like the place the plot describes.

## Steps

1. `phase_check(phase: "environment", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Plot,Areas")`.
3. For each area:
   1. `visualize_area(area: "darkforest")`. Read the map, the `zones`, the `features` and the transition objects.
   2. `get_area_placeables(area: "darkforest")`. Do not place a tag that is already there.
   3. For each room or clearing, get free positions: `adventure_find_walkable(area: "darkforest", region: "20,20,60,60", count: "6", clearRadius: "1")`. The region is `x1,y1,x2,y2` in metres; tile (col,row) covers x = col*10 to col*10+10, y = row*10 to row*10+10.
   4. Place 3 to 6 objects per room: `place_placeable(area: "darkforest", blueprint: "plc_campfr", x: "35", y: "42", faceTowardX: "40", faceTowardY: "40")`. Find blueprints with `list_blueprints(type: "utp", pattern: "chest")`.
   5. One area sound at the centre: `place_sound(area: "darkforest", blueprint: "songbirdchirps", x: "80", y: "80")`.
   6. One map note per landmark and per exit: `place_waypoint(area: "darkforest", tag: "wp_oldmill", name: "Old Mill", x: "55", y: "70", mapNote: "Old Mill", mapNoteEnabled: true)`.
4. `write_story_section(section: "Environment", text: "...")`, then `phase_check(phase: "environment", step: "end")`.

## Objects by theme (examples; search for more)

| Theme | Blueprints |
|---|---|
| Inn, house | plc_table, plc_chair, plc_bed, plc_barrel, plc_bookshelf, plc_throwrug |
| Camp, forest | plc_campfr, plc_box1, plc_barrel |
| Dungeon, crypt | search `list_blueprints` for: tomb, sarcophagus, bones, rubble, statue |
| Village | search for: well, cart, haystack, bench, sign |
| Containers (any theme) | plc_chest1, plc_chest2, plc_box1, plc_barrel |

## Sounds by theme

| Theme | Sound blueprint |
|---|---|
| Forest day / night | songbirdchirps / cricketsloop |
| Cave, dungeon | cavedrips |
| Crypt | cryptmoans |
| Inn | taverngroup |
| Village | animalcriesday |
| Coast | seasurfsmall |

## Rules

- Never pass `z`. The tool takes the height from the ground and reports it.
- If a placement is refused as not walkable or too close, take the next position from `adventure_find_walkable`. Do not retry the same spot.
- Keep exits clear: nothing within 3 m of a transition.
- Put related objects together (table with chairs, fire with seats), 1 to 2 m apart.
- Place at least one container (chest, crate or barrel) in every area that has a fight or a secret. Later phases put loot in them.
- No wall torches, banners or other objects that hang on a wall.
- Every room or clearing gets at least one object.

## Format of the section

```
### <Area name> (`resref`)
**Placeables:** plc_table (tag) at (35, 42); ...
**Containers:** plc_chest1 (tag) at (61, 44)
**Sounds:** songbirdchirps at (80, 80)
**Waypoints:** wp_oldmill "Old Mill" at (55, 70)
```
