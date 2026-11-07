# Creature forge: one declarative spec → a correct creature, at any level, in any form

Status: **design only, nothing built.** Measurements below were taken on
2026-11-07 against commit `e517065`, the real 8193.35 2DA set, 13 base-game
`nw_aarcl*` items, and The Frozen North's source (501 `.utc`, 1,321 `.uti`,
40 sampled `.git`). The audit scripts were throwaway; §9 turns each of them into
a permanent test.

## 1. Why this exists

The goal: an LLM states what a creature *is*, and a script produces it correctly.
That covers any creature, levelling it up or down, giving it legal feats and
spells, and changing how it looks, including dynamic player-character models that
fit its level and change as the story or a fight requires. It has to be flexible
and reliable.

Today that work is spread across about a dozen tools that the LLM must call in the
right order: `create_creature_blueprint`, `build_npc_stat_block`, `equip_npc_by_role`,
`bake_spec_ability_pool`, `level_creature`, `respec_weapon_feats`, `remove_feats`,
`set_creature_equipment`, `add_equipped_item_property`, `modify_gff_field`, and
hand-written spawn wrappers. Almost every user-reported NPC bug in `CLAUDE.md` is
a sequencing or wrong-assumption failure in that chain rather than a creative
mistake.

**The design in one sentence:** the LLM writes a `CreatureSpec`; one pure planner
simulates the creature level by level against the real 2DAs; the resulting plan
is written, read back and verified; and the spec stays embedded in the creature so
every later change is a re-plan rather than a hand edit.

## 2. Findings that shape the design

These came out of checking the current code against real data. Several overturn
notes in `CLAUDE.md`.

### 2.1 Armor AC comes from the torso part, not an item property (settles the 2026-10-13 TODO)

`parts_chest.2da` has an `ACBONUS` column indexed by `ArmorPart_Torso`. All 12
mundane base-game armors match `armor.2da` exactly on price through that lookup:

| Resref | Torso | Base AC | Cost | Properties |
|---|---|---|---:|---|
| `nw_aarcl009` | 28 | 1 | 5 | none |
| `nw_aarcl001` | 16 | 2 | 10 | none |
| `nw_aarcl002`, `008` | 43 | 3 | 15 | none |
| `nw_aarcl003`, `012` | 38, 36 | 4 | 100 | none |
| `nw_aarcl004`, `010` | 32, 25 | 5 | 150 | none |
| `nw_aarcl005`, `011` | 30, 45 | 6 | 200 | none |
| `nw_aarcl006` | 33 | 7 | 600 | none |
| `nw_aarcl007` | 14 | 8 | 1500 | none |

(`nw_aarcl013` is torso 0 with magic properties and is not part of this set.)

So the user was right on 2026-10-13: these items are real armor, and the
"cosmetic family" finding was wrong. Consequences:

- `armorTierFeat`'s callers (`checkEquipProficiency`, `armor_proficiency_mismatch`)
  read `ITEM_PROPERTY_AC_BONUS`, so they treat all unenchanted armor as AC 0. **The
  original "Rogue in Chainmail" bug still passes both checks.** Enchanted armor is
  mis-tiered too: +2 leather reads as Light by luck, +4 leather reads as Medium.
- `equipped_armor_no_ac_bonus` is a false positive by construction, and its
  advice is harmful.
- **The Hollow Communion's fix stacked real AC on top of real armor.** `hos_thug1/2/3`,
  `hos_cult1/2` and `gw_guard_a/b/c` were each given an AC property on armor that
  already had its base AC. Those properties should be removed.
- The "curated armor table" `CLAUDE.md` calls the priority follow-up is the table
  above; it needs no further research.
- Unknown: other `parts_*` tables carry fractional `ACBONUS` values. They did not
  move any of the 12 prices away from `armor.2da`, so torso-only is the working
  rule, but what those fractions do is unexplained.

### 2.2 Most generated feat lists are illegal or unfilled

`buildNpcStatBlock` was run across 3 races × 11 classes × 9 levels (297 blocks) and
every non-automatic pick was checked against `feat.2da`:

| Violation | Blocks |
|---|---:|
| **Any violation** | **224 of 297 (75 %)** |
| Missing prerequisite feat (Cleave without Power Attack) | 197 |
| Ability score too low (Dodge at Dex 12) | 80 |
| BAB too low | 42 |
| Bonus-slot pick not on the class's bonus list | 36 |
| Below `MinLevel` (Weapon Specialization at level 1) | 16 |

Slots also go unfilled, because the candidate queue holds only six feats: a level 20
Fighter leaves 13 slots empty, and a level 10 Wizard leaves 4 and receives Cleave.
No prerequisite logic exists in the generator. The engine is not known to reject
these lists on NPCs, so the cost is correctness, not crashes. `verify_creature`
doesn't check any of it.

BioWare already ships the missing data. `packages.2da` has 132 rows, each naming
ordered feat, skill, spell and equipment preference tables (`FeatPref2DA`,
`SkillPref2DA`, `SpellPref2DA`, `Equip2DA`). That includes sub-archetypes such as
`Fighter_Finesse`, `Fighter_Pirate` and `Fighter_Gladiator`, and `packeq*` lists
real item resrefs. The generator reads none of it except the row index.

### 2.3 "Any creature" is not what the tools build today

| Real creatures (of 501) | Count | Current tool support |
|---|---:|---|
| Have a creature weapon or hide item | 226 weapon, 216 hide | `EQUIP_SLOT_MAP` has no slots for them; `set_creature_equipment` can't write them |
| Use a non-PC class (Undead 44, Animal 39, Construct 32, Outsider 30, ...) | 248 class entries, excluding Commoner | PC formulas are applied blindly; the formula checks skip them |
| Use part-based `P` models | 137 (27 %) | Supported, but with one fixed look (§2.5) |
| Multiclass | 38 | Refused by `level_creature`, skipped by the HP and skill formula checks |

Pattern by monster class, for §5.5: Undead, Construct, Outsider, Vermin, Elemental
and Ooze carry a hide in 100 % of samples, and creature weapons run 71-100 %.
Animals have weapons (85 %) but rarely a hide (10 %). Ten monster classes share
`CLS_FEAT_CREA`; Aberration, Fey, Dragon, Giant and Outsider have their own tables.

