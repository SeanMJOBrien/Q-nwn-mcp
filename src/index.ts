import { setupProblems } from "./util/setup-check.js";
import { registerAll } from "./register-all.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { withLenientArgs } from "./util/lenient-args.js";
import { recordTools } from "./util/tool-registry.js";

const mcp = new McpServer({
  name: "nwn-mcp",
  version: "1.0.0",
});
// Every string parameter also takes a number, boolean, list or object (src/util/lenient-args.ts); recordTools keeps
// each handler so one tool can run others in-process (src/util/tool-registry.ts).
const server = recordTools(withLenientArgs(mcp));

registerAll(server);

// Start the server
const transport = new StdioServerTransport();
await mcp.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol)
for (const problem of setupProblems()) console.error(`setup: ${problem}`);
console.error("NWN MCP server started");
