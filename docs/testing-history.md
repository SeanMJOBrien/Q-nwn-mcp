# Testing history

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

**BUILT (2026-09-17) — a comprehensive, two-tier "every system" test harness,
answering "what would it take to create test samples from every nwn-mcp system in
a module" with real, runnable code rather than a one-off manual demo.**
- `src/tools/comprehensive-module.integration.test.ts` — one shared synthetic
  module, built up across a single sequence of `it()`s (file-scoped `beforeAll`/
  `afterAll`, deliberately not the usual per-test `beforeEach` reset every other
  `*.integration.test.ts` file uses, since the whole point here is proving the
  SYSTEMS interoperate: a creature built by `create_creature_blueprint` gets
  placed, equipped, statted, and then found by `validate_module`/`verify_all`).
  Covers essentially every mockable system: all blueprint types, placement,
  dialog read+write, journal, factions, object-mgmt, bulk ops, undo, scripts
  (write+read, not compile), wealth budget, 2DA/TLK lookup, resman search
  (graceful-empty, no real BIFs), core resource reads, area/module script
  wiring, analysis, `verify_*` including `verify_all` as the capstone, and
  SQLite database tools (real `sql.js`, no native binary — `../config.js` is
  mocked with a getter so `NWN_FOLDER_USER` points at this test's own temp dir,
  never a real one). Always runs, part of `npm test`/the pre-commit hook, ~0.6s.
- `src/tools/comprehensive-module.live.test.ts` — the companion file for what
  the mocked tier explicitly can't cover honestly: real tile-solving
  (`create_area`/`adventure_generate_layout`/`adventure_apply_layout`),
  `get_tileset_details`, and the real compile-probe half of the four generator
  tools (`create_reward_system`/`create_spec_verification`/
  `create_random_abilities_system`/`create_gear_randomizer`) — all of which need
  a real neverwinter.nim toolchain, a real NWN game-data install, and a real
  `nwnsc` binary to mean anything. **Env-gated, not hardcoded skip or run** —
  `describe.skipIf(!NWN_FOLDER_DATA || !NWN_FOLDER_USER)`, the same "degrade to
  skip, never to fail" convention already used everywhere else in this suite,
  applied to a bigger chunk of coverage than before. Verified working both ways
  on this machine: skips cleanly (5 tests, 0 failures, no slowdown) with the env
  vars unset, and passes for real (4/4, ~5s, including two real bugs in initial
  field-name guesses caught only by actually running it — `adventure_apply_layout`
  returns `tilesResolved` not `tilesPlaced`, `get_tileset_details` returns
  `terrainTypes` not `terrains`) with them set to this project's own real
  `NWN_FOLDER_DATA`/`NWN_FOLDER_USER`. Writes one real throwaway module
  (`nwn_mcp_comprehensive_live_test.mod`) into the real `NWN_FOLDER_USER/modules/`
  directory and deletes it in `afterAll` — confirmed no cruft left behind after a
  real run.
- Two vi.mock lessons worth keeping for any future test file that registers
  many tool groups at once (this file needed far more of module-loader.js's/
  tileset-tools.js's real surface than any single existing test file did):
  prefer `vi.mock(path, async (importOriginal) => ({ ...await importOriginal(),
  requireIndex: ... }))` over hand-listing every export — a hand-written mock
  object silently breaks the moment a tool reaches for a real export
  (`indexAreaCreatures`, `buildTagToAreaMap`) nobody thought to stub, and the
  failure ("[vitest] No X export is defined on the mock") points at the wrong
  place. And check a `nim-tools.js` function's real return TYPE before mocking
  it, not just its rough purpose — `resmanGrep`/`resmanStats` both return plain
  strings (raw CLI output), not the structured objects an untested first-guess
  mock returned; the tools' own handlers do `output.trim().split(...)`/
  `text: output` on the result, so a wrong-shaped mock either throws
  (`.trim is not a function`) or fails deep inside the MCP SDK's own response
  validation.