### 2.4 Real spell lists exist in the exact shape previously marked as blocked

`CLAUDE.md` says static spell-book baking is blocked on an unknown `__struct_id`.
The corpus settles it: **1,162 of 1,162** spell entries use `__struct_id` 3 with
fields `Spell`, `SpellFlags`, `SpellMetaMagic`, and all 1,000 memorized entries have
`SpellFlags` 1.

- Cleric, Druid, Ranger and **Wizard** use `MemorizedList0-9`; Sorcerer and Bard use
  `KnownList0-9`. Neither ever uses the other's list.
- Static Wizards reach spell level 9. `imp_greater`, a level 7 Wizard, carries 5/4/3/2
  memorized at levels 1-4. The Wizard "level 2+ ceiling" was measured on the runtime
  setter only, so build-time baking may bypass it. That still needs a live test (S2).
- No class struct has `School` or `Domain1`/`Domain2`, which answers the encounter
  composer's open `SpellSchool` question: don't write them.

### 2.5 Runtime change is not as closed as documented

`CLAUDE.md` and `build_npc_level_library`'s description both say feats, abilities and
`SpecAbilityList` cannot change at runtime. There is no direct setter, which is true,
but NWScript has `ObjectToJson`, `TemplateToJson`, `JsonPatch` and `JsonToObject`. The
Lexicon explicitly lists "classes, domains, spell schools, feats, maximum HP,
abilities or spells known" as editable this way. The JSON is the same format as
`nwn_gff`, and `nw_inc_gff` is a stock helper include. **The catch:** it creates a
new object, so the old one must be replaced (S1). The `nwscript.nss` header warns
that the only guarantee is older data loading on newer builds.

Looks are also thin. `buildMinimalUtc` gives every creature `Appearance_Head` 1 and
colors 0, and nothing sets or checks a creature portrait; the only `PortraitId` writes
in the tools are 0 on triggers. The corpus has a non-zero `PortraitId` on 501 of 501
creatures, and its 127 standard-race models use 25 heads and 18 skin colors.

### 2.6 Other defects this design must not inherit

- **Blueprint equipment uses a non-standard shape.** Toolset `.utc` entries hold only
  `EquippedRes` (1,352 of 1,352); placed `.git` entries hold the whole item with
  `TemplateResRef` (528 of 528). `creature-builder.ts` writes the `.git` shape into
  `.utc` files. `CLAUDE.md`'s "no real equipped item struct carries `EquippedRes`" is
  true only of placed instances. **Unverified risk:** a creature spawned with
  `CreateObject` from a generated `.utc` may come up naked, which would be a candidate
  cause for the "no clothes" reports that were never reproduced (S0).
- **`level_creature` is lossy.** It rebuilds `FeatList` from scratch, dropping hand-
  added feats, and it defaults `powerLevel` to `elite` whatever the creature was
  built with.
- **`ChallengeRating` is never written** by `build_npc_stat_block` or `level_creature`,
  so `get_balance_report` reads a stale CR after any re-level. (`LevelUpHenchman`
  raises it by 1 on its own.)
- **A blueprint and its placed copy can get different weapons,** because the seed is
  `target.label`: `resref` for one and `area:tag` for the other.

## 3. Goals and non-goals

Goals:

1. Any creature in one request: PC-class NPCs, multiclass, prestige, monsters,
   commoners, henchmen.
2. Every generated choice is legal under the 2DAs, or refused with a reason.
3. Level changes in both directions, at build time and at runtime, without losing
   hand-specified content.
4. Looks are first-class: valid, varied, level-appropriate, and changeable mid-story
   and mid-fight.
5. Works with HAK content, because every rule is read from the loaded resman stack.

Non-goals: new models or 2DA authoring; encounter balancing (`compose_encounter`
calls this rather than the reverse); NWNX in shipped output; DM quickbar population.

Scope note: `CLAUDE.md` says blueprint modification is out of scope, yet this design
writes blueprints as the existing NPC tools already do. Worth rewording that line.

## 4. Architecture

```
 LLM ──> CreatureSpec (JSON)
             │
             ▼
   resolve archetype / package / defaults
             │
             ▼
   planCreature(spec, rules)          pure, deterministic, unit-tested
     walks level 1..N, one class level at a time
     ├─ abilities, HP, BAB, saves
     ├─ auto feats → slot feats (legality gate)
     ├─ skills     → spells  → gear  → look
     └─ levelLog[]: every choice with its reason
             │
             ├────────── plan_creature stops here (dry run)
             ▼
   writePlan → blueprint + every placed instance
             │
             ▼
   read back from disk, diff against plan, verify_creature
             │
             ├─ optional: stage ladder resources
             └─ optional: forms runtime (generated NWScript)
```

Three rules hold it together:

- **One planner.** All rule logic lives in `src/util/creature-plan/`. Existing tools
  become thin wrappers, so there is one place to be wrong.
- **The spec is the source of truth.** It is stored as JSON in an `MCP_CREATURE_SPEC`
  `VarTable` string on the creature. That survives repack, needs no sidecar, and
  travels with the blueprint.
- **Refuse, don't guess.** An unknown archetype, an impossible feat or an unaffordable
  item returns a structured problem naming the options. It is never silently
  substituted.

## 5. The creature spec and planner

### 5.1 `CreatureSpec`

Only `identity` and `chassis` are required. Everything else has a default, and a
one-line request stays one line. Values in this and later examples are illustrative.

