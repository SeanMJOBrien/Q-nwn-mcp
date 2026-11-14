import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";
import type { ModuleIndex } from "../types/module.js";

let mockIndex: ModuleIndex;
let tempDir: string;
let advBase: string;
/** The module is named "Demo", so its adventure directory is <advBase>/Demo. */
const advDir = () => path.join(advBase, "Demo");

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ dirs: [mockIndex.tempDir] }),
}));

async function client(): Promise<{ c: Client; close: () => Promise<void> }> {
  const { registerPhaseTools } = await import("./phase-tools.js");
  const server = new McpServer({ name: "t", version: "1" });
  registerPhaseTools(server);
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a);
  const c = new Client({ name: "c", version: "1" });
  await c.connect(b);
  return { c, close: async () => { await c.close(); await server.close(); } };
}

function body(r: unknown): Record<string, unknown> {
  return JSON.parse(((r as { content: Array<{ text: string }> }).content[0]).text);
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-phase-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  advBase = path.join(tempDir, "adventures");
  process.env.MCP_FOLDER_ADVENTURES = advBase;
  mockIndex = {
    tempDir,
    moduleName: "Demo",
    resources: new Map(),
    parsedGff: new Map(),
    areas: new Map(),
    twodaTables: new Map(),
  } as unknown as ModuleIndex;
});
afterEach(async () => {
  delete process.env.MCP_FOLDER_ADVENTURES;
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("phase_check", () => {
  it("start: stops naming the missing section", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n");
    const { c, close } = await client();
    try {
      const r = await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } });
      expect(r.isError).toBe(true);
      expect(body(r).missing).toEqual(["Plot"]);
    } finally {
      await close();
    }
  });

  it("start: passes when every section is present", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n## Plot\np\n");
    const { c, close } = await client();
    try {
      const r = await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } });
      expect(body(r).ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("end: writes the status entry, partial when the phase section is missing", async () => {
    await fs.writeFile(path.join(tempDir, "adventure.md"), "## Module\nm\n## Plot\np\n");
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "phase_check", arguments: { phase: "plot", step: "end" } }));
      expect(r.status).toBe("success");
      const r2 = body(await c.callTool({ name: "phase_check", arguments: { phase: "environment", step: "end", errors: '["boom"]' } }));
      expect(r2.status).toBe("partial");
      const file = JSON.parse(await fs.readFile(path.join(advDir(), "Demo-status.json"), "utf8"));
      expect(file.phases.plot.status).toBe("success");
      expect(file.phases.environment.errors).toContain("boom");
    } finally {
      await close();
    }
  });

  it("a declared skip: skipped on both steps, recorded, and later phases don't need its section", async () => {
    await fs.writeFile(
      path.join(tempDir, "adventure.md"),
      "## Module\n- **Scope:** quests only\n- **Skip phases:** areas\n## Plot\np\n",
    );
    const { c, close } = await client();
    try {
      const a = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } }));
      expect(a.skipped).toBe(true);
      const e = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "end" } }));
      expect(e.skipped).toBe(true);
      const file = JSON.parse(await fs.readFile(path.join(advDir(), "Demo-status.json"), "utf8"));
      expect(file.phases.areas.status).toBe("skipped");
      const env = body(await c.callTool({ name: "phase_check", arguments: { phase: "environment", step: "start" } }));
      expect(env.ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("plot end runs the story graph check: a dangling lead makes the phase partial", async () => {
    await fs.writeFile(
      path.join(tempDir, "adventure.md"),
      "## Module\nm\n## Plot\np\n### Story Graph\n- beat B1 | act: setup | leads: B9\n- beat B2 | act: climax\n",
    );
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "phase_check", arguments: { phase: "plot", step: "end" } }));
      expect(r.status).toBe("partial");
      expect(JSON.stringify(r.errors)).toContain("story_dangling_lead");
    } finally {
      await close();
    }
  });
});

