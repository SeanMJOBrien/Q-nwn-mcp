/**
 * Player-character appearances for NPCs (TODO #34): a standard-race humanoid (Appearance_Type 0-6, the same row as its Race) gets a head
 * that exists for its race and gender, skin and hair colours drawn by how often hand-built creatures use them, and a player voice set of
 * its own gender. Seeded by a string (the creature's resref, plus an index for placed copies) so a module builds the same every time.
 *
 * Data: src/data/pc-appearance.json, built by scripts/build-pc-appearance.py from the base game's head models and from the colours the
 * standard-race blueprints in the hand-built worlds use. Nothing here is guessed: a race and gender with too little data borrows the
 * other gender's colours, then the human ones.
 */

import fs from "fs";
import path from "path";
import { hashSeed, mulberry32 } from "./rng.js";

interface ColorPools {
  samples: number;
  skin: Array<[number, number]>;
  hair: Array<[number, number]>;
}

interface PcAppearanceData {
  raceLetter: Record<string, string>;
  heads: Record<string, number[]>;
  phenotype?: Record<string, number>;
  colors: Record<string, ColorPools>;
}

let cached: PcAppearanceData | undefined;

function data(): PcAppearanceData {
  cached ??= JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "..", "data", "pc-appearance.json"), "utf8")) as PcAppearanceData;
  return cached;
}

/** A pick of look and voice for one creature. */
export interface PcLook {
  Appearance_Head: number;
  Color_Skin: number;
  Color_Hair: number;
  /** 0 normal or 2 big, at the rate hand-built creatures use them. */
  Phenotype: number;
  /** Slight size variation: 0.95 to 1.05 of normal (see SCALE_RANGE). */
  Scale: number;
  SoundSetFile?: number;
}

/** The size variation allowed either way: a creature is shown between 95 % and 105 % of its normal size (user decision 2026-11-11). */
export const SCALE_RANGE = 0.05;

/** The player voice sets (soundset.2da rows with TYPE 0) by gender (0 male, 1 female). */
export interface PcVoices {
  0: number[];
  1: number[];
}

/** Read the player voice sets out of a soundset.2da table (row number -> cells). */
export function pcVoicesFrom(rows: Map<number, Record<string, string>> | undefined): PcVoices {
  const out: PcVoices = { 0: [], 1: [] };
  for (const [n, r] of rows ?? []) {
    const type = r.TYPE ?? r.type;
    const g = r.GENDER ?? r.gender;
    if (type === "0" && (g === "0" || g === "1")) out[g === "0" ? 0 : 1].push(n);
  }
  return out;
}

/** True for a creature the player-character models apply to: a standard race (0-6) wearing its own race's model, with a gender. */
export function isPcRaceNpc(appearance: number, race: number, gender: number): boolean {
  return appearance >= 0 && appearance <= 6 && race === appearance && (gender === 0 || gender === 1);
}

function weighted(pool: Array<[number, number]>, r: number): number | undefined {
  const total = pool.reduce((s, [, w]) => s + w, 0);
  if (total <= 0) return undefined;
  let x = r * total;
  for (const [v, w] of pool) {
    x -= w;
    if (x < 0) return v;
  }
  return pool[pool.length - 1][0];
}

function poolFor(appearance: number, gender: 0 | 1, what: "skin" | "hair"): Array<[number, number]> {
  const own = data().colors[`${appearance}-${gender}`]?.[what] ?? [];
  if (own.length >= 3) return own;
  // thin data: add the other gender's colours of the same race, then the human ones
  const other = data().colors[`${appearance}-${gender === 0 ? 1 : 0}`]?.[what] ?? [];
  const merged = [...own, ...other];
  if (merged.length >= 3) return merged;
  return [...merged, ...(data().colors[`6-${gender}`]?.[what] ?? [])];
}

/** Heads that exist for the race and gender (empty when the race is not a PC race). */
export function headsFor(appearance: number, gender: 0 | 1): number[] {
  return data().heads[`${data().raceLetter[String(appearance)] ?? "?"}${gender === 0 ? "m" : "f"}`] ?? [];
}

/**
 * Choose a head, skin and hair colour (and a voice when the player voice sets are given) for a standard-race NPC of this gender.
 * Deterministic for a seed; a different seed (for example the resref plus a placement index) gives a different person.
 */
export function pickPcLook(appearance: number, gender: 0 | 1, seed: string, voices?: PcVoices): PcLook | undefined {
  const heads = headsFor(appearance, gender);
  if (heads.length === 0) return undefined;
  const rnd = mulberry32(hashSeed(`${seed}|${appearance}|${gender}`));
  const look: PcLook = {
    Appearance_Head: heads[Math.floor(rnd() * heads.length)],
    Color_Skin: weighted(poolFor(appearance, gender, "skin"), rnd()) ?? 1,
    Color_Hair: weighted(poolFor(appearance, gender, "hair"), rnd()) ?? 1,
    Phenotype: weighted(Object.entries(data().phenotype ?? { 0: 1 }).map(([k, w]) => [Number(k), w] as [number, number]), rnd()) ?? 0,
    Scale: 1,
  };
  look.Scale = Math.round((1 - SCALE_RANGE + 2 * SCALE_RANGE * rnd()) * 1000) / 1000;
  const v = voices?.[gender];
  if (v && v.length > 0) look.SoundSetFile = v[Math.floor(rnd() * v.length)];
  return look;
}
