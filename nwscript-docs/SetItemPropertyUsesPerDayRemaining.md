<!-- Source: https://nwnlexicon.com/index.php/SetItemPropertyUsesPerDayRemaining -->

# SetItemPropertyUsesPerDayRemaining(object, itemproperty, int)

Sets the number of uses per day remaining of the given item and item property. 
void SetItemPropertyUsesPerDayRemaining( object oItem, itemproperty ip, int nUsesPerDay);
### Parameters 

oItem
    The item to update. 

ip
    The item property to update for uses remaining. 

nUsesPerDay
    The uses remaining to set.
### Description
Sets the number of uses per day remaining of the given item and item property. Will do nothing if the given item and item property is not uses/day. Will constrain nUsesPerDay to the maximum allowed as the cost table defines. 
### Remarks
This is useful to replenish an items usable charges if the NPC has used it in battle and you want "fresh" loot for the player to pick up. 
Otherwise it would be to help cheat uses of an item for NPCs or PCs. 
Alternatively you can remove the uses/day of a newly granted item, in a limited rest world, so it's not instantly usable. 
You can't change the amount _before_ application, only once applied and found. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
// Will reset any uses/day of the spell cast properties on the given item that matches nSpellIDvoid ResetUsesPerDay(item oItem, int nSpellID){ itemproperty ip = GetFirstItemProperty(oItem); while (GetIsItemPropertyValid(ip)) { if (GetItemPropertyType(ip) == ITEM_PROPERTY_CAST_SPELL) { // This returns an ID from iprp_spells - ie; it is a spell, but the level / spell ID is codified in another 2DA. So look it up. nItemSpell = StringToInt(Get2DAString("iprp_spells","SpellIndex",GetItemPropertySubType(ip))); if(nItemSpell == nSpellID) { int nCostTable = GetItemPropertyCostTableValue(ip); switch(nCostTable) { // Uses/Day only case IP_CONST_CASTSPELL_NUMUSES_1_USE_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 1); break; case IP_CONST_CASTSPELL_NUMUSES_2_USES_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 2); break; case IP_CONST_CASTSPELL_NUMUSES_3_USES_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 3); break; case IP_CONST_CASTSPELL_NUMUSES_4_USES_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 4); break; case IP_CONST_CASTSPELL_NUMUSES_5_USES_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 5); break; } } } ip = GetNextItemProperty(oItem); }}// This will remove all uses/day of any per-day item properties matching nSpellIDvoid RemoveUsesPerDay(item oItem, int nSpellID){ itemproperty ip = GetFirstItemProperty(oItem); while (GetIsItemPropertyValid(ip)) { if (GetItemPropertyType(ip) == ITEM_PROPERTY_CAST_SPELL) { // This returns an ID from iprp_spells - ie; it is a spell, but the level / spell ID is codified in another 2DA. So look it up. nItemSpell = StringToInt(Get2DAString("iprp_spells","SpellIndex",GetItemPropertySubType(ip))); if(nItemSpell == nSpellID) { int nCostTable = GetItemPropertyCostTableValue(ip); switch(nCostTable) { // Uses/Day only case IP_CONST_CASTSPELL_NUMUSES_1_USE_PER_DAY: case IP_CONST_CASTSPELL_NUMUSES_2_USES_PER_DAY: case IP_CONST_CASTSPELL_NUMUSES_3_USES_PER_DAY: case IP_CONST_CASTSPELL_NUMUSES_4_USES_PER_DAY: case IP_CONST_CASTSPELL_NUMUSES_5_USES_PER_DAY: SetItemPropertyUsesPerDayRemaining(oItem, ip, 0); break; } } } ip = GetNextItemProperty(oItem); }}
### See Also
functions:  | GetItemPropertyUsesPerDayRemaining() ActionUseItemOnObject() ActionUseItemAtLocation()
