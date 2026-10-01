<!-- Source: https://nwnlexicon.com/index.php/CIUseCraftItemSkill -->

# CIUseCraftItemSkill(object, int, string, int, object)
Does a craft check for a given crafting skill to craft an item. 
object CIUseCraftItemSkill( object oPC, int nSkill, string sResRef, int nDC, object oContainer = OBJECT_INVALID);

### Parameters 

oPC
    Object (usually a creature or a PC) that does the crafting. 

nSkill
    Skill used for the crafting process. 

sResRef
    Resource reference of the item to be crafted. 

nDC
    Difficulty class for the crafting skill check. 

oContainer
    Container object used during the crafting process (Default: OBJECT_INVALID).
### Description
This function is used to craft an item. It does a skill check for oPC with the specified skill (nSkill) against the given difficulty class (nDC). 
If the skill check is successful, an item with resource reference sResRef is created and placed in oPC's inventory. 
If a non-default value is given for oContainer, the item is created in the specified oContainer object and then moved to oPC's inventory. 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | CIGetCraftItemStructFrom2DA
