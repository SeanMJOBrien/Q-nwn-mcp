---
phase: affordances
profile: loot
reads: Module, Plot, Areas, Environment, Actors, Quests, Challenges
writes: Affordances
---
# Phase 7: Affordances

You give the party what it needs to get through the adventure: one shop and loot in the containers.

## Steps

1. `phase_check(phase: "affordances", step: "start")`. Stop on `skipped` or on an error (repeat its `stop` text).
2. `read_story(sections: "Module,Plot,Environment,Actors,Challenges")`. Note the target level, the merchant NPC (resref, dialog, area, position) and every container tag with its area.
3. `get_wealth_budget(level: "3")` with the target level. No single item in the shop or in a container costs more than a quarter of the total.
4. The shop (skip when the plot has no merchant):
   1. `create_store_blueprint(resref: "str_general", tag: "str_general", name: "General Store", markUp: "120", markDown: "80", inventory: "[{\"resref\":\"nw_it_mpotion001\",\"infinite\":true,\"category\":2}]")` with 8 to 15 items from the table.
   2. `place_store(area: "village", blueprint: "str_general", x: "46", y: "62")` 1 m from the merchant.
   3. `write_script(resref: "a_str_general", source: "void main() { OpenStore(GetNearestObjectByTag(\"str_general\"), GetPCSpeaker()); }", compile: false)`, then `compile_script(resref: "a_str_general")`.
   4. `get_dialog_tree(dialog: "dlg_merchant")` to find the greeting (entry 0), then `add_dialog_node(dialog: "dlg_merchant", parentType: "entry", parentIndex: "0", text: "Show me what you have for sale.", script: "a_str_general")`.
   5. `verify_dialog(resref: "dlg_merchant")` and `verify_store(resref: "str_general")`: no errors.
5. Loot, for each container from Environment: `add_items_to_container(area: "oldcrypt", containerTag: "chest_crypt1", items: "[{\"resref\":\"nw_it_mpotion001\",\"quantity\":2}]")`. 1 to 3 items per container.
6. `write_story_section(section: "Affordances", text: "...")`, then `phase_check(phase: "affordances", step: "end")`.

## Items (base game)

| Item | Resref | Store category |
|---|---|---|
| Potion of cure light / moderate / serious wounds | nw_it_mpotion001 / nw_it_mpotion020 / nw_it_mpotion002 | 2 |
| Antidote | nw_it_mpotion006 | 2 |
| Healing kit +1 / +3 | nw_it_medkit001 / nw_it_medkit002 | 4 |
| Torch | nw_it_torch001 | 4 |
| Arrows / bolts | nw_wamar001 / nw_wambo001 | 1 |
| Longsword, dagger, mace, shortbow | nw_wswls001, nw_wswdg001, nw_wblml001, nw_wbwsh001 | 1 |
| Leather armor, chain shirt, small shield | nw_aarcl001, nw_aarcl012, nw_ashsw001 | 0 |

More: `list_blueprints(type: "uti", pattern: "potion")`. Items of a fitting value for the level: `list_treasure_samples(level: "3", group: "weapon")`, then `import_treasure_item(sample: "<id from the list>", resref: "tr_blade")`.

## What goes where

| Container is in | Put in it |
|---|---|
| hub (safe) | 1 or 2 cure light potions, a torch |
| travel or early adventure area | a healing kit, arrows, one mundane weapon or armor |
| just before the boss | 2 or 3 healing potions, an antidote |
| the boss room | nothing here; the rewards phase fills it |

## Rules

- Use only resrefs from the table or returned by a tool. Do not invent resrefs.
- Shop items the party uses up (potions, kits, ammunition, torches) get `"infinite": true`.
- The shop sells mundane gear and consumables only. Magic gear is a reward, not shop stock.
- Do not put loot in every container; half of them is enough.
- Do not write any script other than the one line in step 4.
- Do not change the merchant's other dialog lines.

## Format of the section

```
### Stores
- General Store (`str_general`) in `village` at (46, 62), opened from `dlg_merchant`. Stock: <items>
### Container Loot
- `oldcrypt` chest_crypt1: 2x cure light wounds
```
