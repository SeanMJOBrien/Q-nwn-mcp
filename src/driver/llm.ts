/** Minimal client for an OpenAI-compatible chat-completions endpoint (Ollama, llama.cpp, LM Studio, vLLM, ...). */

export interface ToolCall {
  id: string;
  name: string;
  /** Raw argument text as the model wrote it (JSON), or an object when the server already parsed it. */
  arguments: string | Record<string, unknown>;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolSpec {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export type Chat = (messages: ChatMessage[], tools: ToolSpec[]) => Promise<ChatMessage>;

export interface LlmOptions {
  /** Base URL ending in /v1, e.g. http://localhost:11434/v1 */
  endpoint: string;
  model: string;
  apiKey?: string;
  temperature?: number;
  timeoutMs?: number;
  /** Longest tool description sent, in characters (the full ones are written for large models). */
  maxDescription?: number;
  /** Longest parameter description sent, in characters. */
  maxParamDescription?: number;
}

/**
 * Some local models write the call into the text instead of using the tool-call field:
 * `<tool_call>{"name": ..., "arguments": {...}}</tool_call>` or a bare JSON object. Recover those.
 */
export function toolCallsFromText(content: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const candidates: string[] = [];
  for (const m of content.matchAll(/<tool_call>\s*([\s\S]*?)\s*<\/tool_call>/g)) candidates.push(m[1]);
  if (candidates.length === 0) {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(content);
    const text = (fenced ? fenced[1] : content).trim();
    if (text.startsWith("{") && text.endsWith("}")) candidates.push(text);
  }
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c) as { name?: unknown; arguments?: unknown; parameters?: unknown };
      if (typeof obj.name === "string") {
        const args = (obj.arguments ?? obj.parameters ?? {}) as string | Record<string, unknown>;
        calls.push({ id: `text_${calls.length}`, name: obj.name, arguments: args });
      }
    } catch {
      /* not a tool call */
    }
  }
  return calls;
}

/** A copy of a tool's JSON Schema with long parameter descriptions cut and the `$schema` key dropped. */
export function slimSchema(schema: unknown, maxDescription: number): unknown {
  if (Array.isArray(schema)) return schema.map((v) => slimSchema(v, maxDescription));
  if (!schema || typeof schema !== "object") return schema;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(schema as Record<string, unknown>)) {
    if (k === "$schema") continue;
    if (k === "description" && typeof v === "string") out[k] = v.length > maxDescription ? `${v.slice(0, maxDescription)}...` : v;
    else out[k] = slimSchema(v, maxDescription);
  }
  return out;
}

export function openAiChat(options: LlmOptions): Chat {
  const url = `${options.endpoint.replace(/\/+$/, "")}/chat/completions`;
  const maxDescription = options.maxDescription ?? 300;
  const maxParam = options.maxParamDescription ?? 140;
  return async (messages, tools) => {
    const body = {
      model: options.model,
      temperature: options.temperature ?? 0.2,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
        ...(m.tool_calls?.length
          ? {
              tool_calls: m.tool_calls.map((c) => ({
                id: c.id,
                type: "function",
                function: { name: c.name, arguments: typeof c.arguments === "string" ? c.arguments : JSON.stringify(c.arguments) },
              })),
            }
          : {}),
      })),
      ...(tools.length
        ? {
            tools: tools.map((t) => ({
              type: "function",
              function: { name: t.name, description: t.description.slice(0, maxDescription), parameters: slimSchema(t.parameters, maxParam) },
            })),
            tool_choice: "auto",
          }
        : {}),
    };
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options.timeoutMs ?? 600_000),
    });
    if (!res.ok) throw new Error(`model endpoint answered ${res.status}: ${(await res.text()).slice(0, 400)}`);
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string | null; tool_calls?: Array<{ id?: string; function?: { name?: string; arguments?: unknown } }> } }>;
    };
    const msg = data.choices?.[0]?.message;
    if (!msg) throw new Error("model endpoint answered without a message");
    const content = msg.content ?? "";
    let calls: ToolCall[] = (msg.tool_calls ?? [])
      .filter((c) => c.function?.name)
      .map((c, i) => ({
        id: c.id ?? `call_${i}`,
        name: String(c.function?.name),
        arguments: (c.function?.arguments ?? {}) as string | Record<string, unknown>,
      }));
    if (calls.length === 0 && content) calls = toolCallsFromText(content);
    return { role: "assistant", content, ...(calls.length ? { tool_calls: calls } : {}) };
  };
}
