---
name: adventure-areas
description: Sub-skill of /create-adventure. Reads the plot document from adventure.md and builds all required areas — tileset selection, terrain painting, atmosphere, and transitions. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

> Adventure files here are title-based; paths come from `get_adventure_dir`.

# Areas

Sub-skill of `/create-adventure`. Reads the plot section of `adventure.md`, builds all areas required by the plot, and appends an areas summary back to `adventure.md`.

## Prerequisites

- `adventure.md` must exist in the adventure directory (`get_adventure_dir`, i.e. `adventures/<Title-With-Dashes>/`) and contain a completed `## Plot` section. All sub-skills read from and append to this shared file.
- A module must be loaded. If none is loaded, call `load_module` using the module name from `adventure.md`.

## Workflow

Fully autonomous. Make all decisions based on the plot document — do NOT ask the user for input.

---

### Phase 0: Clean Up Starter Area

If the module was created by `create_module`, it contains a temporary `_start` area (MicroSet 3x3). Before building real areas, check whether `adventure.md`'s `## Plot` notes a "Starter" store (see `adventure-affordances/SKILL.md`'s "Optional: the Starter store" — a pre-story shop where the player spends a gold allowance on gear of their choosing before the adventure begins).

**No Starter store planned:**
1. Build the first story area (the one the plot opens in) as usual.
2. Call `set_module_start(area: "<its resref>")`. It sets `Mod_Entry_Area` and `Mod_Entry_X/Y/Z` to open walkable ground near the area's centre (pass `x` and `y` to choose the spot yourself) and removes `_start` when it is empty and no transition uses it. Do not edit these fields with `modify_gff_field`.

**Starter store planned:** the start area must be a real, dedicated area, kept — not deleted and
folded into the first story area the way it is above. It houses the Starter store and nothing
else story-related (an overview/orientation line is fine; plot content is not — see
`adventure-affordances/SKILL.md`).
1. Rebuild `_start` as a small real area (or repaint the existing stub) sized for one merchant
   NPC + the store — this stays `Mod_Entry_Area` and `Mod_Entry_X`/`Mod_Entry_Y` point into it,
   unchanged from the module template's own entry point.
   - **Build it flat, through the normal pipeline** (`adventure_generate_layout` +
     `adventure_apply_layout`, or a manual `paint_group`/`paint_tiles` fill) — not left at
     whatever `create_area`'s raw default fill happens to be. Confirmed a real starting area
     shipped covered in visually-ramped tiles despite the solver pipeline itself being
     flat-tile-only by construction (`tile-solver.ts`/`zone-solver.ts` both filter to
     `tile.flat`), meaning the ramp tiles were selected deliberately rather than defaulted —
     most likely a Vertical/connective feature group (see below) picked by mistake for what
     should have been plain floor.
   - **Only request Structural/Camp-category feature groups here, never
     Vertical/connective ones.** `get_tileset_details`/`adventure_list_features` group
     names like `Ramp`, `Cave`, or a gate/tower piece exist specifically for height
     transitions and area entry/exit points elsewhere in a dungeon or exterior layout —
     they are not floor filler and will not read as "a flat camp with a wagon in the
     corner." For a wagon/camp-themed start area, look for `plc_emptywagon`/
     `plc_fullwagon`/`CaravanWagon2`-style groups instead.
   - **Centering a placement (the store NPC, a central fire pit, etc.) in the room:** use
     the tile-center formula already established in `adventure-actors/SKILL.md`
     ("World position = tile * 10.0 + 5.0 for center") against the *average* of the
     room's tile bounds — `((minCol+maxCol)/2)*10+5` and `((minRow+maxRow)/2)*10+5` —
     not a guessed coordinate. Read the room's actual tile bounds from
     `visualize_area`'s spatial payload before computing this.
