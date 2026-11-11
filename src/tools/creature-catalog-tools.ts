/** build_creature_catalog / list_creature_samples (TODO #51). See util/creature-catalog.ts. */

import fs from "fs/promises";
import os from "os";
import path from "path";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import { gffToJson, resmanExtract } from "../nim-tools.js";
import { extractSalvaging } from "../util/batch-extract.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import { adventureBase } from "../util/adventure-dir.js";
import {
  aggregateCatalog,
  type CatalogFile,
  catalogMarkdown,
  type CatalogLookups,
  type CreatureSummary,
  querySamples,
  summarizeCreature,
} from "../util/creature-catalog.js";
import { optNumParam } from "../util/params.js";
import { errorResult } from "../util/tool-result.js";

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");
const CATALOG_FILE = path.join(import.meta.dirname, "..", "data", "creature-catalog.json");

async function readBlueprint(file: string): Promise<GffObj> {
  if (file.endsWith(".json")) return JSON.parse(await fs.readFile(file, "utf8")) as GffObj;
  return (await gffToJson(file)) as unknown as GffObj;
}

export interface CatalogRun {
  blueprints: number;
  categorised: number;
  categories: number;
  rawSummaries: string;
  general: string[];
  failed: string[];
}

/** The work of build_creature_catalog, callable without the MCP layer (scripts, tests). */
export async function runCatalogBuild(
  index: import("../types/module.js").ModuleIndex,
  opts: { source: string; itemsFolder?: string; writeGeneral?: boolean },
): Promise<CatalogRun | { error: string }> {
  const { source, itemsFolder, writeGeneral } = opts;
  const err = (error: string) => ({ error });
  const files = (await fs.readdir(source)).filter((f) => f.endsWith(".utc.json") || f.endsWith(".utc")).sort();
  if (files.length === 0) return err(`No .utc or .utc.json files in ${source}`);
  const items = new Map<string, number>();
  const itemsDir = itemsFolder ?? path.join(path.dirname(source), "uti");
  for (const f of await fs.readdir(itemsDir).catch(() => [] as string[])) {
    if (!f.endsWith(".uti.json") && !f.endsWith(".uti")) continue;
    try {
      items.set(f.split(".")[0].toLowerCase(), getFieldNum(await readBlueprint(path.join(itemsDir, f)), "BaseItem"));
    } catch {
      /* skip unreadable item */
    }
  }
  // Items the source does not define (base-game gear) are looked up in the game's own files, one batched extraction.
  {
    const unknown = new Set<string>();
    for (const f of files) {
      try {
        for (const e of getFieldList(await readBlueprint(path.join(source, f)), "Equip_ItemList")) {
          const r = (getFieldStr(e, "EquippedRes") || getFieldStr(e, "TemplateResRef")).toLowerCase();
          if (r && !items.has(r)) unknown.add(r);
        }
      } catch {
        /* reported later */
      }
    }
    if (unknown.size > 0) {
      const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-catalog-"));
      try {
        const resman = await buildResmanOptions(index);
        await extractSalvaging([...unknown].map((r) => `${r}.uti`), (batch) => resmanExtract(tmp, { ...resman, files: batch }));
        for (const f of await fs.readdir(tmp)) {
          try {
            items.set(f.split(".")[0].toLowerCase(), getFieldNum((await gffToJson(path.join(tmp, f))) as unknown as GffObj, "BaseItem"));
          } catch {
            /* skip */
          }
        }
      } finally {
        await fs.rm(tmp, { recursive: true, force: true });
      }
    }
  }
  const table = (name: string) => index.twodaTables.get(name)?.rows;
  const label = (name: string, col: string, n: number, fallback: string) =>
    table(name)?.get(n)?.[col] ?? table(name)?.get(n)?.[col.toLowerCase()] ?? fallback;
  const classByName = new Map<string, number>();
  for (const [id, row] of table("classes") ?? []) classByName.set((row.Label ?? "").toLowerCase(), id);
  const look: CatalogLookups = {
    raceLabel: (n) => label("racialtypes", "Label", n, `race${n}`),
    className: (n) => label("classes", "Label", n, `class${n}`),
    isPlayerClass: (n) => table("classes")?.get(n)?.PlayerClass === "1",
    baseItemLabel: (n) => label("baseitems", "label", n, `item${n}`),
    itemBaseItem: (r) => items.get(r.toLowerCase()),
  };
  const summaries: CreatureSummary[] = [];
  const failed: string[] = [];
  for (const f of files) {
    try {
      summaries.push(summarizeCreature(await readBlueprint(path.join(source, f)), f.split(".")[0], look));
    } catch (e) {
      failed.push(`${f}: ${e}`);
    }
  }
  const usable = summaries.filter((s) => s.level >= 1);
  const categories = aggregateCatalog(summaries, (name) => classByName.get(name));
  const file: CatalogFile = {
    generated: new Date().toISOString().slice(0, 10),
    source: {
      blueprints: files.length,
      categorised: usable.length,
      excluded: [
        { reason: "no class levels (dummies, stores, placeholders)", count: summaries.length - usable.length },
        ...(failed.length ? [{ reason: "unreadable", count: failed.length }] : []),
      ].filter((e) => e.count > 0),
    },
    categories,
  };
  const rawDir = path.join(adventureBase(), "_catalog");
  await fs.mkdir(rawDir, { recursive: true });
  await fs.writeFile(path.join(rawDir, "creatures.json"), `${JSON.stringify(summaries, null, 1)}\n`);
  let general: string[] = [];
  if (writeGeneral) {
    await fs.mkdir(path.dirname(path.join(REPO_ROOT, "src", "data", "x")), { recursive: true });
    await fs.writeFile(
      path.join(REPO_ROOT, "src", "data", "creature-catalog.json"),
      `${JSON.stringify(file, null, 1)}\n`,
    );
    await fs.writeFile(path.join(REPO_ROOT, "docs", "creature-catalog.md"), `${catalogMarkdown(file)}\n`);
    general = ["src/data/creature-catalog.json", "docs/creature-catalog.md"];
  }
  return {
    blueprints: files.length,
    categorised: usable.length,
    categories: categories.length,
    rawSummaries: path.join(rawDir, "creatures.json"),
    general,
    failed: failed.slice(0, 5),
  };
}

