/** build_treasure_catalog / list_treasure_samples / import_treasure_item (TODO #52). See util/treasure-catalog.ts. */

import fs from "fs/promises";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { gffToJson, jsonToGff } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { adventureBase } from "../util/adventure-dir.js";
import { setField } from "../types/gff.js";
import { optNumParam } from "../util/params.js";
import { resolveBlueprint } from "../util/git-helpers.js";
import { buildResmanOptions } from "../module-loader.js";
import { resrefError } from "../util/resref.js";
import { writeAndCompileScript } from "../util/script-writer.js";
import {
  addToPool,
  emptyPool,
  generateTreasureInclude,
  generateTreasureOpenScript,
  kindOfGroup,
  poolSize,
  TREASURE_INCLUDE,
  TREASURE_OPEN_SCRIPT,
} from "../util/treasure-script.js";
import { errorResult } from "../util/tool-result.js";
import {
  aggregateTreasure,
  type ItemSummary,
  queryTreasureCategories,
  queryTreasureItems,
  summarizeItem,
  type TreasureFile,
  type TreasureLookups,
  treasureMarkdown,
} from "../util/treasure-catalog.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CATALOG_FILE = path.join(import.meta.dirname, "..", "data", "treasure-catalog.json");
const rawDir = () => path.join(adventureBase(), "_catalog");

async function readBlueprint(file: string): Promise<GffObj> {
  if (file.endsWith(".json")) return JSON.parse(await fs.readFile(file, "utf8")) as GffObj;
  return (await gffToJson(file)) as unknown as GffObj;
}

function text(o: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(o, null, 2) }] };
}


type Rows = Map<number, Record<string, string>>;

/** Parse a .2da file's text into rows keyed by row number (quoted cells allowed). */
export function parseTwoDaRows(text: string): Rows {
  const lines = text.split(/\r?\n/);
  const cols = (lines[2] ?? "").trim().split(/\s+/);
  const rows: Rows = new Map();
  for (const l of lines.slice(3)) {
    if (!l.trim()) continue;
    const toks = (l.match(/"[^"]*"|\S+/g) ?? []).map((t) => t.replace(/^"|"$/g, ""));
    const r: Record<string, string> = {};
    cols.forEach((c, i) => {
      r[c] = toks[i + 1] ?? "";
    });
    rows.set(Number(toks[0]), r);
  }
  return rows;
}

/** Base-item and item-property lookups from the loaded module's 2DAs; a world's own 2DA folder (override/development) wins where it has a table. */
export async function treasureLookups(index: import("../types/module.js").ModuleIndex, twodaFolder?: string): Promise<TreasureLookups> {
  const tables = new Map<string, Rows>();
  for (const name of ["baseitems", "itempropdef"]) {
    const own = index.twodaTables.get(name)?.rows;
    if (own) tables.set(name, own);
    if (twodaFolder) {
      try {
        tables.set(name, parseTwoDaRows(await fs.readFile(path.join(twodaFolder, `${name}.2da`), "utf8")));
      } catch {
        /* the folder does not override this table */
      }
    }
  }
  const cell = (name: string, col: string, n: number): string | undefined => {
    const row = tables.get(name)?.get(n);
    return row?.[col] ?? row?.[col.toLowerCase()];
  };
  return {
    baseItemLabel: (n) => cell("baseitems", "label", n) ?? `item${n}`,
    baseItemSlots: (n) => {
      const v = cell("baseitems", "EquipableSlots", n) ?? "0";
      const parsed = v.toLowerCase().startsWith("0x") ? Number.parseInt(v, 16) : Number.parseInt(v, 10);
      return Number.isFinite(parsed) ? parsed : 0;
    },
    propName: (n) => cell("itempropdef", "Label", n) ?? `prop${n}`,
  };
}

export interface TreasureRun {
  items: number;
  usable: number;
  categories: number;
  rawSummaries: string;
  blueprintsCopied: number;
  general: string[];
  failed: string[];
}

/** The work of build_treasure_catalog, callable without the MCP layer (scripts, tests). */
export async function runTreasureBuild(
  index: import("../types/module.js").ModuleIndex,
  opts: { source: string; writeGeneral?: boolean; twodaFolder?: string },
): Promise<TreasureRun | { error: string }> {
  const files = (await fs.readdir(opts.source)).filter((f) => f.endsWith(".uti.json") || f.endsWith(".uti")).sort();
  if (files.length === 0) return { error: `No .uti or .uti.json files in ${opts.source}` };
  const look = await treasureLookups(index, opts.twodaFolder);
  const summaries: ItemSummary[] = [];
  const failed: string[] = [];
  const bpDir = path.join(rawDir(), "treasure-blueprints");
  await fs.mkdir(bpDir, { recursive: true });
  let copied = 0;
  for (const f of files) {
    const resref = f.split(".")[0].toLowerCase();
    try {
      const doc = await readBlueprint(path.join(opts.source, f));
      const s = summarizeItem(doc, resref, look);
      summaries.push(s);
      await fs.writeFile(path.join(bpDir, `${resref}.uti.json`), JSON.stringify(doc));
      copied++;
    } catch (e) {
      failed.push(`${f}: ${e}`);
    }
  }
  const usable = summaries.filter((s) => !s.plot && s.cost > 0);
  const categories = aggregateTreasure(summaries);
  const file: TreasureFile = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      items: files.length,
      categorised: usable.length,
      excluded: [
        { reason: "plot items and items with no value (quest tokens, placeholders)", count: summaries.length - usable.length },
        ...(failed.length ? [{ reason: "unreadable", count: failed.length }] : []),
      ].filter((e) => e.count > 0),
    },
    categories,
  };
  await fs.writeFile(path.join(rawDir(), "treasure.json"), `${JSON.stringify(summaries, null, 1)}\n`);
  let general: string[] = [];
  if (opts.writeGeneral) {
    await fs.writeFile(path.join(REPO_ROOT, "src", "data", "treasure-catalog.json"), `${JSON.stringify(file, null, 1)}\n`);
    await fs.writeFile(path.join(REPO_ROOT, "docs", "treasure-catalog.md"), `${treasureMarkdown(file)}\n`);
    general = ["src/data/treasure-catalog.json", "docs/treasure-catalog.md"];
  }
  return {
    items: files.length,
    usable: usable.length,
    categories: categories.length,
    rawSummaries: path.join(rawDir(), "treasure.json"),
    blueprintsCopied: copied,
    general,
    failed: failed.slice(0, 5),
  };
}

