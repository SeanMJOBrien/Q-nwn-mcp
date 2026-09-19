/**
 * LIVE test for run_live_verification — needs real Docker (docker-compose v1)
 * plus a configured nwn-mcp-verify-server checkout, and (for building the tiny
 * throwaway module used as a fixture) a real NWN_FOLDER_USER. Gated the same
 * "degrade to skip, never to fail" way as comprehensive-module.live.test.ts.
 *
 * The single most safety-critical property this suite checks is teardown: the
 * verify-server container must never be left running after a call, success or
 * failure — it's documented throwaway/never-player-facing.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const VERIFY_SERVER_DIR = process.env.MCP_FOLDER_VERIFYSERVER || path.join(os.homedir(), "nwn-mcp-verify-server");
const NWN_FOLDER_USER = process.env.NWN_FOLDER_USER;
const hasVerifyServer = fsSync.existsSync(path.join(VERIFY_SERVER_DIR, "docker-compose.yml"));
const canRunLive = hasVerifyServer && Boolean(NWN_FOLDER_USER);

const MODULE_FILENAME = "nwn_mcp_verify_server_live_test";

// docker-compose's ${PWD} interpolation reads the literal PWD env var, not
// execFile's cwd option — see the matching comment/fix in verify-server-tools.ts.
async function dockerComposePs(): Promise<string> {
  const { stdout } = await execFileAsync("docker-compose", ["ps", "-q"], {
    cwd: VERIFY_SERVER_DIR,
    env: { ...process.env, PWD: VERIFY_SERVER_DIR },
  });
  return stdout;
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const textBlock = result.content.find((c) => c.type === "text");
  if (!textBlock?.text) return {};
  try {
    return JSON.parse(textBlock.text);
  } catch {
    return { __rawText: textBlock.text };
  }
}

describe.skipIf(!canRunLive)(
  "run_live_verification (LIVE) — real Docker + real NWN engine required",
  () => {
    let client: Client;
    let cleanupClient: () => Promise<void>;

    // run_live_verification can legitimately take up to its own timeoutSeconds
    // (default 45s) plus docker-compose down/up overhead — the MCP SDK's
    // client-side default request timeout is only 60s, so this test client
    // needs a longer one to observe the real server-side result rather than a
    // false-negative client timeout (this is exactly the failure mode that
    // motivated lowering the tool's own default from 90s to 45s).
    async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
      const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
      return parseResult(result as { content: Array<{ type: string; text?: string }> });
    }

    beforeAll(async () => {
      const [
        { registerModuleTools },
        { registerBlueprintTools },
        { registerPlacementTools },
        { registerPaintTools },
        { registerAdventureTools },
        { registerVerifyServerTools },
      ] = await Promise.all([
        import("./module-tools.js"),
        import("./blueprint-tools.js"),
        import("./placement-tools.js"),
        import("./paint-tools.js"),
        import("./adventure-tools.js"),
        import("./verify-server-tools.js"),
      ]);

      const server = new McpServer({ name: "verify-server-live-test", version: "1.0.0" });
      registerModuleTools(server);
      registerBlueprintTools(server);
      registerPlacementTools(server);
      registerPaintTools(server);
      registerAdventureTools(server);
      registerVerifyServerTools(server);

      const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      client = new Client({ name: "verify-server-live-test-client", version: "1.0.0" });
      await client.connect(clientTransport);
      cleanupClient = async () => {
        await client.close();
        await server.close();
      };

      const created = await call("create_module", { name: "Verify Server Live Test", filename: MODULE_FILENAME });
      if (!created.success) throw new Error(`Fixture module creation failed: ${JSON.stringify(created)}`);

      // The create_module template's own "_start" stub area has NO walkable
      // interior tiles reachable via the standard 1-tile margin (confirmed
      // live: adventure_find_walkable returns nothing for it, and its own
      // reported entryPosition (15,15) is itself Nonwalk) — it's a disposable
      // stub, not meant to host anything (see CLAUDE.md's "dead _start area"
      // pitfall). A real placed creature needs a real walkable area, so build
      // a small dungeon the same way comprehensive-module.live.test.ts does.
      const area = await call("create_area", {
        resref: "vs_livetest_area", name: "Verify Server Live Test Area", width: "12", height: "12", tileset: "tdm01",
      });
      if (!area.success) throw new Error(`Fixture area creation failed: ${JSON.stringify(area)}`);

      const layout = await call("adventure_generate_layout", {
        tileset: "tdm01", width: "12", height: "12", style: JSON.stringify({ type: "dungeon", rooms: 2 }),
      });
      const applied = await call("adventure_apply_layout", {
        area: "vs_livetest_area", layout: JSON.stringify(layout),
      });
      if (!applied.success) throw new Error(`Fixture layout application failed: ${JSON.stringify(applied)}`);
    }, 60_000);

    afterAll(async () => {
      await cleanupClient?.();
      if (NWN_FOLDER_USER) {
        await fs.rm(path.join(NWN_FOLDER_USER, "modules", `${MODULE_FILENAME}.mod`), { force: true });
      }
    }, 30_000);

    it(
      "loads a minimal known-good module with no engine errors",
      async () => {
        const result = await call("run_live_verification", {});
        expect(result.loaded).toBe(true);
        expect(result.timedOut).toBe(false);
        expect(result.engineErrors).toEqual([]);
      },
      125_000,
    );

    it(
      "always tears the container down, even on success",
      async () => {
        const stdout = await dockerComposePs();
        expect(stdout.trim()).toBe("");
      },
      30_000,
    );

    it(
      "flags a creature with the real invalid-feat-1848 shape (TLK strref mistaken for a feat row)",
      async () => {
        const blueprint = await call("create_creature_blueprint", {
          resref: "vs_badfeat",
          tag: "vs_badfeat",
          name: "Bad Feat Test",
          race: "6",
          classes: '[{"class":4,"level":1}]',
          feats: "[1848]",
        });
        expect(blueprint.success).toBe(true);

        const walkable = await call("adventure_find_walkable", { area: "vs_livetest_area" });
        const positions = walkable.positions as Array<{ x: number; y: number }> | undefined;
        expect(positions?.length).toBeGreaterThan(0);
        const spot = positions![0];

        const placed = await call("place_creature", {
          area: "vs_livetest_area",
          blueprint: "vs_badfeat",
          x: String(spot.x),
          y: String(spot.y),
          collisionRadius: "0",
        });
        expect(placed.success).toBe(true);

        const result = await call("run_live_verification", {});
        expect(result.loaded).toBe(true);
        const errors = result.engineErrors as Array<{ line: string; matchedPattern: string }>;
        expect(errors.some((e) => e.matchedPattern.toLowerCase().includes("invalid feat"))).toBe(true);
      },
      125_000,
    );

    it(
      "tears the container down after an error-detection run too",
      async () => {
        const stdout = await dockerComposePs();
        expect(stdout.trim()).toBe("");
      },
      30_000,
    );

    it(
      "reports timedOut and still tears down when given an impossibly short timeout",
      async () => {
        const result = await call("run_live_verification", { timeoutSeconds: "1" });
        expect(result.timedOut).toBe(true);

        const stdout = await dockerComposePs();
        expect(stdout.trim()).toBe("");
      },
      30_000,
    );
  },
);

if (!canRunLive) {
  describe("run_live_verification (LIVE)", () => {
    it.skip(
      "MCP_FOLDER_VERIFYSERVER (docker-compose.yml) and/or NWN_FOLDER_USER not set — skipping real Docker/engine coverage",
      () => {},
    );
  });
}
