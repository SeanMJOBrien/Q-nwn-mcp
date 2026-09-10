# Actors survey — TFN (n=505 creature blueprints)

Raw counts: `actors_raw.json` in this directory.

## Level / class distribution

505 blueprints span level 1–20+ (mode: level 1, 86 blueprints — low-level
filler/random-encounter fodder dominates a live PW's roster, as expected).
Class-level totals across the corpus (`class_id: total char-levels`):
Fighter(4)=477, then several NPC-only classes (13, 19, 24 — Commoner and
monster-type classes), Wizard(10)=195, Cleric(2)=185, Sorcerer? etc. Fighter
being the single largest **PC-class** total matches Ashcrown's own roster
skew and is a reasonable default weighting for `adventure-challenges` filler
enemies when no theme steers otherwise.

## Weapon/gear completeness — confirms the session's bug class is real, not edge-case

Restricting to "pure PC-class, non-commoner-faction, level>0" creatures
(201 of 505) — the same population `adventure-challenges` generates — **32
(16%) have no weapon in RightHand/LeftHand/creature-weapon slots at all**:
`bandit`, `bandit_captain`, `bandit_fighter`, `mercenary1-3`, `thug`,
`smuggler_archer`, `guard_house`, `guard_noble`, `hobgoblin`, `orc`, etc.

**This is not a defect in TFN — it's a different, deliberate pattern.** 444 of
505 blueprints (88%) share one `ScriptSpawn`: `ai_onspawn`. That script
(`src/nss/ai_onspawn.nss`, `#include "inc_loot"`) calls
`GenerateTierItem(GetHitDice(OBJECT_SELF), GetLocalInt(GetArea(OBJECT_SELF),
"area_cr"), OBJECT_SELF, sType)` at spawn time — a full runtime loot/gear
generator scaled by the creature's hit dice and the *area's* CR local
variable, not baked into the static blueprint. `inc_loot.nss` is 1690 lines;
`GenerateTierItem` (line 724) is the core entry point — flagged here as a
pointer for a deeper follow-up pass, not fully read this pass.

**Relevance to nwn-mcp:** this is a materially different, more scalable
pattern than what `adventure-challenges`/`adventure-actors` currently do
(bake exact gear into every blueprint via `set_creature_equipment` at
creation time). For a 12-area, ~90-blueprint module (Ashcrown) baking gear in
directly is fine. It would not scale cleanly to hundreds of blueprints. Worth
a follow-up: could `create_gear_randomizer` (currently recolor-only, see
`gear-tools.ts`) grow a companion "tier loot generator" mode modeled on
`GenerateTierItem`? That's a design decision for the user, not something to
build unprompted.

## Ranged weapon / ammo pairing — direct confirmation of the Ashcrown bug class

12 of the ranged-armed creatures have a bow/crossbow/sling in RightHand with
**no ammo slot filled**: `black_sniper`, `bloody_archer`, `db_assassin`,
`drow_archer`, `drow_marksman`, `kensidan`, `kobold_commando`, `kraken_member`,
`lords_archer`, `luskan_archer`, `raven_tribesmen`, `trog_scout`.

This is the same bug class fixed across 13 Ashcrown blueprints this session
(`feedback_npc_gear_gaps.md` memory). Finding it in a live, played, "well
polished" PW too is useful signal: **this isn't a one-off mistake, it's an
easy-to-miss gap category worth a standing automated check.**

Confirmed: `verifyCreature` in `src/util/verify/blueprints.ts` (~line 120)
currently only checks that each `Equip_ItemList` entry's `EquippedRes`
resolves to a real `.uti` — it does not check slot/weapon-type semantics at
all. **Concrete follow-up, not yet implemented:** add a check that reads the
RightHand/LeftHand (`__struct_id` 16/32) item's `BaseItem`, looks up
`baseitems.2da`'s `RangedWeapon` and `AmmunitionType` columns for it via the
existing `twoDARow()` 2DA-table helper (2DA tables are loaded through the
CSV-based `nwn_twoda -k csv --write-id-column` pipeline in `nim-tools.ts`,
**not** by hand-parsing the raw whitespace-column `.2da` text — confirmed the
hard way this pass, a manual parse of the raw file misaligned columns), and
if ranged, requires a matching ammo slot (2048/4096/8192 per `AmmunitionType`)
to be filled. Should be an `error` per this project's severity contract (the
engine will not let the creature attack at range).

## Gender / soundset

Gender distribution: {0 (male): 315, 4: 74, 1 (female): 74, 2: 35, 3: 7} —
values 2/3/4 are non-PC-voiceset genders (monster/other) mixed into the same
field; not a clean signal without cross-referencing `Appearance_Type`, so no
finding drawn from this beyond "don't assume Gender is binary when doing
corpus stats on a mixed PC/monster roster."

## Feats

15 of 505 (3%) have an entirely empty `FeatList` — plausibly non-combat
utility creatures (validators, dummies — `_cf_validator`, `_ambush_spawn`
appeared in the raw no-class-restricted scan). Not investigated further this
pass; low signal.

## Next steps flagged, not yet acted on

- Confirm whether `verify_creature` already flags ranged-without-ammo; add if not.
- Optional, user's call: scope a "tiered runtime loot generator" companion to
  `create_gear_randomizer`, modeled on `GenerateTierItem`'s CR/hit-dice-scaled
  approach, for anyone building larger (50+) blueprint rosters.
