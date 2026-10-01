---
name: nwn-dialog-introspection
description: Use when reading or tracing an existing conversation (.dlg) via nwn-mcp — understanding branching, finding which script fires on a given reply, checking what condition gates a greeting or reply. Trigger on "what does this dialog say", "trace this conversation", "why doesn't this reply show up", "what script fires when the player picks X", or requests touching get_dialog_tree/flatten_dialog/trace_dialog_path/find_dialog_scripts. For writing/editing dialog nodes, see create_dialog/add_dialog_node/edit_dialog_node in module-explorer instead — this skill is read-only.
---

# Dialog Introspection

Four read-only tools, three altitudes:

| Tool | Use for |
| --- | --- |
| `flatten_dialog` | **Default choice.** Human-readable conversation flow with branching, scripts, and conditions annotated inline. Start here for "what does this dialog do." |
| `get_dialog_tree` | Raw GFF JSON of the whole `.dlg` — every field, no interpretation. Reach for this only when you need an exact field value `flatten_dialog` doesn't surface (e.g. `Quest`/`QuestEntry` stage numbers, `Sound` resrefs, `Delay`). |
| `trace_dialog_path` | Walk one specific sequence of PC reply choices and see exactly what fires. See the limitation below before trusting it for a conditional dialog. |
| `find_dialog_scripts` | Flat list of every script referenced (conditions + actions) across one dialog or the whole module — use before renaming/removing a script, to find what breaks. |

## Reading "Active" correctly

In `EntryList`/`ReplyList`/`StartingList` link structs, the field named
**`Active` holds a condition *script resref*, not a boolean.** An empty
string means "always active." A non-empty value is a script the engine
runs at that branch point — it returning TRUE is what makes the branch
available. `trace_dialog_path`'s output surfaces this value as `condition`
on PC entries; it does **not** evaluate the script, it just reports its
name.

## `trace_dialog_path`'s real limitation: it ignores StartingList ordering

NWN evaluates `StartingList` **top to bottom**, firing the first entry
whose `Active` condition returns TRUE. A dialog commonly has several
starting greetings gated by different conditions — `trace_dialog_path`,
however, **always starts from `StartingList[0]`** regardless of what that
entry's condition is or whether a later entry would actually fire at
runtime. For a dialog with conditional starting entries, the traced path
may not be the path a real player would ever see.

**Real example** (a Frozen North quest-farmer NPC's `StartingList`, read via
`get_dialog_tree`):

```
index 49  Active: m2q1scfarmsgk1   # quest-stage-specific greetings,
index 45  Active: m2q1scfarmsgk2   # evaluated in this order —
index 40  Active: m2q1scfarmsgk3   # first one whose quest-stage
index 36  Active: m2q1scfarmsgk4   # condition passes wins
index 31  Active: m2q1scfarmsgk5
index 25  Active: m2q1scfarmsgk6
index 2   Active: nw_d2_chrm       # charisma-based fallback greetings
index 1   Active: nw_d2_chrl       # (generic, used only if none of the
index 0   Active: nw_d2_chrh       # quest-stage conditions matched)
```

`trace_dialog_path` would always start at entry 49 (`m2q1scfarmsgk1`), even
though at most quest stages that condition fails and the PC actually sees
one of the later, lower-priority entries. **Before trusting a traced path,
read `StartingList` via `get_dialog_tree` first** and reason about which
entry's condition would actually be true for the scenario you care about —
`trace_dialog_path` can't pick that for you.

The same "first Active entry on the list, top-to-bottom" rule applies to
`RepliesList`/`EntriesList` branches mid-conversation, not just
`StartingList` — a reply gated by `Active` won't show if an earlier
same-list reply's condition already consumed that branch slot in the real
UI, but `trace_dialog_path`'s `replyIndices` just index straight into
whatever `RepliesList` returns, bypassing condition evaluation entirely at
every step, not just the start.

## Script fields: condition vs. action

Don't confuse the two script slots a reply/entry can carry:
- `Active` (on the link struct, not the entry/reply struct itself) —
  condition, decides whether this branch is offered.
- `Script` (on the entry/reply struct) — action, fires when this line is
  reached/chosen (e.g. an alignment shift, a journal update, a store open).

Real example from the same NPC: replies with `Script: nw_d1_mid_evil` or
`nw_d1_small_evil` are alignment-shift action scripts fired on choosing an
evil-flavored reply option — unrelated to whether that reply was available
to pick in the first place.

## Workflow

1. `flatten_dialog` first for orientation — it already annotates scripts
   and conditions per the dialog's own index summary (entry/reply counts,
   scripts used, conditions used).
2. If you need to reason about *which* starting greeting or reply actually
   fires under specific game state, read `get_dialog_tree`'s raw
   `StartingList`/`RepliesList` order yourself rather than relying on
   `trace_dialog_path` to have picked correctly.
3. `find_dialog_scripts` before any rename/removal of a script this dialog
   might reference.
