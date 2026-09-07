# Generation Rules Reference

Reference for every rule, formula, and procedure encoded in the `/create-adventure`
pipeline and the MCP tools it drives. Sourced from `.claude/skills/*/SKILL.md`,
`src/tools/*.ts`, `src/util/*.ts`, and the root `CLAUDE.md`. Written for future sessions
that need the concrete numbers, not the narrative — see "Discrepancies noticed" at the
end for places where the skill docs and the code disagree.

---

## 1. Adventure Creation Pipeline

### 1.1 Orchestrator (`/create-adventure`)

Master directive skill. Runs 9 phases via the **Agent tool** (`subagent_type:
"general-purpose"`), never the Skill tool — Skill runs inline and would leak spoilers
into the user's chat. Each phase reads `adventure.md` (in `$MCP_FOLDER_TEMP`) and
appends its own section; a sidecar `adventure-status.json` records
`success`/`partial`/`failed` per phase.

**Pre-flight** (before any sub-skill runs), the orchestrator resolves with the user:
1. **Level range** — required; every downstream skill depends on it.
2. **D&D theme check** — warns if the prompt is non-fantasy.
3. **Party size** — 1-4, default 1.
4. **Difficulty** — Normal or Hard, default Normal.
5. **Area building mode** — `Full` (solver decorates everything), `Scaffold` (plain
   rectangular rooms/corridors, `safeMode: true`, no `preferredFeatures`), or
   `Scaffold (Minimal)` (single room, smallest valid footprint — 9×9, see
   `MIN_SINGLE_ROOM_AREA_SIZE` in `layout-generator.ts`). Recorded as `Area Mode` in
   `adventure.md`'s `## Module` section.
6. **Title & module creation** — filename is the adventure title exactly as typed
   (spaces and case preserved); `create_module` is called with both `name` and
   `filename` set to it.

**Phase table:**

| # | Skill | Reads | Appends |
|---|---|---|---|
| 1 | `/adventure-plot` | Module | `## Plot` |
| 2 | `/adventure-areas` | Module, Plot | `## Areas` |
| 3 | `/adventure-environment` | + Areas | `## Environment` |
| 4 | `/adventure-actors` | + Environment | `## Actors` |
| 5 | `/adventure-quests` | + Actors | `## Quests` |
| 6 | `/adventure-challenges` | + Quests | `## Challenges` |
| 7 | `/adventure-affordances` | + Challenges | `## Affordances` |
| 8 | `/adventure-polish` | + Affordances | `## Polish` |
| 9 | `/adventure-rewards` | + Polish | `## Rewards` |

**Gates the orchestrator itself runs** (everything else is trusted to
`/adventure-polish`):
- After Areas → `check_area_connectivity` (fix transitions before continuing).
- After Quests → `verify_quest_completability` (fix compile/path failures before
  continuing).

**Long phases are split** into one Agent call per area (areas, environment,
challenges) so the orchestrator regains control to print spoiler-free heartbeat
messages between calls (e.g. *"Shaping the land... (area 2 of 3)"*).

**Undo toolkit** available to the orchestrator for correcting sub-skill mistakes
without a full restart: `undo_last_change`, `undo_history`, `remove_object`,
`bulk_remove_objects` (tag-pattern, dry-run mode — the primary phase-rollback tool),
`remove_journal_quest`/`remove_journal_entry`, `remove_items_from_container`,
`clear_creature_equipment`.

### 1.2 Plot (`/adventure-plot`)

Generates the narrative blueprint. Reads `list_tilesets` first so it never designs a
location/terrain the module can't build. Document structure (all headings are
parsed by name downstream, must be exact): `## Plot` → `### Premise`, `### Locations`
(numbered, each with Resref/Type/Environment/Mood/Scale/Description/Role),
`### Connections`, `### Key NPCs`, `### Antagonists`, `### Quest Objectives` (Primary +
optional Side quests, staged), `### Challenges`, `### Loot & Economy`.

Creative constraints:
- **2-5 locations, 3 is the sweet spot.**
- Quest flow must route through every area.
- Challenges escalate — easiest area first, climax hardest.
- At least one major obstacle must have a non-combat solution.
- Only creature types and terrain keywords that exist in the base game / loaded
  tilesets may be used.
- Resrefs: lowercase, no spaces, max 16 chars.

### 1.3 Areas (`/adventure-areas`)

See §5 for the full layout-generator/zone-solver mechanics this phase drives. Skill
procedure, phase by phase:

- **Phase 0** — delete the `create_module` template's `_start` (MicroSet 3×3) area:
  remove it from the GIT, `Mod_Area_list`, delete its `.are/.git/.gic`, and repoint
  `Mod_Entry_Area`/`Mod_Entry_X/Y` at the first real area.
- **Phase 2** — tileset selection: match plot terrain keywords against the tileset
  table (23 base-game tilesets listed with Int/Ext + notes); 9 DLC/extended tilesets
  are explicitly banned (`tib01`, `tni02`, `tni01`, `tts02`, `ttf02`, `tcm02`, `trm02`,
  `trs02`, `tms01`).
- **Phase 3** — dimensions: interior minimum 12×12 (splitThreshold 10, 4 rooms),
  exterior minimum 18×18 (splitThreshold 12, needs bigger leaves for 2×3 building
  features). Medium 18-22, large 22-26. Feature selection (`adventure_list_features`)
  is **mandatory** before generating layout when Area Mode is `Full` — omitting
  `preferredFeatures` yields zero placed features. Settlement areas must put a
  house/dwelling feature first in the preference list. "Chessboard"/"Portal" features
  are banned outright.
- **Phase 4** — build order: `create_area` → `adventure_apply_layout`
  (`autoRepack: true`) → perimeter-encapsulation and terrain-adjacency checks (see §5).
- **Phase 5** — atmosphere via `set_area_properties` (see §6).
- **Phase 5b** — place a real Door GIT object for every tile with `doorPlacements` in
  `get_tileset_details`. `type: 0` = terrain/feature door (locked + `Plot=1`);
  `type: 1+` = crosser/corridor door (left unlocked). World position/bearing computed
  via `forwardRotate` — see the door-placement formula in the skill and in §5.
- **Phase 6** — connectivity validation via `visualize_area` zones.
- **Phase 7** — **all** inter-area transitions use `adventure_create_transition`
  exclusively (see §5.5) — the skill explicitly forbids doors, `link_doors`, or
  `create_area_transition` here (contrast with `area-connections`, §9).
