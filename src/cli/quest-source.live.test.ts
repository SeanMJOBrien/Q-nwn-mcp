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
const DIST_CLI = path.join(ROOT, "dist", "cli", "quest.js");
let CLI = DIST_CLI;
const TEMPLATES = path.join(ROOT, "src", "templates");
const hasCli = await fs.stat(DIST_CLI).then(
  () => true,
  () => false,
);

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

/** The one-file bundle, built now and run from a folder with no node_modules (what the manager vendors). */
async function bundledCli(): Promise<string> {
  await run("node", [path.join(ROOT, "scripts", "bundle-quest-cli.mjs")], { cwd: ROOT });
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-bundle-"));
  await fs.copyFile(path.join(ROOT, "bundle", "quest-cli.mjs"), path.join(dir, "quest-cli.mjs"));
  return path.join(dir, "quest-cli.mjs");
}

describe.skipIf(!NIM_FOLDER_NWTOOLS || !hasCli)("quest CLI on a flat source directory", () => {
  it.each([
    "dist",
    "bundle",
  ])("plans without writing, builds into --out, and refuses to write without it (%s)", async (which) => {
    CLI = which === "bundle" ? await bundledCli() : DIST_CLI;
    // dist and bundle must agree on the contract: same quest-spec schema hash (the manager compares them)
    const ver = await cli(["version"]);
    expect(ver.result?.schemaHash).toMatch(/^[0-9a-f]{12}$/);
    expect(ver.result?.bundled).toBe(which === "bundle");
    expect(ver.result?.schemaHash).toBe(
      ((await run("node", [DIST_CLI, "version"])).stdout.match(/"schemaHash": "([0-9a-f]+)"/) ?? [])[1],
    );
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-src-"));
    try {
      const src = path.join(dir, "proj", "unpacked");
      await fs.mkdir(src, { recursive: true });
      for (const name of ["dm_area.are", "dm_area.git", "dm_area.gic"]) {
        await fs.writeFile(
          path.join(src, `${name}.json`),
          JSON.stringify(await gffToJson(path.join(TEMPLATES, name)), null, 2),
        );
      }
      await fs.writeFile(
        path.join(src, "module.ifo.json"),
        JSON.stringify({ __data_type: "IFO ", Mod_Name: { type: "cexolocstring", value: { "0": "Src Test" } } }),
      );
      await fs.writeFile(path.join(src, "farmer_ned.utc.json"), JSON.stringify(ned));
      await fs.writeFile(path.join(src, "hello.nss"), "void main() {}\n");
      // U1: `contents` lists base-game blueprints; without NWN_FOLDER_DATA it says so rather than failing
      if (process.env.NWN_FOLDER_DATA) {
        const big = await cli(["contents", "--project", path.join(dir, "proj")]);
        const lists = big.result as unknown as { creatures: string[]; items: string[] };
        expect(lists.creatures, JSON.stringify(big)).toContain("nw_wolf"); // the answer is larger than a pipe buffer: not cut off
        expect(lists.items.length).toBeGreaterThan(100);
      }
      const spec = path.join(dir, "q.json");
      await fs.writeFile(
        spec,
        JSON.stringify({
          name: "Wolves",
          giver: "farmer_ned",
          stages: [
            { do: "talk", journal: "Ned asked." },
            { do: "return", journal: "Done." },
          ],
        }),
      );
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

      // verify: read-only; apply the staged files to a copy, then ask whether the quest can be completed
      const applied = path.join(dir, "applied");
      await fs.cp(src, applied, { recursive: true });
      await fs.cp(out, applied, { recursive: true });
      const ok = await cli(["verify", "q_wolves", "--project", applied]);
      expect(ok.ok, ok.error).toBe(true);
      expect(ok.result?.completable, JSON.stringify(ok.result)).toBe(true);
      const missing = await cli(["verify", "q_nope", "--project", applied]);
      expect(missing.ok).toBe(false);
      // remove: the conversation and journal the quest created are reported as removed, the giver is restored
      const out2 = path.join(dir, "out2");
      const gone = await cli(["remove", "q_wolves", "--project", applied, "--out", out2, "--no-compile"]);
      expect(gone.ok, gone.error).toBe(true);
      const removedFiles = (gone.result?.source as { removed: string[]; files: string[] }).removed;
      expect(removedFiles).toContain("module.jrl.json");
      expect(removedFiles.some((f) => /^dq_farmer_ned\.dlg/.test(f))).toBe(true);
      expect((gone.result?.source as { files: string[] }).files).toContain("farmer_ned.utc.json");
      const restored = JSON.parse(await fs.readFile(path.join(out2, "farmer_ned.utc.json"), "utf-8"));
      expect(restored.Conversation.value).toBe("");
      expect(restored.VarTable?.value ?? []).toEqual([]);

      // the giver moves to an area no door or trigger leads to: the gap shows, naming the area
      const git = JSON.parse(await fs.readFile(path.join(applied, "dm_area.git.json"), "utf-8"));
      git["Creature List"] = {
        type: "list",
        value: [
          {
            __struct_id: 4,
            Tag: str("farmer_ned"),
            TemplateResRef: str("farmer_ned", "resref"),
            Conversation: str("dq_farmer_ned", "resref"),
          },
        ],
      };
      await fs.writeFile(path.join(applied, "dm_area.git.json"), JSON.stringify(git));
      const ifo = JSON.parse(await fs.readFile(path.join(applied, "module.ifo.json"), "utf-8"));
      ifo.Mod_Entry_Area = str("elsewhere", "resref");
      await fs.writeFile(path.join(applied, "module.ifo.json"), JSON.stringify(ifo));
      const bad = await cli(["verify", "q_wolves", "--project", applied]);
      expect(bad.ok, bad.error).toBe(true);
      expect(bad.result?.completable).toBe(false);
    } finally {
      await fs.rm(dir, { recursive: true, force: true });
    }
  }, 120_000);
});
