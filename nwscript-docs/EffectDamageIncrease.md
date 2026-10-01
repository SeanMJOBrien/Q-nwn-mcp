<!-- Source: https://nwnlexicon.com/index.php/EffectDamageIncrease -->

# EffectDamageIncrease(int, int)
Create a Damage Increase effect to increase a creatures melee damage done. 
effect EffectDamageIncrease( int nBonus, int nDamageType=DAMAGE_TYPE_MAGICAL);
#### Parameters 

nBonus
    The amount of extra damage to do as defined in the DAMAGE_BONUS_* constants group (must match an entry in iprp_damagecost.2da). 

nDamageType
    The type of damage that will be increased as defined by the DAMAGE_TYPE_* constants group. Cannot be concatenated, and cannot be DAMAGE_TYPE_BASE_WEAPON. (Default: DAMAGE_TYPE_MAGICAL)
#### Description
Returns a new effect object that when applied to the target, will increase the amount of damage they do by nBonus amount. 
Any physical damage type specified (Slashing, Piercing, Bludgeoning) will increase weapon damage regardless of which one is used. For instance a Longsword with EffectDamageIncrease(DAMAGE_BONUS_5, DAMAGE_TYPE_BLUDGEONING) will make it 1d8 + 5 physical slashing damage on hit. 
An interesting facet - you can use EffectDamageIncrease(1, DAMAGE_TYPE_BLUDGEONING | DAMAGE_TYPE_SLASHING | DAMAGE_TYPE_PIERCING); which will appear on the character sheet correctly as "+1 Physical damage" which is actually what occurs. 
Any elemental damage type specified (Fire, Sonic, Magical, etc.) will provide bonus elemental damage of that type. For instance a Longsword +5 Fire Damage with EffectDamageDecrease(DAMAGE_BONUS_5, DAMAGE_TYPE_FIRE) will do 1d8 physical slashing damage +5 fire damage. 
Don't combine elemental damage types, instead create multiple ones and link them together in one effect link. 
See EffectDamageDecrease for how that interacts with these, essentially the same way, with physical decreases affecting base weapon damage, and specific elemental decreases affecting just those elements not base weapon. 
The target this effect is applied to must be a creature for it to work. This effect should not be applied instantly, only temporarily or permanently. 
#### Remarks
As noted above you increase the base damage of the weapon the person is using (or fists if no weapon) with physical types, while elemental ones apply a specific bonus to that particular damage type. 
To have a weapon bypass different types - eg; getting around a Belt of Piercing that has +20 resistance to Piercing damage, you need to use ItemPropertyExtraMeleeDamageType or ItemPropertyExtraRangeDamageType. Alternatively a On Hit: Spell item property that does a manual EffectDamage. 
Effect functions are Constructors, which are special methods that help construct effect "objects". You can declare and link effects, and apply them using an ApplyEffectToObject() Command. Once applied, each effect can be got separately via looping valid effects on the target (GetFirst/NextEffect()). See the Effect Tutorial for more details. 
#### Effect Breakdown
Like EffectDamageDecrease it will apply a "MISC" effect that affects all attacks of the creature, not any particular slot. This means it affects all weapons (ranged, melee, fists, creature weapons etc). 
This is in contrast to EffectAttackIncrease and EffectAttackDecrease which have the MISC as default, but optional an parameter to apply it to a specific item slot. 
If the damage is decreased by EffectDamageDecrease the amount of bonus damage applied is capped at a minimum of 1 for that damage type. For instance if you have +3 fire damage from this effect, a -5 from EffectDamageDecrease will not reduce it past 1. 
The character sheet has some major bugs around displaying the right values - it only ever shows one from each damage type, so you have +5 Fire damage and +10 Fire damage, you'd only see +10 in the character sheet. The effects appear to stack correctly, along with EffectDamageDecrease noting the minimum of 1 after all increases/decreases. 
Spells using this effect will not stack if more than one is applied using the same ID. Only the first instance of an effect is taken. You can check this with GetEffectSpellId. 
nIndex  | Parameter Value  | Description and Notes   
---|---|---  
GetEffectInteger  
0 | nBonus | Bonus to damage. Should be an DAMAGE_BONUS_* constant or entry in iprp_damagecost.2da   
1 | nDamageType | The damage type specified to decrease. Noting that any of the 3 physical ones change base weapon damage, the elemental ones add on bonus elemental damage.   
2 | nRacialType | 28 (RACIAL_TYPE_INVALID) by default, or if VersusRacialTypeEffect is used is a RACIAL_TYPE_* value from racialtypes.2da that this effect will apply against only.   
3 | nLawChaos | 0 (any) by default, or if VersusAlignmentEffect is used it is the nLawChaos parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
4 | nGoodEvil | 0 (any) by default, or if VersusAlignmentEffect is used it is the nGoodEvil parameter and related to ALIGNMENT_* constants that this effect will apply against only.   
#### Version
1.62 
#### Example
// Sample code for applying 5 fire damage bonus for melee// attacks of a targetvoid main(){ // This is the Object to apply the effect to. object oTarget = OBJECT_SELF; // Create the effect to apply effect eDamageIncrease = EffectDamageIncrease(DAMAGE_BONUS_5, DAMAGE_TYPE_FIRE); // Create the visual portion of the effect. This is instantly // applied and not persistent with whether or not we have the // above effect. effect eVis = EffectVisualEffect(VFX_IMP_SUPER_HEROISM); // Apply the visual effect to the target ApplyEffectToObject(DURATION_TYPE_INSTANT, eVis, oTarget); // Apply the effect to the object  ApplyEffectToObject(DURATION_TYPE_PERMANENT, eDamageIncrease, oTarget);}
#### See Also
functions:  |   EffectDamageDecrease   

constants:  |   DAMAGE_TYPE_* Constants  DAMAGE_BONUS_*
