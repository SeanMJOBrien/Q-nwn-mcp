---
phase: challenges
profile: encounters
reads: Module, Plot, Areas, Environment, Actors, Quests
writes: Challenges
---
# Phase 6: Challenges

You place the enemies and traps of the adventure. The tools size each fight for the party; you decide where it happens and what kind of enemy fits the story.

## Steps

1. `phase_check(phase: "challenges", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Module,Plot,Areas,Actors,Quests")`. Note the target level and party size, the Challenges list, and creatures the quests already placed (do not place those again).
3. For each dangerous area:
   1. `visualize_area(area: "oldcrypt")` and `get_area_creatures(area: "oldcrypt")`.
   2. Ordinary fights (1 to 3 per area): `suggest_encounter(partyLevel: "3", partySize: "4", difficulty: "medium", theme: "undead")`. Take creature resrefs and counts from its answer.
   3. Positions: `adventure_find_walkable(area: "oldcrypt", region: "40,40,90,90", count: "4", clearRadius: "2")` inside the room of the fight.
   4. Place each one: `place_creature(area: "oldcrypt", blueprint: "nw_skeleton", x: "55", y: "62")`. Members of one group stand 2 to 4 m apart.
4. The boss, once, in the last area. Level = target level + 1.
   - A person (bandit chief, cult leader, knight): `build_key_npc(resref: "boss_harl", name: "Captain Harl", area: "oldcrypt", x: "80", y: "120", race: "6", classId: "4", level: "4", gender: "0", faction: "hostile", powerLevel: "tougher")`, then 2 to 4 weaker creatures next to it as in step 3.
   - A necromancer: `compose_encounter(role: "necromancer", targetEL: "4", partyLevel: "3", partySize: "4", area: "oldcrypt")` builds and places the boss and its undead. Call it without `area` first to read the plan.
   - `verify_creature(resref: "boss_harl")`: no errors.
5. Traps (0 to 2 per dungeon area, none in safe areas), three calls each:
   1. `create_trap_blueprint(resref: "trap_fire_01", tag: "trap_fire_01", name: "Fire Trap", detectDC: "15", disarmDC: "15", oneShot: true)`
   2. `place_trigger(area: "oldcrypt", blueprint: "trap_fire_01", x: "55", y: "45")`
   3. `add_skill_check(area: "oldcrypt", tag: "trap_fire_01", kind: "trigger", check: "{\"save\":\"reflex\",\"dc\":13,\"fail_damage\":\"2d6\",\"half\":\"1\",\"damage_type\":\"fire\",\"fail_msg\":\"Flames burst from the wall!\"}")`
6. `verify_encounter_chain()` and `get_balance_report(partyLevel: "3")`. If a fight other than the boss is rated `deadly`, remove one creature from it or use a weaker one.
7. `write_story_section(section: "Challenges", text: "...")`, then `phase_check(phase: "challenges", step: "end")`.

## Numbers

- race: 0 dwarf, 1 elf, 2 gnome, 3 halfling, 4 half-elf, 5 half-orc, 6 human; gender: 0 male, 1 female
- classId: 0 barbarian, 1 bard, 2 cleric, 3 druid, 4 fighter, 5 monk, 6 paladin, 7 ranger, 8 rogue, 9 sorcerer, 10 wizard

## How many enemies

| Area purpose | Enemies |
|---|---|
| hub (safe) | none |
| travel | 3 to 6 in 1 or 2 groups |
| adventure | 5 to 10 in 2 or 3 groups |
| boss | the boss group only |

## Rules

- Never place an enemy within 60 m of the module start, within 30 m of a transition, or within 40 m of a friendly NPC.
- Use the creature resrefs the tools return. Do not invent resrefs. To look for one: `list_creature_samples(cr: "3", type: "undead")`.
- Enemies match the area and the antagonist: undead in a crypt, bandits on a road, beasts in a forest.
- Do not set stats, feats or equipment by hand.
- Do not write scripts. A trap is a trigger plus `add_skill_check`.
- If a placement is refused, use the next free position. Never pass `z`.
- Trap DC = 10 + target level. Damage: `1d6` at level 1-2, `2d6` at 3-5, `4d6` at 6 or more.

## Format of the section

```
### <Area name> (`resref`)
**Group 1 (medium):** nw_skeleton x3 at (55, 62)
**Boss:** <name> (`resref`), EL 4, with <minions>
**Traps:** trap_fire_01 at (55, 45), Reflex DC 13, 2d6 fire
```
