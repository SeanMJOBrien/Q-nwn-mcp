---
name: adventure-quests
description: Sub-skill of /create-adventure. Reads the plot, areas, environment, and actors from adventure.md and builds each quest with build_quest from a short spec — journal, dialog lines merged into existing NPC dialogs, stage wiring, quest items and rewards. Fully autonomous, no user interaction.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

> Adventure files here are title-based; paths come from `get_adventure_dir`.

# Quests

Sub-skill of `/create-adventure`. Reads all prior sections of `adventure.md`, then builds each quest in the plot with `build_quest` from a short spec: journal, quest lines merged into the NPC dialogs `/adventure-actors` created, stage wiring on the objects involved, quest items and rewards. No quest scripts are written by hand. Downstream skills (`/adventure-challenges`, `/adventure-affordances`, `/adventure-rewards`) layer combat, loot, and XP on top.

## Prerequisites

- `adventure.md` must exist in the adventure directory (`get_adventure_dir`, i.e. `adventures/<Title-With-Dashes>/`) and contain completed `## Plot`, `## Areas`, `## Environment`, and `## Actors` sections.
- A module must be loaded. If none is loaded, call `load_module` using the module name from `adventure.md`.

## Workflow

Fully autonomous. Make all decisions based on the plot document and existing module state — do NOT ask the user for input.

---

### Pre-Check

Call `phase_check(phase: "quests", step: "start")`. If it returns an error, **STOP** and output its `stop` message.

---

### Phase 1: Read Adventure Context

Read `adventure.md`. Extract from all sections:

**From `## Plot`:**
- **Quest objectives** — what the player must accomplish (fetch items, talk to NPCs, explore locations, solve puzzles)
- **Key NPCs** — name, role, location, quest involvement
- **Antagonists** — who opposes the player
- **Locations** — where quest events happen
- **Challenges** — what stands between the player and objectives
- **Loot & Economy** — any quest-relevant items mentioned

**From `## Areas`:**
- **Resrefs** — area identifiers for `visualize_area` calls
- **Transitions** — how areas connect (shapes quest flow)

**From `## Environment`:**
- **Placeables** — objects that could serve as quest pivots (containers, altars, furniture, evidence)
- **Waypoints** — map notes that can guide the player

**From `## Actors`:**
- **Key NPCs** — resref, tag, position, dialog resref, source blueprint
- **Ambient creatures** — what's already placed

Build a **quest plan**: for each quest in the plot, who gives it, what the party does at each stage (talk, kill, pick up,
explore, use, deliver, rescue, escort) and with which NPC, creature, item, placeable or area, and where it can branch or fail.

---

### Phase 2: Build each quest with `build_quest`

`build_quest` writes everything a quest needs: the journal, the giver's (and other NPCs') dialog lines merged into their
existing conversations, stage variables on every object involved, event wiring, quest items, placed kill targets and
rewards. It writes the quest scripts itself the first time. **Don't write quest scripts, journal entries or quest dialog
nodes by hand.** After `build_quest`, run `verify_dialog` on each touched dialog; a `dialog_branch_ends` warning means an answer ends the talk instead of returning to the NPC's options (`add_dialog_return_links`). The full field reference is `docs/quest-system.md`; this phase covers what to decide.

**1. Write a short spec per quest.** Only `name`, `giver` and each stage's `do` and `journal` are required:

```json
{
  "name": "Wolves at the Fold",
  "giver": "farmer_ned",
  "level": 3,
  "stages": [
    { "do": "talk",   "journal": "Ned asked me to deal with the wolves killing his sheep.",
      "offer": "Wolves have taken three of my sheep this week. I can't sleep for the howling." },
    { "do": "kill",   "target": "wolf_alpha", "area": "fold_hills", "journal": "The alpha wolf is dead." },
    { "do": "return", "journal": "Ned thanked me and paid what he could.", "text": "You killed it? Bless you. Take this." }
  ]
}
```

