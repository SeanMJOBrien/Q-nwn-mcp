# Running Q-nwn-mcp with a local model (Qwen and similar)

Status: a plan and an inventory, written 2026-11-13. **Nothing here has been run on a local model yet.** The parts
that say "scripted today" are tested; the parts about Qwen behaviour are expectations to check, marked *(untested)*.

## 1. Short answer

The server itself does not need Claude. It is a plain MCP server (about 200 tools, stdio) over deterministic code:
GFF reading and writing, tile solving, script generators, verifiers, an engine test run. Any MCP client with a model
that can call tools can drive it.

What is Claude-specific is the **driving layer**:

- 38 skills in `.claude/skills/` (about 420 KB of instructions; the largest are 29-36 KB each) that a Claude Code
  session loads and follows.
- Claude Code features the skills lean on: sub-agents per phase, `AskUserQuestion`, the "bypass permissions" mode,
  `CLAUDE.md` loaded into every session.
- A long-horizon, many-step job (the nine-phase `/create-adventure`) that needs a model to hold a plan, read big
  JSON payloads and recover from verifier errors.

A local model is realistic if the work is **split**: the program does everything it can do from data, and the model
is asked only narrow questions with a fixed answer shape (a JSON object that matches a schema). The rest of this
document says which parts are which.

## 2. What a local model has to cope with

| Problem | Why it matters for Qwen-class models | What to do |
|---|---|---|
| About 200 tools in one session | Tool selection degrades past a few dozen tools; the tool list alone is tens of thousands of tokens | Expose a **profile** per task (section 5, `MCP_TOOL_PROFILE`, built as W1) |
| Skills of 20-36 KB each | Needs a 32k+ context just to read one phase, and small models drop rules in the middle of long instructions | Drive each phase from a script that hands over only the steps and tools for that phase (W2) |
| Tool results are large JSON (`visualize_area`, `get_module_summary`) | Fills the context; spatial reasoning over coordinates is weak in small models | Cap and summarise results in the client; prefer tools that decide for you (`adventure_generate_layout`, `suggest_area_size`) |
| Numeric parameters are strings, lists are JSON strings | Already friendly to weak function-calling: no nested schemas to get wrong | Keep as is |
| Long autonomous runs (20-40 minutes, nine phases) | Context rot; one wrong early choice carries through | One fresh session per phase; state lives in files (`adventure.md`, `*-status.json`) which the skills already use |
| Sub-agents, `AskUserQuestion`, skill loading | Not available in a generic MCP client | The orchestrator script replaces them (W2) |
| Spoiler rule of `/create-adventure` (never tell the user the plot) | Easy for a script, easy to break for a model that narrates | The script prints only the progress line; the model never talks to the user in the autonomous path |

## 3. How to host it

The MCP server is unchanged: `node dist/index.js` over stdio. The client side is the choice:

1. **An MCP-capable chat or agent client with a local endpoint** (LM Studio, Open WebUI, Cline, Continue and
   similar, all serving Qwen through an OpenAI-compatible API from Ollama, llama.cpp or vLLM). Cheapest to try;
   you drive the work by hand, tool profile permitting. *(untested)*
2. **A small purpose-built driver** (recommended for unattended runs): a Node or Python script using the MCP SDK
   client (the repo already does this in-process in `src/cli/quest.ts`, `InMemoryTransport`) plus the local
   model's chat API. It runs one phase at a time, validates every model answer against a schema and retries.
   This is work package W2.
3. **Claude Code pointed at a local model through an Anthropic-compatible proxy.** Keeps the skills as they are,
   but inherits the 36 KB skills and the 200-tool list, which is the hard case for a small model. *(untested)*

Model notes *(untested; check before relying on them)*:

- Use a Qwen build with native tool calling (Qwen3 / Qwen3-Coder instruct builds serve it through Hermes-style
  tool templates in vLLM and llama.cpp). Check that the server's chat template actually enables tools.
