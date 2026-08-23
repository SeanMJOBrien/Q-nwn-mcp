# Test Plan & Test Case Specification — nwn-mcp

Project-wide plan covering the whole MCP server: the base tool set, the
`/create-adventure` pipeline, the verification gate, and the companion/co-op rules.

Supersedes the previous commit-range-scoped plan.

---

## 1. Scope

| | |
|---|---|
| **System under test** | `nwn-mcp` — an MCP server exposing NWN:EE `.mod` editing as ~130 tools |
| **Version** | 1.3.1 |
| **Out of scope** | `neverwinter.nim` binaries themselves; the NWN:EE engine; the Python web editor (separate repo); persistent-world features |

### What makes this system hard to test

Three properties drive the whole strategy:

1. **Most failures are silent.** NWN does not error on a malformed asset — it declines to
   load the dialog, skips the perception handler, renders the weapon as a blob. Nothing
   surfaces until a human plays the module. Automated structural checks are the only
   affordable defence.
2. **The real dependency is a 20 GB game install.** Base-game 2DAs, TLKs, tilesets and
   walkmeshes come from `NWN_FOLDER_DATA`. The default suite must run meaningfully
   without them, and the checks that need them must degrade to "skip", never to "fail".
3. **Correct-looking output can still be wrong.** A solver can return success and produce
   a visually broken area; a reward script can compile and run and still reach only one
   player. Algorithmic validity ≠ correctness.

### Everything runs locally

Modules produced by this server are **one-off and locally generated**. Neither module
generation nor testing may depend on a hosted service, so there is deliberately **no CI
pipeline** — no GitHub Actions, no remote runners, no network in the loop. The gate is a
pre-commit hook on the developer's machine.

This is a constraint on the plan, not an omission from it: every automated case below
runs offline, against a checkout and nothing else. Do not add a `.github/workflows/`
pipeline to satisfy this document.

---

## 2. Test strategy

### 2.1 Layers

| Layer | What it covers | Where | In the commit gate |
|-------|----------------|-------|:------------------:|
| **L1 Unit** | Pure logic: GFF accessors, path resolution, param coercion, tile/zone solving, walkmesh maths, dialog walking, verification checkers | `src/**/*.test.ts` | yes |
| **L2 Tool integration** | Actual MCP tool handlers over an in-memory client/server pair, with `nim-tools` and `walkmesh` mocked | `src/tools/*.integration.test.ts` | yes |
| **L3 Live-data** | Tools that need a real NWN install: resman, tilesets, 2DA/TLK, walkmesh, compilation | manual, local | no |
| **L4 Toolset** | Does the produced `.mod` open cleanly and look right in the NWN:EE Toolset | manual | no |
| **L5 In-game** | Does it actually play — solo and in a party | manual | no |

L1+L2 gate every commit. L3–L5 are run by hand before a release, on a machine that has
the game installed.

### 2.2 The automated gate

```sh
npm run verify        # build (tsc) + lint (biome) + test (vitest)
```

One script — `scripts/verify.sh` — backs both callers so they cannot drift:

- `npm run verify` — manual, any time
- `.git/hooks/pre-commit` — installed once per clone by `npm run hooks:install`. Runs
  before every commit touching `src/`, `package.json`, `tsconfig.json` or `biome.json`.
  Bypass a single commit with `git commit --no-verify`.

**Current status: 307 tests across 17 files, all passing.** The suite runs in ~1s with no
network and no game install, which is what makes a pre-commit hook tolerable — a slow or
flaky gate gets bypassed, and a bypassed gate is no gate.

