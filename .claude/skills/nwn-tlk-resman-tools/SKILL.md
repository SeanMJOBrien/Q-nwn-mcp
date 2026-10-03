---
name: nwn-tlk-resman-tools
description: Use when working with a module's TLK string table or diagnosing where a resource is actually loading from in the resman stack (base game + HAKs + override + development). Trigger on "localize this module", "extract hardcoded strings", "search the TLK", "browse strref entries", "why isn't this resource loading", "which HAK shadows this file", or requests touching tlkify_module/search_tlk/list_tlk_entries/resolve_tlk/resman_stats/resman_search.
---

# TLK & Resman Tools

Two unrelated concerns that share this skill only because both are small,
rarely-touched utility tools: the module's localized-string table, and
diagnosing the resource-loading stack.

## TLK (talk table) tools

A module's custom TLK holds `[STRREF]`-referenced text (strrefs ≥
`0x01000000`); the base game's `dialog.tlk` holds everything below that.
Most getters in this codebase already resolve strrefs for you
(`getFieldLocStrResolved`) — reach for these tools only when you need to
work with the TLK directly:

| Tool | Use for |
|---|---|
| `resolve_tlk` | One strref → its text. Checks custom TLK first, falls back to base `dialog.tlk`. |
| `search_tlk` | Text → matching strrefs (case-insensitive substring), across `custom`/`base`/`both`. |
| `list_tlk_entries` | Browse/paginate entries (up to 200 at a time), optionally filtered by substring. Defaults to `custom` only — pass `source: "both"` to include the base TLK. |
| `tlkify_module` | **Mutating.** Extracts every hardcoded string in the loaded module into a new TLK, rewriting the module to reference it by strref, and writes both as new files (`outputTlkPath` + `outputModPath`). Does not touch the currently-loaded module in place. |

**`tlkify_module` is one-way and produces new files, not an in-place edit.**
After running it, `load_module` the *output* `.mod` if you want to keep
working against the localized version — the originally loaded module is
untouched on disk.

**Sanity-check a `tlkify_module` run**: pick a few strings you know were in
the original module, `search_tlk` for them in the new TLK, and confirm
`resolve_tlk` on the returned strref gives back the exact original text.
`tlkify_module`'s own tests do this for a handful of strings
automatically; do it by hand for anything you're about to ship.

## Resman diagnostics

`resman_stats` and `resman_search` both walk the **full** resman stack
(base game BIFs → module HAKs → user `override/` → user `development/`,
highest-priority last) — see the "Resource Loading" section of this
project's `CLAUDE.md` for how that stack is built at `load_module` time.

| Tool | Use for |
|---|---|
| `resman_stats` | "Why isn't my edit showing up?" — container sizes, file counts, and (crucially) shadowing: which container's copy of a resource actually wins. Pass `detailed: true` for per-container file lists; the summary is enough for most questions. |
| `resman_search` | Find a resource by name pattern or by searching binary/text content across every container — the right tool when `list_blueprints` comes back empty for something you're sure exists (see the "weapon-search" pitfall in `CLAUDE.md`: vanilla base-game items often have terse resrefs with no display-name overlap, e.g. a mundane Battleaxe is `nw_waxbt001`). |

Both return a plain-text report (not JSON) — `resman_stats`'s result is a
formatted block, not a structured object.

**These tools are slow.** Every call initializes the full resman stack
fresh; this codebase already gives resman operations a 120s timeout for
exactly this reason (see `CLAUDE.md`'s "Resman tools are slow" pitfall).
Don't loop these per-item — if you need many lookups, prefer
`list_blueprints`/a single `resman_search` pass over calling `resman_stats`
or `resman_search` repeatedly.
