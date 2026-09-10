# Build Notes: "The Six-Fold Trial" — Findings for Future MCP Improvement

Source: a full, real 9-phase `/create-adventure` run (single PC + 5 henchmen, level 4,
7 areas across 7 tilesets, 45 creatures, 31 dialogs, 7 stores, 7 custom items — the
most complex build this project has run end-to-end). The build spanned multiple
sessions, survived two account-level API rate-limit interruptions and one full
context-compaction, and every phase's self-report was independently re-verified by
the orchestrator rather than trusted at face value. This doc collects what that
process surfaced that **isn't already captured** in `CLAUDE.md`'s Known Pitfalls —
either brand-new bugs, or gaps in tooling/process that this build made concretely
visible for the first time. Treat this as a feeder doc for future `CLAUDE.md`
entries and prioritized tool work, not a permanent record — fold anything durable
into `CLAUDE.md` and delete or shrink this file once that's done.

## 1. New confirmed bugs

### 1a. A "fixed" edit can silently fail to survive a long multi-phase pipeline — mechanism not fully isolated

During the areas phase, the orchestrator found `_start`'s `Mod_Entry_X/Y` on
non-walkable terrain (15,15,0), fixed it via a direct `nwn_gff` edit to
`module.ifo` + immediate `repack_module` (the documented safe pattern for a float
field `modify_gff_field` can't write), and verified the fix was applied at the time.

Six phases and one session interruption later, the polish phase independently
re-extracted the *packed* `.mod` from scratch (bypassing the MCP layer entirely,
not trusting `load_module`'s in-memory state) and found `Mod_Entry_X/Y` was **still
(15,15,0)** — the original fix had not persisted into the shipped module. It had
to be re-applied and this time verified by a second from-scratch extraction.

**Root cause not conclusively isolated.** The build involved many subsequent
`load_module`/`repack_module` cycles (one rate-limit recovery alone spanned several
`load_module` calls), any of which could in principle have raced with or been
overwritten by the original fix depending on exact ordering — but no single
reproducing step was caught in the act. Flagging as a confirmed, real
data-loss-of-a-fix bug with an open mechanism, not a one-off fluke: the *only*
reason it didn't ship broken is that polish independently re-derived ground truth
from the packed archive instead of trusting `adventure.md`'s claim that it was
already handled.

**Recommendation:** the safest fix is procedural until the mechanism is found —
any phase/tool that claims to have fixed a previously-flagged structural issue
should be re-verified from a fresh archive extraction (not `load_module`'s cached
index) at the *next* checkpoint that touches that resource, not just once at fix
time. Consider adding a lightweight "re-verify prior fixes" step to
`/adventure-polish`'s standard scope if it doesn't already do this generically.

### 1b. Door `Lockable=0` silently defeats a set `OpenLockDC` — no checker catches it

Special Requirement: a locked gate needed **two** working paths — destroy it (HP/
hardness) or lockpick it (Open Lock DC). The placed door had `Locked=1` and
`OpenLockDC=28` set, which reads as correct from the GFF alone, but `Lockable` was
left at its default `0`. In the NWN engine, `Lockable=0` means the lockpick
interaction never triggers at all, regardless of `OpenLockDC` — the door silently
only had the "destroy it" path working.

Caught only because a human specification ("must be pickable OR breakable") gave
polish a reason to manually check every relevant field on the placed door, not
because any verifier flagged it. `verify_door` currently has no check for
"`Locked=1` but `Lockable=0`" as an inconsistent/likely-unintended state.

**Recommendation:** add a `verify_door` check — `Locked=1 && Lockable=0` should be
at minimum a warning ("door is locked but not lockpickable — OpenLockDC will never
be checked"). This is also the concrete first data point for the door/gate
dual-path checker already on `CLAUDE.md`'s Verification Gate TODO list (item 3) —
this exact bug is what that checker should exist to catch.

### 1c. `create_item_blueprint`'s `baseItem` silently overrides `sourceResref`'s implied item category

Building a rapier reward by cloning a real rapier blueprint (`sourceResref:
"nw_wswrp001"`) while *also* passing an explicit `baseItem` guess (a wrong literal,
intended as "rapier" but actually battleaxe's row) produced an item that was
silently the wrong weapon type — `baseItem` won over what the clone source implied,
with no error or warning from `create_item_blueprint` or from `verify_item`. Only
caught by manually cross-referencing `resolve_blueprint` + `resolve_2da`/
`search_2da` against the real `baseitems.2da` row.

**Recommendation:** either (a) have `create_item_blueprint` warn/error when both
`sourceResref` and an explicit `baseItem` are given and they disagree, or (b) at
minimum document the precedence (`baseItem` wins) explicitly in the tool's
description so callers know passing both is a footgun rather than a redundant
safety net. A `verify_item` check comparing `BaseItem` against what the item's
`Description`/name implies is much harder to do reliably and probably isn't worth
building — the tool-level fix is cheaper and closes the gap at the source.

### 1d. Intra-area walkable-zone connectivity has no standard checkpoint — a real area shipped internally split for 5 phases before being caught

`Frostmarch` generated with **two disconnected walkable zones** (159 and 43 tiles,
no path between them) — the documented single-tile snow causeway that was supposed
to connect them didn't actually exist; that row was 100% water across the full
width. The small, cut-off pocket held the area's entry point *and* a full ambush
encounter; the other held a skill trial, a key NPC, a store, and the exit. A player
entering normally would have been stuck immediately with no way to reach most of
the area's content.

This is a single-area internal defect, not an inter-area reachability problem —
`check_area_connectivity` (the tool used at the areas-phase review checkpoint per
`create-adventure/SKILL.md`) only verifies that areas are reachable from each other
via transitions; it says nothing about whether an individual area's own walkable
surface is one connected region. As a result this bug went undetected through the
areas-phase checkpoint, then through environment, actors, quests, and challenges —
each of those phases placed real content (an ambush encounter, a trial trigger, an
NPC, a store) into one or the other pocket without anyone noticing the area was
split, because nothing in the standard phase-review flow checks for it. It was
only caught in polish, and only because that phase's author cross-checked
`visualize_area`'s zone report against an independent tile-grid BFS rather than
trusting either the zone count or the areas-phase's narrative claim about the
causeway.

**Recommendation:** this is the highest-value gap found this build. Elevate an
intra-area zone-connectivity check (a single-zone-count check, or "all zones
mutually reachable") into the **same areas-phase review checkpoint** that already
runs `check_area_connectivity` — `visualize_area`'s existing `zones[]` output with
a `connected`/`tileCount` field per zone is already most of what's needed; this
looks like it could be a fairly small addition to `verify_area` rather than a new
tool. Given how late this class of bug can hide (5 phases deep, past both the
skill's own designated checkpoints), catching it at area-generation time instead
of at final polish would save significant rework in a real build.

## 2. Process/methodology findings (not code bugs, but worth keeping)

### 2a. A phase's "already fixed" self-report is not sufficient evidence on its own — recheck at the *next* touch, not just once

Directly demonstrated by 1a above. The general discipline this project has used all
session ("independently re-verify every phase's self-report via a direct tool
call") is necessary but not quite sufficient by itself — it caught this bug only
because *polish* happened to independently re-derive state from the raw archive
rather than re-trusting `adventure.md`'s claim that areas-phase already handled it.
Worth stating explicitly as a rule: a structural fix claimed complete by phase N
should be spot-checked again at phase N+k, not assumed permanent once verified
once.

### 2b. Rate-limit interruption recovery pattern — confirmed twice now, worth formalizing

Both times an account-level API rate limit killed a background phase agent mid-run
(once during environment, once during affordances), the correct recovery was the
same: **don't relaunch blind, and don't assume total failure.** Check real on-disk/
module state directly first via a cheap read-only tool call (`get_area_placeables`,
`list_stores`, etc.) — if the interrupted agent's own tool calls were still
succeeding right up to the failure, real partial progress may exist even though the
agent itself reported (or silently produced) no `<result>`. Only decide "relaunch
fresh" vs. "relaunch rescoped to just the missing pieces" after that direct check,
not before. This has now saved real duplicate-work risk twice; worth being an
explicit documented step in `create-adventure/SKILL.md`'s own orchestrator
instructions, not just something the orchestrator happens to remember to do.

### 2c. A durable, human-readable progress file (separate from `adventure-status.json`) proved genuinely load-bearing

`orchestrator-progress.md` — created only because the user explicitly asked
("track your progress in case of model interruption") — is what made the two rate
limit hits and one context-compaction mid-build recoverable without re-deriving
state from scratch or re-running completed phases. `adventure-status.json` alone
would have been enough to know *pass/fail* per phase, but not enough to know *why*
a given warning was safe to ignore, what was independently re-verified vs. only
self-reported, or what to do next after an interruption. Worth promoting from
"something I do when asked" to a standard step `create-adventure/SKILL.md` tells
every orchestrator run to create up front, given how much it helped on a build this
long.

### 2d. `verify_all`'s default `coop: true` repeatedly produced false "errors" in phase self-reports for this single-player module

Nearly every phase this build ran its own internal `verify_all` without passing
`coop: false`, then reported a false "1 error" in its own self-report — the
orchestrator had to re-run with the correct flag every single time to get the true
result. This happened often enough (6+ times across the build) that it's a real
recurring friction point, not a one-off oversight.

**Recommendation:** since `adventure.md`'s Module section already records party
size / single-vs-multiplayer intent up front, consider having every phase's
skill instructions explicitly say "read the module's declared party size from
`adventure.md` and pass `coop: false` to any `verify_all`/`verify_coop_rules` call
if it's 1" — or, more robustly, have `verify_all` itself default off the module's
own declared intent (e.g. a value the orchestrator records once and every
tool call can read) rather than needing every caller to remember the flag.

## 3. Priority read for future work

Ranked by how much real damage each class of bug caused or could have caused in
this build, cheapest-to-build first:

1. **`verify_door`: flag `Locked=1 && Lockable=0`** (§1b) — small, isolated,
   directly prevents a shipped-broken puzzle mechanic.
2. **`create_item_blueprint`: warn/error or document `baseItem`-vs-`sourceResref`
   precedence** (§1c) — small, prevents silent wrong-item bugs.
3. **Intra-area zone-connectivity check folded into the areas-phase checkpoint**
   (§1d) — larger but highest-value: this class of bug can hide for 5+ phases and
   corrupt placement work built on top of it. `visualize_area`'s existing `zones[]`
   data does most of the work already.
4. **Re-verify prior "already fixed" claims at each subsequent checkpoint that
   touches the same resource, not just once** (§1a/§2a) — process discipline,
   ideally also becomes a habit baked into `/adventure-polish`'s standard scope.
5. **Formalize rate-limit recovery and the progress-tracking file as standard,
   documented steps in `create-adventure/SKILL.md`** (§2b/§2c) — process-only,
   zero new code, but saves real rework on any future long build.
6. **`coop:false` propagation for single-player modules** (§2d) — quality-of-life,
   removes a recurring false-positive every phase currently has to work around by
   hand.
