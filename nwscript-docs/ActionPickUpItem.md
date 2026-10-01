<!-- Source: https://nwnlexicon.com/index.php/ActionPickUpItem -->

# ActionPickUpItem(object)
Causes subject to run to an item and place it in its inventory. 
void ActionPickUpItem( object oItem);

### Parameters 

oItem
    The item to be picked up.
### Description
When the action is executed, the action subject will run to the location of oItem, crouch down, and place oItem in its inventory. If an error occurs the log file will contain "ActionPickUpItem failed." 
### Remarks
 | This section contains speculation. You can help the NWN Lexicon by verifying whether the speculation is accurate.   

SPECULATION: if the path is blocked to oItem then the function will fail. Try using ActionForceMoveToObject() before calling ActionPickUpItem. 
### Version
1.61 
### Example
// In this example, the calling NPC will pick up the nearest longsword.void main(){ int nNth = 1; object oItem = GetNearestObject(OBJECT_TYPE_ITEM, OBJECT_SELF, nNth); while (GetIsObjectvalid(oItem) && GetBaseItemType(oItem) != BASE_ITEM_LONGSWORD) oItem = GetNearestObject(OBJECT_TYPE_ITEM, OBJECT_SELF, ++nNth); if (GetIsObjectValid(oItem)) ActionPickUpItem(oItem);}
### See Also
functions:  |  ActionPutDownItem
