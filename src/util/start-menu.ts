/**
 * The start menu: what nwn-mcp can help with, as a lettered list of goals in a user's own words (user request
 * 2026-11-18). The server instructions tell the client to offer it at the start of a session when the user has not said
 * what they want; show_menu returns it, and show_menu(choice) the plan for one entry (skills, first calls, what to ask).
 * The MCP prompt `start` sends the same menu. Each entry names the focus (util/focus.ts) its guide extends.
 */

import type { Focus } from "./focus.js";

export interface MenuEntry {
  key: string;
  title: string;
  /** What a user might say: the kind of request this entry covers. */
  example: string;
  /** Plain words to the user about how it is done. */
  explain: string;
  /** new = a new module (create_module), existing = load_module first, either = whichever the user has. */
  module: "new" | "existing" | "either";
  focus?: Focus;
  skills: string[];
  firstCalls: string[];
  /** What to get from the user before starting. */
  ask: string[];
}

export const START_MENU: MenuEntry[] = [
  {
    key: "A",
    title: "Create NPCs, henchmen or companions",
    example: "I only need help creating a few NPCs or henchmen",
    explain:
      "Each character is described in plain words (race, class, level, look, gear, feats) and built in one call; a henchman also gets the recruit dialog and the companion scripts, and every one is checked before it is placed.",
    module: "either",
    focus: "creatures",
    skills: ["creature-forge", "adventure-actors"],
    firstCalls: ["build_creature", "build_companion", "build_key_npc", "verify_creature"],
    ask: ["who they are: name, race, class, level, friendly or hostile", "where each one stands", "for a henchman: how the party recruits them"],
  },
  {
    key: "B",
    title: "Build areas and connect them",
    example: "I need 3 forest areas with a road leading away from the village into a mountain pass, where I enter a cave mine",
    explain:
      "Each area is laid out from its tileset's rules (size, terrain, buildings or landmarks, music and sky), dressed with props and map pins, and joined to the next by a door or a transition, with a walking check that every exit can be reached.",
    module: "either",
    focus: "areas_encounters",
    skills: ["adventure-areas", "area-forest", "area-connections", "area-dungeon", "adventure-environment"],
    firstCalls: ["suggest_area_size", "adventure_generate_layout", "create_area", "adventure_apply_layout", "adventure_create_transition", "check_area_connectivity"],
    ask: ["the areas in order and what each one is (forest road, mountain pass, mine)", "how they join (doors, a road edge, a cave mouth)", "the party level, if fights go there"],
  },
  {
    key: "C",
    title: "Set a creature's spells, feats or levels",
    example: "I need help setting the spells for my necromancer <resref>",
    explain:
      "I read the creature as it is, then set its class levels, spell school or domains, the spells it memorises or casts as abilities, and its feats and gear, and check that the engine will accept them.",
    module: "existing",
    focus: "creatures",
    skills: ["creature-forge"],
    firstCalls: ["get_creature_details", "verify_creature", "forge_creature", "bake_spec_ability_pool"],
    ask: ["the creature's resref or tag", "the spells or style wanted (necromancy, summons, buffs)", "fixed spells, or levelled at spawn"],
  },
  {
    key: "D",
    title: "A town, market or shop with merchants",
    example: "I need a bazaar area with tents and stalls and merchants selling all kinds of goods and equipment",
    explain:
      "A city or rural area is laid out with market features and stalls, merchants are placed with greeting dialogs, and each gets a store stocked within a wealth budget for the party's level.",
    module: "either",
    focus: "items",
    skills: ["area-city-exterior", "adventure-environment", "adventure-actors", "adventure-affordances"],
    firstCalls: ["adventure_generate_layout", "create_area", "build_key_npc", "get_wealth_budget", "create_store_blueprint", "place_store"],
    ask: ["the setting (desert bazaar, harbour market, village fair)", "the merchants and what each sells", "the party level (sets prices and magic items)"],
  },
  {
    key: "E",
    title: "Finish a dialog with a quest and journal",
    example: "I have the story I want an NPC to tell, but I don't know how to set up a quest and journal for it",
    explain:
      "Your NPC's lines stay yours. A quest is a journal plus stages wired into those lines: accepting, each step (fetch, kill, talk, explore, a skill check), and the reward, paid to the whole party. Every branch returns to the NPC's main menu, and the quest is checked to be completable.",
    module: "existing",
    focus: "quests_dialog",
    skills: ["adventure-quests", "quest-explorer", "nwn-dialog-introspection"],
    firstCalls: ["get_dialog_tree", "build_quest", "add_dialog_node", "verify_quest_completability", "verify_dialog"],
    ask: ["the NPC (tag or name) and their story", "what the party must do, step by step", "the reward"],
  },
  {
    key: "F",
    title: "Encounters, monsters and traps",
    example: "I need balanced fights for a level-5 party in my crypt, with a boss at the end",
    explain:
      "Fights are composed for the party's level and size (melee, casters, healers, a boss), placed where they make sense, and traps added with their saves; a balance report shows the difficulty of each.",
    module: "existing",
    focus: "areas_encounters",
    skills: ["adventure-challenges", "creature-forge"],
    firstCalls: ["suggest_encounter", "compose_encounter", "place_creature", "create_trap_blueprint", "get_balance_report"],
    ask: ["the area and the party level and size", "the kind of foes", "how hard (easy, standard, deadly) and where the boss is"],
  },
  {
    key: "G",
    title: "Items, loot and rewards",
    example: "I need a magic sword for the boss and fair treasure through the dungeon",
    explain:
      "Items are made on real base items with their properties; chests and creatures are filled within the wealth budget, and quest rewards (XP, gold, items) reach every player.",
    module: "existing",
    focus: "items",
    skills: ["nwn-item-properties", "adventure-affordances", "adventure-rewards"],
    firstCalls: ["get_wealth_budget", "create_item_blueprint", "add_item_property", "import_treasure_set", "add_items_to_container"],
    ask: ["the items (or the kind of treasure)", "the party level", "where they go (a chest, a boss, a quest reward)"],
  },
  {
    key: "H",
    title: "A whole new adventure",
    example: "Build me a one-shot adventure for 4 players of level 3",
    explain:
      "From your idea I write the story, then build it phase by phase: areas, props, people, quests, fights, shops, a final check, the rewards, a DM guide and a DM area. You only answer creative questions.",
    module: "new",
    focus: "story",
    skills: ["create-adventure"],
    firstCalls: ["create_module", "phase_check"],
    ask: ["the idea in a sentence or two", "level, party size, play time, tone"],
  },
  {
    key: "I",
    title: "Look over or finish a module I already have",
    example: "Tell me what is in my module and what is still missing",
    explain:
      "I read the module, write down its story as it stands, and list what is missing or broken (areas, quests, dialogs, rewards); then you choose what to fill in.",
    module: "existing",
    focus: "story",
    skills: ["module-explorer"],
    firstCalls: ["load_module", "adopt_module", "audit_module", "verify_all"],
    ask: ["the module file or project folder"],
  },
  {
    key: "J",
    title: "Find and fix a script or logic bug",
    example: "The door should open after the boss dies, but it never does",
    explain: "Scripts can compile and still misbehave. I trace what runs when, follow the variables, find where intent and code disagree, fix it and recompile.",
    module: "existing",
    focus: "debug",
    skills: ["nwn-logic-debug"],
    firstCalls: ["search_scripts", "find_variable_usage", "trace_dialog_path", "compile_script"],
    ask: ["what should happen and what happens instead", "the creature, area, door or script involved"],
  },
  {
    key: "K",
    title: "Write or change a script",
    example: "When the party enters the square, the bell should ring and the guards gather",
    explain: "Behaviour is NWScript on an event (enter, death, dialog line, use). I read what is wired now, write the script, compile it and hook it to the event.",
    module: "existing",
    focus: "scripting",
    skills: ["nwn-logic-debug", "module-explorer"],
    firstCalls: ["list_script_references", "read_script_source", "write_script", "compile_script"],
    ask: ["what should happen, and when", "on which creature, trigger, door or dialog line"],
  },
  {
    key: "L",
    title: "Check the module and build the .mod",
    example: "Check my module for errors and build it so I can play",
    explain: "Every resource is checked (creatures, dialogs, quests, doors, reachability, co-op rewards); I fix or explain each error, then build the .mod.",
    module: "existing",
    skills: ["adventure-polish"],
    firstCalls: ["verify_all", "check_path", "repack_module"],
    ask: ["the module file or project folder", "single-player or co-op"],
  },
];

