<!-- Source: https://nwnlexicon.com/index.php/EffectDamageDecrease -->

# EffectDamageDecrease(int, int)
Returns a new effect to decrease the melee damage of a target. 
effect EffectDamageDecrease( int nPenalty, int nDAmageType=DAMAGE_TYPE_MAGICAL);
#### Parameters 

nPenalty
    The amount of penalty to apply to the damage type on melee/ranged damage rolls, DAMAGE_BONUS_*. (iprp_damagecost.2da reference). See Known Bugs however, going beyond 5 can cause character sheet issues. 

nDamageType
    The damage type of the damage decrease;  DAMAGE_TYPE_*  constants (Default: DAMAGE_TYPE_MAGICAL). See Description below for more details.
#### Description
This constructor makes a new effect that reduces the amount of damage you do of type (Specified by the penalty and damage type parameters), when attacks are done with weapons/fists. 
Any physical damage type specified (Slashing, Piercing, Bludgeoning) will decrease weapon damage regardless of which one is used. For instance a +5 enchanted Longsword with EffectDamageDecrease(7, DAMAGE_TYPE_BLUDGEONING) will make it 1d8 - 2 damage instead of 1d8 + 5 (given no strength modifiers) physical slashing damage. The minimum physical damage possible to apply will be always 1 (although that may be negated by damage resistance/absorption). 
An interesting fascet - you can use EffectDamageDecrease(1, DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_SLASHING | DAMAGE_TYPE_PIERCING); which will appear on the character sheet correctly as "-1 Physical damage". 
Any elemental damage type specified (Fire, Sonic, Magical, etc.) will decrease damage **only if there is a positive bonus** - EffectDamageIncrease or appropriate item property. Note that the bonus damage is never reduced below 1 for that particular damage type, for instance a Longsword +5 Fire Damage with EffectDamageDecrease(7, DAMAGE_TYPE_FIRE) will do 1d8 physical slashing damage + 1 fire damage. 
Don't combine elemental damage types, instead create multiple ones and link them together in one effect link. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
Damage of X type only matters if the target already does (bonus) damage of that type, where it will then decrease the damage done of that type (A Fiery sword, +4 fire damage, will only do +2 fire damage if the DAMAGE_TYPE_ constant is FIRE and is applied using a nPenalty of 2), although, as it says below, the penalty will be applied even if they do no damage of that type. 
Strangely enough, when you apply a damage penalty of a certain type and the creature doesn't do any damage of that type already (EG: Acid penalty, but none of their weapons do acid damage) it has: "0 Acid Damage" in the combat information box. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Like EffectDamageIncrease it will apply a "MISC" effect that affects all attacks of the creature, not any particular slot, thus ranged and melee, creature weapons and fists are all equally affected. 
This is in contrast to EffectAttackIncrease and EffectAttackDecrease which have the MISC as default, but optional an parameter to apply it to a specific item slot. 
As noted above there are two cases: 
  * Physical damage decreases are removed from the total physical damage amount the weapon does, regardless of the damage type done by the weapon/fists used. The minimum it can reduce it to is 1.
  * Elemental damage decreases are only removed from that elemental bonus if it exists. If it doesn't exist, it says 0 damage from that type is applied as bonus damage. The minimum it can reduce it to is 1.

The nPenalty amount actually acts like EffectDamageIncrease - it properly looks up iprp_damagecost.2da and can apply whatever random or static value is there (eg; 2d6 is line 10), with the cap being -20 by default (line ID 30 in the default 2da file, DAMAGE_BONUS_30). 
**However** there are some weird character sheet bugs since it apparently is instead using the ItemPropertyDamagePenalty referenced iprp_neg5cost.2da value lookup which is a linear 1, 2, 3...etc value. That 2da technically only goes up to 5. The actual damage calculation work fine however. 
To be "safe" you should use only values 1 through 5 which match in both iprp_damagecost.2da and iprp_neg5cost.2da. 
Stacking also involves some strange bugs with critical hits: having multiple increases or multiple decreases for the same damage type works as excepted on normal attacks; +2, +2, -2, -2, -2 means a final change of -2. But on a critical this becomes -12 damage. It seems to ignore the positive values entirely and multiply all the negatives added up. This could be Bioware attempting to ignore the negatives and only boost the positives but messed up code somewhere. 
Sadly even though ItemPropertyDamagePenalty can have the reference to iprp_neg5cost.2da changed to iprp_damagecost.2da the game has seemingly hardcoded the neg5cost.2da reference so this effect will always have the wrong values when damage decreases are done that are over value 5, but they are applied correctly. This also means that item property can't have, for instance, -1d6 weapon damage as an item property, frustratingly. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nPenalty | The DAMAGE_BONUS_* applied for this damage decrease.   
1 | nDamageType | The DAMAGE_TYPE_* this decrease is applied to   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Known Bugs
As noted above values over 5 visually go wonky on the character sheet, but work correctly in game. Applying EffectDamageDecrease(DAMAGE_BONUS_1d6, DAMAGE_TYPE_SLASHING) will correctly remove 1d6 damage from physical attack damage but show as -7 damage in the character sheet since that's the line reference. This is likely because ItemPropertyDamagePenalty is linked to iprp_neg5cost.2da and suggests a limit of 1 - 5, which is all that 2da supports in a linear range. 
When this effect stacks with positive damage effects, and a critical occurs, all the positive values are ignored and the negative values are magnified instead. 
A potential bug is if you have a damage decrease and a critical hit occurs the damage decrease is also multiplied - the 3E rules can go either way but many people rule only the bonuses are multiplied. Bioware also multiplies the extra dice rolled so it's a bit confusing what is a bug here and what isn't. 
#### Version
1.62 
#### Example
// Sample code for applying 5 decrease in fire damage done by // a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDamDecrease = EffectDamageDecrease(DAMAGE_BONUS_5, DAMAGE_TYPE_FIRE); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDamDecrease, oTarget);}
#### See Also
functions:  |  EffectDamageIncrease EffectDamageResistance  

constants:  |   DAMAGE_BONUS_* Constants   DAMAGE_TYPE_* Constants