| File | Tests |
|------|------:|
| `src/types/gff.test.ts` | 48 |
| `src/util/verify/verify.test.ts` | 30 |
| `src/tools/new-features.integration.test.ts` | 30 |
| `src/util/git-helpers.test.ts` | 27 |
| `src/util/reward-script.test.ts` | 20 |
| `src/util/zone-solver.test.ts` | 18 |
| `src/util/params.test.ts` | 18 |
| `src/util/dialog-walker.test.ts` | 17 |
| `src/util/verify/coop.test.ts` | 15 |
| `src/util/walkmesh.test.ts` | 14 |
| `src/util/tileset-rules.test.ts` | 14 |
| `src/util/gff-path.test.ts` | 14 |
| `src/tools/tools.integration.test.ts` | 12 |
| `src/util/tileset.test.ts` | 10 |
| `src/tools/improvements.integration.test.ts` | 9 |
| `src/util/tile-solver.test.ts` | 6 |
| `src/util/item-models.test.ts` | 5 |

### 2.3 Mocking rules (learned the hard way)

The integration suite mocks `nim-tools` (binary conversion) and `walkmesh` (needs `.wok`
data). Two rules, both from real failures that cost real debugging time:

1. **A module mock must define every export the code under test imports.** Vitest throws
   `No <name> export is defined on the mock` from *inside* the handler; the handler
   catches it and returns the message as its text payload, which then fails `JSON.parse`
   in the test with a misleading `Unexpected token 'v'`.
2. **Mock the real return shape.** `checkPlacementWalkable` returns `{ ok, reason?, z? }`
   — *not* `{ walkable }` like `checkPositionWalkable`. Returning the wrong shape makes
   every placement silently fail as "not safe for placement".

### 2.4 Entry / exit criteria

**Entry:** `npm ci` succeeds; `npm run build` clean.

**Exit (commit):** `npm run verify` green — enforced by the hook, so this is automatic;
new or changed behaviour has L1 or L2 coverage; no new lint errors.

**Exit (release):** commit criteria, plus — on a machine with NWN:EE installed — the
manual cases marked **[manual]** in §4, one full `/create-adventure` run ending in
`verify_all → shippable: true` (TC-X07), one Toolset inspection of the result (TC-S07),
and one two-client co-op session (TC-M08).

---

## 3. Risk assessment

Ranked by (likelihood × invisibility). This ordering is what the case priorities below
are derived from.

| # | Risk | Why it's dangerous | Mitigation |
|---|------|--------------------|-----------|
| R1 | Malformed `.dlg` | Engine **silently** refuses to load — no error anywhere | TC-D01…D06, blocking |
| R2 | Co-op reward reaches one player | Invisible in solo testing; only appears with a second player | TC-M01…M10, TC-R01…R14, blocking |
| R3 | Companion not actually a henchman | Compiles, spawns, stands still forever | TC-H01…H08 |
| R4 | Object placed unreachable | Looks correct in every data view | TC-A05, `checkWalkable` |
| R5 | Item with no model | Renders as a blob; only visible in-game | TC-I01…I03 |
| R6 | Quest not completable | Player stuck with a permanent journal entry | TC-J01…J04 |
| R7 | GIC/GIT desync | Works in-game, invisible in the toolset | TC-A04 |
| R8 | Solver produces valid-but-ugly terrain | Passes every automated check | L4 manual only |
| R9 | Stale mock hides a real regression | Suite goes green while the product breaks | §2.3 rules |

---

## 4. Test case specification

Priority: **P1** = blocking, must pass to ship. **P2** = should pass. **P3** = advisory.

Each case lists: preconditions → steps → expected. Cases marked **[auto]** have automated
coverage today; **[manual]** need a human and a real install.

---

### 4.1 Group A — Areas (`.are` / `.git` / `.gic`)

**TC-A01 — Tile count matches declared dimensions** · P1 · [auto]
Steps: `verify_area` on an area whose `Tile_List` length ≠ `Width × Height`.
Expected: error `tile_count_mismatch`. A clean area returns no such error.

**TC-A02 — Tile IDs are within the tileset** · P1 · [manual — needs tileset]
Steps: `verify_area` on an area with a `Tile_ID` beyond the tileset's tile count.
Expected: error `tile_id_out_of_range` naming the count and first bad index. With no NWN
install the check is skipped, not failed.

**TC-A03 — Objects lie inside area bounds** · P1 · [auto]
Steps: place an object beyond `Width × 10.0` metres; `verify_area`.
Expected: error `object_out_of_bounds` naming the object and its coordinates.

