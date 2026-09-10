---
name: quest-explorer
description: Use nwn-mcp to audit, fix, or add quests/journal entries in an EXISTING human-authored module (as opposed to autonomous generation via /create-adventure, or general non-quest edits via module-explorer). Trigger on "why is this quest broken", "fix the journal", "add a new quest", "quest never completes", or before trusting verify_journal/verify_quest_completability output on a module you haven't inspected yet — many hand-built PW modules wrap AddJournalQuestEntry in a persistence library, which makes those two verifiers report false positives on every quest.
---

# Quest Explorer

Sibling to `module-explorer`, specialized for journal/quest work on a module
someone is actively developing. `adventure-quests` assumes it's writing
fresh, vanilla-wired quests into a module it controls end-to-end; this skill
assumes the opposite — an existing quest system, possibly with its own
persistence layer and its own builder conventions, that you need to
understand correctly before touching it.

## Adding new quests

Use `quest-params` instead of hand-cloning a `_pqj_*`/`q0NN_*`-style
template for new content — it covers the same library from the authoring
side, including a tested finding that real NWN:EE dialog script parameters
aren't usable through current nwn-mcp tooling and what to do instead.

## `list_script_references`/`find_orphans` blind spot (tested, confirmed)

Both tools reliably find scripts referenced by **dialog nodes**, **creature
event fields** (e.g. `OnDeath` — confirmed against thousands of real
references), and `module.ifo`. They do **not** find scripts referenced by
**trigger** event fields (`OnEnter`/`OnExit`/etc.) — confirmed by testing a
trigger whose `OnEnter` field, read directly via `get_area_triggers`, was
correctly set, while `list_script_references` reported zero references for
that same script. A script `find_orphans` flags as unreferenced may simply
be a trigger's `OnEnter` script — **verify with `get_area_triggers` on the
area(s) you suspect before concluding a trigger-shaped script (name
patterns like `*_trig*`, `*_onent`, `*_secr`, `*_ambs`, `*_lair`) is
actually dead.** This also means a completability audit can't rely on
`list_script_references` alone to prove a trigger-driven quest stage is
unreachable — cross-check the relevant areas directly.

## Always load first

`load_module` before anything else (absolute path if the `.mod` isn't under
a real `NWN_FOLDER_USER/modules/` tree). Then `get_journal` for the full
quest/entry list and `get_module_summary` for orientation.

## Step 1 (mandatory): check for a persistence wrapper before trusting the verifiers

`verify_journal` and `verify_quest_completability` detect quest-award wiring
by a **literal source-text search for `AddJournalQuestEntry(`**. Many
hand-built persistent-world modules — especially anything descended from
Bioware-era PW toolkits (CEP, HotU-based servers, etc.) — never call that
function directly. Instead every quest script calls a wrapper from an
`_inc` script that itself calls the real function once, so the literal
string never appears at the quest's call sites. When that's true, **both
verifiers will report every single quest as broken**, even quests that are
fully and correctly wired. Trusting that output at face value means "fixing"
things that already work.

**Detect it before you diagnose anything:**

```
search_scripts("AddJournalQuestEntry")   # find the real call sites
search_scripts("PersistentJournal")      # a common wrapper-name fragment
search_scripts("SetCampaignString")      # persistence layer usually reachable this way
```

If the real `AddJournalQuestEntry(` calls are concentrated in one or two
`*_inc` scripts, and quest scripts elsewhere call a differently-named
function instead — you've found a wrapper. Read that include file
(`read_script_source`) to learn its function names before doing anything
else. **The most common instance you'll encounter is Knat's "Persistent
Quests & Journal Entries" library**, usually named `pqj_inc` (this is what
Legacy of Ilmara uses — see below for its exact shape). Its tell: an include
whose header comment literally says "you can basically use CTRL-R to
find/replace the original functions with the persistent ones."

**Once you've identified the wrapper function name** (e.g.
`AddPersistentJournalQuestEntry`), re-verify each quest yourself instead of
trusting the built-in tools' verdict:

