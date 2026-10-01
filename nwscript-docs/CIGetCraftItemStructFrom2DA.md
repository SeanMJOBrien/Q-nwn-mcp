<!-- Source: https://nwnlexicon.com/index.php/CIGetCraftItemStructFrom2DA -->

# CIGetCraftItemStructFrom2DA(string, int, int)
Retrieves craft information for a specified item. 
struct craft_struct CIGetCraftItemStructFrom2DA( string s2DA, int nRow, int nItemNo);

### Parameters 

s2DA
    Name of the crafting 2da file (des_crft_*.2da). 

nRow
    Raw material used for the crafting process. 

nItemNo
    Item that is to be crafted from the raw material.
### Description
This function gathers craft information, such as cost and DC, for a specified item from a given crafting 2da file (des_crft_*.2da) and returns this information in a struct. 
Usually a given raw material item (such as a leather hide) can be used to craft several different items. What item is crafted is determined by nItemNo. What raw material is used for the crafting is determined by nRow. 
More specifically: Every raw material item has its own row in the crafting 2da file. The various items that can be crafted from that raw material item are handled by a set of four columns in the respective row: Label#, ResRef#, DC#, CostGP#. The digit sign # is a placeholder for the number of the item to be crafted (e.g. nItemNo). For instance the group [Label1, ResRef1, DC1, CostGP1] refers to the name (Label1), the resource reference (ResRef1), the difficulty cost (DC1) and the GP cost (CostGP1) of the first item that can be crafted from the raw material at the specified row (nRow). Look at des_crft_aparts.2da) as an example. 
### Remarks
This function is used in CIDoCraftItemFromConversation(). 
### Requirements
#include "x2_inc_craft" 
### Version
??? 
### See Also
functions:  | CIUseCraftItemSkill
