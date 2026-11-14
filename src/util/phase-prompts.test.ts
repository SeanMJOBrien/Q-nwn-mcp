import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { registerAll } from "../register-all.js";
import { isToolAllowed, resolveToolProfile } from "../tool-profiles.js";
import { OWN_SECTION, PHASES, REQUIRED_SECTIONS } from "./phase-check.js";
import { PHASE_PROMPT_DIR, PHASE_PROMPT_MAX_BYTES, loadPhasePrompt, parsePhasePrompt } from "./phase-prompts.js";
import { collectTools, findCalls, lintCalls } from "./skill-lint.js";
import { SPEC_KINDS } from "./spec-validate.js";

const tools = collectTools(path.join(import.meta.dirname, "..", "tools"));
const registered: string[] = [];
registerAll({ tool: (n: string) => void registered.push(n) } as never);

describe("phase prompts", () => {
  it("has exactly one prompt per phase", () => {
    expect(fs.readdirSync(PHASE_PROMPT_DIR).sort()).toEqual(PHASES.map((p) => `${p}.md`).sort());
  });

  for (const phase of PHASES) {
    describe(phase, () => {
      const prompt = loadPhasePrompt(phase);
      const skill = { name: `phase-prompt:${phase}`, text: prompt.body };
      const calls = findCalls(skill).filter((c) => registered.includes(c.tool) || tools.has(c.tool));

      it(`fits in ${PHASE_PROMPT_MAX_BYTES} bytes`, () => {
        expect(Buffer.byteLength(prompt.body, "utf8")).toBeLessThanOrEqual(PHASE_PROMPT_MAX_BYTES);
      });

      it("front matter matches the phase tables", () => {
        expect(prompt.phase).toBe(phase);
        expect(prompt.writes).toBe(OWN_SECTION[phase]);
        for (const r of prompt.reads) expect(REQUIRED_SECTIONS[phase], `reads ${r}`).toContain(r);
        for (const s of prompt.specs) expect(s === "quest" || s in SPEC_KINDS, `spec ${s}`).toBe(true);
        expect(() => resolveToolProfile(prompt.profile.join(","))).not.toThrow();
      });

      it("every tool call names a registered tool with real parameters", () => {
        expect(lintCalls([skill], tools)).toEqual([]);
      });

      it("every tool it calls is in its profile", () => {
        const profile = resolveToolProfile(prompt.profile.join(","));
        const outside = [...new Set(calls.map((c) => c.tool))].filter((t) => !isToolAllowed(t, profile));
        expect(outside).toEqual([]);
      });

      it("starts and ends with phase_check and writes its section", () => {
        expect(prompt.body).toContain(`phase_check(phase: "${phase}", step: "start")`);
        expect(prompt.body).toContain(`phase_check(phase: "${phase}", step: "end")`);
        expect(prompt.body).toContain(`write_story_section(section: "${OWN_SECTION[phase]}"`);
        const last = calls.filter((c) => c.tool === "phase_check").pop();
        const write = calls.filter((c) => c.tool === "write_story_section").pop();
        expect((write?.line ?? 0) <= (last?.line ?? -1)).toBe(true);
      });
    });
  }

  it("rejects a prompt without front matter or with an unknown phase", () => {
    expect(() => parsePhasePrompt("# no front matter")).toThrow();
    expect(() => parsePhasePrompt("---\nphase: nope\n---\nbody")).toThrow(/nope/);
  });
});
