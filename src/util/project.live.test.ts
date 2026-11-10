/** Real round trip with the nim tools: binary GFF -> project JSON -> packed .mod -> binary GFF, compared as JSON. Needs NIM_FOLDER_NWTOOLS. */
import fs from "fs/promises";
import os from "os";
import path from "path";
import { describe, expect, it } from "vitest";
import { NIM_FOLDER_NWTOOLS } from "../config.js";
import { erfExtract, gffToJson } from "../nim-tools.js";
import type { ModuleIndex } from "../types/module.js";
import { exportProject, packProject } from "./project.js";

const TEMPLATES = path.join(import.meta.dirname, "..", "templates");

describe.skipIf(!NIM_FOLDER_NWTOOLS)("module project round trip", () => {
  it("export then pack keeps every GFF resource and file", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-rt-"));
    try {
      const mod = path.join(dir, "mod");
      await fs.mkdir(mod);
      const index = { modPath: "x.mod", tempDir: mod, moduleName: "RT", resources: new Map(), parsedGff: new Map() } as unknown as ModuleIndex;
      for (const name of ["dm_area.are", "dm_area.git", "dm_area.gic", "Repute.fac"]) {
        const f = path.join(mod, name.toLowerCase());
        await fs.copyFile(path.join(TEMPLATES, name), f);
        const ext = path.extname(name).slice(1).toLowerCase();
        index.resources.set(name.toLowerCase(), { resref: path.basename(name, path.extname(name)), extension: ext, filePath: f, sizeBytes: 1 });
        index.parsedGff.set(name.toLowerCase(), await gffToJson(f));
      }
      await fs.writeFile(path.join(mod, "hello.nss"), "void main() {}\n");
      index.resources.set("hello.nss", { resref: "hello", extension: "nss", filePath: path.join(mod, "hello.nss"), sizeBytes: 1 });
      const project = path.join(dir, "project");
      await exportProject(index, project);
      const packed = await packProject(project);
      const out = path.join(dir, "out");
      await erfExtract(packed, out);
      expect((await fs.readdir(out)).sort()).toEqual(["dm_area.are", "dm_area.gic", "dm_area.git", "hello.nss", "repute.fac"]);
      for (const [name, doc] of index.parsedGff) expect(await gffToJson(path.join(out, name))).toEqual(doc);
      expect(await fs.readFile(path.join(out, "hello.nss"), "utf-8")).toBe("void main() {}\n");
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  });
});
