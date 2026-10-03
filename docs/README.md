# docs/ — which document answers which question

| Question | Read |
|---|---|
| Where does an object go, which way does it face, what is its Z? Why do tiles rotate the way they do? What is a tileset's height step? | [object-placement-and-tilesets.md](object-placement-and-tilesets.md) — verified spatial conventions, with the real-data evidence and the tools' resulting behaviour |
| What does the area generation pipeline do, step by step, in plain language? | [AREA_GENERATION_PIPELINE.md](AREA_GENERATION_PIPELINE.md) |
| What is every rule, formula and threshold in the `/create-adventure` pipeline and its tools? (and where do skills and code disagree?) | [generation-rules-reference.md](generation-rules-reference.md) |
| How should multi-room architecture be stamped instead of solved tile by tile? *(design only, not implemented)* | [area-prefabs-spec.md](area-prefabs-spec.md) |
| How does the encounter-difficulty checker combine creatures, and what happens with an unset CR? | [encounter-difficulty-findings.md](encounter-difficulty-findings.md) |
| How does the parametrized PQJ quest system work? | [pqj-quest-system.md](pqj-quest-system.md) |
| What happened when random caster abilities ran on a real headless server? | [random-abilities-runtime-findings.md](random-abilities-runtime-findings.md) |
| Can a module be run to verify behaviour the static `verify_*` tools cannot see? | [runtime-verification-spec.md](runtime-verification-spec.md) |
| What is the full test plan and its test cases? | [TEST_PLAN.md](TEST_PLAN.md) |
| Which module exercises companions and the verification gate end to end? | [siege-module-spec.md](siege-module-spec.md) |
| What did the most complex real `/create-adventure` build teach us? | [six-fold-trial-build-notes.md](six-fold-trial-build-notes.md) |
| Can the TFN random-NPC / adventurer system be reused here? | [tfndev-random-npc-system-findings.md](tfndev-random-npc-system-findings.md) |
| What do real hand-built modules contain (actors, areas, balance, dialogs, encounters, items, placeables, scripts, stores)? | [tfn-corpus-survey/](tfn-corpus-survey/) — start with `PROGRESS.md` |
| How do the tileset water tiles look and behave? | [tileset-proving-grounds/](tileset-proving-grounds/) |

Conventions: findings documents state their evidence (corpus size, measured percentages) so they can be re-checked; the spatial
conventions are additionally enforced by `src/util/tile-oracle.live.test.ts` (env-gated; see the last section of
[object-placement-and-tilesets.md](object-placement-and-tilesets.md)).
