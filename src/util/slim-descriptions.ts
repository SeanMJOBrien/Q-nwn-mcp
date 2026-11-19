/**
 * Shorter tool and parameter descriptions for a client with a small context window.
 *
 * Every tool's description and each parameter's description is sent with every request. The full
 * server exposes ~230 tools (about 400,000 characters of definitions), and a 50,000-token local
 * window cannot hold them, so a profile (MCP_TOOL_PROFILE) also shortens the text: the first
 * sentences up to the limit, cut at a word boundary. The driver already slims its own copies the
 * same way (300 characters per tool, 140 per parameter).
 */
import { z } from "zod";

export interface SlimLimits {
  /** Longest tool description kept, in characters (0 = keep every description whole). */
  tool: number;
  /** Longest parameter description kept, in characters (0 = keep every parameter description whole). */
  param: number;
}

export const SLIM_DEFAULTS: SlimLimits = { tool: 300, param: 140 };

/** The limits for this process: on with a profile, MCP_DESCRIPTION_LIMIT=0 turns them off (or a number sets the tool limit). */
export function slimLimitsFromEnv(profileSet: boolean, env: NodeJS.ProcessEnv = process.env): SlimLimits {
  const raw = (env.MCP_DESCRIPTION_LIMIT ?? "").trim();
  if (raw === "") return profileSet ? { ...SLIM_DEFAULTS } : { tool: 0, param: 0 };
  const tool = Math.max(0, Math.floor(Number(raw)) || 0);
  return { tool, param: tool === 0 ? 0 : Math.min(tool, SLIM_DEFAULTS.param) };
}

/** Cuts text to at most `max` characters, at a word boundary, marking the cut with "...". */
export function shortenText(text: string, max: number): string {
  if (max <= 0 || text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const space = cut.lastIndexOf(" ");
  return `${(space > max / 2 ? cut.slice(0, space) : cut).replace(/[\s,;:(]+$/, "")}...`;
}

type Shape = Record<string, z.ZodType>;

/** The same parameter schemas, with long descriptions shortened (a schema without a description is returned as it is). */
export function slimShape(shape: Shape, paramMax: number): Shape {
  if (paramMax <= 0) return shape;
  const out: Shape = {};
  for (const [key, schema] of Object.entries(shape)) {
    const description = (schema as { description?: string }).description;
    out[key] = typeof description === "string" && description.length > paramMax ? schema.describe(shortenText(description, paramMax)) : schema;
  }
  return out;
}

/** Wraps the server so every tool it registers gets the slimmed text. Place it above withLenientArgs. */
export function withSlimDescriptions<T extends { tool: (...args: any[]) => unknown }>(server: T, limits: SlimLimits): T {
  if (limits.tool <= 0 && limits.param <= 0) return server;
  return new Proxy(server, {
    get(target, prop, receiver) {
      if (prop === "tool") {
        return (name: string, ...rest: unknown[]) => {
          const hasDescription = typeof rest[0] === "string";
          const description = hasDescription ? (rest[0] as string) : undefined;
          const args = hasDescription ? rest.slice(1) : rest.slice();
          const shapeAt = args.length > 1 && typeof args[0] === "object" && args[0] !== null ? 0 : -1;
          if (shapeAt === 0) args[0] = slimShape(args[0] as Shape, limits.param);
          const slimmed = description !== undefined && limits.tool > 0 ? shortenText(description, limits.tool) : description;
          return target.tool(name, ...(slimmed !== undefined ? [slimmed] : []), ...args);
        };
      }
      const v = Reflect.get(target, prop, receiver);
      return typeof v === "function" ? v.bind(target) : v;
    },
  });
}