```
search_scripts("<WrapperFnName>")        # every award call site, across the module
search_scripts("\"<QUEST_TAG>\"")        # literal-tag search — catches even calls
                                          # that pass the tag as a hardcoded local
                                          # (`string qTag = ("TAG");`) rather than
                                          # inline, which is the dominant pattern
                                          # in template-generated quest scripts
find_dialog_scripts()                    # confirm a dialog actually invokes the
                                          # award/condition scripts you found
```

A quest is **actually** broken only if, after this manual check, you still
can't find: (a) a dialog node whose action script awards stage 1, (b) an
End-flagged journal entry, and (c) a script path that reaches it. Report
those as real gaps — don't report wrapper-hidden wiring as broken.

## The PQJ pattern (Legacy of Ilmara and similar CEP-descended PWs)

Confirmed present in Legacy of Ilmara's `pqj_inc.nss` (Knat, 2003; the
quest-script templates below are credited to builder "Thales Darkshine",
2005 — this exact template family may reappear verbatim in sibling modules
built by the same person or forked from the same base).

**Library API** (`#include "pqj_inc"`):
- `AddPersistentJournalQuestEntry(string qTag, int qState, object oCreature, int bAllPartyMembers=TRUE, int bAllPlayers=FALSE, int bAllowOverrideHigher=FALSE)` — wraps `AddJournalQuestEntry`, then mirrors state into a campaign DB (`SetCampaignString("JOURNALS", "QUESTJOURNAL", ..., oCreature)`) so it survives relog.
- `RemovePersistentJournalQuestEntry(...)` — same idea for removal.
- `RetrieveQuestState(string qTag, object oCreature)` — **use this to read quest state, not `GetLocalInt`.** It reads the persisted campaign-DB value, which is the actual source of truth condition scripts check.
- `RebuildJournalQuestEntries(object oCreature)` — call on client-enter to replay the DB into the player's live journal. If a module has this system, confirm this call exists in the module's `OnClientEnter` script (e.g. `pw_mod_clientent`) — if missing, journals won't survive relogin.

**Reusable script templates** (look for `_pqj_*`-prefixed resources in
`list_resources(type: "nss")` — they're purpose-built to `clone_resource`
rather than write from scratch):

| Template | Purpose | Placeholders to replace |
|---|---|---|
| `_pqj_sc_base` | Condition script (`int StartingConditional()`) — gates a dialog node on exact quest state | `qTag`, `qState` |
| `_pqj_set_journal` | Action script — sets journal state on the PC only | `qTag`, `qState` |
| `_pqj_set_20m` | Action script — sets journal state, propagates to party within 20m | `qTag`, `qState` |
| `_pqj_finish_20m` (aka `PQJ_AT_FIN`) | Turn-in/reward script — destroys a quest item from inventory, pulls XP via `GetJournalQuestExperience(qTag)`, grants hardcoded gold, propagates both to nearby party | `qTag`, `qItem`, `qState` (end state), `iGold` |
| `_pqj_item` | Item-based trigger (OnAcquire/OnActivate via `x2_inc_switches`) — advances quest state when player picks up/uses a specific item, self-destructs the item once the quest reaches `qFinish` | `qTag`, `qState`, `qFinish` |

**`bAllPartyMembers=FALSE` (or a PC-only wrapper like `_pqj_set_journal`) is not
automatically a bug when auditing an existing module — check the persistence model
before flagging it.** `/create-adventure`'s own rule ("never pass FALSE") assumes a
fixed party sharing one session, where quest state genuinely is shared. A PW is
usually a different architecture: quest progress tracked per-player via a persistent
store (a campaign DB here, or a player-scoped SQL table in other modules —
`SQLocalsPlayer`-style helpers are common), because a PW can have many unrelated
concurrent players. In that architecture, writing the journal update to only the
advancing PC is *correct* — broadcasting it party-wide would falsely update other
players' journals for a stage they haven't reached in their own persisted record.
Confirmed against a second, independently-built PW ("The Frozen North") using this
exact pattern, not just Legacy of Ilmara's PQJ system. Before reporting a `FALSE`
call as a co-op bug, confirm quest state is actually meant to be shared across
players in this module — if it's per-player by design, `FALSE` is the right call
site to leave alone.

