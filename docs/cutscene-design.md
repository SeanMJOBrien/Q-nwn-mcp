# Cutscenes that advance per dialog choice (TODO #25) — design

Status: design only, 2026-11-14. Nothing here is built. Items marked **(check)** are engine behaviour not yet seen
in this repo and need one engine test before the builder relies on them.

## Goal

A cutscene is told one beat at a time: the player clicks to continue, the next beat plays (camera, speaker,
animation, movement), and every line lands in the player's dialog history. The player sets the pace. No timed
sequence that runs without them.

## Core decision: a cutscene is a dialog

Compile each beat into a dialog entry/reply pair. Do not use `SetCutsceneMode` or a timed `DelayCommand` chain.

- The conversation already freezes the PC's control, shows the camera on the speaker and keeps a history.
  `SetCutsceneMode` adds nothing we need and can leave a PC stuck if the dialog is aborted **(check)**.
- One beat = NPC entry (the line, native fields, an action script) + one PC reply `[Continue]` pointing at the next
  entry. The last reply returns to the hub or ends (below).
- Fits the standing dialog rule (`docs/quest-system.md`, hub rule): the chain is a deliberate linear segment; its
  last reply goes back to the main dialog, or ends with `end: true` when a fight or scene change takes over.

## What a beat can do

| Beat field | Mechanism | Status |
|---|---|---|
| `speaker` (tag) | DLG node `Speaker` — any creature in the area can speak, not only the owner | field exists in our dialogs; other-speaker playback **(check)** |
| `text` | node text (history line) | built |
| `animation`, `loop` | native `Animation` / `AnimLoop` on the node | fields already written by `create_dialog` |
| `camera` (angle, height offset) | native node camera fields (`CameraAngle`, `CamHeightOffset`, `TarHeightOffset`, `CameraID`) | **(check)** names and values against a toolset-made dlg; none of our dialogs use them |
| `fade` (out/in, length) | native node fade fields (`FadeType`, `FadeColor`, `FadeDelay`, `FadeLength`) | **(check)** same |
| `sound` | native `Sound` | built |
| `actions[]` | one shared script `cs_act` with `ActionParams` (same pattern as `q_act`): `move`, `face`, `anim`, `spawn`, `destroy`, `vfx`, `setvar`, `door` | new; ordinary NWScript, compiles with the real compiler |
| `quest` | native `Quest` field, already used by `add_dialog_node` | built |

`cs_act` actions queue on the *target* creature (`AssignCommand(oTarget, ActionJumpToLocation(...))`), so a move plays
while the player reads the line and finishes before the next click in the usual case.

## Spec shape (proposal)

```
CutsceneSpec {
  id: string                 // tag-safe; names the dialog and variables
  dialog: string             // resref of the dialog it is compiled into (new, or added to an existing hub)
  owner: string              // NPC tag that starts it
  start: { kind: "hub_line", text } | { kind: "area_enter", area } | { kind: "quest_stage", quest, stage }
  once: boolean              // default true: a module-level flag stops a replay
  beats: [{
    speaker?: tag, text, continueText?: "[Continue]",
    animation?, camera?: {angle, heightOffset}, fade?: {type, length, color}, sound?,
    actions?: [{ do, target, ... }],
    quest?: { tag, stage }
  }]
  skippable?: boolean        // adds [Skip] on each reply -> a node that runs cs_skip (end state of all beats)
  after: "hub" | "end"       // where the last reply goes
}
```

Schema committed to JSON like the other specs (`docs/specs/`, `npm run specs:schema` equivalent), so the local-model
driver and the web forms can use it.

## Starting it

- **hub_line:** a normal NPC line in the owner's dialog; its answer is the first beat. Needs nothing new.
- **area_enter / quest_stage:** an NPC runs `ActionStartConversation(oPC, dialog)` from an area OnEnter or from
  `q_act` after a stage advance. Works for one PC at a time **(check)**.

## Co-op

