# Quest system

A parameter-driven, whole-party quest system: one short spec per quest, no per-quest scripts. Ported from The Frozen
North's `inc_quest.nss` / `dlg_q_*` scripts and the TFN content studio's courier, rescue and escort runtime; see "What
changed from TFN" for the differences. Last updated 2026-11-07.

## In short

- **`build_quest(spec, dryRun)`** turns a short spec into journal, dialog, variables and event wiring. Run it with
  `dryRun: true` first and read the plan. Rebuilding the same quest replaces only what it made; `remove_quest(tag)` undoes it.
- **`create_quest_system`** writes the shared runtime. `build_quest` runs it for you the first time.
- **Whole party:** any member's advance moves every member's journal and pays every player the full reward.
- **State:** a player's progress is the engine's own journal number (`NW_JOURNAL_ENTRY<tag>`). Nothing else is stored.
- **Variety comes from parameters:** every dialog line uses the same two scripts, `q_chk` (condition) and `q_act` (action),
  with different script parameters.

## The spec

Smallest form:

```json
{
  "name": "Wolves at the Fold",
  "giver": "farmer_ned",
  "level": 3,
  "stages": [
    { "do": "talk",   "journal": "Ned asked me to deal with the wolves killing his sheep." },
    { "do": "kill",   "target": "wolf_alpha", "area": "fold_hills", "journal": "The alpha wolf is dead." },
    { "do": "return", "journal": "Ned thanked me and paid what he could." }
  ]
}
```

What is derived:

- `tag` from the name (`q_wolves_at_the_fold`; a `bounty` template gets `b_`), at most 27 characters.
- Stage numbers 1, 2, 3 …; each stage follows the previous one (`from` = n − 1).
- Stage 1 is accepting the quest from the giver; if the first stage isn't a talk with the giver, one is added.
- The last stage (every stage with the highest number) ends the quest.
- Each success ending without a `reward` gets one sized by `level`: XP tier 1–4 by quest length, gold = 25 × level.
- `return` means "talk to the giver again".
- Default dialog lines for anything not given.
- Missing `giver`, `target`, `captive`, `npc` or `item` are filled from objects tagged `<tag>_giver`, `<tag>_target`, … (turn
  off with `"autowire": false`).

### Quest fields

| Field | Meaning |
|---|---|
| `name` | Journal title. Required. |
| `giver` | NPC tag or blueprint resref. Required (or tagged `<tag>_giver`). |
| `level` | Reward sizing (default 3). |
| `tag`, `priority` | Override the derived tag; journal priority 0–4 (default 2, bounties 0). |
| `reward` | `{xp, xp_tier, gold, item}` for the success endings, replacing the sized default. `xp` is a flat amount per player; `xp_tier` (1–4) uses TFN's level-scaled formula. |
| `template` + its fields | One line instead of `stages` (below). `journal: [...]` gives the stage journal lines in order. |
| `stages` | The stage list. |

### Stage kinds

| `do` | What advances it | Needs |
|---|---|---|
| `talk` | A line in the NPC's dialog | `journal`; `to` (default the giver) |
| `return` | A line in the giver's dialog | `journal` |
| `kill` | The creature dies (a companion's or summon's kill counts) | `target`; `area` if it isn't placed yet |
| `pickup` | A party member picks the item up | `item` (resref) or `itemName` (a new quest item); `from_creature` or `in` (placeable tag) for who holds it |
| `explore` | A party member enters the area | `area` |
| `trigger` | A party member walks into a spot | `area`, `x`, `y`, optional `radius` (default 3 m) |
| `use` | A party member uses a placeable | `target` (placed placeable tag) |
| `search` | A party member searches a placeable and the best-skilled party member (player or companion) passes `check` | `target` (placed placeable tag), `check: {skill, dc, tries, assured, pass, fail}`; optional `item`/`itemName` handed to the player, `examine`, `none` |
| `deliver` | The NPC takes the item (`count`, default 1) | `item`, or an earlier stage that gives or picks one up; `to` (default the giver) |
| `rescue` | Freeing the captive in dialog (it leaves unless `leave: false`) | `target` |
| `escort` | The NPC reaches the destination following a party member | `target`; `area` and optional `x`, `y`, `radius` |
| `custom` | Your own script calls `AddJournalQuestEntry(tag, n, oPC)` | nothing: build_quest writes the journal entry only (use for a stage like "every enemy in the tower is dead") |

