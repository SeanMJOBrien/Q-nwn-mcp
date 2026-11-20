# nwn-mcp core

MCP server (TypeScript, stdio) for Neverwinter Nights:EE modules (.mod). Wraps neverwinter.nim CLI tools; one module loaded at a time (`create_module`/`load_module` first).

Source map
- `src/index.ts` entry; `src/register-all.ts` registers every tool group (shared with `src/cli/tool.ts`).
- `src/tools/*-tools.ts` tool groups; `src/util/` logic; `src/util/verify/*.ts` checks; `src/types/gff.ts` GFF helpers; `src/cli/` CLIs (`tool`, `quest`).
- `.claude/skills/*/SKILL.md` skills that drive the tools; `docs/` reference (question -> document map `docs/README.md`; tool explanations `docs/adventure-tooling-reference.md`).
- `adventures/<Title-With-Dashes>/` per-module projects (git-ignored).

Invariants
- `master` is the line without small-model support (details `mem:workflow/branches`); branch `local-models` holds the small-model line, parked. Open TODOs: `docs/todo.md` (index, #15 included), details `docs/todo/<id>.md`; CLAUDE.md holds only the always-on rules.
- After TS changes: `npm run build`, then the MCP server must be restarted.
- Never commit `graphify-out/`, `.swamp/`. `.serena/memories/` and `.serena/project.yml` are committed (`.serena/.gitignore` leaves out the cache).

Where to look
- Standing user rules (adventure folders, build-on-request, DM area, palette, map pins, dialog structure, session flow, TODO #15 practice): `mem:workflow/user_rules`.
- Purpose, the two use cases, story-record format: `mem:design_intent`.
- Load/save pipeline, project sync, caches, undo, blueprint resolution, tool registry and result contract: `mem:architecture/pipeline`.
- BSP layout rules and real size minimums: `mem:architecture/layout_generator`. Tile matching, orientation, solver fallbacks, terrain chains: `mem:architecture/tile_solver`.
- Coordinates, ground Z, walkmeshes, facing encodings, walkability/collision defaults, reachability: `mem:domain/spatial`.
- GFF field model, list names, VarTable/geometry/instance-copy traps, tool-call pitfalls: `mem:domain/gff_gotchas`.
- Doors, triggers, portals, connectivity, module start, traps: `mem:domain/transitions`.
- verify_* severity contract, shipping gate, live verification: `mem:domain/verification`.
- Quest system, event stages, quest CLI and front ends: `mem:domain/quests`. Party-wide rewards and journal rules: `mem:domain/coop`.
- Creature building, henchman invariants, gear models: `mem:domain/creatures`.
- What the local-model line has that this branch lacks, and lessons from real small-model runs: `mem:local_models/core`.
- Stack and settings variables: `mem:tech_stack`. Commands (build, CLIs, nim tools): `mem:suggested_commands`. TypeScript/NWScript code rules: `mem:conventions`. Test tiers, guard tests, oracle: `mem:testing`. Done checklist: `mem:task_completion`.
