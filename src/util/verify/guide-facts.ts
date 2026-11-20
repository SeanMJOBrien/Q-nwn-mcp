/**
 * Does the story and DM guide still match the module? Written text drifts from what was built: The Glowing Deep's guide
 * said Ilyanthe fought with a mace after she was given another weapon, and named objects nothing built. Two checks:
 *
 * - `guide_weapon_mismatch`: a sentence that has a creature fight with a weapon ("Ilyanthe ... fights with ... a mace")
 *   when no creature of that name carries that kind of weapon (its hands, or the weapon its spawn script equips:
 *   `MCP_GEAR_WEAPONS`). A creature whose weapon is unknown is not judged.
 * - `story_unknown_tag`: a `Name (`tag`)` reference that names no tag, resref or area in the module.
 *
 * Both are warnings: the text is for people, and a wrong line misleads the DM but breaks nothing.
 */

import fs from "fs/promises";
import type { GffObj } from "../../types/gff.js";
import { getFieldLocStr, getFieldNum, getFieldStr } from "../../types/gff.js";
import type { ModuleIndex } from "../../types/module.js";
import { adventurePath, findAdventureDir } from "../adventure-dir.js";
import { EQUIP_SLOT_MAP } from "../equip-slots.js";
import { hasTool } from "../tool-registry.js";
import { type Finding, listOf } from "./common.js";

export interface CreatureFact {
  tag: string;
  name: string;
  /** baseitems.2da labels of the weapons it carries or its spawn script equips; empty = unknown. */
  weapons: string[];
}

/** baseitems.2da labels read from a live table (rows checked when the weapon preferences were written). */
const KNOWN_LABELS: Record<number, string> = {
  0: "shortsword", 1: "longsword", 2: "battleaxe", 5: "warhammer", 6: "heavycrossbow", 8: "longbow", 9: "lightmace",
  11: "shortbow", 18: "greataxe", 22: "dagger", 47: "morningstar", 50: "quarterstaff", 51: "rapier", 53: "scimitar", 60: "sickle",
};

/** Weapon words as text uses them, longest first so "longsword" wins over "sword". */
const WEAPON_WORDS = [
  "heavycrossbow", "lightcrossbow", "bastardsword", "quarterstaff", "throwingaxe", "morningstar", "lighthammer",
  "heavyflail", "lightflail", "shortsword", "greatsword", "shortspear", "lightmace", "longsword", "battleaxe",
  "warhammer", "crossbow", "greataxe", "shortbow", "shuriken", "scimitar", "longbow", "handaxe", "halberd", "trident",
  "waraxe", "katana", "dagger", "rapier", "sickle", "scythe", "hammer", "sword", "spear", "staff", "flail", "kukri",
  "sling", "whip", "club", "mace", "kama", "dart", "axe", "bow",
];
const FAMILIES = new Set(["sword", "axe", "hammer", "mace", "flail"]);
const TITLES = new Set(["matron", "elder", "captain", "lord", "lady", "sister", "brother", "father", "mother", "master", "the", "old", "young", "sir", "dame"]);
const FIGHT_VERB = /\b(fights?|fighting|wields?|wielding|carries|carrying|armed|attacks?|attacking|swings?|swinging|uses?|using)\b/gi;

/** Whether a weapon word in the text can mean a baseitems.2da label. */
export function weaponMatches(word: string, label: string): boolean {
  if (word === "bow") return label.endsWith("bow") && !label.includes("crossbow");
  if (word === "staff" || word === "spear" || word === "crossbow") return label.includes(word);
  return label === word || label.endsWith(word) || (FAMILIES.has(word) && label.includes(word));
}

/** "long sword" -> "longsword", "battle axe" -> "battleaxe", ... so one word list covers both spellings. */
function joinWeaponWords(text: string): string {
  return text.replace(/\b(long|short|great|battle|war|hand|light|heavy|bastard|throwing|quarter)[\s-]+(swords?|bows?|axes?|hammers?|maces?|crossbows?|flails?|spears?|staffs?)\b/gi, "$1$2");
}

