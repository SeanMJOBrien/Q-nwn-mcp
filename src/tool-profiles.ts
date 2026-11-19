/**
 * Tool profiles: expose a small subset of the server's tools to a client.
 *
 * A weak (local) model picks the wrong tool or invents arguments when it sees ~200 tools.
 * `MCP_TOOL_PROFILE=quests,verify` registers only the tools of those profiles plus the
 * always-on `core` set. Unset (or `all`) registers everything, as before.
 * An entry is an exact tool name, or a prefix glob ending in `*` (e.g. `get_*`).
 */

export const CORE_TOOLS: string[] = [
  "create_module",
  "load_module",
  "get_module_summary",
  "get_phase_prompt",
  "phase_check",
  "get_progress",
  "read_story",
  "write_story_section",
  "repack_module",
  "undo_last_change",
  "get_area_card",
  "get_result",
];

export const TOOL_PROFILES: Record<string, string[]> = {
  read: [
    "get_*",
    "list_*",
    "search_*",
    "find_*",
    "trace_dialog_path",
    "flatten_dialog",
    "visualize_area",
    "read_script_source",
    "resolve_*",
    "audit_module",
    "adopt_module",
    "set_project_scope",
    "show_menu",
  ],
  // No list_tilesets: the plot prompt lists the tilesets build_area has recipes for; a small model called
  // list_tilesets 57 times reading only its outline (The Old Mill, 2026-11-18).
  plot: ["write_plot", "plan_adventure_shape", "verify_story", "suggest_area_size", "set_project_scope"],
  quests: [
    "build_quest",
    "remove_quest",
    "create_quest_system",
    "create_reward_system",
    "verify_quest_completability",
    "verify_journal",
    "verify_dialog",
    "get_journal",
    "get_dialog_tree",
    "list_creatures",
    "list_items",
  ],
  actors: [
    "build_creature",
    "build_key_npc",
    "build_companion",
    "create_companion_system",
    "create_dialog",
    "add_dialog_node",
    "edit_dialog_node",
    "add_dialog_return_links",
    "prune_dialog_orphans",
    "place_creature",
    "randomize_npc_appearance",
    "create_creature_blueprint",
    "list_creature_samples",
    "get_dialog_tree",
    "get_area_creatures",
    "list_creatures",
    "visualize_area",
    "adventure_find_walkable",
    "verify_creature",
    "verify_dialog",
  ],
  // Build the areas only: size, create, lay out, connect, start point. Dressing them is `dress`.
  areas: [
    "build_area",
    "suggest_area_size",
    "set_module_start",
    "create_area",
    "delete_area",
    "list_tilesets",
    "get_tileset_details",
    "adventure_*",
    "paint_tiles",
    "place_tile_doors",
    "place_door",
    "place_waypoint",
    "link_doors",
    "check_area_connectivity",
    "probe_ground",
    "check_path",
    "set_area_properties",
    "visualize_area",
    "list_areas",
    "get_area_details",
    "verify_area",
    "verify_door",
  ],
  // Dress built areas (environment phase): props, sounds, map pins.
  dress: [
    "dress_area",
    "place_placeable",
    "place_sound",
    "place_waypoint",
    "probe_ground",
    "adventure_find_walkable",
    "fix_object_heights",
    "move_object",
    "remove_object",
    "list_blueprints",
    "get_area_placeables",
    "get_area_waypoints",
    "get_area_doors",
    "visualize_area",
    "set_area_properties",
    "verify_placeable",
    "verify_waypoint",
    "verify_sound",
  ],
  encounters: [
    "build_enemy_group",
    "build_trap",
    "compose_encounter",
    "suggest_encounter",
    "build_key_npc",
    "forge_creature",
    "create_creature_level_system",
    "place_encounter",
    "place_creature",
    "create_trap_blueprint",
    "place_trigger",
    "add_skill_check",
    "list_creature_samples",
    "get_area_creatures",
    "get_area_triggers",
    "visualize_area",
    "adventure_find_walkable",
    "get_balance_report",
    "verify_encounter",
    "verify_encounter_chain",
    "verify_creature",
  ],
  loot: [
    "build_store",
    "set_starting_gold",
    "get_wealth_budget",
    "create_store_blueprint",
    "place_store",
    "create_item_blueprint",
    "add_items_to_container",
    "list_blueprints",
    "list_treasure_samples",
    "import_treasure_item",
    "import_treasure_set",
    "create_treasure_system",
    "create_reward_system",
    "get_area_placeables",
    "place_placeable",
    "get_dialog_tree",
    "add_dialog_node",
    "write_script",
    "compile_script",
    "set_module_description",
    "write_dm_guide",
    "create_dm_area",
    "audit_module",
    "verify_store",
    "verify_item",
    "verify_dialog",
    "verify_all",
  ],
  fix: [
    "check_area_connectivity",
    "check_path",
    "add_dialog_return_links",
    "prune_dialog_orphans",
    "edit_dialog_node",
    "build_quest",
    "fix_object_heights",
    "move_object",
    "remove_object",
    "compile_script",
    "run_live_verification",
  ],
  // The module-wide checks; the per-object verify_* tools stay out (verify_all runs them all).
  verify: [
    "verify_all",
    "verify_area",
    "verify_creature",
    "verify_dialog",
    "verify_journal",
    "verify_coop_rules",
    "verify_quest_completability",
    "verify_story",
    "validate_module",
    "audit_module",
  ],
  // End of the adventure: quest XP, reward items, module description, DM guide and DM area.
  // No build_quest: the quests phase builds every quest with its reward; a rewards model rebuilt the main quest
  // with one stage (Millers Daughter, 2026-11-19).
  rewards: [
    "create_reward_system",
    "get_wealth_budget",
    "list_treasure_samples",
    "import_treasure_item",
    "create_item_blueprint",
    "add_items_to_container",
    "list_blueprints",
    "get_area_placeables",
    "place_placeable",
    "adventure_find_walkable",
    "set_module_description",
    "write_dm_guide",
    "create_dm_area",
    "audit_module",
    "verify_item",
    "verify_all",
  ],
};

