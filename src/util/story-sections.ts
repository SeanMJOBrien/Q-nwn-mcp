/** Reading and writing `## Section` blocks of the story file (adventure.md). Pure text functions. */

import { parseSections } from "./phase-check.js";

/** Replaces the body of `## name`, or appends the section when the document has none. Other sections are untouched. */
export function setSection(markdown: string, name: string, body: string): string {
  const lines = markdown.split("\n");
  const isHeading = (line: string) => /^##\s+\S/.test(line);
  const start = lines.findIndex((line) => new RegExp(`^##\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`).test(line));
  const block = [`## ${name}`, "", body.trim(), ""];
  if (start === -1) {
    const base = markdown.trimEnd();
    return `${base}${base ? "\n\n" : ""}${block.join("\n")}`;
  }
  let end = lines.findIndex((line, i) => i > start && isHeading(line));
  if (end === -1) end = lines.length;
  const after = lines.slice(end);
  return [...lines.slice(0, start), ...block, ...after].join("\n").replace(/\n{3,}$/, "\n");
}

/** A model often repeats the heading it was asked to write; drop it so the section is not nested in itself. */
export function stripOwnHeading(name: string, body: string): string {
  const lines = body.trim().split("\n");
  if (/^#{1,2}\s+/.test(lines[0] ?? "") && lines[0].replace(/^#+\s+/, "").trim().toLowerCase() === name.toLowerCase()) lines.shift();
  return lines.join("\n").trim();
}

/** The named sections (all when `names` is empty) as markdown, in document order, plus the names not found. */
export function pickSections(markdown: string, names: string[]): { text: string; missing: string[]; available: string[] } {
  const sections = parseSections(markdown);
  const available = [...sections.keys()];
  const wanted = names.length ? available.filter((n) => names.some((w) => w.toLowerCase() === n.toLowerCase())) : available;
  const missing = names.filter((w) => !available.some((n) => n.toLowerCase() === w.toLowerCase()));
  const text = wanted.map((n) => `## ${n}\n\n${sections.get(n) ?? ""}`).join("\n\n");
  return { text, missing, available };
}
