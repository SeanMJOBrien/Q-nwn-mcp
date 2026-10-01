<!-- Source: https://nwnlexicon.com/index.php/CopyItemAndModify -->

# CopyItemAndModify(object, int, int, int, int)
Copies an item, making a single modification to it. 
object CopyItemAndModify( object oItem, int nType, int nIndex, int nNewValue, int bCopyVars = FALSE);
### Parameters 

oItem
    Item to copy and modify 

nType
    Type of modification to make, ITEM_APPR_TYPE_* constant 

nIndex
    Index of the modification to make. See description. 

nNewValue
    New value of the modified index. See description. 

bCopyVars
    If TRUE, all local variables are copied to the new weapon (Default: FALSE)
### Description
Creates a new copy of an item, while making a single change to the appearance of the item. 
Helmet models and simple items ignore nIndex. 
Weapons also include Arrows, Bolts, Potions, Boots and Keys but these may not use all the parts. Other custom items may be "weapon parts based". 
You can check if a certain appearance exists with Get2DAString on the appropriate parts_*.2da file for armor parts (noting 001 and 002 are naked appearances), or use ResManGetAliasFor to find the model file (eg for helmets or potions/keys) 
To find the existing appearance of an item use GetItemAppearance. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

Legal combinations: 
nType  | nIndex  | nNewValue (1.69)  | nNewValue (NWN:EE)   
---|---|---|---  
ITEM_APPR_TYPE_SIMPLE_MODEL | [Ignored] | Model # | Model #   
ITEM_APPR_TYPE_WEAPON_COLOR | ITEM_APPR_WEAPON_COLOR_* | 1-4 | 1-9   
ITEM_APPR_TYPE_WEAPON_MODEL | ITEM_APPR_WEAPON_MODEL_* | Model # | Model #   
ITEM_APPR_TYPE_ARMOR_MODEL | ITEM_APPR_ARMOR_MODEL_* | Model # | Model #   
ITEM_APPR_TYPE_ARMOR_COLOR | ITEM_APPR_ARMOR_COLOR_* (Note #1) | 0-175 (see: Color Charts) | 0-175 (Note #2)   
**(Note #1)** Alternatively, where ITEM_APPR_TYPE_ARMOR_COLOR is specified, if per-part coloring is desired, the following equation can be used for nIndex to achieve that: 
ITEM_APPR_ARMOR_NUM_COLORS + (ITEM_APPR_ARMOR_MODEL_ * ITEM_APPR_ARMOR_NUM_COLORS) + ITEM_APPR_ARMOR_COLOR_ 
For example, to change the CLOTH1 channel of the torso, nIndex would be: 
6 + (7 * 6) + 2 = 50 
**(Note #2)** When specifying per-part coloring, the value 255 is allowed and corresponds with the logical function 'clear colour override', which clears the per-part override for that part. 
**(Note #3)** When passing ITEM_APPR_TYPE_SIMPLE_MODEL into nType a value must still be passed into nIndex. According to my testing, -1 is a valid value for nIndex. 
### Remarks
Returns the copied object. 
Note that the original item isn't destroyed by this function. You'll have to destroy it manually to really make it seem like the item is being modified. 
This function does not copy Cursed (undroppable) flag on the item. 
 | **Caution:** This section documents changes arising in NWN: Enhanced Edition content. The content is available in both the classic version and the Enhanced Edition of the game. However, the behavior may vary in each version. More details may be available in the NWN Enhanced Edition patch notes.   

In Neverwinter Nights: Enhanced Edition, this function has been modified to allow weapons to access color channels 1-9. Note that this will only apply to custom content weapons, as default weapon models only have four colors. 
Beamdog also added per-part colouring on multi-part armor items. 
### Version
This function was updated in 1.74.8150 of NWN:EE. 
1.74.8150 updated this function to support per-part coloring in Neverwinter Nights Enhanced Edition. 
### See Also
functions:  | IPDyeArmor GetItemAppearance Color_Charts  

constants:  | ITEM_APPR_* Constants
