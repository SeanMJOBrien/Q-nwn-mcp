/** Minimal client for an OpenAI-compatible chat-completions endpoint (Ollama, llama.cpp, LM Studio, vLLM, ...). */

import { slimDescription } from "../util/slim-descriptions.js";

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
  /** Tokens the server counted for the request this reply answers (its `usage`), when it reported them. Not sent. */
  promptTokens?: number;
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
  /** Stream the answer (default true): the first bytes arrive at once, so Node's 5-minute wait for response headers
   * cannot end a long answer (a CPU-run model writing a whole plot took longer, and fetch failed). */
  stream?: boolean;
  /** Retries after a dropped connection (default 2). */
  retries?: number;
  /** Pause before retrying a busy server (429/5xx without Retry-After), times the attempt number (default 10000 ms). */
  busyWaitMs?: number;
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
    if (k === "description" && typeof v === "string") out[k] = slimDescription(v, maxDescription);
    else out[k] = slimSchema(v, maxDescription);
  }
  return out;
}

type WireCall = { id?: string; index?: number; function?: { name?: string; arguments?: unknown } };
type WireMessage = { content?: string | null; tool_calls?: WireCall[] };
type WireUsage = { prompt_tokens?: number };
type WireAnswer = { choices?: Array<{ message?: WireMessage }>; usage?: WireUsage };

/** A failure that another attempt with the same request would repeat: not retried. */
class NoRetryError extends Error {}

class HttpError extends NoRetryError {}

/** The conversation is longer than the model's context window. The driver shrinks the conversation and asks again. */
export class ContextExceededError extends NoRetryError {}

const CONTEXT_EXCEEDED = /context (size|length|window)|exceeds? (the )?(available )?context|prompt is too long|too many tokens/i;
/** A hosted endpoint's rate limit can also say "too many tokens" ("... per minute"): that is not an overflow. */
const RATE_LIMIT = /rate.?limit|per (second|minute|hour|day)|tokens per|quota/i;

/** Whether a server's error message says the conversation is longer than the model's context. */
export function isContextOverflow(message: string): boolean {
  return CONTEXT_EXCEEDED.test(message) && !RATE_LIMIT.test(message);
}

/** HTTP statuses of a busy, loading or restarting server (LM Studio answers 503 while it loads a model): retried. */
const BUSY_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

/** A busy server: another attempt after a pause may work. `waitMs` is the server's Retry-After, when it gave one. */
class BusyError extends Error {
  constructor(
    message: string,
    readonly waitMs?: number,
  ) {
    super(message);
  }
}

/** The pause a Retry-After header asks for (seconds or a date), at most a minute. */
function retryAfterMs(res: Response): number | undefined {
  const raw = res.headers.get("retry-after");
  if (!raw) return undefined;
  const ms = /^\d+$/.test(raw.trim()) ? Number(raw) * 1000 : Date.parse(raw) - Date.now();
  return Number.isFinite(ms) && ms >= 0 ? Math.min(ms, 60_000) : undefined;
}

/**
 * Throws for an HTTP error answer: a context overflow (llama.cpp, vLLM and LM Studio answer 400 before any stream
 * starts) as ContextExceededError, a busy server as BusyError (retried), anything else as HttpError (not retried).
 */
async function throwHttpError(res: Response): Promise<never> {
  const text = (await res.text()).slice(0, 4000);
  let message = text;
  try {
    message = errorMessageOf(JSON.parse(text)) ?? text;
  } catch {
    /* not JSON */
  }
  if (res.status !== 429 && isContextOverflow(message)) throw new ContextExceededError(`model context exceeded: ${message.slice(0, 400)}`);
  const what = `model endpoint answered ${res.status}: ${message.slice(0, 400)}`;
  if (BUSY_STATUS.has(res.status)) throw new BusyError(what, retryAfterMs(res));
  throw new HttpError(what);
}

/** The message of an error the server put in its answer: a stream event or a JSON body, whatever its shape. */
function errorMessageOf(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const v = value as { error?: unknown; message?: unknown; choices?: Array<{ finish_reason?: unknown }> };
  if (v.error !== undefined && v.error !== null) {
    if (typeof v.error === "string") return v.error;
    const inner = (v.error as { message?: unknown }).message;
    return typeof inner === "string" ? inner : JSON.stringify(v.error);
  }
  if (v.choices?.[0]?.finish_reason === "error") return typeof v.message === "string" ? v.message : "the model server stopped with an error";
  return undefined;
}

/** Throws the server's error: a context overflow as ContextExceededError, anything else as a plain failure (not retried). */
function throwServerError(message: string): never {
  if (isContextOverflow(message)) throw new ContextExceededError(`model context exceeded: ${message}`);
  throw new NoRetryError(`model server error: ${message}`);
}

