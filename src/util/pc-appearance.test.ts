import { describe, expect, it } from "vitest";
import { headsFor, isPcRaceNpc, pcVoicesFrom, pickPcLook } from "./pc-appearance.js";

const soundset = new Map<number, Record<string, string>>([
  [216, { GENDER: "0", TYPE: "0" }],
  [217, { GENDER: "0", TYPE: "0" }],
  [220, { GENDER: "1", TYPE: "0" }],
  [225, { GENDER: "1", TYPE: "0" }],
  [5, { GENDER: "0", TYPE: "4" }], // a monster voice
]);

describe("pc appearance", () => {
  it("knows which heads exist for each race and gender", () => {
    expect(headsFor(6, 0).length).toBeGreaterThan(30); // human male
    expect(headsFor(6, 1).length).toBeGreaterThan(10);
    expect(headsFor(2, 1)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]); // gnome female
    expect(headsFor(4, 0)).toEqual(headsFor(6, 0)); // half-elf wears the human head models
    expect(headsFor(9, 0)).toEqual([]);
  });

  it("applies only to a standard-race humanoid wearing its own race's model", () => {
    expect(isPcRaceNpc(6, 6, 0)).toBe(true);
    expect(isPcRaceNpc(1, 1, 1)).toBe(true);
    expect(isPcRaceNpc(232, 6, 0)).toBe(false); // monster appearance
    expect(isPcRaceNpc(0, 6, 0)).toBe(false); // dwarf model on a human
    expect(isPcRaceNpc(6, 6, 2)).toBe(false); // no gender
  });

  it("reads the player voice sets by gender and ignores monster voices", () => {
    expect(pcVoicesFrom(soundset)).toEqual({ 0: [216, 217], 1: [220, 225] });
  });

  it("always gives a head of the right race and gender, and a voice of the right gender", () => {
    const voices = pcVoicesFrom(soundset);
    for (const appearance of [0, 1, 2, 3, 4, 5, 6]) {
      for (const gender of [0, 1] as const) {
        for (let i = 0; i < 25; i++) {
          const look = pickPcLook(appearance, gender, `npc${i}`, voices);
          expect(look).toBeDefined();
          expect(headsFor(appearance, gender)).toContain(look?.Appearance_Head);
          expect(voices[gender]).toContain(look?.SoundSetFile);
          expect(look?.Color_Skin).toBeGreaterThanOrEqual(0);
          expect(look?.Color_Hair).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it("is the same for the same seed and varied across seeds", () => {
    const a = pickPcLook(6, 0, "guard|area|3");
    expect(pickPcLook(6, 0, "guard|area|3")).toEqual(a);
    const heads = new Set<number>();
    for (let i = 0; i < 40; i++) heads.add(pickPcLook(6, 0, `guard|area|${i}`)?.Appearance_Head ?? -1);
    expect(heads.size).toBeGreaterThan(10);
    expect(pickPcLook(6, 0, "x")?.SoundSetFile).toBeUndefined(); // no voices given: voice left alone
  });

  it("draws common colours more often than rare ones", () => {
    const counts = new Map<number, number>();
    for (let i = 0; i < 2000; i++) {
      const s = pickPcLook(6, 0, `s${i}`)?.Color_Skin ?? -1;
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((x, y) => y[1] - x[1]);
    expect(top[0][1]).toBeGreaterThan(top[top.length - 1][1] * 2);
    expect(counts.size).toBeGreaterThan(4);
  });
});
