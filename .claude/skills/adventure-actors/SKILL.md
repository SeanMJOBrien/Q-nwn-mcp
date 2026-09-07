---
name: adventure-actors
description: Sub-skill of /create-adventure. Reads the plot, areas, and environment from adventure.md and places non-hostile NPCs with greeting dialogs and ambient creatures. All actors use Commoner faction. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Actors

Sub-skill of `/create-adventure`. Reads the plot, areas, and environment sections of `adventure.md`, then places key NPCs with simple greeting dialogs and ambient creatures appropriate to each area's theme. All actors use **Commoner faction (ID 2)** — no custom factions for a one-shot module. Downstream skills (`/adventure-quests`, `/adventure-challenges`) will select from the placed actors for quest roles and hostile encounters.

## Prerequisites

- `adventure.md` must exist in the MCP temp directory (`$MCP_FOLDER_TEMP`, defaults to `$TEMP/nwn-mcp` or `/tmp/nwn-mcp`) and contain completed `## Plot`, `## Areas`, and `## Environment` sections.
- A module must be loaded. If none is loaded, call `load_module` using the module name from `adventure.md`.

## Workflow

Fully autonomous. Make all decisions based on the plot document and spatial data — do NOT ask the user for input.

---

### Pre-Check: Validate adventure.md

Read `adventure.md` from the MCP temp directory. Verify these sections exist and are non-empty:
- `## Module`
- `## Plot`
- `## Areas`
- `## Environment`

If any required section is missing or contains no content below its heading:
**STOP.** Output: `"ERROR: adventure.md is missing required section [name]. The prerequisite skill has not run or failed. Cannot proceed."`

---

### Phase 1: Read the Plot, Areas, and Environment

Read `adventure.md`. Extract from `## Plot`:
- **Key NPCs** — name, race/appearance, role, location, personality, motivation, quest involvement
- **Locations** — mood, theme, setting keywords per area
- **Antagonists** — creature types to AVOID placing as ambient (those go in `/adventure-challenges`)

Extract from `## Areas`:
- **Resrefs** — area identifiers for `visualize_area` calls
- **Features** — multi-tile groups (lodges, temples) where NPCs naturally belong

Extract from `## Environment`:
- **Placed placeables** — for positioning NPCs near relevant objects (innkeeper near fireplace, guard near door)
- **Waypoints** — landmarks that suggest NPC positions

Build a list of all NPCs and ambient creature types to create. Process areas one at a time.

---

### Phase 2: Spatial Analysis (per area)

Call `visualize_area` to get the spatial payload. Extract:

- **Tile grid** — walkable tiles (`walkablePercent` > 50%), materials, group names
- **Features** — tile group names inform NPC placement (Lodge/Cabin → NPCs go inside, Temple → priest goes inside, Ruins → nobody lives here)
- **Existing objects** — doors, placeables, waypoints. Position NPCs near relevant objects but not on top of them.
- **Tile materials** — Wood tiles inside buildings = good NPC positions. Stone = dungeon. Grass/Dirt = exterior.

---

### Phase 3: Create Key NPC Blueprints

For each NPC described in the plot's `### Key NPCs` section:

1. **Pick a source blueprint** from the reference table that best matches the NPC's described race, gender, and appearance. The source provides the visual model — the skill overrides name, faction, and dialog.

2. **Call `create_creature_blueprint`** with:
   - `sourceResref` — the base game blueprint resref
   - `resref` — unique identifier derived from NPC name (lowercase, no spaces, max 16 chars, e.g., `elara`, `gormund`, `innkeeper`)
   - `tag` — same as resref
   - `name` — the NPC's display name from the plot (e.g., "Elara the Healer")
   - `faction` — **always `2`** (Commoner)
   - `conversation` — dialog resref, e.g., `dlg_elara`

3. **Do NOT modify stats, feats, or equipment** unless the plot specifically describes combat capability. The source blueprint's stats are fine for ambient NPCs. `/adventure-quests` or `/adventure-challenges` can upgrade stats later if needed.

---

### Phase 3b: Create Companions (henchmen)

Any NPC the plot describes as joining, following, accompanying, or being rescued/freed
must be built as a **real NWN henchman**, or they will stand still while the player walks
away. This is the single most-reported defect in generated modules.

