# Module Creation Pipeline — Logic and Priority by Phase

`/create-adventure` turns a one-line creative prompt into a complete, playable module
by running 9 sub-skills in a fixed sequence. Each sub-skill reads prior phases' output
from a shared `adventure.md` build log, does its work, and appends its own section.
This document is the companion to [AREA_GENERATION_PIPELINE.md](AREA_GENERATION_PIPELINE.md)
(which covers *how one area gets built*, a tool-level concern) — this one covers *what
the orchestrator and its 9 sub-skills decide, in what order, and what wins when two
things compete for the same budget, space, or attention*. For the exhaustive, exact
numbers behind any rule mentioned here (every formula, threshold, and 2DA lookup),
see [generation-rules-reference.md](generation-rules-reference.md) — that doc is the
reference; this one is the narrative logic.

## Phase order and the shared document

| # | Skill | Reads from `adventure.md` | Appends |
|---|-------|---------------------------|---------|
| 1 | `/adventure-plot` | `## Module` | `## Plot` |
| 2 | `/adventure-areas` | Module, Plot | `## Areas` |
| 3 | `/adventure-environment` | Module, Plot, Areas | `## Environment` |
| 4 | `/adventure-actors` | Module, Plot, Areas, Environment | `## Actors` |
| 5 | `/adventure-quests` | All prior | `## Quests` |
| 6 | `/adventure-challenges` | All prior | `## Challenges` |
| 7 | `/adventure-affordances` | All prior | `## Affordances` |
| 8 | `/adventure-polish` | All prior + live module state | `## Polish` |
| 9 | `/adventure-rewards` | All prior | `## Rewards` |

Each phase is strictly sequential — a phase never starts before the one before it has
written its section, because every phase after Plot depends on resrefs, tags, or
decisions the earlier phases made. There is no parallelism between phases (only within
a phase, e.g. "one agent call per area" for Areas/Environment/Challenges), and the
orchestrator never reorders this list.

## Orchestrator-level priorities (before any phase runs)

These are resolved once, before Phase 1, and nothing below can proceed without them:

1. **Level range is a hard precondition.** Every downstream phase (challenges,
   affordances, rewards) sizes itself off the target level — the orchestrator asks for
   one before doing anything else if the prompt didn't include it.
