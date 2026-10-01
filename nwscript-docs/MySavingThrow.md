<!-- Source: https://nwnlexicon.com/index.php/MySavingThrow -->

# MySavingThrow(int, object, int, int, object, float)
Checks for spell countering by a saving throw. 
int MySavingThrow( int nSavingThrow, object oTarget, int nDC, SAVING_THROW_TYPE_NONE, object oSaveVersus = OBJECT_SELF, float fDelay = 0.0f);
#### Parameters 

nSavingThrow
     SAVING_THROW_*  

oTarget
    Target of a spell. 

nDC
    Difficulty challenge rating of the spell's save. 

nSaveType
     SAVING_THROW_TYPE_NONE ) 

oSaveVersus
    Creature or object to save against. (Default: OBJECT_SELF) 

fDelay
    Delay until save is made. (Default: 0.0f)
#### Description
Determines spell countering and failing along with visual effects by a creature's saving throws. An appropriate save attempt is made against the supplied DC according using the save specified by nSavingThrow. If successful, a visual effect of the specified save being executed is shown (for example, SAVING_THROW_REFLEX would show the creature moving). If the save fails, or no save is allowed, then the effects of the spell are applied (this includes any instant death animations as indicated by the type of spell). If the creature is immune to the spell being cast and the save is failed, then no effect is applied an the spell resistance visual cue is played. 
Returns TRUE only if the saving throw was made, returns FALSE otherwise (even if immunity to nSaveType (such as posion immunity to SAVING_THROW_TYPE_POISON) prevents the spell from affecting the creature). 
#### Remarks
nSaveType left at the default of SAVING_THROW_TYPE_NONE does not mean that no save is made; instead it means that the spell has no basis one of the other SAVING_THROW_TYPE_* constants that apply. 
Because of the fact it will return FALSE even if the creature is immune to the save type specified, it will allow effects to actually affect a target all the time in some cases. In 1.64, the majority, if not all, are solved, but be wary: Do not use this function unless you know you are using it correctly. 
You may wonder why it returns FALSE when a target is immune to the save type. Well, basically, it is to get the dialog feedback "So and so is immune to whatever". 
The function description in the toolset is incorrect, the function does not return 2 if oTarget is immune. In most cases this is not a problem as applying an effect to an immune object will fail. However if the effect you wish to apply does not include an effect of the type saved against you must make a separate check for immunity. As noted above, the majority of cases in NwN has been fixed - such as when you are immune to poison, stinking cloud keeps making you dazed. 
#### Requirements
#include " nw_i0_spells " 
#### Known Bugs
This function is used incorrectly in two existing scripts; 
  * x2_s0_infestmag - The test is against Disease, but if they're immune to disease the EffectAbilityDecrease still applies
  * x2_s2_terrage_A - The test is against Fear, but if they're immune to fear the EffectParalyze or other negative effects still apply. This ironically makes it very effective against fear-immune enemies!

There may be other cases where the immunity to the save still causes an effect. Many were fixed by Bioware. 
#### Version
1.64 
#### Example
// Note: There is no good code sample for this.// This function is specifically for spells, and shouldn't be used else// where.// However, this is how it might look, in a Bioware spell.// It must return FALSE for the spell to apply its effects. // Will saving thrown against poison negates. if((SAVING_THROW_WILL, oTarget, GetSpellSaveDC(), SAVING_THROW_TYPE_POISON, OBJECT_SELF, fDelay))
#### See Also
constants:  |   SAVING_THROW_TYPE_* Constants
