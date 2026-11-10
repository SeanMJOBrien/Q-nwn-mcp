# Gear and NPC generation history

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

**TODO — randomised gear appearance.** Once per-base-item model-variant counts can be
derived from the resman stack (baseitems.2da carries no variant count), the helper can
pick a random valid variant per part so generated NPCs stop sharing identical weapons.
Until then "default model" is correct: a wrong variant index renders as nothing at all.

**BUILT (2026-09-16) — weapon *type* selection is now varied, deterministically.**
`CLASS_WEAPON_PREFERENCES` (`src/util/npc-weapon-preferences.ts`, renamed/widened from
the old singular `CLASS_WEAPON_PREFERENCE`) maps each class to a short list of 2-3
proficiency-safe candidate weapons instead of one fixed default, and
`pickWeaponPreference(classId, seed)` chooses among them deterministically by the
creature's own tag/resref (FNV-1a hash mod list length — no `Math.random()`, matching
this project's reproducible-content convention: the same creature always gets the same
weapon, but different same-class NPCs across a module spread across the list instead
of all converging on one). `build_npc_stat_block` (bonus/generic feat-slot picks, seed
= its `resref` param) and `equip_npc_by_role` (default weapon recommendation, seed =
the resolved creature's tag/resref) both switched from the old direct table lookup to
this picker. `respec_weapon_feats` is unaffected — it doesn't consume this table
(verified while making this change: only `build_npc_stat_block` and
`equip_npc_by_role` ever read it), and remains the tool to re-target a creature at a
different weapon after the fact.

Every candidate weapon in every class's list was verified proficiency-safe against
real 2DA data, not assumed from general D&D 3.5 rules: each weapon's real
`baseitems.2da` `ReqFeat0-4` (the same OR-set `verify_creature`'s
`weapon_proficiency_mismatch` check reads) was cross-checked against that class's real
automatic weapon-proficiency feat(s) from `cls_feat_<class>.2da` (`List=3`,
`GrantedOnLevel=1`). **This verification pass found and fixed two real, latent bugs in
the previous single-entry table**: Cleric's old default (Warhammer) and Bard's old
default (Rapier) both require Martial Weapon Proficiency (feat 45) — but
`cls_feat_cler.2da`/`cls_feat_bard.2da` only grant `WeapProfSim` (feat 46, Simple)
automatically in this engine's tables, no martial or class-specific weapon feat for
either class. (Tabletop 3.5 gives a Cleric her deity's favored weapon and a Bard a
small martial exception list; neither exception exists in this engine's automatic
class-feat rows.) A generic Cleric or Bard built via `build_npc_stat_block` with the
old defaults and no further bonus feat would have failed `verify_creature`'s own
`weapon_proficiency_mismatch` check — undetected until this pass, since nothing had
cross-checked the curated table against the verify check's own data source before.
Both entries were replaced with real Simple-weapon options (Cleric: Morningstar/Light
Mace/Quarterstaff; Bard: Sickle/Morningstar/Dagger). Druid (`WeapProfDruid`, feat 48),
Rogue (`WeapProfRogue`, feat 50), and Wizard (`WeapProfWizard`, feat 51) each have
their own class-specific proficiency feat rather than generic Simple/Martial — their
lists are drawn from real weapons whose `ReqFeat0-4` contains that exact feat id,
which lines up closely with each class's real tabletop weapon list (confirmed, not
assumed: Druid's candidates — Quarterstaff/Sickle/Scimitar — and Wizard's —
Quarterstaff/Dagger/Heavy Crossbow — match the tabletop SRD lists almost exactly).
9 new unit tests in `npc-weapon-preferences.test.ts` (determinism, spread across
seeds, Monk still `null`, no duplicate `baseItem` within a class, the two corrected
defaults), plus the existing `npc-stat-block.test.ts`/`npc-tools.integration.test.ts`
coverage updated to assert against the seeded pick rather than one hardcoded weapon.