Any stage may add:

- `check: {skill | ability | save, dc | difficulty, else, prompt, pass, fail}` on talk-style stages (ability and save checks and named difficulties run through `q_check`, a plain skill DC through `q_roll`; `search` stages take a skill only): the PC line rolls the check once (the best rank among the
  speaker and its companions); a pass advances, a fail does nothing (`else: "end"`) or turns the NPC hostile (`else: "fight"`).
- `search` options: `check.tries` (attempts per player, default 2), `check.assured` (default true: once a player's tries are
  spent the search succeeds anyway, so a required clue can never block the quest), `examine: {skill, dc, var, pass, fail}` (a
  second check rolled on success by whoever is best at it, such as Lore on a found letter's seal; a pass sets module local
  string `var` to "1" and shows `pass` with that companion's name), `none` (text before the quest reaches this stage).
- `spawn: {resref, area | at, x, y, count, tag, hostile}` on any stage but escort/custom/optional (stage 1 = on acceptance): creates the creature(s) when that stage advances the quest — on a dialog stage via its `q_act` line, on a kill/pickup/explore/trigger/use/search stage via `questK_spawn*` locals that `QuestAdvance` reads (a multi-part encounter: kill the lookout, the main force appears). With `area`, build_quest places the waypoint `<quest tag>_s<n>_spawn` on walkable ground; `at` names an existing one. The `q_act` line carries `spawn`, `at`, `spawn_key` (once per quest stage), and `spawn_count`/`spawn_tag`/`spawn_hostile`  when set. A quest-level `spawn` (templates) goes onto stage 1.
- `optional: true` on a `search`: an optional clue — no journal entry, doesn't move the quest on, available once the quest is
  at or past `from` (default 1), pays its `reward` to the party once (never assured).
- `approach` on stage 1 (true, or a bark such as `"*whines*"`): the giver walks up to the first player it sees and starts its
  conversation, once per player (`q_approach` on its OnPerception, chaining the old handler).
- `join: true` on a talk stage: that NPC joins the speaker's party as a henchman when the stage advances (it needs the
  `x0_ch_hen_*` scripts, e.g. `create_creature_blueprint henchman: true`). It counts toward the party's companion cap.
- `companion: "<tag>"` on a talk stage: the line is offered only while that companion is in the party; `dismiss: "<tag>"`:
  that companion leaves the party when the stage advances and walks to the NPC.
- `keep: true` on `deliver`: the NPC examines the item and the party keeps it (a later stage can hand it on).
- `script`: a script run on the advancing NPC when the stage advances (e.g. opening a gate).
- `reward: {xp, xp_tier, xp_level, gold, item}`. An item reward on stage 1 is how a courier parcel is handed out.
- `n`, `from`, `end`: branches. Two stages with the same `from` fork; two with the same `n` converge (a persuade path and a
  kill path both reaching stage 2). `end: "fail"` marks a failure ending.
- Dialog lines: `offer`, `accept`, `acceptReply`, `decline`, `declineReply` (stage 1), `text` (the NPC's line when the stage
  advances), `reply`, `reminder` (while the party is at this stage), `missing` (deliver without the item), `plea`
  (rescue/escort), `arrive` (escort arrival). On the final stage, `reminder` is the thank-you line shown afterwards.

### Templates

