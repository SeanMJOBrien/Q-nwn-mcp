<!-- Source: https://nwnlexicon.com/index.php/ActionPutDownItem -->

# ActionPutDownItem(object)

Causes the subject to place an item on the ground at it's feet. 
void ActionPutDownItem( object oItem);
#### Parameters 

oItem
    The item to be put down.
#### Description
Subject will crouch down and place oItem on the ground at its feet. If an error occurs the log file will contain "ActionPutDownItem failed." 
#### Known Bugs
ActionPutDownItem captures the location to drop the item at as soon as the command is added to the action queue. This means if you tell a npc to move from point A to point B and then drop an item it will move to point B and then run (or sometimes "slide") back to point A and drop the item there. This is only a problem if you want the NPC to move before dropping something; workarounds include using DelayCommand() or create some clunky system where you put the ActionPutDownItem() part in a separate script and execute it using ActionDoCommand(). 
#### Version
1.28 
#### Example
// Have the NPC drop their weapon when they surrender in a conversationvoid main(){ object oWeapon = GetItemInSlot(INVENTORY_SLOT_RIGHTHAND); ActionPutDownItem(oWeapon);}
#### See Also
functions:  |  ActionPickUpItem
