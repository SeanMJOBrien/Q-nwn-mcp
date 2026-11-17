/**
 * compileScript flushes the compiled .ncs to the module project, like jsonToGff does for GFF writes. Before this,
 * compile_script and the transition-script writers registered the .ncs in the index but never synced it, so the
 * project folder lacked compiled scripts that the packed .mod had (found on the Quest Test Range, 2026-11-16).
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const afterWrite = vi.fn(async () => {});
let fail = false;

vi.mock("./util/project-sync.js", () => ({ afterWrite, beforeWrite: vi.fn(async () => {}) }));
vi.mock("child_process", () => ({
  spawn: vi.fn(),
  execFile: vi.fn((_tool: string, _args: string[], _opts: unknown, cb: (e: Error | null, r?: unknown) => void) => {
    if (fail) cb(Object.assign(new Error("NSC1234: syntax error"), { stdout: "", stderr: "NSC1234: syntax error" }));
    else cb(null, { stdout: "", stderr: "" });
  }),
}));

describe("compileScript project sync", () => {
  beforeEach(() => {
    afterWrite.mockClear();
    fail = false;
  });

  it("flushes the .ncs after a successful compile", async () => {
    const { compileScript } = await import("./nim-tools.js");
    const r = await compileScript("/tmp/mod/a.nss", "/tmp/mod/a.ncs");
    expect(r.success).toBe(true);
    expect(afterWrite).toHaveBeenCalledWith("/tmp/mod/a.ncs");
  });

  it("flushes nothing when the compile fails", async () => {
    fail = true;
    const { compileScript } = await import("./nim-tools.js");
    const r = await compileScript("/tmp/mod/a.nss", "/tmp/mod/a.ncs");
    expect(r.success).toBe(false);
    expect(afterWrite).not.toHaveBeenCalled();
  });
});