2. The first *story* area is a separate area, built normally, connected from the start area via
   `adventure_create_transition` (Phase 7's standard mechanism) — the player steps through it
   once they've geared up, and that's where the plot actually opens.
3. Do not remove `_start` from `Mod_Area_list` or delete its files — it remains a real, permanent
   area for the life of the module. Do not call `set_module_start` on the story area here: the
   start stays in `_start`. (To move the entry point inside `_start`, call
   `set_module_start(area: "_start")`.)

---

### Pre-Check

Call `phase_check(phase: "areas", step: "start")`. If it returns an error, **STOP** and output its `stop` message.

---

### Phase 1: Read the Plot

Read `adventure.md`. Extract from the `## Plot` section:
- **Locations** — all areas that need to be built (name, type, description)
- **Setting** — interior or exterior? What biome/environment per location?
- **Mood** — dark, peaceful, eerie, bustling, etc.
- **Scale** — how large should each area be?
- **Connections** — which areas connect to which (for door/transition planning)

Also read **Area Mode** from the `## Module` section (`Full`, `Scaffold`, or `Scaffold (Minimal)`). This governs how Phase 3 calls `adventure_generate_layout` for every area — see below.

Build a mental list of all areas to create. Process them one at a time.

---

### Phase 2: Tileset Selection (per area)

Call `list_tilesets` once to see all available tilesets.

**Match terrain keywords from the plot to tileset terrain types — this is the most important criterion.** Scan ALL tilesets:
- "lava" → Dungeon (`tde01`, has Lava terrain) — NOT Crypt
- "water", "river", "lake" → look for Water terrain
- "chasm", "cliff" → look for Chasm or Cliff terrain
- "forest", "trees" → look for Trees or Forest terrain
- "pit", "bottomless" → look for Pit terrain

**Tileset Reference:**

The table below covers base game tilesets. Other tilesets may exist as custom content (HAKs) — use normal pattern matching against terrain types, crosser types, and group names for those. This list is hints, not exhaustive.

| Resref | Name | Int/Ext | Notes |
|--------|------|---------|-------|
| `tbw01` | Barrows Interior | Int | Burial mounds, barrow tunnels |
| `tno01` | Castle Exterior, Rural | Ext | Fortified keeps, castle walls in countryside |
| `tic01` | Castle Interior | Int | Throne rooms, storage, library, jail cells |
| `tcn01` | City Exterior | Ext | Urban streets, docks, castle districts |
| `tin01` | City Interior | Int | Houses, shops, inns, kitchens |
| `tdc01` | Crypt | Int | Tombs, undead lairs, pits |
| `ttd01` | Desert | Ext | Arid cliffs, sand, chasms |
| `dag01` | Lizardfolk Interior | Int | Tribal huts, primitive dwellings |
| `tde01` | Dungeon | Int | Classic dungeon with lava |
| `ttf01` | Forest | Ext | Woodland paths, cliffs, streams |
| `twc03` | Fort Interior | Int | Military interior with water features |
| `tti01` | Frozen Wastes | Ext | Icy exterior with evil castle structures |
| `tii01` | Illithid Interior | Int | Mind flayer tunnels |
| `tdm01` | Mines and Caverns | Int | Mine shafts, tracks, underground water |
| `tdr01` | Ruins | Int | Crumbling interior/exterior plaza mix |
| `ttr01` | Rural | Ext | Farmland, streams, roads, walls |
| `tts01` | Rural Winter | Ext | Snowy countryside, roads, walls |
| `tdt01` | Sea Caves | Int | Coastal caverns with water; seaside biome only |
| `tss13` | Sea Ships | Ext | Ship decks, docks, port districts |
| `tds01` | Sewers | Int | Underground drainage, pits |
| `tsw01` | Steamworks | Int | Mechanical/industrial dungeon |
| `ttz01` | Tropical | Ext | Jungle, beaches, sand, water |
| `ttu01` | Underdark | Ext | Vast underground with faction sectors |
| `tid01` | Drow Interior | Int | Dark elf architecture |

**Do NOT use these tilesets** — they are DLC/extended versions of original tilesets and are not supported:
- `tib01` (Beholder Caves), `tni02` (Castle Interior 2), `tni01` (City Interior 2), `tts02` (Early Winter 2), `ttf02` (Forest - Facelift), `tcm02` (Medieval City 2), `trm02` (Medieval Rural 2), `trs02` (Rural Winter - Facelift), `tms01` (MicroSet)

Pick the best match based on:
1. **Terrain type match** (highest priority)
2. Interior vs exterior
3. Crosser types (roads, streams, walls)
4. Group features (temples, lodges, bridges)

---

### Phase 3: Dimensions + Layout Plan

Size every area with `suggest_area_size(biome, purpose, events, shape)`, using the area's **Events** and **Travel** fields from `## Plot` (`shape: "linear"` when Travel is yes). It returns width, height, the build method and, for the generator, a room count. Cabins are 2x2, inns 2x4, a forest with one event 4x4, a forest road 3x10; more events add tiles. Use the returned size as is — don't round up to "feel" bigger. Below 9x9, and for linear strips, skip `adventure_generate_layout`: `create_area`, then `paint_tiles`/`paint_group` by hand.

**Preferred approach: Use `adventure_generate_layout`** to get a server-generated layout with zones, crossers, and transition points. This tool encodes all the layout rules (perimeter encapsulation, room separation, adjacency chains, walkable ratio) so you don't need to reason about them manually.

**Available styles:** `dungeon` (rooms + corridor crossers), `cave` (organic chambers + corridors), `dwelling` (quadrant rooms, building interior), `forest` (clearings in cliff/trees), `rural` (farmland clearings in trees), `city` (urban spaces), `plains` (open terrain, sparse clearings), `desert` (arid, cliff borders), `castle` (fortified exterior, castle walls), `tundra` (frozen, snow clearings).

**If Area Mode is `Scaffold` or `Scaffold (Minimal)` (from Phase 1): skip feature selection below entirely.** Pass `safeMode: true` in the style object and omit `preferredFeatures` — `adventure_generate_layout` returns an empty `suggestedFeatures` regardless, and picking features would defeat the point of a plain, hand-finishable scaffold. `safeMode` also disables L-shaped rooms, S-curve corridors, shortcut corridors, and obstacle patches, so the area comes out as plain rectangular rooms and straight corridors — the tile classes least likely to need a solver fallback. For `Scaffold (Minimal)`, also set `rooms: 1` and use the smallest valid width/height (9x9 — see `MIN_SINGLE_ROOM_AREA_SIZE` in `layout-generator.ts`) instead of the size guidance below; the story beat still needs its own area (a king still needs *a* throne room), just the smallest one that holds it, for the user to expand outward by hand. Then skip straight to Phase 4.

**MANDATORY (Area Mode: Full only): Choose thematic features BEFORE generating layouts.**
1. Call `adventure_list_features` with the tileset resref and style type (e.g., `style: "rural"`, `style: "cave"`, `style: "forest"`). The tool automatically resolves the correct floor terrain and returns ONLY groups safe for the solver — crosser edges and terrain-mismatched groups are filtered out. Freestanding building features (houses, lodges) with doors ARE allowed if all their tiles sit on uniform floor terrain.
2. Read the plot description for this area — what should the player see? A farmstead needs farms, barns, wells. A graveyard needs graves, ruins, crypts. A military camp needs tents, weapons racks, fortifications.
3. Pick 3-6 group names from the returned list that match the area's narrative purpose. **Order them by best thematic fit — most important/relevant first, descending.** The solver places exactly one feature per BSP room, trying preferred features in the order you provide. Only preferred features are placed — no random filler. With N rooms, at most N features will appear, so put the most essential ones first.
   - **Settlement rule:** For any village, town, city, hamlet, or settlement area, the **first 1-2 preferredFeatures MUST be house/building/dwelling features** (search the group list for "house", "home", "building", "dwelling", "cottage", "hut", "lodge"). A village without houses is obviously wrong. Place thematic variety features (wells, granaries, markets) after houses.
   - **Buildings facing the road:** for a village, town or other settlement, also pass `"avenue": true` in the style. The main room-to-room road is then reserved before features are packed (nothing is stamped on it), and buildings next to it are turned so their door faces it. Placed features may come back with a `rotation`; pass the layout straight to `adventure_apply_layout`, which applies it.
   - **Banned features:** NEVER use features containing "Chessboard" or "Portal" in any area. These are game-mechanic props that break immersion in adventure areas. Skip them when scanning the feature list.
4. Pass them as `preferredFeatures` in the style object. **Do NOT omit preferredFeatures** — without it the generator returns `suggestedFeatures:[]` and **zero feature groups will be painted in the area**. No houses, no structures, no landmarks. The area will be completely empty terrain. This is never correct for adventure areas.

```
# Example: a farmstead area — features match the narrative
adventure_generate_layout(tileset="ttr01", width="12", height="12",
  style='{"type":"rural","rooms":4,"preferredFeatures":["Farm 1 2x2","Barn 1 2x2","Field 1 2x2","Well","Field 3 1x2"]}',
  transitionCount="2", transitionDirections='["south","north"]')

# Example: a dark cave lair — features match the narrative
adventure_generate_layout(tileset="tdm01", width="10", height="10",
  style='{"type":"cave","rooms":4,"preferredFeatures":["Treasure01","Treasure02","Platform01_2x2","Pillar02","Mineshaft"]}',
  transitionCount="1")

# Example: a haunted forest — features match the narrative
adventure_generate_layout(tileset="ttf02", width="16", height="16",
  style='{"type":"forest","rooms":4,"preferredFeatures":["Graveyard","Graveyard 1x2","Ruin","Ruin 1 2x2","Webbed Forest"]}',
  transitionCount="2")

# Example: Area Mode "Scaffold" — a castle throne room, normal size, no features
adventure_generate_layout(tileset="tic01", width="14", height="14",
  style='{"type":"dungeon","rooms":3,"safeMode":true}',
  transitionCount="1")

# Example: Area Mode "Scaffold (Minimal)" — same throne room, smallest footprint
adventure_generate_layout(tileset="tic01", width="9", height="9",
  style='{"type":"dungeon","rooms":1,"safeMode":true}',
  transitionCount="1")
```

The result contains `zones`, `crossers`, and `suggestedFeatures` ready to pass directly to `adventure_apply_layout`, plus `transitionPoints` with guaranteed in-bounds coordinates. Transition points are automatically:
- **Spread across quadrants** — multiple transitions avoid clustering in the same part of the area
- **Placed near border terrain** — at the room edge closest to wall/cliff/tree terrain, where a path would naturally emerge
- **Feature-aware** — rooms containing features (buildings, landmarks) are preferred; the `nearFeature` field names the closest feature if one exists
- **Door-snapped** — when a feature is a building with a door (house, inn, barn), the transition point snaps to the door's world position (`atDoor: true`); the portal appears right at the building entrance

**Fallback:** If `adventure_generate_layout` doesn't produce a good fit (e.g., unusual tileset or custom requirements), design the layout manually. **Read the "CRITICAL — Area Layout Design" section below BEFORE designing any zones.** The #1 mistake is creating one big open space — areas MUST have multiple distinct zones/rooms connected by paths or corridors.

---

### Phase 4: Build the Area

Execute in this order:

1. **Create the area** — `create_area` with tileset, dimensions, and a resref derived from the area name (lowercase, no spaces, e.g., `darkforest`, `temple_ruins`).

2. **Paint the layout** — A single `adventure_apply_layout` call with the full `LayoutResult` from `adventure_generate_layout`. Pass `autoRepack: "true"` to save progress to the .mod file immediately (prevents lost work if context runs out). The solver applies all terrain zones, crosser paths, and feature groups atomically.

   **CRITICAL — Perimeter encapsulation (applies to BOTH interior and exterior areas):**

   The outermost ring of tiles (row 0, last row, column 0, last column) must NEVER contain playable/walkable terrain. No terrain zones should extend to the perimeter. This is not optional.

   - **Interior areas:** The entire perimeter ring must remain the default Wall terrain. Do NOT place floor, room, shop, or any non-wall zone on any tile that touches the area boundary. If a room zone would extend to the edge, shrink it inward by at least 1 tile.
   - **Exterior areas:** The entire perimeter ring must be covered by impassable terrain — Trees, Cliffs, Rocky, Mountains, or the tileset's equivalent border terrain. Do NOT place Grass, Dirt, Sand, Road, or any walkable terrain on perimeter tiles. Do NOT extend crosser paths into the perimeter — the solver automatically trims crossers from border tiles. Crossers should start/end at the first/last walkable tile inside the perimeter (row 1, row height-2, col 1, col width-2).

   The layout generator already handles perimeter encapsulation. When designing manual fallback zones, ensure every zone rectangle starts at row/column 1 (not 0) and ends at max-1 (not max). Leave the perimeter untouched as default terrain for interior, or explicitly assign border terrain for exterior.

   **CRITICAL — Terrain adjacency chains:**

   Tilesets only have transition tiles between specific terrain pairs. You CANNOT place two terrains next to each other if the tileset has no transition tiles between them — the solver will produce broken results. **Before designing zones, check adjacency compatibility.** Common chain:
   - `ttr01` (Rural): `Trees → Grass` (+ Water, Dirt variants)
   - For unfamiliar tilesets, call `get_tileset_details` and examine which terrain pairs share transition tiles.


If the solver warns about missing tile combinations:
- Simplify terrain (avoid 3+ terrain types meeting at one point)
- Check available tile combos with `get_tileset_details`
- Use `paint_tiles` with exact tileId for manual overrides on problem spots

---

### Phase 5: Atmosphere

Set ambient properties with `set_area_properties`. The reference tables below are common hints, not exhaustive — look up 2DA tables (`ambientmusic`, `ambientsound`) for more options if needed.

**Common music IDs:**
| ID | Use for |
|----|---------|
| 1 | Exterior day — countryside, village |
| 3 | Exterior night — countryside |
| 7 | Interior — dungeon, ruins, crypts |
| 8 | Interior — dungeon alternate |
| 10 | Generic battle |
| 13 | Dark interior — evil, horror |
| 16 | Town/city exterior |
| 34 | Rural battle |

**Common ambient sound IDs:**
| ID | Use for |
|----|---------|
| 30 | Soft wind — calm exterior |
| 31 | Medium wind |
| 33 | Forest wind — woodland |
| 60 | Cave drips — dungeon, crypts |
| 61 | Cave ambient alternate |
| 62 | Cave ambient alternate 2 |

**Other settings:**
- **Skybox** — exteriors: `skyBox: 1`. Interiors: `skyBox: 0`.
- **Day/night cycle** — exteriors: `true`. Interiors: `false`.
- **Fog** — Do NOT set `sunFogAmount` or `moonFogAmount` (leave at 0). Instead use `fogClipDist` to control fog density: 45 = very foggy, 80 = clear sky. Omit `fogClipDist` for no fog.
- **Wind** — `windPower`: 0=calm, 1=light, 2=strong.
- **Weather** — `chanceRain/Snow/Lightning` 0-100. The corpus survey (`area-ambience` skill, 12,507 hand-built areas) found only **3% adoption** overall — weather is the exception, not a routine per-area setting. Reserve it for biomes where it's thematically central (frozen wastes, rural winter, a deliberate storm set-piece); leave it unset (0) for everything else. When it is warranted, use low values (5-15) for occasional weather.

---

### Phase 5b: Place Aesthetic Doors

After painting, call `place_tile_doors(area)` for every area. It places and locks every door the painted tiles imply (gates, building doors, corridor archways): the blueprint comes from `doortypes.2da`, the position and bearing from the tile's rotation, corridor doorways stay unlocked and every other door is locked and plot. Safe to run twice. Tiles whose door type is generic (type 0 — every `ttr01` building door) have no blueprint: pass `genericDoor` (e.g. `x3_door_wood001`) or they are listed under `skipped` and need `place_door` by hand.

---

### Phase 6: Connectivity Validation

Check `adventure_apply_layout` results for `solverWarnings`. If there are crosser mismatch warnings or isolated zones seem likely, call `visualize_area` and check `zones` array — every room must be reachable from every other room. Fix with `paint_tiles` for manual overrides on problem spots.

---

### Phase 7: Link Area Transitions

Use `adventure_create_transition` for ALL area transitions — do NOT use doors, `link_doors`, or `create_area_transition`. The adventure pipeline uses the light-based transition tool exclusively.

**Note — this is a deliberate scope choice, not the corpus-typical pattern.** The `area-connections` skill's survey of 12,507 hand-built areas found doors connect 79% of area pairs, with light-shaft portals used only as a fallback for open terrain with no wall to hang a door on, or for a genuinely magical transition. The pipeline standardizes on portals anyway because they need no matched door pair across two areas and no trigger geometry — see CLAUDE.md's "Doors/gates architecture" pitfall (#5) for the full rationale. If a future iteration wants corpus-typical door/trigger transitions instead, that's a deliberate pipeline change requiring explicit sign-off, not a silent substitution here.

`adventure_create_transition` creates a **bidirectional** transition in a **single call**. It places a useable blue shaft of light AND a landing waypoint at **both** positions simultaneously, guaranteeing the light and waypoint in each area are always at exactly the same coordinates. **Do NOT call twice** — one call handles both directions.

**CRITICAL: Tag length limit.** Resrefs are `a_at_<tag>` and `a_rt_<tag>` (max 16 chars each), so the `tag` parameter can be at most **11 characters**. Use short abbreviated tags like `vil_cave`, `vil_inn`, `inn_cry` — NOT `village_to_cave`. Every transition must have a **unique** tag that fits in 11 chars.

```
# Village ↔ Cave (bidirectional, single call)
adventure_create_transition(
  areaA: "village", aX: "85.0", aY: "45.0",
  areaB: "cave", bX: "15.0", bY: "15.0",
  tag: "vil_cave"
)
```

The tool places in each area: a blue light portal + a landing waypoint at the **same coordinates** with Z taken from the walkmesh. No separate calls, no coordinate drift.

- In `areaA`: light `at_<tag>` + waypoint `wp_rt_<tag>` at `(aX, aY)`
- In `areaB`: light `rt_<tag>` + waypoint `wp_at_<tag>` at `(bX, bY)`

**After placing transitions, update both dialog texts** to tell the player where each portal leads. Use `edit_dialog_node` on:
- `d_at_<tag>` (light in areaA, entry node 0): *"This appears to be the way to [location]. Do you wish to step through?"*
- `d_rt_<tag>` (light in areaB, entry node 0): *"This appears to be the way back to [location]. Do you wish to step through?"*

**Matching transition points to destinations using `nearFeature`:**
Each transition point from `adventure_generate_layout` may include a `nearFeature` field (e.g., `"Inn 1x2"`, `"Lodge 2x2"`). When deciding which transition point to use for which area connection, **match `nearFeature` to the destination**. Example: if the plot says this area connects to an inn AND to a cave, use the transition point with `nearFeature: "Inn 1x2"` for the inn connection, and the other point for the cave. This places the portal next to the building it leads to — the player sees a house and a glowing portal beside it, which makes spatial sense. When `atDoor: true`, the portal is right at the building entrance.

**Transition placement rules:**
- **Use `adventure_generate_layout` transition points** when available — these are pre-computed walkable coordinates near the correct edge, spread across different quadrants, and snapped to building doors when possible.
- **Verify walkability with `adventure_find_walkable`** if a transition point from the generator fails the 2m walkability check. Pass a bounding box region around the room: `adventure_find_walkable(area="myarea", region="x1,y1,x2,y2")` where x1/y1/x2/y2 are the room bounds in world coords (tile * 10).
- **At buildings/structures:** The generator automatically snaps to doors when possible (`atDoor: true`). If placing manually, put the light directly in front of feature doors.
- **Near border terrain:** Transitions should be close to wall/cliff/tree terrain (where a path into the area would naturally emerge), but the 2m walkability buffer keeps them safely inside the walkable area.
- **Never place on border/transition tiles** (tiles where cliff/wall meets walkable terrain). Stay at least 1 tile inside the walkable area.

---

### Phase 8: Update adventure.md

Append an `## Areas` section to `adventure.md` with:
- Each area: resref, name, tileset, dimensions
- Terrain summary (what zones were placed)
- Features placed
- Area transition links (which trigger tags connect which areas)

This data is used by downstream skills (`/adventure-environment`, `/adventure-actors`, `/adventure-quests`, `/adventure-challenges`, `/adventure-affordances`) to place content correctly.

Edits are saved to the module project as they happen; do not build the `.mod` (`repack_module`) unless the user asks.

---

## CRITICAL — Area Layout Design (applies to ALL tilesets)

**NEVER design an area as one big open space.** This is the single most important layout rule. Areas must have spatial structure — distinct zones connected by paths/passages. A large flat rectangle of the same terrain is boring to explore and looks artificial.

**The rule: 30-50% of tiles should be "rooms" or clearings. The rest should be walls, trees, or other impassable terrain that creates corridors, paths, and chokepoints between the open spaces.**

### Exterior areas:
- **Edge encapsulation** — place Trees, Cliffs, Rocky, or other impassable terrain along all four edges. Areas shouldn't end with open ground at the border.
- **Break up open space with terrain.** Don't carve one big clearing in the middle. Instead create multiple clearings (Grass, Dirt) separated by trees or rocks, connected by road/path crossers. Think of it as outdoor "rooms" — a village green, a market area, a garden, a courtyard — each separated by tree lines or terrain features.
- **Use roads/streams as corridors.** Crosser paths (Road, Stream) through tree or rocky terrain create natural passages. These serve the same purpose as interior corridors.
- **Example good layout (12x12 exterior):** Perimeter trees → 3 Grass clearings (3x3 each) separated by 2-tile tree strips → Road crosser connecting them north-south.
- **Example bad layout:** Perimeter trees → one big 8x8 Grass rectangle in the middle. This is what the agent defaults to and it MUST be avoided.

### Interior areas:
- **Perimeter must be Wall.** Never place floor/room/shop zones on the outermost row or column of tiles.
- **Use Corridor/Doorway crossers for passages between rooms.** These create the visual doorways.
- **Walls create structure.** Default Wall terrain is solid. Floor zones carve rooms. Corridor crossers cut passages.
- **Design 2-4 distinct rooms** connected by corridor crossers. NOT one big open floor.
- **Zig-zag corridors ~50% of the time.** Creates better exploration flow.
- **2-tile room separation.** Leave at least 2 Wall tiles between rooms to prevent the corner grid from merging them.
- **Terrain names must match the tile catalog key.** Use short lowercase names (e.g., `"floor"` not `"floor (interior)"`). Use `defaultTerrain` from `list_tilesets` as reference.
- **Corridor crossers go on Wall tiles.** Bridge crossers go on Pit tiles. Road/Stream on Grass.
- **Void terrain must be visible.** Add a doorway crosser at wall/chasm boundaries so players can see into pits.

**CRITICAL — Interior tileset room type isolation:**

Many interior tilesets (e.g., `tic01`, `tin01`) have multiple named room terrain types (Stone, Jail, Library, Rich, Shop, Inn, Livingroom, etc.). Each type is a self-contained visual style. **Two different room types can only be connected if the tileset contains a tile with mixed-type corners AND a corridor/doorway crosser between them.** If no such tile exists, the two rooms will be permanently separated by a solid wall — the player literally cannot walk between them.

**Before designing a multi-room-type layout:**
1. Call `get_tileset_details` on the tileset.
2. Scan the tile catalog for tiles whose `cornerTerrains` mix the two types you want to connect (e.g., `{tl: "stone", tr: "jail", ...}`) AND have a crosser (`"top"/"bottom"/"left"/"right"` non-empty).
3. If such tiles exist → you CAN connect those room types with a Corridor crosser on the Wall boundary tiles between them. The layout generator handles this automatically.
4. If NO such mixed-type corridor tiles exist → do NOT mix those room types in the same area. Use one of:
   - **Single room type throughout** — use one terrain type (e.g., all Stone) and add `paint_group` groups for visual variety within it.
   - **Separate areas** — put each room type in its own area, connected via `adventure_create_transition`.

**Never assume mixed room types can connect.** Always verify first.

## Crosser Behavior at Terrain Boundaries

The solver prioritizes preserving crossers over exact corner matching. At a Pit/Floor boundary with Bridge crossers, it substitutes corners to find a bridge tile. Only specify crossers on tiles that naturally support them — the solver handles boundary transitions.

## Important Notes

- **Tile coordinates:** Column = x (left to right), Row = y (bottom to top). World position = tile * 10.0.
- **Feature placement:** `paint_group` x,y is the bottom-left corner of the feature group (of its turned footprint when `rotation` is given). `adventure_apply_layout` handles this automatically from `suggestedFeatures`.
- **Zone-based solver:** `adventure_apply_layout` resolves all terrain, crossers, and features atomically.
- **Manual overrides:** Use `paint_tiles` with exact tileId for tiles the zone solver can't handle.
- **Z-height sanity check.** Z comes from the walkmesh (mesh height + node offset + `Tile_Height × Transition`), so it is exact — and **not necessarily near 0**: raised tiles, and tilesets whose flat ground sits at +1 or +5 (ttu01, ttz01, trm02, tno01), are normal. Do not discard a position because its Z is not ≈ 0. A position is bad only when `probe_ground` says it is non-walkable or too close to a non-walkable surface (tree borders, cliff edges); then pick another spot with `adventure_find_walkable` (or `clearRadius` for a footprint) instead of reasoning from Z.
- **Do NOT auto-export HTML reports.**
- **Interior tilesets fill with `wall`, not floor.** On `tic01`, `tde01`, `tdc01` and the
  other interiors, `create_area` fails with *"No suitable default tile found"* for any
  floor terrain — floor tiles only exist as room interiors bounded by wall (check
  `validTerrainAdjacencies`: every floor terrain connects to `wall` alone). Create the
  area with the tileset's own default terrain, then carve rooms with
  `adventure_generate_layout` + `adventure_apply_layout`.
- **Decorated interior terrain is only partly walkable.** `tic01`'s `rich` tiles carry
  furniture, so a tile existing does not mean a creature can stand on it — a throne-room
  centre computed as `col*10+5, row*10+5` came back `Nonwalk (ID 7)`. On any decorated
  terrain, get positions from `adventure_find_walkable`, never from arithmetic. (The tile-centre fallback
  `col*10+5, row*10+5` is safe on plain floor/clearing tiles only; confirm with `probe_ground`.)
- **Set the start with `set_module_start`, not by hand.** `create_module` always leaves a `tms01`
  stub `_start` behind; left in place it shows up as permanently unreachable in
  `check_area_connectivity`. `set_module_start(area)` moves the entry point to walkable ground in
  the named area and removes the empty stub. `modify_gff_field` cannot write the float fields
  `Mod_Entry_X/Y/Z` (the value arrives as a string, `nwn_gff` rejects it and later writes of
  `module.ifo` fail; if that happened, `load_module` on the module project directory with
  `force: true` re-reads it).

## Finish

Call `phase_check(phase: "areas", step: "end")` last. It checks this phase's section was appended, runs the verifiers that belong to the phase and writes the entry to `adventure-status.json` (`partial` with the error list if anything is left). Fix its errors and call it again; never report success past errors.

A layout is repeatable: `adventure_generate_layout` returns the `seed` it used; pass it back as `style.seed` to get the same layout again (useful when one room is wrong and the rest is right).
