<!-- Source: https://nwnlexicon.com/index.php?title=SetHiddenWhenEquipped&amp;action=history -->

# SetHiddenWhenEquipped(object, int)

Sets whether the provided item should be hidden when equipped. 
void SetHiddenWhenEquipped( object oItem, int nValue);
### Parameters 

oItem
    The item to check. 

nValue
    Whether to hide the item when it is equipped (TRUE or FALSE).
### Description
Sets whether the provided item should be hidden when equipped. 
The intended usage of this function is to provide an easy way to hide helmets, but it can be used equally for any slot which has creature mesh visibility when equipped, specifically these items get world models on a creature: 
  * Left hand slot items (usually weapons, shield, torch)
  * Right hand lot items (usually just weapons)
  * Armour/clothing
  * Helmet
  * Cloak

Things that are hidden are if they were not equipped at all. 
### Remarks
Doing it in advance of a weapon being equipped is a good idea; when an item is acquired in OnAcquireItem rather than OnPlayerEquipItem. 
The information this function implements is only sent to the players after the script has executed, thus using SetHiddenWhenEquipped(oItem, TRUE); then SetHiddenWhenEquipped(oItem, FALSE); in the same script will not send the TRUE value. This can be relevant when using advanced NWNX commands that alter an equipped item that you want to hide for a brief second to "refresh" the model on the client. To work around this delay the second SetHiddenWhenEquipped by a little bit with DelayCommand. 
### Version
This function was added in 1.74.8150 of NWN:EE. 
### Example
// Set a players helmet to hidden if they have the local NO_HELMS on them for every helmet. We are assuming NO_HELMS is TRUE or FALSE.void main(){ object oItem = GetModuleItemAcquired(); object oPC = GetModuleItemAcquiredBy(); if(GetBaseItemType(oItem) == BASE_ITEM_HELMET) { SetHiddenWhenEquipped(oItem, GetLocalInt(oPC, "NO_HELMS")); }}
### See Also
functions:  | GetHiddenWhenEquipped()   

events:  |  OnAcquireItem OnPlayerEquipItem
