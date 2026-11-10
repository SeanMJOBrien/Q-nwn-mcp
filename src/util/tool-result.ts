/** Shared MCP tool results. A failed call must set isError so clients get a protocol-level signal (TODO E6). */
export function errorResult(message: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return { content: [{ type: "text", text: message }], isError: true };
}
