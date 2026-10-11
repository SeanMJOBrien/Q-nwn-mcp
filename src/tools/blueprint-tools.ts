/**
 * Blueprint creation MCP tools.
 *
 * Tools:
 * - create_creature_blueprint: Create a new UTC blueprint from scratch or cloned from base game
 * - create_encounter_blueprint: Create a new UTE encounter blueprint
 * - create_store_blueprint: Create a new UTM store blueprint with inventory
 * - create_trap_blueprint: Create a new UTT trap trigger blueprint
 */

import { z } from "zod";
import path from "path";
import fs from "fs/promises";

import { optNumParam, toI, toF } from "../util/params.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { requireIndex, buildResmanOptions } from "../module-loader.js";
import { jsonToGff } from "../nim-tools.js";
import { resolveBlueprint, buildMinimalUte, buildMinimalUtm } from "../util/git-helpers.js";
import { setField, getFieldList, getFieldNum } from "../types/gff.js";
import type { GffDocument, GffObj } from "../types/gff.js";
import { buildCreatureBlueprint } from "../util/creature-builder.js";
import type { CreatureBuildParams } from "../util/creature-builder.js";

export {
  DEFAULT_CREATURE_SCRIPTS,
  HENCHMAN_CREATURE_SCRIPTS,
  CREATURE_SCRIPT_FIELDS,
} from "../util/creature-builder.js";

