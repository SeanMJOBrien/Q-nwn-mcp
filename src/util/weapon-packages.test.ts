import { describe, expect, it } from "vitest";
import type { ModuleIndex } from "../types/module.js";
import {
  buildWeaponPackage,
  detectTemplateWeapon,
  featNeverAvailable,
  formatPackage2DA,
  listWeapons,
  packageFileName,
  parsePackage2DA,
  sanitizePackage,
} from "./weapon-packages.js";

function table(rows: Array<[number, Record<string, string>]>) {
  return { columns: [], rows: new Map(rows) };
}

const weaponCols = (f: number[]) => ({
  WeaponFocusFeat: String(f[0]),
  WeaponSpecializationFeat: String(f[1]),
  WeaponImprovedCriticalFeat: String(f[2]),
  EpicWeaponFocusFeat: String(f[3]),
  EpicWeaponSpecializationFeat: String(f[4]),
  EpicWeaponOverwhelmingCriticalFeat: String(f[5]),
  EpicWeaponDevastatingCriticalFeat: String(f[6]),
});

function makeIndex(): ModuleIndex {
  const feat = (extra: Record<string, string> = {}) => ({ FEAT: "1", ALLCLASSESCANUSE: "1", LABEL: "F", ...extra });
  return {
    twodaTables: new Map([
      [
        "baseitems",
        table([
          [18, { label: "greataxe", Name: "1", ReqFeat0: "45", ...weaponCols([111, 149, 73, 641, 679, 731, 517]) }],
          [41, { label: "katana", Name: "2", ReqFeat0: "44", ...weaponCols([122, 160, 84, 651, 689, 741, 527]) }],
          [6, { label: "heavycrossbow", Name: "3", ReqFeat0: "46", RangedWeapon: "25", WeaponWield: "6", ...weaponCols([92, 130, 54, 622, 660, 712, 498]) }],
          [36, { label: "gloves", ...weaponCols([100, 138, 62, 630, 668, 720, 506]) }], // no ReqFeat: excluded
        ]),
      ],
      ["classes", table([[4, { FeatsTable: "CLS_FEAT_FIGHT" }], [0, { FeatsTable: "CLS_FEAT_BARB" }]])],
      [
        "cls_feat_fight",
        table([
          [0, { FeatIndex: "45", List: "3", GrantedOnLevel: "1" }],
          [1, { FeatIndex: "46", List: "3", GrantedOnLevel: "1" }],
          [2, { FeatIndex: "149", List: "2", GrantedOnLevel: "-1" }],
          [3, { FeatIndex: "160", List: "2", GrantedOnLevel: "-1" }],
          [4, { FeatIndex: "130", List: "2", GrantedOnLevel: "-1" }],
        ]),
      ],
      ["cls_feat_barb", table([[0, { FeatIndex: "45", List: "3", GrantedOnLevel: "1" }]])],
      [
        "feat",
        table([
          [44, feat({ LABEL: "WeapProfEx" })],
          [149, feat({ ALLCLASSESCANUSE: "0", MinLevelClass: "4", LABEL: "WeapSpeGAxe" })],
          [679, feat({ PREREQFEAT1: "149", Constant: "FEAT_EPIC_WEAPON_SPECIALIZATION_GREATAXE" })],
          [111, feat({ LABEL: "WeapFocGAxe" })],
          [73, feat({ LABEL: "ImpCritGAxe" })],
          [40, feat({ LABEL: "Toughness" })],
          [411, feat({ LABEL: "RapidReload" })],
          [30, feat({ LABEL: "RapidShot" })],
          [160, feat({ ALLCLASSESCANUSE: "0", MinLevelClass: "4", LABEL: "WeapSpeKata" })],
          [122, feat({ LABEL: "WeapFocKata" })],
          [84, feat({ LABEL: "ImpCritKata" })],
          [689, feat({ PREREQFEAT1: "160", Constant: "FEAT_EPIC_WEAPON_SPECIALIZATION_KATANA" })],
          [92, feat({ LABEL: "WeapFocHXbow" })],
          [130, feat({ ALLCLASSESCANUSE: "0", MinLevelClass: "4", LABEL: "WeapSpeHXbow" })],
          [54, feat({ LABEL: "ImpCritHXbow" })],
        ]),
      ],
    ]),
  } as unknown as ModuleIndex;
}

const melee = parsePackage2DA(
  "2DA V2.0\r\n\r\n   FeatIndex   Label\r\n22  679  FEAT_EPIC_WEAPON_SPECIALIZATION_GREATAXE\r\n201 73 ImpCritGAxe\r\n202 149 WeapSpeGAxe\r\n203 111 WeapFocGAxe\r\n205 40 Toughness\r\n",
);
const ranged = parsePackage2DA("2DA V2.0\r\n\r\n   FeatIndex   Label\r\n3 660 FEAT_EPIC_X\r\n204 40 Toughness\r\n218 30 RapidShot\r\n");

describe("weapon packages", () => {
  const index = makeIndex();

  it("lists real weapons only and finds the template weapon", () => {
    expect(listWeapons(index).map((w) => w.label).sort()).toEqual(["greataxe", "heavycrossbow", "katana"]);
    expect(detectTemplateWeapon(index, melee)?.label).toBe("greataxe");
    expect(detectTemplateWeapon(index, ranged)?.label).toBe("heavycrossbow");
  });

  it("swaps the seven weapon feats and adds Exotic proficiency first for a katana", () => {
    const katana = listWeapons(index).find((w) => w.label === "katana")!;
    const r = buildWeaponPackage(index, melee, detectTemplateWeapon(index, melee)!, katana, 4);
    expect(r.rows[0].feat).toBe(44);
    expect(r.rows.map((x) => x.feat)).toEqual([44, 689, 84, 160, 122, 40]);
    expect(r.rows[1].label).toBe("FEAT_EPIC_WEAPON_SPECIALIZATION_KATANA");
  });

  it("restores Focus/Spec/ImpCrit and adds Rapid Reload for a crossbow", () => {
    const xbow = listWeapons(index).find((w) => w.label === "heavycrossbow")!;
    const r = buildWeaponPackage(index, ranged, xbow, xbow, 4);
    const feats = r.rows.map((x) => x.feat);
    expect(feats).toEqual(expect.arrayContaining([92, 130, 54, 411]));
    expect(feats.indexOf(411)).toBeLessThan(feats.indexOf(30));
  });

  it("drops Weapon Specialization and what depends on it for a Barbarian", () => {
    expect(featNeverAvailable(index, 0, 149).length).toBeGreaterThan(0);
    expect(featNeverAvailable(index, 0, 679)).toContain("prerequisite 149 is never available");
    expect(featNeverAvailable(index, 4, 149)).toEqual([]);
    const { rows, dropped } = sanitizePackage(index, melee, 0);
    expect(dropped.map((d) => d.feat).sort()).toEqual([149, 679]);
    expect(rows.map((x) => x.feat)).toEqual([73, 111, 40]);
  });

  it("writes CRLF files renumbered from 0 with names within 16 characters", () => {
    const text = formatPackage2DA([{ feat: 44, label: "WeapProfEx" }]);
    expect(text).toBe("2DA V2.0\r\n\r\n           FeatIndex   Label           \r\n0      44     WeapProfEx\r\n");
    expect(packageFileName("gackft_", listWeapons(index).find((w) => w.label === "heavycrossbow")!)).toBe("gackft_heavycros");
  });
});