function nameTokens(name: string): string[] {
  return name
    .split(/[^A-Za-z'-]+/)
    .map((t) => t.replace(/'s$/i, ""))
    .filter((t) => t.length >= 4 && !TITLES.has(t.toLowerCase()));
}

/** Weapon claims in a text: [name token, weapon word, sentence]. */
export function weaponClaims(text: string, tokens: string[]): Array<{ token: string; word: string; sentence: string }> {
  const out: Array<{ token: string; word: string; sentence: string }> = [];
  const wordRe = new RegExp(`\\b(${WEAPON_WORDS.join("|")})s?\\b`, "i");
  for (const raw of joinWeaponWords(text).split(/(?<=[.!?])\s+|\n+/)) {
    const sentence = raw.trim();
    if (!sentence) continue;
    // Every name in the sentence, by position; a fighting verb belongs to the nearest name before it.
    const names: Array<{ token: string; at: number }> = [];
    for (const token of tokens) {
      const re = new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
      for (const m of sentence.matchAll(re)) names.push({ token, at: m.index ?? 0 });
    }
    if (!names.length) continue;
    for (const verb of sentence.matchAll(FIGHT_VERB)) {
      const v = verb.index ?? 0;
      const owner = names.filter((n) => n.at < v && v - n.at <= 80).sort((a, b) => b.at - a.at)[0];
      if (!owner) continue;
      const w = wordRe.exec(sentence.slice(v, v + verb[0].length + 60));
      if (w) out.push({ token: owner.token, word: w[1].toLowerCase(), sentence: sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence });
    }
  }
  return out;
}

/** The weapon findings for texts against the module's creatures. */
export function checkWeaponClaims(texts: Array<{ file: string; text: string }>, creatures: CreatureFact[]): Finding[] {
  const byToken = new Map<string, CreatureFact[]>();
  for (const c of creatures) {
    for (const t of nameTokens(c.name)) {
      const k = t.toLowerCase();
      byToken.set(k, [...(byToken.get(k) ?? []), c]);
    }
  }
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const { file, text } of texts) {
    for (const claim of weaponClaims(text, [...byToken.keys()])) {
      const who = byToken.get(claim.token.toLowerCase()) ?? [];
      const known = who.filter((c) => c.weapons.length > 0);
      if (!known.length) continue;
      if (known.some((c) => c.weapons.some((l) => weaponMatches(claim.word, l)))) continue;
      const key = `${file}|${claim.token}|${claim.word}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const has = [...new Set(known.flatMap((c) => c.weapons))].join(", ");
      findings.push({
        code: "guide_weapon_mismatch",
        message: `${file} says ${known[0].name} fights with a ${claim.word}, but ${known.map((c) => c.tag).join("/")} carries ${has}: "${claim.sentence}"`,
        field: file,
        fix: `correct the text in the DM guide or the story file, or give ${known[0].tag} that weapon (MCP_GEAR_WEAPONS or set_creature_equipment)`,
      });
    }
  }
  return findings;
}

/** `Name (`tag`)` references whose tag the module does not know. */
export function checkTagRefs(texts: Array<{ file: string; text: string }>, known: Set<string>): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  for (const { file, text } of texts) {
    for (const m of text.matchAll(/[A-Za-z][\w']*\s+\(`([A-Za-z0-9_]{2,32})`/g)) {
      const tag = m[1].toLowerCase();
      if (known.has(tag) || seen.has(`${file}|${tag}`) || hasTool(tag)) continue; // a tool named for the DM is not a module object
      seen.add(`${file}|${tag}`);
      findings.push({
        code: "story_unknown_tag",
        message: `${file} names \`${m[1]}\`, which is no tag, resref or area in the module`,
        field: file,
        fix: "correct the reference in the text, or build what it names",
      });
    }
  }
  return findings;
}

/** A string local variable, read here rather than through git-helpers (that import loops back through the tools). */
function localString(obj: GffObj, name: string): string {
  const v = listOf(obj, "VarTable").find((e) => getFieldStr(e, "Name") === name);
  return v ? getFieldStr(v, "Value") : "";
}

function baseItemLabel(index: ModuleIndex, row: number): string | undefined {
  const label = index.twodaTables.get("baseitems")?.rows.get(row)?.label;
  return (label && label !== "****" ? label : KNOWN_LABELS[row])?.toLowerCase();
}

function creatureFact(index: ModuleIndex, obj: GffObj): CreatureFact {
  const weapons = new Set<string>();
  for (const e of listOf(obj, "Equip_ItemList")) {
    if (e.__struct_id !== EQUIP_SLOT_MAP.righthand && e.__struct_id !== EQUIP_SLOT_MAP.lefthand) continue;
    let base: number | undefined = "BaseItem" in e ? getFieldNum(e, "BaseItem") : undefined;
    if (base === undefined) {
      const res = (getFieldStr(e, "EquippedRes") || getFieldStr(e, "TemplateResRef")).toLowerCase();
      const uti = index.parsedGff.get(`${res}.uti`) as GffObj | undefined;
      if (uti) base = getFieldNum(uti, "BaseItem");
    }
    const label = base !== undefined ? baseItemLabel(index, base) : undefined;
    if (label && !/shield/.test(label)) weapons.add(label);
  }
  for (const id of localString(obj, "MCP_GEAR_WEAPONS").split(",")) {
    const n = Number(id.trim());
    if (id.trim() !== "" && Number.isInteger(n)) {
      const label = baseItemLabel(index, n);
      if (label) weapons.add(label);
    }
  }
  const name = `${getFieldLocStr(obj, "FirstName")} ${getFieldLocStr(obj, "LastName")}`.trim();
  return { tag: getFieldStr(obj, "Tag") || getFieldStr(obj, "TemplateResRef"), name, weapons: [...weapons] };
}

/** Every creature blueprint and placed creature, with its name and weapons. */
export function moduleCreatureFacts(index: ModuleIndex): CreatureFact[] {
  const out: CreatureFact[] = [];
  for (const [key, doc] of index.parsedGff ?? []) {
    if (key.endsWith(".utc")) out.push(creatureFact(index, doc as GffObj));
    else if (key.endsWith(".git")) for (const c of listOf(doc as GffObj, "Creature List")) out.push(creatureFact(index, c));
  }
  return out;
}

/** Tags, resrefs and areas of the module, lower case. */
export function moduleIds(index: ModuleIndex): Set<string> {
  const ids = new Set<string>();
  for (const k of index.tags?.keys() ?? []) ids.add(k.toLowerCase());
  for (const r of index.resources?.values() ?? []) ids.add(r.resref.toLowerCase());
  for (const a of index.areas?.keys() ?? []) ids.add(a.toLowerCase());
  for (const [key, doc] of index.parsedGff ?? []) {
    if (key.endsWith(".jrl")) for (const q of listOf(doc as GffObj, "Categories")) ids.add(getFieldStr(q, "Tag").toLowerCase());
    if (key.endsWith(".git")) {
      for (const [list, items] of Object.entries(doc as GffObj)) {
        if (!list.includes("List") || typeof items !== "object") continue;
        for (const o of listOf(doc as GffObj, list)) {
          const t = getFieldStr(o, "Tag");
          if (t) ids.add(t.toLowerCase());
        }
      }
    }
  }
  return ids;
}

/** Both checks over the story and DM guide texts. */
export function checkGuideFacts(index: ModuleIndex, texts: Array<{ file: string; text: string }>): Finding[] {
  if (!texts.length) return [];
  return [...checkWeaponClaims(texts, moduleCreatureFacts(index)), ...checkTagRefs(texts, moduleIds(index))];
}

/** The story and DM guide of the loaded module, when its adventure folder has them (nothing is created). */
export async function storyTexts(index: ModuleIndex): Promise<Array<{ file: string; text: string }>> {
  const dir = await findAdventureDir(index);
  if (!dir) return [];
  const out: Array<{ file: string; text: string }> = [];
  for (const [kind, label] of [["story", "story"], ["dmGuide", "DM guide"]] as const) {
    try {
      out.push({ file: label, text: await fs.readFile(adventurePath(dir, kind), "utf8") });
    } catch {
      // not written yet
    }
  }
  return out;
}
