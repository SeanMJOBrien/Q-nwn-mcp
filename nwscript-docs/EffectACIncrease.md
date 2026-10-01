<!-- Source: https://nwnlexicon.com/index.php/EffectACIncrease -->

# EffectACIncrease(int, int, int)
Gives an AC bonus to a creature. 
effect EffectACIncrease( int nValue, int nModifyType = AC_DODGE_BONUS, int nDamageType = AC_VS_DAMAGE_TYPE_ALL);
#### Parameters 

nValue
    Size of AC increase. Realistically values between 1 and 127 for AC_VS_DAMAGE_TYPE_ALL when not Dodge type, and between 1 and 20 for AC_DODGE_BONUS (as defined by MAX_AC_DODGE_MOD ruleset.2da value). If a specific nDamageType is used the value can be any integer. 0 or negative values are not invalid, but are next to useless - see Effect Breakdown. 

nModifyType
    AC_*_BONUS to apply (Default: AC_DODGE_BONUS) 

nDamageType
    Damage type DAMAGE_TYPE_* (only base bludgeoning/piercing/slashing, see below) to affect the AC of (Default: AC_VS_DAMAGE_TYPE_ALL - all weapons will be affected).
#### Description
Applies an additional AC bonus to object effect occurs on. The amount is specified, and the type of bonus (per AC_* constant list), and the specific damage AC is 'for'. 
The target this effect is applied to must be a creature for it to work. Placeables and Doors have no AC to modify, and the attack rolls are only for getting a 1 (Natural Miss, somehow) and a 20 (Natural hit) or a Critical Hit. This effect should not be applied instantly, only temporarily or permanently. 
Certain AC bonuses can help against certain attacks, and dodge bonuses always stack (see notes). Touch attacks are a good example of where, for example, Armor AC bonuses do not apply. It also helps because different items give different types of AC bonuses. 
nDamageType is related to the incoming damage. It should be set to a DAMAGE_TYPE_* value, or a collection of values. For instance the default AC_VS_DAMAGE_TYPE_ALL is actually value 4103 which is: DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING | DAMAGE_TYPE_SLASHING | DAMAGE_TYPE_BASE_DAMAGE, ie: 1 + 2 + 4 + 4096. 
In comparison to EffectDamageResistance where the attacker uses the weakest modifier the effect-holder has in order to determine damage dealt, the AC modifier against _specific_ damage types actually uses the _strongest_. For example, a Halberd hitting an effect-holder that has +5AC vs. Slashing and +2AC vs. Piercing will actually gain +7AC against the Halberd's attacks. 
#### Remarks
Note about AC bonuses - they do not stack, except for Dodge, which is therefore one of the most powerful (and the Dodge Bonus items can severely unbalance a module). 
For example, if you apply a bonus with AC_ARMOR_BONUS, of say, 3 (for a +3 bonus), it will either apply +3, or whatever is higher, not both. If they were wearing +5 armor, then it'd say "Armor bonuses of the same type do not apply" and only give a +5 bonus, NOT +8. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
There are 2 modifiers to how the AC is applied, so this makes it a rather complex effect in how the engine uses it. The table of integers available to retrieve shows all the values are sorted in fine. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nModifierType | The AC_* modifier applied. If an invalid value is used (less than 0, higher than 4) it'll default to AC_DODGE_BONUS (0).   
1 | nValue | The amount of AC to apply. See notes above about 20, 127 or unlimited limits. Regardless the original integer is put here even if it is too high or too low (or even negative!). 0 is actually valid and simply functionally does nothing.   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
5 | nDamageType | The damage type this effect applies against. Can be any value but obviously is bitmatched against DAMAGE_TYPE_* values of weapons attacking - see below for more exact notes. If set to the magic AC_VS_DAMAGE_TYPE_ALL constant value, it'll apply generally to all attacks and appear on the character sheet - and have various restrictions, see below for more details.   
##### AC_VS_DAMAGE_TYPE_ALL
This type (a magic number 4103 - noted above what it consists of) will get added to the character sheet - it seems the base properties of the creature is altered, which has some interesting consequences. 
The if applied to all incoming attacks, the effect stores the integer passed to it fine but the actual usable values are essentially -128 to 127. Once you hit 128 you get a rollover so it becomes -128, then -127 etc. until it wraps back into positives again. You can't really use this to apply, for instance, a "always be at 0 AC penalty", since _any_ value of 1 or above would be the "highest". You can see the full effect on the character sheet and the dm_enablecombatdebugging console option. Better is to use EffectACDecrease (which runs into the opposite problem) or use the specific damage type option above (specifying all 3 weapon damage types). 
###### nModifyType Breakdown for AC_VERSUS_DAMAGE_TYPE_ALL
Only AC_DODGE_BONUS will stack. The MAX_AC_DODGE_MOD ruleset.2da value will usually limit effects applying dodge to +20 maximum (but no minimum, and no negative minimum). However some feats add on Dodge after this is calculated. The total amount ends up being something akin to "all positive dodge bonuses minus all negative dodge bonuses, then capped to MAX_AC_DODGE_MOD". This means having +50 dodge can actually fully apply if there is -40 EffectACDecrease to dodge also applied, for instance where the total ends up at +10. 
The other types will apply a "Highest applies" mantra - a +5 AC_ARMOUR_ENCHANTMENT_BONUS when the creature has a +10 bonus to general AC on their armor will mean the effect essentially does nothing (unless the armor is taken off, then it will apply as the highest if nothing else applies such a type). 
##### Specific Damage Types or vs. Alignment or Racial Type
If you have anything other than AC_VS_DAMAGE_TYPE_ALL specified, in fact even if you specify DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING | DAMAGE_TYPE_SLASHING together (ie integer value 7) rather than using the 4103 magic number (which adds in DAMAGE_TYPE_BASE_WEAPON), then the effect is not present on the character sheet but is calculated on each attack being done. This also is the case if you happen to do an VersusRacialTypeEffect or VersusAlignmentEffect. 
This also means the 127 limit and "overflow" doesn't occur. You can also bypass the MAX_AC_DODGE_MOD ruleset.2da value by using this method, and thusly have an effect like FEAT_DODGE where the +1 Dodge AC will apply above the given 20 cap. 
You can _technically_ specify any DAMAGE_TYPE_* value, but none of them matter except Bludgeoning, Piercing and Slashing - the base weapon damage is used to determine if an AC will apply. For instance if you specify DAMAGE_TYPE_FIRE it won't apply ever, even if the damage done by the weapon includes fire type damage. 
As noted above the _worst_ option will always occur for weapons with more than one damage type. A Halberd (Slashing and Piercing) versus DAMAGE_TYPE_SLASHING will always apply the bonus. Worse still, if you also had a different AC bonus type but for DAMAGE_TYPE_PIERCING it'll apply both - the weapon is both weapon types at once for AC purposes. 
As with the general AC modifiers you can stack Dodge increases, but not any other type, where only the highest applicable value will work. It will check all the applicable ones dynamically - so the weapon equipped, the racial type and alignment are all properly checked. 
#### Version
1.62 
#### Example
// Apply a bonus of 5 Dodge AC to the target. This should just// add 5 to their AC, because Dodge AC stacks.// Note: If it was any other type (EG: AC_ARMOR_BONUS), // only the highest AC bonus of that type applies (see Remarks)void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDodgePenalty = EffectACIncrease(5, AC_DODGE_BONUS); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_IMPROVE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDodgePenalty, oTarget);}
#### See Also
functions:  |  EffectAttackIncrease  EffectACDecrease  

constants:  |  DAMAGE_TYPE_* Constants
