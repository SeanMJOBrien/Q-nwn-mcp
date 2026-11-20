import { describe, expect, it } from "vitest";
import { ContextExceededError, type ChatMessage } from "./llm.js";
import { newBudget, overflowNumbers, shrinkOnOverflow } from "./context-budget.js";
import { askWithinContext, MIN_CONTEXT_CHARS, messageChars, TRIMMED_ARGUMENTS, trimContext } from "./run-phase.js";

const size = (messages: ChatMessage[]) => messages.reduce((n, m) => n + m.content.length, 0);
const tool = (n: number): ChatMessage => ({ role: "tool", tool_call_id: `t${n}`, content: "x".repeat(3000) });

describe("context budget", () => {
  it("shrinks the conversation and asks again when the server's window is exceeded", async () => {
    const serverWindow = 9_000;
    const messages: ChatMessage[] = [{ role: "system", content: "s".repeat(500) }, { role: "user", content: "go" }];
    for (let i = 0; i < 10; i++) messages.push(tool(i), { role: "assistant", content: "ok" });
    const sizes: number[] = [];
    const chat = async (msgs: ChatMessage[]): Promise<ChatMessage> => {
      sizes.push(size(msgs));
      if (size(msgs) > serverWindow) throw new ContextExceededError("model context exceeded: Context size has been exceeded.");
      return { role: "assistant", content: "DONE" };
    };
    const budget = { chars: 48_000 };
    const events: Record<string, unknown>[] = [];
    const reply = await askWithinContext(chat, messages, [], budget, (e) => events.push(e));
    expect(reply.content).toBe("DONE");
    expect(sizes.length).toBeGreaterThan(1);
    expect(budget.chars).toBeLessThan(48_000);
    expect(events.some((e) => e.event === "context_exceeded")).toBe(true);
  });

  it("gives up at the minimum budget and throws the overflow", async () => {
    const messages: ChatMessage[] = [{ role: "system", content: "s".repeat(MIN_CONTEXT_CHARS * 2) }, { role: "user", content: "go" }];
    const chat = async (): Promise<ChatMessage> => {
      throw new ContextExceededError("model context exceeded: too big");
    };
    const budget = { chars: 48_000 };
    await expect(askWithinContext(chat, messages, [], budget, () => {})).rejects.toBeInstanceOf(ContextExceededError);
    expect(budget.chars).toBe(MIN_CONTEXT_CHARS);
  });

  it("passes other failures straight through", async () => {
    const chat = async (): Promise<ChatMessage> => {
      throw new Error("model endpoint answered 404");
    };
    await expect(askWithinContext(chat, [{ role: "user", content: "go" }], [], { chars: 48_000 }, () => {})).rejects.toThrow(/404/);
  });

  it("trims old tool-call arguments when the results alone do not fit", () => {
    const big = JSON.stringify({ section: "x".repeat(5000) });
    const messages: ChatMessage[] = [
      { role: "system", content: "s" },
      { role: "user", content: "go" },
      { role: "assistant", content: "", tool_calls: [{ id: "a", name: "write_story_section", arguments: big }] },
      { role: "tool", tool_call_id: "a", content: "ok" },
      { role: "assistant", content: "" },
      { role: "user", content: "next" },
      { role: "assistant", content: "" },
      { role: "user", content: "end" },
    ];
    trimContext(messages, 1000);
    expect(messages[2].tool_calls?.[0].arguments).toBe(TRIMMED_ARGUMENTS);
    expect(messages[2].tool_calls?.[0].name).toBe("write_story_section");
  });

  it("counts the tool schemas against the budget, at the size they are sent", async () => {
    const tools = Array.from({ length: 70 }, (_, i) => ({ name: `t${i}`, description: "d".repeat(2_000), parameters: {} }));
    const messages: ChatMessage[] = [{ role: "system", content: "s" }, { role: "user", content: "go" }];
    for (let i = 0; i < 4; i++) messages.push({ role: "tool", tool_call_id: `t${i}`, content: "y".repeat(3000) }, { role: "assistant", content: "ok" });
    let seen = 0;
    const chat = async (msgs: ChatMessage[]): Promise<ChatMessage> => {
      seen = messageChars(msgs);
      return { role: "assistant", content: "DONE" };
    };
    await askWithinContext(chat, messages, tools, { chars: 30_000 }, () => {});
    expect(seen).toBeLessThan(12_000 + 2);
  });

  it("learns characters per token from the server's usage and follows a known window", async () => {
    const budget = newBudget({ contextTokens: 10_000 });
    expect(budget.chars).toBe(24_000); // 10k tokens x 0.8 x 3 characters (first guess)
    const messages: ChatMessage[] = [{ role: "user", content: "x".repeat(4_000) }];
    const chat = async (msgs: ChatMessage[]): Promise<ChatMessage> => ({ role: "assistant", content: "DONE", promptTokens: Math.round(messageChars(msgs) / 4) });
    await askWithinContext(chat, messages, [], budget, () => {});
    expect(budget.charsPerToken).toBeCloseTo(4, 1);
    expect(budget.chars).toBe(32_000);
  });

  it("shrinks to the window an overflow message names instead of halving", () => {
    const budget = newBudget({});
    const shrunk = shrinkOnOverflow(budget, 40_000, "the request (12000 tokens) exceeds the available context size (8192 tokens), try increasing it");
    expect(shrunk).toBe(true);
    expect(budget.tokens).toBe(8192);
    // 40000 characters were 12000 tokens: 3.33 characters per token, 80 % of 8192 tokens.
    expect(budget.chars).toBe(Math.floor(8192 * 0.8 * (40_000 / 12_000)));
    expect(overflowNumbers("n_ctx_slot = 4096, n_tokens = 5000")).toEqual({ available: 4096 });
  });

  it("halves without numbers, always below the refused request, and stops at the minimum", () => {
    const budget = newBudget({});
    shrinkOnOverflow(budget, 20_000, "Context size has been exceeded.");
    expect(budget.chars).toBe(10_000);
    budget.chars = MIN_CONTEXT_CHARS;
    expect(shrinkOnOverflow(budget, 5_000, "Context size has been exceeded.")).toBe(false);
  });
});
