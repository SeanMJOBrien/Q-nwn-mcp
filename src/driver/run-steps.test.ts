import { describe, expect, it } from "vitest";
import type { ChatMessage, ToolCall } from "./llm.js";
import type { HostTool, ToolHost } from "./run-phase.js";
import { SetupError } from "../util/setup-check.js";
import { nudgeText, plotBlock, promptSections, refusedFields, runPhaseSteps, saysDone, stepCard } from "./run-steps.js";

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
    if (!section) steps.push({ id: "areas.section", step: "story section written", call: "write_story_section(...)", areas: [], subject: "", tools: ["write_story_section"], auto: { tool: "write_story_section", args: { section: "Areas", draft: true } } } as never);
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
    expect(r.toolCalls).toBe(2);
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
    // the Areas section is drafted from the module by the driver, not written by the model
    expect(seen.length).toBe(4);
    expect(log).toContain('write_story_section {"section":"Areas","draft":true}');
  });

  it("leaves a step open after its tries and goes on; a failing phase check gets one repair pass", async () => {
    const log: string[] = [];
    const chat = async (): Promise<ChatMessage> => ({ role: "assistant", content: "DONE" });
    const r = await runPhaseSteps(fakeModule(log), chat, "areas", { stepTries: 1, maxSteps: 2 });
    expect(r.openSteps).toEqual(["areas.blackwater.create", "areas.millroad.create"]);
    expect(r.status).not.toBe("success");
    expect(log.filter((l) => l.startsWith("phase_check")).length).toBeGreaterThanOrEqual(3);
  });

  it("asks once for the call when the model answers with a plan and no tool call", async () => {
    const log: string[] = [];
    const nudges: string[] = [];
    const chat = async (messages: ChatMessage[]): Promise<ChatMessage> => {
      const last = messages[messages.length - 1];
      if (last.role === "user" && last.content.startsWith("You called no tool")) {
        nudges.push(last.content);
        const r = /"resref\\?":\\?"(\w+)/.exec(last.content)?.[1] ?? "blackwater";
        return { role: "assistant", content: "", tool_calls: [call("build_area", { spec: JSON.stringify({ resref: r }) })] };
      }
      if (last.role === "tool") return { role: "assistant", content: "DONE" };
      return { role: "assistant", content: "I will build the area with build_area, choosing the tileset ttr01." };
    };
    const r = await runPhaseSteps(fakeModule(log), chat, "areas", { stepTries: 1 });
    expect(nudges).toHaveLength(2);
    expect(nudges[0]).toContain("build_area(spec:");
    expect(r.openSteps ?? []).toEqual([]);
    expect(log.filter((l) => l.startsWith("build_area"))).toHaveLength(2);
  });

  it("does not nudge a DONE reply, and words the nudge with the step's call", () => {
    expect(saysDone("DONE")).toBe(true);
    expect(saysDone("The area is built. DONE")).toBe(true);
    expect(saysDone("I will now build it.")).toBe(false);
    expect(nudgeText({ call: "build_area(spec: ...)" })).toContain("make the call now: build_area(spec: ...)");
    expect(nudgeText({})).toContain("call the tool for this step now");
  });

  it("runs a step's auto call itself and asks the model only when the step stays open", async () => {
    const log: string[] = [];
    const host = fakeModule(log);
    const base = host.callTool;
    host.callTool = async (name, args) => {
      if (name === "get_progress") {
        const r = JSON.parse((await base(name, args)).text) as { open: Array<Record<string, unknown>> };
        for (const o of r.open) if (String(o.id).endsWith(".create")) o.auto = { tool: "build_area", args: { spec: JSON.stringify({ resref: String(o.id).split(".")[1] }) } };
        return { text: JSON.stringify(r), isError: false };
      }
      return base(name, args);
    };
    let turns = 0;
    const chat = async (): Promise<ChatMessage> => {
      turns++;
      return { role: "assistant", content: "DONE" };
    };
    const r = await runPhaseSteps(host, chat, "areas");
    expect(r.status).toBe("success");
    expect(turns).toBe(0);
    expect(log.filter((l) => l.startsWith("build_area"))).toHaveLength(2);
  });

  it("ends a step conversation when the model repeats the same failing call", async () => {
    const log: string[] = [];
    const host = fakeModule(log);
    const base = host.callTool;
    let builds = 0;
    host.callTool = async (name, args) => {
      if (name !== "build_area") return base(name, args);
      builds++;
      return { text: JSON.stringify({ ok: false, error: "no" }), isError: true };
    };
    const chat = async (): Promise<ChatMessage> => ({ role: "assistant", content: "", tool_calls: [call("build_area", { spec: '{"resref":"blackwater"}' })] });
    await runPhaseSteps(host, chat, "areas", { stepTries: 1, stepTurns: 12, maxSteps: 1 });
    // 5 identical failures end the first step's conversation, well before its 12 turns
    // each area step's conversation ends after 5 identical failures (not its 12 turns); the repair pass has 1 turn
    expect(builds).toBe(5 + 5 + 1);

  });

  it("stops the run on a setup error instead of letting the model retry", async () => {
    const log: string[] = [];
    const host = fakeModule(log);
    const base = host.callTool;
    host.callTool = async (name, args) =>
      name === "build_area" ? { text: JSON.stringify({ ok: false, error: "adventure_generate_layout: nwn_resman_extract failed: spawn /x/nwn_resman_extract ENOENT" }), isError: true } : base(name, args);
    let turns = 0;
    const chat = async (): Promise<ChatMessage> => {
      turns++;
      return { role: "assistant", content: "", tool_calls: [call("build_area", { spec: '{"resref":"blackwater"}' })] };
    };
    await expect(runPhaseSteps(host, chat, "areas")).rejects.toBeInstanceOf(SetupError);
    expect(turns).toBe(1);
  });

  it("puts the field errors of earlier steps on the next step's card", async () => {
    const lines = refusedFields("build_area", JSON.stringify({ ok: false, fields: [{ field: "features", message: "a list of feature group names" }, { field: "size", message: "is not a field; fields: resref, name" }] }), { spec: '{"features":"rural","size":"medium"}' });
    expect(lines.map((l) => l.line)).toEqual(['build_area features: a list of feature group names (was "rural")', 'build_area size: is not a field (was "medium")']);
    expect(refusedFields("build_area", "not json")).toEqual([]);

    const log: string[] = [];
    const host = fakeModule(log);
    const base = host.callTool;
    let refusedOnce = false;
    host.callTool = async (name, args) => {
      if (name === "build_area" && !refusedOnce) {
        refusedOnce = true;
        return { text: JSON.stringify({ ok: false, fields: [{ field: "features", message: "a list of feature group names" }] }), isError: true };
      }
      return base(name, args);
    };
    const cards: string[] = [];
    const chat = async (messages: ChatMessage[]): Promise<ChatMessage> => {
      const card = String(messages[1]?.content ?? "");
      if (messages.length === 2) cards.push(card);
      const done = messages.some((m) => m.role === "tool" && !m.content.includes('"ok":false'));
      if (done) return { role: "assistant", content: "DONE" };
      const r = /YOUR STEP: (\w+) created/.exec(card)?.[1];
      if (r) return { role: "assistant", content: "", tool_calls: [call("build_area", { spec: JSON.stringify({ resref: r, features: "rural" }) })] };
      return { role: "assistant", content: "", tool_calls: [call("write_story_section", { section: "Areas", text: "x" })] };
    };
    await runPhaseSteps(host, chat, "areas");
    expect(cards[0]).not.toContain("Refused earlier");
    expect(cards[1]).toContain('Refused earlier in this phase (do not repeat these mistakes):\n- build_area features: a list of feature group names (was "rural")');
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