export function registerCreatureCatalogTools(server: McpServer): void {
  server.tool(
    "build_creature_catalog",
    "Read a folder of creature blueprints (a hand-built world's utc folder: nasher `*.utc.json` or binary `*.utc`), summarise each one, and group them into a catalog of samples by type, primary class, level band and role. " +
      "Needs a loaded module (for the racial, class and base-item 2DAs). Writes the per-creature summaries to the git-ignored adventures/_catalog/ folder, and with writeGeneral also the general reference (ranges and medians per category, no names from the source): src/data/creature-catalog.json and docs/creature-catalog.md. " +
      "A developer tool; players of the MCP use list_creature_samples.",
    {
      source: z.string().describe("Folder holding the creature blueprints (e.g. ~/git/the-frozen-north/src/utc)"),
      itemsFolder: z
        .string()
        .optional()
        .describe(
          "Folder holding item blueprints (default: a sibling `uti` folder), to name what a creature's equipped resrefs are",
        ),
      writeGeneral: z
        .boolean()
        .optional()
        .describe("Also write src/data/creature-catalog.json and docs/creature-catalog.md (default false)"),
    },
    { destructiveHint: true },
    async ({ source, itemsFolder, writeGeneral }) => {
      const r = await runCatalogBuild(requireIndex(), { source, itemsFolder, writeGeneral });
      if ("error" in r) return errorResult(r.error);
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...r }, null, 2) }] };
    },
  );

  server.tool(
    "list_creature_samples",
    "Find sample creature categories near a challenge rating or level, by type, class and role, from the project's catalog (statistics of hand-built creatures). Each result gives the ranges to aim for (level, CR, HP, natural AC, abilities, saves, feats, how often it is armoured, shielded, ranged or a caster, common gear) and how to build it: build_key_npc / forge_creature arguments for player classes, or 'place a palette creature of this type' for monsters. " +
      "Use it to pick a template, then rename it, change its appearance and equip it differently while keeping the numbers close, so the challenge stays balanced for the CR. Filters are substring matches.",
    {
      cr: optNumParam("Target challenge rating (sorts nearest first)"),
      level: optNumParam("Target character level (when no CR)"),
      type: z
        .string()
        .optional()
        .describe("Creature type: player-race, undead, animal, beast, vermin, outsider, ... (see the catalog)"),
      class: z
        .string()
        .optional()
        .describe("Primary class: fighter, cleric, wizard, rogue, ranger, undead, animal, ..."),
      role: z.string().optional().describe("standard, boss, semiboss, ambient or familiar"),
      limit: optNumParam("Maximum results (default 8)"),
    },
    { readOnlyHint: true, idempotentHint: true },
    async ({ cr, level, type, class: cls, role, limit }) => {
      let file: CatalogFile;
      try {
        file = JSON.parse(await fs.readFile(CATALOG_FILE, "utf8")) as CatalogFile;
      } catch {
        return errorResult(
          "The creature catalog is missing (src/data/creature-catalog.json). Generate it with build_creature_catalog (writeGeneral: true) and rebuild.",
        );
      }
      const hits = querySamples(file.categories, {
        cr: cr !== undefined ? Number(cr) : undefined,
        level: level !== undefined ? Number(level) : undefined,
        type,
        class: cls,
        role,
        limit: limit !== undefined ? Number(limit) : undefined,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                catalog: {
                  generated: file.generated,
                  blueprints: file.source.blueprints,
                  categories: file.categories.length,
                },
                matches: hits,
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
