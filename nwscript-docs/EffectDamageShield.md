<!-- Source: https://nwnlexicon.com/index.php/EffectDamageShield -->

# EffectDamageShield(int, int, int)
Creates a damage shield around the target that will damage successful attackers. 
effect EffectDamageShield( int nDamageAmount, int nRandomAmount, int nDamageType);
#### Parameters 

nDamageAmount
    The amount of damage to apply to the targets attacker after a successful hit by the opponent. Must be between 0 and 10000. 

nRandomAmount
    The amount to add to the base damage caused by the shield as defined in the DAMAGE_BONUS_* constants group (line reference to iprp_damagecost.2da). If you don't want to use this parameter set it to 0. 

nDamageType
    The type of damage that will be done to the attacker, as defined in the DAMAGE_TYPE_* constants group.
#### Description
Returns a Damage Shield effect which, when applied to a target, does (nDamageAmount + nRandomAmount) damage to any melee attacker on a successful attack of damage type nDamageType. 
It is important to use DAMAGE_BONUS_* constants in the second parameter, not actual integer values, which may cause unpredictable results since it references iprp_damagecost.2da and has many random dice values. 
Damage shields do stack, and it doesn't matter how or what damage they do. 
The limit of nDamageAmount has to be between 0 and 10000. Any higher or lower it reverts to 1. If nRandomAmount is an invalid iprp_damagecost.2da entry it is simply ignored. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
This is used for any special things to damage melee attackers (only melee - not ranged). The shield doesn't show up unless an visual effect is also applied. 
This effect is not valid for passing into VersusAlignmentEffect or VersusRacialTypeEffect, in spite of the fact Bioware uses it as such for (un)holy auras. This could be considered a bug. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
As noted the effect only affects when a character is damaged, and that damage was from a melee source (fists, melee weapon, etc.). Each damage shield effect will trigger and essentially cause an EffectDamage back at the attacker for the nDamageAmount + nRandomAmount. 
The nDamageType can only be a singular type. If you combine two types, such as DAMAGE_TYPE_FIRE | DAMAGE_TYPE_MAGICAL it will use the lowest bit so...don't do that. If you go over 2048 (DAMAGE_TYPE_SONIC) it will revert to DAMAGE_TYPE_MAGICAL. 
Note that while the attacker needs to successfully hit, they don't need to damage. For instance having EffectDamageReduction (ie Stoneskin) up stopping them damaging you can stand there damaging them as they don't damage you. In fact a strategy to use damage shields is to lower your AC as much as possible, running around causing attacks of opportunity, and let them bash at your fully protected body. 
Note that if the damage shield does physical damage then it is considered non-magical, with no DAMAGE_POWER_* value, so will in turn not penetrate EffectDamageReduction. Physical damage types are specific (eg; for the purposes of EffectDamageResistance) but appear as generic "Physical" in the combat log. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nDamageAmount | Base damage, 0 or a positive integer up to 10000.   
1 | nRandomAmount | Should be an DAMAGE_BONUS_* constant (ie; entry in iprp_damagecost.2da)   
2 | nDamageType | Should be a singular DAMAGE_TYPE_* as noted above.   
#### Known Bugs
Bioware uses this alongside VersusAlignmentEffect which doesn't work, so could be considered a bug. This also applies to VersusRacialTypeEffect. 
#### Version
1.62 
#### Example
// Sample code for applying a damage shield of 5 + 1d6 fire// damage reflected back to attackers, to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eShield = EffectDamageShield(5, DAMAGE_BONUS_1d6, DAMAGE_TYPE_FIRE); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SUPER_HEROISM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eShield, oTarget);}
#### See Also
functions:  |   EffectDamageResistance   

constants:  |   DAMAGE_TYPE_* Constants