- Context: 32k is the floor for one phase with a trimmed tool profile; 64k+ is comfortable.
- For answers with a fixed shape, use **constrained decoding** (vLLM guided JSON, llama.cpp grammar or JSON-schema
  mode) with the schemas the project already has (`docs/quest-spec.schema.json`) so the model cannot produce an
  invalid spec.
- Thinking mode: on for design steps (plot, quest layout), off for filling a known template (dialog lines).
- The code was verified against Claude's behaviour only; every skill rule was written for it.

## 4. What needs a language model and what does not

### 4.1 Scripted today, no model at all

| Area | How | Where |
|---|---|---|
| Build, rebuild and remove a quest from a short spec | `quest build`, `quest remove`, idempotent, removal restores what it replaced | `node dist/cli/quest.js`, `docs/quest-cli.md`, one-file bundle `npm run quest:bundle` |
| Check a quest can be completed | `quest verify <tag>` (completability and journal checks) | same CLI |
| Quest forms (no model, no terminal) | Quests page of the Q-nwn-manager console (plain fields, map picker, base-game pick lists, error marking, adopt a journal quest as a draft); studio port still open (S1-S3) | Q-nwn-manager repo, `docs/quest-frontends-work-plan.md` |
| Check a module for structural faults | `verify_*` family and `verify_all` (the shipping gate), `validate_module`, `audit_module`, `phase_check` | `src/util/verify/*`, `src/tools/verify-tools.ts` |
| Play a module on the real engine | `run_live_verification` with player simulation (talk, deliver, reward, bounty/pickup scripts) | `docs/player-simulation.md` |
| Module as a project of JSON and `.nss` files, build the `.mod` on request | `export_project`, `load_module` on a project, automatic sync, `repack_module` | `docs/module-projects.md` |
| Area layout from a style and size | `suggest_area_size`, `adventure_generate_layout`, `adventure_apply_layout`, tile solver, `place_tile_doors`, `adventure_create_transition`, `check_area_connectivity`, `fix_object_heights` | `src/util/layout-generator.ts`, `zone-solver.ts` |
| DM area and the two books | `create_dm_area` (fixed template) | `src/tools/dm-area-tools.ts` |
| Encounter numbers | `compose_encounter`, `suggest_encounter`, `get_balance_report`, `get_wealth_budget` | `docs/encounter-composer-spec.md` |
| Runtime script systems | `create_quest_system`, `create_reward_system`, `create_companion_system`, `create_creature_level_system`, `create_treasure_system`, `create_random_abilities_system`, `create_gear_randomizer`: compiled generators with staleness checks | `docs/` per system |
| Creatures from data | `forge_creature`, `build_key_npc`, `build_npc_stat_block`, `level_creature`, `equip_npc_by_role`, `randomize_npc_appearance`, `list_creature_samples` (180 categories from real data), `import_treasure_set` | `docs/creature-forge-manual.md`, `docs/creature-catalog.md` |
| Reading a module | `get_*`, `list_*`, `search_*`, `visualize_area`, `get_dialog_tree`, reports | module-explorer skill |
| Compile and script checks | `compile_script`, `write_script`, `generated_script_stale` | |

All of this works with any client, including a shell script. These are what a driver should call without asking
a model anything.

### 4.2 Scriptable once someone supplies a small structured input

The code does the work; the input is a short spec a human fills in a form, or a model fills in under a schema.

| Area | The input | Tool |
|---|---|---|
| Quest | `name`, `giver`, `level`, `stages: [{do, target, journal, ...}]` or a `template` | `build_quest` / CLI |
| Companion | race, class, package, name, a few lines | `build_companion` |
| Key NPC | role, level, class, name | `build_key_npc` |
| Dialog | a list of lines and links in a fixed shape | `create_dialog`, `add_dialog_node`, `add_dialog_return_links` |
| Journal | quest name and entries | `create_journal`, `add_journal_quest` |
| Skill checks, traps | skill, DC, effect | `add_skill_check`, `create_trap_blueprint` |
| An area's look | tileset, style, size, `preferredFeatures`, ambience values | `create_area`, layout tools, `area-*` skills (they carry calibrated numbers) |
| Hostile groups and loot | target encounter level, theme, area CR | `compose_encounter`, `place_encounter`, `create_treasure_system` |
| Rewards | party level, tier | `create_reward_system`, quest `reward` |