- **Phase 8** — append `## Areas` to `adventure.md`, `repack_module`.

### 1.4 Environment (`/adventure-environment`)

Dresses each area with placeables/sounds/waypoints — ambience only, never plot
pivots. Density targets: **20-40 placeables per area**, scaling with size (~8×8 → 20,
~12×12 → 30, ~18×18 → 40; interiors trend high, exteriors low). ~40% of placeables get
`Useable=1` + a flavor `Description`. No wall-mounted placeables (spatial data has no
wall-position info — anything designed to hang on a wall floats). Sounds: 2-4 key fire
sources get placeable-attached sound objects (non-overlapping radii), plus 0-3
area-wide ambient sounds centered on the area with radius `max(width,height)*10`.
Waypoints: 2-5 per area — entrance waypoints face inward from doors (bearing rule:
north edge→180, south→0, east→270, west→90), landmark waypoints labeled from
tile-group names with the dimension suffix stripped (`"Lodge_2x2"` → `"Lodge"`). Phase
5b is a room-coverage safety net: any 2+-tile room/clearing with zero objects gets a
thematic filler placeable.

### 1.5 Actors (`/adventure-actors`)

Places non-hostile NPCs (always faction 2, Commoner) and ambient creatures with
greeting-only dialogs (no quest logic — that's `/adventure-quests`). See §2/§3 for
NPC/companion generation rules in detail. Ambient creature counts scale with area size
(3-4 at ~8×8, 5-6 at ~12×12, 7-8 at ~18×18). Walk routes use the `NW_GENERIC_MASTER`
bitmask (`NW_FLAG_DAY_NIGHT_POSTING = 0x400 = 1024`) plus tagged waypoints
(`WP_<tag>_01..04`, or `POST_<tag>` for a single stand-still spot); all blueprint edits
must happen **before** `place_creature`, since placement deep-copies the `.utc` into
the GIT snapshot.

### 1.6 Quests (`/adventure-quests`)

Modifies existing NPC dialogs in place rather than creating new ones. Core mechanism:
multiple **condition-gated root entries** in a dialog's `StartingList`, evaluated
top-to-bottom by the engine — highest quest stage first, the original unconditioned
greeting always **last**. Inserted lowest-priority-first at `parentIndex: 0` so each
insert pushes the previous entries down.

Quest **stage** state lives on `GetModule()` (co-op safe — every party member shares
one copy); **item-possession** checks correctly stay on `GetPCSpeaker()` (a genuinely
per-PC fact). Naming: `q_[tag]`, `c_q[tag]_s[N]` (condition), `a_q[tag]_s[N]` (action),
`c_q[tag]_has` (item check), `qi_[tag]` (quest item) — all ≤16 chars, so quest short
names are kept to 5-7 characters. Condition scripts use `int StartingConditional()`;
action scripts use `void main()`. `AddJournalQuestEntry`'s 4th arg
(`bAllPartyMembers`) is never passed `FALSE` in this pipeline. No XP/reward calls in
quest scripts — that's `/adventure-rewards`.

### 1.7 Challenges (`/adventure-challenges`)

Places hostile creatures (always faction 1) with independently-assigned combat roles
— appearance and mechanics are deliberately decoupled ("a beholder can be CR 2"). Full
stat-scaling tables, gear rules, and the guard-class-distribution rule are in §2.3.
Placement exclusion zones: never within 10 tiles of the entry point, 6 tiles of a
transition, or 8 tiles of a friendly NPC. Group composition patterns: patrol (2-3),
guard post (2-4), ambush (3-4), boss fight (3-5: 1 boss + 2-4 adds), lone sentry (1).
Creature count by area role: safe (0-2), transition (3-6 in 1-2 groups), adventure
area (5-10 in 2-3 groups), dungeon (8-14 in 3-5 groups), boss room (1 boss + 2-4 adds).
Traps: max 2-3 per area, damage scaled to level (`d6(1-2)` at level 1-3 up to `d6(3-4)`
at 7-10), DCs scaled 12-15 / 16-20 / 20-25 by level band — a fixed DC 15 becomes an
auto-success by level 5.

Party-size scaling of creature counts: solo = base; party of 2 = +1/group; party of 3
= +1/group and +1 boss; party of 4 = +2/group and +2 boss. Difficulty scaling: Hard =
+1 CR everywhere, +1 extra creature per boss fight, boss +2 CR instead of +1.
**EL grounding (3.5e):** EL=APL is a standard encounter (~20-25% of the party's daily
resources); doubling a group of identical creatures is +2 EL, not +1 CR; EL=APL+4
risks a death and is reserved for the telegraphed boss; `suggest_encounter`'s XP
formula (≈50×CR with invented multipliers) is a sizing aid only, not the EL system.

### 1.8 Affordances (`/adventure-affordances`)

See §4 for store mechanics in detail. **At least one store is mandatory** — even a
fully hostile dungeon crawl gets a traveling peddler or quartermaster rather than
skipping the affordance pass. Container loot: 3-6 containers, escalating power
(minor consumables early → better gear mid → strong consumables pre-boss); 1-3 items
per container, not every container gets loot. Starting gold: `50 * targetLevel` gp
(adjust up for expensive stores/long adventures). Level adjustment via
`Mod_OnClientEntr`: XP = `targetLevel * (targetLevel - 1) * 500` (Lv1=0, Lv2=1000,
Lv3=3000, Lv4=6000, Lv5=10000...), gated by a per-PC `mod_init` local so it only fires
once.

### 1.9 Polish (`/adventure-polish`)

Cross-cutting audit + fix pass, not a content-adding phase. Runs `validate_module`
(filtering known base-game false positives — `nw_c2_default*`, `nw_ch_ac*`,
`x0_ch_hen_*`, `x0_i0_*`, `x2_mod_def_*`, `nw_wblms001`, etc.), `check_area_connectivity`,
`verify_quest_completability` plus manual dialog/dead-end tracing, a room-coverage
audit (same mechanism as Environment Phase 5b, as a safety net), a challenge-placement
audit (no hostiles in safe areas, boss present in the climax area), an affordances
integrity check, and a plot-vs-module consistency pass. Issue priority order:
Blocking > Breaking > Wrong > Minor — never skip the first two. **Final gate:**
`verify_all(checkWalkable: true)` — module is shippable only at `shippable: true`
(zero errors). See §7.

### 1.10 Rewards (`/adventure-rewards`)

See §8 for the co-op reward-fanout mechanics. XP budgeting: monster XP is estimated
per creature CR-vs-target-level (CR=target-2 → ~25XP ... CR=target+3+ → ~200XP);
quest XP budget is set equal to estimated total monster XP; primary quest gets
60-70% of that budget, side quests split the remainder; total adventure XP should
land the player 60-80% of the way to the next level (never a double level-up).
Party-size XP nudge (quest XP only, since only monster XP is engine-divided by party
size): solo ×1.0, party of 2 ×1.15, party of 3 ×1.25, party of 4 ×1.35. Reward items
are anchored to `get_wealth_budget(level, "pc")`: the boss reward should be roughly
1/4 to 1/3 of a single character's total wealth at the target level; all rewards plus
lootable creature gear together should total about one level's worth of progress, not
several. Reward power curve: boss > mid-adventure > creature drops > store items.
Phase 5b builds a win-state script appended after the final quest's
`AddJournalQuestEntry(..., end:true)` call (VFX + floating text + delayed
congratulations message).

---

## 2. NPC Generation Rules

### 2.1 Blueprint construction (`create_creature_blueprint`, `src/tools/blueprint-tools.ts`)

Clones a `sourceResref` (or builds a minimal UTC from scratch) and overlays: `Tag`,
`TemplateResRef`, `FirstName`, `Appearance_Type`, `FactionID`, `ChallengeRating`,
HP (mirrors into `MaxHitPoints`/`CurrentHitPoints`/`HitPoints`), `Race`, `Gender`,
`Conversation`, ability scores, `NaturalAC`, `Lootable`, `SoundSetFile`,
`StartingPackage`, `ClassList` (replaces wholesale), `FeatList` (replaces wholesale),
`SpecAbilityList` (spell-like abilities), `Equip_ItemList` (resolved item blueprints
per slot, `Dropable=1` forced on each), `ItemList` (carried inventory, auto grid
position via `Repos_PosX/Posy`), and a `VarTable` merge-by-name.

**Every creature's 13 script fields are always written in full** — either
`DEFAULT_CREATURE_SCRIPTS` (`nw_c2_default*` family) or, when `henchman: true`,
`HENCHMAN_CREATURE_SCRIPTS` (`x0_ch_hen_*` family) — then an optional `scripts` JSON
overlay applies on top (unknown field names are dropped with a warning, not
silently ignored). Both script sets are base-game resources and are never written
into the module's own files.

### 2.2 Actor conventions (`/adventure-actors`)

- **Faction is always 2 (Commoner)** for every actor this skill places, regardless of
  the source blueprint's default (many defaults are Hostile — e.g. wolf, boar, rat,
  raven).
