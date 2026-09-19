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

const BRACKET_TAG_RE = /^\[[A-Z_0-9]+\]/;
const SPEC_OK_RE = /^\[SPEC_OK\]\s+tag=(\S+)/;
const SPEC_FAIL_RE = /^\[SPEC_FAIL\]\s+tag=(\S+)\s+field=(\S+)\s+expected=(\S+)\s+actual=(\S+)/;

/** Count of lines starting with a `[SOME_TAG]`-shaped prefix, across all instrumentation. */
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
