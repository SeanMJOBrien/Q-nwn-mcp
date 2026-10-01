<!-- Source: https://nwnlexicon.com/index.php/GetPCItemLastEquippedSlot -->

# GetPCItemLastEquippedSlot()

Returns the  INVENTORY_SLOT_*  constant of the last item equipped. 
int GetPCItemLastEquippedSlot();
#### Description
Returns the  INVENTORY_SLOT_*  constant of the last item equipped. Can only be used in the module's OnPlayerEquipItem event. 
Returns -1 on error. 
#### Remarks
Use to have, say, an item apply some kind of cursed effect when equipped. 
#### Version
This function was added in 1.87.8193.35 of NWN:EE. 
#### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

#### See Also
constants:  |  INVENTORY_SLOT_* Constants   

functions:  |  GetPCItemLastEquipped () GetPCItemLastUnequippedSlot()   
events:  |  OnPlayerEquipItem Event
