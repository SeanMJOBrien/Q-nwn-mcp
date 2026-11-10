# Verification history

Moved verbatim from CLAUDE.md (work-plan A3, 2026-11-10): the `verify_*` fix history, user-correction rounds, live verification server findings, the systest module, and the Hollow Communion playtest rounds. The severity contract and the list of checks stay in CLAUDE.md ("Verification Gate").

**Open items recorded inside this file** (to be carried into the numbered TODO list by work-plan A5): commit the verify server's simplification; encounter composer open question ("CR 6" meaning); the two open questions from the sixth Hollow Communion round (armor AC premise, Elowen's 2nd-level slot); level-up after a baked pool; quickbar auto-fill.

**FIXED (2026-09-17) — `verify_all` only ever checked standalone `.utc` blueprint
files, silently skipping any creature whose only representation is the live placed
instance in an area's GIT.** Found from a real user bug report against a shipped
module (six concrete creature/store bugs at once — see the user-corrections entry
below): a placed Rogue was wearing Chainmail (Medium armor) with only Light Armor
Proficiency — the exact case `armor_proficiency_mismatch` already existed to catch
— and `verify_all` reported zero problems for it. Root cause: `verify_all`'s
creature loop (`src/tools/verify-tools.ts`) iterated `index.resources` filtered to
`.utc` extension only. A placed instance's equipment/feats are a separate copy from
its blueprint's (see the "separate copy" pitfall above) — this project's own
`/adventure-challenges` phase places most hostiles individually rather than via
`create_creature_blueprint` for every one, and any creature edited post-placement
via `set_creature_equipment`/`respec_weapon_feats`/a direct GFF edit diverges from
whatever `.utc` it started from, if one even exists. Neither case was ever checked.
**Fix:** `verify_all` now additionally walks every area's live `Creature List` GIT
struct directly and runs `verifyCreature` against each placed instance, target-
labeled `<area>:<tag>` — in addition to, not instead of, the existing blueprint-file
loop (the two can genuinely disagree, so both are worth checking). One new
integration test (`new-features.integration.test.ts`) reproduces the exact bug
shape (a GIT-only creature with no `.utc` anywhere, wrong armor tier) and confirms
`verify_all` now catches it.

**User-corrections-turned-into-rules (2026-09-17, six real bugs reported against
one shipped module, all fixed and all closed with a real script-enforced check per
the user's explicit request — "corrections should probably be turned into rules
validated by script where possible").**
- **A Cleric had Weapon Focus/Specialization/Improved Critical: Warhammer baked
  (feat.2da 115/153/77) but was equipped with a Light Mace.** Mechanically usable
  (Simple Weapon Proficiency covers both) so the existing `weapon_proficiency_mismatch`
  check didn't fire — the gap is one level more specific than basic proficiency.
  **New check: `weapon_focus_mismatch`** (`verifyCreature`, `src/util/verify/blueprints.ts`)
  reverse-scans baseitems.2da's `WeaponFocusFeat`/`WeaponSpecializationFeat`/
  `WeaponImprovedCriticalFeat` columns (+ Epic variants — the same columns
  `respec_weapon_feats` already reverse-scans to auto-detect a creature's current
  weapon investment) against `FeatList`, and warns when a match names a baseitems
  row other than what's actually equipped in RightHand.
- **A Salt Gate Crossbowman had Point Blank Shot + Rapid Shot (feat.2da 27/30, the
  generic ranged-combat pair) and a crossbow, with no Rapid Reload (feat 411).** A
  crossbow needs a full round to reload without Rapid Reload, so Rapid Shot's extra
  attack could never trigger — a real, verified rules interaction (Rapid Shot works
  fine on a bow, which doesn't need reloading; `WeaponWield` 6 in baseitems.2da is
  the verified, crossbow-specific discriminator — a bow's is 5, a sling's is 10).
  **New check: `ranged_feat_no_reload_support`** flags exactly this combination.
- **`create_store_blueprint`'s auto-categorization put a real weapon in the wrong
  StoreList bucket** (a Kukri fell through to the Misc default; a Dagger and Bolts
  both hit the "armor-like" bucket ahead of the weapons check in the old if/else-if
  chain; a Heavy Flail landed under "potions, scrolls, healers kits"; Amulet and
  Arrow were listed in two conflicting buckets at once). Root cause: a hand-
  maintained list of baseitems.2da row numbers per category, incomplete and
  internally inconsistent. **Fix:** category now reads straight from baseitems.2da's
  own `StorePanel` column — verified live to be the exact 0-4 bucket index NWN's own
  toolset/engine already use (0 armor/shields, 1 weapons+ammo, 2 potions/scrolls, 3
  wands, 4 misc) — replacing the entire hand-maintained list rather than patching
  individual rows. **New check: `store_item_miscategorized`** (`verifyStore`) flags
  any store item whose current bucket disagrees with its own `StorePanel`, so this
  class of bug is now caught even for items added outside `create_store_blueprint`
  (direct placement, a different tool, hand-editing).
- **Found while fixing the above, same store system: embedded store items were
  read via a field named `InventoryRes`, which doesn't exist on them.**
  `create_store_blueprint` embeds the full resolved item struct (not a resref
  pointer) into each `StoreList` category's `ItemList` — its resref lives in
  `TemplateResRef`, the same field every other item struct uses. This silently
  returned `""` for every store item's resref in `get_store_details`'s summary
  (`src/tools/encounter-tools.ts`), the area/store inventory summary
  (`src/util/area-data.ts`), and `verifyStore`'s own resource-existence check
  (`checkResourceRef` in `src/util/verify/blueprints.ts`) — the latter meaning
  `verifyStore` had never actually resolved a single store item's resource ref
  against the module, in this project's history. Fixed at all three sites.
- **A Rogue was wearing Chainmail (Medium armor) with only Light Armor Proficiency**
  — see the `verify_all` placed-instance fix above; this specific instance is what
  surfaced it.
- **A non-combat Key NPC (a Barbarian who never fights, per the plot) had empty
  equipment and an unset `SoundSetFile`, rendering with no gear and a default voice
  that didn't match her `Gender`.** Not a checker gap — `empty_featlist` and
  `soundset_gender_mismatch` already fire correctly on a creature like this; the
  right fix was reclassing her onto the Commoner chassis (`CLASS_TYPE_COMMONER`,
  already documented above as the correct chassis for a creature that will never
  enter combat) and equipping real clothing, per the user's own suggestion.
- **A Halfling Rogue was equipped with a Rapier and had real, matching Weapon Focus/
  Specialization/Improved Critical feats for it — mechanically consistent, but
  thematically odd for the character.** Not a bug any checker should catch (a Rapier
  is a legal, proficient choice for a Rogue) — reflavored to Shortsword via
  `respec_weapon_feats` per the user's stated preference, a matter of taste rather
  than correctness. Worth noting for future NPC generation: `Kukri` (baseitems.2da
  row 42) needs Exotic Weapon Proficiency (feat 44), which a generic Rogue does NOT
  get automatically — it was the user's first-choice suggestion here but would have
  introduced a fresh `weapon_proficiency_mismatch` if equipped without also baking
  that feat; checked before picking a replacement instead of assumed.

**FOUND VIA A REAL LIVE-SERVER LOAD, FIXED, AND CLOSED WITH A STATIC CHECK
(2026-09-18) — a creature FeatList entry can be structurally well-formed
(a `word` field, a plausible-looking number) and still not be a real
feat.2da row at all, and nothing before this caught it.** Spun up
`~/nwn-mcp-verify-server` against "The Salt Gate Conspiracy" (the same module
this whole run of user-reported fixes was against) specifically to confirm
`verify_all` coming back clean actually meant something at the engine level
— and it immediately surfaced a real engine-level rejection at module load:
`CNWSCreatureStats::AddFeat() EXOWARNING: Invalid Feat FALSE`, from
`nwengineLog.txt`, with no creature/feat identity attached to the log line
at all. Traced by dumping every placed creature's and every blueprint's
`FeatList` to JSON and checking each `Feat` value against the real,
loaded `feat.2da`'s row count (1117 rows) — exactly one hit, out of every
creature in the module: `hos_cbenf` (a Cabal Boarding Enforcer) carried feat
**1848**. Root cause, confirmed immediately once found: 1848 is feat.2da row
115's own **`FEAT` column** — a TLK strref for that feat's display-name
string, `WeapFocWHam` (Weapon Focus: Warhammer) — not the row/feat ID
nwscript and the engine actually key on. Confirmed by the creature's own
equipment: `hos_cbenf` carries a real Warhammer (`nw_wblhw001`), so the
intent was unambiguous. Whatever built this FeatList read the wrong 2DA
column for at least this one entry. **Fixed** (feat 1848 → 115, both the
placed instance and the standalone blueprint). **Closed with a real static
check** so no future module needs a live-server run to catch this class of
bug: `verify_creature`'s new `invalid_feat_id` error
(`src/util/verify/blueprints.ts`) checks every `FeatList` entry against the
loaded `feat.2da`'s real row set (`index.twodaTables.get("feat").rows.has(...)`,
membership rather than a computed bounds check, so gaps in the table are
handled correctly too) — degrades to skip when `feat.2da` isn't loaded
(no `NWN_FOLDER_DATA`), never guesses. 3 new unit tests.
**Process note (historical — now automated, see below):** the recipe used to
find this bug was fully manual — copy the `.mod` into `server/modules/`, set
`NWN_MODULE` in `config/nwserver.env`, `docker-compose down && docker-compose
up -d` from inside the repo (so `${PWD}` resolves), grep the logs, tear the
container down again. **This whole loop is now a real MCP tool,
`run_live_verification`** (2026-09-19, `src/tools/verify-server-tools.ts`) —
see the "Live verification automation" entry below for the design and two
real bugs found building it. The manual recipe stays documented here as
fallback/reference, not as the recommended path anymore.

