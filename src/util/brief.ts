/**
 * Brief results for weak (local) models: the same facts in a fraction of the tokens.
 *
 * `visualize_area`, `get_module_summary` and `verify_all` take `brief`. When the caller
 * does not say, brief is the default whenever a tool profile is active (`MCP_TOOL_PROFILE`,
 * see tool-profiles.ts) or `MCP_BRIEF_RESULTS=1`; `brief: false` always returns the full result.
 */

import type { VerifyResult } from "./verify/common.js";

export function briefDefault(env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = (env.MCP_BRIEF_RESULTS ?? "").trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  const names = (env.MCP_TOOL_PROFILE ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return names.length > 0 && !names.includes("all");
}

export function resolveBrief(param: boolean | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  return param ?? briefDefault(env);
}

// --- visualize_area ---

interface AreaTile {
  col: number;
  row: number;
  walkablePercent: number;
  hasWater?: boolean;
  groupName?: string | null;
}

interface AreaObject {
  type: string;
  name: string;
  tag: string;
  x: number;
  y: number;
  linkedTo?: string;
}

export interface FullAreaPayload {
  area: { resref: string; name: string; tag: string; width: number; height: number; tileset: string };
  tileGrid: AreaTile[];
  zones: unknown[];
  features: unknown[];
  objects: AreaObject[];
}

const MAX_OBJECTS_PER_TYPE = 40;

/**
 * One character per tile, north row first (so the text reads like a map, +X east):
 * `.` walkable, `:` partly walkable (20-60 %), `#` blocked, `~` water, `F` part of a feature group.
 * Tile (col,row) covers world metres x = col*10..col*10+10, y = row*10..row*10+10.
 */
export function briefAreaPayload(full: FullAreaPayload) {
  const { width, height } = full.area;
  const rows: string[][] = Array.from({ length: height }, () => Array.from({ length: width }, () => "?"));
  for (const t of full.tileGrid) {
    if (t.row < 0 || t.row >= height || t.col < 0 || t.col >= width) continue;
    let ch = "#";
    if (t.walkablePercent >= 60) ch = t.groupName ? "F" : ".";
    else if (t.walkablePercent >= 20) ch = ":";
    else if (t.hasWater) ch = "~";
    rows[t.row][t.col] = ch;
  }
  const map = rows.map((r, row) => `${String(row).padStart(2)} ${r.join("")}`).reverse();

  const objects: Record<string, unknown> = {};
  const round = (n: number) => Math.round(n * 10) / 10;
  for (const o of full.objects) {
    const key = `${o.type}s`;
    const list = (objects[key] ??= []) as unknown[];
    if (list.length < MAX_OBJECTS_PER_TYPE) {
      const entry: Record<string, unknown> = { tag: o.tag, x: round(o.x), y: round(o.y) };
      if (o.name && o.name !== o.tag) entry.name = o.name;
      if (o.linkedTo) entry.linkedTo = o.linkedTo;
      list.push(entry);
    } else {
      const moreKey = `${key}NotShown`;
      objects[moreKey] = ((objects[moreKey] as number) ?? 0) + 1;
    }
  }

  return {
    brief: true,
    area: full.area,
    map,
    mapLegend:
      "row number then one char per tile, north at top, col 0 at left; . walkable, : partly, # blocked, ~ water, F feature. Tile (col,row) = metres x col*10..+10, y row*10..+10",
    zones: full.zones,
    features: full.features,
    objects,
    next: "Use adventure_find_walkable for an exact open position before placing; pass brief:false for per-tile terrain.",
  };
}

// --- get_module_summary ---

export interface FullModuleSummary {
  dialogs: Array<{ resref: string }>;
  questVariables: string[];
  loadWarnings?: unknown[];
  [key: string]: unknown;
}

const MAX_NAMES = 30;

export function briefModuleSummary(full: FullModuleSummary) {
  const { dialogs, questVariables, loadWarnings, ...rest } = full;
  const dialogNames = dialogs.map((d) => d.resref);
  return {
    brief: true,
    ...rest,
    dialogCount: dialogNames.length,
    dialogs: dialogNames.slice(0, MAX_NAMES),
    ...(dialogNames.length > MAX_NAMES ? { dialogsNotShown: dialogNames.length - MAX_NAMES } : {}),
    questVariableCount: questVariables.length,
    loadWarningCount: loadWarnings?.length ?? 0,
    ...(loadWarnings?.length ? { loadWarnings: loadWarnings.slice(0, 5) } : {}),
  };
}

// --- verify_all ---

export interface BriefFinding {
  target: string;
  type: string;
  code: string;
  message: string;
  fix?: string;
}

/**
 * The errors to work on next: one finding per distinct code first (most frequent code first),
 * then further instances, up to `max`. Warnings are counted, not listed.
 */
export function briefVerifyAll(results: VerifyResult[], max = 8) {
  const errorCount = results.reduce((n, r) => n + r.errors.length, 0);
  const warningCount = results.reduce((n, r) => n + r.warnings.length, 0);

  const byCode = new Map<string, BriefFinding[]>();
  for (const r of results) {
    for (const e of r.errors) {
      const list = byCode.get(e.code) ?? [];
      list.push({ target: r.target, type: r.type, code: e.code, message: e.message, ...(e.fix ? { fix: e.fix } : {}) });
      byCode.set(e.code, list);
    }
  }
  const groups = [...byCode.entries()].sort((a, b) => b[1].length - a[1].length);
  const fixFirst: BriefFinding[] = [];
  for (let depth = 0; fixFirst.length < max; depth++) {
    let added = false;
    for (const [, list] of groups) {
      if (depth < list.length && fixFirst.length < max) {
        fixFirst.push(list[depth]);
        added = true;
      }
    }
    if (!added) break;
  }

  const warnByCode = new Map<string, number>();
  for (const r of results) for (const w of r.warnings) warnByCode.set(w.code, (warnByCode.get(w.code) ?? 0) + 1);

  return {
    brief: true,
    shippable: errorCount === 0,
    checked: results.length,
    errorCount,
    warningCount,
    errorsByCode: groups.map(([code, list]) => ({ code, count: list.length })),
    warningsByCode: [...warnByCode.entries()].sort((a, b) => b[1] - a[1]).map(([code, count]) => ({ code, count })),
    fixFirst,
    ...(errorCount > fixFirst.length ? { errorsNotShown: errorCount - fixFirst.length } : {}),
    next:
      errorCount === 0
        ? "No errors. The module passes the gate; warnings are advisory (brief:false lists them)."
        : "Apply the fix of each fixFirst entry, then run verify_all again.",
  };
}