**TC-A04 — GIC stays in sync with GIT** · P1 · [auto]
Steps: `verify_area` on an area whose `.gic` has fewer entries than its `.git`.
Expected: error `gic_out_of_sync`. *Rationale: desynced objects work in-game but are
invisible in the toolset, so a human reviewer cannot see or fix them.*

**TC-A05 — Interactive objects sit in the main walkable zone** · P1 · [manual]
Steps: place a creature on an unreachable ledge; `verify_area(checkWalkable: true)`.
Expected: warning `object_outside_main_zone`. *This is the "sentries on the castle roof"
defect — the NPC exists, is valid, and can never be reached.*

**TC-A06 — Area scripts resolve** · P2 · [auto]
Expected: `missing_script` for a dangling resref; `uncompiled_script` where `.nss` exists
without `.ncs`; base-game names never reported.

**TC-A07 — `create_area` / `delete_area` round-trip** · P2 · [auto]
Expected: create registers ARE+GIT+GIC and appends to `Mod_Area_list`; delete removes all
three and re-indexes; deleting the entry area is refused.

---

### 4.2 Group B — Creatures (`.utc`)

**TC-B01 — All 13 script fields written, using the real field name** · P1 · [auto]
Steps: `create_creature_blueprint` with no script params; inspect the `.utc`.
Expected: `ScriptOnNotice` = `nw_c2_default2`; **no `ScriptPercption` field**.
*Rationale: `ScriptPercption` was a long-standing misspelling. Zero real `.utc` files use
it; 788 in a reference module use `ScriptOnNotice`. Creatures built with the typo had no
perception handler at all.*

**TC-B02 — `scripts` overrides layer on the chosen set** · P2 · [auto]
Expected: overridden field takes the custom value, untouched fields keep the default set,
unknown keys produce `scriptWarnings` without failing the call.

**TC-B03 — Empty ClassList is rejected** · P1 · [auto]
Expected: `verify_creature` returns error `no_classes`.

**TC-B04 — Appearance resolves** · P2 · [manual]
Expected: `invalid_2da_row` for a nonexistent row; `empty_2da_cell` for a row whose model
is `****`.

**TC-B05 — Soundset gender matches** · P3 · [auto]
Expected: warning `soundset_gender_mismatch` when the row's `GENDER` differs from the
creature's.

**TC-B06 — Equipment resolves** · P2 · [auto]
Expected: warning naming the slot and missing resref; the blueprint is still created
(partial-success semantics).

---

### 4.3 Group C — Companions / henchmen

*Covers the GitHub issue #2 reports: "henchpeople don't follow", "the freed prisoner
wouldn't join", "cleric NPC has no spells".*

**TC-H01 — `henchman: true` wires the associate AI** · P1 · [auto]
Expected: `ScriptDialogue` = `x0_ch_hen_conv`, `ScriptHeartbeat` = `x0_ch_hen_heart`,
`ScriptOnNotice` = `x0_ch_hen_percep`; response reports `henchman: true`.
*These two fields carry the feature: the first matches the engine's silent command shout
in OnConversation (the radial menu), the second tail-calls `nw_ch_ac1`, the follow AI.*

**TC-H02 — A companion on the standard AI is rejected** · P1 · [auto]
Steps: `verify_creature(henchman: true)` on a creature wired with `nw_c2_default*`.
Expected: errors `henchman_no_command_handler` and `henchman_no_follow_ai`.

**TC-H03 — Commoner chassis is rejected** · P1 · [auto]
Steps: `verify_creature(henchman: true)` on a class-20 creature.
Expected: error `henchman_commoner_class`. *Root cause of "cleric has no spells":
`LevelUpHenchman` grants a Commoner no feats and no spellbook.*

**TC-H04 — Companion requires a conversation** · P1 · [auto]
Expected: error `henchman_no_dialog` — with no dialog there is no way to recruit it.

**TC-H05 — `HENCH_LEVEL` and voice are present** · P2 · [auto]
Expected: warnings `henchman_no_level_var`, `henchman_no_voice`.

