# Areas cross-check — TFN (504 areas) vs. existing `area-*` skill norms

## Headline finding: TFN is consistently denser than the documented corpus average

| Tileset | TFN n | TFN avg tiles | Doc avg tiles | TFN unique | Doc unique | TFN place/100t | Doc place/100t | TFN doors | Doc doors |
|---|---|---|---|---|---|---|---|---|---|
| `tdm01` (mines) | 122 | 126.7 | 112 | 33.8 | 30 | **32.6** | 23 | **2.2** | 1 |
| `tdc01` (crypt) | 40 | 96.8 | 90 | 28.8 | 30 | **37.8** | 32 | **5.3** | 3 |
| `tde01` (dungeon) | 22 | 91.0 | 81 | 27.8 | 28 | **49.6** | 23 | **5.3** | 3 |
| `tds01` (sewers) | 8 | 153.1 | 256 | 50.4 | 52 | **33.7** | 3.1 | **7.1** | 3 |
| `tic01` (castle interior) | 56 | 63.8 | 30 | **23.8** | 12 | **102.9** | 73 | **9.1** | 4 |
| `tno01` (castle exterior) | 12 | 457.7 | ~512 | **123.4** | 80 | **24.5** | 5.4 | **17.6** | 5 |

("Doc" columns = the measured norms already published in `area-dungeon`/
`area-castle` SKILL.md, corpus n=747/253/167/102/546/67 respectively.)

**Every single tileset checked shows TFN placeable density and door count
above — often well above — the documented corpus average.** `tds01`: 10x the
documented placeable density. `tno01`: 4.5x, plus 54% more unique tile
variety. `tic01`: 2x the unique tile variety, 41% denser placeables, more
than double the doors. This isn't one outlier tileset — it's the pattern
across all 6 checked (2 more, `tin01`/`ttu01`/`ttr01`, weren't cross-checked
against a documented baseline this pass since their SKILL.md tables weren't
re-read to confirm exact figures — flagged for a follow-up, not blocking).

## Why this is worth pausing on

The existing `area-*` skill tables are corpus averages across **28 different
repos** of unknown, mixed build quality. TFN is one project you specifically
named as "full-scale, well polished." The consistent direction of the gap
(never the other way — TFN is never *sparser* than the documented average)
is exactly what you'd expect if "well polished" correlates with "denser,
more doored, more tile-varied" than a mixed-quality average, which makes
sense: more furniture and more doors read as more finished, and higher tile
variety avoids repetition.

**This is a real decision point, not something to resolve unilaterally.**
Overwriting the published corpus means (n=747 etc.) with TFN's numbers alone
would be wrong — TFN is one project, not a re-run of the full 28-repo survey.
But leaving the tables as-is means anyone using them as a target is
calibrating toward an average that includes less-polished work.

## Resolution — done

User's call: qualifier notes only (published corpus numbers untouched), but
scoped by **area purpose**, not a blanket "aim higher" — a village/city's
value comes from shops (goods variety) and NPCs (quest exposition, lore),
so density should track that job, not sit at a mixed-purpose average. Also
asked for a capability caveat (dense settlement design may need a human
toolset pass) and, if derivable, concrete linkage rules for how shops/
structures connect via the tileset.

Applied:
- `area-city-interior/SKILL.md` — added a purpose-scoped density note.
  TFN's `tin01` median (not just mean, to rule out outlier skew) is ~169
  placeables/100 tiles vs. the documented 3.1 blanket figure — ~50x, because
  its shops/taverns are genuinely stocked and furnished. Also added the
  human-intervention caveat: dense, coherent shop furnishing is a harder
  autonomous judgment call than a sparse room, unmeasured by this pipeline.
- `area-rural/SKILL.md` — added the same purpose split (sparse open
  countryside stays sparse; a village center should target TFN's ~43
  placeables/100t and ~4 doors, not the blanket 4.5/1). Added a concrete,
  checkable linkage rule: every enterable building needs a door, every door
  needs `check_area_connectivity` to confirm it resolves to a real interior
  — that's the actionable form of "hard rule" available today without
  inventing untested placement algorithms.
- `area-city-exterior/SKILL.md` — TFN's own `tcn01` sample is too thin
  (n=3) to independently confirm its 11-doors figure, said so honestly,
  but cross-referenced that the same "polished = door-heavier" pattern held
  on every other tileset checked (including `tno01`). Added the same
  `check_area_connectivity` linkage rule.
- `area-castle`/`area-dungeon` — deliberately **not** touched. The user's
  rationale (shops, goods variety, NPC exposition) doesn't describe those
  biomes' purpose, so forcing the same qualifier on would be pattern-matching
  the finding rather than applying its actual reasoning.

## Not yet done

- `tin01`/`ttu01`/`ttr01`/`ttf01` etc. — computed TFN's own norms (see raw
  script output) but didn't cross-reference against their SKILL.md tables
  this pass.
- The placeable-density numbers above double as the "Placeables /
  environment density" survey category (marked done in PROGRESS.md on the
  strength of this pass — a separate placeable-type-composition pass, e.g.
  *which* placeable groups get used, was not done).
- Doors/triggers: blueprint-side (`utd`=10, `utt`=21) variety is low and not
  separately investigated — the door-*count*-per-area figures above are the
  actionable half of that category and are covered.
