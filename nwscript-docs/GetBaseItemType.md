<!-- Source: https://nwnlexicon.com/index.php/GetBaseItemType -->

# GetBaseItemType(object)
Determines the base item type ID for the item specified. 
int GetBaseItemType( object oItem);
#### Parameters 

oItem
    Item to be analyzed.
#### Description
Get the base item type (BASE_ITEM_*) of oItem. 
Returns BASE_ITEM_INVALID if oItem is an invalid item (or not an item such as GetObjectType is not OBJECT_TYPE_ITEM). 
#### Remarks
The BASE_ITEM_* constants are from the baseitems.2da file, and are merely the line number. 
Note that a few are invalid - see the 2da, but noting that BASE_ITEM_SCROLL doesn't exist, instead, it is BASE_ITEM_SPELLSCROLL. 
#### Version
1.22 
#### Example
// If the item of tag "ITEM" in our possession is a shortsword, say so main(){ // Get item object oItem = GetItemPossessedBy(OBJECT_SELF, "ITEM"); if(GetBaseItemType(oItem) == BASE_ITEM_SHORTSWORD) { SpeakString("I've got a great shortsword!!"); }}
#### See Also
functions:  |   GetLastWeaponUsed   

constants:  |   BASE_ITEM_* Constants   
events:  |   OnUnAcquireItem Event  OnAcquireItem
