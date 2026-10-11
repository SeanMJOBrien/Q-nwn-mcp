/**
 * Integration tests for moonglow_run_plugin / moonglow_list_plugins, against
 * a stand-in `mg` script (so no Moonglow build is needed): arguments are
 * passed through as mg's CLI expects, a dry run touches nothing, and a real
 * run refreshes the files the plugin changed.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
let work: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
}));

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async (p: string) => ({ parsedFrom: path.basename(p) })),
}));

let client: Client;

async function call(name: string, args: Record<string, unknown>) {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as Array<{ text: string }>)[0].text;
  return { isError: !!r.isError, text, json: r.isError ? undefined : JSON.parse(text) };
}

beforeAll(async () => {
  work = await fs.mkdtemp(path.join(os.tmpdir(), "mg-plugin-test-"));
  const tempDir = path.join(work, "module");
  await fs.mkdir(tempDir);
  await fs.writeFile(path.join(tempDir, "area1.git"), "old");

  // The stand-in: records its arguments, and (unless --dry-run) rewrites
  // area1.git and adds new.utc in the module folder, as a plugin would.
  const fake = path.join(work, "mg");
  await fs.writeFile(fake, `#!/bin/sh
echo "$@" > "${work}/args.txt"
ALL="$*"
while [ "$1" != "plugin" ]; do shift; done
if [ "$2" = "list" ]; then echo '{"plugins":[{"id":"x.y"}]}'; exit 0; fi
case "$*" in *boom*) echo '{"error":"bad answer"}'; exit 1;; esac
case "$*" in *--dry-run*) ;; *) echo changed > "$3/area1.git"; echo new > "$3/new.utc";; esac
echo '{"edits":1,"resources":["area1.git"],"command":{"edits":[{"base64":"AAAA"}]},"log":[]}'
`, { mode: 0o755 });
  process.env.MOONGLOW_BIN = fake;

  mockIndex = {
    modPath: path.join(work, "m.mod"),
    tempDir,
    resources: new Map(),
    parsedGff: new Map(),
  } as unknown as ModuleIndex;

  const { registerMoonglowTools } = await import("./moonglow-tools.js");
  const server = new McpServer({ name: "t", version: "0" });
  registerMoonglowTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "c", version: "0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});

afterAll(async () => {
  await fs.rm(work, { recursive: true, force: true });
});

describe("moonglow_run_plugin", () => {
  it("dry-runs by default and changes nothing", async () => {
    const r = await call("moonglow_run_plugin", { plugin: "/p/ness", command: "new-spawn" });
    expect(r.json.applied).toBe(false);
    expect(r.json.result.resources).toEqual(["area1.git"]);
    expect(r.json.result.command).toBeUndefined();
    expect(await fs.readFile(path.join(mockIndex.tempDir, "area1.git"), "utf-8")).toBe("old");
    const args = await fs.readFile(path.join(work, "args.txt"), "utf-8");
    expect(args).toContain(`plugin run ${mockIndex.tempDir} /p/ness new-spawn --dry-run`);
    expect(args).toContain("--json");
  });

  it("passes answers, files and yes through", async () => {
    await call("moonglow_run_plugin", {
      plugin: "/p/q", command: "import-quest",
      answers: { tag: "q_wolves", level: "5" }, files: ["/s/q.json"], yes: true,
    });
    const args = await fs.readFile(path.join(work, "args.txt"), "utf-8");
    expect(args).toContain("--answer tag=q_wolves");
    expect(args).toContain("--answer level=5");
    expect(args).toContain("--file /s/q.json");
    expect(args).toContain("--yes");
  });

  it("applies with dryRun:false and refreshes what changed", async () => {
    const r = await call("moonglow_run_plugin", { plugin: "/p/ness", command: "new-spawn", dryRun: false });
    expect(r.json.applied).toBe(true);
    expect(r.json.changedFiles).toEqual(["area1.git", "new.utc"]);
    expect(mockIndex.parsedGff.get("area1.git")).toEqual({ parsedFrom: "area1.git" });
    expect(mockIndex.resources.get("new.utc")?.extension).toBe("utc");
  });

  it("reports a failure as an error", async () => {
    const r = await call("moonglow_run_plugin", { plugin: "/p/ness", command: "boom" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("bad answer");
  });
});

describe("moonglow_list_plugins", () => {
  it("lists a folder", async () => {
    const r = await call("moonglow_list_plugins", { folder: "/p" });
    expect(r.json.plugins[0].id).toBe("x.y");
  });
});
