<!-- Source: https://nwnlexicon.com/index.php/GetItemPropertyDurationType -->

# GetItemPropertyDurationType(itemproperty)
Gets the duration type of an itemproperty. 
int GetItemPropertyDurationType( itemproperty ip);
#### Parameters 

ip
    Itemproperty to get the duration type of
#### Description
Will return the duration type of the item property. 
Returns -1 on error, for instance if ip is not a valid itemproperty. 
#### Remarks
Returns DURATION_TYPE_PERMANENT for permanent itemproperties, and DURATION_TYPE_TEMPORARY for temporary itemproperties. 
#### Example
//Source code for the IPRemoveAllItemProperties function in//the x2_inc_itemprop include file// ----------------------------------------------------------------------------// Removes ALL item properties from oItem matching nItemPropertyDuration// ----------------------------------------------------------------------------void IPRemoveAllItemProperties(object oItem, int nItemPropertyDuration = DURATION_TYPE_TEMPORARY){ itemproperty ip = GetFirstItemProperty(oItem); while (GetIsItemPropertyValid(ip)) { if (GetItemPropertyDurationType(ip) == nItemPropertyDuration) { RemoveItemProperty(oItem, ip); } ip = GetNextItemProperty(oItem); }}
#### See Also
functions:  | GetItemPropertyDurationRemaining(), GetItemPropertyDuration()