**Cap at 3 companions per adventure** (the generated `a_mod_load` sets `SetMaxHenchmen(4)`,
leaving one slot spare). Use fewer unless the plot calls for a full party — every companion
is another actor to keep alive, pathed, and balanced against.

**Skip this phase entirely if the plot has no companion characters.**

#### Step 1: Shared scripts (once per module)

**Idempotency check:** `list_resources(pattern: "a_hen_*")`. If `a_hen_join` already
exists, skip to Step 3.

Write these seven with `write_script`. All are vanilla NWScript — no NWNX. Confirm each
reports `compiled: true`.

| Resref | Purpose |
|--------|---------|
| `c_hen_free` | `StartingConditional` — TRUE when the companion has no master |
| `c_hen_mine` | `StartingConditional` — TRUE when the PC speaking is its master |
| `a_hen_join` | Recruit: level up, `SetAssociateListenPatterns`, `AddHenchman`, bark, call `SPEC_VerifyCreature` (see below) |
| `a_hen_leave` | Dismiss: `RemoveHenchman`, clear associate state, bark |
| `a_hen_stay` | Stand ground, via `bkRespondToHenchmenShout` |
| `a_hen_follow` | Follow master, via `bkRespondToHenchmenShout` |
| `a_hen_spawn` | `#include "inc_spec_check"`, then `ExecuteScript("x0_ch_hen_spawn", OBJECT_SELF)` followed by `SPEC_SelfTestOnSpawn(OBJECT_SELF)` |

Two rules that make or break this — both are silent failures:
- **`SetMaxHenchmen()` must be raised before `AddHenchman()`.** `AddHenchman` is a
  no-op when the cap is too low, and reports no error. `a_hen_join` raises it defensively.
- **`SetAssociateListenPatterns()` must be called on recruit.** The engine delivers
  radial follow/stand-ground orders as a silent command shout the companion matches in
  its OnConversation handler. Without this it ignores every order.

**`a_hen_spawn` chains, it never replaces.** The stock henchman `ScriptSpawn`
(`x0_ch_hen_spawn`) does real work — `SetAssociateListenPatterns`, respawn location,
identifying starting gear — that must still happen. `a_hen_spawn` calls it first via
`ExecuteScript`, then calls `SPEC_SelfTestOnSpawn(OBJECT_SELF)`, which is a no-op unless
`MCP_VERIFY_MODE` is set: during generation it levels the companion straight to its
`SPEC_LEVEL` and runs `SPEC_VerifyCreature()` with no PC needing to connect and recruit it
through dialog first, so a stat/appearance mismatch shows up in the log from a plain
headless module load. This is a safe, precedented pattern — BioWare's own stock
`x0_ch_hen_spawn.nss` calls `LevelUpHenchman()` straight from `OnSpawn` on an unrecruited
companion in shipped Undermountain content. In the delivered module (`MCP_VERIFY_MODE=0`)
this costs nothing beyond one no-op function call.

#### Step 2: Raise the henchman cap at module load

`get_module_info` → read `onModLoad`. If it is not already `a_mod_load`:
- `create_spec_verification()` once per module, if `inc_spec_check` doesn't already
  exist — generates the runtime spec-check include `a_hen_join` and `OnSpawn` call into
  (see "Verify the recruit actually worked, live" below).
- `write_script("a_mod_load")` calling `SetMaxHenchmen(4)`, then
  `SetLocalInt(GetModule(), "MCP_VERIFY_MODE", 1)`, then
  `ExecuteScript("<the previous onModLoad value>")` — **chain, do not replace**. Omit
  the `ExecuteScript` line only if the previous value was empty. The `MCP_VERIFY_MODE`
  literal is `1` during generation/testing and must be flipped to `0` (recompile, repack)
  as the very last build step before delivering the module — see
  `docs/runtime-verification-spec.md` §7.
- `set_module_scripts(Mod_OnModLoad: "a_mod_load")`

#### Step 3: Per companion — dialog first, then blueprint

`create_dialog("dlg_hen_<resref>")` with **three roots in this order**. The engine
evaluates `StartingList` in order and the first TRUE condition wins, which gives
state-based branching without needing link-backs:

1. `condition: "c_hen_mine"` — in-party hub. PC replies: "Hold this position"
   (`script: a_hen_stay`), "Stay close to me" (`script: a_hen_follow`), "We should part
   ways" (the NPC farewell entry beneath carries `script: a_hen_leave`), "Never mind".
