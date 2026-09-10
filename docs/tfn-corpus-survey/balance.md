# Creature combat balance survey — TFN (201 pure-PC-class combat NPCs)

Prompted by the observation that TFN's stat/gear design per CR is a strong
reference. Population: pure PC-class (Fighter/Ranger/Wizard/etc., classes
0-10 only), non-commoner-faction, level>0 — the same population
`adventure-challenges` builds. Raw data: `balance_raw.json`.

## HP scaling — broadly validated, no correction needed

| CR band | n | Avg HP | Median HP | `adventure-challenges` documented range |
|---|---|---|---|---|
| 0.5-1 | 13 | 10.6 | 11.0 | Minion 6-12 ✓ |
| 1-2 | 5 | 12.0 | 9.0 | Standard 12-20 (low end) |
| 2-3 | 16 | 20.9 | 20.0 | Elite 20-30 (low end) ✓ |
| 3-4 | 27 | 26.0 | 30.0 | Boss 30-45 (below) |
| 4-6 | 60 | 44.6 | 44.0 | Standard 25-40 / Elite 40-55 (fits between) |
| 6-8 | 37 | 63.2 | 68.0 | Boss 55-75 ✓ |
| 8-10 | 20 | 75.5 | 80.0 | (next tier table) |
| 10-12 | 11 | 117.4 | 120.0 | (next tier table) |

TFN doesn't tag a minion/standard/elite/boss role, so this compares one CR
band's *overall* average against the doc's *role-differentiated* ranges —
not a clean apples-to-apples check, but the numbers land inside or near the
documented bands consistently enough that **HP scaling needs no change.**

## NaturalAC — a real, high-confidence correction

**80% of TFN's pure-PC-class combat NPCs (160/201) have `NaturalAC=0`.**
Average `NaturalAC` by CR band never exceeds ~1 until CR 12+ (where a
handful of non-standard/monstrous-humanoid builds pull the average up):

| CR band | n | Avg NaturalAC | `adventure-challenges` documented range |
|---|---|---|---|
| 0.5-1 | 13 | 0.0 | Minion 0-1 ✓ |
| 1-2 | 5 | 0.0 | Standard **1-2** — TFN below |
| 2-3 | 16 | 0.0 | Elite **2-3** — TFN below |
| 3-4 | 27 | 0.1 | Boss **3-5** — TFN far below |
| 4-6 | 60 | 0.3 | Standard/Elite **2-4** — TFN far below |
| 6-8 | 37 | 0.6 | Boss **4-6** — TFN far below |
| 8-10 | 20 | 1.2 | (next tier, presumably higher) — TFN far below |

**Root cause, and why this is a real doc gap, not just "TFN plays it
differently":** D&D 3.5e rules split AC into natural armor (a creature's
innate hide — appropriate for monsters, dragons, oozes) versus armor/shield
bonuses (what a humanoid combatant actually wears). `adventure-challenges`'s
own "Combat Role Templates" section already gets this right in practice —
the Fighter/Tank/Ranged/Caster/Healer templates all reach their AC through
`equipment: {"chest": ..., "lefthand": <shield>}`, and only the "Monster
(Non-Humanoid)" template says `naturalAC: <scaled to tier>`. **The problem is
the "Stat Scaling" tables above it present a single "Natural AC" column
across every role**, inviting a reader (or an LLM following the doc
literally) to set e.g. `naturalAC: 5` on a CR 6-8 Fighter boss to hit the
documented AC target — which is exactly the pattern TFN's real, balanced
roster never does. Fixed directly in `adventure-challenges/SKILL.md`: added
a note clarifying the Natural AC column applies to the Monster template
only: humanoid roles should reach their AC target through armor/shield
`equipment`, not `naturalAC`.

## Ability scores by role — follow-up done, validates the doc and finds a real gap

Classified each of the 201 creatures by dominant class (highest `ClassLevel`
in `ClassList`) as a proxy for the doc's "role," since TFN doesn't tag roles
directly.

### The 5 roles `adventure-challenges` already documents — confirmed correct