Today the shape of each input is documented in tool descriptions and skills. For a local model the useful step is a
**JSON schema per input** (the quest one exists: `docs/quest-spec.schema.json`), so the driver can force valid
answers.

### 4.3 Still needs a language model (or a human)

| Task | Why a program cannot do it | How hard for a Qwen-class model *(expectation)* |
|---|---|---|
| Invent the story: premise, antagonist, motives, twists, beats | Creative writing and coherence over many entities | Fair with a strong 30B+ model and a short fixed outline; weak models produce flat plots. Easiest to leave to a human prompt or a larger model |
| Names, descriptions, NPC voices | Language | Easy |
| Dialog and journal prose | Language, tone, consistency with the plot | Easy for single lines, medium for keeping a character consistent across a dialog |
| Deciding what quests exist and what each stage is (kill, deliver, search...) | Design judgement; the plot decides | Medium; becomes easy if the plot is already written and the answer is a quest spec under the schema |
| Choosing tilesets, area themes and feature groups to suit the plot | Matching words to tile data | Medium; the tool outputs (`get_tileset_details`, `adventure_list_features`) are lists the model chooses from |
| Placing props and creatures with meaning (a camp, a guard post) | Spatial reasoning with coordinates | Hard for small models; use prefab-like tools and `adventure_find_walkable` so the model picks from valid spots rather than computing positions |
| Reading verifier output and choosing a fix | Open-ended diagnosis | Medium; most findings carry a `fix` naming the tool, so a loop "run verify, apply the named fix, run again" is mostly mechanical |
| Debugging script logic that compiles but misbehaves (`nwn-logic-debug`) | Reasoning over code and engine behaviour | Hard; leave to a stronger model or a human |
| Filling `(not recorded)` story fields when adopting an existing module (`adopt_module`, `audit_module.fillIn`) | Needs the author's intent | A human's answers; the model can ask and write them down |
| Writing the DM guide and the player-facing description | Summarising the whole module in prose | Easy once the module record is complete; needs a long context or a summary of each phase |
| Judging fun, tone and balance of the whole | Taste | Human |
| Whole-pipeline orchestration over nine phases | Planning, recovering, long context | Hard for one local session; solved by the driver (W2), not the model |

### 4.4 The nine phases of `/create-adventure`

| # | Phase | Scripted part | Model part |
|---|---|---|---|
| 1 | plot | none; `plan_adventure_shape` only structures | all of it (story, areas list, NPCs, quests outline) |
| 2 | areas | sizing, layout, solver, transitions, connectivity, ambience defaults | picking tileset, style, features per area |
| 3 | environment | placement helpers, collision and walkability checks | choosing which props and sounds, where, in words that fit the area |
| 4 | actors | `build_key_npc`, blueprints, appearance randomising, dialog tools | names, roles, greeting and conversation text |
| 5 | quests | the whole build, wiring, journal, rewards, verification | the quest design as a spec, the journal and dialog wording |
| 6 | challenges | `compose_encounter`, `forge_creature`, placement, level scaling | which enemies fit the theme and where the fights go |
| 7 | affordances | stores, loot systems, gold budget | which merchants and what they sell |
| 8 | polish | `verify_all`, connectivity, completability, many auto-fixes | choosing fixes the checks do not name |
| 9 | rewards | XP sizing, reward items, DM area and books | descriptive text, the DM guide |

Phases 2, 5, 6 and 7 are largely mechanical once the plot exists. Phases 1, 3 and the prose in 4, 5 and 9 are
where a model is needed.

## 5. Tool profiles (proposal)

