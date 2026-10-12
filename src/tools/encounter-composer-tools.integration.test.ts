/**
 * Integration tests for compose_encounter (F5 of docs/encounter-composer-spec.md).
 *
 * Dry-run only — no module index needed, so this is a plain MCP client/server
 * round-trip against the real registered tool, no mocking required at all.
 */

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { describe, expect, it } from "vitest";
import { registerEncounterComposerTools } from "./encounter-composer-tools.js";

async function createTestClient(): Promise<{ client: Client; cleanup: () => Promise<void> }> {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registerEncounterComposerTools(server);
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(clientTransport);
  return {
    client,
    cleanup: async () => {
      await client.close();
      await server.close();
    },
  };
}

function json(result: { content: Array<{ type: string; text?: string }> }): Record<string, unknown> {
  const text = result.content.find((c) => c.type === "text")?.text ?? "{}";
  return JSON.parse(text);
}

describe("compose_encounter", () => {
  it("returns a clear error naming recognized roles for an unrecognized one, never a guess", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "bandit_captain", bossCR: "6", targetEL: "6" },
      });
      const parsed = json(result);
      expect(parsed.success).toBe(false);
      expect(parsed.recognizedRoles).toEqual(["necromancer"]);
    } finally {
      await cleanup();
    }
  });

  it("reports the boss alone as sufficient and omits support, for the user's own stated example", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", partyLevel: "6" },
      });
      const parsed = json(result) as {
        success: boolean;
        role: string;
        boss: { classId: number; level: number; cr: number; el: number; band: string };
        bossAloneSufficient: boolean;
        support: unknown;
      };
      expect(parsed.success).toBe(true);
      expect(parsed.role).toBe("necromancer");
      expect(parsed.boss.classId).toBe(10); // CLASS_TYPE_WIZARD
      expect(parsed.boss.level).toBe(6);
      expect(parsed.boss.el).toBe(6);
      expect(parsed.boss.band).toBe("standard");
      expect(parsed.bossAloneSufficient).toBe(true);
      expect(parsed.support).toBeNull();
    } finally {
      await cleanup();
    }
  });

  it("computes a real undead support cluster when the boss alone falls short of the target", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "3", targetEL: "6" },
      });
      const parsed = json(result) as {
        bossAloneSufficient: boolean;
        support: { resref: string; tag: string; cr: number; count: number; el: number } | null;
      };
      expect(parsed.bossAloneSufficient).toBe(false);
      expect(parsed.support).not.toBeNull();
      // Boss CR 3 -> support cap is CR 3 -> pickSupportCandidate picks the
      // real zombie01 (CR 1), the highest real undead_minion candidate <= 3.
      expect(parsed.support?.resref).toBe("nw_zombie01");
      expect(parsed.support?.el).toBeGreaterThanOrEqual(6);
    } finally {
      await cleanup();
    }
  });

  it("never returns a combined boss+support EL field, only the two separate figures", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "3", targetEL: "6" },
      });
      const parsed = json(result);
      expect(parsed).not.toHaveProperty("totalEL");
      expect(parsed).not.toHaveProperty("combinedEL");
      expect(parsed).not.toHaveProperty("overallEL");
    } finally {
      await cleanup();
    }
  });

  it("surfaces the archetype's own caveat in the response", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6" },
      });
      const parsed = json(result) as { caveat?: string };
      expect(parsed.caveat).toContain("cantrips");
    } finally {
      await cleanup();
    }
  });

  it("flags allyRecommendation when the fight bands hard/deadly for the stated party level", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      // Boss CR 6 at partyLevel 2 -> diff 4 -> "deadly" per bandDifficulty.
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", partyLevel: "2" },
      });
      const parsed = json(result) as {
        allyRecommendation: { recommended: boolean; band: string; howToAddAlly?: string };
      };
      expect(parsed.allyRecommendation.recommended).toBe(true);
      expect(parsed.allyRecommendation.band).toBe("deadly");
      expect(parsed.allyRecommendation.howToAddAlly).toContain("henchman");
    } finally {
      await cleanup();
    }
  });

  it("does not recommend an ally for a standard-banded fight", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", partyLevel: "6" },
      });
      const parsed = json(result) as { allyRecommendation: { recommended: boolean; band: string } };
      expect(parsed.allyRecommendation.recommended).toBe(false);
      expect(parsed.allyRecommendation.band).toBe("standard");
    } finally {
      await cleanup();
    }
  });

  it("adds a partySizeCaveat only when partySize is below 4, never adjusting the band itself", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6", partyLevel: "2", partySize: "1" },
      });
      const parsed = json(result) as {
        allyRecommendation: { band: string; partySizeCaveat?: string };
      };
      expect(parsed.allyRecommendation.band).toBe("deadly"); // unchanged by partySize
      expect(parsed.allyRecommendation.partySizeCaveat).toContain("4-character party");
    } finally {
      await cleanup();
    }
  });

  it("omits allyRecommendation entirely when partyLevel is not given", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "6", targetEL: "6" },
      });
      const parsed = json(result);
      expect(parsed).not.toHaveProperty("allyRecommendation");
    } finally {
      await cleanup();
    }
  });

  it("omits band fields when partyLevel is not given", async () => {
    const { client, cleanup } = await createTestClient();
    try {
      const result = await client.callTool({
        name: "compose_encounter",
        arguments: { role: "necromancer", bossCR: "3", targetEL: "6" },
      });
      const parsed = json(result) as { boss: { band?: string }; support: { band?: string } | null };
      expect(parsed.boss.band).toBeUndefined();
      expect(parsed.support?.band).toBeUndefined();
    } finally {
      await cleanup();
    }
  });
});
