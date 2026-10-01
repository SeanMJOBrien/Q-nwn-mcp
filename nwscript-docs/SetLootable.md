<!-- Source: https://nwnlexicon.com/index.php/SetLootable -->

# SetLootable

# SetLootable(object, int)
Sets whether a creature leaves a lootable corpse upon death 
void SetLootable( object oCreature, int bLootable);
#### Parameters
_oCreature_
NPC to set as lootable or not 
_bLootable_
TRUE or FALSE 
#### Description
Sets the lootable state of a *living* NPC creature. This function will *not* work on players or dead creatures. 
#### Remarks
This corresponds to the "leaves lootable corpse" NPC property (under advanced in the NPC's properties). Only NPCs can be lootable, and their lootable state must be set BEFORE they die. 
#### Known Bugs
Simply calling SetLootable doesn't appear to be sufficient to have the NPC leave a lootable corpse. The corpse left behind isn't selectable. To make a corpse lootable, add the two lines of code below to the end of the NPC's OnSpawn script: 
#### Version
1.61 
#### Example
SetIsDestroyable(TRUE, FALSE, TRUE);DelayCommand(1.0, SetLootable(OBJECT_SELF, TRUE));
#### See Also
functions:  |   GetLootable
