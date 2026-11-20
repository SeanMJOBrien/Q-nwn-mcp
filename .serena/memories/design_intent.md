# Design intent

Two purposes:
- (a) AI-assisted human module design: the human keeps creative control; the AI builds/edits via natural language.
- (b) AI-driven one-shot adventures for the user and friends, spoiler-free so the DM is surprised too: `/create-adventure` orchestrates the `adventure-*` sub-skills (plot, areas, environment, actors, quests, challenges, affordances, polish, rewards) with `phase_check` gates.

A new adventure is always its own new module (`create_module`), using base-game tilesets/creatures/items directly; never built inside an existing or test module.

Story record (`<Title>.md`, the single source of truth): `## Module` fields, `## Plot` (Premise, Locations with Resref/Role in Story, Connections, Key NPCs with Motivation, Antagonists, Quest Objectives, Challenges, Story Graph `- beat B1 | ...`/`- thread T1 | ...`, Loot), then one section per phase. Downstream skills parse by heading name. The plot must record a motive for every key NPC and the antagonists, a beat for every location, and a story graph from 3 locations (enforced, see `mem:domain/verification`). Where the pipeline flattens story: `docs/story-vs-pipeline.md` (TODO #42-#50).

Session flow and user rules: `mem:workflow/user_rules`.
