# Running tools from the command line

`node dist/cli/tool.js` runs any nwn-mcp tool with no MCP client and no model: patches, checks and builds done outside a
chat. It replaces the one-off Node scripts that loaded the registry by hand (written while patching The Glowing Deep,
2026-11-18), each of which had to be given four environment variables.

```bash
node dist/cli/tool.js --module adventures/The-Glowing-Deep verify_creature resref=ilyanthe
node dist/cli/tool.js --module adventures/The-Glowing-Deep verify_all '{"brief": true}'
node dist/cli/tool.js --module adventures/The-Glowing-Deep --calls patch.json
node dist/cli/tool.js --module adventures/The-Glowing-Deep --build /tmp/the-glowing-deep.mod
node dist/cli/tool.js --list gold          # tools whose name or description has the word
node dist/cli/tool.js --settings           # each setting and where it came from
```

- **Arguments:** one JSON object, or `key=value` pairs; a value that parses as JSON is used as such (`level=3`,
  `brief=true`, `spots=[1,2]`), anything else is a string.
- **Several calls on one load:** `--calls <file>`, a JSON array of `{"tool": "...", "args": {...}}` or `["tool", {...}]`.
  `--build <out.mod>` adds a `repack_module` at the end.
- **Output:** each result under a `--- tool` line (`(ERROR)` when it failed); `--json` prints one document
  `{ok, results: [{tool, isError, text}]}`. Exit code 1 when a call failed, 2 for a usage error.
- **Edits** go to the module project as the server's do. A running server that holds the same project refuses its next
  write until it loads the project again (`load_module(modPath: "<project>", force: true)`), so it never writes its older
  copy over the CLI's changes ([module-projects.md](module-projects.md), "Files changed on disk").
- **Temp folder:** the CLI's own (`<tmp>/nwn-mcp-cli`) unless `MCP_FOLDER_TEMP` is set, so it never shares a temp
  directory or module lock with a running server.

## Settings

One settings file serves the server and every command-line tool (`tool.js`, `quest.js`): `nwn-mcp.env` in
the repository (git-ignored), or the file `NWN_MCP_ENV` names. `KEY=value` lines, `#` comments, `~` for the home folder;
`nwn-mcp.env.example` lists the keys. A variable already set in the environment wins over the file
(`src/util/settings-file.ts`, read first thing by `src/config.ts`).

Without the file, `tool.js` reads the `env` of the MCP client's entry that runs this server (`~/.claude.json`, the
`mcpServers` entry whose arguments name this repository's `dist/index.js`), so a machine set up for the MCP client needs
nothing more. `--settings` shows which source each value came from. Without `NWN_FOLDER_USER` resman cannot read the
base 2DAs, and checks that need them change their answers; the CLI says so on stderr when a game setting is missing.
