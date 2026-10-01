<!-- Source: https://nwnlexicon.com/index.php/GetItemPropertyType -->

# GetItemPropertyType

# GetItemPropertyType(itemproperty)
Returns the type of itemproperty a property is. 
int GetItemPropertyType( itemproperty ip);
#### Parameters
_ip_
Itemproperty to get the type of. 
#### Description
Will return the item property type. 
#### Remarks
Returns ITEM_PROPERTY_* . Returns -1 on error, including if ip is not a valid itemproperty. Can be used to remove itemproperties of a certain type from an item. 
#### Version
1.61 
#### Example
//Remove true seeing from the entering PC's headgearvoid main(){//Entering objectobject oPC=GetEnteringObject();//Only PCsif ((oPC)) return;//That PC's helmetobject oItem=GetItemInSlot(INVENTORY_SLOT_HEAD, oPC);//Stop script if the PC had no helmet onif ((oItem)) return;//Get the first itemproperty on the helmetitemproperty ipLoop=GetFirstItemProperty(oItem);//Loop for as long as the ipLoop variable is validwhile (GetIsItemPropertyValid(ipLoop)) { //If ipLoop is a true seeing property, remove it if (GetItemPropertyType(ipLoop)==ITEM_PROPERTY_TRUE_SEEING) RemoveItemProperty(oItem, ipLoop); //Next itemproperty on the list... ipLoop=GetNextItemProperty(oItem); }SendMessageToPC(oPC, IntToString(GetItemPropertyType(ipLoop)));}
#### See Also
functions:  |   RemoveItemProperty