2. `condition: "c_hen_free"` — story exposition, who they are and why they are here.
   PC replies: "Tell me about yourself" (backstory), "Will you travel with me?" (the NPC
   accept entry beneath carries `script: a_hen_join`), "Another time".
3. *No condition* — a short fallback line. Without this, if both conditions are false
   the conversation opens empty.

Then `create_creature_blueprint`:

```
create_creature_blueprint(
  resref: "<name>", tag: "<name>",
  name: "<display name>",
  faction: 2,
  henchman: true,
  race: <racialtypes.2da row for the NPC's described race>,
  appearance: <same numeric value as race, for the 7 standard PC races — see note below>,
  gender: <0=male, 1=female>,
  classes: '[{"class": <class ID for the companion's role — 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin 7=Ranger 8=Rogue 9=Sorcerer 10=Wizard>, "level": 1}]',
  startingPackage: <same value as the class ID above>,
  conversation: "dlg_hen_<resref>",
  soundset: <TYPE 0 row matching gender — see table>,
  scripts: '{"ScriptSpawn": "a_hen_spawn"}',
  varTable: '[
    {"name": "HENCH_LEVEL", "type": "int", "value": <module target level>},
    {"name": "SPEC_ENABLED", "type": "int", "value": 1},
    {"name": "SPEC_RACE", "type": "int", "value": <same value as race>},
    {"name": "SPEC_APPEARANCE", "type": "int", "value": <same value as appearance>},
    {"name": "SPEC_CLASS", "type": "int", "value": <same value as the classes[0].class above>},
    {"name": "SPEC_LEVEL", "type": "int", "value": <same value as HENCH_LEVEL>},
    {"name": "SPEC_PACKAGE", "type": "int", "value": <same value as startingPackage>}
  ]'
)
```

The `SPEC_*` vars are the input to `SPEC_VerifyCreature()` (from `inc_spec_check`, see Step 2)
— cheap, inert local data that costs nothing to carry and lets `a_hen_join`/`OnSpawn` confirm
at runtime that `LevelUpHenchman()` actually produced what this template asked for. They are
redundant with the fields already on this call by design — read them off the same values,
don't compute anything new.

`scripts: '{"ScriptSpawn": "a_hen_spawn"}'` overrides just that one field on top of the
`henchman: true` preset — the other 12 script fields (`ScriptDialogue`, `ScriptHeartbeat`,
...) stay wired to the stock `x0_ch_hen_*` associate AI. This is what lets the headless
self-test (`SPEC_SelfTestOnSpawn`, see "Verify the recruit actually worked, live" below)
run at all.

**Appearance rule — no chassis needed.** `appearance.2da` rows 0–6 (Dwarf, Elf, Gnome,
Halfling, Half-Elf, Half-Orc, Human) map 1:1 by label to the same numeric values as the
`race` parameter for the 7 standard PC races (verified directly against `appearance.2da`).
Set `race` and `appearance` to the same value and the companion renders correctly with no
`sourceResref` cloning required — this covers all 11 classes, not just the 5 with a
verified chassis in the fallback table below. Skip `sourceResref` entirely unless the plot
calls for a specific non-standard look (see "Companion source blueprints" below for that
fallback path, and its caveats).

**`startingPackage` must be set — this is not optional.** `LevelUpHenchman()` reads the
companion's `StartingPackage` (a `packages.2da` row) to decide which feats, skills, and
spells to grant at each level. Left unset it defaults to GFF row `0`, which is Barbarian's
package — silently *correct* only if the companion actually is a Barbarian, and silently
*wrong* for every other class. **Verified rule: for every base class's iconic package,
`packages.2da` row index equals class ID** (Bard=1, Cleric=2, Druid=3, Fighter=4, Monk=5,
Paladin=6, Ranger=7, Rogue=8, Sorcerer=9, Wizard=10, Barbarian=0) — so `startingPackage`
should always be set to the same number as the `classes` entry's `class` value.

