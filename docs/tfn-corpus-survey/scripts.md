# Script idioms survey — TFN (2262 `.nss`, targeted grep pass, not exhaustive)

Given the volume, this pass targeted specific patterns already flagged as
important by nwn-mcp's own documented co-op/reward rules, rather than
reading files exhaustively.

## AddJournalQuestEntry / bAllPartyMembers — an important nuance, not a bug

Only 3 files call the raw engine function directly (most quest scripts go
through TFN's own `inc_quest.nss` wrapper, matching the pattern
`quest-explorer`'s own SKILL.md already describes as common in mature PWs).
Two of those three pass `bAllPartyMembers=FALSE` — which looks, at first
glance, exactly like the anti-pattern CLAUDE.md flags as a hard `error`
("never pass FALSE, or one player's journal advances while the rest cannot
complete the quest"). **Checked further and it's correct in context, not a
bug:**

- `nw_i0_generic.nss` line 1588 is unmodified base-game BioWare code (the
  henchman-recruit journal note) — not TFN's own logic at all.
- `inc_quest.nss`'s `GetQuestEntry()` reads quest stage via
  `SQLocalsPlayer_GetInt(oPC, sQuestEntry)` — **per-player persistent
  database storage**, not shared party state. In TFN's architecture, quest
  progress is *deliberately* tracked independently per player (a PW can have
  dozens of unrelated concurrent players, unlike a fixed co-op party), so
  writing the journal update for only the advancing PC is the *correct*
  behavior — broadcasting it party-wide would incorrectly update other
  players' journals for a stage they haven't actually reached in their own
  persistent record.

**This sharpens rather than contradicts nwn-mcp's own co-op rule.** The rule
is correctly scoped to `/create-adventure`'s actual target: a small, fixed
party sharing one session, where quest state legitimately *is* shared. It
would be actively wrong to apply the same rule to a PW-style architecture
with independent per-player persistence. Worth a one-line addition to
CLAUDE.md's co-op section clarifying *why* the rule holds for this project's
scope specifically — not because "always TRUE" is universally correct NWN
practice, but because `/create-adventure` always builds a single shared-party
session. Not yet added; flagged for your call since it's editorializing on
an existing, already-precise rule rather than fixing a factual error.

## Party fan-out (`GetFirstFactionMember`) — validates the existing pattern

33 files use `GetFirstFactionMember`/`GetNextFactionMember` loops for
party-wide effects (messaging, combat aggro propagation, faction-wide
notification) — confirms this is TFN's standard idiom for "affect everyone
in the group," matching exactly what `create_reward_system`'s generated
`CoopRewardXP`/`CoopRewardGold` helpers already do. No correction needed.

## Not done this pass

Full script-by-script idiom cataloguing (naming conventions, include
hierarchy, spawn-script variety beyond the loot-generation pattern already
covered in `actors.md`) — 2262 files is too large for exhaustive reading
within this survey's budget. The two patterns above were chosen because they
directly test existing documented nwn-mcp rules; a broader idiom-mining pass
would need a narrower, separately-scoped follow-up.
