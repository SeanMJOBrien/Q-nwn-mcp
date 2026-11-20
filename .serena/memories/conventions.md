# Code conventions

TypeScript
- Tool registration: `server.tool(name, description, shape, annotations, handler)`; annotations real hints (`readOnlyHint`/`destructiveHint`/`idempotentHint`) or omitted, never `{}`.
- Numeric params `z.string()` + `toF/toI` (`src/util/params.ts`); lists/objects `z.string()` + `JSON.parse`.
- Results: JSON text; failures `failResult(error, {field, valid, next})`; repeat creates `alreadyExistsResult` (`src/util/tool-result.ts`).
- Module writes through `util/project-sync`; GFF access through `src/types/gff.ts` helpers.
- A tool that runs others uses `callTool` (`src/util/tool-registry.ts`).
- Changing a tool's params/behaviour: update every `.claude/skills/*/SKILL.md` that calls it (lint tests check names), and `docs/adventure-tooling-reference.md` where described.
- Encode unverified game data as a skip, never a guess; on `search_2da` overflow grep the saved file.

Prose (docs, commits, tool text): plain words, short sentences.

NWScript (generated or edited)
- Booleans are ints; `if (GetIsObjectValid(x))`, not `== TRUE` (only for engine functions documented to return exactly TRUE/FALSE).
- `GetIsObjectValid()` before `DestroyObject`, `ApplyEffectToObject`, faction changes, any op on a possibly stale object.
- BioWare Hungarian names for new code (`oPC`, `nCount`, `fDelay`, `sResRef`, `lSpawn`, `eVis`), PascalCase functions; constants for magic numbers; functions < ~80 lines; plain `//` comments.
- TMI limit: no deep recursion/unbounded loops; split with `DelayCommand`/`ExecuteScript`. Clean up temporary locals.
- `#include` compiles at build time; no circular includes.

Domain rules by topic: GFF/tool gotchas `mem:domain/gff_gotchas`; positions and heights `mem:domain/spatial`; co-op `mem:domain/coop`.
