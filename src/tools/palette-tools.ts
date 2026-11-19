/**
 * update_creature_palette: every creature blueprint of the module in the custom creature palette, so the DM client's
 * Custom tab (and the toolset) offers it (util/creature-palette.ts). repack_module runs the same rebuild before each
 * build, so a built module always carries the full palette.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex } from "../module-loader.js";
import { jsonToGff, gffToJson } from "../nim-tools.js";
import type { GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { type PaletteResult, rebuildCreaturePalette } from "../util/creature-palette.js";

const KEY = "creaturepalcus.itp";

/** Rebuild the palette's creature entries and write the palette (and any blueprint whose PaletteID changed). */
export async function applyCreaturePalette(index: ModuleIndex): Promise<PaletteResult | { error: string }> {
  const entry = index.resources.get(KEY);
  if (!entry) return { error: `the module has no ${KEY} (create_module writes one)` };
  let doc = index.parsedGff.get(KEY);
  if (!doc) {
    doc = await gffToJson(entry.filePath);
    index.parsedGff.set(KEY, doc);
  }
  const result = rebuildCreaturePalette(index, doc as GffObj);
  await jsonToGff(doc, entry.filePath);
  for (const resref of result.paletteIdsSet) {
    const r = index.resources.get(`${resref}.utc`);
    const utc = index.parsedGff.get(`${resref}.utc`);
    if (r && utc) await jsonToGff(utc, r.filePath);
  }
  return result;
}

export function registerPaletteTools(server: McpServer): void {
  server.tool(
    "update_creature_palette",
    "Put every creature blueprint of the module into the custom creature palette (creaturepalcus.itp), each in the category its PaletteID names (player races under NPCs by race, others under Special > Custom 1), so a DM can spawn any of them from the DM client's Custom tab and the toolset lists them. Stale entries are removed. repack_module does this before every build.",
    {},
    { idempotentHint: true },
    async () => {
      const r = await applyCreaturePalette(requireIndex());
      if ("error" in r) return { isError: true, content: [{ type: "text" as const, text: JSON.stringify({ success: false, error: r.error }, null, 2) }] };
      return { content: [{ type: "text" as const, text: JSON.stringify({ success: true, ...r, paletteIdsSet: r.paletteIdsSet.length }, null, 2) }] };
    },
  );
}
