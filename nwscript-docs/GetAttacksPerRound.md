<!-- Source: https://nwnlexicon.com/index.php/GetAttacksPerRound -->

# GetAttacksPerRound(object, int)
Gets the base number of attacks oCreature can make every round. 
void GetAttacksPerRound( object oCreature, int bCheckOverridenValue= FALSE);
#### Parameters 

oCreature
    The creature to check the attacks per round of 

bCheckOverridenValue
    Checks for SetBaseAttackBonus() on the creature, if FALSE will return the non-overriden version
#### Description
Gets the base number of attacks oCreature can make every round 
Excludes additional effects such as haste, slow, spells, circle kick, attack modes, etc. 
#### Remarks
Due to Epic Levels capping the attacks per round when a creature reaches level 20, this is useful to check how many attacks a creature gets by default without items/effects applied. 
#### Version
This function was added in 1.88.8193.36 of NWN:EE. 
#### Example
#### See Also
functions:  |  GetBaseAttackBonus, SetBaseAttackBonus
