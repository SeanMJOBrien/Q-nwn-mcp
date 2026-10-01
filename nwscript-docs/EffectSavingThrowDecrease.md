<!-- Source: https://nwnlexicon.com/index.php/EffectSavingThrowDecrease -->

# EffectSavingThrowDecrease(int, int, int)
Create a Saving Throw Decrease effect to lower one Saving Throw type. 
effect EffectSavingThrowDecrease( int nSave, int nValue, int nSaveType = SAVING_THROW_TYPE_ALL);
#### Parameters 

nSave
    The Saving Throw to affect, as defined by the SAVING_THROW_* constants group. 

nValue
    The amount to lower the saving throws by (1 or higher). 

nSaveType
    The type of resistance this effect applies to as defined by the SAVING_THROW_TYPE_* constants group. (Default:  SAVING_THROW_TYPE_ALL )
#### Description
Returns a new effect object that when applied to a target will lower the nSave Saving Throw by nValue amount when resisting anything that falls under the nSaveType definition. 
Only direct save changes (SAVING_THROW_TYPE_ALL), change the values returned by GetWillSavingThrow, GetFortitudeSavingThrow and GetReflexSavingThrow. The different save types are only used when you try FortitudeSave, WillSave and ReflexSave, or GetReflexAdjustedDamage, with the correct saving throw type. 
The limit of nValue is unknown. 
The target this effect is applied to must be a creature for it to work (even though placeables/doors have saves). This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Note: nSave and nSaveType are defined by similarly named constant groups and should not be confused. 
This will stack with, or decrease with even, any other effects of its type or penalties on items. It will merely cancel out with similar Increases in spell saves - of course, if the parameters for nSave and nSaveType are not matched, nothing will be affected. It is impossible to see on a character sheet any changes to your saves except direct ones using SAVING_THROW_TYPE_ALL, to your will, fortitude or reflex. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
This effect is a reasonably simple and solid one. When applied saving throws are recalculated to take into account the changes, and also when the effect is removed. 
While not creating an invalid effect for some reason, if you try applying EffectSavingThrowDecrease(-1, SAVING_THROW_TYPE_ALL) it simply won't apply. 
It is stopped with IMMUNITY_TYPE_SAVING_THROW_DECREASE. 
It applies an effect icon for the duration. 
That's about it. You get a new saving throw - as noted before GetEffectInteger working out saving throw vs. particular effects isn't doable but now it is. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nValue | The amount to decrease the save by, thus 2 here means -2 on saving throws.   
1 | nSave | The base saving throw type (Fortitude, Reflex, Will), or SAVING_THROW_ALL for all 3.   
2 | nSaveType | SAVING_THROW_TYPE_* specific save, or SAVING_THROW_TYPE_ALL.   
3 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
4 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
5 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Version
1.62 
#### Example
// Sample code for applying a 5 penalty to any will saves// specifically against death saves, to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eSavePen = EffectSavingThrowDecrease(SAVING_THROW_WILL, 5, SAVING_THROW_TYPE_DEATH); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eSavePen, oTarget);}
#### See Also
functions:  |  EffectSavingThrowIncrease  

constants:  |   SAVING_THROW_TYPE_* Constants