**Always pass `classes` explicitly, starting at level 1** — the companion levels up live to
`HENCH_LEVEL` via `LevelUpHenchman()` when `a_hen_join` fires on recruit (that's what grants
the correct feat/proficiency/spell progression by the engine's own rules, per the same
principle now documented in `adventure-challenges/SKILL.md`'s automatic-class-feats section).
Do not pre-set a higher static level here — a companion built at level 1 and leveled live is
the difference between this working correctly and the "cleric henchman has no spells" bug.

**An empty `FeatList` on this level-1 blueprint is expected, not a defect.** Racial feats
(weapon familiarity, favored-enemy mechanics, bonus first-level feats, etc.) come from
`racialtypes.2da`'s `FeatsTable`/`ExtraFeatsAtFirstLevel`/`NormalFeatEveryNthLevel` columns
and are computed by the engine from the `Race` field alone — they need no `FeatList` entry
at creation time. Class feats and bonus feats are meant to come entirely from the live
`LevelUpHenchman()` call above, using the package set by `startingPackage`. Don't try to
pre-populate `FeatList` by hand to "fix" an apparently-empty feat list on a fresh blueprint.

`henchman: true` wires all 13 script fields to the stock `x0_ch_hen_*` associate AI.
These are base-game resources resolved at runtime — **never write them into the module**,
and expect `validate_module` to report them as missing (a false positive).

**Verify the recruit actually worked, live.** `verify_creature`/`verify_dialog` (Step 4
below) only check static GFF preconditions — they cannot confirm `LevelUpHenchman()`
behaved correctly at runtime. `a_hen_join` must `#include "inc_spec_check"` (generated by
`create_spec_verification`, Step 2) and call `SPEC_VerifyCreature(oHenchman)` as its last
line, after the level-up loop and `AddHenchman()` succeed. This is a no-op unless
`MCP_VERIFY_MODE` is set (it is, during generation — see Step 2), so it costs nothing in
the delivered module. Read `[SPEC_OK]`/`[SPEC_FAIL]` lines from the server log after a real
in-game recruit test: `[SPEC_FAIL] ... field=level` points at a package/recruit-script
problem, `field=spell_count` points at a missing `bReadyAllSpells = TRUE`, and
`field=race`/`field=appearance` points at `race`/`appearance` not both having been set on
the blueprint. See `docs/runtime-verification-spec.md` for the full field list and the
build→run→check→repair loop this is meant to close.

`a_hen_spawn` gets the same check for free, headlessly: `SPEC_SelfTestOnSpawn(OBJECT_SELF)`
levels the companion straight to `SPEC_LEVEL` and runs the same `SPEC_VerifyCreature()`
check the moment the area loads — no real PC needs to connect and click through the recruit
dialog first. This means `[SPEC_OK]`/`[SPEC_FAIL]` lines are already in the log from a plain
headless module load, before anyone ever plays it.

#### Step 4: Verify before moving on

For each companion: `verify_creature(resref: "<resref>", henchman: true)` and
`verify_dialog(resref: "dlg_hen_<resref>")`. **Both must return zero errors.** Fix and
re-verify; after two failed attempts record `"status": "partial"` in
`adventure-status.json` with the error list rather than reporting success.

#### Companion source blueprints — fallback only, for a specific non-standard look

The default path above (`race` + matching `appearance`, no `sourceResref`) covers all 11
classes and every standard PC race with no lookup table needed. Use `sourceResref`
cloning **only** when the plot calls for a specific named look this doesn't cover (e.g. a
particular named-NPC face/model). If you do clone a chassis:

**Never build a companion on a Commoner blueprint.** `nw_bartender`, `nw_oldman`,
`nw_convict` and `nw_shopkeep` are all Commoner (class 20): levelling one grants no
feats, no spellbook and no BAB, so the companion joins with no abilities at all. This is
the exact cause of the "Cleric NPC has no spells" bug.

**Verified against the actual blueprint `ClassList`, not assumed from the name** —
three entries in this table used to be wrong (`nw_humanmerc002` labeled Fighter is
really Cleric; `nw_elfmerc001` labeled Ranger is really Wizard; `nw_halfcel001`
labeled Cleric is really Fighter), which would silently build a companion with the
wrong spellbook/proficiencies if you trusted the source chassis's native class. Always
cross-check with `resolve_blueprint(resource: "<resref>.utc")` → `classes` before using
any *new* source not in this table, and **pass `classes` (and `startingPackage`)
explicitly on the `create_creature_blueprint` call regardless** — appearance and combat
class are independent, so never rely on a chassis's native `ClassList` by omission. Note
that cloning also carries over whatever legacy/current field set (`Tail`/`Wings` vs.
`Tail_New`/`Wings_New`, `Phenotype`, existing `FeatList`/`SkillList`) the source NPC
happens to have — harmless, but another reason to prefer the chassis-free default path
unless you specifically need one of these looks.

