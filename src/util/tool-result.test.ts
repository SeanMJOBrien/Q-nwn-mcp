import { describe, expect, it } from "vitest";
import { failResult, markFailure, saysFailure } from "./tool-result.js";
import { callTool, recordTools } from "./tool-registry.js";

const text = (t: string) => ({ content: [{ type: "text", text: t }] });

describe("tool result contract", () => {
  it("reads a failure from a JSON answer", () => {
    expect(saysFailure('{"success": false, "error": "x"}')).toBe(true);
    expect(saysFailure('{"ok": false}')).toBe(true);
    expect(saysFailure('{"error": "Position is not safe for placement"}')).toBe(true);
    expect(saysFailure('{"success": true, "error": "partly"}')).toBe(false);
    expect(saysFailure('{"success": true}')).toBe(false);
    expect(saysFailure("plain text")).toBe(false);
  });

  it("marks the failure, but not a check's verdict", () => {
    expect((markFailure("place_creature", text('{"error":"not safe"}')) as { isError?: boolean }).isError).toBe(true);
    expect((markFailure("phase_check", text('{"ok":false}')) as { isError?: boolean }).isError).toBeUndefined();
    expect((markFailure("verify_all", text('{"ok":false}')) as { isError?: boolean }).isError).toBeUndefined();
  });

  it("builds the standard failure shape", () => {
    const r = failResult("No area x", { field: "area", valid: ["a", "b"], next: "use a" });
    expect(r.isError).toBe(true);
    expect(JSON.parse(r.content[0].text)).toEqual({ success: false, error: "No area x", field: "area", valid: ["a", "b"], next: "use a" });
  });

  it("applies to every tool registered through recordTools, in process and for the client", async () => {
    const registered: Array<(a: Record<string, unknown>, e: unknown) => Promise<unknown>> = [];
    const server = recordTools({ tool: (_n: string, ...rest: unknown[]) => registered.push(rest[rest.length - 1] as never) });
    server.tool("contract_probe", "d", {}, async () => text('{"error":"Position is not safe for placement"}'));
    expect((await callTool("contract_probe", {})).isError).toBe(true);
    expect(((await registered[0]({}, {})) as { isError?: boolean }).isError).toBe(true);
  });
});

describe("already exists", () => {
  it("is a success that says how to use it", async () => {
    const { alreadyExistsResult } = await import("./tool-result.js");
    const r = alreadyExistsResult("str_x.utm", "Place it.");
    const body = JSON.parse(r.content[0].text);
    expect(body).toMatchObject({ success: true, alreadyExists: true, resource: "str_x.utm" });
    expect(body.next).toContain("Place it.");
    expect((r as { isError?: boolean }).isError).toBeUndefined();
  });
});
