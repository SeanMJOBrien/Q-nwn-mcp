<!-- Source: https://nwnlexicon.com/index.php/GetSpellAbilityCount -->

# GetSpellAbilityCount(object)
Gets the total number of spell abilities a creature has. 
void GetSpellAbilityCount( object oCreature);
#### Parameters 

oCreature
    The creature to check the spell ability count of
#### Description
Gets the total number of spell abilities a creature has. 
Returns 0 in error. 
#### Remarks
5 castings of Fireball would not be 1 spell ability, but instead of 5 instances of the same ability - while the toolset groups them together, technically each one could have a different caster level (although it's reasonably safe to assume they're the same level and it is highly recommended to keep them the same). 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetSpellAbilitySpell, GetSpellAbilityCasterLevel, GetSpellAbilityReady, SetSpellAbilityReady
