---
name: adventure-actors
description: Sub-skill of /create-adventure. Reads the plot, areas, and environment from adventure.md and places non-hostile NPCs with greeting dialogs and ambient creatures. All actors use Commoner faction. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Actors

Sub-skill of `/create-adventure`. Reads the plot, areas, and environment sections of `adventure.md`, then places key NPCs with simple greeting dialogs and ambient creatures appropriate to each area's theme. All actors use **Commoner faction (ID 2)** — no custom factions for a one-shot module. Downstream skills (`/adventure-quests`, `/adventure-challenges`) will select from the placed actors for quest roles and hostile encounters.

## Prerequisites

- `adventure.md` must exist in the adventure directory (`get_adventure_dir`, i.e. `adventures/<Title-With-Dashes>/`) and contain completed `## Plot`, `## Areas`, and `## Environment` sections.
- A module must be loaded. If none is loaded, call `load_module` using the module name from `adventure.md`.

## Creature forge

Build every class-based creature with `forge_creature` (once per module `create_creature_level_system`) as described in the **creature-forge** skill — read it before creating any creature. Don't hand-build stat blocks, gear or spell wiring.

## Workflow

Fully autonomous. Make all decisions based on the plot document and spatial data — do NOT ask the user for input.

---

### Pre-Check

Call `phase_check(phase: "actors", step: "start")`. If it returns an error, **STOP** and output its `stop` message.

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

3. **Do NOT hand-edit stats, feats, or equipment.** A non-combat Key NPC keeps its source
   blueprint's stats. **A combat-capable Key NPC** (a guard captain, a rival duelist, a cult
   leader who talks before it fights) is built with `forge_creature` (see "Creature forge" at
   the top of this skill) on its blueprint and its placed copy: `gearRole: "elite"` for a boss
   or named leader, `"standard"` otherwise, and `originalSpawn: "nw_c2_default9"`. For a standard
   PC race, `build_key_npc` does the blueprint, forge, placement and verify in one call.

---

### Phase 3b: Create Companions (henchmen)

Any NPC the plot describes as joining, following, accompanying, or being rescued/freed
must be built as a **real NWN henchman**, or they will stand still while the player walks
away. This is the single most-reported defect in generated modules.

**Cap at 3 companions per adventure.** Use fewer unless the plot calls for a full party: every
companion is another actor to keep alive, pathed, and balanced against.

**Skip this phase entirely if the plot has no companion characters.**

#### Step 1: Shared scripts (once per module)

`create_companion_system()` (pass `maxCompanions` only if the plot needs fewer than 3). It writes
and compiles `inc_companion`, the conditions `c_hen_mine` / `c_hen_full` / `c_hen_free` and the
actions `a_hen_join` / `a_hen_leave` / `a_hen_stay` / `a_hen_follow`. Confirm `success: true`.
Don't write any of these by hand, and don't write `a_hen_death` or a recruit counter: the party
cap is counted from the engine at join time, so dismissal and death free a slot by themselves.
Join raises the henchman cap before `AddHenchman`, sets listen patterns and starts the companion
in follow mode, so no `a_mod_load` change is needed for companions.

Also call `create_creature_level_system` once per module if `cf_spawn` doesn't exist yet (it is
shared with `/adventure-challenges`).

#### Step 2: Per companion — one call

```
build_companion(resref: "<name>", name: "<display name>", area: "<area>", x: ..., y: ...,
                race: <0-6>, classId: <class>, level: "<module target level>", gender: <0|1>,
                introduction: "<first meeting: who they are, why they are here>",
                backstory: "<answer to 'Tell me about yourself'>",
                accept: "<agreeing to join, in their voice>", farewell: "<when dismissed>",
                partyFull: "<when the party already has enough help>")
```

It writes the shared scripts if missing, builds the henchman blueprint (stock `x0_ch_hen_*`
AI, Commoner faction, a PC voiceset chosen from class and gender), forges it, places it,
wires the four-root dialog and runs `verify_creature` — read `verify` and `forged.warnings`
in the result. Class IDs: 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin
7=Ranger 8=Rogue 9=Sorcerer 10=Wizard. Race 0–6 (Dwarf, Elf, Gnome, Halfling, Half-Elf,
Half-Orc, Human) is also the appearance, so no chassis is needed. For a Cleric pass `domains`,
for a Wizard `school`, for a signature spell `pinnedSpells` (see the **creature-forge** skill).
Don't set `classes`, `feats`, `spells`, `equipment`, `scripts` or `varTable` yourself.
Use the individual tools (`create_creature_blueprint`, `forge_creature`, `place_creature`,
`create_companion_dialog`) only for a non-standard look or a creature that isn't a PC race.

