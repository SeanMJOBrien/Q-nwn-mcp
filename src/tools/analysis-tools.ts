import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex, indexAreaCreatures } from "../module-loader.js";
import { numParam, optNumParam, toI } from "../util/params.js";
import { getFieldStr, getFieldNum, getFieldLocStr, getFieldList } from "../types/gff.js";
import type { GffObj, GffDocument } from "../types/gff.js";
import { buildTagToAreaMap, buildAreaTransitions } from "./tileset-tools.js";
import { isBaseGameResource, isBaseGameScript, loadScriptSources } from "../util/verify/common.js";
import { flattenDialog } from "../util/dialog-walker.js";
import type { FlatDialogNode } from "../types/dialog.js";
import type { CreatureRecord } from "../types/module.js";

export function registerAnalysisTools(server: McpServer): void {

  server.tool(
    "get_dependency_graph",
    "Show resource dependency graph. Resources depend on other resources via script references, conversation assignments, etc.",
    { resource: z.string().optional().describe("Focus on a specific resource (e.g., 'forest.git'), or omit for full graph") },
    { readOnlyHint: true, idempotentHint: true },
    async ({ resource }) => {
      const index = requireIndex();
      const edges: Array<{ from: string; to: string; relationship: string }> = [];

      // Build edges from script references
      for (const [scriptResref, usages] of index.scripts) {
        for (const usage of usages) {
          const toFile = `${scriptResref}.nss`;
          const hasSource = index.resources.has(toFile);
          const toCompiled = `${scriptResref}.ncs`;
          const target = hasSource ? toFile : (index.resources.has(toCompiled) ? toCompiled : toFile);
          edges.push({
            from: usage.resourceFile,
            to: target,
            relationship: usage.usageType,
          });
        }
      }

      // Creature -> Dialog edges
      for (const creature of index.creatures) {
        if (creature.conversation) {
          const gitFile = `${creature.area}.git`;
          const dlgFile = `${creature.conversation}.dlg`;
          if (index.resources.has(dlgFile)) {
            edges.push({
              from: gitFile,
              to: dlgFile,
              relationship: `Conversation(${creature.tag})`,
            });
          }
        }
      }

      // Filter if specific resource requested
      let filtered = edges;
      if (resource) {
        const needle = resource.toLowerCase();
        filtered = edges.filter(e =>
          e.from.toLowerCase() === needle || e.to.toLowerCase() === needle
        );
      }

      // Build node set
      const nodes = new Set<string>();
      for (const edge of filtered) {
        nodes.add(edge.from);
        nodes.add(edge.to);
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ nodes: [...nodes], edges: filtered }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "find_orphans",
    "Find resources that are never referenced by any other resource.",
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      const index = requireIndex();

      // Collect all referenced resources
      const referenced = new Set<string>();

      // Scripts referenced in GFF
      for (const scriptResref of index.scripts.keys()) {
        referenced.add(`${scriptResref}.nss`);
        referenced.add(`${scriptResref}.ncs`);
      }

      // Dialogs referenced by creatures
      for (const creature of index.creatures) {
        if (creature.conversation) {
          referenced.add(`${creature.conversation}.dlg`);
        }
      }

      // Areas referenced by module.ifo
      for (const areaResref of index.areas.keys()) {
        referenced.add(`${areaResref}.are`);
        referenced.add(`${areaResref}.git`);
        referenced.add(`${areaResref}.gic`);
      }

      // module.ifo is always referenced
      referenced.add("module.ifo");

      // Palette files are always referenced by the toolset
      for (const [key] of index.resources) {
        if (key.endsWith(".itp")) referenced.add(key);
        if (key.endsWith(".fac")) referenced.add(key);
      }

      // Find unreferenced resources
      const orphans: Array<{ resource: string; type: string; sizeBytes: number }> = [];
      for (const [key, entry] of index.resources) {
        if (!referenced.has(key)) {
          orphans.push({ resource: key, type: entry.extension, sizeBytes: entry.sizeBytes });
        }
      }

      return { content: [{ type: "text", text: JSON.stringify(orphans, null, 2) }] };
    }
  );

  server.tool(
    "get_balance_report",
    "Analyze creature difficulty and item values per area. Includes a per-area class-composition tally (caster presence, class counts) — informational only: a caster is not a hard requirement for a good encounter, just something that sometimes improves the mechanics/variety. Pass effectivePartySize to also see total CR per party member.",
    { effectivePartySize: optNumParam("Party size to divide each area's total CR by, for a rough per-member difficulty figure") },
    { readOnlyHint: true, idempotentHint: true },
    async ({ effectivePartySize }) => {
      const index = requireIndex();
      const partySize = effectivePartySize !== undefined ? toI(effectivePartySize) : undefined;

      // Classes whose classes.2da SpellCaster column is "1" — used only for the
      // informational casterPresent flag below, never a pass/fail requirement.
      const casterClassIds = new Set<number>();
      for (const [rowIdx, row] of index.twodaTables.get("classes")?.rows ?? []) {
        if (row.SpellCaster === "1") casterClassIds.add(rowIdx);
      }

      const areaReports: Array<Record<string, unknown>> = [];

      for (const [areaResref, summary] of index.areas) {
        // Read live from parsedGff rather than the load-time index.creatures
        // snapshot — a creature placed after load_module (the normal case
        // mid-pipeline) would otherwise be invisible here, the same staleness
        // bug already fixed for get_area_creatures/list_creatures.
        const gitDoc = index.parsedGff.get(`${areaResref}.git`);
        const areaCreatures: CreatureRecord[] = [];
        if (gitDoc) indexAreaCreatures(areaResref, gitDoc, areaCreatures);

        const crs = areaCreatures.map(c => c.cr);
        const hps = areaCreatures.map(c => c.hp);
        const totalCR = crs.reduce((a, b) => a + b, 0);

        const classCounts: Record<number, number> = {};
        let casterPresent = false;
        for (const c of areaCreatures) {
          for (const cls of c.classes) {
            classCounts[cls.classId] = (classCounts[cls.classId] ?? 0) + 1;
            if (casterClassIds.has(cls.classId)) casterPresent = true;
          }
        }

        areaReports.push({
          area: areaResref,
          areaName: summary.name,
          creatureCount: areaCreatures.length,
          crStats: crs.length > 0 ? {
            min: Math.min(...crs),
            max: Math.max(...crs),
            average: crs.reduce((a, b) => a + b, 0) / crs.length,
            total: totalCR,
            ...(partySize ? { perPartyMember: totalCR / partySize } : {}),
          } : null,
          hpStats: hps.length > 0 ? {
            min: Math.min(...hps),
            max: Math.max(...hps),
            average: hps.reduce((a, b) => a + b, 0) / hps.length,
          } : null,
          composition: {
            classCounts,
            casterPresent,
            note: "Informational only — a caster is not a hard requirement, but one often improves encounter mechanics/variety.",
          },
          creatures: areaCreatures.map(c => ({
            tag: c.tag,
            name: `${c.firstName} ${c.lastName}`.trim(),
            cr: c.cr,
            hp: c.hp,
            classes: c.classes,
          })),
          encounterCount: summary.encounterCount,
        });
      }

      const itemReport = index.items.map(item => ({
        tag: item.tag,
        name: item.name,
        baseItem: item.baseItem,
        cost: item.cost,
        source: item.source,
      }));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({ areas: areaReports, items: itemReport }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "get_module_summary",
    "Get a high-level summary of the entire module.",
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      const index = requireIndex();

      const scriptCount = [...index.resources.values()].filter(r => r.extension === "nss").length;
      const compiledCount = [...index.resources.values()].filter(r => r.extension === "ncs").length;

      // Find quest variables by scanning scripts
      const questVars = new Set<string>();
      for (const [_key, entry] of index.resources) {
        if (entry.extension !== "nss") continue;
        try {
          const { readTextFile } = await import("../nim-tools.js");
          const source = await readTextFile(entry.filePath);
          const regex = /(?:Get|Set|Delete)Local(?:Int|String)\s*\([^,]+,\s*"([^"]+)"/g;
          for (const match of source.matchAll(regex)) {
            questVars.add(match[1]);
          }
        } catch { /* skip */ }
      }

      const summary = {
        moduleName: index.moduleName,
        modPath: index.modPath,
        totalResources: index.resources.size,
        areas: [...index.areas.values()].map(a => ({
          resref: a.resref,
          name: a.name,
          size: `${a.width}x${a.height}`,
          creatures: a.creatureCount,
          placeables: a.placeableCount,
          doors: a.doorCount,
        })),
        totalCreatures: index.creatures.length,
        totalItems: index.items.length,
        dialogs: [...index.dialogs.values()].map(d => ({
          resref: d.resref,
          entries: d.entryCount,
          replies: d.replyCount,
          usedBy: d.usedByCreatures,
        })),
        scripts: { sourceFiles: scriptCount, compiledFiles: compiledCount },
        questVariables: [...questVars],
        uniqueTags: index.tags.size,
        scriptReferences: index.scripts.size,
        loadWarnings: index.loadWarnings,
      };

      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  server.tool(
    "validate_module",
    "Check for broken references across the module (missing scripts, dialogs, items, door links).",
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      const index = requireIndex();
      const errors: Array<{ type: string; message: string; resource?: string }> = [];
      const warnings: Array<{ type: string; message: string; resource?: string }> = [];

      // Check script references: verify .nss or .ncs exists.
      // Base-game scripts resolve from the game's own data at runtime and are
      // never module resources — reporting them is a false positive. A freshly
      // created module references ~10 of them from its own template, so without
      // this filter validate_module fails every module it has just built.
      for (const [scriptResref, usages] of index.scripts) {
        if (isBaseGameScript(scriptResref)) continue;
        const hasSource = index.resources.has(`${scriptResref}.nss`);
        const hasCompiled = index.resources.has(`${scriptResref}.ncs`);
        if (!hasSource && !hasCompiled) {
          for (const usage of usages) {
            errors.push({
              type: "missing_script",
              message: `Script "${scriptResref}" referenced in ${usage.resourceFile} (${usage.usageType}) but not found in module`,
              resource: usage.resourceFile,
            });
          }
        } else if (hasSource && !hasCompiled) {
          warnings.push({
            type: "uncompiled_script",
            message: `Script "${scriptResref}" has source but no compiled .ncs`,
          });
        }
      }

      // Check dialog references: verify .dlg exists for each creature conversation
      for (const creature of index.creatures) {
        if (creature.conversation) {
          const dlgKey = `${creature.conversation}.dlg`;
          if (!index.resources.has(dlgKey)) {
            errors.push({
              type: "missing_dialog",
              message: `Creature "${creature.tag}" references dialog "${creature.conversation}" but ${dlgKey} not found`,
              resource: `${creature.area}.git`,
            });
          }
        }
      }

      // Check door links: verify linked areas/tags exist
      for (const [areaResref] of index.areas) {
        const gitDoc = index.parsedGff.get(`${areaResref}.git`);
        if (!gitDoc) continue;
        const doors = getFieldList(gitDoc as GffObj, "Door List");
        for (const door of doors) {
          const linkedTo = getFieldStr(door, "LinkedTo");
          if (linkedTo) {
            // LinkedTo can reference a waypoint tag or door tag in another area
            const linkedToFlags = (door as GffObj).LinkedToFlags as { value?: number } | undefined;
            const flags = linkedToFlags?.value ?? 0;
            if (flags === 2) {
              // Links to an area
              if (!index.areas.has(linkedTo)) {
                errors.push({
                  type: "broken_door_link",
                  message: `Door "${getFieldStr(door, "Tag")}" in ${areaResref} links to area "${linkedTo}" which doesn't exist`,
                  resource: `${areaResref}.git`,
                });
              }
            } else if (flags === 1) {
              // Links to a door tag — check if any door has that tag
              const tagLocations = index.tags.get(linkedTo);
              if (!tagLocations || tagLocations.length === 0) {
                warnings.push({
                  type: "unresolved_door_link",
                  message: `Door "${getFieldStr(door, "Tag")}" in ${areaResref} links to tag "${linkedTo}" which wasn't found`,
                  resource: `${areaResref}.git`,
                });
              }
            }
          }
        }
      }

      // Check equipped item resrefs on creatures
      for (const [areaResref] of index.areas) {
        const gitDoc = index.parsedGff.get(`${areaResref}.git`);
        if (!gitDoc) continue;
        const creatures = getFieldList(gitDoc as GffObj, "Creature List");
        for (const creature of creatures) {
          const tag = getFieldStr(creature, "Tag");
          const equipItems = getFieldList(creature, "Equip_ItemList");
          for (const item of equipItems) {
            const resref = getFieldStr(item, "TemplateResRef");
            // Stock equipment carried along by a cloned creature resolves at
            // runtime; flagging it produces two false warnings per creature.
            if (resref && !isBaseGameResource(resref) && !index.resources.has(`${resref}.uti`)) {
              warnings.push({
                type: "missing_equipped_item",
                message: `Creature "${tag}" in ${areaResref} has equipped item "${resref}" but no matching .uti blueprint in module`,
                resource: `${areaResref}.git`,
              });
            }
          }
        }
      }

      // Cross-area appearance consistency: the same named NPC placed in more
      // than one area (same Tag — the normal way a story character stays
      // addressable by scripts/dialog across areas) should render the same
      // way everywhere, absent a plot reason for a disguise/transformation.
      // Real bug this catches: a "Grosh Ironjaw"-style creature built once
      // per area independently, ending up with two different
      // Race/Appearance_Type/primary-class combinations for what's meant to
      // be one character.
      {
        interface Identity { area: string; race: number; appearance: number; primaryClass: number | undefined }
        const byTag = new Map<string, Identity[]>();
        for (const [areaResref] of index.areas) {
          const gitDoc = index.parsedGff.get(`${areaResref}.git`);
          if (!gitDoc) continue;
          const creatures = getFieldList(gitDoc as GffObj, "Creature List");
          for (const creature of creatures) {
            const tag = getFieldStr(creature, "Tag");
            if (!tag) continue;
            const classList = getFieldList(creature, "ClassList");
            const identity: Identity = {
              area: areaResref,
              race: getFieldNum(creature, "Race"),
              appearance: getFieldNum(creature, "Appearance_Type"),
              primaryClass: classList.length > 0 ? getFieldNum(classList[0], "Class") : undefined,
            };
            const list = byTag.get(tag) ?? [];
            list.push(identity);
            byTag.set(tag, list);
          }
        }
        for (const [tag, instances] of byTag) {
          if (instances.length < 2) continue;
          const first = instances[0];
          const inconsistent = instances.some(
            (i) => i.race !== first.race || i.appearance !== first.appearance || i.primaryClass !== first.primaryClass,
          );
          if (inconsistent) {
            warnings.push({
              type: "cross_area_appearance_mismatch",
              message:
                `Creature tag "${tag}" is placed in ${instances.length} areas (${instances.map((i) => i.area).join(", ")}) ` +
                `with differing Race/Appearance_Type/primary class — likely meant to be the same character rendering ` +
                `inconsistently, unless the plot specifically calls for a disguise or transformation`,
            });
          }
        }
      }

      // OnSpawn lootable/droppable override scanner: a creature's Lootable=1
      // GFF flag (or an equipped/inventory item's Dropable=1) only sets the
      // *default* engine behavior — an OnSpawn script calling the legacy
      // native SetLootable(oCreature, FALSE) / SetDroppableFlag(oItem, FALSE)
      // silently overrides it at runtime, invisible from the GFF alone. See
      // the "Dropable/Lootable can be silently overridden at runtime" pitfall
      // in CLAUDE.md — this closes that detection gap. Static analysis only
      // (regex over the script's own source); it cannot trace ExecuteScript()
      // call chains into a different script.
      {
        const scriptSources = await loadScriptSources(index);
        const setLootableFalse = /SetLootable\s*\([^,]+,\s*(FALSE|0)\s*\)/i;
        const setDroppableFalse = /SetDroppableFlag\s*\([^,]+,\s*(FALSE|0)\s*\)/i;

        for (const [areaResref] of index.areas) {
          const gitDoc = index.parsedGff.get(`${areaResref}.git`);
          if (!gitDoc) continue;
          const creatures = getFieldList(gitDoc as GffObj, "Creature List");
          for (const creature of creatures) {
            const tag = getFieldStr(creature, "Tag");
            const spawnScript = getFieldStr(creature, "ScriptSpawn");
            if (!spawnScript) continue;
            const source = scriptSources.get(spawnScript.toLowerCase());
            if (!source) continue;

            if (getFieldNum(creature, "Lootable") === 1 && setLootableFalse.test(source)) {
              warnings.push({
                type: "onspawn_overrides_lootable",
                message: `Creature "${tag}" in ${areaResref} has Lootable=1 but its OnSpawn script "${spawnScript}" calls SetLootable(..., FALSE) — this silently overrides the flag at runtime and nothing will drop`,
                resource: `${areaResref}.git`,
              });
            }

            const equipList = getFieldList(creature, "Equip_ItemList");
            const invList = getFieldList(creature, "ItemList");
            const hasDropableItem = [...equipList, ...invList].some((it) => getFieldNum(it, "Dropable") === 1);
            if (hasDropableItem && setDroppableFalse.test(source)) {
              warnings.push({
                type: "onspawn_overrides_droppable",
                message: `Creature "${tag}" in ${areaResref} carries at least one Dropable=1 item but its OnSpawn script "${spawnScript}" calls SetDroppableFlag(..., FALSE) — this silently overrides the flag at runtime for whatever item(s) it targets`,
                resource: `${areaResref}.git`,
              });
            }
          }
        }
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            errorCount: errors.length,
            warningCount: warnings.length,
            errors,
            warnings,
          }, null, 2),
        }],
      };
    }
  );

  // ─── suggest_encounter ────────────────────────────────────────────────

  /** NWN CR→XP table (CR 1-20 for single creature vs party of 1) */
  const CR_XP: Record<number, number> = {
    1: 50, 2: 100, 3: 150, 4: 200, 5: 250, 6: 300, 7: 350, 8: 400,
    9: 450, 10: 500, 11: 550, 12: 600, 13: 650, 14: 700, 15: 750,
    16: 800, 17: 850, 18: 900, 19: 950, 20: 1000,
  };

  const DIFFICULTY_MULT: Record<string, number> = {
    easy: 0.5, medium: 1.0, hard: 1.5, deadly: 2.0,
  };

  server.tool(
    "suggest_encounter",
    "Advisory tool: suggest creature compositions for a given party level and size. Read-only, does not modify anything.",
    {
      partyLevel: numParam("Average party level (1-40)"),
      partySize: optNumParam("Number of party members (default 1)"),
      difficulty: z.string().optional().describe("Difficulty: 'easy', 'medium', 'hard', 'deadly' (default 'medium')"),
      theme: z.string().optional().describe("Creature theme filter (substring match on tag/name)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ partyLevel, partySize, difficulty, theme }) => {
      const level = toI(partyLevel);
      const size = toI(partySize, 1);
      const mult = DIFFICULTY_MULT[(difficulty || "medium").toLowerCase()] ?? 1.0;
      const index = requireIndex();

      // XP budget
      const xpBudget = Math.round(level * 100 * size * mult);

      // Gather creature blueprints from module
      const creatures: Array<{ resref: string; tag: string; name: string; cr: number }> = [];
      for (const [key, doc] of index.parsedGff) {
        if (!key.endsWith(".utc")) continue;
        const obj = doc as GffObj;
        const tag = getFieldStr(obj, "Tag");
        const name = getFieldLocStr(obj, "FirstName") || tag;
        const cr = getFieldNum(obj, "ChallengeRating");
        if (cr <= 0) continue;

        if (theme) {
          const themeLower = theme.toLowerCase();
          if (!tag.toLowerCase().includes(themeLower) && !name.toLowerCase().includes(themeLower)) continue;
        }

        creatures.push({ resref: key.replace(".utc", ""), tag, name, cr });
      }

      if (creatures.length === 0) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              xpBudget,
              note: theme ? `No creature blueprints matching theme "${theme}"` : "No creature blueprints found in module",
              suggestions: [],
            }, null, 2),
          }],
        };
      }

      // Group by CR
      const byCR = new Map<number, typeof creatures>();
      for (const c of creatures) {
        const arr = byCR.get(c.cr) || [];
        arr.push(c);
        byCR.set(c.cr, arr);
      }

      const suggestions: Array<{ type: string; creatures: Array<{ resref: string; name: string; cr: number }>; totalXP: number }> = [];

      const getXP = (cr: number) => CR_XP[Math.round(cr)] || Math.round(cr * 50);

      // Boss suggestion: single high-CR creature
      const bossTargetCR = level + Math.ceil(mult);
      for (const cr of [bossTargetCR, bossTargetCR - 1, bossTargetCR + 1]) {
        const available = byCR.get(cr);
        if (available && available.length > 0) {
          const pick = available[0];
          suggestions.push({
            type: "Boss (single)",
            creatures: [{ resref: pick.resref, name: pick.name, cr: pick.cr }],
            totalXP: getXP(pick.cr) * size,
          });
          break;
        }
      }

      // Squad suggestion: 3-4 creatures at party level or below
      const squadCR = Math.max(1, level - 1);
      const squadPool = byCR.get(squadCR) || byCR.get(level) || [];
      if (squadPool.length > 0) {
        const count = Math.min(3 + Math.floor(mult), squadPool.length);
        const picks = squadPool.slice(0, count);
        suggestions.push({
          type: `Squad (${count}x)`,
          creatures: picks.map(p => ({ resref: p.resref, name: p.name, cr: p.cr })),
          totalXP: picks.reduce((sum, p) => sum + getXP(p.cr), 0) * size,
        });
      }

      // Swarm: 5+ low-CR creatures
      const swarmCR = Math.max(1, level - 3);
      const swarmPool = byCR.get(swarmCR) || byCR.get(Math.max(1, level - 2)) || [];
      if (swarmPool.length > 0) {
        const count = Math.min(5 + Math.floor(mult * 2), 8);
        const pick = swarmPool[0];
        const swarmCreatures = Array.from({ length: count }, () => ({ resref: pick.resref, name: pick.name, cr: pick.cr }));
        suggestions.push({
          type: `Swarm (${count}x)`,
          creatures: swarmCreatures,
          totalXP: count * getXP(pick.cr) * size,
        });
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            partyLevel: level,
            partySize: size,
            difficulty: difficulty || "medium",
            xpBudget,
            availableCreatures: creatures.length,
            suggestions,
          }, null, 2),
        }],
      };
    },
  );

  // ─── check_area_connectivity ──────────────────────────────────────────

  server.tool(
    "check_area_connectivity",
    "Check if all areas are reachable from the module start area via door/trigger transitions. Returns reachable/unreachable areas and the transition graph.",
    {
      startArea: z.string().optional().describe("Start area resref (defaults to module entry area from IFO)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ startArea }) => {
      const index = requireIndex();

      // Determine start area
      let start = startArea?.toLowerCase();
      if (!start) {
        const ifoDoc = index.parsedGff.get("module.ifo");
        if (ifoDoc) {
          start = getFieldStr(ifoDoc as GffObj, "Mod_Entry_Area");
        }
      }
      if (!start || !index.areas.has(start)) {
        return { content: [{ type: "text", text: `Start area "${start || "(none)"}" not found in module.` }] };
      }

      // Build transition graph
      const tagToArea = buildTagToAreaMap(index);
      const graph: Record<string, string[]> = {};
      for (const [areaResref] of index.areas) {
        const transitions = buildAreaTransitions(index, areaResref, tagToArea);
        const targets = [...new Set(transitions.map(t => t.targetArea))];
        graph[areaResref] = targets;
      }

      // BFS from start
      const reachable = new Set<string>();
      const queue = [start];
      reachable.add(start);
      while (queue.length > 0) {
        const current = queue.shift()!;
        for (const neighbor of (graph[current] || [])) {
          if (!reachable.has(neighbor)) {
            reachable.add(neighbor);
            queue.push(neighbor);
          }
        }
      }

      const allAreas = [...index.areas.keys()];
      const unreachable = allAreas.filter(a => !reachable.has(a));

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            startArea: start,
            reachable: [...reachable],
            unreachable,
            graph,
            fullyConnected: unreachable.length === 0,
          }, null, 2),
        }],
      };
    },
  );

  // ─── verify_quest_completability ──────────────────────────────────────

  server.tool(
    "verify_quest_completability",
    "Verify that all quests in the journal are mechanically completable. Traces from quest-start dialog through condition/action scripts to the journal end entry. Checks area reachability for quest objectives.",
    {},
    { readOnlyHint: true, idempotentHint: true },
    async () => {
      const index = requireIndex();

      // Find JRL
      let jrlDoc: GffDocument | null = null;
      for (const [key, doc] of index.parsedGff) {
        if (key.endsWith(".jrl")) {
          jrlDoc = doc;
          break;
        }
      }
      if (!jrlDoc) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "No journal (.jrl) found in module" }) }] };
      }

      const categories = getFieldList(jrlDoc as GffObj, "Categories");
      if (categories.length === 0) {
        return { content: [{ type: "text", text: JSON.stringify({ quests: [], message: "No quests defined" }) }] };
      }

      // Build area reachability
      const tagToArea = buildTagToAreaMap(index);
      const allAreas = [...index.areas.keys()];
      const ifoDoc = index.parsedGff.get("module.ifo");
      const startArea = ifoDoc ? getFieldStr(ifoDoc as GffObj, "Mod_Entry_Area") || allAreas[0] : allAreas[0];

      const reachable = new Set<string>();
      const queue = [startArea];
      reachable.add(startArea);
      while (queue.length > 0) {
        const current = queue.shift()!;
        const transitions = buildAreaTransitions(index, current, tagToArea);
        for (const t of transitions) {
          if (!reachable.has(t.targetArea)) {
            reachable.add(t.targetArea);
            queue.push(t.targetArea);
          }
        }
      }

      // Read all scripts source for AddJournalQuestEntry detection
      const scriptSources = new Map<string, string>();
      for (const [key, entry] of index.resources) {
        if (key.endsWith(".nss") && entry.filePath) {
          try {
            const { readFile } = await import("fs/promises");
            const src = await readFile(entry.filePath, "utf-8");
            scriptSources.set(entry.resref, src);
          } catch { /* skip unreadable */ }
        }
      }

      // Collect all dialog trees
      const dialogTrees = new Map<string, FlatDialogNode[]>();
      for (const [key, doc] of index.parsedGff) {
        if (key.endsWith(".dlg")) {
          try {
            const tree = flattenDialog(doc, 15);
            dialogTrees.set(key.replace(".dlg", ""), tree);
          } catch { /* skip broken dialogs */ }
        }
      }

      // Find which scripts reference which quest tags
      function findScriptsForQuest(questTag: string): { startScripts: string[]; endScripts: string[]; stageScripts: Map<number, string[]> } {
        const startScripts: string[] = [];
        const endScripts: string[] = [];
        const stageScripts = new Map<number, string[]>();

        for (const [resref, src] of scriptSources) {
          const regex = new RegExp(`AddJournalQuestEntry\\s*\\(\\s*"${questTag}"\\s*,\\s*(\\d+)`, "g");
          let match: RegExpExecArray | null;
          while ((match = regex.exec(src)) !== null) {
            const entryId = parseInt(match[1], 10);
            const existing = stageScripts.get(entryId) || [];
            existing.push(resref);
            stageScripts.set(entryId, existing);
          }
        }

        return { startScripts, endScripts, stageScripts };
      }

      // Find which dialog has a script reference
      function findDialogWithScript(scriptResref: string): string | null {
        for (const [dlgResref, tree] of dialogTrees) {
          function searchNode(node: FlatDialogNode): boolean {
            if (node.script === scriptResref) return true;
            for (const child of node.children) {
              if (searchNode(child)) return true;
            }
            return false;
          }
          for (const root of tree) {
            if (searchNode(root)) return dlgResref;
          }
        }
        return null;
      }

      // Find which area a creature with a given dialog is in
      function findNpcArea(dlgResref: string): string | null {
        for (const [areaResref] of index.areas) {
          const gitDoc = index.parsedGff.get(`${areaResref}.git`);
          if (!gitDoc) continue;
          const creatures = getFieldList(gitDoc as GffObj, "Creature List");
          for (const c of creatures) {
            const conv = getFieldStr(c, "Conversation");
            if (conv === dlgResref) return areaResref;
          }
        }
        return null;
      }

      const questResults: Array<Record<string, unknown>> = [];

      for (const quest of categories) {
        const questTag = getFieldStr(quest, "Tag") || "";
        const questName = getFieldLocStr(quest, "Name") || questTag;
        const entries = getFieldList(quest, "EntryList");
        const gaps: string[] = [];

        // Find journal entries and which are end entries
        const journalEntries: Array<{ id: number; text: string; end: boolean }> = [];
        for (const entry of entries) {
          const id = getFieldNum(entry, "ID") ?? 0;
          const text = getFieldLocStr(entry, "Text") || "";
          const end = (getFieldNum(entry, "End") ?? 0) === 1;
          journalEntries.push({ id, text, end });
        }

        if (journalEntries.length === 0) {
          gaps.push("Quest has no journal entries");
        }

        // Check for end entry
        const hasEndEntry = journalEntries.some(e => e.end);
        if (!hasEndEntry) {
          gaps.push("No journal entry marked as 'end' — quest can never complete");
        }

        // Find scripts that advance this quest
        const { stageScripts } = findScriptsForQuest(questTag);

        // Check each journal entry has a script that sets it
        for (const je of journalEntries) {
          const scripts = stageScripts.get(je.id);
          if (!scripts || scripts.length === 0) {
            gaps.push(`Journal entry ${je.id} ("${je.text.substring(0, 40)}...") has no script calling AddJournalQuestEntry("${questTag}", ${je.id})`);
          }
        }

        // Find the quest-giver dialog (first script that sets any stage)
        let questGiverDialog: string | null = null;
        let questGiverArea: string | null = null;
        for (const [, scripts] of stageScripts) {
          for (const s of scripts) {
            const dlg = findDialogWithScript(s);
            if (dlg) {
              questGiverDialog = dlg;
              questGiverArea = findNpcArea(dlg);
              break;
            }
          }
          if (questGiverDialog) break;
        }

        if (!questGiverDialog) {
          gaps.push("Could not find a dialog that triggers this quest — no NPC offers it");
        }

        if (questGiverArea && !reachable.has(questGiverArea)) {
          gaps.push(`Quest-giver NPC is in unreachable area '${questGiverArea}'`);
        }

        questResults.push({
          tag: questTag,
          name: questName,
          stages: journalEntries.length,
          hasEndEntry,
          scriptsFound: stageScripts.size,
          questGiver: questGiverDialog ? { dialog: questGiverDialog, area: questGiverArea } : null,
          completable: gaps.length === 0,
          gaps: gaps.length > 0 ? gaps : undefined,
        });
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            questCount: questResults.length,
            allCompletable: questResults.every(q => q.completable),
            quests: questResults,
          }, null, 2),
        }],
      };
    },
  );
}