- Humanoid source-blueprint table: 25 entries from elderly humans through numbered
  mercenary tiers (`nw_humanmerc001`..`006` for lv2/4/6/8/10/12 human fighters,
  `nw_dwarfmerc001`..`003`, `nw_elfmerc001`..`002`, `nw_elfmage001`/`005`,
  `nw_halfmerc001`..`002`, `nw_halfcel001`, `nw_halfdra001`, `nw_bandit001`).
- Ambient creature table (12 entries) with default factions noted — several default
  to Hostile (raven, rat, wolf, boar) and are force-set to Commoner here.
- **Appearance sanity check**: after cloning, resolve the appearance row's `LABEL`
  (e.g. `nw_cat` is `Cat_Leopard`, not a housecat) and skip placement if the label
  doesn't match the intended creature.
- No quest logic in actor dialogs — flavor only, 2-4 exchanges.
- Dialog resref must exist before the creature blueprint that references it via
  `conversation`.

### 2.3 Hostile creature stats and gear (`/adventure-challenges`)

**Stat scaling by target-level band** (Minion/Standard/Elite/Boss tiers, each with
CR/HP/Primary-stat/Secondary-stat/Natural-AC ranges) — three bands: 1-3, 4-6, 7-10.
`naturalAC` is reserved for genuinely non-humanoid monsters; **80% of a large
verified real PW roster (n=201) has `NaturalAC=0`** — humanoids reach their AC
target through armor/shield equipment, never `naturalAC`.

**Combat role → class/primary-stat mapping** (verified against
`docs/tfn-corpus-survey/balance.md`): Melee=Fighter(4)/STR, Tank=Barbarian(0)/STR,
Ranged=Ranger(7)/DEX, Caster=Wizard(10)/INT or Sorcerer(9)/CHA, Healer=Cleric(2)/WIS,
Skirmisher=Rogue(8)/DEX, Nature Caster=Druid(3)/WIS, Holy Melee=Paladin(6)/STR.

**Automatic class feats are mandatory, not optional** — a creature's `feats` array
must include every feat a real character gets from leveling 1→N in that class
(weapon/armor/shield proficiencies, Turn Undead, Sneak Attack, etc.), looked up per
class via `classes.2da`'s `FeatsTable` → `cls_feat_<class>` rows where
`GrantedOnLevel` is between 1 and the target level (excluding `-1` and `99` sentinel
rows). Bonus/flavor feats (Power Attack, Weapon Focus, etc.) are looked up separately
via `search_2da(feat, LABEL, ...)` and added **on top of**, never instead of, the
automatic set.

**Gear-by-class weapon/armor/shield pools** — a table of 10 classes each with a
weapon roll pool and armor/shield constraint (e.g. Monk: none/none; Wizard/Sorcerer:
quarterstaff/dagger, no armor, no shield; Druid: no metal armor, wood shields only).
Non-proficiency and mechanical prohibitions (monk in armor, druid in metal) are framed
as hard constraints, not taste.

**Gear budget** — `get_wealth_budget(level, role)` returns a total gp figure plus a
per-slot split and an expected-enhancement tier, sourced from D&D 3.5 DMG Table 5-1
(`src/util/wealth.ts`):

| Level | 1 | 2 | 3 | 5 | 10 | 15 | 20 |
|---|---|---|---|---|---|---|---|
| Wealth (gp) | 150* | 900 | 2,700 | 9,000 | 49,000 | 200,000 | 760,000 |

(*Level 1 is a project convention — the DMG table starts at level 2; `150` sits
mid-range of PHB per-class starting gold.)

Role shares of the PC figure (`ROLE_SHARE` in `wealth.ts`): `pc`=100%, `elite`=100%
(a real 3.5e rule — a classed NPC at full PC wealth is worth **CR+1**, must be
counted in the EL math), `standard`=50%, `mook`=25% (the latter two are project
heuristics, not book rules). Per-slot split (`SLOT_SHARE`): weapon 35%, armor 30%,
shield 10%, accessories 15%, consumables 10%.

