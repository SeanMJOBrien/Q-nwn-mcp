import { describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { parseDriveArgs, parsePhases, readPlotFile } from "../cli/drive.js";
import { coerceArgs } from "./coerce.js";
import { type ChatMessage, type ToolCall, slimSchema, toolCallsFromText } from "./llm.js";
import { PHASES } from "../util/phase-check.js";
import { loadPhasePrompt } from "../util/phase-prompts.js";
import { type HostTool, type ToolHost, runPhase, specErrors, trimContext, withoutStartCheck } from "./run-phase.js";

const str = { type: "string" };
const tool = (name: string, properties: Record<string, { type: string; enum?: unknown[] }> = {}, required: string[] = []): HostTool => ({
  name,
  description: name,
  inputSchema: { type: "object", properties, required },
});

describe("coerceArgs", () => {
  const schema = { type: "object", properties: { x: str, items: str, dryRun: { type: "boolean" }, step: { type: "string", enum: ["start", "end"] } }, required: ["x"] };
  it("turns numbers and lists into the strings the tools take, and \"true\" into a boolean", () => {
    const r = coerceArgs(schema, { x: 45.5, items: [{ resref: "a" }], dryRun: "true", step: "end" });
    expect(r.errors).toEqual([]);
    expect(r.args).toEqual({ x: "45.5", items: '[{"resref":"a"}]', dryRun: true, step: "end" });
  });
  it("names an unknown parameter, a missing one and a bad choice", () => {
    const r = coerceArgs(schema, { z: 1, step: "middle" });
    expect(r.errors.map((e) => e.field)).toEqual(["z", "step", "x"]);
    expect(r.errors[0].message).toContain("x, items, dryRun, step");
  });
  it("drops nulls", () => {
    expect(coerceArgs(schema, { x: "1", items: null }).args).toEqual({ x: "1" });
  });
});

describe("toolCallsFromText", () => {
  it("recovers a call written into the text", () => {
    expect(toolCallsFromText('<tool_call>{"name": "read_story", "arguments": {"sections": "Plot"}}</tool_call>')).toEqual([
      { id: "text_0", name: "read_story", arguments: { sections: "Plot" } },
    ]);
    expect(toolCallsFromText('```json\n{"name":"verify_all","parameters":{}}\n```')[0].name).toBe("verify_all");
    expect(toolCallsFromText("DONE")).toEqual([]);
  });
});

describe("slimSchema", () => {
  it("cuts long descriptions at any depth and keeps the rest", () => {
    const schema = { $schema: "x", type: "object", properties: { a: { type: "string", description: "d".repeat(50), enum: ["p", "q"] } }, required: ["a"] };
    expect(slimSchema(schema, 10)).toEqual({ type: "object", properties: { a: { type: "string", description: "dddddddddd...", enum: ["p", "q"] } }, required: ["a"] });
  });
});

describe("specErrors", () => {
  it("checks tool arguments against the build spec and names the field", () => {
    const base = { resref: "boss", name: "Harl", area: "a1", x: "8", y: "9", race: "6", classId: "4", level: "5", gender: "0" };
    expect(specErrors("build_key_npc", base)).toEqual([]);
    expect(specErrors("build_key_npc", { ...base, tag: "t", gearWealth: "0" })).toEqual([]);
    expect(specErrors("build_key_npc", { ...base, classId: "14" }).map((e) => e.field)).toEqual(["classId"]);
    const nodes = JSON.stringify([{ speaker: "npc", text: "Hi", children: [{ speaker: "npc", text: "?" }] }]);
    expect(specErrors("create_dialog", { resref: "dlg_x", nodes })[0].field).toBe("nodes[0].children[0].speaker");
    expect(specErrors("create_dialog", { resref: "dlg_x", nodes: "[{" })[0].field).toBe("nodes");
    expect(specErrors("place_creature", { anything: 1 })).toEqual([]);
  });
});

describe("trimContext", () => {
  it("removes the oldest tool results first and keeps the prompt and the latest turns", () => {
    const big = "x".repeat(1000);
    const messages: ChatMessage[] = [{ role: "system", content: "s" }, { role: "user", content: "prompt" }];
    for (let i = 0; i < 8; i++) messages.push({ role: "tool", content: big, tool_call_id: `c${i}` });
    trimContext(messages, 5000);
    expect(messages[1].content).toBe("prompt");
    expect(messages[2].content).toMatch(/removed/);
    expect(messages[9].content).toBe(big);
  });
});

/** A host whose phase_check passes once the Plot section has been written. */
function fakeHost(log: string[]): ToolHost {
  let written = false;
  return {
    listTools: async () => [
      tool("phase_check", { phase: str, step: str }, ["phase", "step"]),
      tool("read_story", { sections: str }),
      tool("write_story_section", { section: str, text: str }, ["section", "text"]),
      tool("plan_adventure_shape", { playMinutes: str, biome: str }, ["playMinutes"]),
      tool("paint_tiles", { area: str }),
      tool("load_module", { modPath: str }),
    ],
    callTool: async (name, args) => {
      log.push(`${name} ${JSON.stringify(args)}`);
      if (name === "phase_check") {
        if (args.step === "start") return { text: JSON.stringify({ ok: true }), isError: false };
        return { text: JSON.stringify(written ? { ok: true, status: "success" } : { ok: false, errors: ['adventure.md has no non-empty "## Plot" section'] }), isError: false };
      }
      if (name === "write_story_section") written = true;
      if (name === "plan_adventure_shape" && args.playMinutes === "0") return { text: "playMinutes must be positive", isError: true };
      return { text: JSON.stringify({ ok: true }), isError: false };
    },
  };
}

const call = (name: string, args: unknown, id = "c"): ToolCall => ({ id, name, arguments: typeof args === "string" ? args : JSON.stringify(args) });
const scripted = (turns: Array<ToolCall[] | string>, seen: ChatMessage[][] = [], offered: string[][] = []) => {
  let i = 0;
  return async (messages: ChatMessage[], tools: Array<{ name: string }>): Promise<ChatMessage> => {
    seen.push(messages.map((m) => ({ ...m })));
    offered.push(tools.map((t) => t.name));
    const turn = turns[Math.min(i++, turns.length - 1)];
    return typeof turn === "string" ? { role: "assistant", content: turn } : { role: "assistant", content: "", tool_calls: turn };
  };
};

describe("runPhase", () => {
  it("runs the steps, repairs arguments, and ends when the phase check passes", async () => {
    const log: string[] = [];
    const offered: string[][] = [];
    const r = await runPhase(
      fakeHost(log),
      scripted(
        [
          [call("read_story", { sections: "Module" })],
          [call("plan_adventure_shape", { playMinutes: 90, biome: "forest" })],
          [call("write_story_section", { section: "Plot", text: "### Premise\nx" })],
          [call("phase_check", { phase: "plot", step: "end" })],
        ],
        [],
        offered,
      ),
      "plot",
    );
    expect(r).toMatchObject({ status: "success", steps: 4, toolCalls: 4, errors: [] });
    expect(log).toContain('plan_adventure_shape {"playMinutes":"90","biome":"forest"}');
    // only the phase's tools are offered: no painting in the plot phase, and never the driver's own tools
    expect(offered[0]).toEqual(["phase_check", "read_story", "write_story_section", "plan_adventure_shape"]);
  });

  it("refuses an unknown tool, bad JSON and an unknown parameter without calling the host", async () => {
    const log: string[] = [];
    const seen: ChatMessage[][] = [];
    const r = await runPhase(
      fakeHost(log),
      scripted(
        [
          [call("paint_tiles", { area: "a" }, "c1"), call("read_story", "{not json", "c2"), call("read_story", { section: "Plot" }, "c3")],
          [call("write_story_section", { section: "Plot", text: "ok" })],
          "DONE",
        ],
        seen,
      ),
      "plot",
    );
    expect(r.status).toBe("success");
    expect(log.filter((l) => l.startsWith("paint_tiles") || l.startsWith("read_story"))).toEqual([]);
    const refusals = seen[1].filter((m) => m.role === "tool").map((m) => JSON.parse(m.content));
    expect(refusals[0].error).toContain('no tool "paint_tiles"');
    expect(refusals[1].error).toContain("not valid JSON");
    expect(refusals[2].fields[0]).toMatchObject({ field: "section" });
  });

  it("when the model stops early the driver runs the phase check and feeds the errors back", async () => {
    const seen: ChatMessage[][] = [];
    const r = await runPhase(fakeHost([]), scripted(["I am done.", [call("write_story_section", { section: "Plot", text: "ok" })], "DONE"], seen), "plot");
    expect(r).toMatchObject({ status: "success", steps: 3 });
    const feedback = seen[1][seen[1].length - 1];
    expect(feedback.role).toBe("user");
    expect(feedback.content).toContain('no non-empty "## Plot" section');
  });

  it("gives up after the allowed number of failed checks and reports the errors", async () => {
    const r = await runPhase(fakeHost([]), scripted(["done"]), "plot", { retries: 2 });
    expect(r.status).toBe("failed");
    expect(r.reason).toContain("failed 3 times");
    expect(r.errors[0]).toContain("Plot");
  });

  it("stops at the step limit, and nudges after a repeated failing call", async () => {
    const seen: ChatMessage[][] = [];
    const r = await runPhase(fakeHost([]), scripted([[call("plan_adventure_shape", { playMinutes: "0" })]], seen), "plot", { maxSteps: 4 });
    expect(r).toMatchObject({ status: "failed", steps: 4 });
    expect(r.reason).toContain("4 model turns");
    expect(seen[3].some((m) => m.role === "user" && m.content.includes("repeated the same failing call"))).toBe(true);
  });

  it("reports a skipped phase and a blocked phase without calling the model", async () => {
    const host = (answer: object): ToolHost => ({ listTools: async () => [], callTool: async () => ({ text: JSON.stringify(answer), isError: false }) });
    const never = async (): Promise<ChatMessage> => {
      throw new Error("model called");
    };
    expect((await runPhase(host({ ok: true, skipped: true }), never, "areas")).status).toBe("skipped");
    const blocked = await runPhase(host({ ok: false, stop: "ERROR: missing ## Plot" }), never, "areas");
    expect(blocked).toMatchObject({ status: "blocked", reason: "ERROR: missing ## Plot" });
  });
});

describe("withoutStartCheck", () => {
  it("replaces step 1 in every phase prompt and leaves the end check", () => {
    for (const phase of PHASES) {
      const body = withoutStartCheck(loadPhasePrompt(phase).body, phase);
      expect(body, phase).not.toContain('step: "start"');
      expect(body, phase).toContain("1. (Already done for you: the start check passed.)");
      expect(body, phase).toContain(`phase_check(phase: "${phase}", step: "end")`);
    }
  });
});

describe("readPlotFile", () => {
  const example = path.join(import.meta.dirname, "..", "..", "docs", "specs", "plot.example.json");
  it("reads a good plot and names the fields of a bad one", () => {
    const good = readPlotFile(example);
    expect("plot" in good && good.plot.title).toBe("The Mill on Blackwater");

    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "plot-"));
    try {
      const bad = path.join(dir, "bad.json");
      const spec = JSON.parse(fs.readFileSync(example, "utf8"));
      spec.npcs[0].location = "Nowhere";
      fs.writeFileSync(bad, JSON.stringify(spec));
      const r = readPlotFile(bad);
      expect("errors" in r && r.errors.map((e) => e.field)).toEqual(["npcs[0].location"]);
      fs.writeFileSync(bad, "{not json");
      const broken = readPlotFile(bad);
      expect("errors" in broken && broken.errors[0].message).toContain("cannot read it as JSON");
      expect("errors" in readPlotFile(path.join(dir, "missing.json"))).toBe(true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  it("--plot is a known option", () => {
    expect(parseDriveArgs(["--plot", "p.json", "--dry-run"])).toMatchObject({ flags: { plot: "p.json" } });
  });
});

describe("drive CLI arguments", () => {
  it("parses flags and rejects unknown ones", () => {
    const ok = parseDriveArgs(["--module", "m", "--dry-run", "--phases", "quests"]);
    expect(ok.flags).toEqual({ module: "m", phases: "quests" });
    expect(ok.bools.has("dry-run")).toBe(true);
    expect(parseDriveArgs(["--nope"]).error).toContain("--nope");
    expect(parseDriveArgs(["--model"]).error).toContain("needs a value");
  });
  it("orders phases as the pipeline does and rejects unknown names", () => {
    expect(parsePhases("quests, areas")).toEqual(["areas", "quests"]);
    expect(parsePhases(undefined)).toHaveLength(9);
    expect(() => parsePhases("areas,loot")).toThrow(/loot/);
  });
});
