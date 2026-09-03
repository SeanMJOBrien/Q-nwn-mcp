# Encounters survey — TFN (n=128 `.ute` encounter blueprints)

Raw counts inline (small enough not to need a separate JSON dump).

## Norms

- **Creature-type variety per encounter table**: median 2-3 distinct
  `ResRef` entries, long tail to 14 for the most varied random-encounter
  tables. Single-creature-type "encounters" (19/128) exist but aren't the
  norm.
- **RecCreatures/MaxCreatures**: 114/128 (89%) are 1/1 (spawns exactly one
  creature, randomly chosen from the table); 14/128 (11%) are 2/4 (a small
  pack). No encounter in the corpus asks for more than 4 at once.
- **DifficultyIndex**: spread 0-4, skewed toward the high end (4: 43 uses,
  3: 23, 2: 35, 1: 18, 0: 9) — this PW leans toward tougher random
  encounters more often than trivial ones.
- **Respawns: 0/128.** Not one encounter blueprint in the whole corpus has
  the built-in `Respawns` flag set. Re-spawning/randomization in this module
  is handled some other way (external heartbeat scripts, area-level spawn
  triggers) rather than the native `.ute` respawn mechanism — flagged as an
  observation, not investigated further this pass (would need the `.nss`
  script-idioms pass to confirm how).
- **SpawnOption**: 128/128 use the same value (1) — no variety here worth
  noting as a range.

## Relevance to nwn-mcp — low, and that's fine

Checked: `adventure-challenges/SKILL.md` never references
`create_encounter_blueprint` at all — the `/create-adventure` pipeline places
combat via static `place_creature` calls, not roaming/random `.ute`
encounter zones. That's the right call for a spoiler-free, single-playthrough
module (a random encounter table exists to keep a *repeatedly played* PW
area from feeling static — a one-shot adventure doesn't get replayed enough
for that to matter, and static placement gives predictable, verifiable
balance per area). These norms are recorded for completeness and in case a
future feature (e.g. optional "wandering monster" zones) wants real
calibration data, but **no skill-doc change made this pass** — there's no
gap to fix.
