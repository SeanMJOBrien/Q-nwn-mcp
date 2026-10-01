<!-- Source: https://nwnlexicon.com/index.php?title=GetName&amp;action=history -->

# GetName(object, int)
Retrieves the name of an object. 
string GetName( object oObject, int bOriginalName = FALSE);
#### Parameters 

oObject
    Object who's name is sought. 

bOriginalName
    If set to TRUE any new name specified via SetName() is ignored and the original object's name is returned instead. (Default: FALSE)
#### Description
Returns the first and last name of oObject. In the case of creatures, returns first and last names together as single concatenated string (with a space provided in the middle). 
#### Remarks
For most objects GetName() returns their usual name field. This includes otherwise inaccessible objects like stores or waypoints which can be useful for debugging. 
For items, GetName() returns the identified name, whether or not the item is identified. That name is not what a player would see. To return a generic name for an unidentified item, the example may be useful. 
#### Version
This function was updated in 1.88.8193.36 of NWN:EE. Fixed GetName() description in nwscript.nss. 
### Example
// Name the nearest item on the ground near the first PC, but use a generic name if the item is not IDed. void main(){ object oPC = GetFirstPC(); // Get the nearest item object oItem = GetNearestObject(OBJECT_TYPE_ITEM, oPC); if ( GetIdentified(oItem) ) SendMessageToPC(oPC, "The item nearest you: "+GetName(oItem)); else { int nBaseType = GetBaseItemType(oItem); string sGenericName = GetStringByStrRef(StringToInt(Get2DAString("baseitems", "Name", nBaseType))); SendMessageToPC(oPC, "The item nearest you: "+sGenericName); }}
#### See Also
functions:  |   SetName