- `level` = the adventure's target level (from `## Module`): rewards are sized from it.
- Stages number themselves, each follows the previous, the last one ends the quest, and stage 1 is always accepting the
  quest from the giver.
- **Stage kinds:** `talk` (with `to`, default the giver), `return`, `kill` (`target`), `pickup` (`item` or `itemName`, plus
  `from_creature` or `in` for who holds it), `explore` (`area`), `trigger` (`area`, `x`, `y`), `use` (`target` placeable
  tag), `search` (placeable + `check`), `deliver` (`item`, `to`), `rescue` (`target`), `escort` (`target`, destination
  `area`), `custom` (your own script advances it).
- **A template** replaces the stage list for common shapes: `fetch`, `kill`, `bounty`, `deliver`, `rescue`, `escort`,
  `investigate` (`clues`), `persuade-or-fight`. Give the journal lines in order with `journal: [...]`.
- **Searches and clues:** `search` on a placeable (`target`) with `check: {skill, dc}`: the party member best at the skill
  (often a companion) rolls, each player gets 2 tries, and a required clue is found anyway once tries run out. Add `item` /
  `itemName` to hand over what is found, and `examine: {skill, dc, var, pass}` for a second check by whoever knows most
  (Lore on a letter's seal); the message names that companion.
- **Optional clues:** `search` with `optional: true` and a `reward` (e.g. `{"xp": 75}`): no journal entry, doesn't move the
  quest on, available once the quest reaches `from`.
- **NPCs that come to you or tag along:** `approach` on stage 1 makes the giver walk up and start talking; `join: true` makes it
  join the party on acceptance (build it with `henchman: true`); a later talk stage with `companion` + `dismiss` (its tag)
  needs it present and sends it off — a lost pet or a rescued child brought home.
- **Look but keep:** `deliver` with `keep: true` lets an NPC examine an item the party carries on to someone else.
- **Stage effects:** `script` runs a script on the NPC when the stage advances (opening a gate). A stage only your own script
  can detect (every enemy in a room dead) is `do: "custom"`: build_quest writes the journal entry and your script calls
  `AddJournalQuestEntry(tag, n, oPC)`.
- **Skill gates:** `check: {skill, dc, else: "fight"}` on a talk stage. The PC line rolls once (the best of the speaker and
  its companions), so retrying the conversation can't reroll. A check may be an `ability` (`str`..`cha`) or a `save`
  (`fort`/`reflex`/`will`) instead of a `skill`, and `difficulty` (`easy` 10, `moderate` 15, `hard` 20, `veryhard` 25) instead
  of `dc`.
- **Something appears:** `spawn: {resref, area | at, count, tag, hostile}` on a stage creates the creature(s) when that stage
  advances: when its dialog line is picked (talk/return/deliver/rescue; stage 1 = the quest is accepted) or when it is
  completed (kill/pickup/explore/trigger/use/search). A bounty target in an explored area, an ambush.
- **Multi-part encounter (chain):** a `kill` stage on the lookout or scout with a `spawn` of the main force at a waypoint, then a
  `kill` stage on the main force: killing the lookout is what brings them. Put the two groups far apart in the area, the
  second at the waypoint; the second blueprint needs no placed copy. Name an `area` (and optionally `x`,`y`) and build_quest places the waypoint on walkable ground; or give an
  existing waypoint as `at`. It happens once. A `kill` stage targeting that resref (or `tag`) needs no placed copy. For a
  `bounty` template, `spawn` at the top of the spec is the shortcut for stage 1.
- **Branches:** two stages with the same `n` are alternative ways to reach that stage (persuade *or* kill); `from` forks;
  `end: "fail"` marks a failure ending.
- **Write the lines.** Defaults exist for every dialog line, but they are generic: give `offer`, `accept`, `text`,
  `reminder`, `plea`, … in the character's voice from `## Actors`. Journal lines are the PC's own words, one or two
  sentences, telling the player what to do next.
- **Kill targets:** use a dedicated creature, not a common blueprint (every copy of the target advances the quest). Build
  it with `create_creature_blueprint` (+ `forge_creature` for a class-based foe) or pick a palette monster, and give the
  stage an `area`; `build_quest` places it if it isn't placed.
- **Quest items:** `itemName` creates a plot item; give `from_creature` (it drops on death) or `in` (a placeable's
  inventory) so someone carries it.
- **Companions** stay out of quest dialogs unless the plot makes them quest-givers: their conversation's root order
  matters for recruiting (`/adventure-actors`).

**2. Dry run:** `build_quest(spec: <JSON>, dryRun: true)`. Read the returned `stages` (what advances each), `dialogs` (each
NPC's root lines, in the order the engine tests them), `placed` and `warnings`. Fix the spec until there are no warnings.

**3. Build:** `build_quest(spec: <JSON>)`. Keep the returned `adventureMd` block for Phase 4. Rebuilding with a changed spec
replaces only what this quest made; `remove_quest(tag)` removes it and gives back what it replaced (see docs/quest-system.md "Remove").

---

### Phase 3: Verify

1. `verify_quest_completability` and `verify_journal` must report no gaps for these quests.
2. `flatten_dialog` on each NPC dialog the report lists: the quest lines must read naturally in that character's voice.
3. `validate_module` for broken references.

Fix the spec and rebuild rather than editing the generated nodes or variables by hand (a rebuild would overwrite them).

---

### Phase 4: Update adventure.md

Append a `## Quests` section with each quest's `adventureMd` block from `build_quest`, plus one line per quest on how it
fits the plot. Each block includes the quest's spec, so later phases rebuild the quest instead of patching it:

- `/adventure-challenges` must leave quest kill targets and captives in place (it may add guards around them).
- `/adventure-rewards` changes a quest's rewards by rebuilding it with an explicit `reward`.

---

### Phase 5: Repack

Edits are saved to the module project as they happen; do not build the `.mod` (`repack_module`) unless the user asks.

---

## How quest state works

A player's progress in a quest is the engine's own journal number for that tag (`NW_JOURNAL_ENTRY<tag>`), which every
journal advance sets. Advances are **whole-party**: any member advancing moves every member's journal and pays every
player the full reward, so a second member can't advance it again or be paid twice. A kill or pickup by a companion or
summon credits its master. Nothing is stored on `GetModule()` or on NPCs.

## Important Notes

- **No hand-written quest scripts.** Everything goes through `build_quest`; checks and effects that aren't covered are
  parameters on `q_chk`/`q_act` (see `docs/quest-system.md`), not new scripts.
- **Dry run first, every time,** and read the dialog outline: it's the only place the generated conversation order shows.
- **Quest tags** are derived from the name (`q_…`, at most 27 characters); give `tag` only to match an existing reference.
- **No combat placement** beyond quest kill targets: hostile groups are `/adventure-challenges`' job.
- **Do NOT auto-export HTML reports.**
- **Repack after all changes.**

## Finish

Call `phase_check(phase: "quests", step: "end")` last. It checks this phase's section was appended, runs the verifiers that belong to the phase and writes the entry to `adventure-status.json` (`partial` with the error list if anything is left). Fix its errors and call it again; never report success past errors.

## Run the quest without a player

After `build_quest`, walk the quest on the real engine with a stand-in player: `run_live_verification` with `simulate` (see `docs/player-simulation.md`). One step per dialog line you built: `q_chk` conditions with `expect`, `q_act` actions with `expectStage` (and `expectGold` / `expectItem`). Use the `params` the build plan listed (`[target=1]`, `[quest=<tag> stage=2 op=at]`). Set `expectedCheckLines` to the step count plus the quest log lines plus one so `[SIM_DONE]` is reached. Fix every `[SIM_FAIL]` before the phase ends.

Quest answers return to a hub, not to the end of the talk: `build_quest` adds "About: <quest>" options (offer while available, reminder while running) and `[Leave]` after every answer. Do not add your own `[Leave]` replies to quest lines.
