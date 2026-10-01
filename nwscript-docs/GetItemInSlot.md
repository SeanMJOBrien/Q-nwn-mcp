<!-- Source: https://nwnlexicon.com/index.php/GetItemInSlot -->

# GetItemInSlot(int, object)
Retrieve the item in a given inventory slot of a creature. 
object GetItemInSlot( int nInventorySlot, object oCreature = OBJECT_SELF);
#### Parameters 

nInventorySlot
     INVENTORY_SLOT_*  

oCreature
    Target creature. (Default: OBJECT_SELF)
#### Description
Returns the object which is in oCreature's specified inventory slot (nInventorySlot). 
Returns OBJECT_INVALID if oCreature is not a valid creature or there is no item in nInventorySlot. 
#### Remarks
Remember that the INVENTORY_SLOT_* constants are actually integers from 0 to 17 (or, if Bioware ever decides to add more slots, 0 to NUM_INVENTORY_SLOTS - 1). Thus, you can create a for loop to cycle through somebody's equipped items. See example. 
Also while creature weapons and items cannot be seen in the UI (even by DMs) they can still be equipped - and even used - by players, especially the "Creature Armor" one commonly used to store "permanent" effects. 
#### Version
1.32 
#### Example
//Strip entering player to the bonevoid main(){ object oPC=GetEnteringObject(); if((oPC)) return; object oItem; int nSlot; for (nSlot=0; nSlot < NUM_INVENTORY_SLOTS; nSlot++) { oItem=GetItemInSlot(nSlot, oPC); //unequip if valid if(GetIsObjectValid(oItem)) AssignCommand(oPC, ActionUnequipItem(oItem)); }}
#### See Also
functions:  |   GetBaseItemType   

constants:  |   INVENTORY_SLOT_* Constants
