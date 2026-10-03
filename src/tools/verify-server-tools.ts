/**
 * Live verify-server orchestration tool.
 *
 * Automates the manual recipe documented in docs/runtime-verification-spec.md §5
 * and used by hand throughout this project's history: copy the module into
 * ~/nwn-mcp-verify-server's modules dir, point NWN_MODULE at it, bring the
 * throwaway docker-compose stack up, poll the log files, tear it down, and
 * report what the real engine actually said. Static verify_* tools can only
 * prove a blueprint's fields look right; this proves the engine behaved as
 * intended once it actually loaded the module (the invalid_feat_id bug this
 * project found in "The Salt Gate Conspiracy" only surfaced this way).
 *
 * Deliberately NOT part of the verify_* naming family — it shells out to
 * Docker, needs a real engine, and can take up to ~90s, unlike the fast
 * in-process static checks.
 */

import { execFile } from "child_process";
import fs from "fs/promises";
import path from "path";
import { promisify } from "util";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { MCP_FOLDER_VERIFYSERVER } from "../config.js";
import { requireIndex } from "../module-loader.js";
import { erfPack } from "../nim-tools.js";
import { clearDirtyUnder } from "../util/dirty-state.js";
import { optNumParam, toI } from "../util/params.js";
import { bracketTagCount, DEFAULT_ERROR_PATTERNS, parseLiveLogs } from "../util/verify-server/result.js";

const execFileAsync = promisify(execFile);

const DOWN_TIMEOUT_MS = 30_000;
const UP_TIMEOUT_MS = 60_000;
/**
 * The MCP SDK's client-side default request timeout is 60s
 * (DEFAULT_REQUEST_TIMEOUT_MSEC in @modelcontextprotocol/sdk) — confirmed live
 * against a real call: a 60s-budgeted run genuinely timed out client-side
 * (McpError -32001) even though the server kept running to completion and
 * still tore the container down correctly in its finally block. A calling
 * client doesn't know or care that the server finished; it just reports the
 * request as failed. 45s leaves real headroom under that default (down+up
 * overhead is typically a few seconds) so a caller using default MCP client
 * settings gets a real response instead of a false-negative timeout. A caller
 * that has configured a longer client-side request timeout can still pass a
 * larger `timeoutSeconds` explicitly.
 */
