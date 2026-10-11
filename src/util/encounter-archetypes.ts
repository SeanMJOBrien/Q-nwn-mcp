/**
 * Archetype library: a thematic role name ("necromancer") -> a concrete
 * mechanical build recipe. See docs/encounter-composer-spec.md (F1) for the
 * full feature this belongs to.
 *
 * NWN has no literal "Necromancer"/"Bandit Captain"/etc. class — a role name
 * has to resolve to a real class/level/feat/spell/equipment combination
 * before any existing tool (`build_npc_stat_block`, `equip_npc_by_role`,
 * `create_random_abilities_system`) can actually build it. This table is
 * that mapping, grown one verified entry at a time — same convention as
 * `CLASS_FEATS`/`RACIAL_FEATS` (spec-check-script.ts) and
 * `CLASS_WEAPON_PREFERENCES` (npc-weapon-preferences.ts): never a guessed
 * full catalog, only entries whose class/feat/spell choices are backed by
 * real, checked 2DA data or this project's own already-confirmed findings.
 *
 * `levelForCR` reuses `estimateCRFromLevel`'s already-verified CR ~= level
 * correlation (505 real creatures, every base class within +/-0.3) in
 * reverse — a caster archetype's level IS its CR, same as any other class.
 *
 * `naturalSupport` names the kind of minion/escort this archetype's F3
 * (support-roster chooser, not yet built) should search for — a label, not
 * a search implementation yet.
 *
 * `spellThemeKeywords`/`equipmentThemeKeywords` are NOT consumed by any tool
 * yet. `create_random_abilities_system` has no school/theme filter and
 * `equip_npc_by_role` has no theme param — these fields exist so a future
 * change to either tool has a real place to read a theme from, without this
 * table needing to change shape again. Don't infer more behavior than this
 * from their presence.
 */

export type NaturalSupport = "undead_minion" | null;

export interface ArchetypeRecipe {
  /** Lookup key (lowercase). */
  name: string;
  /** classes.2da row — see create_creature_blueprint's own class ID list. */
  classId: number;
  /** A target CR maps directly to a class level for a pure single-class caster archetype. */
  levelForCR: (targetCR: number) => number;
  naturalSupport: NaturalSupport;
  /** Not yet consumed by any tool — see module doc comment. */
  spellThemeKeywords: string[];
  /** Not yet consumed by any tool — see module doc comment. */
  equipmentThemeKeywords: string[];
  /**
   * Free-text caveat surfaced to the caller (e.g. by F5) rather than buried
   * only in source comments — a real, already-confirmed limitation that
   * changes what this archetype can actually deliver.
   */
  caveat?: string;
}

const CLASS_TYPE_WIZARD = 10;

/**
 * Starter table — one real entry, the user's own stated example. Grow this
 * the same way the rest of this project grows curated tables: a real need,
 * backed by checked data, not a speculative full catalog.
 */
export const ARCHETYPES: Record<string, ArchetypeRecipe> = {
  necromancer: {
    name: "necromancer",
    classId: CLASS_TYPE_WIZARD,
    levelForCR: (targetCR) => targetCR,
    naturalSupport: "undead_minion",
    spellThemeKeywords: ["death", "undead", "negative", "animate"],
    equipmentThemeKeywords: ["robe", "staff", "dagger"],
    // Confirmed in this project's own prior live-engine investigation
    // (CLAUDE.md, "Random caster abilities" / "Tier 1 real-runtime
    // findings"): create_random_abilities_system's Tier 1 path (which a
    // Wizard uses) is capped at cantrips + 1st-level spells for Wizard
    // specifically — Cleric/Druid/Paladin/Ranger get a full multi-level
    // random spellbook, but Wizard's level-2+ slots read back empty from
    // the engine even after a real LevelUpHenchman() pass, and three
    // separate NWNX investigation attempts failed to find a fix. A
    // necromancer built this way will only ever randomize cantrips and
    // 1st-level spells at runtime — real, not a guess, and worth surfacing
    // to a caller rather than silently shipping a disappointing caster.
    caveat:
      "Wizard (this archetype's class) is capped at cantrips + 1st-level spells by " +
      "create_random_abilities_system's Tier 1 path — a confirmed, unresolved engine " +
      "limitation (see CLAUDE.md's Random caster abilities section), not a guess.",
  },
};

/** Look up an archetype by name, case-insensitive. Returns undefined for anything not yet in the table. */
export function getArchetype(name: string): ArchetypeRecipe | undefined {
  return ARCHETYPES[name.trim().toLowerCase()];
}
