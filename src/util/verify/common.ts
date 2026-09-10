/**
 * Shared types and helpers for the verify_* tool family.
 *
 * These checkers answer the question the compiler answers for .nss but nothing
 * answered for anything else: "is this generated asset actually acceptable?"
 *
 * They complement validate_module rather than duplicating it. validate_module
 * does cross-reference checks (does the script this creature names exist?);
 * these do intra-file structural and semantic checks (does this dialog carry the
 * fields the engine silently requires? is this tile ID within the tileset?).
 */

import type { GffObj } from "../../types/gff.js";
import type { ModuleIndex, TwoDATable } from "../../types/module.js";

/** Severity of a finding. Errors block; warnings are advisory. */
export type Severity = "error" | "warning";

export interface Finding {
  /** Stable machine-readable code so skills can branch on a specific defect. */
  code: string;
  message: string;
  /** GFF field or path the finding concerns, when applicable. */
  field?: string;
  /** How to repair it — names the tool and parameter where possible. */
  fix?: string;
}

export interface VerifyResult {
  target: string;
  type: string;
  status: "pass" | "warn" | "fail";
  errors: Finding[];
  warnings: Finding[];
}

/** Accumulates findings for one target and resolves the final status. */
export class Report {
  readonly errors: Finding[] = [];
  readonly warnings: Finding[] = [];

  constructor(
    private readonly target: string,
    private readonly type: string,
  ) {}

  error(code: string, message: string, field?: string, fix?: string): void {
    this.errors.push({ code, message, ...(field ? { field } : {}), ...(fix ? { fix } : {}) });
  }

  warn(code: string, message: string, field?: string, fix?: string): void {
    this.warnings.push({ code, message, ...(field ? { field } : {}), ...(fix ? { fix } : {}) });
  }

  result(): VerifyResult {
    return {
      target: this.target,
      type: this.type,
      status: this.errors.length > 0 ? "fail" : this.warnings.length > 0 ? "warn" : "pass",
      errors: this.errors,
      warnings: this.warnings,
    };
  }
}

/**
 * Script resrefs that resolve from base-game BIFs at runtime and are therefore
 * never module resources. Reporting these as missing is a false positive.
 *
 * Matched by prefix. Covers the standard creature AI (nw_c2_default*), the
 * associate/henchman AI (nw_ch_ac*, x0_ch_hen_*), and their include chains.
 */
const BASE_GAME_SCRIPT_PREFIXES = [
  "nw_c2_default",
  "nw_ch_ac",
  "nw_ch_action",
  "nw_ch_dist",
  "nw_ch_heal",
  "nw_ch_",
  "nw_i0_",
  // nw_o0_* are the module-level default handlers create_module itself wires
  // (nw_o0_death, nw_o0_dying, nw_o0_respawn). Omitting this prefix made every
  // freshly created module fail its own verification.
  "nw_o0_",
  "nw_o2_",
  "nw_g0_",
  "x0_ch_hen_",
  "x0_hen_",
  "x0_i0_",
  "x0_inc_",
  "x0_d1_",
  "x2_def_",
  "x2_mod_def_",
  "x2_i0_",
  "x2_inc_",
  "x2_hen_",
  "x2_d1_",
  "x2_door_",
  "x3_mod_def_",
];