```jsonc
{
  "identity": { "resref": "brn_marshal", "tag": "brn_marshal", "name": "Marshal Bryn",
                "faction": 1, "seed": "brn_marshal" },
  "chassis": {
    "kind": "pc_class",            // pc_class | monster | commoner
    "race": 4, "gender": 1,
    "archetype": "knight_commander",   // optional shortcut, expands to the fields below
    "package": 26,                     // packages.2da row; drives feat/skill/spell/gear order
    "progression": [                   // ORDERED: level order is meaningful
      { "class": 4, "levels": 6 },
      { "class": 6, "levels": 2 }
    ],
    "rules": "full",                   // full | simple | creature
    "legality": "auto",                // auto | strict | loose (§5.3); auto = strict for henchmen, loose otherwise
    "abilities": { "method": "elite", "priority": ["str", "con", "cha"] }
  },
  "feats":  { "required": [28], "preferred": [], "banned": [] },
  "skills": { "preferred": [], "banned": [] },
  "spells": { "system": "special_abilities", "themes": ["divine"], "pinned": [] },
  "gear":   { "role": "elite", "wealth": 1.0, "wardrobe": "soldier",
              "pinned": { "righthand": "nw_wswls001" } },
  "look":   { "head": "auto", "palette": "steel", "portrait": "auto", "soundset": "auto" },
  "forms":  [ /* §7 */ ],
  "stages": { "levels": [8, 10, 12] }    // §8
}
```

`applyTo: "blueprint" | "instance" | "both"` is a tool parameter, default `both`.

Archetypes extend the existing `ARCHETYPES` table, one verified entry at a time. They
name a package, not a hand-written feat list, so entries stay small.

### 5.2 Level-by-level simulation

This is the central change. Today's generator computes final totals in one pass,
which is why prerequisites can't work: "BAB at the moment this feat was taken" does
not exist. The planner instead walks each class level in `progression` order and
keeps running state.

At each level it applies these in order:

1. Class level, cumulative BAB and saves from `AttackBonusTable` and `SavingThrowTable`.
2. Ability gain at each 4th total level, plus `StatGainTable` where the class has one.
3. HP, using the class's own `HitDie`.
4. Skill points, spent against `SkillPref2DA` order and rank caps. Spending precedes
   feats so that `REQSKILL` prerequisites can be met at the same level.
5. Automatic feats (`cls_feat_*`, `List=3`, `GrantedOnLevel` equal to the class level).
6. Open slots: generic (from race tables) and bonus (`cls_bfeat_*`).
7. Fill each slot from the pick order below, through the legality gate.
8. Spell slots for the level.

Multiclass and prestige follow from this directly, and it removes the "multiclass
can't be reconstructed" skip from the verify formulas, since the level order is
recorded. Prestige entry is checked against `PreReqTable`.

### 5.3 Feat legality gate and pick order

A feat is legal at a given level when all of these hold:

- `PREREQFEAT1`, `PREREQFEAT2`, and at least one `OrReqFeat0-4` if any are set
- `MINATTACKBONUS`, `MINSTR` through `MINCHA`, `MINSPELLLVL`, `MinFortSave`
- `REQSKILL` and `REQSKILL2` ranks
- `MinLevel`, `MinLevelClass`, `MaxLevel`, `PreReqEpic`
- class access: `ALLCLASSESCANUSE`, or listed in the class's `cls_feat` table
- bonus slots only: `List` 1 or 2 for that class
- not already held, unless `GAINMULTIPLE`

Pick order for a slot: `feats.required`, then `feats.preferred`, then the package's
`FeatPref2DA`, then the project's weapon investment rules, then legal general feats by
a small universal order. Project rules stay in force as filters:
`WEAPON_INVESTMENT_CLASS_IDS`, the 15 base-stat rule, and `rules: "simple"`, which
stops after automatic feats.

If a pick is legal only with a prerequisite, the planner schedules the prerequisite
first when a slot allows. So Power Attack comes before Cleave without the spec having
to say so. A `required` feat that can't be reached is a hard error naming the failed
requirement. `feats.waive: [id]` is the explicit override for a story-granted feat.

**Legality modes** (decided 2026-11-07). The planner's own picks always go through the
gate above in both modes, so an unattended build is legal either way. The modes differ
only in what happens to feats a caller asks for, or that an adopted creature already has:

| Mode | Default for | An illegal requested or existing feat | `feat_prereq_unmet` |
|---|---|---|---|
| `strict` | Henchmen and companions (anything with `henchman: true`), always | Refused, naming the failed requirement; `waive` is the only way through | error |
| `loose` | Every other NPC: bosses, minions, Key NPCs | Accepted and kept, reported once | warning |

Henchmen must be strict because they are levelled up later by scripts
(`LevelUpHenchman`, ladders, transplant). The engine's level-up and the planner's
re-plan both start from the creature's current state. A feat that fails its
prerequisites, or a feat count that doesn't match the level, makes later level-ups
unpredictable. A henchman spec that asks for `loose` is refused, not downgraded.

### 5.4 Skills, CR and identity details

- **Skills** follow `SkillPref2DA` instead of today's round-robin, which spreads ranks
  over every class skill.
- **CR** is written on every apply, using `estimateCRFromLevel` for PC-class creatures.
  For monsters, the source CR plus the level delta. `crSource` is reported.
- **Seed** comes from `identity.seed` and never from the target label, so the blueprint
  and its placed copy always agree.

### 5.5 Monsters

A monster spec is a real chassis plus advancement, and never a from-scratch build:

```jsonc
"chassis": { "kind": "monster", "base": "nw_skeleton", "rules": "creature",
             "progression": [{ "class": 19, "levels": 8 }], "naturalAC": "+2" }
```

The planner clones `base` through the existing blueprint resolver, keeps its creature
weapons, hide, `SpecAbilityList` and feats, then adds class levels using that class's
own `HitDie`, BAB and saves. New `rules: "creature"` skips PC-only logic.

`EQUIP_SLOT_MAP` gains the verified masks `cweapon_l` 16384, `cweapon_r` 32768,
`cweapon_b` 65536 and `hide` 131072. A monster spec with no `base` must supply its
creature weapons explicitly, or it's refused; a monster with no weapon has nothing
to attack with.

Not designed yet: creature-weapon damage growth with size or HD. Advancement keeps
the base's items and reports that, rather than inventing a scaling rule.

### 5.6 Spells

`spells.system` picks the delivery. **Decided 2026-11-07: `special_abilities` is the
system for every creature that casts**: henchmen, bosses, minions, any level, any
class mix. The other systems stay available for exceptions only.

