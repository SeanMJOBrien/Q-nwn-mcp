import { describe, expect, it } from "vitest";
import { checkTagRefs, checkWeaponClaims, type CreatureFact, weaponClaims, weaponMatches } from "./guide-facts.js";

const ilyanthe: CreatureFact = { tag: "ilyanthe", name: "Matron Ilyanthe", weapons: ["longsword"] };
const fighter: CreatureFact = { tag: "drow_fighter_m", name: "Drow Fighter", weapons: ["warhammer"] };
const guide = (text: string) => [{ file: "DM guide", text }];

describe("guide weapons against the module", () => {
  it("catches the guide that still gives Ilyanthe her old mace", () => {
    const f = checkWeaponClaims(guide("Two drow (fighter, priestess) and Matron Ilyanthe, who fights with her cleric spells and mace."), [ilyanthe, fighter]);
    expect(f.map((x) => x.code)).toEqual(["guide_weapon_mismatch"]);
    expect(f[0].message).toContain("mace");
    expect(f[0].message).toContain("longsword");
  });

  it("accepts the right weapon, either spelling, and a weapon that is only a reward in the sentence", () => {
    expect(checkWeaponClaims(guide("Matron Ilyanthe, who fights with her cleric spells and a long sword."), [ilyanthe, fighter])).toEqual([]);
    expect(checkWeaponClaims(guide("The reward, Ilyanthe's Severer (a +1 shortsword), is in the chest."), [ilyanthe])).toEqual([]);
    expect(checkWeaponClaims(guide("The drow fighter swings a heavy warhammer."), [fighter])).toEqual([]);
  });

  it("does not judge a creature whose weapon is unknown, and gives the verb to the nearest name", () => {
    expect(checkWeaponClaims(guide("Ilyanthe wields a whip."), [{ ...ilyanthe, weapons: [] }])).toEqual([]);
    expect(weaponClaims("Drow Fighter and Ilyanthe, who wields a longsword.", ["fighter", "ilyanthe"]).map((c) => c.token)).toEqual(["ilyanthe"]);
  });

  it("matches families and keeps bows apart from crossbows", () => {
    expect(weaponMatches("mace", "lightmace")).toBe(true);
    expect(weaponMatches("sword", "longsword")).toBe(true);
    expect(weaponMatches("bow", "heavycrossbow")).toBe(false);
    expect(weaponMatches("bow", "shortbow")).toBe(true);
    expect(weaponMatches("longsword", "shortsword")).toBe(false);
  });
});

describe("tags named in the text", () => {
  it("reports a Name (`tag`) the module does not have", () => {
    const f = checkTagRefs([{ file: "story", text: "- Elder Brenna (`brenna`), and the Rope Bridge (`rope_bridge`)." }], new Set(["brenna"]));
    expect(f.map((x) => x.message)).toEqual(["story names `rope_bridge`, which is no tag, resref or area in the module"]);
  });
});
