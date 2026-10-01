<!-- Source: https://nwnlexicon.com/index.php/CraftBrewPotion -->

# CraftBrewPotion

# CraftBrewPotion(object, int)
Create and return a magical potion for a specified spell. 
object CraftBrewPotion( object oCreator, int nSpellID);
#### Parameters
_oCreator_
Object in whose inventory the newly created magical potion is to be placed. 
_nSpellID_
ID of the spell that is to be represented by the potion. 
#### Description
This function creates a magical potion with a specified spellID, places it into the inventory of oCreator and returns the potion object. If the potion could not be successfully created, OBJECT_INVALID is returned instead. 
#### Remarks
This functions is used within  CICraftCheckBrewPotion () to create a magical potion on oCreator. It will work within or outside of a spell script. oCreator need not be able to brew potions; nor do they need to pay any gold or XP. 
#### Requirements
#include " x2_inc_craft " 
#### Version
??? 
#### See Also
functions:  |   CIGetIsCraftFeatBaseItem