| Archetype | Resref | Class |
|-----------|--------|-------|
| Fighter | `nw_dwarfmerc002` / `nw_bandit001` | Fighter (class 4) |
| Ranger / archer | `nw_elfranger001` | Ranger (class 7) |
| Cleric / healer | `nw_halfcel001` | Native class is Fighter — **must** override `classes` to `[{"class": 2, "level": <target>}]` explicitly; use this resref for its half-elf-cleric appearance only |
| Wizard | `nw_elfmage001` / `nw_elfmerc001` | Wizard (class 10) |
| Rogue | `nw_halfmerc001` | Rogue (class 8) |

#### Companion soundsets — TYPE 0 (PC voicesets) only

TYPE 0 rows carry the full `VOICE_CHAT_*` range the associate AI barks. TYPE 3 NPC sets
are sparse and leave the companion intermittently mute.

| Archetype | Male | Female |
|-----------|------|--------|
| Fighter / Barbarian | 419 | 357 |
| Ranger / archer | 420 | 433 |
| Wizard / Sorcerer | 418 | 361 |
| Cleric / Druid | 366 | 422 |
| Rogue / Bard | 367 | 421 |
| Commoner / rescued NPC | 368 | 423 |

Validate before use: `resolve_2da(table: "soundset", row: "<n>")` — confirm `RESREF` is
not `****` and `GENDER` matches the creature. If nothing validates, omit `soundset`
rather than writing a garbage row (a creature-TYPE row makes a human companion growl).

#### Companions get no walk waypoints

Skip companions in Phase 6b. `x0_ch_hen_spawn` sets `NW_FLAG_IMMOBILE_AMBIENT_ANIMATIONS`
and never reads `NW_GENERIC_MASTER`, so patrol routes would be dead weight.

---

### Phase 4: Create NPC Dialogs

For each key NPC, create a simple greeting dialog using `create_dialog`.

**Dialog structure:**
- Root node is always NPC (speaker: `"npc"`)
- NPC greeting line reflects their personality and situation from the plot
- 1-3 PC response options (curious, friendly, dismissive)
- Optional NPC follow-up lines with personality flavor
- Keep it short: 2-4 exchanges maximum

**Dialog content rules:**
- **Flavor/personality ONLY** — no quest logic, no `AddJournalQuestEntry`, no scripts. That's `/adventure-quests`'s job.
- Reflect the NPC's personality from the plot: gruff, nervous, welcoming, suspicious, etc.
- NPCs can hint at the plot situation ("Strange things have been happening...") but don't assign quests.
- PC responses should feel natural, not like a quest menu.

**Resref naming:** `dlg_[npc_resref]` (e.g., `dlg_elara`, `dlg_gormund`)

**Example dialog tree:**
```json
[
  {
    "speaker": "npc",
    "text": "Welcome, traveler. You look like you could use a warm meal. Though I warn you — the stew's been sitting a while.",
    "children": [
      {
        "speaker": "pc",
        "text": "I'll take my chances with the stew.",
        "children": [
          {
            "speaker": "npc",
            "text": "Ha! Brave soul. That'll be two coppers. Find yourself a seat."
          }
        ]
      },
      {
        "speaker": "pc",
        "text": "What's the mood around here? Seems tense.",
        "children": [
          {
            "speaker": "npc",
            "text": "Aye, folk have been on edge lately. Strange noises from the forest at night. But that's none of my business — I just pour the drinks."
          }
        ]
      },
      {
        "speaker": "pc",
        "text": "Just passing through."
      }
    ]
  }
]
```

---

### Phase 5: Place Ambient Creatures

**Idempotency check:** Before placing creatures in an area, call `get_area_creatures(area: "...")`. If creatures with matching tags are already present, **skip** those — do not place duplicates.

**Appearance sanity check:** After cloning a creature blueprint, verify its appearance makes sense for the placement context. Call `resolve_2da(table: "appearance", row: "<appearance_id>", column: "LABEL")` and check the label. NWN creature names can be misleading — `nw_cat` is a **leopard** (appearance `Cat_Leopard`), not a housecat. If the appearance label doesn't match what you'd expect to see in the location, don't place it. There is no domestic cat model in NWN.

For each area, select ambient creatures that fit the theme from the reference table.

