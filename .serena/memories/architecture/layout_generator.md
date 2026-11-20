# Layout generator (`src/util/layout-generator.ts`, `adventure_generate_layout`)

- One BSP pipeline for all 10 styles (interior: dungeon, cave, dwelling; exterior: forest, rural, city, plains, desert, castle, tundra), differentiated by `StyleConfig` presets (values: `docs/layout-rotation-history.md`).
- BSP rooms min 3x3, margin >= 2. `minLeaf = 6` is the one real constant for every style. `StyleConfig.splitThreshold` is dead (never read by `bspPartition`); do not wire it in without auditing every size figure (it would push 4-room minimums to 22x22/26x26).
- Real minimum for 4 rooms, any style: 14x14 total (12x12 playable). One room: 9x9 (`suggest_area_size`). 18x18 exterior is feature-fit headroom, not enforced.
- L-shaped rooms: sibling merge with `nonRectChance`. Corridors: axis-overlap straight, else L-bend; S-curves (`sCurveChance`) offset the middle third by 1 tile, bending only on interior wall tiles; `shortcutCount` T-junction shortcuts.
- Interior corridors = crossers of type `corridor` on wall tiles; never `doorway` (needs matched pairs). Exterior corridors carve floor zones, no crossers.
- Crosser edges point wall-to-wall only (never toward room tiles). No propagation onto tiles with any non-default corner. Tiles diagonal (not cardinal) to rooms are excluded from crosser paths (3-wall+1-floor has no crosser tile).
- Feature groups excluded when they have crosser edges or mismatched corner terrain. Door groups allowed only if every door tile's corners match the floor and no crossers (freestanding houses pass).
- `suggestedFeatures` packed to 50 %+ room coverage; `preferredFeatures` prioritises plot groups. Multi-tile groups are not rotation-safe: native rotation 0 (`docs/layout-rotation-history.md`).
- Validates terrain chains with `computeValidPairs()` (`src/util/zone-solver.ts`).