const DEFAULT_TIMEOUT_SECONDS = 45;
const STABILITY_WINDOW_SECONDS = 5;
const POLL_INTERVAL_MS = 1_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readTextOrEmpty(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

/**
 * Run `docker-compose <args>` with cwd set to the verify-server checkout.
 *
 * The repo's docker-compose.yml uses `${PWD}` bind mounts — but `${PWD}`
 * interpolation reads the literal `PWD` environment variable, NOT the
 * process's actual working directory. Node's `execFile({cwd})` changes the
 * child's real working directory at the OS level without touching the
 * inherited `PWD` env var, so docker-compose would otherwise resolve
 * `${PWD}` to whatever directory the calling process happened to inherit
 * (confirmed live: it resolved to this repo's own directory when the MCP
 * server's cwd differed from the verify-server checkout, sending
 * docker-compose looking for config/nwserver.env in the wrong place
 * entirely). Explicitly overriding `PWD` in the child's env is the fix —
 * only docker-compose v1.29.2 is available on this project's machines (not
 * the `docker compose` v2 plugin), so the binary name is fixed too.
 */
async function execDockerCompose(
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("docker-compose", args, {
    cwd,
    env: { ...process.env, PWD: cwd },
    timeout: timeoutMs,
    maxBuffer: 8 * 1024 * 1024,
  });
}

interface PollResult {
  timedOut: boolean;
  sawLoadingModule: boolean;
  serverLogTail: string;
  engineLogTail: string;
}

/**
 * Poll nwserverLog1.txt/nwengineLog.txt until the module has clearly finished
 * loading, or the timeout is hit.
 *
 * Reads each file's FULL current content on every tick rather than diffing
 * against a pre-recorded byte offset — confirmed live that the server
 * truncates both log files on every container start (a fresh `up` produces a
 * log containing only that session's lines, not appended onto whatever was
 * there before). An offset recorded before our own `down`+`up` cycle would
 * therefore be larger than the new, truncated file, making every "new bytes
 * since offset" read come back empty — exactly the bug this replaced (it
 * silently reported `loaded: false` on every real run, having read nothing).
 * Since we always call `down` immediately before `up`, and these files are
 * small (one module-load session's worth of lines), reading the whole file
 * each tick is both correct and cheap.
 */
async function pollLogs(
  serverLogPath: string,
  engineLogPath: string,
  opts: { expectedCheckLines?: number; timeoutSeconds: number },
): Promise<PollResult> {
  const deadline = Date.now() + opts.timeoutSeconds * 1000;
  let lastGrowthAt = Date.now();
  let lastTotalSize = 0;
  let sawLoadingModule = false;
  let serverLogTail = "";
  let engineLogTail = "";

  while (Date.now() < deadline) {
    const [newServer, newEngine] = await Promise.all([readTextOrEmpty(serverLogPath), readTextOrEmpty(engineLogPath)]);
    serverLogTail = newServer;
    engineLogTail = newEngine;

    if (!sawLoadingModule && /Loading Module:/.test(newServer)) sawLoadingModule = true;

    const currentTotalSize = newServer.length + newEngine.length;
    if (currentTotalSize > lastTotalSize) {
      lastTotalSize = currentTotalSize;
      lastGrowthAt = Date.now();
    }

    if (opts.expectedCheckLines !== undefined) {
      const count = bracketTagCount(newServer) + bracketTagCount(newEngine);
      if (count >= opts.expectedCheckLines) {
        return { timedOut: false, sawLoadingModule, serverLogTail, engineLogTail };
      }
    }

    if (sawLoadingModule && Date.now() - lastGrowthAt >= STABILITY_WINDOW_SECONDS * 1000) {
      return { timedOut: false, sawLoadingModule, serverLogTail, engineLogTail };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  return { timedOut: true, sawLoadingModule, serverLogTail, engineLogTail };
}

/**
 * Patch NWN_MODULE= in config/nwserver.env to the given module name (no .mod
 * extension — NWN's own convention, confirmed against real server/modules/
 * contents). Errors loudly rather than appending a duplicate key if the line
 * isn't found, since docker's env-file parser behavior with a duplicate key
 * is not something to rely on.
 */
async function patchNwnModuleEnv(envPath: string, moduleName: string): Promise<void> {
  const original = await fs.readFile(envPath, "utf-8");
  const lineRe = /^NWN_MODULE=.*$/m;
  if (!lineRe.test(original)) {
    throw new Error(`No NWN_MODULE= line found in ${envPath} — refusing to guess where to add one.`);
  }
  const patched = original.replace(lineRe, `NWN_MODULE=${moduleName}`);
  await fs.writeFile(envPath, patched, "utf-8");
}

const RAW_EXCERPT_MAX_CHARS = 20_000;

export function registerVerifyServerTools(server: McpServer): void {
  server.tool(
    "run_live_verification",
    "Run the currently-loaded (or an explicit) module against a real headless NWN engine in an isolated, " +
      "throwaway Docker container (~/nwn-mcp-verify-server by default — see MCP_FOLDER_VERIFYSERVER), and report " +
      "what the engine log actually says. Catches load-time/spawn-time bugs no static verify_* check can see " +
      "(an engine-rejected invalid feat ID, EXOWARNINGs, [SPEC_OK]/[SPEC_FAIL] lines from create_spec_verification " +
      "instrumentation, or any other [TAG_*] bracket-tagged log line from other instrumentation). Repacks the " +
      "module, copies it into the verify-server's modules dir, points NWN_MODULE at it, brings the container up, " +
      "polls the logs for up to timeoutSeconds (default 45) — stopping early once expectedCheckLines bracket-tagged " +
      "lines appear, or once log growth stalls for a few seconds after the module starts loading — then ALWAYS " +
      "tears the container down, even on error or timeout (this server is throwaway and never player-facing). " +
      "Needs Docker (docker-compose v1) and a configured verify-server checkout; can take up to timeoutSeconds, " +
      "unlike the fast in-process verify_* family. The 45s default is deliberately under the MCP SDK's own 60s " +
      "client-side request timeout — raising timeoutSeconds past ~50 only helps if the caller has also raised its " +
      "own request timeout, otherwise the call appears to fail even though the server finishes and tears down " +
      "correctly regardless. See docs/runtime-verification-spec.md for the full design.",
    {
      modulePath: z.string().optional().describe(
        "Explicit .mod path to test. Default: repack the currently-loaded module and use it.",
      ),
      expectedCheckLines: optNumParam(
        "Short-circuit polling once this many bracket-tagged log lines ([SPEC_OK]/[SPEC_FAIL]/[TAG_*]) appear, " +
          "without waiting out the stability window. Omit if the module carries no such instrumentation.",
      ),
      timeoutSeconds: optNumParam("Overall poll timeout in seconds (default 90)."),
      errorPatterns: z
        .array(z.string())
        .optional()
        .describe(
          `Case-insensitive substrings to flag as engine errors in the log. Default: ${JSON.stringify(DEFAULT_ERROR_PATTERNS)}.`,
        ),
    },
    { idempotentHint: true },
    async ({ modulePath, expectedCheckLines, timeoutSeconds, errorPatterns }) => {
      const verifyServerDir = MCP_FOLDER_VERIFYSERVER;
      const composeFile = path.join(verifyServerDir, "docker-compose.yml");
      try {
        await fs.access(composeFile);
      } catch {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Verify-server not found at ${verifyServerDir} (no docker-compose.yml). Set MCP_FOLDER_VERIFYSERVER to a checkout of nwn-mcp-verify-server.`,
            },
          ],
        };
      }

      let resolvedModPath: string;
      if (modulePath) {
        resolvedModPath = path.resolve(modulePath);
      } else {
        const index = requireIndex();
        await erfPack(index.tempDir, index.modPath);
        clearDirtyUnder(index.tempDir);
        resolvedModPath = index.modPath;
      }

      const moduleName = path.basename(resolvedModPath, ".mod");
      const serverModulesDir = path.join(verifyServerDir, "server", "modules");
      const serverLogPath = path.join(verifyServerDir, "logs", "nwserverLog1.txt");
      const engineLogPath = path.join(verifyServerDir, "logs", "nwengineLog.txt");
      const envPath = path.join(verifyServerDir, "config", "nwserver.env");

      await fs.mkdir(serverModulesDir, { recursive: true });
      await fs.copyFile(resolvedModPath, path.join(serverModulesDir, `${moduleName}.mod`));
      await patchNwnModuleEnv(envPath, moduleName);

      let poll: PollResult;
      try {
        await execDockerCompose(["down"], verifyServerDir, DOWN_TIMEOUT_MS).catch(() => {});
        await execDockerCompose(["up", "-d"], verifyServerDir, UP_TIMEOUT_MS);

        poll = await pollLogs(serverLogPath, engineLogPath, {
          expectedCheckLines: expectedCheckLines !== undefined ? toI(expectedCheckLines) : undefined,
          timeoutSeconds: timeoutSeconds !== undefined ? toI(timeoutSeconds, DEFAULT_TIMEOUT_SECONDS) : DEFAULT_TIMEOUT_SECONDS,
        });
      } finally {
        try {
          await execDockerCompose(["down"], verifyServerDir, DOWN_TIMEOUT_MS);
        } catch (err) {
          console.error(`run_live_verification: docker-compose down failed during teardown: ${err}`);
        }
      }

      const parsed = parseLiveLogs(poll.serverLogTail, poll.engineLogTail, errorPatterns ?? DEFAULT_ERROR_PATTERNS);
      const combinedTail = `${poll.serverLogTail}\n${poll.engineLogTail}`;
      const rawLogExcerpt =
        combinedTail.length > RAW_EXCERPT_MAX_CHARS
          ? combinedTail.slice(-RAW_EXCERPT_MAX_CHARS)
          : combinedTail;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                loaded: poll.sawLoadingModule,
                timedOut: poll.timedOut,
                moduleName,
                engineErrors: parsed.engineErrors,
                specResults: parsed.specResults,
                otherTaggedLines: parsed.otherTaggedLines,
                rawLogExcerpt,
                ...(poll.timedOut && !poll.sawLoadingModule
                  ? { note: "Timed out before the server logged Loading Module: — the container may have failed to start." }
                  : {}),
              },
              null,
              2,
            ),
          },
        ],
      };
    },
  );
}
