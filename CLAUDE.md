# NWN MCP Server

MCP server for Neverwinter Nights: Enhanced Edition modules (.mod). Wraps the neverwinter.nim CLI tools so module content
is structured, queryable and editable by an LLM. TypeScript, stdio, one module loaded at a time.

## Where the knowledge lives

- **Serena memories** (`.serena/memories/`, start at `mem:core`): architecture, layout generator, tile solver, spatial
  conventions, GFF gotchas, transitions, verification, quests, co-op, creatures, local models, commands, conventions,
  testing, done checklist. Read the memory for the area you touch before changing it.
- **Open TODOs:** `docs/todo.md` (history: `docs/todo-archive.md`; order of work: `docs/work-plan.md`).
- **Docs map:** `docs/README.md`. Tool explanations: `docs/adventure-tooling-reference.md`. Pitfalls with evidence: `docs/pitfalls.md`.
- **NWScript functions:** `nwscript-docs/<FunctionName>.md` (open by exact name; absence is not authoritative).

## Rules that always apply

- **TODO #15 (user rule 2026-11-07):** every branch and commit not in `master` is tracked in `docs/todo.md` #15 (moved there 2026-11-19). After
  each commit, merge or branch change: `git fetch --prune`, `git rev-list --count origin/master..<branch>`; the update
  goes in the same commit as the work and is amended to "pushed" just before the push.
- **Commit or push only when asked.** Never stage `graphify-out/` or `.swamp/`; no `git add -A`. `.serena/memories/` and
  `.serena/project.yml` are committed (its own `.gitignore` leaves out the cache).
- **Restart after code changes:** `npm run build`, then the MCP server must be restarted before new or changed tools exist.
  Say so in plain text and wait.
- **Keep skills in sync with tools:** a changed tool parameter or behaviour means updating every `.claude/skills/*/SKILL.md`
  (and phase prompt) that calls it. The LLM follows skills, not schemas.
- **Per-module files in `adventures/<Title-With-Dashes>/`** (git-ignored), named with the title (`<Title>.md` story,
  `<Title>-dm-guide.md`, `-status.json`, `-scope.json`). The module is a nasher project there; edits sync as they happen.
- **Build the `.mod` only on request.** No repack or send after each step. When the work looks complete, offer to build;
  send only after the user accepts.
- **No HTML report export** unless the user asks.
- **Every module has** a disconnected DM area with the story and DM-guide books (`create_dm_area`), every creature
  blueprint in the custom palette (`update_creature_palette`), and map pins at exits, large-structure doors, shops,
  quest givers and quest destinations.
- **Dialog branches return to the main dialog;** only the explicit exit reply ends a conversation.
- **Sessions start by asking the goal** (`show_menu`). Whole-adventure builds follow the fixed phase order without asking
  which part comes next; ask only creative choices and before building the `.mod`.
- **Every module is co-op by default:** rewards fan out to every party member, `AddJournalQuestEntry` all-party TRUE,
  shared state never on one PC (`verify_coop_rules`).
- **Spatial maths:** a rotation/height/offset/facing change that fails `src/util/tile-oracle.live.test.ts` is wrong.

## Design intent

(a) AI-assisted human module design: the human keeps creative control. (b) AI-driven one-shot adventures, spoiler-free so
the DM is surprised too: `/create-adventure` runs the `adventure-*` phases (plot, areas, environment, actors, quests,
challenges, affordances, polish, rewards) with `phase_check` gates. A new adventure is always its own module
(`create_module`). Scope: non-PW modules (single-player, small co-op); content is placed instances.

## Quick start

```bash
npm run build                   # compile to dist/
npm run verify                  # tsc + biome + vitest (also the pre-commit hook: npm run hooks:install)
node dist/cli/tool.js --module <project|.mod> <tool> key=value ...   # any tool without an MCP client
./UpdateMCP.sh                  # pull, install, build; then reconnect the MCP
scripts/setup-new-machine.sh    # new machine: build, nim tools, game folders, nwn-mcp.env
```

Settings: environment variables or `nwn-mcp.env` (`nwn-mcp.env.example`): `NIM_FOLDER_NWTOOLS`, `NWN_FOLDER_DATA`,
`NWN_FOLDER_USER`, `MCP_FOLDER_TEMP`, `MCP_FOLDER_VERIFYSERVER` (full list: `mem:tech_stack`).

## Architecture in one line

`.mod` -> `nwn_erf` -> temp dir -> `nwn_gff` JSON -> in-memory `ModuleIndex` -> tool handlers -> `nwn_gff` -> `nwn_erf`.
Tools: `src/tools/*-tools.ts`, registered in `src/register-all.ts`; logic in `src/util/`; checks in `src/util/verify/`.
Details: `mem:architecture/pipeline`.
