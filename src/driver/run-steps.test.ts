import { describe, expect, it } from "vitest";
import type { ChatMessage, ToolCall } from "./llm.js";
import type { HostTool, ToolHost } from "./run-phase.js";
import { plotBlock, promptSections, runPhaseSteps, stepCard } from "./run-steps.js";

const str = { type: "string" };
const tool = (name: string, properties: Record<string, { type: string }> = {}): HostTool => ({ name, description: name, inputSchema: { type: "object", properties, required: [] } });
const call = (name: string, args: unknown, id = "c"): ToolCall => ({ id, name, arguments: JSON.stringify(args) });

const PLOT = "### Locations\n#### 1. Blackwater Village\n- **Resref:** blackwater\n- **Tileset:** ttr01\n#### 2. The Mill Road\n- **Resref:** millroad\n";

/** A module with two areas to build; each build_area call ticks one; the section and phase_check follow. */
function fakeModule(log: string[]) {
  const built = new Set<string>();
  let section = false;
  const open = () => {
    const steps = ["blackwater", "millroad"]
      .filter((r) => !built.has(r))
      .map((r) => ({ id: `areas.${r}.create`, step: `${r} created`, call: `build_area(spec: "{\\"resref\\":\\"${r}\\"}")`, areas: [r], subject: r === "blackwater" ? "Blackwater Village" : "The Mill Road", tools: ["build_area"] }));
    if (!section) steps.push({ id: "areas.section", step: "story section written", call: "write_story_section(...)", areas: [], subject: "", tools: ["write_story_section"] });
    return steps;
  };
  const host: ToolHost = {
    listTools: async () => [
      tool("phase_check", { phase: str, step: str }),
      tool("get_progress", { phase: str }),
      tool("get_area_card", { area: str }),
      tool("read_story", { sections: str }),
      tool("build_area", { spec: str }),
      tool("write_story_section", { section: str, text: str }),
      tool("paint_tiles", { area: str }),
    ],
    callTool: async (name, args) => {
      log.push(`${name} ${JSON.stringify(args)}`);
      if (name === "phase_check") return { text: JSON.stringify(args.step === "start" || (built.size === 2 && section) ? { ok: true } : { ok: false, errors: ["not yet"] }), isError: false };
      if (name === "get_progress") return { text: JSON.stringify({ goal: "a haunted mill", decisions: ["bandits, not goblins"], open: open() }), isError: false };
      if (name === "read_story") return { text: PLOT, isError: false };
      if (name === "get_area_card") return { text: args.area ? `${args.area} card` : "all areas", isError: false };
      if (name === "build_area") {
        const r = JSON.parse(String(args.spec)).resref as string;
        built.add(r);
        return { text: JSON.stringify({ ok: true, area: r }), isError: false, footer: "[progress 2/9 · areas · next: x → y]" };
      }
      if (name === "write_story_section") section = true;
      return { text: JSON.stringify({ ok: true }), isError: false };
    },
  };
  return host;
}

describe("step mode", () => {
  it("runs one short conversation per open step, with the step's card and only its tools", async () => {
    const log: string[] = [];
    const seen: ChatMessage[][] = [];
    const offered: string[][] = [];
    const turns: Array<ToolCall[] | string> = [
      [call("build_area", { spec: '{"resref":"blackwater"}' })], "DONE",
      [call("build_area", { spec: '{"resref":"millroad"}' })], "DONE",
      [call("write_story_section", { section: "Areas", text: "### Blackwater" })], "DONE",
    ];
    let i = 0;
    const chat = async (messages: ChatMessage[], tools: Array<{ name: string }>): Promise<ChatMessage> => {
      seen.push(messages.map((m) => ({ ...m })));
      offered.push(tools.map((t) => t.name));
      const t = turns[i++] ?? "DONE";
      return typeof t === "string" ? { role: "assistant", content: t } : { role: "assistant", content: "", tool_calls: t };
    };
    const r = await runPhaseSteps(fakeModule(log), chat, "areas");
    expect(r.status).toBe("success");
    expect(r.toolCalls).toBe(3);
    // each step starts fresh: system + card
    expect(seen[0].length).toBe(2);
    expect(seen[2].length).toBe(2);
    const card = seen[0][1].content;
    expect(card).toContain("a haunted mill");
    expect(card).toContain("bandits, not goblins");
    expect(card).toContain("YOUR STEP: blackwater created");
    expect(card).toContain("- **Resref:** blackwater");
    expect(card).toContain("blackwater card");
    // only the step's tools and the always-on ones; never paint_tiles
    expect(offered[0]).toContain("build_area");
    expect(offered[0]).not.toContain("paint_tiles");
    expect(offered[0]).not.toContain("write_story_section");
    // the progress line reaches the model with the result
    expect(seen[1].at(-1)?.content).toContain("[progress 2/9");
    // the section step gets the format, not the rules
    expect(seen[4][1].content).toContain("all areas");
  });

  it("leaves a step open after its tries and goes on; a failing phase check gets one repair pass", async () => {
    const log: string[] = [];
    const chat = async (): Promise<ChatMessage> => ({ role: "assistant", content: "DONE" });
    const r = await runPhaseSteps(fakeModule(log), chat, "areas", { stepTries: 1, maxSteps: 2 });
    expect(r.openSteps).toEqual(["areas.blackwater.create", "areas.millroad.create", "areas.section"]);
    expect(r.status).not.toBe("success");
    expect(log.filter((l) => l.startsWith("phase_check")).length).toBeGreaterThanOrEqual(3);
  });

  it("splits a phase prompt into its sections and finds the plot block of a subject", () => {
    const parts = promptSections("# P\n\n## Steps\n1. a\n## Rules\n- r\n## Format of the section\nx");
    expect(parts.map(([n]) => n)).toEqual(["Steps", "Rules", "Format of the section"]);
    expect(plotBlock(PLOT, "The Mill Road")).toContain("millroad");
    expect(plotBlock(PLOT, "Nowhere")).toBeUndefined();
    const card = stepCard({ phase: "areas", step: { id: "x", step: "do x", call: "x()" }, openCount: 1, facts: [], rules: "R" });
    expect(card).toContain("1 step still open");
  });
});
