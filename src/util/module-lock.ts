/**
 * File-based lock over a module's temp dir, so two separate OS processes —
 * this session's own MCP server and a dispatched Agent-tool subagent's own
 * separate server process are the real case this closes — can't both think
 * they own the same module's temp dir at once. The dirty-state guard
 * (util/dirty-state.ts) only protects a single process from reverting its
 * own pending work; it can't see a *different* process's in-flight edits at
 * all, since dirty-state is in-memory per-process. This is the missing
 * cross-process half.
 *
 * The lock is a small JSON file inside the temp dir itself (colocated with
 * what it protects, and naturally scoped per-module since each module has
 * its own deterministic temp dir — see createTempDir). It's held for as
 * long as a process has that module loaded, not just for one call — released
 * when the process switches to a different module, or on process exit.
 */

import fs from "fs";
import fsPromises from "fs/promises";
import path from "path";

interface LockInfo {
  pid: number;
  acquiredAt: string;
}

const LOCK_FILENAME = ".mcp-lock";
const WAIT_RETRY_MS = 250;
const WAIT_TIMEOUT_MS = 3000;

/** Lock files this process currently holds — cleaned up on exit as a safety net. */
const heldLocks = new Set<string>();

function lockPath(tempDir: string): string {
  return path.join(tempDir, LOCK_FILENAME);
}

/** True if pid is a live process (or one we can't signal but that still exists). */
function isPidAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

async function readLock(file: string): Promise<LockInfo | null> {
  try {
    const raw = await fsPromises.readFile(file, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed?.pid === "number" && typeof parsed?.acquiredAt === "string") return parsed as LockInfo;
    return null;
  } catch {
    return null;
  }
}

/**
 * Acquire the lock for a module's temp dir. A free lock, a stale one (owning
 * pid no longer alive), or one this same process already holds are all
 * claimed immediately. A lock genuinely held by another live process gets a
 * short bounded wait (for quick transient overlaps — e.g. a subagent
 * finishing its own repack_module a moment later) before throwing a clear,
 * actionable error rather than blocking indefinitely.
 *
 * waitTimeoutMs/retryMs are overridable so tests don't have to eat the real
 * multi-second wait to exercise the "genuinely locked" path.
 */
export async function acquireModuleLock(
  tempDir: string,
  waitTimeoutMs = WAIT_TIMEOUT_MS,
  retryMs = WAIT_RETRY_MS,
): Promise<void> {
  const file = lockPath(tempDir);
  const deadline = Date.now() + waitTimeoutMs;

  for (;;) {
    const existing = await readLock(file);
    if (!existing || existing.pid === process.pid || !isPidAlive(existing.pid)) {
      const info: LockInfo = { pid: process.pid, acquiredAt: new Date().toISOString() };
      await fsPromises.writeFile(file, JSON.stringify(info), "utf-8");
      heldLocks.add(file);
      return;
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Module temp dir is locked by another active process (pid ${existing.pid}, acquired ${existing.acquiredAt}) ` +
        `— likely a concurrent background agent or another session working on the same module. Wait for it to ` +
        `finish (repack_module and switching to a different module releases the lock), or if it's genuinely ` +
        `dead/orphaned (the process no longer exists but the lock file wasn't cleaned up), remove ${file} manually.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, retryMs));
  }
}

/** Release the lock for a temp dir — only if this process actually holds it. */
export async function releaseModuleLock(tempDir: string): Promise<void> {
  const file = lockPath(tempDir);
  if (!heldLocks.has(file)) return;
  const existing = await readLock(file);
  if (existing && existing.pid === process.pid) {
    await fsPromises.unlink(file).catch(() => {});
  }
  heldLocks.delete(file);
}

// Best-effort synchronous cleanup if the process exits without an explicit
// release (session ends mid-work, no final repack/switch). 'exit' fires for
// essentially every termination path except SIGKILL or a native crash — a
// gap no framework can close, and not one this needs to. Deliberately not
// hooking SIGINT/SIGTERM here: an MCP stdio server's SDK manages its own
// shutdown signal handling, and a competing handler calling process.exit()
// could short-circuit it.
process.on("exit", () => {
  for (const file of heldLocks) {
    try {
      const raw = fs.readFileSync(file, "utf-8");
      const info = JSON.parse(raw) as LockInfo;
      if (info.pid === process.pid) fs.unlinkSync(file);
    } catch {
      // Best effort — the lock's own staleness check (dead pid) covers this
      // if cleanup here doesn't happen for some reason.
    }
  }
});
