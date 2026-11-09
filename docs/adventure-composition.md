# Adventure composition: sizes, encounters and stitching a story

Answers to the questions behind CLAUDE.md TODO #21, what is built for each, and what is still open. The numbers are first estimates;
tune them against real builds. Tool details: [adventure-tooling-reference.md](adventure-tooling-reference.md) §11–13.

## How many areas, and how large?

- **Number of areas** comes from play time. `plan_adventure_shape(playMinutes, …)` (`src/util/adventure-shape.ts`): events fill the time at
  an average of about 9 minutes each (per-kind minutes in `KIND_COST`), one boss per ~90 minutes, 2 events per area up to 90 minutes, 3 up to
  4 hours, 4 beyond; at least 2 areas. A 3-hour run comes out as about 20 events over 7 areas.
- **Size of an area** comes from its events: `suggest_area_size` (a base footprint per biome plus tiles per extra event, 32 per side at
  most; cabin 2×2, inn 2×4, forest 4×4 or a 3×10 road). `plan_adventure_shape` also adds up the open ground each kind of event needs
  (`KIND_COST.tiles`) and warns when an area's events want more than `suggest_area_size` gives.
- Not done: nothing yet changes the plan from party size (it only sets encounter strength later), and the tile needs are guesses.

## Which encounters, and how many per area?

Kinds (`ENCOUNTER_KINDS`), with the ground each needs and the minutes it takes:

| Kind | Minutes | Tiles | What it is |
|---|---|---|---|
| combat | 12 | 30 | a fight with a group |
| ambush | 12 | 20 | a fight that starts by surprise; the group waits out of sight |
| boss | 22 | 80 | the named antagonist and escorts (`compose_encounter`) |
| chain | 24 | 60 | scouts or a lookout first, then the main force (below) |
| social | 8 | 6 | persuasion, bluff, a negotiation (`check` on a talk stage) |
| obstacle | 5 | 8 | a check gate: stuck door, climb, ford (`add_skill_check`) |
| trap | 3 | 6 | a hazard with a check and damage (`add_skill_check`) |
| discovery | 6 | 6 | a clue, a find, a lore moment (`search` stage) |
| friendly | 6 | 10 | a merchant, a traveller, an ally who joins, a rival party |
| rest | 3 | 12 | a safe camp or an inn |

Mix of the non-boss events: combat 26%, social 14%, discovery 12%, friendly 11%, chain 10%, obstacle 10%, ambush 8%, trap 6%, rest 3%.
The order puts a friendly or discovery event first and the boss last; the middle alternates kinds so no two fights run back to back
when the plan can avoid it. Per area, the count is the plan's events-per-area (2–4).

## Friendly encounters

They are a kind in the plan, so they are placed on purpose instead of by luck: a merchant (`/adventure-affordances`), a traveller who
gives a clue or a quest, a recruitable companion (`build_companion`), an ally who joins for one quest (`join`/`dismiss` on a quest
stage), a safe camp or inn (`rest`). Rule already in `/adventure-challenges`: no hostile within 8 tiles of a friendly NPC.
Not done: a rival party (hostile-or-friendly depending on an earlier choice) has no spec shape.

## Multi-part encounters (a lookout, then the main force)

Built. A `spawn` on an event stage (kill, pickup, explore, trigger, use, search) writes `questK_spawn*` locals on that stage's object and
`QuestAdvance` calls `QuestSpawn` when the stage advances:

1. Stage 2 `kill` the lookout, with `spawn: {resref: <main force>, area|at: …, count: 3, tag: …}`. The lookout is placed; the main force isn't.
2. Killing the lookout advances stage 2, which creates the main force at a waypoint (placed by the builder on walkable ground), once.
3. Stage 3 `kill` the main force (its death script is on the blueprint, which the spawned copies inherit).

The spawn can also hang on an `explore` or `trigger` stage (entering a place brings the reinforcements) or on a `search` (opening the
chest sounds an alarm). Not done: the second part changing with the outcome of the first (an alarm raised, a patrol missing, a prisoner who
talks). The module local `QS_SPAWN_<key>` and the stage variables are the hooks: a `chain` that reads "if the lookout was killed within N
rounds, spawn fewer" needs a small `QuestSpawn` variant that reads a flag. Also not done: a `verify_encounter_chain` check (every stage
reachable, every spawn waypoint present); `verify_quest_completability` already reads the quest variables.

## Building from a rich story

`/adventure-plot` Phase 1b: when the user gives a story, a setting or separate vignettes, split it into beats and map them onto
locations, events and quests, keeping the user's names and wording; invent only to connect and say which parts are invented. The
`Story Graph` section holds the beats. Not done: a tool that reads an uploaded document and proposes the beats (the model does it by
reading); there is no import format.

## Stitching encounters and vignettes into one narrative

- **The story graph** (`### Story Graph` in `adventure.md`): `- beat B1 | title | act | area | leads | gives | needs` and
  `- thread T1 | title | planted | paid`. `verify_story` (and `phase_check` at the end of `plot` and `polish`) checks: every beat reachable
  from the first, every lead and area exists, an ending exists, every needed clue is given (warning if only one beat gives it),
  every thread's payoff reachable from where it was planted.
- **Clues have two routes.** The warning for a single-route clue is the rule that a missed search can't stall the story.
- **Escalation order** is `act` (setup, complication, turn, climax, resolution); a lead that goes back an act is a warning.
- **Recurring people and objects** are the quest layer: the same giver, item and NPC tags across stages. Not checked yet.

## A larger narrative from the parts

- **Through-line:** one threaded motive that each area's content reflects. The Hollow Communion only got Venn's motive after the fact; a
  `thread` for it, planted in the first area and paid in the last, would have forced it earlier. `story_no_threads` warns when there are none.
- **Acts:** `plan_adventure_shape` assigns acts over the areas in order (first quarter setup, to 65% complication, then turn, last area climax).
- **Not done:** a theme/tone list the polish pass checks content against; per-beat journal entries generated from the graph.

## What is built and what is not

Built: `plan_adventure_shape`, `verify_story`, `phase_check` story check and declared skips (TODO #20), spawn on event stages, the plot skill's
intake, shape and graph steps, the challenges skill's kinds note. Open: outcome-dependent chains, `verify_encounter_chain`, a rival-party shape,
theme checking, recurring-NPC checks, and tuning every number above against real builds.