**TC-H06 — A fully-wired companion passes clean** · P1 · [auto]
Expected: zero errors *and* zero warnings.

**TC-H07 — Henchman cap is raised before recruitment** · P1 · [manual]
Steps: inspect generated `a_mod_load`; confirm `Mod_OnModLoad` points at it and it chains
the previous handler.
Expected: `SetMaxHenchmen` present. *`AddHenchman` is a silent no-op below the cap — the
symptom is simply no party portrait, with no error anywhere.*

**TC-H08 — In-game companion behaviour** · P1 · [manual, in-game]
| Check | Pass condition | Diagnosis if it fails |
|---|---|---|
| Recruits | Party portrait appears | No portrait ⇒ `SetMaxHenchmen` never ran |
| Follows | Walks after the PC, and through a transition | Portrait but no movement ⇒ wrong `ScriptHeartbeat` |
| Takes orders | Radial → Stand Ground holds; Follow Me resumes; same via dialog | Radial ignored ⇒ missing `SetAssociateListenPatterns` or wrong `ScriptDialogue` |
| Uses abilities | Party-bar level = `HENCH_LEVEL`; a cleric casts **without resting first** | Level 1 ⇒ `LevelUpHenchman` returned 0; no spells ⇒ Commoner class or `bReadyAllSpells` not TRUE |
| Has a voice | Barks on join and dismiss | Silent ⇒ soundset 0 or a creature-TYPE row |
| Can leave | Portrait clears, following stops, recruit pitch returns | Proves both conditionals round-trip |

---

### 4.4 Group D — Dialogs (`.dlg`)

*Highest-risk group: every failure here is silent.*

**TC-D01 — Mandatory node fields are present** · P1 · [auto]
Steps: `verify_dialog` on a dialog with a node missing `Delay`.
Expected: error `dialog_missing_node_field` naming the field.
*Rationale: the engine silently refuses to load a dialog missing any of `Animation`,
`AnimLoop`, `Comment`, `Delay`, `Quest`, `Script`, `Sound`, `Text` — or `IsChild` on a
link. The conversation simply never opens.*

**TC-D02 — Dangling link indices are caught** · P1 · [auto]
Expected: error `dialog_dangling_index` naming the target list and its length.

**TC-D03 — Empty StartingList is caught** · P1 · [auto]
Expected: error `dialog_no_start`.

**TC-D04 — All-conditional roots are flagged** · P2 · [auto]
Expected: warning `dialog_all_roots_conditional` — if every condition evaluates false the
conversation opens empty.

**TC-D05 — Unreachable nodes are reported** · P3 · [auto]
Expected: warning `dialog_orphan_nodes` with a count.

**TC-D06 — Dialog scripts and conditions resolve and are compiled** · P1 · [auto]
Expected: `missing_script` / `uncompiled_script` against the node's `Script` and the
link's `Active`.

**TC-D07 — `create_dialog` enforces NPC→PC alternation** · P2 · [auto]
Expected: rejection when a node's speaker does not alternate.

---

### 4.5 Group E — Items, placeables, geometry

**TC-I01 — Composite weapon with zero model parts is rejected** · P1 · [auto]
Steps: `verify_item` on a ModelType-2 item with `ModelPart1..3` all 0.
Expected: error `composite_model_part_zero`.
*This is the reported "Big Bad flail has a model value of 0, so it looks like a bag on
their arm".*

**TC-I02 — `create_item_blueprint` defaults model parts** · P1 · [auto]
Expected: all three parts set for a composite base item; only `ModelPart1` for a simple
one; explicitly-chosen parts never overwritten; `defaultedModelParts` reported.

**TC-I03 — Item properties resolve against `itempropdef.2da`** · P2 · [manual]

**TC-P01 — Placeable name field** · P1 · [auto]
Steps: `verify_placeable` on a placeable with `LocalizedName` but no `LocName`.
Expected: error `placeable_wrong_name_field`. *The engine and toolset read `LocName`;
setting `LocalizedName` silently does nothing.*

