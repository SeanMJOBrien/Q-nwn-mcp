/**
 * What to do when no module is loaded: the first thing every client (and every weak local model) runs into.
 *
 * A bare "No module loaded" error made small models retry the same call. The guide names the two ways in
 * (create_module for a new module, load_module for an existing one), lists what exists to load, and says how to
 * continue. Used by requireIndex's error, get_module_summary's no-module answer and the server instructions.
 */

import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { NWN_FOLDER_USER } from "../config.js";
import { adventureBase } from "./adventure-dir.js";

/** Module files and module projects that load_module accepts (a few of each, newest names first). */
export function loadableModules(limit = 8): { modules: string[]; projects: string[] } {
  const modules: string[] = [];
  const projects: string[] = [];
  try {
    const dir = NWN_FOLDER_USER ? path.join(NWN_FOLDER_USER, "modules") : "";
    if (dir && existsSync(dir)) {
      for (const f of readdirSync(dir)) if (f.toLowerCase().endsWith(".mod")) modules.push(f);
    }
  } catch {
    // unreadable folder: list nothing
  }
  try {
    const base = adventureBase();
    if (existsSync(base)) {
      for (const d of readdirSync(base)) {
        if (existsSync(path.join(base, d, "project.json"))) projects.push(path.join(base, d));
      }
    }
  } catch {
    // no adventures folder
  }
  return { modules: modules.sort().slice(0, limit), projects: projects.sort().slice(0, limit) };
}

export const START_STEPS =
  "To start a NEW module: create_module(name: \"The Lost Tomb\", filename: \"the-lost-tomb\") — it creates and loads it. " +
  "To open an EXISTING one: load_module(modPath: \"<file>.mod\" or a module project folder). " +
  "Then get_module_summary to see what is in it, and get_phase_prompt(phase: \"plot\") for the step-by-step build instructions.";

/** The text of the "no module loaded" error and answer. */
export function noModuleMessage(): string {
  const { modules, projects } = loadableModules();
  const lines = [`No module is loaded yet, so there is nothing to read or change. ${START_STEPS}`];
  if (modules.length) lines.push(`Module files you can load: ${modules.join(", ")}.`);
  if (projects.length) lines.push(`Module projects you can load: ${projects.join(", ")}.`);
  lines.push("Do not call this tool again until a module is loaded.");
  return lines.join(" ");
}

/** Server-level instructions sent to clients at connect time. */
export const SERVER_INSTRUCTIONS =
  "nwn-mcp builds and edits Neverwinter Nights: Enhanced Edition modules. Every tool works on the one loaded module, " +
  `so the first call is always create_module or load_module. ${START_STEPS} ` +
  "A new adventure is always its own new module from create_module: a complete, playable module (it uses the base " +
  "game's tilesets, creatures and items directly; nothing is merged into or out of another .mod). Never build a new " +
  "adventure inside an existing module such as a test module; load_module is for continuing or editing that module. " +
  "Numbers may be given as numbers or strings, lists and objects as JSON values or JSON text. A result that says " +
  "success: false or isError explains what to change; fix that argument instead of repeating the same call. Edits " +
  "are saved as you go; repack_module builds the .mod only when the user asks.";
