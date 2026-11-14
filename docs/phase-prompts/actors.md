---
phase: actors
profile: actors
specs: key-npc, companion, dialog
reads: Module, Plot, Areas, Environment
writes: Actors
---
# Phase 4: Actors

You create the friendly people of the adventure: key NPCs with a conversation, companions, and a few animals. Enemies come in a later phase.

## Steps

1. `phase_check(phase: "actors", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Module,Plot,Areas,Environment")`. List the key NPCs with their location, role, motive and voice.
3. For each area with an NPC: `visualize_area(area: "village")`, then `adventure_find_walkable(area: "village", count: "8", clearRadius: "2")` for positions. `get_area_creatures(area: "village")`: skip tags already placed.
4. For each key NPC that is not a companion:
   1. Conversation first: `create_dialog(resref: "dlg_elara", nodes: "[...]")` (shape below).
   2. Person: `build_key_npc(resref: "elara", name: "Elara Voss", area: "village", x: "45", y: "62", race: "6", classId: "4", level: "3", gender: "1", faction: "commoner", conversation: "dlg_elara")`.
   3. `verify_dialog(resref: "dlg_elara")`: no errors.
5. Companions (at most 3; skip when the plot has none):
   1. Once: `create_companion_system()`.
   2. Each: `build_companion(resref: "cmp_borin", name: "Borin", area: "village", x: "50", y: "60", race: "0", classId: "2", level: "3", gender: "0", introduction: "...", backstory: "...")`. Level = the adventure's target level.
   3. `verify_creature(resref: "cmp_borin", henchman: true)`: no errors.
6. Animals (2 to 5 per outdoor area, 0 to 1 indoors): `create_creature_blueprint(resref: "amb_deer", tag: "amb_deer", name: "Deer", sourceResref: "nw_deer", faction: "2")` once per kind, then `place_creature(area: "darkforest", blueprint: "amb_deer", x: "65", y: "95")`.
7. `write_story_section(section: "Actors", text: "...")`, then `phase_check(phase: "actors", step: "end")`.

## Numbers

- race: 0 dwarf, 1 elf, 2 gnome, 3 halfling, 4 half-elf, 5 half-orc, 6 human
- classId: 0 barbarian, 1 bard, 2 cleric, 3 druid, 4 fighter, 5 monk, 6 paladin, 7 ranger, 8 rogue, 9 sorcerer, 10 wizard
- gender: 0 male, 1 female
- Animals: forest nw_deer, nw_dog; village nw_dog, nw_chicken, nw_cow; dungeon and cave nw_bat

## Conversation shape

```json
[{"speaker":"npc","text":"Greeting in this person's voice.","children":[
  {"speaker":"pc","text":"Who are you?","children":[{"speaker":"npc","text":"Answer that carries the motive."}]},
  {"speaker":"pc","text":"What is happening here?","children":[{"speaker":"npc","text":"Answer with one fact from the plot."}]},
  {"speaker":"pc","text":"Goodbye."}
]}]
```

## Rules

- One NPC root line. Its PC children are the menu. NPC and PC lines alternate.
- 2 to 4 questions per NPC, each answer one or two sentences, and one "Goodbye." option. Answers return to the menu by themselves.
- Do not write quest lines here. The quests phase adds them to these conversations.
- Every friendly NPC has `faction: "commoner"`. A merchant also gets `faction: "commoner"`; the store comes later.
- Resrefs: lower case, digits, underscore, at most 16 characters. Dialog resref = `dlg_` + NPC resref.
- Place NPCs where the plot says they are, at least 3 m from an exit, facing the way the party arrives.
- If a placement is refused, use the next free position.

## Format of the section

```
### <Area name> (`resref`)
**Key NPCs:** Elara Voss (`elara`), dialog `dlg_elara`, at (45, 62), quest giver
**Companions:** Borin (`cmp_borin`), cleric 3, at (50, 60)
**Ambient:** amb_deer x3
```