| System | How | Use | Status |
|---|---|---|---|
| `special_abilities` | `SpecAbilityList`, ready subset at spawn | **All casters** | Built, confirmed live; needs the corrections below |
| `static_book` | `MemorizedListN` / `KnownListN`, struct id 3 | Exception only, if S2 passes | New, pending S2 |
| `random_abilities` | `SetMemorizedSpell` at spawn | Fallback, unchanged | Built, Wizard capped |
| `none` | Nothing, with a warning on caster classes | Plot exemption | Trivial |

**The requirement.** A caster's abilities must look like that class's real spells at
that level:

1. **Right spells.** Each ability is on the class's spell list, at an accessible
   spell level, read from the spell's own class column in `spells.2da` (the `Master`
   inheritance guard). `spec-ability-pool.ts` already does this.
2. **Right caster level.** Each entry's `SpellCasterLevel` is the creature's caster
   level for that class, so the spell's damage, duration and range match. **Gap:**
   every writer today puts the raw class level there (`spec-ability-tools.ts:149`,
   `npc-tools.ts:463/626`, `encounter-composer-tools.ts:413`). That is wrong when a
   prestige class advances casting. In base data, Pale Master has `ArcSpellLvlMod`
   2, so a Wizard 10 / Pale Master 6 casts at level 13. It is also unconfirmed for
   Paladin and Ranger, whose engine caster level may not be their class level (S4).
3. **Right number of slots.** The number of ready entries at each spell level equals
   the class's spells per day at that caster level: `cls_spgn_*` read at the
   effective caster level, plus the ability bonus (`bonusSpellsForLevel`). **Gap:**
   the pool holds one entry per distinct spell, so a level can never have more ready
   entries than distinct eligible spells. The slot count is also read at class level,
   ignoring prestige advancement.
4. **Spontaneous casters keep a known list.** Bard and Sorcerer get a known list
   sized by `SpellKnownTable` (`CLS_SPKN_BARD`/`_SORC`) at the effective caster
   level. Their slots per day are then spread over the known spells as repeated
   entries, like a Sorcerer casting Magic Missile four times. **Gap:** today every
   eligible spell is in the pool and there is no known-list cap.

**Design.**

- `effectiveCasterLevel(classPositions, classId)`: the class's own level, plus the
  `ArcSpellLvlMod`/`DivSpellLvlMod` contributions of later prestige levels. Each
  contribution goes to the creature's first arcane or divine class, using
  `floor(levels / mod)` until S4 confirms the engine's rounding (floor or ceiling;
  the Wizard 10 / Pale Master 6 example gives 13 either way). Data-driven, so HAK prestige classes work with no
  code change. Paladin and Ranger use whatever S4 measures.
- The pool allows **repeated entries**. Prepared casters get, for each spell level,
  enough entries that any slot-sized pick is possible, up to the slot count of each
  spell. Spontaneous casters get each known spell repeated up to that level's slot
  count.
- **One slot table, written once.** The planner writes the per-class,
  per-spell-level ready counts onto the creature as a JSON VarTable local
  (`MCP_SA_SLOTS`). `SA_OnSpawn` reads it instead of recomputing from
  `GetLevelByClass`. Build time and runtime can't disagree, and prestige rules
  live only in TypeScript.
- Re-baked on every level change: `revise_creature`, `level_creature`, every ladder
  stage. A stage transplant carries the new stage's list and table.
- Themes, `pinned` and `SpellPref2DA` order bias which spells are picked, never how
  many.

**Verification** (new codes in §9):

| Code | Severity | Fires when |
|---|---|---|
| `spell_ability_off_list` | error | An entry's spell isn't on any of the creature's class lists at an accessible level |
| `spell_ability_caster_level` | warning | `SpellCasterLevel` differs from `effectiveCasterLevel` |
| `spell_ability_slot_mismatch` | warning | `MCP_SA_SLOTS` differs from the planned slot table, or the pool can't fill it |
| `spell_ability_known_overflow` | warning | A spontaneous caster has more distinct spells at a level than `SpellKnownTable` allows |

`caster_no_spells` learns to recognise the wiring of each system, closing its
documented false positive.

### 5.7 Gear

1. **Budget:** `get_wealth_budget(level, role)` × `gear.wealth`.
2. **Armor:** choose by class proficiency, role, and dexterity fit (`armor.2da`
   `DEXBONUS`), then by cost. Source from §2.1's table.
3. **Weapons:** `pinned`, then the weapon matching held Weapon Focus feats, then
   `CLASS_WEAPON_PREFERENCES`, then the package's `Equip2DA`. Real resrefs only.
4. **Completeness:** ammo, melee backup and clothing are part of the plan, using the
   existing rules, so the checks pass by construction.

A new shared `armorBaseAC(item)` reads `parts_chest[ArmorPart_Torso].ACBONUS`, and all
proficiency logic goes through it. AC properties are enhancement only.

**Runtime shopping (decided 2026-11-07).** A creature levelled at spawn (§8.3) buys its
gear from stores after levelling, with a gold allowance that grows with level. Same rules
as above, run in NWScript by `inc_cre_gear`:

- **Stores are named per module.** The module local `MCP_GEAR_STORES` lists store tags
  or resrefs. If none are listed, a default set of base-game stores is used. Stores the
  module doesn't place are created once in a hidden holding area at module load and
  reused.
- **Allowance:** the `get_wealth_budget(level, role)` table, embedded in the include as
  constants, × the creature's `MCP_GEAR_WEALTH` (default 0.5, user-set 2026-11-07). Recomputed at the
  creature's final level.
- **Buying order:** armor (by `armorBaseAC` and proficiency), main weapon (the plan's
  weapon focus or class preference), shield or off-hand, ammo to the ammo-quantity
  convention, then accessories with whatever is left. An item is skipped if the creature
  lacks the proficiency (`GetHasFeat` against `baseitems.2da` `ReqFeat0-4`) or the slot.
- **Purchase:** `CopyItem` from the store onto the creature, then equip. The store's own
  stock is left untouched, so every NPC sees the same catalogue. Unspent allowance is
  discarded (decided 2026-11-07): the creature is given no gold.
