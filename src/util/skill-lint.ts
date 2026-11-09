/**
 * skill_lint: keeps .claude/skills in step with the tools. The LLM follows skill text, not tool schemas, so a skill that
 * names a tool that was renamed, passes a parameter the tool no longer takes, or copies a paragraph from another skill
 * is a bug that only shows up in a playthrough. Run by skill-lint.test.ts (so by `npm run verify`).
 */

import fs from "fs";
import path from "path";
import ts from "typescript";

export interface ToolInfo {
  /** Parameter names, or undefined when the schema isn't an object literal (then parameters aren't checked). */
  params?: Set<string>;
}

/** Every tool registered with server.tool("name", ...) in src/tools/*.ts, plus loop tables with `tool: "name"`. */
export function collectTools(toolsDir: string): Map<string, ToolInfo> {
  const tools = new Map<string, ToolInfo>();
  const files = fs.readdirSync(toolsDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
  for (const f of files) {
    const filePath = path.join(toolsDir, f);
    const source = fs.readFileSync(filePath, "utf8");
    const sf = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true);
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "tool") {
        const [nameArg, , schemaArg] = node.arguments;
        if (nameArg && ts.isStringLiteralLike(nameArg)) {
          let params: Set<string> | undefined;
          if (schemaArg && ts.isObjectLiteralExpression(schemaArg)) {
            params = new Set();
            let known = true;
            for (const p of schemaArg.properties) {
              if (ts.isPropertyAssignment(p) || ts.isShorthandPropertyAssignment(p)) {
                const n = p.name;
                if (ts.isIdentifier(n) || ts.isStringLiteralLike(n)) params.add(n.text);
                else known = false;
              } else known = false; // a spread: parameters come from elsewhere
            }
            if (!known) params = undefined;
          }
          tools.set(nameArg.text, { params });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
    // Tools registered from a table: { tool: "verify_item", ... }
    for (const m of source.matchAll(/\btool:\s*"([a-z][a-z0-9_]*)"/g)) if (!tools.has(m[1])) tools.set(m[1], {});
  }
  return tools;
}

export interface SkillFile {
  name: string;
  text: string;
}

export function readSkills(skillsDir: string): SkillFile[] {
  return fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(skillsDir, d.name, "SKILL.md")))
    .map((d) => ({ name: d.name, text: fs.readFileSync(path.join(skillsDir, d.name, "SKILL.md"), "utf8") }));
}

/** Words that look like tool calls but are scripts, CLI programs or examples, not MCP tools. */
export const NOT_TOOLS = new Set([
  "q_chk", "q_act", "q_roll", "q_check", "q_check_evt", "q_ondeath", "q_onenter", "q_trigger", "q_onused", "q_search",
  "q_approach", "q_mod_acquire", "inc_quest", "nwn_gff", "nwn_erf", "nwn_script_comp", "nwn_resman_extract", "nwn_twoda", "table_info",
]);

export interface CallRef {
  skill: string;
  tool: string;
  line: number;
  /** Argument names used with `name:` or `name=` inside the call's parentheses. */
  args: string[];
}

/** `tool_name(arg: ..., arg2="...")` occurrences in a skill. NWScript calls are PascalCase and never match. */
export function findCalls(skill: SkillFile): CallRef[] {
  const calls: CallRef[] = [];
  const re = /\b([a-z][a-z0-9]*(?:_[a-z0-9]+)+)\(/g;
  for (const m of skill.text.matchAll(re)) {
    const start = (m.index ?? 0) + m[0].length;
    let depth = 1;
    let i = start;
    while (i < skill.text.length && depth > 0 && i - start < 4000) {
      const c = skill.text[i];
      if (c === "(") depth++;
      else if (c === ")") depth--;
      i++;
    }
    const inner = skill.text.slice(start, i - 1);
    const args: string[] = [];
    // top-level `name:` / `name=` at depth 0 of the inner text, outside quotes
    let d = 0;
    let q = "";
    let token = "";
    const flush = (next: string) => {
      const t = token.trim();
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) && (next === ":" || next === "=")) args.push(t);
      token = "";
    };
    for (let k = 0; k < inner.length; k++) {
      const c = inner[k];
      if (q) {
        if (c === q) q = "";
        continue;
      }
      if (c === '"' || c === "'" || c === "`") {
        q = c;
        continue;
      }
      if (c === "(" || c === "{" || c === "[") d++;
      else if (c === ")" || c === "}" || c === "]") d--;
      if (d === 0 && (c === ":" || c === "=") && inner[k + 1] !== "=") flush(c);
      else if (d === 0 && c === ",") token = "";
      else if (d === 0) token += c;
    }
    const line = skill.text.slice(0, m.index).split("\n").length;
    calls.push({ skill: skill.name, tool: m[1], line, args });
  }
  return calls;
}

export function lintCalls(skills: SkillFile[], tools: Map<string, ToolInfo>): string[] {
  const problems: string[] = [];
  for (const sk of skills) {
    for (const call of findCalls(sk)) {
      if (NOT_TOOLS.has(call.tool)) continue;
      const info = tools.get(call.tool);
      if (!info) {
        problems.push(`${sk.name}:${call.line} calls ${call.tool}(), which is not a registered tool`);
        continue;
      }
      if (!info.params) continue;
      for (const a of call.args) {
        if (!info.params.has(a)) problems.push(`${sk.name}:${call.line} passes ${a} to ${call.tool}(), which has no such parameter`);
      }
    }
  }
  return problems;
}

const MIN_DUPLICATE_CHARS = 150;

/** Paragraphs over 150 characters that appear verbatim in more than one skill. */
export function findDuplicateParagraphs(skills: SkillFile[]): string[] {
  const seen = new Map<string, Set<string>>();
  for (const sk of skills) {
    let inFence = false;
    for (const para of sk.text.split(/\n\s*\n/)) {
      if ((para.match(/```/g) ?? []).length % 2 === 1) inFence = !inFence;
      const norm = para.replace(/\s+/g, " ").trim();
      if (norm.length < MIN_DUPLICATE_CHARS || norm.startsWith("```") || norm.startsWith("|")) continue;
      const owners = seen.get(norm) ?? new Set<string>();
      owners.add(sk.name);
      seen.set(norm, owners);
    }
    void inFence;
  }
  return [...seen.entries()]
    .filter(([, owners]) => owners.size > 1)
    .map(([text, owners]) => `${[...owners].sort().join(", ")} share: "${text.slice(0, 90)}…"`);
}
