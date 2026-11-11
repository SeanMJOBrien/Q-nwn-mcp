/**
 * Story-defect checks from docs/story-vs-pipeline.md (TODO #42-#44), run by verify_journal:
 *   journal_advance_on_enter   an area OnEnter script advances a quest stage that is not about arriving (finding 4)
 *   payoff_item_no_consumer    a journal entry names an item nothing asks for (finding 3)
 *   item_consumed_then_needed  one scene uses an item up, another needs it (finding 3)
 *   stance_change_group        a script converts one creature's faction while creatures that share its tag prefix keep theirs (finding 5)
 * All are warnings: they are heuristics over script text and dialog parameters, and a deliberate design can pass them.
 */

import type { FlatDialogNode } from "../../types/dialog.js";
import type { GffObj } from "../../types/gff.js";
import { getFieldLocStr, getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { flattenDialog } from "../dialog-walker.js";
import { getVarTableEntries } from "../git-helpers.js";
import { listOf } from "./common.js";

export interface StoryDefect {
  code: string;
  message: string;
  field?: string;
  fix?: string;
}

// Entry text that reads as arriving at, or looking at, the place: moving the journal on entry is right for it.
const ARRIVAL = /\b(reach(?:ed)?|arriv(?:ed|ing)?|enter(?:ed|ing)?|landfall|set foot|stepp?ed|made it to|found my way|stand(?:s|ing)?|sits?|lies|leads? on|waits?|holds|ahead|beyond)\b/i;

/** entry text by "<quest tag>#<id>" (lower case tag). */
function journalTexts(journal: GffObj): Map<string, string> {
  const out = new Map<string, string>();
  for (const cat of listOf(journal, "Categories")) {
    const tag = getFieldStr(cat, "Tag").toLowerCase();
    for (const e of listOf(cat, "EntryList")) out.set(`${tag}#${getFieldNum(e, "ID")}`, getFieldLocStr(e, "Text"));
  }
  return out;
}

export interface DialogUse {
  dialog: string;
  actionParams: Record<string, string>[];
  conditionParams: Record<string, string>[];
  scripts: string[];
}

export function dialogUses(index: ModuleIndex): DialogUse[] {
  const out: DialogUse[] = [];
  for (const [key, doc] of index.parsedGff) {
    if (!key.endsWith(".dlg")) continue;
    const use: DialogUse = { dialog: key.slice(0, -4), actionParams: [], conditionParams: [], scripts: [] };
    const walk = (n: FlatDialogNode): void => {
      if (n.script) use.scripts.push(n.script.toLowerCase());
      if (n.actionParams) use.actionParams.push(n.actionParams);
      if (n.conditionParams) use.conditionParams.push(n.conditionParams);
      for (const c of n.children) walk(c);
    };
    try {
      for (const root of flattenDialog(doc)) walk(root);
    } catch {
      continue;
    }
    out.push(use);
  }
  return out;
}

export function gitObjects(index: ModuleIndex): Array<{ area: string; list: string; obj: GffObj }> {
  const out: Array<{ area: string; list: string; obj: GffObj }> = [];
  for (const area of index.areas.keys()) {
    const git = index.parsedGff.get(`${area}.git`) as GffObj | undefined;
    if (!git) continue;
    for (const list of ["Creature List", "Placeable List", "TriggerList"]) for (const obj of listOf(git, list)) out.push({ area, list, obj });
  }
  return out;
}

// --- #43

function checkEnterAdvances(index: ModuleIndex, sources: Map<string, string>, journal: GffObj, out: StoryDefect[]): void {
  const texts = journalTexts(journal);
  const call = /AddJournalQuestEntry\s*\(\s*"([^"]+)"\s*,\s*(\d+)/g;
  for (const area of index.areas.keys()) {
    const are = index.parsedGff.get(`${area}.are`) as GffObj | undefined;
    const script = are ? getFieldStr(are, "OnEnter").toLowerCase() : "";
    const src = script ? sources.get(script) : undefined;
    if (!src || script === "q_onenter") continue; // q_onenter is the builder's explore wiring
    for (const m of src.matchAll(call)) {
      const text = texts.get(`${m[1].toLowerCase()}#${m[2]}`) ?? "";
      if (ARRIVAL.test(text)) continue;
      out.push({
        code: "journal_advance_on_enter",
        message: `Area "${area}" OnEnter script "${script}" advances quest "${m[1]}" to entry ${m[2]} the moment the party walks in, but that entry is not about arriving ("${text.slice(0, 60)}"). The journal then moves before the player has found anything`,
        field: "OnEnter",
        fix: "advance on the discovery itself (a dialog line, a clue check, a kill), or make it an explore stage with build_quest",
      });
    }
  }
}

