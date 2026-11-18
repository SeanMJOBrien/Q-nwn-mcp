# Building a module with a local model: manual

How to build a Neverwinter Nights module with a model running on your own machine (Ollama, llama.cpp, LM Studio or
any OpenAI-compatible endpoint). Written 2026-11-13. The design reasons and measurements behind it are in
[local-model-guide.md](local-model-guide.md).

**Status: no real model has run this yet.** Everything here was tested with a scripted stand-in for the model. Treat
the first runs as a trial and keep the logs (section 8).

## 1. What you need

- This repository, built: `npm install && npm run build`.
- The three paths the MCP server uses, as environment variables:

  ```
  export NIM_FOLDER_NWTOOLS=/home/qlippoth/git/nwn-tools/linux/neverwinter
  export NWN_FOLDER_DATA=/home/qlippoth/nwn-data
  export NWN_FOLDER_USER=/home/qlippoth/nwn-data/user
  ```

- A model endpoint that supports tool calls. For Ollama:

  ```
  OLLAMA_CONTEXT_LENGTH=65536 ollama serve
  ```

  The endpoint is then `http://localhost:11434/v1`. Choose a model with tool-call support (for example a Qwen 2.5 or
  Qwen 3 instruct or coder model).

## 2. Quick start

Start with one phase on a module that already exists. It is the cheapest way to see how your model behaves.

```
# 1. Show the plan. Calls no model and changes nothing.
node dist/cli/drive.js --module adventures/The-Salt-Gate-Conspiracy --dry-run

# 2. Run one phase.
node dist/cli/drive.js --module adventures/The-Salt-Gate-Conspiracy \
  --endpoint http://localhost:11434/v1 --model qwen2.5:14b --phases polish --force

# 3. Run everything that is not done yet.
node dist/cli/drive.js --module adventures/The-Salt-Gate-Conspiracy \
  --endpoint http://localhost:11434/v1 --model qwen2.5:14b
```

A new module from an idea:

```
node dist/cli/drive.js --create "The Old Mill" \
  --idea "Bandits hold a mill and the miller's daughter" --level 3 --party 4 --minutes 90 \
  --endpoint http://localhost:11434/v1 --model qwen2.5:14b
```

A new module from a plot you wrote yourself (section 5a); no model writes the story:

```
node dist/cli/drive.js --plot my-plot.json \
  --endpoint http://localhost:11434/v1 --model qwen2.5:14b
```

Work on a copy the first time. The driver changes the module project as it goes, and `--force` on a finished phase
adds to what is already there.

## 3. What the driver does

For each phase, in order:

1. It checks that the story sections the phase needs exist. If not, the run stops and says which are missing.
2. **Step mode** (the default for areas, environment, actors, quests, challenges and affordances): it asks
   `get_progress` for the phase's open steps and gives each step its own short, new conversation. That conversation
   gets a step card and only the few tools the step needs (usually 5 to 10). The card holds:
   - your goal and the decisions so far;
   - the one step and the call that does it;
   - the facts the step needs, read from the module: the plot's paragraph for that place or person, and the area
     cards;
   - the phase's rules.
   The progress is kept in the module, so starting a new conversation loses nothing, and the model cannot drift away
   from a step it has just been handed. A step still open after two tries is left open and the run moves on.
   **Phase mode** (plot, polish, rewards, or `--mode phase`): one conversation per phase, with the short instruction
   sheet and all the phase's tools.
3. It checks every tool call before running it and refuses a bad one with the name of the wrong field.
4. It lets the phase check decide when the phase is done. In step mode, a failed check gets one repair pass in phase
   mode with the errors. In phase mode, if the model stops early, the driver runs the check and hands the first five
   errors back.
5. It gives up on a phase after 3 failed checks or 60 model turns, and stops the run, because later phases depend on
   earlier ones.

Every tool result ends with a progress line, for example
`[progress 14/71 · areas · next: The Mill Road: terrain laid out → build_area(...)]`. A result longer than 6,000
characters comes back as an outline with a `resultId`; the model fetches the part it needs with `get_result`.

It never builds the `.mod`. When the run is finished, build it yourself (section 9).

## 4. Options