describe("set_project_scope", () => {
  it("records some_phases into adventure.md so phase_check skips the rest", async () => {
    mockIndex.moduleName = "Demo";
    await fs.writeFile(path.join(tempDir, "adventure.md"), "# Adventure: Demo\n\n## Module\n- **Title:** Demo\n\n## Plot\np\n");
    const { c, close } = await client();
    try {
      const set = body(await c.callTool({ name: "set_project_scope", arguments: { kind: "some_phases", scope: "only quests", phases: '["quests"]' } }));
      expect(set.ok).toBe(true);
      expect(set.skip).toContain("areas");
      expect(set.skip).not.toContain("quests");
      const skipped = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } }));
      expect(skipped.skipped).toBe(true);
      const read = body(await c.callTool({ name: "set_project_scope", arguments: {} }));
      expect(read.kind).toBe("some_phases");
    } finally {
      await close();
    }
  });

  it("nwscript_only writes no adventure.md; bad phases are refused", async () => {
    const { c, close } = await client();
    try {
      const r = body(await c.callTool({ name: "set_project_scope", arguments: { kind: "nwscript_only", scope: "fix my scripts" } }));
      expect(r.wroteAdventure).toBe(false);
      await expect(fs.access(path.join(advDir(), "Demo.md"))).rejects.toThrow();
      const bad = await c.callTool({ name: "set_project_scope", arguments: { kind: "some_phases", scope: "x", phases: '["nope"]' } });
      expect(bad.isError).toBe(true);
    } finally {
      await close();
    }
  });
  it("one_feature skips every phase and clears stale Scope/Skip lines; whole_adventure resumes", async () => {
    mockIndex.moduleName = "Demo";
    await fs.writeFile(path.join(tempDir, "adventure.md"), "# Adventure: Demo\n\n## Module\n- **Title:** Demo\n\n## Plot\np\n");
    const { c, close } = await client();
    try {
      await c.callTool({ name: "set_project_scope", arguments: { kind: "some_phases", scope: "only quests", phases: '["quests"]' } });
      expect(await fs.readFile(path.join(advDir(), "Demo.md"), "utf8")).toContain("Skip phases");
      const one = body(await c.callTool({ name: "set_project_scope", arguments: { kind: "one_feature", scope: "just a shop" } }));
      expect(one.ok).toBe(true);
      const md = await fs.readFile(path.join(advDir(), "Demo.md"), "utf8");
      expect(md).not.toContain("Skip phases");
      expect(md).not.toContain("**Scope:**");
      for (const step of ["start", "end"] as const) {
        const r = body(await c.callTool({ name: "phase_check", arguments: { phase: "plot", step } }));
        expect(r.skipped).toBe(true);
        expect(r.kind).toBe("one_feature");
      }
      await c.callTool({ name: "set_project_scope", arguments: { kind: "whole_adventure", scope: "everything" } });
      const back = body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } }));
      expect(back.skipped).toBeUndefined();
    } finally {
      await close();
    }
  });
});

describe("story tools and phase prompts", () => {
  const textOf = (r: unknown) => (r as { content: Array<{ text: string }> }).content[0].text;

  it("write_story_section starts the story, adds and replaces sections; read_story returns them", async () => {
    const { c, close } = await client();
    try {
      const none = await c.callTool({ name: "read_story", arguments: {} });
      expect(none.isError).toBe(true);

      const w1 = body(await c.callTool({ name: "write_story_section", arguments: { section: "Module", text: "- **Level:** 3" } }));
      expect(w1).toMatchObject({ ok: true, section: "Module", action: "added" });
      const w2 = body(await c.callTool({ name: "write_story_section", arguments: { section: "plot", text: "## Plot\n\n### Premise\nA." } }));
      expect(w2).toMatchObject({ section: "Plot", action: "added", next: 'phase_check(phase: "plot", step: "end")' });
      const w3 = body(await c.callTool({ name: "write_story_section", arguments: { section: "Plot", text: "### Premise\nB." } }));
      expect(w3.action).toBe("replaced");

      const story = await fs.readFile(path.join(advDir(), "Demo.md"), "utf8");
      expect(story).toBe("# Demo\n\n## Module\n\n- **Level:** 3\n\n## Plot\n\n### Premise\nB.\n");

      expect(textOf(await c.callTool({ name: "read_story", arguments: { sections: "Plot,Areas" } }))).toBe(
        "## Plot\n\n### Premise\nB.\n\n(Not in the story yet: Areas. Sections present: Module, Plot)",
      );
      // the phase check now sees the section the tool wrote
      expect(body(await c.callTool({ name: "phase_check", arguments: { phase: "areas", step: "start" } })).ok).toBe(true);
    } finally {
      await close();
    }
  });

  it("write_story_section refuses an unknown section, empty text and a second ## heading, naming the field", async () => {
    const { c, close } = await client();
    try {
      const bad = async (args: Record<string, string>) => {
        const r = await c.callTool({ name: "write_story_section", arguments: args });
        expect(r.isError).toBe(true);
        return body(r).field;
      };
      expect(await bad({ section: "Monsters", text: "x" })).toBe("section");
      expect(await bad({ section: "Plot", text: "## Plot\n" })).toBe("text");
      expect(await bad({ section: "Plot", text: "a\n## Areas\nb" })).toBe("text");
    } finally {
      await close();
    }
  });

  it("write_dm_guide writes the titled guide file", async () => {
    const { c, close } = await client();
    try {
      expect((await c.callTool({ name: "write_dm_guide", arguments: { text: "short" } })).isError).toBe(true);
      const r = body(await c.callTool({ name: "write_dm_guide", arguments: { text: `# Guide\n${"All of it. ".repeat(30)}` } }));
      expect(r.ok).toBe(true);
      expect(await fs.readFile(path.join(advDir(), "Demo-dm-guide.md"), "utf8")).toMatch(/^# Guide/);
    } finally {
      await close();
    }
  });

  it("get_phase_prompt returns the short prompt with its profile", async () => {
    const { c, close } = await client();
    try {
      const t = textOf(await c.callTool({ name: "get_phase_prompt", arguments: { phase: "quests" } }));
      expect(t).toMatch(/^Phase: quests\nTool profile: MCP_TOOL_PROFILE=quests\n/);
      expect(t).toContain("build_quest(");
      expect(t.length).toBeLessThan(4500);
    } finally {
      await close();
    }
  });
});
