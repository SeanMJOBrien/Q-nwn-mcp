<!-- Source: https://nwnlexicon.com/index.php?title=EffectDamageReduction&amp;action=history -->

# EffectDamageReduction(int, int, int)
Create a Damage Reduction effect. 
effect EffectDamageReduction( int nAmount, int nDamagePower, int nLimit = 0, int bRangedOnly = FALSE);
#### Parameters 

nAmount
    The amount of damage reduction. 

nDamagePower
    The amount of enchantment bonus power required to penetrate the damage reduction. Instead of using the DAMAGE_POWER_* constants use the raw numbers since +6 and above is bugged, see Effect Breakdown. Note 22 is also an accepted value, but any value less than 0 or over 22 gets defaulted to 0 (DAMAGE_POWER_NORMAL). 

nLimit
    How much damage the effect can absorb before disappearing. Set to zero for infinite (Default: 0) 

bRangedOnly
    Set to TRUE to have this reduction only apply to ranged attacks (Default: FALSE)
#### Description
Returns a new effect object that when applied to the target will lower the amount of damage they take. This effect can be dispersed after a set amount of damage has been soaked or it can be infinite. 
Damage reduction is specifically to stop Physical damage - anything that isn't Piercing, Bludgeoning or Slashing damage will not be counted with this effect. 
For instance, if we have put on 10/+5 damage reduction, with a limit of 100 damage until it collapses, we will receive 10 less damage from physical attacks (or none at all if it is 10 or under) and that amount will be removed, until it is gone. In this example, if I keep hitting for 1 damage, with a +1 sword, it would do nothing until I had hit 101 times - the 100th time would mean it collapses, and the next one does damage. If I hit with a +5 sword however, I'd do damage every time (and the barrier would stay up). 
Damage reduction doesn't stack, and only the highest that can stop the possible damage will apply - having some 10/+10, 5/+15, and 50/+1, and you are hit with a +4 weapon will reduce it by 10, not 15 or 25. 
The limit of nAmount and nLimit (Apart from 0, unlimited) is unknown. You cannot use negative values. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
When using bRangedOnly it only applies to ranged weapon attacks explicitly, you can't specify damage in EffectDamage as coming from range. 
#### Remarks
The description sums up how it works, for anyone who doesn't know. The limit, if reached in the same time as an attack, will reduce it by the amount left (EG: we have 5 left on a 10/+5 damage reduction, and are hit for 15 damage, it'd remove 5 of it and do 10 damage, and the reduction collapses). 
This is useful for stoneskin type effects, or those which stop all weapon damage. To stop elemental damage, there are other functions. Elemental damage is never prone to any kind of Damage Power rating. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect tutorial for more details. 
#### Effect Breakdown
Some notes on DAMAGE_POWER_* values: 
  * DAMAGE_POWER_NORMAL can be used but makes the effect useless - all damage gets through obviously!
  * DAMAGE_POWER_ENERGY acts like DAMAGE_POWER_PLUS_SIX, in so far as +5 weapons will not penetrate it, but +6 weapons will penetrate.
  * DAMAGE_POWER_PLUS_SIX and higher act as +1 over their intended value, such as SIX being +7 needed to penetrate.
  * The non-constant value "22" (which would be "DAMAGE_POWER_PLUS_TWENTY_ONE" technically) does work, and stops +20 weapons. This essentially makes it like a form of Damage Resistance for all physical damage types at once. It's unknown if a fixed EffectDamage could penetrate such damage reduction.
  * EffectDamage now in NWN:EE correctly penetrates Damage Reduction if the appropriate power is used.

It also affects creature weapons (and only creature weapons) damage penetration. The highest DR effect applied, eg a Stoneskin spell which is say 100/+5, makes each creature weapon +5 to penetrate DR (but doesn't add bonuses to hit or damage like a usual magic item). A creature with creature weapons and an equipped weapon will only use the equipped one primarily, and has to unequip to use the creature weapons. 
Soak damage on items is essentially this effect with nLimit being 0. 
Still to investigate: 
  * Having multiple damage reductions and damage resistances, and damage immunities and how they interact (do they stack/highest is taken/etc).

nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nAmount | The amount of damage reduction in place.   
1 | nPower | The DAMAGE_POWER_* constant of reduction applied.   
2 | nLimit | The amount of damage reduction remaining, this changes as the creature is hit. If it is 0 then it is unlimited, ala an item property. Note unlike EffectSpellLevelAbsorption there is no "Is Unlimited?" extra variable, it is just if this is 0.   
#### Known Bugs
There are some bugs that need testing and explaining here in full, around the fact DAMAGE_POWER_ENERGY seems to mess up the consistency of the 1-20 range of /+X values for this and the item property equivalent. 
#### Version
This function was updated in 1.87.8193.35 of NWN:EE. EffectDamage now correctly works with damage power for physical damage types to properly penetrate EffectDamageReduction. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed EffectDamageReduction() not always being checked on placeables and doors when other effects are applied. 
This function was updated in 1.88.8193.36 of NWN:EE. EffectDamageResistance() and EffectDamageReduction() now have a bRangedOnly parameter. 
#### Example
// Sample code for applying unlimited 10/+4 damage reduction// to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eReduction = EffectDamageReduction(10, DAMAGE_POWER_PLUS_FOUR); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SUPER_HEROISM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eReduction, oTarget);}
#### See Also
functions:  |   EffectDamageResistance   

constants:  |   DAMAGE_POWER_* Constants
