/** randomize_npc_appearance (TODO #34). See util/pc-appearance.ts. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr, setField } from "../types/gff.js";
import { mergeVarTable, writeBackGit } from "../util/git-helpers.js";
import { writeCreatureLevelSystem } from "./creature-forge-tools.js";
import { markDirty } from "../util/dirty-state.js";
import { isPcRaceNpc, type PcLook, pcVoicesFrom, pickPcLook } from "../util/pc-appearance.js";
import { errorResult } from "../util/tool-result.js";

const SCALE_WRAPPER = "cf_spawn";

/** Make the creature's OnSpawn the level-system wrapper (which scales it), keeping the script it had as MCP_ORIG_SPAWN. */
function wireScaleSpawn(obj: GffObj): void {
  const current = getFieldStr(obj, "ScriptSpawn");
  if (current !== SCALE_WRAPPER) {
    mergeVarTable(obj, [{ name: "MCP_ORIG_SPAWN", type: "string", value: current || "nw_c2_default9" }]);
    setField(obj, "ScriptSpawn", "resref", SCALE_WRAPPER);
  }
}

function applyLook(obj: GffObj, look: PcLook, scale = false, fixedScale = false): void {
  if (scale) {
    wireScaleSpawn(obj);
    if (fixedScale) mergeVarTable(obj, [{ name: "MCP_SCALE", type: "float", value: look.Scale }]);
  }
  setField(obj, "Appearance_Head", "byte", look.Appearance_Head);
  setField(obj, "Color_Skin", "byte", look.Color_Skin);
  setField(obj, "Color_Hair", "byte", look.Color_Hair);
  setField(obj, "Phenotype", "int", look.Phenotype);
  if (look.SoundSetFile !== undefined) setField(obj, "SoundSetFile", "word", look.SoundSetFile);
}

function tagMatches(tag: string, want: string | undefined): boolean {
  if (!want) return true;
  return want.endsWith("*") ? tag.toLowerCase().startsWith(want.slice(0, -1).toLowerCase()) : tag.toLowerCase() === want.toLowerCase();
}

export function registerAppearanceTools(server: McpServer): void {
  server.tool(
    "randomize_npc_appearance",
    "Give standard-race NPCs (a dwarf, elf, gnome, halfling, half-elf, half-orc or human wearing its own race's player model) a varied player-character look: a head that exists for its race and gender, skin and hair colours drawn the way hand-built creatures use them (weighted by how often each is used), and a player voice set of its own gender. " +
      "Applies to the placed copies in an area (each copy gets its own look, so ten guards are ten different people) and to their blueprints; the same call twice gives the same result. A creature that is not a standard-race humanoid (monsters, animals, gender 2) is left alone and reported. New blueprints made with create_creature_blueprint / forge_creature already get this look (appearanceLook: keep turns it off).",
    {
      area: z.string().optional().describe("Area resref (default: every area)"),
      tag: z.string().optional().describe("Creature tag, or a prefix ending in * (default: every standard-race NPC)"),
      voice: z.boolean().optional().describe("Also give a player voice set of the creature's gender (default true)"),
      blueprints: z.boolean().optional().describe("Also update the creature blueprints of the matched copies (default true)"),
      scale: z.boolean().optional().describe("Also give each a slight size change, 5 % smaller to 5 % larger (default true). Done at spawn by the level system's cf_spawn wrapper (written if missing; the creature's own spawn script still runs first); each placed copy gets its own fixed size, a blueprint draws one at each spawn."),
    },
    { destructiveHint: true },
    async ({ area, tag, voice, blueprints, scale }) => {
      const index = requireIndex();
      const wantScale = scale !== false;
      if (wantScale && !index.resources.has(`${SCALE_WRAPPER}.ncs`)) {
        const sys = await writeCreatureLevelSystem(index);
        if (!sys.compiled) return errorResult(`the level system (cf_spawn) failed to compile: ${sys.compilerOutput}`);
      }
      const voices = voice === false ? undefined : pcVoicesFrom(index.twodaTables.get("soundset")?.rows);
      const areas = area ? [area.toLowerCase()] : [...index.resources.keys()].filter((k) => k.endsWith(".git")).map((k) => k.slice(0, -4));
      let changed = 0;
      const skipped: Record<string, number> = {};
      const heads = new Set<string>();
      const resrefs = new Set<string>();
      for (const a of areas) {
        const doc = index.parsedGff.get(`${a}.git`) as GffObj | undefined;
        if (!doc) {
          if (area) return errorResult(`No area ${a}`);
          continue;
        }
        let touched = false;
        getFieldList(doc, "Creature List").forEach((c, i) => {
          const ctag = getFieldStr(c, "Tag");
          if (!tagMatches(ctag, tag)) return;
          const app = getFieldNum(c, "Appearance_Type");
          const race = getFieldNum(c, "Race");
          const gender = getFieldNum(c, "Gender");
          if (!isPcRaceNpc(app, race, gender)) {
            skipped[`${ctag || "?"}`] = (skipped[`${ctag || "?"}`] ?? 0) + 1;
            return;
          }
          const resref = getFieldStr(c, "TemplateResRef");
          const look = pickPcLook(app, gender as 0 | 1, `${resref}|${a}|${i}`, voices);
          if (!look) return;
          applyLook(c, look, wantScale, true);
          resrefs.add(resref.toLowerCase());
          heads.add(`${app}-${gender}-${look.Appearance_Head}`);
          changed++;
          touched = true;
        });
        if (touched) {
          markDirty(index.resources.get(`${a}.git`)?.filePath ?? a);
          await writeBackGit(index, a, doc as unknown as GffDocument);
        }
      }
      let blueprintsChanged = 0;
      if (blueprints !== false) {
        for (const r of resrefs) {
          const key = `${r}.utc`;
          const entry = index.resources.get(key);
          const bp = index.parsedGff.get(key) as GffObj | undefined;
          if (!entry || !bp) continue;
          const app = getFieldNum(bp, "Appearance_Type");
          const gender = getFieldNum(bp, "Gender");
          if (!isPcRaceNpc(app, getFieldNum(bp, "Race"), gender)) continue;
          const look = pickPcLook(app, gender as 0 | 1, r, voices);
          if (!look) continue;
          applyLook(bp, look, wantScale, false);
          await jsonToGff(bp as unknown as GffDocument, entry.filePath);
          blueprintsChanged++;
        }
      }
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                success: true,
                placedChanged: changed,
                blueprintsChanged,
                differentLooks: heads.size,
                voice: voice !== false,
                scale: wantScale ? "5 % smaller to 5 % larger, applied at spawn" : undefined,
                leftAlone: Object.keys(skipped).length ? skipped : undefined,
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
