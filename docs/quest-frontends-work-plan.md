# Work plan: quest building without an LLM (manager console, content studio, quest CLI)

Follow-up to the 2026-11-11 session that put the quest system into Q-nwn-manager. It covers three repositories:

| Repo | Role | What exists (2026-11-11, uncommitted) |
|---|---|---|
| `Q-nwn-mcp` | The quest builder and its CLI | `dist/cli/quest.js` reads a flat nasher source directory (`loadSourceDir`), stages changes to `--out`, `--no-compile`; `syncGic` keeps toolset comments |
| `Q-nwn-manager` | Home of the web form for nasher projects | console **Quests** page: `bin/nwn-quests`, `bin/quest_assets/quests.js`, routes in `bin/nwn-area-editor`, `tests/test_quests.py`, `tests/ui/quests_smoke.js` |
| `Q-tfn-content-studio` | Same spec, two targets (Q-nwn-mcp projects, TFN) | Module Quests page (`tfnstudio/modquest.py`, `questbridge.py`); area pick list now gives resrefs |

Goal the packages serve: a person with no LLM adds a quest to a module from a form, trusts the result without
reading files, and can do it on any machine the manager runs on.

## How to resume (read this first in a new session)

1. Read the **Status** table; the first row not marked `done` is the next package (unless a decision below blocks it).
2. Run `git status --short` in the repo the package names. Uncommitted changes belong to the package marked
   `in progress`; read its Notes cell first.
3. Do that package only, finish with the checkpoint for its repo, then start the next if there is room.

**Checkpoint per repo:**
- `Q-nwn-mcp`: `npm run verify`; commit with the package id; update CLAUDE.md TODO #15 and this Status table.
  If tool code changed, say "MCP restart needed" in plain text.
- `Q-nwn-manager`: `for t in tests/test_*.py; do python3 $t; done`; for a change to the Quests page also
  `tests/ui/quests_smoke.js` on a **scratch copy** of a project (never a real one). Never `git add -A` (`.swamp/`, `.serena/`).
- `Q-tfn-content-studio`: `python3 -W ignore -m unittest discover -s tests -t .`; update `PROGRESS.md`. That repo
  holds the user's own uncommitted work: stage only the files the package names.
- No push and no `.mod` build unless the user asks.

**Test fixture used so far:** a copy of `~/git/chronicles` (8,360 files) under the session scratchpad, served with
`python3 bin/nwn-area-editor --projects-dir <scratch> --port 8399` and
`PATH=<manager>/nwn-tools/linux/neverwinter:<manager>/nwn-tools/linux/nwnsc:$PATH`. Giver `crn_grns`, second NPC `Willias`.

## Status