#### Equipment and spells

`forge_creature` buys every forged creature's gear at spawn: armor and weapons it is
proficient with (the engine silently refuses to equip anything else), within its level's
allowance. A few cases still need a hand:

- **A specific plot item** (a named heirloom sword): forge with `gearWealth: "0"` so the
  creature keeps its current gear, then equip the item with `set_creature_equipment`.
- **Never build armor from scratch.** `create_item_blueprint` doesn't set the 18
  `ArmorPart_*` fields or the colors, so from-scratch armor renders as nothing. Use a real
  blueprint.
- **A flavor item with no mechanical property** (a keepsake, a holy symbol) needs a
  `description` saying why it matters. Don't add bare, unexplained rings, boots or gloves.
- **Archers get a melee backup automatically**: a forged creature with a ranged weapon
  also buys a melee weapon it can use, kept unequipped in its inventory, so the stock AI
  can switch to it when ammo runs out. Only add one by hand for a creature forged with
  `gearWealth: "0"`.
- **A fixed signature spell** (a boss whose plot depends on one spell): pass
  `pinnedSpells: '[<spells.2da row>]'` to `forge_creature`. A pinned spell is always picked
  first at its spell level and is checked in game (`cl_spell_pinned_<id>`); the forge
  warns and ignores a spell that isn't on the creature's class list.

`henchman: true` wires all 13 script fields to the stock `x0_ch_hen_*` associate AI.
These are base-game resources resolved at runtime — **never write them into the module**,
and expect `validate_module` to report them as missing (a false positive).

**Verify the spawn worked, live.** At spawn every forged creature logs `[SPEC_OK]`/
`[SPEC_FAIL]` lines for its level, classes, spell slots and spell validity, pinned spells,
equipped chest and weapon, an archer's melee backup, and that no gold was added, plus one
`[CL_LOOT]` line listing what it bought. `run_live_verification` returns them; fix
any `[SPEC_FAIL]` before reporting success.

#### Step 3: Verify before moving on

For each companion: `verify_creature(resref: "<resref>", henchman: true)` and
`verify_dialog(resref: "dlg_hen_<resref>")`. **Both must return zero errors.** Fix and
re-verify; after two failed attempts record `"status": "partial"` in
`adventure-status.json` (pass the errors to `phase_check`) rather than reporting success.

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
wrong spellbook/proficiencies if you trusted the source chassis's native class. `forge_creature`
overwrites class, package, feats, skills and ability scores regardless of what the chassis
carries, so its native `ClassList` doesn't matter once the creature is forged. Cloning still
carries over whatever other legacy fields (`Phenotype`) the source NPC has — another reason
to prefer the chassis-free default path unless you specifically need one of these looks.


| Archetype | Resref | Class |
|-----------|--------|-------|
| Fighter | `nw_dwarfmerc002` / `nw_bandit001` | Fighter (class 4) |
| Ranger / archer | `nw_elfranger001` | Ranger (class 7) |
| Cleric / healer | `nw_halfcel001` | Native class is Fighter — **must** override `classes` to `[{"class": 2, "level": <target>}]` explicitly; use this resref for its half-elf-cleric appearance only |
| Wizard | `nw_elfmage001` / `nw_elfmerc001` | Wizard (class 10) |
| Rogue | `nw_halfmerc001` | Rogue (class 8) |

#### Companion voices

`build_companion` picks a TYPE 0 (PC) voiceset from class and gender and checks it against `soundset.2da`; TYPE 3 NPC sets leave a companion mute, so never set one by hand.

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
- **Return to the main dialog.** An answer never ends the talk: `create_dialog` links each answer back to the greeting's options and adds a `[Leave.]` reply, so the player chats until choosing to leave. Mark a line that really must end it (a fight starts) `end: true`. An answer that runs a script or sets a journal entry re-enters the dialog through an `[Anything else?]` reply, so the greeting that is active now (after accepting, the reminder, not the offer) is shown. `add_dialog_node` does the same for a new NPC answer; pass `end: true` for one that must end the talk (a fight starts).

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

**Facing:** Orient NPCs toward the player's likely approach — pass `faceTowardX`/`faceTowardY` to `place_creature` (the point they should look at); a raw `bearing` is a **compass** angle for creatures (0 = north, 90 = east, clockwise):
- Behind a counter/bar → face the open side
- In a room → face the door/entrance
- In an open area → face the nearest path or clearing

