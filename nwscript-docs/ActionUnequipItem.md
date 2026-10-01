<!-- Source: https://nwnlexicon.com/index.php/ActionUnequipItem -->

# ActionUnequipItem(object)
Makes the executing creature unequip an object and place it in their inventory. 
void ActionUnequipItem( object oItem);

### Parameters 

oItem
    The item to unequip.
### Description
Causes the action subject (PC or NPC) to unequip oItem and place it in their inventory. 
### Remarks
Will do nothing if oItem is not valid. 
oItem is not destroyed, but placed in the calling object's (PC or NPC) inventory. 
You do not need to unequip an item before equipping another one, as equip functions (like ActionEquipItem) handle this automatically. 
### Version
1.27 
### Example
// Make a PC remove their clothing in an OnEnter scriptvoid main() { object oPC = GetEnteringObject(); if (GetIsPC(oPC)) { AssignCommand(oPC, ActionUnequipItem(GetItemInSlot(INVENTORY_SLOT_CHEST , oPC))); }}
### See Also
functions:  | ActionEquipItem, GetItemInSlot