| Id | Package | Repo | State | Commit / Notes |
|----|---------|------|-------|----------------|
| L1 | Commit the 2026-11-11 work, one commit per repo | all three | partly done | mcp `f1a1e81`, manager `d79d3c3` (2026-11-11). Studio NOT committed: its quest work is mixed with the user's other uncommitted edits in `server.py`, `cli.py`, `service.py`, `index.py`, `common.js`; needs the user to say how to split |
| L2 | Rebuild the `nwn-pytools` binaries with the Quests page | manager | open | needs L1 pushed; CI workflow `build-pytools.yml` |
| L3 | Linux binary runs on older glibc | manager | open | fails here: needs GLIBC 2.38 |
| T1 | Play a manager-built quest in the engine | mcp + manager | open | no quest from the form has been played |
| T2 | Completability check after a build (`quest verify` in the CLI) | mcp, then manager | open | |
| T3 | Rebuild of an unchanged quest writes nothing | mcp | open | `dq_<npc>.dlg` was rewritten on an identical rebuild |
| T4 | Remove leaves the module as it was | mcp | open | needs decision D2 |
| T5 | Undo a whole quest in one step | manager | open | today: one History entry per file, new files stay |
| T6 | Windows, macOS, reverse proxy, wiki shell | manager | open | only Linux, no prefix, console theme were run |
| U1 | Base-game creatures and items in the pick lists | mcp + manager | open | |
| U2 | Pick a position on the area map | manager | open | x / y are typed today |
| U3 | Parcel, reward and check as plain fields | manager | open | Deliver needs the item typed inside "Reward" |
| U4 | Plan errors point at the field | mcp + manager | open | |
| U5 | See and adopt quests made elsewhere | manager (+ mcp) | open | listed, not editable |
| P1 | One-file builder shipped with the manager | mcp + manager | open | needs decision D1 |
| P2 | Builder and form versions checked against each other | mcp + manager | open | after P1 |
| P3 | `load_module` on a manager project | mcp | open | lets an LLM session work on the same project |
| S1 | One form for both front ends | mcp + manager + studio | open | needs decision D3 |
| S2 | Studio builds into manager projects | studio | open | |
| S3 | TFN generic check and action scripts (CLAUDE.md #16) | studio | open | plan in `docs/tfn-quest-findings.md` |
| C1 | Small defects found on the way | mcp | open | list below; good for the end of a session |

## Decisions needed from the user

- **D1 (blocks P1): how the manager gets the builder.** Today: a built Q-nwn-mcp checkout next to the manager, plus Node.
  Option A (recommended): `npm run quest:bundle` in Q-nwn-mcp writes one `quest-cli.mjs` (esbuild), vendored into the
  manager like the other tools, refreshed by a documented step. Node is still needed. Option B: keep the sibling
  checkout. Option C: port the builder to Python (about 3,000 lines kept twice; not recommended).
- **D2 (blocks T4): what Remove does with what the quest created.** Today the conversation `dq_<npc>`, quest items,
  the shared scripts and the event wiring stay. Option A (recommended): the builder records what it created and what
  it replaced (a `mcpq:<tag>` marker already exists for triggers) and Remove deletes its own files and puts the old
  values back, keeping the shared scripts while another quest uses them. Option B: leave as is and list the leftovers
  in the result.
- **D3 (blocks S1): where the shared form lives.** Option A (recommended): `web/quest-form.js` in Q-nwn-mcp, next to
  the schema it is drawn from, copied into each front end by the same step as D1's bundle. Option B: the manager
  owns it and the studio copies it. Option C: keep two forms.
- **D4: is `quests/` in a manager project committed?** The saved specs are the only editable source of a quest;
  recommended yes, with a line in the `.gitignore`/README stub that `nwn-manager init` writes.

## Phase L: land it

**L1. Commit.** Q-nwn-mcp: CLI source mode, flat sync, `syncGic`, tests, docs (`npm run verify` passed 2026-11-11).
Manager: `bin/nwn-quests`, `bin/quest_assets/`, console routes, `NWN_MANAGER_USE_PYTHON`, spec datas, README, tests.
Studio: `tfnstudio/modquest.py` and its test only if the user wants the rest of that tree committed separately.
*Acceptance:* three clean `git status` outputs apart from the known untracked folders; TODO #15 updated.

**L2. Binaries.** Push the manager, run `build-pytools.yml`, confirm the frozen console serves `/p/<slug>/quests`
(the spec already lists `nwn-quests`, `quest_assets/` and `platform`). *Acceptance:* `nwn-manager console` without
`NWN_MANAGER_USE_PYTHON` shows the Quests link on Linux, macOS and Windows.

**L3. glibc.** Build the Linux binary on the oldest base image the workflow offers (or a manylinux container), and
make `bin/nwn-manager` fall back to `python3` with one warning line when the binary cannot start, instead of failing
the dialog-integrity gate. *Acceptance:* `nwn-manager repack` works on this machine with no environment variable.

## Phase T: trust the result

**T1. Play it.** Build two quests through the form on a scratch project (an errand, and kill + pickup + deliver with
a new item), pack, and run them with the player simulation (`run_live_verification` `simulate`,
`docs/player-simulation.md`). A module with HAKs needs them stripped as in the actingfenora notes.
*Acceptance:* every stage advances and the reward is paid, recorded in `docs/quest-cli.md`; any stage kind that
cannot be simulated is listed there.

**T2. Check after build.** Add `quest verify <tag> --project <dir>` to the CLI: `verify_journal` and
`verify_quest_completability` for that quest, read-only, same JSON envelope. The manager calls it after Build and
shows "can be completed" or the gaps beside the file list. *Acceptance:* a quest whose kill target is in an
unreachable area shows the gap on the page; live test on a source directory.

**T3. Idempotent rebuild.** Find why the dialog differs on an identical rebuild (likely node order after
strip-and-re-add). *Acceptance:* a second build of the same spec reports no written files; test in
`quest-tools.integration.test.ts`.

**T4. Clean remove** (after D2). *Acceptance:* build then remove leaves `git status` empty on a scratch project,
except shared runtime scripts when D2 says they stay; the flat sync reports deleted files in `removed` and the
manager deletes them through its history.

**T5. Grouped undo.** The manager writes one record per build (`.nwn-manager/quests/<tag>-<stamp>.json`: files
changed with their snapshot names, files created). A button on the built quest restores all of them and deletes the
created files. *Acceptance:* build, undo, `git status` empty; `tests/test_quests.py`.

**T6. Other environments.** Run `quests_smoke.js` with `--url-prefix /qedit`, with `--wiki-shell`, on macOS and on
Windows. Known guesses to check on Windows: `nwn-manager.ps1` has no `NWN_MANAGER_USE_PYTHON`, the `nwnsc -i`
separator in `compile_check`, `node` discovery. *Acceptance:* 14 of 14 in each, or a fix.

## Phase U: easier to use

**U1. Base-game names.** With `NWN_FOLDER_DATA` set, add `quest contents --project <dir>` to the CLI (module
contents plus base-game creature and item blueprints through the existing blueprint cache) and let the manager use
it instead of its own reader when available. *Acceptance:* typing "wolf" in a creature field offers `nw_wolf`.

**U2. Map picker.** Trigger, escort and spawn stages take x / y. Reuse the manager's area data (it already draws an
area map) or port the studio's `areamap.js`: click a spot, the form fills x and y and shows whether it is walkable
(`probe_ground` through a CLI subcommand). *Acceptance:* a trigger stage is built from a click; browser check.

