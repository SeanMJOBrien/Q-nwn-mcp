import { z } from "zod";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { spawn, execFile } from "child_process";
import { promisify } from "util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex } from "../module-loader.js";
import { NIM_FOLDER_NWTOOLS } from "../config.js";

const execFileAsync = promisify(execFile);

// Python web tools (area map generator + web editor) live outside this repo;
// they are maintained as a Claude skill. Override with MCP_FOLDER_WEBTOOLS.
const WEB_TOOLS_DIR =
  process.env.MCP_FOLDER_WEBTOOLS ||
  path.join(os.homedir(), ".claude", "skills", "nwn-web-editor", "scripts");
const PYTHON = process.env.MCP_PYTHON || "python3";

const AREA_MAP_SCRIPT = path.join(WEB_TOOLS_DIR, "nwn_area_map.py");
const WEB_EDITOR_SCRIPT = path.join(WEB_TOOLS_DIR, "nwn_web_editor.py");

// nwn_gff sits next to the other nim tools the server already uses.
function nwnGffPath(): string {
  const exe = process.platform === "win32" ? "nwn_gff.exe" : "nwn_gff";
  return NIM_FOLDER_NWTOOLS ? path.join(NIM_FOLDER_NWTOOLS, exe) : exe;
}

// One tracked editor process per MCP server instance.
let editorProc: { pid: number; url: string; dir: string } | null = null;

async function assertScript(script: string): Promise<void> {
  try {
    await fs.access(script);
  } catch {
    throw new Error(
      `Web tool script not found: ${script}. Install the nwn-web-editor ` +
      `Claude skill or set MCP_FOLDER_WEBTOOLS to the scripts directory.`,
    );
  }
}

export function registerWebTools(server: McpServer): void {

  server.tool(
    "generate_area_map",
    "Generate a self-contained, pan/zoomable HTML map of the loaded module's areas, laid out by the cardinal directions implied by their door/trigger transitions. Disconnected area groups get their own labeled region; underground areas (ARE Flags & 0x02) layer onto the surface cell they overlap. Each area node links to the web editor's lighting/tags/scripts forms for that area (see start_web_editor / editorUrl).",
    {
      outputPath: z.string().describe("Path to write the HTML file (e.g., '/var/www/qarea/index.html')"),
      title: z.string().optional().describe("Page title (default: 'Module area map')"),
      editorUrl: z.string().optional().describe("Base URL the area nodes' edit links point at, e.g. '/qedit' behind a reverse proxy or 'http://127.0.0.1:8340' for a local editor (default)"),
      nav: z.array(z.string()).optional().describe("Extra top-bar links as 'Label=URL' strings, e.g. ['Wiki=/hos1-wiki/']"),
      dir: z.string().optional().describe("Flat directory of .are/.git files to map. Defaults to the loaded module's extracted temp dir."),
    },
    { idempotentHint: true },
    async ({ outputPath, title, editorUrl, nav, dir }) => {
      await assertScript(AREA_MAP_SCRIPT);
      const srcDir = dir ? path.resolve(dir) : requireIndex().tempDir;
      const args = [
        AREA_MAP_SCRIPT,
        "--dir", srcDir,
        "-o", path.resolve(outputPath),
        "--nwn-gff", nwnGffPath(),
      ];
      if (title) args.push("--title", title);
      if (editorUrl) args.push("--editor-url", editorUrl);
      for (const n of nav ?? []) args.push("--nav", n);
      const { stdout } = await execFileAsync(PYTHON, args, {
        timeout: 300_000, maxBuffer: 8 * 1024 * 1024,
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            outputPath: path.resolve(outputPath),
            summary: stdout.trim(),
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "start_web_editor",
    "Start the browser-based NWN GFF web editor (areas: bulk scripts/lighting/fog/tags; creatures: stats/feats/appearance; player .bic files). By default it serves the loaded module's extracted temp dir, so edits made in the browser are picked up by repack_module. Only one tracked editor runs per server; stop it with stop_web_editor. The editor has no auth - keep it on 127.0.0.1 unless it sits behind an authenticated reverse proxy.",
    {
      dir: z.string().optional().describe("Flat GFF directory to edit. Defaults to the loaded module's extracted temp dir (edits then flow into repack_module)."),
      bicDir: z.string().optional().describe("Directory of player .bic files (e.g., a servervault), searched recursively"),
      host: z.string().optional().describe("Bind address (default 127.0.0.1)"),
      port: z.number().optional().describe("Port (default 8340)"),
      urlPrefix: z.string().optional().describe("Serve under this path prefix (e.g. '/qedit') when behind a reverse proxy"),
      nav: z.array(z.string()).optional().describe("Extra nav-bar links as 'Label=URL' strings"),
    },
    {},
    async ({ dir, bicDir, host, port, urlPrefix, nav }) => {
      await assertScript(WEB_EDITOR_SCRIPT);
      if (editorProc) {
        try {
          process.kill(editorProc.pid, 0); // still alive?
          return {
            content: [{
              type: "text",
              text: `Web editor already running (pid ${editorProc.pid}) at ${editorProc.url} serving ${editorProc.dir}. Use stop_web_editor first to restart with different options.`,
            }],
          };
        } catch { editorProc = null; }
      }
      const srcDir = dir ? path.resolve(dir) : requireIndex().tempDir;
      const bindHost = host || "127.0.0.1";
      const bindPort = port ?? 8340;
      const args = [
        WEB_EDITOR_SCRIPT,
        "--dir", srcDir,
        "--host", bindHost,
        "--port", String(bindPort),
        "--nwn-gff", nwnGffPath(),
      ];
      if (bicDir) args.push("--bic-dir", path.resolve(bicDir));
      if (urlPrefix) args.push("--url-prefix", urlPrefix);
      for (const n of nav ?? []) args.push("--nav", n);

      const child = spawn(PYTHON, args, { detached: true, stdio: "ignore" });
      child.unref();
      if (!child.pid) throw new Error("Failed to spawn web editor process");
      // give it a beat to fail fast on bad args / port in use
      await new Promise((r) => setTimeout(r, 800));
      try {
        process.kill(child.pid, 0);
      } catch {
        throw new Error(
          `Web editor exited immediately - check the port (${bindPort}) is free and the dir exists: ${srcDir}`,
        );
      }
      const url = `http://${bindHost}:${bindPort}${urlPrefix ?? ""}/`;
      editorProc = { pid: child.pid, url, dir: srcDir };
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true, pid: child.pid, url, serving: srcDir,
            note: dir ? undefined :
              "Serving the module's extracted temp dir - run repack_module after editing to write changes into the .mod.",
          }, null, 2),
        }],
      };
    }
  );

  server.tool(
    "stop_web_editor",
    "Stop the web editor process started by start_web_editor.",
    {},
    { idempotentHint: true },
    async () => {
      if (!editorProc) {
        return { content: [{ type: "text", text: "No tracked web editor is running." }] };
      }
      const { pid, url } = editorProc;
      editorProc = null;
      try {
        process.kill(pid);
        return { content: [{ type: "text", text: `Stopped web editor (pid ${pid}, was ${url}).` }] };
      } catch {
        return { content: [{ type: "text", text: `Web editor (pid ${pid}) was already gone.` }] };
      }
    }
  );
}
