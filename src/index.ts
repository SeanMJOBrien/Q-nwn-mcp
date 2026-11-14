import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAll } from "./register-all.js";
import { filterToolsByProfile, resolveToolProfile } from "./tool-profiles.js";

const server = new McpServer({
  name: "nwn-mcp",
  version: "1.0.0",
});

// MCP_TOOL_PROFILE=quests,verify exposes only those tool groups (see src/tool-profiles.ts)
const profile = resolveToolProfile(process.env.MCP_TOOL_PROFILE);
registerAll(filterToolsByProfile(server, profile));

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol)
console.error(
  profile ? `NWN MCP server started (tool profile: ${profile.names.join(",")})` : "NWN MCP server started",
);
