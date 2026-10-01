<!-- Source: https://nwnlexicon.com/index.php/GetSpellAbilitySpell -->

# GetSpellAbilitySpell(object, int)
Gets the spell Id of the spell ability at the given index. 
void GetSpellAbilityCount( object oCreature, int nIndex);
#### Parameters 

oCreature
    The creature to check the spell ability of 

nIndex
    the index of the spell ability. Bounds: 0 <= nIndex < GetSpellAbilityCount()
#### Description
Gets the spell Id of the spell ability at the given index. 
Returns: a SPELL_* constant or -1 if the slot is not set. 
#### Remarks
5 castings of Fireball would not be 1 spell ability, but instead of 5 instances of the same ability - while the toolset groups them together, technically each one could have a different caster level (although it's reasonably safe to assume they're the same level and it is highly recommended to keep them the same). 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetSpellAbilityCount, GetSpellAbilityCasterLevel, GetSpellAbilityReady, SetSpellAbilityReady
