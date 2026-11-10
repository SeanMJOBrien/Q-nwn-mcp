/**
 * Every tool that writes a module resource straight to the temp dir with plain fs must tell the project sync
 * (beforeWrite/afterWrite/afterRemove from util/project-sync), or its change reaches the project only on export_project
 * (TODO #41). Files that use raw fs for something else are listed here with the reason.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const TOOLS = path.join(import.meta.dirname);
const RAW = /\b(?:fs|fsPromises|fsSync)\.(?:writeFile|writeFileSync|copyFile|unlink|rm)\(/;

const NOT_MODULE_RESOURCES: Record<string, string> = {
  "adopt-tools.ts": "adventure.md in the adventure directory; the project is exported right after",
  "database-tools.ts": "campaign databases and scratch files outside the module",
  "package-tools.ts": "2DA files written to an output directory, not into the module",
  "phase-tools.ts": "adventure-status.json, project-scope.json, adventure.md in the adventure directory",
  "dm-area-tools.ts": "copies the area template and syncs each copy with afterWrite",
  "tileset-tools.ts": "HTML reports",
  "verify-server-tools.ts": "throwaway staging directories and the verify server's own files",
  "module-tools.ts": "create_module assembles a new module in its own directory before loading it",
};
for (const f of ["gear-tools.ts", "random-abilities-tools.ts", "reward-tools.ts", "spec-ability-tools.ts", "spec-assert-tools.ts", "spec-check-tools.ts", "systest-tools.ts"]) {
  NOT_MODULE_RESOURCES[f] = "removes its own _<tool>_probe scripts, which the project sync ignores";
}
const HOOKED = ["adventure-tools.ts", "bulk-tools.ts", "object-mgmt-tools.ts", "write-tools.ts", "paint-tools.ts", "quest-tools.ts"];

describe("project sync guard", () => {
  const files = fs.readdirSync(TOOLS).filter((f) => f.endsWith(".ts") && !f.includes(".test."));
  it("every raw-fs writer either syncs the project or is listed with its reason", () => {
    const offenders = files.filter((f) => RAW.test(fs.readFileSync(path.join(TOOLS, f), "utf8")) && !(f in NOT_MODULE_RESOURCES) && !HOOKED.includes(f));
    expect(offenders).toEqual([]);
  });
  it("the hooked writers import the sync", () => {
    for (const f of HOOKED) expect(fs.readFileSync(path.join(TOOLS, f), "utf8"), f).toContain("project-sync");
  });
});
