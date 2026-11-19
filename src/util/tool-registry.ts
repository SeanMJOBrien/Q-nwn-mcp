/**
 * Every tool's handler, kept so one tool can run others in-process (build_area runs suggest_area_size, the layout
 * tools, create_area, place_tile_doors and set_area_properties). Recorded at registration, outside the tool-profile
 * filter, so a combined tool works whatever profile hides the tools it uses.
 */

import { z } from "zod";
import { lenientShape } from "./lenient-args.js";
import { markFailure } from "./tool-result.js";

type Shape = Record<string, z.ZodType>;
type Handler = (args: Record<string, unknown>, extra: unknown) => unknown;
interface Recorded {
  description: string;
  shape: Shape;
  annotations?: { readOnlyHint?: boolean };
  handler: Handler;
}

const registry = new Map<string, Recorded>();

export interface ToolOutcome {
  text: string;
  isError: boolean;
  /** The result parsed as JSON, when it is JSON. */
  json?: Record<string, unknown>;
}

/** Wrap a server so each `tool(...)` registration is also recorded here; registrations pass through unchanged. */
export function recordTools<T extends { tool: (...args: any[]) => unknown }>(server: T): T {
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) => {
          const args = [...rest];
          const description = typeof args[0] === "string" ? (args.shift() as string) : "";
          const shape = (args.length > 1 && typeof args[0] === "object" ? args.shift() : {}) as Shape;
          const annotations = (args.length > 1 ? args.shift() : undefined) as Recorded["annotations"];
          // The result contract (util/tool-result.ts): a failure reported in the text gets isError, for the client and
          // for the in-process callers alike.
          const raw = args[0] as Handler;
          const handler: Handler = async (a, extra) => markFailure(name, await raw(a, extra));
          registry.set(name, { description, shape, annotations, handler });
          return target.tool(name, ...rest.slice(0, rest.length - 1), handler);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}

export function isReadOnlyTool(name: string): boolean {
  return registry.get(name)?.annotations?.readOnlyHint === true;
}

/** Every recorded tool, sorted by name. */
export function recordedTools(): Array<{ name: string; description: string; params: string[] }> {
  return [...registry.entries()]
    .map(([name, r]) => ({ name, description: r.description, params: Object.keys(r.shape) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function hasTool(name: string): boolean {
  return registry.has(name);
}

/** Run a recorded tool with arguments given as values or text (parsed as the MCP client's arguments would be). */
export async function callTool(name: string, args: Record<string, unknown>): Promise<ToolOutcome> {
  const tool = registry.get(name);
  if (!tool) return { text: `no tool ${name}`, isError: true };
  const parsed = z.object(lenientShape(tool.shape)).safeParse(args);
  if (!parsed.success) return { text: `${name}: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`, isError: true };
  try {
    const r = (await tool.handler(parsed.data as Record<string, unknown>, {})) as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
    const text = (r?.content ?? []).map((c) => c.text ?? "").join("\n");
    let json: Record<string, unknown> | undefined;
    try {
      const v = JSON.parse(text) as unknown;
      if (v && typeof v === "object" && !Array.isArray(v)) json = v as Record<string, unknown>;
    } catch {
      json = undefined;
    }
    return { text, isError: r?.isError === true, ...(json ? { json } : {}) };
  } catch (e) {
    return { text: `${name}: ${(e as Error).message}`, isError: true };
  }
}
