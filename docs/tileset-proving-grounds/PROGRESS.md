# Tileset Proving Grounds — build progress

**Purpose:** an exploration module covering every base-game tileset this project's
`area-*` skills support (no HAK files) — large, complex, maximum-tile-variety areas
per tileset, so the user can walk each one in the toolset and flag solver/tileset
mistakes for future calibration. Structure + light dressing only (no plot/quests/
challenges/rewards, per user's explicit call). Includes 4 henchmen of different
classes and a mandatory starter store (per the new rule in
`adventure-affordances/SKILL.md`).

**Module:** `tileset-proving-grounds.mod` at
`/home/qlippoth/nwn-data/user/modules/tileset-proving-grounds.mod` (created, loaded).

**If resuming after an interruption:** `load_module("tileset-proving-grounds.mod")`,
re-read this file, `list_areas` to confirm what's actually landed on disk (this file
is the intent/plan — cross-check against reality before trusting a row marked done),
then continue from the first `pending` row below. `autoRepack: "true"` is used on
every `adventure_apply_layout` call, so progress up to the last completed area
survives even mid-interruption.

## Style mapping (judgment calls, not from an existing skill doc)

`LayoutStyle.type` only has 10 literal values (dungeon/cave/dwelling/forest/rural/
city/plains/desert/castle/tundra) — several tilesets below don't have a dedicated
key and needed a closest-match choice, noted in the table.

## Area plan

