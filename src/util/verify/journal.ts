/**
 * .jrl journal checker, and the module/faction checkers.
 */

import type { GffObj } from "../../types/gff.js";
import { getFieldLocStr, getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { checkScriptRef, listOf, loadScriptSources, type Report } from "./common.js";

export async function verifyJournal(report: Report, index: ModuleIndex, doc: GffObj): Promise<void> {
  const categories = listOf(doc, "Categories");
  if (categories.length === 0) {
    report.warn("journal_empty", "Journal has no quest categories", "Categories");
    return;
  }

  // Collect every AddJournalQuestEntry(tag, id) pair the module's scripts make,
  // so we can check both directions: entries nothing can award, and awards
  // pointing at entries that don't exist.
  const scriptedAwards = collectScriptedJournalAwards(await loadScriptSources(index));

  for (const [i, category] of categories.entries()) {
    const tag = getFieldStr(category, "Tag");
    const name = getFieldLocStr(category, "Name");

    if (!tag) {
      report.error("quest_no_tag", `Categories.${i} has no Tag — scripts address quests by tag`, `Categories.${i}.Tag`);
      continue;
    }
    if (!name) {
      report.warn("quest_no_name", `Quest "${tag}" has no Name`, `Categories.${i}.Name`);
    }

    const entries = listOf(category, "EntryList");
    if (entries.length === 0) {
      report.error("quest_no_entries", `Quest "${tag}" has no entries`, `Categories.${i}.EntryList`);
      continue;
    }

    // Duplicate IDs — the engine resolves by ID, so duplicates are ambiguous.
    const seen = new Map<number, number>();
    let hasEnd = false;
    for (const [j, entry] of entries.entries()) {
      const id = getFieldNum(entry, "ID");
      if (seen.has(id)) {
        report.error(
          "quest_duplicate_entry_id",
          `Quest "${tag}" has two entries with ID ${id} (indices ${seen.get(id)} and ${j})`,
          `Categories.${i}.EntryList.${j}.ID`,
        );
      }
      seen.set(id, j);

      if (getFieldNum(entry, "End") === 1) hasEnd = true;
      if (!getFieldLocStr(entry, "Text")) {
        report.warn(
          "quest_entry_no_text",
          `Quest "${tag}" entry ${id} has no text`,
          `Categories.${i}.EntryList.${j}.Text`,
        );
      }
    }

    if (!hasEnd) {
      report.error(
        "quest_no_end_entry",
        `Quest "${tag}" has no entry flagged End=1 — the quest can never be completed and will sit in the player's journal forever`,
        `Categories.${i}.EntryList`,
        "edit_journal_entry to set end:true on the final entry",
      );
    }

    // Cross-check against what the scripts actually award.
    const awarded = scriptedAwards.get(tag.toLowerCase());
    if (!awarded || awarded.size === 0) {
      report.error(
        "quest_never_awarded",
        `Quest "${tag}" is never awarded — no script calls AddJournalQuestEntry("${tag}", ...), so the player can never receive it`,
        `Categories.${i}.Tag`,
        "add an AddJournalQuestEntry call in the quest-giver dialog's action script",
      );
    } else {
      for (const id of seen.keys()) {
        if (!awarded.has(id)) {
          report.warn(
            "quest_entry_unreachable",
            `Quest "${tag}" entry ${id} is defined but no script awards it`,
            `Categories.${i}.EntryList`,
          );
        }
      }
      for (const id of awarded) {
        if (!seen.has(id)) {
          report.error(
            "quest_award_missing_entry",
            `A script awards "${tag}" entry ${id} but the journal has no such entry — the player gets a blank journal update`,
            `Categories.${i}.EntryList`,
            "add_journal_entry to create it",
          );
        }
      }
    }
  }
}

/** tag → set of entry IDs awarded by AddJournalQuestEntry calls across all .nss. */
function collectScriptedJournalAwards(sources: Map<string, string>): Map<string, Set<number>> {
  const awards = new Map<string, Set<number>>();
  const pattern = /AddJournalQuestEntry\s*\(\s*"([^"]+)"\s*,\s*(\d+)/g;

  for (const source of sources.values()) {
    for (const match of source.matchAll(pattern)) {
      const tag = match[1].toLowerCase();
      const id = Number(match[2]);
      if (!awards.has(tag)) awards.set(tag, new Set());
      awards.get(tag)!.add(id);
    }
  }
  return awards;
}

// ─── Module (.ifo) ────────────────────────────────────────────────────────

