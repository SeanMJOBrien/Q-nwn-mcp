<!-- Source: https://nwnlexicon.com/index.php/CIGetIsCraftFeatBaseItem -->

# CIGetIsCraftFeatBaseItem(object)
Returns TRUE if the object is a craft base item. 
int CIGetIsCraftFeatBaseItem( object oItem);

### Parameters 

oItem
    The item to be tested.
### Description
This function checks whether oItem is a craft base item (empty bottle, blank scroll, blank wand) and returns TRUE if this is the case. 
### Remarks
The function is used in spell scripts cast on items. 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | CraftBrewPotion
