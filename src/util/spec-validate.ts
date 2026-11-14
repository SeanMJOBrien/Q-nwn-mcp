/**
 * Validates a build spec (util/build-specs.ts) against its JSON Schema and turns it into MCP tool calls.
 * Errors name the failing `field` (a path like `nodes[0].children[1].text`) so a weak model can repair
 * exactly that field in one retry.
 */

import fs from "fs";
import path from "path";
import { Ajv, type ErrorObject, type ValidateFunction } from "ajv";

export interface SpecKind {
  /** Schema file name stem and TypeScript type. */
  type: string;
  /** What the spec builds, for a pick list. */
  describes: string;
}

export const SPEC_KINDS: Record<string, SpecKind> = {
  companion: { type: "CompanionSpec", describes: "a recruitable companion (build_companion)" },
  "key-npc": { type: "KeyNpcSpec", describes: "a combat-capable key NPC or boss (build_key_npc)" },
  dialog: { type: "DialogSpec", describes: "a new conversation (create_dialog)" },
  journal: { type: "JournalSpec", describes: "a plain journal quest with its entries (add_journal_quest + add_journal_entry)" },
  "area-layout": { type: "AreaLayoutSpec", describes: "a generated area layout (adventure_generate_layout)" },
};

export interface SpecError {
  /** Path of the failing field, "" for the spec itself. */
  field: string;
  message: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
}

const SCHEMA_DIR = path.join(import.meta.dirname, "..", "..", "docs", "specs");

export function specSchemaPath(kind: string): string {
  return path.join(SCHEMA_DIR, `${kind}.schema.json`);
}

export function loadSpecSchema(kind: string): Record<string, unknown> {
  if (!(kind in SPEC_KINDS)) throw new Error(`Unknown spec kind "${kind}". Valid: ${Object.keys(SPEC_KINDS).join(", ")}`);
  return JSON.parse(fs.readFileSync(specSchemaPath(kind), "utf8"));
}

const validators = new Map<string, ValidateFunction>();

function validatorFor(kind: string): ValidateFunction {
  let v = validators.get(kind);
  if (!v) {
    v = new Ajv({ allErrors: true, strict: false }).compile(loadSpecSchema(kind));
    validators.set(kind, v);
  }
  return v;
}

/** "/nodes/0/children/1/text" -> "nodes[0].children[1].text" */
function fieldPath(instancePath: string, extra?: string): string {
  const parts = instancePath.split("/").filter(Boolean);
  if (extra) parts.push(extra);
  return parts.map((p, i) => (/^\d+$/.test(p) ? `[${p}]` : i === 0 ? p : `.${p}`)).join("");
}

function describe(e: ErrorObject): SpecError {
  const p = e.params as Record<string, unknown>;
  switch (e.keyword) {
    case "required":
      return { field: fieldPath(e.instancePath, String(p.missingProperty)), message: "is required" };
    case "additionalProperties":
      return {
        field: fieldPath(e.instancePath, String(p.additionalProperty)),
        message: "is not a field of this spec; remove it",
      };
    case "enum":
      return { field: fieldPath(e.instancePath), message: `must be one of ${JSON.stringify(p.allowedValues)}` };
    case "const":
      return { field: fieldPath(e.instancePath), message: `must be ${JSON.stringify(p.allowedValue)}` };
    case "type":
      return { field: fieldPath(e.instancePath), message: `must be of type ${p.type}` };
    case "pattern":
      return { field: fieldPath(e.instancePath), message: `must match ${p.pattern} (lower-case letters, digits, underscore; length limit)` };
    default:
      return { field: fieldPath(e.instancePath), message: e.message ?? e.keyword };
  }
}

interface DialogNode {
  speaker?: string;
  children?: DialogNode[];
}

/** Rules a schema cannot state. */
function semanticErrors(kind: string, spec: any): SpecError[] {
  const errors: SpecError[] = [];
  if (kind === "dialog") {
    const walk = (nodes: DialogNode[], expected: "npc" | "pc", at: string) => {
      nodes.forEach((n, i) => {
        const here = `${at}[${i}]`;
        if (n.speaker !== expected) {
          errors.push({
            field: `${here}.speaker`,
            message: `must be "${expected}" here (root lines are NPC lines; NPC and PC lines alternate)`,
          });
        }
        if (n.children?.length) walk(n.children, expected === "npc" ? "pc" : "npc", `${here}.children`);
      });
    };
    walk(spec.nodes, "npc", "nodes");
  }
  if (kind === "journal") {
    const ids = spec.entries.map((e: { id: number }) => e.id);
    ids.forEach((id: number, i: number) => {
      if (i > 0 && id <= ids[i - 1]) errors.push({ field: `entries[${i}].id`, message: `must be greater than the previous id (${ids[i - 1]})` });
    });
    spec.entries.forEach((e: { end?: boolean }, i: number) => {
      if (e.end && i !== spec.entries.length - 1) errors.push({ field: `entries[${i}].end`, message: "only the last entry may end the quest" });
    });
  }
  if (kind === "companion" || kind === "key-npc") {
    if (spec.domains && spec.classId !== 2) errors.push({ field: "domains", message: "only a Cleric (classId 2) has domains; remove it" });
    if (spec.school !== undefined && spec.classId !== 10) errors.push({ field: "school", message: "only a Wizard (classId 10) has a school; remove it" });
  }
  return errors;
}

export function validateSpec(kind: string, spec: unknown): { ok: boolean; errors: SpecError[] } {
  const validate = validatorFor(kind);
  if (!validate(spec)) {
    const seen = new Set<string>();
    const errors = (validate.errors ?? []).map(describe).filter((e) => {
      const key = `${e.field}|${e.message}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return { ok: false, errors };
  }
  const errors = semanticErrors(kind, spec);
  return { ok: errors.length === 0, errors };
}

/** The tools take numbers as strings and lists/objects as JSON strings (see CLAUDE.md, "Numeric tool params"). */
function toToolArgs(spec: Record<string, unknown>): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(spec)) {
    if (v === undefined || v === null) continue;
    if (typeof v === "number") args[k] = String(v);
    else if (typeof v === "object") args[k] = JSON.stringify(v);
    else args[k] = v;
  }
  return args;
}

/** The MCP tool call(s) that build a spec, in order. Call `validateSpec` first. */
export function specToToolCalls(kind: string, spec: any): ToolCall[] {
  switch (kind) {
    case "companion":
      return [{ tool: "build_companion", args: toToolArgs(spec) }];
    case "key-npc":
      return [{ tool: "build_key_npc", args: toToolArgs(spec) }];
    case "dialog":
      return [{ tool: "create_dialog", args: toToolArgs(spec) }];
    case "area-layout":
      return [{ tool: "adventure_generate_layout", args: toToolArgs(spec) }];
    case "journal": {
      const { entries, ...quest } = spec;
      return [
        { tool: "create_journal", args: {} },
        { tool: "add_journal_quest", args: toToolArgs(quest) },
        ...entries.map((e: Record<string, unknown>) => ({
          tool: "add_journal_entry",
          args: { questTag: spec.tag, ...toToolArgs(e) },
        })),
      ];
    }
    default:
      throw new Error(`Unknown spec kind "${kind}". Valid: ${Object.keys(SPEC_KINDS).join(", ")}`);
  }
}
