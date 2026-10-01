<!-- Source: https://nwnlexicon.com/index.php/ActionTakeItem -->

# ActionTakeItem(object, object)
Takes an item from an object. 
void ActionTakeItem( object oItem, object oTakeFrom);

### Parameters 

oItem
    The item to take. 

oTakeFrom
    The object from which to take the item.
### Description
Take oItem from oTakeFrom. If oItem is not a valid item, or oTakeFrom is not a valid object, nothing will happen. This will remove an item worn by or carried by a PC. 
### Remarks
This action can only be performed by objects that are capable of having an inventory. The taking object need not actually have an inventory, but must be capable of having one. If the object doing the taking does have an inventory, then oItem is moved to their inventory automatically. If the taking object doesn't have an inventory, items taken with this action are not destroyed, but linger in an unknown state. They remain valid objects, and can be restored with ActionGiveItem. 
### Known Bugs
There were previous reported bugs that seem have been fixed. 
### Example
// In a trigger's OnEnter, this causes a placeable with tag "plc_mystery" to// strip a PC, compliment their physique, and restore their clothing.#include "nw_i0_generic"void main(){ object oPC = GetEnteringObject(); if ((oPC)) return; // Tag of an invisible object prepared earlier object oMystery = GetObjectByTag("plc_mystery"); object oClothes = GetItemInSlot(INVENTORY_SLOT_CHEST , oPC); // Tell us whether oMystery has an inventory so we can see what happens to // oClothes when we take them. If oMystery has an inventory, they go to the // inventory. Otherwise, they go to Limbo. This is reflected by the message // the NPC gives later on when we call HasItem() if (GetHasInventory(oMystery)) SendMessageToPC(oPC, "Yup, oMystery has an inventory"); else SendMessageToPC(oPC, "Nope, no inventory here"); // Using AssignCommand so sequence is preserved AssignCommand(oMystery, ActionTakeItem(oClothes, oPC)); AssignCommand(oMystery, ActionDoCommand(SendMessageToPC(oPC, "HasItem on oMystery says: " + IntToString(HasItem(oMystery, GetTag(oClothes)))))); AssignCommand(oMystery, DelayCommand(1.0, ActionSpeakString("Hey, great abs! You been working out?"))); AssignCommand(oMystery, DelayCommand(3.0, ActionGiveItem(oClothes, oPC))); AssignCommand(oMystery, DelayCommand(3.1, AssignCommand(oPC, ActionEquipItem(oClothes, INVENTORY_SLOT_CHEST))));}
### See Also
functions:  | ActionGiveItem, TakeNumItems
