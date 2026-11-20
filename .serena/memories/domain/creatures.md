# Creatures, companions, gear

Building
- One character from names: `build_creature(spec)` (`src/util/creature-spec.ts`, schema `docs/specs/creature.schema.json`, colour names `src/data/color-names.json`). `build: "spawn"` levels at spawn via StartingPackage (`featPlan` predicts picks; `package: "auto"`); `build: "fixed"` exact feats at level, non-casters only (TODO #55).
- Companions: `create_companion_system` once + `build_companion` per companion (blueprint, forge, placement, dialog, verify). Party cap counted from the engine at join time, never a module counter.
- Class-based enemies/NPCs: `forge_creature`/`create_creature_level_system` (skill `creature-forge`); `build_key_npc` requires `faction`, checks the spot, reuses an existing blueprint. Base-game enemy groups: `build_enemy_group` (`util/enemy-roster.ts`).
- Catalogs: `list_creature_samples` (TFN-derived ranges, `src/data/creature-catalog.json`), treasure `list_treasure_samples`/`import_treasure_set`/`create_treasure_system`.
- PC-race NPC looks randomised automatically (`util/pc-appearance.ts`; `appearanceLook: keep` opts out); fixed NPC models switched to the player model (`pcModel`, `ensurePcBodyFields`).

Henchman invariants
- `create_creature_blueprint(henchman: true)` wires 13 script fields to stock `x0_ch_hen_*`; never write those into the module; never set `nw_ch_ac*` in a UTC field.
- `SetMaxHenchmen()` before `AddHenchman()` (silent no-op otherwise); `SetAssociateListenPatterns()` on recruit.
- Never a Commoner chassis (class 20: no feats/spells from `LevelUpHenchman`).
- `startingPackage` = class id for iconic packages (Barbarian 0 ... Wizard 10); unset defaults to 0. `verify_creature` flags `henchman_no_package`.
- `race` and `appearance` equal for the 7 PC races (rows 0-6); `buildMinimalUtc` defaults mismatch (Race 6, Appearance 0): `appearance_race_mismatch`.
- Invisible creatures: missing `BodyPart_*`/`Appearance_Head`/`Color_*` fields.
- Forged creatures re-level with `CL_ReLevel` (keeps spells); `spell_pool_stale` when abilities were written at a lower caster level.
- Spell baking, Random Abilities, `level_creature`: `docs/henchmen-and-caster-history.md`.

Gear
- `applyDefaultItemModels()` (`src/util/item-models.ts`) after `BaseItem` is final; composite weapons (ModelType 2) need `ModelPart1..3` non-zero.
- NPC gear: ammo with ranged weapons, cumulative armour proficiency feats, gender/voiceset consistency; racial weapon proficiencies (elf longsword/rapier). History `docs/gear-and-npc-generation-history.md`.
