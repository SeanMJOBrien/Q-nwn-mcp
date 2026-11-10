# Full-tileset survey area notes

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

### Building Full-Tileset Survey Areas — Placement Efficiency, Multi-Area Packing, and Area Size Limits (2026-09-20)

Learned while building `tcn01-survey.mod`, a reference module containing a
dedicated survey area (or areas) per native tileset — every distinct corner
pattern plus every multi-tile feature group, laid out with 1-tile buffers so
each is visually inspectable in the toolset without touching its neighbors.
Covered tcn01, dag01, tno01, tcm02, trm02, ttu01, trs02 this session.

- **Hard confirmed limit: no NWN area can exceed 32x32 tiles per side.**
  `create_area`'s own tool schema states `width`/`height`: "Area width/height
  in tiles (1-32)". For a tileset whose combined pattern+group footprint
  (with 1-tile buffers on all sides, including diagonally) doesn't fit in one
  32x32 area — confirmed for tno01, tcm02, trm02, trs02 in this session, each
  needing 2-3 areas — split across multiple areas rather than attempting an
  oversized single area. There is no workaround; a 48x48 area was proven by a
  packer dry-run to fit everything for tno01/tcm02/trm02, but the engine will
  not create it.
- **Reusable buffer-respecting multi-area bin-packing algorithm** (ad-hoc
  Python, not checked into this repo — reproduce if needed): maintain a
  boolean `blocked` grid per area; `reserve(x0,y0,w,h)` marks the footprint
  **plus a 1-tile halo in all four directions** (including diagonals) as
  blocked; `place_greedy(w,h)` scans row-major for the first position where
  the full `w x h` footprint has zero blocked cells. Sort items
  largest-footprint-first before packing (better bin utilization than
  insertion order). When an area fills up (an item doesn't fit anywhere in
  it), start a fresh area and repack only the still-unplaced items into it —
  repeat until everything is placed. This guarantees no two features (or a
  feature and a reserved center waypoint) are ever closer than 1 tile apart,
  including diagonally, with zero manual coordinate arithmetic. Always
  re-verify the final placement list has zero duplicate `(x,y)` cells via a
  dedicated dedup script before issuing any write calls — eyeballing a large
  single-line JSON array for duplicates is unreliable (produced a false-positive
  "duplicate found" read this session that a script disproved).
- **Major efficiency win: batch raw-tile `paint_tiles` calls instead of
  per-group `paint_group` calls, whenever every placement is at rotation 0.**
  `paint_group`'s only real job beyond a plain tile write is the grid-slot
  remap for non-zero rotation (`rotateGroupTileIndex`) — at rotation 0 that
  remap is the identity, so a group's real world tiles can be computed
  directly as `(origin_x + gc, origin_y + gr, tileIds[gr*cols+gc])` for every
  non-`-1` entry (skipping holes), with no solver/group-awareness needed at
  all. Collecting an entire area's pattern tiles **and** every group's
  individual tiles into one `paint_tiles` array and issuing a single call
  cut this session's workload from an estimated 500+ tool calls (one
  `paint_group`/pattern-tile call each) down to ~10 (one `paint_tiles` call
  per area). `paint_tiles` handles large arrays fine in one call (tested up
  to 398 entries, ~21KB of JSON) — its per-tile response is verbose enough
  that large calls get auto-redirected to a file rather than inlined, which
  does **not** meaningfully consume context, so batching large arrays is safe
  to do freely. **This shortcut only applies at rotation 0** — a rotation
  test (see below) genuinely needs `paint_group`'s remap and cannot be
  batched this way.
- **Rotation-test areas need `paint_group`, not `paint_tiles`, and need
  rotated footprint dimensions during packing.** To build areas showing every
  multi-tile group rotated 90°/180° (done for tcn01: `tcn01_rot90`,
  `tcn01_rot180`), compute each group's *rotated* footprint first —
  `rotated_dims(cols, rows, rotation) = (rows, cols) if rotation is odd else
  (cols, rows)` — and pack using those swapped dimensions (the packer must
  reserve space for the shape the group will actually occupy after rotating,
  not its native shape). Place with `paint_group`'s `rotation` param
  (`"1"`/`"2"`/`"3"` for 90°/180°/270°), which performs the real internal
  grid-slot remap `paint_tiles` cannot.
- **Pattern tiles as a compact "every tile" stand-in.** Raw tile IDs within a
  tileset are mostly cosmetic model variants of the same corner pattern —
  showing every tile ID would be enormous and largely redundant. One
  representative tile per distinct corner-terrain pattern (the keys of
  `tileCatalog` from `get_tileset_details(detail:"full")`) is a much more
  compact and still-complete visual survey of the tileset's terrain-matching
  behavior.
- **World-coordinate note**: a 32x32 area's center in world units is
  `(160, 160)` — 16 tiles × 10 world-units/tile per axis. Useful for placing
  a center waypoint/module entry point without needing `adventure_find_walkable`
  first, when the center tile is known to be walkable.
- **A tileset's terrain can be genuinely, entirely non-walkable — this is a
  real property to report, not a bug.** `dag01`'s default "black" terrain
  fill (`adventure_find_walkable` returning zero candidates anywhere in a
  0-320,0-320 bounding box on `dag01_32`) is a legitimate finding about that
  tileset, confirmed by exhaustive search rather than a single failed probe.
- **Survey areas built this way are intentionally standalone/unreachable.**
  `check_area_connectivity` correctly reports every survey area as
  unreachable from the module's start area — expected and fine for a
  reference/inspection module with no gameplay transitions; do not "fix" this
  by wiring transitions unless the user asks for a playable module.