/** The reason under a bare "fetch failed" (a timeout, a refused or reset connection), for the error message. */
function causeOf(e: unknown): string {
  const c = (e as { cause?: { code?: string; message?: string } }).cause;
  return c ? ` (${[c.code, c.message].filter(Boolean).join(": ")})` : "";
}

/** An OpenAI-style server-sent-event answer, its content and tool-call pieces put together. */
async function readStream(res: Response): Promise<WireMessage & { usage?: WireUsage }> {
  let content = "";
  let usage: WireUsage | undefined;
  const calls: WireCall[] = [];
  const text = res.body ? res.body.pipeThrough(new TextDecoderStream()) : null;
  let buffer = "";
  const take = (line: string) => {
    const data = line.replace(/^data:\s*/, "").trim();
    if (!data || data === "[DONE]") return;
    let chunk: { choices?: Array<{ delta?: WireMessage; message?: WireMessage; finish_reason?: unknown }>; error?: unknown; message?: unknown; usage?: WireUsage };
    try {
      chunk = JSON.parse(data);
    } catch {
      return;
    }
    const failed = errorMessageOf(chunk);
    if (failed !== undefined) throwServerError(failed);
    if (chunk.usage?.prompt_tokens) usage = chunk.usage;
    const d = chunk.choices?.[0]?.delta ?? chunk.choices?.[0]?.message;
    if (!d) return;
    if (d.content) content += d.content;
    for (const [i, c] of (d.tool_calls ?? []).entries()) {
      const at = c.index ?? i;
      const have = calls[at] ?? (calls[at] = { function: { name: "", arguments: "" } });
      if (c.id) have.id = c.id;
      if (c.function?.name) have.function = { ...have.function, name: `${have.function?.name ?? ""}${c.function.name}` };
      if (c.function?.arguments !== undefined) {
        const piece = c.function.arguments;
        const prev = have.function?.arguments;
        have.function = { ...have.function, arguments: typeof piece === "string" ? `${typeof prev === "string" ? prev : ""}${piece}` : piece };
      }
    }
  };
  if (text) {
    for await (const part of text as unknown as AsyncIterable<string>) {
      buffer += part;
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const l of lines) if (l.startsWith("data:")) take(l);
    }
    if (buffer.startsWith("data:")) take(buffer);
  }
  return { content, tool_calls: calls.filter((c) => c?.function?.name), ...(usage ? { usage } : {}) };
}

export function openAiChat(options: LlmOptions): Chat {
  const url = `${options.endpoint.replace(/\/+$/, "")}/chat/completions`;
  const maxDescription = options.maxDescription ?? 300;
  const maxParam = options.maxParamDescription ?? 140;
  let usageInStream = true;
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
              function: { name: t.name, description: slimDescription(t.description, maxDescription), parameters: slimSchema(t.parameters, maxParam) },
            })),
            tool_choice: "auto",
          }
        : {}),
    };
    const stream = options.stream !== false;
    const retries = options.retries ?? 2;
    let msg: WireMessage | undefined;
    let usage: WireUsage | undefined;
    for (let attempt = 0; ; attempt++) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json", ...(options.apiKey ? { authorization: `Bearer ${options.apiKey}` } : {}) },
          // include_usage makes the last stream chunk carry the token count the budget learns from (context-budget.ts).
          body: JSON.stringify({ ...body, ...(stream ? { stream: true, ...(usageInStream ? { stream_options: { include_usage: true } } : {}) } : {}) }),
          signal: AbortSignal.timeout(options.timeoutMs ?? 900_000),
        });
        if (!res.ok) {
          if (res.status === 400 && stream && usageInStream) {
            // An older server that does not know stream_options: ask again without it (not counted as a retry).
            const text = await res.clone().text();
            if (/stream_options|include_usage/i.test(text)) {
              usageInStream = false;
              attempt--;
              continue;
            }
          }
          await throwHttpError(res);
        }
        if ((res.headers.get("content-type") ?? "").includes("text/event-stream")) {
          const read = await readStream(res);
          msg = read;
          usage = read.usage;
        } else {
          const body = (await res.json()) as WireAnswer & { error?: unknown };
          const failed = errorMessageOf(body);
          if (failed !== undefined) throwServerError(failed);
          msg = body.choices?.[0]?.message;
          usage = body.usage;
        }
        break;
      } catch (e) {
        // A dropped or timed-out connection and a busy server are retried; an HTTP error (bad request, unknown model)
        // and a context overflow are not. A busy server gets longer pauses: loading a model takes tens of seconds.
        if (e instanceof NoRetryError) throw e;
        if (attempt >= retries) throw new Error(`${(e as Error).message}${causeOf(e)}`);
        const wait = e instanceof BusyError ? (e.waitMs ?? (options.busyWaitMs ?? 10_000) * (attempt + 1)) : 3000 * (attempt + 1);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
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
    return { role: "assistant", content, ...(calls.length ? { tool_calls: calls } : {}), ...(usage?.prompt_tokens ? { promptTokens: usage.prompt_tokens } : {}) };
  };
}
