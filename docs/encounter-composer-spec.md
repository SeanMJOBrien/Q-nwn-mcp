# Encounter composer: role + target difficulty → a built, balanced roster

Status: **F1, F2 and F3 are built.** F4-F8 remain planning only.

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

### F5. `compose_encounter` — the actual entry point tool

**Objective:** the single call the user's stated goal describes. Ties F1-F4
together into one MCP tool call instead of requiring the LLM to orchestrate
five separate tools correctly, in the right order, every time.

**Proposed shape:**

```
compose_encounter({
  roles: ["necromancer"],        // one or more archetype names (F1)
  targetDifficulty: "CR 6" | { el: 6 } | { label: "hard" },  // see the CR-vs-EL open question above
  partyLevel: 6,
  partySize: 4,
  area: "crypt_01",               // optional — if given, builds AND places; if omitted, dry-run (returns the roster plan only)
  pinBossCR: false,                // optional override, see open question above
})
```

**Output:** the full roster — each creature's role, resref/tag, build
rationale (why this CR, why this count), the achieved combined EL and its
difficulty band, and (if an `area` was given) confirmation of placement plus
a `verify_creature`/`verify_all` pass. A dry-run response is the same shape
minus placement confirmation, so an LLM can review the plan before
committing to it — consistent with how `adventure_generate_layout` /
`adventure_apply_layout` are already split into "propose" and "commit"
steps elsewhere in this codebase.

### F6. Equipment and wealth integration (no new mechanism — just correct wiring)

**Objective:** make sure every creature F5 builds is actually geared, not
just statted. No new tool — `equip_npc_by_role` already exists and already
does exactly this (proficiency-checked gear against `get_wealth_budget`,
ending in its own `verify_creature` pass). F5 just has to call it for every
roster member instead of leaving that step to the caller.

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
4. **F5 (`compose_encounter`)** wiring F1-F3 together, dry-run mode only
   first (no placement) so the roster-planning logic can be reviewed and
   tested in isolation before it touches a real module.
5. **F6** (equip integration) and **placement mode** for F5 together, since
   placement needs gear to already be decided.
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
