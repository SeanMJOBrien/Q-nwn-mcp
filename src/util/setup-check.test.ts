import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isSetupError, REQUIRED_NIM_TOOLS, setupProblems } from "./setup-check.js";

describe("setup check", () => {
  it("names each missing setting, folder and tool", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nwn-mcp-setup-"));
    const tools = path.join(dir, "tools");
    const data = path.join(dir, "game");
    fs.mkdirSync(tools);
    fs.mkdirSync(path.join(data, "data"), { recursive: true });
    fs.writeFileSync(path.join(data, "data", "nwn_base.key"), "");
    for (const t of REQUIRED_NIM_TOOLS.filter((t) => t !== "nwn_resman_extract")) fs.writeFileSync(path.join(tools, t), "", { mode: 0o755 });
    fs.writeFileSync(path.join(tools, "libnwnscriptcomp.dylib"), "");

    expect(setupProblems({}, "linux").map((p) => p.split(" ")[0])).toEqual(["NIM_FOLDER_NWTOOLS", "NWN_FOLDER_DATA", "NWN_FOLDER_USER"]);
    const env = { NIM_FOLDER_NWTOOLS: tools, NWN_FOLDER_DATA: data, NWN_FOLDER_USER: dir };
    const mac = setupProblems(env, "darwin");
    expect(mac).toHaveLength(1);
    expect(mac[0]).toMatch(/^nwn_resman_extract missing or not executable in .*xattr/);
    fs.writeFileSync(path.join(tools, "nwn_resman_extract"), "", { mode: 0o755 });
    expect(setupProblems(env, "darwin")).toEqual([]);
    expect(setupProblems(env, "linux")).toEqual([`libnwnscriptcomp.so is not beside nwn_script_comp in ${tools}: scripts cannot be compiled without it.`]);
    expect(setupProblems({ ...env, NWN_FOLDER_DATA: dir }, "darwin")[0]).toContain("has no data/nwn_base.key");
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("tells a setup failure from a wrong argument", () => {
    expect(isSetupError("adventure_generate_layout: nwn_resman_extract failed: spawn /Users/x/nwn_resman_extract ENOENT")).toBe(true);
    expect(isSetupError("NWN_FOLDER_USER environment variable is not set. Cannot determine modules directory.")).toBe(true);
    expect(isSetupError('{"ok":false,"fields":[{"field":"features","message":"a list of feature group names"}]}')).toBe(false);
    expect(isSetupError("There is no area \"blackwater\". Areas: _start")).toBe(false);
  });
});