| Option | Meaning |
|---|---|
| `--module <path>` | Module project directory or `.mod` to work on |
| `--create <title>` | Make a new empty module with this title instead |
| `--endpoint <url>` | Base URL ending in `/v1` (or set `DRIVE_ENDPOINT`) |
| `--model <name>` | Model name (or set `DRIVE_MODEL`) |
| `--api-key <key>` | Only if the endpoint wants one (or `OPENAI_API_KEY`) |
| `--phases a,b` | Run only these phases; they still run in pipeline order |
| `--force` | Run a phase again although it is recorded as a success |
| `--idea`, `--level`, `--party`, `--minutes`, `--tone` | Used to write the story's Module section when it has none |
| `--plot <file.json>` | A plot file (section 5a). The driver writes the Module and Plot sections from it and skips the plot phase. Without `--module` or `--create` it creates a module with the plot's title |
| `--max-steps <n>` | Model turns per phase (default 60) |
| `--retries <n>` | Failed phase checks allowed per phase (default 3) |
| `--context-chars <n>` | Conversation size in characters before old results are dropped (default 48000) |
| `--mode step\|phase` | `step` (default): one conversation per checklist step where a phase has steps. `phase`: one conversation per phase |
| `--step-turns <n>` | Model turns per step in step mode (default 12) |
| `--escalate-model <name>` | A stronger model that gets one attempt at a phase the first model failed. With `--escalate-endpoint` and `--escalate-api-key` it can be on another server |
| `--log <dir>` | Where transcripts go (default: `<adventure dir>/driver-log`) |
| `--dry-run` | Show the plan only |

Exit code: 0 = every phase done or skipped, 2 = a phase failed or was blocked, 1 = wrong usage or no connection.

## 5. The phases

| # | Phase | Tools offered | What the model does |
|---|---|---|---|
| 1 | plot | 10 | Writes the story outline: locations, NPCs with motives, quest stages |
| 2 | areas | 42 | Builds one area per location and connects them |
| 3 | environment | 42 | Places objects, sounds and map notes |
| 4 | actors | 23 | Creates key NPCs with conversations, companions, animals |
| 5 | quests | 16 | Writes one short spec per quest; the tool builds journal, dialog and scripts |
| 6 | challenges | 24 | Places enemies, the boss and traps |
| 7 | affordances | 30 | Sets up the shop and puts loot in containers |
| 8 | polish | 35 | Runs the checkers and repairs what they report |
| 9 | rewards | 38 | Sets quest rewards, the final item, the module description and the DM guide |

The plot phase is the one most likely to need a stronger model or a person: it is the only fully creative one.
Write the plot as a file and pass it with `--plot` (next section).

The areas phase is the hardest technically. In step mode each area is one `build_area` call (size, layout, terrain,
doors and music together) and each connection is one `adventure_create_transition` call at points the area card lists.

## 5a. Writing the plot yourself

Copy `docs/specs/plot.example.json` and change it. The file holds:

| Field | Content |
|---|---|
| `title`, `premise`, `level`, `playMinutes`, `partySize`, `tone` | The basics. `premise` is two or three sentences |
| `locations` | The places in story order; the first is where players start. Each has `name`, `tileset` (for example `ttf01` forest, `ttr01` rural, `tcn01` city, `tin01` house or inn, `tde01` dungeon, `tdm01` cave), `purpose` (hub, travel, adventure or boss), `events` (combat, ambush, boss, chain, social, obstacle, trap, discovery, friendly, rest) and `beat` (one sentence). `resref` is optional |
| `connections` | Pairs of location names the party can walk between |
| `npcs` | `name`, `location`, `role` (quest giver, merchant, companion or witness), `race`, `class`, `gender`, `motive`, `voice` |
| `antagonists` | `name`, `who`, `location`, `motive`, `defeat` |
| `quests` | `name`, `giver` (an NPC name), `stages` (two or more sentences, in order); `primary: true` on the main quest |
| `challenges` | Optional: `location`, `enemies`, `obstacle` |
| `merchant`, `finalReward` | The NPC who trades (optional) and the reward at the end |

Check the file without running anything:

```
node dist/cli/spec.js validate plot my-plot.json
node dist/cli/drive.js --plot my-plot.json --dry-run
```

