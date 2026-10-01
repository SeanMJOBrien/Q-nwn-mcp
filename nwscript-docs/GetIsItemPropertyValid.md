<!-- Source: https://nwnlexicon.com/index.php/GetIsItemPropertyValid -->

# GetIsItemPropertyValid

# GetIsItemPropertyValid(itemproperty)
Checks if an itemproperty is valid. 
int GetIsItemPropertyValid( itemproperty ipProperty);
#### Parameters
_ipProperty_
Itemproperty to check whether is valid or not. 
#### Description
If the item property is valid this will return true. 
#### Remarks
Returns TRUE if ipProperty is a valid itemproperty, FALSE if it isn't. Basically, it does with an itemproperty what GetIsObjectValid does for objects and GetIsEffectValid does for effects. The most obvious use for this function is as a check to exit a loop of an item's properties. 
#### Version
1.61 
#### Example
//Remove true seeing from the entering PC's headgearvoid main(){//Entering objectobject oPC=GetEnteringObject();//Only PCsif ((oPC)) return;//That PC's helmetobject oItem=GetItemInSlot(INVENTORY_SLOT_HEAD, oPC);//Stop script if the PC had no helmet onif ((oItem)) return;//Get the first itemproperty on the helmetitemproperty ipLoop=GetFirstItemProperty(oItem);//Loop for as long as the ipLoop variable is validwhile (GetIsItemPropertyValid(ipLoop)) { //If ipLoop is a true seeing property, remove it if (GetItemPropertyType(ipLoop)==ITEM_PROPERTY_TRUE_SEEING) RemoveItemProperty(oItem, ipLoop); //Next itemproperty on the list... ipLoop=GetNextItemProperty(oItem); }}
#### See Also
functions:  |   GetFirstItemProperty
