<!-- Source: https://nwnlexicon.com/index.php/CanAfford -->

# CanAfford(object)
Determines if the player has enough gold in their inventory to pay for creating an item at the forge. 
int CanAfford( object oBuyer);

### Parameters 

oBuyer
    The player wishing to create an item.
### Description
Returns True if the player can afford the item. 
### Remarks
Function found in nw_o0_itemmaker.nss on line 274. 
Used in the official campaign to verify that an item can be payed for at the Forge. 
Calls the HasGold() function to determine if oBuyer has enough gold to purchase the object in question. Checks the price of the object by calling GetValidItemCost(), which checks the local integer "M3Q1_VALIDITEMCOST" on OBJECT_SELF to determine the value of the object. This function would need to be called from a script that executes on an object. 
### Requirements
#include "nw_o0_itemmaker" 
### Version
1.22 
### See Also  
---
