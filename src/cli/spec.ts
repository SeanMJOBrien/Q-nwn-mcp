#!/usr/bin/env node
/**
 * Build-spec CLI: schemas and validation for the small JSON specs a model or form fills in.
 *
 *   node dist/cli/spec.js kinds                     (the spec kinds and what each builds)
 *   node dist/cli/spec.js schema <kind>             (JSON Schema, for constrained decoding or a form)
 *   node dist/cli/spec.js validate <kind> <file|->  (errors by field, or the MCP tool calls that build it)
 *
 * Answers are one JSON object on stdout: { ok: true, result } or { ok: false, errors: [{ field, message }] }.
 * Exit code 0 when ok, 1 otherwise. Needs no module, game install or MCP client.
 */

import fs from "fs";
import { SPEC_KINDS, loadSpecSchema, specToToolCalls, validateSpec } from "../util/spec-validate.js";

function finish(ok: boolean, body: Record<string, unknown>): never {
  fs.writeSync(1, `${JSON.stringify({ ok, ...body }, null, 2)}\n`);
  process.exit(ok ? 0 : 1);
}

const [cmd, kind, file] = process.argv.slice(2);
const usage = "usage: spec kinds | spec schema <kind> | spec validate <kind> <file|->";

try {
  if (cmd === "kinds") {
    finish(true, { result: Object.entries(SPEC_KINDS).map(([name, k]) => ({ kind: name, builds: k.describes })) });
  }
  if (cmd === "schema" && kind) finish(true, { result: loadSpecSchema(kind) });
  if (cmd === "validate" && kind && file) {
    loadSpecSchema(kind); // unknown kind fails here with the valid names
    let spec: unknown;
    try {
      spec = JSON.parse(fs.readFileSync(file === "-" ? 0 : file, "utf8"));
    } catch (e) {
      finish(false, { errors: [{ field: "", message: `not valid JSON: ${(e as Error).message}` }] });
    }
    const { ok, errors } = validateSpec(kind, spec);
    if (!ok) finish(false, { errors });
    finish(true, { result: { calls: specToToolCalls(kind, spec) } });
  }
  finish(false, { errors: [{ field: "", message: usage }] });
} catch (e) {
  finish(false, { errors: [{ field: "", message: (e as Error).message }] });
}
