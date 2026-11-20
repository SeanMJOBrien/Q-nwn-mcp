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
// MCP_LENIENT_ARGS=1: every string parameter also takes a number, boolean, list or object (src/util/lenient-args.ts).
// Off by default: the widened schemas make the tool list ~60 % larger (~41k tokens over all tools).
// recordTools keeps each handler so one tool can run others in-process (src/util/tool-registry.ts).
const lenient = process.env.MCP_LENIENT_ARGS === "1";
const server = recordTools(lenient ? withLenientArgs(mcp) : mcp);

registerAll(server);

// Start the server
const transport = new StdioServerTransport();
await mcp.connect(transport);

// Log to stderr (stdout is reserved for MCP protocol)
for (const problem of setupProblems()) console.error(`setup: ${problem}`);
console.error("NWN MCP server started");
