/**
 * Pure log-parsing logic for run_live_verification.
 *
 * Kept separate from the Docker-orchestration tool (verify-server-tools.ts) so it
 * can be unit-tested against synthetic log text without Docker or a real engine —
 * the same split this project already uses elsewhere between generator/parser
 * logic (util/) and the tool that drives real side effects (tools/).
 */

export interface LiveEngineError {
  line: string;
  matchedPattern: string;
}

export interface LiveSpecFailure {
  tag: string;
  field: string;
  expected: string;
  actual: string;
}

export interface ParsedLiveLogs {
  engineErrors: LiveEngineError[];
  specResults: { ok: string[]; fail: LiveSpecFailure[] };
  /**
   * Any other bracket-tagged log line ([XXX_*], not [SPEC_OK]/[SPEC_FAIL]) —
   * this is how a future instrumentation include's own log tags (e.g. the
   * systest module's [SYSTEST_DAMAGE]/[SYSTEST_DEATH]) surface with zero
   * extra parsing added here.
   */
  otherTaggedLines: string[];
}

/**
 * Case-insensitive substrings flagged as engine errors by default. "invalid
 * feat" is a real, confirmed bug from this project's history (a TLK-strref
 * value mistaken for a feat.2da row id). "EXOWARNING" — the engine's own
 * warning-log prefix — was tried as a default too, but confirmed live to be
 * too broad: even a totally minimal, freshly-created module emits a benign
 * EXOWARNING at startup ("Filename passed contains an undefined alias"),
 * unrelated to any real defect. It's still a useful signal for a caller who
 * wants that strictness — pass it explicitly via `errorPatterns` — just not
 * safe as an always-on default.
 */
export const DEFAULT_ERROR_PATTERNS = ["invalid feat", "error", "exception"];

/**
 * Deliberately NOT anchored to line start (`^`). Confirmed live (branch
 * systest-live-run-and-generalized-spec) that the real engine's
 * WriteTimestampedLogEntry() — the function every tag-logging line in this
 * project goes through (inc_spec_check/inc_spec_assert/inc_systest_log) —
 * ALWAYS prepends its own `[Day Mon DD HH:MM:SS Year]` timestamp bracket
 * before the string passed to it, e.g. the real captured line was
 * `[Sun Oct 11 01:49:40] [SPEC_FAIL] tag=... field=... expected=... actual=...`.
 * An earlier, line-start-anchored version of this regex had never actually
 * been run against a real engine log (every existing unit test fixture put
 * the tag literally first on the line) — against this project's real output
 * it silently matched nothing, so specResults/otherTaggedLines came back
 * empty on every real run despite the raw log genuinely containing these
 * lines. The `[A-Z_0-9]+` character class already excludes the timestamp
 * bracket's content (mixed case, spaces, colons), so dropping the anchor is
 * safe — nothing else in a real server/engine log coincidentally looks like
 * an all-caps/underscore/digit bracket tag.
 */
const BRACKET_TAG_RE = /\[[A-Z_0-9]+\]/;
const SPEC_OK_RE = /\[SPEC_OK\]\s+tag=(\S+)/;
const SPEC_FAIL_RE = /\[SPEC_FAIL\]\s+tag=(\S+)\s+field=(\S+)\s+expected=(\S+)\s+actual=(\S+)/;

/** Count of lines containing a `[SOME_TAG]`-shaped bracket, across all instrumentation. */
export function bracketTagCount(text: string): number {
  return (text.match(new RegExp(BRACKET_TAG_RE.source, "gm")) ?? []).length;
}

/**
 * Parse the new bytes captured from nwserverLog1.txt/nwengineLog.txt into a
 * structured result. Line-scans once; a line can be both an error match and a
 * categorized [SPEC_*] line (both are reported — they aren't mutually exclusive).
 */
export function parseLiveLogs(
  serverLogTail: string,
  engineLogTail: string,
  errorPatterns: string[] = DEFAULT_ERROR_PATTERNS,
): ParsedLiveLogs {
  const engineErrors: LiveEngineError[] = [];
  const ok: string[] = [];
  const fail: LiveSpecFailure[] = [];
  const otherTaggedLines: string[] = [];

  const lines = `${serverLogTail}\n${engineLogTail}`.split(/\r?\n/);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const lower = line.toLowerCase();
    for (const pattern of errorPatterns) {
      if (lower.includes(pattern.toLowerCase())) {
        engineErrors.push({ line, matchedPattern: pattern });
        break;
      }
    }

    const okMatch = line.match(SPEC_OK_RE);
    if (okMatch) {
      ok.push(okMatch[1]);
      continue;
    }

    const failMatch = line.match(SPEC_FAIL_RE);
    if (failMatch) {
      fail.push({ tag: failMatch[1], field: failMatch[2], expected: failMatch[3], actual: failMatch[4] });
      continue;
    }

    if (BRACKET_TAG_RE.test(line)) otherTaggedLines.push(line);
  }

  return { engineErrors, specResults: { ok, fail }, otherTaggedLines };
}
