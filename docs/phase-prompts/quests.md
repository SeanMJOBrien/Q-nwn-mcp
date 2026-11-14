---
phase: quests
profile: quests
specs: quest
reads: Module, Plot, Areas, Environment, Actors
writes: Quests
---
# Phase 5: Quests

You turn each quest of the plot into one short spec. `build_quest` writes the journal, the dialog lines, the scripts and the rewards from it. Never write scripts, journal entries or dialog nodes yourself.

## Steps

1. `phase_check(phase: "quests", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Module,Plot,Areas,Actors")`. For each quest note the giver's resref (from Actors), the area resrefs and the target level.
3. For each quest:
   1. Write the spec (shape below).
   2. `build_quest(spec: "<the JSON>", dryRun: true)`. If it answers an error, it names the `stage` and `field`: fix that field only and repeat. Repeat until there are no `warnings`.
   3. `build_quest(spec: "<the JSON>")`. Keep the `adventureMd` text it returns.
   4. `verify_dialog(resref: "dlg_elara")` for the giver's dialog: no errors.
4. `verify_quest_completability()` and `verify_journal()`: no gaps for your quests. To change a quest, change the spec and build again.
5. `write_story_section(section: "Quests", text: "...")` with every `adventureMd` block, then `phase_check(phase: "quests", step: "end")`.

## Spec shape

```json
{
  "name": "Wolves at the Fold",
  "giver": "farmer_ned",
  "level": 3,
  "stages": [
    {"do": "talk", "journal": "Ned asked me to deal with the wolves killing his sheep.",
     "offer": "Wolves have taken three of my sheep this week."},
    {"do": "kill", "target": "wolf_alpha", "area": "fold_hills", "journal": "The alpha wolf is dead. I should tell Ned."},
    {"do": "return", "journal": "Ned thanked me and paid what he could.", "text": "You killed it? Bless you."}
  ]
}
```

## Stage kinds

| `do` | Needs | Meaning |
|---|---|---|
| `talk` | `to` (NPC resref; default the giver) | Speak with someone. Stage 1 is always `talk` with the giver. |
| `kill` | `target` (creature resref), `area` | Kill it. Placed for you if it is not placed. |
| `pickup` | `itemName`, and `from_creature` or `in` (placeable tag) | Find a quest item. |
| `explore` | `area` | Enter an area. |
| `use` | `target` (placeable tag) | Use an object. |
| `deliver` | `item`, `to` | Bring an item to someone. |
| `return` | | Go back to the giver. Use it as the last stage. |

## Rules

- Required: `name`, `giver`, and `do` and `journal` on every stage. `level` = the adventure's target level.
- `giver`, `to`, `target`, `area` and `in` must be resrefs or tags that exist in Actors, Areas or Environment. Do not invent them. For a kill target use a base-game creature from `list_creatures()` or the Plot's antagonist.
- A kill target must be a creature used only for this quest.
- `journal` is the player's own note: one or two sentences saying what happened and what to do next.
- `offer` (stage 1) and `text` (other talk stages) are the NPC's line, in that NPC's voice from the Plot.
- 3 to 5 stages. End with `return` so someone reacts to the outcome.
- Do not set rewards here; the rewards phase adds them.
