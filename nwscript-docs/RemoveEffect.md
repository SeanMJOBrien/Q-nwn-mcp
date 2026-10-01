<!-- Source: https://nwnlexicon.com/index.php/RemoveEffect -->

# RemoveEffect(object, effect)
Removes an effect from a creature or object. 
void RemoveEffect( object oCreature, effect eEffect);
#### Parameters 

oCreature
    The object to remove an effect from. 

eEffect
    The effect to remove.
#### Description
Removes eEffect from oCreature. 
Note effects are not removed immediately but are marked for removal at the end of the current script execution (so for instance removing attack bonuses will not alter a call of TouchAttackRanged used in the same script call). This is similar to how DestroyObject operates. 
When an effect is removed (by this or resting, dispel magic etc.) the EffectRunScript sOnRemovedScript is run. 
#### Remarks
A common mistake with this function is to use the following approach to remove, say, a sleep effect: 
effect eSleep=EffectSleep();RemoveEffect(oPC, eSleep);
This doesn't work, because calling EffectSleep creates a new effect. It is thus not the sleep effect that is currently on oPC, but a different sleep effect. 
Instead, you must loop through effects on the creature (GetFirstEffect/GetNextEffect), and remove the effect(s) of the correct type, and possibly the correct creator and subtype. View the code sample below for information on how to do this. Alternately, you can use RemoveSpecificEffect which requires you to include nw_i0_spells - it does the same as the code sample below, but is a nice wrapper function to avoid having to type up all that stuff repeatedly. 
While linked effects appear on a character as separated individual effects when looping all effects, this function will also remove all other effects linked together with effect passed into function (you can find this ID with GetEffectLinkId). 
#### Example
void main(){ object oPC = GetEnteringObject(); if((oPC)) return; // Remove blindness from the PC effect eLoop = GetFirstEffect(oPC); while(GetIsEffectValid(eLoop)) { if(GetEffectType(eLoop) == EFFECT_TYPE_BLINDNESS) RemoveEffect(oPC, eLoop); eLoop = GetNextEffect(oPC); }}
#### See Also
functions:  |  RemoveSpecificEffect GetEffectLinkId
