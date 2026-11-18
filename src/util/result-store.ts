/**
 * Large tool results kept on the server behind a short id (like layoutId), for small models with a short context.
 *
 * A result longer than the limit is answered with an outline (the scalar fields, the size and first entry of each
 * list, the keys of each nested object) plus `resultId`; get_result(id, path) returns one part in full. A model whose
 * old results were dropped from its conversation asks again instead of guessing coordinates or tags.
 */

const MAX_KEPT = 40;
const store = new Map<string, string>();
let counter = 0;

export function keepResult(text: string): string {
  const id = `r${++counter}`;
  store.set(id, text);
  while (store.size > MAX_KEPT) store.delete(store.keys().next().value as string);
  return id;
}

export function getKeptResult(id: string): string | undefined {
  return store.get(id.trim());
}

export function keptIds(): string[] {
  return [...store.keys()];
}

const short = (v: unknown, max: number) => {
  const s = JSON.stringify(v);
  return s !== undefined && s.length <= max;
};

/** One level of `value` made small: scalars kept (long strings cut), lists and objects summarised. */
function outlineValue(value: unknown, depth: number): unknown {
  if (value === null || typeof value !== "object") {
    return typeof value === "string" && value.length > 160 ? `${value.slice(0, 160)}... (${value.length} characters)` : value;
  }
  if (short(value, 240)) return value;
  if (Array.isArray(value)) {
    const first = value.length ? outlineValue(value[0], depth + 1) : undefined;
    return { list: value.length, ...(first !== undefined && depth < 2 ? { first } : {}) };
  }
  const obj = value as Record<string, unknown>;
  if (depth >= 2) return { keys: Object.keys(obj).slice(0, 20) };
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, outlineValue(v, depth + 1)]));
}

/** The value at a path like "objects.creatures.0.tag" or "zones[2]". */
export function valueAtPath(value: unknown, path: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const parts = path
    .replace(/\[(\d+)\]/g, ".$1")
    .split(".")
    .map((p) => p.trim())
    .filter(Boolean);
  let cur: unknown = value;
  const walked: string[] = [];
  for (const p of parts) {
    if (cur === null || typeof cur !== "object") return { ok: false, error: `"${walked.join(".") || "(top)"}" has no parts; stop the path there` };
    const next = Array.isArray(cur) ? cur[Number(p)] : (cur as Record<string, unknown>)[p];
    if (next === undefined) {
      const options = Array.isArray(cur) ? `0-${cur.length - 1}` : Object.keys(cur as object).slice(0, 30).join(", ");
      return { ok: false, error: `no "${p}" under "${walked.join(".") || "(top)"}"; it has: ${options}` };
    }
    walked.push(p);
    cur = next;
  }
  return { ok: true, value: cur };
}

/**
 * The text a model sees for a result: unchanged when it fits `limit`; otherwise an outline (JSON) or the start
 * (plain text), with the id to fetch the rest. `path` is the part of a stored result this text is.
 */
export function shapeLongText(text: string, limit: number, id: string, path = ""): string {
  if (text.length <= limit) return text;
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = undefined;
  }
  const how = `get_result(id: "${id}", path: "${path ? `${path}.` : ""}<key>") returns one part in full`;
  if (parsed !== undefined && typeof parsed === "object" && parsed !== null) {
    const outline = { resultId: id, note: `The full result is ${text.length} characters; this is an outline. ${how}.`, ...(path ? { path } : {}), outline: outlineValue(parsed, 0) };
    const out = JSON.stringify(outline, null, 1);
    if (out.length <= limit) return out;
    const keys = Array.isArray(parsed) ? `a list of ${parsed.length}` : `keys: ${Object.keys(parsed).join(", ")}`;
    return JSON.stringify({ resultId: id, note: `The full result is ${text.length} characters (${keys}). ${how}.`, ...(path ? { path } : {}) });
  }
  const head = text.slice(0, Math.max(200, limit - 300));
  return `${head}\n[... ${text.length - head.length} more characters: get_result(id: "${id}", offset: ${head.length}) shows the next part]`;
}
