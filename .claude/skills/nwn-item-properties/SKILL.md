---
name: nwn-item-properties
description: Use when adding, removing, or inspecting item properties (PropertiesList entries) on a .uti blueprint via nwn-mcp — enchantments, bonuses, damage types, on-hit spells, use limitations, bonus feats. Trigger on "add a property to this item", "make this weapon +X", "give this item an on-hit effect", "restrict this item to class/race/alignment", or any request touching add_item_property/remove_item_property/clear_item_properties/get_item_details.
---

# Item Properties

`PropertiesList` on a `.uti` is a list of six-field structs. Every property —
"+3 enhancement," "Fire Damage 2d6," "Cast Spell on Hit: Fireball," "Usable
only by Clerics" — is the same struct shape; what each field *means* depends
entirely on the property. Guessing field values from the property's English
name is how you end up with an item that silently renders no bonus.

## The six fields, and where their meaning comes from

| Field | Meaning |
| --- | --- |
| `PropertyName` | Row index into `itempropdef.2da` — not a free string. `add_item_property`'s `propertyName` param accepts this row index directly, or searches the 2DA's `Label` column if you pass text. |
| `Subtype` | Row index into **whatever 2DA `itempropdef.2da`'s `SubTypeResRef` column names for this property** (e.g. `IPRP_DAMAGETYPE`, `IPRP_FEATS`, `Classes`). `0` when the property has no subtype (`****` in that column). |
| `CostTable` | Which cost/magnitude 2DA to use, from `itempropdef.2da`'s `CostTableResRef` column (a plain integer naming a known cost-table resref, not a 2DA row). `0` when the property has a flat cost (no magnitude scale — e.g. a use-limitation or a granted feat). |
| `CostValue` | Row index into that cost table — this is where "the actual +3" lives for numeric properties. `0` for flat-cost properties. |
| `Param1` / `Param1Value` | A property-specific extra parameter, from `itempropdef.2da`'s `Param1ResRef` column. **`Param1 = 255` is the "unused" sentinel** — leave it unless the specific property's def row names a real `Param1ResRef`. |
| `ChanceAppear` | Always `100` for an authored item. Only matters for items generated through a random loot table — not something `add_item_property` lets you set, and you shouldn't need to. |

**Always resolve the property's def row first** with `resolve_2da` /
`search_2da` against `itempropdef`, rather than assuming what `Subtype`
or `CostTable` means from memory — the two columns that matter are
`SubTypeResRef` and `CostTableResRef`. If `SubTypeResRef` is `****`, the
property has no subtype concept at all and `subType` should stay `0`.

## Worked examples (real items, decoded)

These are `PropertiesList` entries pulled from actual shipped item
blueprints and decoded against their own `itempropdef.2da`, not invented —
use them as a shape reference, not as values to copy onto unrelated items.

**A +3 flaming-adjacent weapon** (`itempropdef` row 56 = `AttackBonus`,
row 16 = `Damage`, row 11 = `WeightReduction`, row 82 = `OnHitCastSpell`):

```jsonc
// AttackBonus +3 — CostValue indexes the AttackBonus cost table, giving the magnitude
{ "propertyName": 56, "subType": 0, "costTable": 2, "costValue": 3, "param1": 255, "param1Value": 0 }

// Damage bonus, two separate entries for two damage types (Subtype = IPRP_DAMAGETYPE row)
{ "propertyName": 16, "subType": 8, "costTable": 4, "costValue": 2, "param1": 255, "param1Value": 0 }
{ "propertyName": 16, "subType": 2, "costTable": 4, "costValue": 1, "param1": 255, "param1Value": 0 }

// On-hit spell cast — Subtype indexes IPRP_ONHITSPELL (which spell), CostTable 26 = IPRP_ONHITSPELL
{ "propertyName": 82, "subType": 36, "costTable": 26, "costValue": 0, "param1": 255, "param1Value": 0 }
```

**A class-restricted armor with granted bonus feats** (`itempropdef` row 12
= `BonusFeats`, row 63 = `UseLimitationClass`) — both are **flat-cost**
properties, so `CostTable`/`CostValue` stay `0` and the real content lives
entirely in `Subtype`:

```jsonc
// BonusFeats — Subtype indexes IPRP_FEATS (which feat this entry grants); one entry per feat
{ "propertyName": 12, "subType": 8,  "costTable": 0, "costValue": 0, "param1": 255, "param1Value": 0 }
{ "propertyName": 12, "subType": 9,  "costTable": 0, "costValue": 0, "param1": 255, "param1Value": 0 }

// UseLimitationClass — Subtype indexes Classes.2da (which class may use it); one entry per allowed class
{ "propertyName": 63, "subType": 9,  "costTable": 0, "costValue": 0, "param1": 255, "param1Value": 0 }
{ "propertyName": 63, "subType": 10, "costTable": 0, "costValue": 0, "param1": 255, "param1Value": 0 }
```

Note the pattern: a **use limitation adds, it never restricts by omission**
— to allow two classes, add the `UseLimitationClass` property twice (once
per class), not once with some combined value. The same pattern applies to
`BonusFeats` (one entry per feat granted) and any other "pick one of
several" subtype property.

## Workflow

1. `get_item_details` first — see the item's current `PropertiesList` as
   `{propertyName, subType, costTable, costValue, param1, param1Value}`
   before adding anything, so you don't duplicate an existing property.
2. Resolve the property's `itempropdef.2da` row via `search_2da` (text
   search on `Label`) or `resolve_2da` (known row index) — read its
   `SubTypeResRef` and `CostTableResRef` columns before picking values.
3. If `SubTypeResRef` names a 2DA, resolve **that** 2DA too to pick a real
   `Subtype` row rather than guessing a small integer.
4. `add_item_property` with the resolved values. For "pick one of several"
   properties (use limitations, granted feats, damage types), call it once
   per value you want to add — see the worked examples above.
5. `remove_item_property` takes a `PropertiesList` index, not a property ID
   — re-run `get_item_details` after any add/remove if you're about to
   remove something, since indices shift.
6. `clear_item_properties` wipes the whole list — confirm that's actually
   wanted (vs. removing one entry) before calling it; there's no undo for a
   repacked module beyond nwn-mcp's in-session `undo_last_change`.

## Scope

This skill covers `PropertiesList` on item blueprints (`.uti`) only. Runtime
`ApplyEffectToObject`/`EffectAbilityIncrease`-style temporary effects in
NWScript are a different mechanism entirely — not what these tools touch.
