<!-- Source: https://nwnlexicon.com/index.php/ItemPropertyBonusFeat -->

# ItemPropertyBonusFeat

# ItemPropertyBonusFeat(int)
Sets a bonus feat itemproperty. 
itemproperty ItemPropertyBonusFeat( int nFeat);
#### Parameters
_nFeat_
 IP_CONST_FEAT_* 
#### Description
Sets item property Bonus feat, such as Dodge. You need to specify the the feat constant (IP_CONST_FEAT_*). The item's user does not have to meet the feat's prerequisite when using the enhanced item. 
#### Remarks
The itemproperty commands are special constructors - they construct an itemproperty "object" which can then be applied to an item using the AddItemProperty command, much like effects need to be first constructed, then applied with ApplyEffectToObject. It will often be a good idea to remove similar itemproperties from the item first. There's a command in the "x2_inc_itemprop" include file called IPSafeAddItemProperty which will do that for you. Check IPSafeAddItemProperty for current bug report. The IP_CONST_FEAT value can be retrieved off this type of item property using GetItemPropertySubType. 
#### Version
1.61 
#### Example
<nowiki>#include "x2_inc_itemprop"</nowiki>//The include is for the IPSafeAddItemProperty function//Makes the entering PC's helmet grant the PC the alertness featvoid main(){object oPC=GetEnteringObject();if ( (oPC)) return;object oItem = GetItemInSlot(INVENTORY_SLOT_HEAD, oPC);if ((oItem)) return;itemproperty ipAdd = ItemPropertyBonusFeat(IP_CONST_FEAT_ALERTNESS);IPSafeAddItemProperty(oItem, ipAdd);}
#### See Also
functions:  |   IPSafeAddItemProperty   

constants:  |   IP_CONST_FEAT_* Constants
