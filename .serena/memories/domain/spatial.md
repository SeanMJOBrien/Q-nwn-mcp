# Spatial conventions (verified on real data; oracle `src/util/tile-oracle.live.test.ts`)

If a change to rotation/height/offset/facing maths fails the oracle, the change is wrong. Evidence: `docs/object-placement-and-tilesets.md`.

Coordinates and ground
- Metres: +X east, +Y north, origin south-west, 10 m per tile; `Tile_List` row-major from SW (`index = tileY*Width + tileX`).
- Tile corners counter-clockwise TR -> TL -> BL -> BR; edges right -> top -> left -> bottom.
- Ground Z = walkmesh Z (node `position` offset included) + `Tile_Height x Transition`; `Transition` = tileset `[GENERAL] Transition=`: 5 most outdoor, 4 `tcn01`, 2 `tno01` (`tileHeightStep()`). Flat ground is not always 0 (trm02/tno01 +5, ttu01/ttz01 +1).
- Walkmeshes: `<Model>.wok` (not `.set` `WalkMesh=`), vertices relative to node `position`, tile-local +-5 m; query points rotated the opposite way (n=1: (x,y) -> (y,-x)).
- `nwn_resman_extract` extracts nothing if any requested file is missing: always batch via `ensureWoksExtracted`/`extractSalvaging` (`util/batch-extract.ts`); misses are cached.
- Height query uses the highest walkable face at a point.

Facing and positions (`util/facing.ts`)
- Creatures/waypoints/triggers/encounters/sounds/stores: `XPosition/YPosition/ZPosition`, `XOrientation/YOrientation` (unit vector); tool `bearing` = compass (0 north, clockwise).
- Placeables/doors: `X/Y/Z/Bearing` (radians, CCW, model front faces south at 0); front compass = 180 deg - bearing. Prefer `faceTowardX/Y`.
- Tile doors: position = tile centre + door (x,y) rotated CCW by `Tile_Orientation`; `Bearing = (doorOrientation + Tile_Orientation*90) % 360`.
- Z always from the walkmesh (`z` param is a fallback); responses report placed z.

Placement rules
- Walkability: placement/move tools block a non-walkable point or one within the buffer of non-walkable ground (`checkPlacementWalkable`, 4 probes). Defaults: creatures 1 m; placeables/waypoints 0.5 m; `adventure_create_transition` 2 m. `walkBuffer` relaxes; `probe_ground` reports without placing. Not enforced: `place_door`, `place_sound`, moving doors/sounds.
- Collision: creatures 0.75 m, placeables 0.5 m (`collisionRadius`, "0" disables; tight furniture 0.3-0.4).
- `fix_object_heights` (tolerance 0.01; `dryRun`; `onlyBuried` never lowers raised props). `move_object`/`bulk_move_objects` keep height above ground (`followGround`).
- Walkable is not reachable: connectivity is shared walkmesh triangle edges (`src/util/walk-graph.ts`, `area-walk-graph.ts`; doors bridge openings). `check_path` answers it across areas; `verify_all` reports `object_unreachable`/`area_unreachable` (opt out: local int `PATH_UNREACHABLE_OK = 1`). Heights, `Tile_Height`, `visualize_area` zones cannot answer reachability. Details `docs/adventure-tooling-reference.md` section 18.
- `util/walkgrid.ts` 1 m raster, `findOpenGround`; `adventure_find_walkable clearRadius`.