/** True if `resref` is a stock base-game script that needs no module resource. */
export function isBaseGameScript(resref: string): boolean {
  const lower = resref.toLowerCase();
  return BASE_GAME_SCRIPT_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Base-game blueprint naming convention. Every stock creature, item, placeable
 * and door BioWare ships uses one of these prefixes, and they resolve from the
 * game's own data at runtime rather than living in the module.
 *
 * This matters most for cloned creatures: cloning nw_humanmerc002 carries its
 * equipped longsword (nw_wblml001) along as a resref, and reporting that as a
 * missing item produces two false warnings per creature — enough noise to train
 * a reader to ignore the whole report.
 *
 * A module-authored blueprint deliberately named nw_* would be missed. That is
 * the right trade: the convention is near-universal, and a false negative on one
 * oddly-named custom item costs far less than a report nobody reads.
 */
const BASE_GAME_RESOURCE_PREFIXES = ["nw_", "x0_", "x1_", "x2_", "x3_"];

/** True if `resref` follows the base-game blueprint naming convention. */
export function isBaseGameResource(resref: string): boolean {
  const lower = resref.toLowerCase();
  return BASE_GAME_RESOURCE_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Check that a script reference resolves: either it's a base-game script, or the
 * module carries a compiled .ncs for it.
 *
 * A .nss with no .ncs is an error, not a warning — an uncompiled script simply
 * does not run, which is exactly the silent failure these checkers exist to catch.
 */
export function checkScriptRef(report: Report, index: ModuleIndex, resref: string, field: string): void {
  if (!resref) return;
  if (isBaseGameScript(resref)) return;

  const hasSource = index.resources.has(`${resref.toLowerCase()}.nss`);
  const hasCompiled = index.resources.has(`${resref.toLowerCase()}.ncs`);

  if (!hasSource && !hasCompiled) {
    report.error(
      "missing_script",
      `Script "${resref}" is referenced but neither .nss nor .ncs exists in the module`,
      field,
      "write_script to create it, or clear the field",
    );
  } else if (hasSource && !hasCompiled) {
    report.error(
      "uncompiled_script",
      `Script "${resref}" has source but no compiled .ncs — it will not run`,
      field,
      "compile_script to build it",
    );
  }
}

/** Look up a 2DA row, returning undefined if the table or row is absent. */
export function twoDARow(index: ModuleIndex, table: string, row: number): Record<string, string> | undefined {
  return index.twodaTables.get(table.toLowerCase())?.rows.get(row);
}

/** True if a 2DA cell is present and not the "empty" marker. */
export function hasCell(row: Record<string, string> | undefined, column: string): boolean {
  const value = row?.[column];
  return value !== undefined && value !== "" && value !== "****";
}

/**
 * True if a 2DA row is a retired placeholder rather than a usable entry.
 *
 * BioWare blanks decommissioned rows in place rather than renumbering the table,
 * so the row still *exists* — an existence check passes — but its `label` reads
 * DELETED and its `Name` strref is 0 or ****. An asset pointed at one of these
 * loads without complaint and then renders in game with no inventory icon and
 * "Bad Strref" where its type name should be.
 *
 * baseitems.2da has seven such rows: 23, 30, 43, 48, 54, 67, 68.
 */
export function isRetired2DARow(row: Record<string, string> | undefined): boolean {
  if (!row) return false;
  const label = (row.label ?? row.Label ?? "").trim().toUpperCase();
  if (label === "DELETED") return true;
  // Strref 0 is the engine's "Bad Strref" placeholder, never a real name.
  const name = (row.Name ?? "").trim();
  return name === "0" || name === "****";
}

/**
 * Validate a 2DA row reference. Skipped entirely when the table isn't loaded —
 * the server can run without NWN_FOLDER_DATA, and a missing table is an
 * environment gap rather than a defect in the asset being checked.
 */
export function checkTwoDARef(
  report: Report,
  index: ModuleIndex,
  table: string,
  row: number,
  field: string,
  requiredColumn?: string,
): void {
  const twoDA: TwoDATable | undefined = index.twodaTables.get(table.toLowerCase());
  if (!twoDA) return;

  const entry = twoDA.rows.get(row);
  if (!entry) {
    report.error(
      "invalid_2da_row",
      `${field}=${row} is not a valid row in ${table}.2da`,
      field,
      `search_2da on ${table} to find a valid row`,
    );
    return;
  }
  if (requiredColumn && !hasCell(entry, requiredColumn)) {
    report.error(
      "empty_2da_cell",
      `${field}=${row} resolves to a ${table}.2da row whose ${requiredColumn} is empty — the object will not render correctly`,
      field,
      `pick a ${table}.2da row with a populated ${requiredColumn}`,
    );
  }
}

/** Check that a blueprint resref resolves to a module resource of the given type. */
export function checkResourceRef(
  report: Report,
  index: ModuleIndex,
  resref: string,
  extension: string,
  field: string,
  severity: Severity = "error",
): void {
  if (!resref) return;
  if (index.resources.has(`${resref.toLowerCase()}.${extension}`)) return;
  // Stock blueprints resolve from the game's own data, not the module.
  if (isBaseGameResource(resref)) return;

  const emit = severity === "error" ? report.error.bind(report) : report.warn.bind(report);
  emit(
    `missing_${extension}`,
    `${field} references "${resref}" but no ${resref}.${extension} exists in the module`,
    field,
  );
}

/**
 * Read every .nss source in the module, keyed by resref.
 *
 * Several checkers need to reason about what the scripts actually do — which
 * journal entries they award, whether reward code covers the whole party — and
 * the ModuleIndex only stores file paths, not contents.
 */
export async function loadScriptSources(index: ModuleIndex): Promise<Map<string, string>> {
  const { readFile } = await import("fs/promises");
  const sources = new Map<string, string>();
  for (const [key, entry] of index.resources) {
    if (!key.endsWith(".nss") || !entry.filePath) continue;
    try {
      sources.set(entry.resref, await readFile(entry.filePath, "utf-8"));
    } catch {
      // Unreadable source is not a defect in the asset being checked.
    }
  }
  return sources;
}

/** Read a GFF list field without the auto-create side effect of getFieldList. */
export function listOf(obj: GffObj, field: string): GffObj[] {
  const entry = obj[field] as { value?: unknown } | undefined;
  return Array.isArray(entry?.value) ? (entry.value as GffObj[]) : [];
}

/** True if the object actually has the named field. */
export function hasField(obj: GffObj, field: string): boolean {
  return obj[field] !== undefined;
}
