# Pitfalls

Moved verbatim from CLAUDE.md (work-plan A2, 2026-11-10). CLAUDE.md keeps the short list of pitfalls that change how a tool call looks; this file is the full record with the evidence. Some older entries are superseded by later ones (see the CORRECTIONS entry first).

## Known Pitfalls

- **FIXED (2026-11-08, Hollow Communion playtest) — forged casters turned invisible and held two spellbooks.** A Cleric boss stood still and
  invisible: the spell-like-ability pool (`classSpellPools`/`domainSpells`, `creature-forge-tools.ts`) held Invisibility, Improved
  Invisibility, Invisibility Sphere, Sanctuary and Darkness, and the default combat AI casts self-buffs first. Those labels are now
  excluded (`isSelfConcealmentSpell`; a `pinnedSpells` entry is the only way back). Separately, `CL_LevelStep` called
  `LevelUpHenchman(..., bReadyAllSpells = TRUE)`, so a creature with `MCP_SA_POOL` also had every memorized spell ready — two spellbooks;
  it now passes FALSE when the pool is set. **Existing modules need the pool edited** (`MCP_SA_POOL`/`MCP_SA_DOMAIN` on the blueprint and
  the placed instance) and `inc_cre_level` regenerated. Also: `q_act` now dismisses a companion before (and regardless of) the quest
  advance, finds it through `GetAssociate` as well as the faction list, and logs `[QUEST] advance refused` / `[QUEST] dismiss`.
  **Not confirmed live (no player on the headless server):** the dog staying in the party, and Holt/guards not attacking — see the
  hardened `a_gate_fight` (attack orders sent after the dialog ends; a dialog clears the NPC's queue) and `a_venn_flee` (retried jump).

- **CORRECTIONS (2026-11-07, live-engine verified; details in `docs/creature-forge-spec.md` §11) — several older entries below are wrong:**
  (1) Armor base AC comes from the torso part (`parts_chest.2da` `ACBONUS` for `ArmorPart_Torso`), not from `ITEM_PROPERTY_AC_BONUS`
  (enhancement only). The `nw_aarcl*` items are real armor, not cosmetic; `equipped_armor_no_ac_bonus` was removed and
  `armorBaseAC()` (`verify/blueprints.ts`) now drives both proficiency checks. The Hollow Communion "AC fix" stacked AC and was undone.
  (2) **The engine silently refuses to equip items a creature isn't proficient with** (placed or spawned, any blueprint format). This is
  the "no clothes" bug: e.g. Rogues wearing base-AC-5 armor. `armor_proficiency_mismatch` now means "unarmored in play".
  (3) `LevelUpHenchman` DOES add every automatic class feat from level 2 up, and no illegal feat (11 classes to level 12), when level 1
  is valid; the "zero automatic feats" result came from creatures with an empty level-1 FeatList.
  (4) `.utc` equipment entries written as full item structs work; toolset files use `EquippedRes`-only entries, and both equip.
  (5) Feats and spell abilities CAN change at runtime: `ObjectToJson(o, TRUE)` → edit → `JsonToObject(..., TRUE)` keeps tag, locals, HP,
  effects; the new object's OnSpawn fires again. Each ready SpecAbilityList entry is one cast; its `SpellCasterLevel` is the cast level.
  (6) `build_npc_stat_block` used to write illegal level-1 feats (Cleave without Power Attack, Weapon Specialization at level 1);
  every pick now goes through `feat-legality.ts` in package (`packft_*`) order.
  (7) **Clerics had no domains (fixed 2026-11-07):** the forge wrote no `Domain1`/`Domain2` and no domain power feat, and
  spell abilities came only from the Cleric column, so no Cleric ever had domain powers or domain spells (`LevelUpHenchman`
  adds feats from level 2 only). The forge now picks two domains (`domains` param, default the package's — Healing/Sun for
  the Cleric package; any class with `classes.2da PickDomains=1`), adds both `GrantedFeat`s, and `inc_cre_level` fills one
  slot per spell level with a domain spell (checked in game: `cl_domain_<class>`, `cl_domain_feats_<class>`,
  `cl_spell_domain_<class>`).
  (8) **Wizard school (fixed 2026-11-07):** the forge writes `School` on the class entry (`school` param, default the package's —
  General for package 10; any class with `PickSchool=1`), drops the opposition school's spells (`spellschools.2da Opposition` →
  `Letter`, matched to `spells.2da School`), and `inc_cre_level` adds the specialist slot. **Live-verified:** an Evoker levelled to 7
  had exactly +1 slot at spell levels 1-4 and none at cantrips versus an identical Generalist (`GetMemorizedSpellCountByLevel`).
  Checked in game: `cl_school_<class>`, `cl_school_opposition_<class>`. The same run also contradicts the older "Wizard level 2+
  slots stay 0 after LevelUpHenchman" finding below: both clones had real level 2-4 slots after levelling from a legal level-1 build.
  **New standard path:** `create_creature_level_system` + `forge_creature` (spawn-time levelling, store shopping, spell abilities, in-game
  verification). The Hollow Communion's 13 class-based creatures were rebuilt this way (58/58 live checks).

- **FIXED (2026-10-22, user-raised) — `create_area`'s default ground-fill tile was picked at random among
  tied-top-scoring candidates, which could land on a decorated/cluttered variant and then repeat it across
  every cell of the area, and every cell got the identical orientation (visibly tiled/repetitive).** Found via
  a real complaint against the NPC Activities demo area (`tfenguild` in `actingfenora`): `create_area` picked
  `ttr01` tile 122 (model `ttr01_r01_01`) as its all-grass fill — a decorated "r" series tile — instead of 0-3
  (the plain, no-group "a01"-"a04" series), because `findDefaultTile`'s tie-break (`src/util/tile-solver.ts`)
  was `best[Math.floor(Math.random() * best.length)]`: uniform random among every tile+orientation combo tied
  at the max score (most matching corners, no crossers, no doors) — real tilesets consistently model the
  plainest/lowest-polygon variant of a corner pattern at the lowest tile ID, reserving later IDs in the same
  tie for occasional-accent decorated variants, so a random pick is a coin flip against clutter every time.
  Separately, `create_area`'s own fill loop (`src/tools/paint-tools.ts`) wrote the exact same `tileId`+
  `orientation` to all `width*height` cells with zero per-cell variance, which reads as an obviously tiled
  pattern even when the tile itself is plain. **Fix:** `findDefaultTile` now sorts tied candidates by `tileId`
  ascending and deterministically returns the lowest (no more randomness, no more clutter-by-coin-flip);
  `create_area`'s fill loop now varies `Tile_Orientation` per cell via a cheap deterministic formula
  (`(baseOrientation + x*3 + y*7) % 4`) — free visual variety with zero corner/crosser risk, since a
  symmetric all-one-terrain, no-crosser tile renders identically at every orientation. New regression test in
  `tile-solver.test.ts` pins the deterministic-lowest-ID behavior across 20 repeated calls with a tied
  fixture. **This is now the standing behavior for every tileset, not a one-off fix for `ttr01`** — no
  per-tileset table was added (and none should be guessed in); the fix is structural, in the shared tie-break
  and fill-loop logic every `create_area` call goes through.
