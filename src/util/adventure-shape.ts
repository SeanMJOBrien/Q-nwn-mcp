/**
 * Adventure shape: from play time and party size to how many areas, how many events, which kinds of encounter go where and in what
 * order. Pure and unit-tested; plan_adventure_shape wraps it. The minutes, mix and tile needs are first estimates (see
 * docs/adventure-composition.md) to be tuned against real builds.
 */

import { type Biome, suggestAreaSize } from "./area-size.js";

export const ENCOUNTER_KINDS = [
  "combat", // a fight with a group
  "ambush", // a fight that starts by surprise (a set piece on the road)
  "boss", // the named antagonist and escorts
  "chain", // multi-part: scouts or a lookout first, then the main force
  "social", // persuasion, bluff, a negotiation, an interrogation
  "obstacle", // a skill/ability check gate: stuck door, climb, ford
  "trap", // a hazard with a check and damage
  "discovery", // a clue, a find, a lore moment
  "friendly", // a merchant, traveller, ally who joins, a rival party
  "rest", // a safe camp or inn
] as const;
export type EncounterKind = (typeof ENCOUNTER_KINDS)[number];

/** Minutes a party spends on one event of each kind, and the open ground it needs (tiles, including its approach). */
export const KIND_COST: Record<EncounterKind, { minutes: number; tiles: number }> = {
  combat: { minutes: 12, tiles: 30 },
  ambush: { minutes: 12, tiles: 20 },
  boss: { minutes: 22, tiles: 80 },
  chain: { minutes: 24, tiles: 60 },
  social: { minutes: 8, tiles: 6 },
  obstacle: { minutes: 5, tiles: 8 },
  trap: { minutes: 3, tiles: 6 },
  discovery: { minutes: 6, tiles: 6 },
  friendly: { minutes: 6, tiles: 10 },
  rest: { minutes: 3, tiles: 12 },
};

/** Share of the non-boss events by kind (sums to 1). Friendly and rest are dropped when `friendly` is false. */
const MIX: Array<[EncounterKind, number]> = [
  ["combat", 0.26],
  ["ambush", 0.08],
  ["chain", 0.1],
  ["social", 0.14],
  ["obstacle", 0.1],
  ["trap", 0.06],
  ["discovery", 0.12],
  ["friendly", 0.11],
  ["rest", 0.03],
];

export const ACTS = ["setup", "complication", "turn", "climax", "resolution"] as const;
export type Act = (typeof ACTS)[number];

export interface ShapeInput {
  playMinutes: number;
  partySize?: number;
  /** Leave out friendly encounters and rests. */
  friendly?: boolean;
  /** Allow multi-part encounters. */
  chains?: boolean;
  biome?: Biome;
}

export interface AreaPlan {
  n: number;
  act: Act;
  events: EncounterKind[];
  minutes: number;
  /** Open ground the events need; the area is sized at least this big (see suggest_area_size for the shape). */
  tilesNeeded: number;
  size?: { width: number; height: number; method: string };
}

export interface ShapePlan {
  playMinutes: number;
  totalEvents: number;
  areaCount: number;
  eventsPerArea: number;
  kinds: Record<string, number>;
  areas: AreaPlan[];
  notes: string[];
}

function actFor(i: number, count: number): Act {
  if (count === 1) return "climax";
  const f = i / (count - 1);
  if (i === count - 1) return "climax";
  if (f < 0.25) return "setup";
  if (f < 0.65) return "complication";
  return "turn";
}

export function planAdventureShape(input: ShapeInput): ShapePlan {
  const minutes = Math.max(30, Math.round(input.playMinutes));
  const friendly = input.friendly !== false;
  const chains = input.chains !== false;
  const notes: string[] = [];

  const mix = MIX.filter(([k]) => (friendly || (k !== "friendly" && k !== "rest")) && (chains || k !== "chain"));
  const total = mix.reduce((a, [, w]) => a + w, 0);
  const avg = mix.reduce((a, [k, w]) => a + (KIND_COST[k].minutes * w) / total, 0);

  // One boss per ~90 minutes, at least one; everything else fills the time that is left.
  const bosses = Math.max(1, Math.round(minutes / 90));
  const bossMinutes = bosses * KIND_COST.boss.minutes;
  const others = Math.max(2, Math.round((minutes - bossMinutes) / avg));

  const counts = new Map<EncounterKind, number>([["boss", bosses]]);
  let assigned = 0;
  mix.forEach(([k, w], idx) => {
    const n = idx === mix.length - 1 ? others - assigned : Math.round((others * w) / total);
    counts.set(k, Math.max(0, n));
    assigned += Math.max(0, n);
  });

  const totalEvents = [...counts.values()].reduce((a, b) => a + b, 0);
  const eventsPerArea = minutes <= 90 ? 2 : minutes <= 240 ? 3 : 4;
  const areaCount = Math.max(2, Math.ceil(totalEvents / eventsPerArea));

  // Deal the events out in story order: an opening friendly/discovery, rising fights, the boss last.
  const order: EncounterKind[] = [];
  const pool = new Map(counts);
  const take = (k: EncounterKind) => {
    const n = pool.get(k) ?? 0;
    if (n > 0) {
      order.push(k);
      pool.set(k, n - 1);
    }
  };
  take("friendly");
  take("discovery");
  const middleKinds: EncounterKind[] = ["combat", "social", "obstacle", "chain", "discovery", "ambush", "trap", "friendly", "combat", "rest"];
  while ([...pool.entries()].some(([k, n]) => k !== "boss" && n > 0)) {
    for (const k of middleKinds) take(k);
  }
  for (let b = 0; b < bosses; b++) take("boss");

  const areas: AreaPlan[] = [];
  for (let i = 0; i < areaCount; i++) {
    const from = Math.floor((i * order.length) / areaCount);
    const to = Math.floor(((i + 1) * order.length) / areaCount);
    const events = order.slice(from, to);
    const mins = events.reduce((a, k) => a + KIND_COST[k].minutes, 0);
    const tilesNeeded = events.reduce((a, k) => a + KIND_COST[k].tiles, 0);
    const plan: AreaPlan = { n: i + 1, act: actFor(i, areaCount), events, minutes: mins, tilesNeeded };
    if (input.biome) {
      const s = suggestAreaSize({ biome: input.biome, events: Math.max(1, events.length) });
      plan.size = { width: s.width, height: s.height, method: s.method };
      if (s.tiles < tilesNeeded) notes.push(`Area ${i + 1}: its events want about ${tilesNeeded} tiles; suggest_area_size gives ${s.tiles}. Move an event to another area or accept a tight fit.`);
    }
    areas.push(plan);
  }

  if (chains && (counts.get("chain") ?? 0) === 0 && (counts.get("boss") ?? 0) > 0)
    notes.push("No chain encounter fits this length; the boss fight can still open with a scout group.");
  if (minutes < 60) notes.push("Under an hour: one boss and two or three other events is all there is room for.");
  if (!friendly) notes.push("No friendly encounters or rests were planned; a long run without a safe place makes every fight feel the same.");
  notes.push(`${areaCount} areas (${eventsPerArea} events each on average); a chain needs two spread-out groups, so give its area the larger share of tiles.`);

  return {
    playMinutes: minutes,
    totalEvents,
    areaCount,
    eventsPerArea,
    kinds: Object.fromEntries([...counts.entries()].filter(([, n]) => n > 0)),
    areas,
    notes,
  };
}
