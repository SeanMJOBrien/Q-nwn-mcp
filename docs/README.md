# docs/ — which document answers which question

> **File names:** `adventure.md`, `dm-guide.md`, `adventure-status.json` and `project-scope.json` named in these documents are the adventure's title-based files (`<Title-With-Dashes>.md` etc., since 2026-11-11); `get_adventure_dir` returns the real paths.

| Question | Read |
|---|---|
| What does a typical level-7 fighter or a CR-5 undead look like (HP, AC, gear), to use as a template? | [creature-catalog.md](creature-catalog.md) — generated; `list_creature_samples` |
| What treasure (value, tier, properties) fits a party of level N, taken from a hand-built world's items? | [treasure-catalog.md](treasure-catalog.md) — generated; `list_treasure_samples`, `import_treasure_item` |
| How do I make containers and rewards give random level-appropriate treasure (weights by area CR)? | [treasure-system.md](treasure-system.md) — `create_treasure_system` |
| How do NPCs get varied player-character looks (head, skin, hair, voice by gender)? | [npc-appearance.md](npc-appearance.md) — automatic in `create_creature_blueprint`; `randomize_npc_appearance` for an existing module |
| Which creature tool do I use? Which ones are deprecated? | [creature-tools.md](creature-tools.md) |
| Can quests, companions and checks be tested without a player? | [player-simulation.md](player-simulation.md) |
| How will a module be stored as a project and built on request (design, TODO #29)? | [module-projects.md](module-projects.md) |
| How do skill-check puzzles and per-player rewards work in co-op? | [coop-skill-checks-and-rewards.md](coop-skill-checks-and-rewards.md) |
| What is open, in what order, with what acceptance test? Full history of every numbered TODO? | [todo-archive.md](todo-archive.md) and [work-plan.md](work-plan.md) |
| Comprehensive two-tier test harness notes? | [testing-history.md](testing-history.md) — moved out of CLAUDE.md |
| Gear appearance TODO, weapon preferences, equip_npc_by_role, build_npc_stat_block, creation order? | [gear-and-npc-generation-history.md](gear-and-npc-generation-history.md) — moved out of CLAUDE.md |
| Companion findings, random and special abilities, simple-NPC tier, open TODOs (appearance randomisation, level-up after bake, quickbar)? | [henchmen-and-caster-history.md](henchmen-and-caster-history.md) — moved out of CLAUDE.md |
| Building survey areas: 32x32 limit, packing, paint_tiles batching? | [survey-areas-notes.md](survey-areas-notes.md) — moved out of CLAUDE.md |
| Area prefabs, flat-space reservation, rebuild one area, per-module git repo, tileset survey TODOs, tooling that prevents repeat mistakes? | [area-todos-and-tooling-history.md](area-todos-and-tooling-history.md) — moved out of CLAUDE.md |
| Stamped-group rotation, entrance detection, avenue preservation, rotation-handedness saga? | [layout-rotation-history.md](layout-rotation-history.md) — moved out of CLAUDE.md |
| Why does each `verify_*` check exist, how does live verification work, what did the playtest rounds find? | [verification-history.md](verification-history.md) — moved out of CLAUDE.md |
| What went wrong before, and which tool-call pitfalls exist (GFF edit order, field names, rotation, doors, gear)? | [pitfalls.md](pitfalls.md) — full record moved out of CLAUDE.md |
| Where does an object go, which way does it face, what is its Z? Why do tiles rotate the way they do? What is a tileset's height step? | [object-placement-and-tilesets.md](object-placement-and-tilesets.md) — verified spatial conventions, with the real-data evidence and the tools' resulting behaviour |
| What does the area generation pipeline do, step by step, in plain language? | [AREA_GENERATION_PIPELINE.md](AREA_GENERATION_PIPELINE.md) |
| What does each of the 9 `/create-adventure` phases decide, in what order, and what takes priority when things compete (budget, space, attention)? | [MODULE_CREATION_PIPELINE.md](MODULE_CREATION_PIPELINE.md) |
| What is every rule, formula and threshold in the `/create-adventure` pipeline and its tools? (and where do skills and code disagree?) | [generation-rules-reference.md](generation-rules-reference.md) |
| How should multi-room architecture be stamped instead of solved tile by tile? *(design only, not implemented)* | [area-prefabs-spec.md](area-prefabs-spec.md) |
| How does the encounter-difficulty checker combine creatures, and what happens with an unset CR? | [encounter-difficulty-findings.md](encounter-difficulty-findings.md) |
| How would an LLM ask for "a necromancer for a CR 6 battle" and get a built, balanced roster back? *(design only, not implemented)* | [encounter-composer-spec.md](encounter-composer-spec.md) |
| How should any creature be built, levelled up or down, and changed in appearance from one declarative spec? *(spawn-time levelling built: `forge_creature`, `create_creature_level_system`; rest is design)* | [creature-forge-spec.md](creature-forge-spec.md) |
| How do I build creatures and companions with the forge, and what does it do step by step (logic flow, in-game checks, locals)? | [creature-forge-manual.md](creature-forge-manual.md) |
| How do `phase_check`, `suggest_area_size`, `place_tile_doors`, `build_companion`, the generic `q_check`/`add_skill_check`, quest spawning and `skill-lint` work? How do I rework an existing module? | [adventure-tooling-reference.md](adventure-tooling-reference.md) |
| How should a session start, which category of help maps to which phase and skill, and how is an existing incomplete module audited? | [guided-workflow.md](guided-workflow.md) *(design; scope tool built)* |
| How are an adventure's size, events, encounter kinds, multi-part encounters and story threads planned and checked? | [adventure-composition.md](adventure-composition.md) |
| How do quests work, and what can a `build_quest` spec say (stage kinds, templates, `q_chk`/`q_act` parameters, whole-party credit)? | [quest-system.md](quest-system.md) |
| How does the parametrized PQJ quest system work? | [pqj-quest-system.md](pqj-quest-system.md) |
| Where does the pipeline flatten or drop the story it was meant to tell? | [story-vs-pipeline.md](story-vs-pipeline.md) |
| How is a quest built without an LLM (CLI, manager console, studio), and what is left to do? | [quest-cli.md](quest-cli.md), [quest-frontends-work-plan.md](quest-frontends-work-plan.md) |
| How could a local model (Qwen) drive this project, and what still needs an LLM? | [local-model-guide.md](local-model-guide.md) |
| Which bugs in TFN's quest scripts are confirmed, and what is the plan to port our quest fixes to the content studio? | [tfn-quest-findings.md](tfn-quest-findings.md) |
| What happened when random caster abilities ran on a real headless server? | [random-abilities-runtime-findings.md](random-abilities-runtime-findings.md) |
| How does the Special-Abilities caster system (the project-wide default) work, and how does a DM actually see/use the abilities in-game? | [special-abilities-system.md](special-abilities-system.md) |
| Can a module be run to verify behaviour the static `verify_*` tools cannot see? | [runtime-verification-spec.md](runtime-verification-spec.md) |
| What is the full test plan and its test cases? | [TEST_PLAN.md](TEST_PLAN.md) |
| Which module exercises companions and the verification gate end to end? | [siege-module-spec.md](siege-module-spec.md) |
| What is planned next, in what order, and where does a new session resume? | [work-plan.md](work-plan.md) |
| What did the most complex real `/create-adventure` build teach us? | [six-fold-trial-build-notes.md](six-fold-trial-build-notes.md) |
| Can the TFN random-NPC / adventurer system be reused here? | [tfndev-random-npc-system-findings.md](tfndev-random-npc-system-findings.md) |
| What do real hand-built modules contain (actors, areas, balance, dialogs, encounters, items, placeables, scripts, stores)? | [tfn-corpus-survey/](tfn-corpus-survey/) — start with `PROGRESS.md` |
| How do the tileset water tiles look and behave? | [tileset-proving-grounds/](tileset-proving-grounds/) |

Conventions: findings documents state their evidence (corpus size, measured percentages) so they can be re-checked; the spatial
conventions are additionally enforced by `src/util/tile-oracle.live.test.ts` (env-gated; see the last section of
[object-placement-and-tilesets.md](object-placement-and-tilesets.md)).
