# Commands

Build and check
- `npm run build`; `npm run verify` (tsc + biome + vitest); `npx vitest run <file>`; `npx tsc --noEmit -p .`.
- Biome `MODULE_NOT_FOUND`: `npm install --no-save @biomejs/cli-$(node -p "process.platform+'-'+process.arch")`.
- `npm run quest:schema` after changing `QuestInput`; `npm run specs:schema` after changing a spec type.

Run
- `npm run dev` (tsx) / `npm run start`.
- Any tool without an MCP client: `node dist/cli/tool.js --module <project|.mod> <tool> key=value ...`; `--calls file.json` (array of `["tool", {args}]`); `--build out.mod`; `--list [word]`; `--settings`; `--json` (`docs/tool-cli.md`).
- Quests without an LLM: `node dist/cli/quest.js build|remove|schema|normalize` (`docs/quest-cli.md`).
- Local-model driver (branch `local-models` only): `node dist/cli/drive.js --module <project> --endpoint <url/v1> --model <name> [--context-tokens N] [--plot file]`; `--report <driver-log> [--json]`.
- `./UpdateMCP.sh` (Windows `UpdateMCP.cmd`; `--check` lists waiting commits): pull, install, build; then reconnect the MCP. New machine: `scripts/setup-new-machine.sh` (`--ollama`). Build a `.mod` from a project: `scripts/build-module-from-project.sh`.

NWN tools
- `../nwn-tools/linux/neverwinter/nwn_gff -i x.dlg -o x.json -k json -p` (GFF <-> JSON); `nwn_erf` (ERF pack/unpack).
- `nwn_script_comp [opts] -o out file.nss` (source positional). `../nwn-tools/linux/nwnsc/nwnsc -i <base-scripts> -i . -b out file.nss`; case-sensitive include fix: `../nwn-tools/gen_include_shims.sh`.
- Tile oracle: see `mem:testing`.