**Live verification automation — `run_live_verification`
(2026-09-19, `src/tools/verify-server-tools.ts`).** Automates the manual
recipe above end-to-end: repacks the currently-loaded module (or an explicit
`modulePath`), copies it into `MCP_FOLDER_VERIFYSERVER`'s `server/modules/`,
patches `NWN_MODULE=` in `config/nwserver.env`, `docker-compose down && up
-d`, polls the logs until either `expectedCheckLines` bracket-tagged lines
appear or log growth stalls for a few seconds after the module starts
loading, then **always** tears the container down (`try/finally` — a thrown
error or timeout never leaves it running). Returns a structured result:
`loaded`, `timedOut`, `engineErrors` (line + matched pattern),
`specResults.{ok,fail}` (parsed `[SPEC_OK]`/`[SPEC_FAIL]` lines),
`otherTaggedLines` (any other `[TAG_*]` line — this is how a future
instrumentation include's own tags, e.g. a `systest` module's
`[SYSTEST_DAMAGE]`, surface with zero extra parsing needed), and a bounded
`rawLogExcerpt`. Log parsing is pure/unit-tested
(`src/util/verify-server/result.ts`); the Docker orchestration itself is only
testable live (`src/tools/verify-server-tools.live.test.ts`,
`describe.skipIf` gated on the verify-server checkout existing).

**Four real, confirmed bugs found getting this working — none visible from
reading the manual recipe, all found by actually running it live:**
1. **`${PWD}` in `docker-compose.yml` reads the literal `PWD` environment
   variable, not `execFile`'s `cwd` option.** Node's `child_process.execFile`
   changes the child's real working directory without touching the inherited
   `PWD` env var, so docker-compose resolved `${PWD}` to whatever directory
   the calling process happened to inherit — sending it looking for
   `config/nwserver.env` inside the Q-nwn-mcp repo instead of the
   verify-server checkout. **Fix:** explicitly pass `env: { ...process.env,
   PWD: cwd }` on every docker-compose invocation.
2. **The log files truncate on every container restart — they do NOT append
   forever across runs**, contradicting an earlier exploration's untested
   assumption (recorded in an earlier draft of this same feature). Confirmed
   directly: a fresh `docker-compose down && up -d` produces a log containing
   only that session's lines, nothing from before. An offset recorded before
   `down`+`up` (to avoid misreading a stale prior run) was therefore *larger*
   than the new, truncated file, making every "read new bytes since offset"
   come back empty on every real run — the tool silently reported
   `loaded: false` despite the module loading correctly. **Fix:** read each
   log file's full current content on every poll tick instead of diffing
   against a pre-recorded offset; safe and cheap since these are small,
   single-session log files and `down` always precedes `up` in this tool's
   own flow.
3. **The MCP SDK's client-side default request timeout is 60s**
   (`DEFAULT_REQUEST_TIMEOUT_MSEC`) — a `timeoutSeconds: 90` budget (the
   original design) genuinely exceeded it: the server kept running to
   completion and tore the container down correctly, but the calling client
   gave up and reported the request as failed, with no way for the caller to
   know the server-side work actually succeeded. **Fix:** lowered the tool's
   own default to 45s (real headroom under 60s including down/up overhead),
   documented in the tool description that raising `timeoutSeconds` past
   ~50 only helps if the caller has also raised its own client-side request
   timeout.
4. **`EXOWARNING` is too broad as a default error-grep pattern** — even a
   totally minimal, freshly-created module emits one at startup (`"Filename
   passed contains an undefined alias"`), unrelated to any real defect.
   Dropped from `DEFAULT_ERROR_PATTERNS` (`invalid feat`/`error`/`exception`
   remain); still available as an explicit opt-in via the `errorPatterns`
   param for a caller who wants that strictness.

Also surfaced, not a tool bug but worth recording: `create_module`'s
generated `_start` stub area (see the "dead `_start` area" pitfall below) has
**no walkable interior tiles reachable via the standard 1-tile margin at all**
— `adventure_find_walkable` returns nothing for it, and even its own reported
`entryPosition` is `Nonwalk`. A live test needing a real placed, spawned
creature needs a real generated area (`create_area` +
`adventure_generate_layout` + `adventure_apply_layout`, same recipe
`comprehensive-module.live.test.ts` already uses), not the `_start` stub.

End-to-end confirmed working against the real bug this whole effort started
from: a creature built with `feats: [1848]` (the exact historical
`hos_cbenf` shape), placed and spawned in a real generated area, run through
`run_live_verification` — `engineErrors` correctly contains the "invalid
feat" line, `loaded: true`, `timedOut: false`, and the container is
confirmed torn down afterward (`docker-compose ps -q` returns nothing).

**`systest-module` skill + `create_systest_instrumentation` tool
(2026-09-19) — a small, disposable module purpose-built to exercise
nwn-mcp's own systems and prove `run_live_verification` catches real
problems.** `create_systest_instrumentation` (`src/tools/systest-tools.ts`,
`src/util/systest-log-script.ts`) generates `inc_systest_log`, the same
generator/probe-compile shape as `create_spec_verification`/
`create_random_abilities_system`: `SYSTEST_LogDamage(oCreature)`/
`SYSTEST_LogDeath(oCreature)`, chained onto `ScriptDamaged`/`ScriptDeath`,
log `[SYSTEST_DAMAGE] target=<tag> attacker=<tag> amount=<n>`/
`[SYSTEST_DEATH] tag=<tag> killer=<tag>` via the engine's own OnDamaged/
OnDeath event context (`GetLastDamager`/`GetTotalDamageDealt`/
`GetLastHostileActor`) — deliberately taking just `oCreature`, since
`ExecuteScript()` doesn't forward custom arguments to a chained wrapper.
Real-compiled and confirmed live (`src/tools/systest-tools.live.test.ts`).
`run_live_verification`'s `otherTaggedLines` field is what surfaces these
with zero extra parsing needed — this is the concrete connective tissue
between the two features.

The `.claude/skills/systest-module/SKILL.md` skill composes existing
primitive tools (never a new monolithic build-everything tool — matches
`adventure-actors`' own established pattern of composing primitives rather
than baking a fixed build into TypeScript) into a 10-NPC roster across two
minimal `tdm01` areas: one passing regression fixture per bug class fixed
this session (`weapon_focus_mismatch`, `ranged_feat_no_reload_support`,
`armor_proficiency_mismatch`, `ammo_stack_size_unreasonable` ×2,
`invalid_feat_id`, `store_item_miscategorized`), an opposed-faction melee
pair wired to the new logging instrumentation, and one Tier-1
(`SetMemorizedSpell`) + one Tier-2 (virtual-ability) caster fixture for
`create_random_abilities_system`. The caster fixtures need a real
`LevelUpHenchman()` leveling loop in their own `ScriptSpawn` wrapper before
calling `RA_OnSpawn` — reusing `SPEC_SelfTestOnSpawn`'s exact,
BioWare-precedented pattern — since a from-scratch `ClassList` only ever
yields cantrip-level spell slots until a real leveling call has actually
run (the documented Tier-1 timing finding under "Random caster abilities"
below). Never committed to this repo and never sent to the user as a
deliverable — purely a disposable diagnostic aid, rebuilt fresh by the
skill whenever needed rather than hand-patched.

