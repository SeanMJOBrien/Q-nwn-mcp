/**
 * The conversation budget, in characters of request (messages plus tool schemas), tuned from what the server reports.
 *
 * Characters are what the driver can count; the model's limit is in tokens, and the ratio between them changes with the
 * text (JSON takes more tokens per character than prose). So:
 *  - when the server reports `usage.prompt_tokens`, the driver learns the ratio (characters per token) from it;
 *  - with a known context size (`--context-tokens`, or the size an overflow error names), the budget is that size
 *    times the ratio, less a margin for the answer, and follows the ratio as it changes;
 *  - without a known size, an overflow halves the budget, as before.
 * One budget is shared by every phase of a run, so what one phase learns the next uses.
 */

/** The smallest conversation the driver will shrink to before it gives up on a context overflow (about 1k tokens). */
export const MIN_CONTEXT_CHARS = 4_000;
/** The share of the context window a request may fill; the rest is left for the answer. */
const FILL = 0.8;
/** Characters per token assumed before the server has reported one (low, so the first request is safe). */
const FIRST_GUESS_CHARS_PER_TOKEN = 3;

export interface ContextBudget {
  /** The budget for the next request, in characters of messages plus tool schemas. */
  chars: number;
  /** The model's context window in tokens, when known (flag or overflow message). */
  tokens?: number;
  /** Characters per token, learned from the server's usage reports. */
  charsPerToken?: number;
}

/** A budget: from a character count, a token count, or the default 48000 characters. */
export function newBudget(options: { contextChars?: number; contextTokens?: number } = {}): ContextBudget {
  if (options.contextChars) return { chars: options.contextChars, ...(options.contextTokens ? { tokens: options.contextTokens } : {}) };
  if (options.contextTokens) return { chars: Math.max(MIN_CONTEXT_CHARS, Math.floor(options.contextTokens * FILL * FIRST_GUESS_CHARS_PER_TOKEN)), tokens: options.contextTokens };
  return { chars: 48_000 };
}

function fromTokens(budget: ContextBudget): void {
  if (!budget.tokens) return;
  budget.chars = Math.max(MIN_CONTEXT_CHARS, Math.floor(budget.tokens * FILL * (budget.charsPerToken ?? FIRST_GUESS_CHARS_PER_TOKEN)));
}

/** The server answered a request of `sentChars` characters that took `promptTokens` tokens: learn the ratio. */
export function learnUsage(budget: ContextBudget, sentChars: number, promptTokens: number): void {
  if (!(promptTokens > 0) || !(sentChars > 0)) return;
  // The request also carries chat-template text the driver does not count, so the ratio comes out slightly low: safe.
  budget.charsPerToken = sentChars / promptTokens;
  fromTokens(budget);
}

/** The context size and the request size an overflow message names, when it names them. */
export function overflowNumbers(message: string): { available?: number; requested?: number } {
  const ctx = /n_ctx(?:_slot)?\D{0,4}(\d+)/i.exec(message)?.[1];
  const numbers = [...message.matchAll(/(\d[\d,]{2,})\s*tokens?/gi)].map((m) => Number(m[1].replace(/,/g, ""))).filter((n) => n > 0);
  const out: { available?: number; requested?: number } = {};
  if (ctx) out.available = Number(ctx);
  if (numbers.length >= 2) {
    out.available ??= Math.min(...numbers);
    out.requested = Math.max(...numbers);
  } else if (numbers.length === 1 && out.available !== undefined && numbers[0] !== out.available) out.requested = numbers[0];
  return out;
}

/**
 * The server refused a request of `sentChars` characters as too long. Shrinks the budget: to the context size the
 * message names (times the ratio), else below what was sent, else by half. Returns false when it cannot shrink further.
 */
export function shrinkOnOverflow(budget: ContextBudget, sentChars: number, message: string): boolean {
  if (budget.chars <= MIN_CONTEXT_CHARS) return false;
  const before = budget.chars;
  const { available, requested } = overflowNumbers(message);
  if (requested && requested > 0) budget.charsPerToken = sentChars / requested;
  if (available && available > 0 && (!budget.tokens || available < budget.tokens)) budget.tokens = available;
  if (budget.tokens && (available || budget.charsPerToken)) fromTokens(budget);
  // Whatever the numbers say, the next request must be smaller than the one refused.
  const ceiling = Math.floor(Math.min(before, sentChars) * (available ? 0.95 : 0.5));
  budget.chars = Math.max(MIN_CONTEXT_CHARS, Math.min(budget.chars, ceiling));
  return true;
}