/** Module event script fields on the IFO. */
const MODULE_SCRIPT_FIELDS = [
  "Mod_OnAcquirItem",
  "Mod_OnActvtItem",
  "Mod_OnClientEntr",
  "Mod_OnClientLeav",
  "Mod_OnCutsnAbort",
  "Mod_OnHeartbeat",
  "Mod_OnModLoad",
  "Mod_OnModStart",
  "Mod_OnPlrDeath",
  "Mod_OnPlrDying",
  "Mod_OnPlrEqItm",
  "Mod_OnPlrLvlUp",
  "Mod_OnPlrRest",
  "Mod_OnPlrUnEqItm",
  "Mod_OnSpawnBtnDn",
  "Mod_OnUnAqreItem",
  "Mod_OnUsrDefined",
];

const TILE_SIZE = 10.0;

export function verifyModuleInfo(report: Report, index: ModuleIndex, doc: GffObj): void {
  // ─── Entry point ────────────────────────────────────────────────────────
  const entryArea = getFieldStr(doc, "Mod_Entry_Area");
  if (!entryArea) {
    report.error("no_entry_area", "Module has no Mod_Entry_Area — players have nowhere to spawn", "Mod_Entry_Area");
  } else if (!index.areas.has(entryArea)) {
    report.error(
      "entry_area_missing",
      `Mod_Entry_Area is "${entryArea}" but no such area exists in the module`,
      "Mod_Entry_Area",
    );
  } else {
    const areDoc = index.parsedGff.get(`${entryArea}.are`) as GffObj | undefined;
    if (areDoc) {
      const x = getFieldNum(doc, "Mod_Entry_X");
      const y = getFieldNum(doc, "Mod_Entry_Y");
      const maxX = getFieldNum(areDoc, "Width") * TILE_SIZE;
      const maxY = getFieldNum(areDoc, "Height") * TILE_SIZE;
      if (x < 0 || y < 0 || x > maxX || y > maxY) {
        report.error(
          "entry_position_out_of_bounds",
          `Module entry position (${x}, ${y}) is outside area "${entryArea}" (${maxX}x${maxY}m) — players will spawn out of the world`,
          "Mod_Entry_X/Y",
        );
      }
    }
  }

  // ─── Area list vs actual resources ──────────────────────────────────────
  const listed = new Set(listOf(doc, "Mod_Area_list").map((a) => getFieldStr(a, "Area_Name").toLowerCase()));
  for (const areaResref of index.areas.keys()) {
    if (!listed.has(areaResref.toLowerCase())) {
      report.error(
        "area_not_in_module_list",
        `Area "${areaResref}" exists but is not in Mod_Area_list — the module will not load it`,
        "Mod_Area_list",
      );
    }
  }
  for (const name of listed) {
    if (!index.areas.has(name)) {
      report.error(
        "module_list_missing_area",
        `Mod_Area_list names "${name}" but no such .are exists — the module will fail to load`,
        "Mod_Area_list",
      );
    }
  }

  // ─── Module scripts ─────────────────────────────────────────────────────
  for (const field of MODULE_SCRIPT_FIELDS) {
    checkScriptRef(report, index, getFieldStr(doc, field), field);
  }
}

// ─── Faction (.fac) ───────────────────────────────────────────────────────

export function verifyFaction(report: Report, _index: ModuleIndex, doc: GffObj): void {
  const factions = listOf(doc, "FactionList");
  if (factions.length === 0) {
    report.error("no_factions", "Faction file has an empty FactionList", "FactionList");
    return;
  }

  for (const [i, rep] of listOf(doc, "RepList").entries()) {
    const id1 = getFieldNum(rep, "FactionID1");
    const id2 = getFieldNum(rep, "FactionID2");
    const value = getFieldNum(rep, "FactionRep");

    if (id1 >= factions.length || id1 < 0) {
      report.error(
        "invalid_faction_ref",
        `RepList.${i}.FactionID1 is ${id1} but only ${factions.length} factions exist`,
        `RepList.${i}.FactionID1`,
      );
    }
    if (id2 >= factions.length || id2 < 0) {
      report.error(
        "invalid_faction_ref",
        `RepList.${i}.FactionID2 is ${id2} but only ${factions.length} factions exist`,
        `RepList.${i}.FactionID2`,
      );
    }
    if (value < 0 || value > 100) {
      report.error(
        "invalid_reputation",
        `RepList.${i}.FactionRep is ${value} — reputation must be 0-100`,
        `RepList.${i}.FactionRep`,
      );
    }
  }
}