| `template` | Fields | Stages it builds |
|---|---|---|
| `fetch` | `item` or `itemName`, `area` | accept → pickup → deliver to the giver |
| `kill` | `target`, `area` | accept → kill → return |
| `bounty` | `target`, `area` | as `kill`, tag `b_…`, repeatable 6 hours after completion |
| `deliver` | `item`, `to` | accept (parcel given) → deliver to `to` |
| `rescue` | `captive`, `area` | accept → rescue → return |
| `escort` | `npc` (default the giver), `dest: {area, x, y, radius}` | accept → escort |
| `investigate` | `clues: [{use, journal}]` | accept → use each clue → return |
| `persuade-or-fight` | `target`, optional `check` (default Persuade DC 15, fight on failure) | accept → persuade *or* kill (both stage 2) → return |

## What build_quest writes

- **Journal:** one category per quest (`Tag` = quest tag), one entry per stage number, `End` on endings.
- **Stage variables** (TFN's contract) on every object that advances a stage, on its blueprint *and* every placed copy:
  `questK = "<stage>_<tag>"` with slot K = 1–20 per object, `questK_reward_*`, `questK_jumpstage` + `questK_prereq1` for a
  stage whose `from` isn't n − 1, `questK_escort_*`, `questK_bounty_end`. Event objects also get `quest_event = K`.
- **Dialog:** each NPC's quest lines are merged into its conversation (a new `dq_<npc>` conversation is created if it has
  none). Root lines are ordered: escort under way, stages it advances (latest first), reminders and the thank-you line, the
  offer, then the NPC's own lines. Every node carries the comment `mcpq:<tag>:` so a rebuild or `remove_quest` finds them.
- **Event wiring:** the creature's `ScriptDeath` → `q_ondeath`, the area's `OnEnter` → `q_onenter`, a created trigger's OnEnter
  → `q_trigger`, the placeable's `OnUsed` → `q_onused`. The previous handler is kept in a local
  (`MCP_Q_ORIG_DEATH/_ENTER/_USED`) and runs first. Pickups set the module's OnAcquireItem to a generated `q_mod_acquire`
  that runs the old handler first; bounties set OnHeartbeat to `q_mod_tick`.
- **Objects:** an unplaced kill target is placed on open ground in `area`; a quest item is created (a base-game item is copied
  under its own resref, so quest variables never touch every copy of a common item); a trigger stage creates a trigger tagged
  `<tag>_t<n>`.
- **Report:** stages with the object and slot that advance each, dialog outlines, placements, warnings, and an `adventure.md`
  block including the spec, so a later phase can rebuild the quest (for example with different rewards).

## The runtime

| Script | Role |
|---|---|
| `inc_quest` | Shared logic: eligibility, whole-party advance and rewards, credit resolution, escort, helpers. |
| `q_chk` | Dialog condition. Every parameter present must pass (table below). |
| `q_act` | Dialog action. With `target`, nothing else runs unless the advance happened, so nothing repeats. |
| `q_roll` | A skill check rolled once, as an action; `q_chk roll=` reads the result. |
| `q_check` | One check for anything: a skill, an ability or a saving throw at any DC (`dc=` or `difficulty=easy|moderate|hard|veryhard`), rolled by the best of the party, the speaker or everyone (`who=`), with `tries=` per player and outcomes as parameters (`pass_`/`fail_` damage, `pass_`/`fail_ability` + `_amount` + `ability_hours` (a temporary ability decrease per roller, e.g. poison), message, unlock, destroy, spawn, set_var, give_item (every party member gets a copy), xp). Works as a dialog action, and on a trigger (OnEnter), placeable (OnUsed, or OnDisarm with `event: "disarm"`) or door (OnFailToOpen) through `add_skill_check` + `q_check_evt`. |
| `q_ondeath`, `q_onenter`, `q_trigger`, `q_onused` | Event stages; run the stored original handler first. |
| `q_approach` | On an NPC's OnPerception: walks up to the first player it sees and starts its conversation, once per player. |
| `q_search` | Search stage on a placeable: the best-skilled party member rolls, limited tries per player, optional assured find, item, and an `examine` check. |
| `q_mod_acquire`, `q_mod_tick` | Per-module wrappers for OnAcquireItem and OnHeartbeat, with the old handler built in. |

