# Tech stack

- TypeScript ES2022, Node16 modules, `tsc` -> `dist/`; the server runs from `dist/index.js` (stdio).
- `@modelcontextprotocol/sdk`, `zod` v4 (tool params), `ajv` (spec JSON Schemas in `docs/specs/`, `docs/quest-spec.schema.json`), `sql.js`, `fzstd`.
- vitest; biome (platform binary as optional dependency).
- External binaries: neverwinter.nim (`nwn_gff`, `nwn_erf`, `nwn_script_comp`, `nwn_resman_*`) at `NIM_FOLDER_NWTOOLS`; shared copies `../nwn-tools/<platform>/` (also `nwnsc`, `nasher`, `gen_include_shims.sh`).

Settings: env vars, else `<repo>/nwn-mcp.env` (`NWN_MCP_ENV` overrides the path; `src/util/settings-file.ts`); `tool.js` also falls back to the nwn-mcp entry's `env` in `~/.claude.json`.
- `NIM_FOLDER_NWTOOLS` nim binaries; `NWN_FOLDER_DATA` game install (base 2DA/TLK via resman); `NWN_FOLDER_USER` user dir (custom TLK, HAKs, override, development).
- `MCP_FOLDER_TEMP` (default `%TEMP%/nwn-mcp`), `MCP_FOLDER_USERREPORTS`, `MCP_FOLDER_ADVENTURES`, `MCP_FOLDER_VERIFYSERVER` (default `~/nwn-mcp-verify-server`), `MOONGLOW_BIN`, `MOONGLOW_PLUGINS`.
- Local-model settings (`MCP_TOOL_PROFILE`, `MCP_PROGRESS_FOOTER`, `MCP_RESULT_LIMIT`, `MCP_BRIEF_RESULTS`, `MCP_DESCRIPTION_LIMIT`): `mem:local_models/core`. `MCP_LENIENT_ARGS=1` opts into widened string params (off: the tool list is ~60 % smaller without them).

Reference data: `nwscript-docs/<FunctionName>.md` (exact-name lookup; absence not authoritative); `src/data/*.json` catalogs.
