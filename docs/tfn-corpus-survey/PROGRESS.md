# TFN corpus survey — progress checkpoint

Source: `~/tfndev` — "The Frozen North" persistent world (live, hosted, GFF-JSON
nasher source tree at `~/tfndev/src/`). Used as a large, real, polished corpus to
calibrate/extend nwn-mcp's `adventure-*` skills, complementing the smaller
per-biome area corpora already baked into `area-*` skills.

Resumable: this file tracks status per category. If interrupted, resume at the
first `pending`/`in-progress` row. Raw computed stats live alongside this file
as `<category>_raw.json`; narrative findings as `<category>.md`.

| Category | Source dir(s) | Count | Status | Findings file |
|---|---|---|---|---|
| Actors (creature blueprints) | `src/utc` | 505 | **done** | `actors.md` |
| Dialogs / quest logic | `src/dlg`, `src/nss` | 416 dlg, 2262 nss | **done** (script idioms deferred to the Scripts row) | `dialogs.md` |
| Items / rewards | `src/uti` | 1358 | **done** | `items.md` |
| Encounters | `src/ute` | 128 | **done** (low relevance — pipeline uses static placement, not `.ute`) | `encounters.md` |
| Areas (cross-check vs existing area-* norms) | `src/are`, `src/git`, `src/gic` | 504 | **done** — density finding resolved; forest/underdark follow-up done, no change applied, second decision point open | `areas.md` |
| Placeables / environment density | `src/utp` | 122 | **done** (density covered by areas.md; tile/terrain-positioning corpus — item 5 — now also done, partial tileset coverage) | `areas.md`, `placeables.md` |
| Doors / triggers / area-connections | `src/utd`, `src/utt` | 10, 21 | **done** (door-count-per-area covered by areas.md; blueprint variety low, not separately notable) | `areas.md` |
| Stores | `src/utm` | 27 | **done** | `stores.md` |
| Scripts — quest/loot/spawn idioms | `src/nss` | 2262 | **done** (targeted grep pass, not exhaustive — loot system covered in actors.md) | `scripts.md` |
| Combat balance by CR (stats/HP/AC) | `src/utc` (CR-banded) | 201 pure-PC-class | **done**, incl. follow-ups (ability-score-by-role: confirmed + extended; gear-value-by-CR: attempted, inconclusive) | `balance.md` |

## Decision point 4 — resolved same session

4. **Forest/underdark density "reversal"** — retracted. It was a population-mixing
   artifact: TFN's forest/underdark corpora blend large wilderness-*travel* zones
   (sparse by design, correctly so) with small named *destination* areas (what
   `/create-adventure` actually builds). Split on that line, `ttu01`'s destination
   subset is denser than published (70.0 vs 60) and `ttf01`'s moves back toward
   published (48.2 vs 58) — consistent with the original finding, not a reversal
   of it. No SKILL.md change applied. See `areas.md`'s "Forest/underdark
   cross-reference" section for the full split and numbers.

## Decisions from the 3 pending items — all resolved

1. **Area density/doors qualifier** — done. `area-city-interior`, `area-rural`,
   `area-city-exterior` SKILL.md files updated with purpose-scoped density
   guidance + a `check_area_connectivity` linkage rule. `area-castle`/
   `area-dungeon` deliberately left untouched (finding doesn't apply to
   their purpose). See `areas.md`'s "Resolution" section.
2. **Co-op-rule scoping nuance** — done. Added to `adventure-quests` and
   `quest-explorer` SKILL.md files (not CLAUDE.md, per user's call). See
   `scripts.md`.
3. **`verify_creature` ranged/ammo check** — done. Implemented in
   `src/util/verify/blueprints.ts` (error severity, gated on `resmanOpts`
   being available), wired through both `verify_creature` and `verify_all`
   in `src/tools/verify-tools.ts`, 2 new tests added, full `npm run verify`
   gate passes (343 tests). Not yet committed to git.

## How each pass works

1. Pure-Python aggregate analysis directly over the `.json` GFF source (no
   binary conversion needed — already nasher-extracted) — fast, no MCP tool
   round-trips needed for bulk stats.
2. Cross-reference findings against the relevant `SKILL.md` file(s).
3. Where a finding is concrete and high-confidence (not just "different from
   what we do"), fold it into the skill doc directly, same bar as this
   session's `cls_feat_*` and companion-chassis fixes.
4. Where a finding needs deeper script reading (e.g. `inc_loot.nss`, 1690
   lines) it's flagged as a pointer, not fully absorbed, to keep survey passes
   fast — a follow-up pass can go deeper on a specific flagged file.
