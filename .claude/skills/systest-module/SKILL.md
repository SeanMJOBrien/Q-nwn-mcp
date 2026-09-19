---
name: systest-module
description: Builds (or rebuilds) a small, disposable module purpose-built to exercise nwn-mcp's own systems — opposed-faction combat, caster spellbook randomization, and one passing regression fixture per already-fixed verify_* bug class — then runs it through run_live_verification and reports what the real engine actually did. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Systest Module

Not a narrative adventure — skips `/create-adventure`'s plot/quest staging entirely.
A repeatable systems-test rig, built fresh each time this skill runs and never
hand-edited: if something about the roster needs to change, edit this skill and
rerun it, don't patch the module directly. The point is to exercise real engine
behavior — combat outcomes, spell memorization, load-time creature validation —
that no static `verify_*` check can see, using `run_live_verification`
(`src/tools/verify-server-tools.ts`) as the oracle.

## Prerequisites

- `MCP_FOLDER_VERIFYSERVER` must point at a real `nwn-mcp-verify-server` checkout
  (defaults to `~/nwn-mcp-verify-server`) — `run_live_verification` needs it.
- `NWN_FOLDER_DATA`/`NWN_FOLDER_USER` must be configured (real 2DA/TLK data, and
  somewhere to write the module).

## Workflow

Fully autonomous. Every design decision below is already made — don't ask the
user, don't improvise a different roster.

### Phase 0: Module setup

Module filename: `nwn_mcp_systest`. This module is disposable test tooling — if
`NWN_FOLDER_USER/modules/nwn_mcp_systest.mod` already exists, delete it first
(it's never hand-edited, so there's nothing to lose), then `create_module` fresh
with `name: "NWN-MCP Systems Test"`, `filename: "nwn_mcp_systest"`.

Write a minimal `a_mod_load` script that only sets the verification-mode switch
(this module has no henchmen needing `SetMaxHenchmen`, so it doesn't need the
fuller template `adventure-actors` uses):

```
void main()
{
    SetLocalInt(GetModule(), "MCP_VERIFY_MODE", 1);
}
```