1. **Clone each creature type once** with `create_creature_blueprint`:
   - `sourceResref` — base game animal blueprint
   - `resref` — `amb_[creature]` (e.g., `amb_cat`, `amb_deer`, `amb_rat`)
   - `tag` — same as resref
   - `name` — leave from source (use the base game name)
   - `faction` — **always `2`** (Commoner), even for creatures that are hostile by default (cat, rat, wolf, raven)
   - No `conversation` — ambient creatures don't talk

2. **Place 3-8 ambient creatures per area** depending on area size:
   - ~8x8 → 3-4 creatures
   - ~12x12 → 5-6 creatures
   - ~18x18 → 7-8 creatures

3. **Placement rules:**
   - Spread across walkable tiles, not clustered
   - Animals belong outdoors (Grass/Dirt tiles), not inside buildings (unless cats/dogs in an inn)
   - Dungeon creatures (rats, bats) can go anywhere underground
   - Avoid placing on door tiles or right next to NPCs
   - Vary facing for natural appearance

---

### Phase 6: Place Key NPCs

**Idempotency check:** Before placing NPCs in an area, call `get_area_creatures(area: "...")`. If a creature with the same tag is already placed, **skip** it.

Place each NPC blueprint in the area specified by the plot.

**Positioning guidelines:**
- Place near **relevant environment objects**: innkeeper near bar/fireplace, guard near door, shopkeeper near market stall, priest near altar
- Place **inside features** (tile group names): NPCs belong inside Lodge, Cabin, Temple, Tower — not on Bridge or Ruins
- Place on **walkable tiles** with `walkablePercent` > 50%
- Don't place on top of existing objects (check `objects` array from `visualize_area`)
- Position at tile center with small offset for natural placement

**Facing:** Orient NPCs toward the player's likely approach:
- Behind a counter/bar → face the open side
- In a room → face the door/entrance
- In an open area → face the nearest path or clearing

---

### Phase 6b: Set Up Walk Waypoints

NPCs and ambient creatures should walk waypoint routes instead of standing still. The NWN default AI (`nw_c2_default9`) supports this via the `NW_GENERIC_MASTER` local variable and tagged waypoints.

#### Step 1: Set Walk Flags on Creature Blueprints

The `NW_GENERIC_MASTER` variable is a bitmask — set bit 10 (`NW_FLAG_DAY_NIGHT_POSTING` = `0x400` = `1024`).

**Set this via `create_creature_blueprint`'s `varTable` parameter when you create the creature**, not afterwards:

```
create_creature_blueprint(
  ...,
  varTable: '[{"name": "NW_GENERIC_MASTER", "type": "int", "value": 1024}]'
)
```

It merges by name, so it will not clobber other variables.

**Ordering is load-bearing.** `place_creature` deep-copies the entire `.utc` into the area's GIT — the placed instance is a snapshot, not a reference. **Any blueprint edit made after placement never reaches the placed creature.** All `.utc` mutation must happen before Phase 6.

If you must edit a blueprint after creation, the correct call is:

```
modify_gff_field(
  resource: "<blueprint_resref>",
  type: "utc",
  path: "VarTable",
  value: [ ... ],
  gffType: "list"
)
```

Note `resource` + `type` (not `file`), and `gffType` (not `fieldType`). This replaces the whole list — prefer the `varTable` parameter above, which merges.

#### Step 2: Place Walk Waypoints

For each creature placed in an area, place **2-4 waypoints** along a logical patrol route near the creature's position. Tag them using the NWN convention:

