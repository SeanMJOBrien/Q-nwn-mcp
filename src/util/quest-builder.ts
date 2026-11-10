/**
 * build_quest / remove_quest: turns a normalised QuestSpec into journal, dialog, variables and event wiring on the
 * loaded module, using the runtime from quest-script.ts. Every object touched is marked so a rebuild replaces only
 * what this quest made: dialog nodes carry the comment "mcpq:<tag>:...", variables are the questK slots whose value
 * names the tag, created triggers are tagged "<tag>_t<n>".
 */

import fs from "fs/promises";
import path from "path";
import { jsonToGff, type ResmanOptions } from "../nim-tools.js";
import {
  buildDialogDocument,
  makeEntry,
  makeLink,
  makeReply,
  type ScriptParams,
  writeDialogDocument,
} from "../tools/dialog-write-tools.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { getFieldList, getFieldLocStr, getFieldNum, getFieldStr, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";
import { findSimpleWalkableSpots, placeCreatureCore } from "./creature-placer.js";
import {
  getGitDoc,
  getVarTableEntries,
  mergeVarTable,
  removeVarTableEntry,
  resolveBlueprint,
  writeBackGit,
} from "./git-helpers.js";
import { applyDefaultItemModels } from "./item-models.js";
import {
  ACQUIRE_WRAPPER,
  generateAcquireWrapper,
  generateHeartbeatWrapper,
  HEARTBEAT_WRAPPER,
} from "./quest-script.js";
import { checkDc, type QuestSpec, type Stage } from "./quest-spec.js";
import { writeAndCompileScript } from "./script-writer.js";
import { rectTriggerGeometry } from "./trigger-geometry.js";
import { checkPlacementWalkable } from "./walkmesh.js";

const MAX_SLOTS = 20;
const GIT_STRUCT_TRIGGER = 1;
const GIT_STRUCT_WAYPOINT = 5;

export class QuestBuildError extends Error {}

/** One stored copy of an object: a blueprint file or a placed instance in an area's GIT. */
interface Copy {
  obj: GffObj;
  /** "bp:<key>" or "git:<area>". */
  where: string;
}

interface Participant {
  label: string;
  kind: "creature" | "placeable" | "trigger" | "area" | "item";
  copies: Copy[];
  /** Stage -> slot on this object. */
  slots: Map<Stage, number>;
}

export interface QuestBuildReport {
  tag: string;
  name: string;
  dryRun: boolean;
  stages: Array<{
    n: number;
    do: string;
    by: string;
    slot?: number;
    journal: string;
    end: boolean | "fail";
    reward?: unknown;
  }>;
  dialogs: Array<{ npc: string; dialog: string; created: boolean; lines: string[] }>;
  objects: string[];
  placed: string[];
  warnings: string[];
  notes: string[];
  adventureMd: string;
}

const COMMENT = (tag: string) => `mcpq:${tag}:`;
const HUB_LEAVE = "mcpq:_hub:leave";

// --- small helpers

function slotValue(n: number, tag: string): string {
  return `${n}_${tag}`;
}

function slotTag(value: string): string {
  const i = value.indexOf("_");
  return i < 1 ? "" : value.slice(i + 1);
}

function questVarsFor(obj: GffObj, tag: string): string[] {
  const names: string[] = [];
  const entries = getVarTableEntries(obj);
  for (const e of entries) {
    const m = /^quest(\d{1,2})$/.exec(e.name);
    if (m && typeof e.value === "string" && slotTag(e.value) === tag) {
      names.push(e.name);
      for (const f of entries) if (f.name.toLowerCase().startsWith(`${e.name.toLowerCase()}_`)) names.push(f.name);
    }
  }
  return names;
}

function usedSlots(copies: Copy[]): Set<number> {
  const used = new Set<number>();
  for (const c of copies) {
    for (const e of getVarTableEntries(c.obj)) {
      const m = /^quest(\d{1,2})$/.exec(e.name);
      if (m && e.value !== "") used.add(Number(m[1]));
    }
  }
  return used;
}

/** Removes every dialog node carrying `prefix` in its Comment, and every link to one; reindexes the rest. */
export function removeTaggedNodes(dlg: GffObj, prefix: string): number {
  const entries = getFieldList(dlg, "EntryList");
  const replies = getFieldList(dlg, "ReplyList");
  const keepE = entries.map((e) => !getFieldStr(e, "Comment").startsWith(prefix));
  const keepR = replies.map((r) => !getFieldStr(r, "Comment").startsWith(prefix));
  const removed = keepE.filter((k) => !k).length + keepR.filter((k) => !k).length;
  if (removed === 0) return 0;
  const mapE = new Map<number, number>();
  const mapR = new Map<number, number>();
  let i = 0;
  keepE.forEach((k, idx) => {
    if (k) mapE.set(idx, i++);
  });
  i = 0;
  keepR.forEach((k, idx) => {
    if (k) mapR.set(idx, i++);
  });
  const fix = (links: GffObj[], map: Map<number, number>) =>
    links
      .filter((l) => map.has(getFieldNum(l, "Index")))
      .map((l) => {
        setField(l, "Index", "dword", map.get(getFieldNum(l, "Index")) as number);
        return l;
      });
  const newE = entries.filter((_, idx) => keepE[idx]);
  const newR = replies.filter((_, idx) => keepR[idx]);
  for (const e of newE) (e.RepliesList as { value: GffObj[] }).value = fix(getFieldList(e, "RepliesList"), mapR);
  for (const r of newR) (r.EntriesList as { value: GffObj[] }).value = fix(getFieldList(r, "EntriesList"), mapE);
  (dlg.EntryList as { value: GffObj[] }).value = newE;
  (dlg.ReplyList as { value: GffObj[] }).value = newR;
  (dlg.StartingList as { value: GffObj[] }).value = fix(getFieldList(dlg, "StartingList"), mapE);
  return removed;
}

// --- the builder

export class QuestBuilder {
  private readonly dirtyBp = new Map<string, GffDocument>();
  private readonly dirtyGit = new Set<string>();
  private readonly participants = new Map<string, Participant>();
  private readonly report: QuestBuildReport;
  private readonly newDialogs = new Map<string, GffDocument>();
  private readonly newItems = new Map<string, GffDocument>();
  private needAcquire = false;

  constructor(
    private readonly index: ModuleIndex,
    private readonly resman: ResmanOptions,
    private readonly spec: QuestSpec,
    private readonly dryRun: boolean,
  ) {
    this.report = {
      tag: spec.tag,
      name: spec.name,
      dryRun,
      stages: [],
      dialogs: [],
      objects: [],
      placed: [],
      warnings: [],
      notes: [...spec.notes],
      adventureMd: "",
    };
  }

  // In a dry run every document is a deep copy, so nothing in the index changes.
  private readonly clones = new Map<string, GffDocument>();
  private doc(key: string): GffDocument | undefined {
    const real = this.index.parsedGff.get(key);
    if (!real) return undefined;
    if (!this.dryRun) return real;
    let c = this.clones.get(key);
    if (!c) {
      c = structuredClone(real);
      this.clones.set(key, c);
    }
    return c;
  }

  private git(area: string): GffObj {
    const doc = this.doc(`${area.toLowerCase()}.git`);
    if (!doc) throw new QuestBuildError(`area ${area} has no GIT`);
    return doc as GffObj;
  }

  private markBp(key: string, doc: GffDocument): void {
    this.dirtyBp.set(key, doc);
  }