`write_script(resref: "a_mod_load", source: <above>, compile: false)` then
`compile_script("a_mod_load")` (two calls — `write_script`'s own `compile: true`
has a documented intermittent race, don't rely on it). Wire it with
`set_module_scripts({ Mod_OnModLoad: "a_mod_load" })`.

### Phase 1: Areas (2, flat/minimal — no decoration needed)

Both via `create_area` (tileset `tdm01`, width/height `12`) +
`adventure_generate_layout` (`style: {"type":"dungeon","rooms":2}`) +
`adventure_apply_layout` — the same minimal real-tileset recipe
`comprehensive-module.live.test.ts`/`verify-server-tools.live.test.ts` already
use to get a real walkable area cheaply. Do NOT use `create_module`'s own
`_start` stub for placement — confirmed live to have no walkable interior tiles
at all (see CLAUDE.md's "Live verification automation" entry).

- `systest_arena` — hosts the opposed-faction combat pair and both caster
  fixtures (they need room to actually fight/cast).
- `systest_gallery` — hosts the six passing regression fixtures and the
  shopkeeper/store.

Use `adventure_find_walkable(area, count: "10")` on each area once built, to get
a real batch of walkable spots to place NPCs at — don't compute positions
arithmetically.

### Phase 2: Factions

`create_faction(name: "Systest Defenders", defaultReputation: "50")` — note the
returned faction ID. `set_faction_reputation(faction1: <that ID>, faction2: "1", reputation: "0")`
(faction 1 = the built-in Hostile faction) so the two sides are mutually hostile.

### Phase 3: Instrumentation

1. `create_random_abilities_system({})` — generates `inc_random_abil` (already
   exists as a project tool; this just writes it into this module).
2. `create_systest_instrumentation({})` — generates `inc_systest_log`.
3. Write two small chained wrapper scripts (default non-henchman scripts are
   `ScriptDamaged=nw_c2_default6`, `ScriptDeath=nw_c2_default7` — confirmed via
   a real `create_creature_blueprint` call's own response):

   `a_systest_dmg.nss`:
   ```
   #include "inc_systest_log"
   void main()
   {
       ExecuteScript("nw_c2_default6", OBJECT_SELF);
       SYSTEST_LogDamage(OBJECT_SELF);
   }
   ```
   `a_systest_death.nss`:
   ```
   #include "inc_systest_log"
   void main()
   {
       ExecuteScript("nw_c2_default7", OBJECT_SELF);
       SYSTEST_LogDeath(OBJECT_SELF);
   }
   ```
   Same `write_script(compile:false)` + `compile_script` two-step as Phase 0.

4. For the two caster fixtures (Phase 4, items 9-10) only: a leveling+cast
   wrapper is needed, NOT just `RA_OnSpawn` at raw `ScriptSpawn` — a from-scratch
   blueprint's `ClassList` gives `GetMemorizedSpellCountByLevel()` nothing past
   cantrips until a REAL `LevelUpHenchman()` call has actually run (confirmed,
   documented under "Random caster abilities" / "Tier 1 real-runtime findings"
   in CLAUDE.md). Reuse the exact leveling-loop shape `SPEC_SelfTestOnSpawn`
   already establishes as safe (BioWare's own `x0_ch_hen_spawn.nss` calls
   `LevelUpHenchman()` straight from `OnSpawn` on an unrecruited companion in
   shipped content):

   `a_systest_caster.nss` (Tier 1 — Cleric):
   ```
   #include "inc_random_abil"
   void main()
   {
       int nTargetLevel = 6;
       int nGuard = 0;
       while (GetLevelByClass(CLASS_TYPE_CLERIC, OBJECT_SELF) < nTargetLevel && nGuard < 40)
       {
           LevelUpHenchman(OBJECT_SELF, CLASS_TYPE_INVALID, TRUE, PACKAGE_INVALID);
           nGuard++;
       }
       RA_OnSpawn(OBJECT_SELF);
   }
   ```
   `a_systest_bard.nss` (Tier 2 — Bard, same leveling loop but
   `CLASS_TYPE_BARD`) — `ScriptSpawn` only.
   `a_systest_bard_er.nss` (`ScriptEndRound`):
   ```
   #include "inc_random_abil"
   void main()
   {
       ExecuteScript("nw_c2_default3", OBJECT_SELF);
       RA_OnEndRound(OBJECT_SELF);
   }
   ```

### Phase 4: Roster

All tags prefixed `systest_` for greppability. Build each via
`create_creature_blueprint`, then place with `place_creature` at a spot from
Phase 1's `adventure_find_walkable` call (`collisionRadius: "0"` — this is a
tightly-packed test rig, not a real encounter). Verify every one with
`verify_creature` immediately after building — every fixture below is meant to
come back **clean** (zero errors/warnings for the specific check it targets);
if it doesn't, the fixture itself has a bug, fix it before moving on.

| # | Tag | Area | Build notes |
|---|---|---|---|
| 1 | `systest_focus_cleric` | gallery | Cleric. `feats` includes 45 (Martial Weapon Proficiency, prerequisite), 115 (Weapon Focus: Warhammer), 153 (Weapon Specialization: Warhammer), 77 (Improved Critical: Warhammer) — all three verified feat IDs from this project's own bug-fix history (CLAUDE.md). `equipment.righthand` a real Warhammer blueprint (e.g. `nw_wblhw001`) — never build one from scratch (see the armor/weapon gear-sourcing rule). Target: `weapon_focus_mismatch` passes. |
| 2 | `systest_xbow_ranger` | gallery | Fighter or Ranger. `equipment.righthand` a real Crossbow, `equipment.bolts` a real bolt stack with `StackSize` exactly 24. `feats`: Point Blank Shot (27), Rapid Shot (30), Rapid Reload (411), plus whatever weapon proficiency the crossbow needs (check via `resolve_2da` on `baseitems.2da`'s `ReqFeat0-4` for the chosen crossbow — don't guess). Target: `ranged_feat_no_reload_support` and `ammo_stack_size_unreasonable` both pass. |
| 3 | `systest_plate_fighter` | gallery | Fighter. `feats` includes 3 (Light), 4 (Medium), 2 (Heavy) — the confirmed prerequisite chain. `equipment.chest` a REAL heavy-armor blueprint (e.g. search for a plate/chainmail item via `list_blueprints`/`resman_search` — never build armor from scratch, see the armor-appearance gap). Target: `armor_proficiency_mismatch` passes. |
| 4 | `systest_archer` | gallery | Any martial class. `equipment.righthand` a real Bow, `equipment.arrows` a real arrow stack with `StackSize` exactly 24, plus the matching bow proficiency feat. Target: `ammo_stack_size_unreasonable` passes for the bow case (distinct from #2's crossbow case). |
| 5 | `systest_valid_feats_rogue` | gallery | Build the blueprint bare (race/appearance/name only), then call `build_npc_stat_block(resref: "systest_valid_feats_rogue", race: <0-6>, classId: "8", level: "5")` to compute a real, 2DA-verified `FeatList`/`SkillList`/ability scores — this is what guarantees no accidental invalid feat ID. Target: `invalid_feat_id` passes (by construction — this is the tool this bug class exists to prevent). |
| 6 | `systest_shopkeep` | gallery | Commoner (class 20), `sourceResref` a real base-game shopkeeper if convenient. Build a store via `create_store_blueprint(resref: "systest_store", tag: "systest_store", name: "Systest Store", inventory: [...])` with at least one item omitting `category`, spanning all five real `StorePanel` buckets (armor, weapon, potion/scroll, wand, misc — pick real items via `list_blueprints`/`resman_search`, not guesses) so the fixed auto-categorization has real work to do. `place_store` near the shopkeeper. Target: `store_item_miscategorized` passes for every item. |
| 7 | `systest_hostile_orc` | arena | `faction: "1"` (built-in Hostile). Real melee weapon. `scripts: {"ScriptDamaged":"a_systest_dmg","ScriptDeath":"a_systest_death"}`. Place close to `systest_defender_paladin` (within a few meters) so they engage automatically once both spawn. |
| 8 | `systest_defender_paladin` | arena | `faction: "<Systest Defenders ID from Phase 2>"`. Real melee weapon + matching proficiency. Same `scripts` override as #7. |
| 9 | `systest_cleric_caster` | arena | Cleric, built at a real target level (e.g. `classes: [{"class":2,"level":6}]`). `scripts: {"ScriptSpawn":"a_systest_caster"}`. No `spells` param — this fixture exists specifically to exercise `create_random_abilities_system`'s Tier-1 real-`SetMemorizedSpell()` path. |
| 10 | `systest_bard_caster` | arena | Bard, `classes: [{"class":1,"level":6}]`. `scripts: {"ScriptSpawn":"a_systest_bard","ScriptEndRound":"a_systest_bard_er"}`. Exercises the Tier-2 virtual-ability/cast-chance path. |

### Phase 5: Static check, repack, run live

1. `verify_all({})` — should come back `shippable: true` for every fixture above
   (they were each individually verified in Phase 4, but a full pass catches
   cross-fixture issues, e.g. accidental tag collisions).
2. `repack_module({})`.
3. `run_live_verification({ expectedCheckLines: "<N>" })` where `N` is the
   number of grep-able lines you actually expect — at minimum one
   `[SYSTEST_DAMAGE]`/`[SYSTEST_DEATH]` pair from the combat fixtures once they
   fight (timing isn't fully deterministic — omit `expectedCheckLines` and let
   the stability-window fallback handle it if unsure).
4. Read the result: `engineErrors` should be empty; `otherTaggedLines` should
   contain real `[SYSTEST_DAMAGE]`/`[SYSTEST_DEATH]` lines from the arena fight.
   If a `verify_creature` pass in Phase 4 said a fixture was clean but
   `run_live_verification` still flags it, that's a real static/runtime gap
   worth a CLAUDE.md note, the same way the `invalid_feat_id` check itself was
   born from exactly this kind of live-only finding.
5. Report results plainly — this is a developer-facing diagnostic tool, not a
   spoiler-free player-facing module. Name which fixtures passed/failed and
   quote the relevant log lines.

## Notes

- This module is **never committed** to the Q-nwn-mcp repo and **never sent to
  the user as a deliverable** — it's a disposable diagnostic aid. Don't
  `SendUserFile` it unless explicitly asked.
- NPC-to-NPC dialog (`ActionStartConversation`) is a deliberate stretch item,
  not built into this roster — see CLAUDE.md's Feature B design notes for why
  (zero prior precedent in this codebase, dialogs normally assume a PC
  speaker). Add it here once a first real run has proven the mechanism, not
  before.
- If `run_live_verification`'s params ever change, update this skill's Phase 5
  to match (per CLAUDE.md's "keep skills in sync with tools" rule).
