/**
 * The one place randomness comes from (TODO E7). `random()` is Math.random unless a seed is active, in which case it is a
 * seeded stream, so a layout generated with `seed: N` is the same every time. A lint test forbids Math.random anywhere else.
 */

/** FNV-1a string hash to a 32-bit unsigned seed. */
export function hashSeed(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32: a small, fast seeded generator returning floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let current: (() => number) | null = null;

/** A random float in [0, 1): the active seeded stream, else Math.random. */
export function random(): number {
  return current ? current() : Math.random();
}

/** A fresh seed to record when the caller gave none, so the run can be repeated. */
export function freshSeed(): number {
  return Math.floor(Math.random() * 4294967296);
}

/** Run fn with random() drawing from the stream for `seed` (a number or any string); restores the previous stream. */
export function withSeed<T>(seed: number | string, fn: () => T): T {
  const previous = current;
  current = mulberry32(typeof seed === "number" ? seed : hashSeed(seed));
  try {
    return fn();
  } finally {
    current = previous;
  }
}
