<!-- Source: https://nwnlexicon.com/index.php/GetIsImmune -->

# GetIsImmune(object, int, object)
Determines whether a creature has a specific immunity. 
int GetIsImmune( object oCreature, int nImmunityType, object oVersus = OBJECT_INVALID);
#### Parameters 

oCreature
    The creature to check immunity for. 

nImmunityType
    A  IMMUNITY_TYPE_*  constant. Any other number returns FALSE. 

oVersus
    If this is specified, then we also check for the race and alignment of oVersus. (Default: OBJECT_INVALID)
#### Description
Returns TRUE if oCreature has immunity of type nImmunity versus oVersus, otherwise FALSE. If nImmunityType is < 0 or > 32 it will return FALSE. 
oVersus should only change what is returned if an effect is applied with VersusAlignmentEffect(), such as Protection from Evil, or VersusRacialTypeEffect(), such as Purple Dragon Oath of Wrath. 
#### Remarks
You can test spell effects (EffectImmunity) item properties (ItemPropertyImmunityMisc) and feat providing immunity with one handy function. 
Some immunities encompass others - such as IMMUNITY_MIND_SPELLS covering things like Stun, Daze, etc. as well (even when not from a "spell"). However the opposite isn't true, you can't test IMMUNITY_TYPE_DAZED by itself, you'd need to test IMMUNITY_TYPE_MIND_SPELLS as well. 
There is notably no IMMUNITY_TYPE_PETRIFICATION. The "immunity" to such is coded in x0_i0_spells function "spellsIsImmuneToPetrification", which is frustratingly missing some default appearances and has no setting available to set on immune creatures, although it does check for immunity to the particular spell being cast as well. 
The IMMUNITY_TYPE_TRAP appears to be that it simply won't trigger traps, full stop, when clicked on / walked over. But if it does somehow get affected - eg; by an AOE trap - and a SAVING_THROW_TYPE_TRAP is used the functions WillSave, FortitudeSave and ReflexSave should return 2 (Immune). 
Note IMMUNITY_TYPE_DEATH_MAGIC only applies to spell attacks; it a spell script is being fired with a particular UserType setting. Outside of spell scripts you have to test this manually to check for immunity since death effects just...work. You can bypass this immunity in spell scripts too; see EffectDeath. 
In the engine the function will first iterate over the effects on the creature set by spells, and a list of effects set by items as they are equipped (including creature hides where many monster immunities go). 
Then if a matching immunity is not found, it will check for these feats that have hardcoded immunities: 
Feat  | Immunities provided   

FEAT_DEATHLESS_MASTERY | IMMUNITY_TYPE_CRITICAL_HITS   
FEAT_IMMUNITY_TO_PARALYSIS | IMMUNITY_TYPE_PARALYSIS   
FEAT_TOUGH_AS_BONE | IMMUNITY_TYPE_STUN   
FEAT_IMMUNITY_TO_SLEEP | IMMUNITY_TYPE_SLEEP   
FEAT_VENOM_IMMUNITY | IMMUNITY_TYPE_POISON   
FEAT_EPIC_PERFECT_HEALTH | IMMUNITY_TYPE_POISON and IMMUNITY_TYPE_DISEASE   
FEAT_DIAMOND_BODY | IMMUNITY_TYPE_POISON   
FEAT_DIVINE_HEALTH | IMMUNITY_TYPE_DISEASE   
FEAT_PURITY_OF_BODY | IMMUNITY_TYPE_DISEASE   
FEAT_PERFECT_SELF | IMMUNITY_TYPE_MIND_SPELLS   
FEAT_AURA_OF_COURAGE | IMMUNITY_TYPE_FEAR   
#### Version
1.22 
#### See Also
functions:  |  EffectImmunity ItemPropertyImmunityMisc  

constants:  |   IMMUNITY_TYPE_* Constants