**BUILT (2026-09-09) — option (a) below, `equip_npc_by_role`, plus `build_npc_stat_block`
and `respec_weapon_feats`.** All three live in `src/tools/npc-tools.ts`, backed by
`src/util/npc-stat-block.ts` (pure, unit-tested stat-block computation) and
`src/util/npc-weapon-preferences.ts` (the curated per-class weapon-preference table
the "Elaboration" bullets below asked for — real, verified baseitem + feat.2da IDs,
not guessed). Scope notes, so a future session doesn't re-litigate these:
- `build_npc_stat_block` writes the mechanical stat block (ability scores, FeatList,
  SkillList, HP, StartingPackage) onto an *existing* blueprint — it does not create
  one (`create_creature_blueprint` still does identity/race/appearance/name) and does
  not compute spells itself. Spells are no longer this tool's gap to close, though —
  see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" under
  Henchmen/Companions below: option (b)'s runtime-include idea shipped, just as its
  own separate system (`create_random_abilities_system`) rather than as part of this
  tool, since it needs to run fresh at `OnSpawn` every playthrough rather than be
  baked once at build time. Primarily targets Henchmen for now; general-NPC use is a
  documented future extension, not blocked by anything in the implementation.
- `equip_npc_by_role` deliberately does **not** do fuzzy blueprint search itself —
  there's no reusable exported search function to call into (`list_blueprints`/
  `resman_search` are inline MCP tool handlers), and inventing a resref would violate
  this project's "never guess" convention. The caller still sources items via
  `list_blueprints`/`resman_search` as documented; the tool's automation is
  proficiency validation (slot bitmask + `FeatList` check, reusing the exact
  `armorTierFeat`/`ReqFeat` logic `verify_creature` uses), a `get_wealth_budget`
  reference figure, a weapon-type recommendation from the preference table when no
  `righthand` item was supplied, and — closing the "Verify-after-generate" bullet
  below — a `verify_creature` pass as its own last step. The **archetype multiplier**
  bullet below (wealthy-noble vs. bandit budget scaling + magic-item preference) is
  **not built** — `equip_npc_by_role` only takes `role` (pc/elite/standard/mook), not
  `archetype`.
- `respec_weapon_feats` auto-detects a creature's current weapon-specific feats by
  reverse-scanning every `baseitems.2da` row's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat`/Epic* columns against its
  `FeatList`, then moves matched tiers onto the target weapon. **Found and fixed a
  real bug while writing its own tests**: a single-pass scan that mutates the
  in-progress feat set while iterating *every* baseitems row let the target weapon's
  own just-added feat get picked up as a spurious "source" match on a later
  iteration (harmless net effect, since it re-added the same feat, but it polluted
  the `removed`/`added` report with duplicate entries) — fixed by detecting matches
  against a frozen snapshot of the *original* `FeatList` in one pass, then applying
  removals/additions in a second pass, and by excluding the target weapon's own row
  from source detection. Verified via a dedicated test that reproduces the original
  bug's exact symptom (spurious entries for the target weapon's own feat IDs).

Today's process (before this) was: for each NPC, search `list_blueprints` +
`resman_search`, read costs via `resolve_blueprint`, check budget against
`get_wealth_budget`, and equip via `set_creature_equipment` — repeated by hand per
creature. This is exactly the kind of deterministic, rule-following work a script
could do instead of an LLM call per NPC. Two shapes worth considering, not yet
designed: (a) a **build-time MCP tool** (`equip_npc_by_role`-style, TypeScript) that
takes `{class, level, role, archetype}` and internally does the search/budget/equip
sequence deterministically — closer to how `create_reward_system` generates
`inc_reward.nss` once and every caller just invokes it; (b) a **runtime NWScript
include**, in the same family as `inc_reward.nss`/`inc_spec_check.nss`, that picks
gear from a curated resref table keyed by class/level at `OnSpawn` — pushes the
decision into the game engine entirely, at the cost of needing that table
hand-curated and kept in sync with the resman stack. Given the armor-appearance gap
(no safe from-scratch default), a curated table of *known-good real resrefs* per
archetype is probably required either way, not purely computed from `baseitems.2da`.

**Elaboration (user-specified, 2026-09-09)** on what the build-time tool's internal
logic should actually cover — this is the fuller spec for option (a) above, not a
separate idea:
- **Feat-driven weapon preference.** Read the creature's `FeatList` first; if it
  already carries a weapon-specific feat (Weapon Focus/Specialization/Improved
  Critical — reverse-lookup via `baseitems.2da`'s `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` columns, the same columns
  the existing "weapon-specific feat means the matching weapon, exactly" rule
  elsewhere in this doc already uses manually), bias the gear search toward that
  exact weapon type instead of picking one arbitrarily. The reverse direction
  (pick a weapon first, then bake the matching proficiency/focus feat chain) is
  already documented under Henchmen/Companions' static feat-baking — this tool
  should be able to run either direction depending on whether feats or gear come
  first for a given NPC.