- **FIXED — the local compile toolchain's `nwscript.nss` can silently predate real NWN:EE engine functions, with a
  cryptic error that looks like a syntax bug in the generated script.** Found building the Special-Abilities
  random-caster system (`spec-ability-script.ts`): `create_spec_ability_system`'s generated include failed to
  compile with `inc_spec_ability.nss(103): ERROR: PARSING VARIABLE LIST [DECL_VARLIST_SEPARATOR(0,0):LEFT_BRACKET]`
  — nothing about that line was actually wrong. **Root cause, confirmed directly**: `nwn_script_comp`
  ("the official compiler library," part of `neverwinter.nim`) reads `nwscript.nss` dynamically as a real resman
  resource from `NWN_FOLDER_DATA`, not from anything bundled in the compiler binary — isolated with a 3-line
  minimal repro (`int n = GetSpellAbilityCount(OBJECT_SELF);`) that failed identically. This project's deployment
  is a headless server with **no real NWN client install** (confirmed with the user) — `NWN_FOLDER_DATA` is a bare
  resource dump with no launcher to patch it, so its `nwscript.nss` had quietly fallen behind: it lacked
  `GetSpellAbilityCount`/`GetSpellAbilitySpell`/`GetSpellAbilityReady`/`SetSpellAbilityReady` (all four, confirmed
  by extracting and grepping it directly) despite having ~7,353 other declarations including fairly recent-looking
  ones. **Fix, requiring no change to the user's actual game data at all**: `src/nwscript-override/nwscript.nss`
  is a committed, version-controlled, newer `nwscript.nss` (sourced from a sibling NWN project checkout on the
  same machine that already had one — `~/git/shieldlands/ee-base-scripts/nwscript.nss`, confirmed newest by file
  date) copied to `dist/nwscript-override/` at build time (package.json's build step, same pattern as
  `src/templates/`) and added to every compile's resman `dirs` list in `module-loader.ts`'s `buildResmanOptions()`
  — `dirs` is loose-file override search, same priority semantics as `NWN_FOLDER_USER/override/`, so this exact
  mechanism is what makes it work with zero other code changes. Verified both the broken and fixed state directly
  via `nwn_script_comp` before and after adding `--dirs=<that path>`. **If a future generator needs an engine
  function and hits the same parse-error signature, check whether this override's `nwscript.nss` actually declares
  it before assuming the generated script is wrong** — and if it's missing, this file is the one to update (no
  separate update script exists for it, unlike the vendored binaries in `../nwn-tools/UPDATING.md`, since it's a
  single committed text file — just copy a newer one over it from wherever one is available).
- **FIXED — `server.tool(name, description, schema, {}, handler)` with an EMPTY
  annotations object silently breaks the tool: every real call fails with
  `typedHandler is not a function`.** Found while writing the first integration
  test ever run against `start_web_editor` (see item #4 of the Project Health
  TODOs) — it had this exact shape and had apparently never been call-tested
  for real. Confirmed via a minimal repro against the MCP SDK directly
  (`@modelcontextprotocol/sdk` ^1.28.0): a *non-empty* annotations object
  (`{ idempotentHint: true }`, etc.) works fine, and omitting the argument
  entirely (the 4-arg `(schema, handler)` overload) also works fine — only a
  literal `{}` in the annotations position breaks it, apparently because the
  SDK's overload-detection treats an empty object as "this must be the
  handler," then fails when it isn't callable. **Before adding a new tool
  registration, never pass `{}` as the annotations argument** — omit it, or
  give it real hints (`readOnlyHint`/`idempotentHint`/`destructiveHint`).
  Every other `{}` in this codebase's `server.tool()` calls is the *params*
  schema (a tool that takes no arguments, e.g. `list_items`), which is a
  completely different, correct, common pattern — don't conflate the two
  when auditing for this. Only `start_web_editor` had the broken shape;
  confirmed by checking every other bare `{}` occurrence's actual position.
