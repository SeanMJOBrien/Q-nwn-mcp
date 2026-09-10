import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { acquireModuleLock, releaseModuleLock } from "./module-lock.js";

let dir: string;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "module-lock-test-"));
});

afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true });
});

describe("module-lock", () => {
  it("acquires a free lock", async () => {
    await acquireModuleLock(dir);
    const raw = await fs.readFile(path.join(dir, ".mcp-lock"), "utf-8");
    const info = JSON.parse(raw);
    expect(info.pid).toBe(process.pid);
    await releaseModuleLock(dir);
  });

  it("re-acquiring a lock this same process already holds is a no-op, not an error", async () => {
    await acquireModuleLock(dir);
    await expect(acquireModuleLock(dir)).resolves.not.toThrow();
    await releaseModuleLock(dir);
  });

  it("release removes the lock file", async () => {
    await acquireModuleLock(dir);
    await releaseModuleLock(dir);
    await expect(fs.access(path.join(dir, ".mcp-lock"))).rejects.toThrow();
  });

  it("release is a no-op if this process never held the lock", async () => {
    await expect(releaseModuleLock(dir)).resolves.not.toThrow();
  });

  it("reclaims a stale lock left by a dead pid", async () => {
    // A pid that's essentially guaranteed not to exist.
    const deadPid = 999999;
    await fs.writeFile(
      path.join(dir, ".mcp-lock"),
      JSON.stringify({ pid: deadPid, acquiredAt: new Date().toISOString() }),
      "utf-8",
    );
    await acquireModuleLock(dir); // should reclaim, not throw
    const raw = await fs.readFile(path.join(dir, ".mcp-lock"), "utf-8");
    expect(JSON.parse(raw).pid).toBe(process.pid);
    await releaseModuleLock(dir);
  });

  it("refuses to acquire a lock genuinely held by another live process", async () => {
    // pid 1 (init/launchd) always exists and is never this test process.
    // Short timeout/retry so this doesn't eat the real multi-second wait —
    // the bounded-wait behavior itself isn't what this test is checking.
    await fs.writeFile(
      path.join(dir, ".mcp-lock"),
      JSON.stringify({ pid: 1, acquiredAt: new Date().toISOString() }),
      "utf-8",
    );
    await expect(acquireModuleLock(dir, 50, 10)).rejects.toThrow(/locked by another active process/);
  });

  it("release does not remove a lock file owned by a different pid", async () => {
    await fs.writeFile(
      path.join(dir, ".mcp-lock"),
      JSON.stringify({ pid: 1, acquiredAt: new Date().toISOString() }),
      "utf-8",
    );
    // This process never successfully acquired it (acquire would have
    // thrown), so release must be a no-op — it never entered heldLocks.
    await releaseModuleLock(dir);
    await expect(fs.access(path.join(dir, ".mcp-lock"))).resolves.not.toThrow();
  });
});
