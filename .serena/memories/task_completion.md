# Done checklist

1. `npm run verify` passes (biome style warnings non-fatal).
2. Rotation/height/offset/facing maths changed: tile oracle (`mem:testing`).
3. Tool changed: skills, phase prompts and `docs/adventure-tooling-reference.md` updated; schema scripts re-run if a spec type changed.
4. TODO #15 in `docs/todo.md` updated in the same commit (`mem:workflow/user_rules`).
5. Commit/push only when asked; `git status` first; never stage `graphify-out/`, `.swamp/` (no `git add -A`); memory changes in `.serena/memories/` are committed. End commit messages with the session's attribution lines.
6. Tell the user the MCP server needs a restart for new/changed tools.