/** The menu as text to show the user as it is. */
export function menuText(): string {
  const lines = ["What would you like to do? Pick a letter, or describe it in your own words.", ""];
  for (const e of START_MENU) lines.push(`${e.key}. ${e.title} — e.g. "${e.example}"`);
  return lines.join("\n");
}

/** The entry a choice names: a letter ("c", "C.", "option C") or words from its title. */
export function findEntry(choice: string): MenuEntry | undefined {
  const c = choice.trim();
  const letter = /^(?:option\s+)?([a-z])[.):]?$/i.exec(c)?.[1];
  if (letter) return START_MENU.find((e) => e.key === letter.toUpperCase());
  const words = c.toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4);
  let best: MenuEntry | undefined;
  let score = 0;
  for (const e of START_MENU) {
    const text = `${e.title} ${e.example}`.toLowerCase();
    const s = words.filter((w) => text.includes(w)).length;
    if (s > score) {
      best = e;
      score = s;
    }
  }
  return best;
}

/** The plan for one entry: how to start, the skills, the first calls and what to ask. */
export function entryPlan(e: MenuEntry, moduleLoaded: boolean) {
  const start =
    e.module === "new"
      ? 'create_module(name: "<title>", filename: "<file-name>") — a new adventure is always its own module'
      : moduleLoaded
        ? "the loaded module"
        : e.module === "existing"
          ? 'load_module(modPath: "<file>.mod" or the module project folder) — ask the user which module'
          : 'load_module(...) for the user\'s module, or create_module(...) when they want a new one — ask which';
  return {
    choice: e.key,
    title: e.title,
    explain: e.explain,
    start,
    ask: e.ask,
    skills: e.skills,
    firstCalls: e.firstCalls,
    ...(e.focus ? { focus: e.focus } : {}),
    record:
      e.key === "H"
        ? 'set_project_scope(kind: "whole_adventure", scope: "<the user\'s words>") after create_module'
        : `set_project_scope(kind: "one_feature", scope: "<the user's words>"${e.focus ? `, focus: "${e.focus}"` : ""}) once a module is loaded`,
    next: "Tell the user in a sentence or two how this is done (explain), ask what you still need (ask), then start with the first calls. Load the skills listed when your client has them.",
  };
}
