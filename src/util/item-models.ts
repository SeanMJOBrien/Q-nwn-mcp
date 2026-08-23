/**
 * Item model-part defaults.
 *
 * NWN renders an item from ModelPart1..3, indexed per base item. A part left at
 * 0 has no model: a composite weapon with zero parts renders as a shapeless blob
 * in the creature's hand (the "flail that looks like a bag on their arm" bug).
 *
 * Generated gear uses the base item's default (first) model variant. Randomised
 * appearance is deliberately out of scope for now — see TODO below.
 */

import type { GffObj } from "../types/gff.js";
import { getFieldNum, setField } from "../types/gff.js";
import type { ModuleIndex } from "../types/module.js";

/** baseitems.2da ModelType column values. */
export const MODEL_TYPE = {
  /** One model part. */
  SIMPLE: 0,
  /** Layered (cloaks, some misc). */
  LAYERED: 1,
  /** Weapons — built from 3 parts, all of which must be set. */
  COMPOSITE: 2,
  /** Armour — parts come from the creature's body, not the item. */
  ARMOR: 3,
} as const;

/** First (default) model variant. NWN model part indices are 1-based. */
const DEFAULT_MODEL_PART = 1;

/**
 * Ensure an item's model parts are populated for its base item's model type.
 *
 * Only fills parts that are absent or 0 — an explicitly chosen model is never
 * overwritten. Returns the field names it defaulted, for reporting.
 *
 * TODO: randomised gear appearance. Once we have per-base-item model-variant
 * counts (parsed from the model resource names in the resman stack, since
 * baseitems.2da does not carry a variant count), this can pick a random valid
 * variant per part instead of always the first, so generated NPCs stop sharing
 * identical weapons. Until then, "default model" is the correct behaviour:
 * a wrong variant index renders as nothing at all.
 */
export function applyDefaultItemModels(obj: GffObj, index: ModuleIndex): string[] {
  const baseItem = getFieldNum(obj, "BaseItem");
  const row = index.twodaTables.get("baseitems")?.rows.get(baseItem);

  // Without baseitems.2da we cannot know the model type. Setting ModelPart1 is
  // safe for every type, so do at least that much.
  const modelType = row ? Number(row.ModelType) : MODEL_TYPE.SIMPLE;

  const parts = modelType === MODEL_TYPE.COMPOSITE ? ["ModelPart1", "ModelPart2", "ModelPart3"] : ["ModelPart1"];

  const defaulted: string[] = [];
  for (const field of parts) {
    const current = obj[field] === undefined ? 0 : getFieldNum(obj, field);
    if (current === 0) {
      setField(obj, field, "byte", DEFAULT_MODEL_PART);
      defaulted.push(field);
    }
  }
  return defaulted;
}
