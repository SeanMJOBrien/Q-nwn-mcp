# User rules (standing, dated when set)

Files and projects
- Per-module files live in `adventures/<Title-With-Dashes>/` (git-ignored), never the temp dir; `get_adventure_dir` returns real paths (`files`).
- File names carry the title: `<Title>.md` (story; "adventure.md" in skills/docs means this file), `<Title>-dm-guide.md`, `<Title>-status.json`, `<Title>-scope.json`, `<Title>-progress.md`. `ensureAdventureDir` renames older untitled files.
- A module is a nasher project in that folder: every GFF resource as `nwn_gff` JSON in `src/`, scripts `.nss`, plus story and DM guide. Edits sync there as they happen (`docs/module-projects.md`).
- Build the `.mod` (`repack_module`) only when the user asks. When work looks complete, offer to build; send only after the user accepts. No repack/send per step. `run_live_verification` builds its own throwaway `.mod`.
- No HTML report export (`export_area_report`, `export_module_report`) unless asked.

Every module has
- A DM area: fixed template `src/templates/dm_area.{are,git,gic}` (2x2 `tcn01`, `DM_AREA` waypoint, chest `dm_chest`), disconnected (no transition in/out), chest holds two books (baseItem 74): the story and the DM guide. `create_dm_area` copies it and fills the chest; `audit_module` row "DM area and books".
- Every creature blueprint in the custom palette (`creaturepalcus.itp`, `update_creature_palette`, run by `repack_module` before each build).
- Map pins (waypoint with `mapNote`) at each exit door/trigger/portal, entrance of a large structure, shop, quest giver/key NPC spot, quest destination: 1-2 m in front on the walkable approach side (`probe_ground` first), text names the place or destination, never a spoiler.

Dialog
- Branches return to the main dialog (the NPC's menu); only the explicit exit reply ("Goodbye") ends the conversation. Enforced by `create_dialog`, companion dialog, `verify_dialog` (`dialog_branch_ends`).

Sessions
- Start by asking the goal: `show_menu` (lettered menu; MCP prompt `start`); `set_project_scope` records it. Most sessions: adopt (`adopt_module`), review (`audit_module`), then fill gaps the user picks (`docs/guided-workflow.md`).
- Whole-adventure builds: fixed phase order (plot, areas, environment, actors, quests, challenges, affordances, polish, rewards); don't ask which part next. Ask only creative choices, the goal when none recorded, and before building the `.mod`.
- After code changes the MCP server needs a restart: say so in plain text and wait (no AskUserQuestion for it).

Repo
- TODO list: `docs/todo.md` is an index, one line per open item (`- #id P<n> title: what closes it`); longer notes only in `docs/todo/<id>.md`; done items move to `docs/todo-archive.md`. Keep index lines short.
- TODO #15 in `docs/todo.md` (moved from CLAUDE.md 2026-11-19) tracks every branch and commit not in `master`: after each commit/merge/branch change run `git fetch --prune` + `git rev-list --count origin/master..<branch>`; the update goes in the same commit as the work; amend to "pushed" just before pushing; old states go to `docs/todo-archive.md` (#15 history).
- Commit/push only on request. Keep skills in sync with tools (skills drive the LLM, not schemas).
