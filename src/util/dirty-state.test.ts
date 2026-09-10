import { describe, it, expect, beforeEach } from "vitest";
import path from "path";
import { markDirty, isDirtyUnder, clearDirtyUnder } from "./dirty-state.js";

// dirtyPaths is module-level state shared across tests in this file — use
// distinct directory names per test to avoid cross-test interference instead
// of trying to reset the module between tests.

describe("dirty-state", () => {
  it("reports clean for a directory nothing has been written to", () => {
    const dir = path.join("/tmp", "dirty-state-test-clean");
    expect(isDirtyUnder(dir)).toBe(false);
  });

  it("reports dirty after a write under the directory", () => {
    const dir = path.join("/tmp", "dirty-state-test-basic");
    markDirty(path.join(dir, "area.git"));
    expect(isDirtyUnder(dir)).toBe(true);
  });

  it("clearDirtyUnder resets dirty state for that directory", () => {
    const dir = path.join("/tmp", "dirty-state-test-clear");
    markDirty(path.join(dir, "area.git"));
    expect(isDirtyUnder(dir)).toBe(true);
    clearDirtyUnder(dir);
    expect(isDirtyUnder(dir)).toBe(false);
  });

  it("does not consider a write under an unrelated directory as dirtying this one", () => {
    // This is the exact create_module cross-contamination bug found while
    // building this feature: an assembly dir's writes must not make an
    // unrelated, already-loaded module's temp dir look dirty.
    const loadedModuleDir = path.join("/tmp", "dirty-state-test-loaded-module");
    const assemblyDir = path.join("/tmp", "dirty-state-test-assembly-dir");
    markDirty(path.join(assemblyDir, "module.ifo"));
    expect(isDirtyUnder(loadedModuleDir)).toBe(false);
    expect(isDirtyUnder(assemblyDir)).toBe(true);
  });

  it("does not false-positive on a directory whose name is a prefix of another", () => {
    // e.g. .../mymod_abc vs .../mymod_abc2 — must not treat a write under
    // the second as dirtying the first just because the string starts the same.
    const dirA = path.join("/tmp", "dirty-state-test-mymod_abc");
    const dirB = path.join("/tmp", "dirty-state-test-mymod_abc2");
    markDirty(path.join(dirB, "area.git"));
    expect(isDirtyUnder(dirA)).toBe(false);
    expect(isDirtyUnder(dirB)).toBe(true);
  });
});
