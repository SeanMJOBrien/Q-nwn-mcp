<!-- Source: https://nwnlexicon.com/index.php/ActionEquipItem -->

# ActionEquipItem(object, int)

Puts an item in possession into an inventory slot. 
void ActionEquipItem( object oItem, int nInventorySlot);

### Parameters 

oItem
    An item already in inventory 

nInventorySlot
    INVENTORY_SLOT_* constant matching the slot to equip the item into
### Description
Puts oItem into nInventorySlot (INVENTORY_SLOT_*) of the calling creature. The item must already be in the inventory of the target. If there is already an item in nInventorySlot, it will be swapped out for oItem, and placed back in the inventory. 
Returns nothing, but if an error occurs the log file will contain "ActionEquipItem failed." 
### Remarks
It is unnecessary to issue an ActionUnequipItem() call before equipping oItem. This action will fail on polymorphed creature, there is nothing in log though. 
### Known Bugs
Causes the game to crash when an invalid combination is specified. For example, if a creature has a short sword equipped in the main hand and a dagger equipped in the off hand, attempting to swap out the short sword for a dart causes a crash. 
If you use this command to equip clothing on a creature that has just been created in a location visible to a player, the game can crash. This does not happen all the time, but be aware that it can. 
### Version
1.61 
### Example
// Function made by Lilac Soul to illustrate the use of ActionEquipItem.// This function creates an armor with the resref "magic_armor" on an// entering PC and makes him or her equip it.void main(){ object oPC = GetEnteringObject(); // Not if the object isn't a PC if ((oPC)) return; // Give the armor to the PC - I could first have checked // to see if the PC already had one... object oArmor = CreateItemOnObject("magic_armor", oPC); // Put on the armor DelayCommand(0.5, AssignCommand(oPC, ActionEquipItem(oArmor, INVENTORY_SLOT_CHEST))); DelayCommand(0.7, AssignCommand(oPC, ActionSpeakString("Ah, a new armor. I'd better put it on.")));}
### See Also
functions:  | IPGetIsItemEquipable  

constants:  | INVENTORY_SLOT_* Constants