**Prices are read from real blueprints, never computed** — NWN derives item cost from
`itempropdef.2da`'s `Cost` column (a +1 longsword is 1,648gp in NWN vs. ~2,315gp by
the 3.5e formula), and magic-item enchantment level is **not** encoded in a resref's
trailing digits in any predictable global way (for longswords specifically:
`002`=+1, `010`=+2, `012`=+3) — always confirm via `resolve_blueprint`.

**Guard class distribution** — a creature whose *role* is guard/sentry/patrol/garrison
is 90% Fighter (class row 4), with the remaining 10% split ~1% each across the other
ten base classes. Rolled per-guard, not per-group. Never applied to named characters
or plot-specified classes.

**Ranged-weapon/ammo pairing** — `verify_creature` checks that a `RightHand` weapon
flagged `RangedWeapon` in `baseitems.2da` has matching ammo equipped in the correct
slot (`AmmunitionType` 1=arrows, 2=bolts, 3=bullets via `AMMO_SLOT_BY_TYPE`);
otherwise it reports `ranged_weapon_no_ammo` — a bow with no arrows equipped "cannot
fire."

**Visual variety** — `create_gear_randomizer` generates `inc_appear` (or a named
include) with `GearRandomizeCreature`/`GearRandomizeArmor`/`GearRandomizeWeapon`.
Armor/weapon *colors* are always safe across the full palette range; weapon *model*
indices are per-base-item and off by default (a blanket random range can render an
item as a blob). Never applied to bosses or named NPCs — the helper sets a
`GEAR_RANDOMIZED` local to avoid double-processing but has no notion of "this
creature's look is authored."

---

## 3. Henchman / Companion Generation Rules

### 3.1 What `henchman: true` actually wires

Confirmed directly in `src/tools/blueprint-tools.ts`: setting `henchman: true` on
`create_creature_blueprint` writes all 13 script fields from `HENCHMAN_CREATURE_SCRIPTS`
instead of `DEFAULT_CREATURE_SCRIPTS`:

| Field | Henchman script | Note |
|---|---|---|
| ScriptDialogue | `x0_ch_hen_conv` | Matches the engine's silent command shout via `GetListenPatternNumber()` — without it, radial follow/stand-ground orders are ignored |
| ScriptHeartbeat | `x0_ch_hen_heart` | Tail-calls `nw_ch_ac1`, the actual follow AI |
| ScriptAttacked/Damaged/Death/Disturbed/EndRound/OnBlocked/OnNotice/Rested/Spawn/SpellAt/UserDefine | `x0_ch_hen_*` | Full associate AI |

All of these are base-game resources resolved at runtime and must never be written
into the module. `henchman: true` alone does **not** call `SetMaxHenchmen()` or
`AddHenchman()` — those are the recruit script's job (§3.3).

### 3.2 What a companion actually needs vs. what's optional

