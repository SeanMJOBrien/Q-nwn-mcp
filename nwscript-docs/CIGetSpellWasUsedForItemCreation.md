<!-- Source: https://nwnlexicon.com/index.php/CIGetSpellWasUsedForItemCreation -->

# CIGetSpellWasUsedForItemCreation(object)
Checks if the caster intends to craft an item and returns TRUE if the spell is used up for crafting purposes. 
int CIGetSpellWasUsedForItemCreation( object oSpellTarget);

### Parameters 

oSpellTarget
    Raw item used for the crafting.
### Description
This function checks if oSpellTarget (usually the item targeted by the spell) is a raw item to be used for crafting purposes (such as an empty scroll, empty bottle, or empty wand). 
If this is not the case, the function returns FALSE. 
Otherwise the crafting function associated with the targeted raw item is called (e.g., CICraftCheckScribeScroll or CICraftCheckCraftWand), which then checks if the caster (OBJECT_SELF) meets the crafting requirements (correct item creation feat, material component, gold, experience) and subsequently creates the item. If the spell was used up during the crafting process (usually if the item was created successfully, but also when the caster did not meet the necessary requirements), TRUE is returned. 
Otherwise the function returns FALSE, which usually has the effect that the spell is continued and its "normal" effects are applied to the spell target. Note that item crafting does not work, if the spell required for the crafting is cast from an item. In such a case the crafting process is aborted and the function returns TRUE, indicating that the spell was used up for the (unsuccessful) crafting. 
### Remarks
Item creation can be turned off entirely by setting the module-switch "MODULE_SWITCH_DISABLE_ITEM_CREATION_FEATS" to TRUE. The function generically returns FALSE for that case, which usually has the effect that the spell proceeds normally (e.g. the "normal" effects of the spell are applied to the spell target). This function is called from the script "x2_pc_craft.nss", which is called via X2PreSpellCastCode(). 
### Known Bugs
 | This section of the article is a stub. You can help the NWN Lexicon by expanding it.   

If oSpellTarget is different than the object returned by GetSpellTargetObject(), problems could arise. 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | X2PreSpellCastCode
