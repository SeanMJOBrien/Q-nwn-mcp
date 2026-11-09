/**
 * add_skill_check — put one skill / ability / saving-throw check on a placed trigger, placeable or door.
 *
 * The check itself is the generated q_check script (util/quest-script.ts); this tool only writes its parameters as
 * `chk_<name>` locals on the placed object and points the right event at q_check_evt. Dialog lines use q_check
 * directly through script parameters (build_quest / create_dialog `params`), so they don't need this tool.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldStr, setField } from "../types/gff.js";
import { getGitDoc, mergeVarTable, writeBackGit } from "../util/git-helpers.js";
import { snapshotGitForUndo } from "../util/undo.js";
import { writeQuestSystem } from "./quest-tools.js";

/** Which GIT list and event field each object kind uses. */
const KINDS = {
  trigger: { list: "TriggerList", field: "ScriptOnEnter" },
  placeable: { list: "Placeable List", field: "OnUsed" },
  door: { list: "Door List", field: "OnFailToOpen" },
} as const;

/** The parameters q_check_evt copies across (keep in step with its list in quest-script.ts). */
export const CHECK_PARAMS = [
  "skill",
  "ability",
  "save",
  "dc",
  "difficulty",
  "key",
  "who",
  "tries",
  "again",
  "half",
  "damage_type",
  "ability_hours",
  "pass_damage",
  "fail_damage",
  "pass_ability",
  "fail_ability",
  "pass_ability_amount",
  "fail_ability_amount",
  "pass_msg",
  "fail_msg",
  "pass_unlock",
  "fail_unlock",
  "pass_open",
  "fail_open",
  "pass_destroy",
  "fail_destroy",
  "pass_spawn",
  "fail_spawn",
  "pass_at",
  "fail_at",
  "pass_set_var",
  "fail_set_var",
  "pass_var_value",
  "fail_var_value",
  "pass_give_item",
  "fail_give_item",
  "pass_xp",
  "fail_xp",
] as const;

export function registerCheckTools(server: McpServer): void {
  server.tool(
    "add_skill_check",
    "Put a skill, ability or saving-throw check on a placed trigger (fires when something enters), placeable (when used) " +
      "or door (when it fails to open) — e.g. DC 10 Dexterity (reflex) to avoid a stone-fall trap, DC 10 Strength to force a " +
      "door, DC 15 Lore on a letter. `check` is a JSON object of q_check parameters: one of skill / ability (str,dex,con,int," +
      "wis,cha) / save (fort,reflex,will); dc or difficulty (easy 10, moderate 15, hard 20, veryhard 25); who (best | speaker | " +
      "each — traps default to each); tries; key; and outcomes pass_/fail_ damage (3d6), damage_type, half, ability (str..cha) with ability_amount (dice or number) and ability_hours (a poison needle), msg, unlock, open, " +
      "destroy, spawn+at, set_var+var_value, give_item, xp. Writes the shared quest runtime first if it is missing. The same " +
      "parameters work on a dialog line through the q_check script. Needs the object to be placed already.",
    {
      area: z.string().describe("Area resref"),
      tag: z.string().describe("Tag of the placed trigger, placeable or door"),
      kind: z.enum(["trigger", "placeable", "door"]).describe("What kind of object it is"),
      event: z
        .enum(["use", "disarm"])
        .optional()
        .describe("Placeable only: check when it is used (default) or when its trap is disarmed"),
      check: z
        .string()
        .describe(
          'JSON object, e.g. {"save":"reflex","dc":10,"fail_damage":"3d6","half":"1","damage_type":"bludgeoning"}',
        ),
    },
    { destructiveHint: true },
    async (args) => {
      const index = requireIndex();
      const fail = (message: string) => ({ content: [{ type: "text" as const, text: message }], isError: true });
      let params: Record<string, unknown>;
      try {
        params = JSON.parse(args.check) as Record<string, unknown>;
      } catch {
        return fail("check must be a JSON object of q_check parameters");
      }
      const unknown = Object.keys(params).filter((k) => !(CHECK_PARAMS as readonly string[]).includes(k));
      if (unknown.length)
        return fail(`Unknown check parameter(s): ${unknown.join(", ")}. Allowed: ${CHECK_PARAMS.join(", ")}`);
      const kinds = ["skill", "ability", "save"].filter((k) => params[k] !== undefined);
      if (kinds.length !== 1) return fail("Give exactly one of skill, ability or save");
      if (params.dc === undefined && params.difficulty === undefined) return fail("Give dc or difficulty");

      if (args.event === "disarm" && args.kind !== "placeable") return fail("event=disarm only applies to a placeable");
      const { list } = KINDS[args.kind];
      const field = args.event === "disarm" ? "OnDisarm" : KINDS[args.kind].field;
      let git: ReturnType<typeof getGitDoc>;
      try {
        git = getGitDoc(index, args.area);
      } catch {
        return fail(`No area ${args.area}`);
      }
      const obj = getFieldList(git.obj, list).find(
        (o: GffObj) => getFieldStr(o, "Tag").toLowerCase() === args.tag.toLowerCase(),
      );
      if (!obj) return fail(`No ${args.kind} tagged ${args.tag} in ${args.area} (${list})`);

      const steps: string[] = [];
      if (!index.resources.has("q_check_evt.ncs") || !index.resources.has("q_check.ncs")) {
        const sys = await writeQuestSystem(index);
        if (!sys.compiled)
          return fail("The quest runtime failed to compile; run create_quest_system and read its output");
        steps.push("quest runtime written");
      }

      snapshotGitForUndo(git.doc, args.area, "add_skill_check", `${args.kind} ${args.tag}`);
      const orig = getFieldStr(obj, field);
      if (orig && orig !== "q_check_evt") mergeVarTable(obj, [{ name: "chk_orig", type: "string", value: orig }]);
      for (const [name, value] of Object.entries(params)) {
        mergeVarTable(obj, [{ name: `chk_${name}`, type: "string", value: String(value) }]);
      }
      setField(obj, field, "resref", "q_check_evt");
      await writeBackGit(index, args.area, git.doc);
      steps.push(`${field} -> q_check_evt`);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              { success: true, area: args.area, tag: args.tag, kind: args.kind, steps, check: params },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
