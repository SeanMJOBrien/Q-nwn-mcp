# Encounter composer: role + target difficulty → a built, balanced roster

Status: **F1, F2, F3, F5 and F6 are built** — `compose_encounter` now
builds and places a real roster, not just a plan. F4, F7 (v2), F8 remain
planning only.

## Why this exists

The user's stated goal: an LLM should be able to say something like *"I need a
necromancer for a CR 6 battle against the PC(s) and their party"* and get back
a fully-built, correctly-difficulty-calibrated roster — the named boss, plus
whatever additional creatures either side actually needs — without hand-doing
the CR arithmetic, the class-mapping ("what *is* a necromancer in NWN's class
list?"), the minion counting, or the gearing.

Today that whole sequence is manual, spread across several existing tools,
and the LLM has to get every step right itself:

1. Decide what class/level combination plays "necromancer" (NWN has no
   literal Necromancer class).
2. Build it with `create_creature_blueprint` / `build_npc_stat_block`.
3. Gear it with `equip_npc_by_role` against `get_wealth_budget`.
4. Decide, by trial and error against `get_balance_report`, whether one boss
   creature alone reaches the target difficulty, and if not, how many of
   what CR to add.
5. Build and place those supporting creatures too.
6. Separately judge whether the *party* side needs anything (a reinforcing
   ally) to keep the fight fair.

This spec plans the tool(s) that collapse that sequence into one call.

## What already exists (do not rebuild)

| Piece | Where | What it gives this feature |
|---|---|---|
| EL math for a cluster of same-CR creatures | `src/util/encounter-difficulty.ts` (`combineSameCREL`, `bandDifficulty`) | The DMG-verified "N creatures of CR *x* fight as EL *x* + 2·log2(N)" rule, and the EL-vs-party-level difficulty bands this project already uses (`adventure-challenges/SKILL.md`'s anchors: EL=APL standard, EL=APL+4 deadly). Currently only used in the *audit* direction (`get_balance_report`). |
| CR estimate when a creature's own CR is unset | `estimateCRFromLevel` (same file) | CR ≈ total character level, verified against 505 real `~/tfndev` creatures. Useful once the composer builds a from-scratch NPC that doesn't yet carry a real CR. |
| Mechanically correct NPC construction | `build_npc_stat_block`, `src/util/npc-stat-block.ts` | Ability scores, FeatList (racial + automatic class + generic schedule + bonus slots), SkillList, HP — all 2DA-derived, given race/class/level. This is what actually *builds* any creature the composer decides it needs. |
| Role-aware equipping | `equip_npc_by_role`, `src/util/npc-weapon-preferences.ts` | Proficiency-safe weapon choice by class, wealth-budget-checked gear, a `verify_creature` pass as its own last step. |
| Spellbook generation | `create_random_abilities_system` | Real per-playthrough randomized spells for Cleric/Druid/Paladin/Ranger/Wizard (Tier 1) and Bard/Sorcerer (Tier 2) — relevant for a spellcasting boss like a necromancer. |
| Pick-from-existing-blueprints advisory | `suggest_encounter` | Groups *already-placed-in-module* creature blueprints by raw CR and suggests Boss/Squad/Swarm compositions against an XP budget. Closest existing tool to this feature, but: no role/archetype concept, can't create new creatures, and uses its own ad hoc XP-budget math rather than `encounter-difficulty.ts`'s DMG EL table — a real existing inconsistency worth reconciling when the composer is built, not before. |
| Shipping gate | `verify_creature` / `verify_all` | Whatever the composer builds still has to pass these before it's considered done. |

## The gap

Nothing today maps a **thematic role name** ("necromancer", "bandit
captain", "cult assassin") onto a concrete class/level/feat/spell/equipment
recipe, and nothing **solves for a roster** given a target difficulty — i.e.
nothing answers "how many of what do I add so this is a CR 6 fight,"
automatically, in either direction (hostile side or party side).

## Open question to settle before building: what does "CR 6" mean?

The user's phrasing is colloquial — a DM says "CR 6 fight" meaning different
things depending on context:

- **(a) Encounter Level 6 for the whole fight against the full party** — the
  boss's own CR plus every supporting creature's contribution, combined via
  `combineSameCREL`, should land on EL 6 banded against the party's actual
  level/size. This is the reading consistent with this project's own EL
  conventions everywhere else (`get_balance_report`, `adventure-challenges`).
- **(b) The named boss's own individual CR is pinned at 6**, and supporting
  creatures are added for theme/narrative reasons (a necromancer should have
  a *few* skeletons around it) rather than to deliberately hit a combined
  target — the resulting encounter's real EL could land well above 6 once
  support is added.

**Recommendation: default to (a), with (b) available as an explicit override**
(`pinBossCR: true` or similar) for when the narrative specifically needs a
named villain of an exact CR regardless of what escorts end up fighting
alongside it. (a) is what actually serves "balanced battle" design intent;
(b) is what a human DM more often means colloquially. Both are cheap to
support once the reverse-EL math exists — this is a parameter, not two
different systems.

## Planned features

Each is buildable mostly independently, but F5 is the feature the user
actually asked for — F1-F4 and F6-F7 are what F5 needs to not be a thin
wrapper that still leaves the hard parts to the LLM.

### F1. Archetype library — role name → mechanical build recipe — **BUILT (one entry)**

**Objective:** let the composer accept a thematic role name instead of
requiring the caller to already know NWN's class list. "Necromancer" has no
literal class; it has to resolve to something like *Wizard or Sorcerer,
necromancy-leaning spell selection, animate-dead-style minion access.*

**Built as** a curated table, `ARCHETYPES` in `src/util/encounter-archetypes.ts`
(`getArchetype(name)` for case-insensitive lookup), with real unit test
coverage. One entry so far — necromancer — resolved to `CLASS_TYPE_WIZARD`
(10), `levelForCR` reusing `estimateCRFromLevel`'s already-verified CR ~=
level correlation directly (a caster's level IS its CR), and
`naturalSupport: "undead_minion"` for F3 (not yet built) to act on.
`spellThemeKeywords`/`equipmentThemeKeywords` exist on the type but are
**not consumed by any tool yet** — `create_random_abilities_system` has no
school/theme filter and `equip_npc_by_role` has no theme param; these are
forward-looking fields with a real place to be read from once either tool
grows that capability, not evidence that filtering already happens.

**A real caveat is baked into the entry, not left implicit:** this
project's own prior live-engine investigation (CLAUDE.md, "Random caster
abilities") already confirmed `create_random_abilities_system`'s Tier 1 path
is capped at cantrips + 1st-level spells for Wizard *specifically* — three
separate NWNX investigation attempts failed to find a fix. A necromancer
built via this archetype inherits that real, confirmed limitation; the
`caveat` field says so plainly rather than silently shipping a disappointing
caster. (Sorcerer, this project's other necromancy-plausible option, has
*no* such limitation — Tier 2 is "confirmed fully working end-to-end... no
known limitations" — but doesn't get the thematically-correct
specialist-wizard framing. Left as Wizard for now since the theme match
matters for a role name specifically chosen to feel like a necromancer;
revisit if the spell-slot cap turns out to matter more in practice.)

**Still open, deliberately not resolved blind (do not guess these in):**
- Whether a NWN:EE Wizard's `SpellSchool` GFF field (specialist wizard,
  trading two opposition schools for a bonus slot in one) is worth setting.
  Not yet confirmed which field this actually is or whether
  `create_random_abilities_system`'s pool-building logic would need a
  school filter added to respect it — and moot anyway while Wizard is
  capped at 1st-level spells (see the caveat above).
- How "animate dead"-style minion-raising should actually work mechanically
  — the build-time approach (placing real skeleton/zombie creatures as part
  of the roster, via F3) remains the recommended design over a scripted
  real-time spell-cast effect, for the reasons already given below.
- Growing this table past one entry: 2-3 more real roles that
  `/create-adventure`'s own `adventure-challenges` skill already describes
  informally (e.g. "tactical roles (melee, caster, healer)") — grow from
  actual use, the same way `CLASS_FEATS`/`RACIAL_FEATS` grew from verified
  2DA lookups rather than a speculative full table.

### F2. Reverse EL solver — target difficulty → required CR total — **BUILT**

**Objective:** automate the arithmetic a human currently does by trial and
error against `get_balance_report`: given a target EL and the boss's own CR,
compute how many same-CR support creatures close the gap (or that no support
is needed at all, if the boss alone already meets the target).

**Built as** `solveSameCRCount(cr, targetEL)` and `planSupportCluster(bossCR,
targetEL, supportCR)` in `src/util/encounter-difficulty.ts`, with full unit
test coverage in `encounter-difficulty.test.ts` (19 tests). Matches the
design below exactly, including the scope limit: `planSupportCluster` never
fabricates one combined boss+support EL number — it reports `bossEL` and
`support.achievedEL` as two separate figures, mirroring `clusterHostiles`'s
existing per-cluster (not per-fight) convention. When the boss alone already
meets `targetEL`, `support` is `null` rather than computing a 1-creature
cluster nobody asked for — deciding whether to add a *thematic* escort
anyway (not needed for difficulty) is F3's job, not this pure-math utility's.

Dropped from the original sketch below: `partyLevel`/`partySize` params and a
returned `label`. Neither `combineSameCREL` nor its inverse involve party
stats at all — EL is a property of the hostile side alone; banding against a
party (`bandDifficulty(el, partyLevel)`) already exists as its own composable
function, so callers band `bossEL`/`support.achievedEL` separately rather
than this function doing it inline.

<details>
<summary>Original design sketch (superseded by the actual signatures above)</summary>

```
// Given target EL and a fixed boss CR, solve for how many creatures of a
// given support CR close the gap. combineSameCREL is monotonic in count, so
// this is a direct inversion, not a search — but mixed boss+support CR
// combination is NOT covered by the already-documented DMG same-CR-only
// rule (see combineSameCREL's own doc comment), so this function has the
// same honest scope limit: it solves for homogeneous support groups against
// a separately-reported boss CR, not a single fabricated combined number
// for a mixed-CR fight. This matches get_balance_report's own existing
// per-cluster (not per-fight) reporting convention — don't invent a mixed-CR
// formula here that the rest of the codebase deliberately avoids elsewhere.
function solveSupportCount(targetEL, bossCR, supportCR, partyLevel, partySize): { count, achievedEL, label }
```

</details>

**Objective, restated simply:** turn "is 1 necromancer + N skeletons a CR 6
fight for a 4-person level 6 party" from a manual back-and-forth with
`get_balance_report` into a single computed answer.

### F3. Support-roster chooser — turning an EL gap into real creatures — **BUILT**

**Objective:** once F2 says "add support creatures totaling EL *y*," decide
*what* those creatures actually are, using the archetype's declared
`naturalSupport` (F1) rather than picking arbitrary filler.

**Built as** `pickSupportCandidate(naturalSupport, targetCR)` in
`src/util/encounter-archetypes.ts`, with a real, verified candidate list
for `"undead_minion"`: `nw_skeleton` (CR 0.5) and `nw_zombie01` (CR 1), both
confirmed via `list_blueprints`/`resolve_blueprint` against real game data
to carry `faction: 1` (Hostile) — the base game's "Summoned" variants
(`nw_s_skeleton`/`nw_s_zombie`, found in the same search) were deliberately
excluded, since they default to `faction: 2` (Commoner): they're meant for
a player's own summon spell, not a hostile encounter's minions. Picks the
highest-CR real candidate at or below the target CR, falling back to the
lowest-CR candidate if the target is below every real option — never
fabricates a blueprint at an exact CR that doesn't exist for real. 9 new
unit tests (shared with F1's test file).

**Narrower than originally planned, and said so rather than silently
descoped:** this does NOT yet fall back to `build_npc_stat_block` when no
real blueprint exists for a `naturalSupport` label — with only one label
(`undead_minion`) in the table so far, and two confirmed real candidates for
it, that fallback path has no real case to exercise yet. Add it when a
second `naturalSupport` label is needed and turns out to have no good real
blueprint, not speculatively now.

### F4. Ally-side reinforcement — does the *party* need anything too?

**Objective:** closes "any additional NPCs needed for each side," not just
the hostile side. If the target difficulty would otherwise be unfairly hard
for the stated party composition (e.g. a solo level-4 PC against an EL 6
fight — "hard" by this project's own banding), the composer should be able
to say so and optionally generate a reinforcing ally (a companion-style NPC
who joins for this fight) rather than silently handing back an unfair
encounter.

**Design, deliberately conservative for a first version:** report the
banded difficulty (`bandDifficulty` already does this) and let the *caller*
(the LLM, or a human DM) decide whether to accept a "hard"/"deadly" rating
or ask for an ally — don't auto-inject a reinforcement without being asked.
Auto-generating one is a reasonable later extension once F1-F3 are proven,
reusing the existing henchman/companion pipeline (`create_creature_blueprint
henchman:true`, `build_npc_stat_block`, `create_spec_verification`) rather
than inventing a second NPC-construction path.

### F5. `compose_encounter` — the actual entry point tool — **BUILT (dry-run only)**

**Objective:** the single call the user's stated goal describes. Ties
F1-F3 together into one MCP tool call instead of requiring the LLM to
orchestrate several separate tools correctly, in the right order, every
time.

**Built as** the `compose_encounter` MCP tool
(`src/tools/encounter-composer-tools.ts`), needing no module loaded at all —
it's pure planning over F1-F3's own static tables plus caller input. Real
shape, narrower than the sketch below in two deliberate ways (both
documented in the tool's own file header, not silently dropped):

```
compose_encounter({
  role: "necromancer",   // ONE archetype name, not an array — see why below
  bossCR: "6",            // the boss's OWN target CR — a required input, not derived from targetEL
  targetEL: "6",
  partyLevel: "6",        // optional — only for banding the two EL figures, not part of the math
})
```

returning (abbreviated):

```json
{
  "role": "necromancer",
  "boss": { "classId": 10, "level": 6, "cr": 6, "el": 6, "band": "standard" },
  "bossAloneSufficient": true,
  "support": null,
  "caveat": "Wizard (this archetype's class) is capped at cantrips + 1st-level spells by ...",
  "nextSteps": "Dry-run only. To actually build this: create_creature_blueprint for the boss ..."
}
```

or, when the boss alone falls short of the target EL, `support` becomes
`{ resref, tag, cr, count, el }` — a real base-game blueprint and a count,
never a fabricated combined EL (see `boss.el`/`support.el` staying separate
— enforced by a dedicated test asserting no `totalEL`/`combinedEL` field
ever appears).

**Two deliberate narrowings from the original sketch, not oversights:**
- **`role` is singular, not `roles: string[]`.** `planSupportCluster` (F2)
  is built for one named boss; how multiple named bosses in the same fight
  would combine is the same kind of unverified mixed-CR question this
  project already declines to guess at. Revisit with a real multi-boss need
  and a real source for that combination rule — not before.
- **`bossCR` is a required caller input, not derived from `targetEL`.**
  Nothing in F1-F3 can honestly answer "how much of this fight's difficulty
  should the boss alone carry vs. its support" — that split IS the
  unverified mixed-CR question from the point above. This tool answers
  "given a boss at this CR, does support close the gap to this target, and
  with what" — the caller decides the boss's own power level. This also
  means the original open question ("does CR 6 mean the whole fight's EL or
  the boss's own pinned CR") is moot for this tool's actual shape: there is
  no implicit default to pick, since the boss's CR is never implicit.
- **No `area`/placement mode yet, and no `pinBossCR` override** — both
  planned for F6 below, not built here. This tool only plans; it builds and
  places nothing.

6 new integration tests (`encounter-composer-tools.integration.test.ts`),
including the user's own stated example (`role: necromancer, bossCR: 6,
targetEL: 6` -> boss alone sufficient, no support) and a case where the
boss falls short and a real `nw_zombie01` cluster is computed.

### F6. Placement mode + wealth integration — **BUILT**

**Objective:** make `compose_encounter` actually build and place the roster
it plans, not just describe it — and make sure the boss is reported against
a real wealth budget, not just statted.

**A real architectural fork turned up building this, not assumed:**
`create_creature_blueprint` and `place_creature` had no reusable exported
function to call — their entire logic lived inside their MCP tool handlers
(unlike `write_script`, which already had `writeAndCompileScript` for
exactly this purpose). The original plan ("no new mechanism — just correct
wiring, call `equip_npc_by_role` for every roster member") assumed F5 could
just invoke other tools from inside its own handler, which isn't how this
codebase's tools are composed anywhere else — composition happens at the
orchestrator/LLM level (see `/create-adventure`'s own pipeline), not by one
MCP tool calling another's handler directly.

**Resolved by a real, behavior-preserving refactor**, confirmed safe by the
full pre-existing test suite passing unchanged:
- `create_creature_blueprint`'s ~275-line handler body moved into
  `buildCreatureBlueprint()` in `src/util/creature-builder.ts` (native
  params, not JSON strings); the MCP tool is now a thin shim that parses
  its string params and calls it.
- `place_creature`'s handler moved into `placeCreatureCore()` in
  `src/util/creature-placer.ts`, same pattern. `checkCollision` (previously
  a private helper in `placement-tools.ts`) moved to `src/util/collision.ts`
  so both the tool and the new core function can use it without a
  tools-importing-from-tools layering violation.
- A new `findSimpleWalkableSpots()` (also in `creature-placer.ts`) finds
  placement spots — deliberately simpler than `adventure_find_walkable`
  (center-outward ring search, no region/clearRadius support), since
  placement mode only needs "several walkable spots, spread apart," not
  that tool's full targeting.

**What placement mode actually does**, given an `area`: builds the boss
blueprint (`buildCreatureBlueprint`), places it and the support cluster
(`placeCreatureCore`, reusing the exact same validated blueprints F3
already chose), runs `verifyCreature` on the boss directly (the same
function `verify_creature` the MCP tool uses), and reports a real
`gearBudget()` figure and a real `pickWeaponPreference()` recommendation —
**the same functions `equip_npc_by_role` itself calls internally.**

**What it deliberately does NOT do: equip a specific weapon or armor
item.** `equip_npc_by_role` never guesses a real item resref itself — this
project's established discipline, confirmed in its own description
("never guesses a real item resref itself — source items with
list_blueprints/resman_search first"). `compose_encounter` holds to the
same rule: it reports the budget and the recommended weapon *type*, and
names `equip_npc_by_role` as the caller's explicit next step once a real
resref has been found. Fabricating one here would be the exact mistake
this project's own CLAUDE.md documents repeatedly getting caught and fixed
for.

5 new integration tests
(`src/tools/encounter-composer-placement.integration.test.ts`) against a
synthetic module index — real GIT mutations, real `verifyCreature`
execution, not mocked. Not yet confirmed against a real live-loaded module
(the mocked tests prove correctness in isolation; a real end-to-end
`run_live_verification`-style pass through an actual module is still
open).

### F7. Verification hook

**Objective:** close the same static/live gap this project's runtime-
verification system (`docs/runtime-verification-spec.md`) already exists to
close, applied to *this* feature specifically: a composed roster passing
`verify_all` proves the blueprints look right, not that the fight actually
plays at the intended difficulty once a real engine runs it.

**Design, phased:**
- **v1 (ships with F5):** `verify_creature`/`verify_all` on every generated
  creature — the existing static gate, no new mechanism.
- **v2 (after this feature has shipped and the live-verification work from
  this project's other current branch lands):** use `inc_spec_assert`
  (`SPEC_AssertInt`/`SPEC_AssertBool` — see
  `docs/runtime-verification-spec.md` §4) to assert the composed roster's
  real engine-level faction hostility and headcount at `OnModuleLoad`,
  mirroring exactly what the `systest-module` skill's fixture #8 already
  does for a hand-built faction pair. This is a small, direct reuse once
  that work is confirmed working live — not a new verification mechanism.

### F8. Wiring into `adventure-challenges`

**Objective:** once F5 exists, the `/create-adventure` pipeline's challenges
phase (today: hand-placing hostiles with tactical roles "melee, caster,
healer" per its own description, with difficulty judged narratively) should
call `compose_encounter` instead, so autonomously-generated adventures get
correctly-calibrated fights by construction rather than by LLM judgment call
per encounter. This is the last step, not the first — F5 needs to be proven
useful standalone before a skill depends on it.

## Suggested build order

1. **F2 (reverse EL solver) — DONE.** Pure math, fully unit-tested against
   the same real-data backing `encounter-difficulty.ts` already has, no new
   external dependencies, and independently useful even before F1/F5 exist
   (a human could use it by hand today).
2. **F1 (archetype library) — DONE**, starting with exactly one real entry —
   necromancer, the stated example — resolved against real 2DA data (not
   guessed), following this project's established "grow the table from
   verified lookups" pattern.
3. **F3 (support-roster chooser) — DONE** for that one archetype's `naturalSupport`.
4. **F5 (`compose_encounter`), dry-run mode — DONE.** Wires F1-F3 together;
   placement mode (actually building and placing the plan) is step 5 below.
5. **F6 — DONE.** Placement mode for F5, plus a real wealth-budget/weapon
   recommendation (not full auto-gearing — see F6's own entry for why).
   Needed an unplanned refactor (create_creature_blueprint/place_creature
   had no reusable exported function) before it was possible at all.
6. **F4 (ally-side reinforcement)** — report-only first (just surface the
   band), auto-generation deferred.
7. **F7 v2** and **F8** once the rest is proven and the live-verification
   branch has landed.

## What this document deliberately does not do

- It does not implement anything — every code sketch above is illustrative
  of the *shape* of the planned API, not a committed signature.
- It does not guess unverified 2DA/engine facts (the `SpellSchool` field,
  the exact minion-raising mechanic) — those are flagged as research items
  under F1, to be resolved the same way this project resolves every other
  2DA question: real `resolve_2da`/`search_2da` lookups, never assumption.
- It does not resolve the CR-vs-EL semantic question on the user's behalf
  permanently — it recommends a default (EL-for-the-whole-fight) and plans
  for the override, but that default should be confirmed with the user
  before F5 ships, not just inferred here.
