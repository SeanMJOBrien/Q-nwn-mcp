<!-- Source: https://nwnlexicon.com/index.php/EffectAbilityIncrease -->

# EffectAbilityIncrease(int, int)
Create an effect that increases an objects specified ability score. 
effect EffectAbilityIncrease( int nAbilityToIncrease, int nModifyBy);
#### Parameters 

nAbilityToIncrease
    Ability score to increase - ABILITY_* constant 

nModifyBy
    This is the amount by which to increase the ability score. Must be a positive integer.
#### Description
Target Creature's ability score is modified by specified amount, up to a maximum of GetAbilityBonusLimit - default 12. A higher number can be specified - but the limit is kept to. 
If the effect is applied without a delay in the script, then the ability score should change immediately if using GetAbilityScore after the ApplyEffectToObject call. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Items and Spells (even sometimes from the same spell, or set of spells) both combine, and overlap, to a maximum bonus of GetAbilityBonusLimit (default 12) in a given statistic. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
The effect applies a bonus which is dynamically calculated when it needs to be since setting a lot of bonuses (of varying amounts) properly stack up to the cap, and don't act like the decrease version and "delete" themselves when such a cap is reached. It seems to correctly also recalculate on removal. 
Stats which affect other stats - eg; strength affecting encumbrance weight limit, or constitution affecting hit points totals, also seem to correctly recalculate. Removing the effects recalculates it again, so applying 2 modifiers with +10 each (meaning capping at +12) removing one will recalculate to be +10, then another would go to +0. 
The total changed value of stat (With bonuses and penalties) is shown in the character sheet (Green if positive bonuses are applied, red if negative ones are applied). 
Since this and EffectAbilityDecrease are for all intents and purposes temporary, they do not count for requirements for things at level up. 
Passing 0, or a negative into the nModifyBy field, will result in the effect not being valid. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAbilityToIncrease | The ability being increased. ABILITY_* constant.   
1 | nModifyBy | The amount to modify the ability score by, a positive integer > 0.   
#### Version
1.62 
#### Example
// Sample code for applying 1 strength bonus to the target// And yes, its very similar to the EffectAbilityDecrease// function useage.void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eBonus = EffectAbilityIncrease(ABILITY_STRENGTH, 1); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_IMPROVE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object ApplyEffectToObject(DURATION_TYPE_PERMANENT, eBonus, oTarget);}
#### See Also
functions:  | EffectAbilityDecrease  EffectAttackIncrease   

constants:  |   ABILITY_* Constants
