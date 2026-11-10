/**
 * What the user wants help with, beyond "which phases of the pipeline". Each focus names the skills to load, the first
 * tool calls and what to explain, so a user who does not know the tools can still be guided to the result.
 * The table is in docs/guided-workflow.md §2; keep the two in step.
 */

import type { Phase } from "./phase-check.js";

export const FOCUS = ["creatures", "scripting", "story", "areas_encounters", "quests_dialog", "debug", "items"] as const;
export type Focus = (typeof FOCUS)[number];

export interface FocusGuide {
  label: string;
  /** One or two plain sentences the LLM can say to the user. */
  explain: string;
  /** Pipeline phases this focus touches (empty = outside the pipeline). */
  phases: Phase[];
  skills: string[];
  firstCalls: string[];
  /** What the LLM must get from the user or the module before starting. */
  needs: string[];
}

export const FOCUS_GUIDE: Record<Focus, FocusGuide> = {
  creatures: {
    label: "Create, level and equip creatures",
    explain:
      "Creatures are built from a class, race and level; the forge adds feats, skills, gear and spells, and a level system lets them level at spawn. Friendly ones carry a dialog; hostile ones get a faction and a role.",
    phases: ["actors", "challenges"],
    skills: ["creature-forge", "adventure-actors", "adventure-challenges"],
    firstCalls: ["create_creature_level_system", "forge_creature", "equip_npc_by_role", "verify_creature"],
    needs: ["which creature (name, race, class, level, friendly or hostile)", "which area it stands in"],
  },
  scripting: {
    label: "Script creature and object behaviour",
    explain:
      "Behaviour is NWScript on event slots (spawn, death, dialog action, trigger enter). I read what is wired now, write or change the script, compile it, and check it.",
    phases: [],
    skills: ["nwn-logic-debug", "module-explorer", "nwn-dialog-introspection"],
    firstCalls: ["list_script_references", "read_script_source", "write_script", "compile_script"],
    needs: ["what should happen, and when (the event)", "which creature, trigger or dialog node"],
  },
  story: {
    label: "Fill gaps in the story or module design",
    explain:
      "I read what the module already says, keep your names and wording, and propose only what is missing: motives, beats, clues, an ending. The story graph checks that every beat is reachable and every thread pays off.",
    phases: ["plot"],
    skills: ["adventure-plot"],
    firstCalls: ["adopt_module", "audit_module", "plan_adventure_shape", "verify_story"],
    needs: ["your notes or story so far", "which parts are fixed and which are open"],
  },
  areas_encounters: {
    label: "Build an immersive area with encounters",
    explain:
      "An area is sized from what happens in it, painted from the tileset's rules, dressed with props and sound, then populated with encounters of mixed kinds (fights, social, obstacles, discoveries).",
    phases: ["areas", "environment", "challenges"],
    skills: ["adventure-areas", "adventure-environment", "adventure-challenges", "area-ambience", "area-connections"],
    firstCalls: ["suggest_area_size", "get_area_details", "visualize_area", "compose_encounter", "get_balance_report"],
    needs: ["the area (existing or new) and its biome", "what happens there (events) and the party level"],
  },
  quests_dialog: {
    label: "Add quests, journal entries, dialog and rewards",
    explain:
      "A quest is a journal plus stages wired into NPC dialog lines; each stage can check a skill, spawn a creature, take or give items, and pay a reward to the whole party.",
    phases: ["quests"],
    skills: ["adventure-quests", "quest-explorer", "nwn-dialog-introspection"],
    firstCalls: ["get_journal", "get_dialog_tree", "build_quest", "verify_quest_completability"],
    needs: ["the quest giver and what they want", "the stages and the reward"],
  },
  debug: {
    label: "Find and fix a script bug",
    explain:
      "Scripts can compile and still misbehave. I trace what runs when, follow the variables, find where the intent and the code disagree, fix it and recompile.",
    phases: [],
    skills: ["nwn-logic-debug"],
    firstCalls: ["search_scripts", "find_variable_usage", "trace_dialog_path", "compile_script"],
    needs: ["what you expected and what happened", "the creature, area or script involved"],
  },
  items: {
    label: "Stores, loot and rewards",
    explain: "Merchants and containers are filled within a wealth budget for the party level; item properties are added to real base items.",
    phases: ["affordances", "rewards"],
    skills: ["adventure-affordances", "adventure-rewards", "nwn-item-properties"],
    firstCalls: ["get_wealth_budget", "create_store_blueprint", "place_store", "add_item_property"],
    needs: ["the area and the party level", "what the shop or chest should offer"],
  },
};

export function guideFor(focus: Focus): FocusGuide & { focus: Focus } {
  return { focus, ...FOCUS_GUIDE[focus] };
}

/** Focus implied by a scope kind when the user did not name one. */
export function defaultFocus(kind: string): Focus | undefined {
  return kind === "nwscript_only" ? "scripting" : undefined;
}