- `GetItemACValue` is not used for the armor tier until a spike confirms whether it
  includes the torso base AC (S6); `armorBaseAC`'s 2DA lookup is the fallback.

## 6. Looks: valid, varied, and right for the level

### 6.1 Model classes

`appearance.2da` `MODELTYPE` decides what a look can do, and every look operation
checks it first:

| Model type | Examples | Armor visible | Parts, head, colors, phenotype |
|---|---|---|---|
| `P` part-based | rows 0-6, mounted rows | Yes | Yes |
| `F`, `S`, `L` and wing/tail variants | Monsters, animals | No | No |

So a gear-based "tier look" means nothing on a monster model, and the planner says
so instead of pretending. The `ArmorPart_*` fields live on the armor item, while
`BodyPart_*` fields are the bare body beneath.

### 6.2 The look catalog

A new `src/util/look-catalog.ts` builds a validated list per race, gender and
phenotype from the loaded resman stack, so HAK content appears on its own:

| Choice | Source | Rule |
|---|---|---|
| Head | `p<g><r><ph>_head*.mdl` names in resman | Must exist for that exact combination. File counts run from 9 (gnome female) to 73 (human male), so a number valid for one race isn't valid for another |
| Skin, hair, tattoo | Palette 0-175 | Named palettes per race, curated from corpus samples |
| Phenotype | `phenotype.2da` | 0 and 2 by default |
| Portrait | `portraits.2da` `Race`, `Sex` | Rows exist per race and sex: 89 human male, 68 human female. Monsters use `sourceResref`'s own |
| Soundset | `soundset.2da` `TYPE` 0, matching `GENDER` | 36 PC voices. Existing rule, now automatic |
| Tail, wings | `tailmodel`, `wingmodel` | Fields stay `dword` |

`auto` picks with the seed, giving variety that is reproducible. Choosing from the
catalog ensures a valid value. `get_look_options` exposes it so the LLM can pick
deliberately.

### 6.3 Level-appropriate looks

A **wardrobe** is a small named table mapping an armor tier to real items and a
color palette:

```jsonc
"soldier": { "palette": "steel",
  "tiers": { "ac3": ["nw_aarcl002"], "ac5": ["nw_aarcl004"],
             "ac6": ["nw_aarcl005"], "ac8": ["nw_aarcl007"] } }
```

Level drives it indirectly and truthfully: level → budget → affordable, proficient
armor → that tier's model. A level 2 militia soldier and a level 14 knight then
differ because their gear does. Higher tiers add visible extras such as helmet,
cloak and shield from the same budget.

**Hard rule: never change `ArmorPart_Torso` for looks without re-checking AC.** Torso
is the armor's stats. Recoloring is free, as is changing other parts, but a torso
swap must stay within the same `ACBONUS` value. Only 3 rows have AC 1, so reskins
at some tiers are limited, and the planner reports that rather than crossing tiers.
Color work reuses the `create_gear_randomizer` technique.

## 7. Forms: changing appearance during play

A **form** is a named look a creature can switch to at runtime. Forms are data on the
creature and a single generated include (`inc_cre_form`) runs them, so the LLM never
writes appearance NWScript.

```jsonc
"forms": [
  { "name": "disguised", "initial": true,
    "appearance": 6, "head": 12, "displayName": "Old Pilgrim", "wardrobeItem": "nw_cloth001" },
  { "name": "revealed", "appearance": 288, "portrait": "auto", "soundset": "auto",
    "displayName": "The Hollow Saint", "vfx": 482, "scale": 1.15, "lerp": 2.0,
    "on": [{ "event": "dialog", "id": "reveal" }] },
  { "name": "wounded_rage", "effects": ["haste"], "scale": 1.3, "tint": "red",
    "on": [{ "event": "hp_below", "percent": 40, "once": true }] }
]
```

### 7.1 Mechanisms

The planner uses the lightest mechanism that satisfies a form:

| Layer | Primitives | Changes stats? | Notes |
|---|---|---|---|
| Cosmetic | `SetCreatureAppearanceType`, `SetCreatureBodyPart`, `SetColor`, `SetPhenoType`, `SetCreatureTailType`, `SetCreatureWingType`, `SetPortraitResRef`, `SetSoundset`, `SetName`, `SetDescription`, `SetObjectVisualTransform` | Size and speed only, from `appearance.2da` | Keeps gear and spells. Scale doesn't change collision (`PERSPACE`). Appearance change doesn't change portrait, so forms set both |
| Gear | `ActionEquipItem`, `CopyItemAndModify` | By item | Copy returns a new object; follow the rules in `gear-appearance.ts` |
| Effect | `EffectPolymorph`, stat and VFX effects | Yes, reversible | Polymorph removes gear access and blocks spellcasting, so it's wrong for a caster boss. 107 rows in `polymorph.2da` |
| Stage | §8 transplant | Yes, permanent | New object. Used only when feats or class must change |

### 7.2 Triggers and wiring

| Event | Wired through |
|---|---|
| `spawn` | Chained `ScriptSpawn` |
| `hp_below` | Chained `ScriptDamaged`, latched so it fires once |
| `dialog` | Generated one-line action script for the node |
| `quest` | Generated `CF_OnQuest` call for quest scripts to use |
| `level` | Stage change (§8) applies the form for that level |
| `call` | `CF_SetForm(oCreature, "name")`, for bespoke scripts |

Wrappers follow the established pattern: `ExecuteScript` the original handler, then
`DelayCommand` into form logic so it gets its own instruction budget. Compiling each
wrapper after generating the include stays mandatory.

`CF_SetForm` records the current form in a local, so reapplying is a no-op and a
reversal returns to the recorded `initial` values. A per-form `FORM_OK`/`FORM_FAIL`
log line reads each value back with `GetAppearanceType`, `GetCreatureBodyPart`,
`GetColor` and so on, which `run_live_verification` already surfaces.

**Engine floor:** `SetCreatureBodyPart`'s multiplayer sync and armor fixes arrived in
1.88.8193.36, along with a `SetCreatureAppearanceType` fix; `SetSoundset` is .35. The
local 2DA set is .35. Confirm the shipping build before relying on these (S3).

