/**
 * LIVE test for create_systest_instrumentation — needs only a real
 * neverwinter.nim toolchain + NWN game data to probe-compile the generated
 * include (not Docker — that's verify-server-tools.live.test.ts's job).
 * Gated the same way as comprehensive-module.live.test.ts.
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

const MODULE_FILENAME = "nwn_mcp_systest_tools_live_test";

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
  "create_systest_instrumentation (LIVE) — real nim toolchain + NWN data required",
  () => {
    let client: Client;
    let cleanupClient: () => Promise<void>;

    async function call(name: string, args: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
      const result = await client.callTool({ name, arguments: args });
      return parseResult(result as { content: Array<{ type: string; text?: string }> });
    }

    beforeAll(async () => {
      const [{ registerModuleTools }, { registerSystestTools }] = await Promise.all([
        import("./module-tools.js"),
        import("./systest-tools.js"),
      ]);

      const server = new McpServer({ name: "systest-tools-live-test", version: "1.0.0" });
      registerModuleTools(server);
      registerSystestTools(server);

      const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
      await server.connect(serverTransport);
      client = new Client({ name: "systest-tools-live-test-client", version: "1.0.0" });
      await client.connect(clientTransport);
      cleanupClient = async () => {
        await client.close();
        await server.close();
      };

      const created = await call("create_module", { name: "Systest Tools Live Test", filename: MODULE_FILENAME });
      if (!created.success) throw new Error(`Fixture module creation failed: ${JSON.stringify(created)}`);
    }, 60_000);

    afterAll(async () => {
      await cleanupClient?.();
      if (NWN_FOLDER_USER) {
        await fs.rm(path.join(NWN_FOLDER_USER, "modules", `${MODULE_FILENAME}.mod`), { force: true });
      }
    }, 30_000);

    it(
      "create_systest_instrumentation really compiles against a real nwnsc binary",
      async () => {
        const result = await call("create_systest_instrumentation", {});
        expect(result.compiles).toBe(true);
        expect(result.success).toBe(true);
      },
      30_000,
    );
  },
);

if (!hasRealNwnData) {
  describe("create_systest_instrumentation (LIVE)", () => {
    it.skip("NWN_FOLDER_DATA/NWN_FOLDER_USER not set — skipping real compile coverage", () => {});
  });
}
