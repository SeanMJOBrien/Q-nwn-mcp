<!-- Source: https://nwnlexicon.com/index.php/ActionGiveItem -->

# ActionGiveItem(object, object)
Gives a specified item to a target creature. 
void ActionGiveItem( object oItem, object oGiveTo);

### Parameters 

oItem
    Item to give 

oGiveTo
    Object to give oItem to
### Description
Gives oItem to oGiveTo. No corresponding animations are played, and the item is deposited immediately into oGiveTo's inventory. If oItem is not a valid item, or oReciever is not a valid object, nothing will happen. 
### Remarks
oGiveTo can be a creature (PC or NPC) or a container object. 
oGiveTo doesn't have to be in the vicinity, or even the same area, as the caller of the function. Nor will the function cause the caller to move towards oGiveTo. 
### Version
1.61 
### See Also
functions:  | CreateItemOnObject