**NPC-to-NPC dialog (`ActionStartConversation`) is built and has now
actually been run live** (fixtures #11/#12). Real result, settling the
previously-open question: `[SYSTEST_DIALOG_NODE] self=systest_dialog_npc_a
pcspeaker=NONE lastspeaker=NONE`, both occurrences. Two real findings, not
one:
- **`GetPCSpeaker()`/`GetLastSpeaker()` both return invalid in a genuine
  PC-less NPC-to-NPC conversation.** This project's own
  `nwscript-docs/GetPCSpeaker.md` (sourced from nwnlexicon.com) claims an
  NPC-to-NPC conversation makes `GetPCSpeaker()` "return the NPC who is the
  one who takes the conversation choices" — that did NOT happen here. Either
  that remark describes a different scenario (e.g. a PC present elsewhere in
  the module, or a different conversation mode), or it's simply wrong for
  this engine build. Trust the live result, not the inherited doc, for this
  specific case.
- **The dialog's own Action script runs with `OBJECT_SELF` = the
  *initiator* (`systest_dialog_npc_a`), not the conversation *owner*
  (`systest_dialog_npc_b`, the one with `conversation: "systest_dlg"` set).**
  This directly contradicts the design assumption written into this skill
  ("OBJECT_SELF there is the dialog owner"). Any future dialog-action-script
  design for an NPC-initiated conversation needs to account for this —
  `OBJECT_SELF` tracks whoever called `ActionStartConversation`, not whoever
  the `.dlg` file is attached to.

**Generalized runtime assertions beyond creature stats are also now built
and run live**: `create_spec_assertions` works exactly as designed —
confirmed by a real `[SPEC_OK]`/`[SPEC_FAIL]` round trip in this exact run
(see the faction finding below, which `SPEC_AssertBool`/`SPEC_AssertInt`
diagnosed cleanly). This closes item (5) of the Verification Gate's "what
should be built" list below.

**Major finding, NOT a bug in this project's code — a real NWN engine
limitation with `create_faction`:** fixture #8's encounter-design assertion
(`defenders_vs_hostile`) failed live, and chasing it down fully isolated a
genuine engine-level gap. In order:
1. `GetReputation(OBJECT_SELF, oOrc)` read back 100 (friendly) instead of the
   0 (hostile) written via `set_faction_reputation`. First hypothesis: the
   old `create_faction`/`set_faction_reputation` wrote reputation in only
   one direction despite claiming "bilateral" — confirmed and **fixed**
   (both now write/update both `(f1,f2)` and `(f2,f1)`).
2. Re-tested live: **still** read 100. Second hypothesis, found by diffing a
   freshly-written RepList entry against a real toolset-authored one: every
   pre-existing entry's `FactionRep` is GFF type `dword`; this project wrote
   `int`. Same mismatch found for `FactionGlobal` (`word` vs. the written
   `byte`). GFF struct fields are looked up by (label, type) together, so a
   same-label wrong-type field is invisible to the engine's loader — **fixed**
   both types.
3. Re-tested live with a *brand-new* faction (so the type fix applies to a
   genuinely fresh write, not an update — `modify_gff_field`/`setField` both
   confirmed to preserve a field's *existing* type even when told to set a
   different one, so already-written bad entries can't be patched in place):
   **still** read 100. Also tried `FactionGlobal` 0 and 1 explicitly: no
   change either way.
4. **Decisive control test**: paired the same Hostile-faction creature
   against a *different* creature on a pre-existing standard faction
   (Commoner, ID 2 — reassigned via `modify_gff_field` on the placed
   instance) instead of the dynamically-created one. `GetReputation`
   correctly read 0, confirmed by a real `[SPEC_OK]`. **This isolates the
   problem precisely**: `GetReputation()`/`GetIsEnemy()` work correctly for
   the five standard factions (PC=0, Hostile=1, Commoner=2, Merchant=3,
   Defender=4) that ship in every module by default. A **dynamically-added
   faction (ID 5+, via `create_faction`) never participates in live
   reputation lookups, no matter how correct its `.fac` data is** — not a
   direction bug, not a type bug, not the Global flag. Root cause not found
   (would need engine source or further NWNX-level investigation, not
   attempted this session) — recorded here as a confirmed, reproducible
   constraint, not a guess.
5. **Practical consequence for this project and `/create-adventure`:** don't
   create a new faction via `create_faction` when the goal is simple
   mutual-hostility/friendliness dynamics — **reuse one of the four
   pre-existing standard factions instead** (Hostile=1 already ships
   mutually hostile toward Commoner/Merchant/Defender; Defender=4 is already
   mutually hostile toward Hostile out of the box, confirmed in the real
   `.fac` data — a ready-made "good guys vs. Hostile" pair with zero setup
   needed). `create_faction` still has its place for a genuinely new faction
   *identity* a module needs to display/reference, but its live reputation
   behavior cannot currently be trusted — update `adventure-challenges`/
   `adventure-actors` guidance if either skill calls `create_faction`
   expecting the new faction to actually participate in combat AI hostility
   decisions.

Both real code bugs found along the way (bilateral direction, GFF field
type) are fixed and committed regardless of the deeper engine limitation —
they're objectively correct fixes (matching the toolset's own authored
convention) and `create_faction`/`set_faction_reputation` behave correctly
now for the one case that matters least to this finding: a human reading the
`.fac` file, or a tool like `verify_faction` checking it statically.

**Status: this is now a closed investigation, not an open gap.** The skill
has been run end-to-end for the first time, building a real roster and
running it through `run_live_verification` against a real headless engine.
Three real bugs were found and fixed (`compile_script` resource
registration, the log parser's timestamp-anchor, faction bilateral+type);
one genuine engine limitation was found, fully isolated via a clean control
test, and documented with its practical workaround; and the NPC-to-NPC
dialog question was settled with a real (if unexpected) answer. Re-run
`/systest-module` after any future change to these systems to re-confirm.

**A live isolated verification server exists and has run a real end-to-end check
successfully** (`~/nwn-mcp-verify-server` — a fork of
[`urothis/nwnxee-docker-template`](https://github.com/urothis/nwnxee-docker-template),
a real git repo, not outside one — see `docs/runtime-verification-spec.md` §1 for the
full setup and findings). `verify_*` can only check static GFF preconditions; this
closes the gap for behavior that only exists once the engine actually runs a script.
First real run, against "Henchman Gear Showcase" (the module whose bad-stats bug
report started this whole effort): 110 companions wired with `SPEC_*` vars, run
headless, grepped for `[SPEC_FAIL]` — caught the exact bug (empty `FeatList`,
`StartingPackage` stuck at 0) with zero human interaction. Reused again in the
`create_random_abilities_system` work (2026-09-10/11): found and confirmed a real
instruction-budget bug, verified the fix, and ran three separate NWNX experiments
against it (see `docs/random-abilities-runtime-findings.md` and
`docs/tfndev-random-npc-system-findings.md`) — this server's actual, demonstrated
purpose is exactly "spin up a real engine, load a module built by this project's
tooling, and observe what really happens," reusable for any future debugging session
that needs the same.
- **TODO (user-raised, 2026-09-11) — commit the server's own simplification.**
  `~/nwn-mcp-verify-server`'s `git status` currently shows uncommitted deletions
  (`config/db.env`/`grafana.env`/`influxdb.env`, the Grafana provisioning JSON/YAML)
  and modifications to `config/nwserver.env`/`docker-compose.yml` — a prior session
  already stripped the template's original Postgres+Redis+InfluxDB+Grafana stack
  down to the bare single-`nwserver` shape it actually runs as today, but never
  committed that simplification. Worth committing next time this server is used for
  real debugging, so the working, minimal configuration is the actual committed
  state rather than a perpetual uncommitted diff against the original template.
- **BUILT (2026-09-19) — the orchestration loop is now a real tool,
  `run_live_verification`.** Copying a generated module into the server's
  `modules/` folder, launching, polling for load completion, grepping, and
  tearing down is no longer done by hand — see "Live verification automation"
  below for the full design and the real bugs found getting it working.
  Feeding failures back into nwn-mcp's repair tools is still a human/LLM step
  (cross-reference a failing tag via `get_creature_details`/`resolve_blueprint`,
  fix via the normal typed tools, rerun) — that part was never meant to be
  automated away, only the mechanical launch/poll/grep/teardown cycle around it.
- `randspellbooks` (`~/tfndev/src/nss/inc_rand_spell.nss`) also still depends on
  NWNX and a persistent campaign database — out of scope for `inc_spec_check.nss`,
  which deliberately uses zero `NWNX_*` functions. See
  `docs/tfndev-random-npc-system-findings.md` for the fuller investigation into
  whether/how NWNX could be used from this project at all (conclusion: usable for
  research on this same verify server, confirmed workable for real experiments, but
  not something to adopt into shipped output without deliberate scope sign-off).

**TODO — what's script-verified today vs. what still relies on LLM self-report,
surveyed against a real large custom-adventure build** ("The Six-Fold Trial": a
single-PC + 5-henchmen module with bespoke mechanics — paired companion recruiting,
1gp hire cost, 6 skill-check-or-combat-fallback gates, a scripted web-ambush with a
destructible early-termination placeable, an orc-captain persuade-to-flee dialog, an
enemy that converts to a follower, per-area weather, a dual-path lockpick-or-destroy
gate). Verified today, real infrastructure: `verify_*` (static GFF structure),
`verify_quest_completability` (journal/dialog reachability), `check_area_connectivity`,
script compilation, and — when the live verify-server is actually stood up —
`SPEC_VerifyCreature`/`SPEC_SelfTestOnSpawn` for companion stat/appearance/feat/spell
correctness. **Not verified by anything, confirmed by direct experience building this
module — every one of these was either manually checked by the orchestrator (this
session) or simply trusted from a sub-skill's self-report:**
- **Runtime behavior of bespoke NWScript mechanics.** Whether the orc-captain's DC 15
  Persuade branch actually fires correctly, whether the web-ambush trigger applies a
  real 5-round effect and the destructible placeable actually cancels it early,
  whether a skill-check gate's combat fallback actually spawns/triggers on failure —
  all of this is "compiles + structurally present," never actually executed. The
  `SPEC_*` pattern only covers companion stats; nothing generalizes it to arbitrary
  custom quest/encounter scripts.
- **Encounter balance and composition tallying.** "Balanced for the PC and all 5
  henchmen" (an effective-party-size override from the default) was reasoned about
  by the LLM per-encounter, never computed by a tool. Nothing tallies "how many
  battles are humanoid," "does every fight have a caster," or CR-vs-effective-party-
  size automatically — a human (or the orchestrator) has to manually audit the
  built module against the numbered requirements. **The CR-vs-party-size piece is now
  closed** — see `get_balance_report`'s `partyLevel` param under "What should be
  built" (2) below. "How many battles are humanoid"/composition tallying beyond CR
  is still open.
- **Loot-drop runtime overrides.** `Lootable`/`Dropable` GFF flags are structurally
  checkable, but an `OnSpawn` script calling `SetLootable(FALSE)`/
  `SetDroppableFlag(..., FALSE)` at runtime silently wins and isn't caught by
  anything — a documented existing blind spot (see the `Dropable`/`Lootable`
  pitfall above), not new, but re-confirmed relevant here.
- **Cross-phase state coordination.** E.g. "the friendly recruit shouldn't be
  visible until the player has survived the encounter with their hostile
  counterpart" was passed as an instruction to one sub-skill's prompt and trusted
  from its self-report — nothing independently confirms the gating variable is
  actually read/written correctly on both ends.
- **Weather/area-property variance.** "Give each area different weather" is neither
  computed nor diffed — a sub-skill could set every area to the same values and
  nothing would catch it.
  **BUILT (2026-09-19) — resolved exactly along the lines this TODO called for: a
  real per-transition signal, not a raw adjacency diff.** A flat "flag identical
  weather on adjacent areas" check (see item 4 below) was rejected here as too
  naive — it would false-positive on two areas genuinely meant to share weather (a
  short walk, same climate) and miss cases where weather *should* differ. Fix:
  `adventure_create_transition` (the one mechanism `/create-adventure` actually
  uses for inter-area transitions) gained an optional `travelTime?: "short" |
  "long"` param, stored as an `MCP_TRAVEL_TIME` `VarTable` local on the transition's
  own light placeable (via `mergeVarTable()`, already used identically by
  `create_creature_blueprint`'s `varTable` param — no new storage mechanism) —
  `getVarTableString()` (`src/util/git-helpers.ts`) is the new read-side
  counterpart. `buildAreaTransitions()` (`src/tools/tileset-tools.ts`) surfaces it
  on `AreaTransitionInfo.travelTime`. A new `validate_module` check,
  `weather_variance_implausible` (`src/tools/analysis-tools.ts`, mirroring
  `cross_area_appearance_mismatch`'s existing cross-area pattern), warns only when
  a transition is explicitly marked `"short"` AND `ChanceRain`/`ChanceSnow`/
  `ChanceLightning` differ by more than 30 percentage points between the two
  areas. `"long"` and — critically — **unset** transitions (every one built before
  this feature, and the common case) are never flagged: this project's "skip
  rather than guess" convention, applied directly to close the exact gap this TODO
  raised, since the check only ever fires where a human explicitly said "this is a
  quick crossing."
- **This project's own MCP tool correctness.** The `get_area_creatures`/
  `list_creatures` stale-cache bug (see the pitfall above, found and fixed this same
  session) was caught by manual cross-checking against `get_creature_details`, not
  by any test — there's no meta-check that the tools' own read paths agree with each
  other or with ground truth.
- **Narrative distinctness** (five backstories actually being different, not
  near-duplicates) is inherently a judgment call, not realistically script-
  verifiable — noting it here for completeness, not as a gap to close.

**What should be built, roughly in priority order:**
(1) **BUILT** — a static analyzer that greps every placed creature's `OnSpawn` source
for lootable/droppable-overriding calls and cross-references against the GFF flags.
`validate_module`'s `onspawn_overrides_lootable`/`onspawn_overrides_droppable`
warnings (`src/tools/analysis-tools.ts`) — pure static analysis (regex over the
script's own source via `loadScriptSources`), no runtime server needed. Cannot trace
`ExecuteScript()` call chains into a different script.
**BUILT (2026-09-16) — the checker has a legitimate-exception path.** The user may
deliberately want to limit loot server-wide — including specific creatures the plot
means to leave non-lootable/non-droppable on purpose (a mook with nothing worth
taking, a boss whose real reward is scripted rather than a corpse drop). A placed
creature carrying a `LOOT_INTENTIONAL` local variable in its `VarTable`
(`create_creature_blueprint`'s `varTable` param — same mechanism as `HENCH_LEVEL`/
`SPEC_*`, merged into the blueprint before placement so it survives onto the placed
instance the same way, per the "VarTable is a separate copy" pitfall above) now
silences both `onspawn_overrides_lootable` and `onspawn_overrides_droppable` for
that creature entirely, instead of flagging both "silently overridden, unnoticed"
and "deliberately restricted, expected" the same way. Both warning messages now
name the fix directly. 3 new tests in `new-features.integration.test.ts` cover the
suppressed case (lootable and droppable) and confirm an unmarked creature still
flags normally.
(2) **BUILT** — `get_balance_report` now includes a per-area `composition`
block: class-count tally and a `casterPresent` flag, explicitly informational (a
caster is not a hard requirement — user-specified: "it does sometimes improve the
encounter mechanics and experience", so this is a note, never a warning/error). The
monster-type/humanoid-count breakdown from the original idea was dropped — no
reliable data source was found for "is this race humanoid" without guessing, and
this project's convention is to skip rather than guess. `effectivePartySize` param
adds a per-member CR figure when passed.

**BUILT (2026-09-17) — the CR-vs-effective-party-size gap this section originally
flagged is closed.** `get_balance_report`'s new `partyLevel` param adds a real D&D
3.5 Encounter Level (EL) difficulty read, in `src/util/encounter-difficulty.ts` — see
`docs/encounter-difficulty-findings.md` for the full research trail. Two things
needed real verification before this could be built (this project's own
"never guess" rule), both sourced rather than assumed:
- **The EL combination formula for identical creatures** — confirmed via a literal
  DMG quote surfaced through search ("two creatures of the same CR = EL+2", from the
  real "Table 3-1: Encounter Numbers"), matching `adventure-challenges/SKILL.md`'s
  own already-stated rule. Primary sources (d20srd.org, d20pfsrd.com, dandwiki.com,
  pathfinder.d20srd.org, web.archive.org, giantitp.com) all blocked automated
  fetches, so the exact table came from cross-validating two independent
  secondary-source tables against each other and against the confirmed DMG quote —
  both are reproduced exactly by `combineSameCREL()`'s closed-form formula
  (`cr + round(2 * log2(count))`). **Scope limit, stated plainly in the code and the
  tool's own output**: only verified for same-CR groups — a mixed-CR group is
  reported as one EL per CR cluster, not collapsed into a single fabricated number,
  since the real DMG mixed-group combination rule wasn't found through any
  accessible source.
- **A real fallback for creatures with `ChallengeRating` unset (0)** — the
  `create_encounter_blueprint` CR-hardcoded-to-0 gap this section already
  documented (`encounter_cr_unset`). Per the user's direction, verified against 505
  real creature blueprints from `~/tfndev/src/utc/` (a mature, actively-played PW,
  every one carrying a real human-assigned CR — not this project's own guess):
  CR ≈ total character level almost exactly, mean(CR−level) within ±0.3 of zero for
  every one of the 11 base classes across the reliably-sampled level 1-11 range
  (n=17-104 per class). `estimateCRFromLevel()` is that correlation; the tool's
  output flags `crEstimated: true` on any cluster where it was used rather than
  blending estimated and real CR silently.
- Difficulty bands (`trivial`/`easy`/`standard`/`hard`/`deadly`) use this project's
  own two documented anchors from `adventure-challenges/SKILL.md` (EL=APL is
  standard, EL=APL+4 is deadly/boss-only) — the same file the user's "never guess"
  discipline was already being followed in before this tool existed, just not
  computed anywhere.
- Filtered to Hostile-faction (1) creatures only — the previous `crStats`/
  `perPartyMember` figures counted every creature in the area regardless of
  faction, which would inflate difficulty with a friendly NPC's CR.
- **Per-area, not per-fight, and said so in the output**: this pipeline places
  hostiles individually rather than via Encounter blueprints
  (`adventure-challenges/SKILL.md:380` explicitly avoids them for "precise tactical
  control"), so there's no formal grouping of which creatures in an area are meant
  to fight together at once. The difficulty block is an upper bound — "if everything
  here converged" — not a claim about any specific simultaneous fight. Spatial
  clustering (grouping hostiles by proximity into separate encounter estimates)
  would need its own real design pass; not attempted here.
- 12 new unit tests (`encounter-difficulty.test.ts`) plus 3 new integration tests
  (`new-features.integration.test.ts`) covering same-CR clustering, the estimated-CR
  fallback and its flag, non-Hostile exclusion, and the no-`partyLevel` no-op case.
(3) **BUILT** — a door/gate dual-path checker. `verifyDoor`'s `door_leads_nowhere`
warning (`src/util/verify/blueprints.ts`), extended per user spec: a real lock/key
obstacle (`Lockable` + `OpenLockDC>0` or `KeyRequired`) should be wired as a
transition (`LinkedToFlags != 0`) or have at least one Waypoint in the same area
marking a destination — advisory only, since a deliberate dead-end gate the plot
never means to open is a legitimate design choice. Only runs when verifying a placed
instance (`area`+`tag` passed to `verify_door`), not a standalone blueprint, since
"leads somewhere" is meaningless before the door is placed. Note: this checks
*lock/key obstacle → real destination*, not "sane `OpenLockDC` AND real breakable HP
with `Plot` unset" as originally scoped — that formulation conflated normal
door-breakability (true of nearly every door by default) with the actual concern
(does this obstacle lead anywhere), so the check was redesigned around the latter.
(4) **BUILT (2026-09-19)** — see the weather TODO above: `weather_variance_implausible`,
gated on an explicit `travelTime` signal rather than a flat adjacent-area diff.
(5) **BUILT (branch `systest-live-run-and-generalized-spec`)** — the `SPEC_*`
runtime-verification pattern is now generalized beyond companion stats to
arbitrary custom quest/encounter scripts: `create_spec_assertions` generates
`inc_spec_assert.nss` (`SPEC_AssertInt`/`SPEC_AssertString`/`SPEC_AssertBool`),
the same `[SPEC_OK]`/`[SPEC_FAIL]` log protocol, usable from any script —
not just `SPEC_VerifyCreature()`'s fixed creature-stat field set. A bespoke
mechanic (a scripted web ambush, a custom encounter spawn script, a quest
condition script) can now assert its own pass/fail the same way, and
`run_live_verification` picks it up with zero parser changes. See
docs/runtime-verification-spec.md §4/§5 and the systest-module skill's
fixture #8 for a concrete non-creature-stat example (asserting real engine
faction hostility via `GetIsEnemy`). (1)-(4) are pure static analysis,
buildable without the live verify-server; (5) needed it and now has it —
**still pending a real end-to-end live-engine confirmation run** (see the
"Known gap" paragraph above the systest-module skill description).

**TODO (user-raised, 2026-10-05) — an "encounter composer": role + target
difficulty → a built, balanced roster, on both sides of the fight.** The
user's stated goal: an LLM should be able to say "I need a necromancer for a
CR 6 battle against the PC(s) and their party" and get back the necromancer
plus whatever additional NPCs either side actually needs, already built,
geared, and difficulty-checked — not hand-orchestrate `build_npc_stat_block`
→ `equip_npc_by_role` → manual `get_balance_report` trial-and-error → repeat.
Fully planned, nothing implemented, in `docs/encounter-composer-spec.md`:
an archetype library mapping role names to class/feat/spell/equipment
recipes (NWN has no literal "Necromancer" class), a reverse-EL solver
extending `encounter-difficulty.ts`'s existing same-CR combination math to
solve for "how many support creatures closes this EL gap" instead of only
auditing a built encounter, a support-roster chooser, an optional ally-side
reinforcement check, and the `compose_encounter` tool that ties them
together. Open question flagged in the doc, not yet confirmed with the
user: whether "CR 6" means the whole fight's Encounter Level against the
full party (recommended default) or the named boss's own pinned CR with
escorts added on top regardless of resulting EL.

**User-corrections-turned-into-rules (2026-10-13, three real bugs reported
from an actual build — the Rogue/armor and spell-related two closed with
real script-enforced checks per this project's own established "corrections
become rules validated by script" discipline, the third a documentation-
only area-sizing preference).**

- **A Rogue was equipped with armor above AC bonus 3 (only Light Armor
  Proficiency, feat 3, from its automatic class feats) via
  `set_creature_equipment`, with zero warning.** `verify_creature`'s
  `armor_proficiency_mismatch` check already existed and already catches
  this — the real gap was upstream, at the WRITE path. `equip_npc_by_role`
  already checked proficiency before equipping (weapon ReqFeat0-4, armor
  tier via `armorTierFeat`); the lower-level `set_creature_equipment` —
  called directly by plenty of skills, not just through
  `equip_npc_by_role` — never did, checking only the `EquipableSlots`
  bitmask. **Fix:** extracted the shared check into
  `checkEquipProficiency()` (`src/util/verify/blueprints.ts`, the same file
  `armorTierFeat`/`REQ_FEAT_COLUMNS` already lived in) and wired it into
  both tools, so there is exactly one place this logic can get wrong.
  `set_creature_equipment` gained the same `force:true` override
  `equip_npc_by_role` already had (default: skip the mismatched item,
  report why, in `failed`). New regression test in
  `new-features.integration.test.ts` reproduces the exact Rogue/AC-bonus-4
  shape.
- **A boss composed via `compose_encounter` (F6) had no clothes and no
  spells.** Root cause: F6's original implementation called
  `buildCreatureBlueprint` with only `classes`/`race`/`appearance`/`gender`
  — no `feats`, no `equipment`, no `spells`. Every composed boss shipped
  with an empty `FeatList` (no proficiencies, no racial/class feats at all)
  and nothing equipped. **Fix**, in `encounter-composer-tools.ts`: the boss
  now gets a real stat block from `buildNpcStatBlock` (ability scores,
  `FeatList`, HP, `StartingPackage`) before the blueprint is built, is
  equipped with baseline clothing (`nw_cloth001`, AC bonus 0, needs no
  proficiency — the same "give every companion clothing, even with no
  mechanical property" rule `adventure-actors/SKILL.md` already states for
  companions, generalized here), and — for an archetype whose class
  `create_random_abilities_system` supports — gets a spawn-script wrapper
  chaining `RA_OnSpawn` (and, for Tier 2 classes, an end-round wrapper for
  `RA_OnEndRound`) automatically, reported as `placed.boss.spellsWired`.
  **Honestly caveated, not overclaimed**: this boss's `ClassList` is set
  directly rather than through a live `LevelUpHenchman()` call (there's no
  recruit event for a hostile boss), so per this project's own confirmed
  finding ("Random caster abilities" → "Tier 1 real-runtime findings" item
  2 above) `SetMemorizedSpell()` only ever populates cantrip-level slots on
  a never-leveled creature — `spellWiringWarnings` says this plainly. Still
  closes "zero spells" → "at least cantrips," the bug that actually shipped.
  New regression test in `encounter-composer-placement.integration.test.ts`.
- **Separately, while fixing the above: `build_npc_stat_block` could ship a
  spellcasting-class NPC with no spells anywhere and never say so, and its
  `ClassList` write was a blind overwrite that would have silently dropped
  any spells already baked onto an existing entry's `MemorizedList0-9`
  fields** (the documented static-spell-baking GFF format) **had one been
  present before the call.** The second half was never observed to
  actually happen, but is a real, confirmed-possible mechanism — this tool
  runs on an *existing* blueprint per its own docs, and nothing stopped a
  caller from baking spells first and running this second. **Fix:** the
  `ClassList` write now merges onto any existing entry for the same class
  (preserving every field but `Class`/`ClassLevel`) instead of replacing
  the list outright, and the tool now returns a `warnings` entry naming the
  exact fix (`spells` param, or `create_random_abilities_system`) whenever
  its target class is one of the 7 real caster classes and the blueprint
  ends up with no spells anywhere (`SpecAbilityList` empty and no
  `MemorizedList*` entries) after the call. Two new tests in
  `npc-tools.integration.test.ts` cover the warning and the merge-preserves-
  spells case — this is the most likely real cause of a separately-reported
  "Venn had no spells memorized" bug, a non-companion Key NPC built this
  way.
- **Home interiors were being built at tavern/shop scale (the general
  `tin01`/`tni01` p90 ≈ 60 tiles) instead of a tighter, deliberately
  lived-in scale.** Not a code bug — a missing distinction in
  `area-city-interior/SKILL.md` between a personal residence and a public
  interior (inn/tavern/shop), which the corpus data never separated out.
  **Rule added:** a home interior (Living room/Kitchen/`Home*` dwelling) is
  capped at 3×4 tiles (12 tiles) per floor; multi-room houses stack floors
  via `StairsUp`/`StairsDown` rather than growing one oversized footprint.
  **Castle interiors (`tic01`, `area-castle`) are explicitly exempt** — a
  castle's halls/jails/baileys legitimately exceed any size cap this skill
  states.

**Two more user-corrections-turned-into-rules from the same session (2026-10-13),
both root-caused to real generation logic rather than one-off mistakes.**

- **"Thug fighters have 18 strength. Elite stat array should be the highest
  stats unless the creature is a boss."** Two independent, real mechanisms
  could both produce this, so both are fixed:
  1. `build_npc_stat_block`'s point-buy allocator (`npc-stat-block.ts`) was
     greedy — for any band above `"elite"`, it maxed the primary ability all
     the way to 18 before spending anything on the rest, instead of
     producing a curve shaped like the Elite Array. **Fix:** the allocator
     now scales the Elite Array's own real point-buy cost (exactly 25 —
     8+6+5+4+2+0) by the requested budget's ratio, preserving its
     descending shape instead of spiking one stat: `"standard"` (budget 25)
     now reproduces the Elite Array exactly; `"low"` (15) scales below it;
     `"tougher"`/`"epic"` (32/36) scale above it without ever leaving every
     other stat at the floor. 4 new tests in `npc-stat-block.test.ts` pin
     the exact resulting arrays per band. `build_npc_stat_block`'s own
     `powerLevel` param description and `adventure-actors/SKILL.md` now
     also say plainly that `tougher`/`epic` are for a genuine boss, not an
     ordinarily-named mook.
  2. **Separately, independent of that tool entirely**: `adventure-
     challenges/SKILL.md`'s own hand-authored Minion/Standard/Elite/Boss
     Primary Stat ranges let a non-Boss tier's Primary Stat climb past 15
     as target level increased (e.g. "Elite" tier reached 16-20 depending
     on bracket) — a "Thug" tiered Standard or Elite (not Boss) under this
     table could land on 16-18 directly, with no code involved at all.
     **Fix:** every Minion/Standard/Elite row across all three level
     brackets is now capped at Primary Stat 15 (Elite Array's own
     ceiling) — Elite tier settles at a flat 15 instead of continuing to
     climb with level; difficulty still escalates via CR/HP/secondary
     stats/Natural AC. Boss rows are unchanged — they already correctly
     exceeded 15 at every bracket.
- **"Expanded Weapon feats are not something a non-fighter should be given.
  Giving the 'Martial Weapon' feat is acceptable, but not 'Weapon Focus' or
  'Improved Critical' feats for non-melee creatures."** `build_npc_stat_block`'s
  shared generic/bonus-feat-slot candidate queue included the class's
  preferred weapon's Focus/Specialization/Improved Critical tier for
  *every* class — including the universal "every character gets one generic
  feat at level 1" slot every race/class has, so a Wizard or Cleric could
  pick up a per-weapon investment feat that makes no sense for it. Basic
  proficiency (Martial/Simple/Exotic Weapon Proficiency, from the automatic
  class-feat table — a different, unaffected code path) was never the
  problem, matching the user's own distinction. **Fix:** the Focus/
  Specialization/Improved-Critical trio is now only added to the candidate
  queue for Fighter (`WEAPON_INVESTMENT_CLASS_IDS`, currently `{4}`) — every
  other class's generic/bonus slots fall through to the universal filler
  (Toughness/Cleave/Dodge) instead. New regression test in
  `npc-stat-block.test.ts` confirms a Cleric never receives these three
  feats and that its slots are filled by the fallback set instead.

**Three further user-specified generation rules (2026-10-13), each paired with a
`verify_creature` check so a violation is caught after the fact too, not just
prevented at generation time — per the user's own explicit request ("there should be
scripts to verify these rules after the creature is generated").**

- **"Creatures can have their most important stats be above 15, but must be achieved
  through stat increases from leveling up from a base stat of 15."** The point-buy
  curve-shape fix two entries above still let `tougher`/`epic` push the PRIMARY
  stat's base directly past 15 (17 in the worked example) — exactly what this rule
  forbids. **Fix:** every point-buy-derived stat (`npc-stat-block.ts`) is now clamped
  to 15 before racial adjustment or the existing level-based increase (+1 to the
  primary ability every 4 levels) is applied — those two remain the only sanctioned
  ways to exceed 15. Secondary stats still scale with the band (e.g. `tougher`'s
  secondary stats reach 14, above Elite Array's own 13 for that rank) — the clamp is
  specific to the primary ability, matching "most important stat" in the user's own
  wording. **New verify check: `ability_score_base_exceeds_elite`** — reconstructs
  the pre-racial, pre-leveling base (actual stat minus racial adjustment minus
  `floor(totalLevel / 4)`) for a single-class creature and warns if it's still above
  15, naming `build_npc_stat_block` at `powerLevel: "elite"` as the fix. Skipped
  (never guessed) for multiclass, where this project's generation side doesn't
  resolve a single PrimaryAbil anyway.
- **"NPC Feats should concentrate on feats for their class, not weapons if not a
  melee class like fighter, barbarian, Ranger, or prestige melee classes."** Widens
  the Fighter-only restriction above to the user's actual named set.
  `WEAPON_INVESTMENT_CLASS_IDS` moved to `npc-weapon-preferences.ts` (shared by both
  the generator and the new verify check below, so they can't drift apart) and
  expanded to `{0, 4, 7}` (Barbarian, Fighter, Ranger). **Paladin (6) is deliberately
  NOT included** — a strong melee class in this ruleset, but not one the user's own
  list named, so it stays out until that's confirmed rather than assumed. "Prestige
  melee classes" are a documented gap, not guessed in — their classes.2da row IDs
  vary by HAK/installation. **New verify check: `weapon_feat_non_melee_class`** —
  the same baseitems.2da reverse-scan `weapon_focus_mismatch` already uses, but
  triggered by class membership instead of equipped-weapon mismatch: any Weapon
  Focus/Specialization/Improved Critical on a class outside that set is flagged
  regardless of what's equipped, since the problem is the feat's existence on a
  non-melee build, not which weapon it points at.
- **"Feats granted should be constrained to required feats for low level NPCs, or
  NPCs that shouldn't have class levels, like Warriors or low level minions or
  commoners."** The existing `complexity: "simple"` tier (see the "simple NPC tier"
  entry elsewhere in this doc) only ever skipped the PC-style bonus-feat-slot
  advancement chain — it still filled the universal generic feat slot(s) with the
  same curated filler (Toughness/Cleave/Dodge, or a weapon-investment tier) a full
  PC-progression character gets. That filler exists as this project's stand-in for a
  tabletop player's free feat choice — exactly the thing a minion/commoner/low-level
  background NPC has no business making. **Fix:** `complexity: "simple"` now skips
  BOTH the generic and bonus feat-slot filler, leaving only racial + automatic class
  feats (the mechanically required set) — updated doc comments on the `complexity`
  param reflect this. No new verify check: an NPC correctly built this way is
  structurally identical to a legitimately low-feat creature, so there's nothing
  distinguishable to check for after the fact without a new tagging convention this
  session didn't add (see "what else can we verify" below for why this one is
  harder than the other two).

**Follow-up (2026-10-13), three more user corrections, all closed:**

- **Paladin (6) added to `WEAPON_INVESTMENT_CLASS_IDS`.** Now `{0, 4, 6, 7}`
  (Barbarian, Fighter, Paladin, Ranger) in `npc-weapon-preferences.ts`, shared by
  generation and `weapon_feat_non_melee_class` alike. "Prestige melee classes" are
  still a documented, un-guessed gap (their row IDs vary by HAK).
- **Multiclass ability-score reconstruction, resolved rather than skipped.**
  User-confirmed: the level-based ability increase count is always based on TOTAL
  character level across every class combined, at 4th/8th/12th/16th/20th — the same
  rule for multiclass as single-class. `ability_score_base_exceeds_elite` no longer
  skips multiclass: it checks every distinct class's `PrimaryAbil` as its own
  candidate, each independently given the full benefit of every level-based
  increase (the genuinely unresolvable part — which ability a real player would
  have put each increase into — isn't tracked anywhere, so this is the most
  generous assumption rather than a guess; a candidate still over 15 even with every
  increase credited to it is a real violation no matter which ability actually got
  them). Two new tests cover a shared-primary-ability multiclass creature and a
  two-different-primaries one (each checked independently).
- **"Add the verifications that make sense."** Built three of the five surveyed
  candidates from the previous entry, all single-class-only (multiclass HP/skill
  points depend on which class each individual level was taken in, not
  reconstructable from the final `ClassList` — skipped rather than guessed, unlike
  the ability-score case above which had a real resolving rule):
  - **`hp_formula_mismatch`** — `HitDie` max at level 1 + Con mod, then
    average-rounded-up per level after, same formula `build_npc_stat_block` itself
    uses, compared against the actual `MaxHitPoints`.
  - **`skill_points_formula_mismatch`** — `(SkillPointBase + Int mod + racial
    ExtraSkillPointsPerLevel)` per level (×`FirstLevelSkillPointsMultiplier` at
    level 1), capped at `classSkillCount × (level + 3)` the same way the
    generator's own round-robin spend caps out, compared against `SkillList`'s
    actual total ranks.
  - **`starting_package_mismatch`** — generalizes `henchman_no_package` (which only
    ever caught the narrow "stuck at 0" case, and only for henchmen) to the full
    `packages.2da` row-equals-classId convention, for any single-class creature.
  All three reuse `tableFromConstantColumn` (newly exported from `npc-stat-block.ts`
  rather than duplicated) and are tested with both a flagged and a clean case.
  **Deliberately not built**: the "simple NPC" tagging-convention gap and the armor
  purchase-order economics check — both still need a real design decision (a new
  `VarTable` convention; real wealth-budget math at verify time) rather than being a
  quick, mechanically-checkable addition like the three above.

**First real-module application of all the above (2026-10-13) — "The Hollow
Communion" — found one real false-positive bug class and one real tool gap,
both fixed; every genuine violation the new checks found was then actually
repaired in the module, not just reported.**

- **FOUND AND FIXED — `hp_formula_mismatch`/`skill_points_formula_mismatch`/
  `starting_package_mismatch`/`ability_score_base_exceeds_elite` all
  false-positived on non-PC "classes."** `classes.2da` has real rows for
  `Animal` (12), `Outsider` (24), and `Commoner` (20) — all `PlayerClass=0` —
  used for exactly the creatures you'd expect (a Dog, two Chickens, two
  Quasits, a Hound, two Commoner-chassis villagers). None of the PC-style
  formulas these checks compute apply to them: a Commoner's `HitDie=4`
  average-progression isn't how the toolset actually hands out HP for a
  background NPC, and `packages.2da`'s rows are themed sub-archetype
  packages for the 11 *real* PC classes (row 20 is "Cleric_DeadWalker",
  `ClassID` 2 — nothing to do with `CLASS_TYPE_COMMONER` being numbered 20
  too) — the row-equals-classId convention only ever held for each class's
  own iconic package, rows 0-10. **Fix:** all four checks now skip a class
  row with an explicit `PlayerClass=0`; missing `PlayerClass` data (an older
  test fixture, or a table loaded without that column) still behaves exactly
  as before — this is an exclusion on a confirmed "no," not a requirement
  for a confirmed "yes," so nothing already-correct regressed. 2 new tests.
- **FOUND AND FIXED — no tool existed to do what `weapon_feat_non_melee_class`
  and `invalid_feat_id` both name as their own fix ("remove the feat").**
  `respec_weapon_feats` always re-adds a matching feat for a replacement
  weapon (`toBaseItem` is required) — the wrong shape when a feat simply
  shouldn't be on that class at all. **New tool: `remove_feats`** (resolves a
  blueprint or placed instance exactly like `respec_weapon_feats` does, takes
  a JSON array of feat ids, removes them, adds nothing). 2 new tests.
- **Real violations found and fixed in the module itself**, confirming the
  new rules against a module an earlier session had already built and
  shipped: 5 creatures (`hos_thug1`/`hos_thug2`/`hos_cult2` at Str 18,
  `hos_thug3`/`hos_cult1` at Dex 18 — all Fighter/Rogue mooks, the literal
  "Thug fighters have 18 strength" bug reaching an already-built module) had
  their primary ability clamped to 15 via `modify_gff_field` on both the
  standalone blueprint and the placed GIT instance (a separate copy each,
  per the existing "separate copy" pitfall — both needed the edit). 5
  creatures (`boss_venn` the Cleric, `elowen` the Wizard, `elya` the Cleric,
  `hos_cult1`/`hos_thug3` the Rogues) had a Weapon Focus/Specialization/
  (Improved Critical for `boss_venn`) tier removed via the new `remove_feats`
  tool, on both copies each. **`boss_venn`'s `caster_no_spells` was the real,
  literal "Venn had no spells memorized" bug** — his `ScriptSpawn` was still
  the stock `nw_c2_default9`, with no `create_random_abilities_system` wiring
  at all (unlike `elowen`/`elya`, both companions whose `a_hen_join` already
  correctly called `RA_OnSpawn` post-leveling — their `caster_no_spells` is
  the documented, expected static-check false positive, not a real bug).
  Fixed with a new `a_venn_spawn` wrapper (chains `nw_c2_default9`, then
  `DelayCommand(0.5, RA_OnSpawn(OBJECT_SELF))`), wired onto both copies —
  same honest caveat as the `compose_encounter` boss fix: Venn's `ClassList`
  was set directly rather than through a live `LevelUpHenchman()` call, so
  per the confirmed Tier 1 finding this only ever rolls cantrip-level slots,
  not a full Cleric spellbook. Also set `Mod_Description` (was empty) with
  real, non-guessed practical info pulled from the module's own `adventure.md`
  sidecar (target level 3, party size 4, 3 companions, ~2-3hr).
- **Left alone, deliberately**: `store_item_miscategorized` on `str_mira` (a
  medkit in the wrong `StoreList` category) — a real, pre-existing finding,
  but unrelated to this session's new rules and with no existing fix tool
  (moving an item between `StoreList` categories needs a list-level edit
  `modify_gff_field` refuses, and no dedicated store tool exists yet, unlike
  `remove_feats` for feats). Noted rather than built, since it's a one-off,
  not a pattern this session's actual ask touched.
- **Confirmed, the hard way, why restart discipline matters mid-session**:
  calling `load_module` again (forced by an MCP server restart needed to
  pick up the `remove_feats`/`PlayerClass`-gate code changes) silently
  reverted 10 just-applied `modify_gff_field` edits that had never been
  repacked — the exact "never call `load_module` between an edit and its
  repack" pitfall, triggered by a restart requirement rather than a mistaken
  manual call. All 10 edits were simply redone immediately after, with
  nothing else touched in between this time, and `repack_module` was called
  as the very last step with no further edits following it.

**Live-playtest follow-up on the same module (2026-10-13) — four more user
reports from actually playing the fixed build. Two real, fixed bugs; one
significant architectural finding surfaced but deliberately not acted on
without confirmation; two reports that don't match any creature this
module actually has, as built.**

- **FIXED — a dismissed henchman could offer to rejoin, play the "I'm with
  you" line, and then never actually follow.** Two real, independent bugs in
  the shared `a_hen_join`/`a_hen_leave` scripts (used by every companion —
  the fix applies to all of them with no per-creature wiring needed):
  1. `a_hen_leave` (dismiss) incremented nothing, but also never *decremented*
     `HC_HENCH_COUNT` — the module-level "how many companions have been
     recruited" counter `a_hen_join` checks against the 3-companion party
     cap. Dismissing and recruiting enough times to reach 3 total joins in a
     playthrough permanently blocked every future recruit or rejoin, even
     with the party well under its real cap. **Fix:** decrement on dismiss,
     floored at 0, so the counter tracks "currently recruited" rather than
     "ever recruited."
  2. `a_hen_join` called `AddHenchman()` but never explicitly told the
     associate AI to follow. `a_hen_follow`/`a_hen_stay` (the in-dialog
     "Stay close"/"Hold this position" options) both work by sending a silent
     shout (`HENCHMAN_CMD_FOLLOW`/`HENCHMAN_CMD_STANDGROUND`) that the stock
     associate AI listens for — a plain local-variable state that
     `RemoveHenchman` does **not** reset. A companion dismissed while
     standing-ground, then re-recruited, had no reason to ever leave that
     state: nothing re-sent the follow shout. **Fix:** `a_hen_join` now sends
     `HENCHMAN_CMD_FOLLOW` right after `AddHenchman`, the same way
     `a_hen_follow` does — every (re)join now starts in a known, explicit
     follow state regardless of whatever stand-ground state carried over
     from before dismissal.
- **SIGNIFICANT FINDING, NOT YET ACTED ON — this module's companions never
  actually go through a real incremental `LevelUpHenchman()` pass, which
  likely means the documented "Cleric/Druid/Paladin/Ranger companions get a
  full multi-level spellbook" finding (under "Random caster abilities" below)
  does not actually apply to companions built the way this module's are.**
  `a_hen_join`'s leveling loop is `for (i = GetHitDice(oHenchman); i <
  nTargetLevel; i++) LevelUpHenchman(...)` — it only runs levels the
  creature hasn't "reached" yet. But `build_npc_stat_block` (and
  `create_creature_blueprint`) write `ClassList` directly to the creature's
  final intended level, not level 1 — confirmed directly: `elowen`/`elya`'s
  blueprints carry `ClassLevel: 3` *and* a `HENCH_LEVEL` VarTable local also
  set to `3`. `GetHitDice()` on such a creature already reports 3, so the
  loop's condition (`i < nTargetLevel`) is false from the very first
  check — **the loop never executes a single real `LevelUpHenchman()` call,
  for any companion built this way.** The companion was never "leveled" by
  the function at all; its `ClassList` level was simply asserted directly at
  build time. This means a companion caster is in the *exact* same
  never-really-leveled position as `boss_venn` (built the same way, with no
  recruit event at all) — the confirmed Tier 1 structural limitation
  (`SetMemorizedSpell`/`GetMemorizedSpellCountByLevel` returning 0 for any
  spell level the engine never saw a real level-up event grant) would apply
  to `elya` (Cleric) exactly as much as it applies to a Wizard, contradicting
  the earlier finding that Cleric/Druid/Paladin/Ranger are exempt from the
  cap — that finding was established against a *different* test setup (a
  companion blueprint that genuinely started below its `HENCH_LEVEL` and so
  exercised the loop for real), not against how this project's own
  `build_npc_stat_block`-based companion recipe actually builds a blueprint.
  **Likely, but not confirmed, explanation for "not all spell slots are
  filled on all caster NPCs."** **Deliberately not fixed yet**: forcing the
  loop to run for real needs the blueprint's `ClassList` to start below
  `HENCH_LEVEL` (e.g. level 1) — but `LevelUpHenchman()` also auto-spends
  skill points per level gained, and this creature's `SkillList` already
  carries the *final* level's full spend (computed by `build_npc_stat_block`
  for level 3 directly) — rewriting `ClassList` to level 1 without also
  resetting `SkillList` risks the per-level LevelUpHenchman pass *adding*
  more skill points on top of an already-fully-spent list, double-counting
  them. This needs a real design decision (does `build_npc_stat_block` need
  a "pre-level" mode that writes everything *except* `ClassList` at the
  final level, specifically for companions meant to go through this join
  flow?) and live confirmation before being applied retroactively to an
  already-played module, not a same-session guess.
- **Two reports that don't match anything this module actually has, as
  built — flagged back to the user rather than guessed at.** (1) "The Road
  Thug caster has no spells and no clothes": all 3 `forest_ambush` Road
  Thugs are Fighter (`hos_thug1`/`hos_thug2`) or Rogue (`hos_thug3`) — none
  casts spells, confirmed against both the live `ClassList` and
  `adventure.md`'s own design intent ("mundane human thugs"). (2) "One
  'lesser cultist' wears no clothes": `hos_cult1` and `hos_cult2` (the only
  two creatures named "Lesser Cultist," in `grayward_hall`) were checked
  byte-for-byte via direct GFF parsing (not grep, which produced a false
  positive mid-investigation when a struct boundary was misjudged by eye —
  worth remembering as its own lesson: never trust a manual line-range grep
  over actually parsing nested GFF JSON) — both carry a complete, valid 18
  of 18 `ArmorPart_*` fields on their Chest item, identical in shape to each
  other and to every other creature wearing the same two base-game armor
  pieces (`nw_aarcl004`/`nw_aarcl005`) elsewhere in this module. The specific
  model files for both creatures' exact variant numbers were confirmed to
  exist for both genders in the base game key table (`pfh0_chest030.mdl`/
  `pmh0_chest030.mdl`, `*_chest032.mdl` likewise) — ruling out a missing-mesh
  explanation too. No structural cause found from data alone.

**Second playtest round on the same module (2026-10-13) — the spell-slot
finding above is now CONFIRMED (not just "likely"), a real journal-timing
bug was found and fixed, and a much bigger armor finding surfaced than the
one originally reported.**

- **CONFIRMED — "not all spell slots are filled" is exactly the never-really-
  leveled-ClassList mechanism flagged above, not a guess.** User-reported
  exact numbers match the mechanism precisely: Elowen (Wizard) has 1 empty
  slot at both 2nd and 3rd level; Elya (Cleric) has 2 empty slots at both —
  both are `nSlots`/`nEngineSlots` mismatches, confirmed by re-reading
  `inc_random_abil.nss`'s own `RA_RollClass`: `nPick` is capped to
  `min(nSlots, nPoolSize, nEngineSlots)`, and `nEngineSlots =
  GetMemorizedSpellCountByLevel(...)` — the exact value this project
  already confirmed reports 0 (or less than the 2DA says) for a level the
  engine never saw a real `LevelUpHenchman()` increment grant. The UI shows
  the 2DA-implied slot count (so the slot "exists"); the engine's real
  per-creature count is lower (so it's never filled). **Still not fixed** —
  same blocker as before: safely forcing real incremental leveling needs
  `build_npc_stat_block` to support writing a companion's mechanical stats
  for its *final* level while leaving `ClassList` at level 1, which doesn't
  exist yet. The alternative (statically baking the missing `MemorizedList`
  entries directly via GFF, bypassing `LevelUpHenchman` entirely) is
  possible — this project already confirmed the real struct shape — but
  needs its own dedicated tool (nested list write, inside `ClassList`'s own
  list) that doesn't exist yet either; not attempted this session.
- **FOUND AND FIXED — a real journal-timing bug, exactly as reported.**
  `miller_house`'s `OnEnter` script (`a_qhollow_s2`) advanced `q_hollow` to
  stage 2 the instant the party walked in the door — before either
  investigation challenge had been attempted. **Fix:** `OnEnter` cleared
  entirely; the stage-2 advance moved into `a_clue_rug`'s and `a_clue_seal`'s
  own success branches instead (guarded on `q_hollow == 1` so whichever of
  the two challenges succeeds first is the one that advances it, and the
  other's later success doesn't re-fire it). The journal now only moves once
  a real sign of something wrong has actually been found, matching the
  user's stated rule generally: a journal/quest-state advance tied to an
  area transition alone is a narrative promise the script can't keep once
  that area holds more than one thing to discover — tie it to the specific
  discovery event instead.
- **A much bigger finding than the one reported — "Chainmail (AC 5) a Rogue
  can't use" turned out not to be the actual bug; something larger was.**
  The specific equipped item (`nw_aarcl004`, both thugs' and both cultists'
  Chest slot) has a **real, confirmed, zero-length `PropertiesList`** —
  verified against the authentic base-game `.uti` directly (extracted via
  `nwn_gff`, not through any MCP summarization layer, after discovering
  `resolve_blueprint`'s own tool output quietly runs every result through a
  summarizer despite its description promising raw GFF — a real, separate,
  unfixed doc/behavior mismatch in that tool). Since this project's own
  already-verified convention is that an armor item's real mechanical AC
  bonus lives *only* in an `ITEM_PROPERTY_AC_BONUS` item property, not in
  any 2DA column, this item provides **zero real AC** despite visually
  resembling chainmail — so there was never a proficiency violation to
  flag for the Rogue specifically. **The real, bigger problem**: this
  appears to be a whole family of base-game NPC-costume items
  (`nw_aarcl001`-`013`, at minimum) that are purely cosmetic, and whatever
  gear-sourcing step equipped every mook in this module (`hos_thug1/2/3`,
  `hos_cult1/2`) picked from this cosmetic family — meaning **none of their
  armor does anything mechanically**, not just the one the user happened to
  notice. Checked the companion/boss-tier alternative too
  (`nw_maarcl046`, worn by `boss_venn`/`garrick`/`capt_holt`/`gw_guard_a`):
  it does carry a real `ITEM_PROPERTY_AC_BONUS`, but only costValue 1 (Light
  tier) — a `nw_maarcl0XX` sampling (001/020/040/060/080/100) showed these
  are all **magical loot-table items** (expensive, extra properties), not a
  tiered-by-number mundane set, so even the "real" armor in this module is
  essentially random loot-table dressing, not deliberately chosen for the
  wearer's proficiency. **Not fixed this session** — doing this properly
  needs a verified, curated list of real mundane base-game armor items by
  AC tier (Light 1-3 / Medium 4-5 / Heavy 6-8), which doesn't exist in this
  project yet (unlike `CLASS_WEAPON_PREFERENCES` for weapons) and wasn't
  found through the searches tried this session. **This is now the
  priority candidate for a dedicated follow-up**: build and verify that
  curated armor table, the same way `CLASS_WEAPON_PREFERENCES` was built
  and verified for weapons, then re-gear every creature in this module
  (and fix whatever tool/skill step is currently sourcing from the cosmetic
  family) against it.

**RESOLVED (2026-10-13), third round — the user corrected the "cosmetic armor,
not a bug" framing above, and was right to.** "ALL armors are fully
functional and properly formed" — i.e. treat the item as real chainmail and
fix the actual rule violation, don't explain the violation away by finding
the data empty. This reframes the finding above correctly: an empty
`PropertiesList` on costed-like-real-armor is itself the defect to fix, not
evidence there's no bug to find.
- **FIXED — new tool, `add_equipped_item_property`.** `add_item_property`
  only ever targets a standalone item blueprint resource; there was no way
  to add a property to a copy already embedded in a creature's
  `Equip_ItemList` (a separate struct, same "placed instance is a separate
  copy" pattern already documented for `ClassList`/`FeatList`). Resolves a
  creature exactly like `remove_feats`/`respec_weapon_feats` do, appends a
  property struct to the named slot's item.
- **FIXED — new check, `equipped_armor_no_ac_bonus`** (`verify_creature`).
  Generalizes the finding: Chest armor costed like real protective gear
  (`Cost > 10`, gated there specifically so the intentional AC-0 baseline-
  clothing convention for companions never false-positives) but carrying no
  `ITEM_PROPERTY_AC_BONUS` at all is flagged regardless of proficiency —
  catching "this armor does nothing" as its own class of defect, not
  folded into (and silently excused by) the proficiency-mismatch check's
  own correct "AC bonus 0 needs no feat" logic.
- **FIXED — every real violation in the module.** Used the new tool to give
  real, tier-matched `ITEM_PROPERTY_AC_BONUS` values to all 5 originally-
  flagged mooks (`hos_thug1/2/3`, `hos_cult1/2` — Fighters to AC 6/Heavy,
  Rogues capped at AC 3/Light, matching each one's own actual `FeatList`
  proficiency) — and the new check immediately caught 3 more real instances
  of the identical bug the original investigation missed:
  `gw_guard_a/b/c` at `grayward_gate` (`nw_aarcl008`, same cosmetic family,
  same fix). `verify_all` is clean of every `armor_proficiency_mismatch`/
  `equipped_armor_no_ac_bonus` finding across the whole module afterward.
  **Still open, deliberately not done this round**: `capt_holt`/`garrick`/
  `boss_venn`'s `nw_maarcl046` (a real but very weak AC-1 magical loot item,
  not a *broken* item) — out of scope for this fix, since it's a "weak
  gear" problem, not a "does nothing" one.

**Spell-slot timing — a user-proposed fix (spawn leveling instead of hire
leveling) was examined and corrected, not adopted as-is.** The user asked
whether moving the `LevelUpHenchman()` loop from `a_hen_join` (hire) to
`a_hen_spawn` (spawn) would fix the empty-slot problem, reasoning the
companion would already be "leveled" by the time it's recruited. **It
would not, and the reason matters for any future attempt at this**:
`GetHitDice()` reads the *static* `ClassList` level that `build_npc_stat_block`
already wrote into the `.utc` at build time — that value is 3 (the final
level) from the very first moment the object exists, at spawn exactly as
much as at hire. Moving the loop earlier doesn't create a starting level
below the target; without that, `for (i = GetHitDice(...); i <
nTargetLevel; i++)` is a no-op wherever it's called, since nothing happens
*between* spawn and hire to change what `GetHitDice()` returns. The real
fix is still the build-time one already identified above (`ClassList`
written at level 1, final stats everywhere else) — moving the runtime loop
to spawn is a legitimate complementary change once that exists (it avoids
a visible mid-game "my companion just got stronger" moment right at
recruit), but doesn't substitute for it. Not applied this session pending
the user's go-ahead on the build-time half.

**BUILT (2026-10-13), fourth round — the user gave the go-ahead ("work on the
NPC spellbook, slot, assignment changes") and three more real bugs were
found and fixed along the way, two of them independently confirmed by the
user live-testing between fixes.**

- **BUILT — `build_npc_stat_block`'s `deferLeveling` option**, the build-time
  half this whole investigation had been missing: computes every stat
  (ability scores, FeatList, SkillList, HP) for the real target level as
  normal, then rolls `ClassList`'s own `ClassLevel` back to 1 and sets
  `HENCH_LEVEL` to the real target via `mergeVarTable`. `hp_formula_mismatch`/
  `skill_points_formula_mismatch`/`ability_score_base_exceeds_elite` in
  `verify/blueprints.ts` now compare
  against `effectiveLevel = max(totalLevel, HENCH_LEVEL)` instead of raw
  `totalLevel`, so a creature using this pattern doesn't false-positive
  against its own deliberately-deferred `ClassLevel`. A creature not using
  the pattern is unaffected (`effectiveLevel` just equals `totalLevel`).
- **BUILT — moved the companion leveling loop + `RA_OnSpawn` call from
  `a_hen_join` (recruit) to `a_hen_spawn` (raw spawn)**, now that
  `deferLeveling` gives it real ground to climb. The companion is fully
  leveled, with real per-level spell slots, well before the player ever
  recruits it; `a_hen_join` just adds the already-leveled companion to the
  party. `create_random_abilities_system`'s own tool description updated to
  recommend this pairing instead of the old "call RA_OnSpawn from a_hen_join"
  guidance, which is now superseded.
- **FOUND AND FIXED — a real, significant engine-interaction bug in
  `inc_random_abil.nss`'s spell pool, independently confirmed twice by the
  user live-testing:** `GetSpellLevelByClass(nClassType, nSpellId)` can
  report a valid class/level for a spell row whose OWN per-class column is
  `"****"` when that row's `Master` column points at a DIFFERENT row that
  DOES support the class — the engine resolves through `Master` rather than
  honoring the row's own `"****"`. Confirmed against real base-game
  `spells.2da`: row 716 "SuckBrain" (Extract Brain, an Illithid monster
  attack — `Cleric="****"` directly, `Master=50`) leaked into Elya's
  (Cleric) rolled spellbook, and row 331 "DELETED_END_Fire" (an explicitly
  retired row — `Wiz_Sorc="****"` and `UserType="****"` directly, `Master=50`,
  the same master) leaked into Elowen's (Wizard). Both are monster/retired
  rows that should never appear in a real caster's spellbook. **Fix:** a
  backstop in `RA_RollClass`'s bucketing pass — cross-check the spell's own
  2DA column (via `classes.2da`'s `SpellTableColumn`) directly against
  `GetSpellLevelByClass()`'s answer, and only trust it when they agree.
  This is NOT a replacement for `GetSpellLevelByClass()` (the file's own
  "never hand-parse" design intent stands for the normal case) — it's a
  targeted safety filter for this one confirmed inheritance quirk. This bug
  affects every module `create_random_abilities_system` has ever generated
  for, not just this one — worth re-running `/systest-module` or regenerating
  `inc_random_abil.nss` in any other module using this system.
- **FOUND AND FIXED — a second, independent HC_HENCH_COUNT gap: death never
  decremented it, only dismiss did.** User-reported: "I can hire all three.
  I can dismiss and rehire all three. But I cannot hire them once that
  henchman dies and is hired again." The engine's own henchman AI
  automatically drops a dead associate from the party, but nothing told the
  party-cap counter that happened — `a_hen_leave` (dismiss) already got this
  fix two rounds ago, but a companion's `ScriptDeath` was still the stock
  `x0_ch_hen_death` directly, unwrapped. **Fix:** new `a_hen_death` wrapper
  (chains `x0_ch_hen_death`, then decrements `HC_HENCH_COUNT`, floored at 0),
  wired onto all 3 companions' `ScriptDeath` (both blueprint and placed
  instance). Once all 3 slots had ever been filled across a playthrough and
  one companion died, every future recruit — even of a different companion
  entirely — was permanently blocked before this fix.
- **Confirmed again, the hard way, why restart discipline matters**: this
  round hit the exact `load_module`-after-restart pitfall a second time —
  the HENCH_LEVEL-aware verify fix needed a restart to take effect, and the
  forced `load_module` to resume afterward silently reverted every
  unrepacked edit from earlier in the SAME round (the ClassLevel=1 writes,
  the rewritten `a_hen_spawn`/`a_hen_join`, the regenerated
  `inc_random_abil.nss`) — confirmed directly by re-reading `elowen.utc` and
  finding `ClassLevel` back at 3. All of it was redone immediately after,
  with `repack_module` called right away afterward and nothing else in
  between.

**FOUND AND FIXED (2026-10-13), fifth round — "The Grayward Hold guards and
Captain leave loot bags, rather than lootable bodies, like all of the other
NPCs."** Confirmed directly: `capt_holt`/`gw_guard_a`/`gw_guard_b`/`gw_guard_c`
all had `Lootable=0`, unlike every ordinary Hostile-faction mook in the
module (`Lootable=1`) — exactly the documented NWN mechanic ("GFF
`Dropable`/`Lootable` can be silently overridden at runtime" pitfall's sibling
case: here the GFF field itself, not a runtime override, was wrong). A
`Lootable=0` creature's items still drop, just as a separate bag placeable
rather than a directly-lootable corpse. Root cause: these four are
Defender-faction, built via the orchestrator's bespoke "combat-capable Key
NPC" recipe (Custom Mechanics #3's persuasion-to-combat flip) rather than
`/adventure-challenges`' standard Hostile-mook pipeline, which sets
`Lootable=1` by default — the bespoke recipe never set it at all, silently
leaving the GFF default. **Fix:** `Lootable` set to 1 on all 4 (both
blueprint and placed instance). **Not generalized into a new check this
round** — a real, valuable candidate (a combat-capable, non-companion Key
NPC with equipped items and `Lootable=0`, no `LOOT_INTENTIONAL` marker)
worth building next time this class of NPC shows up again, but out of
scope for a single-instance fix already applied by hand.

**TODO (2026-10-13, user-raised, not yet investigated/fixed) — two open
questions from the sixth round, recorded rather than acted on per the
user's explicit "add todo notes" request.**

1. **The armor-AC fix two rounds ago ("Armor — you were right, I was wrong
   to redirect") may itself have been based on a wrong premise, and needs
   real re-investigation before touching this module's armor again.**
   User: "There is no need to add magical AC to armor. You can purchase
   what you can afford with the starting gold. One of the Road Thugs has
   'Splint Mail' with 6 AC, then you added an additional +6 AC by magical
   properties." This directly contradicts what this project verified at
   the time: a raw `nwn_gff` extraction of the authentic base-game
   `nw_aarcl004.uti`/`nw_aarcl005.uti` showed a genuinely empty
   `PropertiesList` (byte-level check, not inferred), and the SAME item
   embedded on `hos_thug1`/`hos_thug3` etc. showed the same empty list
   *before* `add_equipped_item_property` was ever used on it. If the user
   is seeing a real 6 AC on "Splint Mail" that predates that tool call, the
   mechanism this project documented for where mundane armor AC comes from
   (`ITEM_PROPERTY_AC_BONUS` only, confirmed via `armor.2da` + a real
   community script `GetACOfArmorToEquip`) is missing something — possibly
   a *different*, not-yet-identified source of AC for an unenchanted item
   (the toolset inferring a nominal AC from the item's name/category for
   display purposes, a different 2DA linkage this project hasn't found,
   or something else entirely). **Do not add any more
   `add_equipped_item_property` AC_BONUS properties to this module's armor
   until this is resolved** — the `equipped_armor_no_ac_bonus` check and the
   whole "cosmetic armor" finding may need to be revisited, not just the
   specific items already touched. Needs a real, careful re-check (ideally
   live, in the toolset, looking at the SPECIFIC item instance in question)
   before any further action.
2. **Elowen (Wizard) still shows one empty 2nd-level spell slot after the
   deferLeveling + spawn-timing fix; Elya was not re-reported, so may
   already be resolved.** Likely explanation, NOT yet confirmed for this
   specific case: this project's own prior NWNX investigation (documented
   under "Random caster abilities" → Tier 1 findings) already found that
   Wizard specifically — unlike Cleric/Druid/Paladin/Ranger — keeps a 0
   `GetMemorizedSpellCountByLevel()` ceiling at level 2+ *even after a
   genuine `LevelUpHenchman()` pass*, confirmed via three independent NWNX
   avenues (`NWNX_Creature_LevelUp`, `AddKnownSpell`,
   `SetRemainingSpellSlots`) all hitting the identical ceiling — a
   structural limitation tied to Wizard's `SpellbookRestricted` scribing
   mechanic, not something this session's fix could reach. If that's what's
   happening here, Elowen's 2nd-level slot may simply be unfixable via any
   runtime call in this engine build, full stop — the only remaining avenue
   would be the static `MemorizedList` GFF baking this project has
   deliberately not built yet (see the earlier "static-spellbook-baking
   tool" design discussion — blocked on not having a verified real sample
   of the struct's `__struct_id`). **Not confirmed as the cause here** —
   worth checking whether Elya (Cleric) is now actually fully fixed before
   assuming this explanation is complete, and whether Elowen's remaining
   gap is specifically at level 2 (matching the documented ceiling) or
   somewhere the fix should have reached.