export interface ToolProfile {
  /** Profile names in effect, e.g. ["quests", "verify"]. */
  names: string[];
  /** Exact names and `prefix*` globs that are allowed (core included). */
  patterns: string[];
}

/** Parses the env value. Returns null (= expose everything) when unset, empty or `all`. Throws on an unknown name. */
export function resolveToolProfile(value: string | undefined): ToolProfile | null {
  const names = (value ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (names.length === 0 || names.includes("all")) return null;
  const unknown = names.filter((n) => !(n in TOOL_PROFILES) && n !== "core");
  if (unknown.length > 0) {
    throw new Error(
      `Unknown MCP_TOOL_PROFILE name(s): ${unknown.join(", ")}. Valid: all, core, ${Object.keys(TOOL_PROFILES).join(", ")}`,
    );
  }
  const patterns = new Set<string>(CORE_TOOLS);
  for (const n of names) for (const p of TOOL_PROFILES[n] ?? []) patterns.add(p);
  return { names, patterns: [...patterns] };
}

export function matchesPattern(tool: string, pattern: string): boolean {
  return pattern.endsWith("*") ? tool.startsWith(pattern.slice(0, -1)) : tool === pattern;
}

export function isToolAllowed(tool: string, profile: ToolProfile | null): boolean {
  return !profile || profile.patterns.some((p) => matchesPattern(tool, p));
}

/**
 * Returns an object that behaves like `server` but silently drops `tool()` registrations
 * outside the profile. With no profile the server itself is returned.
 */
export function filterToolsByProfile<T extends { tool: (...args: any[]) => unknown }>(
  server: T,
  profile: ToolProfile | null,
): T {
  if (!profile) return server;
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) =>
          isToolAllowed(name, profile) ? target.tool(name, ...rest) : undefined;
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