| Role (dominant class) | n | Str | Dex | Con | Int | Wis | Cha | Primary stat matches doc? |
|---|---|---|---|---|---|---|---|---|
| Melee (Fighter) | 89 | **14.1** | 12.3 | 12.7 | 10.2 | 10.1 | 10.1 | STR highest ✓ |
| Tank (Barbarian) | 15 | **14.7** | 11.7 | 13.5 | 9.6 | 9.5 | 9.1 | STR+CON highest ✓ |
| Ranged (Ranger) | 7 | 15.0 | **16.0** | 12.1 | 10.3 | 12.9 | 10.3 | DEX highest ✓ |
| Caster (Wizard) | 22 | 10.6 | 11.8 | 13.1 | **18.5** | 11.5 | 11.2 | INT highest, physical lowest ✓ |
| Caster (Sorcerer) | 15 | 10.4 | 11.7 | 13.8 | 12.3 | 11.5 | **16.5** | CHA highest ✓ |
| Healer (Cleric) | 25 | 13.2 | 11.5 | 13.0 | 10.8 | **16.4** | 11.8 | WIS highest ✓ |

Every documented role's primary-stat claim holds cleanly in a real, balanced
roster — **no correction needed here.** Wizard vs. Sorcerer correctly
diverge on their actual casting stat (INT vs. CHA) rather than being
treated as interchangeable, which the doc already gets right by listing
them separately.

### A real gap: 5 more roles cover 14% of the roster and aren't in the doc

28 of 201 creatures (14%) have a dominant class the doc's role table doesn't
mention at all: Rogue (10), Druid (8), Monk (4), Paladin (3), Bard (3). Their
stat profiles are just as clean:

| Class | n | Str | Dex | Con | Int | Wis | Cha | Implied role |
|---|---|---|---|---|---|---|---|---|
| Rogue | 10 | 11.8 | **14.7** | 12.3 | 10.3 | 10.1 | 9.9 | Skirmisher — DEX primary |
| Paladin | 3 | **16.0** | 9.0 | 12.7 | 9.3 | 12.0 | 14.7 | Holy melee — STR primary, CHA secondary |
| Druid | 8 | 11.5 | 12.9 | 13.1 | 10.4 | **16.5** | 10.6 | Nature caster — WIS primary |
| Monk | 4 | **17.5** | 14.0 | 14.0 | 9.5 | 14.0 | 9.5 | Unarmed striker — STR primary, WIS secondary |
| Bard | 3 | 12.0 | 16.7 | 13.3 | 13.3 | 11.0 | **18.0** | Support/skirmisher — CHA primary, DEX secondary |

Added Rogue, Druid, and Paladin to `adventure-challenges`'s "By Combat Role"
table — clean signal, reasonable sample size, and each fills a distinct
tactical niche the current 5 roles don't (a sneak-attack skirmisher, a
nature caster, a holy melee/support hybrid). Left Monk and Bard as a note
rather than full additions — thinner samples (n=3-4) and, for Monk
specifically, the real data (STR primary) cuts against the class's usual
unarmed-finesse fantasy, worth a second look before committing it to a
skill doc as a rule.

## Gear value by CR — attempted, inconclusive, no change made

Built a resref→cost lookup from all 1358 local `.uti` files and summed
equipped RightHand/LeftHand cost per creature, banded by CR, compared
against `gearBudget()`'s DMG-table-based standard/mook shares from
`wealth.ts`. **The result isn't trustworthy enough to act on:**

- Only 30/201 creatures have *fully* locally-resolvable weapon gear — most
  TFN combat NPCs equip at least one base-game resref weapon, which needs
  resman to cost (not attempted this pass — see Known Pitfalls: "Resman
  tools are slow").
- Even among those 30, per-CR-band samples are tiny (1-6 creatures) and
  dominated by individual outliers: the CR 12-20 band is a single creature
  worth 3,135,523 gp (a unique artifact-bearing boss, not a typical
  budget), and CR 6-8's mean (29,888) is 18x its own median (1,620) from
  one expensive item in a 6-creature sample.

**No skill-doc change made.** `get_wealth_budget`'s DMG-table anchor remains
the best available basis for gear budgeting; this pass didn't produce
evidence strong enough to adjust `ROLE_SHARE`'s convention-based shares
(0.5 standard / 0.25 mook), despite `wealth.ts`'s own comment flagging them
as unverified. A real answer would need resman-backed cost resolution
across the full roster, not just the locally-resolvable third of it — a
bigger follow-up than this pass's budget covered.
