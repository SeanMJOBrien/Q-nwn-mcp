---
name: adventure-plot
description: Sub-skill of /create-adventure. Generates a structured adventure document (adventure.md) from a high-level creative prompt. Produces the narrative blueprint that all downstream skills reference.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Plot

Sub-skill of `/create-adventure`. Takes a creative prompt (theme, level range, tone) and generates a complete structured adventure document at `adventure.md`. All downstream skills read from this file.

## Prerequisites

- The module should already be loaded (created by the `/create-adventure` orchestrator during pre-flight).
- `adventure.md` already exists in the adventure directory (`get_adventure_dir`) with the `# Adventure: [Title]` heading and `## Module` section. This skill appends the `## Plot` section to it.

## File Location

`adventure.md` is in the module's **adventure directory**: call `get_adventure_dir` for the path (`adventures/<Title-With-Dashes>/`, git-ignored, holding the story, DM guide and status). Read the existing file first, then rewrite it with the full content (preserving the existing heading and module section).

## Workflow

Fully autonomous. Generate all narrative content from the user's creative prompt — do NOT ask the user for input.

---

### Pre-Check

Call `phase_check(phase: "plot", step: "start")`. If it returns an error, **STOP** and output its `stop` message.

---

### Phase 1: Understand Context

- Read the existing `adventure.md` to get the title, module metadata, and target level.
- Call `get_module_summary` to understand the loaded module state.
- Call `list_areas` to see what locations already exist.
- Call `list_tilesets` to understand what spatial environments are available. This informs what kinds of locations are buildable (forest, dungeon, crypt, city, interior, castle, etc.). Do NOT design locations that require tilesets or terrain types that don't exist.

---

### Phase 1b: Use the user's material, and plan the shape

- **If the user gave a story, a setting, notes, or a pile of separate vignettes, build from that, not around it.** Split it into beats (a scene, an NPC, a place, a secret, an encounter, an item), keep the user's own names and wording, and map each beat onto a location, an event or a quest. Invent only to connect beats or fill what is missing, and say which parts are yours. Don't replace their NPCs or places with new ones.
- **Plan the shape:** call `plan_adventure_shape(playMinutes: <Estimated Duration in minutes>, biome: <main biome>)`. It returns how many areas and events fit, which kinds (combat, ambush, boss, chain, social, obstacle, trap, discovery, friendly, rest) go in which area in story order, and the ground each area needs. Treat it as a starting plan: move events to fit the story, keep at least one friendly or discovery event early and a boss last. A **chain** is a multi-part encounter: a lookout or scout camp first, then the main force; it is built in `/adventure-quests` with a `spawn` on the first part's kill stage.

---

### Phase 2: Generate the Adventure

Rewrite `adventure.md` preserving the existing `# Adventure: [Title]` heading and `## Module` section, then appending the full `## Plot` section using the structure below. Every section is required — downstream skills depend on specific headings and field names.

---

### Phase 3: Report

After writing the file, briefly summarize what was generated:
- Adventure title
- Number of locations
- Number of key NPCs
- Primary quest summary
- Tone and target level

---

## Adventure Document Structure

The file MUST use this exact structure. Downstream skills parse by heading name.