- **`paint_group` only ever writes its OWN footprint — repainting the same origin with
  a different-shaped group (or one with different `-1` holes) leaves the previous
  group's tiles behind as orphaned fragments, outside the new group's bounds or
  underneath its holes.** Confirmed real, twice, in "The Twin Villages Waystop": after
  several rounds of replacing buildings at the same 10-15 origins (different group,
  different rotation, different footprint each round — the rotation-bug repair saga
  above), a user report of buildings "still broken into pieces" traced to genuine
  leftover tiles from 2-3 rounds earlier, not a new bug. Two concrete shapes this
  takes: (1) a **hole** — a new group's `-1` slot (e.g. `city_house_2x2`'s tileIds
  `[283,-1,284,285]`) is explicitly skipped by `paint_group`'s write loop
  (`if (tileId < 0) continue`), so whatever tile occupied that grid cell from an
  earlier, differently-shaped placement is never overwritten; (2) a **smaller/
  differently-rotated footprint** — replacing a 2x3 group with a 2x2 one, or a
  2-row-tall placement with a 1-row one, leaves every cell in the old footprint that
  isn't in the new one untouched. **Diagnosis method (reusable for any future report
  like this):** convert the area's `.are` to JSON directly (`nwn_gff -i area.are -o
  area.json -k json -p` — the temp dir's `.are`/`.git` files are raw binary GFF, not
  pre-converted), build a `tileID -> owning group name` map from the tileset's full
  group catalog, and scan the suspect region for any tile ID that belongs to a
  building group but isn't the one that's *supposed* to be there. **This has a real
  blind spot**: a tile ID belonging to a group that's ALSO used correctly elsewhere in
  the same area won't be flagged as foreign by a simple "is this ID in my expected
  set" check — confirmed in this same session (a stray `Shack 1 2x2` tile sat in a
  slot that was supposed to become `Shack 2 1x2`, invisible to the scan because
  `Shack 1 2x2`'s own tiles are legitimately expected elsewhere in the same area).
  Closing that gap needs reconstructing each origin's *actual* placement history
  (every group/rotation/footprint ever placed there, and its real bounding box
  including any rotation-driven width/height swap) and diffing the union against the
  final group's own footprint — slower, but the only way to catch same-group,
  wrong-slot leftovers. **A second real user report found two more orphans this same
  check missed** — the manual historical reconstruction used to find the first batch
  had its own error (misremembered the *original* build's rotation for two specific
  buildings as 0 when it was actually 1, understating their true historical footprint
  by one row). **The reliable fix is to stop reconstructing history by hand entirely**:
  build a full per-cell expected-tile map from the FINAL intended footprint of every
  building (not just a set of "valid" tile IDs), then scan the whole region for two
  conditions at once — every footprint cell holds exactly its expected tile, AND no
  cell outside any footprint (including a hole) holds a tile belonging to ANY known
  building group. This catches both failure shapes in one pass (a wrong tile inside a
  footprint, and a stray tile outside one) without needing to know or trust the
  placement history at all — only the final plan and the tileset's real group catalog.
  **No code fix applied** — this is a workflow/diagnosis pitfall
  for hand-driven, multi-round `paint_group` repainting of the same origin, not a bug
  in `paint_group` itself (it correctly does exactly what it's asked; nothing asks it
  to clear a *different* group's old footprint first, since it has no way to know what
  was there before). If this recurs, consider a `clear_footprint`-style tool that
  overwrites a rectangular region to a caller-supplied background tile before
  painting a group, so hand-driven multi-round repainting doesn't need this manual
  archaeology every time.

- **FIXED — the equipped-item resref field was read as `EquippedRes` everywhere in
  this codebase; no real equipped item struct carries that field name, so every
  check depending on it was silent dead code.** The real field is `TemplateResRef`
  (same name an *inventory*, non-equipped item uses — confirmed by dumping a real
  equipped `Equip_ItemList` entry: it carries `TemplateResRef`, `BaseItem`,
  `StackSize`, etc. directly, with no `EquippedRes` field at all). Three call sites
  had this typo: `get_creature_details`'s equipment display (`creature-tools.ts`,
  always showed `resref: ""` for every equipped item — dismissed as a display quirk
  more than once before the real cause was found), `validate_module`'s missing-
  equipped-item-blueprint checker (`analysis-tools.ts`, never actually flagged
  anything, ever), and — most consequential — `verify_creature`'s
  `ranged_weapon_no_ammo` check (`util/verify/blueprints.ts`), which exists
  specifically to catch an archer equipped with a bow and no arrows. Confirmed via
  a real build ("The Six-Fold Trial"): 3 creatures (2 archers + 1 key NPC) shipped
  with a bow and zero ammo, undetected through the actors, challenges, polish, and
  rewards phases despite `verify_all`/`verify_creature` reporting `shippable: true`
  at every one of those checkpoints — the check that should have caught it had
  never once actually executed its logic, on any creature, in this project's
  history. **Fix:** corrected the field name at all three sites, and rewrote the
  ammo check to read `BaseItem`/`StackSize` directly off the embedded equipped-item
  struct instead of doing an async blueprint re-resolve for `BaseItem` (the
  embedded struct already carries it — the resolve was unnecessary indirection that
  also silently no-op'd when `resmanOpts` wasn't passed). Added a companion
  **`ammo_stack_size_unreasonable`** warning-level check at the same time (see the
  ammo-quantity convention below) and 3 new unit tests exercising the fixed
  behavior (present-but-empty ammo, present-but-wrong-family self-ammo, present-
  and-reasonable). **This is exactly why the "always independently re-verify a
  phase's `shippable: true` self-report" discipline established elsewhere in this
  doc exists — but it has a limit: independent re-verification via `verify_all`
  itself is worthless when the underlying check is dead code. The only thing that
  actually caught this was a human playing the finished module.**
- **Ammo-quantity convention (user-specified, revised 2026-09-17).** A ranged-weapon
  creature needs not just *some* ammo equipped but a *plausible combat load* — 99
  (the GFF stack-size ceiling) is exactly as wrong as 0, just less obviously broken.
  Target ranges, enforced by `verify_creature`'s `ammo_stack_size_unreasonable`
  warning (`AMMO_STACK_RANGE` in `util/verify/blueprints.ts`): **arrows/bolts** (bow/
  crossbow) exactly **24** (originally "a dozen", checked as 8-16 — superseded by an
  explicit later user directive naming bows and crossbows specifically, not a
  guess); **sling bullets** 8-20 (unchanged); **darts** ~8, checked as 4-12
  (unchanged); **throwing axes** 2-6 (unchanged). Darts/shuriken/throwing axes have
  no separate ammo slot — the RightHand weapon's own `StackSize` *is* the ammo count
  (`SELF_AMMO_TYPES` in the same file), so the check reads RightHand's stack
  directly for those rather than looking for a separate equipped slot. Shuriken
  (`AmmunitionType` 5) has no user-specified range and is deliberately left
  unchecked rather than guessed, per this project's "encode unverified data as a
  skip, never a guess" rule. **Found 5 real, shipped instances of the stale 12-count
  in "The Salt Gate Conspiracy" while applying this revision** (3 shortbow-armed
  orc skirmishers, 2 crossbow-armed guards) — hand-patched to 24 via the documented
  direct-`nwn_gff`-edit recovery sequence, same session the rule itself was revised.
- **FIXED — `get_area_creatures`/`list_creatures` returned `[]` for creatures placed
  after `load_module`.** Both read `index.creatures`, a summary array built once at
  `load_module` time and never refreshed — any creature placed afterward (the normal
  case, since `/create-adventure`'s `/adventure-actors` phase runs well after module
  load) was invisible to these two tools while genuinely present in the GIT.
  Confirmed real, not a false alarm: `get_creature_details(area, tag)` — which
  already reads live from `index.parsedGff` — found a freshly-placed companion fine
  on the same area where `get_area_creatures` returned empty. Root cause and fix
  were symmetric with `get_area_placeables`, which was already correct — it reads
  the `Placeable List` live from `parsedGff` on every call instead of caching.
  **Fix:** exported `indexAreaCreatures()` (`module-loader.ts`, already existed,
  just unexported) and had both tools call it live against current `parsedGff`
  data instead of touching `index.creatures` at all. Needs an MCP server restart to
  take effect. **This is a real risk for any skill/phase whose idempotency checks
  say "call `get_area_creatures` first, skip if already placed"** (`adventure-actors`,
  `adventure-challenges`, others) — before this fix, that check would silently
  report an area as empty even when it wasn't, causing duplicate placement. If a
  module built before this fix shows unexpectedly duplicated creatures, this is why.
- **CRITICAL — direct `nwn_gff` file edits and in-memory-index MCP tools silently
  clobber each other; ordering is load-bearing.** Most placement/equipment/blueprint
  MCP tools (`set_creature_equipment`, `create_item_blueprint`, `fix_object_heights`,
  etc.) read and mutate `index.parsedGff` (the server's in-memory copy of each GFF,
  populated once at `load_module`) and serialize it back to disk via `writeBackGit()`
  or equivalent. A raw `nwn_gff` round-trip script (the technique used throughout this
  doc for bulk edits no MCP tool covers) writes **directly to the file on disk** and
  never touches `index.parsedGff`. Mixing the two on the *same resource* in one
  session is a real, confirmed data-loss bug, not a theoretical risk: after directly
  patching 7 creatures' `ClassLevel`/`FeatList`/`SkillList`/stats/spells into
  `showcase.git` via script, a subsequent `set_creature_equipment` call (MCP tool) on
  those same creatures read the *stale pre-edit* in-memory GIT, merged equipment into
  it, and wrote that stale version back — silently reverting every stat/feat/skill/
  spell change while appearing to succeed (it even reported the right resrefs added).
  The direct edits weren't lost from a bad write; they were overwritten by a *later,
  successful* write from the other pathway. **Worse than same-resource collision:
  confirmed a SECOND time in the same session** — `set_creature_equipment` called
  for creature A alone reverted creatures A *and* six others in the same `.git` back
  to their pre-edit state, because the tool serializes the *entire* stale in-memory
  GIT document back to disk on every call, not just the one creature it targets.
  Once any direct edit has touched a `.git`/`.utc`, the in-memory index for that
  resource is permanently stale for the rest of the session — there is no "safe
  creature" to call an equipment/placement tool on afterward, not even an untouched
  one. **Rule: once a resource has been edited directly on disk in a session, do not
  call any further MCP tool that touches that same resource before the final
  direct-edit pass — do all MCP-tool-based work (equipment, placement, blueprint
  creation) first, apply direct `nwn_gff` script edits last, then `repack_module`
  immediately after with nothing in between.** If more MCP-tool work turns out to be
  needed after a direct edit (e.g. a follow-up gear change), the only safe recovery
  is `load_module` on the just-repacked `.mod` — re-extracting is safe *here* because
  it restores the in-memory index to match the last good repack, unlike the
  documented `load_module`-between-edit-and-repack pitfall above, which loses work
  that was never repacked at all. Confirmed working recovery sequence, used twice in
  one session: `repack_module` → (later) `load_module` → do the new MCP-tool work →
  apply the direct-edit script (again, in full — a partial re-patch of just the new
  fields leaves everything else reverted) → verify every affected field on disk →
  `repack_module` → send. **Always read back the on-disk state for every affected
  creature/field right before `repack_module`** whenever a session has mixed both
  edit styles — this caught the bug both times, by dumping `ClassLevel`/`FeatList`
  length/stats/`Equip_ItemList` together and confirming all were simultaneously
  correct before repacking.
  after a direct edit is enough. **Always read back the on-disk state right before
  `repack_module` when a session has mixed both edit styles** — this is what caught
  the bug here, by dumping `ClassLevel`/`FeatList` length/`Equip_ItemList` together
  right before the final repack and confirming all three were simultaneously correct.
- **Armor items (`ModelType` 3 in `baseitems.2da`) need `ArmorPart_*`/`Cloth1Color`/
  `Cloth2Color`/`Leather1Color`/`Leather2Color`/`Metal1Color`/`Metal2Color` fields to
  render at all — `create_item_blueprint`/`applyDefaultItemModels()` does NOT set
  these, unlike its correct handling of composite weapons (`ModelType` 2,
  `ModelPart1-3`).** `item-models.ts`'s own comment ("Armour — parts come from the
  creature's body, not the item") is misleading — the fields actually live on the
  ARMOR ITEM (18 `ArmorPart_<slot>` fields mirroring the creature body-part slot
  names, e.g. `ArmorPart_Torso`, `ArmorPart_LShoul`, plus `ArmorPart_Robe` for a
  single-mesh full-body look) and select which visual variant renders per slot when
  the item is worn — confirmed by pulling two real, designer-authored armor items
  from `~/tfndev` (`hen_dorna_arm.uti`, `cre_nwchain.uti`), both with all 18 parts
  populated and `ArmorPart_Robe=0`. **Unlike creature `BodyPart_*` fields, there is
  NO safe universal default value** — the two real references use completely
  different, specific numbers per slot (e.g. `ArmorPart_Torso` 36 vs 32), drawn from
  a real variant catalog (`parts_chest.2da`, `parts_shoulder.2da`, etc.) this project
  hasn't mapped yet. A from-scratch armor `.uti` built via `create_item_blueprint`
  renders with no visible model change at all — confirmed directly (7 armor pieces
  built this way for a gear-up pass all had zero `ArmorPart_*`/`Color` fields).
  **Current workaround, not a fix: equip a real, pre-existing armor blueprint (base
  game or already-authored module item) instead of building one from scratch** — see
  the gear-sourcing rule below. A real code fix needs the `parts_*.2da` variant
  research first; don't guess numbers into `ArmorPart_*` fields the way `BodyPart_*`
  could be, since there's no confirmed-safe "1 means normal" baseline here.
- **Gear-creation rule (user-specified): prefer real, existing blueprints over
  `create_item_blueprint` from scratch, budgeted by `get_wealth_budget`.** For a
  weapon/armor/shield/accessory an NPC needs, search for a real blueprint before
  building one — see the two-tool search discipline below, since `list_blueprints`
  alone misses most of the base-game "Standard palette" catalog. Use a plain mundane
  blueprint if one exists (e.g. a base longsword) for gear with no required bonus;
  use an existing appropriately-valued magic item (costed via `resolve_blueprint`,
  budgeted against `get_wealth_budget(level, role)`'s per-slot split) when the NPC
  needs an enchantment. Only synthesize a brand-new item from scratch
  (`create_item_blueprint`) for something narrative/plot-specific with no real-world
  equivalent, or a mundane weapon type that genuinely isn't in the base game — and
  even then, a flavor item with no mechanical property (a keepsake ring, a holy
  symbol, a personal effect) needs a `description` establishing why it matters;
  don't generate bare unexplained accessories (a ring, boots, gloves) with neither a
  property nor a backstory. Sourcing a real item sidesteps the armor-appearance gap
  above for free, since a real pre-authored item already carries correct
  `ArmorPart_*`/`Color` data.
  **`list_blueprints` alone is NOT sufficient to conclude "no real item exists" —
  confirmed missed real, correct matches twice in one session.** It matches
  resref/tag/TLK-resolved display name as literal substrings against the search
  term. The base game's "Standard palette" vanilla items use terse, non-obvious
  resref codes with NO display-name overlap to an intuitive search term — e.g. a
  plain mundane Battleaxe is `nw_waxbt001` (magic variants `nw_waxmbt002-011`), a
  mundane Rapier is `nw_wswrp001`, a mundane Dagger is `nw_wswdg001` — none of which
  contain "battleaxe"/"rapier"/"dagger" as a substring anywhere `list_blueprints`
  checks. Real mistake, corrected same session: built three items from scratch
  (a from-scratch Battleaxe, and mundane Rapier/Dagger) believing no real blueprint
  existed, after `list_blueprints` returned zero results for all three — all three
  real items were found immediately once `resman_search` (raw resref substring
  match across the FULL resman including base BIFs, not just TLK/tag/resref
  fuzzy-matched) was tried with a guessed short prefix (`wax`, `nw_wsw`). **Rule:
  before declaring "no real blueprint exists" for a mundane/common item, try
  `resman_search` with a short, generic prefix guess (weapon-type abbreviations
  tend to be 2-3 letters: `wsw`=simple/martial sword family, `wax`=axe family) in
  addition to `list_blueprints` — don't rely on `list_blueprints` alone for
  anything that isn't a distinctively-named magic item.**
  **Corollary (user-specified): a weapon-specific feat means the matching weapon,
  exactly — not just the matching proficiency category.** Weapon Focus/Weapon
  Specialization/Improved Critical are all per-weapon-type feats (`feat.2da` labels
  like `WeapFocBAxe`, `WeapSpeBAxe`, `ImpCritBAxe` are Battle-Axe-specific — a
  different weapon in the same broad category, e.g. a Dwarven Waraxe, does not
  benefit from them at all). The Dwarf Fighter above was first (wrongly) equipped
  with a Dwarven Waraxe (`baseitems.2da` row 108, a different weapon from
  Battleaxe's row 2) precisely because the real Battleaxe wasn't found — check the
  weapon-search rule above before concluding a substitute is necessary.
- **`nwn_script_comp` positional arg.** Most nim tools use `-i <file>`, but `nwn_script_comp` takes the source file as a **positional argument** (last): `nwn_script_comp [options] [-o out] file.nss`. Using `-i` silently fails.
- **`nwn_twoda` no JSON.** Use `-k csv --write-id-column` instead. The CSV parser in `nim-tools.ts` handles it.
- **Numeric tool params must use `z.string()`.** The MCP SDK validates JSON Schema before Zod transforms execute, so `z.coerce.number()` fails when clients send strings. Use `z.string()` + `toF()`/`toI()` helpers from `src/util/params.ts`. Same for complex array params — use `z.string()` + `JSON.parse()`.
- **Resman tools are slow.** Every invocation initializes the full resman stack. Default timeout (30s) is too short for piped operations — `resmanCatToJson()` uses 120s.
- **Temp dir contains cache subdirs.** `resman_2da/`, `tileset_cache/`, `wok_cache/`, `blueprint_cache/` — all auto-excluded from `erfPack()` by the `isFile()` filter. Never pack these into the module.
- **`validate_module` false positives.** Base game scripts (`nw_c2_default5`, etc.) and items (`nw_wblms001`) are resolved at runtime — filter these "missing" references.
- **Primary/secondary rules in .set files are NOT functional and must be IGNORED.** They are toolset autotiling propagation rules, not tile placement constraints. The tile solver works entirely by matching corner terrains, corner heights, edge crossers, and the `.set` Orientation field.
- **Height tiles excluded from solving.** Tiles with any corner height > 0 are filtered out. All solver-placed tiles are flat.
- **Tile rotation: do NOT swap cases 1 and 3 in `getRotatedCorners`/`getRotatedCrossers`/`forwardRotate`.** Case 1 = 90° CW, case 3 = 270° CW. This solve-time rotation math (applied to an already-parsed tile's corners to compute its effective corners at a given GIT placement orientation) is verified correct — cross-checked against 31 real, human-placed instances of a tno01 corner tile across 12 independently-built areas in a large hand-built PW corpus (`~/tfndev`), 100% match. **The crosser-rotation half of the same math (`getRotatedCrossers`) is separately verified too** — cross-checked against 69 real placements of tdm01's corridor-cap/straight/corner-turn tile family (ids 43/44/47/164/165/167) across 15 independently-built `tdm01` dungeons in the same corpus, 68/69 exact matches (the one exception is an explainable dead-end, not a mismatch pattern). Do this same corpus cross-check — never trust the codebase's own rotation code to grade itself — any time a user reports a tile that still looks wrong after a fix; it either confirms the rotation math (as here) or finds the next real bug (as the original parse-time discovery did). **A separate, now-fixed bug lived one level earlier, at parse time** (see "Real Module" pitfalls below) — don't conflate the two. If a tile still looks misrotated after confirming the parse-time fix is live, the bug is somewhere else (e.g. zone-solver orientation selection), not in these three functions.
- **DLG field completeness is critical — with two verified exceptions.** The NWN engine silently
  fails to load dialogs missing standard fields. Every entry/reply MUST include `Animation`,
  `Comment`, `Delay`, `Quest`, `Script`, `Sound`. Every link struct **nested inside an
  entry/reply's `RepliesList`/`EntriesList`** MUST include `IsChild`. The `makeEntry`/
  `makeReply`/`makeLink` helpers in `dialog-write-tools.ts` handle all of this — keep writing
  every field, this is not a reason to trim any.
  - **`AnimLoop` is not load-blocking.** Verified against a large (416-dialog, 19,779-node),
    live, actively-hosted PW module (`~/tfndev`, "The Frozen North") — ~14% of its entry/reply
    nodes lack `AnimLoop` entirely (confirmed against the compiled `.mod` binary via this
    project's own `nwn_erf`/`nwn_gff` extraction, not just checked-in source), spread across
    many different dialog files with no pattern by node type, and the module runs fine in
    production. Still write it (no cost, and the field does control animation looping), but
    don't diagnose "missing AnimLoop" as a load failure — it isn't one.
  - **Root (`StartingList`) links don't carry `IsChild`.** In that same corpus, 100% of
    `StartingList` link structs omit `IsChild` (1596/1596) while 100% of nested
    `RepliesList`/`EntriesList` links carry it (0/31917 missing) — `IsChild` is meaningless on a
    root link (a root is never anyone's child), so the requirement is real only for nested links.
- **`create_dialog` condition field.** The `condition` on a node goes on the **link pointing to it** (`Active` field), not the node itself.
- **Tileset door placement.** Each tile's .set file has `[TILE<id>DOOR<n>]` subsections with local-space offsets. Use `getTileDoorWorldPositions()` in `tileset.ts` to convert to world space. Never guess door positions.
- **CPDB blob format.** Campaign database blobs (compressed=1) use a 24-byte header (`"CPDB"` + version + fields) followed by zstd-compressed data (NOT zlib). The payload is JSON text, not binary GFF. Vartype codes are ASCII chars: F=70 float, I=73 int, J=74 json, L=76 location, O=79 object, S=83 string, V=86 vector. F/I/L/V are uncompressed ASCII; J/O/S are CPDB/zstd compressed.
- **Database files are `.sqlite3`**, not `.sqlite`. Located in `NWN_FOLDER_USER/database/`.
- **GIT trigger field name is `TriggerList`** (no space), not `"Trigger List"`. Other no-space list names: `SoundList`, `StoreList`, `WaypointList`. With-space names: `Creature List`, `Door List`, `Encounter List`, `Placeable List`.
- **Triggers need Geometry in placed instances.** UTT blueprints from resman do NOT contain geometry. When placing triggers, always ensure the `Geometry` list field exists with at least 4 vertices (PointX/PointY/PointZ). Without geometry, the engine won't detect entry and the toolset won't render the trigger.
- **GIC must be synced with GIT.** The toolset uses the GIC file to index objects in an area. `writeBackGit()` automatically syncs the GIC. Without GIC entries, objects exist in the GIT but the toolset doesn't show them.
- **A placed instance's `VarTable` (and other per-instance fields) is a separate copy from its UTC blueprint's — editing one does not edit the other.** `place_creature`/`create_creature_blueprint`'s own `varTable` param is unaffected by this (it sets the blueprint before the object is ever placed, so there's only one copy to get right at creation time) — the gap is specific to editing a creature that's *already placed* in a `.git`. Confirmed directly: batch-adding `SPEC_*` local variables to 110 already-placed companions' `.utc` files (verified present there via independent `nwn_gff` extraction) produced total silent failure at runtime — every one read back as unset, because the actual placed instances in the area's `.git` still only carried their original vars. The fix wrote the same entries into the `.git`'s `Creature List` directly. Same family of bug as the previously-found `SoundSetFile` case (a `modify_gff_field` write to a blueprint alone left a placed instance's voice unchanged) — treat any field edit made *after* placement as needing both files, never just the blueprint.
- **FOUND AND FIXED (second, corrected root cause) — creatures with verified-correct
  `Appearance_Type`/`Race` data rendering invisible, in both the toolset AND a live game
  session.** Real user report against 110 companions in a real module, with two critical
  diagnostics: (1) manually changing a henchman's appearance to a different race and back
  in the toolset UI made the *body* render correctly; toggling Gender restored only the
  *head*; (2) the same invisibility happened in an actual running game, not just the
  toolset's editor view, ruling out a toolset-only display cache. **A first hypothesis
  (missing legacy `Tail`/`Wings` fields, diffed against a shopkeeper control creature)
  was wrong** — the shopkeeper (`Appearance_Type=232`) is a monster-model creature and
  was the wrong control entirely; the user re-reported the identical symptom after that
  fix shipped. **Real root cause, found by diffing two genuine, live, actively-hosted-PW
  henchman blueprints** (`~/tfndev`'s `hen_dorna.utc` [Dwarf] and `hen_linu.utc` [Elf],
  both real, confirmed-working PC-race henchmen) **against the broken `h_*` creature's
  raw GFF, full value-level, not just key-presence:** standard-race appearances
  (`Appearance_Type` 0-6) render as a composite model assembled from per-part index
  fields, exactly like a PC character in the character creator — `BodyPart_Belt`,
  `BodyPart_L*`/`BodyPart_R*` (Bicep/FArm/Foot/Hand/Shin/Shoul/Thigh), `BodyPart_Neck`,
  `BodyPart_Pelvis`, `BodyPart_Torso`, `ArmorPart_RFoot` (note the inconsistent name —
  there is no `BodyPart_RFoot`), `Appearance_Head`, and `Color_Hair`/`Color_Skin`/
  `Color_Tattoo1`/`Color_Tattoo2`. Both real samples carried the full set; `buildMinimalUtc()`
  wrote none of them, leaving the composite model with no parts selected. This exactly
  explains the two-part symptom: some head-related recompute happens on a Gender toggle,
  but the body parts only ever populate when the toolset's own Appearance property editor
  runs. **Separately, the same corpus diff also found `Tail_New`/`Wings_New` were the
  wrong GFF type** (`byte` instead of the real `dword`) — real henchmen carry no legacy
  `Tail`/`Wings` fields at all, contradicting the first hypothesis. **Fix:**
  `buildMinimalUtc()` (`git-helpers.ts`) now writes the full body-part/head/color field
  set with values matched from both real samples, writes `Tail_New`/`Wings_New` as
  `dword`, and no longer writes legacy `Tail`/`Wings`. **Verification methodology
  reinforced again: the first fix's mistake was comparing against a control of the wrong
  appearance-rendering category (monster-model vs. composite PC-race model) — always
  confirm the control creature uses the same rendering pathway before trusting a diff
  against it, the same discipline already established for tile-rotation corpus checks.**
  **Visually confirmed by the user**: all 7 race-representative test creatures (built
  from scratch with the corrected `buildMinimalUtc()`, replacing the 110 originally-broken
  companions) render correctly. Those 7 have no racial/class feats, generic 10-across
  stats, and no spells — expected and unrelated to this bug (see "Henchmen / Companions"
  below: empty `FeatList`/static stats on a level-1 from-scratch blueprint is correct
  until a real `LevelUpHenchman()`/2DA-table population pass is run, which this fix
  didn't touch).
- **Placeable display name field is `LocName`**, not `LocalizedName`. Setting `LocalizedName` on a placeable has no effect — the toolset and engine read `LocName` (a cexolocstring).
- **Placement Z height from walkmesh.** All placement tools automatically set the object's Z position from the walkmesh surface height (the `z` parameter is only a fallback). The walkmesh check returns the highest walkable face Z at the position, with the walkmesh node offset and `Tile_Height × Transition` included. Use `fix_object_heights` (`dryRun` first) to retroactively fix objects placed before this feature — heights written before 2026-10-02 ignored the node offset (57 % of walkmeshes) and used a flat 5 m per level.
- **Zone solver rejects incompatible adjacencies.** `adventure_apply_layout` returns early with zero placements and `INCOMPATIBLE TERRAIN ADJACENCY` errors if the zone layout contains terrain pairs with no transition tiles. Fix the zone layout, don't retry.
- **`fallbackSubstitute` is constrained.** The zone solver's fallback only tries terrains present in the corner grid (zone-defined + default). It will never inject an alien terrain.
- **`modify_gff_field` corruption isn't limited to float fields.** Beyond the float-serialization case below, two further confirmed corruptions: (a) attempting to construct new struct-list GFF fields for dialog `ActionParams`/`ConditionParams` corrupted the dialog's in-memory state on the first try; (b) a plain edit to an *existing scalar* field on an area's GIT data corrupted state too, with no struct-list creation involved. Treat `modify_gff_field` as unsafe for this class of edit across the board — prefer a typed tool (`edit_dialog_node`, area/creature/item edit tools, etc.) over a raw GFF field poke wherever one exists.
- **Dialog `ActionParams`/`ConditionParams` are writable (2026-11-07).** `create_dialog` nodes take `params` (ActionParams),
  `conditionParams` (on the link to the node), `quest` + `questEntry` (native journal advance, no script); `add_dialog_node` takes the
  same, and `edit_dialog_node` takes `params`/`quest`/`questEntry`. Shape, checked against 417 TFN dialogs: a list of
  `{Key, Value}` cexostring structs, `__struct_id` = position, always present (empty when unused); `QuestEntry` is a `dword` written
  only when `Quest` is set. The old corruption came from building these through `modify_gff_field`; still don't do that.
- **`write_script`'s built-in `compile: true` has an intermittent race.** It can throw a spurious `ENOENT` on the `.ncs` output path even when the source is fine. The reliable form is two calls: `write_script(resref, source, compile: false)` then a separate `compile_script(resref)`.
- **FIXED 2026-11-10 (E2): `list_script_references`/`find_orphans`/`get_dependency_graph` now read the current documents on every call and `SCRIPT_FIELDS` includes `ScriptOnEnter`/`ScriptOnExit`/`OnEntered`/`OnClosed`/`OnInvDisturbed`/`OnMeleeAttacked`; the entry below is the original finding.**
- **`list_script_references`/`find_orphans` blind spots (tested, confirmed).** Neither tool finds scripts referenced by **trigger** event fields (`OnEnter`/`OnExit`/etc.) — only dialog nodes, creature event fields (e.g. `OnDeath`), and `module.ifo`. A script flagged as unreferenced/orphaned may simply be a trigger's `OnEnter` script; verify with `get_area_triggers` before concluding it's dead. Separately, the reference index appears to be built once at `load_module` time rather than updated incrementally — scripts wired onto dialogs created earlier in the *same* session can still come back with zero references. `flatten_dialog` and `get_resource` on the raw `.dlg` stay accurate throughout and are the reliable way to confirm wiring on anything just built.
- **GFF `Dropable`/`Lootable` can be silently overridden at runtime.** Setting `Dropable=1` on an item (via `create_creature_blueprint`, `set_creature_equipment`, `place_creature`/`place_placeable` inventory) or `Lootable=1` on a creature only controls the *default* engine behavior. A module's own scripts — most commonly an `OnSpawn` handler that hands out randomly-generated loot — can call the legacy native functions `SetDroppableFlag(object, int)` / `SetLootable(object, int)` on the object at spawn time, which take precedence over the GFF fields and are invisible from the GFF data alone. If a user reports "I set Dropable/Lootable but nothing drops in-game" after nwn-mcp wrote those fields correctly, the next place to look is the creature's `ScriptSpawn` (OnSpawn) source for a `SetDroppableFlag(..., FALSE)`/`SetLootable(..., FALSE)` call — this is out of nwn-mcp's GFF-editing scope (see Scope) but worth telling the user about. Confirmed root cause of a real "nothing drops" bug report in a separate PW module (DwarfStory), traced to 75 such calls across 12 OnSpawn scripts.

## Pitfalls Found by Building a Real Module

These came out of generating a full four-area module end-to-end. Each cost real
debugging time, and none was visible from unit tests.

- **Doors/gates architecture — why generated areas usually ship with none, and what
  each layer of the gap actually is.** Investigated after a user observation that the
  17-area `tileset-proving-grounds` module has almost no doors/gates anywhere. Four
  separate, distinct causes, not one bug:
  1. **`groupHasUnsupportedDoors`/`groupMatchesTerrain` check the *style's nominal*
     floor terrain, not the *specific room's* actual zone terrain.** For single-terrain
     interior/dungeon styles this never matters. For multi-terrain exterior styles
     (castle's grass/dirt/keep, city's cobble/building/evilcastle) it does: a
     door-bearing group can pass this pre-filter and still get silently dropped later
     at `adventure_apply_layout`'s per-position `featureZoneTerrain` check, because
     the room it lands in has different terrain than the style's nominal one.
     Confirmed for real: 4 of 9 `preferredFeatures` requested for a `tno01`/castle
     area (`House_Inn_2x2`, `MarketStall_2x2`, `Forge_L_shape_2x2`,
     `City_House_2x2_m26` — all door-bearing buildings) were rejected this way. Not
     wrong, just wasteful — the LLM burns `preferredFeatures` slots on picks that
     can't succeed in a mixed-terrain area without knowing each room's terrain ahead
     of time. A real improvement here would have `packFeatures` filter door-bearing
     groups per-room (it already iterates rooms and could look up each room's actual
     zone terrain) instead of once for the whole area.
  2. **Tileset-integrated doors (gates, building doors, corridor archways) need a real
     Door GIT object placed separately from the visual tile** — the tile model alone
     is just a wall opening with no lock, script, or interactivity. This is a
     documented, existing procedure: `adventure-areas/SKILL.md`'s **Phase 5b** scans
     the painted grid for any tile with `doorPlacements` (from `get_tileset_details`)
     and places+locks a real door for each. **This step was simply never run for the
     proving-grounds module** — that build used an ad-hoc recipe outside the full
     `/create-adventure` skill script (its own doc says "Structure + light dressing
     only"), so Phase 5b never executed. A real `/create-adventure` run should
     already produce functional doors wherever the tileset provides them — this
     hasn't been end-to-end verified in this project, and is worth a real test rather
     than assuming it works from the doc alone.
  3. **FOUND A REAL MISTAKE while manually testing doors for this module**: a
     tile's `doorPlacements[].type` value is a row index into **`doortypes.2da`**,
     which maps directly to a `TemplateResRef` — the exact door blueprint that
     tileset expects for that specific door tile (e.g. `tds01`'s Big Door 1, type 17,
     maps to `nw_door_ttr_08`; its Fence Door 1, type 15, maps to `nw_door_ttr_07`).
     The manual door test done for this module instead picked blueprints from
     **`genericdoors.2da`** by matching appearance number — a different, generic
     table meant for hand-placed doors with no tile association, not the
     tile-integrated lookup `adventure-areas/SKILL.md`'s Phase 5b actually specifies.
     Structurally harmless (the doors still placed, locked correctly, and verified),
     but visually/thematically the wrong door model for that tile. **Always resolve
     a `doorPlacements[].type` value through `doortypes.2da`, never `genericdoors.2da`.**
  4. **Interior corridor archways (doorway-type crossers) are deliberately never
     generated by `layout-generator.ts`** — see the existing "Crosser type" rule
     under Layout Rules: `doorway` crossers need matched pairs on shared edges, which
     the solver isn't built to guarantee, so the generator always requests `corridor`
     type instead. This means auto-generated dungeons will never have a mid-corridor
     doorway unless one comes from a deliberately-requested single-tile door group
     (Big Door, Fence Door, etc.) — not a bug, a considered solver-reliability
     tradeoff. Making doorway crossers reliable would be a real, separate
     solver-extension project, not a quick fix.
  5. **Inter-area transitions deliberately never use doors or triggers** — this is
     intentional, existing design (`adventure-areas/SKILL.md`'s Phase 7: "Use
     `adventure_create_transition` for ALL area transitions — do NOT use doors,
     `link_doors`, or `create_area_transition`"), not a gap. Light-shaft portals need
     no matched door pairs or trigger geometry across two areas, which is why the
     pipeline standardized on them. Switching any of this to physical doors or
     trigger-based transitions would be a deliberate scope change to the
     `/create-adventure` pipeline, not a bug fix — needs explicit user sign-off, not
     silent replacement.

- **FIXED — independently-routed corridor paths could dead-end cardinally
  adjacent to each other with no connecting edge, reading as two hallway stubs
  that obviously should link but don't.** `connectRooms()` in `layout-generator.ts`
  computes each corridor's edge flags purely from its own path's prev/next tiles
  — it has no visibility into any other corridor. A shortcut corridor (cave style
  uses `shortcutCount: 3`) can by geometric coincidence end one tile from a
  main room-connector corridor, each capped with its one open side facing away
  from the other. Confirmed by a real user report against `tdm01` (Mines/Caverns):
  three separate instances in one area (a vertical corridor capped facing south
  sitting directly below a horizontal corridor capped facing west, and two more
  of the same shape) — traced by computing each placed tile's actual effective
  crossers (raw `.set` values rotated by the tile's real GIT orientation, the
  same rotation math already verified correct against `~/tfndev`) and confirming
  neither tile's open edge faced the other despite the tiles touching. **Fix:**
  `mergeAdjacentDeadEnds()` (`layout-generator.ts`), run once after all room
  connectors, shortcuts, and the secondary crosser are assembled and before the
  layout is returned. For every pair of cardinally-adjacent tiles across *all*
  crosser paths that share the same crosser type and have no edge pointing at
  each other, it sets the connecting edge on both sides. There is no legitimate
  case in this generator's model where two same-type crosser tiles occupy
  touching cells without being meant to connect — every crosser tile represents
  a routed, walkable corridor — so the merge always applies, never conditionally.
  Verified against a synthetic reproduction of the exact reported shape (see the
  function's usage) plus two guard cases: different crosser types never merge,
  and an already-fully-connected path is left untouched (byte-identical before/
  after). The three already-generated instances in the shipped module were
  hand-patched with `paint_tiles` (swapping each capped tile for a through or
  corner-turn tile computed from the same rotation formula) rather than
  regenerating the area, since `adventure_apply_layout` re-solves the whole area
  from scratch and isn't incremental.

- **FIXED — `adventure_apply_layout`'s feature-group placement checked terrain
  *name* but never corner *height*, letting height-transition features get dropped
  into dead-flat zones.** The zone solver already excludes any tile with non-zero
  corner height from its own placements (`tileset.ts`'s per-tile `flat` field) —
  but the separate feature-group code path in `adventure-tools.ts` only validated
  that a candidate group's tiles matched the surrounding zone's terrain *name* on
  all four corners, with no height check at all. A tile can be "snow/snow/snow/
  snow" by name and still have `TopLeftHeight=1` — exactly `tts01`'s `Cave` group,
  a cave mouth carved into a rise (top edge elevated, bottom/entrance flat).
  Confirmed by a real user report: the cave rendered floating in an open field,
  cliff-edge seam on every side but the entrance, because its flat "snow" corner
  names satisfied the only check that existed. **Fix:** feature groups containing
  any non-flat tile are now rejected with a `featureWarning`, the same standard the
  solver already holds itself to. This pipeline has no automated way to also
  terrace matching elevated ground around a height-transition feature — a group
  like this now needs deliberate hand-placement (`paint_tiles`, not
  `adventure_apply_layout`) plus manually rotation-matched neighboring slope tiles.
  See `area-frozen/SKILL.md`'s Pitfalls section for the worked recipe (computing a
  cave tile's real corner heights at its placed orientation, finding which
  rotation of a neighboring slope tile reproduces the exact matching edge, and
  what "good enough" looks like — a 1-tile collar, not a fully seamless terrace).

- **`feature-collars.ts` — the reject-by-default rule above now has a curated
  escape hatch.** After hand-deriving and verifying collars for four more
  height-transition features this same session (`tts01` Cave, `tti01` Cave and
  Ramp, `tcn01` CityGate_2x2), the pattern was clearly going to keep recurring —
  every user report was "here's a feature that needs the exact same kind of fix
  as last time." `src/util/feature-collars.ts` is a small curated table:
  `(tileset, group name) → collar tiles` (each an offset from the feature's own
  origin + tile ID + orientation). `adventure-tools.ts`'s height-transition
  rejection now checks this table first — a listed (tileset, group) pair is
  auto-placed *with* its collar in the same `adventure_apply_layout` call instead
  of being rejected; anything not listed still falls through to the old
  reject-by-default behavior. Each collar tile still gets its own bounds +
  terrain-name check at placement time (the curated entry is trusted for tile
  ID/orientation, not for whether *this specific* room's surroundings still
  match what it was derived against) — a collar tile that can't be placed is
  dropped with a warning, not treated as a reason to reject the whole feature.
  **Growing this table is the cheapest way to fix the next reported instance of
  this bug class**: derive the collar once via the recipe above, add one entry,
  and every future generation gets it automatically instead of needing another
  hand-patch. Needs an MCP restart to take effect; doesn't retroactively fix
  already-built areas (a listed feature already painted before the restart still
  needs the old hand-patch treatment).

- **FIXED — parse-time tile-corner "un-rotation" was corrupting every tile whose
  `.set` `Orientation` field is non-zero.** `tileset.ts`'s `.set` parser used to treat
  a tile's `Orientation` field (90/180/270) as a statement that the file's
  `TopLeft`/`TopRight`/`BottomLeft`/`BottomRight` fields were recorded "pre-rotated"
  and needed un-rotating back to GIT-orientation-0 terms (`unrotateCorners`/
  `unrotateCrossers`, called unconditionally whenever `Orientation != 0`). This was
  wrong: those fields already describe the tile in GIT-orientation-0 terms exactly as
  written, regardless of `Orientation`'s value — `Orientation` only records which
  rotation the 3D model was designed at (used by the solver's separate
  "prefer natural orientation" placement preference, which is unaffected and still
  correct). Confirmed by a real user report: `tno01` castle-wall convex corners
  ("square corner" tile 209 / round "tower corner" tile 230, both `.set`
  `Orientation=90`) rendered visibly rotated wrong in the toolset, while the concave
  3-wall corner tile (223, `.set` `Orientation=0`, hence never exercising the buggy
  code path) rendered correctly — exactly the fingerprint of a parse-time bug gated
  on non-zero `Orientation`, not a solve-time rotation-direction bug (see the
  "Tile rotation" pitfall above, which is unaffected and still correct).
  **Verification method, for reuse on any future tile-rotation report:** don't trust
  this codebase's own rotation code to check itself (comparing `getRotatedCorners`
  against `forwardRotate` only proves they agree with each other, not with the real
  engine — this was tried first and gave a false pass). Instead cross-reference
  against a large, independently-built, human-authored module using the same
  tileset (`~/tfndev` — 12 real `tno01` areas were available) by finding every real
  placed instance of the suspect tile ID, reading its neighbors' terrain at the
  *raw, unrotated* `.set` corner values (only trustworthy for neighbors placed at
  GIT orientation 0, or fully rotation-symmetric all-one-terrain tiles, so no
  rotation formula needs to be trusted on the read side either), and checking
  whether the pattern the code predicts for that orientation matches what humans
  actually built. Tabulate multiple samples per orientation value (0/1/2/3) — a
  clean, uniform match or a clean, uniform offset both a real signal; noise is not.
  **Fix:** removed the `unrotateCorners`/`unrotateCrossers` call and the two
  functions themselves from `tileset.ts` — corners/crossers are now stored exactly
  as parsed from the `.set` file. Needs an MCP server restart to take effect, and
  any already-generated area containing an affected corner tile needs
  regeneration (`adventure_generate_layout` + `adventure_apply_layout`) to pick up
  corrected data — the bug was in parsing, not in data already written to a `.are`.

- **`modify_gff_field` cannot write float fields.** The MCP layer serialises `value`
  as a string, so a float field receives `{"type":"float","value":"60"}` and `nwn_gff`
  rejects it with a `ValueError`. Worse, `setGffByPath` has already mutated the
  in-memory document by then, so a **failed write leaves `index.parsedGff` holding a
  value that will fail every subsequent write of that resource**. Recover by
  `repack_module` (which packs the still-valid files on disk) then `load_module` to
  re-read. Affects `Mod_Entry_X/Y/Z` and any other float — set positions at creation
  time instead, or reload after a failure.
- **Interior tilesets fill with `wall`, not floor.** `create_area` on `tic01`/`tde01`
  and friends fails with *"No suitable default tile found"* for any floor terrain,
  because floor tiles only exist as room interiors bounded by wall — the adjacency
  list shows every floor terrain connecting to `wall` alone. Create the area with the
  tileset's own default terrain (`wall`) and carve rooms with
  `adventure_generate_layout` + `adventure_apply_layout`.
- **Decorated interior terrains are only partly walkable.** `tic01`'s `rich` tiles
  carry furniture, so a tile that exists is not necessarily a place a creature can
  stand — a throne-room centre computed as `tile * 10.0 + 5.0` came back
  `Nonwalk (ID 7)`. Never compute a placement position arithmetically on a decorated
  terrain; always ask `adventure_find_walkable`.
- **`create_module` leaves a dead `_start` area.** The template's `tms01` stub stays in
  the module after real areas are built, and shows up as permanently unreachable in
  `check_area_connectivity`. Delete it once the real entry area exists and
  `Mod_Entry_Area` points at it.
- **Base-game whitelists must be shared, not per-tool.** `validate_module` reported 255
  errors on a module it had just created, every one a stock `nw_*`/`x2_*` reference.
  `isBaseGameScript()` / `isBaseGameResource()` in `src/util/verify/common.ts` are the
  single source of truth — any new checker must use them. A checker with false
  positives trains people to ignore it, which is worse than no checker.
