<!-- Source: https://nwnlexicon.com/index.php/CICraftScribeScroll -->

# CICraftScribeScroll(object, int)
Create and return a magic scroll for a specified spell. 
object CICraftScribeScroll( object oCreator, int nSpellID);

### Parameters 

oCreator
    Object in whose inventory the newly created magic scroll is to be placed. 

nSpellID
    ID of the spell that is to be represented by the magic scroll.
### Description
This function creates a magic scroll with a specified SpellID on oCreator and returns the scroll object. 
It checks if the oCreator has any material component required to scribe the scroll. If the check is successful, the first component found on oCreator (if one was required) will be destroyed and a scroll with the specified SpellID (nSpellID) will be created and placed into the inventory of oCreator. 
If the scroll could be successfully created, the scroll item is returned; if the process fails, OBJECT_INVALID is returned instead. 
### Remarks
This functions is used within CICraftCheckScribeScroll() to create a magic scroll on oCreator. 
It will work within or outside of a spell script. 
If a scroll with the specified SpellID requires a material component for the scribe process, oCreator must be in possession of at least one such component. 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | CraftBrewPotion