**TC-P02 — Container inventory requires `HasInventory`** · P1 · [auto]
Expected: error `inventory_not_enabled`.

**TC-G01 — Trigger/encounter geometry exists and encloses area** · P1 · [auto]
Expected: `missing_geometry` when absent; `degenerate_geometry` below 3 vertices;
`zero_area_geometry` when all points coincide. *Blueprints from resman carry no geometry;
without it the engine never detects entry and the toolset never renders the trigger.*

---

### 4.6 Group M — Co-op / multiplayer rules

*Every module is assumed party-playable. These are **errors**, not warnings.*

**TC-M01 — Single-PC XP reward is rejected** · P1 · [auto]
Steps: `verify_coop_rules` against a script calling `GiveXPToCreature(GetPCSpeaker(), n)`.
Expected: error `reward_not_party_wide`.

**TC-M02 — Single-PC gold reward is rejected** · P1 · [auto]

**TC-M03 — Party-iterating reward passes** · P1 · [auto]
Steps: a script looping `GetFirstFactionMember`/`GetNextFactionMember`.
Expected: zero errors.

**TC-M04 — `RewardPartyXP`/`RewardPartyGP` pass** · P1 · [auto]

**TC-M05 — No false positives from comments or dialogue strings** · P2 · [auto]
Steps: a script whose reward call is commented out, and whose dialogue line contains the
function name.
Expected: zero errors. *Guards against the checker being so noisy it gets ignored.*

**TC-M06 — `bAllPartyMembers = FALSE` is rejected** · P1 · [auto]
Expected: error `journal_not_party_wide` naming the quest tag. The default form and an
explicit `TRUE` both pass.

**TC-M07 — Per-PC quest state is flagged** · P2 · [auto]
Expected: warning `quest_state_on_single_pc` for `SetLocalInt(GetPCSpeaker(), ...)`;
`GetModule()` passes.

**TC-M08 — In-game party verification** · P1 · [manual, needs 2 clients]
Steps: two PCs in a party; one talks to the quest giver and completes the quest.
Expected: **both** players receive XP, gold and the journal entry; both can hand in.

**TC-M09 — Co-op enforcement can be turned off** · P2 · [auto]
Steps: `verify_coop_rules` with `coop: false` against a single-PC reward script.
Expected: zero errors, the same findings as warnings. *Single-player modules are in scope;
without this an intentional personal reward makes a sound module unshippable.*

**TC-M10 — `inc_reward` helpers count as party-safe** · P1 · [auto]
Steps: a script calling `CoopRewardQuest` / `CoopRewardItem`.
Expected: zero errors, including when a raw `CreateItemOnObject` appears alongside.

---

### 4.6a Group R — Reward system (`create_reward_system`)

*Rewards are per-player by default: each player receives 100%, nothing is divided.*

**TC-R01 — FULL is the default policy** · P1 · [auto]
Expected: `COOP_POLICY = 0`, `COOP_SHARE_PERCENT = 100`.

**TC-R02 — Policy and share are baked in** · P1 · [auto]
Steps: generate with `policy: "split"`, `sharePercent: 75`.
Expected: both constants reflect the request.

**TC-R03 — Division happens only under SPLIT** · P1 · [auto]
Expected: the `nXP / CoopPartySize(oPC)` and gold equivalents are guarded by a
`COOP_POLICY == COOP_POLICY_SPLIT` test.

**TC-R04 — Party walk is PCs-only** · P1 · [auto]
Expected: `GetFirstFactionMember(oPC, TRUE)`; never `FALSE`. *Henchmen must not absorb a
share of XP or gold.*

**TC-R05 — A positive reward never rounds to zero** · P2 · [auto]
Steps: `sharePercent: 1`. Expected: the `if (nResult < 1) nResult = 1;` clamp is present.

**TC-R06 — `CoopPartySize` cannot return 0** · P1 · [auto]
Expected: the `if (nCount < 1) nCount = 1;` guard. *It is a divisor.*

**TC-R07 — Class dispatch uses NWScript constants** · P1 · [auto]
Expected: one `if (nClass == CLASS_TYPE_*) return "<resref>";` per configured class, and
the tier fallback as the final return.

