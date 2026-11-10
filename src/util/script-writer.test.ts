import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ModuleIndex } from "../types/module.js";
import { hasHandEditedHeader } from "./hand-edited.js";
import { writeAndCompileScript } from "./script-writer.js";

let dir: string;
let index: ModuleIndex;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "nwn-mcp-sw-"));
  index = { tempDir: dir, resources: new Map() } as unknown as ModuleIndex;
});
afterEach(() => fs.rm(dir, { recursive: true, force: true }));

describe("hand-edited scripts", () => {
  it("detects the header in the first lines only", () => {
    expect(hasHandEditedHeader("// hand-edited: reason\nvoid main(){}")).toBe(true);
    expect(hasHandEditedHeader("// x\n// Hand-Edited: reason")).toBe(true);
    expect(hasHandEditedHeader("a\nb\nc\nd\ne\n// hand-edited: late")).toBe(false);
  });
  it("a generator write is refused, a deliberate one allowed", async () => {
    await fs.writeFile(path.join(dir, "inc_x.nss"), "// hand-edited: patched\nint a;\n");
    await expect(writeAndCompileScript(index, "inc_x", "int b;\n", false)).rejects.toThrow(/hand-edited/);
    expect(await fs.readFile(path.join(dir, "inc_x.nss"), "utf-8")).toContain("int a;");
    await writeAndCompileScript(index, "inc_x", "int b;\n", false, { allowHandEdited: true });
    expect(await fs.readFile(path.join(dir, "inc_x.nss"), "utf-8")).toBe("int b;\n");
  });
  it("rewriting identical content is fine", async () => {
    const src = "// hand-edited: patched\nint a;\n";
    await fs.writeFile(path.join(dir, "inc_y.nss"), src);
    await writeAndCompileScript(index, "inc_y", src, false);
  });
});
