<!-- Source: https://nwnlexicon.com/index.php/CreateItemOnObject -->

# CreateItemOnObject(string, object, int, string)
Create a specific item in an objects inventory. 
object CreateItemOnObject( string sItemTemplate, object oTarget = OBJECT_SELF, int nStackSize = 1, string sNewTag = "");
#### Parameters 

sItemTemplate
    The blueprint ResRef string of the item to be created. 

oTarget
    The inventory where you want the item created. (Default: OBJECT_SELF) 

nStackSize
    The number of items to be created. (Default: 1) 

sNewTag
    Sets the tag. If this string is empty (""), it be set to the default tag from the template. (Default: "")
#### Description
This function creates an item with the ResRef sItemTemplate in oTarget's inventory. 
It will cap nStackSize is greater than the maximum stack size of an object, for instance potions default to stacks of 10 so having nStackSize be 15 will create a stack of 10 instead. To get around this use a loop and use the function multiple times. 
Returns the object that has been created. On error, this returns OBJECT_INVALID. CreateItemOnObject will work on item containers. 
If the item created was merged into an existing stack of similar items, the function will return the merged stack object. If the merged stack overflowed, the function will return the overflowed stack that was created. 
#### Remarks
The parameter nStackSize only applies to stackable items (eg. potions). If sItemTemplate refers to a non-stackable item (eg. armor) only 1 item will be created. 
CreateItemOnObject has interesting behaviour when called to create a stackable item. 
If the oTarget of the command has a stack already existing, the items created will be added to the existing stack, in which case two things can happen: 
  1. A new stack has to be created to hold some overflow. CreateItemOnObject returns a valid object, the overflowed stack of items (so, not the completly filled up stack)
  2. The old stack object does not overflow past 99. No new stack object is created. CreateItemOnObject returns a value thats not equal to OBJECT_INVALID, but, if tested with GetIsObjectValid() will return FALSE.

To determine whether items are mergable, base game compares: 
  1. Base Item ID (ie BASE_ITEM_* got with GetBaseItemType)
  2. Tag (note the tag tested is what the _new_ tag will be)
  3. Flags: 
    1. Plot
    2. Identified
    3. Stolen
  4. Model parts and colors
  5. Number of charges
  6. Active properties
    1. Name
    2. Subtype
    3. Cost table
    4. Cost table value
    5. Param1
    6. Param1 value
    7. Uses per day

Since the stack checking only checks _active_ properties (ie clickable ones) if you have an identical appearance and tag, you generally will see a merge - probably by accident. IE: Arrows with +1 enchantment bonus stack with +5 enchantment bonus arrows if they share a tag an appearance. The reason why default Bioware arrows don't merge like this is at least their different tag. 
As noted in the description do not use nStackSize values higher than one full stack of items. 
If you use a oTarget which has no inventory, the function simply fails to create anything (it won't create it on the ground). Creatures, placeables, stores and "box" items can all have objects added to them. 
To check if an item will fit in an objects inventory use GetBaseItemFitsInInventory. If it doesn't fit the function simply fails to create the item(s), they won't be dropped on the ground. 
#### Known Bugs
Not a bug per say but creating a stack of nStackSize greater than the maximum stackable size caps it at that stack size, meaning you might get different behaviour with no warning unless you account for it. 
#### Version
1.67 
#### Example
// The script below will create 5 ale potions in the inventory of// the object to last use a placeable object.object oTarget = GetLastUsedBy();string sItemTemplate1 = "nw_it_mpotion021"; // The standard ale potionint nStackSize = 5; // Create 5 items;CreateItemOnObject(sItemTemplate1, oTarget, nStackSize);// Now if we only change the item to createstring sItemTemplate2 = "nw_ashsw001"; // Standard small shield// and run the command againCreateItemOnObject(sItemTemplate2, oTarget, nStackSize);// even tho nStackSize = 5 only 1 small shield will be created in// oTargets inventory.
#### See Also
functions:  |  GetBaseItemType CreateObject CopyObject
