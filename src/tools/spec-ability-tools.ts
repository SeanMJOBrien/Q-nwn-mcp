/**
 * Special-Abilities random-caster system — the SpecAbilityList-based
 * alternative to inc_random_abil.nss/create_random_abilities_system. See
 * src/util/spec-ability-pool.ts and src/util/spec-ability-script.ts for the
 * full design (why this exists, how it sidesteps the MemorizedList ceiling
 * bugs, and its known limitations).
 *
 * Two tools, split the same way as the build-time/runtime halves:
 * - bake_spec_ability_pool: per-creature. Computes an oversized candidate
 *   pool of every spell the creature's class/level could legally know (real
 *   D&D 3.5 rules, including ability-score bonus spells) and writes it onto
 *   SpecAbilityList. Run once per creature after its ability scores/
 *   ClassList are final.
 * - create_spec_ability_system: module-level, once per module. Generates
 *   inc_spec_ability.nss, whose SA_OnSpawn randomly activates a real-slot-
 *   sized subset of the baked pool each time the module loads.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fsPromises from "fs/promises";
import path from "path";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { ModuleIndex } from "../types/module.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import { bakeSpecAbilityPoolForCreature } from "../util/spec-ability-pool.js";
import { generateSpecAbilityInclude } from "../util/spec-ability-script.js";
import { resolveCreatureTarget, targetErrorResult } from "./npc-tools.js";

/** Probe resref used to prove the include compiles. Removed before returning. */
const PROBE_RESREF = "_sa_probe";

/** Mirrors random-abilities-tools.ts's compileProbe() exactly — same temp-dir placement, same cleanup. */
async function compileProbe(index: ModuleIndex, includeName: string): Promise<{ ok: boolean; output: string }> {
  const source = `#include "${includeName}"

void main()
{
    SA_OnSpawn(OBJECT_SELF);
}
`;
  const result = await writeAndCompileScript(index, PROBE_RESREF, source, true);
  const ok = result.compiled === true;
  const output = result.compilerOutput ?? "";

  for (const ext of ["nss", "ncs"]) {
    const key = `${PROBE_RESREF}.${ext}`;
    const entry = index.resources.get(key);
    if (entry?.filePath) await fsPromises.rm(entry.filePath, { force: true });
    index.resources.delete(key);
  }
  await fsPromises.rm(path.join(index.tempDir, `${PROBE_RESREF}.ncs`), { force: true });

  return { ok, output };
}

/**
 * Idempotently ensure the Special-Abilities include exists and compiles in
 * the loaded module, writing it if it doesn't yet. Mirrors random-abilities-
 * tools.ts's ensureRandomAbilitiesInclude() exactly — shared by
 * encounter-composer-tools.ts, which needs the include present before it can
 * wire a composed boss onto it.
 */
export async function ensureSpecAbilityInclude(
  index: ModuleIndex,
  includeName = "inc_spec_ability",
): Promise<{ includeName: string; created: boolean }> {
  if (index.resources.has(`${includeName}.nss`)) {
    return { includeName, created: false };
  }
  const source = generateSpecAbilityInclude({ includeName });
  await writeAndCompileScript(index, includeName, source, false);
  await compileProbe(index, includeName);
  return { includeName, created: true };
}

