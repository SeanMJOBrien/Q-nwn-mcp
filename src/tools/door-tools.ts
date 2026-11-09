/**
 * place_tile_doors — place (and lock) every door a painted area's tiles imply, in one call. The planning is
 * util/tile-doors.ts; this tool resolves the blueprints, writes the Door List and syncs the GIC.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GIT_STRUCT_ID } from "../config.js";
import { buildResmanOptions, requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";
import { degToRad, getGitDoc, resolveBlueprint, updateAreaCounts, writeBackGit } from "../util/git-helpers.js";
import { planTileDoors, type TileCell } from "../util/tile-doors.js";
import { getTilesetInfo } from "../util/tileset.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { checkPositionWalkable } from "../util/walkmesh.js";

export function registerDoorTools(server: McpServer): void {
  server.tool(
    "place_tile_doors",
    "Place every door the painted tiles of an area imply (gates, building doors, corridor archways): reads each tile's .set door placements, resolves the door blueprint through doortypes.2da (never genericdoors.2da), places it at the exact tile-rotated position and bearing, and locks it (Locked, Lockable, Plot) unless it is a corridor doorway. Safe to run twice: a door already within 1 m is left alone. A generic type-0 door (every ttr01 door tile) has no blueprint: pass `genericDoor` to place one, otherwise it is reported in `skipped`. dryRun lists what would be placed.",
    {
      area: z.string().describe("Area resref"),
      dryRun: z.boolean().optional().describe("List the doors without placing them"),
      genericDoor: z
        .string()
        .optional()
        .describe(
          "UTD blueprint for tile doors whose type is 0 (generic, no blueprint in doortypes.2da — every door in ttr01, for example). Only used for those; typed doors keep their own blueprint. e.g. x3_door_wood001",
        ),
    },
    { idempotentHint: true },
    async ({ area, dryRun, genericDoor }) => {
      const index = requireIndex();
      const resmanOpts = await buildResmanOptions(index);
      const a = area.toLowerCase();
      const are = index.parsedGff.get(`${a}.are`) as GffObj | undefined;
      if (!are) return { content: [{ type: "text", text: `Area ${area} not found` }], isError: true };
      const tilesetResref = getFieldStr(are, "Tileset");
      const width = getFieldNum(are, "Width");
      const tileset = await getTilesetInfo(tilesetResref, resmanOpts, index);

      const cells: TileCell[] = getFieldList(are, "Tile_List").map((t, i) => ({
        col: i % width,
        row: Math.floor(i / width),
        tileId: getFieldNum(t, "Tile_ID"),
        orientation: getFieldNum(t, "Tile_Orientation"),
      }));

      const { doc: gitDoc, obj: git } = getGitDoc(index, a);
      const doorList = getFieldList(git, "Door List");
      const existing = doorList.map((d) => ({ x: getFieldNum(d, "X"), y: getFieldNum(d, "Y") }));
      const doorTypes = index.twodaTables.get("doortypes");
      const resrefOf = (type: number): string | undefined => {
        const v = doorTypes?.rows.get(type)?.TemplateResRef;
        if (v && v !== "****") return v.toLowerCase();
        return type === 0 && genericDoor ? genericDoor.toLowerCase() : undefined;
      };
      if (!doorTypes) {
        return {
          content: [{ type: "text", text: "doortypes.2da isn't loaded (set NWN_FOLDER_DATA); can't resolve door blueprints." }],
          isError: true,
        };
      }
      const plan = planTileDoors(cells, tileset.tiles, resrefOf, existing);
      if (dryRun || plan.doors.length === 0) {
        return {
          content: [{ type: "text", text: JSON.stringify({ success: true, placed: 0, dryRun: !!dryRun, plan }, null, 2) }],
        };
      }

      snapshotGitForUndo(gitDoc, a, "place_tile_doors", `Place ${plan.doors.length} tile doors`);
      const placed: Array<{ blueprint: string; x: number; y: number; bearing: number; locked: boolean }> = [];
      const failed: string[] = [];
      for (const d of plan.doors) {
        const utd = await resolveBlueprint(index, d.blueprint, "utd", resmanOpts);
        if (!utd) {
          failed.push(`${d.blueprint}.utd not found (tile ${d.tileId} at ${d.col},${d.row})`);
          continue;
        }
        const obj = utd as GffObj;
        delete obj.__data_type;
        obj.__struct_id = GIT_STRUCT_ID.DOOR;
        const walk = await checkPositionWalkable(d.x, d.y, a, index, resmanOpts);
        obj.X = { type: "float", value: d.x };
        obj.Y = { type: "float", value: d.y };
        obj.Z = { type: "float", value: walk.z ?? 0 };
        obj.Bearing = { type: "float", value: degToRad(d.bearing) };
        if (d.lock) {
          obj.Locked = { type: "byte", value: 1 };
          obj.Lockable = { type: "byte", value: 1 };
          obj.Plot = { type: "byte", value: 1 };
        }
        doorList.push(obj);
        placed.push({ blueprint: d.blueprint, x: d.x, y: d.y, bearing: d.bearing, locked: d.lock });
      }
      await writeBackGit(index, a, gitDoc);
      updateAreaCounts(index, a);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { success: failed.length === 0, placed: placed.length, doors: placed, alreadyPlaced: plan.alreadyPlaced, skipped: plan.skipped, failed },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
