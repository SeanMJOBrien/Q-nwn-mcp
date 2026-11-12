import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ModuleIndex } from "../types/module.js";

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async (f: string) => JSON.parse(await fs.readFile(f, "utf-8"))),
}));

let dir: string;
let index: ModuleIndex;
let prev: string | undefined;

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-sync-"));
  prev = process.env.MCP_FOLDER_ADVENTURES;
  process.env.MCP_FOLDER_ADVENTURES = path.join(dir, "adv");
  await fs.mkdir(path.join(dir, "mod"));
  index = { modPath: "/x/demo.mod", tempDir: path.join(dir, "mod"), moduleName: "Demo", resources: new Map(), parsedGff: new Map() } as unknown as ModuleIndex;
  const sync = await import("./project-sync.js");
  sync.setSyncIndexGetter(() => index);
});
afterEach(async () => {
  const sync = await import("./project-sync.js");
  sync.setSyncIndexGetter(() => null);
  if (prev === undefined) process.env.MCP_FOLDER_ADVENTURES = undefined;
  else process.env.MCP_FOLDER_ADVENTURES = prev;
  await fs.rm(dir, { recursive: true, force: true });
});

describe("project sync", () => {
  it("first write creates the project, later writes update one resource", async () => {
    const { afterWrite } = await import("./project-sync.js");
    const f = path.join(index.tempDir, "a.nss");
    await fs.writeFile(f, "v1");
    index.resources.set("a.nss", { resref: "a", extension: "nss", filePath: f, sizeBytes: 2 });
    await afterWrite(f);
    const proj = path.join(dir, "adv", "Demo");
    expect(await fs.readFile(path.join(proj, "src/nss/a.nss"), "utf-8")).toBe("v1");
    const g = path.join(index.tempDir, "b.nss");
    await fs.writeFile(g, "new");
    await afterWrite(g);
    expect(await fs.readFile(path.join(proj, "src/nss/b.nss"), "utf-8")).toBe("new");
    expect(JSON.parse(await fs.readFile(path.join(proj, "project.json"), "utf-8")).resources).toEqual(["a.nss", "b.nss"]);
  });

  it("ignores files outside the temp dir", async () => {
    const { afterWrite } = await import("./project-sync.js");
    const f = path.join(dir, "elsewhere.nss");
    await fs.writeFile(f, "x");
    await afterWrite(f);
    await expect(fs.stat(path.join(dir, "adv"))).rejects.toThrow();
  });

  it("imports an outside change into the project and refuses the write once", async () => {
    const { afterWrite, beforeWrite } = await import("./project-sync.js");
    const f = path.join(index.tempDir, "x.utc");
    await fs.writeFile(f, JSON.stringify({ v: 1 }));
    index.resources.set("x.utc", { resref: "x", extension: "utc", filePath: f, sizeBytes: 1 });
    index.parsedGff.set("x.utc", { v: 1 } as never);
    await afterWrite(f, { v: 1 } as never);
    await beforeWrite(f); // unchanged: fine
    await new Promise((r) => setTimeout(r, 15));
    await fs.writeFile(f, JSON.stringify({ v: 2, direct: true }));
    await expect(beforeWrite(f)).rejects.toThrow(/changed on disk/);
    expect(index.parsedGff.get("x.utc")).toEqual({ v: 2, direct: true });
    const proj = path.join(dir, "adv", "Demo");
    expect(JSON.parse(await fs.readFile(path.join(proj, "src/utc/x.utc.json"), "utf-8"))).toEqual({ v: 2, direct: true });
    await beforeWrite(f); // second attempt passes
  });

  it("flat sync stages changes in the source layout and never makes a project", async () => {
    const { afterWrite, afterRemove, beforeWrite, setFlatSync, flatSyncReport } = await import("./project-sync.js");
    const out = path.join(dir, "out");
    setFlatSync({ out });
    try {
      const utc = path.join(index.tempDir, "ned.utc");
      await fs.writeFile(utc, "binary");
      await beforeWrite(utc);
      await afterWrite(utc, { Tag: { type: "cexostring", value: "ned" } } as never);
      const nss = path.join(index.tempDir, "q_act.nss");
      await fs.writeFile(nss, "void main() {}");
      await afterWrite(nss);
      const ncs = path.join(index.tempDir, "q_act.ncs");
      await fs.writeFile(ncs, "compiled");
      await afterWrite(ncs);
      const gone = path.join(index.tempDir, "old.nss");
      await fs.writeFile(gone, "x");
      await afterWrite(gone);
      await afterRemove(gone);
      expect((await fs.readdir(out)).sort()).toEqual(["ned.utc.json", "q_act.nss"]);
      expect(JSON.parse(await fs.readFile(path.join(out, "ned.utc.json"), "utf-8")).Tag.value).toBe("ned");
      expect(flatSyncReport()).toEqual({ out, files: ["ned.utc.json", "q_act.nss"], removed: ["old.nss"] });
      await expect(fs.stat(path.join(dir, "adv"))).rejects.toThrow();
    } finally {
      setFlatSync(null);
    }
  });

  it("source JSON keeps negative zero", async () => {
    const { stringifySource } = await import("./project-sync.js");
    const text = stringifySource({ XOrientation: { type: "float", value: -0 }, Y: { type: "float", value: 0 }, Name: "-0" });
    expect(text).toContain('"value": -0.0');
    expect(JSON.parse(text)).toEqual({ XOrientation: { type: "float", value: -0 }, Y: { type: "float", value: 0 }, Name: "-0" });
    expect(Object.is(JSON.parse(text).XOrientation.value, -0)).toBe(true);
  });

  it("flat sync without an output folder only records", async () => {
    const { afterWrite, setFlatSync, flatSyncReport } = await import("./project-sync.js");
    setFlatSync({ out: null });
    try {
      const f = path.join(index.tempDir, "a.nss");
      await fs.writeFile(f, "v1");
      await afterWrite(f);
      expect(flatSyncReport()).toEqual({ out: null, files: ["a.nss"], removed: [] });
      await expect(fs.stat(path.join(dir, "adv"))).rejects.toThrow();
    } finally {
      setFlatSync(null);
    }
  });
});