2. **D&D-theme fit is checked before module creation.** A non-fantasy prompt gets a
   warning (assets won't match) before proceeding, not after areas are already built.
3. **Party size, difficulty, area mode, and title** are all settled in this one
   pre-flight pass — area mode (`Full` vs `Scaffold`/`Scaffold (Minimal)`) in particular
   changes Phase 2's entire approach, so it's locked in before any area exists.
4. **Spoiler-free output is the standing priority for everything the user sees.**
   Sub-skills run via the Agent tool (never the Skill tool, which would leak their
   reasoning into the visible chat) specifically so spoilers never reach the
   orchestrator's own visible output, regardless of what any phase decides internally.
5. **The orchestrator only actively reviews after 2 of the 9 phases** — Areas
   (`check_area_connectivity`) and Quests (`verify_quest_completability`) — and trusts
   Polish (Phase 8) to catch everything else. This is itself a priority call: these two
   are judged the highest-risk, most cascade-prone failures (an unreachable area or an
   uncompletable quest breaks every phase built on top of it), so they're the only ones
   worth a mid-pipeline interruption.
6. **Dispatch efficiency has its own priority order** (added after a real rate-limit
   incident): combine naturally-grouped calls first, prefer forking over a fresh agent
   once context exists to share, do small bespoke edits directly rather than dispatch
   for them, and never parallelize anything that mutates `adventure.md` or module state
   — correctness (no racing writes) outranks speed here unconditionally.

---

## Phase 1 — Plot

**Objective:** produce the one structured document every later phase parses by
heading name. Builds no module content itself.

**Logic:** a fixed schema, written in one pass, that must be followed exactly since
downstream skills parse it by heading — Premise → Locations → Connections → Key NPCs →
Antagonists → Quest Objectives (a primary 3-stage quest, optional side quests) →
Challenges → Loot & Economy. Grounded in what's actually buildable: calls
`list_tilesets`/`get_module_summary` before inventing terrain or creatures that don't
exist in this engine's palette.

**Priority:** location count 2-5, with 3 as the sweet spot — fewer than 2 is cramped,
more than 5 doesn't survive the rest of the pipeline's per-area cost. Every location
must earn its place (no padding), the quest flow must route through every location, and
challenges must escalate toward the climax area. **A non-combat solution path is
required**, not optional — the one hard narrative constraint in this phase.

---

## Phase 2 — Areas

**Objective:** build every area the plot named — tileset, terrain, atmosphere,
aesthetic doors, and the connectivity graph between them.

**Logic, in priority order:**
1. **Tileset choice** is a highest-priority keyword match against the plot's own
   terrain description, then interior/exterior split, then crosser/feature
   availability — never picked for visual preference alone.
2. **Feature selection is mandatory for `Area Mode: Full`** (and skipped entirely for
   either Scaffold mode) — 3-6 tileset feature groups chosen by thematic fit via
   `adventure_list_features` *before* layout generation runs, not decorated on after.
   A settlement-themed area requires a house/building feature group specifically.
3. **Perimeter encapsulation is a hard rule** — the outer tile ring is never walkable,
   checked for both interior and exterior areas, because nothing downstream can safely
   assume a sealed map otherwise.
4. **Terrain-adjacency chains are validated before zone design**, not discovered by a
   failed solve afterward — a layout that needs a direct transition the tileset doesn't
   support is corrected at the planning step.
5. **All inter-area transitions use `adventure_create_transition` exclusively** — a
   deliberate, documented departure from how real hand-built modules do it (doors/
   triggers), chosen because one call wires both areas' light-shaft portal and landing
   waypoint atomically instead of needing matched setup on each side.

**Sizing floor:** interior areas 12×12 minimum, exterior 18×18 minimum — below this the
BSP split can't guarantee a 3-tile room with a 2-tile margin.

---

## Phase 3 — Environment

**Objective:** dress each built area with placeables, ambient/point sounds, and
waypoints. Ambience only — nothing here is plot-pivotal.

**Logic:** placeable density scales with area size (roughly 20 objects at 8×8, up to
~40 at 18×18, interiors denser than exteriors), with about 40% of placed objects marked
`Useable` and given a flavor `Description`. **No wall-mounted placeables** — this
project has no wall-position data, so everything placed is freestanding, a hard
constraint rather than a style choice. Sound radii must never overlap (0-3 ambient +
2-4 point sounds per area, capped). Waypoints: 2-5 per area; an entrance waypoint faces
*into* the area; a landmark waypoint's label is derived from its feature group's own
name.

**Priority:** placeables → sounds → waypoints → a dedicated room-coverage retroactive
safety-net pass (**Phase 5b** in that skill) that specifically checks every 2+-tile
walkable room/clearing has at least one object — this exists because the main
placement pass can leave an area feeling empty, and it's cheaper to patch
after the fact than to get density exactly right on the first pass everywhere.

---

## Phase 4 — Actors

**Objective:** place non-hostile NPCs (companions, Key NPCs, ambient creatures), all
on Commoner faction, with greeting dialogs.

**Logic — companion creation order is canonical and sequential, never reordered:**
race → racial feats → ability scores → class → class feats → skill points → HP,
matching `build_npc_stat_block`'s own fast path. **Give every companion clothing, even
with no mechanical property** — an empty chest slot isn't a valid default.

**Gear priority (shared with Challenges, see below):** weapon first, then armor second
with whatever gold remains — armor tier comes from the creature's own baked Armor
Proficiency feat, never from taste, and within that tier the highest-AC option the
remaining budget affords wins over a cheaper "good enough" one. **Base AC outranks
enchantment**: compare by base AC Bonus first, and only reach for a magical item when
it's the enchanted version of that same highest-affordable-base-AC item — never trade
down base AC for a cheaper magic bonus.

**Casters get randomized spells by default** — `create_random_abilities_system`,
wired onto the creature's spawn/end-round scripts, is the project-wide default for
every caster this pipeline generates (companion or Key NPC) unless the plot needs a
fixed ability. The one sequencing difference that matters: a **companion**'s spells
come alive through the live `LevelUpHenchman()` call at recruit (`a_hen_join`,
`bReadyAllSpells: TRUE`); a **non-companion Key NPC** is never recruited and never gets
that call, so it needs the random-abilities wiring (or a fixed `spells` param) applied
directly at build time — skipping this is the single most common way a caster NPC ships
with nothing to cast.

**Ranged creatures need a melee weapon too** (even unequipped, in inventory) — the base
AI auto-switches on ammo depletion only if one exists to find.

---

## Phase 5 — Quests

**Objective:** implement the plot's quest objectives as real journal entries, items,
condition/action scripts, and dialog branches — modifying existing NPC dialogs in
place rather than building new ones.

**Logic:** quest **stage** state lives on `GetModule()` only, never on a PC object —
the co-op-correctness rule, since per-PC state would let one player progress while
others can't see it. Item-possession checks correctly stay per-PC
(`GetPCSpeaker()`) — the two kinds of state aren't interchangeable.
`AddJournalQuestEntry`'s `bAllPartyMembers` defaults `TRUE` and is never overridden.

**Dialog ordering is a hard, mechanical rule, not a preference:** the engine evaluates
a `StartingList` top-to-bottom and takes the first entry whose condition is `TRUE`, so
higher-stage (more specific) conditioned entries must sit above lower-stage ones, and
the original unconditioned greeting must be **last**. The skill achieves this by always
inserting the new lowest-priority entry at position 0, repeatedly, rather than
appending.

**Priority:** journal → quest items (checked for tag collisions before creating) →
condition scripts → action scripts → dialog modification, with a **mandatory
per-NPC verify before moving to the next NPC** — this phase doesn't batch all dialog
edits and verify once at the end; it closes the loop on each NPC before touching the
next, so a broken dialog never compounds into a second one. Combat placement and
reward/XP assignment are explicitly **not** this phase's job (Challenges and Rewards
own those).

