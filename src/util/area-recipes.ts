/**
 * What build_area needs to know per tileset: the layout style, the sizing biome and the music/sound/sky settings
 * (the tables of docs/phase-prompts/areas.md, as data), and how it picks feature groups when none are named.
 */

import type { Biome } from "./area-size.js";

export interface AreaRecipe {
  style: string;
  biome: Biome;
  /** set_area_properties values. */
  music: { musicDay: number; musicNight: number; musicBattle: number; ambientSndDay?: number; skyBox: number; dayNightCycle: boolean };
}

const COUNTRY = (ambient: number) => ({ musicDay: 1, musicNight: 3, musicBattle: 34, ambientSndDay: ambient, skyBox: 1, dayNightCycle: true });
const TOWN = { musicDay: 16, musicNight: 16, musicBattle: 10, ambientSndDay: 30, skyBox: 1, dayNightCycle: true };
const UNDER = { musicDay: 7, musicNight: 7, musicBattle: 10, ambientSndDay: 60, skyBox: 0, dayNightCycle: false };
const HOUSE = { musicDay: 7, musicNight: 7, musicBattle: 10, skyBox: 0, dayNightCycle: false };

export const AREA_RECIPES: Record<string, AreaRecipe> = {
  ttf01: { style: "forest", biome: "forest", music: COUNTRY(33) },
  ttf02: { style: "forest", biome: "forest", music: COUNTRY(33) },
  ttr01: { style: "rural", biome: "rural", music: COUNTRY(30) },
  tcn01: { style: "city", biome: "city_exterior", music: TOWN },
  tin01: { style: "dwelling", biome: "interior", music: HOUSE },
  tni01: { style: "dwelling", biome: "interior", music: HOUSE },
  tde01: { style: "dungeon", biome: "dungeon", music: UNDER },
  tdc01: { style: "dungeon", biome: "dungeon", music: { ...UNDER, musicDay: 13, musicNight: 13 } },
  tds01: { style: "dungeon", biome: "dungeon", music: UNDER },
  tdm01: { style: "cave", biome: "cave", music: UNDER },
  ttd01: { style: "desert", biome: "desert", music: COUNTRY(30) },
  tno01: { style: "castle", biome: "castle_exterior", music: COUNTRY(30) },
  tts01: { style: "tundra", biome: "frozen", music: COUNTRY(30) },
};

/** Words that matter in a name ("The Old Mill Road" -> old, mill, road). */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "with", "under", "of"].includes(w));
}

/**
 * Feature groups for an area: those whose name shares a word with the area's name or purpose first, then the
 * smallest ones (they fit the rooms best), `count` in all.
 */
export function pickFeatures(groups: Array<{ name: string; columns?: number; rows?: number }>, hints: string, count = 4): string[] {
  const want = new Set(words(hints).flatMap((w) => [w, w.replace(/s$/, "")]));
  const matching = groups.filter((g) => words(g.name).some((w) => want.has(w) || want.has(w.replace(/s$/, ""))));
  const rest = groups
    .filter((g) => !matching.includes(g))
    .sort((a, b) => (a.columns ?? 1) * (a.rows ?? 1) - (b.columns ?? 1) * (b.rows ?? 1));
  return [...matching, ...rest].slice(0, count).map((g) => g.name);
}