```markdown
# Adventure: [Title]

## Module
- **Title:** [The adventure title as a proper name, e.g., "The Harvest of Bones"]
- **Filename:** [kebab-case filename without extension, e.g., "the-harvest-of-bones"]
- **Target Level:** [e.g., 3, or 2-4]
- **Tone:** [dark / lighthearted / mysterious / epic / grim / whimsical]
- **Estimated Duration:** [short (~1hr) / medium (~2-3hr) / long (~4hr+)]

## Plot

### Premise
[2-3 paragraphs. What is happening in this place? Why are the adventurers here?
What is at stake? Set the scene and establish the central conflict.]

### Locations

#### 1. [Location Name]
- **Resref:** [lowercase, no spaces, max 16 chars — e.g., darkforest, inn_upper]
- **Type:** [interior / exterior]
- **Environment:** [terrain/biome keywords — forest, crypt, village, cave, castle, swamp, etc.]
- **Mood:** [eerie / bustling / oppressive / serene / tense / foreboding]
- **Scale:** [small / medium / large — abstract size hint, the areas skill determines actual tile dimensions]
- **Events:** [number of distinct things that happen here — encounters, conversations, clue searches, set pieces; at least 1. Sizes the area]
- **Travel:** [yes if the player mainly passes through (road, trail, corridor) — builds a long narrow area; otherwise no]
- **Description:** [What does this area look like spatially? Key landmarks, terrain features,
  notable structures. Think about what the player sees and navigates.]
- **Role in Story:** [Why does this location matter? What happens here plot-wise?]

#### 2. [Next Location]
...

### Connections
[Area-to-area transition graph. Each connection on its own line.]
- [Area A] <-> [Area B] via [transition type: door, cave mouth, path, stairs, trapdoor, etc.]
- [Area B] <-> [Area C] via [transition type]

### Key NPCs

#### [NPC Name]
- **Race/Appearance:** [e.g., elderly human male, scarred half-orc woman]
- **Role:** [quest giver / ally / villain / merchant / informant / bystander]
- **Location:** [which area they're found in]
- **Motivation:** [what do they want?]
- **Personality:** [how do they speak and act? 1-2 sentences]
- **Quest Involvement:** [what part do they play in objectives?]

#### [Next NPC]
...

### Antagonists
- **Type:** [creature types, factions, or named individuals]
- **Motivation:** [why do they oppose the player? Make it more than "evil"]
- **Escalation:** [how does the threat increase through the adventure?]
- **Lair/Territory:** [which areas are they concentrated in?]

### Quest Objectives

#### Primary Quest: [Quest Name]
[Brief description of the overall goal]

**Stage 1: [Stage Name]**
- **Trigger:** [what starts this stage — talking to NPC, entering area, finding item]
- **Description:** [what the player needs to do]
- **Completion:** [what resolves this stage]

**Stage 2: [Stage Name]**
...

**Stage 3 (Resolution): [Stage Name]**
...

#### Side Quest: [Quest Name] (optional)
- **Trigger:** [how the player discovers this]
- **Description:** [what's involved]
- **Completion:** [how it resolves]
- **Reward Hint:** [what the player gets — XP, item, ally, information]

### Challenges
- **Combat Encounters:** [types of enemies per area, rough difficulty relative to target level.
  Specify creature types that exist in the NWN base game palette.]
- **Puzzles/Obstacles:** [non-combat challenges — locked doors, riddles, environmental hazards]
- **Social Encounters:** [NPC interactions that can go multiple ways — persuasion, deception, intimidation]
- **Environmental Hazards:** [traps, terrain dangers, timed events]

### Story Graph
How the beats connect, so the story holds together. One line per beat and per thread (the grammar `verify_story` reads):

```markdown
- beat B1 | title: Arrival | act: setup | area: village | leads: B2, B3 | gives: letter
- beat B2 | title: The cabin | act: complication | area: village | leads: B4 | gives: seal | needs: letter
- thread T1 | title: Venn's motive | planted: B1 | paid: B4
```
`act` is setup, complication, turn, climax or resolution. `leads` = the beats this opens; `gives`/`needs` = clue ids; every needed clue should be given by two beats, so a missed search can't stall the story. A **thread** is a motive, mystery or promise: plant it early (a rumour, an odd detail), reveal it in the middle, and pay it off in a named later beat. Give each area its beats' `Events:` count. `phase_check(phase: "plot", step: "end")` runs `verify_story` and fails on a beat that can't be reached, a clue nobody gives, or a thread that is never paid.

### Loot & Economy
- **Key Items:** [plot-critical items — keys, quest tokens, mcguffins. Include name and brief description.]
- **Notable Rewards:** [interesting equipment or items the player can earn]
- **Merchants:** [any shops, what they sell thematically — potions, weapons, supplies]
```

---

## Creative Guidelines

Follow these principles when generating content:

- **Location count comes from `plan_adventure_shape`** for the play time (about 2-5 areas for a 1-2 hour one-shot, more for a long one). Every area still has to earn its place.
- **Every area earns its place.** Each location should serve the plot — don't add areas just for padding.
- **NPCs have distinct voices.** Give each NPC a clear personality and motivation. Avoid generic quest-givers.
- **Quest flow routes through all areas.** The primary quest should take the player through every location.
- **Challenges escalate.** Early areas have easier encounters; the climax area has the hardest.
- **Mix the encounter kinds** the plan gives (combat, social, check obstacles, discovery, friendly, rest); an adventure of only fights reads as a corridor of monsters.
- **Include non-combat solutions.** At least one major obstacle should be solvable through dialogue, cleverness, or exploration rather than fighting.
- **Antagonist depth.** The villain or opposing force should have understandable (if not sympathetic) motivations.
- **Key items have character.** Name them, describe them, tie them to the narrative. "Elara's Locket" not "quest item 3".
- **Use NWN base game creatures.** Reference creature types that exist in the game palette (goblins, skeletons, wolves, bandits, zombies, etc.) rather than inventing creatures that can't be placed.
- **Terrain keywords must be buildable.** Only describe environments that NWN tilesets can represent. Check `list_tilesets` output — if no tileset has "lava" terrain, don't design a lava area.
- **Resrefs are permanent identifiers.** Choose descriptive, stable resrefs for locations (max 16 chars, lowercase, no spaces). These become area filenames in the module.

## Important Notes

- This skill produces a DOCUMENT, not module content. It does not create areas, place creatures, or write scripts. Those are handled by downstream skills.
- The `## Plot` section heading and all `###` sub-headings must be preserved exactly — `/adventure-areas` and other skills parse them by name.
- If extending an existing module, incorporate existing areas and content into the plot rather than ignoring them.
- The adventure document is the single source of truth for the entire pipeline. Be thorough.

## Finish

Call `phase_check(phase: "plot", step: "end")` last. It checks this phase's section was appended, runs the verifiers that belong to the phase and writes the entry to `adventure-status.json` (`partial` with the error list if anything is left). Fix its errors and call it again; never report success past errors.
