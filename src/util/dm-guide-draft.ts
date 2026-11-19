/**
 * A DM guide drafted from the story file: what the person running the game needs, in play order, from the plot and the
 * sections the phases wrote (most of them drafted from the module itself). A small model asked to write the guide
 * produced nothing in four tries (Millers Daughter, 2026-11-19); `write_dm_guide(draft: true)` writes this instead,
 * and any text given is added as the DM's notes.
 */

import { parseSections } from "./phase-check.js";

const field = (block: string, name: string) => new RegExp(`\\*\\*${name}:\\*\\*\\s*(.+)`, "i").exec(block)?.[1]?.trim();

/** `### Name (\`resref\`)` blocks of a drafted section, by resref. */
function areaBlocks(section: string): Map<string, string> {
  const out = new Map<string, string>();
  const marks = [...section.matchAll(/^### .*\(`([a-z0-9_]+)`\)\s*$/gm)];
  marks.forEach((m, i) => {
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? section.length) : section.length;
    out.set(m[1], section.slice((m.index ?? 0) + m[0].length, end).trim());
  });
  return out;
}

/** `#### ` blocks of a plot sub-section: [heading, body]. */
function subBlocks(text: string, level: number): Array<[string, string]> {
  const re = new RegExp(`^${"#".repeat(level)} (.+)$`, "gm");
  const marks = [...text.matchAll(re)];
  return marks.map((m, i) => {
    const end = i + 1 < marks.length ? (marks[i + 1].index ?? text.length) : text.length;
    return [m[1].trim(), text.slice((m.index ?? 0) + m[0].length, end).trim()];
  });
}

export function draftDmGuide(story: string, title: string): string {
  const sections = parseSections(story);
  const module = sections.get("Module") ?? "";
  const plot = sections.get("Plot") ?? "";
  const plotSub = new Map(subBlocks(plot, 3).map(([h, b]) => [h.toLowerCase(), b]));
  const actors = areaBlocks(sections.get("Actors") ?? "");
  const fights = areaBlocks(sections.get("Challenges") ?? "");
  const env = areaBlocks(sections.get("Environment") ?? "");
  const out: string[] = [`# ${title}: DM guide`, "", "Spoilers: for the person running the game.", ""];

  out.push("## At a glance", "");
  for (const f of ["Target Level", "Party Size", "Estimated Duration", "Tone", "Difficulty"]) {
    const v = field(module, f);
    if (v) out.push(`- **${f}:** ${v}`);
  }
  out.push("");
  const premise = plotSub.get("premise");
  if (premise) out.push("## The story", "", premise, "");

  const people = subBlocks(plotSub.get("key npcs") ?? "", 4);
  const foes = (plotSub.get("antagonists") ?? "").split("\n").filter((l) => l.trim().startsWith("-"));
  if (people.length || foes.length) {
    out.push("## People", "");
    for (const [name, b] of people) {
      const bits = [field(b, "Role"), field(b, "Race, class, gender")].filter(Boolean).join(", ");
      out.push(`- **${name}** (${bits}${field(b, "Location") ? `, at ${field(b, "Location")}` : ""}). Wants: ${(field(b, "Motive") ?? "-").replace(/\.$/, "")}. Speaks: ${(field(b, "Voice") ?? "-").replace(/\.$/, "")}.`);
    }
    out.push(...foes, "");
  }

  const quests = subBlocks(plotSub.get("quest objectives") ?? "", 4);
  if (quests.length) {
    out.push("## Quests", "");
    for (const [name, b] of quests) out.push(`### ${name}`, "", b, "");
  }

  const locations = subBlocks(plotSub.get("locations") ?? "", 4);
  if (locations.length) {
    out.push("## Walkthrough, place by place", "");
    for (const [h, b] of locations) {
      const name = h.replace(/^\d+\.\s*/, "");
      const resref = field(b, "Resref") ?? "";
      out.push(`### ${name}${resref ? ` (\`${resref}\`)` : ""}`, "");
      if (field(b, "Beat")) out.push(field(b, "Beat") as string, "");
      const a = actors.get(resref);
      const f = fights.get(resref);
      const e = env.get(resref);
      if (a) out.push(a, "");
      if (f) out.push(f, "");
      const pins = e ? /\*\*Waypoints:\*\*\s*(.+)/.exec(e)?.[1] : undefined;
      const boxes = e ? /\*\*Containers:\*\*\s*(.+)/.exec(e)?.[1] : undefined;
      if (pins && pins !== "none") out.push(`- **Exits and map pins:** ${pins}`);
      if (boxes && boxes !== "none") out.push(`- **Containers:** ${boxes}`);
      out.push("");
    }
  }

  const shops = sections.get("Affordances");
  if (shops) out.push("## Shops and loot", "", shops.trim(), "");
  const economy = plotSub.get("loot & economy") ?? plotSub.get("loot economy");
  if (economy) out.push("## Rewards", "", economy.trim(), "");
  out.push("## Running it", "", "- The DM area (teleport to the DM_AREA waypoint) holds this guide and the full story as books in the DM chest.", "- Every creature of the module is in the Custom palette: spawn a replacement from there if one dies.", "");
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