// --- #42

const LITERAL = /"([^"\\]{2,48})"/g;

function checkPayoffs(index: ModuleIndex, sources: Map<string, string>, journal: GffObj, out: StoryDefect[]): void {
  const texts = journalTexts(journal);
  if (texts.size === 0) return;
  const uses = dialogUses(index);

  // Strings something asks for: dialog parameters (not give_item), script string literals (not CreateItemOnObject's resref), quest variables.
  const wanted = new Set<string>();
  for (const u of uses) {
    for (const p of [...u.actionParams, ...u.conditionParams]) for (const [k, v] of Object.entries(p)) if (k !== "give_item" && v) wanted.add(v.toLowerCase());
  }
  for (const src of sources.values()) {
    const stripped = src.replace(/CreateItemOnObject\s*\(\s*"[^"]*"/g, "");
    for (const m of stripped.matchAll(LITERAL)) wanted.add(m[1].toLowerCase());
  }
  const addVars = (obj: GffObj): void => {
    for (const e of getVarTableEntries(obj)) if (typeof e.value === "string" && e.value) wanted.add(e.value.toLowerCase());
  };
  for (const { obj } of gitObjects(index)) addVars(obj);
  for (const [key, entry] of index.resources) {
    if (!["utc", "utp", "utt", "uti"].includes(entry.extension)) continue;
    const doc = index.parsedGff.get(key) as GffObj | undefined;
    if (doc) addVars(doc);
  }

  const joined = [...texts.values()].join("\n").toLowerCase();
  for (const [key, entry] of index.resources) {
    if (entry.extension !== "uti") continue;
    const doc = index.parsedGff.get(key) as GffObj | undefined;
    if (!doc) continue;
    const name = getFieldLocStr(doc, "LocalizedName").trim();
    if (name.length < 5 || !joined.includes(name.toLowerCase())) continue;
    const tag = getFieldStr(doc, "Tag").toLowerCase();
    const resref = entry.resref.toLowerCase();
    if (wanted.has(tag) || wanted.has(resref)) continue;
    const where = [...texts].find(([, t]) => t.toLowerCase().includes(name.toLowerCase()))?.[0] ?? "";
    out.push({
      code: "payoff_item_no_consumer",
      message: `The journal names "${name}" (${where}), but no dialog line, script or quest variable asks for item "${tag || resref}". The player is told to use it and nothing happens when they do`,
      field: key,
      fix: "add the line that takes it (build_quest deliver stage or a dialog with take_item=), or stop naming it in the journal",
    });
  }

  checkConsumedThenNeeded(uses, sources, out);
}

function checkConsumedThenNeeded(uses: DialogUse[], sources: Map<string, string>, out: StoryDefect[]): void {
  const destroys = new Map<string, Set<string>>(); // item tag -> sources that use it up
  const needs = new Map<string, Set<string>>(); // item tag -> sources that need it present
  const add = (m: Map<string, Set<string>>, tag: string, src: string): void => {
    const t = tag.toLowerCase();
    if (!m.has(t)) m.set(t, new Set());
    m.get(t)?.add(src);
  };
  for (const [name, src] of sources) {
    for (const m of src.matchAll(/DestroyObject\s*\(\s*GetItemPossessedBy\s*\([^;]*?"([^"]+)"/g)) add(destroys, m[1], `script:${name}`);
    for (const m of src.matchAll(/GetItemPossessedBy\s*\([^;]*?"([^"]+)"/g)) add(needs, m[1], `script:${name}`);
  }
  for (const u of uses) {
    for (const p of u.actionParams) if (p.take_item) add(destroys, p.take_item, `dlg:${u.dialog}`);
    for (const p of u.conditionParams) if (p.item) add(needs, p.item, `dlg:${u.dialog}`);
  }
  for (const [tag, takers] of destroys) {
    const later = [...(needs.get(tag) ?? [])].filter((n) => ![...takers].includes(n));
    if (later.length === 0) continue;
    out.push({
      code: "item_consumed_then_needed",
      message: `Item "${tag}" is used up by ${[...takers].join(", ")} but ${later.join(", ")} still needs it. If the second scene comes after the first the player cannot do it`,
      fix: "keep the item (take it only in the last scene that needs it) or give the later scene another proof",
    });
  }
}

// --- #44

function checkStanceGroups(index: ModuleIndex, sources: Map<string, string>, out: StoryDefect[]): void {
  const objs = gitObjects(index).filter((o) => o.list === "Creature List");
  const dialogScripts = new Map<string, Set<string>>(); // script -> dialogs that run it
  for (const u of dialogUses(index)) for (const s of u.scripts) (dialogScripts.get(s) ?? dialogScripts.set(s, new Set()).get(s))?.add(u.dialog);

  for (const [name, src] of sources) {
    if (!/Change(?:To)?(?:Standard)?Faction\s*\(/.test(src)) continue;
    // A loop over a group (or a faction-wide call) converts the group: nothing to flag.
    if (/\b(?:while|for)\s*\([^)]*\)[\s\S]*Get(?:Next|First)ObjectInArea|GetNearestObjectByTag\s*\([^)]*,\s*\w+\s*\)|GetObjectByTag\s*\([^)]*,\s*\w+\s*\)|GetFirstFactionMember/.test(src)) continue;
    const tags = new Set<string>();
    for (const m of src.matchAll(/GetObjectByTag\s*\(\s*"([^"]+)"/g)) tags.add(m[1].toLowerCase());
    if (tags.size === 0) {
      // Converts OBJECT_SELF: the creature whose dialog runs this script, or whose death/spawn handler it is.
      const dlgs = dialogScripts.get(name.toLowerCase()) ?? new Set<string>();
      for (const { obj } of objs) {
        const conv = getFieldStr(obj, "Conversation").toLowerCase();
        const handler = ["ScriptDeath", "ScriptSpawn", "ScriptOnNotice", "ScriptDamaged", "ScriptAttacked"].some((f) => getFieldStr(obj, f).toLowerCase() === name.toLowerCase());
        if ((conv && dlgs.has(conv)) || handler) tags.add(getFieldStr(obj, "Tag").toLowerCase());
      }
    }
    for (const t of tags) {
      const self = objs.find((o) => getFieldStr(o.obj, "Tag").toLowerCase() === t);
      const prefix = t.replace(/\d+$/, "").split("_")[0];
      if (!self || prefix.length < 4) continue;
      const faction = getFieldNum(self.obj, "FactionID");
      const group = objs
        .filter((o) => o !== self && getFieldNum(o.obj, "FactionID") === faction)
        .map((o) => getFieldStr(o.obj, "Tag"))
        .filter((g) => g.toLowerCase().startsWith(prefix) && g.toLowerCase() !== t);
      if (group.length === 0) continue;
      out.push({
        code: "stance_change_group",
        message: `Script "${name}" changes the faction of "${t}" alone, but ${group.length} creature(s) share its tag prefix "${prefix}" and faction (${group.slice(0, 5).join(", ")}${group.length > 5 ? ", ..." : ""}) and keep the old stance. The story says the group stood down; the game shows only one`,
        fix: "convert the whole group in the script (loop over the tag or area) or give the group their own conversion step",
      });
    }
  }
}

export function findStoryDefects(index: ModuleIndex, sources: Map<string, string>, journal: GffObj): StoryDefect[] {
  const out: StoryDefect[] = [];
  checkEnterAdvances(index, sources, journal, out);
  checkPayoffs(index, sources, journal, out);
  checkStanceGroups(index, sources, out);
  return out;
}
