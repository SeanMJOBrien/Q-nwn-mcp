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
  /** Base-game placeables that suit the area (dress_area's default props); every resref checked against the game data. */
  props: string[];
}

// Prop kits per kind of place: base-game resrefs found with list_blueprints (2026-11-18). A small model asked for props
// put a table, a bed and a bookshelf in the open village of The Mill on Blackwater.
const KIT = {
  rural: ["plc_well", "plc_haybundle", "x0_fencerural", "plc_signpost2", "plc_emptywagon", "plc_barrel", "x2_easy_crate1"],
  forest: ["nw_plc_rock1", "x3_plc_log001", "nw_plc_mushroom1", "x3_plc_treem010", "nw_plc_rock3", "plc_campfr", "tm_pl_bushmd01"],
  city: ["plc_lamppost", "plc_well", "plc_barrel", "x2_easy_crate1", "plc_signpost2", "plc_fullwagon", "plc_statue1"],
  interior: ["plc_table", "plc_chair", "plc_bed", "plc_bookshelf", "plc_barrel", "plc_chest1", "plc_freetorch"],
  dungeon: ["plc_bones", "x3_plc_rubble2", "plc_freetorch", "plc_statue1", "x2_easy_crate1", "plc_barrel", "plc_chest1"],
  cave: ["nw_plc_rock1", "nw_plc_rock4", "nw_plc_mushroom2", "plc_bones", "x3_plc_rubble3", "x2_easy_crate1", "plc_campfr"],
  desert: ["x0_desertrocks", "plc_bones", "plc_barrel", "plc_emptywagon", "plc_campfr", "x2_easy_crate1"],
  castle: ["plc_barrel", "x2_easy_crate1", "plc_haybundle", "plc_well", "plc_lamppost", "plc_signpost2", "plc_fullwagon"],
  frozen: ["nw_plc_rock2", "x3_plc_log001", "plc_campfr", "plc_barrel", "x2_easy_crate1", "plc_bones"],
};

const COUNTRY = (ambient: number) => ({ musicDay: 1, musicNight: 3, musicBattle: 34, ambientSndDay: ambient, skyBox: 1, dayNightCycle: true });
const TOWN = { musicDay: 16, musicNight: 16, musicBattle: 10, ambientSndDay: 30, skyBox: 1, dayNightCycle: true };
const UNDER = { musicDay: 7, musicNight: 7, musicBattle: 10, ambientSndDay: 60, skyBox: 0, dayNightCycle: false };
const HOUSE = { musicDay: 7, musicNight: 7, musicBattle: 10, skyBox: 0, dayNightCycle: false };

export const AREA_RECIPES: Record<string, AreaRecipe> = {
  ttf01: { style: "forest", biome: "forest", music: COUNTRY(33), props: KIT.forest },
  ttf02: { style: "forest", biome: "forest", music: COUNTRY(33), props: KIT.forest },
  ttr01: { style: "rural", biome: "rural", music: COUNTRY(30), props: KIT.rural },
  tcn01: { style: "city", biome: "city_exterior", music: TOWN, props: KIT.city },
  tin01: { style: "dwelling", biome: "interior", music: HOUSE, props: KIT.interior },
  tni01: { style: "dwelling", biome: "interior", music: HOUSE, props: KIT.interior },
  tde01: { style: "dungeon", biome: "dungeon", music: UNDER, props: KIT.dungeon },
  tdc01: { style: "dungeon", biome: "dungeon", music: { ...UNDER, musicDay: 13, musicNight: 13 }, props: KIT.dungeon },
  tds01: { style: "dungeon", biome: "dungeon", music: UNDER, props: KIT.dungeon },
  tdm01: { style: "cave", biome: "cave", music: UNDER, props: KIT.cave },
  ttd01: { style: "desert", biome: "desert", music: COUNTRY(30), props: KIT.desert },
  tno01: { style: "castle", biome: "castle_exterior", music: COUNTRY(30), props: KIT.castle },
  tts01: { style: "tundra", biome: "frozen", music: COUNTRY(30), props: KIT.frozen },
};

