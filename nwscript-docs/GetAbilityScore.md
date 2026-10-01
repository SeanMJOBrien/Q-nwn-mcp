<!-- Source: https://nwnlexicon.com/index.php?title=GetAbilityScore&amp;action=history -->

# GetAbilityScore

# GetAbilityScore(object, int, int)
Get the ability score of a specific type for a creature. 
int GetAbilityScore( object oCreature, int nAbilityType, int nBaseAbilityScore = FALSE);
#### Parameters
_oCreature_
The creature whose ability score is sought. 
_nAbilityType_
 ABILITY_* 
_nBaseAbilityScore_
If set to TRUE will return the base ability score without bonuses (e.g. ability bonuses granted from equipped items). If nothing entered, defaults to FALSE. 
#### Description
Returns the ability score of type nAbilityType for oCreature (otherwise 0). 
#### Known Bugs
Doesn't work and returns 0 before player execute the OnClientEnter event; that is in OnAcquire and OnEquip events for items the character wear. 
#### Version
1.67 
#### See Also
functions:  |   GetWisdom   

constants:  |   ABILITY_* Constants