  private markGit(area: string): void {
    this.dirtyGit.add(area.toLowerCase());
  }

  private areas(): string[] {
    return [...this.index.areas.keys()];
  }

  // --- finding objects

  /** A creature by tag or blueprint resref: its module blueprint (if any) and every placed copy. */
  private creature(ref: string): Participant | undefined {
    const key = `creature:${ref.toLowerCase()}`;
    const known = this.participants.get(key);
    if (known) return known;
    const copies: Copy[] = [];
    const bpKey = `${ref.toLowerCase()}.utc`;
    const bp = this.doc(bpKey);
    let resref = bp ? ref.toLowerCase() : "";
    for (const area of this.areas()) {
      let list: GffObj[];
      try {
        list = getFieldList(this.git(area), "Creature List");
      } catch {
        continue;
      }
      for (const c of list) {
        const tagMatch = getFieldStr(c, "Tag").toLowerCase() === ref.toLowerCase();
        const resMatch = getFieldStr(c, "TemplateResRef").toLowerCase() === ref.toLowerCase();
        if (tagMatch || resMatch) {
          copies.push({ obj: c, where: `git:${area}` });
          if (!resref) resref = getFieldStr(c, "TemplateResRef").toLowerCase();
        }
      }
    }
    const bp2 = bp ?? (resref ? this.doc(`${resref}.utc`) : undefined);
    if (bp2) copies.unshift({ obj: bp2 as GffObj, where: `bp:${resref}.utc` });
    if (copies.length === 0) return undefined;
    const p: Participant = { label: ref, kind: "creature", copies, slots: new Map() };
    this.participants.set(key, p);
    return p;
  }

  private placed(ref: string, list: string, kind: Participant["kind"]): Participant | undefined {
    const key = `${kind}:${ref.toLowerCase()}`;
    const known = this.participants.get(key);
    if (known) return known;
    const copies: Copy[] = [];
    for (const area of this.areas()) {
      let objs: GffObj[];
      try {
        objs = getFieldList(this.git(area), list);
      } catch {
        continue;
      }
      for (const o of objs)
        if (getFieldStr(o, "Tag").toLowerCase() === ref.toLowerCase()) copies.push({ obj: o, where: `git:${area}` });
    }
    if (copies.length === 0) return undefined;
    const p: Participant = { label: ref, kind, copies, slots: new Map() };
    this.participants.set(key, p);
    return p;
  }

  private area(resref: string): Participant {
    const key = `area:${resref.toLowerCase()}`;
    const known = this.participants.get(key);
    if (known) return known;
    const are = this.doc(`${resref.toLowerCase()}.are`);
    if (!are) throw new QuestBuildError(`area ${resref} not found`);
    const p: Participant = {
      label: resref,
      kind: "area",
      copies: [{ obj: are as GffObj, where: `bp:${resref.toLowerCase()}.are` }],
      slots: new Map(),
    };
    this.participants.set(key, p);
    return p;
  }

  /** The quest item: a module blueprint (existing, or a clone of a base-game item, or a new misc item). */
  private async item(s: Stage): Promise<Participant> {
    const wantRes = (s.item ?? `${this.spec.tag.slice(0, 11)}_i${s.n}`).toLowerCase().slice(0, 16);
    const key = `item:${wantRes}`;
    const known = this.participants.get(key);
    if (known) return known;
    const inModule = this.doc(`${wantRes}.uti`);
    if (inModule) {
      s.item = wantRes;
      const p: Participant = {
        label: wantRes,
        kind: "item",
        copies: [{ obj: inModule as GffObj, where: `bp:${wantRes}.uti` }],
        slots: new Map(),
      };
      this.participants.set(key, p);
      return p;
    }
    let resref = wantRes;
    let doc = this.newItems.get(resref);
    if (!doc) {
      const base = s.itemName ? undefined : await resolveBlueprint(this.index, wantRes, "uti", this.resman);
      if (base) {
        // Never write quest variables onto a shared base-game item: copy it under its own resref.
        resref = `${this.spec.tag.slice(0, 11)}_i${s.n}`;
        doc = structuredClone(base) as GffDocument;
        this.report.notes.push(`item ${wantRes} copied as ${resref} so quest variables don't touch every ${wantRes}`);
      } else if (s.itemName) {
        doc = {
          __data_type: "UTI ",
          AddCost: { type: "dword", value: 0 },
          BaseItem: { type: "int", value: 24 },
          Charges: { type: "byte", value: 0 },
          Cost: { type: "dword", value: 0 },
          Cursed: { type: "byte", value: 0 },
          Description: { type: "cexolocstring", value: {} },
          DescIdentified: { type: "cexolocstring", value: {} },
          Identified: { type: "byte", value: 1 },
          LocalizedName: { type: "cexolocstring", value: { "0": s.itemName } },
          ModelPart1: { type: "byte", value: 1 },
          Plot: { type: "byte", value: 1 },
          PropertiesList: { type: "list", value: [] },
          StackSize: { type: "word", value: 1 },
          Stolen: { type: "byte", value: 0 },
          Tag: { type: "cexostring", value: resref },
          TemplateResRef: { type: "resref", value: resref },
        } as unknown as GffDocument;
        applyDefaultItemModels(doc as GffObj, this.index);
      } else {
        throw new QuestBuildError(`stage ${s.n}: item ${wantRes} not found (give itemName to create a new quest item)`);
      }
      const o = doc as GffObj;
      setField(o, "TemplateResRef", "resref", resref);
      setField(o, "Tag", "cexostring", resref);
      if (s.itemName) o.LocalizedName = { type: "cexolocstring", value: { "0": s.itemName } };
      this.newItems.set(resref, doc);
    }
    s.item = resref;
    const p: Participant = {
      label: resref,
      kind: "item",
      copies: [{ obj: doc as GffObj, where: `item:${resref}` }],
      slots: new Map(),
    };
    this.participants.set(key, p);
    this.participants.set(`item:${resref}`, p);
    return p;
  }

  // --- slots and variables

  private assignSlot(p: Participant, s: Stage): number {
    const known = p.slots.get(s);
    if (known) return known;
    const used = usedSlots(p.copies);
    for (const k of p.slots.values()) used.add(k);
    for (let k = 1; k <= MAX_SLOTS; k++) {
      if (!used.has(k)) {
        p.slots.set(s, k);
        return k;
      }
    }
    throw new QuestBuildError(`${p.label}: all ${MAX_SLOTS} quest slots are in use`);
  }

  private setVars(
    p: Participant,
    vars: Array<{ name: string; type: "int" | "string" | "float"; value: number | string }>,
  ): void {
    for (const c of p.copies) {
      mergeVarTable(c.obj, vars);
      this.touch(c);
    }
  }

  private touch(c: Copy): void {
    if (c.where.startsWith("bp:")) this.markBp(c.where.slice(3), c.obj as GffDocument);
    else if (c.where.startsWith("git:")) this.markGit(c.where.slice(4));
  }

