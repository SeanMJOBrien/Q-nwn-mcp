# Area Generation Pipeline — Plain-Language Walkthrough

What actually happens, in order, when an area gets built through this MCP server —
whether by the fully-automatic `/create-adventure` pipeline or by a human directing
the same tools one step at a time. Written for anyone who wants the mental model
without reading the code: **blueprint → build → inspect → furnish → snapshot for you.**

## 1. `create_area` — pour the foundation

Makes a blank area of a given size (in tiles, like a grid — e.g. 12×12) using one
chosen tileset (forest, castle, dungeon, etc.). At this point it's just one uniform
terrain everywhere — no rooms, no paths, nothing interesting yet.

## 2. `adventure_generate_layout` — draw the blueprint

This doesn't touch the area at all yet — it's pure planning. Given the size, tileset,
and a style ("dungeon," "rural," "forest"...), it works out on paper: where the
rooms/clearings should go, how corridors connect them, and good spots for entrances.
It hands back a plan — not a built area.

## 3. `adventure_apply_layout` — build it

Takes that plan and actually paints it into the area. This is where the "which exact
piece of scenery art goes here" decision happens — every tileset only has a limited
catalog of physical tile pieces, and this step picks the ones that correctly fit the
plan (floor next to floor, wall next to wall, proper transition pieces at the edges).
This is the step the "safe scaffold" option affects — it can build a plain, simple
version of the plan instead of a fancy one, for a human to finish decorating by hand
afterward.

## 4. `visualize_area` — take a look at what got built

This is a photograph, not a construction tool. It reads back the finished area
(tiles, rooms, anything placed in it) as data, so the LLM can see what's there before
deciding what to do next. It never builds or changes anything.

## 5. `place_creature` / `place_placeable` / `place_door` / etc. — furnish it

Individually add NPCs, furniture, doors, monsters, treasure — one object at a time,
into the area that's already built.

## 6. `export_area_report` — a picture for you

A separate, purely cosmetic HTML snapshot you can open in a browser to see the area
visually. It's downstream of everything above and never feeds back into any of it.

## 7. `repack_module` — save it into the actual file

Everything above happens in a working copy; this step writes it back into the real
`.mod` file so it shows up in the NWN toolset.

## Automatic vs. manual

For the fully-automatic `/create-adventure` pipeline, steps 1–3 happen once per area,
then later phases layer on NPCs/quests/monsters using the same underlying tools
(4–5) — just orchestrated automatically instead of one at a time by hand. A human
directing the base tools (via `nwn-area-builder`) uses the exact same steps, just
one call at a time with judgment in between.
