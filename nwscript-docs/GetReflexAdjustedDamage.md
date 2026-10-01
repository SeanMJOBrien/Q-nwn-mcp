<!-- Source: https://nwnlexicon.com/index.php/GetReflexAdjustedDamage -->

# GetReflexAdjustedDamage(int, object, int, int, object)
Determines the damage to be applied after reflex saving throws are applied. 
int GetReflexAdjustedDamage( int nDamage, object oTarget, int nDC, int nSaveType = SAVING_THROW_TYPE_NONE, object oSaveVersus = OBJECT_SELF);
#### Parameters 

nDamage
    The full damage that would be applied if no adjustments were made. 

oTarget
    The target of the damage. 

nDC
    The DC needed to avoid (or reduce) the damage. The function GetSpellSaveDC could be used for this value. 

nSaveType
    A SAVING_THROW_TYPE_* constant which applies appropriate bonuses, default  SAVING_THROW_TYPE_NONE ) 

oSaveVersus
    The source of the potential damage (Default: OBJECT_SELF)
#### Description
Returns how much of nDamage that oTarget should receive after nDamage has been adjusted for reflex and evasion saving throws. 
#### Remarks
This function can be used in scripts that simulate new effect like custom traps or special abilities by taking the reflex and evasion saves into consideration as is prescribed by D&D rules. 
One oddity of this function that no other saving throw function has is it will automatically apply VFX_IMP_REFLEX_SAVE_THROW_USE as an EffectVisualEffect to the target. In comparison the base ReflexSave does not. It is done because you have no idea if a save was successful or not - you just get the resulting damage (which may be full, half or 0). 
One notable thing is this function can be reimplemented entirely in nwscript (and commonly is in Bioware's own spells) see below. 
See ReflexSave for additional remarks regarding some aspects; one relevant aspect is that if they are immune to the saving throw type it's counted as an automatic success unlike what MySavingThrow does. 
#### Example
This is how the function is implemented in-engine if you wanted to reimplement it. The engine feat references are of course hardcoded to FEAT_EVASION and FEAT_IMPROVED_EVASION feat.2da lines. 
#include "nw_i0_spells"void main(){ object oTarget = GetSpellTargetObject(); int nSaveDC = GetSpellSaveDC(); int nDamage = d6(3); // MySavingThrow included in nw_i0_spells. It will auto apply a saving throw VFX. if((SAVING_THROW_REFLEX, oTarget, nSaveDC, SAVING_THROW_TYPE_NONE)) { if(GetHasFeat(FEAT_IMPROVED_EVASION, oTarget)) { nDamage /= 2; } } else if(GetHasFeat(FEAT_EVASION, oTarget) || GetHasFeat(FEAT_IMPROVED_EVASION, oTarget)) { nDamage = 0; } else { nDamage /= 2; } // Any damage? Apply it if(nDamage > 0) { effect eDam = EffectDamage(nDamage, DAMAGE_TYPE_MAGICAL); ApplyEffectToObject(DURATION_TYPE_INSTANT, eDam, oTarget); }}
#### See Also
functions:  |  GetSpellSaveDC FortitudeSave ReflexSave WillSave  

constants:  |   SAVING_THROW_TYPE_* Constants