### `q_chk` parameters

| Parameters | Passes when |
|---|---|
| `target=K` `mode=eligible` (default) / `current` / `past` / `notcurrent` | Slot K on this NPC: may advance now / is at its stage / at or past / not at |
| `quest=<tag>` `stage=N` `op=at` / `atleast` / `atmost` / `below` | Any quest by tag (gate guards, other NPCs) |
| `item=<tag>` `count=N` `lacks=1` | The party carries (or lacks) N items with that tag |
| `gold=N` | The speaker has at least N gold |
| `skill=<name>` `rank=N` | Best rank among the speaker and its companions |
| `roll=<key>` `roll_result=pass` / `fail` / `none` | An earlier `q_roll` with that key |
| `companion=<tag>` | That companion is in the party, alive |
| `var=<name>` `value=<v>` | A module local string equals v |
| `target=K` `escort=offer` / `active` | The escort can start / this speaker's escort is under way |

### `q_act` parameters

`target=K` (advance and pay; `aoe=<radius>` advances every player nearby), `take_item=<tag>` `take_count=N`,
`give_item=<resref>`, `take_gold=N`, `set_var=<name>` `var_value=<v>`, `hostile=1`, `leave=1`, `unlock=<door tag>` `open=1`,
`destroy=<tag>`, `spawn=<resref>` `at=<waypoint tag>` (+ `spawn_count=N` `spawn_tag=T` `spawn_key=K` `spawn_hostile=0`; spawns once, only at a real waypoint, and logs `[QUEST_WARN]` instead of falling back to the NPC's own spot), `escort=K`, `join=1`, `dismiss=<tag>`.

### Eligibility (TFN's rules)

A player may be advanced to slot K's stage when their stage is exactly one lower (or, with `questK_jumpstage`, lower at all),
every `questK_prereqN` is met, and a bounty on cooldown hasn't reset. Because the whole party advances together, a second
member can't advance or be paid again.

### Credit

A kill, pickup, trigger or use by a companion, summon, familiar or dominated creature credits its master. A kill by nobody in
a party (a guard ally, a trap) credits the nearest player within 30 m. Rewards go to every player in the party, each 100 %:
XP by TFN's formula (base 50/100/200/400 by tier, +10 % per quest level, scaled by the gap between quest and player level,
20–150 %) and/or a flat `xp` amount, gold, and one copy of the reward item each.

## What changed from TFN

- **Vanilla:** no SQLite (`SQLocalsPlayer`), no NWNX (journal reads, quest-giver highlighting), no TFN includes (XP, loot,
  webhooks, statistics, `area_init` registration). Quest-giver highlighting is dropped.
- **Whole party** instead of each player separately; talk stages now advance everyone.
- **Fixes:** AoE advances used `quest1` whatever the stage; slots stopped at 19; the Bluff check rolled, shifted alignment and
  advanced inside a condition (and could skip any number of stages); reward items weren't checked; stage numbers were limited
  to two digits; pickups only ever advanced slot 1.
- **Additions:** `q_chk`/`q_act` cover checks and effects that needed separate scripts or none existed for; trigger and use
  stages; companions' kills and pickups count; every advance logs `[QUEST] advance tag= stage= via= pc= object=`.

## Testing

- `npm run verify` covers the spec, the builder (dry run, build, rebuild, remove) and the generated scripts' contents; every
  script is compiled by `create_quest_system`.
- `run_live_verification` returns `[QUEST]` lines, but the headless server has no player, so no stage can actually advance
  there: test quests in game.
