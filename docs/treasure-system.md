# Random treasure system

`create_treasure_system` writes `inc_treasure` and `a_trs_open` into a module: The Frozen North's loot selection, ported, so random rewards are one call to set up.

## How an item is picked
1. **Kind**, by fixed weights: potions 12, jewels (rings, amulets) 7, scrolls 6, melee weapons 5, ranged weapons and ammunition 4, apparel (cloaks, boots, gloves, belts) 4, misc 3, armour 2, other consumables 2. Only kinds the pool has items for count.
2. **Tier** (value band: T1 under 175 gp, T2 from 175, T3 from 2,000, T4 from 7,000, T5 from 16,000), by weights that follow the area's challenge rating `CR`: base weight 2000 / 200 / 100 / 50 / 20 (tier 1 does not scale with CR, the others are multiplied by CR), times a sigmoid `max(0, (68 + atan((CR - mid) * 0.6)) / 158)` with midpoints 1 / 1 / 7 / 10 / 13, raised to `1 + quality` (potions -0.3, scrolls and wands -0.2 on top, so consumables run richer than gear).
3. **Item**, random among the pool's items of that kind and tier.

Share of each tier by area CR (quality 0.0, a kind without a consumable modifier):

| CR | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| 1 | 91% | 9% | 0% | 0% | 0% |
| 2 | 83% | 17% | 0% | 0% | 0% |
| 3 | 77% | 23% | 0% | 0% | 0% |
| 4 | 71% | 28% | 1% | 0% | 0% |
| 5 | 65% | 33% | 2% | 0% | 0% |
| 6 | 60% | 36% | 5% | 0% | 0% |
| 8 | 48% | 38% | 13% | 1% | 0% |
| 10 | 39% | 39% | 17% | 5% | 0% |
| 12 | 33% | 40% | 19% | 8% | 1% |
| 14 | 29% | 40% | 19% | 9% | 3% |
| 16 | 26% | 41% | 20% | 10% | 3% |
| 20 | 21% | 43% | 21% | 10% | 4% |

A container holds one item with chance 35 %, a second with 15 %, a third with 5 %, each multiplied by `TR_QUANTITY` (1.0 usual, 1.75 medium, 3.0 rich).

## Setting it up
1. Put the treasure in the module: item blueprints you made, samples imported with `import_treasure_item` (see [treasure-catalog.md](treasure-catalog.md); `list_treasure_samples` finds them by level), or base-game resrefs passed as `extraItems`.
2. `create_treasure_system` (re-run it whenever items are added). It reports the pool size by kind.
3. Zero-code: set a chest's OnOpen script to `a_trs_open`. The challenge rating comes from the local int `TR_CR` on the chest, its area or the module (default 1). Tuning locals on the chest: `TR_QUANTITY` (float), `TR_QUALITY` (float: -0.2 better, 0.4 worse, -0.7 boss), `TR_MASK` (kinds allowed: bit `1 << kind`, kinds 0 misccons, 1 misc, 2 scroll, 3 potion, 4 melee, 5 range, 6 armor, 7 apparel, 8 jewel; `TR_GEAR` = 496, `TR_CONSUMABLE` = 13), `TR_GUARANTEED` (items always made on top of the chance rolls; use it for rewards).
4. From a script: `#include "inc_treasure"`, then `TR_Fill(oTarget, nCR, fQuantity, nMask, fQuality, nGuaranteed)`, `TR_AddItem(oTarget, nCR, nMask, fQuality)` or `TR_RollItem(nCR, nMask, fQuality)` (a resref).

## Differences from the source world
The source sorts its item blueprints into staging chests at server start and also weighs rarity (common, uncommon, rare) and unique against generic items; here the pool is baked into the include from the module's items, and rarity and uniqueness are not modelled (not recorded in its blueprints). Drops of a creature's own equipped items and the personal-loot bags are not ported; forged creatures keep their own gear drops (`CL_DROPPABLE`).

## Creature drops and boss rewards (`a_trs_death`)
Set a creature's `ScriptDeath` to `a_trs_death`: it runs the creature's own death script first (local `TR_ORIG_DEATH`, default `nw_c2_default7`), then `TR_DropOnDeath`. A creature drops treasure with a chance of 30 %, doubled for every two challenge ratings it stands above the area's and halved for every two below (never above 100 %); the one/two/three-item rolls then decide how many (at least one). With local `TR_BOSS` = 1 (boss) or 2 (semi-boss, 70 % of the rating) it also carries one guaranteed item of the boss tier: tier 2 below area CR 3, tier 3 from CR 3 (15 % at CR 3, 50 % at CR 4, 80 % at CR 5; otherwise tier 2), tier 4 from CR 6 (10 % rising to 70 % at CR 9), tier 5 from CR 10 (5 % at CR 10, 80 % at CR 13, always from CR 14). Locals: `TR_CR` (area rating override; default the creature's area, then the module), `TR_QUANTITY`, `TR_QUALITY`, `TR_MASK`. The items go into the creature's own inventory (its lootable body).

## Self-contained: no NWNX, no database
`inc_treasure` has no `#include` and uses only engine built-ins (`Random`, `atan`, `pow`, `GetLocalJson`/`SetLocalJson`, `JsonParse`, `CreateItemOnObject`). The pool lives in the include itself and is parsed once into a local on the module object. The source world's own system needs NWNX (`nwnx_item`, `nwnx_player`, `nwnx_visibility`), its staging area, a SQLite table and a stack of its own includes; none of that is used here.

Checked in the headless engine (2026-11-11), 37-item pool: 200 rolls at CR 1 gave 158 tier-1 and 42 tier-2 items; at CR 8, 101 / 82 / 17 tier 1 / 2 / 3; at CR 14, 94 / 94 / 12. Tier 4 and 5 stayed absent in 200 rolls because the sample pool held only a few such items (they are rare by design too). A chest with `TR_GUARANTEED` 2 held 2 items after the first fill and still 2 after the second. One VM run stops after a few hundred rolls (each roll scans the pool: "too many instructions"), which a chest or a reward never approaches; spread bulk rolls over `DelayCommand`.
