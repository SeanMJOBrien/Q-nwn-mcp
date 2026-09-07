# Runtime verification: closing the static/live gap

## Why this exists

Every `verify_*` tool in this project checks static GFF data — it can prove a blueprint
has the right *fields* set, never that the engine actually *behaves* as intended once a
real server loads the module. This session hit that gap concretely twice: a henchman
build with a correct-looking `verify_creature(henchman:true)` pass still had frozen
level-1 stats and the wrong body model, because the defect only existed in what
`LevelUpHenchman()` does at runtime, not in anything a static GFF read could see.

This spec answers the user's question directly: **yes, we can run a module**, and
**yes, we can script an on-load self-check that reports pass/fail per creature**, closing
the loop back to an LLM evaluation.

## Status

**§2, §3 and §7 are implemented.** `create_spec_verification` (`src/tools/spec-check-tools.ts`)
generates `inc_spec_check.nss` (`src/util/spec-check-script.ts`) with a real
`SPEC_VerifyCreature()` — same shared-function, no-guard, `MCP_VERIFY_MODE`-gated design
described below, with the `SPEC_ENABLED` presence marker added (nwscript.nss has no
`HasLocalVariable`-equivalent builtin, so "no spec on this creature" can't be
distinguished from "SPEC_RACE happens to be 0/Dwarf" any other way). Representative-feat
data (§3's `GetExpectedRacialFeat`/`GetExpectedClassFeat`) is real, verified 2DA data for
all 7 standard PC races and all 11 base classes.
`adventure-actors/SKILL.md` Phase 3b wires `SPEC_*` vars into every companion blueprint
and calls `SPEC_VerifyCreature()` from `a_hen_join`.

**§1 is implemented and has run a real end-to-end test successfully.** §4 and §6 remain
unaddressed; §5's orchestration loop is proven by hand but not yet automated into a tool.

**First real end-to-end run, against the actual module that started this whole effort**
("Henchman Gear Showcase" — the "henchmen have bad stats and no appearance" bug report).
All 110 companion blueprints were wired with `SPEC_*` vars and a chained
`ScriptSpawn` (`a_hen_spawn`/`a_show_spawn`, whichever the module already used, calling
the stock associate-AI spawn script first, then `SPEC_SelfTestOnSpawn`), `a_mod_load` set
`MCP_VERIFY_MODE`, the module was run headless in `~/nwn-mcp-verify-server`, and the log
was grepped for `[SPEC_FAIL]`. Result: **zero `[SPEC_OK]`, 384 `[SPEC_FAIL]` lines across
all 110 creatures** — 110/110 `racial_feat`, 110/110 `class_feat`, 100/110 `package` (the
10 Barbarians accidentally pass — package `0` is simultaneously "unset" and "Barbarian's
real package"), 64/110 `spell_count` (every caster, at whatever level it starts casting).
This is the exact bug this system was built to catch, caught automatically, with per-field
diagnostics, from a plain headless module load — no human tester, no dialog interaction.

**Real findings from getting there, not assumed:**
- **Confirmed: NWN spawns every placed creature in every area at module load,
  regardless of whether any player ever connects.** A fully headless, zero-player run
  fires every creature's `OnSpawn` — the self-test design (§3, `SPEC_SelfTestOnSpawn`)
  works exactly as intended for this. (The separate, still-open gap is `a_hen_join`
  specifically, which only fires on a real dialog-driven recruit — see §8.)
- **Confirmed: `GetHasFeat()` does not reflect an engine-computed racial feat set — it
  strictly reads the creature's actual `FeatList`.** This resolves speculation elsewhere
  in this doc and in CLAUDE.md about whether an empty `FeatList` is "fine because the
  engine computes racial feats at runtime." It is not fine for `GetHasFeat()` purposes:
  every one of the 110 test creatures (empty `FeatList`, per the existing documented
  "empty FeatList is expected at level 1" rule extended incorrectly to every level here)
  failed its `racial_feat` check. Racial feats still need to land in `FeatList` somehow
  (via `LevelUpHenchman()` at some point in the creature's life) for `GetHasFeat()` to see
  them — engine-side computation, if it exists at all, isn't visible to this builtin.
- **Found and fixed: editing an already-placed creature's local variables requires
  editing BOTH the UTC blueprint AND the GIT instance.** This is a second, concrete
  instance of the pattern CLAUDE.md's `SoundSetFile` pitfall already documents ("GIT
  instances carry independent copies that can silently diverge") — now confirmed for
  `VarTable` specifically. The first wiring pass batch-edited only the 110 UTC blueprint
  files (`SPEC_ENABLED` etc. correctly present there, confirmed via independent
  `nwn_gff` extraction) and produced silent, total failure: every self-test read
  `SPEC_ENABLED` as `0` and returned immediately with no log output at all, because the
  actual placed instances in `showcase.git` still only carried the original `HENCH_LEVEL`
  var. Fixed by writing the same `SPEC_*` entries into `showcase.git`'s `Creature List`
  directly. **Any future tool or script that adds local variables to already-placed
  creatures must write both files** — `create_creature_blueprint`'s own `varTable` param
  is unaffected (it sets the blueprint before `place_creature` ever copies it into a GIT
  instance, so there's only one copy to get right at creation time). The gap is specific
  to editing objects that are already placed.
- **Found and fixed: reloading the same module (`load_module`) re-extracts every file
  from the still-unrepacked `.mod` on disk, silently discarding any direct file or IFO
  edits made since the last load.** CLAUDE.md's existing note that "the temp dir persists
  across reloads" is true but doesn't cover this — it only means sidecar files *not* part
  of the archive (like a freshly-generated `inc_spec_check.nss`, before its first repack)
  survive a reload. Files that already exist inside the packed `.mod` (every `.utc`, every
  script, `module.ifo`) get overwritten back to their pre-edit content on reload, before a
  repack ever runs. Confirmed concretely: `a_mod_load.nss`, `a_show_spawn.nss`, and
  `module.ifo`'s `Mod_OnModLoad` field all silently reverted after a same-path
  `load_module` call made between edits and the first `repack_module`. **Correct order:
  make every edit, `repack_module`, and only reload afterward if the in-memory index
  needs refreshing** — never reload between an edit and its repack.
- **Found and fixed: the verification server's originally-pinned `nwnxee/unified:2f732e7`
  image (chosen for reproducibility, matching other project configs) rejected the module
  with "This module was created with a updated version of Neverwinter Nights."** The
  module's `Mod_MinGameVer` is `1.89`; every locally cached `nwnxee/unified` tag — even
  the newest, from December 2024 — predates that. A freshly `docker pull`ed `:latest`
  (July 2026) worked immediately. Also hit and ruled out along the way: the *stale*
  locally-cached `:latest` (last pulled January 2024) crashed with a `SIGSEGV` from an
  internal `nwserver`/`NWNX_Core` build-number mismatch (`8193.37` vs `8193.36`) — a
  broken image, unrelated to this project's config. **For this specific throwaway
  verification use case, tracking `:latest` (and re-pulling before each real run) is the
  right call, unlike a production server config that should pin** — the whole point of
  this server is staying compatible with whatever nwn-mcp's own toolchain currently
  produces, not reproducibility of a fixed environment.

Config updated accordingly: `~/nwn-mcp-verify-server/docker-compose.yml` now pins
`nwnxee/unified:latest`; `config/nwserver.env`'s `NWN_DIFFICULTY` fixed from an invalid
`0` to `3` (cosmetic warning, not load-blocking, noticed along the way).

## 1. Can we actually run a module here?

Confirmed on this machine:
- A real dedicated-server binary exists: `~/nwserver-linux_37-5`.
- Multiple working launch configs exist (`~/erithorn`, `~/equinox`, `~/castledefense2`,
  `~/tfndev`, `/var/www/storage/tfn`, ...), each an env-var file (`NWN_MODULE`,
  `NWN_PORT`, `NWN_SERVERNAME`, `NWN_PLAYERPASSWORD`, ...) consumed by a
  `docker-compose*.yml`, launched via a `linux_run_server*.sh` wrapper
  (`docker-compose ... up`). The raw binary is not run directly — it's invoked inside the
  container by the compose stack.
- NWNX-EE is already wired into at least one of these configs (`erithorn`'s
  `NWNX_CORE_SKIP_ALL=yes` + selective `NWNX_*_SKIP=no` plugin enables), so the
  NWNX-dependent parts of tfndev's own tooling (e.g. `inc_rand_spell.nss`'s
  `NWNX_Creature_AddFeat`) are not hypothetical here — the infrastructure exists.

**Critical constraint: none of the existing configs may be reused or touched for this.**
They are live, internet-facing, real player-facing persistent worlds (real
`NWN_PLAYERPASSWORD`/`NWN_DMPASSWORD` values, a real `nwsync` URL pointing at a public
DNS host, "The Frozen North" is described elsewhere in this repo as "actively-hosted"). At
the time of writing several of these (`server_tfn-server_1`, `uoa_nwserver_1`, ...) were
confirmed live via `docker ps`. Pointing one of these at an nwn-mcp-generated test module,
or restarting one of these containers, would disrupt a real service.

**Done — an isolated Docker Compose config now exists and has been proven to boot.** Every
config above (`erithorn`, `equinox`, `castledefense2`, `gve3`, `ilmara`, `uoa`, `adventure`,
`BuilderTony`, `GvE3misc`) is itself a clone of the same upstream template, currently named
[`urothis/nwnxee-docker-template`](https://github.com/urothis/nwnxee-docker-template) (the
older clone URL, `Urothis/nwnxee-template`, redirects to the same repo — GitHub rename).
That template was cloned fresh to `~/nwn-mcp-verify-server` — a sibling of `~/git/`, **not**
inside this repo's git tree, so it can never end up committed here — and trimmed down:

- `docker-compose.yml` keeps only the `nwserver` service. The template's `db`/`redis`/
  `influxdb`/`grafana` services (and their `config/*.env` files, `grafana-provisioning/`)
  were deleted outright: `inc_spec_check.nss` calls zero `NWNX_*` functions — every builtin
  it uses (`GetLocalInt`, `GetKnownSpellCount`, `GetCreatureStartingPackage`, `GetHitDice`,
  `GetHasFeat`, `WriteTimestampedLogEntry`, ...) is vanilla `nwscript.nss` — so there is
  nothing for those services to support yet. Add them back only if a future check genuinely
  needs a specific `NWNX_*` plugin.
  `restart: "no"` (not `unless-stopped`) — a throwaway verification run should never
  linger; `docker ps` during this work turned up a real orphaned
  `nwnxee-docker-template-master_redis_1` container still running two weeks after whoever
  last used that Downloads-folder copy, which is exactly the failure mode to avoid here.
- `config/nwserver.env`: `NWN_PORT=6199` (checked against every other config's port —
  6031-6045, 5121, 6099, none collide), `NWN_PUBLICSERVER=0`, `NWN_MAXCLIENTS=1`,
  `NWN_PLAYERPASSWORD`/`NWN_DMPASSWORD` left blank (never goes public, torn down after
  each run), `NWNX_CORE_SKIP_ALL=yes` with every individual plugin flag simply absent
  (no services exist for them to talk to). No `nwsync` setting exists in this template at
  all — nothing to disable.
- Image pinned to `nwnxee/unified:2f732e7` (already cached locally — same tag `~/tfndev`
  itself runs), not `:latest`, for reproducibility.

**First real launch, verified end-to-end:** `docker-compose up` with the template's bundled
`DockerDemo` module produced a clean `Server: Loading...` → `Server: Module loaded` →
`{Masterserver Advisory} Server hidden: Requested not to be listed.` sequence (confirming
`NWN_PUBLICSERVER=0` actually took effect), then `docker-compose down` shut it down with no
containers left behind (`docker ps` confirmed empty afterward). One cosmetic issue found:
`NWN_DIFFICULTY=0` logs `Server: Invalid argument to -difficulty` — harmless (falls back to
a default) but should be set to a valid value (the template's own default is `3`) before
this becomes a real automation loop.

**Still open:** getting an nwn-mcp-generated module (not the bundled demo) into
`~/nwn-mcp-verify-server/server/modules/` and pointing `NWN_MODULE` at it, and — the
bigger unresolved question — §5's orchestration loop as originally written only exercises
`OnSpawn`, not a companion's actual recruit path (`a_hen_join` needs a real PC to click
through the dialog, and nothing here connects a client). Real BioWare precedent
(`x0_ch_hen_spawn.nss`, the stock henchman `OnSpawn` handler) calls `LevelUpHenchman()`
directly from `OnSpawn` on an unrecruited companion in the shipped Undermountain content,
so a headless `MCP_VERIFY_MODE`-gated self-test hook doing the same thing generally (loop
every `SPEC_ENABLED` creature, call `LevelUpHenchman()` + `SPEC_VerifyCreature()` with no
PC involved) is proven safe by the engine's own official content — just not yet built; the
user asked for this to stay research-only for now, not implementation.

## 2. The spec: local variables as the source of truth

Every creature nwn-mcp builds already carries a target described somewhere (a level, a
race, a class, sometimes a HENCH_LEVEL var for companions). The proposal: formalize this
into a small, consistent set of **local variables set on the blueprint at creation time**
(nwn-mcp already supports this via `create_creature_blueprint`'s `varTable` param — no
new tooling needed to *write* the spec, only to *check* it):

| Variable | Type | Meaning |
|---|---|---|
| `SPEC_RACE` | int | Expected `racialtypes.2da` row |
| `SPEC_APPEARANCE` | int | Expected `Appearance_Type` (omit if it should just equal `SPEC_RACE`, per this session's verified 0-6 rule) |
| `SPEC_CLASS` | int | Expected primary class ID |
| `SPEC_LEVEL` | int | Expected total character level (what `HENCH_LEVEL` already is for companions — this generalizes the same idea to every creature, not just henchmen) |
| `SPEC_PACKAGE` | int | Expected `StartingPackage` (normally `= SPEC_CLASS`, per the row-equals-classId rule) |

Simple named int locals, not a JSON blob — NWScript's native `Json*` functions exist and
would work, but for a fixed, small field set, plain locals are more robust and don't add
a parsing step that can itself fail. Revisit as JSON only if the spec grows past what's
listed here (e.g. per-slot expected equipment).

`SPEC_LEVEL` subsumes `HENCH_LEVEL` for henchmen specifically — either rename the
existing var or have the henchman check script read either name; not a hard requirement,
just avoid two names meaning the same thing.

## 3. The check is a shared routine, called after every level-up — not a fixed hook

Earlier drafts of this spec fired the check once, at a fixed point (`OnSpawn` for
static-level NPCs, once at the end of `a_hen_join` for companions), guarded so it could
only ever run a single time per creature. That's too narrow: **any NPC of any kind can be
leveled up at any point during the module** — not just a companion at recruit. A quest
script might level up an ally mid-story, a rewards system might bump a rival's level to
track the party, a DM tool might retrain someone — every one of those calls
`LevelUpHenchman()` (or otherwise changes `ClassList`) just as much as `a_hen_join` does,
and every one of them needs the same check run immediately after, not just the recruit
path.

So the check is factored into a single shared include function, not duplicated or
hardwired to one event:

```
// inc_spec_check.nss
void SPEC_VerifyCreature(object oCreature)
{
    if (!GetLocalInt(GetModule(), "MCP_VERIFY_MODE")) return;
    if (!GetIsObjectValid(oCreature)) return;

    string sTag = GetTag(oCreature);
    int bPass = TRUE;

    // Race + appearance
    if (HasLocalVariable(oCreature, "SPEC_RACE"))
    {
        int nExpectRace = GetLocalInt(oCreature, "SPEC_RACE");
        if (GetRacialType(oCreature) != nExpectRace)
            { bPass = FALSE; LogSpecFail(sTag, "race", nExpectRace, GetRacialType(oCreature)); }

        int nExpectAppearance = HasLocalVariable(oCreature, "SPEC_APPEARANCE")
            ? GetLocalInt(oCreature, "SPEC_APPEARANCE") : nExpectRace;
        if (GetAppearanceType(oCreature) != nExpectAppearance)
            { bPass = FALSE; LogSpecFail(sTag, "appearance", nExpectAppearance, GetAppearanceType(oCreature)); }

        // Representative racial feat(s) — see "racial feats" note below.
        int nRacialFeat = GetExpectedRacialFeat(nExpectRace); // hardcoded lookup table
        if (nRacialFeat != -1 && !GetHasFeat(nRacialFeat, oCreature))
            { bPass = FALSE; LogSpecFail(sTag, "racial_feat", nRacialFeat, -1); }
    }

    // Class + level — read fresh every call, so a later re-check after a subsequent
    // level-up naturally verifies against whatever SPEC_LEVEL/SPEC_CLASS hold *now*,
    // even if a story script changed them since the last check.
    if (HasLocalVariable(oCreature, "SPEC_CLASS"))
    {
        int nExpectClass = GetLocalInt(oCreature, "SPEC_CLASS");
        int nExpectLevel = GetLocalInt(oCreature, "SPEC_LEVEL");
        int nActualLevel = GetLevelByClass(nExpectClass, oCreature);
        if (nActualLevel != nExpectLevel)
            { bPass = FALSE; LogSpecFail(sTag, "level", nExpectLevel, nActualLevel); }

        int nHD = GetHitDice(oCreature);
        if (nHD != nExpectLevel)
            { bPass = FALSE; LogSpecFail(sTag, "hit_dice", nExpectLevel, nHD); }

        // Representative class feat (e.g. a proficiency or 1st-level class feat)
        int nClassFeat = GetExpectedClassFeat(nExpectClass); // hardcoded lookup table
        if (nClassFeat != -1 && !GetHasFeat(nClassFeat, oCreature))
            { bPass = FALSE; LogSpecFail(sTag, "class_feat", nClassFeat, -1); }

        // Casters: at least one known/memorized spell at the lowest castable level
        if (IsCasterClass(nExpectClass) && nExpectLevel >= 1)
        {
            int nSpellCount = CountSpellsForClass(oCreature, nExpectClass); // sums known/memorized across levels
            if (nSpellCount == 0)
                { bPass = FALSE; LogSpecFail(sTag, "spell_count", 1, 0); }
        }
    }

    if (bPass) WriteTimestampedLogEntry("[SPEC_OK] tag=" + sTag);
}
```

`LogSpecFail` writes one grep-able line per failure:
`[SPEC_FAIL] tag=<tag> field=<race|appearance|racial_feat|level|hit_dice|class_feat|spell_count> expected=<x> actual=<y>`

**Call-site convention (applies to every nwn-mcp-generated script, not just henchmen):**
any script that calls `LevelUpHenchman()` or otherwise changes a creature's `ClassList`
must call `SPEC_VerifyCreature(oCreature)` immediately afterward — `a_hen_join` is one
caller, not the only one. `OnSpawn` also calls it once, as a baseline check, for every
creature carrying `SPEC_*` vars regardless of whether it ever gets leveled live (catches
a creature whose target level was meant to be baked directly into `ClassList` at build
time but wasn't). Because the check has no "already ran" guard, a creature leveled twice
in one playthrough gets checked twice — each call is independent and reads whatever
`SPEC_*` values are current *at that moment*, so this composes correctly with a NPC whose
target level itself changes over the story (a quest script bumping `SPEC_LEVEL` before
its own `LevelUpHenchman()` call works with no special-casing needed here). The
verification harness (§5) only needs zero `[SPEC_FAIL]` lines across the whole run;
repeated `[SPEC_OK]` lines for the same tag are expected and harmless.

**Racial/class "representative feat" tables are a deliberate simplification.** NWScript
has no bulk "list every feat this race/class grants" call — enumerating *all* of them
would mean hardcoding a full feat-id table per race/class here, duplicating
`racefeat.2da`/`cls_feat_*.2da` content into the check script. A single representative
feat per race/class (e.g. Elf → Keen Senses, Human → any granted bonus feat, Sorcerer →
a class-specific proficiency) is a cheap, high-signal proxy: if the package was right
(this session's `startingPackage` fix) and the representative feat is present, the rest
of that package's picks are extremely likely to also be present, since they all come from
the same single `LevelUpHenchman()` call. Treat a full per-feat audit as a stretch goal,
not the first version.

## 4. What else could be checked

Beyond race/appearance/class/level/spells:

- **Equipment actually equipped**: `GetItemInSlot(INVENTORY_SLOT_*, oSelf)` against
  expected resrefs, if a `SPEC_EQUIP_<slot>` var is added — catches the class of bug
  where an item was created but never actually attached.
- **Companion recruit machinery**: after a scripted `AddHenchman()` test, `GetMaster()`
  returns the expected PC, `GetAssociateType()` is `ASSOCIATE_TYPE_HENCHMAN`.
- **Store presence** for shopkeeper-pattern NPCs: `GetIsObjectValid(GetNearestObjectByTag(sStoreTag))`
  plus a non-zero item count in the store.
- **Positional sanity**: the creature isn't clipping through geometry or sitting well
  below/above the walkmesh — checkable by comparing `GetPosition()`'s Z against a
  `GetGroundHeight()`-equivalent, though this mostly duplicates `fix_object_heights`'
  existing walkmesh-based check and is lower priority.
- **Dialog actually opens**: harder to check generically — would need a scripted
  `BeginConversation()` probe, which has side effects (it really starts a conversation)
  and isn't safe to fire unconditionally on every NPC at module load. Leave this to the
  existing static `verify_dialog` unless a specific need arises.

## 5. Confirming built vs. present — the orchestration loop

This is the part nwn-mcp itself drives, using the log as the single source of truth for
"did the live engine agree with what we built":

1. nwn-mcp builds/edits the module and passes its own static `verify_*` gate as today.
2. Repack. Copy (never symlink/point) the `.mod` into the throwaway verification server's
   module folder.
3. Launch the verification server's compose stack in the background (`docker-compose up`,
   via `run_in_background`), pointed at a fresh, empty log directory.
4. Poll (not sleep-guess) until the log shows the server has finished loading all areas —
   e.g. wait for a known "module loaded" line NWN itself emits, or a final
   `[SPEC_OK]`/`[SPEC_FAIL]` line count that stops growing for a few seconds.
5. Tear the stack down (`docker-compose down`) — the server does not need to stay up once
   `OnModuleLoad`/`OnSpawn`/`a_hen_join` have all fired.
6. Grep the log for `[SPEC_FAIL]` lines. Zero → done, report success. Any found → this is
   exactly the "trigger an evaluation by MCP/LLM" the user asked for: parse each failing
   `tag=`/`field=`/`expected=`/`actual=` line, cross-reference against the *static* GFF
   data for that tag (`get_creature_details`, `resolve_blueprint`) to diagnose the root
   cause the same way this session did by hand, fix it through nwn-mcp's normal typed
   tools, repack, and go back to step 2.

The live server is purely a read-only oracle in this loop — it never edits the module
itself; all repair still flows through nwn-mcp's existing static tools, same as today.

## 6. Known risk, deferred — TMI errors on large modules

**Note for follow-up, not addressed now.** NWScript kills a single script invocation
outright if it executes too many VM instructions in one call ("TMI" — too many
instructions). If many creatures spawn around the same tick and each fires
`SPEC_VerifyCreature()` (or `OnModuleLoad` tries to iterate every area/creature in one
pass for a module-wide summary), a large enough module could trip this mid-run, silently
truncating the evaluation rather than completing it. The small test adventures this
project builds today are very unlikely to hit it — this only becomes real once module
size grows well past what's been tested so far.

Known mitigation direction, not designed in yet: stagger the checks across multiple
engine ticks with `DelayCommand(0.0, ...)` chains (each `DelayCommand` invocation gets
its own fresh instruction budget) instead of running every creature's check inline
within a single event. Don't optimize for speed up front — a confirmed-good
verification result is valuable enough to nwn-mcp and the user that a check pass taking
minutes is acceptable for now. Speed optimization is explicitly **deferred until there's
real analysis of actual failures** (what fails, how often, whether TMI is even the
bottleneck in practice) — premature batching/staggering design without that data risks
solving the wrong problem. Revisit once this system is closer to real implementation and
there's failure data to optimize against.

## 7. The verification-mode switch — gate it off in the final deliverable

The check logic (SPEC_* reads, `WriteTimestampedLogEntry` calls) must only run during
nwn-mcp's own generation/evaluation loop, never in the module actually handed to the
user — it's dev-time instrumentation, not a player-facing feature, and shouldn't spend
cycles or spam the log in a live game.

**`module.ifo` has no `VarTable` field** (confirmed directly against a real module this
session — unlike UTC/UTP/etc. blueprints, the module object has no static local-variable
list to bake a flag into at authoring time). `Mod_GVar_List` is toolset-declarative
metadata, not a runtime storage location. So the switch can't be a GFF field set once and
read forever the way `HENCH_LEVEL` is; it has to be a **module local variable set by a
script nwn-mcp controls**, checked at runtime:

- `a_mod_load` (already generated/chained per this skill's Step 2, `SetMaxHenchmen`) gains
  one more line: `SetLocalInt(GetModule(), "MCP_VERIFY_MODE", <1 or 0>)`. The literal
  `1`/`0` is the only thing that differs between the verification build and the final
  deliverable — everything else about `a_mod_load` stays the same.
- The gate lives in exactly **one place**: the early-out at the top of
  `SPEC_VerifyCreature()` itself (§3) —
  `if (!GetLocalInt(GetModule(), "MCP_VERIFY_MODE")) return;`. Because every caller
  (`a_hen_join`, `OnSpawn`, any future leveling script) goes through this one shared
  function, no individual call site needs its own gate — a new caller added later
  automatically respects the switch for free. In the final build every call becomes a
  no-op: no `SPEC_*` reads, no log writes, negligible runtime cost.
- **The check function's compiled bytecode is identical in both builds** — only
  `a_mod_load`'s one literal changes, and every caller of `SPEC_VerifyCreature()` is
  unaffected by the recompile. This matters: a clean verification pass is evidence about
  the *exact scripts that ship*, not about some separate "verification variant" —
  preserving the whole point of this system (don't let static and live behavior diverge
  again).
- Flipping the switch is the **last step** of the build pipeline, after the
  build→run→check→repair loop (§5) reaches zero `[SPEC_FAIL]` lines: rewrite
  `a_mod_load`'s literal to `0`, `compile_script`, repack. One more `verify_all` pass
  after that confirms nothing else regressed from the recompile.
- `SPEC_*` local variables on each creature blueprint are cheap, inert data and are **not**
  removed for delivery — only the active checking/logging behavior is gated off. Leaving
  them in costs nothing and means a future re-verification pass (or a live DM debugging
  session) can still make use of them without rebuilding the module.

## 8. Open questions before this can be implemented

- Exact `docker-compose.yml`/`.env` shape for a new, isolated, no-NWSync,
  minimal-NWNX-plugin verification server — needs to be authored from scratch (using
  `erithorn`'s as a structural reference only), including how nwn-mcp's temp-dir module
  gets into the container's module folder without a manual copy step each time.
  Docker access itself will need explicit user approval as a category, since it's a new
  kind of side effect (spinning up containers) this project has never done.
- How long a cold start actually takes (full resman + HAK load) — determines whether this
  is fast enough to use every generation cycle or only as an occasional deeper check.
  Would need to be measured against a real config.
- Whether `SPEC_*` vars should be written on **every** creature nwn-mcp creates going
  forward (cheap, and turns this into a standing regression net) or only opted into for
  companions/casters where the current bug class actually lives — leaning toward "every
  creature with a `classes` array," since the marginal cost of a few local vars is
  near-zero and the race/appearance check is already useful for non-henchmen too.
- ~~The representative-feat lookup tables need to actually be populated per race/class~~
  — **done** for all 7 standard PC races and all 11 base classes, via real
  `resolve_2da`/`search_2da` calls against `race_feat_<race>.2da` (row 0 of each) and
  `cls_feat_<class>.2da` (filtered to `List=3`, `GrantedOnLevel=1` — automatically-granted,
  non-choosable level-1 feats). See `RACIAL_FEATS`/`CLASS_FEATS` in
  `src/util/spec-check-script.ts`. Fighter's `cls_feat_fight` query initially overflowed
  the research tool's response size (2,794 lines) — resolved by grepping the saved raw
  output file for `"List": "3"` instead of re-requesting it inline; Fighter's automatic
  level-1 feats include `WeapProfMar` (45), used as the representative.

This is intentionally left as a plan. Building it is a real infrastructure project (new
Docker config, new NWScript, a new orchestration flow in whatever drives the
build-verify-repair loop) — scoped here so the next session can pick it up directly
rather than re-deriving the design.
