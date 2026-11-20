/**
 * One settings file for the server and the command-line tools, so a script run outside the MCP client finds the same
 * game data, tools and folders as the server (before: each run had to be given NWN_FOLDER_DATA, NIM_FOLDER_NWTOOLS,
 * NWN_FOLDER_USER and MCP_FOLDER_TEMP by hand, and a missing one quietly skipped the 2DA tables).
 *
 * The file is `KEY=value` lines (`#` comments, optional quotes): `NWN_MCP_ENV` names it, else `<repo>/nwn-mcp.env`
 * (git-ignored; `nwn-mcp.env.example` lists the keys). A variable already set in the environment wins over the file.
 * The command-line tools can also read the `env` of the MCP client's nwn-mcp entry (`clientSettings`).
 */

import { existsSync, readFileSync } from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/** The keys a settings file may set. */
export const SETTING_KEYS = [
  "NIM_FOLDER_NWTOOLS",
  "NWN_FOLDER_DATA",
  "NWN_FOLDER_USER",
  "MCP_FOLDER_TEMP",
  "MCP_FOLDER_USERREPORTS",
  "MCP_FOLDER_VERIFYSERVER",
  "MCP_FOLDER_ADVENTURES",
  "MOONGLOW_BIN",
  "MOONGLOW_PLUGINS",
  "MCP_LENIENT_ARGS",
] as const;

/** `KEY=value` lines to a map; unknown keys are kept (the caller decides). */
export function parseSettings(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const m = /^(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    let value = m[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    out[m[1]] = value.replace(/^~(?=\/|$)/, os.homedir());
  }
  return out;
}

export function settingsFilePath(env: NodeJS.ProcessEnv = process.env): string {
  return env.NWN_MCP_ENV || path.join(repoRoot, "nwn-mcp.env");
}

/** Fill unset variables from `values`; returns the keys it set. */
export function applySettings(values: Record<string, string>, env: NodeJS.ProcessEnv = process.env): string[] {
  const set: string[] = [];
  for (const key of SETTING_KEYS) {
    const v = values[key];
    if (v !== undefined && v !== "" && !env[key]) {
      env[key] = v;
      set.push(key);
    }
  }
  return set;
}

/** Read the settings file into the environment (unset variables only). Called first thing by config.ts. */
export function loadSettingsFile(env: NodeJS.ProcessEnv = process.env): { file: string; set: string[] } | null {
  const file = settingsFilePath(env);
  if (!existsSync(file)) return null;
  try {
    return { file, set: applySettings(parseSettings(readFileSync(file, "utf8")), env) };
  } catch {
    return null;
  }
}

/**
 * The `env` of the MCP client's entry that runs this server (`~/.claude.json`: top-level and per-project
 * `mcpServers`, the first whose arguments name this repo's `dist/index.js`). For command-line tools only.
 */
export function clientSettings(configFile = path.join(os.homedir(), ".claude.json")): Record<string, string> | null {
  let doc: unknown;
  try {
    doc = JSON.parse(readFileSync(configFile, "utf8"));
  } catch {
    return null;
  }
  const entry = path.join(repoRoot, "dist", "index.js");
  const found: Array<Record<string, string>> = [];
  const visit = (o: unknown) => {
    if (!o || typeof o !== "object") return;
    const rec = o as Record<string, unknown>;
    const servers = rec.mcpServers as Record<string, { args?: unknown; env?: Record<string, string> }> | undefined;
    if (servers && typeof servers === "object") {
      for (const s of Object.values(servers)) {
        const args = Array.isArray(s?.args) ? s.args.map(String) : [];
        if (s?.env && args.some((a) => path.resolve(a) === entry)) found.push(s.env);
      }
    }
    for (const v of Object.values(rec)) if (v && typeof v === "object") visit(v);
  };
  visit(doc);
  // Prefer the entry with the most settings (a project entry may carry fewer).
  return found.sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] ?? null;
}
