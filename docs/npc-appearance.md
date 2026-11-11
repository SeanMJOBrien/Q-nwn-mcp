# NPC appearance: player-character looks (TODO #34)

A standard-race humanoid NPC (Appearance_Type 0-6 equal to its Race, gender 0 or 1) renders as a composite player-character model. Left at the defaults every one looks alike, so the builder varies three things, all taken from real data and never invented:

- **Head:** a head model that exists for the race and gender. The lists come from the base game's own head models (`p<m|f><race letter>0_head###`; dwarf D, elf E, gnome G, halfling A, half-elf and human H, half-orc O): for example 13 male and 12 female dwarf heads, 72 male and 33 female human ones. Half-elves wear the human models.
- **Skin and hair colour:** drawn by how often the same race and gender use each value in about 2,800 hand-built standard-race creatures (weights, so common looks stay common). Thin groups (gnome and halfling women, half-orc women) borrow the other gender's colours, then the human ones. Provenance and the regeneration command are in `scripts/build-pc-appearance.py`; the result is `src/data/pc-appearance.json`.
- **Voice:** a player voice set (`soundset.2da` TYPE 0) of the creature's own gender; 19 male and 17 female. A voice given explicitly is kept.

Seeded by the resref (and for placed copies, the area and position in the list), so the same module builds the same people every time.

## Where it applies
- `create_creature_blueprint`, `forge_creature`-based tools (`build_companion`, `build_key_npc`, ...) go through the same builder: the look is applied when the blueprint is made. `appearanceLook: "keep"` leaves the model fields alone.
- `randomize_npc_appearance(area?, tag?, voice?, blueprints?)` varies an existing module: every placed copy gets its own look (ten guards, ten different people) and its blueprint gets one too. A creature that is not a standard-race humanoid is left alone and reported.

## Not covered
Body parts other than the head (torso, limbs, belt) stay at the default model; armour changes them in game. Portraits, tattoos and facial hair are untouched.