  /** questK and its companions for stage s on participant p. */
  private writeStageVars(p: Participant, s: Stage, slot: number): void {
    const base = `quest${slot}`;
    const tag = this.spec.tag;
    const vars: Array<{ name: string; type: "int" | "string" | "float"; value: number | string }> = [
      { name: base, type: "string", value: slotValue(s.n, tag) },
    ];
    if (s.from !== s.n - 1) {
      vars.push({ name: `${base}_jumpstage`, type: "int", value: 1 });
      if (s.from > 0) vars.push({ name: `${base}_prereq1`, type: "string", value: slotValue(s.from, tag) });
    }
    const r = s.reward;
    if (r?.xp_tier) {
      vars.push({ name: `${base}_reward_xp_tier`, type: "int", value: r.xp_tier });
      vars.push({ name: `${base}_reward_xp_level`, type: "int", value: r.xp_level ?? this.spec.level });
    }
    if (r?.xp) vars.push({ name: `${base}_reward_xp`, type: "int", value: r.xp });
    if (r?.gold) vars.push({ name: `${base}_reward_gold`, type: "int", value: r.gold });
    if (r?.item) vars.push({ name: `${base}_reward_item`, type: "string", value: r.item });
    if (this.spec.bounty && s.end === true) vars.push({ name: `${base}_bounty_end`, type: "int", value: 1 });
    if (s.script) vars.push({ name: `${base}_self_script`, type: "string", value: s.script });
    this.setVars(p, vars);
  }

  private setEvent(p: Participant, slot: number, scriptField: string, script: string, origVar: string): void {
    for (const c of p.copies) {
      const existing = getVarTableEntries(c.obj).find((e) => e.name.toLowerCase() === "quest_event");
      if (existing && Number(existing.value) !== slot && Number(existing.value) > 0) {
        const other = getVarTableEntries(c.obj).find((e) => e.name.toLowerCase() === `quest${existing.value}`);
        if (other && slotTag(String(other.value)) !== this.spec.tag) {
          throw new QuestBuildError(
            `${p.label} already advances ${other.value} when ${script.replace("q_", "")} fires; an object can carry one event stage`,
          );
        }
      }
      mergeVarTable(c.obj, [{ name: "quest_event", type: "int", value: slot }]);
      const orig = getFieldStr(c.obj, scriptField);
      if (orig !== script) {
        if (orig) mergeVarTable(c.obj, [{ name: origVar, type: "string", value: orig }]);
        setField(c.obj, scriptField, "resref", script);
      }
      this.touch(c);
    }
  }

  // --- removing an earlier build of this quest

  stripPrevious(): number {
    const tag = this.spec.tag;
    let removed = 0;
    const strip = (obj: GffObj, touch: () => void) => {
      const names = questVarsFor(obj, tag);
      if (names.length === 0) return;
      const slots = names.filter((n) => /^quest\d{1,2}$/.test(n)).map((n) => Number(n.slice(5)));
      for (const n of names) removeVarTableEntry(obj, n);
      const ev = getVarTableEntries(obj).find((e) => e.name.toLowerCase() === "quest_event");
      if (ev && slots.includes(Number(ev.value))) removeVarTableEntry(obj, "quest_event");
      removed += names.length;
      touch();
    };
    for (const [key, entry] of this.index.resources) {
      if (!["utc", "uti", "utp", "are", "utt"].includes(entry.extension)) continue;
      const doc = this.doc(key);
      if (doc) strip(doc as GffObj, () => this.markBp(key, doc));
    }
    for (const area of this.areas()) {
      let git: GffObj;
      try {
        git = this.git(area);
      } catch {
        continue;
      }
      for (const list of ["Creature List", "Placeable List", "TriggerList"]) {
        let objs: GffObj[];
        try {
          objs = getFieldList(git, list);
        } catch {
          continue;
        }
        for (const o of objs) strip(o, () => this.markGit(area));
        if (list === "TriggerList") {
          const before = objs.length;
          const kept = objs.filter((o) => !getFieldStr(o, "Tag").startsWith(`${tag}_t`));
          if (kept.length !== before) {
            (git.TriggerList as { value: GffObj[] }).value = kept;
            this.markGit(area);
          }
        }
      }
    }
    // Dialog nodes and the journal category.
    for (const [key, entry] of this.index.resources) {
      if (entry.extension !== "dlg") continue;
      const doc = this.doc(key);
      if (doc && removeTaggedNodes(doc as GffObj, COMMENT(tag)) > 0) this.markBp(key, doc);
    }
    const jrl = this.journalDoc(false);
    if (jrl) {
      const cats = getFieldList(jrl.doc as GffObj, "Categories");
      const kept = cats.filter((c) => getFieldStr(c, "Tag") !== tag);
      if (kept.length !== cats.length) {
        ((jrl.doc as GffObj).Categories as { value: GffObj[] }).value = kept;
        this.markBp(jrl.key, jrl.doc);
      }
    }
    return removed;
  }

  // --- journal

  private journalDoc(create: boolean): { key: string; doc: GffDocument } | undefined {
    for (const [key, entry] of this.index.resources)
      if (entry.extension === "jrl") return { key, doc: this.doc(key) as GffDocument };
    if (!create) return undefined;
    const doc = { __data_type: "JRL ", Categories: { type: "list", value: [] } } as unknown as GffDocument;
    this.newJournal = doc;
    return { key: "module.jrl", doc };
  }
  private newJournal: GffDocument | undefined;

  private writeJournal(): void {
    const jrl = this.journalDoc(true);
    if (!jrl) return;
    const cats = getFieldList(jrl.doc as GffObj, "Categories");
    const byN = new Map<number, Stage>();
    for (const s of this.spec.stages) if (!s.optional && (!byN.has(s.n) || s.end)) byN.set(s.n, s);
    const entries = [...byN.values()]
      .sort((a, b) => a.n - b.n)
      .map((s, i) => ({
        __struct_id: i,
        End: { type: "word", value: s.end ? 1 : 0 },
        ID: { type: "dword", value: s.n },
        Text: { type: "cexolocstring", value: { "0": s.journal } },
      }));
    // Alternative stages sharing a number share one journal entry: the first one's text.
    cats.push({
      __struct_id: cats.length,
      Comment: { type: "cexostring", value: `${COMMENT(this.spec.tag)}build_quest` },
      EntryList: { type: "list", value: entries },
      Name: { type: "cexolocstring", value: { "0": this.spec.name } },
      Picture: { type: "word", value: 65535 },
      Priority: { type: "dword", value: this.spec.priority },
      Tag: { type: "cexostring", value: this.spec.tag },
      XP: { type: "dword", value: 0 },
    } as unknown as GffObj);
    if (!this.newJournal) this.markBp(jrl.key, jrl.doc);
  }

  // --- dialog

  private dialogs = new Map<
    string,
    {
      dlg: GffObj;
      resref: string;
      created: boolean;
      npc: Participant;
      roots: Array<{ entry: number; cond: string; params?: ScriptParams; rank: number }>;
      /** Entries that end the conversation on purpose (a fight starts, the NPC walks off). */
      ends: Set<number>;
      /** Hub subjects of this quest: reply text target entry and the condition that makes it show. */
      subjects: Array<{ entry: number; key: string }>;
    }
  >();

  private dialogFor(npc: Participant): NonNullable<ReturnType<QuestBuilder["dialogs"]["get"]>> {
    const known = this.dialogs.get(npc.label);
    if (known) return known;
    let resref = "";
    for (const c of npc.copies) resref ||= getFieldStr(c.obj, "Conversation").toLowerCase();
    let dlg: GffObj | undefined;
    let created = false;
    if (resref)
      dlg = (this.doc(`${resref}.dlg`) as GffObj | undefined) ?? (this.newDialogs.get(resref) as GffObj | undefined);
    if (!dlg) {
      const base = (getFieldStr(npc.copies[0].obj, "TemplateResRef") || npc.label).toLowerCase();
      resref = resref || `dq_${base}`.slice(0, 16);
      dlg = buildDialogDocument([{ speaker: "npc", text: "Greetings." }]) as unknown as GffObj;
      // The greeting is this quest's too only if the quest created the dialog; keep it unmarked so it survives.
      this.newDialogs.set(resref, dlg as GffDocument);
      created = true;
      for (const c of npc.copies) {
        setField(c.obj, "Conversation", "resref", resref);
        this.touch(c);
      }
    }
    const d = {
      dlg,
      resref,
      created,
      npc,
      roots: [] as Array<{ entry: number; cond: string; params?: ScriptParams; rank: number }>,
      ends: new Set<number>(),
      subjects: [] as Array<{ entry: number; key: string }>,
    };
    this.dialogs.set(npc.label, d);
    return d;
  }