An error names the field, for example `quests[0].giver: "Nobody" is not one of the npcs`. The dry run also prints
notes, such as a location count that does not fit the play time; notes do not stop the run.

A larger model can write the file for you: give it your idea and the schema (`node dist/cli/spec.js schema plot`).
Inside an MCP session the same file goes to the `write_plot` tool.

## 6. Context size

Estimated peak per request, including the tool definitions, at the default settings:

| Phases | At start | Peak |
|---|---|---|
| plot, quests | 3,000-4,000 tokens | 16,000-18,000 |
| polish, challenges, affordances, actors, rewards | 7,000-10,000 | 20,000-25,000 |
| areas, environment | 11,000-13,000 | 24,000-28,000 |

Add 2,000-4,000 tokens for the model's reply. **Use 65536.** With 32768, add `--context-chars 30000`. The numbers are
estimates from character counts, not counted with your model's tokenizer.

Ollama does not report an overflow: it drops the oldest text, which is the instructions. A model that suddenly ignores
the steps late in a phase has probably run out of context.

Step mode needs much less. A step card is 1,000-3,000 characters and a step offers 5-10 tools, so a step usually
stays under 8,000 tokens. With step mode, 32768 is enough.

### In your own chat client (no driver)

When the MCP server runs with a tool profile (`MCP_TOOL_PROFILE`), it adds the same aids to every tool result:
- the progress line at the end;
- long results kept on the server behind a `resultId` (the model reads a part with `get_result`).

Switch them on or off yourself with `MCP_PROGRESS_FOOTER=1|0` and `MCP_RESULT_LIMIT=<characters>` (`0` = no limit).
Some tools help most in a long chat:
- `get_area_card(area)` gives an area's facts in a few lines.
- `get_progress` repeats your goal and decisions.
- `get_progress(note: "...")` records a decision so it survives a new chat.

## 7. When a phase fails

The summary printed at the end names the phase, the reason and the errors. Then:

1. Read the transcript (section 8) to see where it went wrong.
2. Choose one:
   - Run the same command again. Finished phases are skipped and the failed one starts fresh.
   - Add `--escalate-model <stronger model>` so a better model takes that phase.
   - Repair it yourself, or in a Claude Code session on the same module, then run the driver again.
3. If a phase half-built something you do not want, restore your copy before running it again.

Common causes:

| What you see | Likely cause |
|---|---|
| `refused before the call` many times for the same tool | The model keeps sending a wrong parameter. The refusal names it; a larger model usually reads that correctly |
| `stopped after 60 model turns` | The model loops. Look for the repeated call in the transcript |
| `the phase check failed 4 times` | The work is done but wrong; the errors in the summary say what |
| `blocked` with a missing section | An earlier phase did not write its story section |
| `model endpoint answered 400` or `404` | Wrong model name, or the model has no tool-call support |

## 8. Logs

`<adventure dir>/driver-log/<time>-<phase>.jsonl`, one JSON object per line:

- `"event": "model"`: what the model said and which tools it called.
- `"event": "tool"`: the call, its arguments and the start of the result.
- `"event": "refused"`: a call the driver stopped, with the reason.
- `"event": "phase_check_end"`: the driver's own end check and its errors.

These files are what to send when asking for help with a failed run.

## 9. After the run

The driver leaves the module as a project (`adventures/<Title>/`), not as a playable file. To play it, build the
`.mod` with the `repack_module` tool in an MCP session on that project. Before that, it is worth a look at the result
of `verify_all`.

## 10. Other ways to use the same parts

**Any MCP client with a small model.** Start the server with fewer tools:

```
"env": { "MCP_TOOL_PROFILE": "quests,verify" }
```

Profiles: `read`, `plot`, `quests`, `actors`, `areas`, `dress`, `encounters`, `loot`, `rewards`, `fix`, `verify` (each phase prompt names its own; every phase stays under 40 tools). With a profile set, the
big results (`visualize_area`, `verify_all`, `get_module_summary`) come back in a short form; pass `brief: false` for
the full one. In such a session, `get_phase_prompt(phase: "quests")` returns the instruction sheet for a phase.

