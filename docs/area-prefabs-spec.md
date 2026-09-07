# Area Prefabs — design spec (future work)

**Status: not implemented.** This is a design spec for two follow-on approaches to
area-generation quality, written after `src/util/feature-collars.ts` (the cheap,
narrow fix — see `CLAUDE.md`'s "Pitfalls Found by Building a Real Module") went in.
Both approaches below trade more up-front implementation for handling architecture
the collar system can't: multi-room set-pieces, not just a single feature's
immediate surroundings.

The core idea: instead of procedurally reconstructing complex architecture
tile-by-tile via corner/crosser matching rules (fragile — see this whole session's
worth of bug reports), hand-author it once, verify it once, and stamp the verified
result into generated areas as an atomic, indivisible unit. This is a standard
technique in procedural level generation (hand-designed "set-piece rooms" stitched
into procedurally-arranged levels).

---

## Approach A — Prefabs as oversized feature groups

**What it is:** Today's feature groups (Tower Hill, Stables, CityGate_2x2 — see
`get_tileset_details`'s `groups` array) are small (1x1 to 4x4), tileset-native, and
placed by `packFeatures`/`adventure_apply_layout` via the existing terrain-matching
pipeline. This approach extends the *same* mechanism to much larger, *user-authored*
prefabs (e.g. 16x14), carrying their own tile grid **and** their own GIT content
(doors, placeables, waypoints) — something no existing tileset-native feature group
does today.

### Deliverable — what you'd hand-build

**Yes, essentially what you described**: a small, purpose-built, standalone area —
walls, gate, courtyard interior, castle exterior model — built and visually
confirmed correct in the toolset, containing *only* that architectural piece. No
plot, no quests, no unrelated dressing.

Concretely:
1. **Size the area to the exact prefab footprint** (e.g. `create_area` at 16x14),
   rather than building it as a subsection of a bigger area and asking someone to
   pick a bounding box out of it later. This removes an entire class of ambiguity —
   the area's full extent *is* the prefab, no separate "which rectangle did you
   mean" step needed for a first version of the extraction tool.
2. **Keep the outer ring of tiles simple and uniform** — ideally one terrain, no
   partial transitions right at the boundary (e.g. the whole outer edge is `grass`,
   not `grass` fading into `dirt` right at the last tile). That outer ring becomes
   the prefab's declared "boundary signature," which the placement tool has to
   match or blend against whatever surrounds it wherever it gets stamped later. A
   simple, uniform boundary is trivial to match; a boundary that's itself mid-
   transition would need extra metadata this v1 doesn't have.
3. **Decide how much interior dressing to include.** Two options, with a real
   tradeoff:
   - Include the walls/gate/towers/courtyard *pavement* (the structural, expensive-
     to-regenerate-correctly part) but leave loot, creatures, and decorative
     placeables **out** — those get added per-instance by the existing
     `adventure-environment`/`adventure-affordances`/`adventure-challenges` skills
     after stamping, so every use of the same prefab in a module doesn't look and
     play identically.
   - Include *everything*, including decoration — simpler to build, but every
     stamped instance is visually identical unless the prefab library has several
     variants.
   Recommend the first: structure in the prefab, dressing added downstream.
4. **Build it in the target tileset** (`tno01` for a castle exterior, etc.) — the
   prefab is tileset-specific; it can't be stamped into an area using a different
   tileset.
5. Hand it off as the built `.mod` (or the extracted temp-dir `.are`/`.git`/`.gic`
   trio) — an extraction tool (see below) reads the *entire* area, not a selected
   sub-region, for v1.

### Data format

A prefab asset needs:
- `width`, `height`, `tileset` resref.
- Per-tile `{tileId, orientation}` (straight copy of the source area's `Tile_List`).
- The four edge terrain signatures (what terrain the outermost ring of corners is),
  derived automatically from the tile data at extraction time — used to validate
  compatibility wherever it's later stamped.
- GIT content within the footprint (Door List, Placeable List, Waypoint List, etc.)
  with **local** coordinates (offset from the prefab's own origin) rather than the
  source area's absolute world coordinates — these get re-offset at stamp time.
- A declared name/tag and free-text description for a human (or LLM) picking from a
  prefab library later.

### New tools needed

- `extract_prefab(sourceArea, prefabName)` — reads a fully-built area's ARE tile
  grid + relevant GIT lists, computes the boundary signature, and writes a prefab
  asset (a new resource type, or just a JSON sidecar file alongside the module's
  other cached data — doesn't need to be a GFF format).
- `stamp_prefab(targetArea, prefabName, x, y)` — copies the prefab's tile grid into
  the target area's `Tile_List` at the given offset, offsets and copies its GIT
  content into the target area's own GIT lists, and validates the boundary
  signature against whatever's already at that position in the target area
  (reject, or at minimum warn loudly, on a mismatch — don't silently paint a seam).

### Integration into the generation pipeline

Reuse `packFeatures`' existing per-room placement loop almost unchanged: a prefab
is just a much bigger "feature," selected the same way `preferredFeatures` are
today, with the same terrain-matching pre-check (now checking the prefab's boundary
signature instead of a feature group's own corners) before being handed to
`stamp_prefab` instead of the existing tile-array-push logic. The room the BSP
generator picked needs to actually be big enough — this only works cleanly when a
prefab this large is deliberately requested at generation time with `rooms` sized
accordingly (e.g. a 16x14 prefab needs roughly a 16x14+ room, so the caller needs
to know this ahead of generating the layout, not discover it after).

### Open questions

- **Rotation/mirroring**: should a prefab support being stamped rotated 90/180/270,
  or only in its authored orientation? Rotating a whole multi-tile block (grid +
  corner data + GIT object local coordinates, including door bearings) is real
  additional work beyond the single-tile rotation math already verified this
  session — worth deferring to a v2 if the first library entries don't need it.
- **Multiple variants of the "same" prefab** (e.g. three different castle gates) to
  avoid every generated module having an identical-looking castle — a curation
  question, not a technical one, but affects how big a prefab library needs to be
  before this feels varied rather than repetitive.

---

## Approach B — Prefabs as whole rooms

**What it is:** For something the size of a walled castle compound, treating it as
a decoration *inside* an existing room (Approach A) undersells it — it really is a
room (or several), with its own interior space, not a facade bolted onto a room the
BSP generator shaped independently. This approach has the prefab **replace** a BSP
leaf outright: the generator picks a leaf sized to roughly fit the prefab, and
instead of running `bspPartition`'s normal room-shaping + `packFeatures` for that
leaf, it stamps the whole prefab there — walls, gate, interior space, and all — and
wires corridors into it from designated attachment points rather than a generic
room-boundary edge.

### What's different from Approach A

Approach A's `stamp_prefab` still assumes the *surrounding* corridor network reaches
a generic room edge, same as any BSP-shaped room. Approach B's prefab needs to
**declare where corridors are allowed to connect** — e.g. "the gate at world-
relative position (8,0), facing south, is the only valid entrance" — and
`connectRooms()`/the shortcut-corridor logic needs to target that declared point
instead of picking the closest edge tile of a generic rectangular room the way it
does today (see `pickClosestSubRoom` in `layout-generator.ts`).

### New concepts needed (beyond Approach A's)

- **Connection-point metadata** on the prefab: one or more `{x, y, facing}` entries
  marking where a corridor is expected to attach (analogous to how
  `computeTransitions()` already picks specific edge tiles for area-to-area
  transitions — the same kind of "designated exit point" concept, just applied to
  intra-area corridor routing instead).
- **BSP leaf selection sized to the prefab**, not the other way around — today's
  `bspPartition` shapes leaves first and hopes a feature fits inside one afterward;
  this needs the reverse for large prefabs (know the prefab's footprint before
  partitioning, and either force a leaf boundary at that size or post-hoc merge
  several small leaves into one prefab-sized region).
- **Corridor-routing changes**: `connectRooms()` and the shortcut-corridor logic
  need a variant that targets a declared connection point rather than computing the
  closest room-edge tile generically.

### Why this is bigger scope than Approach A

Approach A reuses ~90% of `packFeatures`' existing machinery (room iteration,
terrain pre-check, warning-based rejection) with a new tile-copy step in place of
the small per-tile push loop. Approach B touches the BSP partitioning step and the
corridor-routing step — two of the generator's core algorithms — not just the
feature-placement pass at the end. **Recommend proving the concept with Approach A
first** (cheaper, and the extraction/stamping/boundary-validation plumbing is
shared infrastructure either way), then revisiting whether Approach B's deeper
integration is worth it once there's a real prefab library to stamp.

---

## Suggested sequencing

1. Build `extract_prefab`/`stamp_prefab` (Approach A's tools) against one real,
   hand-built prefab (a good first candidate: the castle-wall-and-gate example
   already discussed) to prove the format and validation logic end-to-end.
2. Grow a small library of 3-5 prefabs across a couple of tilesets before judging
   whether the approach is worth investing further in.
3. Only then evaluate Approach B, informed by which prefabs in the library actually
   *want* to be whole rooms rather than room decorations.

---

## TODO — user builds a starter prefab library

**Owner: the user, in the toolset — not something to generate.** The whole point of
a prefab is that a human already looked at it and confirmed it's right; an
LLM-generated "prefab" would just be reintroducing the same fragile procedural
generation this system exists to route around. Build these in the target tileset,
sized exactly to their own footprint, outer ring of tiles kept to one uniform
terrain (see the confirmed understanding above — that's what lets a later
`stamp_prefab` validate/blend the seam against whatever the generator painted
around it, with no extra metadata needed).

Recommended sizing convention while there's no tooling yet to enforce it: pick
footprints that are exact multiples of a "room-sized" chunk (e.g. 8x8, 12x12,
16x16) rather than odd dimensions — makes it much easier for a future `packFeatures`
integration to know what room size to request from the BSP generator to fit one.

### Batch 1 — build these first (prove the format, cover the most-reused motifs)

1. **Castle gate + flanking wall** (`tno01`) — the example already discussed.
   ~16x8: wall section, corner towers, working gate, a few tiles of rampart on
   each side. This is the one to build first and run all the way through
   `extract_prefab`/`stamp_prefab` before building anything else, since it's the
   one already fully discussed and the one the tooling above will be proven
   against.
2. **Village crossroads** (`ttr01`) — ~16x16: a road junction, 2-3 small
   buildings (no interiors needed, exterior tileset), a well or shared market
   stall. Rural exteriors are used constantly and roads/junctions are exactly
   the kind of multi-tile-with-crossers structure the solver handles least
   gracefully today.
3. **Tavern interior** (`tin01` or `tni01`) — ~10x8: bar, tables, a hearth, a
   back room or stairs-up. Probably the single most-reused interior shape across
   any adventure module; worth getting right once.
4. **City gate + flanking wall** (`tcn01`) — mirrors the `tno01` castle gate but
   in the city tileset (the exact feature the `CityGate_2x2` collar fix targeted
   this session) — a second gate prefab proves the pattern isn't tno01-specific.
5. **Sewer/dungeon junction with a working gate** (`tds01`) — ~10x10: the
   fence-door/gate motif already hand-tested this session, built out into a full
   junction room rather than a single inserted door.

### Batch 2 — extended library (broader tileset + motif coverage)

**Exterior:**
- Keep/tower cluster (`tno01`) — a freestanding tower complex, distinct from the
  gate (different room-shape problem: tall vertical silhouette, not a wall run).
- Drawbridge over a moat/chasm (`tno01`) — bridge crossers + water/cliff terrain
  adjacency, another spot the solver struggles with multi-terrain transitions.
- Farmstead (`ttr01`/`tts01`) — barn, house, fenced paddock.
- Docks/harbor section (`tcn01`) — water edge + ship features (the group-member
  ships flagged as excluded from the water-tile gallery earlier this session —
  a prefab sidesteps that limitation entirely, since the whole dock scene is
  hand-placed rather than solver-assembled).
- Market square/plaza (`tcn01`) — stalls arranged around open cobble space.
- Oasis settlement (`ttd01`) — water + building terrain meeting mid-desert.
- Ruined amphitheater section (`tdr01`) — collapsed/overgrown architecture,
  a motif the solver has no vocabulary for (partial destruction isn't a
  terrain-corner concept).
- Frost giant / barbarian camp (`tti01`) — ties into the cave-entrance work
  already done for this tileset.

**Interior:**
- Throne room (`tic01`) — large single room, elevated dais, guard alcoves.
- Prison/dungeon cells block (`tic01` or `tde01`) — repeated small cells off a
  corridor, a shape the BSP room generator doesn't naturally produce.
- Shop interior (`tin01`/`tni01`) — counter, shelving, back storage.
- Burial chamber (`tdc01`) — sarcophagi, a chapel alcove.
- Underground lake/lava crossing (`tdm01`) — bridge crossers over a hazard
  terrain, the same class of problem as the drawbridge above but interior-scale.
- Boss/vault chamber (`tde01`) — a deliberately large, dramatic single room
  distinct from the generator's normal room-size distribution.

Cross off/replace entries freely — this is a starting brainstorm, not a fixed
spec. The goal of Batch 1 is proving the pipeline works at all; Batch 2 is where
tileset/motif *coverage* actually starts to matter.
