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

Work on a copy the first time. The driver changes the module project as it goes, and `--force` on a finished phase
adds to what is already there.

## 3. What the driver does

For each phase, in order:

1. It checks that the story sections the phase needs exist. If not, the run stops and says which are missing.
2. It starts a new conversation with a short instruction sheet for that phase and only that phase's tools.
3. It checks every tool call before running it and refuses a bad one with the name of the wrong field.
4. It lets the phase check decide when the phase is done. If the model stops early, it runs the check and hands the
   first five errors back.
5. It gives up on a phase after 3 failed checks or 60 model turns, and stops the run, because later phases depend on
   earlier ones.

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
| `--max-steps <n>` | Model turns per phase (default 60) |
| `--retries <n>` | Failed phase checks allowed per phase (default 3) |
| `--context-chars <n>` | Conversation size in characters before old results are dropped (default 48000) |
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

The plot phase is the one most likely to need a stronger model or a person: it is the only fully creative one. You
can write the Plot section yourself in the story file (`adventures/<Title>/<Title>.md`, format in
`docs/phase-prompts/plot.md`) and start the driver at `--phases areas,...`.

The areas phase is the hardest technically (most tools, longest results).

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

Profiles: `read`, `plot`, `quests`, `actors`, `areas`, `encounters`, `loot`, `fix`, `verify`. With a profile set, the
big results (`visualize_area`, `verify_all`, `get_module_summary`) come back in a short form; pass `brief: false` for
the full one. In such a session, `get_phase_prompt(phase: "quests")` returns the instruction sheet for a phase.

**Checking a spec by hand or from a script.** No module or model needed:

```
node dist/cli/spec.js kinds
node dist/cli/spec.js schema key-npc
node dist/cli/spec.js validate key-npc npc.json
```

Kinds: `companion`, `key-npc`, `dialog`, `journal`, `area-layout`. The answer is either the wrong fields by name or
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
| Plot from a form or file, so a person writes phase 1 once (W6) | Not built. Today: write the Plot section by hand in the story file |
| Quest forms for the studio (W8) | Planned in `docs/quest-frontends-work-plan.md` |
| Constrained decoding (the endpoint's JSON-schema mode) | Not used; arguments are checked after the model writes them |
| Driver carries large results itself (the area layout) | Not built; the model has to copy the layout into the next call |
| Short results for the other checkers and `audit_module` | Not built |
| Specs for placed objects and encounters | Not built |
| Bosses other than a necromancer from `compose_encounter` | Built with `build_key_npc` instead |
