/**
 * Is a placed placeable a container? place_placeable clears HasInventory on every placed prop (base-game containers
 * carry treasure scripts); add_items_to_container turns it on again with the first item. So an empty chest has
 * HasInventory 0, and the checklist and area cards would not see it. A placeable counts as a container when it has an
 * inventory, holds items, or its blueprint or tag names a container.
 */

import type { GffObj } from "../types/gff.js";
import { getFieldList, getFieldNum, getFieldStr } from "../types/gff.js";

const CONTAINER_WORDS = /chest|barrel|crate|sack|coffer|urn|sarcoph|coffin|cabinet|drawer|wardrobe|footlocker|trunk|strongbox|treasure|lootbag|bag|remains|corpse|box/i;

export function isContainerPlaceable(p: GffObj): boolean {
  if (getFieldNum(p, "HasInventory") === 1 || getFieldList(p, "ItemList").length > 0) return true;
  return CONTAINER_WORDS.test(`${getFieldStr(p, "TemplateResRef")} ${getFieldStr(p, "Tag")}`);
}