export function registerSpecAbilityTools(server: McpServer): void {
  // ─── bake_spec_ability_pool ─────────────────────────────────────────────

  server.tool(
    "bake_spec_ability_pool",
    "Compute and write an OVERSIZED candidate pool of spells onto a creature's SpecAbilityList — every spell its " +
      "class/level could legally know, per the loaded module's own classes.2da/cls_spgn_<class>.2da/spells.2da, " +
      "including real D&D 3.5 ability-score bonus spells (not encoded in any 2DA — computed directly). This is the " +
      "build-time half of the Special-Abilities random-caster system: REPLACES SpecAbilityList outright (same " +
      "replace-not-merge behavior as create_creature_blueprint's own `spells` param). Pair with " +
      "create_spec_ability_system's inc_spec_ability.nss (SA_OnSpawn) to randomly activate a real-slot-sized " +
      "subset of this pool each time the module loads — baking the pool alone does nothing at runtime by itself. " +
      "The written SpecAbilityList is always sorted by spell level (then spell id) — SetSpellAbilityReady only " +
      "toggles a Ready flag on an existing index, never reorders the list, so this is the order a DM possessing " +
      "the creature sees its available (ready) abilities in for the rest of its life. " +
      "Works generically for ANY classes.2da row with SpellCaster=1 and real SpellGainTable/SpellTableColumn/" +
      "SpellcastingAbil columns, including a HAK-added non-PC caster class (base NWN itself ships no such class — " +
      "only Commoner exists as a non-PC class, and it doesn't cast). Reads the creature's CURRENT ability scores " +
      "and ClassList, so run this AFTER build_npc_stat_block/create_creature_blueprint have set them. For a " +
      "single-class companion built with build_npc_stat_block's `deferLeveling` option, bakes against HENCH_LEVEL " +
      "(the real target level) rather than ClassList's deliberately-deferred value — same effectiveLevel " +
      "convention verify_creature's level-formula checks already use. " +
      "A caster that needs a fixed, story-specific ability instead of a random one: don't run this on it — use " +
      "create_creature_blueprint's `spells` param directly. " +
      "Every baked entry defaults to SpellFlags=0 (not ready) — correct in the normal case (SA_OnSpawn resets and " +
      "re-rolls ready state on every spawn regardless of the baked default) and SAFE if SA_OnSpawn never runs for " +
      "any reason (an unwired creature simply casts nothing, matching the pre-existing caster_no_spells state, " +
      "instead of having its entire oversized pool permanently active). Pass markReady:true to instead mark a " +
      "real-slot-count-sized subset ready immediately, picked deterministically from the creature's own " +
      "resref/tag (same reproducible-content convention as pickWeaponPreference) — a static fallback for " +
      "confirming the combat-AI/SpecAbilityList mechanism works, or for a module whose build toolchain can't " +
      "compile inc_spec_ability.nss (see create_spec_ability_system's own compile result).",
    {
      resref: z.string().optional().describe("Blueprint resref to edit"),
      area: z.string().optional().describe("Area resref, when editing a placed instance (with `tag`)"),
      tag: z.string().optional().describe("Tag of the placed instance to edit (with `area`)"),
      markReady: z
        .boolean()
        .optional()
        .describe(
          "Default false (every entry SpellFlags=0, dormant until SA_OnSpawn runs). True marks a real-slot-sized " +
            "subset per level ready immediately, deterministically picked — use when SA_OnSpawn can't run (e.g. " +
            "the build toolchain doesn't support GetSpellAbilityCount/SetSpellAbilityReady yet) but you still want " +
            "the creature to actually use its special abilities in combat.",
        ),
    },
    { idempotentHint: true },
    async ({ resref, area, tag, markReady }) => {
      const index = requireIndex();
      const target = await resolveCreatureTarget(
        index,
        resref,
        area,
        tag,
        "bake_spec_ability_pool",
        `Bake special-ability pool for ${tag ?? resref}`,
      );
      if ("error" in target) return targetErrorResult(target);
      const { obj: creature, save } = target;

      const {
        entries,
        breakdown,
        warnings: allWarnings,
        henchLevelApplied,
      } = bakeSpecAbilityPoolForCreature(index, creature, markReady ?? false, target.label);

      creature.SpecAbilityList = {
        type: "list",
        value: entries.map((e) => ({
          __struct_id: 0,
          Spell: { type: "word", value: e.spell },
          SpellCasterLevel: { type: "byte", value: e.classLevel },
          SpellFlags: { type: "byte", value: e.ready ? 1 : 0 },
        })),
      };
      await save();

      const readyCount = entries.filter((e) => e.ready).length;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                target: target.label,
                totalPoolSize: entries.length,
                readyCount,
                markReady: markReady ?? false,
                ...(henchLevelApplied
                  ? { henchLevelApplied, note: "Pool baked against HENCH_LEVEL, not ClassList's deferred level." }
                  : {}),
                byClass: breakdown.map((b) => ({
                  classId: b.classId,
                  classLevel: b.classLevel,
                  spellcastingAbility: b.spellcastingAbility,
                  slotsByLevel: b.slotsByLevel,
                  poolSize: b.pool.length,
                })),
                warnings: allWarnings,
                nextStep:
                  entries.length > 0
                    ? "Call create_spec_ability_system once per module, then wire SA_OnSpawn into this creature's ScriptSpawn (chained, same pattern as inc_random_abil.nss) so a random subset activates each time the module loads."
                    : "No eligible spells were found for any class position — check warnings above.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  // ─── create_spec_ability_system ─────────────────────────────────────────

  server.tool(
    "create_spec_ability_system",
    "Generate the Special-Abilities runtime include (inc_spec_ability by default). Its SA_OnSpawn(oCreature), " +
      "called once per spawn, randomly marks a real-slot-sized subset of a creature's PRE-BAKED SpecAbilityList " +
      "pool (bake_spec_ability_pool) 'ready' via the engine's own SetSpellAbilityReady(), un-readying the rest — " +
      "so the same NPC shows a different effective spell loadout each playthrough. Unlike " +
      "create_random_abilities_system (which writes a real MemorizedList and is split into a Tier 1/Tier 2 " +
      "class split because of classes.2da's MemorizesSpells column and its own real, confirmed slot-ceiling bugs " +
      "on never-live-leveled blueprints and on Wizard specifically), this system treats every spellcasting class " +
      "uniformly via SpecAbilityList, which base-game monsters already use to fire innate abilities through the " +
      "stock combat AI with zero caster-class levels at all. Depends on nothing but base-game 2DAs and base-game " +
      "EE engine functions (GetSpellAbilityCount/GetSpellAbilitySpell/SetSpellAbilityReady, added 1.88.8193.36) — " +
      "no project-specific table, no NWNX — so the generated file is portable to any other vanilla EE module " +
      "verbatim, provided bake_spec_ability_pool (or a hand-written equivalent) already populated the pool. " +
      "This is a newer, separate, still-being-evaluated alternative to create_random_abilities_system — the two " +
      "may coexist in the same module on different creatures; neither replaces the other. " +
      "WIRING: write a tiny per-role wrapper script that calls ExecuteScript() on the creature's original " +
      "ScriptSpawn first, then SA_OnSpawn, and pass it via create_creature_blueprint's `scripts` param. " +
      "KNOWN TOOLCHAIN GAP (confirmed 2026-10-14): this project's local compiler (neverwinter.nim's " +
      "nwn_script_comp, 'the official compiler library') does NOT recognize GetSpellAbilityCount/" +
      "GetSpellAbilitySpell/GetSpellAbilityReady/SetSpellAbilityReady at all — they were added to nwscript.nss " +
      "after this compiler's vendored snapshot, and there is no newer neverwinter.nim release that fixes it as " +
      "of this check. This tool will report compiles:false and still write the .nss source (for a build " +
      "toolchain that does support these calls); use bake_spec_ability_pool's markReady:true as a static " +
      "fallback when this include can't be compiled.",
    {
      resref: z.string().optional().describe("Include resref to write (default inc_spec_ability, max 16 chars)"),
    },
    { idempotentHint: true },
    async ({ resref }) => {
      const index = requireIndex();
      const includeName = (resref ?? "inc_spec_ability").toLowerCase();

      if (includeName.length > 16) {
        return {
          content: [{ type: "text", text: `resref "${includeName}" exceeds NWN's 16-character limit.` }],
          isError: true,
        };
      }

      const source = generateSpecAbilityInclude({ includeName });
      const written = await writeAndCompileScript(index, includeName, source, false);
      const probe = await compileProbe(index, includeName);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: probe.ok,
                written: written.written,
                sizeBytes: written.sizeBytes,
                compiles: probe.ok,
                ...(probe.ok ? {} : { compilerOutput: probe.output }),
                api: ["void SA_OnSpawn(object oCreature)"],
                usage: `#include "${includeName}"`,
                wiring:
                  "Chain, never replace: write a per-role wrapper that calls ExecuteScript() on the creature's " +
                  "original ScriptSpawn first, then SA_OnSpawn, and pass it via create_creature_blueprint's " +
                  "scripts param. Requires bake_spec_ability_pool to have already populated the creature's " +
                  "SpecAbilityList — this include does nothing on a creature with an empty pool.",
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
