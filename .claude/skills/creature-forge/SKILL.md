---
name: creature-forge
description: Use when creating or changing any class-based creature (enemy, boss, companion, key NPC) with forge_creature / create_creature_level_system — spawn-time levelling, gear, spell abilities, domains and schools. Shared by adventure-actors and adventure-challenges.
---

# Creature forge: spawn-time levelling (preferred for every class-based creature)

Use this instead of hand-building stat blocks, gear and spell wiring. You supply the specification; the tools apply the rules.

1. Once per module: `create_creature_level_system` (optional `stores`: JSON array of store tags/resrefs NPCs may buy from; default four base-game stores).
2. For each class-based creature, call `forge_creature` on the blueprint (`resref`) AND on each placed copy (`area` + `tag`), with: `race`, `classId`, `level` (absolute target; use this for anything placed in an area, since placed creatures spawn at module load before PCs exist), `gearRole` (`pc` for companions, `elite` for bosses and named leaders, `standard` for rank and file, `mook` for fodder), optional `gearWealth` (multiplier on the role share, default 0.5), `powerLevel` (`tougher`/`epic` only for bosses), `complexity: "simple"` for commoner-tier NPCs, `plan` (class id per level) for multiclass, and `originalSpawn` (`x0_ch_hen_spawn` for companions, `nw_c2_default9` otherwise).
3. Optional: `pinnedSpells` (JSON array of `spells.2da` rows a caster always gets first, e.g. a boss's signature spell).
   For every Cleric, pass `domains` chosen from the character (JSON array of two `domains.2da` rows: 0 Air, 1 Animal, 3 Death, 4 Destruction, 5 Earth, 6 Evil, 7 Fire, 8 Good, 9 Healing, 10 Knowledge, 13 Magic, 14 Plant, 15 Protection, 16 Strength, 17 Sun, 18 Travel, 19 Trickery, 20 War, 21 Water). The forge adds both domain power feats, and at spawn one slot per spell level holds a domain spell. Left out, every Cleric gets the package's Healing and Sun.
   For every Wizard, pass `school` chosen from the character (spellschools.2da row: 0 General, 1 Abjuration, 2 Conjuration, 3 Divination, 4 Enchantment, 5 Evocation, 6 Illusion, 7 Necromancy, 8 Transmutation). A specialist gets one extra slot per spell level 1-9 and never casts its opposition school; left out, a Wizard is a Generalist.
4. What happens at spawn: the creature is a legal level-1 build; `LevelUpHenchman` levels it to the target (live-verified to add every automatic feat and no illegal ones); it buys proficient gear from the stores within a level-scaled allowance (unspent allowance is discarded, never given as gold); archers also buy a melee backup weapon; casters get spell abilities with the right spells, caster level and slots per day; every purchase is logged as a `[CL_LOOT]` line for `/adventure-rewards`; then it logs `[SPEC_OK]`/`[SPEC_FAIL]` lines that `run_live_verification` reports.
5. Don't add your own spell wrappers (`a_hen_spawn`, `a_ra_spawn`, `SA_OnSpawn`) or `bake_spec_ability_pool` for a forged creature, and don't add `ITEM_PROPERTY_AC_BONUS` to give armor AC: mundane armor already has base AC from its torso part.
6. Animals, outsiders and other monster-class creatures are not forged. Choosing a ready-made monster from the default or custom palette (`list_blueprints`, `resman_search`, `place_creature`) is the right approach for them; don't build them from scratch.