**U3. Plain fields for common cases.** In the Deliver outline a "Parcel" field writes stage 1's `reward.item`; the
last stage shows the sized reward with XP and gold boxes; a check is a skill drop-down and a difficulty drop-down.
Skill, ability and save names come from the schema (add enums to `StageCheck` in `quest-spec.ts`, then
`npm run quest:schema`). *Acceptance:* each of the eight outlines can be completed without opening "More options".

**U4. Errors at the field.** `QuestSpecError` gains `stage` and `field`; the CLI returns them; the form outlines
that field and scrolls to it. *Acceptance:* a kill stage without a target marks the target box after Plan.

**U5. Quests made elsewhere.** Show a journal quest's entries read-only, and offer "Adopt": draft a spec from the
journal and the `questK` variables where the quest was built by `build_quest` in an LLM session (the spec is in the
adventure file there, not in `quests/`). *Acceptance:* a Salt Gate quest opens in the form after adopting.

## Phase P: one builder, anywhere

**P1. Bundle** (after D1). `npm run quest:bundle` → one file with the schema inside; manager looks for it before
the sibling checkout; README setup shrinks to "install Node". *Acceptance:* Quests works with no Q-nwn-mcp checkout.

**P2. Versions.** `quest.js version` prints the package version and a hash of the schema; the manager shows it and
warns when the bundle is older than the checkout beside it. *Acceptance:* test with a fake CLI.

**P3. `load_module` on a manager project.** `loadSourceDir` exists; what is missing is a write target: with a
manager project the MCP server would write changed resources back into `unpacked/` in nasher's JSON form
(`stringifySource`, floats as `1.0`), honouring the manager's `.bak` and history conventions or stating that it
does not. Belongs with CLAUDE.md #29. *Acceptance:* an LLM session and the console form edit the same project in
turn with no format-only diffs.

## Phase S: studio and TFN

**S1. One form** (after D3). Move outlines, labels, field order and required lists out of the two page scripts into
the shared file; each front end keeps only its transport and its result panel. *Acceptance:* both browser suites
pass; a new outline is added in one place.

**S2. Studio to manager projects.** The studio lists manager projects (`nasher.cfg` + `unpacked/`) beside Q-nwn-mcp
projects and builds with `--out`, turning the staged files into one of its change sets for review.
*Acceptance:* `tests/test_modquest.py` with a fake CLI; one real run on a scratch project.

**S3. TFN generic scripts.** Unchanged from CLAUDE.md #16 and `docs/tfn-quest-findings.md`: first the `search` stage
with `q_search`, then checks, spawns, `use`, `trigger` and branches, so `questbridge.py` stops refusing them.

## C1: small defects found on the way (Q-nwn-mcp)

- `syncGic` is positional: removing an object from the middle of a GIT list shifts the comments after it. The
  remove tools should drop the GIC entry at the same index.
- `-0.0` and whole-number floats are preserved only by the flat sync; the `src/` project flush and `jsonToGff`
  still write `-0` as `0`.
- Without `NWN_FOLDER_USER` the load prints a `nwn_resman_extract` stack trace ("Could not locate NWN user
  directory") and loads no base 2DAs; pass the user directory only when set, or say so in one line.
- The CLI exits without releasing its temp-dir lock and leaves `<MCP_FOLDER_TEMP>/unpacked_<hash>` behind; release
  the lock and, for a source load, remove the copy on exit.
- A source project whose module is loaded by a running MCP server is refused with the lock message; the message
  should name the CLI case.
- `quest-source.live.test.ts` needs a built `dist/`; run it from `scripts/verify.sh` after the build when
  `NIM_FOLDER_NWTOOLS` is set.

## Order and why

1. **L1-L3** first: until the binaries are rebuilt, the page exists only when the console runs from source.
2. **T1-T3** next: the form is only useful if a built quest is known to work and a rebuild is quiet in git.
3. **D1, D2, D4** answered, then **P1, T4, T5**: setup becomes "install Node", and removal and undo become complete.
4. **U3, U4, U1**, then **U2, U5**: the cheapest gains in ease first; the map picker and adoption are larger.
5. **T6** before telling anyone on Windows or macOS to use it.
6. **D3, S1, S2**, then **S3**: sharing the form pays off once it has stopped changing; TFN's scripts are the
   longest item and independent of the rest.
7. **C1** and **P2** fill the end of any session; **P3** goes with #29.
