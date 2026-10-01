<!-- Source: https://nwnlexicon.com/index.php/FortitudeSave -->

# FortitudeSave(object, int, int, object)
Returns the result of a Fortitude Save check. 
int FortitudeSave( object oCreature, int nDC, SAVING_THROW_TYPE_NONE, object oSaveVersus = OBJECT_SELF);
#### Parameters 

oCreature
    The creature that needs to roll a saving throw. 

nDC
    The difficulty check of the saving throw. 

nSaveType
    The saving throw type the save is against (default:  SAVING_THROW_TYPE_NONE ) 

oSaveVersus
    The source cause for the saving throw. (Default: OBJECT_SELF)
#### Description
Does a Fortitude Save check for the given DC 
Returns 0 if the saving throw roll failed, 1 if the saving throw roll succeeded and 2 if the target was immune to the save type specified. 
Note: If used within an Area of Effect Object Script (OnEnter, OnExit, OnHeartbeat), you MUST pass GetAreaOfEffectCreator() into oSaveVersus!! 
#### Remarks
If called from a spell script with a valid UserType, it applies an invisible "SAVING_THROW_TYPE_SPELLS" for the purposes of this saving throw type (and Spellcraft bonuses vs. spells/Arcane Defence). 
The "the target was immune to the save type specified" portion only occurs for these saving throw types, with the given immunity type checked: 
  * SAVING_THROW_TYPE_MIND_SPELLS - IMMUNITY_TYPE_MIND_SPELLS
  * SAVING_THROW_TYPE_POISON - IMMUNITY_TYPE_POISON
  * SAVING_THROW_TYPE_DISEASE - IMMUNITY_TYPE_DISEASE
  * SAVING_THROW_TYPE_FEAR - IMMUNITY_TYPE_FEAR
  * SAVING_THROW_TYPE_TRAP - IMMUNITY_TYPE_TRAP

Note that SAVING_THROW_TYPE_DEATH you would think is included but is not; this helps Bioware's own spells like Weird were the immunity shouldn't apply (but you can still get +Save vs. Death bonuses to apply). 
In these cases of immunity being found, no save attempt is even made and no feedback given, it simply returns 2. 
The way Bioware made things is that MySavingThrow returns 0 in the case this function returns 2, getting the effect that nominally is related to the given type to apply thus sending some feedback "[TARGET] : Immune to [THING]." instead of it being done at the saving throw level. 
However this does sometimes mess up if thee saving throw type is unrelated to the final effect applied, for instance doing a saving throw vs. Fear but only applying a EffectAttackDecrease effect means those immune to fear always get affected. You can work around this with GetIsImmune checks and doing your own feedback. 
#### Example
// Example 1 - Simple use.nSaveResult = FortitudeSave(oTarget, nDifficultyCheck);// Example 2 - Full parameter use.nSaveResult = FortitudeSave(oTarget, nDifficultyCheck, SAVING_THROW_TYPE_COLD, OBJECT_SELF);
#### See Also
functions:  |  GetSpellSaveDC ReflexSave WillSave GetReflexAdjustedDamage MySavingThrow  

constants:  |   SAVING_THROW_TYPE_*