- `WP_[creature_tag]_01` — first waypoint (place at or near the creature's position)
- `WP_[creature_tag]_02` — second waypoint (5-15m away, on a walkable tile)
- `WP_[creature_tag]_03` — optional third waypoint
- `WP_[creature_tag]_04` — optional fourth waypoint

Use `place_waypoint` for each. The creature will walk between these points in order, then loop back to `_01`.

**Route planning guidelines:**
- **Key NPCs** — short routes (2-3 waypoints) near their functional area. An innkeeper walks behind the bar. A guard patrols near the door. Keep routes within 10-20m.
- **Ambient creatures** — longer routes (3-4 waypoints) across the area. A dog roams the village. A deer crosses a clearing. Routes can span 20-40m.
- All waypoints must be on walkable tiles (`walkablePercent` > 50%)
- Routes should not cross through walls, doors, or impassable terrain
- Vary route shapes — L-shapes, loops, back-and-forth. Not just straight lines.
- For NPCs near features (lodge, temple), keep routes inside the feature tiles

**Night posting (optional):** If the area has day/night cycle enabled and an NPC should move to a different spot at night (e.g., guard goes indoors), place waypoints tagged `NIGHT_[creature_tag]_01`, `NIGHT_[creature_tag]_02`. If no night waypoints are placed, the creature uses the day route at all times.

**Single post point:** If an NPC should stand in one place (e.g., a bartender behind a counter who shouldn't wander), place a single waypoint tagged `POST_[creature_tag]` instead of numbered walk waypoints. This makes the creature return to that spot after any interaction.

---

### Phase 7: Update adventure.md

Append an `## Actors` section to `adventure.md` with this structure:

```markdown
## Actors

### [Area Name] (`resref`)

**Key NPCs:**
- **[NPC Name]** (`resref`, tag: `tag`) at (x, y) — [role]. Dialog: `dlg_resref`. Source: `source_blueprint`.
...

**Ambient Creatures:**
- [creature type] x[count] (`amb_resref`) — [brief note, e.g., "wandering the clearing"]
...

**Companions:**
- **[Name]** (`resref`, tag: `tag`) — [class] targeting level [N], recruitable in [area].
  Dialog: `dlg_hen_[resref]`. Chassis: `[source_blueprint]`. Soundset: [row].
  `HENCH_LEVEL` = [N]. Scripts: `a_hen_join` / `a_hen_leave` / `a_hen_stay` / `a_hen_follow`;
  conditions `c_hen_free` / `c_hen_mine`.

**Henchman cap:** `a_mod_load` sets `SetMaxHenchmen(4)`, chained from `[previous Mod_OnModLoad]`.

**Faction:** All actors set to Commoner (ID 2).
```

**Downstream skills must respect the companion entries:**
- `/adventure-quests` must **not** overwrite a companion's `Conversation`, and must **not**
  add quest roots with `parentIndex: 0` to a companion dialog — that unshifts the quest root
  ahead of the two conditional roots and breaks recruitment. Prefer not making companions
  quest-givers at all.
- `/adventure-challenges` must **not** make a companion hostile.
- `/adventure-polish` must whitelist the base-game `x0_ch_hen_*` scripts when checking
  for missing references.

This data is used by downstream skills to select actors for quest roles (`/adventure-quests`) and to know which areas already have creature presence (`/adventure-challenges`).

Repack the module with `repack_module`.

---

## Faction Rules

- **ALL actors placed by this skill use Commoner faction (ID 2).** No exceptions.
- Always set `faction=2` in `create_creature_blueprint` regardless of the source blueprint's default faction.
- Standard NWN factions only: 0=PC, 1=Hostile, 2=Commoner, 3=Merchant, 4=Defender.
- **No custom factions.** Out of scope for a one-shot module.
- Hostile creatures are placed by `/adventure-challenges`, not this skill.
- If `/adventure-quests` needs a merchant NPC, it can change the faction to 3 (Merchant) later.

---

## Humanoid NPC Source Blueprints

Pick the one that best matches the plot's NPC description. Clone it and override name/faction/dialog.

**IMPORTANT:** Always set `faction=2` when cloning. Many of these blueprints default to Hostile.

> **These resref lists are quick-reference examples, not exhaustive catalogs.**
> If no suitable blueprint is found in these lists, call `list_blueprints(type: "utc", pattern: "[search term]")` to search the full base game and HAK stack by resref, tag, and display name (including TLK-resolved names). Always prefer a thematic match from the full catalog over forcing a poor fit from the examples.

| Description | Resref | Notes |
|------------|--------|-------|
| Elderly human male | nw_oldman | Commoner class |
| Elderly human female | nw_oldwoman | Commoner class |
| Bartender / innkeeper | nw_bartender | Commoner class |
| Shopkeeper | nw_shopkeep | Commoner class |
| Waitress / barmaid | nw_waitress | Commoner class, female |
| Guard / soldier | nw_guard | Fighter lv1, has armor |
| Convict / prisoner | nw_convict | Commoner class |
| Luskan thug | nw_luskanite | Commoner class |
| Human fighter (lv2) | nw_humanmerc001 | Fighter, light armor |
| Human fighter (lv4) | nw_humanmerc002 | Fighter, medium armor |
| Human fighter (lv6) | nw_humanmerc003 | Fighter, heavier gear |
| Human fighter (lv8) | nw_humanmerc004 | Fighter, good gear |
| Human fighter (lv10) | nw_humanmerc005 | Fighter, heavy gear |
| Human fighter (lv12) | nw_humanmerc006 | Fighter, best gear |
| Dwarf fighter (lv2) | nw_dwarfmerc001 | Fighter |
| Dwarf fighter (lv4) | nw_dwarfmerc002 | Fighter |
| Dwarf fighter (lv6) | nw_dwarfmerc003 | Fighter |
| Elf ranger (lv2) | nw_elfmerc001 | Ranger |
| Elf ranger (lv4) | nw_elfmerc002 | Ranger |
| Elf mage (lv2) | nw_elfmage001 | Wizard |
| Elf mage (lv6) | nw_elfmage005 | Wizard |
| Halfling rogue (lv2) | nw_halfmerc001 | Rogue |
| Halfling rogue (lv4) | nw_halfmerc002 | Rogue |
| Half-elf cleric | nw_halfcel001 | Cleric |
| Half-drow fighter | nw_halfdra001 | Fighter |
| Halfling commoner | nw_halfling001 | Commoner |
| Bandit (lv1) | nw_bandit001 | Fighter, ragged |

**If no blueprint matches:** Use `resman_search` with a keyword (e.g., `nw_priest`, `nw_monk`) to find alternatives. Or use `create_creature_blueprint` without `sourceResref` and set the `appearance` field directly from appearance.2da (use `search_2da` on `appearance` table).

---

## Ambient Creature Blueprints

Clone each type once with `create_creature_blueprint`, setting `faction=2`.

| Creature | Resref | Default Faction | Ambient Resref |
|----------|--------|-----------------|----------------|
| Dog | nw_dog | 2 (Commoner) | amb_dog |
| Chicken | nw_chicken | 2 (Commoner) | amb_chicken |
| Cow | nw_cow | 2 (Commoner) | amb_cow |
| Deer | nw_deer | 2 (Commoner) | amb_deer |
| Ox | nw_ox | 2 (Commoner) | amb_ox |
| Bat | nw_bat | 2 (Commoner) | amb_bat |
| Raven | nw_raven | 1 (Hostile) | amb_raven |
| Rat | nw_rat001 | 1 (Hostile) | amb_rat |
| Wolf | nw_wolf | 1 (Hostile) | amb_wolf |
| Boar | nw_boar | 1 (Hostile) | amb_boar |
| Seagull | nw_seagullwalk | unknown | amb_seagull |
| Parrot | nw_parrot | unknown | amb_parrot |

**Creatures by area theme:**

| Theme | Creatures |
|-------|-----------|
| Forest / exterior | nw_deer, nw_dog, nw_raven, nw_boar |
| Village / town | nw_dog, nw_chicken, nw_cow, nw_ox |
| Inn / tavern | nw_dog |
| Dungeon / crypt | nw_rat001, nw_bat |
| Cave | nw_bat, nw_rat001 |
| Coast / harbor | nw_seagullwalk, nw_parrot |

---

## Important Notes

- **Tile coordinates:** Column = x (left to right), Row = y (bottom to top). World position = tile * 10.0 + 5.0 for center.
- **Do NOT auto-export HTML reports.**
- **Always set faction=2.** Never trust the source blueprint's default faction.
- **Dialog resref must be created before the creature blueprint** that references it (or create them in the right order: dialog first, then blueprint with `conversation` field).
- **No quest logic in dialogs.** NPCs can hint at the situation but do NOT assign quests, give journal entries, or run scripts. That's `/adventure-quests`'s job.
- **Repack after placing.** Call `repack_module` at the end so the user can see changes in the toolset.
- **Ambient creatures don't get dialogs.** Only key NPCs from the plot get `create_dialog` calls.
- **Max 16 character resrefs.** NWN has a 16-char limit on resref identifiers.
- **All blueprint edits must precede `place_creature`.** Placement snapshots the `.utc` into
  the GIT; later blueprint edits never reach the placed instance.
- **Max 3 companions**, and never on a Commoner chassis.
- **Companion AI scripts (`x0_ch_hen_*`) are base-game** — never write them into the module.
  `validate_module` reporting them as missing is a false positive.
- **Verify before reporting success.** Every companion must pass `verify_creature(henchman: true)`
  and `verify_dialog` with zero errors.
