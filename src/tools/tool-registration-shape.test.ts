/**
 * Static regression guard for a real, previously-shipped bug: a literal `{}`
 * landing in `server.tool()`'s ANNOTATIONS position (the 4th positional arg,
 * in the 5-arg `name, description, schema, annotations, handler` form)
 * silently breaks the tool — the MCP SDK's overload detection treats an
 * empty object as "this must be the handler," then fails every real call
 * with `typedHandler is not a function`. Confirmed once already
 * (`start_web_editor`, see CLAUDE.md's "Known Pitfalls"), found only by
 * accident (writing its first integration test). This test parses the real
 * TypeScript AST of every tool-registration file so the next accidental
 * `{}` in that position is caught by `npm run verify`, not by luck.
 *
 * A `{}` in the SCHEMA position (3rd arg, for a no-input tool like
 * `list_areas`) is a completely different, correct, common pattern — this
 * test only flags the annotations slot specifically.
 */

import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const TOOLS_DIR = path.dirname(fileURLToPath(import.meta.url));

function toolFiles(): string[] {
  return fs
    .readdirSync(TOOLS_DIR)
    .filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map((f) => path.join(TOOLS_DIR, f));
}

/** One finding per offending `server.tool(...)` call: file + 1-based line. */
function findEmptyAnnotationsCalls(filePath: string): string[] {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
  const offenders: string[] = [];

  function visit(node: ts.Node): void {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "tool" &&
      node.arguments.length === 5
    ) {
      const annotationsArg = node.arguments[3];
      if (ts.isObjectLiteralExpression(annotationsArg) && annotationsArg.properties.length === 0) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(annotationsArg.getStart(sourceFile));
        offenders.push(`${path.relative(process.cwd(), filePath)}:${line + 1}`);
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return offenders;
}

describe("server.tool() annotations position", () => {
  it("never passes an empty object literal {} as the annotations argument", () => {
    const offenders = toolFiles().flatMap(findEmptyAnnotationsCalls);
    expect(offenders).toEqual([]);
  });

  it("the test itself actually detects the bug shape (sanity check against a synthetic offender)", () => {
    // Written outside TOOLS_DIR so this fixture can never be picked up by
    // toolFiles() itself, even if a test runner ever parallelizes within
    // this file.
    const tmpFile = path.join(os.tmpdir(), `tool-registration-shape-fixture-${Date.now()}.ts`);
    fs.writeFileSync(
      tmpFile,
      `server.tool("x", "desc", {}, {}, async () => ({ content: [] }));\n`,
    );
    try {
      const offenders = findEmptyAnnotationsCalls(tmpFile);
      expect(offenders).toHaveLength(1);
    } finally {
      fs.rmSync(tmpFile, { force: true });
    }
  });
});
