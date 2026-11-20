/**
 * Validates a spec (the creature spec of build_creature) against its JSON Schema in docs/specs/.
 * Errors name the failing `field` (a path like `gear.weapon.base`) so the caller can repair exactly that field.
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
  creature: { type: "CreatureSpec", describes: "one creature described in names: class, package, feats, look, gear (build_creature)" },
};

export interface SpecError {
  /** Path of the failing field, "" for the spec itself. */
  field: string;
  message: string;
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
  return { ok: true, errors: [] };
}
