import type { GffDocument, GffField, GffObj, GffType } from "../types/gff.js";

const INT_TYPES = new Set<GffType>(["byte", "char", "word", "short", "dword", "int", "dword64", "int64"]);
const FLOAT_TYPES = new Set<GffType>(["float", "double"]);
const STRING_TYPES = new Set<GffType>(["cexostring", "resref"]);
/**
 * Types `setGffByPath` refuses to set. Not a completeness gap — these need
 * real internal structure (a cexolocstring's language-keyed map, a struct's
 * fields, a list's array of typed structs) that a flat path+value+type API
 * can't express safely. Confirmed real corruption this class of edit caused
 * (see CLAUDE.md's Known Pitfalls: "modify_gff_field corruption isn't
 * limited to float fields") — refusing with a clear error beats silently
 * writing something the engine can't parse.
 */
const UNSETTABLE_TYPES = new Set<GffType>(["struct", "list", "cexolocstring", "void"]);

/**
 * Coerce a raw MCP-supplied value (nearly always a string or number — MCP
 * clients routinely send numeric-looking params as strings, see
 * util/params.ts) to match a GFF field's real type. Every documented
 * `modify_gff_field` corruption case traces back to skipping this: a caller
 * passes "60" for a field whose real type is `float`, the field ends up as
 * `{"type":"float","value":"60"}`, and nwn_gff rejects the string where it
 * needs a JSON number.
 */
export function coerceGffValue(rawValue: unknown, gffType: GffType): { value: unknown } | { error: string } {
  if (UNSETTABLE_TYPES.has(gffType)) {
    return {
      error: `Cannot set a "${gffType}" field via modify_gff_field — it needs real internal structure ` +
        `(a struct's fields, a list's array of typed structs, a cexolocstring's language map) that a flat ` +
        `path+value edit can't express safely. Use a typed tool for this field instead.`,
    };
  }
  if (INT_TYPES.has(gffType)) {
    const n = typeof rawValue === "number" ? rawValue : parseInt(String(rawValue), 10);
    if (Number.isNaN(n)) return { error: `"${String(rawValue)}" is not a valid integer for a ${gffType} field` };
    return { value: Math.trunc(n) };
  }
  if (FLOAT_TYPES.has(gffType)) {
    const n = typeof rawValue === "number" ? rawValue : parseFloat(String(rawValue));
    if (Number.isNaN(n)) return { error: `"${String(rawValue)}" is not a valid number for a ${gffType} field` };
    return { value: n };
  }
  if (STRING_TYPES.has(gffType)) {
    return { value: String(rawValue) };
  }
  // Unrecognized type string (shouldn't happen with real GFF data) — pass
  // through rather than block on something this function doesn't know about.
  return { value: rawValue };
}

/**
 * Navigate a GFF document by dot-separated path.
 * Example: "Creature List.0.ChallengeRating" navigates to
 *   root["Creature List"].value[0].ChallengeRating
 */
export function getGffByPath(doc: GffDocument, path: string): GffField | undefined {
  const parts = path.split(".");
  let current: unknown = doc;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;

    // If current is an array, index into it
    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) return undefined;
      current = current[idx];
      continue;
    }

    if (typeof current !== "object") return undefined;
    const obj = current as GffObj;

    // If the object has a GFF field with this name, navigate into it
    const field = obj[part] as GffField | undefined;
    if (field && typeof field === "object" && "type" in field && "value" in field) {
      // For struct/list types, descend into the value
      if (field.type === "list" || field.type === "struct") {
        current = field.value;
      } else {
        // For leaf types, return the field if this is the last part
        if (part === parts[parts.length - 1]) return field;
        current = field.value;
      }
    } else if (obj[part] !== undefined) {
      current = obj[part];
    } else {
      return undefined;
    }
  }

  // If we ended on a GFF field object, return it
  if (current && typeof current === "object" && "type" in current && "value" in current) {
    return current as GffField;
  }
  return undefined;
}

/**
 * Set a value at a GFF path. Returns the previous value.
 */
export function setGffByPath(
  doc: GffDocument,
  path: string,
  newValue: unknown,
  gffType?: string
): { previousValue: unknown } | { error: string } {
  const parts = path.split(".");
  const fieldName = parts.pop();
  if (!fieldName) return { error: "Empty path" };

  // Navigate to parent
  let current: unknown = doc;
  for (const part of parts) {
    if (current === null || current === undefined) return { error: `Path not found at: ${part}` };

    if (Array.isArray(current)) {
      const idx = parseInt(part, 10);
      if (Number.isNaN(idx) || idx < 0 || idx >= current.length) return { error: `Array index out of bounds: ${part}` };
      current = current[idx];
      continue;
    }

    if (typeof current !== "object") return { error: `Expected object at: ${part}` };
    const obj = current as GffObj;
    const field = obj[part] as GffField | undefined;
    if (field && typeof field === "object" && "type" in field && "value" in field) {
      if (field.type === "list" || field.type === "struct") {
        current = field.value;
      } else {
        current = field.value;
      }
    } else if (obj[part] !== undefined) {
      current = obj[part];
    } else {
      return { error: `Field not found: ${part}` };
    }
  }

  if (typeof current !== "object" || current === null) return { error: "Parent is not an object" };
  const parent = current as GffObj;
  const field = parent[fieldName] as GffField | undefined;

  if (!field || typeof field !== "object" || !("type" in field)) {
    // Create new field if gffType is specified
    if (gffType) {
      const coerced = coerceGffValue(newValue, gffType as GffType);
      if ("error" in coerced) return coerced;
      parent[fieldName] = { type: gffType, value: coerced.value };
      return { previousValue: undefined };
    }
    return { error: `Field not found: ${fieldName}` };
  }

  // Coerce against the field's REAL type, not whatever the caller happened
  // to pass — this is what makes setting an existing float/int/string field
  // safe regardless of whether the caller sent a JS number or a string.
  const coerced = coerceGffValue(newValue, field.type);
  if ("error" in coerced) return coerced;

  const previousValue = field.value;
  field.value = coerced.value;
  return { previousValue };
}
