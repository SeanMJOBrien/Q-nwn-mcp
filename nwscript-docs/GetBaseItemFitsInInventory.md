<!-- Source: https://nwnlexicon.com/index.php/GetBaseItemFitsInInventory -->

# GetBaseItemFitsInInventory(int, object)

Check if a particular item type will fit into a given objects inventory. 
int GetBaseItemFitsInInventory( int nBaseItemType, object oObject);
#### Parameters 

nBaseItemType
    A BASE_ITEM_* constant. 

oObject
    A valid creature, placeable or item.
#### Description
Check if nBaseItemType fits in oTarget's inventory (Creature, Placeable, Store or Item with Inventory (box, magical bag)). 
Note: Does not check inside any container items possessed by oTarget. 
Returns: TRUE if the baseitem type fits, FALSE if not or on error. 
#### Remarks
This can be used in advance of doing CreateItemOnObject, CopyObject or ActionGiveItem to make sure a target (usually a PC) has enough space in their inventory to store the object. Player inventories cannot be reorganised. This can stop corner cases of a plot object you need to give a player not fitting, and it dropping to the ground mistakenly and being lost (or not being created at all). Instead you can have the object not go anywhere/not be created. 
It's especially useful to do this if you are planning on having the item be set as cursed so it cannot be removed from the inventory for whatever reason (plot important item, etc.). 
The reference to container items means you can loop the inventory of the target also looking for containers. 
If you need to clear the inventory to make room, note DestroyObject will not remove things straight away and the script will need to be re-run after the destroy command has been issued. 
Note stores _do_ have a technical limiting size (25 pages) but it's really big and usually not an issue. 
#### Known Bugs
Placeables have up to 25 pages but if an item cannot fit in the existing pages in use, but could on a new page, this still returns FALSE. Forum thread. To work around this either assume there is space in placeables, or generate then destroy items to get up to the 25 pages needed. 
#### Version
This function was added in 1.83.8193.21 of NWN:EE. 
#### Example
// OnUsed script that would give a plot Greatsword, which is a rather large weapon.// Since the object will be set as cursed let's not drop it on the ground main(){ object oUser = GetLastUsedBy(); if(GetBaseItemFitsInInventory(BASE_ITEM_GREATSWORD, oUser)) { object oSword = CreateItemOnObject("plot_gsword", oUser, 1); SetItemCursedFlag(oSword, TRUE); SendMessageToPC(oUser, "This sword you pulled from the rubble clings to you. You cannot seem to remove it from your inventory!"); } else { SendMessageToPC(oUser, "You find a greatsword but cannot fit it in your inventory. You need to make room to pick it up."); }}
#### See Also
functions:  |  GetBaseItemType CreateItemOnObject CopyObject ActionGiveItem  

constants:  |  BASE_ITEM_*
