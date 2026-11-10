/**
 * adopt_module: writes adventure.md from what a hand-built (or half-built) module already contains, so the pipeline phases and
 * the review can work on it. Only sections the module has content for are written; a phase whose section is missing is a gap
 * the user can ask to fill. Everything adopted is marked as such and is meant to be corrected by the user.
 */

import type { AreaSnap, ModuleSnapshot } from "./module-snapshot.js";
import { parseSections, type Phase } from "./phase-check.js";

export const ADOPT_NOTE = "_Adopted from the built module; correct anything that is wrong. Items marked (not recorded) are for the user to fill in._";

export interface AdoptResult {
  markdown: string;
  /** Pipeline sections left out because the module has nothing for them. */
  gaps: Phase[];
  /** Fields adopted as placeholders. */
  notRecorded: string[];
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

function scale(a: AreaSnap): string {
  const tiles = a.width * a.height;
  return tiles <= 16 ? "small" : tiles <= 100 ? "medium" : "large";
}

export function targetLevel(snapshot: ModuleSnapshot): number {
  return median(snapshot.areas.flatMap((a) => a.creatures.filter((c) => c.hostile).map((c) => c.level)).filter((n) => n > 0));
}

/** `existing` is the current adventure.md (if any); scope lines in its `## Module` are kept. */
export function buildAdoptedAdventure(snapshot: ModuleSnapshot, existing: string | null): AdoptResult {
  const notRecorded: string[] = [];
  const gaps: Phase[] = [];
  const level = targetLevel(snapshot);
  const old = existing ? parseSections(existing).get("Module") ?? "" : "";
  const keepLines = old.split("\n").filter((l) => /^[-*]\s*\*\*(Scope|Skip phases):\*\*/i.test(l));

  const out: string[] = [`# Adventure: ${snapshot.title}`, "", ADOPT_NOTE, ""];

  out.push("## Module", `- **Title:** ${snapshot.title}`, `- **Filename:** ${snapshot.title}`);
  if (level > 0) out.push(`- **Target Level:** ${level} (median level of the hostile creatures)`);
  else {
    out.push("- **Target Level:** (not recorded)");
    notRecorded.push("Target Level");
  }
  out.push("- **Tone:** (not recorded)", "- **Estimated Duration:** (not recorded)", "- **Adopted:** yes", ...keepLines, "");
  notRecorded.push("Tone", "Estimated Duration");

  // Plot
  out.push("## Plot", "", "### Premise");
  if (snapshot.description.trim()) out.push(snapshot.description.trim());
  else {
    out.push("(not recorded) The module has no description. Ask the user what the story is, and keep their words.");
    notRecorded.push("Premise");
  }
  out.push("", "### Locations");
  snapshot.areas.forEach((a, i) => {
    const events = a.creatures.filter((c) => c.hostile).length + a.triggers;
    out.push(
      "",
      `#### ${i + 1}. ${a.name}`,
      `- **Resref:** ${a.resref}`,
      `- **Type:** ${a.isInterior ? "interior" : "exterior"}`,
      `- **Environment:** tileset ${a.tileset}`,
      `- **Scale:** ${scale(a)} (${a.width}x${a.height} tiles)`,
      `- **Events:** ${Math.max(1, events)}`,
      `- **Description:** ${a.placeables} props, ${a.sounds} sounds, ${a.creatures.length} creatures, ${a.doors} doors, ${a.triggers} triggers`,
      "- **Role in Story:** (not recorded)",
    );
  });
  if (snapshot.areas.length) notRecorded.push("Role in Story of each location");
  out.push("", "### Connections");
  const seen = new Set<string>();
  for (const a of snapshot.areas) {
    for (const to of a.transitionsTo) {
      const key = [a.resref, to].sort().join("<->");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`- ${a.resref} <-> ${to}`);
    }
  }
  if (seen.size === 0) out.push("- (none found)");

