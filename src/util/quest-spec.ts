/**
 * The quest spec build_quest accepts, and its normalisation: templates expanded, stages numbered, `from` and endings
 * defaulted, rewards sized. Pure (no module access) except through the `exists` callback used for tag-convention
 * auto-wiring. See docs/quest-system.md.
 */

export const STAGE_KINDS = [
  "talk",
  "return",
  "kill",
  "pickup",
  "explore",
  "trigger",
  "use",
  "search",
  "deliver",
  "rescue",
  "escort",
  "custom",
] as const;
export type StageKind = (typeof STAGE_KINDS)[number];

export const TEMPLATES = [
  "fetch",
  "kill",
  "deliver",
  "rescue",
  "escort",
  "investigate",
  "bounty",
  "persuade-or-fight",
] as const;
export type TemplateName = (typeof TEMPLATES)[number];

export interface StageCheck {
  /** One of skill, ability (str/dex/con/int/wis/cha) or save (fort/reflex/will); a search stage takes a skill only. */
  skill?: string;
  ability?: string;
  save?: string;
  /** A number, or leave out and give `difficulty`. */
  dc?: number;
  /** easy (10), moderate (15), hard (20) or veryhard (25), instead of dc. */
  difficulty?: "easy" | "moderate" | "hard" | "very hard" | "veryhard";
  /** What a failed check leads to: "fight" (the NPC turns hostile; a kill stage can still finish it), "end" (nothing). */
  else?: "fight" | "end";
  /** PC line offering the check. */
  prompt?: string;
  pass?: string;
  fail?: string;
  /** search: attempts per player (default 2). */
  tries?: number;
  /** search: succeed anyway once a player's tries are spent, so a required clue can't block the quest (default true). */
  assured?: boolean;
}

/** search: a second check rolled on success by whoever in the party is best at it (e.g. Lore on a found letter's seal). */
export interface StageExamine {
  skill: string;
  dc: number;
  /** Module local string set to "1" on a pass (readable with q_chk var=). */
  var?: string;
  pass?: string;
  fail?: string;
}

export interface StageReward {
  /** Flat XP per player (exact; used by /adventure-rewards), in addition to or instead of a tier. */
  xp?: number;
  xp_tier?: number;
  xp_level?: number;
  gold?: number;
  item?: string;
}

/**
 * A creature that appears when this stage advances the quest (stage 1 = when the quest is accepted): a bounty target in an
 * area the party has already explored, an ambush, guards, the next part of a multi-part encounter. On a dialog stage it rides
 * on the q_act line; on a kill/pickup/explore/trigger/use/search stage it is written as the slot's questK_spawn locals.
 * A kill stage whose target is this resref or tag needs no placed copy.
 */
export interface StageSpawn {
  // Appears when the stage advances. A kill/explore/trigger/use/search stage with a spawn is how an encounter chain is built:
  // kill the lookout (stage 2) and the main force appears at its waypoint (spawn on stage 2), then kill it (stage 3).
  /** Creature blueprint resref. */
  resref: string;
  /** Instance tag (default: the blueprint's own). Lets several quests reuse one blueprint. */
  tag?: string;
  /** How many (default 1). */
  count?: number;
  /** Tag of an existing waypoint to appear at. */
  at?: string;
  /** Otherwise: an area (and optionally x,y) where the builder places a waypoint itself, on walkable ground. */
  area?: string;
  x?: number;
  y?: number;
  /** Hostile faction (default true). */
  hostile?: boolean;
}

/** A stage as the model writes it (only `do` and `journal` are needed for most kinds). */
export interface StageInput {
  do?: StageKind;
  journal?: string;
  n?: number;
  from?: number;
  end?: boolean | "fail";
  /** NPC who runs a talk/deliver stage (tag or blueprint resref); default the giver. */
  to?: string;
  /** Kill target, captive, escorted NPC, or placeable to use (tag or blueprint resref). */
  target?: string;
  /** Item: picked up (pickup) or handed over (deliver), by resref; `itemName` creates a new quest item. */
  item?: string;
  itemName?: string;
  count?: number;
  /** Where a pickup item is: in this creature's inventory (it drops on death) or this placeable's. */
  from_creature?: string;
  in?: string;
  /** Area for explore/trigger stages, for placing an unplaced kill target, and an escort's destination. */
  area?: string;
  x?: number;
  y?: number;
  radius?: number;
  check?: StageCheck;
  examine?: StageExamine;
  reward?: StageReward;
  leave?: boolean;
  /** deliver: the NPC looks at the item but the party keeps it. */
  keep?: boolean;
  /** Script run on the advancing object (the NPC) when the stage advances (questK_self_script). */
  script?: string;
  /** search: text when the placeable is used before the quest reaches this stage. */
  none?: string;
  /**
   * search: an optional clue, not a numbered stage — no journal entry, doesn't move the quest on; available once the quest
   * is at or past `from` (default 1); pays its `reward` to the party once.
   */
  optional?: boolean;
  /** The NPC running this talk stage joins the speaker's party as a henchman when it advances. */
  join?: boolean;
  /** Talk stage: only offered while this companion (tag) is in the party. */
  companion?: string;
  /** Talk stage: this companion (tag) leaves the party when the stage advances and goes to the NPC. */
  dismiss?: string;
  /** Stage 1: the giver walks up to the first player it sees and starts its conversation; a string is a bark as it goes. */
  approach?: boolean | string;
  /** Creature(s) that appear when this stage's line advances the quest. */
  spawn?: StageSpawn;
  /** Dialog lines (all optional; defaults are used). */
  offer?: string;
  accept?: string;
  acceptReply?: string;
  decline?: string;
  declineReply?: string;
  text?: string;
  reply?: string;
  reminder?: string;
  missing?: string;
  plea?: string;
  arrive?: string;
}