---

## Phase 6 — Challenges

**Objective:** place hostile creatures with tactical roles (melee/caster/healer/tank)
and traps, all Hostile faction, escalating toward the climax area the plot named.

**Logic — difficulty tiers by target-level bracket**, each with its own CR/HP/Primary-
Stat/Natural-AC range (Minion/Standard/Elite/Boss). **No non-Boss tier's Primary Stat
exceeds 15 — the Elite Array's own ceiling** — at any bracket; difficulty still
escalates with level through CR, HP, secondary stats, and Natural AC once Primary Stat
hits that ceiling. Only Boss may exceed it.

**Gear budget priority, identical to Actors':** weapon first, armor second with
whatever remains, armor tier gated by the creature's baked proficiency feat, highest
AC within that tier preferred over the cheapest option that merely clears the
proficiency bar. Budget comes from `get_wealth_budget(level, role)` — `pc`/`elite` get
100% of a same-level PC's wealth (the real 3.5e rule: full PC wealth on a classed NPC is
worth CR+1, counted against the EL math, not free), `standard` gets 50%, `mook` 25%.

**Magic-item ceiling by tier:** Standard enemies get mundane gear only; Elite gets 1-2
minor (+1-tier) items; Boss gets 2-3 moderate (+1/+2) items, never exceeding the
wielder's own power level. Combat Role Templates (Melee Fighter, Tank, Ranged, Caster,
Healer, Monster/non-humanoid) fix the class/feat/equipment shape per role so a "Ranged"
creature is never accidentally built with a Fighter's heavy-armor loadout.

---

## Phase 7 — Affordances

**Objective:** give the player a way to address what Challenges just placed — stores,
container loot, starting gold, and the module's level/XP-adjustment entry point.

**Logic:** **at least one store is mandatory**, even in a fully-hostile module — invent
a peddler or quartermaster rather than skip it. Starting gold is `50 × targetLevel` gp;
the level-adjustment XP award is `targetLevel × (targetLevel − 1) × 500`. An in-
adventure store's economy defaults to 120% buy / 80% sell; a separate **Starter store**
pattern (placed in a pre-story area, kept permanently rather than deleted at the end of
Phase 2) runs at a strict 100/100 with no story content, and may top a new character up
to its full wealth-by-level via a shortfall-only `OnClientEnter` payment — the one place
in this whole pipeline where a per-connect, non-fanned-out reward is actually correct,
because it fires once per connecting player already.

**Priority:** container loot is tiered by position in the adventure — early areas get
consumables, mid-adventure gets better gear, pre-boss gets strong consumables — and
explicitly **not every container** needs loot. Store stock is sized against
`get_wealth_budget(level, "pc")` as a ceiling: mundane staples are effectively
unlimited, a few items sit near the budget ceiling as deliberately "aspirational"
purchases the player saves toward. 1-2 stores maximum — no shopping districts.

---

## Phase 8 — Polish

**Objective:** a cross-cutting audit over everything the first seven phases built —
fixing what it finds, not just flagging it.

**This is the only phase with an explicit, named severity order, and it governs every
fix decision in this phase:**

1. **Blocking** — player cannot progress (broken transition, inaccessible quest NPC,
   unobtainable quest item, no way to trigger completion). Never skipped.
2. **Breaking** — module fails to load or crashes (missing script, unresolvable
   blueprint). Never skipped.