**TC-R08 — Each member resolves their own class** · P1 · [auto]
Expected: `CoopClassItem(oMember, sTier)` inside the party loop, not `oPC`. *This is the
whole feature: four players get four different items, not four copies of the speaker's.*

**TC-R09 — Multiclass PCs resolve to their highest base class** · P2 · [auto]
Expected: `CoopPrimaryClass` loops classes 0-10 comparing `GetLevelByClass`.

**TC-R10 — Invalid options are refused, not silently dropped** · P1 · [auto]
Covers: `sharePercent` outside 1-100, an unknown class name, a resref over 16 characters,
a tier with neither items nor fallback, and a duplicate tier name.

**TC-R11 — The usage comment names the real include** · P2 · [auto]
Steps: generate with a custom `includeName`.
Expected: the `#include` line in the header matches it. *Found by testing; the name was
hardcoded.*

**TC-R12 — The generated include compiles** · P1 · [semi-auto, needs nwnsc + NWN data]
Steps: generate for each policy, compile a probe script that `#include`s it and calls
every helper.
Expected: a real `.ncs` and no compiler diagnostics. *An include has no `main()`, so it
cannot be compiled alone — the probe is the only proof. `create_reward_system` runs this
itself and reports `compiles`.*

**TC-R13 — Missing item blueprints are reported** · P2 · [uncovered — needs a loaded module]
Steps: configure a tier naming a resref with no `.uti` in the module.
Expected: `missingItemBlueprints` lists it. *An unresolved resref silently gives that
player nothing.*

**TC-R14 — In-game class rewards** · P1 · [manual, needs 2+ clients]
Steps: a party of differing classes completes a quest granting a class-item tier.
Expected: each player receives the item matching their own class; nobody is skipped.

---

### 4.7 Group J — Journal, module, factions

**TC-J01 — Every quest has an End entry** · P1 · [auto]
Expected: error `quest_no_end_entry`. *Without it the quest sits in the journal forever.*

**TC-J02 — Entry IDs are unique per quest** · P1 · [auto]
Expected: error `quest_duplicate_entry_id`.

**TC-J03 — Quests are actually awarded** · P1 · [auto]
Expected: error `quest_never_awarded` when no script calls `AddJournalQuestEntry` for the
tag; `quest_award_missing_entry` in the reverse direction.

**TC-J04 — `verify_quest_completability` traces giver → script → end** · P2 · [auto]

**TC-F01 — Module entry point is valid and in bounds** · P1 · [auto]
Expected: `entry_area_missing` / `entry_position_out_of_bounds`. *This is the reported
"transition from the start area was underground — needed dm_login to get inside".*

**TC-F02 — `Mod_Area_list` matches the actual areas** · P1 · [auto]
Expected: `area_not_in_module_list` and `module_list_missing_area` in both directions.

**TC-F03 — Faction references and reputations are valid** · P2 · [auto]
Expected: `invalid_faction_ref`, `invalid_reputation` (outside 0–100).

---

### 4.8 Group S — Solver, layout, tilesets

*Algorithmic validity is automated; visual correctness is not automatable and stays manual.*

**TC-S01 — Interior BSP styles produce valid layouts** · P2 · [auto]
Steps: `adventure_generate_layout` for `dungeon`, `cave`, `dwelling`.
Expected: rooms ≥ 3×3 with margin ≥ 2; all rooms connected; no adjacency errors.

**TC-S02 — Exterior styles emit no crosser paths** · P2 · [auto]
Expected: the 7 outdoor styles carve floor-terrain corridors, never crosser paths.

**TC-S03 — Incompatible terrain adjacency is rejected, not fudged** · P1 · [auto]
Steps: `adventure_apply_layout` with two terrains that have no transition tiles.
Expected: early return, zero placements, `INCOMPATIBLE TERRAIN ADJACENCY`. *The solver
must never fabricate an intermediate terrain.*

