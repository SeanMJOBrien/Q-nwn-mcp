<!-- Source: https://nwnlexicon.com/index.php/EffectACDecrease -->

# EffectACDecrease(int, int, int)
Creates an AC decrease effect. 
effect EffectACDecrease( int nValue, int nModifyType = AC_DODGE_BONUS, int nDamageType = AC_VS_DAMAGE_TYPE_ALL);
#### Parameters 

nValue
    Size of AC increase. Realistically values between 1 and 127 for AC_VS_DAMAGE_TYPE_ALL. If a specific nDamageType is used the value can be any integer. 0 or negative values are not invalid, but are next to useless - see Effect Breakdown. 

nModifyType
    AC_*_BONUS to apply (Default: AC_DODGE_BONUS) 

nDamageType
    Damage type DAMAGE_TYPE_* (only base bludgeoning/piercing/slashing, see below) to affect the AC of (Default: AC_VS_DAMAGE_TYPE_ALL - all weapons will be affected).
#### Description
Effect sets to remove the specified amount of bonus from an object. The type of AC decreased is of nModifyType. 
The target this effect is applied to must be a creature for it to work. Placeables and Doors have no AC, and the attack rolls are only for getting a 1 (Natural Miss, somehow) and a 20 (Natural hit) or a Critical Hit. 
This effect should not be applied instantly, only temporarily or permanently. 
Certain AC bonuses can help against certain attacks, and dodge decreases always stack. Touch attacks are a good example of where, for example, Armor AC bonuses do not apply. It also helps because different items give different types of AC bonuses. 
nDamageType is related to the incoming damage. It should be set to a DAMAGE_TYPE_* value, or a collection of values. For instance the default AC_VS_DAMAGE_TYPE_ALL is actually value 4103 which is: DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING | DAMAGE_TYPE_SLASHING | DAMAGE_TYPE_BASE_DAMAGE, ie: 1 + 2 + 4 + 4096. 
In comparison to EffectDamageResistance when damage is calculated and it usually takes the most damaging base damage type of the weapon, the AC modifier against specific damage types actually takes into account all damage types being used, meaning a Halberd (Slashing and Piercing) attacking someone with -5 AC against DAMAGE_TYPE_SLASHING and -2 AC against DAMAGE_TYPE_PIERCING, will apply both. 
#### Remarks
AC decreases do not require the creature to have some AC of that type already. For instance decreasing Armor AC with nothing equipped means you still get the relevant penalty. 
Dodge penalties are _usually_ the best stacking one to apply, since it will add all the positives and take off all the negatives. The only oddity is that if dodge AC is not being applied (eg; if they are flatfooted) then no _penalties_ are applied either, oddly. This can be considered a bug. 
The other AC types are 4 categories where the highest positive bonus and highest negative penalty are obtained, then positive - negative = total AC bonus. For instance if you used AC_DEFLECTION_BONUS, a +4 bonus and a -6 penalty would become a -2 total bonus. Having a -4 penalty would do nothing additional. This should be considered a bug - since it is really silly not having 2 spells penalties stack. 
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
The if applied to all incoming attacks, the effect stores the integer passed to it fine but the actual usable values are essentially -128 to 127. Once you hit 128 you get a rollover so it becomes -128, then -127 etc. until it wraps back into positives again. Using negatives in this effect is nearly pointless - any actual penalty will trump it. Use EffectACIncrease instead. 
###### nModifyType Breakdown for AC_VERSUS_DAMAGE_TYPE_ALL
Only AC_DODGE_BONUS will stack (bonus and penalties). The MAX_AC_DODGE_MOD ruleset.2da value will usually limit effects applying dodge to +20 maximum (but no minimum, and no negative minimum). However some feats add on Dodge after this is calculated. The total amount ends up being something akin to "all positive dodge bonuses minus all negative dodge bonuses, then capped to MAX_AC_DODGE_MOD". This means having +50 dodge can actually fully apply if there is -40 EffectACDecrease to dodge also applied, for instance where the total ends up at +10. 
The other types will apply a "Highest applies" mantra - a 2 decrease of type AC_ARMOUR_ENCHANTMENT_BONUS when the creature has a 5 decrease to AC on their armor slot item will mean the effect essentially does nothing (unless the armor is taken off, then it will apply as the highest if nothing else applies such a type). 
##### Specific Damage Types or vs. Alignment or Racial Type

