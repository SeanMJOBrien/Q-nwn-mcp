/**
 * Setup checks: the neverwinter.nim tools and the game folders the server needs, found before any work starts.
 *
 * A missing tool otherwise shows up only as `spawn .../nwn_resman_extract ENOENT` deep inside a tool call; a driver run
 * on a machine with half the tools copied spent 160 model turns on that error (The Mill on Blackwater, 2026-11-18).
 * The driver refuses to start on a problem found here, the server and the tool CLI report it on stderr, and
 * `isSetupError` lets the driver stop when a tool fails for one of these reasons during a run.
 */
import fs from "node:fs";
import path from "node:path";

/** The tools a module build runs (src/nim-tools.ts). nwn_asm, nwn_erf_tlkify and the resman grep/stats are optional. */
export const REQUIRED_NIM_TOOLS = ["nwn_erf", "nwn_gff", "nwn_resman_extract", "nwn_resman_cat", "nwn_script_comp", "nwn_tlk", "nwn_twoda"];

/** The library nwn_script_comp loads from its own folder, per platform. */
const SCRIPT_COMP_LIB: Partial<Record<NodeJS.Platform, string>> = { linux: "libnwnscriptcomp.so", darwin: "libnwnscriptcomp.dylib" };

function isExecutable(file: string, platform: NodeJS.Platform): boolean {
  try {
    fs.accessSync(file, platform === "win32" ? fs.constants.F_OK : fs.constants.X_OK);
    return fs.statSync(file).isFile();
  } catch {
    return false;
  }
}

/** Every setup problem, each a sentence naming the setting or file and what to do. Empty when all is in place. */
export function setupProblems(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string[] {
  const problems: string[] = [];
  const tools = env.NIM_FOLDER_NWTOOLS ?? "";
  if (!tools) problems.push("NIM_FOLDER_NWTOOLS is not set: set it to the folder holding nwn_gff, nwn_erf and the other neverwinter.nim tools.");
  else if (!fs.existsSync(tools)) problems.push(`NIM_FOLDER_NWTOOLS is ${tools}, which does not exist.`);
  else {
    const suffix = platform === "win32" ? ".exe" : "";
    const missing = REQUIRED_NIM_TOOLS.filter((t) => !isExecutable(path.join(tools, `${t}${suffix}`), platform));
    if (missing.length) {
      problems.push(
        `${missing.join(", ")} missing or not executable in ${tools}: copy the whole neverwinter.nim tools folder there` +
          (platform === "darwin" ? " (then xattr -dr com.apple.quarantine and chmod +x on it)" : platform === "win32" ? "" : " (and chmod +x the tools)") +
          ".",
      );
    }
    const lib = SCRIPT_COMP_LIB[platform];
    if (lib && !missing.includes("nwn_script_comp") && !fs.existsSync(path.join(tools, lib))) {
      problems.push(`${lib} is not beside nwn_script_comp in ${tools}: scripts cannot be compiled without it.`);
    }
  }
  const data = env.NWN_FOLDER_DATA ?? "";
  if (!data) problems.push("NWN_FOLDER_DATA is not set: set it to the game's install folder (the one holding data/nwn_base.key).");
  else if (!fs.existsSync(path.join(data, "data", "nwn_base.key"))) problems.push(`NWN_FOLDER_DATA is ${data}, which has no data/nwn_base.key.`);
  const user = env.NWN_FOLDER_USER ?? "";
  if (!user) problems.push("NWN_FOLDER_USER is not set: set it to the game's user folder (the one holding modules/).");
  else if (!fs.existsSync(user)) problems.push(`NWN_FOLDER_USER is ${user}, which does not exist.`);
  return problems;
}

/** A tool result that failed because of the machine's setup, not the call: retrying or changing arguments cannot help. */
export function isSetupError(text: string): boolean {
  return /spawn \S+ (ENOENT|EACCES)|\b(NIM_FOLDER_NWTOOLS|NWN_FOLDER_DATA|NWN_FOLDER_USER)\b[^.]{0,40}\bnot set\b|nwnscriptcomp\.(so|dylib)|Library not loaded/i.test(text);
}

/** Thrown by the driver when a tool fails for a setup reason; the run stops with this message. */
export class SetupError extends Error {
  constructor(
    readonly tool: string,
    readonly detail: string,
  ) {
    super(`${tool} failed because of the machine's setup, not the model: ${detail.slice(0, 400)}`);
    this.name = "SetupError";
  }
}
