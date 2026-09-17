/**
 * Comprehensive LIVE integration test — the companion file to
 * comprehensive-module.integration.test.ts, covering the systems that file
 * explicitly cannot: real tile-solving (create_area/adventure_generate_layout/
 * adventure_apply_layout), get_tileset_details, and the real compile-probe
 * half of the four generator tools (create_reward_system,
 * create_spec_verification, create_random_abilities_system,
 * create_gear_randomizer) — all of which need a real neverwinter.nim
 * toolchain, a real NWN game-data install, and a real nwnsc compiler to mean
 * anything. None of that is mockable without lying about what's being tested.
 *
 * ENV-GATED, NOT HARDCODED SKIP OR RUN: this file auto-skips (via
 * describe.skipIf) when NWN_FOLDER_DATA/NWN_FOLDER_USER aren't set, so
 * `npm test`/`npm run verify` (and therefore the pre-commit hook) stays fast
 * and offline for anyone without a real NWN install — the same "degrade to
 * skip, never to fail" convention this project already uses for every other
 * resman-dependent check. On a machine with real data configured (this one
 * included), it runs for real and is genuine end-to-end coverage, not a mock.
 *
 * REAL SIDE EFFECTS, CLEANED UP: unlike the mocked tier, this file uses NO
 * vi.mock at all — it drives the actual module-loader/nim-tools against a
 * real throwaway module written into NWN_FOLDER_USER/modules/ (a real
 * directory on the host, not a temp dir), because create_module/load_module
 * have no code path that accepts a synthetic location. The module is named
 * with an unmistakable, greppable prefix and deleted in afterAll — if this
 * suite is ever interrupted before cleanup, look for
 * `nwn_mcp_comprehensive_live_test.mod` in that directory and remove it by
 * hand.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import fs from "fs/promises";
import path from "path";

const NWN_FOLDER_DATA = process.env.NWN_FOLDER_DATA;
const NWN_FOLDER_USER = process.env.NWN_FOLDER_USER;
const hasRealNwnData = Boolean(NWN_FOLDER_DATA && NWN_FOLDER_USER);

const MODULE_FILENAME = "nwn_mcp_comprehensive_live_test";

function parseResult(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const textBlock = result.content.find((c) => c.type === "text");
  if (!textBlock?.text) return {};
  try {
    return JSON.parse(textBlock.text);
  } catch {
    return { __rawText: textBlock.text };
  }
}

describe.skipIf(!hasRealNwnData)(
  "comprehensive module (LIVE) — tileset/layout/generator-compile systems, real NWN data required",
  () => {
    let client: Client;
    let cleanupClient: () => Promise<void>;

    async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
      const result = await client.callTool({ name, arguments: args });
      return parseResult(result as { content: Array<{ type: string; text?: string }> });
    }

    beforeAll(async () => {
      const [
        { registerModuleTools },
        { registerPaintTools },
        { registerAdventureTools },
        { registerTilesetTools },
        { registerBlueprintTools },
        { registerRewardTools },
        { registerSpecCheckTools },
        { registerRandomAbilitiesTools },
        { registerGearTools },
      ] = await Promise.all([
        import("./module-tools.js"),
        import("./paint-tools.js"),
        import("./adventure-tools.js"),
        import("./tileset-tools.js"),
        import("./blueprint-tools.js"),
        import("./reward-tools.js"),
        import("./spec-check-tools.js"),
        import("./random-abilities-tools.js"),
        import("./gear-tools.js"),
      ]);

      const server = new McpServer({ name: "comprehensive-live-test", version: "1.0.0" });
      registerModuleTools(server);
      registerPaintTools(server);
      registerAdventureTools(server);
      registerTilesetTools(server);
      registerBlueprintTools(server);
      registerRewardTools(server);
      registerSpecCheckTools(server);
      registerRandomAbilitiesTools(server);
      registerGearTools(server);

      const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      client = new Client({ name: "comprehensive-live-test-client", version: "1.0.0" });
      await client.connect(clientTransport);
      cleanupClient = async () => { await client.close(); await server.close(); };
    }, 60_000);

    afterAll(async () => {
      await cleanupClient?.();
      // Real cleanup: delete the throwaway module from the real modules dir
      // so this suite is re-runnable and never leaves cruft in NWN_FOLDER_USER.
      if (NWN_FOLDER_USER) {
        const modPath = path.join(NWN_FOLDER_USER, "modules", `${MODULE_FILENAME}.mod`);
        await fs.rm(modPath, { force: true });
      }
    }, 30_000);

    it(
      "create_module writes a real throwaway module and loads it",
      async () => {
        const created = await call("create_module", { name: "Comprehensive Live Test", filename: MODULE_FILENAME });
        expect(created.success).toBe(true);
      },
      30_000,
    );

    it(
      "create_area + adventure_generate_layout + adventure_apply_layout solve real tiles against a real tileset",
      async () => {
        const area = await call("create_area", {
          resref: "livetest_dungeon", name: "Live Test Dungeon", width: "12", height: "12", tileset: "tdm01",
        });
        expect(area.success).toBe(true);

        const layout = await call("adventure_generate_layout", {
          tileset: "tdm01", width: "12", height: "12",
          style: JSON.stringify({ type: "dungeon", rooms: 2 }),
        });
        expect(Array.isArray(layout.zones)).toBe(true);
        expect((layout.zones as unknown[]).length).toBeGreaterThan(0);

        const applied = await call("adventure_apply_layout", {
          area: "livetest_dungeon", layout: JSON.stringify(layout),
        });
        expect(applied.success).toBe(true);
        expect((applied.tilesResolved as number)).toBeGreaterThan(0);
      },
      30_000,
    );

    it(
      "get_tileset_details returns real terrain/crosser/adjacency data",
      async () => {
        const details = await call("get_tileset_details", { tileset: "tdm01" });
        expect(Array.isArray(details.terrainTypes)).toBe(true);
        expect((details.terrainTypes as unknown[]).length).toBeGreaterThan(0);
      },
      30_000,
    );

    it(
      "the four generator tools really compile against a real nwnsc binary",
      async () => {
        // A real creature blueprint for spec-check/random-abilities to target.
        const companion = await call("create_creature_blueprint", {
          resref: "livetest_hero", tag: "livetest_hero", name: "Live Test Hero",
          race: "6", classes: '[{"class":2,"level":1}]', startingPackage: "2", henchman: true,
        });
        expect(companion.success).toBe(true);

        const reward = await call("create_reward_system", {});
        expect(reward.compiles).toBe(true);

        const specCheck = await call("create_spec_verification", {});
        expect(specCheck.compiles).toBe(true);

        const randomAbilities = await call("create_random_abilities_system", {});
        expect(randomAbilities.compiles).toBe(true);

        const gear = await call("create_gear_randomizer", {});
        expect(gear.compiles).toBe(true);
      },
      60_000,
    );
  },
);

if (!hasRealNwnData) {
  // Explicit, greppable note in the run log for why this whole file skipped —
  // `describe.skipIf` alone just shows as "skipped" with no reason attached.
  describe("comprehensive module (LIVE)", () => {
    it.skip("NWN_FOLDER_DATA/NWN_FOLDER_USER not set — skipping real tileset/layout/generator-compile coverage (see comprehensive-module.integration.test.ts for the always-run mocked tier)", () => {});
  });
}
