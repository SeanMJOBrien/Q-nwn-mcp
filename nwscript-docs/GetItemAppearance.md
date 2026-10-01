<!-- Source: https://nwnlexicon.com/index.php/GetItemAppearance -->

# GetItemAppearance(object, int, int)
Returns the appearance of an item. 
int GetItemAppearance( object oItem, int nType, int nIndex);
#### Parameters 

oItem
    Item to get the appearance of. 

nType
    The type of appearance to retrieve, ITEM_APPR_TYPE_* constant 

nIndex
    The index of the part (if needed, see remarks).
#### Description
Queries the current value of the appearance settings on an item. The parameters are identical to those of CopyItemAndModify. 
Note that the armor chest piece of the worn armor piece affects the metal/cloth colours on uncovered body parts and the uncovered head (eg; eyepatch colours on some heads) even if other parts of the armor has different appearance colours set. 
#### Remarks
Helmet models and simple items ignore iIndex. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

Legal combinations: 
nType  | nIndex  | nNewValue (1.69)  | nNewValue (NWN:EE)   
---|---|---|---  
ITEM_APPR_TYPE_SIMPLE_MODEL | [Ignored] | Model # | Model #   
ITEM_APPR_TYPE_WEAPON_COLOR | ITEM_APPR_WEAPON_COLOR_* | 1-4 | 1-9   
ITEM_APPR_TYPE_WEAPON_MODEL | ITEM_APPR_WEAPON_MODEL_* | Model # | Model #   
ITEM_APPR_TYPE_ARMOR_MODEL | ITEM_APPR_ARMOR_MODEL_* | Model # | Model #   
ITEM_APPR_TYPE_ARMOR_COLOR | ITEM_APPR_ARMOR_COLOR_* (Note #1) | 0-175 | 0-175 (Note #2)   
**(Note #1)** Alternatively, where ITEM_APPR_TYPE_ARMOR_COLOR is specified, if per-part coloring is desired, the following equation can be used for nIndex to achieve that: 
ITEM_APPR_ARMOR_NUM_COLORS + (ITEM_APPR_ARMOR_MODEL_ * ITEM_APPR_ARMOR_NUM_COLORS) + ITEM_APPR_ARMOR_COLOR_ 
For example, to change the CLOTH1 channel of the torso, nIndex would be: 
6 + (7 * 6) + 2 = 50 
**(Note #2)** When specifying per-part coloring, the value 255 is allowed and corresponds with the logical function 'clear colour override', which clears the per-part override for that part. 
**(Note #3)** When passing ITEM_APPR_TYPE_SIMPLE_MODEL into nType a value must still be passed into nIndex. According to my testing, -1 is a valid value for nIndex. 
#### Version
This function was updated in 1.74.8150 of NWN:EE. 1.74.8150 updated this function to support per-part coloring in Neverwinter Nights Enhanced Edition. 
#### See Also
functions:  |  CopyItemAndModify
