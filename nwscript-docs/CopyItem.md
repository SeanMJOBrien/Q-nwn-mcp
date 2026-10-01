<!-- Source: https://nwnlexicon.com/index.php?title=CopyItem&amp;action=history -->

# CopyItem(object, object, int)

Duplicates an item. 
object CopyItem( object oItem, object oTargetInventory = OBJECT_INVALID, int bCopyVars);
### Parameters 

oItem
    Item to copy. 

oTargetInventory
    Create the item within this inventory (Default: OBJECT_INVALID) 

bCopyVars
    If TRUE, local variables on item are copied
### Description
Duplicates the item and returns a new object, an exact copy of oItem. 
Will normally return the new item, else on error, returns OBJECT_INVALID for non-items. 
Can only copy empty item containers (such as magical bags). Will return OBJECT_INVALID if oItem contains other items, and fail. 
If it is possible to merge this item with any others in the target location, then it will do so and return the merged object. 
With stores the object may have strange behaviour if a tag matches. This especially occurs if an existing item has the Infinite flag ticked. It essentially is merged and "disappears" even if the item properties, name, or description were first changed. Changing the tag before copying the item (or using CopyObject with a new tag) can work around this. 
Note that if oTargetInventory is OBJECT_INVALID, there may be 2 places an item is created. If it is on the ground, an exact copy will be placed at the same location on the ground. If it is in some kind of inventory (Store, Backpack, Box etc) it will create it inside the inventory. 
To force the item to copy to a location, you must use CopyObject() (it doesn't have the bCopyVars parameter, but the variables will still be copied). 
### Remarks
This function doesn't seem to be able to do anything that CopyObject() can't do, but it leaves out the mandatory input of a location. 
Can be used for custom treasure systems by finding an item in a treasure holder container, and then calling CopyItem() to make a copy of the item in the container or creature calling the function. 
This function does not copy Cursed (undroppable) flag on the item. 
### Known Bugs
Copy fails when oItem is a Plot item and oTargetInventory is a store object. Rather than placing the item in the store's inventory, the item is created on the ground at the store's location. You can work around this by removing the plot flag and re-applying it to the newly copied item: 
object oItem = GetObjectByTag("testaxe");object oStore = GetObjectByTag("teststore");int bPlot = GetPlotFlag(oItem);if (bPlot) SetPlotFlag(oItem,FALSE);object oNew = CopyItem(oItem, oStore, TRUE);if(bPlot){ SetPlotFlag(oItem, TRUE); SetPlotFlag(oNew, TRUE);}
This may be "expected behavior" for the game engine, since you can't sell plot items to a store. But since the toolset allows plot items in a store inventory, this nuance is worth recording. 
### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed CopyItem() not copying the hidden when equipped field. 
### See Also
functions:  | CreateItemOnObject
