<!-- Source: https://nwnlexicon.com/index.php/IPGetTargetedOrEquippedArmor -->

# IPGetTargetedOrEquippedArmor(int)

Returns the equipped armor or shield of a spell target. 
object IPGetTargetedOrEquippedArmor( int bAllowShields = FALSE);
#### Parameters 

bAllowShields
    Whether to count shields as armor. (Default: FALSE) See the Known Bugs for issues.
#### Description
This function is to be used within a spell script. 
If the spell target is an item, the function checks whether the item is an armor (or a shield) and returns the item on a successful check. The item need not be equipped. 
If the spell target is a creature, the function checks whether the creature has an armor (or a shield) equipped and returns any equipped armor (or shield). 
If the targeted creature has no armor (or shield) equipped or the targeted item is not an armor (or shield), OBJECT_INVALID is returned. 
If bAllowShields is TRUE, the function checks for armor or shields, otherwise it only checks for armor. 
If a targeted creature has both armor and a shield equipped, the armor is returned. 
#### Remarks
This function only produces reliable results if called from a spell script. It calls  #include index  for more details. 
#### Known Bugs
If the spell target object is an item it can correctly return if it is a shield. However if the spell target is a creature, shields equipped by them are not tested properly and will never be returned (it checks if the target is a shield instead of the item equipped in their left hand). 
#### Requirements
#include " x2_inc_itemprop " 
#### See Also
functions:  |   IPGetTargetedOrEquippedMeleeWeapon   

constants:  |   BASE_ITEM_*