Give the client only the tools a task needs. Suggested profiles; counts are approximate.

| Profile | Tools | Use |
|---|---|---|
| `read` | `load_module`, `get_*`, `list_*`, `search_*`, `get_dialog_tree`, `visualize_area` | Explore a module |
| `quests` | `build_quest`, `remove_quest`, `verify_quest_completability`, `verify_journal`, `get_journal`, `get_dialog_tree`, `list_creatures`, `list_items` | Add or fix quests |
| `actors` | `build_key_npc`, `build_companion`, `create_dialog`, `add_dialog_node`, `add_dialog_return_links`, `place_creature`, `randomize_npc_appearance` | NPCs and conversations |
| `areas` | `suggest_area_size`, `create_area`, `adventure_generate_layout`, `adventure_apply_layout`, `adventure_create_transition`, `check_area_connectivity`, `place_*`, `probe_ground`, `fix_object_heights` | Build areas |
| `encounters` | `compose_encounter`, `suggest_encounter`, `forge_creature`, `place_encounter`, `create_treasure_system` | Fights and loot |
| `verify` | `verify_*`, `validate_module`, `audit_module`, `phase_check`, `run_live_verification` | Check and test |

**Built (W1, 2026-11-13).** `MCP_TOOL_PROFILE=quests,verify` (comma list of `read`, `plot`, `quests`, `actors`, `areas`,
`encounters`, `loot`, `fix`, `verify`; `all` or unset = every tool) registers only those tools plus a small always-on core
(`load_module`, `get_module_summary`, `get_phase_prompt`, `phase_check`, `read_story`, `write_story_section`,
`repack_module`, `undo_last_change`). An unknown name stops the server with the list of valid ones. The profiles are exact names and
`prefix*` globs in `src/tool-profiles.ts`; `src/register-all.ts` holds the registration list. Measured over stdio:
all tools 212, `quests,verify` 38. `src/tool-profiles.test.ts` fails if a profile entry names a tool that no longer
exists, if `quests,verify` reaches 40 tools, or if one profile outgrows 60 tools. A new tool is in no profile until
it is added there. Client config example: `"env": {"MCP_TOOL_PROFILE": "quests,verify"}`.

### Brief results (W5, built 2026-11-13)

`visualize_area`, `get_module_summary` and `verify_all` take `brief`. It defaults to on whenever a tool profile is
active (or `MCP_BRIEF_RESULTS=1`; `MCP_BRIEF_RESULTS=0` turns the default off); `brief: false` always gives the full
result. Code: `src/util/brief.ts`. Measured on The Salt Gate Conspiracy (characters / 4 as a token estimate):

| Tool | Full | Brief | What brief keeps |
|---|---|---|---|
| `visualize_area` (22x22 area) | ~73,000 tokens | ~1,260 | A text map (one character per tile, north up: `.` walkable, `:` partly, `#` blocked, `~` water, `F` feature), zones, features, objects by type as tag/x/y (40 per type, rest counted) |
| `verify_all` | ~7,250 | ~150 | Counts, errors and warnings by code, `fixFirst` (up to 8 errors, one per code before repeats, each with its `fix`), a `next` line |
| `get_module_summary` | ~1,330 | ~420 | Dialog names (30) and counts in place of per-dialog detail and the quest-variable list |

Brief drops per-tile terrain, corners and crossers, so tile painting by hand still needs `brief: false`. The other
`verify_*` tools and `audit_module` are not trimmed yet.

### Build specs (W4, built 2026-11-13)

One small JSON object per thing to build, with a JSON Schema generated from a TypeScript type
(`src/util/build-specs.ts`, `npm run specs:schema`, files in `docs/specs/`). The quest spec
(`docs/quest-spec.schema.json`, `build_quest`) stays as it is.

