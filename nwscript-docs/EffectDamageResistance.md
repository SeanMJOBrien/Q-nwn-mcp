<!-- Source: https://nwnlexicon.com/index.php?title=EffectDamageResistance&amp;action=history -->

# EffectDamageResistance(int, int, int)
Returns a new effect object that makes the target more resistant to certain types of damage. 
effect EffectDamageResistance( int nDamageType, int nAmount, int nLimit = 0, int bRangedOnly = FALSE);
#### Parameters 

nDamageType
    The type of damage to resist as defined in the  DAMAGE_TYPE_*  constants group. You can compound these, ala DAMAGE_TYPE_FIRE | DAMAGE_TYPE_ACID will resist acid or fire up to nLimit. However see Effect Breakdown, you can't combine every option (anything along with SONIC fails and defaults back to DAMAGE_TYPE_MAGIC). 

nAmount
    The amount of damage to soak each time the target is damaged. 

nLimit
    The maximum amount of damage that can ever be soaked by the effect before being dispersed. If set to 0, the effect will be infinite. (Default: 0) 

bRangedOnly
    Set to TRUE to have this reduction only apply to ranged attacks (Default: FALSE)
#### Description
Returns a Damage Resistance effect that removes the first nAmount points of damage of type nDamageType, up to nLimit (or infinite if nLimit is 0). 
Damage Resistance differs to Damage Reduction as it affects a specific type, or range of types, up to a limit, and doesn't in any way use Damage Power ratings, even if physical damage is put as the damage type. 
These do not stack, and only the highest damage resistance will apply to an attack of nDamageType. Damage resistance and Reduction may stack for physical damage, but the author is unsure. 
The limit of nAmount and nLimit (Apart from 0, unlimited) is functionally the max int32 value. 
When using bRangedOnly it only applies to ranged weapon attacks explicitly, you can't specify damage in EffectDamage as coming from range. 
#### Remarks
A previous remark about linking this to other effects of the same type and them sharing the nLimit between them appears to be wrong, although once one is removed when nLimit is reached all the effects in the linked chain are correctly removed. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via. looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
If there are multiple resistances that can be used against incoming damage, the game will take the "best" one from an attackers perspective if a weapon has multiple damage types. It will only take a singular effect however; so in this case for a Halberd (Slashing and Piercing): 
ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDamageResistance(DAMAGE_TYPE_SLASHING, 5, 20), OBJECT_SELF);ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDamageResistance(DAMAGE_TYPE_SLASHING | DAMAGE_TYPE_PIERCING, 8, 20), OBJECT_SELF);ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDamageResistance(DAMAGE_TYPE_PIERCING, 10, 20), OBJECT_SELF);
The Halberd will find the damage resistance from Slashing is 8, the damage resistance from piercing is 10, so it goes for the 8 middle effect. Once that is exhausted it will use the 5 resistance from the top effect. Finally it will not touch the 10 piercing resistance, since it does more from the slashing (the full amount at that point). 
When more than one effect can stop damage, it is reasonably "Dumb" and goes with the highest nAmount value. Overflows cannot occur and it can't work out the "best" to use or use more than one: 
ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDamageResistance(DAMAGE_TYPE_FIRE, 10, 11), OBJECT_SELF);ApplyEffectToObject(DURATION_TYPE_PERMANENT, EffectDamageResistance(DAMAGE_TYPE_FIRE, 5, 8), OBJECT_SELF);ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(20, DAMAGE_TYPE_FIRE), OBJECT_SELF);// Effect 1: 10 damage absorbed. 1 remaining. 10 damage dealt.ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(20, DAMAGE_TYPE_FIRE), OBJECT_SELF);// Effect 1: 1 damage absorbed. 0 remaining. 19 damage dealt.ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(20, DAMAGE_TYPE_FIRE), OBJECT_SELF);// Effect 2: 5 damage absorbed. 3 remaining. 15 damage dealt.ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(20, DAMAGE_TYPE_FIRE), OBJECT_SELF);// Effect 2: 3 damage absorbed. 0 remaining. 17 damage dealt.ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectDamage(20, DAMAGE_TYPE_FIRE), OBJECT_SELF);// No effects stop damage full 20 is dealt.
Therefore nLimit (which on item effects is essentially 0 or unlimited) is ignored for choosing which to use. Instead it just goes for the highest nAmount. 
This effect can take compounded values for the DAMAGE_TYPE_* which then do share a limit between the values. **However** you cannot compound things past the maximum 32bit value as of EE new damage type additions, For reference: 
int DAMAGE_TYPE_BLUDGEONING = 1;int DAMAGE_TYPE_PIERCING = 2;int DAMAGE_TYPE_SLASHING = 4;int DAMAGE_TYPE_MAGICAL = 8;int DAMAGE_TYPE_ACID = 16;int DAMAGE_TYPE_COLD = 32;int DAMAGE_TYPE_DIVINE = 64;int DAMAGE_TYPE_ELECTRICAL = 128;int DAMAGE_TYPE_FIRE = 256;int DAMAGE_TYPE_NEGATIVE = 512;int DAMAGE_TYPE_POSITIVE = 1024;int DAMAGE_TYPE_SONIC = 2048;// The base weapon damage is the base damage delivered by the weapon before// any additional types of damage (e.g. fire) have been added.int DAMAGE_TYPE_BASE_WEAPON = 4096;
You can actually concatenate damage types up to but not including the last one with EE's new damage types extension. 
int nDamageType = DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_PIERCING | DAMAGE_TYPE_SLASHING; // Integer value 7, validint nDamageType = DAMAGE_TYPE_ACID | DAMAGE_TYPE_COLD | DAMAGE_TYPE_ELECTRICAL | DAMAGE_TYPE_FIRE | DAMAGE_TYPE_SONIC; // Integer value 2480, valid in EE but not earlier 1.69int nDamageType = DAMAGE_TYPE_ACID | DAMAGE_TYPE_FIRE; // Integer value 272, valid
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nDamageType -  DAMAGE_TYPE_*  constants group. | This can be more than one bitwise value, but cannot be created with combination with DAMAGE_TYPE_SONIC.   
1 | nAmount | Amount of damage prevented. Ranks the effect to be chosen if higher than others.   
2 | nLimit | This value will change as the damage of this type is applied that reduces it. If 0 the damage resistance is unlimited.   
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. EffectDamageResistance() and EffectDamageReduction() now have a bRangedOnly parameter. 
#### Example
// Sample code for applying 5 resistance, limit of 10 to absorb,// to fire damage, to a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDamResist = EffectDamageResistance(DAMAGE_TYPE_FIRE, 5, 10); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SUPER_HEROISM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDamResist, oTarget);}
#### See Also
functions:  |   EffectDamageShield   

constants:  |   DAMAGE_TYPE_* Constants