**TC-S04 — Tile orientation normalisation** · P2 · [auto]
Expected: corners un-rotated by the `.set` `Orientation` at parse time; solver prefers a
tile's native orientation.

**TC-S05 — Room separation and corridor rules** · P2 · [auto]
Expected: sibling rooms separated by ≥2 wall tiles; S-curves bend only on interior wall
tiles; room-corner tiles excluded from crosser paths.

**TC-S06 — `analyze_tileset_rules` flags integrity issues** · P3 · [manual]

**TC-S07 — Painted areas look right** · P1 · [manual, L4]
Steps: generate one area per style; open in the Toolset.
Expected: rooms, corridors and features read as intentional architecture.
*No automated check substitutes for this — the solver can return success and still
produce something ugly.*

---

### 4.9 Group X — Cross-cutting

**TC-X01 — `verify_all` gates shipping** · P1 · [auto + manual]
Expected: `shippable: true` only with zero errors; `errorsByCode` ranks the dominant
defect; passing targets are omitted from the payload.

**TC-X02 — Base-game scripts are never reported missing** · P1 · [auto]
Expected: `isBaseGameScript` accepts `nw_c2_default*`, `x0_ch_hen_*`, `nw_ch_ac*`,
`x2_mod_def_*` and rejects module-authored names like `a_hen_join`.
*A checker with false positives gets ignored, which is worse than no checker.*

**TC-X03 — Blueprint edits before placement** · P1 · [manual]
Steps: `create_creature_blueprint` → `place_creature` → `modify_gff_field` on the
blueprint → `get_creature_details` on the placed instance.
Expected: the placed instance is **unchanged** — placement deep-copies the `.utc`.
*Documents the constraint rather than a bug: skills must finish blueprint work first.*

**TC-X04 — Undo covers GIT mutations only** · P2 · [auto]
Expected: `undo_last_change` restores GIT state; scripts and dialogs written by composite
tools are **not** rolled back.

**TC-X05 — Numeric params accept strings** · P1 · [auto]
Expected: `toI`/`toF` coerce; `doc.Str.value === 18` as a number.
*The MCP SDK validates JSON Schema before Zod transforms run, so every numeric param must
be `z.string()`.*

**TC-X06 — Repack round-trip** · P1 · [manual]
Expected: `repack_module` output reloads cleanly and opens in the Toolset; cache subdirs
(`resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/`) are excluded.

**TC-X07 — Full `/create-adventure` run** · P1 · [manual, L5]
Steps: run the pipeline end-to-end from a prompt.
Expected: all 9 phases report `success`; `verify_all` returns `shippable: true`; the
module is playable start to finish; connectivity and quest completability both clean.

---

## 5. Traceability — reported defects to coverage

Every point from GitHub issue #2, mapped to the case that now catches it.

| Reported | Case | Automated |
|---|---|:---:|
| "Henchpeople don't follow the PC" | TC-H01, H02, H08 | partly |
| "The freed prisoner wouldn't join" | TC-H04, H07 | partly |
| "Cleric NPC has no spells" | TC-H03 | yes |
| "Flail has a model value of 0" | TC-I01, I02 | yes |
| "Sentries on the roof, no way to reach" | TC-A05 | manual |
| "Transition from the start area was underground" | TC-F01 | yes |
| "Dialog mentions a cage that doesn't exist" | TC-X01 | partly |
| "NPCs all look pretty much the same" | — | *open: gear randomisation is a TODO* |
| "Access violation loading the start area" | TC-A01, A02, A04 | partly |
| "Transitions are portal lights, not doors" | — | *by design, not a defect* |

---

## 6. Known gaps

Stated rather than hidden, so nobody mistakes green for complete.

1. **No integration test drives the adventure-tool MCP handlers.**
   `adventure_generate_layout`, `adventure_apply_layout`, `adventure_create_transition`,
   `adventure_list_features`, `adventure_find_walkable` and `analyze_tileset_rules` are
   covered only through unit tests of the utilities beneath them. This is the largest
   automated-coverage gap.