  /** Spawn parameters of the stage being wired; merged into its advancing q_act lines (the ones carrying `target`). */
  private spawnParams: ScriptParams | undefined;

  private entry(d: { dlg: GffObj }, text: string, comment: string, script?: string, params?: ScriptParams): number {
    if (script === "q_act" && params?.target !== undefined && this.spawnParams) params = { ...params, ...this.spawnParams };
    const e = makeEntry(text, script, { params });
    setField(e, "Comment", "cexostring", comment);
    const list = getFieldList(d.dlg, "EntryList");
    e.__struct_id = list.length;
    list.push(e);
    return list.length - 1;
  }

  private reply(d: { dlg: GffObj }, text: string, comment: string, script?: string, params?: ScriptParams): number {
    const r = makeReply(text, script, { params });
    setField(r, "Comment", "cexostring", comment);
    const list = getFieldList(d.dlg, "ReplyList");
    r.__struct_id = list.length;
    list.push(r);
    return list.length - 1;
  }

  private linkER(d: { dlg: GffObj }, e: number, r: number, cond?: string, params?: ScriptParams): void {
    const links = getFieldList(getFieldList(d.dlg, "EntryList")[e], "RepliesList");
    const l = makeLink(r, cond, params);
    l.__struct_id = links.length;
    links.push(l);
  }

  private linkRE(d: { dlg: GffObj }, r: number, e: number, cond?: string, params?: ScriptParams): void {
    const links = getFieldList(getFieldList(d.dlg, "ReplyList")[r], "EntriesList");
    const l = makeLink(e, cond, params);
    l.__struct_id = links.length;
    links.push(l);
  }

  private leave(d: { dlg: GffObj }, e: number, c: string): void {
    this.linkER(d, e, this.reply(d, "[Leave]", c));
  }

  /** Root ranks: escort-active 0, advance 1 (later stages first), reminder 2, offer 3. */
  private root(
    d: NonNullable<ReturnType<QuestBuilder["dialogs"]["get"]>>,
    entry: number,
    rank: number,
    params: ScriptParams,
  ): void {
    d.roots.push({ entry, cond: "q_chk", params, rank });
  }

  private stageDialog(npc: Participant, s: Stage, slot: number): void {
    const d = this.dialogFor(npc);
    const c = `${COMMENT(this.spec.tag)}s${s.n}:`;
    const target = String(slot);
    const thanks = s.text ?? "Thank you.";
    if (s.n === 1) {
      const offer = this.entry(d, s.offer ?? "I could use some help.", `${c}offer`);
      const yes = this.reply(d, s.acceptReply ?? "I'll help.", `${c}yes`);
      const no = this.reply(d, s.declineReply ?? "Not now.", `${c}no`);
      const accParams: ScriptParams = s.join ? { target, join: "1" } : { target };
      const acc = this.entry(d, s.accept ?? "Thank you. Be careful.", `${c}accept`, "q_act", accParams);
      if (s.approach) this.wireApproach(npc, typeof s.approach === "string" ? s.approach : "");
      const dec = this.entry(d, s.decline ?? "Perhaps another time.", `${c}decline`);
      this.linkER(d, offer, yes);
      this.linkER(d, offer, no);
      this.linkRE(d, yes, acc);
      this.linkRE(d, no, dec);
      this.root(d, offer, 3, { target });
      d.subjects.push({ entry: offer, key: `offer:${target}` });
      return;
    }
    if (s.do === "deliver") {
      const item = s.item ?? "";
      const count = String(s.count ?? 1);
      const advParams: ScriptParams = s.keep ? { target } : { target, take_item: item, take_count: count };
      const adv = this.entry(d, thanks, `${c}advance`, "q_act", advParams);
      if (s.reply) {
        this.linkER(d, adv, this.reply(d, s.reply, `${c}reply`));
        this.leave(d, adv, `${c}leave`);
      }
      this.root(d, adv, 1, { target, item, count });
      const lack = this.entry(d, s.missing ?? "You were to bring me something. Have you lost it?", `${c}missing`);
      this.root(d, lack, 1, { target, item, count, lacks: "1" });
      return;
    }
    if (s.do === "rescue") {
      const plea = this.entry(d, s.plea ?? "Please, get me out of here!", `${c}plea`);
      const free = this.reply(d, s.reply ?? "Hold still. I'll get you out.", `${c}free`);
      const adv = this.entry(d, thanks, `${c}advance`, "q_act", { target, leave: s.leave === false ? "0" : "1" });
      if (s.leave !== false) d.ends.add(adv);
      this.linkER(d, plea, free);
      this.linkRE(d, free, adv);
      this.root(d, plea, 1, { target });
      return;
    }
    if (s.do === "escort") {
      const plea = this.entry(d, s.plea ?? "Will you take me there? I'll stay close.", `${c}plea`);
      const go = this.reply(d, s.reply ?? "Come with me.", `${c}go`);
      const start = this.entry(d, "Lead the way.", `${c}start`, "q_act", { escort: target });
      d.ends.add(start);
      this.linkER(d, plea, go);
      this.linkRE(d, go, start);
      this.root(d, plea, 1, { target, escort: "offer" });
      const under = this.entry(d, "I'm right behind you.", `${c}underway`);
      this.root(d, under, 0, { target, escort: "active" });
      return;
    }
    // talk / return, optionally behind a skill check.
    if (s.check) {
      const key = `${this.spec.tag}_${s.n}`.slice(0, 32);
      const intro = this.entry(d, s.offer ?? "What do you want?", `${c}intro`);
      const chk = s.check;
      const what = chk.skill ?? chk.ability ?? chk.save ?? "";
      // Skill checks with a plain DC use q_roll; ability, save and named-difficulty checks use the generic q_check.
      const generic = !!(chk.ability || chk.save || chk.difficulty);
      const rollParams: ScriptParams = { key };
      if (chk.skill) rollParams.skill = chk.skill;
      if (chk.ability) rollParams.ability = chk.ability;
      if (chk.save) rollParams.save = chk.save;
      if (chk.dc !== undefined) rollParams.dc = String(chk.dc);
      if (chk.difficulty) rollParams.difficulty = chk.difficulty.replace(" ", "");
      if (generic) rollParams.who = chk.save ? "speaker" : "best";
      const tryIt = this.reply(d, chk.prompt ?? `[${what}] Hear me out.`, `${c}try`, generic ? "q_check" : "q_roll", rollParams);
      const pass = this.entry(d, s.check.pass ?? thanks, `${c}pass`, "q_act", { target });
      const failParams: ScriptParams = s.check.else === "fight" ? { hostile: "1" } : {};
      const fail = this.entry(
        d,
        s.check.fail ?? "No.",
        `${c}fail`,
        Object.keys(failParams).length ? "q_act" : undefined,
        failParams,
      );
      if (s.check.else === "fight") d.ends.add(fail);
      this.linkER(d, intro, tryIt);
      this.linkRE(d, tryIt, pass, "q_chk", { roll: key, roll_result: "pass" });
      this.linkRE(d, tryIt, fail, "q_chk", { roll: key, roll_result: "fail" });
      this.leave(d, intro, `${c}leave`);
      this.root(d, intro, 1, { target, roll: key, roll_result: "none" });
      return;
    }
    const actParams: ScriptParams = { target };
    if (s.dismiss) actParams.dismiss = s.dismiss;
    if (s.join) actParams.join = "1";
    const adv = this.entry(d, thanks, `${c}advance`, "q_act", actParams);
    if (s.reply) this.linkER(d, adv, this.reply(d, s.reply, `${c}reply`));
    this.root(d, adv, 1, s.companion ? { target, companion: s.companion } : { target });
  }

