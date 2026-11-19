import { describe, expect, it } from "vitest";
import { ContextExceededError, type ChatMessage } from "./llm.js";
import { askWithinContext, MIN_CONTEXT_CHARS } from "./run-phase.js";

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
});
