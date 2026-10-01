<!-- Source: https://nwnlexicon.com/index.php/GetFirstItemInInventory -->

# GetFirstItemInInventory(object)
Determines the first item in an object's inventory. 
object GetFirstItemInInventory( object oTarget = OBJECT_SELF);
### Parameters 

oTarget
    The object that has the inventory. (Default: OBJECT_SELF)
### Description
Returns the first item in oTarget's inventory (start to cycle through oTarget's inventory) and OBJECT_INVALID if the caller is not a creature, item, placeable, or store, or if no item is found. 
### Remarks
Look at the second example script for an excellent function for determining if a faction has an item or a certain quantity of an item equipped; this can be done with a for loop because the integers associated with INVENTORY_SLOT_* start at 0 and end at 17 (for 18 total possible equipped slots). 
When an item with an inventory (such as a bag of holding) is returned using the GetFirstItemInInventory() and GetNextItemInInventory() functions, the next call to GetNextItemInInventory() will start to look inside the nested inventory (e.g. the bag of holding's inventory). You can also specifically just search a given inventory bag/container, by starting a new loop with GetFirstItemInInventory(oItemContainer); which will preserve the original loop on the given creature or placeable. 
### Version
1.62 
### Example
// This function counts up the total number of items in the first PC's inventory. (The number of items in a stackable count toward the total)void main(){ int nItems = 0; object oItem = GetFirstItemInInventory(GetFirstPC()); while (GetIsObjectValid(oItem)) { nItems = nItems + GetNumStackedItems(oItem); oItem = GetNextItemInInventory(GetFirstPC()); }}/* CheckFactionForItems example With this function, you can check, whether a faction has got a certain amount of a certain item in its members inventories or equipped items. Created By: Arlas Gilhith (arlas@cyberlife-studios.de) Created On: 29.07.2003*/int CheckFactionForItems(object oMemberOfFaction, string sItem, int nAmount = 2){ int i, nCount; object oMember = GetFirstFactionMember(oMemberOfFaction, FALSE); object oItem; // loop through members while (GetIsObjectValid(oMember) && (nCount < nAmount)) { // check inventory for item oItem = GetFirstItemInInventory(oMember); while (GetIsObjectValid(oItem) && (nCount < nAmount)) { if (GetTag(oItem) == sItem) nCount++; oItem = GetNextItemInInventory(oMember); } // If we've already reached the max number of items, don't bother // looping through their equipped items. if (nCount >= nAmount) break; // check equipped items for item for (i = 0; i < NUM_INVENTORY_SLOTS; ++i) { oItem = GetItemInSlot(i, oMember); if (GetIsObjectValid(oItem)) && (GetTag(oItem) == sItem)) nCount++; } oMember = GetNextFactionMember(oMemberOfFaction, FALSE); } return (nCount >= nAmount);}// This example (used as starting conditional in a dialogue) checks whether the// faction of the speaker has got four hatchets.int StartingConditional(){ return CheckFactionForItems(OBJECT_SELF, "NW_WAXHN001", 4);}
### See Also
functions:  | GetNextItemInInventory
