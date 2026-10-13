/**
 * Integration tests for compose_encounter's placement mode (F6,
 * docs/encounter-composer-spec.md) — the `area` param path that actually
 * builds and places the roster, as opposed to the dry-run-only tests in
 * encounter-composer-tools.integration.test.ts.
 *
 * Exercises the real extracted buildCreatureBlueprint/placeCreatureCore
 * functions (src/util/creature-builder.ts, src/util/creature-placer.ts)
 * against a synthetic module index — same mocking pattern as
 * placement-conventions.integration.test.ts (only nim-tools/module-loader
 * are mocked; the walkmesh and verify logic run for real).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import path from "path";
import os from "os";
import fs from "fs/promises";

import type { GffDocument, GffObj } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

// ─── Mocks ────────────────────────────────────────────────────────────────

const ground = vi.hoisted(() => ({
  walkable: (_x: number, _y: number): boolean => true,
}));

vi.mock("../nim-tools.js", () => ({
  gffToJson: vi.fn(async () => ({})),
  jsonToGff: vi.fn(async (doc: unknown, filePath: string) => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(doc));
  }),
  erfPack: vi.fn(async () => {}),
  resmanExtract: vi.fn(async () => {}),
  resmanExtractToJson: vi.fn(async () => ({})),
  readTextFile: vi.fn(async () => ""),
  // compose_encounter wires a Tier 1/2 caster's random-abilities spawn script, which
  // goes through writeAndCompileScript -> compileScript (real nim toolchain in prod).
  // Mocked the same way jsonToGff is above: write a stub file so the real function's
  // subsequent fs.stat(outPath) succeeds, and report success.
  compileScript: vi.fn(async (_nssPath: string, outPath?: string) => {
    if (outPath) {
      await fs.mkdir(path.dirname(outPath), { recursive: true });
      await fs.writeFile(outPath, "compiled");
    }
    return { success: true, output: "" };
  }),
}));

let mockIndex: ModuleIndex;
let tempDir: string;

vi.mock("../module-loader.js", () => ({
  requireIndex: () => mockIndex,
  buildResmanOptions: async () => ({ root: undefined, userDir: undefined, erfs: undefined, dirs: [mockIndex.tempDir] }),
}));

vi.mock("../util/walkmesh.js", () => ({
  checkPlacementWalkable: vi.fn(async (x: number, y: number) =>
    ground.walkable(x, y) ? { ok: true, z: 0 } : { ok: false, reason: "mock: not walkable" }),
}));

function createMockIndex(): ModuleIndex {
  return {
    modPath: "/fake/mod.mod",
    tempDir,
    moduleName: "TestModule",
    resources: new Map(),
    tags: new Map(),
    scripts: new Map(),
    areas: new Map(),
    dialogs: new Map(),
    creatures: [],
    items: [],
    parsedGff: new Map(),
    twodaTables: new Map(),
    customTlk: null,
    baseTlk: null,
    hakList: [],
    customTlkName: "",
    loadWarnings: [],
  } as unknown as ModuleIndex;
}

function makeGit(): GffDocument {
  return {
    __data_type: "GIT ",
    "Creature List": { type: "list", value: [] },
    "Placeable List": { type: "list", value: [] },
    "Door List": { type: "list", value: [] },
    "Encounter List": { type: "list", value: [] },
    TriggerList: { type: "list", value: [] },
    WaypointList: { type: "list", value: [] },
    SoundList: { type: "list", value: [] },
    StoreList: { type: "list", value: [] },
  } as unknown as GffDocument;
}

async function setupArea(name = "testarea"): Promise<void> {
  const git = makeGit();
  const gitPath = path.join(tempDir, `${name}.git`);
  await fs.writeFile(gitPath, JSON.stringify(git));
  mockIndex.parsedGff.set(`${name}.git`, git);
  mockIndex.resources.set(`${name}.git`, { resref: name, extension: "git", filePath: gitPath, sizeBytes: 100 });
  mockIndex.parsedGff.set(`${name}.are`, {
    __data_type: "ARE ",
    Width: { type: "int", value: 8 },
    Height: { type: "int", value: 8 },
  } as unknown as GffDocument);
  mockIndex.areas.set(name, {
    resref: name, name: "Test Area", width: 8, height: 8, tileset: "ttf01", creatureCount: 0, placeableCount: 0,
    doorCount: 0, waypointCount: 0, triggerCount: 0, encounterCount: 0, soundCount: 0, storeCount: 0,
  });
}

/** Simulate a real base-game creature blueprint already resolvable from the module (sidesteps real resman). */
function addSupportBlueprint(resref: string): void {
  const doc = {
    __data_type: "UTC ",
    Tag: { type: "cexostring", value: resref.toUpperCase() },
    TemplateResRef: { type: "resref", value: resref },
    FirstName: { type: "cexolocstring", value: { "0": "Zombie" } },
    FactionID: { type: "word", value: 1 },
  };
  const p = path.join(tempDir, `${resref}.utc`);
  mockIndex.resources.set(`${resref}.utc`, { resref, extension: "utc", filePath: p, sizeBytes: 100 });
  mockIndex.parsedGff.set(`${resref}.utc`, doc as unknown as GffDocument);
}

/** Simulate a real base-game item blueprint already resolvable from the module (sidesteps real resman). */
function addItemBlueprint(resref: string): void {
  const doc = {
    __data_type: "UTI ",
    Tag: { type: "cexostring", value: resref.toUpperCase() },
    TemplateResRef: { type: "resref", value: resref },
    BaseItem: { type: "int", value: 16 }, // Armor base item row — matches nw_cloth001's real class
    LocalizedName: { type: "cexolocstring", value: { "0": "Clothing" } },
  };
  const p = path.join(tempDir, `${resref}.uti`);
  mockIndex.resources.set(`${resref}.uti`, { resref, extension: "uti", filePath: p, sizeBytes: 100 });
  mockIndex.parsedGff.set(`${resref}.uti`, doc as unknown as GffDocument);
}

