<!-- Source: https://nwnlexicon.com/index.php/EffectSpellFailure -->

# EffectSpellFailure(int, int)
Creates an effect that inhibits spells. 
effect EffectSpellFailure( int nPercent = 100, int nSpellSchool = SPELL_SCHOOL_GENERAL, int nSpellFailureType = SPELL_FAILURE_TYPE_ALL);
#### Parameters 

nPercent
    Percent chance of spell failing (this can be a positive or negative integer, it is capped between 0 and 100 once summed with other effects for general spell failure, and -100 to 100 for arcane spell failure). 

nSpellSchool
    Spell school that is affected (SPELL_SCHOOL_*). Only applies to SPELL_FAILURE_TYPE_ALL. (Default:  SPELL_SCHOOL_GENERAL ) 

nSpellFailureType
    Use SPELL_FAILURE_TYPE_* constants for different spell failure types
#### Description
Returns an effect that has a chance of causing a spell to fail. Spells that are cast and fail are lost. Specific schools of spells may be affected (SPELL_SCHOOL_* constants) or all schools may be affected (SPELL_SCHOOL_GENERAL). To guarantee that no spell can be successfully cast in an area with this effect, apply the effect with its default parameters. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
EffectSpellFailure only affects spells cast with the UserType column set to 1. SPELL_FAILURE_TYPE_ARCANE only affects spellcasters from arcane classes if they are in armor and is retrievable with GetArcaneSpellFailure. 
You can have the nPercent be -1000, 1000 or whatever, the main thing is once it has counted all the effects it'll make it a value between 0 and 100 for general spell failure and -100 and 100 for arcane spell failure (arcane spell failure amounts then have added on top the changes from armor). 
#### Remarks
SPELL_FAILURE_TYPE_ALL has nothing to do with arcane spell failure you can put on items (or is naturally there via. armor). It is a separate check, and affects the caster whenever they cast a spell in addition to normal armor checks, concentration checks and so forth. 
It affects spells.2da lines which are UserType "1". It only affects ActionCastSpell (normal spellbook or spells added as monster abilities in the toolset), not using items such as scrolls, potions or wands with that spell. You get the simple message "Spell failed!" with no further feedback (on the roll, or type of failure) when it causes a spell to fail. The casting attempted is lost. 
Putting it to 100 will stop any spell being cast. Even 1% can be deadly to a caster. This can be used to create a "magic dead-zone" as per the Time of Troubles (TSR modules FR1 through FR3) although the Spell Hook would needed to stop any items being used. 
#### Effect Breakdown
This effect now properly calculates stacking of this effect in NWN:EE and if one is removed or added it is recalculated properly. 
EffectDeaf also adds spell failure specially - it applies 20% if the amount of spell failure is less than 20%. Taunt also applies 30% general spell failure. 
For SPELL_FAILURE_TYPE_ALL the percentage is also capped at 0 - 100 even if a higher number is put in. For SPELL_FAILURE_TYPE_ARCANE it is -100 to 100, which then gets modified by the armor being worn as well (so -100 in effects can mean 0 chance to fail in the heaviest armor). 
As noted above the roll is only done on spell castings, not item usage, and only affects spells with a UserType value of 1 (so a dragons breath, or a gaze, is unaffected, but Ray of Frost is, whether in a monsters abilities list or a proper spell book). 
When SPELL_FAILURE_TYPE_ALL is used it is EFFECT_TYPE_SPELL_FAILURE with these properties: 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercent | The percentage of spell failure, see remarks - all are added up to give a final value.   
1 | nSpellSchool | The default value - SPELL_SCHOOL_GENERAL - is 0 so may not be apparent. Not set for arcane spell failure.   
When SPELL_FAILURE_TYPE_ARCANE is used it is EFFECT_TYPE_ARCANE_SPELL_FAILURE with these properties: 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPercent | The percentage of spell failure, see remarks - all are added up to give a final value.   
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. Fixed the calculation of stacking spell failure. 
This function was updated in 1.89.8193.37 of NWN:EE. VM: Added parameter to EffectSpellFailure(), specifying the type of spell failure to use (allowing Arcane Spell Failure as an effect). 
This function was updated in 1.89.8193.37 of NWN:EE. EffectSpellFailure is now defaults to being a magical subtype effect. 
#### Example
// Apply 100% spell failure to anyone who enters this area, after all magical effects are removed!// NB: In NWN:EE using a tagged effect for this would be recommendedvoid main(){ // Declare effects effect eVis = EffectVisualEffect(VFX_IMP_BREACH); effect eDur = EffectVisualEffect(VFX_DUR_GLOW_LIGHT_BLUE); effect eAntiMag = EffectSpellFailure(100); eAntiMag = EffectLinkEffects(eDur, eAntiMag); eAntiMag = SupernaturalEffect(eAntiMag); // Get who to effect object oTarget = GetEnteringObject(); // Must NOT be a DM or plot-flagged creature if(GetIsDM(oTarget) || GetPlotFlag(oTarget)) return; // Remove effects which are magical effect eCheck = GetFirstEffect(oTarget); while(GetIsEffectValid(eCheck)) { if (GetEffectSubType(eCheck) == SUBTYPE_MAGICAL) { if (GetEffectType(eCheck) != EFFECT_TYPE_DISAPPEARAPPEAR && GetEffectType(eCheck) != EFFECT_TYPE_SPELL_FAILURE) { RemoveEffect(oTarget, eCheck); } } eCheck = GetNextEffect(oTarget); } // Apply effects ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); ApplyEffectToObject(DURATION_TYPE_PERMANENT, eAntiMag, oTarget);}// Remove any spell failure when they exit the area// NB: In NWN:EE using a tagged effect for this would be recommendedvoid main(){ // Remove from exiter. object oTarget = GetExitingObject(); // Remove effects which are spell failure effect eCheck = GetFirstEffect(oTarget); while(GetIsEffectValid(eCheck)) { if(GetEffectSubType(eCheck) == SUBTYPE_SUPERNATURAL) { if(GetEffectType(eCheck) == EFFECT_TYPE_SPELL_FAILURE) { RemoveEffect(oTarget, eCheck); } } eCheck = GetNextEffect(oTarget); }}
#### See Also
functions:  |  ItemPropertyArcaneSpellFailure  

constants:  |   SPELL_SCHOOL_* Constants
