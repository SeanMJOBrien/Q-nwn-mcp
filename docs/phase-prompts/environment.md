---
phase: environment
profile: dress
reads: Plot, Areas
writes: Environment
---
# Phase 3: Environment

You dress each area with objects, sounds and map notes so it looks like the place the plot describes.

## Steps

1. `phase_check(phase: "environment", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Plot,Areas")`.
3. For each area:
   1. `get_area_card(area: "darkforest")`: size, exits, pins, objects and open ground in a few lines (`visualize_area` for the full map).
   2. `dress_area(area: "darkforest")`: pins every exit and spreads the props that suit the area on open ground (rocks and logs in a forest, a well and hay in a village, furniture indoors). To choose them yourself give real resrefs: `props: "[\"plc_campfr\",\"plc_barrel\",\"plc_chest1\"]"`. `near: "40,52"` gathers them around a point; `{"blueprint":"plc_chest1","x":61,"y":44}` puts one at a place. Find blueprints with `list_blueprints(type: "utp", pattern: "chest")`.
   3. Groups by hand when needed: free spots from `adventure_find_walkable(area: "darkforest", region: "20,20,60,60", count: "6", clearRadius: "1")`, then `place_placeable(area: "darkforest", blueprint: "plc_campfr", x: "35", y: "42", faceTowardX: "40", faceTowardY: "40")`.
   4. One area sound at the centre: `place_sound(area: "darkforest", blueprint: "songbirdchirps", x: "80", y: "80")`.
   5. A pin at each door of a large building, shop, quest giver and landmark, 1-2 m in front: `dress_area(area: "darkforest", extraPins: "[{\"text\":\"<the place's name>\",\"x\":<x>,\"y\":<y>}]")` (only for a place that is really there).
4. `write_story_section(section: "Environment", text: "...")`, then `phase_check(phase: "environment", step: "end")`. Then `get_progress()`: what is still open, and the next step.

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
- A container the story names (`**Containers:** ... (tag)` in ## Environment) with its tag: `place_container(area: "<area>", tag: "<the tag exactly>")`. Use the tag as written; do not make up another.
- No wall torches, banners or other objects that hang on a wall.
- Every room or clearing gets at least one object.

## Format of the section

```
### <Area name> (`resref`)
**Placeables:** plc_table (tag) at (35, 42); ...
**Containers:** plc_chest1 (tag) at (61, 44)
**Sounds:** songbirdchirps at (80, 80)
**Waypoints:** <tag> "<pin text>" at (x, y)
```