Pick the spot with `probe_ground` / `adventure_find_walkable` (Z is set from the walkmesh automatically); creatures keep the default 1 m walkable buffer.

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
  Forged at level [N] (`gearRole: pc`).

**Companion system:** `create_companion_system`, party cap [N] (counted from the engine at join).
Scripts `a_hen_join` / `a_hen_leave` / `a_hen_stay` / `a_hen_follow`; conditions `c_hen_mine` /
`c_hen_full` / `c_hen_free`.

**Faction:** All actors set to Commoner (ID 2).
```

**Downstream skills must respect the companion entries:**
- `/adventure-quests` must **not** overwrite a companion's `Conversation`, and must **not**
  add quest roots with `parentIndex: 0` to a companion dialog — that unshifts the quest root
  ahead of the three conditional roots and breaks recruitment. Prefer not making companions
  quest-givers at all.
- `/adventure-challenges` must **not** make a companion hostile.
- `/adventure-polish` must whitelist the base-game `x0_ch_hen_*` scripts when checking
  for missing references.

This data is used by downstream skills to select actors for quest roles (`/adventure-quests`) and to know which areas already have creature presence (`/adventure-challenges`).

Edits are saved to the module project as they happen; do not build the `.mod` (`repack_module`) unless the user asks.

---

## Faction Rules

- **ALL actors placed by this skill use Commoner faction (ID 2).** No exceptions.
- Standard NWN factions only (`faction: "commoner"` or 2; the tool warns when a blueprint is left in the player faction).
- **No custom factions.** Out of scope for a one-shot module.
- Hostile creatures are placed by `/adventure-challenges`, not this skill.
- If `/adventure-quests` needs a merchant NPC, it can change the faction to 3 (Merchant) later.

---

## Humanoid NPC Source Blueprints

Pick the one that best matches the plot's NPC description. Clone it and override name/faction/dialog.

> Resref lists here are examples; search the full catalog with `list_blueprints` when none fits.

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
- **Dialog resref must be created before the creature blueprint** that references it (or create them in the right order: dialog first, then blueprint with `conversation` field).
- **No quest logic in dialogs.** NPCs can hint at the situation but do NOT assign quests, give journal entries, or run scripts. That's `/adventure-quests`'s job.
- **Do not build the .mod.** Edits are saved to the module project as they happen; call `repack_module` only when the user asks for the `.mod` (`/create-adventure` offers it at the end).
- **Ambient creatures don't get dialogs.** Only key NPCs from the plot get `create_dialog` calls.
- **Max 16 character resrefs.** NWN has a 16-char limit on resref identifiers.
- **All blueprint edits must precede `place_creature`.** Placement snapshots the `.utc` into
  the GIT; later blueprint edits never reach the placed instance.
- **Max 3 companions**, and never on a Commoner chassis.
- **Companion AI scripts (`x0_ch_hen_*`) are base-game** — never write them into the module.
  `validate_module` reporting them as missing is a false positive.
- **Verify before reporting success.** Every companion must pass `verify_creature(henchman: true)`
  and `verify_dialog` with zero errors.
- **`FeatList` and `SkillList` must be baked at build time** — `LevelUpHenchman()`
  grants neither, confirmed by direct probe. See the corrected guidance in Phase 3b.
- **Source equipment from real blueprints first** (`list_blueprints` AND `resman_search`
  — the latter catches base-game "Standard palette" items the former misses), budgeted
  via `get_wealth_budget`. Only build from scratch when nothing real matches, and never
  build armor from scratch (missing visual data — see Phase 3b Equipment).
- **A weapon-specific feat (Weapon Focus/Specialization/Improved Critical) needs the
  exact matching weapon**, not just a same-category one — a Dwarven Waraxe gets no
  benefit from Battleaxe-specific feats despite both being martial axes.
- **Mixing direct `nwn_gff` file edits with MCP tools on the same resource in one
  session is a confirmed data-loss bug** (an equipment tool call can silently revert
  the *entire* file to a stale in-memory snapshot). If a repair task needs raw
  `nwn_gff` scripting on top of this skill's normal MCP-tool flow, see the ordering
  rule in the main project `CLAUDE.md`'s Known Pitfalls before mixing the two.

## Finish

Call `phase_check(phase: "actors", step: "end")` last. It checks this phase's section was appended, runs the verifiers that belong to the phase and writes the entry to `adventure-status.json` (`partial` with the error list if anything is left). Fix its errors and call it again; never report success past errors.