export interface QuestInput {
  name: string;
  tag?: string;
  giver?: string;
  level?: number;
  priority?: number;
  template?: TemplateName;
  reward?: StageReward;
  /** Template fields. */
  target?: string;
  item?: string;
  itemName?: string;
  to?: string;
  area?: string;
  captive?: string;
  npc?: string;
  dest?: { area: string; x?: number; y?: number; radius?: number };
  clues?: Array<{ use: string; journal?: string }>;
  check?: StageCheck;
  journal?: string[];
  /** Thank-you line for the end stage. */
  thanks?: string;
  stages?: StageInput[];
  /** Template shortcut: spawn this when the quest is accepted (e.g. the bounty target). */
  spawn?: StageSpawn;
  autowire?: boolean;
}

export interface Stage extends StageInput {
  do: StageKind;
  journal: string;
  n: number;
  from: number;
  end: boolean | "fail";
}

export interface QuestSpec {
  name: string;
  tag: string;
  giver: string;
  level: number;
  priority: number;
  stages: Stage[];
  bounty: boolean;
  notes: string[];
}

export class QuestSpecError extends Error {}

/** q_<slug of name>, at most 27 characters (TFN's limit, safe for every journal and variable use). */
export function tagFromName(name: string, prefix = "q_"): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${prefix}${slug}`.slice(0, 27).replace(/_+$/, "");
}

export const DIFFICULTY_DC: Record<string, number> = { easy: 10, moderate: 15, hard: 20, veryhard: 25, "very hard": 25 };

/** The numeric DC of a check: `dc`, else the named difficulty. */
export function checkDc(c: StageCheck): number {
  return c.dc ?? DIFFICULTY_DC[c.difficulty ?? ""] ?? 15;
}

function validateCheck(c: StageCheck, n: number, skillOnly: boolean): void {
  const kinds = [c.skill, c.ability, c.save].filter(Boolean).length;
  if (kinds !== 1) throw new QuestSpecError(`stage ${n}: a check needs exactly one of skill, ability or save`);
  if (skillOnly && !c.skill) throw new QuestSpecError(`stage ${n}: a search check is a skill check`);
  if (c.dc === undefined && !c.difficulty) throw new QuestSpecError(`stage ${n}: a check needs dc or difficulty`);
}

/** Dialog stages put the spawn on their q_act line; event stages put it on the slot's locals and QuestAdvance runs it. */
const SPAWN_KINDS: StageKind[] = ["talk", "return", "deliver", "rescue", "kill", "pickup", "explore", "trigger", "use", "search"];

function validateSpawn(sp: StageSpawn, n: number, kind: StageKind): void {
  if (!SPAWN_KINDS.includes(kind))
    throw new QuestSpecError(`stage ${n} (${kind}): spawn works on ${SPAWN_KINDS.join(", ")} stages (not escort or custom)`);
  if (!sp.resref) throw new QuestSpecError(`stage ${n}: spawn needs a resref`);
  if (!sp.at && !sp.area) throw new QuestSpecError(`stage ${n}: spawn needs an at (waypoint tag) or an area to place one in`);
  if (sp.count !== undefined && (!Number.isInteger(sp.count) || sp.count < 1 || sp.count > 8))
    throw new QuestSpecError(`stage ${n}: spawn count must be a whole number from 1 to 8`);
}

const TAG_RE = /^[a-z][a-z0-9_]*$/;

function expandTemplate(q: QuestInput): StageInput[] {
  const j = (i: number, fallback: string) => q.journal?.[i] ?? fallback;
  const giver = q.giver ?? "the quest giver";
  switch (q.template) {
    case "fetch":
      return [
        { do: "talk", journal: j(0, `I agreed to find something for ${giver}.`) },
        { do: "pickup", item: q.item, itemName: q.itemName, area: q.area, journal: j(1, "I found it.") },
        { do: "deliver", item: q.item, journal: j(2, "I handed it over."), text: q.thanks },
      ];
    case "kill":
    case "bounty":
      return [
        { do: "talk", journal: j(0, `I agreed to deal with a threat for ${giver}.`) },
        { do: "kill", target: q.target, area: q.area, journal: j(1, "The deed is done.") },
        { do: "return", journal: j(2, "I collected my reward."), text: q.thanks },
      ];
    case "deliver":
      return [
        {
          do: "talk",
          journal: j(0, `I agreed to carry a package for ${giver}.`),
          reward: { item: q.item },
        },
        { do: "deliver", to: q.to, item: q.item, journal: j(1, "I delivered the package."), text: q.thanks },
      ];
    case "rescue":
      return [
        { do: "talk", journal: j(0, `I agreed to rescue someone for ${giver}.`) },
        { do: "rescue", target: q.captive ?? q.target, journal: j(1, "I set the captive free.") },
        { do: "return", journal: j(2, "I reported the rescue."), text: q.thanks },
      ];
    case "escort":
      return [
        { do: "talk", journal: j(0, "I agreed to escort someone to safety.") },
        {
          do: "escort",
          target: q.npc ?? q.target ?? q.giver,
          area: q.dest?.area,
          x: q.dest?.x,
          y: q.dest?.y,
          radius: q.dest?.radius,
          journal: j(1, "We arrived safely."),
        },
      ];
    case "investigate": {
      const clues = q.clues ?? [];
      if (clues.length === 0)
        throw new QuestSpecError("template investigate needs clues: [{use: <placeable tag>, journal}]");
      return [
        { do: "talk", journal: j(0, `I agreed to look into a matter for ${giver}.`) },
        ...clues.map((c, i) => ({
          do: "use" as const,
          target: c.use,
          journal: c.journal ?? j(i + 1, "I found a clue."),
        })),
        { do: "return", journal: j(clues.length + 1, "I reported what I found."), text: q.thanks },
      ];
    }
    case "persuade-or-fight":
      return [
        { do: "talk", journal: j(0, `I agreed to deal with someone for ${giver}.`) },
        {
          do: "talk",
          to: q.target,
          check: q.check ?? { skill: "persuade", dc: 15, else: "fight" },
          journal: j(1, "The matter was settled without bloodshed."),
        },
        { do: "kill", target: q.target, n: 2, journal: j(2, "The matter was settled by the sword.") },
        { do: "return", journal: j(3, "I reported back."), text: q.thanks },
      ];
    default:
      throw new QuestSpecError(`unknown template ${q.template}; use one of ${TEMPLATES.join(", ")}`);
  }
}

/**
 * Normalise a quest spec. `exists(tag)` answers whether an object with that tag is placed in the module (for the
 * tag-convention auto-wiring: <tag>_giver, <tag>_target, <tag>_captive, <tag>_npc, <tag>_item).
 */
export function normalizeQuestSpec(input: QuestInput, exists: (tag: string) => boolean = () => false): QuestSpec {
  if (!input || typeof input !== "object") throw new QuestSpecError("spec must be an object");
  const name = (input.name ?? "").trim();
  if (!name) throw new QuestSpecError("a quest needs a name");
  const isBounty = input.template === "bounty";
  const tag = (input.tag ?? tagFromName(name, isBounty ? "b_" : "q_")).toLowerCase();
  if (!TAG_RE.test(tag) || tag.length > 27)
    throw new QuestSpecError(`tag ${tag} must be lowercase letters, digits and _ (at most 27)`);
  const notes: string[] = [];

  // Tag-convention auto-wiring: fill only what is missing.
  const q: QuestInput = { ...input };
  if (q.autowire !== false) {
    const wire = (field: "giver" | "target" | "captive" | "npc" | "item", role: string) => {
      if (!q[field] && exists(`${tag}_${role}`)) {
        (q as unknown as Record<string, unknown>)[field] = `${tag}_${role}`;
        notes.push(`${field} found by tag convention: ${tag}_${role}`);
      }
    };
    wire("giver", "giver");
    wire("target", "target");
    wire("captive", "captive");
    wire("npc", "npc");
    wire("item", "item");
  }
  if (!q.giver) throw new QuestSpecError("a quest needs a giver (an NPC tag or blueprint resref)");

  let stagesIn: StageInput[];
  if (q.template) {
    stagesIn = expandTemplate(q);
    if (q.stages?.length) notes.push("stages ignored: a template builds its own (give journal lines with `journal`)");
  } else {
    stagesIn = q.stages ?? [];
  }
  if (stagesIn.length === 0) throw new QuestSpecError("a quest needs stages (or a template)");

  if (q.spawn) {
    const [first, ...rest] = stagesIn;
    stagesIn = [{ ...first, spawn: first.spawn ?? q.spawn }, ...rest];
  }

  // Stage 1 is always accepting the quest from the giver.
  if ((stagesIn[0].do ?? "talk") !== "talk" || (stagesIn[0].to && stagesIn[0].to !== q.giver)) {
    stagesIn = [{ do: "talk", journal: `I agreed to help: ${name}.` }, ...stagesIn];
    notes.push("added stage 1 (accepting the quest from the giver)");
  }

  const stages: Stage[] = [];
  let next = 1;
  for (const s of stagesIn) {
    const kind = (s.do ?? "talk") as StageKind;
    if (!STAGE_KINDS.includes(kind))
      throw new QuestSpecError(`unknown stage kind ${s.do}; use one of ${STAGE_KINDS.join(", ")}`);
    if (s.optional) {
      if (kind !== "search") throw new QuestSpecError("only a search stage can be optional");
      const min = s.from ?? 1;
      stages.push({ ...s, do: kind, n: min, from: min - 1, journal: (s.journal ?? "").trim(), end: false });
      continue;
    }
    const n = s.n ?? next;
    if (!Number.isInteger(n) || n < 1)
      throw new QuestSpecError(`stage numbers must be whole numbers from 1 (got ${s.n})`);
    if (s.n === undefined || s.n >= next) next = n + 1;
    const journal = (s.journal ?? "").trim();
    if (!journal) throw new QuestSpecError(`stage ${n} (${kind}) needs a journal line`);
    if (s.spawn) validateSpawn(s.spawn, n, kind);
    stages.push({ ...s, do: kind, n, from: s.from ?? n - 1, journal, end: s.end ?? false });
  }

  // A new quest item (itemName, no item) gets its resref now, so later stages (deliver) refer to the same item.
  for (const s of stages) if (s.itemName && !s.item) s.item = `${tag.slice(0, 11)}_i${s.n}`;

  // Requirements per kind.
  for (const s of stages) {
    const need = (field: keyof StageInput, what: string) => {
      if (s[field] === undefined || s[field] === "") throw new QuestSpecError(`stage ${s.n} (${s.do}) needs ${what}`);
    };
    if (s.do === "kill" || s.do === "rescue" || s.do === "escort" || s.do === "use" || s.do === "search")
      need("target", "a target");
    if (s.do === "search" && !s.check) throw new QuestSpecError(`stage ${s.n} (search) needs a check {skill, dc}`);
    if (s.check) validateCheck(s.check, s.n, s.do === "search");
    if (s.do === "pickup" && !s.item && !s.itemName)
      throw new QuestSpecError(`stage ${s.n} (pickup) needs an item or itemName`);
    if (s.do === "explore" || s.do === "trigger") need("area", "an area");
    if (s.do === "trigger" && (s.x === undefined || s.y === undefined))
      throw new QuestSpecError(`stage ${s.n} (trigger) needs x and y`);
    if (s.do === "deliver" && !s.item && !s.itemName) {
      // Deliver what an earlier stage handed out or picked up.
      const earlier = [...stages].reverse().find((e) => e.n < s.n && (e.reward?.item || e.item || e.itemName));
      if (!earlier)
        throw new QuestSpecError(`stage ${s.n} (deliver) needs an item (or an earlier stage that gives one)`);
      s.item = earlier.item ?? earlier.reward?.item;
      s.itemName = s.item ? undefined : earlier.itemName;
    }
    if (s.do === "return") s.to = q.giver;
  }

  // Endings: explicit, else every stage with the highest number (optional clues never end a quest).
  const maxN = Math.max(...stages.filter((s) => !s.optional).map((s) => s.n));
  if (!stages.some((s) => s.end)) for (const s of stages) if (s.n === maxN && !s.optional) s.end = true;

  // Rewards: the top-level reward (or a sized default) on success endings that have none.
  const level = Math.max(1, Math.min(40, Math.round(input.level ?? 3)));
  if (input.level === undefined) notes.push("level not given: rewards sized for level 3");
  const tier = Math.min(4, 1 + Math.floor((maxN - 1) / 2));
  for (const s of stages) {
    if (s.end === true && !s.reward) s.reward = input.reward ?? { xp_tier: tier, xp_level: level, gold: 25 * level };
    if (s.reward?.xp_tier && !s.reward.xp_level) s.reward.xp_level = level;
  }
  if (isBounty) notes.push("bounty: repeatable 6 hours (module heartbeats) after completion");

  const priority = input.priority ?? (isBounty ? 0 : 2);
  return { name, tag, giver: q.giver, level, priority, stages, bounty: isBounty, notes };
}
