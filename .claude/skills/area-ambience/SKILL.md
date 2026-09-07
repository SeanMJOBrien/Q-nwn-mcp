---
name: area-ambience
description: Set area music, ambient sound, lighting, fog and weather — the settings 93-97% of hand-built areas have and generated areas usually lack.
allowed-tools: Bash(echo *), Read, Grep, Glob
---

# Area ambience — music, sound, light, fog, weather

## Why this exists

Measured adoption across the corpus:

| Setting | Population | Adoption |
|---|---|---|
| `AmbientSndDay` set | all | **97%** |
| `IsNight` set | interior | **97%** |
| `FogClipDist` ≤ 45 | interior | **94%** |
| `MusicDay` set | all | **93%** |
| `MusicBattle` set | all | **93%** |
| `MusicDelay` set | all | **91%** |
| `DayNightCycle` on | exterior | **83%** |
| `OnEnter` script | all | 81% |
| `SkyBox` set | exterior | 31% |
| `NoRest` set | all | 9% |
| `OnHeartbeat` script | all | **7%** |

Generated areas typically set **none** of the top six. Silence and flat lighting are the cheapest
and largest reason a generated area feels dead beside a hand-built one.

## The file trap — read this first

**Music and ambient sound do not live in the `.are`.** They live in the **`.git`**, inside the
`AreaProperties` struct:

```
AreaProperties: {
  MusicDay, MusicNight, MusicBattle, MusicDelay,
  AmbientSndDay, AmbientSndNight, AmbientSndDayVol, AmbientSndNitVol
}
```

A first pass at this survey looked for `MusicDay` on the `.are` and reported **0% adoption**; the
real figure is 93%. Anyone writing area music to the `.are` is writing a field the engine never
reads, and it will fail silently. Use `set_area_properties`, and if you must edit GFF directly,
target the `.git`.

Everything else in this skill — lighting, fog, weather, `IsNight`, `DayNightCycle`, `SkyBox`,
`NoRest` — *is* on the `.are`.

## What to set

### Every area

- **`MusicDay`** and **`MusicNight`** — a row from `ambientmusic.2da`. Look it up; do not guess.
- **`MusicBattle`** — from `ambientmusic.2da` as well. 93% adoption: combat music is not optional.
- **`MusicDelay`** — the gap before the loop repeats, in seconds. Set via `set_area_properties`'s
  `musicDelay` param. Left at 0 (the area-creation default) the track restarts instantly and
  becomes maddening. Hand-built areas set it 91% of the time.
- **`AmbientSndDay`** / **`AmbientSndNight`** — a row from `ambientsound.2da`, plus volumes
  (`AmbientSndDayVol`, `AmbientSndNitVol`). This is the single highest-adoption setting in the
  corpus at 97%.

Match the loop to the biome: forest birds, city crowd, tavern murmur, dungeon drips, wind in the
desert and the ice.

### Interiors

- **`IsNight = 1`** (97%). Fixes the lighting so the interior does not brighten and darken with
  the world clock.
- **`FogClipDist ≤ 45`** (94%). Draws the walls in and stops the room feeling like an outdoor
  space with a ceiling.
- **Do not** set `DayNightCycle` or a `SkyBox`.

### Exteriors

- **`DayNightCycle = 1`** (83%).
- **`SkyBox`** — only 31%, so it is a deliberate choice rather than a default. Set it when the sky
  is part of the mood.
- **Weather** — `ChanceRain` / `ChanceSnow` / `ChanceLightning` are set in only 3% of areas
  overall. Leave them at 0 unless the biome is *about* the weather: snow in Frozen Wastes and
  Rural Winter, storms for a set-piece.

### Lighting colour

`SunAmbientColor`, `SunDiffuseColor`, `MoonAmbientColor`, `MoonDiffuseColor` and `DynAmbientColor`
carry the mood. Warm and bright for desert and rural; cold blue for ice and night; dim and
desaturated for dungeon and crypt. Set them through `set_area_properties`.

### Rest and scripts

- **`NoRest`** — 9%. Set it where resting would break the fiction or the pacing: inside a
  besieged keep, in the boss's lair, on a timer.
- **`OnEnter`** — 81% of areas have one. Standard uses: first-visit journal entry, ambience
  triggers, spawn kick-off.
- **`OnHeartbeat`** — only **7%**. This is a deliberate negative result: experienced builders avoid
  per-area heartbeats because they run forever whether or not anyone is present. Treat an area
  heartbeat as something to justify, not a default hook. Prefer `OnEnter` plus `DelayCommand`, or a
  trigger volume.

## Procedure

1. `get_area_details` to see what is already set.
2. `search_2da(table: "ambientmusic", ...)` and `search_2da(table: "ambientsound", ...)` to find
   rows that match the biome. Read the labels — never guess a row number.
3. `set_area_properties` for music, ambient sound and volumes (these write the `.git`), and for
   lighting, fog and flags (these write the `.are`).
4. Interior: `IsNight = 1`, `FogClipDist ≤ 45`. Exterior: `DayNightCycle = 1`, `SkyBox` if wanted.
5. Weather only where the biome calls for it.
6. Re-read with `get_area_details` and confirm the values stuck — particularly music, because the
   `.are`/`.git` split makes silent failure easy.

## Pitfalls

- **Writing music to the `.are`.** It will appear to work and do nothing.
- **`MusicDelay = 0`.** The loop restarts with no gap.
- **Forgetting `MusicBattle`.** 93% adoption; combat with the exploration track still playing is
  a strong tell that an area was generated.
- **`DayNightCycle` on an interior**, or `IsNight` on an exterior.
- **Weather everywhere.** 3% adoption overall — rain in every area is worse than rain in none.
- **Reaching for `OnHeartbeat`.** 7%. There is almost always a cheaper hook.
