/**
 * Short phase prompts for small models (docs/phase-prompts/<phase>.md): the steps and tool order of one
 * /create-adventure phase in under 4 KB, in place of the 12-36 KB skill. Front matter names the tool
 * profile the phase needs (MCP_TOOL_PROFILE), the build specs it uses, and the story sections it reads
 * and writes. Served by the `get_phase_prompt` tool and, later, the driver.
 */

import fs from "fs";
import path from "path";
import { PHASES, type Phase } from "./phase-check.js";

export const PHASE_PROMPT_DIR = path.join(import.meta.dirname, "..", "..", "docs", "phase-prompts");

/** Upper size of a prompt body in bytes: it must fit a small context beside the tool list and the story sections. */
export const PHASE_PROMPT_MAX_BYTES = 4096;

export interface PhasePrompt {
  phase: Phase;
  /** Tool profiles to start the server with for this phase. */
  profile: string[];
  /** Build-spec kinds the phase fills in ("quest" is the build_quest spec). */
  specs: string[];
  /** Story sections to hand to the model. */
  reads: string[];
  /** The section the phase writes. */
  writes: string;
  /** The prompt text (no front matter). */
  body: string;
}

const list = (value: string | undefined): string[] =>
  (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

export function parsePhasePrompt(text: string): PhasePrompt {
  const m = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(text);
  if (!m) throw new Error("phase prompt has no front matter");
  const meta: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = /^([a-z]+):\s*(.*)$/.exec(line);
    if (kv) meta[kv[1]] = kv[2];
  }
  if (!(PHASES as readonly string[]).includes(meta.phase)) throw new Error(`phase prompt names unknown phase "${meta.phase}"`);
  return {
    phase: meta.phase as Phase,
    profile: list(meta.profile),
    specs: list(meta.specs),
    reads: list(meta.reads),
    writes: meta.writes ?? "",
    body: m[2].trim(),
  };
}

export function loadPhasePrompt(phase: Phase): PhasePrompt {
  return parsePhasePrompt(fs.readFileSync(path.join(PHASE_PROMPT_DIR, `${phase}.md`), "utf8"));
}
