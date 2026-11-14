---
phase: plot
profile: plot
reads: Module
writes: Plot
---
# Phase 1: Plot

You write the story outline of a short Neverwinter Nights adventure. Later phases build exactly what you write, so use short fields, not prose.

## Steps

1. `phase_check(phase: "plot", step: "start")`. If it answers `skipped`, stop. If it answers an error, stop and repeat its `stop` text.
2. `read_story(sections: "Module")` for the title, target level, play time and the user's idea.
3. `plan_adventure_shape(playMinutes: "90", biome: "forest")` with the real play time and main biome. Use the number of areas and the event kinds it returns; do not plan more.
4. `list_tilesets()` and choose one tileset resref for each location.
5. Write the section with `write_story_section(section: "Plot", text: "...")` in the format below.
6. `verify_story()`. Fix what it reports by writing the section again.
7. `phase_check(phase: "plot", step: "end")`.

## Format of the section

```
### Premise
Two or three sentences: what is wrong, who is behind it, what the party must do.

### Locations
#### 1. <Name>
- **Tileset:** <resref>
- **Purpose:** hub | travel | adventure | boss
- **Events:** <kinds from plan_adventure_shape, e.g. social, combat, trap>
- **Travel:** yes | no
- **Beat:** one sentence: what happens here.

### Connections
- <Location 1> <-> <Location 2>

### Key NPCs
#### <Name>
- **Location:** <location name>
- **Role:** quest giver | merchant | companion | witness
- **Race, class, gender:** e.g. human fighter, female
- **Motive:** one sentence: what this person wants.
- **Voice:** one sentence: how this person talks.

### Antagonists
- **<Name>:** who, where, motive, how the party stops them.

### Quest Objectives
#### Primary Quest: <Name>
**Stage 1:** <giver> asks the party to <task>.
**Stage 2:** <what the party does, where>.
**Stage 3 (Resolution):** <how it ends, who is told>.

### Challenges
- <Location>: <enemy kind and number>, <trap or obstacle>

### Loot & Economy
- Merchant: <NPC or none>. Final reward: <item or gold>.
```

## Rules

- 3 to 5 locations, 3 to 5 key NPCs, 1 primary quest, at most 1 side quest, at most 3 companions.
- The first location is safe (a hub with the quest giver). The last holds the antagonist.
- Every location is reachable through Connections from the first.
- Every NPC and the antagonist has a Motive line.
- Every quest stage names a place and a person or thing from this section.
- The last stage returns to someone who reacts to the outcome.
- Use only base-game creatures and items; no new art.
