/**
 * Two changes to every tool result, for small models whose context fills and drifts (docs/local-model-guide.md §9):
 *
 *  - a "you are here" line at the end: `[progress 14/71 · areas · next: ... → <call>]`, from get_progress's checklist.
 *    The newest text is what a small model reads best, so its place in the build is repeated where it looks. It is a
 *    separate text item, so a client that parses the first item as JSON still can.
 *  - a result longer than the limit is kept on the server and answered with an outline and a `resultId`
 *    (util/result-store.ts; get_result fetches a part).
 *
 * On when a tool profile is set (a small-model setup), or with MCP_PROGRESS_FOOTER=1 / MCP_RESULT_LIMIT=<chars>.
 */

import { keepResult, shapeLongText } from "./result-store.js";

export interface ResultShaping {
  footer: boolean;
  /** Longest result returned whole, in characters; 0 = no limit. */
  limit: number;
}

export function resultShapingFromEnv(profileSet: boolean, env: NodeJS.ProcessEnv = process.env): ResultShaping {
  const flag = (env.MCP_PROGRESS_FOOTER ?? "").trim().toLowerCase();
  const footer = flag === "" ? profileSet : flag === "1" || flag === "true" || flag === "on";
  const rawLimit = (env.MCP_RESULT_LIMIT ?? "").trim();
  const limit = rawLimit === "" ? (profileSet ? 6000 : 0) : Math.max(0, Number(rawLimit) || 0);
  return { footer, limit };
}

/** Results that are never cut: the driver and the model parse them whole, or they are already parts. */
const NEVER_KEPT = new Set(["get_progress", "phase_check", "get_result", "read_story", "get_phase_prompt", "get_adventure_dir", "get_area_card"]);
/** Results that get no progress line (they carry the progress themselves, or are a part of an earlier result). */
const NO_FOOTER = new Set(["get_progress", "get_result", "get_phase_prompt"]);

export const FOOTER_PREFIX = "[progress ";

type ToolResult = { content?: Array<{ type: string; text?: string }>; isError?: boolean };
type Handler = (args: Record<string, unknown>, extra: unknown) => unknown;
/** The progress line; `changed` = the tool may have changed the module (recompute rather than reuse). */
export type FooterSource = (changed: boolean) => Promise<string | null>;

export async function shapeResult(name: string, result: ToolResult, readOnly: boolean, opts: ResultShaping, footer: FooterSource): Promise<ToolResult> {
  if (!result || !Array.isArray(result.content)) return result;
  let content = result.content;
  if (opts.limit > 0 && !NEVER_KEPT.has(name) && content.length === 1 && content[0].type === "text") {
    const text = content[0].text ?? "";
    if (text.length > opts.limit) content = [{ type: "text", text: shapeLongText(text, opts.limit, keepResult(text)) }];
  }
  if (opts.footer && !NO_FOOTER.has(name)) {
    const line = await footer(!readOnly).catch(() => null);
    if (line) content = [...content, { type: "text", text: line }];
  }
  return content === result.content ? result : { ...result, content };
}

/** Wrap a server so every registered handler's result is shaped. With nothing switched on the server is returned. */
export function withResultShaping<T extends { tool: (...args: any[]) => unknown }>(server: T, opts: ResultShaping, footer: FooterSource): T {
  if (!opts.footer && opts.limit === 0) return server;
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) => {
          const handler = rest[rest.length - 1] as Handler;
          const annotations = rest.length >= 3 && typeof rest[rest.length - 2] === "object" ? (rest[rest.length - 2] as { readOnlyHint?: boolean }) : undefined;
          const readOnly = annotations?.readOnlyHint === true;
          const wrapped: Handler = async (args, extra) => shapeResult(name, (await handler(args, extra)) as ToolResult, readOnly, opts, footer);
          return target.tool(name, ...rest.slice(0, -1), wrapped);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