| Kind | Type | Builds with |
|---|---|---|
| `companion` | `CompanionSpec` | `build_companion` |
| `key-npc` | `KeyNpcSpec` | `build_key_npc` |
| `dialog` | `DialogSpec` | `create_dialog` |
| `journal` | `JournalSpec` | `create_journal`, `add_journal_quest`, one `add_journal_entry` per entry |
| `area-layout` | `AreaLayoutSpec` | `adventure_generate_layout` (its result then goes to `adventure_apply_layout`) |

Specs hold real numbers, lists and enumerations (race 0-6, class 0-10, faction names, layout styles); the code
converts them to the tools' string parameters. Use the schema for constrained decoding (JSON-schema or grammar mode
of the local server) so the model cannot produce a malformed spec.

`node dist/cli/spec.js` needs no module, game install or MCP client:

```
node dist/cli/spec.js kinds                      # the kinds and what each builds
node dist/cli/spec.js schema key-npc             # the JSON Schema
node dist/cli/spec.js validate key-npc npc.json  # or "-" for stdin
```

`validate` answers `{ ok: false, errors: [{ field, message }] }` (exit code 1), for example
`{ "field": "classId", "message": "must be one of [0,...,10]" }` or
`{ "field": "nodes[0].children[1].speaker", "message": "must be \"npc\" here ..." }`, so the retry prompt can be
just that field and message. When the spec is valid it answers `{ ok: true, result: { calls: [{ tool, args }] } }`:
the MCP tool calls to make, in order. Beyond the schema it checks that dialog lines alternate NPC/PC from an NPC
root, that journal ids ascend and only the last entry ends the quest, and that domains/school match the class.
It does not check the module (whether the area or the conversation exists); the tool reports that.

`src/util/build-specs.test.ts` fails when a spec field is not a parameter of its tool, or when a tool gains a
required parameter the spec does not supply. Not built: a spec for placed objects and encounters, and the driver
(W2) that would call `validate` and then the tools.

### Short phase prompts and story tools (W3, built 2026-11-13)

`docs/phase-prompts/<phase>.md`: one prompt per phase, 2.5-4 KB (the skills are 11-36 KB), with numbered steps,
one example call per tool, a few rules and the format of the section to write. Front matter names the tool profile,
the build specs and the story sections the phase reads and writes.

| Phase | Profile (tools listed) | Prompt | Skill |
|---|---|---|---|
| plot | `plot` (13) | 2.5 KB | 11 KB |
| areas | `areas` (45) | 3.6 KB | 33 KB |
| environment | `areas` (45) | 3.1 KB | 19 KB |
| actors | `actors` (26) | 3.6 KB | 29 KB |
| quests | `quests` (19) | 3.1 KB | 13 KB |
| challenges | `encounters` (27) | 4.0 KB | 36 KB |
| affordances | `loot` (33) | 3.7 KB | 29 KB |
| polish | `verify,fix` (38) | 2.7 KB | 22 KB |
| rewards | `loot,quests` (41) | 3.4 KB | 35 KB |

Four tools make a phase runnable from any MCP client (no file tools, no skill loading); the first three are in every
profile:

- `get_phase_prompt(phase)`: the prompt, with its profile, specs and sections.
- `read_story(sections?)`: the named `## Section` blocks of the story file.
- `write_story_section(section, text)`: adds or replaces one section, leaves the rest alone, and creates the story
  file when there is none. It refuses an unknown section name, empty text and a second `## ` heading, naming the field.
- `write_dm_guide(text)` (profile `loot`): the DM guide file that `create_dm_area` reads.

New profiles: `plot`, `loot`, `fix`. `src/util/phase-prompts.test.ts` fails when a prompt exceeds 4,096 bytes, calls a
tool or parameter that does not exist, calls a tool outside its declared profile, or lacks the start and end
`phase_check` and its `write_story_section`. Every base-game resref named in the prompts was checked against the
game's resource list (2026-11-13).

What the short prompts leave out, compared with the skills (a module built from them is simpler):

- areas: the hand-designed layout fallback, the starter-store area and the portal dialog texts (the `_start` clean-up is
  one call, `set_module_start`).
