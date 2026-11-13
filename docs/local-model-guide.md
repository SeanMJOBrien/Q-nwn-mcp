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
| About 200 tools in one session | Tool selection degrades past a few dozen tools; the tool list alone is tens of thousands of tokens | Expose a **profile** per task (section 5). No profile switch exists yet: work package W1 |
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

Today a client sees all tools. The profile would be an environment variable read at registration
(`MCP_TOOL_PROFILE=quests,verify`), implemented in one place (the registration functions are already grouped per
file). Not built; W1.

## 6. Work packages

| # | Package | Size | Acceptance |
|---|---|---|---|
| W1 | `MCP_TOOL_PROFILE`: register only the named groups; document the profiles | small | Server lists fewer than 40 tools with `quests,verify`; default unchanged; tests |
| W2 | Driver: a script that runs one phase at a time with a trimmed profile, a short phase prompt, schema-checked answers, retries and `phase_check` between phases | large | One module built end to end with a local model plus a human-written plot |
| W3 | Short phase prompts: for each skill, a 2-4 KB version with the steps and the tool order, generated from or checked against the full skill (`skill-lint` already checks the full ones) | medium | Each phase prompt under 4 KB; lint passes |
| W4 | Input schemas for companion, key NPC, dialog, journal, area style | medium | Each has a JSON schema generated from the TypeScript type like `quest:schema`; the driver validates against them |
| W5 | Result trimming: a `brief` option (or client-side summariser) for `visualize_area`, `get_module_summary` and verifier output | small | Typical result under 4k tokens with the facts the phase needs |
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
