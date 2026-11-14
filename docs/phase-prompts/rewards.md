---
phase: rewards
profile: loot, quests
specs: quest
reads: Module, Plot, Areas, Environment, Actors, Quests, Challenges, Affordances, Polish
writes: Rewards
---
# Phase 9: Rewards

You set what the party earns, describe the module for players, and write the guide for the person who runs it.

## Steps

1. `phase_check(phase: "rewards", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story()` (all sections).
3. `create_reward_system()`. Its answer must say `compiles: true`.
4. Quest rewards. For each quest, copy its spec from the Quests section, add `"reward": {"xp": 300, "gold": 150}` at the top level with values from the table, then `build_quest(spec: "<the JSON>", dryRun: true)` and, with no warnings, `build_quest(spec: "<the JSON>")`.
5. The final reward, one item in the boss room's container:
   1. `list_treasure_samples(level: "3", group: "weapon")` (or armor, ring, amulet, cloak: what suits the story).
   2. `import_treasure_item(sample: "<id from the list>", resref: "rw_final", name: "<a name from the story>")`.
   3. `add_items_to_container(area: "oldcrypt", containerTag: "chest_boss", items: "[{\"resref\":\"rw_final\"}]")`. If the boss room has no container, place one first with `place_placeable(area: "oldcrypt", blueprint: "plc_chest1", x: "82", y: "118")` and use the tag it reports.
6. `set_module_description(description: "...")` (shape below).
7. `write_dm_guide(text: "...")` (shape below), then `create_dm_area()`.
8. `audit_module()`: the "DM area and books" row is done.
9. `verify_all()`: `shippable` is true. If not, repair the entries in `fixFirst` that this phase caused.
10. `write_story_section(section: "Rewards", text: "...")`, then `phase_check(phase: "rewards", step: "end")`.

## Quest reward by target level

| Level | Primary quest XP | Side quest XP | Gold |
|---|---|---|---|
| 1-2 | 300 | 100 | 100 |
| 3-4 | 600 | 200 | 300 |
| 5-6 | 1200 | 400 | 700 |
| 7-8 | 2000 | 700 | 1500 |
| 9-10 | 3000 | 1000 | 2500 |

## Module description (players read it before they start)

`<Tone> adventure for <party size> character(s) of level <level>. <Difficulty> difficulty. <N> recruitable companion(s). About <play time>. <One line that sets the mood.>`

No plot summary, no villain's name, no twist, no solution.

## DM guide (the person running the game reads it; spoilers belong here)

```
# <Title>: DM Guide
## At a Glance
Level, party size, play time, the story in three sentences including who is behind it.
## Cast
One line per NPC: name, where, what they want, what they know.
## Areas
One paragraph per area: what is there, the fights, the traps, the loot.
## Quests
Per quest: each stage, where it happens, how it can go wrong.
## The Climax
The boss, its tactics, the final reward.
```

## Rules

- Every player gets the full reward. Never divide XP or gold by party size.
- Do not write scripts and do not edit journal entries; rewards go through the quest spec.
- The final reward is one item that fits the story, found with `list_treasure_samples`. Do not invent item resrefs.
- The guide uses the real names, resrefs and positions from the story sections.

## Format of the section

```
### Quest Rewards
- <Quest>: 600 XP, 300 gold
### Reward Items
- <Item name> (`rw_final`) in `oldcrypt` chest_boss
### Delivery
- Module description set. DM guide written. DM area built.
```
