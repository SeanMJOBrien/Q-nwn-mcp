/**
 * create_dm_area: every module gets the fixed DM area (rule 2026-11-09) and two books in its chest.
 * The area is never redesigned: it is the committed template `src/templates/dm_area.{are,git,gic}` (2x2 City Exterior,
 * no wind or sound, always daytime, a DM_AREA waypoint and the chest `dm_chest`). Only the books in the chest change.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { gffToJson, jsonToGff } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldStr, setField } from "../types/gff.js";
import { adventureFile } from "../util/adventure-dir.js";
import { DM_AREA_RESREF, DM_CHEST_TAG, bookBlueprint, bookSpecs } from "../util/dm-books.js";
import { getGitDoc, writeBackGit } from "../util/git-helpers.js";

const TEMPLATES_DIR = path.join(import.meta.dirname, "..", "templates");

async function readIfExists(file: string): Promise<string | undefined> {
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    return undefined;
  }
}

export function registerDmAreaTools(server: McpServer): void {
  server.tool(
    "create_dm_area",
    "Give the loaded module its DM area and the two books in its chest (rule: every module has a disconnected DM area with a chest holding the full story and the DM guide). " +
      "Copies the fixed template area `dm_area` (2x2 City Exterior, no wind or sound, always daytime, a DM_AREA waypoint, the chest `dm_chest`) into the module unless it is already there, " +
      "then writes the books: the story from the adventure directory's adventure.md and the DM guide from dm-guide.md (or the story/guide parameters), split into volumes when long, " +
      "replacing any earlier books. The area is never redesigned and nothing links to it. Run repack_module afterwards.",
    {
      story: z.string().optional().describe("Story text for the story book (default: adventure.md in the adventure directory)"),
      guide: z.string().optional().describe("DM guide text (default: dm-guide.md in the adventure directory)"),
      title: z.string().optional().describe("Title used in the book names (default: the module name)"),
    },
    { destructiveHint: true, idempotentHint: true },
    async ({ story, guide, title }) => {
      const index = requireIndex();
      const bookTitle = title ?? index.moduleName;
      const warnings: string[] = [];
      const storyText = story ?? (await readIfExists(await adventureFile(index, "story")));
      const guideText = guide ?? (await readIfExists(await adventureFile(index, "dmGuide")));
      if (!storyText?.trim()) {
        return {
          content: [{ type: "text", text: "No story text: write adventure.md in the adventure directory (adopt_module writes one from a built module) or pass story." }],
          isError: true,
        };
      }
      if (!guideText?.trim()) warnings.push("No DM guide text (dm-guide.md is missing): only the story book was made. Write the guide (/adventure-rewards Phase 7c) and run this again.");

      // 1. The area: copy the template once.
      let copied = false;
      if (!index.resources.has(`${DM_AREA_RESREF}.git`)) {
        for (const ext of ["are", "git", "gic"]) {
          const target = path.join(index.tempDir, `${DM_AREA_RESREF}.${ext}`);
          try {
            await fs.copyFile(path.join(TEMPLATES_DIR, `${DM_AREA_RESREF}.${ext}`), target);
          } catch {
            return { content: [{ type: "text", text: `The DM area template is missing (${DM_AREA_RESREF}.${ext} in ${TEMPLATES_DIR}); run npm run build.` }], isError: true };
          }
          const doc = await gffToJson(target);
          const stat = await fs.stat(target);
          index.resources.set(`${DM_AREA_RESREF}.${ext}`, { resref: DM_AREA_RESREF, extension: ext, filePath: target, sizeBytes: stat.size });
          index.parsedGff.set(`${DM_AREA_RESREF}.${ext}`, doc);
        }
        index.areas.set(DM_AREA_RESREF, {
          resref: DM_AREA_RESREF,
          name: "DM Area",
          width: 2,
          height: 2,
          tileset: "tcn01",
          isInterior: false,
          creatureCount: 0,
          placeableCount: 1,
          doorCount: 0,
          encounterCount: 0,
          triggerCount: 0,
          waypointCount: 1,
        });
        const ifo = index.parsedGff.get("module.ifo") as GffObj | undefined;
        if (ifo) {
          const areaList = getFieldList(ifo, "Mod_Area_list");
          if (!areaList.some((a) => getFieldStr(a, "Area_Name") === DM_AREA_RESREF)) {
            areaList.push({ __struct_id: areaList.length, Area_Name: { type: "resref", value: DM_AREA_RESREF } } as unknown as GffObj);
            const entry = index.resources.get("module.ifo");
            if (entry) await jsonToGff(ifo as GffDocument, entry.filePath);
          }
        }
        copied = true;
      }

      // 2. The books.
      const { doc: gitDoc, obj: git } = getGitDoc(index, DM_AREA_RESREF);
      const chest = getFieldList(git, "Placeable List").find((p) => getFieldStr(p, "Tag") === DM_CHEST_TAG);
      if (!chest) {
        return { content: [{ type: "text", text: `${DM_AREA_RESREF} has no chest tagged ${DM_CHEST_TAG}; delete the area and run create_dm_area again to copy the template.` }], isError: true };
      }
      setField(chest, "HasInventory", "byte", 1);
      setField(chest, "Useable", "byte", 1);
      if (!chest.ItemList) chest.ItemList = { type: "list", value: [] };
      const items = (chest.ItemList as { value: GffObj[] }).value;
      const keep = items.filter((i) => !getFieldStr(i, "Tag").startsWith("dm_book_"));
      items.length = 0;
      items.push(...keep);

      const specs = [...bookSpecs("story", bookTitle, storyText), ...(guideText?.trim() ? bookSpecs("guide", bookTitle, guideText) : [])];
      for (const spec of specs) {
        const doc = bookBlueprint(spec);
        const file = path.join(index.tempDir, `${spec.resref}.uti`);
        await jsonToGff(doc, file);
        const stat = await fs.stat(file);
        index.resources.set(`${spec.resref}.uti`, { resref: spec.resref, extension: "uti", filePath: file, sizeBytes: stat.size });
        index.parsedGff.set(`${spec.resref}.uti`, doc);
        const item = JSON.parse(JSON.stringify(doc)) as GffObj;
        delete item.__data_type;
        item.__struct_id = 0;
        const slot = items.length;
        setField(item, "Repos_PosX", "word", slot % 6);
        setField(item, "Repos_Posy", "word", Math.floor(slot / 6));
        items.push(item);
      }
      await writeBackGit(index, DM_AREA_RESREF, gitDoc);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                area: DM_AREA_RESREF,
                areaCopied: copied,
                chest: DM_CHEST_TAG,
                books: specs.map((s) => ({ resref: s.resref, name: s.name, characters: s.text.length })),
                warnings,
                next: "repack_module, then audit_module: the 'DM area and books' row should be done.",
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
