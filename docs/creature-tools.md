# Creature tools: which one to use (work-plan F1, decision D4 approved 2026-11-10)

Rule: **`forge_creature` is the one supported way to build a class-based creature.** The older tools stay registered and keep working, but their descriptions say "deprecated, use `forge_creature`" and the skills no longer mention them (the `systest-module` skill still calls some on purpose: it is the regression fixture for them).

## Builders

| Tool | What it does | Verdict |
|---|---|---|
| `create_creature_blueprint` | Identity and basics: race, appearance, name, faction, scripts, base stats, inventory. Also the base for monsters and ambient creatures. | **Keep.** The forge and `build_companion` call it. |
| `forge_creature` (+ `create_creature_level_system` once per module) | Legal level-1 build, levelling plan, gear shopping, spells, domains and school, spawn wiring and in-game checks. | **The supported path** for any creature with player classes. |
| `build_companion` | Blueprint, forge, placement, recruit dialog, verification for a recruitable companion. | **Keep.** |
| `build_key_npc` (new, F2) | The non-companion twin: blueprint, forge, placement, optional dialog, verification for a combat-capable key NPC or boss. | **Keep**, new. |
| `compose_encounter` | A forged boss plus palette support to a target encounter level. | **Keep** (it uses the forge). |
| `build_npc_stat_block` | Computes ability scores, feats, skills, HP onto an existing blueprint at a fixed level. | **Deprecated.** The forge derives the same at spawn. Kept for hand-built creatures and `systest-module`. |
| `level_creature`, `build_npc_level_library` | Re-level a blueprint's stat block up or down; batch one blueprint per level. | **Deprecated.** Forge again with the new level. |
| `equip_npc_by_role` | Equip by role and wealth budget with proficiency checks. | **Deprecated** for forged creatures (spawn-time shopping does it). |
| `set_creature_equipment`, `add_equipped_item_property` | Put a named item on a creature. | **Keep** for plot items (the boss's named blade): forge with `gearWealth: "0"` first. |
| `respec_weapon_feats`, `remove_feats`, `sanitize_feat_package`, `generate_weapon_packages` | Repair and package-authoring tools. | **Keep.** |

## Caster paths

| Path | Verdict |
|---|---|
| The forge's own spell abilities (`pinnedSpells`, domains, school; levelled at spawn by `inc_cre_level`) | **The supported path.** |
| Special Abilities (`create_spec_ability_system`, `bake_spec_ability_pool`) | **Deprecated** for forged creatures (do not add your own `SA_OnSpawn`); still works on hand-built creatures. |
| Random Abilities (`create_random_abilities_system`, `a_ra_spawn`) | **Deprecated.** Capped at cantrips for a never-levelled creature (confirmed live); the forge does not have that limit. |

Monsters (Animal, Beast, Undead, Outsider ...) are not forged: place a palette creature as it is.
