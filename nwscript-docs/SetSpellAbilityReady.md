<!-- Source: https://nwnlexicon.com/index.php/SetSpellAbilityReady -->

# SetSpellAbilityReady(object, int, int)
Set the ready state of a spell ability slot. 
void SetSpellAbilityReady( object oCreature, int nIndex, int bReady = TRUE);
#### Parameters 

oCreature
    The creature to check the spell ability of 

nIndex
    the index of the spell ability. Bounds: 0 <= nIndex < GetSpellAbilityCount() 

bReady
    Use TRUE to mark the slot ready, FALSE to unready.
#### Description
Set the ready state of a spell ability slot. 
#### Remarks
5 castings of Fireball would not be 1 spell ability, but instead of 5 instances of the same ability - while the toolset groups them together, technically each one could have a different caster level (although it's reasonably safe to assume they're the same level and it is highly recommended to keep them the same). 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetSpellAbilityCount, GetSpellAbilitySpell, GetSpellAbilityCasterLevel, GetSpellAbilityReady