  /** The NPC walks up to the first player it sees and starts its conversation (q_approach on its OnPerception). */
  private wireApproach(npc: Participant, bark: string): void {
    for (const c of npc.copies) {
      const orig = getFieldStr(c.obj, "ScriptOnNotice");
      if (orig !== "q_approach") {
        if (orig) mergeVarTable(c.obj, [{ name: "MCP_Q_ORIG_NOTICE", type: "string", value: orig }]);
        setField(c.obj, "ScriptOnNotice", "resref", "q_approach");
      }
      if (bark) mergeVarTable(c.obj, [{ name: "quest_approach_bark", type: "string", value: bark }]);
      this.touch(c);
    }
  }

  /** "Still working on it" lines on the giver while the party is between its stages, and a done line at the end. */
  private reminders(): void {
    const giver = this.creature(this.spec.giver);
    if (!giver) return;
    const d = this.dialogFor(giver);
    const giverStages = new Set(
      this.spec.stages.filter((s) => (s.to ?? this.spec.giver) === this.spec.giver && isTalkLike(s)).map((s) => s.n),
    );
    const numbers = [...new Set(this.spec.stages.filter((s) => !s.optional).map((s) => s.n))].sort((a, b) => a - b);
    for (const n of numbers) {
      const stage = this.spec.stages.find((s) => s.n === n && !s.optional) as Stage;
      const c = `${COMMENT(this.spec.tag)}s${n}:`;
      if (stage.end) {
        const done = this.entry(d, stage.reminder ?? "Thank you again for your help.", `${c}done`);
        this.root(d, done, 2, { quest: this.spec.tag, stage: String(n), op: "at" });
      } else if (!giverStages.has(n + 1)) {
        const rem = this.entry(d, stage.reminder ?? "Have you done what I asked?", `${c}reminder`);
        this.root(d, rem, 2, { quest: this.spec.tag, stage: String(n), op: "at" });
        d.subjects.push({ entry: rem, key: `s${n}` });
      }
    }
  }


  /**
   * Dialog rule (user, 2026-11-09): an answer does not end the talk. Every quest line that would end it links back to a
   * shared hub: one option per still-active subject of this NPC ("About <quest>": its reminder line while the quest is
   * running, its offer while it can still be taken) and [Leave]. Options show by q_chk on the link, so they follow quest
   * state; they are removed with their quest (Comment prefix mcpq:<tag>:).
   */
  private wireHub(d: NonNullable<ReturnType<QuestBuilder["dialogs"]["get"]>>): void {
    const mine = COMMENT(this.spec.tag);
    for (const sub of d.subjects) {
      const r = this.reply(d, `About: ${this.spec.name}`, `${mine}hub:${sub.key}`);
      this.linkRE(d, r, sub.entry);
    }
    const replies = getFieldList(d.dlg, "ReplyList");
    let leaveIdx = replies.findIndex((r) => getFieldStr(r, "Comment") === HUB_LEAVE);
    if (leaveIdx < 0) leaveIdx = this.reply(d, "[Leave]", HUB_LEAVE);
    const hubOf = (comment: string): { idx: number; params?: ScriptParams } | undefined => {
      const m = /^mcpq:(.+?):hub:(s(\d+)|offer:(\d+))$/.exec(comment);
      if (!m) return undefined;
      return { idx: -1, params: m[3] ? { quest: m[1], stage: m[3], op: "at" } : { target: m[4] } };
    };
    const hubReplies: Array<{ idx: number; params?: ScriptParams }> = [];
    getFieldList(d.dlg, "ReplyList").forEach((r, idx) => {
      const h = hubOf(getFieldStr(r, "Comment"));
      if (h) hubReplies.push({ idx, params: h.params });
    });
    const entries = getFieldList(d.dlg, "EntryList");
    entries.forEach((e, ei) => {
      const comment = getFieldStr(e, "Comment");
      if (!comment.startsWith("mcpq:") || d.ends.has(ei)) return;
      const links = getFieldList(e, "RepliesList");
      const isHub = (l: GffObj) => {
        const c = getFieldStr(getFieldList(d.dlg, "ReplyList")[getFieldNum(l, "Index")], "Comment");
        return c === HUB_LEAVE || !!hubOf(c);
      };
      if (links.some((l) => !isHub(l))) return; // has replies of its own (offer, plea, intro)
      const linked = new Set(links.map((l) => getFieldNum(l, "Index")));
      for (const h of hubReplies) {
        if (linked.has(h.idx)) continue;
        // the subject whose own line this is would only point back at itself
        const target = getFieldList(getFieldList(d.dlg, "ReplyList")[h.idx], "EntriesList")[0];
        if (target && getFieldNum(target, "Index") === ei) continue;
        const l = makeLink(h.idx, "q_chk", h.params);
        l.__struct_id = links.length;
        links.push(l);
      }
      if (!linked.has(leaveIdx)) {
        const l = makeLink(leaveIdx);
        l.__struct_id = links.length;
        links.push(l);
      }
    });
  }

  private finishDialogs(): void {
    for (const d of this.dialogs.values()) {
      this.wireHub(d);
      d.roots.sort((a, b) => a.rank - b.rank);
      const start = getFieldList(d.dlg, "StartingList");
      const links = d.roots.map((r) => makeLink(r.entry, r.cond, r.params));
      start.unshift(...links);
      start.forEach((l, i) => {
        l.__struct_id = i;
      });
      if (!d.created) this.markBp(`${d.resref}.dlg`, d.dlg as GffDocument);
      const lines = d.roots.map((r) => {
        const e = getFieldList(d.dlg, "EntryList")[r.entry];
        const p = r.params
          ? Object.entries(r.params)
              .map(([k, v]) => `${k}=${v}`)
              .join(" ")
          : "";
        return `[${p}] ${getFieldLocStr(e, "Text")}`;
      });
      this.report.dialogs.push({ npc: d.npc.label, dialog: d.resref, created: d.created, lines });
    }
  }

  // --- stages

  private waypointExists(tag: string): boolean {
    return this.areas().some((a) => {
      try {
        return getFieldList(this.git(a), "WaypointList").some((w) => getFieldStr(w, "Tag") === tag);
      } catch {
        return false;
      }
    });
  }

