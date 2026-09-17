# Encounter difficulty checker — research findings

Research backing `get_balance_report`'s `partyLevel`/difficulty feature
(`src/util/encounter-difficulty.ts`). Two separate questions, two separate
verification passes: **(1)** how do multiple same-CR creatures combine into a
group Encounter Level (EL), and **(2)** what should a checker do when a
creature's `ChallengeRating` is unset (0)? Both needed real data, not a guess —
this project's standing rule.

## 1. The Encounter Level combination rule

**Confirmed, not guessed**: a literal D&D 3.5 DMG excerpt surfaced verbatim via
web search (not paraphrased by the search tool): *"if a given creature's
Challenge Rating is two lower than a given Encounter Level, then two creatures
of that kind equal an encounter of that Encounter Level"* — from the real DMG
table, **"Table 3-1: Encounter Numbers."** This directly matches
`.claude/skills/adventure-challenges/SKILL.md:99`'s already-stated rule
("doubling the number of identical creatures is +2 EL, not +CR"), now
cross-confirmed against the actual DMG wording rather than this project's own
paraphrase of it.

**Primary-source access was blocked everywhere it was tried** — d20srd.org,
d20pfsrd.com, dandwiki.com, pathfinder.d20srd.org, web.archive.org, and the
giantitp.com forum thread that had the DMG quote all returned 403 or were
unreachable to automated fetches. What's used here comes from AI-summarized
search snippets of secondary sources, cross-validated against each other and
against the confirmed DMG quote — not a direct read of the printed table.

Two independent secondary sources gave numeric tables that agree exactly on
the low end and differ slightly in banding at the high end:

| Creatures (N) | Source A (Starfinder-derived) | Source B ("standard 3.5 rules") |
|---|---|---|
| 1 | +0 | +0 |
| 2 | +2 | +2 |
| 3 | +3 | +3 |
| 4 | +4 | +4 |
| 5-6 | 6→+5 | +5 |
| 7-9 | 8→+6 | +6 |
| 10-12 | 12→+7 | +7 |
| 16 | +8 | — |

Rather than pick one arbitrarily, both tables' every value is reproduced
exactly by a single closed-form formula — the natural mathematical encoding of
the confirmed "doubling = +2" rule:

```
EL adjustment for N identical creatures = round(2 * log2(N))   (N >= 1; N=1 -> 0)
```

Checked: N=3→3.17→3 ✓, N=5→4.64→5 ✓, N=6→5.17→5 ✓, N=7→5.61→6 ✓, N=9→6.34→6 ✓,
N=10→6.64→7 ✓, N=11→6.92→7 ✓, N=12→7.17→7 ✓, N=16→8.0→8 ✓ — every value in
both tables matches. This is what `combineSameCREL()` implements.

**Scope limit, stated plainly**: this formula is verified for a group of
**identical CR** creatures only. The real DMG rule for a *mixed*-CR group
(different creatures at different CRs fighting together) uses a further,
separate combination step this research did not verify with the same
confidence — the exact pairwise "how much does a weaker creature add" table
was not found through any accessible source. The checker therefore reports
**one EL per same-CR cluster**, not a single fabricated whole-area number —
see the "Known limitation" note in the tool itself.

## 2. Real CR-vs-level data from `~/tfndev`

Per the user's direction: `~/tfndev` is a real, mature, actively-played PW
whose creatures are considered well-balanced, and every one carries a real,
human-assigned `ChallengeRating` — a legitimate empirical source for "what CR
does a well-balanced creature of level N actually get," to use as a fallback
when a generated creature's CR is unset.

**Source**: `~/tfndev/src/utc/*.utc.json` — 505 real creature blueprints,
already in GFF-JSON form (the project's own tracked source, not a build
artifact — `.nasher`/`nasher-suspect` are nasher's build caches and were not
used). All 505 parsed cleanly; **all 505 already have a real, nonzero
`ChallengeRating`** — a genuinely complete, well-maintained corpus, not one
this project had to filter down.

**Finding: CR ≈ total character level, almost exactly, with no meaningful
class-based skew**, across the reliably-sampled range (level 1-11, n=17-86 per
level):

| Level | n | median CR | mean CR |
|---|---|---|---|
| 1 | 86 | 0.5 | 0.63 |
| 2 | 35 | 2.0 | 1.97 |
| 3 | 51 | 3.0 | 3.04 |
| 4 | 44 | 4.0 | 4.05 |
| 5 | 55 | 5.0 | 5.07 |
| 6 | 45 | 6.0 | 6.02 |
| 7 | 27 | 7.0 | 6.85 |
| 8 | 40 | 8.0 | 8.07 |
| 9 | 30 | 9.0 | 8.90 |
| 10 | 23 | 10.0 | 10.09 |
| 11 | 24 | 11.0 | 11.29 |

Levels 12+ are present but sparse (n=1-17) and noisier (e.g. level 15 median
CR 17.5, level 20 median CR 15.0 — likely a mix of genuine epic monsters and
deliberately-weakened high-level story NPCs skewing a small sample) — not
trusted as a reliable curve past level ~11.

**By primary class**, mean(CR − level) restricted to level ≤ 11 (the reliable
range), across every base class with a real sample:

| Class | n | mean(CR−level) | stdev |
|---|---|---|---|
| Barbarian | 16 | +0.03 | 0.45 |
| Bard | 3 | −0.17 | 0.24 |
| Cleric | 25 | +0.12 | 0.32 |
| Druid | 7 | +0.29 | 0.45 |
| Fighter | 104 | −0.06 | 0.28 |
| Monk | 5 | +0.30 | 0.60 |
| Paladin | 3 | −0.17 | 0.24 |
| Ranger | 6 | +0.08 | 0.45 |
| Rogue | 16 | −0.19 | 0.61 |
| Sorcerer | 16 | −0.19 | 0.39 |
| Wizard | 17 | −0.06 | 1.16 |
| Commoner | 25 | −0.12 | 0.37 |

Every class sits within ±0.3 of zero deviation — no class needs its own
correction term. **`estimateCRFromLevel()` is therefore just `totalLevel`**
(sum of every `ClassList` entry's level), used only when a creature's real
`ChallengeRating` is 0/unset — and the report flags which creatures' CR was
estimated versus real, rather than blending them silently.

249 of the 505 creatures (49%) have a primary class ID above 10 (tfndev's own
custom/prestige classes) — those weren't excluded from the level-based table
above (total character level is class-agnostic), only from the per-class
breakdown, which only makes sense for the 11 base `classes.2da` classes this
project models.

## What this doesn't cover

- Mixed-CR group combination (see the scope limit above) — reported per-cluster,
  not collapsed into one number.
- No formal "these creatures fight together" grouping exists in this
  project's own pipeline to key off — `adventure-challenges/SKILL.md:380`
  deliberately avoids Encounter blueprints ("place all hostiles individually
  for precise tactical control"), so there's no GFF structure marking which
  hostiles in an area are meant to be one simultaneous fight versus separate
  patrols. `get_balance_report`'s difficulty figures are computed **per area**,
  across every faction-1 (Hostile) creature placed there — an upper bound on
  "if everything in this area converged at once," not a claim about any one
  specific fight. Spatial clustering (grouping hostiles within some radius of
  each other into separate encounter estimates) would need a real design pass
  of its own — not attempted here.
