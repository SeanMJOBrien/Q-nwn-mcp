# Testing

- Everything local; the module-building path needs no hosted service. CI (`.github/workflows/ci.yml`) only runs `npm ci && npm run verify` on push/PR to master.
- `npm run verify` = `scripts/verify.sh`: tsc, biome lint, vitest. Pre-commit hook (`npm run hooks:install`) runs it for commits touching `src/`, `package.json`, `tsconfig.json`, `biome.json`; bypass `--no-verify`. Biome missing -> verify skips lint with a message.
- Suite is fast with no network and no NWN install; tests needing game data skip, never fail. `*.live.test.ts` are env-gated.
- Real-data oracle `src/util/tile-oracle.live.test.ts`: Part A `NWN_FOLDER_DATA` + `NIM_FOLDER_NWTOOLS` (~20 s), Part B `TFN_SRC=<nasher src with are/*.are.json + git/*.git.json>`; `ORACLE_VERBOSE=1`. Run after any rotation/height/offset/facing change.
- Guard tests worth knowing: `skill-lint.test.ts` (every tool call in a skill names a real tool/params), `tool-registration-shape.test.ts`, `project-sync-guard.test.ts`, `is-error-guard.test.ts`.
- NWScript: no unit framework; compile with `nwn_script_comp`/`nwnsc`, test in-engine (`run_live_verification`). Generated scripts are compiled against the real compiler.
- Plans/history: `docs/TEST_PLAN.md`, `docs/testing-history.md` (vi.mock lessons).