**Load-bearing detail:** `GetJournalQuestExperience(qTag)` reads the `xp`
field set on the journal quest category itself. That means
`edit_journal_quest(tag: ..., xp: N)` isn't cosmetic — any finish script
built from `_pqj_finish_20m`/`PQJ_AT_FIN` will actually pay out whatever XP
value is currently set there. Gold, by contrast, is a hardcoded int inside
each individual finish script (`iGold = ...`) — there is no per-quest gold
field to edit centrally.

**Naming conventions observed in the wild** (not rigid, but the dominant
shape — match the surrounding module's existing style rather than inventing
a new one):
- Condition scripts: `<tag>_sc_state<N>` or `<tag>_sc<N>` (e.g. `q001_sc_state2`, `cke_q002_sc3`)
- Action/award scripts: `<tag>_at<N>` or `<tag>_at_<verb>` (e.g. `eisigquest_at_01`, `q008_at1`)
- Turn-in/reward scripts: `<tag>_finish` or `<tag>_at_finish`
- Area/trigger-driven state changes: `<tag>_trig<N>_onent`, `<tag>_ondeath`

**Some quests layer a second, ad hoc campaign DB** for one-off flags beyond
the numeric quest-state track (e.g. `GetCampaignInt("ILMARA_QUESTS",
"q010_lair", oPC)` gating a one-time spawn). Check `search_scripts` for
`GetCampaignInt`/`GetCampaignString` calls scoped to a quest's own scripts
before assuming `RetrieveQuestState` alone tells the whole story for that
quest.

## Adding a new quest (in a module using this pattern)

1. `add_journal_quest` (tag, name, **xp — load-bearing, see above**, priority) then `add_journal_entry` for each stage, `end: true` on the final one.
2. For each stage transition, `clone_resource` the matching `_pqj_*` template (condition vs. award vs. finish vs. item-triggered) into a new resref following the module's naming convention, then edit the cloned source to replace the placeholder `qTag`/`qState`/`qItem`/`iGold` literals (`write_script` with the edited source, or the module's own edit tooling).
3. Wire the scripts into an NPC's dialog with `add_dialog_node`/`edit_dialog_node` — condition script on the StartingList root entry, action script on the PC reply that advances state. Follow `module-explorer`'s StartingList-ordering rule: higher/later quest stages before earlier ones, unconditioned/default entry last.
4. If the module's `OnClientEnter` calls `RebuildJournalQuestEntries` (or the equivalent for whatever wrapper is in use), no extra step is needed for persistence — otherwise flag that gap to the user, since new quests would not survive relogin.
5. `repack_module`, then re-run Step 1's manual verification (not just `verify_journal`) on the new tag.

## Fixing/auditing existing quests

1. Run `verify_journal` and `verify_quest_completability` for the full candidate list, but treat every `quest_never_awarded`/`AddJournalQuestEntry(...) not found` result as **unconfirmed** until cross-checked per Step 1.
2. Genuinely-empty quests (`quest_no_entries`, zero journal entries) are real gaps regardless of wrapper — these are typically stub categories a builder created and never finished; confirm via the quest's `comment` field (often says something like "reason for haunting yet to be determined") before assuming it's a bug rather than a placeholder.
3. Quests missing an End-flagged entry (`quest_no_end_entry`) are real bugs independent of the wrapper question — fix with `edit_journal_entry(end: true)` on the correct final stage.
4. For quests the manual check confirms are truly unwired (no award script anywhere, no dialog reaches them), report them as real gaps and propose the templates above for fixing — don't silently invent a wrapper name if the module doesn't actually have one; some modules really do call `AddJournalQuestEntry` directly and the verifiers' output is trustworthy as-is.