  const talkers = snapshot.areas.flatMap((a) => a.creatures.filter((c) => c.conversation && !c.hostile));
  out.push("", "### Key NPCs");
  if (talkers.length === 0) out.push("(none with a dialog)");
  for (const c of talkers) {
    out.push("", `#### ${c.name}`, `- **Location:** ${c.area}`, `- **Role:** (not recorded)`, `- **Motivation:** (not recorded)`, `- **Dialog:** ${c.conversation}`);
  }
  if (talkers.length) notRecorded.push("Role and Motivation of each key NPC");

  const hostile = snapshot.areas.flatMap((a) => a.creatures.filter((c) => c.hostile));
  out.push("", "### Antagonists");
  if (hostile.length === 0) out.push("(none placed)");
  else {
    const byArea = snapshot.areas.filter((a) => a.creatures.some((c) => c.hostile)).map((a) => `${a.resref} (${a.creatures.filter((c) => c.hostile).length})`);
    out.push(`- **Type:** ${hostile.length} hostile creatures`, "- **Motivation:** (not recorded)", `- **Lair/Territory:** ${byArea.join(", ")}`);
    notRecorded.push("Antagonist motivation");
  }

  out.push("", "### Quest Objectives");
  if (snapshot.quests.length === 0) out.push("(no journal quests)");
  for (const q of snapshot.quests) out.push(`- ${q.name} (${q.tag}): ${q.entries} journal entries${q.hasEnd ? "" : ", no end entry"}`);
  out.push("");

  // Areas
  if (snapshot.areas.length) {
    out.push("## Areas", "", ...snapshot.areas.map((a) => `- ${a.resref} (${a.name}): ${a.tileset}, ${a.width}x${a.height}${a.resref === snapshot.entryArea ? ", start" : ""}`), "");
  } else gaps.push("areas");

  // Environment
  const dressed = snapshot.areas.filter((a) => a.placeables + a.sounds + a.waypoints > 0);
  if (dressed.length) {
    out.push("## Environment", "", ...dressed.map((a) => `- ${a.resref}: ${a.placeables} placeables, ${a.sounds} sounds, ${a.waypoints} waypoints`), "");
  } else gaps.push("environment");

  // Actors
  const friendly = snapshot.areas.flatMap((a) => a.creatures.filter((c) => !c.hostile));
  if (friendly.length) {
    out.push("## Actors", "", ...friendly.map((c) => `- ${c.name} (${c.tag}) in ${c.area}${c.conversation ? `, dialog ${c.conversation}` : ""}`), "");
  } else gaps.push("actors");

  // Quests
  if (snapshot.quests.length) {
    out.push("## Quests", "", ...snapshot.quests.map((q) => `- ${q.name} (${q.tag}): ${q.entries} entries${q.hasEnd ? "" : " — no end entry"}`), "");
  } else gaps.push("quests");

  // Challenges
  if (hostile.length) {
    out.push("## Challenges", "", ...snapshot.areas.filter((a) => a.creatures.some((c) => c.hostile)).map((a) => `- ${a.resref}: ${a.creatures.filter((c) => c.hostile).map((c) => `${c.name} L${c.level}`).join(", ")}`), "");
  } else gaps.push("challenges");

  // Affordances
  const stores = snapshot.areas.reduce((n, a) => n + a.stores, 0);
  if (stores + snapshot.storeBlueprints + snapshot.itemBlueprints > 0) {
    out.push("## Affordances", "", `- ${stores} placed stores, ${snapshot.storeBlueprints} store blueprints, ${snapshot.itemBlueprints} item blueprints`, "");
  } else gaps.push("affordances");

  // Polish and rewards are the review's job; never adopted.
  gaps.push("polish", "rewards");

  return { markdown: `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`, gaps, notRecorded };
}

/** An adventure.md with only the heading and `## Module` counts as empty and may be adopted over without `overwrite`. */
export function hasStoryContent(markdown: string | null): boolean {
  if (!markdown) return false;
  const sections = parseSections(markdown);
  return [...sections.entries()].some(([name, body]) => name !== "Module" && body.length > 0);
}