export function registerBlueprintTools(server: McpServer): void {

  // ─── create_creature_blueprint ─────────────────────────────────────────

  server.tool(
    "create_creature_blueprint",
    "Create a new creature blueprint (.utc). Optionally clone from a base game or module creature and apply overrides.",
    {
      resref: z.string().describe("New creature resref"),
      tag: z.string().describe("Creature tag"),
      name: z.string().describe("Creature display name (first name)"),
      sourceResref: z.string().optional().describe("Base creature to clone from (e.g. 'nw_dog', 'nw_oldman')"),
      appearance: optNumParam("Appearance row from appearance.2da"),
      faction: optNumParam("Faction ID"),
      cr: optNumParam("Challenge rating"),
      hp: optNumParam("Hit points"),
      race: optNumParam("Racial type (racialtypes.2da row)"),
      gender: optNumParam("Gender (0=male, 1=female)"),
      conversation: z.string().optional().describe("Dialog resref"),
      str: optNumParam("Strength"),
      dex: optNumParam("Dexterity"),
      con: optNumParam("Constitution"),
      int: optNumParam("Intelligence"),
      wis: optNumParam("Wisdom"),
      cha: optNumParam("Charisma"),
      naturalAC: optNumParam("Natural armor class"),
      classes: z.string().optional().describe("JSON array of {class, level} objects. Replaces ClassList. Class IDs: 0=Barbarian 1=Bard 2=Cleric 3=Druid 4=Fighter 5=Monk 6=Paladin 7=Ranger 8=Rogue 9=Sorcerer 10=Wizard"),
      feats: z.string().optional().describe("JSON array of feat IDs (integers). Replaces FeatList."),
      spells: z.string().optional().describe("JSON array of {spell, level} objects. Sets SpecAbilityList (spell-like abilities). spell=spells.2da row, level=caster level."),
      equipment: z.string().optional().describe("JSON object mapping slot names to item resrefs. Resolves from base game/HAKs. Slots: head, chest, boots, arms, righthand, lefthand, cloak, leftring, rightring, neck, belt, arrows, bullets, bolts"),
      inventory: z.string().optional().describe("JSON array of carried (non-equipped) items: [{resref: 'nw_waxhn001', quantity?: 1}]. Dropped on death if creature is lootable."),
      lootable: z.boolean().optional().describe("Whether the creature leaves a lootable corpse (default false). Note: an OnSpawn script can override this at runtime via SetLootable()/SetDroppableFlag() on items it creates — if loot isn't appearing in-game despite this being set, check the creature's ScriptSpawn source. validate_module's onspawn_overrides_lootable/onspawn_overrides_droppable warnings flag such an override automatically; if it's deliberate (a mook with nothing worth taking, a boss whose reward is scripted), add a LOOT_INTENTIONAL local via varTable (e.g. [{\"name\":\"LOOT_INTENTIONAL\",\"type\":\"int\",\"value\":1}]) to silence the warning."),
      henchman: z.boolean().optional().describe("Wire the stock NWN henchman/associate AI (x0_ch_hen_*) instead of the standard nw_c2_default* set, so the creature can be recruited with AddHenchman(), follows the PC, and obeys radial follow/stand-ground commands. Base-game scripts — nothing is written into the module."),
      scripts: z.string().optional().describe('JSON object overriding individual creature script fields, applied on top of the default (or henchman) set. e.g. {"ScriptSpawn":"my_spawn","ScriptDeath":"my_death"}. Valid keys: ScriptAttacked, ScriptDamaged, ScriptDeath, ScriptDialogue, ScriptDisturbed, ScriptEndRound, ScriptHeartbeat, ScriptOnBlocked, ScriptOnNotice, ScriptRested, ScriptSpawn, ScriptSpellAt, ScriptUserDefine.'),
      soundset: optNumParam("Voice set — soundset.2da row. Companions should use a TYPE 0 (PC voiceset) row matching the creature's gender; TYPE 3 NPC sets are sparse and leave the creature intermittently mute."),
      startingPackage: optNumParam("packages.2da row. Determines the picks LevelUpHenchman() makes when levelling this creature at runtime."),
      varTable: z.string().optional().describe('JSON array of local variables to set on the blueprint, merged by name: [{"name":"HENCH_LEVEL","type":"int","value":5}]. type is one of int|float|string.'),
    },
    async ({ resref, tag, name, sourceResref, appearance, faction, cr, hp, race, gender, conversation, str, dex, con, int: intStat, wis, cha, naturalAC, classes, feats, spells, equipment, inventory, lootable, henchman, scripts, soundset, startingPackage, varTable }) => {
      const index = requireIndex();

      const params: CreatureBuildParams = {
        resref, tag, name, sourceResref, conversation, lootable, henchman,
        appearance: appearance !== undefined ? toI(appearance) : undefined,
        faction: faction !== undefined ? toI(faction) : undefined,
        cr: cr !== undefined ? toF(cr) : undefined,
        hp: hp !== undefined ? toI(hp) : undefined,
        race: race !== undefined ? toI(race) : undefined,
        gender: gender !== undefined ? toI(gender) : undefined,
        str: str !== undefined ? toI(str) : undefined,
        dex: dex !== undefined ? toI(dex) : undefined,
        con: con !== undefined ? toI(con) : undefined,
        int: intStat !== undefined ? toI(intStat) : undefined,
        wis: wis !== undefined ? toI(wis) : undefined,
        cha: cha !== undefined ? toI(cha) : undefined,
        naturalAC: naturalAC !== undefined ? toI(naturalAC) : undefined,
        soundset: soundset !== undefined ? toI(soundset) : undefined,
        startingPackage: startingPackage !== undefined ? toI(startingPackage) : undefined,
        classes: classes ? JSON.parse(classes) : undefined,
        feats: feats ? JSON.parse(feats) : undefined,
        spells: spells ? JSON.parse(spells) : undefined,
        equipment: equipment ? JSON.parse(equipment) : undefined,
        inventory: inventory ? JSON.parse(inventory) : undefined,
        scripts: scripts ? JSON.parse(scripts) : undefined,
        varTable: varTable ? JSON.parse(varTable) : undefined,
      };

      const result = await buildCreatureBlueprint(index, params);

      if (!result.success) {
        return { content: [{ type: "text", text: result.error ?? "create_creature_blueprint failed." }] };
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  // ─── create_encounter_blueprint ─────────────────────────────────────────

  server.tool(
    "create_encounter_blueprint",
    "Create a new encounter blueprint (.ute) with a creature spawn list. Encounters spawn creatures when players enter their region, with configurable difficulty, respawning, and creature counts.",
    {
      resref: z.string().describe("New encounter resref"),
      tag: z.string().describe("Encounter tag"),
      name: z.string().describe("Encounter display name"),
      creatures: z.string().describe("JSON array of creature entries: [{resref: 'nw_wolf', singleSpawn?: false}]. Resrefs are UTC blueprint names."),
      sourceResref: z.string().optional().describe("Base encounter to clone from (e.g. existing UTE resref)"),
      active: z.boolean().optional().describe("Whether encounter is active (default true)"),
      difficulty: optNumParam("Difficulty index 0-4: 0=VERY_EASY, 1=EASY, 2=NORMAL, 3=HARD, 4=IMPOSSIBLE (default 1)"),
      maxCreatures: optNumParam("Max creatures spawned simultaneously (default 3)"),
      recCreatures: optNumParam("Recommended creature count (default 1)"),
      respawns: z.boolean().optional().describe("Whether encounter respawns after cleared (default false)"),
      respawnTime: optNumParam("Seconds until respawn (default 300)"),
    },
    async ({ resref, tag, name, creatures, sourceResref, active, difficulty, maxCreatures, recCreatures, respawns, respawnTime }) => {
      const index = requireIndex();
      const resrefLower = resref.toLowerCase();
      const key = `${resrefLower}.ute`;

      if (index.resources.has(key)) {
        return { content: [{ type: "text", text: `Resource already exists: ${key}` }] };
      }

      const needsResman = !!sourceResref;
      const resmanOpts = needsResman ? await buildResmanOptions(index) : undefined;

      let doc: GffDocument;

      if (sourceResref) {
        const source = await resolveBlueprint(index, sourceResref, "ute", resmanOpts!);
        if (!source) {
          return { content: [{ type: "text", text: `Source blueprint not found: ${sourceResref}.ute` }] };
        }
        doc = source;
      } else {
        doc = buildMinimalUte();
      }

      const obj = doc as GffObj;

      // Apply overrides
      setField(obj, "Tag", "cexostring", tag);
      setField(obj, "TemplateResRef", "resref", resrefLower);
      obj.LocalizedName = { type: "cexolocstring", value: { "0": name } };

      if (active !== undefined) setField(obj, "Active", "byte", active ? 1 : 0);
      if (difficulty !== undefined) setField(obj, "DifficultyIndex", "int", toI(difficulty));
      if (maxCreatures !== undefined) setField(obj, "MaxCreatures", "int", toI(maxCreatures));
      if (recCreatures !== undefined) setField(obj, "RecCreatures", "int", toI(recCreatures));
      if (respawns !== undefined) setField(obj, "Respawns", "byte", respawns ? 1 : 0);
      if (respawnTime !== undefined) {
        setField(obj, "RespawnTime", "dword", toI(respawnTime));
        setField(obj, "ResetTime", "int", toI(respawnTime));
      }

      // Creature list
      const parsed: Array<{ resref: string; singleSpawn?: boolean }> = JSON.parse(creatures);
      obj.CreatureList = {
        type: "list",
        value: parsed.map(c => ({
          __struct_id: 0,
          Appearance: { type: "int", value: 0 },
          CR: { type: "float", value: 0 },
          Resref: { type: "resref", value: c.resref.toLowerCase() },
          SingleSpawn: { type: "byte", value: c.singleSpawn ? 1 : 0 },
        })),
      };

      // Write to disk
      const filePath = path.join(index.tempDir, `${resrefLower}.ute`);
      await jsonToGff(doc, filePath);

      const stat = await fs.stat(filePath);
      index.resources.set(key, {
        resref: resrefLower,
        extension: "ute",
        filePath,
        sizeBytes: stat.size,
      });
      index.parsedGff.set(key, doc);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            created: key,
            tag,
            name,
            source: sourceResref || "scratch",
            creatureCount: parsed.length,
            sizeBytes: stat.size,
          }, null, 2),
        }],
      };
    },
  );

  // ─── create_store_blueprint ─────────────────────────────────────────

  server.tool(
    "create_store_blueprint",
    "Create a new store blueprint (.utm) with custom pricing and inventory. Place with place_store and open via script (OpenStore).",
    {
      resref: z.string().describe("New store resref"),
      tag: z.string().describe("Store tag"),
      name: z.string().describe("Store display name"),
      sourceResref: z.string().optional().describe("Base store to clone from (e.g. existing UTM resref)"),
      markUp: optNumParam("Buy markup percentage (100 = no markup, 120 = 20% markup, default 100)"),
      markDown: optNumParam("Sell markdown percentage (100 = no markdown, 80 = 20% markdown, default 100)"),
      storeGold: optNumParam("Gold on hand (-1 = unlimited, default -1)"),
      maxBuyPrice: optNumParam("Max buy price (0 = unlimited, default 0)"),
      identifyPrice: optNumParam("Identification cost (default 100)"),
      inventory: z.string().optional().describe("JSON array of inventory items: [{resref: 'nw_it_mpotion001', infinite?: true, category?: 0}]. Category: 0=Armor, 1=Weapons, 2=Potions/Scrolls, 3=Wands/Magic, 4=Misc (default 4). Items are resolved from module or base game."),
    },
    async ({ resref, tag, name, sourceResref, markUp, markDown, storeGold, maxBuyPrice, identifyPrice, inventory }) => {
      const index = requireIndex();
      const resrefLower = resref.toLowerCase();
      const key = `${resrefLower}.utm`;

      if (index.resources.has(key)) {
        return { content: [{ type: "text", text: `Resource already exists: ${key}` }] };
      }

      const needsResman = !!sourceResref || !!inventory;
      const resmanOpts = needsResman ? await buildResmanOptions(index) : undefined;

      let doc: GffDocument;

      if (sourceResref) {
        const source = await resolveBlueprint(index, sourceResref, "utm", resmanOpts!);
        if (!source) {
          return { content: [{ type: "text", text: `Source blueprint not found: ${sourceResref}.utm` }] };
        }
        doc = source;
      } else {
        doc = buildMinimalUtm();
      }

      const obj = doc as GffObj;

      // Apply overrides
      setField(obj, "Tag", "cexostring", tag);
      setField(obj, "TemplateResRef", "resref", resrefLower);
      obj.LocName = { type: "cexolocstring", value: { "0": name } };

      if (markUp !== undefined) setField(obj, "MarkUp", "int", toI(markUp));
      if (markDown !== undefined) setField(obj, "MarkDown", "int", toI(markDown));
      if (storeGold !== undefined) setField(obj, "StoreGold", "int", toI(storeGold));
      if (maxBuyPrice !== undefined) setField(obj, "MaxBuyPrice", "int", toI(maxBuyPrice));
      if (identifyPrice !== undefined) setField(obj, "IdentifyPrice", "int", toI(identifyPrice));

      // Inventory — resolve items and add to store categories
      const failedItems: string[] = [];
      let itemCount = 0;

      if (inventory) {
        const parsed: Array<{ resref: string; infinite?: boolean; category?: number }> = JSON.parse(inventory);

        // Ensure StoreList has at least 5 categories
        const storeList = getFieldList(obj, "StoreList");
        while (storeList.length < 5) {
          storeList.push({
            __struct_id: storeList.length,
            ItemList: { type: "list", value: [] },
          });
        }

        for (const item of parsed) {
          const itemDoc = await resolveBlueprint(index, item.resref, "uti", resmanOpts!);
          if (!itemDoc) {
            failedItems.push(`Item not found: ${item.resref}.uti`);
            continue;
          }

          const itemObj = itemDoc as GffObj;
          itemObj.__struct_id = 0;
          // Add Infinite flag to the embedded item
          setField(itemObj, "Infinite", "byte", item.infinite ? 1 : 0);
          delete itemObj.__data_type;

          // Determine category: explicit, or read straight from baseitems.2da's
          // own StorePanel column, or default to 4 (misc).
          //
          // StorePanel IS the real answer here — it's the exact 0-4 bucket
          // index NWN's own toolset/engine already use to sort an item into a
          // store's tabs, verified directly against a live baseitems.2da: 0
          // for every armor/shield row checked (body armor, small/large/tower
          // shield), 1 for every weapon and ammo row checked (rapier, light
          // mace, warhammer, kukri, dagger, shortsword, longbow, sling, heavy/
          // light crossbow, arrows, bolts), 2 for potions and scrolls, 3 for
          // wands, 4 for torch and healer's kit.
          //
          // This replaces a prior hand-maintained list of baseitem row
          // numbers per category, which was wrong in multiple confirmed ways:
          // row 22 (Dagger, a weapon) was listed under the "armor" bucket
          // ahead of the weapons check in the if/else-if chain, so every
          // dagger silently landed in Armor; row 35 (Heavy Flail, a weapon)
          // was listed under "potions, scrolls, healers kits"; row 42 (Kukri,
          // a weapon) wasn't listed anywhere at all and fell through to the
          // Misc default — the literal "weapon showed up in Misc" bug this
          // was rewritten to fix; rows 19/20 (Amulet, Arrow) were listed in
          // two different buckets at once, with the first branch silently
          // winning. StorePanel has none of these problems because it's not
          // a hand-maintained list at all.
          let cat = item.category;
          if (cat === undefined) {
            const baseItem = getFieldNum(itemObj, "BaseItem");
            const row = index.twodaTables.get("baseitems")?.rows.get(baseItem);
            const panel = row?.StorePanel;
            cat = panel !== undefined && panel !== "****" ? Number(panel) : 4;
          }
          if (cat > 4 || cat < 0 || Number.isNaN(cat)) cat = 4;

          const categoryObj = storeList[cat] as GffObj;
          const itemList = getFieldList(categoryObj, "ItemList");
          itemList.push(itemObj);
          itemCount++;
        }
      }

      // Write to disk
      const filePath = path.join(index.tempDir, `${resrefLower}.utm`);
      await jsonToGff(doc, filePath);

      const stat = await fs.stat(filePath);
      index.resources.set(key, {
        resref: resrefLower,
        extension: "utm",
        filePath,
        sizeBytes: stat.size,
      });
      index.parsedGff.set(key, doc);

      const result: Record<string, unknown> = {
        success: true,
        created: key,
        tag,
        name,
        source: sourceResref || "scratch",
        itemCount,
        sizeBytes: stat.size,
      };

      if (failedItems.length > 0) {
        result.inventoryWarnings = failedItems;
      }

      return {
        content: [{
          type: "text",
          text: JSON.stringify(result, null, 2),
        }],
      };
    },
  );

  // ─── create_trap_blueprint ─────────────────────────────────────────────

  server.tool(
    "create_trap_blueprint",
    "Create a new trap trigger blueprint (.utt) with trap detection/disarm DCs and a default square geometry. Optionally clone from a base game trigger and apply overrides.",
    {
      resref: z.string().describe("New trap blueprint resref"),
      tag: z.string().describe("Trap tag"),
      name: z.string().describe("Trap display name"),
      scriptOnEnter: z.string().describe("Script resref to run when PC enters the trap"),
      sourceResref: z.string().optional().describe("Base trigger to clone from (e.g. 'nw_yourfeet')"),
      detectDC: optNumParam("Trap detection DC (default 15)"),
      disarmDC: optNumParam("Trap disarm DC (default 15)"),
      oneShot: z.boolean().optional().describe("Trap fires once then disables (default true)"),
      size: optNumParam("Trigger square size in meters (default 4.0)"),
    },
    async ({ resref, tag, name, scriptOnEnter, sourceResref, detectDC, disarmDC, oneShot, size }) => {
      const index = requireIndex();
      const resrefLower = resref.toLowerCase();
      const detectN = detectDC !== undefined ? toI(detectDC) : 15;
      const disarmN = disarmDC !== undefined ? toI(disarmDC) : 15;
      const oneShotN = oneShot !== false;
      const sizeN = size !== undefined ? parseFloat(size) : 4.0;
      const halfSize = sizeN / 2;

      let doc: GffDocument;

      if (sourceResref) {
        const resmanOpts = await buildResmanOptions(index);
        const source = await resolveBlueprint(index, sourceResref, "utt", resmanOpts);
        if (!source) {
          return { content: [{ type: "text", text: `Source blueprint not found: ${sourceResref}.utt` }] };
        }
        doc = source;
      } else {
        // Build minimal UTT from scratch
        doc = {
          __data_type: "UTT ",
          AutoRemoveKey: { type: "byte", value: 0 },
          Cursor: { type: "byte", value: 0 },
          DisarmDC: { type: "byte", value: disarmN },
          Faction: { type: "dword", value: 0 },
          HighlightHeight: { type: "float", value: 0 },
          KeyName: { type: "cexostring", value: "" },
          LinkedTo: { type: "cexostring", value: "" },
          LinkedToFlags: { type: "byte", value: 0 },
          LoadScreenID: { type: "word", value: 0 },
          OnClick: { type: "resref", value: "" },
          OnDisarm: { type: "resref", value: "" },
          OnTrapTriggered: { type: "resref", value: "" },
          PortraitId: { type: "word", value: 0 },
          ScriptHeartbeat: { type: "resref", value: "" },
          ScriptOnEnter: { type: "resref", value: scriptOnEnter },
          ScriptOnExit: { type: "resref", value: "" },
          ScriptUserDefine: { type: "resref", value: "" },
          Tag: { type: "cexostring", value: tag },
          TemplateResRef: { type: "resref", value: resrefLower },
          TrapDetectDC: { type: "byte", value: detectN },
          TrapDetectable: { type: "byte", value: 1 },
          TrapDisarmable: { type: "byte", value: 1 },
          TrapFlag: { type: "byte", value: 1 },
          TrapOneShot: { type: "byte", value: oneShotN ? 1 : 0 },
          TrapType: { type: "byte", value: 0 },
          Type: { type: "int", value: 0 },
          LocalizedName: { type: "cexolocstring", value: { "0": name } },
          Description: { type: "cexolocstring", value: {} },
          // Default square geometry (4 vertices)
          Geometry: {
            type: "list",
            value: [
              { __struct_id: 3, PointX: { type: "float", value: -halfSize }, PointY: { type: "float", value: -halfSize }, PointZ: { type: "float", value: 0 } },
              { __struct_id: 3, PointX: { type: "float", value: halfSize }, PointY: { type: "float", value: -halfSize }, PointZ: { type: "float", value: 0 } },
              { __struct_id: 3, PointX: { type: "float", value: halfSize }, PointY: { type: "float", value: halfSize }, PointZ: { type: "float", value: 0 } },
              { __struct_id: 3, PointX: { type: "float", value: -halfSize }, PointY: { type: "float", value: halfSize }, PointZ: { type: "float", value: 0 } },
            ],
          },
        } as unknown as GffDocument;
      }

      const obj = doc as GffObj;
      setField(obj, "Tag", "cexostring", tag);
      setField(obj, "TemplateResRef", "resref", resrefLower);
      obj.LocalizedName = { type: "cexolocstring", value: { "0": name } };
      setField(obj, "ScriptOnEnter", "resref", scriptOnEnter);
      setField(obj, "TrapDetectDC", "byte", detectN);
      setField(obj, "DisarmDC", "byte", disarmN);
      setField(obj, "TrapDetectable", "byte", 1);
      setField(obj, "TrapDisarmable", "byte", 1);
      setField(obj, "TrapFlag", "byte", 1);
      setField(obj, "TrapOneShot", "byte", oneShotN ? 1 : 0);

      // Write to disk and register
      const filePath = path.join(index.tempDir, `${resrefLower}.utt`);
      await jsonToGff(doc, filePath);
      const stat = await fs.stat(filePath);

      const key = `${resrefLower}.utt`;
      index.resources.set(key, {
        resref: resrefLower,
        extension: "utt",
        filePath,
        sizeBytes: stat.size,
      });
      index.parsedGff.set(key, doc);

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            success: true,
            resref: resrefLower,
            tag,
            name,
            scriptOnEnter,
            detectDC: detectN,
            disarmDC: disarmN,
            oneShot: oneShotN,
            size: sizeN,
          }, null, 2),
        }],
      };
    },
  );
}
