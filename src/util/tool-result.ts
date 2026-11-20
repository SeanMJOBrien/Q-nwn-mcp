/**
 * Shared MCP tool results and the one result contract every tool follows (2026-11-19, after five real-model runs):
 *
 * - A call that did not do what it was asked sets `isError`. The driver's stuck check and every model rely on it; some
 *   tools answered "Position is not safe for placement" or `success: false` without it, so a model read a failure as
 *   done. `markFailure` (applied to every registered tool by `recordTools`) sets it on a JSON answer that says
 *   `success: false`, `ok: false` or carries an `error` without a success flag.
 * - A failure names what to change: `field`, the valid values (`valid`) when they are few, and `next` with the call
 *   that fixes it. `failResult` builds that shape for new code.
 *
 * Checks report problems as their answer, not as a failed call, so they are left as they are (CHECK_TOOLS).
 */

type Content = Array<{ type: string; text?: string }>;
type Result = { content?: Content; isError?: boolean; [k: string]: unknown };

export function errorResult(message: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return { content: [{ type: "text", text: message }], isError: true };
}

/** A failure in the standard shape: what went wrong, which argument, the valid values, and the call that fixes it. */
export function failResult(error: string, opts: { field?: string; valid?: string[]; next?: string; [k: string]: unknown } = {}) {
  const { field, valid, next, ...extra } = opts;
  const body = { success: false, error, ...(field ? { field } : {}), ...(valid?.length ? { valid: valid.slice(0, 20) } : {}), ...(next ? { next } : {}), ...extra };
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }], isError: true as const };
}

/** Tools whose answer is a verdict (a check, a probe): `ok: false` there is the answer, not a failed call. */
const CHECK_TOOLS = /^(verify_|check_|validate_|phase_check$|audit_module$|probe_ground$|get_progress$|verify$|trace_dialog_path$|get_balance_report$)/;

/** Did this JSON answer say the call failed? */
export function saysFailure(text: string): boolean {
  const t = text.trimStart();
  if (!t.startsWith("{")) return false;
  try {
    const v = JSON.parse(t) as Record<string, unknown>;
    if (v.success === false || v.ok === false) return true;
    return typeof v.error === "string" && v.success !== true && v.ok !== true;
  } catch {
    return false;
  }
}

/** Set isError on a result that reports a failure in its text but forgot the flag. */
export function markFailure(tool: string, result: unknown): unknown {
  const r = result as Result;
  if (!r || typeof r !== "object" || r.isError || CHECK_TOOLS.test(tool) || !Array.isArray(r.content)) return result;
  const text = r.content.map((c) => c.text ?? "").join("\n");
  return saysFailure(text) ? { ...r, isError: true } : result;
}

/**
 * A create call for something that is already there: a success that says so, so a retried call (small models retry)
 * does not read as a failure and loop. `use` says how to use it; another resref makes a different one.
 */
export function alreadyExistsResult(resource: string, use: string) {
  const body = {
    success: true,
    alreadyExists: true,
    resource,
    note: `${resource} already exists; nothing was changed.`,
    next: `${use} To make a different one, call again with another resref.`,
  };
  return { content: [{ type: "text" as const, text: JSON.stringify(body, null, 2) }] };
}
