<!-- Source: https://nwnlexicon.com/index.php?title=ActionCastSpellAtObject&amp;action=history -->

# ActionCastSpellAtObject(int, object, int, int, int, int, int)
Cast a spell at an object. 
void ActionCastSpellAtObject( int nSpell, object oTarget, int nMetaMagic = METAMAGIC_ANY, int bCheat = FALSE, int nDomainLevel = 0, int nProjectilePathType = PROJECTILE_PATH_TYPE_DEFAULT, int bInstantSpell = FALSE, int nClass = -1, int bSpontaneousCast = FALSE);
#### Parameters 

nSpell
    The SPELL_* constant matching the spell to cast 

oTarget
    The target for the spell 

nMetaMagic
    A METAMAGIC_* constant signaling what metamagic should be applied to the spell (Default: METAMAGIC_ANY) 

bCheat
    If this is TRUE, the executor of the action doesn't have to be able to cast the spell. It also changes the spell caster/save DC see remarks for details. (Default: FALSE) 

nDomainLevel
    Specifies the spell level if the spell is to be cast as a domain spell. (Default: 0) 

nProjectilePathType
    A PROJECTILE_PATH_TYPE_* constant (Default: PROJECTILE_PATH_TYPE_DEFAULT) 

bInstantSpell
    If this is TRUE, the spell is cast immediately; this allows the end-user to simulate a high-level magic user having lots of advance warning of impending trouble. See remarks for more details. (Default: FALSE) 

nClass
    If set to a CLASS_TYPE_* it will cast using that class specifically. CLASS_TYPE_INVALID will use spell abilities. (Default: -1) 

bSpontaneousCast
    If set to TRUE will attempt to cast the given spell spontaneously, ie a Cleric casting Cure Light Wounds using any level 1 slot. Needs a valid nClass set. (Default: FALSE)
#### Description
Casts nSpell at oTarget with regards to the values of the other parameters. At minimum, nSpell and oTarget must be specified for this function to work. 
#### Remarks
Object oTarget should be a valid object; creatures, placeables and doors are obvious. Items work if they are on the ground or in the casters inventory. Triggers can work as well (generally traps). 
The action user **must** be a creature or placeable only. Since triggers are not able to cast spells, if running this function on an OnEnter event from a trigger, for example, you will need to use AssignCommand or ExecuteScript to run it on a nearby placeable or creature instead. Bioware used this method to have spell-casting/arrow traps. 
Note that spells cast with this function will actually apply their damage and/or effects; for visuals only, see ActionCastFakeSpellAtObject. 
#### bCheat
How does bCheat work? What does the spell end up being? Well it uses the Innate column as the spell level for starters. 
  * Caster Level: defaults to 10 (level 1 innate) to 17 (level 9 innate); based on: floor(10, (Innate Spell Level * 2) - 1) 
    * Level 0-5: 10. Level 6: 11. Level 7: 13. Level 8: 15. Level 9: 17. Level 10: 19.
  * MetaMagic parameter is ignored/not passed through, even if it could be valid (likely since it acts like an "innate" spell where metamagic is ignored)
  * Save DC is 13 + innate level of spell, regardless of spell feats, ability scores, etc. Basically it's a spell ability cast at 16 charisma.

#### bInstantSpell
While this will make the action of casting the spell have 0 "cast time" it will still need the actor to be commandable (you can't have a reactionary casting of Stoneskin if the caster is paralyzed for instance). It also appears to respect the "combat round" timer which allows spells to start casting, so it does "queue" the spell even if "instant" until it can apply it. You can queue up several spells using this at once and all of them should fire at once. 
This should avoid attacks of opportunity and counterspell, but everything else (checks for being in armor, etc.) will apply. 
#### Casting Specific Spells / Domain Spells / Spontaneous Spells
With the advent of GetMemorizedSpellReady and similar functions you can now retrieve the state of individual spell slots or creature abilities. These can then be directly fed into parameters to correctly cast: 
  * nMetaMagic - Set to a particular metamagic - but they need to be a Sorcerer with the feat and the right slot to use up, or it be set as a readied spell.
  * nDomainLevel - This is the level of the spell if a domain spell, eg; Heal can be cast by a Healing Domain cleric at level 5, so you'd use 5 here. Use 0 otherwise.
  * nClass - If -1 it tries to find a class with the given spell. Else with a set class it checks only that class. This can be combined with nDomainLevel and bSpontaneousCast. A Sorcerer / Wizard hybrid can now choose which class spells to use. Or you can force the use of creature abilities with CLASS_TYPE_INVALID.
  * bSpontaneousCast - This can be used to force spontaneous casting on or off. Useful to manage the cases you want spontaneous spells.

#### Known Bugs
Other previously noted bugs (subspells, domain spells, spontaneous casting) should now be generally fixed or remedied by additional parameters. If not please report them on github. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. ActionCastSpellAtObject(), ActionCastSpellAtLocation() now have nClass and bSpontaneousCast parameters. 
#### Example
// The script below is placed on the OnUse Event handler for a placeable, in our// example a lever. When used it casts a Magic Missile spell at the target. In this case// the target is a nearby commoner called "TARGET2". Try this script for kicks.void main(){ object oTarget = GetObjectByTag("TARGET2"); ActionCastSpellAtObject(SPELL_MAGIC_MISSILE, oTarget, 1);}
#### See Also
functions:  | ActionCastSpellAtLocation, ActionCastFakeSpellAtObject  

constants:  | SPELL_* Constants
