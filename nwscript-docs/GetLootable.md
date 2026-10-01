<!-- Source: https://nwnlexicon.com/index.php/GetLootable -->

# GetLootable

# GetLootable(object)
Returns the lootable state of a creature 
int GetLootable( object oCreature);
#### Parameters
_oCreature_
NPC to determine whether is lootable 
#### Description
Returns the lootable state of a creature. 
#### Remarks
This corresponds to the "leaves lootable corpse" NPC property (under advanced in the NPC's properties). Only NPCs can be lootable, and their lootable state must be set BEFORE they die. Function will return FALSE if oCreature is a PC or not a creature. 
#### Version
1.61 
#### See Also
functions:  |   SetLootable  SetIsDestroyable
