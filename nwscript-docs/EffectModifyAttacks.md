<!-- Source: https://nwnlexicon.com/index.php/EffectModifyAttacks -->

# EffectModifyAttacks(int)
Create a Modify Attacks effect that modifies the amount of attacks a creature can perform. 
effect EffectModifyAttacks( int nAttacks);
### Parameters 

nAttacks
    The number of effects to add to the target. Maximum is 5, even with the effect stacked.
### Description
Returns a new effect object that when applied to a target will add attacks. 
Returns an effect of type EFFECT_TYPE_INVALIDEFFECT if nAttacks > 5, however it can be negative (to remove attacks). 
As the limit to nAttacks is 5, it is wise to think that multiple effects will limit bonus attacks to 5, even if 2 EffectModifyAttacks(3); are applied to the same creature. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
If you want to actually set the amount of attacks on a creature, use SetBaseAttackBonus(). It isn't an effect, it is almost permanent. The use of RestoreBaseAttackBonus() will not remove this effect or alter it. 
### Remarks
An extra attack doesn't change spell casting times (as EffectHaste does). 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
If you need to find this effect later use GetEffectType with bAllTypes parameter set to TRUE. 
### Effect Breakdown
The extra attacks are not listed on the character sheet and an effect icon doesn't appear. 
This effect is **very** powerful and seem to create an entirely _new_ base attack bonus progression starting from the current highest attack the creature has which is not used correctly in the spell Divine Power at all. 
From some testing this appears to happen in NWN:EE. Let's assume a creature with a current attack bonus of +34, and 3 attacks (so +34, +29 and +24). NWN divides the rounds into three "flurries", so "flurry 1, flurry 2, flurry 3" although the order of attacks in the combat log for each flurry may be mixed up and not highest to lowest (although that may depend on the setting "use-threaded-timers" which defaults to true). 
  * No bonus attacks = Attacks: 34, 29, 24
  * EffectModifyAttacks(1) = Attacks: 34/29, 24, 34 - So is 34/29/24 and 34
  * EffectModifyAttacks(2) = Attacks: 34/29, 24/34, 29 - So is 34/29/24 and 34/29
  * EffectModifyAttacks(3) = Attacks: 29/34, 34/24, 24/29 - So is 34/29/24 and 34/29/24
  * EffectModifyAttacks(4) = Attacks: 24/29/34, 29/34, 24/19 - So is 32/29/24 and 34/29/24/19
  * EffectModifyAttacks(5) = Attacks: 24/29/34, 24/29/34, 19/14 - So is a total run of 34/29/24 and 34/29/24/19/14

So yeah it's pretty powerful! The above applies to weapons or unarmed. 
For Creature Weapons it is a bit different: 
  * No bonus attacks = Attacks: 30, 25, 20
  * EffectModifyAttacks(1) = Attacks: 30/25/20, 15/10, 5/0/-5 meaning a full run of 30/25/20/15/10/5/0/-5 happens

Which is correct? Neither! Both! Who knows. What would be better is a second version is added to do one type and this becomes the other type. 
This will affect the default spells Tensers Transformation (adds 2 attacks) and Divine Power (adds a variable number of attacks). 
Note you can also _reduce_ the number of extra attacks, and even the amount of normal attacks, using negatives in the parameter. For instance with 2 attacks you'd go down to 1 attack if EffectModifyAttacks(-1) is applied to you as the sole effect. The minimum number of attacks per round is 1. This could be useful to do a sort-EffectSlow effect. You can have any amount of negative attacks, eg: EffectModifyAttacks(-10) is valid, and it will simply alter the number of bonus attacks when these effects are applied and removed. 
The previous noted bug about recalculation has been fixed in patch 1.88.8193.36. 
The additional attacks are distinct from the bonus ones applied via. FEAT_FLURRY_OF_BLOWS or FEAT_RAPID_SHOT, and the bonus attack from EffectHaste, which apply to the tail end of your normal attacks. 
Unlike many other effects no effect icon appears for this effect (possibly since there is no positive and negative version?). 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAttacks | The amount of attacks to add or remove. Positive adds them, negative removes them. The maximum positive amount is 5 in any one effect.   
### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed EffectModifyAttacks() not recalculating total bonus attacks when being applied. 
This function was updated in 1.88.8193.36 of NWN:EE. GetEffectType() now has a bAllTypes parameter, where EFFECT_TYPE_MODIFY_ATTACKS is used for this effect. 
### Example
// Sample code for applying 2 extra attacks to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eAttacks = EffectModifyAttacks(2); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_IMPROVE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eAttacks, oTarget);}
### See Also
functions:  | SetBaseAttackBonus  

constants:  |  EFFECT_TYPE_* Constants