Per `src/util/verify/blueprints.ts`'s henchman-specific checks (`verifyCreature(...,
{henchman: true})`), mandatory (`report.error`, blocks) vs. optional (`report.warn`,
advisory):

| Check | Code | Severity | What fails it |
|---|---|---|---|
| `ScriptDialogue` starts with `x0_ch_hen_` | `henchman_no_command_handler` | **error** | Companion ignores every radial order |
| `ScriptHeartbeat` starts with `x0_ch_hen_` | `henchman_no_follow_ai` | **error** | Nothing drives following |
| Not built on a pure-Commoner `ClassList` | `henchman_commoner_class` | **error** | `LevelUpHenchman()` grants no feats/spellbook |
| Has a `Conversation` set | `henchman_no_dialog` | **error** | No way to recruit or command it at all |
| Has a `HENCH_LEVEL` VarTable entry | `henchman_no_level_var` | *warning* | Recruit script has no level target, stays level 1 |
| Has a non-zero/non-`65535` `SoundSetFile` | `henchman_no_voice` | *warning* | Silent on join/dismiss/combat — cosmetic, not blocking |

So the dialog and the two associate-AI scripts are hard requirements; the soundset is
the one genuinely optional piece, exactly as the class/CLAUDE.md framing implies.

### 3.3 Full recruit machinery (`/adventure-actors` Phase 3b)

Companions are capped at **3 per adventure** (`a_mod_load` sets
`SetMaxHenchmen(4)`, leaving one slot spare). Six shared scripts, written once per
module (idempotency check: `list_resources(pattern: "a_hen_*")`):

| Resref | Role |
|---|---|
| `c_hen_free` | `StartingConditional` — TRUE when companion has no master |
| `c_hen_mine` | `StartingConditional` — TRUE when the speaking PC is its master |
| `a_hen_join` | Recruit: level up, `SetAssociateListenPatterns`, `AddHenchman`, bark |
| `a_hen_leave` | Dismiss: `RemoveHenchman`, clear associate state, bark |
| `a_hen_stay` / `a_hen_follow` | Stand ground / follow, via `bkRespondToHenchmenShout` |

`a_mod_load` is chained into the existing `Mod_OnModLoad` (never replaces it) and
raises the henchman cap before any `AddHenchman()` call can run — `AddHenchman` is a
silent no-op when the cap is too low.

Each companion's dialog has **three StartingList roots in this exact order**
(engine evaluates top-to-bottom, first TRUE wins):
1. `condition: c_hen_mine` — in-party hub (Hold this position / Stay close to me / We
   should part ways / Never mind).
2. `condition: c_hen_free` — pre-recruit exposition (Tell me about yourself / Will
   you travel with me? / Another time).
3. No condition — short fallback line (prevents an empty conversation if both
   conditions are false).

Blueprint creation always passes `classes` **explicitly**, starting at **level 1** —
the companion is leveled live to `HENCH_LEVEL` via `LevelUpHenchman()` when
`a_hen_join` fires, which is what grants the correct feat/proficiency/spell
progression by the engine's own rules. Building at a pre-set higher level instead of
leveling live is the documented root cause of the "cleric henchman has no spells" bug.

**Chassis-race-class table** (verified against the real blueprint `ClassList`, not
assumed from resref/name — three entries were found wrong when checked):

| Archetype | Resref | Class |
|---|---|---|
| Fighter | `nw_dwarfmerc002` / `nw_bandit001` | Fighter (4) |
| Ranger/archer | `nw_elfranger001` | Ranger (7) |
| Cleric/healer | `nw_halfcel001` | **Native class is Fighter** — must explicitly override `classes` to Cleric (2); resref used for appearance only |
| Wizard | `nw_elfmage001` / `nw_elfmerc001` | Wizard (10) |
| Rogue | `nw_halfmerc001` | Rogue (8) |

Never build a companion on a Commoner chassis (`nw_bartender`, `nw_oldman`,
`nw_convict`, `nw_shopkeep` are all class 20 — zero feats, zero spellbook, zero BAB).

**Companion soundsets** — TYPE 0 (PC voiceset) rows only, by archetype/gender (e.g.
Fighter/Barbarian: 419♂/357♀; Wizard/Sorcerer: 418♂/361♀; Cleric/Druid: 366♂/422♀).
TYPE 3 NPC rows are sparse and leave the companion intermittently mute. Validate with
`resolve_2da(soundset, row)` before use — `RESREF` must not be `****` and `GENDER`
must match.

Companions are skipped in the walk-waypoint phase (`x0_ch_hen_spawn` sets
`NW_FLAG_IMMOBILE_AMBIENT_ANIMATIONS` and never reads `NW_GENERIC_MASTER`).

**Cross-skill guardrails**: `/adventure-quests` must not overwrite a companion's
`Conversation` or insert a `parentIndex: 0` quest root (would unshift ahead of the two
conditional roots and break recruitment); `/adventure-challenges` must never make a
companion hostile; `/adventure-polish` must whitelist `x0_ch_hen_*` in reference
checks.

Every companion must pass `verify_creature(henchman: true)` and `verify_dialog` with
**zero errors** before the phase reports success; after two failed fix attempts the
phase records `"status": "partial"` rather than claiming success.

---

## 4. Shopkeeper + Store Generation Rules

### 4.1 `create_store_blueprint` (`src/tools/blueprint-tools.ts`)

Builds a `.utm` (clone or `buildMinimalUtm()` from scratch). Fields:
`MarkUp`/`MarkDown` (percent — 100=no change; defaults from `buildMinimalUtm()` are
**both 100**), `StoreGold` (default **-1**, unlimited), `MaxBuyPrice` (default **0**,
unlimited), `IdentifyPrice` (default **100**). `inventory` is a JSON array of
`{resref, infinite?, category?}`; each resolved item gets `Infinite` set per the flag
and is filed into one of 5 `StoreList` categories (0=Armor,1=Weapons,2=Potions/
Scrolls/Misc,3=Wands/Magic,4=Misc). If `category` is omitted, it's auto-detected from
the item's `BaseItem` row via a hardcoded base-item-ID → category table (falls back to
4 for anything unmatched, and is clamped to max 4 regardless).

The skill's recommended override for a general store is `markUp: 120, markDown: 80,
storeGold: -1, maxBuyPrice: 0, identifyPrice: 100` — i.e. the tool's defaults are
"no markup at all," and every generated adventure explicitly overrides `MarkUp`/
`MarkDown` away from that default.

### 4.2 Wiring a shopkeeper NPC

The pattern used throughout is the **script-driven `OpenStore()` pattern**, not a
full dialog-tree store browser:
1. `place_store` places the `.utm` near the merchant NPC (stores are invisible
   in-game — position only matters for the `GetNearestObjectByTag` lookup).
2. A tiny script (`a_str_[name]`) is written: `OpenStore(GetNearestObjectByTag(...),
   GetPCSpeaker())`.
3. `add_dialog_node` adds a **PC reply** (not an NPC entry) to the merchant's existing
   greeting, with that script attached as the reply's action script. So the NPC's
   `Conversation` stays a normal dialog resref — the "empty Conversation + ScriptDialogue
   calls OpenStore()" pattern described in some NWN tutorials is **not** what this
   pipeline uses; it always goes through a real dialog reply node instead.
4. If the merchant already has quest-gated root entries (from `/adventure-quests`),
   the browse-wares reply must be added to **every** root entry, not just entry 0 —
   `/adventure-polish` Phase 5 audits this specifically.

### 4.3 Stocking rules

Budget-anchored via `get_wealth_budget(level, "pc")` — the ceiling for what a
character can plausibly buy. Mundane staples go in `infinite: true` (supply isn't the
constraint); a small number of items priced at or just under the budget become the
"aspirational" purchases (e.g. at level 3 / 2,700gp: a handful of ~1,650gp +1
weapons, never a +2 item). Every priced item must be checked with `resolve_blueprint`
before listing — magic-item resref trailing digits don't reliably encode bonus level.
Store inventory guidelines scale by level band (1-3: mundane gear + CLW potions,
~150gp starting budget; 4-6: better mundane gear + CMW potions, ~250gp; 7-10:
high-end mundane + CSW/Restoration, ~400gp). 1-2 stores max per adventure (one general
store is typical) — except the mandatory-store rule in §1.8 overrides "typical" when
the plot has no natural merchant NPC.

**Optional starting outfitter**: a quartermaster NPC in the entry area whose store is
stocked to the target level's budget, topped up by a `Mod_OnClientEntr` stipend that
pays only the *shortfall* between the player's actual net worth (gold + all equipped
+ carried item values) and the wealth-by-level figure — never a flat top-up, which
would let a returning/farming player re-collect it. This is the one place in the
pipeline where a single `GiveGoldToCreature(GetEnteringObject(), n)` call is correct
without party fan-out, since `Mod_OnClientEntr` already fires once per connecting
player.

---

## 5. Area Generation / Sizing Rules

### 5.1 Unified BSP pipeline (`src/util/layout-generator.ts`)

All 10 styles (`dungeon`, `cave`, `dwelling`, `forest`, `rural`, `city`, `plains`,
`desert`, `castle`, `tundra`) run through one BSP generator, differentiated entirely
by a `StyleConfig` preset:

| Style | splitVariance | marginRange | roomSizeRange | splitThreshold | shortcuts | sCurve% | nonRect% |
|---|---|---|---|---|---|---|---|
| dungeon | ±15% | [2,3] | [0.6,1.0] | 10 | 1 | 50% | 30% |
| cave | ±20% | [2,4] | [0.4,0.7] | 8 | 3 | 70% | 10% |
| dwelling | ±5% | [2,2] | [0.85,1.0] | 10 | 0 | 10% | 0% |
| forest | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 50% | 0% |
| rural | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 30% | 0% |
| city | ±5% | [2,2] | [0.85,1.0] | 12 | 0 | 10% | 0% |
| plains | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 30% | 0% |
| desert | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 30% | 0% |
| castle | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 30% | 0% |
| tundra | ±15% | [2,2] | [0.6,1.0] | 12 | 1 | 30% | 0% |

Every exterior style (all except dungeon/cave/dwelling) also carries
`wallKeywords`/`floorKeywords`/`crosserKeywords`/`obstacleKeywords`/`obstacleChance`
for terrain-name resolution and in-room obstacle patches (water/trees/cliff at 30-60%
chance, size 1-3 tiles) — interior styles have empty `wallKeywords` because the
tileset's own default terrain *is* the wall.

**`safeMode` (Scaffold area mode)** zeroes out `nonRectChance`, `sCurveChance`,
`shortcutCount`, and `obstacleChance` on top of the chosen preset, and always returns
an empty `suggestedFeatures` array regardless of `preferredFeatures` — the least
solver-fallback-prone shape possible.

**Hard floor**: `minLeaf = 6` in `bspPartition` (ensures a 3×3 room + 2-tile margin
fits in any leaf); the true room-size floor is `Math.max(3, ...)` on both width and
height — a room is never smaller than 3×3 regardless of style config.
`MIN_SINGLE_ROOM_AREA_SIZE = 9` (1 room's minimum + 2×2-tile margin + 1-tile perimeter
= 1+2+3+2+1 = 9), used for `Area Mode: Scaffold (Minimal)`.

**L-shaped rooms**: adjacent BSP siblings may merge into one arbitrary-shape zone with
probability `nonRectChance`; the zone solver handles non-rectangular zones natively.

**Corridors**: axis-overlap straight connection where possible, L-bend fallback
otherwise; S-curves (offset the middle third by 1 tile, only on interior wall tiles,
never first/last) at `sCurveChance`; shortcut T-junctions between non-adjacent rooms,
count from `shortcutCount`. Interior styles route corridors as `corridor`-type
crossers over Wall tiles; exterior styles instead carve floor-terrain zones through
wall terrain (no crosser paths at all for exteriors). **Crosser type is always
`corridor`, never `doorway`** — doorway crossers need matched pairs on shared tile
edges that the solver can't guarantee.

**`mergeAdjacentDeadEnds()`** runs once after all corridors/shortcuts/secondary
crossers are assembled: for any pair of cardinally-adjacent tiles across *all* crosser
paths sharing the same crosser type with no edge pointing at each other, it connects
both sides. Fixes a real reported bug class (independently-routed corridors
dead-ending one tile apart, reading as two unconnected hallway stubs).

### 5.2 Zone solver (`src/util/zone-solver.ts`)

Tile selection depends **only** on corner terrains (TL/TR/BL/BR), corner heights,
edge crossers (top/right/bottom/left), and the `.set` file's `Orientation` field —
`.set` `[PRIMARY RULES]`/`[SECONDARY RULES]` sections are toolset autotiling hints,
never consulted by the solver. `computeValidPairs()` derives which terrain pairs have
any transition tile at all, and `adventure_apply_layout` refuses (zero placements,
`INCOMPATIBLE TERRAIN ADJACENCY` warning) if a requested zone layout uses a pair with
no transition tiles — no intermediate terrain is ever fabricated.

**Scan order**: bottom-to-top, left-to-right, deterministic. **Fallback chain** per
tile: (1) exact corners + exact crossers, (1.5) adjust free corners but keep crossers
(finds "corridor mouth" tiles for room-edge tiles), (2) exact corners, drop crossers,
(3) adjust free corners, drop crossers, (4) all-default fallback. Adjustments are
written back into the corner grid so downstream tiles in scan order see them.
`fallbackSubstitute` only ever tries terrains already present in the corner grid
(zone-defined + default) — it never injects an alien terrain. Tiles with any
non-zero corner height are excluded from solver placement entirely (flat tiles only).

### 5.3 Feature-group placement rules (`adventure_apply_layout`, in
`src/tools/adventure-tools.ts`)

A `suggestedFeatures` entry is rejected (with a `featureWarning`, feature simply
isn't placed — the rest of the layout still applies) if **any** of:
1. The named group isn't found in the tileset.
2. `groupHasUnsupportedDoors()` — a door tile in the group sits on a terrain
   transition or crosser edge (checked against the *room's actual* zone terrain at
   that position, not the style's nominal floor terrain).
3. The group contains any crosser-bearing tile at all (conflicts with the solver's
   own crosser grid).
4. The group contains a non-flat (height-transition) tile **and** there's no curated
   entry for `(tileset, group name)` in `src/util/feature-collars.ts`.
5. Any tile's four corners don't all match the surrounding zone's actual terrain name.
6. Declared `columns`×`rows` doesn't match the tileset group's real dimensions, or the
   placement is out of area bounds.

**Feature collars** (`feature-collars.ts`) are a curated `(tileset, group) → collar
tiles` table (offset + tile ID + orientation) for specific hand-verified
height-transition features (e.g. `tts01` Cave, `tti01` Cave/Ramp, `tcn01`
CityGate_2x2). A listed pair is auto-placed *with* its collar in the same call;
anything unlisted still falls to reject-by-default. Each collar tile gets its own
independent bounds + terrain-match check at placement time — a collar tile that fails
is dropped with a warning without rejecting the whole feature.

### 5.4 Terrain-adjacency and perimeter rules (`adventure-areas` skill, cross-checked
against the solver)

- **Perimeter encapsulation is mandatory** for both interior (Wall only) and exterior
  (impassable border terrain only) areas — the layout generator already enforces
  this; manual fallback zones must start at row/col 1 and end at max-1.
- **Terrain adjacency chains cannot be skipped** — e.g. `tno01` requires a 1-tile
  Grass buffer between Trees and CastleWall since no direct transition tile exists.
- **Interior tileset room-type isolation** — two named room types (Stone/Jail/
  Library/Rich/Shop/etc. in `tic01`/`tin01`) can only connect if the tileset has a
  tile whose corners mix both types *and* carries a crosser; otherwise they must
  either share one terrain type throughout or be split into separate areas linked by
  `adventure_create_transition`.
- **30-50% "room" coverage rule**: the rest of the tile grid should read as
  wall/trees/impassable terrain creating corridors and chokepoints — one big open
  rectangle is explicitly called out as the most common and most-avoided failure mode.

### 5.5 Transitions

`adventure_create_transition` (confirmed in `src/tools/adventure-tools.ts`) is a
single bidirectional call: it validates walkability at both endpoints with a **2m**
buffer (`checkPlacementWalkable`), places a `plc_solblue` light + landing waypoint at
each side (same tag family: `at_<tag>`/`rt_<tag>` for lights, `wp_at_<tag>`/
`wp_rt_<tag>` for waypoints), writes and compiles 4 scripts (2 `OnUsed` dialog
launchers, 2 jump scripts using `DelayCommand(2.0, ...JumpToObject...)` +
`VFX_FNF_SUMMON_MONSTER_2`), and writes 2 dialogs whose default text is *"A
shimmering portal beckons you forward..."* — the skill instructs editing this text
per-portal afterward via `edit_dialog_node`. Tag is capped at 11 chars (resrefs
`a_at_<tag>`/`a_rt_<tag>` cap at 16). `adventure-areas` Phase 7 mandates this tool
**exclusively** for all inter-area transitions in the generated pipeline — a
deliberate scope choice against the corpus-typical pattern, now cross-referenced
directly in the skill (see §9, item 1, resolved).

### 5.6 Door placement formula (`adventure-areas` Phase 5b)

For each tile with `doorPlacements` (from `get_tileset_details`):
```
worldX = col*10 + 5 + forwardRotate(doorX, doorY, tileOrientation)[0]
worldY = row*10 + 5 + forwardRotate(doorX, doorY, tileOrientation)[1]
bearing = (doorOrientation + tileOrientation*90) % 360
```
`forwardRotate` by orientation 0-3: `(x,y)`, `(-y,x)`, `(-x,-y)`, `(y,-x)`.
`doorPlacements[].type` (a `doortypes.2da` row) resolves to the exact
`TemplateResRef` the tile expects — never resolve via `genericdoors.2da`, a separate
table for hand-placed doors with no tile association (confirmed as a real mistake
made once on the `tileset-proving-grounds` module).

---

## 6. Time / Weather / Lighting Rules

### 6.1 `set_area_properties` tool (`src/tools/paint-tools.ts`)

Writes to two different files depending on field:

**`.are` fields** (lighting/fog/weather/flags): `fogClipDist`, `sunFogColor`,
`sunFogAmount`, `moonFogColor`, `moonFogAmount`, `sunAmbientColor`,
`sunDiffuseColor`, `moonAmbientColor`, `moonDiffuseColor`, `skyBox`, `windPower`
(0=calm/1=light/2=strong), `chanceRain`/`chanceSnow`/`chanceLightning` (0-100),
`dayNightCycle` (bool), `isNight` (bool).

**`.git` `AreaProperties` struct fields** (music/ambient sound): `musicDay`,
`musicNight`, `musicBattle`, `musicDelay`, `ambientSndDay`/`ambientSndDayVol`,
`ambientSndNight`/`ambientSndNightVol`. `musicDelay` was added after this doc's first
pass (see §9, item 2, resolved) — it now works exactly like the other music fields.

### 6.2 Conventions (`area-ambience` skill, corpus-measured)

Adoption rates across a large hand-built corpus, used to justify each default:

| Setting | Population | Adoption |
|---|---|---|
| `AmbientSndDay` | all | 97% |
| `IsNight` | interior | 97% |
| `FogClipDist` ≤ 45 | interior | 94% |
| `MusicDay` | all | 93% |
| `MusicBattle` | all | 93% |
| `MusicDelay` | all | 91% |
| `DayNightCycle` | exterior | 83% |
| `OnEnter` script | all | 81% |
| `SkyBox` | exterior | 31% |
| `NoRest` | all | 9% |
| `OnHeartbeat` | all | 7% |

Rules derived from this: **interiors** get `IsNight=1` + `FogClipDist ≤45`, never
`DayNightCycle`/`SkyBox`. **Exteriors** get `DayNightCycle=1`; `SkyBox` is a
deliberate choice (only 31% adoption), not a default. **Weather is rare overall (3%
adoption)** — reserved for biomes where it's thematically central (Frozen Wastes,
Rural Winter, a storm set-piece), not sprinkled everywhere. `OnHeartbeat` is
explicitly discouraged (7% — runs forever whether or not anyone is present); prefer
`OnEnter` + `DelayCommand` or a trigger volume.

### 6.3 What `/adventure-areas` (the generation pipeline) actually does

Phase 5 of `adventure-areas` gives a simpler, generation-time table (music IDs 1/3/7/
8/10/13/16/34 for common contexts, ambient sound IDs 30/31/33/60/61/62) and instructs:
exteriors get `skyBox: 1` + `dayNightCycle: true`; interiors get `skyBox: 0` +
`dayNightCycle: false`; fog is controlled only via `fogClipDist` (45=foggy,
80=clear — `sunFogAmount`/`moonFogAmount` are explicitly told to stay at 0, unlike
`area-ambience`'s broader color-and-fog guidance); weather (`chanceRain/Snow/
Lightning`) gets low values (5-15) "for occasional weather" — this line was tightened
after this doc's first pass (see §9, item 3, resolved) to match `area-ambience`'s "3%
adoption, reserve for weather-centric biomes only" framing instead of applying it
routinely to every exterior.

---

## 7. Verification Gates

The `verify_*` family (`src/tools/verify-tools.ts` + `src/util/verify/*.ts`) is the
acceptance-criteria layer the rest of the pipeline is judged against — it complements
`validate_module` (cross-reference checks: does a named script/dialog/item exist)
rather than replacing it; `verify_*` does intra-file structural/semantic checks
(does a dialog have every field the engine silently requires, is a tile ID inside the
tileset, is an NPC standing somewhere reachable).

- **Severity is a contract.** `error` = engine/toolset will misbehave, blocks
  shipping. `warning` = quality/plausibility, advisory only. Every finding carries a
  stable `code` (e.g. `henchman_no_dialog`, `ranged_weapon_no_ammo`,
  `quest_no_end_entry`, `dialog_missing_node_field`, `composite_model_part_zero`,
  `reward_not_party_wide`, `gic_out_of_sync`) and a `fix` naming the repair tool.
- **`verify_all` is the shipping gate** — `shippable: true` means zero errors
  module-wide. `/adventure-polish` runs it last, after every other fix and after
  `repack_module`.
- **Base-game scripts are whitelisted by prefix** in `isBaseGameScript()`
  (`src/util/verify/common.ts`) — `nw_c2_default*`, `x0_ch_hen_*`, `nw_ch_ac*`, etc.
  resolve at runtime and must never be flagged missing.
- Individual per-type tools (`verify_creature`, `verify_dialog`, `verify_door`,
  `verify_trigger`, `verify_item`, `verify_journal`, `verify_faction`, `verify_area`,
  `verify_encounter`, `verify_placeable`, `verify_sound`, `verify_store`,
  `verify_waypoint`, `verify_module_info`) can be run standalone on a single
  resource; `verify_creature(henchman: true)` additionally applies the companion
  rules in §3.2.
- `verify_quest_completability` traces every journal quest from the quest-giver's
  dialog through `AddJournalQuestEntry` calls to its end entry, checking area
  reachability along the way.
- `verify_coop_rules` (also folded into `verify_all`) is the co-op-specific subset —
  see §8.

---

## 8. Co-op / Reward Rules

Every generated module is assumed party-playable by default. A dialog action script
runs once, on one PC (`GetPCSpeaker()`); a reward handed to that object alone reaches
one player and silently skips the rest of the party — invisible in solo testing.

- **XP/gold/items must fan out** — a bare `GiveXPToCreature(GetPCSpeaker(), n)` is an
  **error**, not a warning, under `verify_coop_rules`.
- **`AddJournalQuestEntry`'s 4th arg (`bAllPartyMembers`) defaults `TRUE`** — never
  pass `FALSE` in this pipeline (a persistent-world module tracking independent
  per-player quest state is a different, valid architecture, but not this one).
- **Shared quest state must live on `GetModule()`**, never a single PC — see §1.6.
- **`create_reward_system`** (`src/tools/reward-tools.ts`) generates `inc_reward.nss`
  and proves it compiles via a throwaway probe script before returning. Policies:
  `full` (default — every player gets 100% of every reward, matching BioWare's own
  `RewardPartyXP`/`RewardPartyGP`, which are loops handing the *same* amount to each
  member, not a divided pot), `split` (XP/gold divided, items to the triggering PC —
  items literally cannot be divided), `speaker` (single-player modules only).
  Generated API: `CoopRewardXP`, `CoopRewardGold`, `CoopRewardItem`,
  `CoopRewardClassItem` (resolves each recipient's own primary class — a party gets 4
  different class-appropriate items, not 4 copies of one), `CoopRewardQuest`. Every
  helper takes the *triggering* PC and walks the party itself — callers never iterate
  by hand.
- **Rewards are per-player, not a divided pot** — this is the default policy and the
  one to keep; only **combat** XP is divided by the engine.
- **Placed loot cannot fan out** — a chest with one item is first-come-first-served,
  invisible to `verify_coop_rules` since no script is involved; a true
  whole-party-shared signature reward must go through `CoopRewardItem`/
  `CoopRewardClassItem` from a script, or the container must be stocked with one copy
  per expected party member.
- **`Mod_OnClientEntr` is the one legitimate single-target-grant exemption** — it
  fires once per connecting player, so a bare `GiveGoldToCreature(GetEnteringObject(),
  n)` there already reaches everyone; `verify_all`/`verify_coop_rules` specifically
  exempt the module's registered `Mod_OnClientEntr` resref. An *area* `OnEnter` script
  gets no such exemption and must still fan out.

---

## 9. Discrepancies noticed

Items 1-4 were found in this doc's first pass and have since been fixed — kept here
as a record of what was wrong and what changed, not as open issues.

1. **RESOLVED — doors vs. light-shaft portals for area transitions.**
   `adventure-areas/SKILL.md` Phase 7 mandates `adventure_create_transition`
   exclusively, while the `area-connections` skill (12,507 hand-built areas) reports
   doors connect **79%** of area pairs and calls light-shaft portals *"a fallback,
   not a default."* This was already a deliberate, signed-off scope choice per
   `CLAUDE.md` Known Pitfalls (#5, "Doors/gates architecture"), but the two skill
   docs never cross-referenced each other. **Fix:** `adventure-areas` Phase 7 now
   carries an explicit note citing the 79% figure and the CLAUDE.md rationale, so an
   agent reading only that skill knows its approach is a corpus-minority pattern and
   why.

2. **RESOLVED — `set_area_properties` could not set `MusicDelay`, but `area-ambience`
   instructed setting it through that tool.** The tool's Zod parameter list
   (`src/tools/paint-tools.ts`) had no `musicDelay` field; the value was only ever
   written once, hardcoded to `0`, at area-creation time. **Fix:** added a real
   `musicDelay` parameter to `set_area_properties`, wired to `AreaProperties.MusicDelay`
   in the `.git`, following the exact pattern already used for `musicDay`/
   `musicNight`/`musicBattle`. Verified with `npm run verify` (build + lint + 352
   tests, all passing). `area-ambience` updated to match.

3. **RESOLVED — weather guidance disagreed in strictness between the generation-time
   skill and the survey-derived skill.** `adventure-areas` Phase 5 told the pipeline
   to set `chanceRain/Snow/Lightning` to "low values (5-15) for occasional weather"
   as a routine per-area step, while `area-ambience` (corpus-measured) reports only
   **3% adoption** overall and frames weather as reserved for thematically central
   biomes. **Fix:** `adventure-areas` Phase 5 now states the 3% figure directly and
   instructs leaving weather at 0 unless the biome calls for it, only using 5-15
   when it's actually warranted.

4. **RESOLVED — `create_store_blueprint`'s own defaults contradicted the "sensible
   starter store" example in `/adventure-affordances`.** `buildMinimalUtm()`
   defaults `MarkUp`/`MarkDown` to `100` each (no markup, no markdown), while every
   worked example in the affordances skill overrides both (`markUp: 120, markDown:
   80`) without saying so explicitly. **Fix:** `adventure-affordances` now states
   the 100/100 default directly and tells the caller to always pass both explicitly.

5. **Not a bug — no fix applied.** The "empty `Conversation` + `ScriptDialogue` opens
   the store" pattern assumed in this doc's original task brief is not what the
   codebase implements. The actual `/adventure-affordances` mechanism keeps the
   merchant's normal dialog resref in `Conversation` and adds a "browse wares" PC
   reply node (via `add_dialog_node`) whose action script calls `OpenStore()` — a
   full dialog-tree integration. Skill and code already agree with each other; the
   mismatch was only in the task brief's assumption (and, separately, in a shortcut
   used for a one-off display module built earlier in the same session, which still
   works at runtime but doesn't match this codebase's standard pattern).
