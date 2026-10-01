<!-- Source: https://nwnlexicon.com/index.php?title=GetSpellAbilityCasterLevel&amp;action=history -->

# GetSpellAbilityCasterLevel(object, int)
Gets the caster level of the spell ability in the given slot. 
void GetSpellAbilityCasterLevel( object oCreature, int nIndex);
#### Parameters 

oCreature
    The creature to check the spell ability of 

nIndex
    the index of the spell ability. Bounds: 0 <= nIndex < GetSpellAbilityCount()
#### Description
Gets the caster level of the spell ability in the given slot. 
Returns: the caster level or -1 if the slot is not set. 
#### Remarks
5 castings of Fireball would not be 1 spell ability, but instead of 5 instances of the same ability - while the toolset groups them together, technically each one could have a different caster level (although it's reasonably safe to assume they're the same level and it is highly recommended to keep them the same). 
Caster level for spell abilities are capped at 15 currently due to engine limitations. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetSpellAbilityCount, GetSpellAbilitySpell, GetSpellAbilityReady, SetSpellAbilityReady
