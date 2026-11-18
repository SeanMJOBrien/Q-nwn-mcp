import fs from "fs";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { applySettings, clientSettings, parseSettings } from "../util/settings-file.js";
import { parseCallArgs, parseCallsFile } from "./tool.js";

describe("tool CLI arguments", () => {
  it("takes one JSON object or key=value pairs", () => {
    expect(parseCallArgs(['{"area":"mill","n":2}'])).toEqual({ area: "mill", n: 2 });
    expect(parseCallArgs(["resref=ilyanthe", "brief=true", "level=3", 'spots=[1,2]'])).toEqual({ resref: "ilyanthe", brief: true, level: 3, spots: [1, 2] });
    expect(() => parseCallArgs(["oops"])).toThrow(/key=value/);
  });

  it("reads a calls file in both forms", () => {
    expect(parseCallsFile([{ tool: "verify_all", args: { brief: true } }, ["get_progress", {}], ["list_areas"]])).toEqual([
      { tool: "verify_all", args: { brief: true } },
      { tool: "get_progress", args: {} },
      { tool: "list_areas", args: {} },
    ]);
    expect(() => parseCallsFile({})).toThrow(/array/);
  });
});

describe("settings file", () => {
  it("parses KEY=value lines and never overrides the environment", () => {
    const v = parseSettings('# c\nNWN_FOLDER_DATA="~/nwn"\nexport NIM_FOLDER_NWTOOLS=/t\nJUNK\nMCP_FOLDER_TEMP=\n');
    expect(v.NWN_FOLDER_DATA).toBe(path.join(os.homedir(), "nwn"));
    expect(v.NIM_FOLDER_NWTOOLS).toBe("/t");
    const env: NodeJS.ProcessEnv = { NIM_FOLDER_NWTOOLS: "/mine" };
    expect(applySettings(v, env)).toEqual(["NWN_FOLDER_DATA"]);
    expect(env.NIM_FOLDER_NWTOOLS).toBe("/mine");
  });

  it("finds the env of the MCP client's entry for this server", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nwn-mcp-cfg-"));
    const entry = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..", "dist", "index.js");
    const file = path.join(dir, "c.json");
    fs.writeFileSync(
      file,
      JSON.stringify({
        mcpServers: { other: { args: ["/x/index.js"], env: { NWN_FOLDER_DATA: "/wrong" } } },
        projects: { "/p": { mcpServers: { "nwn-mcp": { args: [entry], env: { NWN_FOLDER_DATA: "/right", NWN_FOLDER_USER: "/u" } } } } },
      }),
    );
    expect(clientSettings(file)).toEqual({ NWN_FOLDER_DATA: "/right", NWN_FOLDER_USER: "/u" });
    expect(clientSettings(path.join(dir, "none.json"))).toBeNull();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
