# Branch pre-local-models

- Starts at `1840e37` (last commit before the local-model guide `cbdda7a` and tool profiles `90789d9`, 2026-11-13); diverges from `master` (master's later commits are the local-model line).
- Carries only later fixes that help any client, as cherry-picks: each message names its source commit; some keep a "Driver fixes from the ... run" subject although the driver parts are left out.
- Brought over: set_module_start, quest robustness, trigger/encounter geometry struct IDs, custom factions, `check_path`, map pins, `build_creature`, layouts by id, UpdateMCP, `set_starting_gold`, tool CLI + `nwn-mcp.env`, project-file guard, guide checks, blueprint hints, setup scripts, `create_module` on an existing module, `show_menu`, `build_key_npc` fixes, transition tag check, `build_enemy_group`, result contract, `build_store`, `build_trap`, creature palette; `register-all.ts` and `tool-registry.ts` because those need them; lenient args opt-in (`MCP_LENIENT_ARGS=1`).
- Left out: tool profiles, brief results, build specs, phase prompts, story tools (`read_story`/`write_story_section`/`write_dm_guide`), driver, `get_progress`, `build_area`/`dress_area`/`get_area_card`, result shaping, slimmed descriptions, plot specs (`write_plot`), `place_container`.
- Tool answers must not point at tools that exist only on the local-model line.
- Worktree on the dev machine: `../Q-nwn-mcp-pre-local` (symlinked `node_modules`).
