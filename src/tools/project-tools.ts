/** export_project: write the loaded module as a nasher-style JSON project (TODO #29). */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { requireIndex } from "../module-loader.js";
import { ensureAdventureDir } from "../util/adventure-dir.js";
import { exportProject } from "../util/project.js";

export function registerProjectTools(server: McpServer): void {
  server.tool(
    "export_project",
    "Write the loaded module as a project under its adventure directory (adventures/<Title>/): every GFF resource as pretty JSON in src/<type>/, scripts in src/nss/, compiled scripts in src/ncs/, other files in src/other/, plus project.json and a nasher.cfg. " +
      "Content comes from the server's in-memory documents, so call it after the work is in. Files whose content did not change are left untouched. See docs/module-projects.md.",
    { dir: z.string().optional().describe("Project directory (default: the module's adventure directory)") },
    { idempotentHint: true },
    async ({ dir }) => {
      const index = requireIndex();
      const projectDir = dir ?? (await ensureAdventureDir(index));
      const summary = await exportProject(index, projectDir);
      return { content: [{ type: "text" as const, text: JSON.stringify(summary, null, 2) }] };
    },
  );
}
