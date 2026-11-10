/**
 * The two books every module keeps in its DM area chest (rule 2026-11-09): the full story that the module is based on
 * and the DM guide. Pure helpers: split long text into volumes, build the item blueprint of one volume.
 */

import type { GffDocument } from "../types/gff.js";

/** BASE_ITEM_BOOK in baseitems.2da. */
export const BOOK_BASE_ITEM = 74;
/** Characters of text per book; longer text becomes several volumes. */
export const VOLUME_CHARS = 6000;
export const DM_CHEST_TAG = "dm_chest";
export const DM_AREA_RESREF = "dm_area";

/** Splits text into volumes of at most `max` characters, at paragraph breaks (a paragraph over `max` is cut at a line, then a space). */
export function splitVolumes(text: string, max = VOLUME_CHARS): string[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length <= max) return [clean];
  const pieces: string[] = [];
  for (const para of clean.split(/\n{2,}/)) {
    if (para.length <= max) {
      pieces.push(para);
      continue;
    }
    let rest = para;
    while (rest.length > max) {
      let cut = rest.lastIndexOf("\n", max);
      if (cut < max / 2) cut = rest.lastIndexOf(" ", max);
      if (cut < max / 2) cut = max;
      pieces.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    if (rest) pieces.push(rest);
  }
  const volumes: string[] = [];
  let current = "";
  for (const p of pieces) {
    if (current && current.length + 2 + p.length > max) {
      volumes.push(current);
      current = p;
    } else current = current ? `${current}\n\n${p}` : p;
  }
  if (current) volumes.push(current);
  return volumes;
}

export interface BookSpec {
  kind: "story" | "guide";
  resref: string;
  tag: string;
  name: string;
  text: string;
}

/** Book blueprints for one text: one book, or `Volume n of N`. Resrefs are `dm_book_<kind>` / `dm_book_<kind>_<n>` (16 characters at most). */
export function bookSpecs(kind: "story" | "guide", title: string, text: string): BookSpec[] {
  const volumes = splitVolumes(text);
  const label = kind === "story" ? "The Story" : "DM Guide";
  return volumes.map((body, i) => {
    const suffix = volumes.length > 1 ? `_${i + 1}` : "";
    const vol = volumes.length > 1 ? ` (Volume ${i + 1} of ${volumes.length})` : "";
    return {
      kind,
      resref: `dm_book_${kind}${suffix}`,
      tag: `dm_book_${kind}${suffix}`,
      name: `${title}: ${label}${vol}`,
      text: volumes.length > 1 ? `${title}: ${label}${vol}\n\n${body}` : body,
    };
  });
}

/** A UTI document for one book. */
export function bookBlueprint(b: BookSpec): GffDocument {
  return {
    __data_type: "UTI ",
    AddCost: { type: "dword", value: 0 },
    BaseItem: { type: "int", value: BOOK_BASE_ITEM },
    Charges: { type: "byte", value: 0 },
    Cost: { type: "dword", value: 0 },
    Cursed: { type: "byte", value: 0 },
    Description: { type: "cexolocstring", value: { "0": b.text } },
    DescIdentified: { type: "cexolocstring", value: { "0": b.text } },
    Identified: { type: "byte", value: 1 },
    LocalizedName: { type: "cexolocstring", value: { "0": b.name } },
    ModelPart1: { type: "byte", value: 1 },
    Plot: { type: "byte", value: 1 },
    PropertiesList: { type: "list", value: [] },
    StackSize: { type: "word", value: 1 },
    Stolen: { type: "byte", value: 0 },
    Tag: { type: "cexostring", value: b.tag },
    TemplateResRef: { type: "resref", value: b.resref },
  } as unknown as GffDocument;
}
