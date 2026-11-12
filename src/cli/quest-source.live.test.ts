/**
 * The quest CLI on a flat source directory (a Q-nwn-manager project's unpacked/): the source is read as JSON, never
 * written, and the changed files land in --out. Needs NIM_FOLDER_NWTOOLS (nwn_gff) and a built dist/.
 */
import { execFile } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { describe, expect, it } from "vitest";
import { NIM_FOLDER_NWTOOLS } from "../config.js";
import { gffToJson } from "../nim-tools.js";

const run = promisify(execFile);
const ROOT = path.join(import.meta.dirname, "..", "..");
const CLI = path.join(ROOT, "dist", "cli", "quest.js");
const TEMPLATES = path.join(ROOT, "src", "templates");
const hasCli = await fs.stat(CLI).then(() => true, () => false);

const str = (value: string, type = "cexostring") => ({ type, value });
const ned = {
  __data_type: "UTC ",
  Tag: str("farmer_ned"),
  TemplateResRef: str("farmer_ned", "resref"),
  FirstName: { type: "cexolocstring", value: { "0": "Ned" } },
  Conversation: str("", "resref"),
};

async function cli(args: string[]): Promise<{ ok: boolean; result?: Record<string, unknown>; error?: string }> {
  const r = await run("node", [CLI, ...args], { cwd: ROOT, maxBuffer: 1 << 26 }).catch((e) => e as { stdout: string });
  return JSON.parse(r.stdout);
}

describe.skipIf(!NIM_FOLDER_NWTOOLS || !hasCli)("quest CLI on a flat source directory", () => {
  it("plans without writing, builds into --out, and refuses to write without it", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-src-"));
    try {
      const src = path.join(dir, "proj", "unpacked");
      await fs.mkdir(src, { recursive: true });
      for (const name of ["dm_area.are", "dm_area.git", "dm_area.gic"]) {
        await fs.writeFile(path.join(src, `${name}.json`), JSON.stringify(await gffToJson(path.join(TEMPLATES, name)), null, 2));
      }
      await fs.writeFile(path.join(src, "module.ifo.json"), JSON.stringify({ __data_type: "IFO ", Mod_Name: { type: "cexolocstring", value: { "0": "Src Test" } } }));
      await fs.writeFile(path.join(src, "farmer_ned.utc.json"), JSON.stringify(ned));
      await fs.writeFile(path.join(src, "hello.nss"), "void main() {}\n");
      const spec = path.join(dir, "q.json");
      await fs.writeFile(spec, JSON.stringify({ name: "Wolves", giver: "farmer_ned", stages: [{ do: "talk", journal: "Ned asked." }, { do: "return", journal: "Done." }] }));
      const before = (await fs.readdir(src)).sort();

      const plan = await cli(["build", spec, "--project", path.join(dir, "proj"), "--dry-run"]);
      expect(plan.ok, plan.error).toBe(true);
      expect(plan.result?.source).toBeUndefined();

      const refused = await cli(["build", spec, "--project", path.join(dir, "proj")]);
      expect(refused.ok).toBe(false);
      expect(refused.error).toMatch(/--out/);

      const out = path.join(dir, "out");
      const built = await cli(["build", spec, "--project", path.join(dir, "proj"), "--out", out, "--no-compile"]);
      expect(built.ok, built.error).toBe(true);
      const source = built.result?.source as { files: string[]; removed: string[]; compiled: boolean };
      expect(source.compiled).toBe(false);
      expect(source.files).toContain("module.jrl.json");
      expect(source.files).toContain("farmer_ned.utc.json");
      expect(source.files).toContain("inc_quest.nss");
      expect(source.files.some((f) => f.endsWith(".ncs"))).toBe(false);
      expect((await fs.readdir(out)).sort()).toEqual(source.files);
      const jrl = JSON.parse(await fs.readFile(path.join(out, "module.jrl.json"), "utf-8"));
      expect(jrl.Categories.value[0].Tag.value).toBe("q_wolves");
      expect((await fs.readdir(src)).sort()).toEqual(before);
      expect(JSON.parse(await fs.readFile(path.join(src, "farmer_ned.utc.json"), "utf-8"))).toEqual(ned);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
