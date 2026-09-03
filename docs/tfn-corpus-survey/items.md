# Items survey — TFN (n=1358 item blueprints)

Raw counts: `items_raw.json`.

## Property-count norms (the useful calibration number for reward generation)

| Properties | Items | Share |
|---|---|---|
| 0 (mundane) | 215 | 15.8% |
| 1 | 322 | 23.7% |
| 2 | 331 | 24.4% |
| 3 | 261 | 19.2% |
| 4 | 107 | 7.9% |
| 5+ | 122 | 9.0% (long tail to 16, rare) |

**~68% of all items (mundane + 1-2 properties) sit at 0-2 properties.**
Items with 4+ properties are a minority (~17%) and 8+ properties is genuinely
rare (<2%). If `adventure-rewards`/`adventure-affordances` is generating
reward items, this is the shape to aim for — most generated loot should be
plain gear or carry 1-2 properties; reaching for 4+ properties on every drop
would read as noticeably more "gamey"/generous than how this live PW actually
distributes power. Not yet cross-checked against what the current reward
generation code actually produces — flagged as a comparison worth making in
a follow-up, not done this pass.

## Property variety is concentrated, not spread thin

The top ~20 `PropertyName` IDs (itempropdef.2da rows) account for the large
majority of all property usage — e.g. the single most common property
appears 274 times, the 20th-most-common still 31 times, out of ~2400 total
property instances across all items. Builders reach for a fairly small,
familiar toolkit of property types repeatedly rather than spreading usage
across the full property catalog. (IDs not resolved to names this pass — would
need an `itempropdef.2da` lookup; the *shape* — concentrated, not uniform —
is the finding, not which specific properties.)

## Cost field — observation only, not acted on

97.5% of items (1324/1358) carry a nonzero `Cost` field. Checked
`item-tools.ts`: `create_item_blueprint` doesn't currently write `Cost` at
all (only reads it in `get_item_details`), meaning nwn-mcp-generated items
rely entirely on the engine's automatic cost-from-properties calculation.
Uncertain whether TFN's near-universal explicit `Cost` reflects deliberate
hand-tuning or is simply what the Bioware toolset always bakes in on save —
**not confirmed either way this pass**, so no change made. Worth a follow-up
if store/economy pricing ever becomes a reported problem area.

## Rare flags, as expected

Plot items: 12/1358 (0.9%) — quest items are a small minority, as expected.
Cursed: 5. Stackable (StackSize>1): 8 — almost everything is a unique
inventory item, not ammo/consumable-style stacks (ammo itself is presumably
base-game resref items, not custom `.uti` blueprints, which is why this is
so low).