2. **No fixture module.** L2 tests construct GFF documents by hand. A small checked-in
   `.mod` would let `verify_all`, `validate_module` and `repack_module` be exercised
   end-to-end in the local gate — the single highest-value addition to this plan, and it
   needs no game install, so it stays inside the offline constraint.
3. **Visual correctness is unautomatable.** TC-S07 has no substitute.
4. **Co-op verification needs two clients.** TC-M08 cannot be automated here.
5. **Live-data paths are not in the commit gate** by construction — they need the 20 GB
   game install, so they are run by hand at release (§2.4).
6. **Gear appearance randomisation is a TODO**, so "NPCs all look the same" has no case.
7. **`compile_script`'s `includePaths` parameter is broken** — `nwn_script_comp` has no
   `-I` flag and passing it makes the call print usage and fail. `write_script` never
   passes it. Not yet covered by a regression test.
8. **`modify_gff_field` cannot write float fields** — the MCP layer stringifies `value`,
   so `nwn_gff` rejects `{"type":"float","value":"60"}`, *and* the failed write leaves
   the in-memory document dirty so every later write of that resource fails too. No
   coverage; needs both a fix (coerce to the existing field's type) and a regression test.
9. **Nothing tests that a checker stays quiet on a clean module.** Both false-positive
   classes found in §6a below were "extra findings", which no assertion catches. A fixture
   module (gap 2) plus a `verify_all → shippable: true` assertion would close this.
10. **Generated NWScript is only compile-checked by hand.** TC-R12 was run this session
    against `nwnsc` and passed for all three policies, but the local gate cannot repeat it
    — compiling needs the NWN data tree, which §1 keeps out of the commit path.
    `create_reward_system` compensates at runtime by compiling a probe and reporting
    `compiles`, so a broken include is caught before it reaches a caller rather than
    before it reaches the repo.
11. **Reward *amounts* are unverified in play.** The checkers prove a reward fans out to
    the party; nothing proves the resulting XP curve is well-paced. The party-size
    multipliers in `adventure-rewards` are estimates, and the correction from 1.5-2.5x to
    1.15-1.35x (§6a) changes pacing for every multiplayer module. TC-R14 and TC-M08 are the
    only checks, and both need multiple clients.

---

## 6a. What the first real module build taught us

The first end-to-end generation (a four-area castle siege with three companions) is the
single most productive test run this project has had. Recorded here because the lesson
generalises: **unit tests confirm a checker fires; only a real build confirms it stays
quiet when it should.**

| Found | Kind | Status |
|-------|------|--------|
| `nw_o0_*` not whitelisted — every freshly created module failed its own verification | false positive | fixed + regression test |
| Stock equipment on cloned creatures flagged as missing items (2 per creature) | false positive | fixed + regression test |
| `validate_module` reported 255 errors on a module it had just built | false positive | fixed — now shares the verify whitelist |
| `modify_gff_field` cannot write floats, and corrupts in-memory state on failure | real bug | documented, gap 8 |
| `create_module` leaves a dead `_start` area, permanently unreachable | real defect | documented |
| Interior tilesets fill with `wall`; `create_area` rejects floor terrains | undocumented behaviour | documented |
| Decorated interior terrain is only partly walkable — computed tile centres can be `Nonwalk` | undocumented behaviour | documented |

Three of the seven were defects in the verification layer itself. That ratio is the
argument for gap 2: a fixture module in the commit gate would have caught all three
before they ever reached a user.

---

## 7. Maintenance

- **Adding a tool** → add an L2 integration case in the matching
  `src/tools/*.integration.test.ts`.
- **Adding a verification rule** → add a known-good *and* a known-bad fixture to
  `src/util/verify/verify.test.ts`, and list the code in §4 with its severity.
- **Changing tool behaviour** → update the test in the same commit. Four of the nine
  failures this plan replaced were tests left behind by deliberate behaviour changes
  (collision moved from warn to block; `size` default 3→4; `toI` coercion) — stale tests
  that assert the old contract are worse than no tests, because they train people to
  ignore red.
- **A test starts failing** → decide whether the *test* or the *product* is wrong before
  editing either. Record the answer in the commit message.
