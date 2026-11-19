---
phase: plot
profile: plot
reads: Module
writes: Plot
---
# Phase 1: Plot

You write the story outline of a short Neverwinter Nights adventure as one JSON object for `write_plot`. Later phases build exactly what you write: every place, person and quest, by the names you give. Use short fields, not prose.

## Steps

1. `phase_check(phase: "plot", step: "start")`. If it answers `skipped`, stop. If it answers an error, stop and repeat its `stop` text.
2. `read_story(sections: "Module")` for the title, target level, play time and the user's idea.
3. `plan_adventure_shape(playMinutes: "90", biome: "forest")` with the real play time and main biome. Use the number of areas and the event kinds it returns; do not plan more.
4. `write_plot(spec: "{...}")` with the object below. It checks every name against the others and answers with the field to fix; fix that field and call it again.
5. `verify_story()`, then `phase_check(phase: "plot", step: "end")`. Then `get_progress()`: what is still open, and the next step.

## The object

```
{"title":"<module title>","premise":"<2-3 sentences>","level":3,"playMinutes":90,"partySize":4,
 "locations":[{"name":"<Place>","tileset":"ttr01","purpose":"hub","events":["social"],"beat":"<what happens>"}, ...],
 "connections":[["<Place 1>","<Place 2>"], ...],
 "npcs":[{"name":"<Person>","location":"<Place>","role":"quest giver","race":"human","class":"fighter",
          "gender":"male","motive":"<what they want>","voice":"<how they talk>"}],
 "antagonists":[{"name":"<Foe>","who":"<a half-orc bandit chief>","location":"<last Place>","motive":"...","defeat":"<how>"}],
 "quests":[{"name":"<Quest>","primary":true,"giver":"<Person>","stages":["<task as given>","<what the party does>","<how it ends>"]}],
 "challenges":[{"location":"<Place>","enemies":"3 bandits","obstacle":"a pit trap"}],
 "merchant":"<a person's name; drop the field when there is none>","finalReward":"<item or gold>"}
```

- tileset (only these work): ttr01 village, farmland, rural road · ttf01 forest · ttf02 deep forest · tcn01 city, town, market · tin01 house, inn, shop · tde01 dungeon · tdc01 crypt · tds01 sewer · tdm01 cave, mine · ttd01 desert · tno01 castle, keep, wall gate · tts01 winter.
- purpose: hub | travel | adventure | boss. role: quest giver | merchant | companion | witness.
- race: dwarf, elf, gnome, halfling, half-elf, half-orc, human. class: barbarian, bard, cleric, druid, fighter, monk, paladin, ranger, rogue, sorcerer, wizard.
- events: the kinds plan_adventure_shape returned. enemies: a number and a kind (bandits, skeletons, zombies, goblins, orcs, kobolds, gnolls, bugbears, ogres, trolls, wolves, bears, spiders).

## Rules

- 3 to 5 locations, 2 to 5 people, 1 primary quest, at most 1 side quest, at most 3 companions.
- The first location is safe (a hub with the quest giver). The last holds the antagonist.
- Every location is reachable through connections from the first.
- Names match exactly everywhere: a quest's giver is an npc's name, a location field is a location's name.
- The last stage returns to someone who reacts to the outcome.
- Use only base-game creatures and items; no new art.
