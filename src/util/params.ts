/**
 * Shared parameter helpers for MCP tool handlers.
 *
 * Numeric tool params are declared z.string() and parsed by hand (toF/toI). At registration every string param is
 * widened by util/lenient-args.ts (src/index.ts, with MCP_LENIENT_ARGS=1) to also accept a number, boolean, array or object, which reaches the
 * handler as a string; so a handler still sees "12" whether the client sent "12" or 12. Keep declaring z.string() here.
 */

import { z } from "zod";

/** z.string() schema for a required numeric param */
export const numParam = (desc: string) => z.string().describe(desc);

/** z.string().optional() schema for an optional numeric param */
export const optNumParam = (desc: string) => z.string().optional().describe(desc);

/** Parse a string/number param to float, with default */
export const toF = (v: string | number | undefined, def = 0): number =>
  v === undefined ? def : parseFloat(String(v));

/** Parse a string/number param to int, with default */
export const toI = (v: string | number | undefined, def = 0): number =>
  v === undefined ? def : parseInt(String(v), 10);
