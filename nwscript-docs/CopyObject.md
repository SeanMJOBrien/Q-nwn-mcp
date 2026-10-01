<!-- Source: https://nwnlexicon.com/index.php?title=CopyObject&amp;action=history -->

# CopyObject(object, location, object, string)
Duplicates the object specified. 

 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

object CopyObject( object oSource, location locLocation, object oOwner = OBJECT_INVALID, string sNewTag = "", int bCopyLocalState = FALSE);
### Parameters 

oSource
    Object to be copied. Valid types: Creatures, Items, Placeables, Waypoints, Stores, Doors, Triggers. 

locLocation
    Destination location for the copied object (required). 

oOwner
    Item owner (for use when copying items into inventory) (Default: OBJECT_INVALID) 

sNewTag
    New tag for the copied object. This can be a maximum of 32 characters. (Default: "") 

bCopyLocalState
    If bCopyLocalState is TRUE, local vars, effects, action queue, and transition info (triggers, doors) are copied over. (Default: FALSE)
### Description
Duplicates the object (a Creature, Item, Placeable, Waypoint, Store, Door or Trigger) specified to the location locLocation. If oOwner does not equal OBJECT_INVALID and an item is being copied, the item will automatically be placed in oOwner's inventory instead (ie it becomes CopyItem). 
If sNewTag is specified, then that tag will be assigned to the copied object. 
If an item is created and oOwner is specified, locLocation must be the location of the owner to appear within that owner's inventory (i.e., GetLocation(oOwner)). 
### Remarks
Note that an objects UUID will not refresh when copied, so use ForceRefreshObjectUUID to sort UUID clashes in these cases. 
The object to copy can be a player - it creates an NPC version of them! 
Variables on the object are only copied to the new object for items, but not if copying a creature. 
It is worth noticing that CopyObject is much faster than CreateObject. This means that if you need multiple instances of something, it is much faster creating the first using CreateObject, and the following instances using CopyObject on that object. 
When iterating through a container, keep in mind that DestroyObject() doesn't occur until the script exits. 
If copying a creature object that is flagged as plot, any present negative effects (even from item properties) will not be transferred to the copy (even if they are present on the original). This means that these negative effects will not apply even when the plot flag is removed on the copy. To overcome this, simple remove the plot flag before copying. 
It will not copy a plot item into a store. 
To copy areas see CopyArea. 
### Known Bugs
If you are iterating through a dead PC's inventory and use CopyObject() on a container that has items within it, and copying to another placeable (a Corpse placeable for example) the items are duplicated. This occurs because the items belong both to the parent container and again to the child container. It may be possible to get around this unexpected behavior by marking each item already processed using SetLocalInt(), then seeing if an int value set exists on the item; if so do not copy the item (of course items in a copied object's inventory will have to be iterated through manually). 
It appears that if you try to make a copy at a non-existent location (like getting the location of a waypoint whose tag you misspelled...), it will crash the game. 
There are problems with the new tag as well. Calling GetTag() with the copied object as a parameter works, but calling GetObjectByTag() won't return the copy, or at least it won't all the time. Calling GetTag(GetObjectByTag("")) will also return the tag of the most recently copied object. 
Copy fails when oSource is a Plot item and oOwner is a store object.[[1]](http://forum.bioware.com/topic/558998-copy-item-into-store/) Rather than placing the item in the store's inventory, the item is created on the ground at the store's location. You can work around this by removing the plot flag and re-applying it to the newly copied item: 
object oItem = GetObjectByTag("testaxe");object oStore = GetObjectByTag("teststore");int bPlot = GetPlotFlag(oItem);if (bPlot) SetPlotFlag(oItem,FALSE);object oNew = CopyObject(oItem, GetLocation(oStore), oStore);if(bPlot){ SetPlotFlag(oItem, TRUE); SetPlotFlag(oNew, TRUE);}
This may be "expected behavior" for the game engine, since you can't sell plot items to a store. But since the toolset allows plot items in a store inventory, this nuance is worth recording. 
### Version
This function was updated in 1.84.8193.29 of NWN:EE. Fixed CopyObject not triggering the areas OnEnter (fixes HotU Beholder caves anti-magic restore) 
This function was updated in 1.85.8193.31 of NWN:EE. Added bCopyLocalState parameter. 
This function was updated in 1.88.8193.36 of NWN:EE. Fixed the encounter object support in ObjectToJson(), CopyObject(), SqlBindObject(), StoreCampaignObject(). 
### See Also
functions:  | CreateObject CopyItem CopyArea
