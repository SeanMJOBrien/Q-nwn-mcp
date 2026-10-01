<!-- Source: https://nwnlexicon.com/index.php?title=GetItemPropertyDuration&amp;action=history -->

# GetItemPropertyDuration(itemproperty)

Returns the total duration of the item property in seconds. 
int GetItemPropertyDuration( itemproperty nProperty);
### Parameters 

nProperty
    The item property to get the duration of.
### Description
Returns the total duration of the item property in seconds. Returns 0 if the duration type of the item property is not DURATION_TYPE_TEMPORARY. 
### Remarks
You can get the duration type with GetItemPropertyDurationType. Temporary item properties are not saved to the player BIC/transported to new modules. 
### Version
This function was added in 1.74.8149 of NWN:EE. 
### Example
 | This article is in need of examples. You can help the NWN Lexicon by showing how to use this code effectively.   

### See Also
functions:  | GetItemPropertyDurationRemaining(), GetItemPropertyDurationType()