Every module is party-playable (`CLAUDE.md`, Co-op rules). Decisions:

- Each PC who starts the dialog sees the beats; the others are not in that conversation. The cutscene is therefore
  **told to the PC who triggered it**, and `once` is kept **per PC** (a local int on the PC), so each player can see it.
- `actions` change the world, so they must be idempotent: `move` goes to a fixed location, `spawn`/`destroy` check
  for the object first, `setvar` sets rather than increments. A second PC replaying a beat then changes nothing.
- Quest advances inside a beat use the existing whole-party `q_act` advance, so one player's cutscene moves everyone.

## Skipping and aborting

If the PC aborts the dialog (ESC), later beats never run, and the world could be left half-changed. So `actions` are
written as **end-state assignments** (go to this place, destroy this object), and the dialog's abort script
(`EndConversation` field) calls `cs_skip`, which applies the end state of every beat. `[Skip]` replies call the same
script. **(check)** that the abort script field fires on ESC in our generated dialogs.

## Fit with the Story Graph and the pipeline

- A story-graph beat may carry `cutscene: <id>`; `adventure-quests` and `adventure-actors` can then add a
  `CutsceneSpec` the way they add a quest. `verify_story` would check that the id exists.
- `build_quest` stays unchanged. A quest stage that wants a cutscene names it (`cutscene: id` in a stage's `act`),
  and the builder emits the `ActionStartConversation` call.
- Rebuild/remove follow `build_quest`: the builder owns only what it made (`cs_<id>_*` nodes and variables);
  `remove_cutscene(id)` undoes it.

## Verification (what a headless run can and cannot do)

The headless server has no PC, so no conversation can run there (same limit as quests, `docs/player-simulation.md`).
So:

- **Static (`verify_cutscene`, in `verify_all`):** the chain is linear and every reply leads on; the last reply
  follows `after`; each `speaker`/`target` tag exists in the module (and in the cutscene's area); animations are
  valid ids; camera/fade values are in range; `cs_act`/`cs_skip` and each `actions` target compile and exist;
  `once` variable names are unique; a `skippable` cutscene's end-state is complete (every `spawn` has a matching
  skip path).
- **Engine, headless:** run `cs_act` for each beat with a stand-in as `OBJECT_SELF` via the simulation harness
  (`inc_sim`) and check the logged end state (positions, destroyed/spawned tags). This proves the actions, not the
  camera or pacing.
- **By a person:** camera angle, fade look and pacing need one look in the game. The doc and the skill say so.

## Work packages

| Id | Package | Done when |
|---|---|---|
| X0 | Engine check: read the camera/fade field names from a toolset-made dlg (any module with a cutscene dialog); one headless test that another creature can be `Speaker` and that `ActionStartConversation` from OnEnter runs | the **(check)** rows above are settled or struck from the spec |
| X1 | `CutsceneSpec` type, JSON schema, `docs/specs/cutscene.schema.json`, tests | schema and example validate |
| X2 | `build_cutscene(spec, dryRun)` + `cs_act`/`cs_skip` runtime generator + stale-script entry | dry run lists nodes; compiles with the real compiler |
| X3 | `verify_cutscene` in `verify_all`; `remove_cutscene` | checks above, tested on synthetic data |
| X4 | Skill text (`adventure-actors`, `adventure-quests`), phase prompts, `docs/adventure-tooling-reference.md` | `skill-lint` and `phase-prompts` tests pass |
| X5 | One verified example: a 5-beat cutscene in the systest module; `cs_act` end state read back from the engine log | the example's end state matches the spec |

## Decisions for the user

1. Is "told to the triggering PC, once per PC" right for co-op, or should the whole party share one cutscene?
2. Is a click-to-continue dialog enough, or do you also want an optional timed beat (auto-advance after N seconds)?
   Recommendation: no timed beats in v1; the player sets the pace.
3. Should `skippable` be on by default? Recommendation: yes, with end-state actions.
