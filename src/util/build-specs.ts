/**
 * Build specs: one small JSON object per thing a model (or a form) wants built.
 *
 * Each type below becomes a JSON Schema in `docs/specs/<kind>.schema.json` (`npm run specs:schema`).
 * A weak model fills in the object under schema-constrained decoding; `validateSpec` (util/spec-validate.ts)
 * answers with the failing `field`, and `specToToolCalls` turns a valid spec into the MCP tool call(s).
 * Fields carry real numbers and arrays; the conversion to the tools' string parameters is done in code.
 *
 * Every top-level property must be a parameter of the tool it maps to (guarded by build-specs.test.ts).
 */

import type { LayoutStyle } from "./layout-generator.js";

/** racialtypes.2da row: 0 Dwarf, 1 Elf, 2 Gnome, 3 Halfling, 4 Half-Elf, 5 Half-Orc, 6 Human. */
export type PcRace = 0 | 1 | 2 | 3 | 4 | 5 | 6;
/** classes.2da row: 0 Barbarian, 1 Bard, 2 Cleric, 3 Druid, 4 Fighter, 5 Monk, 6 Paladin, 7 Ranger, 8 Rogue, 9 Sorcerer, 10 Wizard. */
export type PcClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** 0 male, 1 female. */
export type Gender = 0 | 1;
export type PowerLevel = "low" | "standard" | "tougher" | "epic";

interface CharacterBase {
  /**
   * Blueprint resref, also the tag: lower-case letters, digits and underscore, at most 16 characters.
   * @pattern ^[a-z0-9_]{1,16}$
   */
  resref: string;
  /**
   * Display name shown in the game.
   * @minLength 1
   */
  name: string;
  /** Resref of the area to place the character in (must exist in the module). */
  area: string;
  /** X position in metres (10 m per tile, 0 = west edge). */
  x: number;
  /** Y position in metres (10 m per tile, 0 = south edge). */
  y: number;
  race: PcRace;
  classId: PcClass;
  /**
   * Level the character has when it spawns.
   * @minimum 1
   * @maximum 40
   * @asType integer
   */
  level: number;
  gender: Gender;
  /**
   * Compass facing in degrees: 0 north, 90 east. Default 0.
   * @minimum 0
   * @maximum 360
   */
  bearing?: number;
  /** Cleric only: exactly two domains.2da rows. */
  domains?: [number, number];
  /** Wizard only: spellschools.2da row. */
  school?: number;
  /** Default "standard"; "tougher" and "epic" are for a real boss. */
  powerLevel?: PowerLevel;
}

/** A recruitable companion (maps to `build_companion`). */
export interface CompanionSpec extends CharacterBase {
  /**
   * First-meeting line: who they are and why they are here.
   * @minLength 1
   */
  introduction: string;
  /**
   * Answer to "Tell me about yourself".
   * @minLength 1
   */
  backstory: string;
  /** Line when they agree to join. */
  accept?: string;
  /** Line when dismissed. */
  farewell?: string;
  /** Line when the party is full. */
  partyFull?: string;
}

/** A combat-capable key NPC or boss (maps to `build_key_npc`). */
export interface KeyNpcSpec extends CharacterBase {
  /** Default "hostile" (a boss). Use "commoner" for a friendly NPC. */
  faction?: "hostile" | "commoner" | "merchant" | "defender";
  /** Gear budget. Default "elite". */
  gearRole?: "pc" | "elite" | "standard" | "mook";
  /** Resref of an existing dialog to attach. */
  conversation?: string;
}

/** One line of a conversation. NPC and PC lines alternate: the children of an NPC line are PC lines and the reverse. */
export interface DialogNodeSpec {
  speaker: "npc" | "pc";
  /**
   * The spoken line.
   * @minLength 1
   */
  text: string;
  /** Script run when this line plays (resref of an existing script). */
  script?: string;
  /** Parameters for `script`. */
  params?: Record<string, string>;
  /** Script that decides whether this line is shown. */
  condition?: string;
  /** Parameters for `condition`. */
  conditionParams?: Record<string, string>;
  /** Journal tag to advance when this line plays (with `questEntry`). */
  quest?: string;
  /** Journal entry id to set for `quest`. */
  questEntry?: number;
  /** NPC line that deliberately ends the conversation (a fight starts). Normally omit: answers return to the main menu. */
  end?: boolean;
  children?: DialogNodeSpec[];
}

/** A new conversation (maps to `create_dialog`). */
export interface DialogSpec {
  /**
   * Dialog resref: lower-case letters, digits and underscore, at most 16 characters.
   * @pattern ^[a-z0-9_]{1,16}$
   */
  resref: string;
  /**
   * Root lines. Each must be an NPC line; the first is the greeting whose PC children are the main menu.
   * @minItems 1
   */
  nodes: DialogNodeSpec[];
  /** Default true: every answer returns to the main menu and a leave option is added. */
  returnToHub?: boolean;
}

export interface JournalEntrySpec {
  /**
   * Entry id used by scripts; ascending, e.g. 10, 20, 30.
   * @minimum 1
   * @asType integer
   */
  id: number;
  /**
   * Text the player reads in the journal at this stage.
   * @minLength 1
   */
  text: string;
  /** True on the entry that completes the quest. */
  end?: boolean;
}

/**
 * A plain journal quest: a category and its entries (maps to `add_journal_quest` + `add_journal_entry`).
 * For a quest with dialog lines, stage wiring and rewards use the quest spec (`build_quest`) instead.
 */
export interface JournalSpec {
  /**
   * Quest tag used by scripts: lower-case letters, digits and underscore.
   * @pattern ^[a-z0-9_]{1,32}$
   */
  tag: string;
  /**
   * Quest name shown in the journal.
   * @minLength 1
   */
  name: string;
  /**
   * XP for completing the quest. Default 0.
   * @minimum 0
   * @asType integer
   */
  xp?: number;
  /**
   * The stages, in order; the last one normally has `end: true`.
   * @minItems 1
   */
  entries: JournalEntrySpec[];
}

/** A generated area layout (maps to `adventure_generate_layout`; pass its result to `adventure_apply_layout`). */
export interface AreaLayoutSpec {
  /** Tileset resref, e.g. "ttf01" forest, "tdc01" crypt, "ttr01" rural (see `list_tilesets`). */
  tileset: string;
  /**
   * Width in tiles. 9 fits one room, 14 fits several (see `suggest_area_size`).
   * @minimum 8
   * @maximum 32
   * @asType integer
   */
  width: number;
  /**
   * Height in tiles.
   * @minimum 8
   * @maximum 32
   * @asType integer
   */
  height: number;
  style: LayoutStyle;
  /**
   * Number of exits to generate. Default 1.
   * @minimum 0
   * @maximum 4
   * @asType integer
   */
  transitionCount?: number;
  /** Which edges the exits sit on. */
  transitionDirections?: Array<"north" | "south" | "east" | "west">;
}