async function loadGeneral(): Promise<TreasureFile | undefined> {
  try {
    return JSON.parse(await fs.readFile(CATALOG_FILE, "utf8")) as TreasureFile;
  } catch {
    return undefined;
  }
}

async function loadItems(): Promise<ItemSummary[]> {
  try {
    return JSON.parse(await fs.readFile(path.join(rawDir(), "treasure.json"), "utf8")) as ItemSummary[];
  } catch {
    return [];
  }
}

export function registerTreasureCatalogTools(server: McpServer): void {
  server.tool(
    "build_treasure_catalog",
    "Read a folder of item blueprints (a hand-built world's uti folder: nasher `*.uti.json` or binary `*.uti`), summarise each one (kind, value, tier, level it suits, properties) and group them into a catalog of sample treasure by kind and value tier. " +
      "Needs a loaded module (for the base-item and item-property 2DAs). Writes the per-item summaries and a copy of every blueprint to the git-ignored adventures/_catalog/, and with writeGeneral also the general reference (ranges and medians per category, no names from the source): src/data/treasure-catalog.json and docs/treasure-catalog.md. " +
      "A developer tool; builders use list_treasure_samples and import_treasure_item.",
    {
      source: z.string().describe("Folder holding the item blueprints (e.g. ~/git/the-frozen-north/src/uti)"),
      writeGeneral: z.boolean().optional().describe("Also write src/data/treasure-catalog.json and docs/treasure-catalog.md (default false)"),
      twodaFolder: z.string().optional().describe("The world's own 2DA folder (its override or development folder), whose baseitems.2da and itempropdef.2da name custom base items and properties (e.g. ~/git/the-frozen-north/override)"),
    },
    { destructiveHint: true },
    async ({ source, writeGeneral, twodaFolder }) => {
      const r = await runTreasureBuild(requireIndex(), { source, writeGeneral, twodaFolder });
      if ("error" in r) return errorResult(r.error);
      return text({ success: true, ...r });
    },
  );

  server.tool(
    "list_treasure_samples",
    "Find sample treasure near a character level or a gold value, by kind (weapon, armor, shield, helmet, ring, amulet, cloak, boots, gloves, belt, ranged, ammo, thrown, potion, scroll, wand, gem), value tier (1-5) and property. " +
      "Returns the nearest categories from the project's treasure catalog (value range, levels it suits, how often it carries a bonus, common properties) and, when the per-item summaries are present, individual sample items with their name, value and properties. " +
      "Use it to choose rewards that fit the party's level (one reward is about a third of a level's wealth at most), then import_treasure_item to put a chosen sample into the module renamed. Filters are substring matches.",
    {
      level: optNumParam("Character level the treasure is for (sorts nearest first)"),
      value: optNumParam("Target item value in gold (when no level)"),
      group: z.string().optional().describe("Kind: weapon, armor, shield, helmet, ring, amulet, cloak, boots, gloves, belt, ranged, ammo, thrown, potion, scroll, wand, gem"),
      tier: optNumParam("Value tier 1-5 (1 under 175 gp, 2 from 175, 3 from 2,000, 4 from 7,000, 5 from 16,000)"),
      property: z.string().optional().describe("Item property name, e.g. damage, saving, ability, enhancement, regeneration"),
      limit: optNumParam("Maximum results per list (default 8)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ level, value, group, tier, property, limit }) => {
      const general = await loadGeneral();
      if (!general) {
        return errorResult(
          "The treasure catalog is missing (src/data/treasure-catalog.json). Generate it with build_treasure_catalog (writeGeneral: true) and rebuild.",
        );
      }
      const q = {
        level: level !== undefined ? Number(level) : undefined,
        value: value !== undefined ? Number(value) : undefined,
        group,
        tier: tier !== undefined ? Number(tier) : undefined,
        property,
        limit: limit !== undefined ? Number(limit) : undefined,
      };
      const items = await loadItems();
      return text({
        catalog: { generated: general.generated, items: general.source.items, categories: general.categories.length },
        categories: queryTreasureCategories(general.categories, q),
        samples: items.length
          ? queryTreasureItems(items, q).map((s) => ({
              resref: s.resref,
              name: s.name,
              kind: s.group,
              baseItem: s.baseLabel,
              gold: s.cost,
              tier: s.tier,
              level: s.level,
              bonus: s.enchant || undefined,
              properties: s.props.map((p) => p.name),
              use: `import_treasure_item(sample: "${s.resref}")`,
            }))
          : "no per-item summaries (adventures/_catalog/treasure.json): run build_treasure_catalog on a source folder to get named samples",
      });
    },
  );

  server.tool(
    "import_treasure_item",
    "Put a sample from the treasure catalog into the loaded module as an item blueprint (.uti), with its own resref, tag and name, so a reward, container or store can use it. Copies value, base item, appearance and properties from the sample; give it a new name (the source's own names are not meant to ship). " +
      "Find samples with list_treasure_samples. Needs the per-item copies built by build_treasure_catalog.",
    {
      sample: z.string().describe("Resref of the catalog sample (from list_treasure_samples)"),
      resref: z.string().describe("New item resref in the module"),
      name: z.string().describe("Display name for the item"),
      tag: z.string().optional().describe("Item tag (default: the new resref, upper-case)"),
      description: z.string().optional().describe("Item description (default: none)"),
    },
    { destructiveHint: true },
    async ({ sample, resref, name, tag, description }) => {
      {
        const bad = resrefError(resref);
        if (bad) return bad;
      }
      const index = requireIndex();
      const key = `${resref.toLowerCase()}.uti`;
      if (index.resources.has(key)) return errorResult(`Resource already exists: ${key}`);
      let doc: GffObj;
      try {
        doc = JSON.parse(await fs.readFile(path.join(rawDir(), "treasure-blueprints", `${sample.toLowerCase()}.uti.json`), "utf8")) as GffObj;
      } catch {
        return errorResult(`No catalog sample "${sample}" (adventures/_catalog/treasure-blueprints). Build the catalog with build_treasure_catalog first.`);
      }
      const resrefLower = resref.toLowerCase();
      setField(doc, "Tag", "cexostring", tag ?? resref.toUpperCase());
      setField(doc, "TemplateResRef", "resref", resrefLower);
      doc.LocalizedName = { type: "cexolocstring", value: { "0": name } };
      const desc = { type: "cexolocstring", value: { "0": description ?? "" } };
      doc.Description = desc;
      doc.DescIdentified = { ...desc };
      setField(doc, "Identified", "byte", 1);
      setField(doc, "Plot", "byte", 0);
      const file = path.join(index.tempDir, key);
      await jsonToGff(doc as unknown as GffDocument, file);
      const stat = await fs.stat(file);
      index.resources.set(key, { resref: resrefLower, extension: "uti", filePath: file, sizeBytes: stat.size });
      index.parsedGff.set(key, doc as unknown as GffDocument);
      return text({ success: true, created: key, name, from: sample, sizeBytes: stat.size });
    },
  );
  server.tool(
    "create_treasure_system",
    "Write the random-treasure include (inc_treasure) and a container OnOpen script (a_trs_open) into the module: The Frozen North's loot selection, ported. A random item is picked by kind (potions most common, then jewels, scrolls, melee, ranged, apparel, armour, ...) and value tier, and the tier weights follow the area's challenge rating (tier 1 always, tier 2 grows with the CR, tiers 3, 4 and 5 start to appear around CR 7, 10 and 13). " +
      "The pool is baked from the item blueprints already in the module (hand-made, or imported with import_treasure_item) plus any base-game resrefs you list; plot items and free items are left out. " +
      "Usage in scripts: TR_Fill(oContainer, nCR, fQuantity, nMask, fQuality, nGuaranteed), TR_AddItem, TR_RollItem. Zero-code: set a container's OnOpen to a_trs_open and put locals on it, its area or the module: TR_CR (int, default 1), TR_QUANTITY (float, 1.0 usual, 1.75 medium, 3.0 rich), TR_QUALITY (float, 0.0 usual, -0.2 better, 0.4 worse, -0.7 boss), TR_MASK (int kinds), TR_GUARANTEED (int). Re-run it after adding items to refresh the pool.",
    {
      extraItems: z.string().optional().describe('JSON array of base-game item resrefs to add to the pool, e.g. ["nw_wswls001","nw_it_mpotion020"]'),
      includeModuleItems: z.boolean().optional().describe("Add every non-plot item blueprint in the module to the pool (default true)"),
      minValue: optNumParam("Leave out items worth less than this many gold (default 1)"),
    },
    { destructiveHint: true },
    async ({ extraItems, includeModuleItems, minValue }) => {
      const index = requireIndex();
      const look = await treasureLookups(index);
      const pool = emptyPool();
      const floor = minValue !== undefined ? Number(minValue) : 1;
      const skipped: string[] = [];
      const counts: Record<string, number> = {};
      const add = (doc: GffObj, resref: string) => {
        const s = summarizeItem(doc, resref, look);
        if (s.plot || s.cost < floor) {
          skipped.push(resref);
          return;
        }
        const kind = kindOfGroup(s.group);
        addToPool(pool, kind, s.tier, resref);
        counts[s.group] = (counts[s.group] ?? 0) + 1;
      };
      if (includeModuleItems !== false) {
        for (const [key, res] of index.resources) {
          if (res.extension !== "uti") continue;
          try {
            const doc = (index.parsedGff.get(key) as GffObj | undefined) ?? ((await gffToJson(res.filePath)) as unknown as GffObj);
            add(doc, res.resref);
          } catch {
            skipped.push(res.resref);
          }
        }
      }
      if (extraItems) {
        let list: string[];
        try {
          list = JSON.parse(extraItems) as string[];
        } catch {
          return errorResult("extraItems must be a JSON array of resrefs");
        }
        const resman = await buildResmanOptions(index);
        for (const r of list) {
          const doc = await resolveBlueprint(index, r, "uti", resman);
          if (!doc) skipped.push(`${r} (not found)`);
          else add(doc as unknown as GffObj, r.toLowerCase());
        }
      }
      if (poolSize(pool) === 0) return errorResult("The pool is empty: no item blueprints in the module and no extraItems. Import some with import_treasure_item or list base-game resrefs in extraItems.");
      const inc = await writeAndCompileScript(index, TREASURE_INCLUDE, generateTreasureInclude(pool), false);
      const open = await writeAndCompileScript(index, TREASURE_OPEN_SCRIPT, generateTreasureOpenScript(), true);
      const ok = open.compiled === true;
      return text({
        success: ok,
        written: [inc.written, open.written],
        compiles: ok,
        ...(ok ? {} : { compilerOutput: open.compilerOutput }),
        poolItems: poolSize(pool),
        byKind: counts,
        skipped: skipped.slice(0, 10),
        usage: "container OnOpen = a_trs_open, with TR_CR / TR_QUANTITY / TR_QUALITY locals; or TR_Fill(oContainer, nCR, ...) in any script that #includes inc_treasure",
      });
    },
  );
}