- environment: sounds attached to objects, useable objects with flavour text, entrance waypoints.
- actors: walk waypoints, non-standard looks, per-companion spell and gear choices.
- quests: templates, skill checks, branches, spawns, searches (the full spec still accepts them).
- challenges: patrol paths, visual variety, chain encounters; `compose_encounter` knows one boss role (necromancer),
  other bosses are built with `build_key_npc`.
- affordances: starting gold and level adjustment (a module script), the starter store, custom items, the
  random-treasure system.
- polish: the manual plot-versus-module audit; it works from `verify_all` findings only.
- rewards: the XP budget calculation (a fixed table by level instead), class-specific reward items, the win-state script.

Not tested: no small model has run these prompts yet. That is package W7.

### The driver (W2, built 2026-11-13)

`node dist/cli/drive.js` builds a module phase by phase with a model on an OpenAI-compatible endpoint (Ollama,
llama.cpp, LM Studio, vLLM). It needs no Claude Code, no skills and no MCP client: it starts the MCP server itself.

```
export NIM_FOLDER_NWTOOLS=... NWN_FOLDER_DATA=... NWN_FOLDER_USER=...     # as for the MCP server
node dist/cli/drive.js --module adventures/My-Module --endpoint http://localhost:11434/v1 --model qwen2.5:14b
node dist/cli/drive.js --module adventures/My-Module --dry-run            # the plan; no model, no changes
node dist/cli/drive.js --create "The Old Mill" --idea "Bandits hold a mill" --level 3 --party 4 --minutes 90 \
     --endpoint http://localhost:11434/v1 --model qwen2.5:14b
```

For each phase, in order:

1. `phase_check` start. A skipped phase is skipped; a missing section stops the run with the message.
2. A fresh conversation: a six-line system prompt plus the short phase prompt. The model sees only the tools of the
   phase's profile (13 to 45), with descriptions cut to 300 characters and parameter descriptions to 140. `load_module`,
   `repack_module` and `get_phase_prompt` are never shown.
3. Every tool call is checked before it runs: the tool must be in the phase; the arguments must be JSON; numbers,
   lists and "true" are converted to what the tool takes; an unknown or missing parameter is refused by name; for
   `build_key_npc`, `build_companion`, `create_dialog` and `adventure_generate_layout` the build spec is validated and
   the failing field is named. A refused call costs no tool run.
4. Tool results are cut to 6,000 characters; past 48,000 characters of conversation the oldest results are dropped.
5. `phase_check` end decides. If the model stops without it, the driver runs it and hands back the first five
   errors. After 3 failed checks (`--retries`) or 60 model turns (`--max-steps`) the phase is given up.
6. A failed phase goes once to `--escalate-model` when one is given; otherwise the run stops there, because later
   phases need it.

A phase recorded as a success in the status file is skipped, so a stopped run is resumed by running the same
command again (`--force` runs a phase again). `--phases quests,polish` limits the run. Transcripts go to
`<adventure dir>/driver-log/<time>-<phase>.jsonl`, one line per model turn, tool call and refusal. Progress is
printed on stderr and a JSON summary on stdout; exit code 0 = all done or skipped, 2 = a phase failed or was
blocked, 1 = usage or connection error. The `.mod` is never built by the driver.

Code: `src/cli/drive.ts`, `src/driver/run-phase.ts` (the loop; model and tool host are injected), `src/driver/llm.ts`
(endpoint client; also recovers a tool call a model wrote into its text), `src/driver/coerce.ts`.

Tested: the loop with a scripted model (success, refusals, early stop, giving up, step limit, skipped and blocked
phases), and once end to end with a scripted HTTP endpoint, the real MCP server and a copy of The Salt Gate
Conspiracy (polish phase: seven turns, two refusals before the call, success, resume skips it). The first request
of that phase was 24,400 characters (about 6,000 tokens), most of it the 35 tool definitions.

