<!-- Source: https://nwnlexicon.com/index.php?title=GetItemPossessor&amp;action=history -->

# GetItemPossessor(object, int)
Get the creature or object who possesses a specified item. 
object GetItemPossessor( object oItem, int bReturnBags = FALSE);
#### Parameters 

oItem
    Target item. 

bReturnBags
    If TRUE will potentially return a bag container item the item is in, instead of the object holding the bag. Make sure to check the returning item object type with this flag.
#### Description
Returns the object which has oItem in its inventory. 
Returns OBJECT_INVALID if item was not found in any object's inventory. 
Note that it could be in the possession of a store object, a placeable (with inventory) object, or a creatures inventory (which is what is usual). 
Basically, if it return OBJECT_INVALID, it is either on the ground, in "limbo" during a PC to PC transaction (Barter), or oItem doesn't exist. 
With bReturnBags you can not check a given item (eg in a loop using GetFirstItemInInventory) is in a bag container inside an inventory, previously this was difficult to do. 
#### Remarks
Things are a bit complicated if you have multiple copies of an item, all with the same tag. If you want to get the nearest creature which possesses the item, you can't just use GetNearestObjectByTag() to identify the item, because this function does not work on objects in a creature's inventory. 
You have to use GetObjectByTag(), using the "nNth" argument to cycle through all copies in the game. Then use GetItemPossessor() to determine the owner of each item, and GetDistanceToObject() to determine which creature is nearest. 
Note, of course, that if an object possesses oItem, then GetItemPossessedBy(oPossessor, GetTag(oItem)) will return that item, or, as noted above, one with the same tag. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. GetItemPossessor() now has a bReturnBags parameter. 
#### Example
// If the item tagged "KING_CROWN" is in someone's inventory, // or somethings inventory, we will tell the first PC who has it.void main(){ // Get the first PC in the module (suitable for singleplayer games) object oPC = GetFirstPC(); // Get the crown object oCrown = GetObjectByTag("KING_CROWN"); // Get the possessor object oPossessor = GetItemPossessor(oCrown); // Tell the PC about the possessor if(GetIsObjectValid(oPossessor)) { // Tell the PC about who has it SendMessageToPC(oPC, "The kings crown is held by " + GetName(oPossessor)); } else { // It is on the ground/somewhere else, tell them. SendMessageToPC(oPC, "The kings crown is probably on the ground right now"); }}
#### See Also  
---
