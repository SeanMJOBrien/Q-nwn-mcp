/**
 * Lenient tool arguments for open / local models.
 *
 * Every numeric and list parameter of this server is declared as a string ("12", '["a","b"]'; see params.ts), and the
 * published JSON Schema said "string", so a model that sent 12 or a real array was refused by the client or the SDK
 * before any tool ran. And unknown argument names were dropped silently, so a model that invented `stats` or `type`
 * believed they had been used. This wrapper, applied once at registration (src/index.ts), changes every tool:
 *
 *  - a string parameter also accepts a number, a boolean, an array or an object; the handler still receives a string
 *    (numbers and booleans as text, arrays and objects as JSON), so no handler changes;
 *  - a boolean parameter also accepts "true"/"false"/"1"/"0";
 *  - an argument the tool does not have is refused with the list of the tool's parameters (required ones marked),
 *    instead of being ignored.
 *
 * The published schema shows the accepted input types (the SDK lists the input side of a transform).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

type Shape = Record<string, z.ZodType>;
type ToolResult = { content: Array<{ type: "text"; text: string }>; isError?: boolean };

const toText = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "object" && v !== null ? JSON.stringify(v) : String(v);

/** One parameter made lenient (unchanged when it is not a string or boolean). */
export function lenientField(schema: z.ZodType): z.ZodType {
  let inner: z.ZodType = schema;
  let optional = false;
  if (inner instanceof z.ZodOptional) {
    optional = true;
    inner = inner.unwrap() as z.ZodType;
  }
  const description = schema.description ?? inner.description;
  let out: z.ZodType;
  if (inner instanceof z.ZodString) {
    // The string branch is bare (no description, unless the parameter has checks): the description is written once,
    // on the whole parameter, so the published schema stays small (the full server's schema was ~4x its descriptions).
    const hasChecks = ((inner as unknown as { def?: { checks?: unknown[] } }).def?.checks ?? []).length > 0;
    const text = hasChecks ? inner : z.string();
    const accepted = z.union([text, z.number(), z.boolean(), z.array(z.unknown()), z.record(z.string(), z.unknown())]);
    out = (description ? accepted.describe(description) : accepted).transform(toText);
  } else if (inner instanceof z.ZodBoolean) {
    const accepted = z.union([inner, z.enum(["true", "false", "1", "0"])]);
    out = (description ? accepted.describe(description) : accepted).transform((v) => v === true || v === "true" || v === "1");
  } else {
    return schema;
  }
  if (description) out = out.describe(description);
  return optional ? out.optional() : out;
}

export function lenientShape(shape: Shape): Shape {
  return Object.fromEntries(Object.entries(shape).map(([k, s]) => [k, lenientField(s)]));
}

function isOptional(s: z.ZodType): boolean {
  return s.safeParse(undefined).success;
}

/** The message for arguments a tool does not have. */
export function unknownArgsMessage(tool: string, unknown: string[], shape: Shape): string {
  const params = Object.entries(shape).map(([k, s]) => (isOptional(s) ? k : `${k} (required)`));
  return (
    `${tool} has no parameter${unknown.length > 1 ? "s" : ""} ${unknown.map((u) => `"${u}"`).join(", ")}; nothing was done. ` +
    `It takes: ${params.length ? params.join(", ") : "no parameters"}. Call it again with only these names ` +
    "(see the tool description for what each means)."
  );
}

/**
 * Wrap a server so `server.tool(name, description, shape, [annotations], handler)` registers the tool with lenient
 * arguments and an unknown-argument check. Other members pass through.
 */
export function withLenientArgs(server: McpServer): McpServer {
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) => {
          const description = typeof rest[0] === "string" ? (rest.shift() as string) : undefined;
          const shape = (rest.length > 1 && typeof rest[0] === "object" ? rest.shift() : {}) as Shape;
          const annotations = rest.length > 1 ? rest.shift() : undefined;
          const handler = rest[0] as (args: Record<string, unknown>, extra: unknown) => unknown;
          const known = new Set(Object.keys(shape));
          const inputSchema = z.object(lenientShape(shape)).loose();
          const register = target.registerTool.bind(target) as unknown as (...a: unknown[]) => unknown;
          return register(
            name,
            { description, inputSchema, ...(annotations ? { annotations } : {}) },
            async (args: Record<string, unknown>, extra: unknown) => {
              const unknownKeys = Object.keys(args ?? {}).filter((k) => !known.has(k));
              if (unknownKeys.length > 0) {
                const result: ToolResult = { isError: true, content: [{ type: "text", text: unknownArgsMessage(name, unknownKeys, shape) }] };
                return result;
              }
              return handler(args, extra);
            },
          );
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
