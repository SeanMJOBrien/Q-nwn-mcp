import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldStr } from "../types/gff.js";

/**
 * Reads a dialog node/link's ActionParams or ConditionParams struct-list field
 * (EE script parameters, {Key, Value} cexostring pairs) into a plain map.
 *
 * Pure read, built from the same generic getFieldList/getFieldStr helpers every
 * other dialog field in this codebase already uses — unrelated to modify_gff_field's
 * documented refusal to *write* new struct-list fields (see CLAUDE.md); reading a
 * struct list already works fine everywhere else, including here.
 */
export function getScriptParams(node: GffObj, fieldName: "ActionParams" | "ConditionParams"): Record<string, string> {
  const out: Record<string, string> = {};
  for (const item of getFieldList(node, fieldName)) {
    const key = getFieldStr(item, "Key");
    if (key) out[key] = getFieldStr(item, "Value");
  }
  return out;
}