**Tracking progress: `get_progress`** (always on). It ticks every step of the build (each area created and laid out,
each connection, map pins, each NPC, each quest, enemies, store, verify, DM guide) from the module's real state, saves
the checklist as `adventures/<Title>/<Title>-progress.md`, and returns the one next step with its exact call. Tell the
model to call it at the start and after every step; a new session picks up where the last one stopped. `note: "..."`
keeps decisions in the file's Notes. The driver uses it as its plan: each phase starts with its open steps
listed, a phase whose check passes with steps still open is told once to finish them, and progress is printed between
phases and in the run summary. The blank form for a client without it: [build-checklist.md](build-checklist.md).

**Keeping the server current.** On each machine that runs it, `./UpdateMCP.sh` (`UpdateMCP.cmd` on Windows) pulls,
installs and builds; then reconnect the MCP server in the client. An old build is the usual cause of a client error
such as `params/layout must be string` for a parameter this server now accepts as an object.

**What the server does for any client (2026-11-17).**

- At connect it sends short instructions (`src/util/no-module-guide.ts`): the first call is `create_module` (new module) or
  `load_module` (existing); `create_module` is in every profile. With nothing loaded, `get_module_summary` answers
  `loaded: false` with the next step and the modules it can load, and every other tool's refusal says the same and "do not
  call this tool again until a module is loaded".
- Arguments are lenient (`src/util/lenient-args.ts`): a parameter documented as a string ("12", a JSON list) also takes a
  number, a boolean, a real array or object; booleans also take "true"/"false". An argument the tool does not have is refused
  with the list of its parameters instead of being dropped silently (a model that invented `stats` for `forge_creature` is
  told so).
- Messages a client prints itself, not this server (fix them in the client or the model's tool-call template):
  `[tool_call bridge refused] Deferred tool ... has no verified schema review` (the client hides tool schemas until the
  model searches for them; a smaller `MCP_TOOL_PROFILE` keeps the list short enough not to be deferred), and
  `params must have required property 'arguments'` (the model put the arguments next to the tool name instead of inside
  `arguments`: a tool-call format problem of the model or its chat template).
- Prefer the one-call spec tools for a small model: `write_plot`, `build_quest`, `build_creature` (a whole character in
  words), `build_companion`; and the driver above, which gives each phase a fresh conversation and only its tools.

**Checking a spec by hand or from a script.** No module or model needed:

```
node dist/cli/spec.js kinds
node dist/cli/spec.js schema key-npc
node dist/cli/spec.js validate key-npc npc.json
```

Kinds: `companion`, `key-npc`, `dialog`, `journal`, `area-layout`, `plot`, `creature`. The answer is either the wrong fields by name or
the tool calls that build the thing.

**Quests with no model at all.** `node dist/cli/quest.js` and the forms in Q-nwn-manager and the TFN Content Studio
(`docs/quest-cli.md`).

## 11. What the short instruction sheets leave out

A module built by the driver is simpler than one built by `/create-adventure` in Claude Code. Left out: walk
waypoints for NPCs, quest branches and skill checks, starting gold and level adjustment, the starter store, custom
items, patrol paths, the win-state script, class-specific reward items. The full list per phase is in
`local-model-guide.md`, "Short phase prompts".

## 12. What is not done

| Item | State |
|---|---|
| A run with a real model | Not done. Nothing here is proven with one |
| Comparison of a local-model build with a Claude build (W7) | Not done; needs the runs above |
| Plot from a file, so a person writes phase 1 once (W6) | Built 2026-11-14: `--plot <file>` (section 5a). A web form for it is not built |
| Quest forms for the studio (W8) | Planned in `docs/quest-frontends-work-plan.md` |
| Constrained decoding (the endpoint's JSON-schema mode) | Not used; arguments are checked after the model writes them |
| Driver carries large results itself (the area layout) | Done another way: layouts go by `layoutId`, `build_area` does the whole area in one call, and long results are kept on the server (`get_result`) |
| Step mode with a real model | Built 2026-11-18 and tested with a scripted model only |
| Short results for the other checkers and `audit_module` | Not built |
| Specs for placed objects and encounters | Not built |
| Bosses other than a necromancer from `compose_encounter` | Built with `build_key_npc` instead |