  /** A stage's `spawn` as q_act parameters; places the waypoint when the spec names an area instead of a waypoint. */
  private async prepareSpawn(s: Stage): Promise<ScriptParams | undefined> {
    const sp = s.spawn;
    if (!sp) return undefined;
    let at = sp.at;
    if (!at) {
      const area = (sp.area as string).toLowerCase();
      if (!this.index.areas.has(area)) throw new QuestBuildError(`stage ${s.n}: spawn area ${area} isn't in the module`);
      at = `${this.spec.tag}_s${s.n}_spawn`.slice(0, 32);
      if (!this.waypointExists(at)) {
        if (this.dryRun) {
          this.report.placed.push(`waypoint ${at} would be placed in ${area}`);
        } else {
          const spot =
            sp.x !== undefined && sp.y !== undefined
              ? { x: sp.x, y: sp.y }
              : (await findSimpleWalkableSpots(this.index, this.resman, area, 1))[0];
          if (!spot) throw new QuestBuildError(`stage ${s.n}: no walkable spot in ${area} for the spawn waypoint`);
          const walk = await checkPlacementWalkable(spot.x, spot.y, area, this.index, this.resman);
          if (!walk.ok) throw new QuestBuildError(`stage ${s.n}: spawn point (${spot.x}, ${spot.y}) in ${area}: ${walk.reason}`);
          const list = getFieldList(this.git(area), "WaypointList");
          list.push({
            __struct_id: GIT_STRUCT_WAYPOINT,
            Appearance: { type: "byte", value: 1 },
            Description: { type: "cexolocstring", value: {} },
            HasMapNote: { type: "byte", value: 0 },
            LinkedTo: { type: "cexostring", value: "" },
            LocalizedName: { type: "cexolocstring", value: { "0": `Quest ${this.spec.tag} spawn` } },
            MapNote: { type: "cexolocstring", value: {} },
            MapNoteEnabled: { type: "byte", value: 0 },
            Tag: { type: "cexostring", value: at },
            TemplateResRef: { type: "resref", value: "" },
            XPosition: { type: "float", value: spot.x },
            YPosition: { type: "float", value: spot.y },
            ZPosition: { type: "float", value: walk.z ?? 0 },
            XOrientation: { type: "float", value: 0 },
            YOrientation: { type: "float", value: 1 },
          } as unknown as GffObj);
          this.markGit(area);
          this.report.placed.push(`waypoint ${at} in ${area} at (${spot.x.toFixed(1)}, ${spot.y.toFixed(1)})`);
        }
      }
    } else if (!this.waypointExists(at)) {
      this.report.warnings.push(`stage ${s.n}: spawn waypoint ${at} isn't placed anywhere; nothing will spawn until it is`);
    }
    if (!(await resolveBlueprint(this.index, sp.resref, "utc", this.resman)))
      throw new QuestBuildError(`stage ${s.n}: no creature blueprint ${sp.resref} to spawn`);
    const params: ScriptParams = { spawn: sp.resref, at, spawn_key: `${this.spec.tag}_${s.n}` };
    if (sp.count && sp.count > 1) params.spawn_count = String(sp.count);
    if (sp.tag) params.spawn_tag = sp.tag;
    if (sp.hostile === false) params.spawn_hostile = "0";
    return params;
  }

  /** Is this kill target created by a stage's spawn (so it needs no placed copy)? Returns the spawned blueprint. */
  private spawnedTarget(ref: string): string | undefined {
    const r = ref.toLowerCase();
    for (const st of this.spec.stages) {
      const sp = st.spawn;
      if (sp && (sp.resref.toLowerCase() === r || sp.tag?.toLowerCase() === r)) return sp.resref;
    }
    return undefined;
  }

  private async wireStage(s: Stage): Promise<void> {
    this.spawnParams = await this.prepareSpawn(s);
    const tag = this.spec.tag;
    let by = "";
    let slot: number | undefined;
    let owner: Participant | undefined;
    switch (s.do) {
      case "talk":
      case "return":
      case "deliver":
      case "rescue":
      case "escort": {
        const who = s.do === "rescue" || s.do === "escort" ? (s.target as string) : (s.to ?? this.spec.giver);
        const npc = this.creature(who);
        if (!npc) throw new QuestBuildError(`stage ${s.n}: no creature with tag or blueprint ${who} in the module`);
        slot = this.assignSlot(npc, s);
        this.writeStageVars(npc, s, slot);
        if (s.do === "escort") {
          const vars: Array<{ name: string; type: "int" | "string" | "float"; value: number | string }> = [
            { name: `quest${slot}_escort_area`, type: "string", value: (s.area ?? "").toLowerCase() },
          ];
          if (s.x !== undefined && s.y !== undefined) {
            vars.push({ name: `quest${slot}_escort_point`, type: "int", value: 1 });
            vars.push({ name: `quest${slot}_escort_x`, type: "float", value: s.x });
            vars.push({ name: `quest${slot}_escort_y`, type: "float", value: s.y });
            vars.push({ name: `quest${slot}_escort_radius`, type: "float", value: s.radius ?? 8 });
          }
          if (s.arrive) vars.push({ name: `quest${slot}_escort_arrive`, type: "string", value: s.arrive });
          if (s.leave) vars.push({ name: `quest${slot}_escort_leave`, type: "int", value: 1 });
          this.setVars(npc, vars);
        }
        if (s.do === "deliver") await this.ensureItemExists(s);
        this.stageDialog(npc, s, slot);
        by = who;
        break;
      }
      case "kill": {
        const spawned = this.spawnedTarget(s.target as string);
        let target = this.creature(spawned ?? (s.target as string));
        if (spawned) {
          if (!target) throw new QuestBuildError(`stage ${s.n}: no blueprint ${spawned} for the spawned kill target`);
        } else if (!target || !target.copies.some((c) => c.where.startsWith("git:"))) target = await this.placeCreature(s);
        const placedCount = target.copies.filter((c) => c.where.startsWith("git:")).length;
        if (placedCount > 3) {
          this.report.warnings.push(
            `stage ${s.n}: ${s.target} is placed ${placedCount} times; killing any one advances the quest (use a dedicated blueprint for a unique target)`,
          );
        }
        slot = this.assignSlot(target, s);
        this.writeStageVars(target, s, slot);
        owner = target;
        this.setEvent(target, slot, "ScriptDeath", "q_ondeath", "MCP_Q_ORIG_DEATH");
        by = s.target as string;
        break;
      }
      case "pickup": {
        const item = await this.item(s);
        slot = this.assignSlot(item, s);
        this.writeStageVars(item, s, slot);
        owner = item;
        mergeVarTable(item.copies[0].obj, [{ name: "quest_event", type: "int", value: slot }]);
        this.needAcquire = true;
        await this.placeItem(s, item);
        by = item.label;
        break;
      }
      case "explore": {
        const area = this.area(s.area as string);
        slot = this.assignSlot(area, s);
        this.writeStageVars(area, s, slot);
        owner = area;
        this.setEvent(area, slot, "OnEnter", "q_onenter", "MCP_Q_ORIG_ENTER");
        by = s.area as string;
        break;
      }
      case "trigger": {
        const trig = this.createTrigger(s);
        slot = this.assignSlot(trig, s);
        this.writeStageVars(trig, s, slot);
        owner = trig;
        this.setEvent(trig, slot, "ScriptOnEnter", "q_trigger", "MCP_Q_ORIG_ENTER");
        by = trig.label;
        break;
      }
      case "search": {
        const plc = this.placed(s.target as string, "Placeable List", "placeable");
        if (!plc) throw new QuestBuildError(`stage ${s.n}: no placed placeable tagged ${s.target}`);
        slot = this.assignSlot(plc, s);
        this.writeStageVars(plc, s, slot);
        owner = plc;
        this.setEvent(plc, slot, "OnUsed", "q_search", "MCP_Q_ORIG_USED");
        const chk = s.check as NonNullable<Stage["check"]>;
        const vars: Array<{ name: string; type: "int" | "string" | "float"; value: number | string }> = [
          { name: "quest_search_skill", type: "string", value: chk.skill ?? "" },
          { name: "quest_search_dc", type: "int", value: checkDc(chk) },
          { name: "quest_search_tries", type: "int", value: chk.tries ?? 2 },
          { name: "quest_search_assured", type: "int", value: chk.assured === false || s.optional ? 0 : 1 },
          { name: "quest_search_optional", type: "int", value: s.optional ? 1 : 0 },
          { name: "quest_search_pass", type: "string", value: chk.pass ?? s.text ?? "You find something." },
          { name: "quest_search_fail", type: "string", value: chk.fail ?? "You find nothing." },
        ];
        if (s.none) vars.push({ name: "quest_search_none", type: "string", value: s.none });
        if (s.item || s.itemName) {
          const item = await this.item(s);
          vars.push({ name: "quest_search_item", type: "string", value: item.label });
        }
        if (s.examine) {
          vars.push({ name: "quest_search_bonus_skill", type: "string", value: s.examine.skill });
          vars.push({ name: "quest_search_bonus_dc", type: "int", value: s.examine.dc });
          if (s.examine.var) vars.push({ name: "quest_search_bonus_var", type: "string", value: s.examine.var });
          if (s.examine.pass) vars.push({ name: "quest_search_bonus_pass", type: "string", value: s.examine.pass });
          if (s.examine.fail) vars.push({ name: "quest_search_bonus_fail", type: "string", value: s.examine.fail });
        }
        this.setVars(plc, vars);
        for (const c of plc.copies) setField(c.obj, "Useable", "byte", 1);
        by = s.target as string;
        break;
      }
      case "custom": {
        this.report.notes.push(
          `stage ${s.n} is advanced by your own script: call AddJournalQuestEntry("${this.spec.tag}", ${s.n}, oPC) (whole party by default) where it happens`,
        );
        by = "custom script";
        break;
      }
      case "use": {
        const plc = this.placed(s.target as string, "Placeable List", "placeable");
        if (!plc) throw new QuestBuildError(`stage ${s.n}: no placed placeable tagged ${s.target}`);
        slot = this.assignSlot(plc, s);
        this.writeStageVars(plc, s, slot);
        owner = plc;
        this.setEvent(plc, slot, "OnUsed", "q_onused", "MCP_Q_ORIG_USED");
        for (const c of plc.copies) setField(c.obj, "Useable", "byte", 1);
        by = s.target as string;
        break;
      }
    }
    if (s.spawn && owner && slot !== undefined && !s.optional && this.spawnParams) {
      // Event stage: QuestAdvance reads these when the stage advances (dialog stages carry the same values on their q_act line).
      const sp = this.spawnParams;
      const vars: Array<{ name: string; type: "int" | "string" | "float"; value: number | string }> = [
        { name: `quest${slot}_spawn`, type: "string", value: sp.spawn },
        { name: `quest${slot}_spawn_at`, type: "string", value: sp.at },
        { name: `quest${slot}_spawn_key`, type: "string", value: sp.spawn_key },
      ];
      if (sp.spawn_count) vars.push({ name: `quest${slot}_spawn_count`, type: "string", value: sp.spawn_count });
      if (sp.spawn_tag) vars.push({ name: `quest${slot}_spawn_tag`, type: "string", value: sp.spawn_tag });
      if (sp.spawn_hostile) vars.push({ name: `quest${slot}_spawn_hostile`, type: "string", value: sp.spawn_hostile });
      this.setVars(owner, vars);
    }
    this.report.stages.push({
      n: s.n,
      do: s.do,
      by,
      slot,
      journal: s.journal,
      end: s.end,
      ...(s.reward ? { reward: s.reward } : {}),
    });
    void tag;
  }

