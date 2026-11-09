/**
 * [CL_LOOT] lines (one per forged creature, written by inc_cre_level at spawn) -> a `## Spawn Loot` section in adventure.md,
 * so /adventure-rewards can read what creatures will drop without running the live server itself.
 */

export interface SpawnLootItem {
  resref: string;
  slot: string;
  stack: number;
  gp: number;
}
export interface SpawnLoot {
  tag: string;
  resref: string;
  area: string;
  droppable: boolean;
  items: SpawnLootItem[];
}

/** Parses `[CL_LOOT] tag=… resref=… area=… droppable=… items=resref@slot[xstack]:gp,…` lines; others are ignored. */
export function parseLootLines(lines: string[]): SpawnLoot[] {
  const out = new Map<string, SpawnLoot>();
  for (const line of lines) {
    const at = line.indexOf("[CL_LOOT]");
    if (at < 0) continue;
    const m = /tag=(\S*)\s+resref=(\S*)\s+area=(\S*)\s+droppable=(\d+)\s+items=(.*)$/.exec(line.slice(at));
    if (!m) continue;
    const items: SpawnLootItem[] = [];
    for (const raw of m[5].split(",").map((s) => s.trim()).filter(Boolean)) {
      const im = /^([^@]+)@([^x:]+)(?:x(\d+))?:(\d+)$/.exec(raw);
      if (im) items.push({ resref: im[1], slot: im[2], stack: im[3] ? Number(im[3]) : 1, gp: Number(im[4]) });
    }
    out.set(`${m[1]}|${m[3]}`, { tag: m[1], resref: m[2], area: m[3], droppable: m[4] !== "0", items });
  }
  return [...out.values()];
}

export function renderSpawnLoot(loot: SpawnLoot[]): string {
  const rows = loot.map((c) => {
    const items = c.items.length
      ? c.items.map((i) => `${i.resref}${i.stack > 1 ? ` x${i.stack}` : ""} (${i.gp} gp, slot ${i.slot})`).join(", ")
      : "nothing bought";
    return `- ${c.tag} [${c.resref}] in ${c.area}${c.droppable ? "" : " (not droppable)"}: ${items}`;
  });
  return `## Spawn Loot\nRecorded from run_live_verification [CL_LOOT] lines. Do not duplicate these as placed rewards.\n\n${rows.join("\n")}\n`;
}

/** Replaces the `## Spawn Loot` section (to the next `## ` heading) or appends it. */
export function upsertSpawnLoot(markdown: string, loot: SpawnLoot[]): string {
  const section = renderSpawnLoot(loot);
  const lines = markdown.split("\n");
  const start = lines.findIndex((l) => /^##\s+Spawn Loot\s*$/.test(l));
  if (start < 0) return `${markdown.replace(/\n*$/, "\n")}\n${section}`;
  let end = lines.findIndex((l, i) => i > start && /^##\s+/.test(l));
  if (end < 0) end = lines.length;
  return [...lines.slice(0, start), ...section.trimEnd().split("\n"), "", ...lines.slice(end)].join("\n");
}
