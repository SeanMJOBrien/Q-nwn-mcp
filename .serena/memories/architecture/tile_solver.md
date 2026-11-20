# Tile solving (`src/util/zone-solver.ts`, `adventure_apply_layout`)

- `adventure_apply_layout` applies zones + crossers + features atomically. `paint_tiles`/`paint_group` place tiles directly, no solving.
- Tile choice depends only on: corner terrains (TL/TR/BL/BR), corner heights, edge crossers (Top/Right/Bottom/Left), orientation. `.set` `[PRIMARY RULES]`/`[SECONDARY RULES]` are toolset autotiling: ignore them.
- `Tile_Orientation` n = n x 90 deg counter-clockwise. `.set` corners/heights/crossers are already GIT-orientation-0: use as written, never un-rotate by the `.set` `Orientation` field (oracle: 99.99 % agreement). Rotate a placed tile with `getRotatedCorners/Crossers/CornerHeights(tile, gitOri)`. `.set` `Orientation` is the model's authored angle: only a preference (avoid non-native rotations).
- Solve order bottom-to-top, left-to-right. Fallbacks: (1) exact corners+crossers, (1.5) adjust free corners keep crossers (corridor mouths), (2) exact corners drop crossers, (3) adjust corners drop crossers, (4) all-default. Adjustments written back to the corner grid.
- Terrain adjacency: only pairs with transition tiles may touch; the solver never invents a buffer. Check `get_tileset_details` first. Chains: `tno01` Trees -> Grass -> CastleWall -> Dirt; `ttr01` Trees -> Grass (+ Water, Dirt).
- Repeated ground fill: prefer the plainest/low-polygon tile variant.
- Survey areas (32x32 limit, batching): `docs/survey-areas-notes.md`. Ground height and rotation maths: `mem:domain/spatial`.