**Not tested: a real model.** How far a Qwen-class model gets through each phase is unknown until W7. Expect the
areas phase (45 tools, the longest tool results) to be the hardest. Known limits: one tool call's result at a time is
all the model sees of the module; the model must copy a whole layout result into `adventure_apply_layout`, which a
small context may not hold (if that fails in practice, the driver should carry the layout itself); there is no
constrained decoding yet (the endpoint's JSON-schema mode is not used; arguments are checked after the fact).

## 6. Work packages

| # | Package | Size | Acceptance |
|---|---|---|---|
| W1 | **DONE 2026-11-13.** `MCP_TOOL_PROFILE`: register only the named groups; document the profiles | small | Server lists fewer than 40 tools with `quests,verify`; default unchanged; tests |
| W2 | **BUILT 2026-11-13, not yet run with a real model (see below).** Driver: a script that runs one phase at a time with a trimmed profile, a short phase prompt, schema-checked answers, retries and `phase_check` between phases | large | One module built end to end with a local model plus a human-written plot |
| W3 | **DONE 2026-11-13 (see below).** Short phase prompts: for each skill, a 2-4 KB version with the steps and the tool order, generated from or checked against the full skill (`skill-lint` already checks the full ones) | medium | Each phase prompt under 4 KB; lint passes |
| W4 | **DONE 2026-11-13 (see below).** Input schemas for companion, key NPC, dialog, journal, area style | medium | Each has a JSON schema generated from the TypeScript type like `quest:schema`; the driver validates against them |
| W5 | **DONE 2026-11-13 (see below).** Result trimming: a `brief` option (or client-side summariser) for `visualize_area`, `get_module_summary` and verifier output | small | Typical result under 4k tokens with the facts the phase needs |
| W6 | Plot input: a plain form or a file format (title, premise, antagonist, areas, NPCs, quests) so a human or a larger model writes phase 1 once and the local model builds from it | medium | Phase 2 onwards starts from the file; `plan_adventure_shape` accepts it |
| W7 | Evaluation: build the same two small modules with Claude and with the local model; compare `verify_all`, `run_live_verification`, and the manual quality notes | medium | A table of failures per phase; decides which phases stay on a local model |
| W8 | Quest forms for the studio (S1-S3 of the quest plan) | medium | Already planned in `docs/quest-frontends-work-plan.md` |

Suggested order: W1, W5, then W4 and W3 for the quest and actor phases (the highest value per effort), then W2, then
W6 and W7. The quest path (W8 aside) already needs no model.

## 7. A workable split today, before any of the above

1. A human or a larger model writes the plot and the quest list (phase 1 and the design half of phase 5).
2. Quests: fill in the spec forms (Q-nwn-manager) or have the model emit a spec under `quest-spec.schema.json`;
   build and verify with the CLI.
3. Areas, encounters, treasure, DM area, rewards: run the generator tools with a script; a model picks only
   tilesets, features and enemy themes from lists.
4. Run `verify_all`, apply the named fixes in a loop, run `run_live_verification`.
5. A model writes dialog and journal text from the plot, one NPC at a time, into `create_dialog` / quest `text`
   fields.
6. Build the `.mod` only when the user asks (project rule).

## 8. Known risks

- **Tool-calling reliability** of the chosen Qwen build is the first thing to measure; a model that drops
  arguments or invents tool names makes everything else moot. Test with the `quests` profile first.
- **Skills are written for Claude**, with many "never do X" rules learned from failures. A short prompt (W3) can
  lose a rule that prevented a real bug; the verifiers catch most (`verify_all` is the safety net), not all.
- **Coordinates and tile maths** must stay in code. Do not let a small model compute positions; offer it valid
  spots (`adventure_find_walkable`, `probe_ground`).
- **Hosted-service independence** is already a project rule: nothing in the module-building path needs a hosted
  service, so a local model fits that rule.
- **Not measured:** speed and cost of a full run on local hardware, and the quality of generated prose.