This is broken - see Known Bugs. 
The behaviour below is basically copied from EffectACIncrease; and is how it should work. It appears anything versus a racial type or damage types won't work correctly at all. 
If you have anything other than AC_VS_DAMAGE_TYPE_ALL specified, in fact even if you specify DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING | DAMAGE_TYPE_SLASHING together (ie integer value 7) rather than using the 4103 magic number (which adds in DAMAGE_TYPE_BASE_WEAPON), then the effect is not present on the character sheet but is calculated on each attack being done. This also is the case if you happen to do an VersusRacialTypeEffect or VersusAlignmentEffect. 
This also means the 127 limit and "overflow" doesn't occur. You can also bypass the MAX_AC_DODGE_MOD ruleset.2da value by using this method, and thusly have an effect like FEAT_DODGE where the +1 Dodge AC will apply above the given 20 cap. 
You can _technically_ specify any DAMAGE_TYPE_* value, but none of them matter except Bludgeoning, Piercing and Slashing - the base weapon damage is used to determine if an AC will apply. For instance if you specify DAMAGE_TYPE_FIRE it won't apply ever, even if the damage done by the weapon includes fire type damage. 
As noted above for weapons with more than one damage type then all the damage types count for AC changes. A Halberd (Slashing and Piercing) versus DAMAGE_TYPE_SLASHING and DAMAGE_TYPE_PIERCING will apply both at once. It won't choose one to be the "best" at. 
As with the general AC modifiers you can stack Dodge increases, but not any other type, where only the highest applicable value will work. It will check all the applicable ones dynamically - so the weapon equipped, the racial type and alignment are all properly checked. 
#### Known Bugs
Penalties to Dodge AC, making the Dodge AC modifier go into a negative value, will be ignored if the target is flatfooted. Since the game assumes these penalties always apply, the game actually gives the creature a higher AC in these cases. There is also the issue that even if it was fixed, it'd have to only count the decreases to properly apply the penalty. 
Penalties for other AC types don't stack, even though typically all penalties should apply (similar to EffectAttackDecrease). Bioware tended to use Dodge as the general AC decrease, which with the above bug means it interacts very oddly when multiple spells affect a targets AC. 
Deflection AC penalties seem to not apply versus touch attacks: 
ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectACDecrease(100, AC_DEFLECTION_BONUS), OBJECT_SELF);TouchAttackMelee(OBJECT_SELF); // penalty will not be applied to touch attacks, but will apply to usual attacks
There is a bug that if you use the nDamageType or vs Alignment/vs. Racial Types it appears to not apply the penalty at all. The effect is applied, but nothing happens, for instance this will never apply -10 AC versus Animals: 
ApplyEffectToObject(DURATION_TYPE_PERMANENT, VersusRacialTypeEffect(EffectACDecrease(10, AC_DEFLECTION_BONUS), RACIAL_TYPE_ANIMAL), OBJECT_SELF);
There is also a bug when applying a specific DAMAGE_TYPE_* change to AC_DODGE_BONUS, eg: 
ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectACDecrease(10, AC_DODGE_BONUS, DAMAGE_TYPE_SLASHING), OBJECT_SELF);
If removed it will apply an general +10 bonus to Dodge AC. This number stays until a module is restarted and cannot be removed by any means. It only applies to AC_DODGE_BONUS when applying a specific nDamageType. 
#### Version
1.62 
#### Example
// Apply a penalty of 5 Dodge AC to the target. This should just// lower their AC by 5.void main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDodgePenalty = EffectACDecrease(5, AC_DODGE_BONUS); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_REDUCE_ABILITY_SCORE); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDodgePenalty, oTarget);}
#### See Also
functions:  |  EffectAttackIncrease   

constants:  |  DAMAGE_TYPE_* Constants
