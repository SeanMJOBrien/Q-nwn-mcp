import { describe, expect, it } from "vitest";
import {
  ARMOR_COLOR_MAX,
  generateAppearanceInclude,
  validateAppearanceOptions,
  WEAPON_MODEL_MAX_SAFE,
} from "./gear-appearance.js";

describe("generateAppearanceInclude", () => {
  it("chains CopyItemAndModify through a helper that returns the new object", () => {
    // The reference implementation chains off references it has already
    // destroyed. The whole point of GearApply is that the caller cannot.
    const src = generateAppearanceInclude();
    expect(src).toContain("object GearApply(object oItem, int nType, int nIndex, int nValue)");
    expect(src).toContain("object oNew = CopyItemAndModify(oItem, nType, nIndex, nValue, TRUE);");
    expect(src).toContain("DestroyObject(oItem);");
    expect(src).toContain("return oNew;");
  });

  it("keeps the original when CopyItemAndModify refuses", () => {
    expect(generateAppearanceInclude()).toContain("if (!GetIsObjectValid(oNew)) return oItem;");
  });

  it("randomises all six armour colour channels by default", () => {
    const src = generateAppearanceInclude();
    for (const channel of ["CLOTH1", "CLOTH2", "LEATHER1", "LEATHER2", "METAL1", "METAL2"]) {
      expect(src).toContain(`ITEM_APPR_ARMOR_COLOR_${channel}`);
    }
    expect(src).toContain(`int GEAR_ACOLOR_MAX = ${ARMOR_COLOR_MAX};`);
  });

  it("leaves weapon model randomisation off by default", () => {
    // Valid indices are per-base-item; a blanket range produces invalid parts.
    const src = generateAppearanceInclude();
    expect(src).not.toContain("ITEM_APPR_WEAPON_MODEL_TOP");
    expect(src).toContain("disabled — valid indices are per-base-item");
  });

  it("shares one model index across all three weapon parts when enabled", () => {
    const src = generateAppearanceInclude({ weaponModels: true });
    expect(src).toContain("int nModel = Random(GEAR_WMODEL_MAX) + 1;");
    expect(src).toContain("ITEM_APPR_WEAPON_MODEL_TOP,    nModel);");
    expect(src).toContain("ITEM_APPR_WEAPON_MODEL_MIDDLE, nModel);");
    expect(src).toContain("ITEM_APPR_WEAPON_MODEL_BOTTOM, nModel);");
  });

  it("defaults the weapon model cap to the smallest safe value", () => {
    expect(generateAppearanceInclude({ weaponModels: true })).toContain(
      `int GEAR_WMODEL_MAX = ${WEAPON_MODEL_MAX_SAFE};`,
    );
  });

  it("guards against randomising the same creature twice", () => {
    const src = generateAppearanceInclude();
    expect(src).toContain('if (GetLocalInt(oCreature, "GEAR_RANDOMIZED")) return;');
  });

  it("re-equips after replacing the item", () => {
    const src = generateAppearanceInclude();
    expect(src).toContain("ActionEquipItem(oItem, INVENTORY_SLOT_CHEST)");
    expect(src).toContain("ActionEquipItem(oItem, nSlot)");
  });

  it("names the real include in the usage comment", () => {
    expect(generateAppearanceInclude({ includeName: "inc_dye" })).toContain('#include "inc_dye"');
  });
});

describe("validateAppearanceOptions", () => {
  it("accepts the defaults", () => {
    expect(validateAppearanceOptions({})).toEqual([]);
  });

  it("rejects a weapon model cap outside the per-base-item range", () => {
    expect(validateAppearanceOptions({ weaponModelMax: 0 })).toHaveLength(1);
    expect(validateAppearanceOptions({ weaponModelMax: 20 })).toHaveLength(1);
    expect(validateAppearanceOptions({ weaponModelMax: 8 })).toEqual([]);
  });

  it("rejects a configuration that would randomise nothing", () => {
    const issues = validateAppearanceOptions({ armorColors: false, weaponColors: false });
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain("would do nothing");
  });
});
