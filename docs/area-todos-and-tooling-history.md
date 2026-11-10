# Area TODOs and tooling-history notes

Moved verbatim from CLAUDE.md (work-plan A4, 2026-11-10).

**TODO — area prefabs.** Reconstructing complex multi-tile architecture (castle
gates with towers, cave mouths carved into a rise) purely via corner/crosser
matching is fragile — most of one session's worth of user bug reports were exactly
this class of problem. `feature-collars.ts` (see the Pitfalls entry below) is the
cheap fix for *known* height-transition features. Two bigger, not-yet-implemented
approaches — hand-author a piece once, stamp the verified result into generated
areas as an atomic unit instead of re-deriving it tile-by-tile every time — are
fully spec'd out in `docs/area-prefabs-spec.md`: prefabs as oversized feature
groups (smaller lift, reuses most of `packFeatures`), and prefabs as whole BSP
rooms with declared corridor-connection points (bigger lift, needed for something
the size of a full walled castle compound with real interior space). Recommended
sequencing, the exact deliverable a hand-built prefab source area should look
like, and a concrete starter-library TODO (specific prefabs for the *user* to
hand-build in the toolset, two batches, priority order) are all in that doc.

**TODO — reserve guaranteed flat, mutually-matching space for a multi-tile
feature before packing it (user-raised).** Surfaced directly by the Frostmarch
cave fix in "The Six-Fold Trial": `feature-collars.ts` gives a *known*
height-transition feature a correct 1-tile collar, but nothing in the BSP/room
layout stage reserves a larger flat region *around* where that feature will land
— so extending a collar into a believable raised plateau (or any multi-tile
feature that needs several flat, corner-matching tiles on all four sides to sit
in cleanly) is always a manual post-hoc patch, not something the generator
planned room shape/size around. Worth a real look: could `packFeatures` (or the
room-sizing pass before it) query a feature's real footprint + collar
requirement and bias BSP room dimensions/placement to guarantee a flat,
same-terrain, same-height buffer of the right size before ever attempting to
place it — closing the gap between "the collar is correct" and "there's
actually room for the collar." Related to, but distinct from, the area-prefabs
work above (prefabs solve *authoring* a known-good multi-tile piece once;
this solves *making room* for one, prefab or procedural, before packing it).
Still open. A related but separate gap — *reserving a road/avenue* between
stamped groups (not a flat buffer around one feature) — is now built; see
"Stamped-group rotation, entrance detection, and road/avenue preservation"
under Layout Rules above.

