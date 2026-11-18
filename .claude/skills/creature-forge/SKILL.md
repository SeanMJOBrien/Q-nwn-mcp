---
name: creature-forge
description: Use when creating or changing any class-based creature (enemy, boss, companion, key NPC) with forge_creature / create_creature_level_system — spawn-time levelling, gear, spell abilities, domains and schools. Shared by adventure-actors and adventure-challenges.
---

# Creature forge: spawn-time levelling (preferred for every class-based creature)

## One character from a spec in names: `build_creature` (2026-11-17)

When the character is described in detail (sex, phenotype, size, colours, chosen feats, named gear with bonuses), write one
spec in names and call `build_creature(spec, dryRun: true)` first, then without `dryRun`. Every name is resolved to its game
ID (feat.2da, packages.2da, baseitems.2da, itempropdef.2da, the colour charts in `src/data/color-names.json`); an unknown or
ambiguous name refuses the whole spec with the field and the nearest matches, so fix and resend. Schema:
`docs/specs/creature.schema.json`.

```json
{"resref":"seamus","name":"Seamus Worlan","role":"companion","race":"human","gender":"male","class":"fighter","level":6,
 "build":"fixed","feats":["Power Attack","Cleave","Weapon Focus (Bastard Sword)"],
 "look":{"phenotype":"large","scale":107,"hair":"brown","skin":"lightly tanned"},
 "gear":{"armor":{"base":"chainmail","color":"copper"},
         "weapon":{"base":"bastard sword","properties":["attack bonus +1"]},
         "offhand":{"base":"large shield","properties":["ac bonus +1"]}},
 "place":{"area":"tavern","x":12,"y":8},
 "companion":{"introduction":"...","backstory":"..."}}
```

**The package decides how a spawn-levelled creature grows.** `build: "spawn"` (default) makes a level-1 build that
`LevelUpHenchman` levels at spawn, and every later level-up in play, with the creature's StartingPackage: each slot takes the
first legal feat in the package's feat order. Requested feats go into the level-1 slots; the rest come from the package.
The result's `featPlan` says for each requested feat "taken at level 1", "predicted by level N" or "not predicted", and
`package: "auto"` picks the class package predicted to give the most of them. Engine-checked: a spawn-built level-6 human
Gladiator Fighter got Power Attack, Cleave and Exotic Proficiency but not Weapon Focus (Bastard Sword), exactly as predicted.
**When the character must have exactly the listed feats at its level, use `build: "fixed"`** (built at the level now, the
requested feats first; non-casters; the package still sets later in-play level-ups). Prerequisites and weapon/armour
proficiencies are added and listed in `addedFeats`. Colours: a palette number 0-175 or a chart name (skin, hair,
cloth/leather, metal; tattoo numbers only). Item properties in words: `"attack bonus +1"`, `"enhancement +2"`,
`"ac bonus +1"`, `"ability bonus strength +2"`. With any gear given the creature keeps exactly that gear (no shopping).

Use this instead of hand-building stat blocks, gear and spell wiring. You supply the specification; the tools apply the rules.

1. Once per module: `create_creature_level_system` (optional `stores`: JSON array of store tags/resrefs NPCs may buy from; default four base-game stores).
2. For each class-based creature, call `forge_creature` on the blueprint (`resref`) AND on each placed copy (`area` + `tag`), with: `race`, `classId`, `level` (absolute target; use this for anything placed in an area, since placed creatures spawn at module load before PCs exist), `gearRole` (`pc` for companions, `elite` for bosses and named leaders, `standard` for rank and file, `mook` for fodder), optional `gearWealth` (multiplier on the role share, default 0.5), `powerLevel` (`tougher`/`epic` only for bosses), `complexity: "simple"` for commoner-tier NPCs, `plan` (class id per level) for multiclass, and `originalSpawn` (`x0_ch_hen_spawn` for companions, `nw_c2_default9` otherwise).
3. Optional: `pinnedSpells` (JSON array of `spells.2da` rows a caster always gets first, e.g. a boss's signature spell).
   For every Cleric, pass `domains` chosen from the character (JSON array of two `domains.2da` rows: 0 Air, 1 Animal, 3 Death, 4 Destruction, 5 Earth, 6 Evil, 7 Fire, 8 Good, 9 Healing, 10 Knowledge, 13 Magic, 14 Plant, 15 Protection, 16 Strength, 17 Sun, 18 Travel, 19 Trickery, 20 War, 21 Water). The forge adds both domain power feats, and at spawn one slot per spell level holds a domain spell. Left out, every Cleric gets the package's Healing and Sun.
   For every Wizard, pass `school` chosen from the character (spellschools.2da row: 0 General, 1 Abjuration, 2 Conjuration, 3 Divination, 4 Enchantment, 5 Evocation, 6 Illusion, 7 Necromancy, 8 Transmutation). A specialist gets one extra slot per spell level 1-9 and never casts its opposition school; left out, a Wizard is a Generalist.
4. What happens at spawn: the creature is a legal level-1 build; `LevelUpHenchman` levels it to the target (live-verified to add every automatic feat and no illegal ones); it buys proficient gear from the stores within a level-scaled allowance (unspent allowance is discarded, never given as gold); archers also buy a melee backup weapon; with no `weapons` given the preferred weapon comes from the class list, and an elf of a class without martial proficiency may also draw a longsword or rapier (Weapon Proficiency (Elf), feat 256); casters get spell abilities with the right spells, caster level and slots per day; every purchase is logged as a `[CL_LOOT]` line for `/adventure-rewards`; then it logs `[SPEC_OK]`/`[SPEC_FAIL]` lines that `run_live_verification` reports.
5. Don't add your own spell wrappers (`a_hen_spawn`, `a_ra_spawn`, `SA_OnSpawn`) or `bake_spec_ability_pool` for a forged creature, and don't add `ITEM_PROPERTY_AC_BONUS` to give armor AC: mundane armor already has base AC from its torso part.
6. Animals, outsiders and other monster-class creatures are not forged. Choosing a ready-made monster from the default or custom palette (`list_blueprints`, `resman_search`, `place_creature`) is the right approach for them; don't build them from scratch.

One call for a combat-capable key NPC or boss that is not a companion: `build_key_npc` (blueprint, forge, placement, `verify_creature`); `build_companion` is its recruitable twin. Use `forge_creature` directly for creatures you place yourself or for changes after the build. Details of every creature tool and which are deprecated: `docs/creature-tools.md`.

## Looks

Standard-race humanoids get a varied player look (head, skin, hair, voice of their gender) when the blueprint is made; `randomize_npc_appearance` does it for an existing module's placed copies (docs/npc-appearance.md).
