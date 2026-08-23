---
name: adventure-rewards
description: Sub-skill of /create-adventure. Reads all sections from adventure.md and assigns quest XP rewards, places end-of-adventure and mid-adventure reward items. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Rewards

Sub-skill of `/create-adventure`. Reads all sections of `adventure.md`, then assigns quest XP rewards and places notable reward items throughout the adventure. Monster XP is automatic from kills — this skill handles **quest-completion XP** and **placed loot rewards** (magic items, unique treasure). Downstream: this is the final content skill before the adventure is complete.

## Prerequisites

- `adventure.md` must exist in the MCP temp directory (`$MCP_FOLDER_TEMP`, defaults to `$TEMP/nwn-mcp` or `/tmp/nwn-mcp`) and contain completed `## Plot`, `## Areas`, `## Environment`, `## Actors`, `## Quests`, `## Challenges`, `## Affordances`, and `## Polish` sections.
- A module must be loaded. If none is loaded, call `load_module` using the module name from `adventure.md`.

## Workflow

Fully autonomous. Make all decisions based on the adventure document and module state — do NOT ask the user for input.

---

### Pre-Check: Validate adventure.md

Read `adventure.md` from the MCP temp directory. Verify these sections exist and are non-empty:
- `## Module`
- `## Plot`
- `## Areas`
- `## Environment`
- `## Actors`
- `## Quests`
- `## Challenges`
- `## Affordances`
- `## Polish`

If any required section is missing or contains no content below its heading:
**STOP.** Output: `"ERROR: adventure.md is missing required section [name]. The prerequisite skill has not run or failed. Cannot proceed."`

---

### Phase 1: Read Adventure Context

Read `adventure.md`. Extract from all sections:

**From `## Module` / `## Plot`:**
- **Target level** — drives XP budget and item power level
- **Tone** — dark/heroic/lighthearted affects reward flavor
- **Quest objectives** — primary vs side quests, completion conditions
- **Loot outline** — any specific rewards mentioned in the plot

**From `## Areas`:**
- **Area resrefs** — needed for `visualize_area` and item placement
- **Area classification** — safe (inn/town) vs dangerous (dungeon/wilderness/boss arena)
- **Boss area** — where the final encounter takes place

**From `## Quests`:**
- **Quest tags** — identifiers for `edit_journal_quest`
- **Journal entries** — which entries are completion entries (end=true)
- **Primary vs side quests** — primary quest gets more XP
- **Quest flow** — progression order affects when rewards are encountered

**From `## Challenges`:**
- **Creature CR values** — used to estimate total monster XP
- **Creature count per area** — total kills expected
- **Magic Items on Creatures** — items players will loot from defeated enemies. **Do not duplicate these as placed rewards.**
- **Boss creature** — highest CR enemy; boss reward should match or slightly exceed boss equipment

