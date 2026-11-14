/**
 * Makes a small model's tool arguments fit the tool's input schema before the call.
 *
 * The MCP tools take numbers as strings and lists/objects as JSON strings (the SDK validates the JSON Schema
 * before any conversion can run). Small models send `3` for `"3"`, a real array for a JSON string, `"true"` for
 * `true`, or add a parameter that does not exist. Each of those would fail with a schema error that says little;
 * here they are repaired, or refused with the parameter named.
 */

export interface JsonSchemaObject {
  type?: string;
  properties?: Record<string, { type?: string | string[]; enum?: unknown[] }>;
  required?: string[];
}

export interface CoerceResult {
  args: Record<string, unknown>;
  /** Problems the model must fix; when non-empty the tool is not called. */
  errors: Array<{ field: string; message: string }>;
}

const typeOf = (schema: { type?: string | string[] } | undefined): string | undefined =>
  Array.isArray(schema?.type) ? schema?.type.find((t) => t !== "null") : schema?.type;

export function coerceArgs(schema: JsonSchemaObject | undefined, raw: Record<string, unknown>): CoerceResult {
  const props = schema?.properties ?? {};
  const args: Record<string, unknown> = {};
  const errors: CoerceResult["errors"] = [];
  const names = Object.keys(props);

  for (const [key, value] of Object.entries(raw)) {
    if (value === null || value === undefined) continue;
    const prop = props[key];
    if (!prop) {
      if (schema?.properties) {
        errors.push({ field: key, message: `is not a parameter of this tool. Parameters: ${names.join(", ") || "(none)"}` });
      } else args[key] = value;
      continue;
    }
    const want = typeOf(prop);
    if (want === "string" && typeof value !== "string") {
      args[key] = typeof value === "object" ? JSON.stringify(value) : String(value);
    } else if (want === "boolean" && typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "false") args[key] = v === "true";
      else errors.push({ field: key, message: "must be true or false" });
    } else if ((want === "number" || want === "integer") && typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
      args[key] = Number(value);
    } else {
      args[key] = value;
    }
    if (prop.enum && !prop.enum.includes(args[key])) {
      errors.push({ field: key, message: `must be one of ${JSON.stringify(prop.enum)}` });
    }
  }
  for (const key of schema?.required ?? []) {
    if (!(key in args)) errors.push({ field: key, message: "is required" });
  }
  return { args, errors };
}
