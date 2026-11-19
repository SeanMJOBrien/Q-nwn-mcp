import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { openAiChat } from "./llm.js";

let server: http.Server | undefined;
afterEach(() => new Promise<void>((r) => (server ? server.close(() => r()) : r())));

function serve(handler: (req: http.IncomingMessage, res: http.ServerResponse, n: number) => void): Promise<string> {
  let n = 0;
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => handler(Object.assign(req, { body }), res, ++n));
  });
  return new Promise((r) => server?.listen(0, "127.0.0.1", () => r(`http://127.0.0.1:${(server?.address() as AddressInfo).port}/v1`)));
}

const sse = (res: http.ServerResponse, chunks: unknown[]) => {
  res.writeHead(200, { "content-type": "text/event-stream" });
  for (const c of chunks) res.write(`data: ${JSON.stringify(c)}\n\n`);
  res.end("data: [DONE]\n\n");
};

describe("model calls", () => {
  it("streams the answer and joins the pieces of a tool call", async () => {
    let asked: Record<string, unknown> = {};
    const url = await serve((req, res) => {
      asked = JSON.parse((req as unknown as { body: string }).body);
      sse(res, [
        { choices: [{ delta: { content: "" } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "write_plot", arguments: '{"spec":' } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '"{}"}' } }] } }] },
      ]);
    });
    const reply = await openAiChat({ endpoint: url, model: "m" })([{ role: "user", content: "go" }], []);
    expect(asked.stream).toBe(true);
    expect(reply.tool_calls).toEqual([{ id: "c1", name: "write_plot", arguments: '{"spec":"{}"}' }]);
  });

  it("reads a plain JSON answer too, and retries a dropped connection", async () => {
    const url = await serve((_req, res, n) => {
      if (n === 1) {
        res.socket?.destroy();
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "DONE" } }] }));
    });
    const reply = await openAiChat({ endpoint: url, model: "m", retries: 2 })([{ role: "user", content: "go" }], []);
    expect(reply.content).toBe("DONE");
  }, 20_000);

  it("does not retry an HTTP error and says what the server answered", async () => {
    let calls = 0;
    const url = await serve((_req, res) => {
      calls++;
      res.writeHead(404, { "content-type": "application/json" });
      res.end('{"error":"model not found"}');
    });
    await expect(openAiChat({ endpoint: url, model: "nope" })([{ role: "user", content: "go" }], [])).rejects.toThrow(/answered 404.*model not found/);
    expect(calls).toBe(1);
  });
});
