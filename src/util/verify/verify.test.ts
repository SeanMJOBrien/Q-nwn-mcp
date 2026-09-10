import { describe, expect, it } from "vitest";
import type { GffObj } from "../../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../../types/module.js";
import { verifyCreature, verifyDoor, verifyItem, verifyPlaceable, verifyTrigger } from "./blueprints.js";
import { isBaseGameResource, isBaseGameScript, Report } from "./common.js";
import { verifyDialog } from "./dialog.js";
import { verifyJournal } from "./journal.js";

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeIndex(overrides?: Partial<ModuleIndex>): ModuleIndex {
  return {
    modPath: "/fake/mod.mod",
    tempDir: "/tmp/fake",
    moduleName: "Test",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
    ...overrides,
  };
}

function twoDA(columns: string[], rows: Array<[number, Record<string, string>]>): TwoDATable {
  return { columns, rows: new Map(rows) };
}

/** A creature with all 13 script fields wired to the given set. */
function makeCreature(scriptPrefix: string, extra: Record<string, unknown> = {}): GffObj {
  const fields = [
    "ScriptAttacked", "ScriptDamaged", "ScriptDeath", "ScriptDialogue",
    "ScriptDisturbed", "ScriptEndRound", "ScriptHeartbeat", "ScriptOnBlocked",
    "ScriptOnNotice", "ScriptRested", "ScriptSpawn", "ScriptSpellAt",
    "ScriptUserDefine",
  ];
  const obj: GffObj = {
    Tag: { type: "cexostring", value: "test_npc" },
    FirstName: { type: "cexolocstring", value: { "0": "Test NPC" } },
    ClassList: {
      type: "list",
      value: [{ __struct_id: 2, Class: { type: "int", value: 4 }, ClassLevel: { type: "short", value: 3 } }],
    },
    ...extra,
  } as GffObj;
  for (const f of fields) obj[f] = { type: "resref", value: `${scriptPrefix}x` };
  return obj;
}

/** A dialog node carrying every field the engine requires. */
function makeNode(text: string, linkField: string, links: number[] = []): GffObj {
  return {
    __struct_id: 0,
    Animation: { type: "dword", value: 0 },
    AnimLoop: { type: "byte", value: 1 },
    Comment: { type: "cexostring", value: "" },
    Delay: { type: "dword", value: 4294967295 },
    Quest: { type: "cexostring", value: "" },
    Script: { type: "resref", value: "" },
    Sound: { type: "resref", value: "" },
    Text: { type: "cexolocstring", value: { "0": text } },
    [linkField]: {
      type: "list",
      value: links.map((i) => ({
        __struct_id: 0,
        Index: { type: "dword", value: i },
        Active: { type: "resref", value: "" },
        IsChild: { type: "byte", value: 0 },
      })),
    },
  } as unknown as GffObj;
}

function makeLink(index: number, active = ""): GffObj {
  return {
    __struct_id: 0,
    Index: { type: "dword", value: index },
    Active: { type: "resref", value: active },
    IsChild: { type: "byte", value: 0 },
  } as unknown as GffObj;
}

// ─── common ───────────────────────────────────────────────────────────────

describe("isBaseGameScript", () => {
  it("recognises the standard and henchman AI families", () => {
    expect(isBaseGameScript("nw_c2_default9")).toBe(true);
    expect(isBaseGameScript("x0_ch_hen_heart")).toBe(true);
    expect(isBaseGameScript("nw_ch_ac1")).toBe(true);
    expect(isBaseGameScript("x2_mod_def_load")).toBe(true);
  });

  it("does not swallow module-authored scripts", () => {
    expect(isBaseGameScript("a_hen_join")).toBe(false);
    expect(isBaseGameScript("q_reward")).toBe(false);
  });

  // Regression: create_module wires these three itself, so omitting the nw_o0_
  // prefix made every freshly created module fail its own verification.
  it("recognises the module-level default handlers create_module wires", () => {
    expect(isBaseGameScript("nw_o0_death")).toBe(true);
    expect(isBaseGameScript("nw_o0_dying")).toBe(true);
    expect(isBaseGameScript("nw_o0_respawn")).toBe(true);
  });
});

