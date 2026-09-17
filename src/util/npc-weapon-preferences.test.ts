import { describe, expect, it } from "vitest";
import { CLASS_WEAPON_PREFERENCES, pickWeaponPreference } from "./npc-weapon-preferences.js";

describe("pickWeaponPreference", () => {
  it("is deterministic: the same seed always picks the same weapon", () => {
    const a = pickWeaponPreference(4, "some_fighter_tag");
    const b = pickWeaponPreference(4, "some_fighter_tag");
    expect(a).toEqual(b);
  });

  it("returns null for Monk (no curated candidates)", () => {
    expect(pickWeaponPreference(5, "any_seed")).toBeNull();
  });

  it("returns null for an unknown class ID", () => {
    expect(pickWeaponPreference(99, "any_seed")).toBeNull();
  });

  it("spreads different seeds across a class's candidate list rather than always picking index 0", () => {
    const seeds = Array.from({ length: 12 }, (_, i) => `npc_${i}`);
    const labels = new Set(seeds.map((s) => pickWeaponPreference(4, s)?.label));
    expect(labels.size).toBeGreaterThan(1);
  });

  it("always returns an entry actually present in the class's candidate list", () => {
    for (const [classId, candidates] of Object.entries(CLASS_WEAPON_PREFERENCES)) {
      if (!candidates) continue;
      const pick = pickWeaponPreference(Number(classId), `probe_${classId}`);
      expect(candidates).toContainEqual(pick);
    }
  });
});

describe("CLASS_WEAPON_PREFERENCES", () => {
  it("gives every non-Monk class 2 or more candidates", () => {
    for (const [classId, candidates] of Object.entries(CLASS_WEAPON_PREFERENCES)) {
      if (Number(classId) === 5) continue; // Monk — unarmed, deliberately unset
      expect(candidates).not.toBeNull();
      expect((candidates as unknown[]).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("leaves Monk unset rather than guessed", () => {
    expect(CLASS_WEAPON_PREFERENCES[5]).toBeNull();
  });

  it("has no duplicate baseItem within any single class's candidate list", () => {
    for (const candidates of Object.values(CLASS_WEAPON_PREFERENCES)) {
      if (!candidates) continue;
      const baseItems = candidates.map((c) => c.baseItem);
      expect(new Set(baseItems).size).toBe(baseItems.length);
    }
  });

  it("does not recommend Warhammer for Cleric or Rapier for Bard — both require Martial Weapon Proficiency, which cls_feat_cler.2da/cls_feat_bard.2da never grant automatically", () => {
    const cleric = CLASS_WEAPON_PREFERENCES[2]!;
    const bard = CLASS_WEAPON_PREFERENCES[1]!;
    expect(cleric.some((w) => w.label === "Warhammer")).toBe(false);
    expect(bard.some((w) => w.label === "Rapier")).toBe(false);
  });
});