**From `## Affordances`:**
- **Starting gold** — context for whether the player starts well-equipped
- **Store inventory** — what's purchasable (don't reward items the store already sells)
- **Container loot** — items already placed in containers (don't duplicate)

**From `## Polish`:**
- **Fixes applied** — any changes that affect quest or creature state

---

### Phase 2: Calculate XP Budget

**Quest XP is per-player, and is NOT divided by party size.**

This is the single most misunderstood point in reward design, so be precise about which
of the two XP channels you are budgeting:

| Channel | How it scales with party size |
|---|---|
| **Combat XP** (automatic, per kill) | The engine **divides** it — each player's share shrinks as the party grows. |
| **Quest XP** (this skill) | Each player receives the **full** amount. Nothing is divided. |

Quest XP reaches players either through `CoopRewardXP` (see Phase 2b) or through the
journal category's XP field, and both hand every recipient the same number. BioWare's own
`RewardPartyXP` in `nw_i0_tool` is a loop calling `GiveXPToCreature(oPartyMember, XP)`
with the *same* `XP` for each member — confirm this for yourself before changing the
numbers below.

**Consequence: do not multiply quest XP by party size.** A 2.5x multiplier on a
four-player party gives each of them 2.5x the intended reward, not their fair share.

**Party size adjustment (small, and for the right reason):**
Read **Party Size** from `## Module`. Because the *combat* share shrinks with party size
while quest XP does not, a large party earns less total XP per player. Nudge quest XP up
to compensate — modestly, since only the monster half is affected:
- Solo (1): base XP as calculated
- Party of 2: multiply quest XP by 1.15
- Party of 3: multiply quest XP by 1.25
- Party of 4: multiply quest XP by 1.35

These are estimates for pacing, not exact math — the engine's combat XP formula factors
average party level as well as size. Treat the Step 4 sanity check as authoritative.

Estimate total adventure XP and determine quest XP allocation.

**Step 1: Estimate monster XP.**

For a solo player at the target level, approximate XP per kill based on creature CR:

| CR vs Target Level | XP per Kill |
|--------------------|-------------|
| CR = target - 2 | ~25 XP |
| CR = target - 1 | ~50 XP |
| CR = target level | ~75 XP |
| CR = target + 1 | ~100 XP |
| CR = target + 2 | ~150 XP |
| CR = target + 3+ | ~200 XP |

Count all hostile creatures from `## Challenges` and sum estimated monster XP.

**Step 2: Determine quest XP budget.**

Quest XP should roughly equal total monster XP. This means quests double the player's leveling pace compared to grinding alone.

```
Quest XP Budget = Estimated Total Monster XP
```

**Step 3: Distribute quest XP.**

- **Primary quest:** 60-70% of the quest XP budget
- **Side quests:** Split remaining 30-40% evenly among side quests
- Round to the nearest 25 XP for clean numbers

**Step 4: Sanity check.**

Calculate total adventure XP (monster + quest). Compare against NWN level thresholds:

| Level | XP to Reach | XP for Next Level |
|-------|-------------|-------------------|
| 1 | 0 | 1,000 |
| 2 | 1,000 | 2,000 |
| 3 | 3,000 | 2,000 |
| 4 | 6,000 | 4,000 |
| 5 | 10,000 | 5,000 |
| 6 | 15,000 | 6,000 |
| 7 | 21,000 | 7,000 |
| 8 | 28,000 | 8,000 |
| 9 | 36,000 | 9,000 |
| 10 | 45,000 | 10,000 |

The total adventure XP should bring the player **60-80% of the way to the next level** beyond the target level. If it's too high (would level up twice), reduce quest XP. If it's too low (< 40% to next level), increase quest XP.

---

### Phase 2b: Create the Reward System

Before writing any script that hands out a reward, generate the shared include:

```
create_reward_system(
  policy: "full",
  classItems: '[{"tier":"boss","items":{"fighter":"...","wizard":"..."},"fallback":"..."}]'
)
```

This writes `inc_reward.nss` and proves it compiles. **Check `compiles: true` in the
response before continuing** — every later reward script includes this file, so a broken
include fails everywhere at once, far from the cause.

`policy: "full"` is the default and what every generated module should use: each player
receives 100% of every reward. Use `"split"` or `"speaker"` only when the adventure brief
explicitly asks for a divided pot or a single-player module.

**Use these helpers instead of raw reward calls.** They fan out to the whole party, so
`verify_coop_rules` passes automatically:

| Instead of | Call |
|---|---|
| `GiveXPToCreature(oPC, n)` | `CoopRewardXP(oPC, n)` |
| `GiveGoldToCreature(oPC, n)` | `CoopRewardGold(oPC, n)` |
| `CreateItemOnObject(r, oPC)` | `CoopRewardItem(oPC, r)` |
| XP + gold + item together | `CoopRewardQuest(oPC, nXP, nGold, "tier")` |
| A per-class item | `CoopRewardClassItem(oPC, "tier")` |

Every helper takes the *triggering* PC (`GetPCSpeaker()`, `GetLastUsedBy()`) and walks the
party itself. Never iterate the party in a reward script by hand.

**Class-appropriate rewards.** `CoopRewardClassItem` resolves each party member's *own*
primary class, so a four-player party walks away with four different items rather than
four copies of whatever suited the one who happened to be talking. Define a tier per
reward moment and give it an entry for each class the party plausibly contains, plus a
`fallback` for the rest:

- Create the item blueprints **first** (Phase 4), then pass their resrefs to
  `create_reward_system`. The response lists `missingItemBlueprints` for any resref with
  no `.uti` — an unresolved resref silently gives that player nothing.
- Cover at minimum the four archetypes a party is likely to field: a melee weapon
  (fighter/barbarian/paladin), a light weapon or thieves' tool (rogue/ranger/monk), an
  arcane item (wizard/sorcerer/bard), a divine item (cleric/druid).
- Multiclass PCs resolve to whichever base class they have the most levels in.

---

### Phase 3: Assign Quest XP

For each quest with a completion journal entry (`end=true`), call `edit_journal_quest`:

```
edit_journal_quest(
  tag: "q_[quest_tag]",
  xp: "[calculated_xp]"
)
```

**Rules:**
- Only set XP on quests that have at least one completion entry (end=true in the journal)
- If a quest has no completion entry, skip it — it's either a tracking quest or incomplete
- Verify with `get_journal` after setting all XP values

---

### Phase 4: Design Reward Items

Plan 1-3 notable reward items for the adventure. These are the "signature loot" — items the player remembers the adventure for.

**Anchor the value to the target level before choosing power.** Call
`get_wealth_budget(level: "<target level>", role: "pc")` for the gold a character at that level is
expected to be carrying in total, from D&D 3.5 DMG Table 5-1 (level 1: 150 · 3: 2,700 · 5: 9,000 ·
10: 49,000 · 15: 200,000 · 20: 760,000). Read the whole adventure's reward package against that
number:

- The **boss reward** should be a visible fraction of it — roughly a quarter to a third of a
  single character's total wealth at the target level. At level 3 that is a ~700-900 gp item; a
  4,000 gp blade there hands the player several levels of wealth in one drop and devalues
  everything the rest of the adventure can offer.
- **All rewards plus all lootable creature gear together** should land near one level's worth of
  progress, not several. Compare against the `## Challenges` magic item list before adding more.
- **Under-rewarding is the more common failure at low levels.** At level 1-2 the budget is tiny
  (150-900 gp), so a single +1 weapon is already the adventure's entire treasure — which is fine,
  and better than three of them.

**Price from the blueprint, not from the book.** NWN derives item cost from the `Cost` column of
`itempropdef.2da`, which does not match the 3.5e magic item formula (a +1 longsword is ~1,650 gp
in NWN, ~2,315 by the book). Always call `resolve_blueprint` and read the item's real cost when
checking it against a budget, and never infer an enchantment level from the resref's trailing
digits — for longswords `002` is +1, `010` is +2, `012` is +3.

**Boss Reward (always include 1):**
- Placed in or near the boss area — in a treasure container, on a final altar, or in the boss's hoard
- Power level: slightly above the best magic item already on creatures
- Type: weapon, armor, or accessory that fits the adventure theme
- Example: a +1 flaming sword in a fire-themed dungeon, a +2 shield in a defensive scenario

**Mid-Adventure Reward (include 0-1):**
- Rewards exploration or side quest completion
- Placed in a hidden or optional area, or given by an NPC for a side quest
- Power level: comparable to creature magic items (not better than boss reward)
- Example: a ring of protection found in a secret room, a cloak given by a grateful NPC

**Unique/Themed Reward (include 0-1):**
- Something adventure-specific that has narrative flavor
- Could be a quest item that doubles as useful gear
- Example: "Blackgrove Heartwood Staff" — a unique staff tied to the story

**Item Sourcing:**
1. **Prefer base game items** — use `resman_search` to find existing magic items
2. **Create custom enchanted items** when no base game item fits the theme — use `create_item_blueprint` with `sourceResref` and `properties`:
   ```
   create_item_blueprint(
     resref: "rw_fireblade",
     tag: "RW_FIREBLADE",
     name: "Blackgrove Ember Blade",
     baseItem: "4",
     sourceResref: "nw_wswls001",
     cost: "2000",
     description: "A longsword forged in the fires beneath Blackgrove Inn. Its blade smolders with residual heat.",
     properties: '[{"propertyName": 6, "subType": 0, "costTable": 2, "costValue": 1}, {"propertyName": 16, "subType": 6, "costTable": 2, "costValue": 2}]'
   )
   ```
   Common property IDs: `6`=**Enhancement Bonus** (costValue=bonus 1-20), `16`=Damage Bonus (subType: 1=Bludgeoning, 2=Piercing, 3=Slashing, 5=Magical, 6=Fire, 7=Cold, 8=Electrical, 9=Acid; costTable=2, costValue=dice), `0`=Ability Bonus (subType: 0=STR thru 5=CHA; costValue=bonus), `20`=Damage Resistance, `56`=Attack Bonus.

   **`6` is Enhancement and `56` is Attack Bonus** — verified against `itempropdef.2da`, where row 6 is `Enhancement` and row 56 is `AttackBonus`. Swapping them yields a weaker item (attack only, no damage) at roughly half the intended price. See `/adventure-affordances` for the full lookup procedure; when in doubt call `resolve_2da(table: "itempropdef", row: "<id>")` and read `Label`, `SubTypeResRef`, and `CostTableResRef` before writing the property.

   **Item descriptions are mandatory for custom reward items.** Always set the `description` parameter to a 1-2 sentence text that:
   - Describes what the item does mechanically (e.g., "+1 longsword that deals bonus fire damage")
   - Ties it to the adventure's plot, lore, or setting (e.g., "Forged in the embers beneath the Blackgrove Inn, this blade still smolders with the fury of its creator.")

   Reward items are the adventure's signature loot — their descriptions should make the player feel rewarded and connected to the story.
3. **Never duplicate** items already on creatures (`## Challenges` magic items) or in containers (`## Affordances` container loot)

> **These resref lists are quick-reference examples, not exhaustive catalogs.**
> If no suitable blueprint is found in these lists, call `list_blueprints(type: "uti", pattern: "[search term]")` to search the full base game and HAK stack by resref, tag, and display name (including TLK-resolved names). Always prefer a thematic match from the full catalog over forcing a poor fit from the examples.

**Base Game Magic Item Search Patterns:**

| Category | Search Pattern | Notes |
|----------|---------------|-------|
| +1 weapons | `mw` or `nw_wswm` | Masterwork/magic weapons |
| +1 armor | `nw_maarcl` or `nw_ashm` | Magic armor/shields |
| Rings | `nw_it_mring` | Magic rings |
| Amulets | `nw_it_mneck` | Magic necklaces |
| Cloaks | `nw_maarcl` or `nw_it_mcloak` | Magic cloaks |
| Boots | `nw_it_mboots` | Magic boots |
| Belts | `nw_it_mbelt` | Magic belts |
| Gloves | `nw_it_mbracer` or `nw_it_mglove` | Magic bracers/gloves |
| Potions | `nw_it_mpotion` | Magic potions |
| Scrolls | `nw_it_spdvscr` or `nw_it_sparscr` | Scrolls |
| Wands | `nw_wmgwn` | Wands |

Use `resman_search` with these patterns, then `resolve_blueprint` to check the item's properties and name before selecting it.

---

### Phase 5: Place Reward Items

**Idempotency check:** Before placing a new container or adding items, call `get_area_placeables(area: "...")`. If a reward container with the same tag already exists, **skip** placing it. If the container already contains the reward item (check its inventory), **skip** adding it.

For each reward item, place it in the module.

**Co-op caveat — placed loot cannot fan out.** A chest holding one sword is
first-come-first-served: whoever opens it takes it, and `verify_coop_rules` cannot see the
problem because no script is involved. Placed loot is fine for consumables and flavour,
but for a **signature reward the whole party should share**, prefer one of:

1. Hand it out from a script with `CoopRewardItem` / `CoopRewardClassItem` — an NPC's
   thank-you dialog, or the quest-completion script. This is the only option that gives
   every player a copy.
2. Stock the container with **one copy per expected player** (read **Party Size** from
   `## Module`), accepting that a smaller party finds spares.

Use plain placement for everything else.

**Option A: Place in an existing container**

If an appropriate container already exists in the target area (from `/adventure-environment`):

1. Call `get_area_placeables` to find the container's tag
2. Use `add_items_to_container` to add the reward item:

```
add_items_to_container(
  area: "[area_resref]",
  containerTag: "[container_tag]",
  items: '[{"resref": "nw_wswmls002"}]'
)
```

This automatically handles `HasInventory`, `ItemList` creation, grid positioning, and appending to existing loot.

**Option B: Place a new treasure container**

If no suitable container exists near the boss or reward location:

1. Call `visualize_area` to find a good position (near the boss spawn or in a prominent spot)
2. Use `resman_search` to find a treasure chest blueprint (e.g., `plc_chest2`, `plc_treas001`)
3. Call `place_placeable` to place the chest
4. Call `add_items_to_container` with the chest's tag to add the reward item

**Option C: Add to a creature's inventory**

If a reward should be carried by an NPC (quest reward given through dialog):

1. The item already exists as a blueprint — reference it in a quest action script
2. Write a script with `write_script` that gives the item:
   ```nwscript
   void main() {
       object oPC = GetPCSpeaker();
       CreateItemOnObject("rw_[resref]", oPC);
   }
   ```
3. Attach the script to the appropriate dialog node via `add_dialog_node` or by modifying an existing node's script

**Placement rules:**
- Boss reward goes in the boss area, accessible after or during the boss fight
- Mid-adventure rewards go in exploration areas or with quest NPCs
- Use `visualize_area` before every placement decision
- Don't place reward containers on top of existing objects

**Container description update:** After adding reward items to a container, update its `Description` via `modify_gff_field` to hint at the reward's significance. Read the current `Description` first — if the container already has text from `/adventure-environment` or `/adventure-affordances`, **integrate** the new hint into the existing description rather than replacing it. Reward containers should feel more significant than regular loot.

Examples:
- Existing text: `"A weathered crate. Faint herbal scent seeps through the slats."` + reward added → `"A weathered crate. Faint herbal scent seeps through the slats. Beneath the straw padding, something gleams."`
- Boss chest with signature weapon → `"An ancient strongbox sealed with runes. The lock shattered when its guardian fell. Something powerful rests within."`
- Existing ambient text: `"A battered iron chest, half-hidden under collapsed masonry."` + magic armor added → `"A battered iron chest, half-hidden under collapsed masonry. Through a crack in the lid, you catch the glint of fine metalwork."`

---

### Phase 5b: Win State

Create a victory sequence that fires when the player completes the primary quest's final objective.

1. **Identify the final dialog node.** Find the dialog and node whose action script calls `AddJournalQuestEntry` with the primary quest's `end=true` entry. Use `flatten_dialog` and `read_script_source` to trace it.

2. **Write the win-state script.** If the final node already has an action script, read it with `read_script_source`, then rewrite it via `write_script` with the win-state logic appended **after** the existing `AddJournalQuestEntry` call. If it has no action script, create a new one named `a_mod_win`.

   The win-state logic (append to the end of `main()`):
   ```nwscript
   // === Victory sequence ===
   object oPC = GetPCSpeaker();
   if (!GetIsPC(oPC)) oPC = GetFirstPC();
   if (GetIsObjectValid(oPC))
   {
       AssignCommand(oPC, PlaySound("gui_quest_done"));
       ApplyEffectToObject(DURATION_TYPE_INSTANT,
           EffectVisualEffect(VFX_FNF_SUMMON_CELESTIAL), oPC);
       FloatingTextStringOnCreature("*** ADVENTURE COMPLETE ***", oPC, FALSE);
       DelayCommand(3.0, SendMessageToPC(oPC,
           "[Custom congratulations message matching the adventure's tone and plot]"));
   }
   ```

3. **Adapt the message.** Replace the bracketed text with a 1-2 sentence congratulations that references the adventure's story (e.g., "The ancient evil is sealed. Millhaven owes you its survival."). Keep it short and thematic.

4. **Attach the script.** If you created a new script, use `edit_dialog_node` to set it as the action script on the final dialog node.

5. **Verify compilation.** Ensure `write_script` reports success. If compilation fails, fix syntax and retry (max 2 attempts).

---

### Phase 6: Verify

1. **`get_journal`** — verify all quests have XP values set. Print quest tag and XP for each.
2. **`get_area_placeables`** — verify reward containers exist and contain the expected items
3. **`validate_module`** — check for broken references (missing item resrefs, scripts)
4. **Spot-check item resrefs** — call `get_item_details` or `resolve_blueprint` on each reward item to verify it resolves

Fix any issues before proceeding.

---

### Phase 7: Update adventure.md

Append a `## Rewards` section to `adventure.md`:

```markdown
## Rewards

### Quest XP

| Quest | Tag | XP | Type |
|-------|-----|----|------|
| [Quest Name] | `q_[tag]` | [N] | Primary |
| [Quest Name] | `q_[tag]` | [N] | Side |

**XP Budget Analysis:**
- Estimated monster XP: [N] (from [count] creatures)
- Total quest XP: [N]
- Total adventure XP: [N]
- Target level: [N], next level at: [N] XP
- Player progression: ~[N]% toward next level

### Reward Items

- **[Item Name]** (`rw_resref` or base game resref) in [Area Name] (`area_resref`) — [location description]. [Brief item properties].
...

### Loot Summary

- **Creature drops:** [count] magic items from defeated enemies (documented in ## Challenges)
- **Container loot:** [count] items placed by /adventure-affordances
- **Reward items:** [count] items placed by /adventure-rewards
- **Store:** [count] items available for purchase
- **Total notable items:** [N]
```

---

### Phase 8: Repack

Call `repack_module()` to save all changes.

---

## Naming Conventions

| Resource | Pattern | Example | Max Length |
|----------|---------|---------|-----------|
| Reward items | `rw_[name]` | `rw_fireblade` | 16 chars |
| Treasure containers | `rw_chest_[id]` | `rw_chest_boss` | 16 chars |
| Reward scripts | `a_rw_[name]` | `a_rw_giveswd` | 16 chars |

**Keep names to 5-9 characters** to stay within the 16-char resref limit after prefixes.

---

## Important Notes

- **Do NOT auto-export HTML reports.**
- **Quest XP only on completion entries.** Only set XP on quests that have journal entries with `end=true`. Quests without completion entries are tracking/in-progress and don't award XP.
- **Don't duplicate existing loot.** Cross-reference `## Challenges` (magic items on creatures) and `## Affordances` (container loot, store inventory) before placing reward items. The player shouldn't find the same item twice.
- **Boss reward is mandatory.** Every adventure should have at least one notable reward in the boss area. The player should feel rewarded for completing the final encounter.
- **Verify every item resref** with `resman_search` or `resolve_blueprint` before placing it. Items that don't resolve cause silent failures in-game.
- **Append to existing container ItemLists.** If `/adventure-affordances` already placed items in a container, read the existing items first and append — don't overwrite with a new list.
- **XP should feel generous but not excessive.** The player should gain meaningful progress (60-80% to next level) but not level up twice from a single one-shot adventure.
- **Reward power curve:** Boss reward > mid-adventure reward > creature drops > store items. This creates a clear progression of loot quality.
- **Repack after all changes.** Call `repack_module` at the end so the user can see changes in the toolset.