- **BUILT** — see `npc-weapon-preferences.ts` above. **A curated per-class/archetype weapon-preference table (user-raised: "add
  packages.2da files for various class and level progressions — General Fighter
  focuses on the longsword, while others specialize in other feats and
  weapons").** `packages.2da` already exists and already gives each base class
  an iconic package (see the verified row-equals-classId rule under Henchmen/
  Companions), but it doesn't say *which weapon* that package's feat slots
  should point at — that's a real design choice per archetype, not something
  derivable from the 2DA alone. Needs a curated reference table (not a modified
  copy of the real `packages.2da` — a new project-owned lookup) mapping
  class/archetype → preferred weapon baseitem, so `create_creature_blueprint`'s
  static feat-baking and the feat-driven weapon preference above have a real
  default to fall back on instead of picking arbitrarily when a creature has no
  feats yet to reverse-lookup from. E.g. a generic Fighter defaults toward
  Longsword; a generic Rogue toward Rapier/Shortsword (finesse); a generic
  Ranger toward Longbow — one entry per class to start, expandable to
  sub-archetypes (dual-wielder, archer, tank) later. This is what makes the
  "pick a weapon first, then bake matching feats" direction above actually
  usable without per-NPC guessing.
- **BUILT** — see `respec_weapon_feats` above. **A `respec_weapon_feats`-style tool to swap an already-built creature's
  weapon-specific feats onto a different weapon (user-raised).** Today,
  changing a creature's specialized weapon after the fact means manually
  finding and removing the old weapon's `WeaponFocusFeat`/
  `WeaponSpecializationFeat`/`WeaponImprovedCriticalFeat` (and epic variants)
  from `FeatList` and adding the new weapon's equivalents — easy to get wrong
  by hand, and exactly the kind of mechanical, rule-following swap a script
  should do instead of an LLM editing a feat list field by field. E.g. a
  generic Fighter built with Longsword-focused feats (the class's default per
  the packages-preference table above) should be re-targetable to any other
  weapon — Battleaxe, Rapier, whatever the user wants for that specific NPC —
  via one call: given a creature + a target weapon baseitem, look up which
  weapon-specific feats it currently holds (reverse-lookup via the same
  `baseitems.2da` feat columns used elsewhere), remove them, and add the
  equivalent feats for the new weapon at the same tiers (Focus only, or
  Focus+Specialization+Improved Critical, matching whatever tier the creature
  actually qualifies for/already had). Pairs directly with the feat-driven
  weapon preference and packages-preference-table ideas above — this is the
  "change your mind after the fact" tool to their "get it right the first
  time" tools.
- **Wealth-budget check with an archetype multiplier.** `get_wealth_budget(level,
  role)` already exists and is already used manually for this — the new piece is
  an `archetype` parameter that scales the budget and shifts the item search
  itself (not just a post-hoc affordability check): a "Prince"/wealthy-noble
  archetype should multiply the budget up and *prefer* magic/enchanted variants
  over mundane ones when both exist, while a "bandit"/impoverished archetype
  should do the opposite. This is the concrete meaning `{class, level, role,
  archetype}`'s `archetype` field (already in the signature sketch above) was
  left vague on.
- **BUILT** — see `equip_npc_by_role` above. **Verify-after-generate, closing the loop.** Once equipped, run `verify_creature`
  (now that the `EquippedRes`/`TemplateResRef` bug is fixed — see the Known
  Pitfalls entry — its ranged/ammo and stack-size checks actually fire) as the
  tool's own last step, so "generate gear for this NPC" and "confirm the gear is
  legitimate for their level and class" are one pipeline instead of two separate
  manual steps an LLM has to remember to chain itself.

**BUILT (2026-09-09) — `build_npc_stat_block`, per the TODO immediately below.**
`src/util/npc-stat-block.ts` computes ability scores (Elite Array or a real D&D 3.5
point-buy allocator), the full 4-source `FeatList` bake, `SkillList` (round-robin
spend across real class skills, capped at level+3), and HP — all read live from
`classes.2da`/`racialtypes.2da`/`cls_feat_*`/`cls_bfeat_*`/`cls_skill_*` rather than
re-derived by hand per NPC, closing exactly the bug class described below (verified
by a dedicated unit test suite built against real-data-shaped 2DA fixtures, not just
plausible-looking numbers). **This tool still does not compute spell `MemorizedList`s
itself** — a companion still gets spells from the live `LevelUpHenchman()` call at
recruit, matching the existing, unchanged convention, and a non-companion caster Key
NPC still uses `create_creature_blueprint`'s `spells` param for a fixed loadout when
one is wanted. But "real spellbook baking" as a general problem is no longer deferred
— see "BUILT (2026-09-10) — real per-playthrough random caster spellbooks" above: it
shipped as its own runtime NWScript system (`create_random_abilities_system`) rather
than as static baking inside this tool, since the whole point is rolling fresh every
time the module loads rather than being fixed once at build time.

**TODO — reduce how much of NPC generation the LLM does by hand vs. deterministic
code, broadly, not just for gear.** This session's actual work — computing ability
scores, HP, skill-point totals, feat lists, and spell slots from `classes.2da`/
`cls_*.2da` formulas — is mechanical, rule-following arithmetic, not creative
judgment, and every real mistake made this session (a stale skill-point total after
an Int change, an HP formula that needed a second pass, two "no real item" false
negatives) was an arithmetic/lookup slip in exactly that kind of work, not a bad
creative call. A `build_npc_stat_block`-style deterministic tool (given
race/class/level/role, return a fully-populated ability array, `FeatList`,
`SkillList`, spell `MemorizedList`s, and HP — same computation this session did by
hand, moved into tested TypeScript) would remove this whole bug class the same way
`create_reward_system`/`create_spec_verification` already turned other
error-prone patterns into generated, reusable code. The LLM's time is better spent on
what it's actually suited for in this pipeline — plot, dialog, quest design, and
encounter/narrative judgment calls — not re-deriving D&D 3.5 tables from 2DA files
per NPC. **BUILT except spell `MemorizedList`s — see the note immediately above.**

**Alternative approach worth evaluating alongside the above (user-raised): build
one level-20 "master" creature per race/class and level it *down* by truncation,
instead of computing each target level's stats from formulas every time.** Today's
(and the `build_npc_stat_block` TODO's) model computes forward: given a target
level, derive ability scores/feats/skills/spells from `classes.2da`/`cls_*.2da`
formulas. The user's proposal inverts this: build a single level-20 reference
creature per race/class once (maximal `FeatList`/`SkillList`/spell
`MemorizedList`s, fully baked), dump it to JSON, and produce any lower level by
mechanically truncating that JSON — drop `ClassList` levels above the target,
drop `FeatList` entries whose granting level (cross-referenced the same way the
static feat-baking recipe already does) exceeds the target, cap `SkillList`
ranks and spell slots to what the target level would have earned. Worth real
comparison against the forward-computation approach: truncation only needs to
get the level-20 reference right *once* per race/class (a fixed, auditable
artifact, not a formula that has to stay correct for every level 1-20), and the
"raw file in JSON, altered by a script tool" step the user describes is exactly
this project's already-established safe-edit pattern (JSON round-trip via
`nwn_gff`) applied to a new purpose. The open question is whether truncation is
actually simpler than forward computation once feat/skill/spell prerequisites
that only make sense at the *achieved* level are accounted for (e.g. a spell
memorized at level 20 that depends on a metamagic feat also granted along the
way) — needs a real prototype on one race/class pair before deciding this
replaces, rather than complements, `build_npc_stat_block`.

**Canonical creation order + stat-generation arrays for `build_npc_stat_block`
(user-specified, design-only — not implemented yet).** When this tool gets built, the
user's specified pipeline order is: **Race → bake racial feats
(`race_feat_<race>.2da`, unconditional) → generate ability scores (array below, by
target power level) → assign Class → bake class feats (`cls_feat_<class>.2da` +
generic schedule + `cls_bfeat_<class>.2da` bonus slots, all already-verified sources —
see the Henchmen/Companions section above) → determine equipment, filtered by the
proficiency feats just baked** (`verify_creature`'s `weapon_proficiency_mismatch`/
`armor_proficiency_mismatch` checks exist specifically so a tool built to this order can
never reproduce a "Rogue equipped with medium armor"-class bug — equipment selection
comes last, informed by feats, never the other way around).

Stat arrays (D&D 3.5, deterministic — no dice rolling, since generated content in this
project must stay reproducible):
- **Elite Array** `15,14,13,12,10,8` — default for ordinary NPCs with class levels
  (~25-point buy equivalent).
- **Point-buy bands**, for explicitly scaling a unique/named NPC's power level instead
  of always using the Elite Array: Low 15, Standard 25, Challenging 22-28, Tougher 32,
  Epic 36+.
- Classic 4d6-drop-lowest rolling is noted but not recommended for this tool — it's
  non-deterministic.