  private async ensureItemExists(s: Stage): Promise<void> {
    if (s.item && this.newItems.has(s.item)) return;
    if (s.itemName) await this.item(s);
    else if (s.item && !this.doc(`${s.item}.uti`)) {
      const base = await resolveBlueprint(this.index, s.item, "uti", this.resman);
      if (!base) this.report.warnings.push(`stage ${s.n}: item ${s.item} doesn't exist; nothing can be handed over`);
    }
  }

  private async placeCreature(s: Stage): Promise<Participant> {
    if (!s.area)
      throw new QuestBuildError(`stage ${s.n}: ${s.target} isn't placed anywhere; give an area to place it in`);
    if (this.dryRun) {
      this.report.placed.push(`${s.target} would be placed in ${s.area}`);
      const bp = await resolveBlueprint(this.index, s.target as string, "utc", this.resman);
      if (!bp) throw new QuestBuildError(`stage ${s.n}: no creature blueprint ${s.target}`);
      const p: Participant = {
        label: s.target as string,
        kind: "creature",
        copies: [{ obj: structuredClone(bp) as GffObj, where: "dry" }],
        slots: new Map(),
      };
      this.participants.set(`creature:${(s.target as string).toLowerCase()}`, p);
      return p;
    }
    const spots = await findSimpleWalkableSpots(this.index, this.resman, s.area, 1);
    const spot = s.x !== undefined && s.y !== undefined ? { x: s.x, y: s.y } : spots[0];
    if (!spot) throw new QuestBuildError(`stage ${s.n}: no walkable spot in ${s.area} for ${s.target}`);
    const r = await placeCreatureCore(this.index, this.resman, {
      area: s.area,
      blueprint: s.target as string,
      x: spot.x,
      y: spot.y,
      collisionRadius: 0.5,
    });
    if (!r.success) throw new QuestBuildError(`stage ${s.n}: could not place ${s.target}: ${r.error}`);
    this.report.placed.push(`${s.target} in ${s.area} at (${spot.x.toFixed(1)}, ${spot.y.toFixed(1)})`);
    this.participants.delete(`creature:${(s.target as string).toLowerCase()}`);
    const p = this.creature(s.target as string);
    if (!p) throw new QuestBuildError(`stage ${s.n}: placed ${s.target} but can't find it`);
    return p;
  }

  private async placeItem(s: Stage, item: Participant): Promise<void> {
    const holder = s.from_creature
      ? this.creature(s.from_creature)
      : s.in
        ? this.placed(s.in, "Placeable List", "placeable")
        : undefined;
    if (!holder) {
      if (s.from_creature || s.in)
        throw new QuestBuildError(`stage ${s.n}: holder ${s.from_creature ?? s.in} not found`);
      this.report.warnings.push(
        `stage ${s.n}: ${item.label} is created but nobody carries it; give from_creature or in`,
      );
      return;
    }
    for (const c of holder.copies) {
      if (c.where.startsWith("bp:") && holder.kind === "creature") {
        const list = (c.obj.ItemList ??= { type: "list", value: [] }) as { value: GffObj[] };
        if (!list.value.some((e) => getFieldStr(e, "InventoryRes") === item.label)) {
          const n = list.value.length;
          list.value.push({
            __struct_id: n,
            InventoryRes: { type: "resref", value: item.label },
            Repos_PosX: { type: "word", value: n % 6 },
            Repos_Posy: { type: "word", value: Math.floor(n / 6) },
            Dropable: { type: "byte", value: 1 },
          } as unknown as GffObj);
        }
      } else if (c.where.startsWith("git:")) {
        const list = (c.obj.ItemList ??= { type: "list", value: [] }) as { value: GffObj[] };
        if (!list.value.some((e) => getFieldStr(e, "TemplateResRef") === item.label)) {
          const copy = structuredClone(item.copies[0].obj);
          delete (copy as Record<string, unknown>).__data_type;
          copy.__struct_id = 0;
          setField(copy, "Repos_PosX", "word", list.value.length % 6);
          setField(copy, "Repos_Posy", "word", Math.floor(list.value.length / 6));
          setField(copy, "Dropable", "byte", 1);
          list.value.push(copy);
        }
        if (holder.kind === "placeable") setField(c.obj, "HasInventory", "byte", 1);
      }
      this.touch(c);
    }
  }