describe("isBaseGameResource", () => {
  // Regression: cloning a stock creature carries its stock equipment resrefs
  // along, which produced two false "missing item" warnings per creature.
  it("recognises stock equipment carried by a cloned creature", () => {
    expect(isBaseGameResource("nw_wblml001")).toBe(true);
    expect(isBaseGameResource("nw_ashto001")).toBe(true);
    expect(isBaseGameResource("nw_wswdg001")).toBe(true);
    expect(isBaseGameResource("x2_it_drowcl001")).toBe(true);
  });

  it("does not swallow module-authored blueprints", () => {
    expect(isBaseGameResource("sic_crown")).toBe(false);
    expect(isBaseGameResource("dlg_hen_wiz")).toBe(false);
  });
});

// ─── Creature ─────────────────────────────────────────────────────────────

describe("verifyCreature", () => {
  it("passes a well-formed creature", async () => {
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), makeCreature("nw_c2_default"));
    expect(report.errors).toHaveLength(0);
  });

  it("flags the ScriptPercption typo", async () => {
    const obj = makeCreature("nw_c2_default", {
      ScriptPercption: { type: "resref", value: "nw_c2_default2" },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("script_percption_typo");
  });

  it("flags a missing script field", async () => {
    const obj = makeCreature("nw_c2_default");
    delete obj.ScriptOnNotice;
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("missing_script_field");
  });

  it("flags an Appearance_Type/Race mismatch for a standard PC race", async () => {
    // buildMinimalUtc()'s own real defaults: Race=6 (Human), Appearance_Type=0 (Dwarf).
    const obj = makeCreature("nw_c2_default", {
      Race: { type: "byte", value: 6 },
      Appearance_Type: { type: "word", value: 0 },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.warnings.map((w) => w.code)).toContain("appearance_race_mismatch");
  });

  it("does not flag a matching Appearance_Type/Race pair", async () => {
    const obj = makeCreature("nw_c2_default", {
      Race: { type: "byte", value: 1 },
      Appearance_Type: { type: "word", value: 1 },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("appearance_race_mismatch");
  });

  it("does not flag a non-standard (monster) race/appearance pairing", async () => {
    const obj = makeCreature("nw_c2_default", {
      Race: { type: "byte", value: 24 },
      Appearance_Type: { type: "word", value: 350 },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("appearance_race_mismatch");
  });

  it("flags an empty ClassList", async () => {
    const obj = makeCreature("nw_c2_default", { ClassList: { type: "list", value: [] } });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("no_classes");
  });

  it("flags a ranged weapon with no matching ammo equipped", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 16, TemplateResRef: { type: "resref", value: "some_bow" }, BaseItem: { type: "int", value: 8 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([
        ["baseitems", twoDA(["RangedWeapon", "AmmunitionType"], [[8, { RangedWeapon: "20", AmmunitionType: "1" }]])],
      ]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.errors.map((e) => e.code)).toContain("ranged_weapon_no_ammo");
  });

  it("does not flag a ranged weapon with matching, reasonably-stacked ammo equipped", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [
          { __struct_id: 16, TemplateResRef: { type: "resref", value: "some_bow" }, BaseItem: { type: "int", value: 8 } },
          {
            __struct_id: 2048,
            TemplateResRef: { type: "resref", value: "nw_waegar001" },
            BaseItem: { type: "int", value: 20 },
            StackSize: { type: "word", value: 12 },
          },
        ],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([
        ["baseitems", twoDA(["RangedWeapon", "AmmunitionType"], [[8, { RangedWeapon: "20", AmmunitionType: "1" }]])],
      ]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.errors.map((e) => e.code)).not.toContain("ranged_weapon_no_ammo");
    expect(report.warnings.map((w) => w.code)).not.toContain("ammo_stack_size_unreasonable");
  });

  it("flags equipped ammo stacked far outside the expected range", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [
          { __struct_id: 16, TemplateResRef: { type: "resref", value: "some_bow" }, BaseItem: { type: "int", value: 8 } },
          {
            __struct_id: 2048,
            TemplateResRef: { type: "resref", value: "nw_waegar001" },
            BaseItem: { type: "int", value: 20 },
            StackSize: { type: "word", value: 99 },
          },
        ],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([
        ["baseitems", twoDA(["RangedWeapon", "AmmunitionType"], [[8, { RangedWeapon: "20", AmmunitionType: "1" }]])],
      ]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).toContain("ammo_stack_size_unreasonable");
  });

  it("checks the RightHand stack itself for a self-ammo thrown weapon (throwing axe)", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [
          {
            __struct_id: 16,
            TemplateResRef: { type: "resref", value: "some_axe" },
            BaseItem: { type: "int", value: 63 },
            StackSize: { type: "word", value: 50 },
          },
        ],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([
        ["baseitems", twoDA(["RangedWeapon", "AmmunitionType"], [[63, { RangedWeapon: "63", AmmunitionType: "6" }]])],
      ]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.errors.map((e) => e.code)).not.toContain("ranged_weapon_no_ammo");
    expect(report.warnings.map((w) => w.code)).toContain("ammo_stack_size_unreasonable");
  });

  it("flags a creature with class levels and an empty FeatList", async () => {
    const obj = makeCreature("nw_c2_default"); // default ClassList: Fighter level 3, no FeatList
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.warnings.map((w) => w.code)).toContain("empty_featlist");
  });

  it("does not flag a creature with a non-empty FeatList", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("empty_featlist");
  });

  it("flags a RightHand weapon the creature has no proficiency feat for", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 16, TemplateResRef: { type: "resref", value: "some_axe" }, BaseItem: { type: "int", value: 2 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([["baseitems", twoDA(["ReqFeat0"], [[2, { ReqFeat0: "45" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.errors.map((e) => e.code)).toContain("weapon_proficiency_mismatch");
  });

  it("does not flag a RightHand weapon matching one of the creature's proficiency feats", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 16, TemplateResRef: { type: "resref", value: "some_axe" }, BaseItem: { type: "int", value: 2 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([["baseitems", twoDA(["ReqFeat0"], [[2, { ReqFeat0: "45" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.errors.map((e) => e.code)).not.toContain("weapon_proficiency_mismatch");
  });

  // AC Bonus item property (PropertyName=1, ITEM_PROPERTY_AC_BONUS) with
  // CostValue=4 is Medium armor (tier 4-5) per armorTierFeat() — the literal
  // Corin Vale bug: a Rogue with only Light Armor Proficiency (feat 3) from
  // its automatic class feats, equipped with Medium armor (needs feat 4).
  function chestArmor(acBonus: number) {
    return {
      __struct_id: 2,
      TemplateResRef: { type: "resref", value: "some_armor" },
      BaseItem: { type: "int", value: 16 },
      PropertiesList: {
        type: "list",
        value: [
          {
            __struct_id: 0,
            PropertyName: { type: "word", value: 1 },
            CostValue: { type: "word", value: acBonus },
          },
        ],
      },
    };
  }

  it("flags Chest-slot armor whose weight tier has no matching Armor Proficiency feat", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 3 } }] }, // ArmProfLgt only
      Equip_ItemList: { type: "list", value: [chestArmor(4)] }, // Medium armor — needs ArmProfMed (4)
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("armor_proficiency_mismatch");
  });

  it("does not flag Chest-slot armor when the matching weight-tier feat is present", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 4 } }] }, // ArmProfMed
      Equip_ItemList: { type: "list", value: [chestArmor(4)] }, // Medium armor
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).not.toContain("armor_proficiency_mismatch");
  });

  it("does not flag Chest-slot armor with no AC Bonus property at all (unknown tier, degrades to skip)", async () => {
    const obj = makeCreature("nw_c2_default", {
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 2, TemplateResRef: { type: "resref", value: "some_armor" }, BaseItem: { type: "int", value: 16 } }],
      },
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).not.toContain("armor_proficiency_mismatch");
  });

  it("flags a caster class at its casting level with no spells in either MemorizedList or SpecAbilityList", async () => {
    const obj = makeCreature("nw_c2_default", {
      ClassList: {
        type: "list",
        value: [{ __struct_id: 2, Class: { type: "int", value: 9 }, ClassLevel: { type: "short", value: 5 } }],
      },
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
    });
    const index = makeIndex({
      twodaTables: new Map([["classes", twoDA(["SpellCaster", "MinCastingLevel"], [[9, { SpellCaster: "1", MinCastingLevel: "1" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).toContain("caster_no_spells");
  });

  it("does not flag a caster with a SpecAbilityList spell selection", async () => {
    const obj = makeCreature("nw_c2_default", {
      ClassList: {
        type: "list",
        value: [{ __struct_id: 2, Class: { type: "int", value: 9 }, ClassLevel: { type: "short", value: 5 } }],
      },
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
      SpecAbilityList: {
        type: "list",
        value: [{ __struct_id: 0, Spell: { type: "word", value: 24 }, SpellCasterLevel: { type: "byte", value: 5 }, SpellFlags: { type: "byte", value: 1 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([["classes", twoDA(["SpellCaster", "MinCastingLevel"], [[9, { SpellCaster: "1", MinCastingLevel: "1" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("caster_no_spells");
  });

  it("does not flag a caster below its class's MinCastingLevel", async () => {
    const obj = makeCreature("nw_c2_default", {
      ClassList: {
        type: "list",
        value: [{ __struct_id: 2, Class: { type: "int", value: 6 }, ClassLevel: { type: "short", value: 2 } }],
      },
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
    });
    const index = makeIndex({
      // Paladin: SpellCaster=1 but doesn't cast until level 4 under 3.5 rules.
      twodaTables: new Map([["classes", twoDA(["SpellCaster", "MinCastingLevel"], [[6, { SpellCaster: "1", MinCastingLevel: "4" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("caster_no_spells");
  });

  it("flags a ranged weapon with no melee-capable weapon anywhere in equipment or inventory", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 16, TemplateResRef: { type: "resref", value: "some_bow" }, BaseItem: { type: "int", value: 8 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([["baseitems", twoDA(["RangedWeapon", "DieToRoll"], [[8, { RangedWeapon: "20", DieToRoll: "6" }]])]]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).toContain("ranged_weapon_no_melee_backup");
  });

  it("does not flag a ranged weapon when a melee weapon exists in inventory", async () => {
    const obj = makeCreature("nw_c2_default", {
      FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
      Equip_ItemList: {
        type: "list",
        value: [{ __struct_id: 16, TemplateResRef: { type: "resref", value: "some_bow" }, BaseItem: { type: "int", value: 8 } }],
      },
      ItemList: {
        type: "list",
        value: [{ InventoryRes: { type: "resref", value: "some_dagger" }, BaseItem: { type: "int", value: 9 } }],
      },
    });
    const index = makeIndex({
      twodaTables: new Map([
        [
          "baseitems",
          twoDA(
            ["RangedWeapon", "DieToRoll"],
            [
              [8, { RangedWeapon: "20", DieToRoll: "6" }],
              [9, { DieToRoll: "4" }],
            ],
          ),
        ],
      ]),
    });
    const report = new Report("t", "utc");
    await verifyCreature(report, index, obj);
    expect(report.warnings.map((w) => w.code)).not.toContain("ranged_weapon_no_melee_backup");
  });

  describe("henchman rules", () => {
    it("flags a companion wired with the standard AI instead of the associate AI", async () => {
      const report = new Report("t", "utc");
      await verifyCreature(report, makeIndex(), makeCreature("nw_c2_default"), { henchman: true });
      const codes = report.errors.map((e) => e.code);
      expect(codes).toContain("henchman_no_command_handler");
      expect(codes).toContain("henchman_no_follow_ai");
    });

    it("flags a Commoner-class companion", async () => {
      const obj = makeCreature("x0_ch_hen_", {
        ClassList: {
          type: "list",
          value: [{ __struct_id: 2, Class: { type: "int", value: 20 }, ClassLevel: { type: "short", value: 1 } }],
        },
        Conversation: { type: "resref", value: "dlg_x" },
      });
      const index = makeIndex({
        resources: new Map([["dlg_x.dlg", { resref: "dlg_x", extension: "dlg", filePath: "/x", sizeBytes: 1 }]]),
      });
      const report = new Report("t", "utc");
      await verifyCreature(report, index, obj, { henchman: true });
      expect(report.errors.map((e) => e.code)).toContain("henchman_commoner_class");
    });

    it("flags a companion with no conversation", async () => {
      const report = new Report("t", "utc");
      await verifyCreature(report, makeIndex(), makeCreature("x0_ch_hen_"), { henchman: true });
      expect(report.errors.map((e) => e.code)).toContain("henchman_no_dialog");
    });

    it("warns when HENCH_LEVEL and voice are absent", async () => {
      const report = new Report("t", "utc");
      await verifyCreature(report, makeIndex(), makeCreature("x0_ch_hen_"), { henchman: true });
      const codes = report.warnings.map((w) => w.code);
      expect(codes).toContain("henchman_no_level_var");
      expect(codes).toContain("henchman_no_voice");
    });

    it("warns on StartingPackage 0 for a non-Barbarian companion", async () => {
      // makeCreature defaults to ClassList class 4 (Fighter) with no StartingPackage set,
      // so it inherits the GFF default of 0 — Barbarian's package, not Fighter's.
      const obj = makeCreature("x0_ch_hen_", { Conversation: { type: "resref", value: "dlg_x" } });
      const index = makeIndex({
        resources: new Map([["dlg_x.dlg", { resref: "dlg_x", extension: "dlg", filePath: "/x", sizeBytes: 1 }]]),
      });
      const report = new Report("t", "utc");
      await verifyCreature(report, index, obj, { henchman: true });
      expect(report.warnings.map((w) => w.code)).toContain("henchman_no_package");
    });

    it("does not warn on StartingPackage 0 for an actual Barbarian companion", async () => {
      const obj = makeCreature("x0_ch_hen_", {
        Conversation: { type: "resref", value: "dlg_x" },
        ClassList: {
          type: "list",
          value: [{ __struct_id: 2, Class: { type: "int", value: 0 }, ClassLevel: { type: "short", value: 3 } }],
        },
      });
      const index = makeIndex({
        resources: new Map([["dlg_x.dlg", { resref: "dlg_x", extension: "dlg", filePath: "/x", sizeBytes: 1 }]]),
      });
      const report = new Report("t", "utc");
      await verifyCreature(report, index, obj, { henchman: true });
      expect(report.warnings.map((w) => w.code)).not.toContain("henchman_no_package");
    });

    it("accepts a fully-wired companion", async () => {
      const obj = makeCreature("x0_ch_hen_", {
        Conversation: { type: "resref", value: "dlg_x" },
        SoundSetFile: { type: "word", value: 422 },
        Gender: { type: "byte", value: 1 },
        StartingPackage: { type: "byte", value: 4 },
        // A "fully correct" companion has a baked FeatList — an empty one is
        // now itself a defect (empty_featlist).
        FeatList: { type: "list", value: [{ __struct_id: 1, Feat: { type: "word", value: 45 } }] },
        VarTable: {
          type: "list",
          value: [
            {
              __struct_id: 0,
              Name: { type: "cexostring", value: "HENCH_LEVEL" },
              Type: { type: "dword", value: 1 },
              Value: { type: "int", value: 5 },
            },
          ],
        },
      });
      const index = makeIndex({
        resources: new Map([["dlg_x.dlg", { resref: "dlg_x", extension: "dlg", filePath: "/x", sizeBytes: 1 }]]),
        twodaTables: new Map([["soundset", twoDA(["RESREF", "GENDER"], [[422, { RESREF: "healer", GENDER: "1" }]])]]),
      });
      const report = new Report("t", "utc");
      await verifyCreature(report, index, obj, { henchman: true });
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });
  });
});

// ─── Item ─────────────────────────────────────────────────────────────────

describe("verifyItem", () => {
  // A live baseitems row: real label, real Name strref, and an ItemClass the
  // inventory icon name can be derived from.
  const baseitems = (modelType: string) =>
    new Map([
      [
        "baseitems",
        twoDA(
          ["ModelType", "label", "Name", "ItemClass"],
          [[4, { ModelType: modelType, label: "Longsword", Name: "168", ItemClass: "WswLs" }]],
        ),
      ],
    ]);

  /** A retired row, as BioWare leaves them: present, but blanked in place. */
  const retiredBaseitems = () =>
    new Map([
      [
        "baseitems",
        twoDA(
          ["ModelType", "label", "Name", "ItemClass"],
          [[54, { ModelType: "0", label: "DELETED", Name: "0", ItemClass: "it_spscroll" }]],
        ),
      ],
    ]);

  it("flags a composite weapon with zero model parts — the flail-as-bag bug", () => {
    const obj = {
      Tag: { type: "cexostring", value: "flail" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Jail Key" } },
      BaseItem: { type: "int", value: 4 },
      ModelPart1: { type: "byte", value: 0 },
      ModelPart2: { type: "byte", value: 0 },
      ModelPart3: { type: "byte", value: 0 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables: baseitems("2") }), obj);
    const finding = report.errors.find((e) => e.code === "composite_model_part_zero");
    expect(finding).toBeDefined();
    expect(finding?.message).toContain("ModelPart1");
  });

  it("accepts a composite weapon with all three parts set", () => {
    const obj = {
      Tag: { type: "cexostring", value: "sword" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Sword" } },
      BaseItem: { type: "int", value: 4 },
      ModelPart1: { type: "byte", value: 1 },
      ModelPart2: { type: "byte", value: 1 },
      ModelPart3: { type: "byte", value: 1 },
      StackSize: { type: "word", value: 1 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables: baseitems("2") }), obj);
    expect(report.errors).toHaveLength(0);
  });

  it("only requires ModelPart1 for a simple-model item", () => {
    const obj = {
      Tag: { type: "cexostring", value: "potion" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Potion" } },
      BaseItem: { type: "int", value: 4 },
      ModelPart1: { type: "byte", value: 1 },
      StackSize: { type: "word", value: 1 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables: baseitems("0") }), obj);
    expect(report.errors).toHaveLength(0);
  });

  it("flags a retired base item row — the no-icon / Bad Strref bug", () => {
    // The row exists, so an existence check passes; only the label and the
    // strref reveal that it is decommissioned. This shipped as "Shard of the
    // Iron Crown" on baseitems row 54.
    const obj = {
      Tag: { type: "cexostring", value: "sic_crown" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Shard of the Iron Crown" } },
      BaseItem: { type: "int", value: 54 },
      ModelPart1: { type: "byte", value: 1 },
      StackSize: { type: "word", value: 1 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables: retiredBaseitems() }), obj);
    const finding = report.errors.find((e) => e.code === "retired_base_item");
    expect(finding).toBeDefined();
    expect(finding?.message).toContain("DELETED");
  });

  it("flags a base item with no ItemClass — no icon name can be derived", () => {
    const twodaTables = new Map([
      [
        "baseitems",
        twoDA(
          ["ModelType", "label", "Name", "ItemClass"],
          [[43, { ModelType: "0", label: "Gem", Name: "192", ItemClass: "****" }]],
        ),
      ],
    ]);
    const obj = {
      Tag: { type: "cexostring", value: "gem" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Gem" } },
      BaseItem: { type: "int", value: 43 },
      ModelPart1: { type: "byte", value: 1 },
      StackSize: { type: "word", value: 1 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables }), obj);
    expect(report.errors.map((e) => e.code)).toContain("base_item_no_item_class");
  });

  it("accepts a live base item row", () => {
    const obj = {
      Tag: { type: "cexostring", value: "shard" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Shard" } },
      BaseItem: { type: "int", value: 4 },
      ModelPart1: { type: "byte", value: 1 },
      StackSize: { type: "word", value: 1 },
    } as unknown as GffObj;

    const report = new Report("t", "uti");
    verifyItem(report, makeIndex({ twodaTables: baseitems("0") }), obj);
    expect(report.errors).toHaveLength(0);
  });
});

// ─── Placeable ────────────────────────────────────────────────────────────

describe("verifyPlaceable", () => {
  it("flags LocalizedName set instead of LocName", () => {
    const obj = {
      Tag: { type: "cexostring", value: "chest" },
      LocalizedName: { type: "cexolocstring", value: { "0": "Chest" } },
    } as unknown as GffObj;

    const report = new Report("t", "utp");
    verifyPlaceable(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("placeable_wrong_name_field");
  });

  it("flags inventory contents on a container with HasInventory unset", () => {
    const obj = {
      Tag: { type: "cexostring", value: "chest" },
      LocName: { type: "cexolocstring", value: { "0": "Chest" } },
      HasInventory: { type: "byte", value: 0 },
      ItemList: { type: "list", value: [{ __struct_id: 0, InventoryRes: { type: "resref", value: "gold" } }] },
    } as unknown as GffObj;

    const report = new Report("t", "utp");
    verifyPlaceable(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("inventory_not_enabled");
  });
});

// ─── Trigger geometry ─────────────────────────────────────────────────────

describe("verifyTrigger", () => {
  it("flags a trigger with no geometry", () => {
    const obj = { Tag: { type: "cexostring", value: "trig" } } as unknown as GffObj;
    const report = new Report("t", "utt");
    verifyTrigger(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("missing_geometry");
  });

  it("flags a zero-area trigger", () => {
    const point = (x: number, y: number) => ({
      __struct_id: 3,
      PointX: { type: "float", value: x },
      PointY: { type: "float", value: y },
      PointZ: { type: "float", value: 0 },
    });
    const obj = {
      Tag: { type: "cexostring", value: "trig" },
      Geometry: { type: "list", value: [point(5, 5), point(5, 5), point(5, 5), point(5, 5)] },
    } as unknown as GffObj;

    const report = new Report("t", "utt");
    verifyTrigger(report, makeIndex(), obj);
    expect(report.errors.map((e) => e.code)).toContain("zero_area_geometry");
  });
});

// ─── Doors ────────────────────────────────────────────────────────────────

describe("verifyDoor", () => {
  function makeLockedDoor(extra: Record<string, unknown> = {}): GffObj {
    return {
      Tag: { type: "cexostring", value: "gate01" },
      Lockable: { type: "byte", value: 1 },
      OpenLockDC: { type: "byte", value: 25 },
      LinkedToFlags: { type: "byte", value: 0 },
      ...extra,
    } as unknown as GffObj;
  }

  it("flags a locked door with no transition and no waypoint in the area", () => {
    const index = makeIndex({
      parsedGff: new Map([["darea.git", { WaypointList: { type: "list", value: [] } } as unknown as GffObj]]),
    });
    const report = new Report("d", "utd");
    verifyDoor(report, index, makeLockedDoor(), { areaResref: "darea" });
    expect(report.warnings.map((w) => w.code)).toContain("door_leads_nowhere");
  });

  it("does not flag a locked door already wired as a transition", () => {
    const index = makeIndex({
      parsedGff: new Map([["darea.git", { WaypointList: { type: "list", value: [] } } as unknown as GffObj]]),
    });
    const report = new Report("d", "utd");
    verifyDoor(report, index, makeLockedDoor({ LinkedToFlags: { type: "byte", value: 2 } }), {
      areaResref: "darea",
    });
    expect(report.warnings.map((w) => w.code)).not.toContain("door_leads_nowhere");
  });

  it("does not flag a locked door when the area has a waypoint", () => {
    const waypoint = { __struct_id: 5, Tag: { type: "cexostring", value: "wp_behind_gate" } };
    const index = makeIndex({
      parsedGff: new Map([
        ["darea.git", { WaypointList: { type: "list", value: [waypoint] } } as unknown as GffObj],
      ]),
    });
    const report = new Report("d", "utd");
    verifyDoor(report, index, makeLockedDoor(), { areaResref: "darea" });
    expect(report.warnings.map((w) => w.code)).not.toContain("door_leads_nowhere");
  });

  it("skips the check entirely for a standalone blueprint (no areaResref)", () => {
    const report = new Report("d", "utd");
    verifyDoor(report, makeIndex(), makeLockedDoor());
    expect(report.warnings.map((w) => w.code)).not.toContain("door_leads_nowhere");
  });

  it("does not flag a non-lockable door", () => {
    const index = makeIndex({
      parsedGff: new Map([["darea.git", { WaypointList: { type: "list", value: [] } } as unknown as GffObj]]),
    });
    const report = new Report("d", "utd");
    const obj = { Tag: { type: "cexostring", value: "plaindoor" } } as unknown as GffObj;
    verifyDoor(report, index, obj, { areaResref: "darea" });
    expect(report.warnings.map((w) => w.code)).not.toContain("door_leads_nowhere");
  });
});

// ─── Dialog ───────────────────────────────────────────────────────────────

describe("verifyDialog", () => {
  it("passes a well-formed two-node conversation", () => {
    const doc = {
      StartingList: { type: "list", value: [makeLink(0)] },
      EntryList: { type: "list", value: [makeNode("Hello", "RepliesList", [0])] },
      ReplyList: { type: "list", value: [makeNode("Goodbye", "EntriesList", [])] },
    } as unknown as GffObj;

    const report = new Report("t", "dlg");
    verifyDialog(report, makeIndex(), doc);
    expect(report.errors).toHaveLength(0);
  });

  it("flags a node missing a mandatory field — the silent load failure", () => {
    const entry = makeNode("Hello", "RepliesList", []);
    delete entry.Delay;
    const doc = {
      StartingList: { type: "list", value: [makeLink(0)] },
      EntryList: { type: "list", value: [entry] },
      ReplyList: { type: "list", value: [] },
    } as unknown as GffObj;

    const report = new Report("t", "dlg");
    verifyDialog(report, makeIndex(), doc);
    const finding = report.errors.find((e) => e.code === "dialog_missing_node_field");
    expect(finding).toBeDefined();
    expect(finding?.message).toContain("Delay");
  });

  it("flags a dangling link index", () => {
    const doc = {
      StartingList: { type: "list", value: [makeLink(7)] },
      EntryList: { type: "list", value: [makeNode("Hello", "RepliesList", [])] },
      ReplyList: { type: "list", value: [] },
    } as unknown as GffObj;

    const report = new Report("t", "dlg");
    verifyDialog(report, makeIndex(), doc);
    expect(report.errors.map((e) => e.code)).toContain("dialog_dangling_index");
  });

  it("flags an empty StartingList", () => {
    const doc = {
      StartingList: { type: "list", value: [] },
      EntryList: { type: "list", value: [makeNode("Hello", "RepliesList", [])] },
      ReplyList: { type: "list", value: [] },
    } as unknown as GffObj;

    const report = new Report("t", "dlg");
    verifyDialog(report, makeIndex(), doc);
    expect(report.errors.map((e) => e.code)).toContain("dialog_no_start");
  });

  it("warns when every root is conditional", () => {
    const doc = {
      StartingList: { type: "list", value: [makeLink(0, "c_hen_mine")] },
      EntryList: { type: "list", value: [makeNode("Hello", "RepliesList", [])] },
      ReplyList: { type: "list", value: [] },
    } as unknown as GffObj;

    const index = makeIndex({
      resources: new Map([["c_hen_mine.ncs", { resref: "c_hen_mine", extension: "ncs", filePath: "/x", sizeBytes: 1 }]]),
    });
    const report = new Report("t", "dlg");
    verifyDialog(report, index, doc);
    expect(report.warnings.map((w) => w.code)).toContain("dialog_all_roots_conditional");
  });

  it("warns about unreachable nodes", () => {
    const doc = {
      StartingList: { type: "list", value: [makeLink(0)] },
      EntryList: {
        type: "list",
        value: [makeNode("Reachable", "RepliesList", []), makeNode("Orphan", "RepliesList", [])],
      },
      ReplyList: { type: "list", value: [] },
    } as unknown as GffObj;

    const report = new Report("t", "dlg");
    verifyDialog(report, makeIndex(), doc);
    expect(report.warnings.map((w) => w.code)).toContain("dialog_orphan_nodes");
  });
});

// ─── Journal ──────────────────────────────────────────────────────────────

describe("verifyJournal", () => {
  const questDoc = (entries: Array<{ id: number; end?: boolean }>) =>
    ({
      Categories: {
        type: "list",
        value: [
          {
            __struct_id: 0,
            Tag: { type: "cexostring", value: "q_amulet" },
            Name: { type: "cexolocstring", value: { "0": "The Amulet" } },
            EntryList: {
              type: "list",
              value: entries.map((e) => ({
                __struct_id: 0,
                ID: { type: "dword", value: e.id },
                End: { type: "word", value: e.end ? 1 : 0 },
                Text: { type: "cexolocstring", value: { "0": `stage ${e.id}` } },
              })),
            },
          },
        ],
      },
    }) as unknown as GffObj;

  it("flags a quest with no End entry", async () => {
    const report = new Report("t", "jrl");
    await verifyJournal(report, makeIndex(), questDoc([{ id: 1 }, { id: 2 }]));
    expect(report.errors.map((e) => e.code)).toContain("quest_no_end_entry");
  });

  it("flags duplicate entry IDs", async () => {
    const report = new Report("t", "jrl");
    await verifyJournal(report, makeIndex(), questDoc([{ id: 1 }, { id: 1, end: true }]));
    expect(report.errors.map((e) => e.code)).toContain("quest_duplicate_entry_id");
  });

  it("flags a quest no script ever awards", async () => {
    const report = new Report("t", "jrl");
    await verifyJournal(report, makeIndex(), questDoc([{ id: 1, end: true }]));
    expect(report.errors.map((e) => e.code)).toContain("quest_never_awarded");
  });
});
