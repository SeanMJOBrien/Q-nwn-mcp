<!-- Source: https://nwnlexicon.com/index.php?title=GetItemPropertyUsesPerDayRemaining&amp;action=history -->

# GetItemPropertyUsesPerDayRemaining(object, itemproperty)

Returns the number of uses per day remaining of the given item and item property. 
int GetItemPropertyUsesPerDayRemaining( object oItem, itemproperty ip);
### Parameters 

oItem
    The item to test. 

ip
    The item property to test for uses remaining.
### Description
Returns the number of uses per day remaining of the given item and item property. Will return 0 if the given item does not have the requested item property, or the item property is not uses/day. 
### Remarks
This is useful when trying to find a usable item for ActionUseItem functions. These require the uses of the item property be valid, such as an item having at least 1 uses left this day. 
### Version
This function was added in 1.80.8193.14 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | SetItemPropertyUsesPerDayRemaining() ActionUseItemOnObject() ActionUseItemAtLocation()