3. **Wrong** — content works but is incorrect (hostile in a safe area, no boss in the
   climax area, an unstocked store).
4. **Minor** — small gaps (a dead-end dialog node, a wrong entry coordinate). The only
   tier allowed to ship undocumented-but-unfixed if the fix is genuinely complex.

**Audit order:** module validation baseline (filtering known base-game false positives)
→ area connectivity → quest completability (automated trace, then a 5-step manual
follow-up per quest) → NPC/dialog integrity → a room-coverage safety net (same purpose
as Environment's own Phase 5b, run again here as a backstop) → challenge placement
(boss in the climax area; zero hostiles in safe areas) → affordances integrity → plot-
vs-module narrative consistency → final validation.

**This phase does not place new content** — any gap that needs new creatures, areas, or
items is Rewards' job, not Polish's, even if Polish is the one that found it.

**Final gate, run last, after every fix and after repacking:**
`verify_all(checkWalkable: true)` must report `shippable: true` — zero errors module-
wide — before Rewards (Phase 9) is allowed to start.

---

## Phase 9 — Rewards

**Objective:** the last content-writing phase — quest XP, placed reward items, the
module's win-state sequence, its player-facing description, and a DM guide for running
it at a tabletop.

**Logic — two separate XP channels, never conflated:** combat XP is automatic and the
*engine* divides it by party size; quest XP (this phase's job) is **not divided** —
every player gets the full amount, so a quest-XP total is never multiplied by party
size to "share it out." Quest XP budget is set roughly equal to estimated total monster
XP (so quests double the pace of grinding alone), split 60-70% to the primary quest and
the remainder evenly across side quests, with a small party-size nudge (×1.15-1.35 for
2-4 players) to offset the *monster* XP that party size genuinely does shrink per
player.

**Reward-item power curve, the explicit priority order for this phase's "signature
loot":** Boss reward > mid-adventure reward > creature drops > store items. A boss
reward is mandatory and sized to roughly a quarter to a third of a single character's
total wealth at the target level — enough to feel earned, not enough to trivialize the
rest of the adventure's treasure. Items already counted in Challenges (creature
equipment) or Affordances (container/store loot) are never duplicated here.

**Final priority ordering, in the order this phase actually runs:** XP budget →
`create_reward_system` (must confirm `compiles: true` before any reward script is
written against it — a broken include fails every later reward silently) → assign
quest XP (only to quests with a real completion entry) → design reward items → place
them (co-op caveat: a shared signature reward needs a script fan-out or one copy per
expected player, since placed loot can't fan out on its own) → win-state script → a
verification pass → **set the module's player-facing description** (target level,
party size, henchman count, one vague non-spoiler hook — never a plot detail) →
**write the full-spoiler DM guide** (the one deliverable in this entire pipeline that is
spoilers-on by design) → repack.

---

## Cross-cutting priority principles

A few rules recur across nearly every phase, and together they explain *why* the
pipeline is shaped the way it is above:

- **Idempotency before mutation.** Nearly every phase checks whether its target already
  exists (a tag, a dialog node, a container's contents) before placing/writing, so a
  retried or re-run phase never duplicates work.
- **Fix it, don't just flag it.** A sub-skill that finds something questionable from a
  prior phase corrects it directly (within its own scope) rather than surfacing it as a
  question — consultation is reserved for the orchestrator's own judgment calls, never
  pushed back to the user mid-pipeline.
- **Verify locally before moving on, not in one batch at the end.** Quests verifies
  each NPC's dialog before the next; Areas checks connectivity before linking
  transitions; this bounds how far a mistake can propagate before it's caught.
- **Never guess a resref, a 2DA value, or an item property ID.** Every phase that
  sources real content (`list_blueprints`, `resman_search`, `resolve_blueprint`,
  `resolve_2da`) treats "not found" as a reason to search harder or skip, never a
  reason to fabricate one — this is the single most repeated rule across every
  sub-skill in this pipeline.
- **Co-op correctness outranks convenience everywhere state or rewards are involved.**
  Shared state lives on the module or the quest giver, never a PC object; XP/gold/items
  fan out to the whole party by default; the one documented exception
  (`Mod_OnClientEntr`) is an exception because it already fires once per player, not
  because fan-out stopped mattering.
- **Spoiler-free applies to what the *user* sees, not to what sub-skills know.** Every
  phase has full access to the plot's twists internally (Polish and Rewards especially
  depend on this) — the constraint is specifically on the orchestrator's own
  user-visible status messages, which stay vague and atmospheric regardless of how much
  the pipeline itself knows at that point.
