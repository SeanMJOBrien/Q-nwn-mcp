/**
 * LIVE test for create_spec_assertions — needs only a real neverwinter.nim
 * toolchain + NWN game data to probe-compile the generated include (not
 * Docker — that's verify-server-tools.live.test.ts's job). Gated the same
 * way as systest-tools.live.test.ts.
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

const MODULE_FILENAME = "nwn_mcp_spec_assert_tools_live_test";

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
  "create_spec_assertions (LIVE) — real nim toolchain + NWN data required",
  () => {
    let client: Client;
    let cleanupClient: () => Promise<void>;

    async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
      const result = await client.callTool({ name, arguments: args });
      return parseResult(result as { content: Array<{ type: string; text?: string }> });
    }

    beforeAll(async () => {
      const [{ registerModuleTools }, { registerSpecAssertTools }] = await Promise.all([
        import("./module-tools.js"),
        import("./spec-assert-tools.js"),
      ]);

      const server = new McpServer({ name: "spec-assert-tools-live-test", version: "1.0.0" });
      registerModuleTools(server);
      registerSpecAssertTools(server);

      const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      client = new Client({ name: "spec-assert-tools-live-test-client", version: "1.0.0" });
      await client.connect(clientTransport);
      cleanupClient = async () => {
        await client.close();
        await server.close();
      };

      const created = await call("create_module", { name: "Spec Assert Tools Live Test", filename: MODULE_FILENAME });
      if (!created.success) throw new Error(`Fixture module creation failed: ${JSON.stringify(created)}`);
    }, 60_000);

    afterAll(async () => {
      await cleanupClient?.();
      if (NWN_FOLDER_USER) {
        await fs.rm(path.join(NWN_FOLDER_USER, "modules", `${MODULE_FILENAME}.mod`), { force: true });
      }
    }, 30_000);

    it(
      "create_spec_assertions really compiles against a real nwnsc binary",
      async () => {
        const result = await call("create_spec_assertions", {});
        expect(result.compiles).toBe(true);
        expect(result.success).toBe(true);
      },
      30_000,
    );
  },
);

if (!hasRealNwnData) {
  describe("create_spec_assertions (LIVE)", () => {
    it.skip("NWN_FOLDER_DATA/NWN_FOLDER_USER not set — skipping real compile coverage", () => {});
  });
}