## 8. Levelling up and down

### 8.1 Build time

`revise_creature` re-plans from the stored spec with a changed level, in either
direction, and rewrites both copies. Nothing hand-specified is lost because it's all
in the spec. This replaces `level_creature`'s rebuild-and-drop behaviour.

`adopt_creature` makes this work for an existing creature with no spec. It derives
one from the GFF, records unrecognised feats as `required` with `waive`, and marks
level order `assumed`.

### 8.2 Runtime

| Method | Grants correctly | Direction | Object kept | Status |
|---|---|---|---|---|
| Effects (ability, attack, HP) | Numbers only, no feats | Both | Yes | Works; good for short boss phases |
| `LevelUpHenchman` with `deferLeveling` | No automatic feats; Wizard capped | Up | Yes | Built; existing companion path |
| Replace with a ladder blueprint | Everything | Both | **No** | `build_npc_level_library` exists; loses state unless carried |
| **Stage transplant** | Everything | Both | **No**, but state carried | **New, pending S1** |

**Stage transplant** keeps all rule logic in tested TypeScript and makes NWScript a
small mover. At build time, the planner writes one ladder blueprint per requested
level (`<base>_l07`, with `base` capped at 12 characters for the 16-character resref
limit). At runtime:

```
jLive   = ObjectToJson(oCreature, TRUE)          // state, effects, locals
jStage  = TemplateToJson("<base>_l07", RESTYPE_UTC)
jNew    = jLive with stage fields replaced:
          ClassList, FeatList, SkillList, Str…Cha, HP fields,
          SpecAbilityList, ChallengeRating, NaturalAC
oNew    = JsonToObject(jNew, location, OBJECT_INVALID, TRUE)
re-bind master / henchman slot, faction, target; carry HP percentage
DestroyObject(oCreature)
```

If the object can't be replaced at that moment, for example an active conversation,
the call defers and logs. Any script holding the old object reference must look it up
by tag, and the generated helpers do. The plan reports ladder size, so resource count
is a visible cost: request only the levels the story needs.

### 8.3 Spawn-time levelling (decided 2026-11-07)

This is the standard path for placed NPCs: henchmen, bosses and minions at any level. It
follows the Frozen North random adventurer and Battlefield 1142: build a valid low-level
creature, then level and equip it when it spawns. The decisions were:

- **Levelling uses the stock `LevelUpHenchman` loop**, as Battlefield 1142 does. Frozen
  North writes stats with about 700 `NWNX_Creature` calls, which would make every module
  need an NWNX dedicated server.
- **Build rules live in a build-time plan** made by the tested TypeScript planner.
- **Spells are special abilities**, added after levelling (§5.6).

**Build time.** `forge_creature` writes:

1. A level-1 creature that is fully valid at level 1: racial and automatic class feats,
   the planned level-1 picks, abilities, skills, HP and package. Its alignment must fit
   the class, because `LevelUpHenchman` silently refuses a level in a class whose
   alignment restriction it fails.
