# Dialogs / quest logic survey — TFN (n=416 dialogs, 19,779 entry/reply nodes)

Raw counts: `dialogs_raw.json`.

## Size / branching norms

Average 47.5 nodes/dialog; median dialog is small (63 dialogs are a single
node — one-line barks/notices), but the distribution has a long tail up to
646 nodes for the biggest quest-hub NPC. 183/416 dialogs have exactly 1 root
(`StartingList`) entry — the common case — but some have 60+ roots (heavily
condition-gated: different greeting depending on quest state, faction,
time of day, etc.). Not a direct calibration target for
`/create-adventure`'s one-shot scope (spoiler-free, single-session modules
don't need PW-scale dialog trees), but useful as an upper bound: nothing in
the pipeline should assume dialogs stay small.

## ActionParams/ConditionParams usage — validates the existing nwn-mcp workaround

**Only 0.8% of nodes (165/19,779) use `ActionParams`, and only 1.5% of links
(492/33,513) use `ConditionParams`.** Meanwhile 11.6% of nodes carry a plain
`Script` field. This is a real, professional, live-hosted module built with
the standard Bioware toolset — and it overwhelmingly avoids the
parameterized-script GFF struct-list fields in favor of plain one-script-per-
node wiring (presumably carrying context via local variables on the
speaker/PC, matching this project's own documented workaround in CLAUDE.md's
"Dialog ActionParams/ConditionParams aren't usable through nwn-mcp yet"
pitfall). **This is a strong, concrete confirmation that the current
per-attachment-point wrapper-script pattern (see `quest-params` skill) is not
a lesser workaround — it's how experienced human builders do it too**, even
when the toolset makes the parameterized form available. No action needed;
recorded here as validation, not correction.

## Two corrections made directly to CLAUDE.md this pass

Verified against the *compiled binary* `.mod` (via this project's own
`nwn_erf`/`nwn_gff` tools, not just the checked-in JSON, to rule out a
JSON-export artifact):

1. **`AnimLoop` absence does not block dialog loading.** ~14% of nodes
   (2750/19,779) lack the field entirely, spread across many files with no
   pattern by node type, in a module that runs fine in production.
2. **`IsChild` is only required on nested links, not root links.** 100% of
   `StartingList` links (1596/1596) omit `IsChild`; 100% of nested
   `RepliesList`/`EntriesList` links (31,917/31,917) carry it.

CLAUDE.md's "DLG field completeness is critical" pitfall now reflects both.
No change made to `dialog-write-tools.ts` — the `makeEntry`/`makeReply`/
`makeLink` helpers should keep writing every field; there's no cost to
over-including, only to wrongly diagnosing a missing field as a load failure
when it isn't one.

## Condition-gated branching is the norm, not the exception

40.7% of all links (13,624/33,513) carry a non-empty `Active` condition
script — branching dialog is the dominant pattern in a mature module, not an
occasional flourish. Matches `quest-params`'/`adventure-quests`' emphasis on
condition-gated root entries; no correction needed, just confirms the
approach scales.

## Quest tagging

26 distinct `Quest` field values appear across nodes (e.g. `m1q2_PrisonBreak`,
`m1q3_Blacklake`, `M1Q1_Begg_1`), each used on anywhere from a handful to 21
nodes — consistent with the `Quest` field being used as a lightweight
journal/quest-stage tag on the specific nodes that advance a quest, not
stamped broadly. No correction indicated; not deeply investigated beyond
this count this pass.

## Not investigated this pass

- The 2262 `.nss` scripts backing these dialogs (condition/action script
  idioms, naming conventions) — deferred to the dedicated "script idioms"
  category later in this survey, since dialog structure alone answered the
  two questions worth chasing this pass (field completeness, ActionParams
  usage).
