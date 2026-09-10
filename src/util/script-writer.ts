/**
 * Shared "write an .nss into the module and compile it" step.
 *
 * Extracted from write_script so tools that generate script source (rather than
 * accepting it from the caller) go through exactly the same path: same temp-dir
 * placement, same index registration, same compiler invocation. A second copy
 * of this logic would drift, and a script that is written but never registered
 * is invisible to every verifier.
 */

import fsPromises from "fs/promises";
import path from "path";
import { buildResmanOptions } from "../module-loader.js";
import { compileScript } from "../nim-tools.js";
import { markDirty } from "./dirty-state.js";
import type { ModuleIndex } from "../types/module.js";

export interface WriteScriptResult {
  written: string;
  sizeBytes: number;
  compiled?: boolean;
  compilerOutput?: string;
  compiledFile?: string;
  compiledSize?: number;
}

/**
 * Write `source` as `<resref>.nss`, register it in the index, and compile it
 * unless `doCompile` is false.
 */
export async function writeAndCompileScript(
  index: ModuleIndex,
  resref: string,
  source: string,
  doCompile: boolean,
): Promise<WriteScriptResult> {
  const resrefLower = resref.toLowerCase();
  const nssKey = `${resrefLower}.nss`;
  const ncsKey = `${resrefLower}.ncs`;

  const nssPath = path.join(index.tempDir, `${resrefLower}.nss`);
  await fsPromises.writeFile(nssPath, source, "utf-8");
  markDirty(nssPath);

  const nssStat = await fsPromises.stat(nssPath);
  index.resources.set(nssKey, {
    resref: resrefLower,
    extension: "nss",
    filePath: nssPath,
    sizeBytes: nssStat.size,
  });

  const result: WriteScriptResult = { written: nssKey, sizeBytes: nssStat.size };
  if (!doCompile) return result;

  const ncsPath = nssPath.replace(/\.nss$/i, ".ncs");
  const resman = await buildResmanOptions(index);
  const compResult = await compileScript(nssPath, ncsPath, { resman });

  result.compiled = compResult.success;
  result.compilerOutput = compResult.output;

  if (compResult.success) {
    const ncsStat = await fsPromises.stat(ncsPath);
    index.resources.set(ncsKey, {
      resref: resrefLower,
      extension: "ncs",
      filePath: ncsPath,
      sizeBytes: ncsStat.size,
    });
    result.compiledFile = ncsKey;
    result.compiledSize = ncsStat.size;
  }

  return result;
}