2. `MCP_LEVEL_PLAN`, a JSON local holding, for every level up to the plan's maximum:
   - the class to take at that level (this is how multiclass order is kept, through
     `LevelUpHenchman`'s `nClass` argument)
   - the automatic feats that level should grant (`cls_feat` List 3)
   - the special-ability slot table and the spell picks (§5.6)
   - the feats the planner expects, for verification
   It holds two or three seeded variants for variety; the spawn script picks one by the
   creature's seed.
3. Wiring: `ScriptSpawn` points at a wrapper that runs the creature's normal spawn
   script and then `CF_LevelOnSpawn` after a `DelayCommand`, so it gets its own
   instruction budget.

**The level variable** on each placed NPC sets how far it is levelled:

| Local | Meaning |
|---|---|
| `MCP_LEVEL` (int) | Absolute target level |
| `MCP_LEVEL_REL` (int) | Offset from the party's average level at spawn, like Battlefield 1142's `avglvl`. Used if `MCP_LEVEL` is unset |
| `MCP_LEVEL_MIN` / `MCP_LEVEL_MAX` | Clamp; `MAX` defaults to the plan's maximum |
| `MCP_GEAR_WEALTH` (float) | Gear allowance multiplier; 0 means don't equip |
| `MCP_LEVEL_DONE` (int) | Set by the script; stops a second run on respawn or rebuild |

**Spawn sequence** (`inc_cre_level`), split by `DelayCommand` to stay under the
instruction limit:

1. Read the target level and clamp it to the plan's range.
2. Loop `LevelUpHenchman(oNPC, planClass[level], TRUE, package)` to the target. Stop
   and log if a call returns 0.
3. **Finish pass** (fills the known gaps of `LevelUpHenchman`):
   `ObjectToJson(oNPC, TRUE)`, then
   - add any automatic feats the plan expects that are missing, since `LevelUpHenchman`
     is recorded as adding none (S5 re-checks this)
   - replace `SpecAbilityList` with the plan's entries for the reached level, each with
     the correct `SpellCasterLevel` and the right number ready per spell level
   - set `ChallengeRating`
   - then `JsonToObject` at the same spot, copy the tag, set `MCP_LEVEL_DONE`, and
     destroy the original.
   At spawn the creature hasn't fought, been hired or been talked to, so this is the
   easy case of S1. If S1 fails, the fallback is route A below.
4. Verify (below), then shop for gear (§5.7).

**Adding spell abilities without a rebuild (route A, fallback).** NWScript cannot add a
`SpecAbilityList` entry directly: the engine only has `GetSpellAbilityCount`,
`GetSpellAbilitySpell`, `GetSpellAbilityCasterLevel`, `GetSpellAbilityReady` and
`SetSpellAbilityReady` (1.88.8193.36+). So route A bakes a pool at build time that covers
the plan's maximum level, and at spawn readies the right number for the level actually
reached, as `inc_spec_ability` does now. Its limit is that each entry's
`SpellCasterLevel` is fixed when baked, so it can only be right for one level. If S4
shows caster level drives spell effects, route A gives low-level spawns over-strong
spells (or the reverse), and the finish pass is needed.

**Verification in NWScript** (`CF_VerifyCreature`): logs `[SPEC_OK]`/`[SPEC_FAIL]`, which
`run_live_verification` already reads, and also writes a summary local for
`get_object_variables`. It checks:

- reached level and class per level against the plan (`GetClassByPosition`,
  `GetLevelByPosition`)
- every expected automatic and planned feat (`GetHasFeat`)
- for each spell level, the ready special-ability count against the slot table
- each ability's spell is on one of the creature's class lists at an accessible level
  (`Get2DAString("spells", column, id)`, reading the spell's own column, never
  `GetSpellLevelByClass`)
- each ability's caster level against the planned caster level
  (`GetSpellAbilityCasterLevel`)
- equipped armor and weapons against proficiency feats, once shopping is done

Engine picks made by `LevelUpHenchman` that the plan didn't predict, such as a different
skill spread, are reported as information, not failures. The engine's own level-up
validation is trusted for those.

## 9. Reliability

The planner is only worth building if bugs of the classes above cannot come back.

| Layer | Check | Catches |
|---|---|---|
| Unit | Golden plans; determinism for a seed | Regressions |
| Property | Every race × class × level has **zero** legality violations and no unfilled slot without a stated reason. Replaces §2.2's audit, which fails 224 of 297 today | Illegal builds |
| Corpus oracle | Env-gated like `tile-oracle.live.test.ts`, over `TFN_SRC`: armor AC vs price, spell struct shapes, slot masks, heads resolve | Wrong assumptions about the format |
| Write | Read the written file back from disk and diff against the plan, on both copies | Lost writes, separate-copy bugs |
| Static | New `verify_creature` codes (below); `verify_all` runs them | Hand edits, older modules |
| Live | `run_live_verification` loads a fixture roster and compares `SPEC_*` plus `FORM_OK` lines | Engine reality |
| Human | Toolset or client visual pass per look category | What a headless server can't see |

New or changed verify codes:

| Code | Severity | Meaning |
|---|---|---|
| `feat_prereq_unmet` | error if strict, warning if loose (§5.3) | Any `feat.2da` requirement fails, unless waived |
| `feat_slot_mismatch` | warning | Feat count differs from plan for the level |
| `armor_proficiency_mismatch` | error | **Fixed** to use torso AC |
| `equipped_armor_no_ac_bonus` | removed | False positive (§2.1) |
| `head_model_missing` | error | Head absent for that race, gender and phenotype |
| `part_row_invalid` | error | `ArmorPart_*` row is `****` in its `parts_*` table |
| `no_portrait` | warning | `PortraitId` missing or 0 |
| `armor_on_non_part_model` | warning | Equipped armor can't be seen |
| `blueprint_equip_shape` | error, if S0 confirms it | `.utc` entries lack `EquippedRes` |
| `spec_drift` | warning | Creature no longer matches `MCP_CREATURE_SPEC` |
| `cr_stale` | warning | CR disagrees with current level |

Tool conduct follows existing rules: every failure sets `isError`, responses contain
structured `problems` with a `fix`, numeric params are `z.string()`, and annotation
objects are never empty. `forge_creature` on an unchanged spec is a no-op, by spec
hash, so retries are safe.

## 10. Tools

| Tool | Purpose | Replaces |
|---|---|---|
| `plan_creature` | Dry run. Returns the plan, level log and problems; writes nothing | |
| `forge_creature` | Build or update from a spec; optional placement | Most multi-tool sequences |
| `revise_creature` | Apply a partial spec patch, including level changes | `level_creature` (kept as a wrapper) |
| `adopt_creature` | Create a spec for an existing creature | |
| `build_creature_ladder` | Build stage blueprints | `build_npc_level_library` (kept as a wrapper) |
| `get_look_options` | Valid heads, portraits, voices, palettes | |
| `create_creature_forms_system` | Generate `inc_cre_form`, wrappers and compile proof | |

`build_npc_stat_block`, `equip_npc_by_role` and `compose_encounter` call the planner
internally. **Skills to update in the same change:** `adventure-actors`,
`adventure-challenges`, `create-adventure`, `systest-module` and
`nwn-character-editor`, plus a new `creature-forge` skill. Hand-rolled wrapper recipes
in `adventure-actors` get removed once the tools cover them.

## 11. Phased plan

**Phase 0: fix what is wrong now.** Worth doing whatever happens to the rest.

- `armorBaseAC`, fix both proficiency paths, remove `equipped_armor_no_ac_bonus`,
  correct `add_equipped_item_property`'s guidance.
- Strip the stacked AC properties from The Hollow Communion.
- Add creature slots to `EQUIP_SLOT_MAP`; write CR on stat-block and level changes.
- Fix the seed source.
- Correct the `CLAUDE.md` notes listed in §2.

**Spikes, before the phases that depend on them.** All run on the verify server.

| Spike | Question | Decides |
|---|---|---|
| S0 | Does `CreateObject` from a generated `.utc` come up equipped? Compare `EquippedRes` | Blueprint write shape; possible cause of the unreproduced "no clothes" reports |
| S1 | Does the transplant preserve HP, effects, locals, master, faction and combat? How long does it take? | Whether §8's stage path exists |
| S2 | Does a baked book at real slot counts cast, including Wizard 2nd level and up? | Whether `static_book` is available as an exception |
| S3 | Shipping build version; can a monster model switch to a `P` model and back cleanly, with parts and armor? | Form limits |
| S4 | For special abilities: is each ready entry one cast per rest, and does resting restore it? Do repeated entries give repeated casts? Does `SpellCasterLevel` drive the spell's effects? What caster level does the engine use for Paladin and Ranger, and does it round `ArcSpellLvlMod` up or down? | §5.6 pool shape and caster level |
| S5 | After a `LevelUpHenchman` loop on a correctly built level-1 creature, which later automatic class feats (Rogue Evasion, Barbarian Uncanny Dodge, Monk) are present? Are its package feat picks legal? | What §8.3's finish pass must add |
| S6 | Does `GetItemACValue` include an armor's torso base AC? Can a store object's inventory be iterated and copied from in a hidden area? | §5.7 runtime shopping |

**Spike results (2026-11-07).** S0, S1, S4, S5 and S6 were run on the verify server with a
throwaway module (`cf_spikes`: one valid level-1 human per base class, two
special-ability casters, a transplant subject, three base-game stores). Each spell's
impact script was replaced in the module by a stub that logs `GetCasterLevel`, so caster
level was read from the engine, not inferred.

| Spike | Result | Consequence |
|---|---|---|
| S0 | **Write shape is fine; proficiency is the cause.** A creature with no proficiency feats came up with nothing equipped in all six cases: `EquippedRes`-only, full item struct, and both together, each as a blueprint spawned with `CreateObject` and as a placed instance. The same six with feats 2/3/4/45/46 all came up equipped (longsword, AC 5 armor, total AC 15). A base-game `nw_bandit001` equipped as a control. **The engine silently refuses to equip items the creature isn't proficient with.** | Explains "no clothes": the creature lacked proficiency feats, or (the Rogue case) wore armor above its proficiency, which our checks miss because they read AC from properties. No blueprint-shape change needed. `armor_proficiency_mismatch` and `weapon_proficiency_mismatch` describe a creature that will be **naked or unarmed in play**, so the armor-AC fix in Phase 0 is the real fix. |
| S1 | **Works at spawn.** `ObjectToJson(o, TRUE)` → patch → `JsonToObject(..., TRUE)` kept tag, locals, current HP (60/65), effects, level and BAB; an added feat and a replaced `SpecAbilityList` both took effect. About 36 ms. With `FALSE`, locals and effects are lost. The new object's `OnSpawn` fires again. An empty `FeatList` is absent from the JSON, so the patch must create it. | §8.3 finish pass is viable. Use `TRUE`, and guard `OnSpawn` with `MCP_LEVEL_DONE`. |
| S4 | **Each ready entry is one cast;** after casting it reads not-ready. Two entries of the same spell gave two casts; a third cast did nothing. `ForceRest` made all entries ready again. **`SpellCasterLevel` is the caster level the spell sees** (3 → `cl=3`, 9 → `cl=9`). | Slot model and repeated entries are right. Caster level must be written correctly per level, so route A's fixed caster level is wrong for dynamic levels: use the finish pass. |
| S4 | **Paladin 12 and Ranger 12 cast at caster level 12** (`castclass` 6 and 7). | `effectiveCasterLevel` = class level for both. |
| S5 | All 11 base classes reached level 12 through `LevelUpHenchman` from a level-1 build. **Levels 2–12 added every automatic class feat and no illegal feat** (checked against `cls_feat` List 3 and `feat.2da` prerequisites). Every violation found was at level 1, written by our own `build_npc_stat_block`: Cleave without Power Attack (7 classes), Weapon Specialization at level 1 (4), Improved Critical at base attack 1 (2). | `CLAUDE.md`'s "LevelUpHenchman grants zero automatic feats" holds only for creatures with an empty level-1 feat list. The finish pass doesn't need to add feats. The level-1 base must be legal: the planner's job. |
| S6 | `GetItemACValue` = torso base AC + enhancement (`nw_aarcl004` 5, `nw_aarcl007` 8, `nw_maarcl046` torso 36 → 4 + 1 = 5). Base-game stores spawn, iterate (77–91 items), `CopyItem` onto a creature works, and the store's count is unchanged. Store gold reads -1 (unlimited). | Runtime shopping can use `GetItemACValue` directly. Copying doesn't deplete stores. |

Still untested: the rounding of `ArcSpellLvlMod` (Pale Master), and S2 and S3.

**Phase 1: planner core.** `CreatureSpec`, level simulation, legality gate, package
tables, property test, `plan_creature`. Reads only, so it ships safely.

**Phase 1b: spell correctness.** After S4. `effectiveCasterLevel`, repeated pool
entries, known-list cap, `MCP_SA_SLOTS`, the four spell codes. Applies to existing
`bake_spec_ability_pool`, `level_creature` and `compose_encounter` straight away,
before the rest of the forge exists.

**Phase 2: write path.** `forge_creature`, read-back, spec embedding, `adopt_creature`,
`revise_creature`, verify codes, gear and multiclass.

**Phase 3: looks.** Catalog, `get_look_options`, wardrobes, portraits, corpus oracle.

**Phase 4: monsters and prestige.** `kind: monster`, `rules: creature`, `PreReqTable`.

**Phase 5: runtime.** Spawn-time levelling first (§8.3: `inc_cre_level`, the finish pass
or route A, `CF_VerifyCreature`, `inc_cre_gear`), after S1, S4, S5 and S6. Then the
forms system, which depends only on S3. Then ladders
and transplant if S1 passes. If S1 fails, ladders still work as plain replacement.

**Phase 6: migrate.** Wrap older tools, update skills, and extend the `systest-module`
fixture roster with one creature per chassis kind and form layer.

## 12. Decisions

1. ~~**"Dynamic player character models for their level."**~~ **Resolved (2026-11-07):**
   confirmed as written. Part-based models whose gear and look reflect level through
   wealth and armor tier (§6.3), plus runtime changes (§7).
2. **Resolved (2026-11-07): legality.** `loose` is fine for NPCs; henchmen are
   always `strict` so scripts can level them up. See §5.3.
3. **Resolved (2026-11-07): `feat_prereq_unmet` severity.** Error for strict
   creatures, warning for loose ones.
4. **Resolved (2026-11-07): spells.** `special_abilities` for all casters of any
   level or role, corrected to the right spells, caster level and slots per day (§5.6).
5. **Resolved (2026-11-07): ladder budget.** No file cap; the plan still reports the
   count.

6. **Resolved (2026-11-07): spawn-time levelling.** The `LevelUpHenchman` loop with a
   build-time plan and a finish pass, a level variable on each placed NPC, and gear
   bought from per-module named stores with a level-scaled allowance (§8.3, §5.7).

No decisions remain open. S0–S6 settle the remaining unknowns. S1 (spawn case), S4 and
S5 decide whether the finish pass or route A is used.