  private createTrigger(s: Stage): Participant {
    const area = (s.area as string).toLowerCase();
    const tag = `${this.spec.tag}_t${s.n}`.slice(0, 32);
    const git = this.git(area);
    const list = (git.TriggerList ??= { type: "list", value: [] }) as { value: GffObj[] };
    const r = s.radius ?? 3;
    const trig = {
      __struct_id: GIT_STRUCT_TRIGGER,
      Cursor: { type: "byte", value: 0 },
      Faction: { type: "dword", value: 1 },
      Geometry: rectTriggerGeometry(r * 2, r * 2, 0),
      HighlightHeight: { type: "float", value: 0 },
      LinkedTo: { type: "cexostring", value: "" },
      LinkedToFlags: { type: "byte", value: 0 },
      LocalizedName: { type: "cexolocstring", value: { "0": `Quest ${this.spec.tag} stage ${s.n}` } },
      ScriptOnEnter: { type: "resref", value: "" },
      Tag: { type: "cexostring", value: tag },
      TemplateResRef: { type: "resref", value: "" },
      Type: { type: "int", value: 0 },
      XOrientation: { type: "float", value: 0 },
      XPosition: { type: "float", value: s.x as number },
      YOrientation: { type: "float", value: 0 },
      YPosition: { type: "float", value: s.y as number },
      ZOrientation: { type: "float", value: 0 },
      ZPosition: { type: "float", value: 0 },
    } as unknown as GffObj;
    list.value.push(trig);
    this.markGit(area);
    this.report.placed.push(`trigger ${tag} in ${area} at (${s.x}, ${s.y}), ${r * 2} m square`);
    const p: Participant = {
      label: tag,
      kind: "trigger",
      copies: [{ obj: trig, where: `git:${area}` }],
      slots: new Map(),
    };
    this.participants.set(`trigger:${tag}`, p);
    return p;
  }

  // --- module events

  private async wireModuleEvent(field: string, wrapper: string, generate: (orig: string) => string): Promise<void> {
    const ifo = this.doc("module.ifo") as GffObj | undefined;
    if (!ifo) {
      this.report.warnings.push(`module.ifo not found; ${field} not wired`);
      return;
    }
    const current = getFieldStr(ifo, field);
    if (current === wrapper) return;
    if (!this.dryRun) {
      const r = await writeAndCompileScript(this.index, wrapper, generate(current), true);
      if (!r.compiled) throw new QuestBuildError(`${wrapper} failed to compile: ${r.compilerOutput}`);
    }
    setField(ifo, field, "resref", wrapper);
    this.markBp("module.ifo", ifo as GffDocument);
    this.report.notes.push(`${field} is now ${wrapper} (runs ${current || "nothing"} first)`);
  }

  // --- run

  async build(): Promise<QuestBuildReport> {
    if (!this.index.resources.has("inc_quest.nss")) {
      throw new QuestBuildError("the quest runtime isn't in this module: run create_quest_system first");
    }
    this.stripPrevious();
    this.writeJournal();
    for (const s of this.spec.stages) await this.wireStage(s);
    this.reminders();
    this.finishDialogs();
    if (this.needAcquire) await this.wireModuleEvent("Mod_OnAcquirItem", ACQUIRE_WRAPPER, generateAcquireWrapper);
    if (this.spec.bounty) await this.wireModuleEvent("Mod_OnHeartbeat", HEARTBEAT_WRAPPER, generateHeartbeatWrapper);
    this.check();
    this.report.objects = [...this.participants.values()].map(
      (p) => `${p.kind} ${p.label}: slots ${[...p.slots.values()].join(", ")}`,
    );
    this.report.adventureMd = this.adventureMd();
    if (!this.dryRun) await this.commit();
    return this.report;
  }

  private check(): void {
    const numbers = new Set(this.spec.stages.filter((s) => !s.optional).map((s) => s.n));
    for (const n of numbers)
      if (n > 1 && !numbers.has(n - 1) && !this.spec.stages.some((s) => s.n === n && s.from !== n - 1)) {
        this.report.warnings.push(
          `stage ${n} has no stage ${n - 1} before it and no explicit from: nobody can reach it`,
        );
      }
    for (const s of this.spec.stages)
      if (s.from > 0 && !numbers.has(s.from)) this.report.warnings.push(`stage ${s.n}: from ${s.from} is not a stage`);
  }

  private adventureMd(): string {
    const lines = [`### Quest: ${this.spec.name} (\`${this.spec.tag}\`)`, `- **Giver:** ${this.spec.giver}`];
    for (const s of this.report.stages) {
      lines.push(
        `- **Stage ${s.n}** (${s.do}${s.by ? ` — ${s.by}` : ""}${s.end ? (s.end === "fail" ? ", failure ending" : ", ending") : ""}): ${s.journal}`,
      );
    }
    lines.push(`- Built by build_quest; rebuild with the same spec, remove with remove_quest(\`${this.spec.tag}\`).`);
    return lines.join("\n");
  }

  async commit(): Promise<void> {
    for (const [resref, doc] of this.newItems) {
      if (this.index.resources.has(`${resref}.uti`)) {
        this.markBp(`${resref}.uti`, doc);
        continue;
      }
      const filePath = path.join(this.index.tempDir, `${resref}.uti`);
      await jsonToGff(doc, filePath);
      const stat = await fs.stat(filePath);
      this.index.resources.set(`${resref}.uti`, { resref, extension: "uti", filePath, sizeBytes: stat.size });
      this.index.parsedGff.set(`${resref}.uti`, doc);
    }
    for (const [resref, doc] of this.newDialogs) await writeDialogDocument(this.index, resref, doc);
    if (this.newJournal) {
      const filePath = path.join(this.index.tempDir, "module.jrl");
      await jsonToGff(this.newJournal, filePath);
      const stat = await fs.stat(filePath);
      this.index.resources.set("module.jrl", { resref: "module", extension: "jrl", filePath, sizeBytes: stat.size });
      this.index.parsedGff.set("module.jrl", this.newJournal);
    }
    for (const [key, doc] of this.dirtyBp) {
      const entry = this.index.resources.get(key);
      if (!entry) continue;
      await jsonToGff(doc, entry.filePath);
    }
    for (const area of this.dirtyGit) await writeBackGit(this.index, area, getGitDoc(this.index, area).doc);
  }
}

function isTalkLike(s: Stage): boolean {
  return s.do === "talk" || s.do === "return" || s.do === "deliver";
}

/** Removes a quest built by build_quest: journal category, dialog nodes, quest variables, created triggers. */
export async function removeQuest(index: ModuleIndex, resman: ResmanOptions, tag: string): Promise<number> {
  const b = new QuestBuilder(
    index,
    resman,
    { name: tag, tag, giver: "", level: 1, priority: 0, stages: [], bounty: false, notes: [] },
    false,
  );
  const removed = b.stripPrevious();
  await b.commit();
  return removed;
}
