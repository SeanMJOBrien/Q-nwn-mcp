# Stores survey — TFN (n=27 `.utm` store blueprints)

## Norms

- Avg 11 items/store (8 stores have 0 — likely category-only or
  currently-unused blueprints, not a meaningful floor).
- **StoreGold: 27/27 (100%) use -1 (unlimited buying budget).** No store in
  the corpus caps how much gold the merchant can spend buying from the
  party.
- **MarkUp avg 154% (range 100-175), MarkDown avg 22% (range 0-100).** A
  real merchant-profit economy: buy from the party cheap, sell to the party
  at a real markup.
- Stock: 116 infinite-stock item entries vs. 180 finite-stock (~61% finite)
  — scarcity is used for exclusivity on specific items, not to constrain
  overall shop value (that's what `StoreGold` would do, and it's never used
  here).

## Compared to current tooling — a plausible, not necessarily wrong, gap

`create_store_blueprint`'s own default is `markUp: 100, markDown: 100`
(break-even both directions — no merchant profit at all if a caller omits
the params). **Not a live bug**: `adventure-affordances/SKILL.md` already
passes explicit `markUp: "120", markDown: "80"` rather than relying on the
tool default, so generated stores aren't accidentally break-even.

The gap worth noting: TFN's real average (154/22) is a noticeably harsher
merchant economy than the skill's current values (120/80). This is plausibly
*correct as-is* rather than a bug — TFN is a persistent world where
merchant economics matter over thousands of play-hours (inflation control,
preventing gold-farming), while `/create-adventure` builds one-shot,
single-session modules where a gentler economy has no comparable downside
and arguably serves the "have fun" goal better. **No change made** — flagged
as a data point for you to weigh, not acted on.