async function createTestClient(): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const { registerEncounterComposerTools } = await import("./encounter-composer-tools.js");
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerEncounterComposerTools(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return { client, cleanup: async () => { await client.close(); await server.close(); } };
}

function json(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
  return JSON.parse(text);
}

beforeEach(async () => {
  tempDir = path.join(os.tmpdir(), `nwn-mcp-compose-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.mkdir(tempDir, { recursive: true });
  mockIndex = createMockIndex();
  ground.walkable = () => true;
});

afterEach(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("compose_encounter — placement mode", () => {
  it("builds and places the boss when the boss alone is sufficient, with no support placed", async () => {
    await setupArea();
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as {
        success: boolean;
        bossAloneSufficient: boolean;
        placed?: { area: string; boss: { resref: string; tag: string; verify: { status: string } }; support: unknown[] };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.bossAloneSufficient).toBe(true);
      expect(parsed.placed).toBeDefined();
      expect(parsed.placed?.area).toBe("testarea");
      expect(parsed.placed?.boss.tag).toBe("compose_necromancer_boss");
      expect(parsed.placed?.support).toEqual([]);

      // The boss blueprint really exists in the index now.
      const key = `${parsed.placed!.boss.resref}.utc`;
      expect(mockIndex.resources.has(key)).toBe(true);

      // And is really placed in the area's GIT.
      const git = mockIndex.parsedGff.get("testarea.git") as GffObj;
      const creatureList = (git["Creature List"] as { value: GffObj[] }).value;
      expect(creatureList).toHaveLength(1);
    } finally {
      await cleanup();
    }
  });

  it("places both the boss and a real support cluster when the boss alone falls short", async () => {
    await setupArea();
    addSupportBlueprint("nw_zombie01");
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "3", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as {
        success: boolean;
        support: { resref: string; count: number } | null;
        placed?: { support: Array<{ resref: string }> };
      };
      expect(parsed.success).toBe(true);
      expect(parsed.support?.resref).toBe("nw_zombie01");
      expect(parsed.placed?.support).toHaveLength(parsed.support!.count);
      expect(parsed.placed?.support.every((s) => s.resref === "nw_zombie01")).toBe(true);

      const git = mockIndex.parsedGff.get("testarea.git") as GffObj;
      const creatureList = (git["Creature List"] as { value: GffObj[] }).value;
      // 1 boss + support.count zombies
      expect(creatureList).toHaveLength(1 + parsed.support!.count);
    } finally {
      await cleanup();
    }
  });

  it("reports a real wealth budget and weapon-type recommendation, but never equips a specific item", async () => {
    await setupArea();
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as {
        gearing: { wealthBudgetGp: number; recommendedWeapon: { label: string } | null };
        nextSteps: string;
      };
      expect(parsed.gearing.wealthBudgetGp).toBeGreaterThan(0);
      expect(parsed.nextSteps).toContain("equip_npc_by_role");
      expect(parsed.nextSteps.toLowerCase()).not.toContain("equipped: righthand");
    } finally {
      await cleanup();
    }
  });

  it("runs verify_creature on the newly built boss and includes the result", async () => {
    await setupArea();
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as { placed?: { boss: { verify: { status: string; target: string } } } };
      expect(parsed.placed?.boss.verify).toBeDefined();
      expect(["pass", "warn", "fail"]).toContain(parsed.placed?.boss.verify.status);
    } finally {
      await cleanup();
    }
  });

  it("gives the boss a real stat block, baseline clothing, and wires the random-abilities spawn script (regression: 'Thug caster had no clothes/spells')", async () => {
    await setupArea();
    addItemBlueprint("nw_cloth001");
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as {
        placed?: { boss: { resref: string; spellsWired: boolean; spellWiringWarnings?: string[] } };
      };
      expect(parsed.placed?.boss.spellsWired).toBe(true);
      expect(parsed.placed?.boss.spellWiringWarnings?.join(" ")).toContain("LevelUpHenchman");

      const bossDoc = mockIndex.parsedGff.get(`${parsed.placed!.boss.resref}.utc`) as GffObj;
      const feats = (bossDoc.FeatList as { value: GffObj[] } | undefined)?.value ?? [];
      expect(feats.length).toBeGreaterThan(0);

      const equip = (bossDoc.Equip_ItemList as { value: GffObj[] } | undefined)?.value ?? [];
      const chest = equip.find((e) => e.__struct_id === 2); // EQUIP_SLOT_MAP.chest
      expect((chest?.TemplateResRef as { value: string } | undefined)?.value).toBe("nw_cloth001");

      // The spawn wrapper script exists and includes the random-abilities system.
      expect(mockIndex.resources.has("inc_random_abil.nss")).toBe(true);
      expect([...mockIndex.resources.keys()].some((k) => k.startsWith("ce_nec_spn"))).toBe(true);
    } finally {
      await cleanup();
    }
  });

  it("fails clearly when there isn't enough walkable room for the full roster", async () => {
    await setupArea();
    addSupportBlueprint("nw_zombie01");
    ground.walkable = () => false; // nothing is walkable
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "3", targetEL: "6", area: "testarea" },
      });
      const parsed = json(result) as { success: boolean; error?: string };
      expect(parsed.success).toBe(false);
      expect(parsed.error).toContain("walkable spot");
    } finally {
      await cleanup();
    }
  });
});
