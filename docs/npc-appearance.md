# NPC appearance: player-character looks (TODO #34)

A standard-race humanoid NPC (Appearance_Type 0-6 equal to its Race, gender 0 or 1) renders as a composite player-character model. Left at the defaults every one looks alike, so the builder varies three things, all taken from real data and never invented:

- **Head:** a head model that exists for the race and gender. The lists come from the base game's own head models (`p<m|f><race letter>0_head###`; dwarf D, elf E, gnome G, halfling A, half-elf and human H, half-orc O): for example 13 male and 12 female dwarf heads, 72 male and 33 female human ones. Half-elves wear the human models.
- **Skin and hair colour:** drawn by how often the same race and gender use each value in about 2,800 hand-built standard-race creatures (weights, so common looks stay common). Thin groups (gnome and halfling women, half-orc women) borrow the other gender's colours, then the human ones. Provenance and the regeneration command are in `scripts/build-pc-appearance.py`; the result is `src/data/pc-appearance.json`.
- **Phenotype:** the normal body (0) or the big one (2), at the rate hand-built creatures use them (about 95 % / 5 %); the custom phenotypes some creatures use need extra content and are left out.
- **Size:** a slight scale change, between 95 % and 105 % of normal (user decision 2026-11-11). It is applied at spawn by `CL_ApplyScale` in the level system (`inc_cre_level`, called first by the `cf_spawn` wrapper): forged creatures get it automatically, and `randomize_npc_appearance` wires `cf_spawn` onto other standard-race NPCs (their own spawn script still runs first, kept as `MCP_ORIG_SPAWN`). A placed copy gets its own fixed size (`MCP_SCALE`), a blueprint draws one at each spawn; `MCP_NO_SCALE` = 1 on a creature leaves it normal, `create_creature_level_system scalePercent` changes the range (0 turns it off). The rebuilt copy a caster becomes keeps its size.
- **Voice:** a player voice set (`soundset.2da` TYPE 0) of the creature's own gender; 19 male and 17 female. A voice given explicitly is kept.

Seeded by the resref (and for placed copies, the area and position in the list), so the same module builds the same people every time.

## Where it applies
- `create_creature_blueprint`, `forge_creature`-based tools (`build_companion`, `build_key_npc`, ...) go through the same builder: the look is applied when the blueprint is made. `appearanceLook: "keep"` leaves the model fields alone.
- `randomize_npc_appearance(area?, tag?, voice?, blueprints?)` varies an existing module: every placed copy gets its own look (ten guards, ten different people) and its blueprint gets one too. A creature that is not a standard-race humanoid is left alone and reported.

## Cross-check with GvE3
The sibling project's own spawn scripts (`g_os_good`, `g_os_evil`) randomise head `Random(11)+1`, skin `Random(8)` (0-7) and hair (`Random(8)+15` when the skin is above 3, else a wider range). Their heads and skin tones sit inside the data-driven pools used here. No phenotype or scale randomiser was found in `gve3` or `dwarfgve3`;; the size change here is `SetObjectVisualTransform` at spawn (a blueprint has no scale field).

## Not covered
Body parts other than the head (torso, limbs, belt) stay at the default model; armour changes them in game. Portraits, tattoos and facial hair are untouched. The size change is visual only (hit box and reach stay normal).