| # | Tileset | Style | Size (target) | Rooms (target) | Status | Area resref |
|---|---|---|---|---|---|---|
| 1 | `tno01` (castle ext.) | castle | 32x32 | 9 real (10 requested) | **DONE** | `pg_tno01` |
| 2 | `tic01` (castle int.) | dungeon | 32x32 | 8 real, 8 features | **DONE** | `pg_tic01` |
| 3 | `ttf01` (forest) | forest | 32x32 | 8 real, all placed | **DONE** | `pg_ttf01` |
| 4 | `ttf02` (forest 2) | forest | 32x32 | 9 real, 8/9 features | **DONE** (fixed a self-inflicted apply_layout mistake, see notes) | `pg_ttf02` |
| 5 | `ttr01` (rural) | rural | 32x32 | 8 real, 7/8 features | **DONE** | `pg_ttr01` |
| 6 | `tts01` (rural winter) | rural | 32x32 | 10 real, all 10 features | **DONE** | `pg_tts01` |
| 7 | `tcn01` (city ext.) | city | 32x32 | 10 real, all 10 features | **DONE** | `pg_tcn01` |
| 8 | `tin01` (city int.) | dwelling | 32x32 | 10 real, 1024/1024 resolved, no features (only 1 feature group exists at all — Chessboard, banned) | **DONE** | `pg_tin01` |
| 9 | `tni01` (city int. 2) | dwelling | 32x32 | 10 real, 1024/1024 resolved, no features (same as tin01) | **DONE** | `pg_tni01` |
| 10 | `ttd01` (desert) | desert | 32x32 | 8 | **DONE** | `pg_ttd01` |
| 11 | `tde01` (dungeon) | dungeon | 32x32 | 10 | **DONE** | `pg_tde01` |
| 12 | `tdm01` (mines/caverns) | cave | 32x32 | 10 | **DONE** | `pg_tdm01` |
| 13 | `tdc01` (crypt) | dungeon | 32x32 | 10 | **DONE** | `pg_tdc01` |
| 14 | `tds01` (sewers) | dungeon | 32x32 | 10 | **DONE** | `pg_tds01` |
| 15 | `tdr01` (ruins) | castle *(no dedicated key — collapsed stone structures + overgrowth, closest to castle's wall/floor vocab)* | 32x32 | 8 | **DONE** | `pg_tdr01` |
| 16 | `ttu01` (underdark) | dungeon *(no dedicated key — area-underdark's own doc explicitly distinguishes it from a raw cave: "a settled underground tileset... whole cities", so dungeon's room+corridor variety fits better than cave)* | 32x32 | 10 | **DONE — user-verified good** | `pg_ttu01` |
| 17 | `tti01` (frozen wastes) | tundra | 32x32 | 8 | **DONE** | `pg_tti01` |

## After all 17 areas — ALL DONE, module complete

- [x] Connected all 17 areas via `adventure_create_transition` in a **chain** topology
      (simpler than hub-and-spoke — avoids crowding 16 portals into one area):
      `pg_tno01 ↔ pg_tic01 ↔ pg_ttf01 ↔ pg_ttf02 ↔ pg_ttr01 ↔ pg_tts01 ↔ pg_tcn01 ↔
      pg_tin01 ↔ pg_tni01 ↔ pg_ttd01 ↔ pg_tde01 ↔ pg_tdm01 ↔ pg_tdc01 ↔ pg_tds01 ↔
      pg_tdr01 ↔ pg_ttu01 ↔ pg_tti01`. 16 bidirectional portal pairs, all compiled.
- [x] Deleted the dead `_start` area. Set `Mod_Entry_Area` = `pg_tno01` via
      `modify_gff_field` (safe — it's a string field, not a float). Deliberately did
      **not** touch `Mod_Entry_X/Y/Z` — those are floats and `modify_gff_field` is
      documented in `CLAUDE.md` as corrupting float writes; left at their stale
      `_start` value (15,15,0), which passes `verify_module_info`'s bounds check but
      may not be walkable in `pg_tno01`. Cosmetic-only gap, flagged for a manual
      toolset fix rather than risking module.ifo corruption.
- [x] Placed 4 henchmen (Fighter/Wizard/Cleric/Rogue) in the hub (`pg_tno01`),
      following `adventure-actors/SKILL.md`'s companion pattern: PC-class chassis
      (verified via `resolve_blueprint`, not assumed from name — `nw_halfcel001`'s
      native class really is Fighter, overridden to Cleric per the skill's own
      warning), `henchman: true`, level-1 blueprints with `HENCH_LEVEL=6`,
      TYPE-0 voicesets validated via `resolve_2da`. `a_mod_load` (chains
      `x2_mod_def_load`) sets `SetMaxHenchmen(4)`; `a_hen_join` loops
      `LevelUpHenchman` to `HENCH_LEVEL`, then `AddHenchman` +
      `SetAssociateListenPatterns`. Simplified from the full adventure-actors
      pattern: single join-only dialog per companion (no stay/follow/leave hub) —
      justified since this module is a structural test scaffold, not a real
      adventure with companion-management needs.
- [x] Placed a starter store (`pg_gen_store`, "Proving Grounds Outfitter") in the
      hub — 4 items landed (a weapon, 2 potions, a torch); several guessed
      mundane-item resrefs (shield, dagger, buckler, scroll) don't exist under
      those names in the resman index and were dropped with warnings rather than
      guessed further.
- [x] `check_area_connectivity` — `fullyConnected: true`, all 17 areas reachable.
- [x] `verify_all(checkWalkable: true)` — **shippable: true, 0 errors, 0 warnings**
      across 61 checked targets.
- [x] Final `repack_module`.

**New pitfall found:** `compile_script` reported `success: true` with a valid
`outputFile` path, and the `.ncs` genuinely existed on disk — but `verify_all`
still reported `uncompiled_script` errors for both `a_hen_join` and `a_mod_load`,
and a `repack_module` right after compiling produced a **byte-identical** `.mod`
to the pre-compile version (i.e. the new `.ncs` files were silently not packed).
Root cause: the module's in-memory resource index doesn't pick up files written
via `write_script`/`compile_script` mid-session for `repack_module`'s purposes —
only `load_module` rebuilds it. **Fix:** `load_module` (reload the same path) after
writing+compiling new scripts, *before* the next `repack_module`, then re-run
`verify_all` to confirm. Cheap and reliable; worth doing any time new scripts are
added mid-session rather than trusting `compile_script`'s own success report.

## Critical lesson: `adventure_apply_layout` is NOT incremental

Learned the hard way on area 4 (`pg_ttf02`): I truncated the wall zone's tile list
when re-pasting a layout back into `adventure_apply_layout` (to save space), which
silently left the border painted with default terrain instead of the intended wall
terrain. Tried to "patch" it with a second call containing only the missing wall
tiles — that call **wiped all 8 already-placed features back to null**, confirmed via
`visualize_area` (`groupName` was `null` on all 1024 tiles afterward). Root cause:
`adventure_apply_layout` re-solves the *entire* area fresh from whatever `zones` it's
given each call — it does not merge with whatever the area already had. "Apply a
**complete** area layout atomically" in the tool description is the literal behavior,
not just phrasing. **Never pass a partial/patch zones list — always pass the full,
exact `LayoutResult` from `adventure_generate_layout` in one call, and never
hand-truncate any zone's tile list even when it looks safe to trim.** Fixed by
resubmitting the original complete payload once, which restored everything correctly
(973/1024 tiles, all 8 features back).

## Confirmed working recipe (use for every remaining area)

1. `create_area(resref, name, width, height, tileset)`
2. `adventure_list_features(tileset, style)` → pick as many preferredFeatures as
   `rooms` requested, ordered by size variety (1x1 through the biggest available).
3. `adventure_generate_layout(tileset, width, height, style JSON incl. rooms +
   preferredFeatures, transitionCount: 4)`
4. `adventure_apply_layout(area, layout, autoRepack: "true")` — check
   `featureWarnings` for skipped groups (door-on-transition-tile is the common
   reason — a real tileset/solver finding worth keeping, not a bug in this build).
5. `set_area_properties(area, ...)` — light ambience touch (skyBox/windPower etc.
   is enough for "light dressing").
6. `repack_module()` — cheap, do it anyway even though step 3 already did.
7. Mark the row done in this file, note any feature warnings.

## Area 1 (`pg_tno01`) result

32x32, requested rooms:10 → **9 real rooms**, 9/9 chosen preferredFeatures had a
room to try; 5 placed (**Tower Hill, Tower3 m69 3x3, Stables_1, Hay_barn,
FantasyTower 4x4**), 4 skipped — **House_Inn_2x2, MarketStall_2x2 m54,
Forge_L_shape_2x2, City_House_2x2_m26** all failed with "door tiles on terrain
transition or crosser edge". All 4 skipped ones are door-bearing building
features — worth checking by hand whether that's a genuine solver limitation on
`tno01` specifically (this tileset's building doors may sit at positions the
solver's corner-matching can't validate reliably) or a fixable room-placement
issue. 982/1024 tiles resolved. `tilesResolved` and `featuresPlaced` counts are
*tile* counts, not GIT object counts — feature groups are terrain geometry, so
`placeableCount` staying 0 in `list_areas` is expected and correct, not a bug.

## Area 2 (`pg_tic01`) result

Only 3 feature groups exist for tic01/dungeon-style at all (`Chessboard`, `Portal`
— both banned — and `Fountain`), so this is a genuine tileset finding: tic01 has
almost no non-banned decorative feature groups on `stone` floor terrain. 8/8 rooms
got a Fountain, 1016/1024 tiles resolved, no feature warnings this time (single-tile
features have no doors to conflict).

## Area 6 (`pg_tts01`) follow-up — height-transition feature bug found and fixed

Built pre-`/clear` with no result write-up at the time. User testing flagged a real
bug: the `Cave` feature (tile 244) at (col=23, row=29) rendered as a bare cave mouth
floating in a flat snow field — no elevated ground behind or beside it, cliff-edge
seam on 3 sides. Root cause: `adventure_apply_layout`'s feature-group filter
checked terrain *name* only, never corner *height* — tile 244 is "snow" on all 4
corners by name (passes) but has `TopLeft`/`TopRightHeight=1` (a real cave-in-a-rise,
not flat). **Fixed in code** — see `CLAUDE.md`'s "Pitfalls Found by Building a Real
Module" entry and `area-frozen/SKILL.md`'s Pitfalls section for the full writeup
and the general rule for hand-placing height-transition features going forward.

**This specific instance patched by hand** (not regenerated — `adventure_apply_layout`
isn't incremental): computed tile 244's actual placed corner heights
(`TL=1,TR=1,BL=0,BR=0` at its placement orientation 0), then found which rotation of
three `tts01` `aXX` slope tiles reproduces each matching edge exactly:
- North (23,30): tile 0 (`a01_01`) at orientation 2 → bottom edge `(1,1)` matches
  the cave's top edge exactly.
- West (22,29): tile 1 (`a02_01`) at orientation 1 → right edge `(1,0)` matches the
  cave's left edge exactly. **Zero constraint warnings** — a fully clean match.
- East (24,29): tile 3 (`a04_01`) at orientation 0 → left edge `(1,0)` matches the
  cave's right edge exactly.
North and east placements each carry one/two residual terrain-name-only warnings
(`snow vs trees`) one tile further out, where the collar meets the pre-existing
snow/trees transition zone — a much smaller, more distant seam than the original
floating-cave problem, not a height mismatch. This is a 1-tile collar directly
around the feature, not a fully seamless terrace — a wider apron would need more
hand-modeling, plausibly better done in the toolset. `verify_area(checkWalkable:
true)` passes clean. **Not yet re-confirmed by the user visually** — recorded here
per the same convention as the castle-corner and water-tile investigations.

**TODO — proper cliff-to-trees transition around the cave, using the tileset's own
purpose-built tiles for it.** User follow-up: the 1-tile collar above only uses
same-terrain (snow-only) elevation tiles (the `aXX` family) — it doesn't address
the neighboring terrain actually visible near this cave (tiles like 36
`snow/trees/snow/trees` and 38 `trees/snow/snow/snow`, both flat, sit close by).
The elevation should continue *outward* from the collar and blend into that
existing trees terrain, rather than dropping straight back to flat snow one tile
out. **Confirmed the right tile family exists**: `tts01` ships a dedicated set of
elevated snow/trees transition tiles for exactly this purpose — ids 39-48 and
247/248 (e.g. id 45 `d13_01`: `TL=Snow/1,TR=Snow/1,BL=Trees/0,BR=Snow/1`; id 48
`d16_01`: `TL=Snow/1,TR=Trees/0,BL=Trees/0,BR=Trees/0`) — mixing `Snow` at height 1
with `Trees` at height 0 in the same tile, i.e. cliff-face-into-treeline in one
piece. None of these were used in the collar fix above (it only reached for the
pure-snow `aXX` slope family). **Next step**: extend the collar 1-2 more tiles out
on the sides that border trees terrain, selecting from ids 39-48/247/248 by the
same method as before — compute the required edge heights+terrains from the
collar tile's already-placed corners, then find which of these tiles (at which
orientation) reproduces that edge exactly, same rotation-math approach, before
handing off to a final flat trees zone. Not done in this session — flagging for
the next pass rather than guessing at placements without re-deriving the exact
edge requirements first.

## Area 7 (`pg_tcn01`) follow-up — city gate corner towers found stranded, fixed

User report: the `CityGate_2x2` feature at (col=3-4, row=27-28) — tile IDs 239
(`o17_01`), 240 (`p17_01`), 237 (`o16_01`), 262 (`p16_01`) — "opens north/south" but
had "no required walls or other tiles to the east or west, leaving the sides of the
gate appearing cut off." Confirmed from the raw `.set` data: each of the 4 tiles has
exactly one **outer** corner elevated (height 1) forming the gate's corner towers,
with all **inner** corners (meeting at the gate's own center, the walkway) flat —
i.e. a real gate structure with raised towers flanking a flat passage, same shape
family as the `tts01`/`tti01` cases but with a diagonal (single-corner) elevation
pattern instead of a uniform edge. Same root cause: `groupHasUnsupportedDoors`'s
terrain-name-only check doesn't see height at all, so this feature (which does pass
that check, since all 4 tiles are pure `cobble`) still had nothing placed beside it
by the generator.

**Patched by hand**, same rotation-based method: computed each gate tile's exact
outer-edge corner heights (a *diagonal* pattern this time — e.g. tile 239's west
edge is `(TL=1,BL=0)`, tile 237's west edge is `(TL=0,BL=1)` — not the uniform edges
seen in the earlier `tts01`/`tti01` cases), then searched `tcn01`'s own `a01`-`a04`
generic elevation-step family (ids 0-3, same naming convention already used
successfully in `tno01`/`tts01`/`tti01`) for the exact rotation reproducing each
edge. Placed:
- (2,27): tile 0 (`a01_01`) @ ori3 — matches tile 239's west edge exactly.
- (2,28): tile 0 (`a01_01`) @ ori2 — matches tile 237's west edge exactly.
- (5,27): tile 3 (`a04_01`) @ ori0 — matches tile 240's east edge exactly, **zero
  warnings**.
- (5,28): tile 3 (`a04_01`) @ ori3 — matches tile 262's east edge exactly, **zero
  warnings**.
The two west-side placements ((2,27)/(2,28)) carry residual `cobble vs building`
terrain-name warnings **one tile further west**, where the collar meets a
pre-existing building zone — the same "smaller, more distant seam" category noted
in every prior fix in this file, not a height mismatch, and not on the edge that
actually meets the gate (which matched exactly). `verify_area(checkWalkable: true)`
passes clean. **Not yet re-confirmed by the user visually.**

## Area 10 (`pg_ttd01`) result

Confirmed done retroactively (context was cleared mid-build before this file's status
row was updated) via `visualize_area`: features placed are `AdobeBuilding_2x2` (×4
tiles), `Camp01_2x2` (×4), `GoodTemple_3x3` (×9), `Minaret` (×1), `Oasis_3x3` (×9),
`Shipwreck` (×9), `SmallTent` (×1), `Well` (×1) — 8 distinct groups, matching the
8-room target. Terrain is `cliff` (border/default) and `desert` (floor), walkability
ranges 0-100% across tiles as expected for a mixed room/corridor/obstacle layout.
Module was already packed (`load_module` read 11 areas straight from the `.mod`).

## Area 11 (`pg_tde01`) result

9 real rooms (10 requested), 9/10 preferredFeatures placed (Energy Source had no
remaining room), 1003/1024 tiles resolved. Confirms the `adventure_generate_layout`
compact-JSON fix from the earlier session notes is live and working — this 32x32
10-room dungeon response returned inline with no token-cap issue. Minor solver
warnings at (18,23)/(18,24)/(17,23) — dropped/mismatched crossers at one corridor
junction, corners preserved, not an error.

## Area 12 (`pg_tdm01`) result

9 real rooms (10 requested), 9/10 preferredFeatures placed (Mineshaft had no
remaining room), 1005/1024 tiles resolved, no solver warnings.

**Follow-up — disconnected corridor dead-ends found and fixed (user report).**
User flagged three spots that looked like adjacent hallway ends that should
connect: (col28,row24)/(col28,row25), (col19,row7)/(col19,row8), and
(col14,row27)/(col14,row28). Root cause traced to a real, general bug in
`layout-generator.ts`: `connectRooms()` computes each corridor path's edges
independently, with no awareness of other corridor paths — cave style's
`shortcutCount: 3` produced a shortcut corridor whose dead end landed one tile
from an unrelated main corridor's dead end in all three cases, each capped with
its one open side facing away from the other. Confirmed by computing each
placed tile's actual effective crossers (raw `.set` values rotated by the
tile's real orientation) and showing neither open edge faced the other despite
the tiles touching. **Fixed at the source** — see `CLAUDE.md`'s Pitfalls entry
for `mergeAdjacentDeadEnds()`, a new post-process step that closes this class of
gap for all future generations. **This module's three instances hand-patched**
(not regenerated, since `adventure_apply_layout` re-solves the whole area):
- (28,24): `47/2`→`165/0` (straight vertical, now open both to the existing
  corridor below and the new connection above); (28,25): `167/1`→`43/0`
  (corner-turn, now open both west to its existing corridor and south to the
  new connection).
- (19,7): `167/3`→`43/2` (corner-turn, open east to its existing corridor and
  north to the new connection); (19,8): `47/0`→`164/0` (straight vertical).
- (14,27): `47/2`→`165/0` (straight vertical); (14,28): `47/1`→`43/0`
  (corner-turn, open west to its existing corridor and south to the new
  connection).
`verify_area(checkWalkable: true)` passes clean on all six edits. **Not yet
re-confirmed by the user visually** — recorded here per the same convention as
the other investigations in this file.

## Area 13 (`pg_tdc01`) result

10/10 real rooms, 10/10 preferredFeatures placed, 1002/1024 tiles resolved. One
solver adjustment at (9,26): floor→wall corner swap, crossers preserved.

## Area 14 (`pg_tds01`) result

10/10 real rooms, 10/10 preferredFeatures placed, 1002/1024 tiles resolved. Three
solver adjustments (floor→wall corner swaps, crossers preserved) — same benign
pattern as area 13.

**Follow-up — gate/fence-door test (user request).** The original build used only
`preferredFeatures` from `adventure_list_features`, which never returns `tds01`'s
door-bearing groups (`Big Door 1/2`, `Fence Door 1/2`, `Bridge Door`, `Exit 1/2`,
`Door Transition`) — they're correctly excluded by the "no crosser edges" rule for
feature packing (per `CLAUDE.md`'s door-containing-group filter), which is why the
area shipped with no visible gates at all. To actually test whether this tileset's
door *placement math* (`getTileDoorWorldPositions()`) is correct, two were added by
hand directly into the existing area (via `paint_tiles` + `place_door`, not through
`adventure_apply_layout` — which is not incremental and would have re-solved the
whole area):

- **Big Door 1** (tile 68, `tds01_g07_01`, `wall/wall/wall/wall` + `T:corridor,B:corridor`
  — same signature as a plain corridor tile, so it drops cleanly into an existing
  corridor run with zero adjacency warnings): swapped in at world tile (26,11),
  orientation 0, replacing a plain straight-corridor tile. Door object placed at
  the tile's computed door offset `(265, 115, 0)`, bearing `0`, blueprint
  `tn_gdoor_mt_07` (base-game `TNO_MetalDoor02`, `genericdoors.2da` row 17 — matches
  the tile's own `doorPlacements[0].type`).
- **Fence Door 1** (tile 60, `tds01_i07_01`, `floor/floor/floor/floor` +
  `T:fence,B:fence`): a 3-tile fence line (`Fence-straight 56 / Fence Door 60 /
  Fence-straight 56`) inserted into an open room at (4,6)-(6,6), all orientation 0.
  Door object at `(55, 65, 0)`, bearing `270`, blueprint `tn_gdoor_st_05` (base-game
  `TNO_StoneDoor01`, `genericdoors.2da` row 15 — matches type).
- Both doors' world position/bearing were computed by hand using the exact same
  formula as `getTileDoorWorldPositions()` in `tileset.ts` (`x = col*10+5+rx, y =
  row*10+5+ry` where `(rx,ry)` is the door's local offset rotated by the tile's GIT
  orientation; `bearing = (doorPlacement.orientation + tileOrientation*90) % 360`) —
  cross-checking the tool's own math this way rather than trusting it blindly.
  `place_door` confirmed both land on walkable Stone surface.
- **Bridge Door** (tile 112, needs `pit/pit/pit/pit` + a bridge crosser path) was
  *not* added — `pg_tds01` has no pit/bridge terrain anywhere, and improvising one
  felt like a bigger change than "add a couple of test gates." Worth doing as a
  follow-up if the two above check out.
- **Found and fixed a real, separate bug while verifying:** `verify_door` flagged
  both placed doors' stock `OnDeath` script (`x2_door_death`, a genuine base-game
  Hordes-of-the-Underdark script) as missing — `isBaseGameScript()`
  (`src/util/verify/common.ts`) had no `x2_door_` prefix in its curated whitelist.
  Added it. Needs an MCP restart to take effect in this session; unrelated to
  whether the doors themselves are placed correctly.
- **Not yet confirmed by the user** — this entry records what was built and the
  reasoning, not a verdict. Waiting on visual/toolset confirmation of whether the
  gate sits correctly in the corridor and the fence gate looks right, same as the
  castle-corner and water-tile investigations above.

## Area 15 (`pg_tdr01`) result

Genuine tileset finding: only 3 non-banned feature groups exist for `tdr01`/castle
style at all (`Exterior Fountain 1x2`, `Interior Rubble`, `Interior Mosaic 2x2`) —
same pattern as `tic01` (area 2) and `tdr01`'s own default terrain is `wall`, like
an interior tileset, despite the ruins theme reading exterior. 8/8 real rooms,
7/8 feature placements succeeded (one `Interior Rubble` skipped — its tile corners
landed on a `wall`-terrain zone, not the room's `floor` terrain, so the solver
correctly rejected it). 1008/1024 tiles resolved.

## Area 16 (`pg_ttu01`) result

Notable tileset finding: `ttu01`'s default terrain is `floor` (not `wall` like every
other dungeon-family tileset built so far), and `adventure_generate_layout` responded
by emitting `wall`-type crossers between rooms instead of the usual `corridor`-type —
the generator adapts corridor crosser type to whichever terrain needs carving through.
8 real rooms (10 requested), 8/10 preferredFeatures placed (Temple, Cave had no
remaining room), 993/1024 tiles resolved, no solver warnings. 21 feature groups exist
for this tileset/style — the richest catalog of any area built so far, consistent
with `area-underdark`'s doc describing it as "a settled underground tileset... whole
cities."

## Area 17 (`pg_tti01`) result — all 17 areas now built

8/8 real rooms, 8/8 preferredFeatures placed, 1012/1024 tiles resolved, no solver
warnings. Notable: `tti01`'s default terrain is `pit`, but the generated layout
paints the entire 32x32 grid as `floor` first (open snowfield) rather than leaving
a wall-type border — consistent with `area-frozen`'s tundra description ("open
terrain, sparse clearings") and distinct from every interior/dungeon-family tileset
built earlier, where the default fill stays as a bounding wall terrain.

**All 17 planned tileset areas are now built and repacked.** Remaining work is the
["After all 17 areas"](#after-all-17-areas) checklist below: connect areas, delete
the dead `_start` area, place henchmen, place a starter store, verify connectivity,
final repack.

**Follow-up — two more stranded height-transition features found and fixed (user
report).** `pg_tti01` was built before the height-transition feature-filter fix (see
`CLAUDE.md`'s Pitfalls entry), so it shipped with the same class of bug as `tts01`'s
cave: the `Ramp` feature (tile 46) at (col=12,row=8) and the `Cave` feature (tile 47)
at (col=6,row=12) both have `TL=0,TR=1,BL=0,BR=1` (flat west edge, elevated east
edge) but were dropped into all-flat surrounding floor with no elevated neighbor —
reported by the user as a cave "opening West with no other required tiles around it"
and a ramp "up to the East with no other required elevated tiles around it," matching
each tile's actual corner data exactly (west=flat, east=elevated). **Patched by
hand**: `tti01` has the same `aXX`-family elevation tiles as `tts01` (`a01`-`a04`,
same model-naming convention) — tile 3 (`a02_01`) at orientation 2 produces effective
corners `TL=1,TR=0,BR=0,BL=1`, an exact match for the Left edge needed east of both
features. Placed tile 3@2 at (7,12) (east of the cave) and tile 8@2 (`a02_02`, same
structural family, different model variant for visual variety) at (13,8) (east of
the ramp) — **zero constraint warnings on both**, confirming an exact height+terrain
match. This settles the elevation back to flat one tile further east (a small
mound/step shape), not a full plateau — `tti01`'s tiny 75-tile catalog has no
all-four-corners-elevated flat tile to terrace onto. Only the east edge was patched;
the north/south edges of each feature are each half-elevated/half-flat (a diagonal
step) that would need a different, more complex matching tile — not addressed here,
same "1-tile collar, not a full terrace" scope as the `tts01` fix. **Caveat**: unlike
the `tno01`/`tdm01` investigations, `tti01` itself has no real hand-built instances
in the `~/tfndev` corpus to spot-check against (that corpus's closest resref is
`tii01`, a different tileset) — this patch relies on the rotation formula itself
being correct (independently verified via `tno01`/`tdm01`), not on a `tti01`-specific
corpus confirmation. `verify_area(checkWalkable: true)` passes clean. **Not yet
re-confirmed by the user visually.**

## Notes / decisions made along the way

- **Lesson learned the hard way:** `pg_tno01`'s area shell (from before the MCP
  restart) was lost — `create_area` was never followed by a `repack_module`, so it
  only existed in the temp dir's working files, not the packed `.mod`. On restart,
  `load_module` re-extracts from the `.mod` file itself, which still only had
  `_start` in it. **New rule for the rest of this build: repack after every single
  area, not just at natural checkpoints** — `adventure_apply_layout`'s
  `autoRepack: "true"` covers that step, but a bare `create_area` call (before a
  layout is generated/applied) needs an explicit `repack_module` right after it too,
  or skip straight to generate+apply in the same breath without leaving a
  create-only area sitting unpacked.

- **Blocker hit on area 1 (`pg_tno01`):** `adventure_generate_layout` at 32x32 +
  10 rooms returned an 81,253-character / 5,629-line result — over the tool-result
  token cap, saved to a file instead of returned inline. Root cause: exterior
  styles (castle/forest/rural/city/desert/tundra — 11 of these 17 areas) paint the
  *entire* area as one wall zone first (`generateLayout`'s "paint entire area with
  wall" step), which at 32x32 = 1024 tiles is ~1024 `{x,y}` objects pretty-printed
  at 2-space indent — this is exactly the already-tracked `CLAUDE.md` TODO
  "drop pretty-printed JSON from tool responses" (item was reverted once before
  for an unrelated, much larger change — `visualize_area` region/detail params —
  but this is a narrower, purely-cosmetic fix: `adventure_generate_layout`'s
  `JSON.stringify(result, null, 2)` → `JSON.stringify(result)` in
  `src/tools/adventure-tools.ts`, zero field/behavior change, just whitespace).
  **Fix is coded and built (`npm run verify` passes, 347 tests), but needs an MCP
  server restart to take effect** — per this project's own convention, TypeScript
  changes don't apply to a running server until restarted. `pg_tno01`'s area shell
  exists (`create_area` succeeded, 1024 tiles, default terrain) but has no layout
  applied yet — safe to resume from exactly here once the server is restarted:
  re-run the same `adventure_generate_layout` call for `tno01`/castle/32x32/
  10 rooms with the preferredFeatures list below, then `adventure_apply_layout`.
- **`pg_tno01` preferredFeatures already chosen** (10, spanning 1x1 to 4x4, no
  banned Chessboard/Portal): `Tower Hill`, `Tower3 m69 3x3`, `House_Inn_2x2`,
  `MarketStall_2x2 m54`, `Forge_L_shape_2x2`, `City_House_2x2_m26`, `Stables_1`,
  `FantasyTower 4x4`, `Hay_barn`, `BarrowEntry_2x2`. `transitionCount: 4` was the
  call param (one per compass-ish direction, for the eventual connectivity graph).
- **The "Reconnected to nwn-mcp" restart did NOT pick up the code fix.** Verified:
  `dist/tools/adventure-tools.js` on disk correctly has the compact
  `JSON.stringify(result)` (confirmed by reading the built file directly), but a
  32x32 `adventure_generate_layout` call *after* the reconnect still produced
  79,149 characters — barely smaller than the original pretty-printed 81,253
  (a ~2.6% drop; compact-vs-pretty for uniform `{x,y}` objects should cut this by
  ~70-75%, not ~3%). This means the live server process is still running old code
  — `/mcp`'s "Reconnected to nwn-mcp" reattached the client channel to an
  **already-running** server process rather than actually respawning it. **A true
  process restart is needed** (fully quit and relaunch whatever hosts the MCP
  server — not just the client-side `/mcp` reconnect) before retrying a large
  exterior-style area.
- **Working fallback confirmed while waiting on a real restart:** 20x20 for
  `tno01`/castle/8-rooms-requested succeeded and returned inline (well under the
  cap) — but only actually produced 4 real rooms (BSP split apparently terminates
  before reaching the requested count once leaves get too small — `rooms` is a
  target, not a guarantee), so only 4 of 8 `preferredFeatures` got placed. 26x26
  was tried next and still exceeded the cap under the still-not-fixed pretty JSON.
  Once the real fix is live, re-test at 26x26/32x32 to see how many rooms actually
  land — that number, not raw tile count, is what determines full preferredFeatures
  usage.
- **If the token-cap issue recurs even after the restart** (e.g. on `visualize_area`
  calls for inspecting these once built — that tool's payload was NOT touched this
  session, still pretty-printed): the fallback is reading the saved
  `tool-results/*.txt` file in chunks, or reducing area size for that one tileset
  specifically. Don't reduce size pre-emptively across the board — the whole point
  is maximum tile coverage.

## `tcn01` water-tile-gallery follow-up — rotation reports resolved, ship-dock collar added

**User report:** `tcn01_b02_04`/`b02_03`/`b02_01` "facing 180 degrees from where they
should", `tcn01_a14_01` "incorrectly turned 90 degrees counterclockwise" (in
`pg_water_gal`), plus `tcn01_p19_01`/`o19_01` (the `ShipDocked_2x2` feature) "should
enforce some dock tiles such as `tcn01_k02_01` or `tcn01_k05_01`... connected to one
of those tiles."

**Rotation reports — not a code bug, confirmed two ways:**
1. An automated cross-check (`getRotatedCorners()`, this codebase's own real code,
   not re-derived) against `~/tfndev`'s real `tcn01` areas (`aqueducts`, `benzor`,
   `tobaro`, `westbenzorslums`) found **0 mismatches across 204 real neighbor edges**
   touching all four reported tiles, at every GIT orientation 0-3 real builders used.
2. Root cause: `pg_water_gal` placed every tile at GIT `Orientation=0`, but 18 of its
   50 tiles have a non-zero `.set Orientation` — that field records the rotation the
   *model* was designed at, and the solver's own `naturalOri = round(setOrientation /
   90) % 4` (zone-solver.ts) is the actual "correct" pose to display, not 0. Both
   user reports match their tile's real `.set Orientation` exactly (180° and 90°).
   Fixed by repainting all 18 affected cells at their natural orientation instead of
   a blanket 0 — see `water-tile-gallery.md`'s "Revision note (second pass)" for the
   full writeup, corrected legend, and several corner-terrain transcription errors
   found and fixed in the same pass (regenerated from `parseTilesetFile()` directly
   instead of hand-transcribed).

**Ship-dock report — real generator gap, fixed via `feature-collars.ts`.**
`ShipDocked_2x2` (tiles 243/244 hull row, 241/242 dock row, `R:dock,L:dock` on both
241 and 242) was being unconditionally rejected by `adventure_apply_layout`'s
`hasCrossers` check — any feature group containing a crosser tile at all, full stop,
regardless of whether a collar exists. This is a broader gap than height-transition
features (which already had the curated-collar escape hatch) — every crosser-bearing
group in `tcn01` (`DockDoor`, `BridgeDoor`, `Boathouse`, `ShipDocked_2x2`,
`ShipFloating_1x2`, `Boat`, `Merchant_Docked`, `Merchant_Ship_Undockable`,
`Weathered_Docked`, `Weathered_Ship_Undockable`) is presumably affected the same way,
though only `ShipDocked_2x2` was investigated this session.

**Fix:** `adventure-tools.ts`'s `hasCrossers` rejection now respects a curated collar
the same way `hasHeightTransition` already did (`const collar = (hasCrossers ||
hasHeightTransition) ? getFeatureCollar(...) : undefined`). Added
`tcn01.shipdocked_2x2` to `feature-collars.ts`: `k05_01` (id 186 — exactly one
crosser, so it terminates cleanly rather than opening a new dangling connection, and
uniform water corners so it matches regardless of rotation) at `relX:-1,relY:1,ori:3`
(west) and `relX:2,relY:1,ori:1` (east) — both derived via `getRotatedCrossers`'s own
rotation formula, not guessed.

**Verified for real**, not just by inspection: built a throwaway 10x8 `tcn01` water
area (`pg_shiptest`, kept in the module as a reference) and called
`adventure_apply_layout` with a hand-built layout placing `ShipDocked_2x2` at (2,3).
`featuresPlaced: 6` (4 feature tiles + both collar tiles — previously this would have
been rejected outright, 0 tiles placed). Independently re-verified both collar
boundaries with the same corner+crosser cross-check technique: **corner match: true,
crosser match: true (dock vs dock)** on both the west and east collar edges. Zero
constraint warnings.

**Not done this session:** the other 9 crosser-bearing `tcn01` groups listed above
remain rejected by default (no curated collar yet) — same "curated exception list,
not a general fix" status as height-transition features. `DockDoor`/`BridgeDoor` in
particular are also feature groups per the "Not included" list in
`water-tile-gallery.md` and would need the same treatment if a future report flags
them.