/** Words that matter in a name ("The Old Mill Road" -> old, mill, road). */
function words(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length >= 3 && !["the", "and", "with", "under", "of"].includes(w));
}

/**
 * Words in an area's name or purpose that stand for feature groups with other names: a "village" has no group called
 * village, but houses, an inn, a well and farms (The Mill on Blackwater's village got a Crystal, 2026-11-18).
 */
const FEATURE_WORDS: Record<string, string[]> = {
  village: ["house", "inn", "well", "farm", "barn", "granary", "garden", "market", "shack"],
  hamlet: ["house", "well", "farm", "barn", "garden", "shack"],
  town: ["house", "inn", "market", "well", "temple", "plaza", "fountain"],
  city: ["house", "market", "plaza", "fountain", "temple", "inn"],
  settlement: ["house", "well", "farm", "shack"],
  farm: ["farm", "barn", "field", "granary", "orchard", "windmill"],
  mill: ["windmill", "granary", "barn", "field"],
  road: ["camp", "shrine", "wagon", "ruin", "menhir"],
  path: ["camp", "shrine", "ruin", "menhir"],
  trail: ["camp", "shrine", "ruin"],
  forest: ["camp", "grove", "lodge", "big", "ruin"],
  wood: ["camp", "grove", "lodge", "big"],
  woods: ["camp", "grove", "lodge", "big"],
  cave: ["treasure", "pillar", "mineshaft", "platform"],
  caves: ["treasure", "pillar", "mineshaft", "platform"],
  cavern: ["treasure", "pillar", "platform"],
  mine: ["mineshaft", "treasure", "platform"],
  mines: ["mineshaft", "treasure", "platform"],
  graveyard: ["graves", "graveyard", "mausoleum"],
  cemetery: ["graves", "graveyard", "mausoleum"],
  temple: ["temple", "shrine"],
  church: ["temple", "shrine"],
  camp: ["camp", "shack", "wagon"],
};

/** Groups that fit almost no story place: never picked to fill up, only when the name asks for them. */
const ODD_FEATURE = /\b(portal|chessboard|warzone|dragon|crystal|ramp|ant|webbed|ice|elevation|construction|arena|amp(h)?itheater)/i;

/**
 * Feature groups for an area: those whose name shares a word with the area's name or purpose (or a word that stands
 * for it, FEATURE_WORDS) first, then the smallest ordinary ones (they fit the rooms best), `count` in all.
 */
export function pickFeatures(groups: Array<{ name: string; columns?: number; rows?: number }>, hints: string, count = 4): string[] {
  const given = words(hints);
  // The words in order of preference: the name's own, then the ones they stand for; one group per word first, so a
  // village gets a house, an inn and a well rather than three barns.
  const order = [...new Set([...given, ...given.flatMap((w) => FEATURE_WORDS[w] ?? [])].map((w) => w.replace(/s$/, "")))];
  const fits = (g: { name: string }, w: string) => words(g.name).some((n) => n.replace(/s$/, "") === w);
  const picked: Array<{ name: string; columns?: number; rows?: number }> = [];
  for (let round = 0; round < count && picked.length < count; round++) {
    for (const w of order) {
      const g = groups.find((x) => !picked.includes(x) && fits(x, w));
      if (g && picked.length < count) picked.push(g);
    }
  }
  const size = (g: { columns?: number; rows?: number }) => (g.columns ?? 1) * (g.rows ?? 1);
  const rest = groups.filter((g) => !picked.includes(g)).sort((a, b) => Number(ODD_FEATURE.test(a.name)) - Number(ODD_FEATURE.test(b.name)) || size(a) - size(b));
  return [...picked, ...rest].slice(0, count).map((g) => g.name);
}
