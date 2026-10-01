<!-- Source: https://nwnlexicon.com/index.php/CIGetIsSpellRestrictedFromCraftFeat -->

# CIGetIsSpellRestrictedFromCraftFeat(int, int)
Determines if a spell is restricted for being used for crafting. 
int CIGetIsSpellRestrictedFromCraftFeat( int nSpellID, int nFeatID);

### Parameters 

nSpellID
    ID of the spell that is to be used for crafting. 

nFeatID
    ID of the feat required for the crafting.
### Description
This function checks whether the spell associated with nSpellID has been restricted from being used for crafting potions, scrolls or wands. 
The crafting type is determined by the value specified in nFeatID. nFeatID can be any one of the following three feats: Brew Potion, Craft Wand, Scribe Scroll. 
The function returns TRUE, if the spell matching nSpellID is prevented from being used with the craft feat matching nFeatID; otherwise it returns FALSE. 
### Remarks
The function does a simple 2da lookup in the file "des_crft_spells.2da", checking one of the columns "NoPotion", "NoWand", "NoScroll" (depending on the supplied value of nFeatID) at the row number determined by nSpellID. 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | CIGetIsCraftFeatBaseItem