**TODO — rebuild a single area in place from an existing/completed module
(user-raised).** No current tool lets you regenerate just one area of an
already-built module using the normal `adventure_generate_layout`/
`adventure_apply_layout` pipeline when that area's design turns out to not suit
the player (bad layout, an unfixable structural bug, or simply "player didn't
like this one") without hand-patching tile-by-tile as this session's Frostmarch/
keepbailey fixes did. Worth scoping: `delete_area` + `create_area` +
`adventure_generate_layout`/`adventure_apply_layout` already exist as the raw
pieces, but re-wiring the area back into the transition graph (doors/portals to
its neighbors), re-placing everything the deleted area held that other systems
already reference (quest triggers, companion recruit points, a key NPC's
dialog-driven state), and deciding what should regenerate vs. carry over
untouched are all real design questions, not just plumbing. A dedicated
`rebuild_area`-style capability (or a documented recipe using existing tools)
would turn "this area has issues" from a multi-hour hand-patch into a
supported, repeatable operation.

**TODO — a per-module git repo, committing the JSON view of each resource, not
raw binary GFF (user-raised).** Each module's temp dir is currently disposable
and regenerable from the packed `.mod` (see the `load_module` re-extraction
pitfall below) — there's no history, and reverting one bad edit means hand
re-extracting from the last repack the way this session's recovery from a
corrupted file did. A real per-module git repo would give that for free, plus
branching/diffing for the area-rebuild TODO above ("try a regenerated area,
diff against the old one, revert if the player doesn't like it"). The design
question the user specifically flagged: commit the **JSON round-trip form**
this project already produces via `nwn_gff` (or generates for tool output),
not the raw binary `.git`/`.utc`/etc. — binary GFF diffs as "changed," which
tells you nothing; the JSON form diffs as "which field on which struct
changed," which is the whole point of having history at all. Needs real
scoping before building: where the repo lives (not `/tmp`, which today's temp
dir intentionally is, for good reason — see the pitfall below), what triggers
a commit (every `repack_module`? every mutating tool call, git-embedded
resources included?), and whether the binary form is committed alongside the
JSON form (probably yes, since the JSON is derived and the binary is what
actually ships) or regenerated from JSON on demand.

**TODO — a systematic test/analysis pass across every native (base-game) tileset,
one throwaway single-area module per tileset (user-raised).** Everything this
project currently knows about a specific tileset's real quirks — `ttf01`'s building
palette being far smaller than `tno01`'s (surfaced only by trying to avoid rotation
in "The Twin Villages Waystop"), most named building groups' doors failing the
`getGroupEntrances` 3m-offset exterior/interior heuristic (found empirically,
group by group, only when a real build needed it), which groups' corner terrain is
Grass vs Dirt vs Forest and so seams against a given zone, which multi-tile groups
are genuinely rotation-safe (single, symmetric-enough models) vs. structurally
unsafe (a unique mesh per tile — see the rotation-handedness saga above) — has come
from hand debugging one real build's specific groups, one tileset at a time, after
something already broke. Doing this proactively, once, for every native tileset
would turn "discover the gap live, at content-build time" into "already known and
documented before it can bite a build."

**What such an area/analysis should capture per tileset**, informed directly by the
gaps this session found the hard way: every named group placed at least once (native
rotation 0, since that's the only rotation always safe to test) with its full
`get_tileset_details` `entrances` result recorded next to its REAL door bearing data
(so the entrance-detection heuristic's actual hit rate per tileset is measured, not
assumed); each group's own corner-terrain pattern tabulated against the tileset's
declared floor/wall/border terrains (which ones will seam against which zone types);
a rough census of building-type variety (how many distinct named groups exist,
usable as a sanity check before promising a build "N distinct buildings" the way
`ttf01`'s sparse palette couldn't actually deliver); and, longer-term, some way to
flag which multi-tile groups are plausibly rotation-safe — there's no automated way
to tell a symmetric/repeatable piece from a unique-mesh-per-tile one from `.set` data
alone (per the settileLibrary finding above), so this might start as a manually
curated allow-list seeded by this pass rather than something fully automatic.

**Not yet scoped — real open questions before building this**: one area per tileset
vs. several (a tileset with hundreds of groups may not fit every one, unrotated,
into a single reasonably-sized area); whether this becomes a new MCP tool (a
`survey_tileset`-style capability that builds the throwaway module itself) or a
one-off script/skill run manually per tileset and its findings folded into this
doc; and how the output should be stored so it stays a living reference rather than
a one-time report — most likely a per-tileset findings doc under `docs/`, in the
same spirit as `docs/encounter-difficulty-findings.md` and the other verified-finding
docs this project already keeps, rather than something baked into `tileset.ts` itself.

**Tooling to prevent the classes of mistakes found late in one session's own
work (user-raised: "how do we avoid these in the future, can we add script
and tooling to keep progress moving forward").** Three real, self-inflicted
mistakes happened in one session while hand-fixing a shipped module. #1 and
#2 below are now fixed with real tooling rather than relying on remembering
prose rules under time pressure; #3 is still open.

1. **FIXED — `setGffByPath`/`modify_gff_field` now coerces a value to the
   field's real GFF type instead of storing whatever the caller sent
   verbatim.** Root cause of "modify_gff_field cannot write float fields" and
   the broader "corruption isn't limited to float fields" pitfall above: MCP
   clients routinely send numeric-looking params as strings (see
   `util/params.ts`'s own comment on why every numeric tool param is
   `z.string()`), and the old `field.value = newValue` had zero type
   awareness — a float field could end up as `{"type":"float","value":"60"}`,
   which `nwn_gff` rejects. `coerceGffValue()` in `util/gff-path.ts` now
   coerces against int/float/string GFF type families on every set (existing
   field: coerce against its real type; new field: coerce against the
   supplied `gffType`), and explicitly **refuses** `struct`/`list`/
   `cexolocstring`/`void` with a clear error rather than attempting and
   silently corrupting — those need real internal structure a flat
   path+value+type API can't express safely; use a typed tool instead. 9 new
   unit tests in `gff-path.test.ts` cover the coercion and the refusal.
   `modify_gff_field` is the one canonical tool for this class of edit now —
   there's no need for a parallel raw-script recipe anymore for simple scalar
   field edits (bulk edits across many structs in a list — the pattern behind
   this session's own faction-flip and store-field-rename fixes — still has
   no dedicated tool; that's real future work, not covered by this fix).
2. **FIXED — `load_module` now refuses to reload/switch when the current
   module has unpacked changes, instead of silently discarding them.** Root
   cause of the "never call load_module between an edit and its repack"
   pitfall being violated anyway: nothing enforced it. `util/dirty-state.ts`
   tracks which temp directories have been written to since their last clean
   point (scoped per-directory, not a single global flag — a global flag
   would make `create_module`'s own throwaway assembly-directory writes look
   like they dirtied whatever *other* module happened to already be loaded,
   a real cross-contamination bug caught while building this). `jsonToGff`
   (the near-universal write path — 30+ call sites across the codebase) and
   `writeAndCompileScript` both mark their target directory dirty on every
   write; `repack_module` and a fresh extraction both clear it. `load_module`
   now checks `isDirtyUnder(currentIndex.tempDir)` before re-extracting and
   throws a clear error naming the fix (`repack_module` first, or pass
   `force: true` to `load_module` to discard deliberately) — covers both
   reloading the *same* module and switching to a *different* one while the
   current module is dirty (switching wipes the old temp dir the same way a
   reload overwrites it). Verified end-to-end against a real module (not just
   unit tests): a scratch write correctly triggers a refusal, and `force:
   true` correctly re-extracts clean. 5 new unit tests in
   `dirty-state.test.ts`, including the cross-contamination case.
3. **FIXED — a race between a dispatched background agent's own
   `load_module` and concurrent direct edits to the same shared temp dir**
   from another process. Both a real orchestrator process and an Agent-tool
   subagent process share one temp dir per module (by design, so sidecar
   files like `adventure.md` persist) — confirmed genuinely separate OS
   processes, not shared in-memory state (a subagent's `load_module` really
   did revert the orchestrator's own pending edits mid-session; if they
   shared process state, reloading would have reused the same in-memory
   index instead of re-extracting). `util/module-lock.ts` adds a real
   file-based lock: a small JSON file (`.mcp-lock`, pid + timestamp) inside
   the temp dir itself, held for as long as a process has that module
   loaded — not just for one call. `load_module` acquires it for the temp
   dir right before extraction and releases the *previous* module's lock
   when switching to a different one; a process exiting without an explicit
   release (session just ends) is caught by a `process.on("exit")` handler
   as a safety net (deliberately not hooking SIGINT/SIGTERM — an MCP stdio
   server's SDK manages its own shutdown signals, and a competing handler
   calling `process.exit()` could short-circuit it). A free lock, a stale
   one (owning pid no longer alive — `process.kill(pid, 0)` liveness check),
   or one this same process already holds are all claimed immediately; one
   genuinely held by another live process gets a short bounded wait (3s,
   for quick transient overlaps) before throwing a clear error naming the
   holder's pid, rather than blocking indefinitely or silently interleaving.
   Verified with a real cross-process test (two separate `node` processes,
   not just unit tests): process A acquires and holds the lock, process B
   correctly refuses while A is active, and a third attempt after A exits
   correctly succeeds once the exit handler has released it. 7 new unit
   tests in `module-lock.test.ts` (the "genuinely locked" case uses an
   injectable short timeout so it doesn't eat the real multi-second wait in
   the suite). This closes the gap the dirty-state guard (item 2) couldn't:
   that guard only sees *this* process's own pending work; this is the
   cross-process half. Still worth keeping the operational habit from
   before as a second layer, not a replacement: avoid dispatching a
   background agent for a module while also doing direct edits on it in the
   same conversation when it's easy to avoid — the lock turns a silent
   revert into a loud, actionable refusal, but a loud refusal mid-workflow
   is still friction worth sidestepping when there's no real need to run
   both at once.

`get_tileset_details` defaults to `detail: "summary"` (~2KB) which includes terrain types, crosser types, valid terrain adjacencies, and group names. Use `detail: "full"` for the complete 60-100KB tile catalog.
