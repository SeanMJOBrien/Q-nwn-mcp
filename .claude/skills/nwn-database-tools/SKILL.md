---
name: nwn-database-tools
description: Use when inspecting or editing a NWN SQLite campaign/persistent-world database (NWN_FOLDER_USER/database/*.sqlite3) via nwn-mcp — reading or writing campaign variables (SetCampaignInt/SetCampaignJson/StoreCampaignObject and their Get* counterparts), henchman/character persistence, or any PW save data. Trigger on "campaign database", "SqlPrepareQueryCampaign", "sqlite3", "persistent variable", "database query", or requests touching list_databases/query_database/read_database_object/write_database_object.
---

# Database Tools

These tools are for **runtime persistent-world state** — the SQLite
databases NWScript reads/writes via `SqlPrepareQueryCampaign`/
`SetCampaignInt`/`StoreCampaignObject` and friends, living in
`NWN_FOLDER_USER/database/`. This is a **different store from the loaded
`.mod`** — no `load_module` is needed or relevant here, and nothing here
touches the module's own GFF resources. Don't conflate campaign DB state
with module content.

## Database naming (so you pick the right file)

- `mod_<module>.sqlite3` — module-level campaign variables.
- `_<charname>.sqlite3` — local-vault character.
- `<serverid>_<charname>.sqlite3` — server-vault character.
- `_hench_tagid_NNN` suffix — a specific henchman's persisted state.

`list_databases` enumerates what exists with size/table count — run it
first when you don't already know the exact filename; the `.sqlite3`
extension is optional on every tool that takes a `database` param.

## The `db` table shape

Campaign variables live in one table, `db`, keyed by `(varname, playerid)`.
`vartype` is an ASCII byte identifying the value's NWScript type:

| Code | Char | Type | Payload encoding |
| --- | --- | --- | --- |
| 70 | F | float | uncompressed ASCII |
| 73 | I | int | uncompressed ASCII |
| 74 | J | json (`SetCampaignJson`) | **CPDB/zstd compressed** |
| 76 | L | location | uncompressed ASCII (`areaId@x:y;z!facing`) |
| 79 | O | object (`StoreCampaignObject`, GFF) | **CPDB/zstd compressed** |
| 83 | S | string | **CPDB/zstd compressed** |
| 86 | V | vector | uncompressed ASCII |

Only J/O/S are ever compressed — F/I/L/V are plain ASCII you can read
straight out of a `query_database` SELECT. Use `read_database_object` for
J/O/S rows rather than reading `payload` raw — it detects and strips the
CPDB/zstd wrapper for you.

## Workflow

1. `list_databases` to find the right file (or confirm a name you were
   given actually exists before querying it).
2. `query_database` with `PRAGMA table_info(db)` (or just `SELECT * FROM db
   LIMIT 5`) to see what's actually in it before writing a targeted query —
   don't assume a schema beyond the standard `db` table without checking.
3. For a specific known variable, `read_database_object` by `varname` (+
   `playerid` if it's a per-character value — default is empty string,
   which is the module-level/global convention) is simpler than hand-writing
   the SELECT + decompress yourself.
4. To persist a new/updated object, `write_database_object` — see the
   caveat below before relying on this for an existing compressed row.

## Sharp edges

- **`query_database`'s read/write detection is a prefix check, not a real
  SQL parser.** It treats `SELECT`/`PRAGMA`/`EXPLAIN` prefixes as reads;
  anything else — including a `WITH ... SELECT` CTE — is treated as a
  **write** (`db.run()` + save-to-disk). A CTE-based read will silently go
  through the write path. Prefer a plain `SELECT` when you just want rows.
- **`write_database_object` always writes `compressed=0` (uncompressed
  JSON), regardless of how the row was originally stored.** NWN:EE reads
  both compressed and uncompressed rows fine, so round-tripping a
  CPDB-compressed value through `read_database_object` → edit → 
  `write_database_object` is safe functionally, but the row's `compressed`
  flag and on-disk size will change — don't be surprised by that diff if
  you're comparing database file state before/after.
- **100MB file-size cap.** `sql.js` loads the whole database into memory;
  `openDb` throws above that rather than streaming. Large persistent-world
  databases may need a different inspection approach (ask the user before
  assuming this tool can handle it).
- **`NWN_FOLDER_USER` must be set** or every tool here fails immediately —
  this is the same env var `module-explorer` warns about for module paths;
  check it's configured for the project before debugging a "directory does
  not exist" error as something else.
- **Database name is sanitized to a plain filename** (no path separators,
  no `..`) — you cannot point these tools outside `NWN_FOLDER_USER/database/`.

## Scope

Campaign/persistent-world SQLite data only. For the module's own resources
(areas, blueprints, dialogs) use the base nwn-mcp toolset (`module-explorer`
skill); for item blueprint property editing specifically, see
`nwn-item-properties`.
